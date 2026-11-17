// The player on foot: WASD movement, mouse aim, punch and pistol combat,
// stealing cars with E and getting out with F. Kio Rendra, 24, a courier
// who got pulled into Port Meridian's neon underworld.
import { CONFIG } from './config.js';
import { clamp, dist } from './random.js';
import { collideBuildings, inHarbor } from './city.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    hp: CONFIG.playerMaxHp,
    cash: 0,
    reputation: 0,
    speed: 0,
    inCar: null,
    aimX: x,
    aimY: y,
    punchCooldown: 0,
    shootCooldown: 0,
    walking: false,
    name: 'Kio Rendra',
  };
}

export function updatePlayerOnFoot(player, input, city, dt) {
  let mx = 0;
  let my = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) my -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) my += 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) mx -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) mx += 1;
  const len = Math.hypot(mx, my) || 1;
  const running = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
  const speed = running ? CONFIG.playerRunSpeed : CONFIG.playerWalkSpeed;
  const nx = player.x + (mx / len) * speed * dt;
  const ny = player.y + (my / len) * speed * dt;
  player.walking = mx !== 0 || my !== 0;
  player.speed = player.walking ? speed : 0;
  // Move axis by axis so walls slide instead of sticking.
  if (!collideBuildings(city, nx, player.y, CONFIG.playerRadius) && !inHarbor(city, nx, player.y)) {
    player.x = clamp(nx, 20, CONFIG.worldWidth - 20);
  }
  if (!collideBuildings(city, player.x, ny, CONFIG.playerRadius) && !inHarbor(city, player.x, ny)) {
    player.y = clamp(ny, 20, CONFIG.worldHeight - 20);
  }
  player.angle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
  player.punchCooldown = Math.max(0, player.punchCooldown - dt);
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
}

export function nearestStealableCar(player, cars, maxDist = 70) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (car.police) continue;
    const d = dist(player.x, player.y, car.x, car.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function drawPlayer(ctx, player, cam, time) {
  const sx = player.x - cam.x;
  const sy = player.y - cam.y;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 10, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: teal jacket, dark jeans — Kio on foot.
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(player.angle);
  const bob = player.walking ? Math.sin(time * 14) * 2 : 0;
  ctx.fillStyle = '#1f9d8a';
  ctx.beginPath();
  ctx.arc(0, bob, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(8, -4 + bob, 12, 8);
  ctx.fillStyle = '#222831';
  ctx.beginPath();
  ctx.arc(14, bob, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Aim line.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + Math.cos(player.angle) * 34, sy + Math.sin(player.angle) * 34);
  ctx.stroke();
}
