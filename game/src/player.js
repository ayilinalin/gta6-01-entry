// On-foot player: WASD movement, mouse aim, simple top-down body rendering.
import { TUNE, PALETTE, WORLD } from './config.js';
import { clamp } from './random.js';
import { collideBuildings as cityCollide } from './city.js';

export function makePlayer(x, y) {
  return { x, y, r: 13, angle: -Math.PI / 2, hp: TUNE.playerHp, speed: 0, moving: false, inCar: null };
}

export function updatePlayer(p, input, dt, city) {
  let mx = (input.keys.d ? 1 : 0) - (input.keys.a ? 1 : 0);
  let my = (input.keys.s ? 1 : 0) - (input.keys.w ? 1 : 0);
  const len = Math.hypot(mx, my);
  p.moving = len > 0;
  if (len > 0) { mx /= len; my /= len; }
  const sp = TUNE.walkSpeed;
  p.x += mx * sp * dt;
  p.y += my * sp * dt;
  p.speed = len * sp;
  p.x = clamp(p.x, 16, WORLD.w - 16);
  p.y = clamp(p.y, 16, WORLD.h - 16);
  const fixed = cityCollide(city, p.x, p.y, p.r);
  p.x = fixed.x; p.y = fixed.y;
  p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);
}

export function drawPlayer(ctx, p, cam) {
  // World coordinates: the caller translates the context by -cam.
  const sx = p.x, sy = p.y;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(p.angle);
  // Shadow, body, head, gun.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(2, 4, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(-8, -9, 16, 18);
  ctx.fillStyle = PALETTE.player;
  ctx.fillRect(2, -9, 8, 18);
  ctx.fillStyle = '#222';
  ctx.fillRect(8, -2, 12, 4); // gun barrel
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#20242e';
  ctx.beginPath(); ctx.arc(-1, 0, 6, Math.PI * 0.6, Math.PI * 1.4); ctx.fill(); // hair
  ctx.restore();
  // Faint aim line.
  ctx.strokeStyle = 'rgba(255,210,60,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx + Math.cos(p.angle) * 18, sy + Math.sin(p.angle) * 18);
  ctx.lineTo(sx + Math.cos(p.angle) * 44, sy + Math.sin(p.angle) * 44);
  ctx.stroke();
}
