// Vehicles: the player's stolen rides and the traffic AI. Traffic cars
// cruise the road lattice, turn at intersections and brake for the car
// ahead; the driven car has simple arcade physics with drift.
import { CONFIG, PALETTE } from './config.js';
import { clamp, dist, pick, range, angleDiff } from './random.js';
import { collideBuildings, inHarbor, nearestRoadX, nearestRoadY } from './city.js';

let nextCarId = 1;

export function makeCar(x, y, angle, opts = {}) {
  return {
    id: nextCarId++,
    x, y,
    angle,
    speed: opts.speed || 0,
    color: opts.color || pick(opts.rng, PALETTE.carColors),
    police: !!opts.police,
    target: opts.target || null,
    cruiseSpeed: opts.cruiseSpeed || range(opts.rng, 120, 200),
    dir: opts.dir || 1,
    // Orientation follows the heading when not given: a car pointing
    // north/south drives the vertical roads, east/west the horizontal ones.
    horizontal: opts.horizontal !== undefined ? opts.horizontal : Math.abs(Math.cos(angle)) >= Math.abs(Math.sin(angle)),
    turnCooldown: 0,
    hp: 100,
    name: opts.name || pick(opts.rng, ['Comet', 'Stingray', 'Bantam', 'Meridian GT', 'Tide Runner', 'Harbor Van', 'Coral Coupe']),
  };
}

export function spawnTraffic(city, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const horizontal = rng() < 0.5;
    const road = horizontal
      ? { x: range(rng, 100, CONFIG.worldWidth - 100), y: city.roadsY[Math.floor(rng() * city.roadsY.length)] }
      : { x: city.roadsX[Math.floor(rng() * city.roadsX.length)], y: range(rng, 100, city.harborY - 100) };
    const angle = horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    cars.push(makeCar(road.x, road.y, angle, { rng, horizontal, cruiseSpeed: range(rng, 110, 190) }));
  }
  return cars;
}

function carAhead(cars, self, lookAhead = 90) {
  const ax = self.x + Math.cos(self.angle) * lookAhead;
  const ay = self.y + Math.sin(self.angle) * lookAhead;
  for (const c of cars) {
    if (c === self) continue;
    if (dist(ax, ay, c.x, c.y) < 46) return c;
  }
  return null;
}

export function updateTrafficCar(car, city, cars, dt) {
  car.turnCooldown = Math.max(0, car.turnCooldown - dt);
  const onIntersection =
    Math.abs(car.x - nearestRoadX(city, car.x)) < CONFIG.roadWidth / 2 - 6 &&
    Math.abs(car.y - nearestRoadY(city, car.y)) < CONFIG.roadWidth / 2 - 6;
  // At an intersection, sometimes turn onto the crossing road.
  if (onIntersection && car.turnCooldown <= 0) {
    car.turnCooldown = 2 + Math.random() * 3;
    if (Math.random() < 0.35) {
      car.horizontal = !car.horizontal;
      car.angle = car.horizontal ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    }
  }
  // Snap gently back onto the road centerline.
  const targetRoad = car.horizontal ? nearestRoadY(city, car.y) : nearestRoadX(city, car.x);
  if (car.horizontal) car.y += (targetRoad - car.y) * Math.min(1, dt * 2);
  else car.x += (targetRoad - car.x) * Math.min(1, dt * 2);
  const blocked = carAhead(cars, car);
  const targetSpeed = blocked ? 0 : car.cruiseSpeed;
  car.speed += clamp(targetSpeed - car.speed, -400 * dt, 200 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // Wrap around the city edge so traffic never runs dry.
  if (car.x < -60) car.x = CONFIG.worldWidth + 50;
  if (car.x > CONFIG.worldWidth + 60) car.x = -50;
  if (car.y < -60) car.y = city.harborY - 40;
  if (car.y > city.harborY + 60) car.y = 40;
}

export function updateDrivenCar(car, input, dt) {
  const forward = input.keys.has('KeyW') || input.keys.has('ArrowUp');
  const back = input.keys.has('KeyS') || input.keys.has('ArrowDown');
  const left = input.keys.has('KeyA') || input.keys.has('ArrowLeft');
  const right = input.keys.has('KeyD') || input.keys.has('ArrowRight');
  if (forward) car.speed += CONFIG.carAccel * dt;
  else if (back) car.speed -= (car.speed > 0 ? CONFIG.carBrake : CONFIG.carAccel * 0.6) * dt;
  else car.speed -= Math.sign(car.speed) * 120 * dt;
  car.speed = clamp(car.speed, -CONFIG.carReverseSpeed, CONFIG.carMaxSpeed);
  if (Math.abs(car.speed) < 4 && !forward && !back) car.speed = 0;
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const grip = clamp(Math.abs(car.speed) / 200, 0.25, 1);
  car.angle += steer * CONFIG.carTurnRate * grip * dt * Math.sign(car.speed || 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  return { nx, ny };
}

export function collideCarWithCity(car, city, nx, ny) {
  if (collideBuildings(city, nx, ny, 22)) return true;
  if (inHarbor(city, nx, ny)) return true;
  if (nx < 24 || nx > CONFIG.worldWidth - 24 || ny < 24 || ny > CONFIG.worldHeight - 24) return true;
  return false;
}

export function drawCar(ctx, car, cam) {
  const sx = car.x - cam.x;
  const sy = car.y - cam.y;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-20, -10, 44, 24);
  ctx.fillStyle = car.police ? PALETTE.policeColor : car.color;
  ctx.fillRect(-22, -12, 44, 24);
  ctx.fillStyle = '#9fd8ff';
  ctx.fillRect(-6, -11, 14, 22);
  ctx.fillStyle = '#222831';
  ctx.fillRect(-20, -12, 6, 5);
  ctx.fillRect(-20, 7, 6, 5);
  ctx.fillRect(16, -12, 5, 5);
  ctx.fillRect(16, 7, 5, 5);
  if (car.police) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillText('PMPD', -14, 3);
  }
  ctx.restore();
  if (car.police && car.sirenOn) {
    const t = Date.now() / 300;
    ctx.fillStyle = Math.floor(t) % 2 === 0 ? '#ff3b30' : '#2f7bff';
    ctx.beginPath();
    ctx.arc(sx, sy - 16, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}
