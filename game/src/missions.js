// Missions: a four-job story chain for Kio Rendra, handed out by fixer
// Dara Solace. Each mission is a small state machine with a map marker,
// an objective line and a cash payout. Finish all four to win the run.
import { CONFIG } from './config.js';
import { dist } from './random.js';

export const MISSION_DEFS = [
  {
    id: 1,
    title: 'First Delivery',
    giver: 'Dara Solace',
    briefing: 'A sealed parcel for the Coral Hotel. Drive it there, no questions. The city is watching — keep it clean.',
    objective: 'Deliver the parcel to the Coral Hotel (downtown)',
    type: 'goto',
    reward: 400,
  },
  {
    id: 2,
    title: 'The Debt Collector',
    giver: 'Dara Solace',
    briefing: 'Vico Marlowe skipped town owing Dara 700 tide-dollars. His red coupe is heading for the harbor. Ram it until it stops.',
    objective: 'Chase Vico Marlowe and wreck his red coupe',
    type: 'chase',
    reward: 700,
  },
  {
    id: 3,
    title: 'Hot Pursuit',
    giver: 'Dara Solace',
    briefing: 'The PMPD is onto you after that chase. Lose them — stay out of sight until the heat dies down.',
    objective: 'Escape the police: drop your wanted level to 0',
    type: 'escape',
    reward: 900,
  },
  {
    id: 4,
    title: 'The Tidewater Job',
    giver: 'Dara Solace',
    briefing: 'One last job: the Tidewater pawn shop, pier 3. Hold the counter for 20 seconds and the safe is yours. Then vanish.',
    objective: 'Rob the Tidewater pawn shop — hold the counter 20s',
    type: 'rob',
    reward: 1500,
  },
];

export function createMissionState(city) {
  return {
    index: 0,
    phase: 'briefing',
    timer: 0,
    holdTimer: 0,
    target: missionTarget(city, 0),
    done: 0,
    allDone: false,
    message: '',
    messageTimer: 0,
  };
}

export function missionTarget(city, index) {
  const c = city.roadsX;
  const r = city.roadsY;
  switch (index) {
    case 0:
      return { x: c[4], y: r[2], label: 'Coral Hotel' };
    case 1:
      return { x: c[6], y: r[4], label: 'Vico Marlowe' };
    case 2:
      return { x: c[1], y: r[1], label: 'Safehouse' };
    case 3:
      return { x: 220 + 2 * 560 + 60, y: city.harborY - 60, label: 'Tidewater Pawn' };
    default:
      return { x: c[3], y: r[2], label: 'Port Meridian' };
  }
}

export function currentMission(state) {
  return MISSION_DEFS[state.index] || null;
}

export function startMission(state, city) {
  state.phase = 'active';
  state.timer = 0;
  state.holdTimer = 0;
  state.target = missionTarget(city, state.index);
  state.message = `${currentMission(state).title}: ${currentMission(state).objective}`;
  state.messageTimer = 5;
}

export function completeMission(state, player, city) {
  const m = currentMission(state);
  player.cash += m.reward;
  player.reputation += 1;
  state.done += 1;
  state.message = `MISSION COMPLETE: ${m.title} — +$${m.reward}`;
  state.messageTimer = 5;
  if (state.index + 1 >= MISSION_DEFS.length) {
    state.allDone = true;
    state.phase = 'won';
  } else {
    state.index += 1;
    state.phase = 'briefing';
    state.target = missionTarget(city, state.index);
  }
  return m.reward;
}

// Returns 'completed' when the active mission's condition is met this tick.
export function updateMissions(state, player, wanted, targetCar, dt) {
  if (state.phase !== 'active') return null;
  state.timer += dt;
  const m = currentMission(state);
  const t = state.target;
  if (m.type === 'goto') {
    if (dist(player.x, player.y, t.x, t.y) < 70) return 'completed';
  } else if (m.type === 'chase') {
    if (targetCar && targetCar.hp <= 0) return 'completed';
    if (targetCar) {
      state.target = { x: targetCar.x, y: targetCar.y, label: 'Vico Marlowe' };
    }
  } else if (m.type === 'escape') {
    if (wanted.level === 0) return 'completed';
  } else if (m.type === 'rob') {
    if (dist(player.x, player.y, t.x, t.y) < 80) {
      state.holdTimer += dt;
      if (state.holdTimer >= 20) return 'completed';
    } else {
      state.holdTimer = Math.max(0, state.holdTimer - dt * 2);
    }
  }
  return null;
}

export function drawMissionMarker(ctx, state, cam, time) {
  if (state.phase !== 'active') return;
  const t = state.target;
  const sx = t.x - cam.x;
  const sy = t.y - cam.y;
  if (sx < -40 || sx > 1320 || sy < -40 || sy > 760) return;
  const pulse = 1 + Math.sin(time * 5) * 0.15;
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx, sy, 26 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.moveTo(sx, sy - 34);
  ctx.lineTo(sx - 8, sy - 18);
  ctx.lineTo(sx + 8, sy - 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(t.label, sx + 14, sy - 22);
}
