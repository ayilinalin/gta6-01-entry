// Pedestrians: harmless walkers on the sidewalks, they flee from gunfire and cars.
import { TUNE, PALETTE, WORLD } from './config.js';
import { makeRng, pick, range, dist, clamp } from './random.js';
import { ROADS_X, ROADS_Y, roadCenterX, roadCenterY } from './city.js';

export function spawnPedestrians(n, rng) {
  const peds = [];
  const shirts = ['#e84a5f', '#4a90e8', '#f2a541', '#7bc96f', '#9b59b6', '#e8e8e8', '#ff7a2e'];
  for (let i = 0; i < n; i++) {
    const vertical = rng() < 0.5;
    const x = vertical ? pick(rng, ROADS_X) + range(rng, -8, WORLD.roadW + 8) : range(rng, 40, WORLD.w - 40);
    const y = vertical ? range(rng, 40, WORLD.h - 40) : pick(rng, ROADS_Y) + range(rng, -8, WORLD.roadW + 8);
    peds.push({
      x, y, r: 9, angle: rng() * Math.PI * 2,
      speed: range(rng, TUNE.pedSpeed * 0.7, TUNE.pedSpeed * 1.3),
      shirt: pick(rng, shirts), skin: pick(rng, PALETTE.pedSkin),
      panic: 0, walkPhase: rng() * Math.PI * 2,
    });
  }
  return peds;
}

export function updatePedestrians(peds, dt, danger) {
  for (const p of peds) {
    if (p.panic > 0) p.panic -= dt;
    // Flee the nearest danger (player shooting or a speeding car).
    let fleeX = 0, fleeY = 0;
    if (danger) {
      const d = dist(p.x, p.y, danger.x, danger.y);
      if (d < 220) { p.panic = 1.2; fleeX = (p.x - danger.x) / (d || 1); fleeY = (p.y - danger.y) / (d || 1); }
    }
    if (p.panic > 0) {
      p.angle = Math.atan2(fleeY, fleeX);
      p.x += Math.cos(p.angle) * p.speed * 2.1 * dt;
      p.y += Math.sin(p.angle) * p.speed * 2.1 * dt;
    } else {
      // Stroll along the road edge; pick a new heading at random.
      if (Math.random() < dt * 0.08) p.angle += (Math.random() - 0.5) * 2.2;
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
    }
    p.x = clamp(p.x, 14, WORLD.w - 14);
    p.y = clamp(p.y, 14, WORLD.h - 14);
    p.walkPhase += dt * 8;
  }
}

export function drawPedestrians(ctx, peds, cam) {
  for (const p of peds) {
    // World coordinates: the caller translates the context by -cam.
    const sx = p.x, sy = p.y;
    if (sx < cam.x - 20 || sx > cam.x + cam.w + 20 || sy < cam.y - 20 || sy > cam.y + cam.h + 20) continue;
    const bob = Math.sin(p.walkPhase) * 1.5;
    ctx.save();
    ctx.translate(sx, sy + bob);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(1, 3, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.shirt;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.skin;
    ctx.beginPath(); ctx.arc(3, 0, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (p.panic > 0) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', sx, sy - 14);
    }
  }
}
