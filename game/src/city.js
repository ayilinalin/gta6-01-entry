// Port Meridian: the city grid. Roads run on a fixed lattice, blocks hold
// buildings, the south edge is the harbor water with docks, and the center
// blocks are downtown towers. Everything is generated from a seed.
// Screen position is always world position minus the camera.
import { CONFIG, PALETTE } from './config.js';
import { makeRng, pick, rangeInt } from './random.js';

export function createCity(seed) {
  const rng = makeRng(seed);
  const roadsX = [];
  const roadsY = [];
  for (let x = CONFIG.roadSpacing / 2; x < CONFIG.worldWidth; x += CONFIG.roadSpacing) roadsX.push(x);
  for (let y = CONFIG.roadSpacing / 2; y < CONFIG.worldHeight - 240; y += CONFIG.roadSpacing) roadsY.push(y);

  const buildings = [];
  const harborY = CONFIG.worldHeight - 240;
  for (let ix = 0; ix < roadsX.length - 1; ix++) {
    for (let iy = 0; iy < roadsY.length - 1; iy++) {
      const x0 = roadsX[ix] + CONFIG.roadWidth / 2 + 8;
      const y0 = roadsY[iy] + CONFIG.roadWidth / 2 + 8;
      const w = CONFIG.blockSize;
      const h = CONFIG.blockSize;
      const downtown = ix >= 2 && ix <= 5 && iy >= 1 && iy <= 3;
      const count = downtown ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const bw = count === 2 ? w / 2 - 14 : w - 16;
        const bh = count === 2 ? h - 16 : h - 16;
        const bx = count === 2 ? x0 + k * (w / 2 + 4) : x0 + 8;
        buildings.push({
          x: bx,
          y: y0 + 8,
          w: bw,
          h: bh,
          color: pick(rng, PALETTE.buildingRoof),
          height: downtown ? rangeInt(rng, 3, 9) : rangeInt(rng, 1, 3),
          downtown,
          label: downtown && rng() < 0.5 ? pick(rng, ['MERIDIAN TOWER', 'TIDE PLAZA', 'HARBOR BANK', 'CORAL HOTEL', 'NEON MALL']) : '',
        });
      }
    }
  }

  const docks = [];
  for (let i = 0; i < 4; i++) {
    docks.push({ x: 220 + i * 560, y: harborY - 10, w: 120, h: 90, name: `PIER ${i + 1}` });
  }

  const parks = [
    { x: roadsX[1] + 60, y: roadsY[4] + 60, w: 200, h: 200, name: 'Tidewater Park' },
  ];

  return { roadsX, roadsY, buildings, docks, parks, harborY, rng };
}

export function nearestRoadX(city, x) {
  let best = city.roadsX[0];
  for (const r of city.roadsX) if (Math.abs(r - x) < Math.abs(best - x)) best = r;
  return best;
}

export function nearestRoadY(city, y) {
  let best = city.roadsY[0];
  for (const r of city.roadsY) if (Math.abs(r - y) < Math.abs(best - y)) best = r;
  return best;
}

export function isOnRoad(city, x, y) {
  const onX = city.roadsX.some((r) => Math.abs(x - r) < CONFIG.roadWidth / 2);
  const onY = city.roadsY.some((r) => Math.abs(y - r) < CONFIG.roadWidth / 2);
  return onX || onY;
}

export function collideBuildings(city, x, y, radius) {
  for (const b of city.buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return b;
  }
  return null;
}

export function inHarbor(city, x, y) {
  return y > city.harborY + 40;
}

export function drawCity(ctx, city, cam) {
  const { worldWidth, worldHeight } = CONFIG;
  // Screen-space helpers: world minus camera.
  const X = (wx) => wx - cam.x;
  const Y = (wy) => wy - cam.y;
  // Ground: grass base, painted over the whole canvas first so no old
  // frame ever shows through.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
  ctx.fillRect(X(0), Y(0), worldWidth, worldHeight);
  // Harbor water at the south edge.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(X(0), Y(city.harborY), worldWidth, worldHeight - city.harborY);
  ctx.fillStyle = PALETTE.waterDeep;
  for (let x = 0; x < worldWidth; x += 90) {
    ctx.fillRect(X(x), Y(city.harborY + 60 + ((x * 7) % 40)), 46, 5);
  }
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(X(0), Y(city.harborY - 14), worldWidth, 14);
  // Parks.
  for (const p of city.parks) {
    ctx.fillStyle = '#2f6b3a';
    ctx.fillRect(X(p.x), Y(p.y), p.w, p.h);
    ctx.fillStyle = '#7ec850';
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(X(p.x + 20 + i * 22), Y(p.y + 30 + ((i * 37) % 140)), 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Roads.
  ctx.fillStyle = PALETTE.road;
  for (const rx of city.roadsX) ctx.fillRect(X(rx - CONFIG.roadWidth / 2), Y(0), CONFIG.roadWidth, city.harborY);
  for (const ry of city.roadsY) ctx.fillRect(X(0), Y(ry - CONFIG.roadWidth / 2), worldWidth, CONFIG.roadWidth);
  // Sidewalks.
  ctx.fillStyle = PALETTE.sidewalk;
  for (const rx of city.roadsX) {
    ctx.fillRect(X(rx - CONFIG.roadWidth / 2 - 10), Y(0), 10, city.harborY);
    ctx.fillRect(X(rx + CONFIG.roadWidth / 2), Y(0), 10, city.harborY);
  }
  // Center dashes.
  ctx.fillStyle = PALETTE.roadLine;
  for (const rx of city.roadsX) {
    for (let y = 0; y < city.harborY; y += 56) ctx.fillRect(X(rx - 3), Y(y), 6, 28);
  }
  for (const ry of city.roadsY) {
    for (let x = 0; x < worldWidth; x += 56) ctx.fillRect(X(x), Y(ry - 3), 28, 6);
  }
  // Docks and piers.
  for (const d of city.docks) {
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(X(d.x), Y(d.y), d.w, d.h);
    ctx.fillStyle = '#8a5f3d';
    for (let i = 0; i < 5; i++) ctx.fillRect(X(d.x + 8 + i * 22), Y(d.y + 8), 14, d.h - 16);
    ctx.fillStyle = '#dfe9ff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(d.name, X(d.x + 18), Y(d.y + 22));
  }
  // Buildings with fake 2.5D height shadow.
  for (const b of city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(X(b.x + 6), Y(b.y + 6 + b.height * 2), b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(X(b.x), Y(b.y), b.w, b.h);
    ctx.strokeStyle = PALETTE.buildingEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(X(b.x), Y(b.y), b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(X(b.x + 6), Y(b.y + 6), b.w - 12, 10);
    if (b.label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(b.label, X(b.x + 8), Y(b.y + 30));
    }
  }
}
