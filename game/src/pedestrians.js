// Pedestrians: Port Meridian locals strolling the sidewalks. They walk
// their block, panic and run when shots ring out or a car bears down,
// and remember being shoved.
import { CONFIG } from './config.js';
import { clamp, dist, pick, range } from './random.js';
import { collideBuildings } from './city.js';

const SHIRTS = ['#e86a6a', '#6aa8e8', '#e8d44d', '#9e6ae8', '#6ae8a0', '#e8e8e8', '#f28c28'];
const NAMES = ['Mira', 'Dono', 'Sari', 'Bima', 'Lestari', 'Agus', 'Rani', 'Fajar', 'Nadia', 'Eko'];

export function spawnPedestrians(city, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const rx = city.roadsX[Math.floor(rng() * city.roadsX.length)];
    const ry = city.roadsY[Math.floor(rng() * city.roadsY.length)];
    const onVertical = rng() < 0.5;
    const x = onVertical ? rx + CONFIG.roadWidth / 2 + 16 : range(rng, 80, CONFIG.worldWidth - 80);
    const y = onVertical ? range(rng, 80, city.harborY - 80) : ry + CONFIG.roadWidth / 2 + 16;
    peds.push({
      x, y,
      angle: range(rng, 0, Math.PI * 2),
      speed: range(rng, 28, 55),
      shirt: pick(rng, SHIRTS),
      name: pick(rng, NAMES),
      panic: 0,
      wanderTimer: range(rng, 1, 4),
    });
  }
  return peds;
}

export function updatePedestrian(ped, city, threat, dt) {
  const d = threat ? dist(ped.x, ped.y, threat.x, threat.y) : Infinity;
  if (threat && d < 220) {
    ped.panic = 2.5;
    ped.angle = Math.atan2(ped.y - threat.y, ped.x - threat.x);
  }
  ped.panic = Math.max(0, ped.panic - dt);
  ped.wanderTimer -= dt;
  if (ped.wanderTimer <= 0 && ped.panic <= 0) {
    ped.wanderTimer = range(Math.random, 1.5, 4);
    ped.angle = range(Math.random, 0, Math.PI * 2);
  }
  const speed = ped.panic > 0 ? 150 : ped.speed;
  const nx = ped.x + Math.cos(ped.angle) * speed * dt;
  const ny = ped.y + Math.sin(ped.angle) * speed * dt;
  if (!collideBuildings(city, nx, ny, 8)) {
    ped.x = clamp(nx, 20, CONFIG.worldWidth - 20);
    ped.y = clamp(ny, 20, city.harborY - 20);
  } else {
    ped.angle += Math.PI / 2;
  }
}

export function drawPedestrian(ctx, ped, cam, time) {
  const sx = ped.x - cam.x;
  const sy = ped.y - cam.y;
  const bob = Math.sin(time * 10 + ped.x) * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 8, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.shirt;
  ctx.beginPath();
  ctx.arc(sx, sy + bob, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(sx, sy - 9 + bob, 5, 0, Math.PI * 2);
  ctx.fill();
  if (ped.panic > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('!', sx - 3, sy - 18);
  }
}
