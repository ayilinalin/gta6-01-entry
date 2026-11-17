// NEON TIDE — main loop. Fixed-step simulation, camera follow, input,
// and the glue between every system: city, player, vehicles, pedestrians,
// police, missions, combat, HUD, audio, save and screenshot scenarios.
import { CONFIG, PALETTE } from './config.js';
import { makeRng, clamp, dist, range } from './random.js';
import { createCity, drawCity, collideBuildings, inHarbor, isOnRoad } from './city.js';
import { createPlayer, updatePlayerOnFoot, nearestStealableCar, drawPlayer } from './player.js';
import { spawnTraffic, updateTrafficCar, updateDrivenCar, collideCarWithCity, drawCar, makeCar } from './vehicles.js';
import { spawnPedestrians, updatePedestrian, drawPedestrian } from './pedestrians.js';
import { createWanted, addHeat, updateWanted, wantedTargetCops, spawnPoliceCar, updatePoliceCar, makeRoadblock, updateRoadblock } from './police.js';
import { createMissionState, startMission, completeMission, updateMissions, drawMissionMarker, currentMission } from './missions.js';
import { createCombat, fireBullet, updateBullets, drawBullets } from './combat.js';
import { drawHud, drawStartScreen, drawEndScreen } from './hud.js';
import { createAudio, ensureAudio, setEngine, setSiren, playGunshot, playPickup, playMissionComplete, playBusted } from './audio.js';
import { loadSave, saveGame } from './save.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shotParam = parseInt(params.get('shot') || '0', 10);
const SHOT = shotParam >= 1 && shotParam <= 4 ? shotParam : 0;

const rng = makeRng(SHOT ? 1000 + SHOT : 20261117);
const city = createCity(20261117);
const game = {
  rng,
  city,
  player: createPlayer(800, 560),
  traffic: spawnTraffic(city, rng, CONFIG.trafficCount),
  peds: spawnPedestrians(city, rng, CONFIG.pedestrianCount),
  policeCars: [],
  roadblocks: [],
  wanted: createWanted(),
  missions: createMissionState(city),
  combat: createCombat(),
  audio: createAudio(),
  cam: { x: 0, y: 0 },
  screen: 'start',
  time: 0,
  clockMinutes: 12 * 60 + 5,
  clockText: '12:05',
  targetCar: null,
  endScreen: null,
  hasSave: !!loadSave(),
  startButtons: null,
};

const input = {
  keys: new Set(),
  mouseX: CONFIG.canvasWidth / 2,
  mouseY: CONFIG.canvasHeight / 2,
  mouseDown: false,
  clicked: false,
};

// Debug handle for automated play-testing (read-only inspection).
window.__NEON_TIDE__ = game;

function worldMouse() {
  return { x: game.cam.x + input.mouseX, y: game.cam.y + input.mouseY };
}

function startGame(useSave) {
  ensureAudio(game.audio);
  if (useSave) {
    const s = loadSave();
    if (s) {
      game.player.cash = s.cash || 0;
      game.player.reputation = s.reputation || 0;
      game.missions.done = s.missionsDone || 0;
      game.missions.index = Math.min(s.missionIndex || 0, 3);
      game.player.x = s.x || 800;
      game.player.y = s.y || 560;
    }
  }
  game.screen = 'play';
  if (game.missions.phase === 'briefing') startMission(game.missions, city);
}

function endRun(kind) {
  game.screen = kind;
  if (kind === 'busted') {
    playBusted(game.audio);
    game.endScreen = {
      title: 'BUSTED',
      lines: ['The PMPD caught up with Kio Rendra at wanted level 5.', 'The harbor keeps its secrets — for now.'],
    };
  } else if (kind === 'won') {
    playMissionComplete(game.audio);
    game.endScreen = {
      title: 'PORT MERIDIAN IS YOURS',
      lines: ['All 4 missions complete. Dara Solace pays the final cut.', 'Kio Rendra owns the neon harbor tonight.'],
    };
  }
}

function stealCar() {
  const car = nearestStealableCar(game.player, game.traffic);
  if (!car) return;
  game.player.inCar = car;
  game.traffic = game.traffic.filter((c) => c !== car);
  addHeat(game.wanted, 25);
  game.missions.message = 'Car stolen — the PMPD noticed. Wanted level up!';
  game.missions.messageTimer = 4;
}

function exitCar() {
  const car = game.player.inCar;
  if (!car) return;
  game.player.x = car.x + 40;
  game.player.y = car.y + 40;
  game.player.inCar = null;
  car.speed = 0;
  game.traffic.push(car);
}

function spawnTargetCar() {
  const t = game.missions.target;
  const car = makeCar(t.x, t.y, -Math.PI / 2, { rng, color: '#d94f3d', name: 'Vico Marlowe' });
  car.hp = 120;
  game.targetCar = car;
  return car;
}

function update(dt) {
  game.time += dt;
  game.clockMinutes = (game.clockMinutes + dt * 0.6) % (24 * 60);
  const hh = Math.floor(game.clockMinutes / 60);
  const mm = Math.floor(game.clockMinutes % 60);
  game.clockText = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  if (game.screen !== 'play') return;
  const wm = worldMouse();
  game.player.aimX = wm.x;
  game.player.aimY = wm.y;
  game.missions.messageTimer = Math.max(0, game.missions.messageTimer - dt);

  // Player: on foot or driving.
  if (game.player.inCar) {
    const car = game.player.inCar;
    const { nx, ny } = updateDrivenCar(car, input, dt);
    if (collideCarWithCity(car, city, nx, ny)) {
      car.speed *= -0.3;
      addHeat(game.wanted, 1);
    } else {
      car.x = nx;
      car.y = ny;
    }
    game.player.x = car.x;
    game.player.y = car.y;
    game.player.angle = car.angle;
    // Hitting pedestrians while driving raises heat.
    for (const ped of game.peds) {
      if (Math.abs(car.speed) > 60 && dist(car.x, car.y, ped.x, ped.y) < 30) {
        ped.panic = 3;
        ped.x += Math.cos(car.angle) * 40;
        ped.y += Math.sin(car.angle) * 40;
        addHeat(game.wanted, 8);
      }
    }
    setEngine(game.audio, Math.abs(car.speed) / CONFIG.carMaxSpeed, true);
  } else {
    updatePlayerOnFoot(game.player, input, city, dt);
    setEngine(game.audio, 0, false);
    if (input.clicked) {
      const wm2 = worldMouse();
      const ang = Math.atan2(wm2.y - game.player.y, wm2.x - game.player.x);
      if (game.player.shootCooldown <= 0) {
        game.player.shootCooldown = 0.28;
        fireBullet(game.combat, game.player.x, game.player.y, ang, 'player');
        playGunshot(game.audio);
        addHeat(game.wanted, 6);
      }
    }
  }

  // Traffic + pedestrians.
  for (const car of game.traffic) updateTrafficCar(car, city, [...game.traffic, ...game.policeCars], dt);
  if (game.targetCar) updateTrafficCar(game.targetCar, city, [...game.traffic, ...game.policeCars], dt);
  const threat = game.player.inCar ? game.player.inCar : game.player;
  for (const ped of game.peds) updatePedestrian(ped, city, threat, dt);

  // Combat resolution.
  const targets = [];
  for (const pc of game.policeCars) targets.push({ x: pc.x, y: pc.y, hp: pc.hp, radius: 24, car: pc, kind: 'police' });
  if (game.targetCar) targets.push({ x: game.targetCar.x, y: game.targetCar.y, hp: game.targetCar.hp, radius: 24, car: game.targetCar, kind: 'target' });
  updateBullets(game.combat, targets, dt, (t) => {
    if (t.kind === 'police') {
      t.car.hp = t.hp;
      addHeat(game.wanted, 10);
      if (t.car.hp <= 0) {
        game.policeCars = game.policeCars.filter((c) => c !== t.car);
        game.player.cash += 50;
        game.missions.message = 'Cop car disabled — +$50';
        game.missions.messageTimer = 3;
      }
    } else if (t.kind === 'target') {
      game.targetCar.hp = t.hp;
    }
  });

  // Wanted + police.
  updateWanted(game.wanted, dt);
  const want = wantedTargetCops(game.wanted.level);
  while (game.policeCars.length < want) game.policeCars.push(spawnPoliceCar(game.player, rng));
  while (game.policeCars.length > want && game.policeCars.length > 0) game.policeCars.pop();
  for (const pc of game.policeCars) {
    const d = updatePoliceCar(pc, game.player, dt);
    if (d < 46) {
      // Caught: HP drains, busted at wanted 5 with no HP.
      game.player.hp -= 26 * dt;
      addHeat(game.wanted, 2);
      if (game.player.hp <= 0) endRun('busted');
    }
  }
  // Roadblocks at wanted 4+.
  if (game.wanted.level >= 4 && game.roadblocks.length === 0) {
    game.roadblocks.push(makeRoadblock(game.player, rng));
  }
  game.roadblocks = game.roadblocks.filter((b) => updateRoadblock(b, dt));
  for (const b of game.roadblocks) {
    for (const rc of b.cars) {
      if (dist(game.player.x, game.player.y, rc.x, rc.y) < 40 && game.player.inCar) {
        game.player.inCar.speed *= 0.2;
        addHeat(game.wanted, 4);
      }
    }
  }
  setSiren(game.audio, game.wanted.level, game.time);

  // Missions.
  if (game.missions.phase === 'briefing' && game.missions.index === 1 && !game.targetCar) spawnTargetCar();
  const result = updateMissions(game.missions, game.player, game.wanted, game.targetCar, dt);
  if (result === 'completed') {
    playMissionComplete(game.audio);
    completeMission(game.missions, game.player, city);
    saveGame(game.player, game.missions);
    if (game.missions.allDone) endRun('won');
    else if (game.missions.index === 1) spawnTargetCar();
  }
  if (game.targetCar && game.targetCar.hp <= 0 && game.missions.index === 1 && game.missions.phase === 'active') {
    game.targetCar = null;
  }

  // Camera follows the player, clamped to the world.
  game.cam.x = clamp(game.player.x - CONFIG.canvasWidth / 2, 0, CONFIG.worldWidth - CONFIG.canvasWidth);
  game.cam.y = clamp(game.player.y - CONFIG.canvasHeight / 2, 0, CONFIG.worldHeight - CONFIG.canvasHeight);
}

function render() {
  const cam = { x: game.cam.x, y: game.cam.y };
  if (game.screen === 'start') {
    game.startButtons = drawStartScreen(ctx, game.hasSave);
    return;
  }
  drawCity(ctx, city, cam);
  // Mission marker under everything moving.
  drawMissionMarker(ctx, game.missions, cam, game.time);
  for (const ped of game.peds) drawPedestrian(ctx, ped, cam, game.time);
  for (const car of game.traffic) drawCar(ctx, car, cam);
  if (game.targetCar) {
    drawCar(ctx, game.targetCar, cam);
    ctx.fillStyle = '#ff4d4d';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('VICO', game.targetCar.x - cam.x - 16, game.targetCar.y - cam.y - 26);
  }
  for (const b of game.roadblocks) for (const rc of b.cars) drawCar(ctx, rc, cam);
  for (const pc of game.policeCars) drawCar(ctx, pc, cam);
  if (game.player.inCar) drawCar(ctx, game.player.inCar, cam);
  else drawPlayer(ctx, game.player, cam, game.time);
  drawBullets(ctx, game.combat, cam);
  // "E — STEAL" prompt when a car is near on foot.
  if (!game.player.inCar && game.screen === 'play') {
    const car = nearestStealableCar(game.player, game.traffic);
    if (car) {
      ctx.fillStyle = 'rgba(8,12,24,0.8)';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('Press E to steal the ' + car.name, game.player.x - cam.x - 90, game.player.y - cam.y - 34);
    }
  }
  drawHud(ctx, game);
  if ((game.screen === 'busted' || game.screen === 'won') && game.endScreen) {
    drawEndScreen(ctx, game.endScreen.title, game.endScreen.lines, game.player.cash, game.endScreen.hint);
  }
}

// Input.
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  input.keys.add(e.code);
  ensureAudio(game.audio);
  if (e.code === 'Enter') {
    if (game.screen === 'start') startGame(false);
    else if (game.screen === 'busted' || game.screen === 'won') location.reload();
    else if (game.missions.phase === 'briefing') startMission(game.missions, city);
  }
  if (e.code === 'KeyE' && game.screen === 'play' && !game.player.inCar) stealCar();
  if (e.code === 'KeyF' && game.screen === 'play' && game.player.inCar) exitCar();
  if (e.code === 'KeyM') game.audio.muted = !game.audio.muted;
});
window.addEventListener('keyup', (e) => input.keys.delete(e.code));
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  input.mouseX = ((e.clientX - r.left) / r.width) * CONFIG.canvasWidth;
  input.mouseY = ((e.clientY - r.top) / r.height) * CONFIG.canvasHeight;
});
canvas.addEventListener('mousedown', (e) => {
  ensureAudio(game.audio);
  const r = canvas.getBoundingClientRect();
  const mx = ((e.clientX - r.left) / r.width) * CONFIG.canvasWidth;
  const my = ((e.clientY - r.top) / r.height) * CONFIG.canvasHeight;
  if (game.screen === 'start' && game.startButtons) {
    const b = game.startButtons;
    if (mx >= b.start.x && mx <= b.start.x + b.start.w && my >= b.start.y && my <= b.start.y + b.start.h) startGame(false);
    else if (game.hasSave && mx >= b.cont.x && mx <= b.cont.x + b.cont.w && my >= b.cont.y && my <= b.cont.y + b.cont.h) startGame(true);
    return;
  }
  if (game.screen === 'play' && !game.player.inCar) input.clicked = true;
});
window.addEventListener('mouseup', () => { input.clicked = false; });

// Fixed-step loop.
let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
function frame(now) {
  // Screenshot mode freezes after the settle ticks: the shot stays exactly
  // as staged (speed, wanted level, HP) instead of decaying before capture.
  if (SHOT && game.frozen) {
    render();
    requestAnimationFrame(frame);
    return;
  }
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }
  render();
  requestAnimationFrame(frame);
}

if (SHOT) {
  applyShot(game, SHOT);
  // Let the world settle a few ticks so traffic/peds are in place, then freeze the shot.
  for (let i = 0; i < 90; i++) update(STEP);
  game.missions.messageTimer = 99;
  if (SHOT === 2 && game.player.inCar) {
    // Keep the driving shot moving: restore cruise speed after the settle.
    game.player.inCar.speed = 300;
  }
  if (SHOT === 3) {
    // The settle chase may have heated things up; restore the staged state.
    game.player.hp = CONFIG.playerMaxHp;
    game.wanted.heat = 80;
    game.wanted.level = 3;
    game.wanted.decayTimer = 99;
  }
  // Re-center the camera on the player after the settle moved things.
  game.cam.x = clamp(game.player.x - CONFIG.canvasWidth / 2, 0, CONFIG.worldWidth - CONFIG.canvasWidth);
  game.cam.y = clamp(game.player.y - CONFIG.canvasHeight / 2, 0, CONFIG.worldHeight - CONFIG.canvasHeight);
  game.frozen = true;
  render();
}
requestAnimationFrame(frame);
