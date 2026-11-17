// Port Meridian: a road grid of blocks, buildings, a harbor strip and named landmarks.
// Roads run on a fixed pitch; buildings fill the blocks between them.
import { WORLD, PALETTE, DISTRICTS } from './config.js';
import { makeRng, pick } from './random.js';

export const ROADS_X = [];
export const ROADS_Y = [];
for (let x = WORLD.roadW; x < WORLD.w - 60; x += WORLD.blockW + WORLD.roadW) ROADS_X.push(x);
for (let y = WORLD.roadW; y < WORLD.h - 60; y += WORLD.blockH + WORLD.roadW) ROADS_Y.push(y);

export const HARBOR_Y = WORLD.h - 170; // water strip along the south edge

export function makeCity(seed = 1337) {
  const rng = makeRng(seed);
  const buildings = [];
  for (let bi = 0; bi < ROADS_X.length - 1; bi++) {
    for (let bj = 0; bj < ROADS_Y.length - 1; bj++) {
      const bx = ROADS_X[bi] + WORLD.roadW, by = ROADS_Y[bj] + WORLD.roadW;
      const bw = WORLD.blockW, bh = WORLD.blockH;
      if (by + bh > HARBOR_Y - 40) continue; // keep the dock strip clear
      const split = rng() < 0.55;
      if (split) {
        const cut = bw * (0.42 + rng() * 0.16);
        buildings.push(makeBuilding(bx, by, cut - 8, bh, rng));
        buildings.push(makeBuilding(bx + cut + 8, by, bw - cut - 8, bh, rng));
      } else {
        buildings.push(makeBuilding(bx, by, bw, bh, rng));
      }
    }
  }
  // Named landmarks sit on fixed blocks so missions can point at them.
  const landmarks = [
    { name: 'Coral Hotel', x: ROADS_X[4] + WORLD.roadW + 20, y: ROADS_Y[1] + WORLD.roadW + 10, w: 150, h: 90 },
    { name: 'Tide Plaza', x: ROADS_X[2] + WORLD.roadW + 10, y: ROADS_Y[3] + WORLD.roadW + 8, w: 130, h: 100 },
    { name: 'Neon Mall', x: ROADS_X[6] + WORLD.roadW + 10, y: ROADS_Y[3] + WORLD.roadW + 8, w: 150, h: 100 },
    { name: 'Tide Mart', x: ROADS_X[7] + WORLD.roadW + 15, y: ROADS_Y[2] + WORLD.roadW + 10, w: 120, h: 80 },
    { name: 'Hideout', x: ROADS_X[1] + WORLD.roadW + 20, y: ROADS_Y[5] + WORLD.roadW + 10, w: 110, h: 80 },
    { name: 'Old Docks', x: ROADS_X[3] + WORLD.roadW + 10, y: HARBOR_Y - 120, w: 170, h: 90 },
  ];
  for (const lm of landmarks) {
    buildings.push({ ...lm, color: pick(rng, PALETTE.roof), roof: '#22242c', label: lm.name, landmark: true });
  }
  return { buildings, landmarks };
}

function makeBuilding(x, y, w, h, rng) {
  return {
    x, y, w, h,
    color: pick(rng, PALETTE.roof),
    roof: rng() < 0.3 ? '#2b2e38' : '#22242c',
    label: rng() < 0.22 ? pick(rng, ['TIDE PLAZA', 'NEON MALL', 'CORAL', 'DOCKS', 'MARKET', 'GARAGE']) : '',
    landmark: false,
  };
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  return 'Port Meridian';
}

export function onRoad(x, y) {
  if (y > HARBOR_Y) return false;
  for (const rx of ROADS_X) if (x >= rx && x <= rx + WORLD.roadW) return true;
  for (const ry of ROADS_Y) if (y >= ry && y <= ry + WORLD.roadW) return true;
  return false;
}

export function roadCenterX(x) {
  let best = ROADS_X[0], bd = Infinity;
  for (const rx of ROADS_X) { const d = Math.abs(x - (rx + WORLD.roadW / 2)); if (d < bd) { bd = d; best = rx; } }
  return best + WORLD.roadW / 2;
}
export function roadCenterY(y) {
  let best = ROADS_Y[0], bd = Infinity;
  for (const ry of ROADS_Y) { const d = Math.abs(y - (ry + WORLD.roadW / 2)); if (d < bd) { bd = d; best = ry; } }
  return best + WORLD.roadW / 2;
}

// Circle-vs-building push-out; returns corrected position.
export function collideBuildings(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r < b.x || x - r > b.x + b.w || y + r < b.y || y - r > b.y + b.h) continue;
    const dx = x - Math.max(b.x, Math.min(x, b.x + b.w));
    const dy = y - Math.max(b.y, Math.min(y, b.y + b.h));
    if (dx === 0 && dy === 0) { x = b.x - r; continue; }
    const d = Math.hypot(dx, dy) || 1;
    x += (dx / d) * (r - d); y += (dy / d) * (r - d);
  }
  return { x, y };
}

export function drawCity(ctx, city, cam) {
  const { w, h } = WORLD;
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(cam.x, cam.y, cam.w, cam.h);
  // Mow stripes for a sun-baked lawn feel.
  ctx.fillStyle = PALETTE.grass2;
  const stripe = 120;
  const y0 = Math.max(cam.y, 0), y1 = Math.min(cam.y + cam.h, h);
  for (let y = Math.floor(y0 / stripe) * stripe; y < y1; y += stripe * 2) {
    ctx.fillRect(Math.max(cam.x, 0), y, Math.min(cam.x + cam.w, w) - Math.max(cam.x, 0), stripe);
  }
  // Harbor water + sand at the south edge.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(Math.max(cam.x, 0), HARBOR_Y - 26, Math.min(cam.x + cam.w, w) - Math.max(cam.x, 0), 26);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(Math.max(cam.x, 0), HARBOR_Y, Math.min(cam.x + cam.w, w) - Math.max(cam.x, 0), h - HARBOR_Y);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const wy = HARBOR_Y + 30 + i * 34;
    if (wy < cam.y || wy > cam.y + cam.h) continue;
    ctx.beginPath();
    for (let x = Math.max(cam.x, 0); x < Math.min(cam.x + cam.w, w); x += 46) {
      ctx.moveTo(x, wy + Math.sin((x + i * 90) * 0.01) * 4);
      ctx.lineTo(x + 24, wy + Math.sin((x + 24 + i * 90) * 0.01) * 4);
    }
    ctx.stroke();
  }
  // Roads.
  ctx.fillStyle = PALETTE.road;
  for (const rx of ROADS_X) ctx.fillRect(rx, Math.max(cam.y, 0), WORLD.roadW, Math.min(cam.y + cam.h, h) - Math.max(cam.y, 0));
  for (const ry of ROADS_Y) ctx.fillRect(Math.max(cam.x, 0), ry, Math.min(cam.x + cam.w, w) - Math.max(cam.x, 0), WORLD.roadW);
  // Lane dashes.
  ctx.fillStyle = PALETTE.line;
  for (const rx of ROADS_X) {
    const cx = rx + WORLD.roadW / 2;
    if (cx < cam.x || cx > cam.x + cam.w) continue;
    for (let y = Math.floor(Math.max(cam.y, 0) / 44) * 44; y < Math.min(cam.y + cam.h, h); y += 44) ctx.fillRect(cx - 2, y, 4, 22);
  }
  for (const ry of ROADS_Y) {
    const cy = ry + WORLD.roadW / 2;
    if (cy < cam.y || cy > cam.y + cam.h) continue;
    for (let x = Math.floor(Math.max(cam.x, 0) / 44) * 44; x < Math.min(cam.x + cam.w, w); x += 44) ctx.fillRect(x, cy - 2, 22, 4);
  }
  // Buildings.
  for (const b of city.buildings) {
    if (b.x + b.w < cam.x || b.x > cam.x + cam.w || b.y + b.h < cam.y || b.y > cam.y + cam.h) continue;
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    for (let wy = b.y + 12; wy < b.y + b.h - 8; wy += 24) {
      for (let wx = b.x + 10; wx < b.x + b.w - 8; wx += 26) ctx.fillRect(wx, wy, 12, 8);
    }
    if (b.label) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
  }
  // Landmark name tags.
  ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
  for (const lm of city.landmarks) {
    if (lm.x > cam.x + cam.w || lm.x < cam.x - 120 || lm.y > cam.y + cam.h || lm.y < cam.y - 20) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const tw = ctx.measureText(lm.name).width + 12;
    ctx.fillRect(lm.x, lm.y - 20, tw, 18);
    ctx.fillStyle = '#ffd23c';
    ctx.fillText(lm.name, lm.x + 6, lm.y - 7);
  }
}
