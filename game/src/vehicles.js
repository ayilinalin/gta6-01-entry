// Cars: stolen rides, traffic AI that follows the road grid, driving physics.
import { TUNE, WORLD, PALETTE } from './config.js';
import { makeRng, pick, range, clamp, dist, angleDiff } from './random.js';
import { ROADS_X, ROADS_Y, HARBOR_Y, roadCenterX, roadCenterY, onRoad } from './city.js';

const CAR_COLORS = ['#d94f3d', '#3d7bd9', '#e8c832', '#7a4fd9', '#e8e8e8', '#2f9e6a', '#ff7a2e', '#22262e'];
export const CAR_W = 46, CAR_H = 24;

export function makeCar(x, y, angle, color, kind = 'traffic') {
  return { x, y, angle, speed: 0, color, kind, driver: kind === 'traffic', target: null, stuck: 0 };
}

export function spawnTraffic(city, n, rng) {
  const cars = [];
  for (let i = 0; i < n; i++) {
    const vertical = rng() < 0.5;
    const x = vertical ? roadCenterX(pick(rng, ROADS_X) + 28) : pick(rng, ROADS_X) + 28;
    const y = vertical ? pick(rng, ROADS_Y) + 28 : roadCenterY(pick(rng, ROADS_Y) + 28);
    const angle = vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI);
    const c = makeCar(x, y, angle, pick(rng, CAR_COLORS));
    c.speed = range(rng, TUNE.trafficSpeed * 0.7, TUNE.trafficSpeed);
    cars.push(c);
  }
  return cars;
}

export function spawnParked(city, n, rng) {
  const cars = [];
  let tries = 0;
  while (cars.length < n && tries++ < 400) {
    const rx = pick(rng, ROADS_X), ry = pick(rng, ROADS_Y);
    const side = rng() < 0.5;
    const x = side ? rx - 14 : rx + WORLD.roadW + 14;
    const y = ry + range(rng, 30, WORLD.blockH - 10);
    if (y > HARBOR_Y - 60) continue;
    const angle = side ? -Math.PI / 2 : Math.PI / 2;
    cars.push(makeCar(x, y, angle, pick(rng, CAR_COLORS), 'parked'));
  }
  return cars;
}

function nearestRoadPoint(car) {
  // Pick the closest road center line and steer along it.
  const cx = roadCenterX(car.x), cy = roadCenterY(car.y);
  const dx = Math.abs(car.x - cx), dy = Math.abs(car.y - cy);
  if (dx < dy) return { x: cx, y: car.y + Math.sin(car.angle) * 60 };
  return { x: car.x + Math.cos(car.angle) * 60, y: cy };
}

export function updateTraffic(cars, dt, rng) {
  for (const c of cars) {
    if (c.kind !== 'traffic') continue;
    const goal = nearestRoadPoint(c);
    const want = Math.atan2(goal.y - c.y, goal.x - c.x);
    const diff = angleDiff(c.angle, want);
    c.angle += clamp(diff, -1.6 * dt, 1.6 * dt);
    const target = TUNE.trafficSpeed;
    c.speed += (target - c.speed) * dt * 1.5;
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    // Wrap around the city edges so traffic never runs dry.
    if (c.x < -60) c.x = WORLD.w + 50; if (c.x > WORLD.w + 60) c.x = -50;
    if (c.y < -60) c.y = WORLD.h + 50; if (c.y > WORLD.h + 60) c.y = -50;
  }
  // Cheap pairwise separation so cars do not stack on each other.
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j];
      const d = dist(a.x, a.y, b.x, b.y);
      if (d > 0 && d < 40) {
        const push = (40 - d) / 2, nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
        a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      }
    }
  }
}

export function updateDriven(car, input, dt) {
  const fwd = (input.keys.w ? 1 : 0) - (input.keys.s ? 1 : 0);
  const steer = (input.keys.a ? 1 : 0) - (input.keys.d ? 1 : 0);
  if (fwd > 0) car.speed += TUNE.carAccel * dt;
  else if (fwd < 0) car.speed -= (car.speed > 0 ? TUNE.carBrake : TUNE.carAccel * 0.6) * dt;
  else car.speed -= car.speed * TUNE.carDrag * dt;
  car.speed = clamp(car.speed, -180, TUNE.carMax);
  const turnRate = TUNE.carTurn * clamp(Math.abs(car.speed) / 200, 0.25, 1);
  car.angle += steer * turnRate * dt * Math.sign(car.speed || 1);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 24, WORLD.w - 24);
  car.y = clamp(car.y, 24, WORLD.h - 24);
  return Math.abs(car.speed);
}

export function nearestCar(cars, x, y, maxD) {
  let best = null, bd = maxD;
  for (const c of cars) {
    const d = dist(c.x, c.y, x, y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function drawCar(ctx, c, cam) {
  // World coordinates: the caller translates the context by -cam.
  const sx = c.x, sy = c.y;
  if (sx < cam.x - 60 || sx > cam.x + cam.w + 60 || sy < cam.y - 60 || sy > cam.y + cam.h + 60) return;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(c.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-CAR_W / 2 + 2, -CAR_H / 2 + 3, CAR_W, CAR_H);
  ctx.fillStyle = c.color;
  ctx.beginPath(); ctx.roundRect(-CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H, 7); ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  ctx.beginPath(); ctx.roundRect(-6, -CAR_H / 2 + 4, 16, CAR_H - 8, 3); ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(CAR_W / 2 - 4, -CAR_H / 2 + 3, 3, 5);
  ctx.fillRect(CAR_W / 2 - 4, CAR_H / 2 - 8, 3, 5);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-CAR_W / 2 + 1, -CAR_H / 2 + 3, 3, 5);
  ctx.fillRect(-CAR_W / 2 + 1, CAR_H / 2 - 8, 3, 5);
  if (c.kind === 'cop') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-10, -CAR_H / 2 + 2, 20, 5);
    ctx.fillStyle = '#2f6df6';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PMPD', 0, 3);
  }
  ctx.restore();
}
