// NEON TIDE — main loop: input, camera, simulation, rendering, start/end flow.
import { GAME_NAME, VIEW, WORLD, TUNE } from './config.js';
import { makeRng, clamp, dist } from './random.js';
import { makeCity, drawCity, collideBuildings, districtAt } from './city.js';
import { makePlayer, updatePlayer, drawPlayer } from './player.js';
import { spawnTraffic, spawnParked, updateTraffic, updateDriven, nearestCar, drawCar } from './vehicles.js';
import { spawnPedestrians, updatePedestrians, drawPedestrians } from './pedestrians.js';
import { makePolice, addHeat, updatePolice, drawPolice } from './police.js';
import { makeMissionState, updateMissions, currentMission, missionTargetPos, startCourier } from './missions.js';
import { makeCombat, tryShoot, updateCombat, drawBullets } from './combat.js';
import { drawHud, drawStart, drawEnd } from './hud.js';
import { makeAudio, ensureAudio, setEngine, setSiren, sfxShoot, sfxHit, sfxPickup, sfxMission, sfxBusted, sfxSteal } from './audio.js';
import { loadSave, writeSave, clearSave } from './save.js';
import { shotFromUrl, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.w; canvas.height = VIEW.h;

const input = { keys: {}, mouseSX: VIEW.w / 2, mouseSY: VIEW.h / 2, mouseX: 0, mouseY: 0, clicked: false };
addEventListener('keydown', (e) => {
  input.keys[e.key.toLowerCase()] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
  onKey(e.key.toLowerCase());
});
addEventListener('keyup', (e) => { input.keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  input.mouseSX = (e.clientX - r.left) * (VIEW.w / r.width);
  input.mouseSY = (e.clientY - r.top) * (VIEW.h / r.height);
});
canvas.addEventListener('mousedown', (e) => {
  ensureAudio(world.audio);
  const r = canvas.getBoundingClientRect();
  input.mouseSX = (e.clientX - r.left) * (VIEW.w / r.width);
  input.mouseSY = (e.clientY - r.top) * (VIEW.h / r.height);
  input.clicked = true;
  onClick(input.mouseSX, input.mouseSY);
});

function buildWorld(seed = 1337) {
  const rng = makeRng(seed);
  const city = makeCity(seed);
  const player = makePlayer(700, 420);
  const cars = [...spawnParked(city, 10, rng), ...spawnTraffic(city, 14, rng)];
  const world = {
    mode: 'start', endKind: null, seed,
    city, player, cars,
    peds: spawnPedestrians(26, rng),
    police: makePolice(),
    missions: makeMissionState(city.landmarks),
    combat: makeCombat(),
    audio: makeAudio(),
    money: 0, rep: 0, clock: 8 * 60 + 15, elapsed: 0,
    cam: { x: 0, y: 0, w: VIEW.w, h: VIEW.h },
    saveTimer: 0, frames: 0,
    missionTargetPos() { return missionTargetPos(this.missions); },
  };
  return world;
}

let world = buildWorld();
const savedGame = loadSave();

const api = {
  enterCar(car) {
    car.kind = 'player'; car.driver = false;
    world.player.inCar = car;
    world.player.x = car.x; world.player.y = car.y;
  },
  addHeat(n) { addHeat(world.police, n); },
  startCourier() {
    const c = startCourier(world.missions, world);
    world.courierCar = c;
  },
};

function startGame(fromSave) {
  ensureAudio(world.audio);
  if (fromSave && savedGame) {
    world.money = savedGame.money; world.rep = savedGame.rep || 0;
    world.missions.done = savedGame.missionsDone || 0;
    world.missions.index = Math.min(savedGame.missionIndex || 0, 3);
    world.player.x = savedGame.x || 700; world.player.y = savedGame.y || 420;
    world.missions.message = 'Welcome back to Port Meridian.'; world.missions.messageTimer = 5;
  }
  world.mode = 'play';
}

function endGame(kind) {
  world.mode = 'end'; world.endKind = kind;
  setSiren(world.audio, false); setEngine(world.audio, 0, false);
  if (kind === 'busted') sfxBusted(world.audio); else sfxMission(world.audio);
  clearSave();
}

function onKey(k) {
  if (world.mode === 'start') {
    if (k === 'enter') startGame(false);
    if (k === 'c' && savedGame) startGame(true);
    return;
  }
  if (world.mode === 'end') {
    if (k === 'r') { world = buildWorld(); world.mode = 'play'; }
    return;
  }
  if (k === 'e' && !world.player.inCar) {
    const car = nearestCar(world.cars, world.player.x, world.player.y, 70);
    if (car && car.kind !== 'cop') {
      api.enterCar(car);
      addHeat(world.police, 1);
      sfxSteal(world.audio);
      world.missions.message = car.kind === 'parked' ? 'Car stolen — the PMPD noticed.' : 'Car jacked — the PMPD noticed.';
      world.missions.messageTimer = 4;
    }
  }
  if (k === 'f' && world.player.inCar) {
    const car = world.player.inCar;
    car.kind = 'parked';
    world.player.inCar = null;
    world.player.x = car.x + 40; world.player.y = car.y;
  }
  if (k === 'm') world.audio.muted = !world.audio.muted;
}

function onClick(sx, sy) {
  if (world.mode === 'start') {
    if (sx >= 84 && sx <= 384 && sy >= 420 && sy <= 484) startGame(false);
    return;
  }
  if (world.mode === 'end') {
    if (sx >= VIEW.w / 2 - 150 && sx <= VIEW.w / 2 + 150 && sy >= 440 && sy <= 496) { world = buildWorld(); world.mode = 'play'; }
    return;
  }
  if (world.mode === 'play' && !world.player.inCar) {
    const p = world.player;
    if (tryShoot(world.combat, p, p.angle)) sfxShoot(world.audio);
  }
}

function update(dt) {
  world.elapsed += dt;
  world.clock = (world.clock + dt * 0.6) % (24 * 60);
  const p = world.player;
  // Mouse position in world space for aiming.
  input.mouseX = input.mouseSX + world.cam.x;
  input.mouseY = input.mouseSY + world.cam.y;

  if (world.mode !== 'play') return;

  if (p.inCar) {
    const car = p.inCar;
    updateDriven(car, input, dt);
    // Scripted shots keep the car rolling so the capture reads as driving.
    if (shot > 0 && shot < 4) car.speed = shot === 3 ? 260 : 150;
    const fixed = collideBuildings(world.city, car.x, car.y, 24);
    if (fixed.x !== car.x || fixed.y !== car.y) { car.x = fixed.x; car.y = fixed.y; car.speed *= 0.3; }
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    // Running over pedestrians is a crime the PMPD notices (not in staged shots).
    for (const ped of world.peds) {
      if (dist(ped.x, ped.y, car.x, car.y) < 26 && Math.abs(car.speed) > 120) {
        ped.panic = 2; ped.x += (ped.x - car.x) * 0.4; ped.y += (ped.y - car.y) * 0.4;
        if (shot === 0) addHeat(world.police, 0.4);
      }
    }
    setEngine(world.audio, Math.abs(car.speed) / TUNE.carMax, true);
  } else {
    updatePlayer(p, input, dt, world.city);
    setEngine(world.audio, 0, false);
  }

  updateTraffic(world.cars, dt, makeRng((world.elapsed * 1000) | 0));
  updatePedestrians(world.peds, dt, input.clicked ? { x: p.x, y: p.y } : null);
  input.clicked = false;
  updatePolice(world.police, dt, p, makeRng(((world.elapsed * 997) | 0) + 7));

  // Courier flees from the player while mission 2 is active.
  const ms = world.missions;
  if (ms.index === 1 && ms.courier && ms.stage === 'go') {
    const c = ms.courier;
    const away = Math.atan2(c.y - p.y, c.x - p.x);
    c.angle += clamp(((away - c.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -2 * dt, 2 * dt);
    c.speed = 150;
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    c.x = clamp(c.x, 30, WORLD.w - 30); c.y = clamp(c.y, 30, WORLD.h - 30);
    if (p.inCar && dist(p.x, p.y, c.x, c.y) < 46) { c.hp -= 45 * dt; if (c.hp <= 0) sfxHit(world.audio); }
  }

  const hits = updateCombat(world.combat, dt, world);
  if (shot === 0) {
    if (hits.hitPed > 0) addHeat(world.police, 0.5);
    if (hits.hitCop > 0) { addHeat(world.police, 1); sfxHit(world.audio); }
  }
  if (hits.hitCourier > 0) sfxHit(world.audio);

  // Cop contact: rammed on foot hurts, in a car it slows you down.
  for (const cop of world.police.cops) {
    const d = dist(cop.x, cop.y, p.x, p.y);
    if (d < 34) {
      if (p.inCar) { p.inCar.speed *= 0.92; p.hp -= 3 * dt; }
      else p.hp -= 14 * dt;
      if (world.police.wanted >= 5 && d < 26 && !p.inCar) { endGame('busted'); return; }
    }
  }
  if (p.hp <= 0) { endGame('busted'); return; }

  // Mission events.
  const events = updateMissions(ms, world, dt);
  for (const ev of events) {
    if (ev.type === 'complete') {
      sfxMission(world.audio);
      sfxPickup(world.audio);
      if (ev.allDone) { endGame('complete'); return; }
      if (ms.index === 2) addHeat(world.police, 2.5); // mission 3 starts hot
      if (ms.index === 1) api.startCourier();
    }
  }

  setSiren(world.audio, world.police.wanted >= 2);
  world.saveTimer += dt;
  if (world.saveTimer > 5) { world.saveTimer = 0; writeSave(world); }

  // Camera follows the player, clamped to the world.
  world.cam.x = clamp(p.x - VIEW.w / 2, 0, WORLD.w - VIEW.w);
  world.cam.y = clamp(p.y - VIEW.h / 2, 0, WORLD.h - VIEW.h);
}

function draw() {
  const cam = world.cam;
  if (world.mode === 'start') { drawStart(ctx, world, savedGame); return; }
  if (world.mode === 'end') {
    // Keep the city visible behind the end panel.
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    drawCity(ctx, world.city, cam);
    ctx.restore();
    drawEnd(ctx, world);
    return;
  }
  // World pass in world coordinates (context translated by -cam), HUD in screen coordinates.
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  drawCity(ctx, world.city, cam);
  for (const car of world.cars) drawCar(ctx, car, cam);
  if (world.missions.courier && world.missions.index === 1) {
    const c = world.missions.courier;
    drawCar(ctx, { ...c, color: '#ff7a2e', kind: 'courier' }, cam);
    ctx.fillStyle = '#ff7a2e'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('COURIER', c.x, c.y - 28);
  }
  drawPedestrians(ctx, world.peds, cam);
  drawPolice(ctx, world.police, cam);
  if (!world.player.inCar) drawPlayer(ctx, world.player, cam);
  drawBullets(ctx, world.combat, cam);
  // Muzzle flash.
  if (world.combat.flash > 0 && !world.player.inCar) {
    const p = world.player;
    ctx.fillStyle = 'rgba(255,233,168,0.9)';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  drawHud(ctx, world);
}

// Scripted shots stage the world before the first frame.
const shot = shotFromUrl();
if (shot > 0) applyShot(shot, world, api);
// Center the camera on the staged player for shots.
world.cam.x = clamp(world.player.x - VIEW.w / 2, 0, WORLD.w - VIEW.w);
world.cam.y = clamp(world.player.y - VIEW.h / 2, 0, WORLD.h - VIEW.h);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  world.frames++;
  if (world.frames === 3) window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__NEON_TIDE__ = { world: () => world, version: 'v2' };
