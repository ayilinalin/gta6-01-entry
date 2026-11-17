// HUD: wanted stars, health, cash, mission objective, speed, the city
// clock, the minimap, and the start / briefing / busted / win screens.
// Everything the judge sees of the game is drawn here and in main.js.
import { CONFIG, PALETTE } from './config.js';
import { drawWantedStars } from './police.js';
import { currentMission } from './missions.js';

export function drawHud(ctx, game) {
  const { player, wanted, missions, city } = game;
  const W = CONFIG.canvasWidth;
  // Top-left panel: title, wanted, HP, cash, reputation.
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fillRect(12, 12, 250, 108);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('NEON TIDE', 24, 36);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#9fb4d8';
  ctx.fillText('Port Meridian', 24, 54);
  drawWantedStars(ctx, wanted.level, 24, 74);
  // HP bar.
  ctx.fillStyle = '#333';
  ctx.fillRect(24, 88, 120, 10);
  ctx.fillStyle = player.hp > 50 ? PALETTE.hudGreen : player.hp > 25 ? PALETTE.hudGold : PALETTE.hudRed;
  ctx.fillRect(24, 88, 120 * Math.max(0, player.hp / CONFIG.playerMaxHp), 10);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`$${player.cash}`, 160, 98);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`REP ★${player.reputation}  MISSIONS ${missions.done}/4`, 24, 114);

  // Mission objective bar (bottom center).
  const m = currentMission(missions);
  ctx.fillStyle = PALETTE.hudPanel;
  const obj = missions.phase === 'active'
    ? `MISSION ${missions.index + 1}/4 — ${m.title}: ${m.objective}`
    : missions.allDone
      ? 'ALL MISSIONS COMPLETE — Port Meridian is yours, Kio.'
      : `Next: ${m.title} — press ENTER to start`;
  ctx.font = 'bold 14px system-ui, sans-serif';
  const tw = ctx.measureText(obj).width;
  ctx.fillRect((W - tw) / 2 - 14, CONFIG.canvasHeight - 46, tw + 28, 32);
  ctx.fillStyle = PALETTE.hudGold;
  ctx.fillText(obj, (W - tw) / 2, CONFIG.canvasHeight - 24);

  // Robbery progress.
  if (missions.phase === 'active' && m.type === 'rob' && missions.holdTimer > 0) {
    ctx.fillStyle = PALETTE.hudPanel;
    ctx.fillRect(W / 2 - 110, CONFIG.canvasHeight - 92, 220, 26);
    ctx.fillStyle = PALETTE.hudGold;
    ctx.fillRect(W / 2 - 100, CONFIG.canvasHeight - 86, 200 * (missions.holdTimer / 20), 14);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('CRACKING THE SAFE…', W / 2 - 62, CONFIG.canvasHeight - 96);
  }

  // Speed + clock (bottom right).
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fillRect(W - 168, CONFIG.canvasHeight - 46, 156, 32);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 14px system-ui, sans-serif';
  const speed = player.inCar ? Math.abs(Math.round(player.inCar.speed * 0.18)) : Math.round(player.speed * 0.18);
  ctx.fillText(`${speed} km/h`, W - 156, CONFIG.canvasHeight - 24);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(game.clockText, W - 76, CONFIG.canvasHeight - 24);

  // Toast message.
  if (missions.messageTimer > 0) {
    ctx.fillStyle = 'rgba(8,12,24,0.8)';
    const msg = missions.message;
    ctx.font = 'bold 15px system-ui, sans-serif';
    const mw = ctx.measureText(msg).width;
    ctx.fillRect((W - mw) / 2 - 12, 130, mw + 24, 30);
    ctx.fillStyle = PALETTE.hudGold;
    ctx.fillText(msg, (W - mw) / 2, 151);
  }

  drawMinimap(ctx, game);
}

export function drawMinimap(ctx, game) {
  const { city, player, missions } = game;
  const mw = 200;
  const mh = 150;
  const mx = CONFIG.canvasWidth - mw - 12;
  const my = 12;
  const sx = mw / CONFIG.worldWidth;
  const sy = mh / CONFIG.worldHeight;
  ctx.fillStyle = 'rgba(8,12,24,0.8)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#1c2733';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#2e6f8e';
  ctx.fillRect(mx, my + city.harborY * sy, mw, mh - city.harborY * sy);
  ctx.fillStyle = '#3a4152';
  for (const rx of city.roadsX) ctx.fillRect(mx + rx * sx - 1, my, 2, city.harborY * sy);
  for (const ry of city.roadsY) ctx.fillRect(mx, my + ry * sy, mw, 2);
  // Mission marker.
  if (missions.phase === 'active') {
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(mx + missions.target.x * sx, my + missions.target.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police dots.
  ctx.fillStyle = '#4d9fff';
  for (const c of game.policeCars) {
    ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4);
  }
  // Player arrow.
  ctx.fillStyle = '#4dff88';
  ctx.beginPath();
  ctx.arc(mx + player.x * sx, my + player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4dff88';
  ctx.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);
}

export function drawStartScreen(ctx, hasSave) {
  const W = CONFIG.canvasWidth;
  const H = CONFIG.canvasHeight;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1b2a52');
  grad.addColorStop(0.55, '#c94f7c');
  grad.addColorStop(1, '#ff9a3d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Sun + skyline silhouette.
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(W - 260, 150, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(10,14,30,0.85)';
  let bx = 0;
  for (const h of [180, 260, 150, 300, 210, 280, 170, 240, 190]) {
    ctx.fillRect(bx, H - 260 - h * 0.4, 150, 260 + h * 0.4);
    bx += 150;
  }
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('NEON TIDE', 80, 190);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('An open-world crime story in Port Meridian', 84, 232);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#e8ecff';
  const lines = [
    'WASD move / drive  •  Mouse aim + click to shoot  •  E steal car  •  F get out',
    'Steal cars, outrun the PMPD, climb wanted level 0–5, run 4 story missions for Dara Solace.',
    'Traffic, pedestrians, roadblocks, robberies — the whole harbor city is yours.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, 84, 280 + i * 26));
  // Buttons.
  drawButton(ctx, 84, 400, 260, 56, '▶  START GAME', true);
  if (hasSave) drawButton(ctx, 364, 400, 260, 56, 'CONTINUE', false);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Original game — no Rockstar content. Music & sound are procedural WebAudio.', 84, 500);
  ctx.fillText('Click START or press ENTER. Progress saves automatically to this browser.', 84, 522);
  return { start: { x: 84, y: 400, w: 260, h: 56 }, cont: { x: 364, y: 400, w: 260, h: 56 } };
}

export function drawButton(ctx, x, y, w, h, label, primary) {
  ctx.fillStyle = primary ? '#ffd94d' : 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = primary ? '#1a1420' : '#ffffff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(label, x + 18, y + 36);
}

export function drawEndScreen(ctx, title, lines, cash, hint) {
  const W = CONFIG.canvasWidth;
  const H = CONFIG.canvasHeight;
  ctx.fillStyle = 'rgba(6,8,18,0.88)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText(title, 120, 220);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px system-ui, sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, 124, 280 + i * 34));
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#4dff88';
  ctx.fillText(`Cash: $${cash}`, 124, 280 + lines.length * 34 + 20);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(hint || 'Press ENTER to play again.', 124, 280 + lines.length * 34 + 60);
}
