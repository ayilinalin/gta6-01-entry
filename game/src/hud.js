// HUD: title block, wanted stars, health, money, objective bar, speed, clock,
// minimap with player / cops / mission marker, plus start and end screens.
import { GAME_NAME, CITY_NAME, CONTACT_NAME, WANTED_LABELS, VIEW, WORLD, PALETTE } from './config.js';
import { currentMission, MISSIONS } from './missions.js';
import { districtAt } from './city.js';
import { wantedLabel } from './police.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,10,16,0.72)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,210,60,0.35)'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function stars(ctx, x, y, n, size = 16) {
  ctx.font = `${size}px sans-serif`; ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < n ? '#ffd23c' : 'rgba(255,255,255,0.28)';
    ctx.fillText('★', x + i * (size + 2), y);
  }
}

export function drawHud(ctx, world) {
  const { player, police, money, rep, missions, clock } = world;
  panel(ctx, 12, 12, 218, 96);
  ctx.fillStyle = '#ffd23c'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(GAME_NAME, 22, 36);
  ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
  ctx.fillText(CITY_NAME + ' — ' + districtAt(player.x, player.y), 22, 54);
  stars(ctx, 22, 74, police.wanted, 15);
  ctx.fillStyle = police.wanted > 0 ? '#ff5a4a' : '#9be28a';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(wantedLabel(police.wanted).toUpperCase(), 112, 73);
  // Health bar.
  ctx.fillStyle = '#333'; ctx.fillRect(22, 80, 120, 9);
  ctx.fillStyle = player.hp > 30 ? '#58d977' : '#ff5a4a';
  ctx.fillRect(22, 80, 120 * Math.max(0, player.hp) / 100, 9);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif';
  ctx.fillText('$' + money.toLocaleString('en-US'), 150, 89);
  ctx.fillStyle = '#c9c9c9'; ctx.font = '11px sans-serif';
  ctx.fillText(`REP ★${rep}   MISSIONS ${missions.done}/4`, 22, 102);
  // Objective bar.
  const m = currentMission(missions);
  const obj = missions.completedAll ? 'All jobs done — Port Meridian is yours!' : `MISSION ${m.id}/4 — ${m.title}: ${m.objective}`;
  ctx.font = 'bold 14px sans-serif';
  const ow = ctx.measureText(obj).width + 28;
  panel(ctx, (VIEW.w - ow) / 2, VIEW.h - 44, ow, 30);
  ctx.fillStyle = '#ffd23c'; ctx.textAlign = 'center';
  ctx.fillText(obj, VIEW.w / 2, VIEW.h - 24);
  // Speed + clock, bottom right.
  const kmh = player.inCar ? Math.round(Math.abs(player.inCar.speed) * 0.36 * 3.6 / 2.2) : 0;
  panel(ctx, VIEW.w - 168, VIEW.h - 44, 156, 30);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText(player.inCar ? `${kmh} km/h` : 'ON FOOT', VIEW.w - 66, VIEW.h - 24);
  ctx.fillStyle = '#9be28a';
  const hh = String(Math.floor(clock / 60) % 24).padStart(2, '0');
  const mm = String(Math.floor(clock) % 60).padStart(2, '0');
  ctx.fillText(`${hh}:${mm}`, VIEW.w - 22, VIEW.h - 24);
  // Mission briefing toast.
  if (missions.messageTimer > 0) {
    ctx.font = '13px sans-serif';
    const mw = Math.min(VIEW.w - 80, ctx.measureText(missions.message).width + 28);
    panel(ctx, (VIEW.w - mw) / 2, 14, mw, 30);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(missions.message, VIEW.w / 2, 33);
  }
  drawMinimap(ctx, world);
}

export function drawMinimap(ctx, world) {
  const mw = 168, mh = 128, mx = VIEW.w - mw - 12, my = 12;
  panel(ctx, mx, my, mw, mh);
  const sx = mw / WORLD.w, sy = mh / WORLD.h;
  ctx.fillStyle = '#1c2733';
  ctx.fillRect(mx + 2, my + 2, mw - 4, mh - 4);
  // Water strip.
  ctx.fillStyle = '#1d6f8e';
  ctx.fillRect(mx + 2, my + 2 + (WORLD.h - 170) * sy, mw - 4, 170 * sy);
  // Roads as faint lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 56; x < WORLD.w; x += 276) { ctx.moveTo(mx + 2 + x * sx, my + 2); ctx.lineTo(mx + 2 + x * sx, my + mh - 2); }
  for (let y = 56; y < WORLD.h; y += 206) { ctx.moveTo(mx + 2, my + 2 + y * sy); ctx.lineTo(mx + mw - 2, my + 2 + y * sy); }
  ctx.stroke();
  // Mission marker.
  const tp = world.missionTargetPos ? world.missionTargetPos() : null;
  if (tp && !world.missions.completedAll) {
    ctx.fillStyle = '#ffd23c';
    ctx.beginPath(); ctx.arc(mx + 2 + tp.x * sx, my + 2 + tp.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd23c'; ctx.beginPath(); ctx.arc(mx + 2 + tp.x * sx, my + 2 + tp.y * sy, 9, 0, Math.PI * 2); ctx.stroke();
  }
  // Cops red, player green.
  ctx.fillStyle = '#ff3b30';
  for (const c of world.police.cops) ctx.fillRect(mx + c.x * sx - 2, my + 2 + c.y * sy - 2, 4, 4);
  ctx.fillStyle = '#58d977';
  ctx.beginPath(); ctx.arc(mx + 2 + world.player.x * sx, my + 2 + world.player.y * sy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#58d977'; ctx.beginPath(); ctx.arc(mx + 2 + world.player.x * sx, my + 2 + world.player.y * sy, 7, 0, Math.PI * 2); ctx.stroke();
}

export function drawStart(ctx, world, save) {
  // Sunset gradient, sun, skyline silhouette.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  g.addColorStop(0, '#2c2a55'); g.addColorStop(0.55, '#a34a6e'); g.addColorStop(1, '#1a1226');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(1000, 170, 90, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#171226';
  let bx = 0;
  const rngH = [300, 380, 330, 430, 360, 470, 320, 400, 350, 440];
  for (let i = 0; i < 10; i++) { const bw = 128; ctx.fillRect(bx, 720 - rngH[i], bw, rngH[i]); bx += bw; }
  ctx.fillStyle = '#ffd23c'; ctx.font = 'bold 84px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(GAME_NAME, 84, 210);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText('An open-world crime story in Port Meridian', 86, 258);
  ctx.font = '17px sans-serif'; ctx.fillStyle = '#e8e8e8';
  ctx.fillText('WASD move / drive  •  Mouse aim + click to shoot  •  E steal car  •  F get out', 86, 306);
  ctx.fillText(`Steal cars, outrun the PMPD, climb wanted level 0–5, run 4 story missions for ${CONTACT_NAME}.`, 86, 334);
  ctx.fillText('Traffic, pedestrians, roadblocks, robberies — the whole harbor city is yours.', 86, 362);
  // Start button.
  ctx.fillStyle = '#ffd23c'; ctx.fillRect(84, 420, 300, 64);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(84, 420, 300, 64);
  ctx.fillStyle = '#171226'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('▶  START GAME', 108, 460);
  if (save) {
    ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
    ctx.fillText(`CONTINUE — $${save.money} • ${save.missionsDone}/4 missions (press C)`, 86, 510);
  }
  ctx.fillStyle = '#c9c9c9'; ctx.font = '14px sans-serif';
  ctx.fillText('Original game — no Rockstar content. Music & sound are procedural WebAudio.', 86, 560);
  ctx.fillText('Click START or press ENTER. Progress saves automatically to this browser.', 86, 584);
  ctx.textAlign = 'left';
}

export function drawEnd(ctx, world) {
  ctx.fillStyle = 'rgba(8,10,16,0.82)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const complete = world.endKind === 'complete';
  ctx.textAlign = 'center';
  ctx.fillStyle = complete ? '#ffd23c' : '#ff5a4a';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(complete ? 'PORT MERIDIAN IS YOURS' : 'BUSTED', VIEW.w / 2, 220);
  ctx.fillStyle = '#fff'; ctx.font = '22px sans-serif';
  ctx.fillText(
    complete ? 'All 4 missions complete — Dara Solace owes you one.' : 'The PMPD caught you. The city keeps its secrets — for now.',
    VIEW.w / 2, 272);
  ctx.font = 'bold 26px sans-serif'; ctx.fillStyle = '#ffd23c';
  ctx.fillText(`$${world.money.toLocaleString('en-US')} earned   •   ${world.missions.done}/4 missions   •   REP ★${world.rep}`, VIEW.w / 2, 340);
  ctx.fillStyle = '#e8e8e8'; ctx.font = '17px sans-serif';
  ctx.fillText('Press R to play again — steal cars, dodge the PMPD, finish all four jobs.', VIEW.w / 2, 400);
  ctx.fillStyle = '#ffd23c'; ctx.fillRect(VIEW.w / 2 - 150, 440, 300, 56);
  ctx.fillStyle = '#171226'; ctx.font = 'bold 24px sans-serif';
  ctx.fillText('▶  PLAY AGAIN', VIEW.w / 2, 476);
  ctx.textAlign = 'left';
}
