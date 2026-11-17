// PMPD: wanted level 0-5, pursuit cars that ram the player, roadblocks at high heat.
import { TUNE, WANTED_LABELS, WORLD } from './config.js';
import { makeRng, pick, clamp, dist, angleDiff } from './random.js';
import { makeCar, drawCar } from './vehicles.js';
import { ROADS_X, ROADS_Y } from './city.js';

export function makePolice() {
  return { wanted: 0, heat: 0, cops: [], roadblocks: [], spawnTimer: 0, sirenPhase: 0 };
}

export function addHeat(police, amount) {
  police.heat = clamp(police.heat + amount, 0, 5);
  police.wanted = Math.floor(police.heat + 0.0001);
}

export function updatePolice(police, dt, target, rng) {
  police.wanted = Math.floor(police.heat + 0.0001);
  police.sirenPhase += dt * 6;
  // Heat cools off slowly when the player stays clean.
  police.heat = Math.max(0, police.heat - TUNE.wantedDecay * dt);
  const wantCops = police.wanted === 0 ? 0 : Math.min(2 + police.wanted, 7);
  police.spawnTimer -= dt;
  if (police.cops.length < wantCops && police.spawnTimer <= 0) {
    police.spawnTimer = 1.4;
    const ang = rng() * Math.PI * 2;
    const d = 620;
    const cop = makeCar(
      clamp(target.x + Math.cos(ang) * d, 40, WORLD.w - 40),
      clamp(target.y + Math.sin(ang) * d, 40, WORLD.h - 40),
      0, '#e8e8e8', 'cop');
    cop.speed = TUNE.copSpeed * 0.8;
    police.cops.push(cop);
  }
  // Pursuit: steer at the target, ram on contact, give up when heat is gone.
  for (const cop of police.cops) {
    const want = Math.atan2(target.y - cop.y, target.x - cop.x);
    cop.angle += clamp(angleDiff(cop.angle, want), -2.4 * dt, 2.4 * dt);
    const spd = police.wanted >= 4 ? TUNE.copSpeed * 1.25 : TUNE.copSpeed;
    cop.speed += (spd - cop.speed) * dt * 0.8;
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    cop.x = clamp(cop.x, 24, WORLD.w - 24);
    cop.y = clamp(cop.y, 24, WORLD.h - 24);
  }
  police.cops = police.cops.filter((c) => police.wanted > 0 || dist(c.x, c.y, target.x, target.y) < 900);
  // Roadblocks: two parked cop cars across the road ahead of the player.
  const wantBlocks = police.wanted >= 4 ? police.wanted - 3 : 0;
  while (police.roadblocks.length < wantBlocks) {
    const a = rng() * Math.PI * 2;
    police.roadblocks.push({
      x: clamp(target.x + Math.cos(a) * 420, 60, WORLD.w - 60),
      y: clamp(target.y + Math.sin(a) * 420, 60, WORLD.h - 60),
      angle: a + Math.PI / 2,
    });
  }
  if (police.roadblocks.length > wantBlocks) police.roadblocks.length = wantBlocks;
}

export function drawPolice(ctx, police, cam) {
  for (const cop of police.cops) {
    drawCar(ctx, cop, cam);
    // World coordinates: the caller translates the context by -cam.
    const sx = cop.x, sy = cop.y;
    if (sx < cam.x - 60 || sx > cam.x + cam.w + 60 || sy < cam.y - 60 || sy > cam.y + cam.h + 60) continue;
    const on = Math.sin(police.sirenPhase) > 0;
    ctx.fillStyle = on ? '#ff3b30' : '#2f6df6';
    ctx.beginPath(); ctx.arc(sx, sy - 16, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = on ? '#2f6df6' : '#ff3b30';
    ctx.beginPath(); ctx.arc(sx + 10, sy - 16, 5, 0, Math.PI * 2); ctx.fill();
  }
  for (const rb of police.roadblocks) {
    const c1 = { x: rb.x - Math.cos(rb.angle) * 26, y: rb.y - Math.sin(rb.angle) * 26, angle: rb.angle, color: '#e8e8e8', kind: 'cop' };
    const c2 = { x: rb.x + Math.cos(rb.angle) * 26, y: rb.y + Math.sin(rb.angle) * 26, angle: rb.angle, color: '#e8e8e8', kind: 'cop' };
    drawCar(ctx, c1, cam); drawCar(ctx, c2, cam);
    ctx.fillStyle = '#ffd23c'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('ROADBLOCK', rb.x, rb.y - 26);
  }
}

export function wantedLabel(w) { return WANTED_LABELS[clamp(w, 0, 5)]; }
