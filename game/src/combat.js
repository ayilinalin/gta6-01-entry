// Combat: bullets, muzzle flashes and hit feedback. The player shoots
// with the mouse (pistol, on foot) or punches up close; police and the
// mission target can be damaged. Every shot raises the heat.
import { CONFIG } from './config.js';
import { dist } from './random.js';

export function createCombat() {
  return { bullets: [], flashes: [], tracers: [] };
}

export function fireBullet(combat, x, y, angle, owner) {
  combat.bullets.push({
    x, y,
    vx: Math.cos(angle) * CONFIG.bulletSpeed,
    vy: Math.sin(angle) * CONFIG.bulletSpeed,
    life: 0.9,
    owner,
  });
  combat.flashes.push({ x: x + Math.cos(angle) * 26, y: y + Math.sin(angle) * 26, life: 0.08 });
}

export function updateBullets(combat, targets, dt, onHit) {
  for (const b of combat.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const t of targets) {
      if (t.dead || t.hp <= 0) continue;
      if (dist(b.x, b.y, t.x, t.y) < (t.radius || 22)) {
        t.hp -= CONFIG.bulletDamage;
        b.life = 0;
        combat.tracers.push({ x: b.x, y: b.y, life: 0.25, text: `-${CONFIG.bulletDamage}` });
        if (onHit) onHit(t);
        break;
      }
    }
  }
  combat.bullets = combat.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < CONFIG.worldWidth && b.y > 0 && b.y < CONFIG.worldHeight);
  combat.flashes = combat.flashes.filter((f) => (f.life -= dt) > 0);
  combat.tracers = combat.tracers.filter((t) => (t.life -= dt) > 0);
}

export function drawBullets(ctx, combat, cam) {
  for (const b of combat.bullets) {
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath();
    ctx.arc(b.x - cam.x, b.y - cam.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const f of combat.flashes) {
    ctx.fillStyle = 'rgba(255, 220, 100, 0.9)';
    ctx.beginPath();
    ctx.arc(f.x - cam.x, f.y - cam.y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = 'bold 13px system-ui, sans-serif';
  for (const t of combat.tracers) {
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText(t.text, t.x - cam.x, t.y - cam.y);
  }
}
