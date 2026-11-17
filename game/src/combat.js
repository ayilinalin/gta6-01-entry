// Combat: mouse-aimed shooting, bullets, muzzle flash, hit feedback.
import { TUNE } from './config.js';
import { dist } from './random.js';

export function makeCombat() {
  return { bullets: [], cooldown: 0, flash: 0, hits: 0 };
}

export function tryShoot(combat, from, angle) {
  if (combat.cooldown > 0) return false;
  combat.cooldown = TUNE.fireCooldown;
  combat.flash = 0.06;
  combat.bullets.push({
    x: from.x + Math.cos(angle) * 22, y: from.y + Math.sin(angle) * 22,
    vx: Math.cos(angle) * TUNE.bulletSpeed, vy: Math.sin(angle) * TUNE.bulletSpeed,
    life: 0.9,
  });
  return true;
}

// Returns { hitPed, hitCop, hitCourier } counts for the main loop to price.
export function updateCombat(combat, dt, world) {
  const hits = { hitPed: 0, hitCop: 0, hitCourier: 0, hitCar: 0 };
  combat.cooldown = Math.max(0, combat.cooldown - dt);
  combat.flash = Math.max(0, combat.flash - dt);
  for (const b of combat.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    for (const p of world.peds) {
      if (dist(b.x, b.y, p.x, p.y) < 12) { b.life = 0; p.panic = 2; hits.hitPed++; }
    }
    for (const c of world.police.cops) {
      if (dist(b.x, b.y, c.x, c.y) < 26) { b.life = 0; hits.hitCop++; }
    }
    if (world.missions.courier && dist(b.x, b.y, world.missions.courier.x, world.missions.courier.y) < 26) {
      b.life = 0; world.missions.courier.hp -= TUNE.bulletDamage; hits.hitCourier++;
    }
    for (const car of world.cars) {
      if (car.kind === 'traffic' && dist(b.x, b.y, car.x, car.y) < 26) { b.life = 0; hits.hitCar++; }
    }
  }
  combat.bullets = combat.bullets.filter((b) => b.life > 0);
  combat.hits += hits.hitPed + hits.hitCop + hits.hitCourier;
  return hits;
}

export function drawBullets(ctx, combat, cam) {
  ctx.fillStyle = '#ffe9a8';
  for (const b of combat.bullets) {
    // World coordinates: the caller translates the context by -cam.
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
  }
}
