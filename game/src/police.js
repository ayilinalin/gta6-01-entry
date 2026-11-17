// Police: the Port Meridian Police Department. Wanted level 0-5 rises when
// the player steals, hits people or shoots; it decays when the player lies
// low. Cops chase, ram, and at wanted 4+ set roadblocks ahead of the player.
// Getting busted at high wanted ends the run.
import { CONFIG } from './config.js';
import { clamp, dist, angleDiff, range } from './random.js';
import { makeCar } from './vehicles.js';

export function createWanted() {
  return { level: 0, heat: 0, decayTimer: 0 };
}

export function addHeat(wanted, amount) {
  wanted.heat += amount;
  const next = Math.min(5, Math.floor(wanted.heat / 25));
  if (next > wanted.level) wanted.level = next;
  wanted.decayTimer = CONFIG.wantedDecaySeconds;
}

export function updateWanted(wanted, dt) {
  if (wanted.level === 0) return;
  wanted.decayTimer -= dt;
  if (wanted.decayTimer <= 0) {
    wanted.heat = Math.max(0, wanted.heat - 8);
    wanted.level = Math.min(5, Math.floor(wanted.heat / 25));
    wanted.decayTimer = 3;
  }
}

export function wantedTargetCops(level) {
  return [0, 1, 2, 3, 5, 7][level] || 0;
}

export function spawnPoliceCar(player, rng) {
  const angle = range(rng, 0, Math.PI * 2);
  const d = 420;
  const x = clamp(player.x + Math.cos(angle) * d, 60, CONFIG.worldWidth - 60);
  const y = clamp(player.y + Math.sin(angle) * d, 60, CONFIG.worldHeight - 60);
  const car = makeCar(x, y, 0, { rng, police: true, cruiseSpeed: 300, name: 'PMPD Interceptor' });
  car.sirenOn = true;
  return car;
}

export function updatePoliceCar(car, player, dt) {
  const targetAngle = Math.atan2(player.y - car.y, player.x - car.x);
  const diff = angleDiff(car.angle, targetAngle);
  car.angle += clamp(diff, -2.8 * dt, 2.8 * dt);
  const d = dist(car.x, car.y, player.x, player.y);
  const targetSpeed = d > 260 ? 430 : d > 90 ? 340 : 200;
  car.speed += clamp(targetSpeed - car.speed, -500 * dt, 320 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  return d;
}

// A roadblock: two parked police cars across the road ahead of the player.
export function makeRoadblock(player, rng) {
  const ahead = 320;
  const bx = player.x + Math.cos(player.angle || 0) * ahead;
  const by = player.y + Math.sin(player.angle || 0) * ahead;
  const perp = (player.angle || 0) + Math.PI / 2;
  const cars = [];
  for (const off of [-46, 46]) {
    const car = makeCar(bx + Math.cos(perp) * off, by + Math.sin(perp) * off, perp, { rng, police: true, name: 'PMPD Roadblock' });
    car.sirenOn = true;
    car.speed = 0;
    car.roadblock = true;
    cars.push(car);
  }
  return { x: bx, y: by, cars, timer: 25 };
}

export function updateRoadblock(block, dt) {
  block.timer -= dt;
  return block.timer > 0;
}

export function drawWantedStars(ctx, level, x, y) {
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < level ? '#ffd94d' : 'rgba(255,255,255,0.25)';
    drawStar(ctx, x + i * 26, y, 11);
  }
}

export function drawStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
