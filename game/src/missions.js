// Mission chain + short story: four jobs for fixer Dara Solace across Port Meridian.
import { TUNE, CONTACT_NAME } from './config.js';
import { dist } from './random.js';

export const MISSIONS = [
  {
    id: 1, title: 'First Delivery', reward: TUNE.missionReward[0],
    briefing: `${CONTACT_NAME}: "New in town? Deliver this parcel to the Coral Hotel. Drive, don't walk — the client pays for speed."`,
    objective: 'Deliver the parcel to the Coral Hotel (downtown)',
    targetName: 'Coral Hotel',
  },
  {
    id: 2, title: 'Tail the Courier', reward: TUNE.missionReward[1],
    briefing: `${CONTACT_NAME}: "A courier is skimming my cut. Ram his car until he stops, then take the ledger. Don't let him reach the docks."`,
    objective: 'Ram the courier car until it stops, then grab the ledger',
    targetName: 'Courier',
  },
  {
    id: 3, title: 'Lose the Heat', reward: TUNE.missionReward[2],
    briefing: `${CONTACT_NAME}: "The PMPD saw the whole thing. Lose them — stay out of sight until the heat dies down."`,
    objective: 'Lose the PMPD: survive until wanted drops to 0',
    targetName: 'Escape',
  },
  {
    id: 4, title: 'Tide Mart Job', reward: TUNE.missionReward[3],
    briefing: `${CONTACT_NAME}: "Last job. Hit the Tide Mart, grab the cash, and get back to the Hideout in one piece. Then you're family."`,
    objective: 'Rob the Tide Mart, then reach the Hideout',
    targetName: 'Tide Mart',
  },
];

export function makeMissionState(landmarks) {
  const byName = {};
  for (const lm of landmarks) byName[lm.name] = lm;
  return {
    index: 0, done: 0, stage: 'go', // go | escape | return | complete
    target: byName['Coral Hotel'],
    courier: null, timer: 0, message: MISSIONS[0].briefing, messageTimer: 9,
    completedAll: false,
  };
}

export function currentMission(ms) { return MISSIONS[Math.min(ms.index, MISSIONS.length - 1)]; }

export function missionTargetPos(ms) {
  if (ms.index === 1 && ms.courier) return { x: ms.courier.x, y: ms.courier.y };
  if (!ms.target) return null;
  return { x: ms.target.x + ms.target.w / 2, y: ms.target.y + ms.target.h / 2 };
}

// Returns events: { type: 'complete'|'stage'|'fail', ... } for the main loop to act on.
export function updateMissions(ms, world, dt) {
  const events = [];
  const m = currentMission(ms);
  ms.messageTimer = Math.max(0, ms.messageTimer - dt);
  const px = world.player.x, py = world.player.y;
  const tp = missionTargetPos(ms);
  if (ms.index === 0) {
    if (tp && dist(px, py, tp.x, tp.y) < 70) events.push(finish(ms, m, world));
  } else if (ms.index === 1) {
    if (ms.courier) {
      if (ms.courier.hp <= 0) {
        ms.stage = 'return';
        ms.target = world.city.landmarks.find((l) => l.name === 'Hideout');
        ms.message = 'Ledger grabbed! Get back to the Hideout.'; ms.messageTimer = 6;
        events.push({ type: 'stage', text: 'Ledger grabbed — return to the Hideout' });
      }
    }
    if (ms.stage === 'return' && tp && dist(px, py, tp.x, tp.y) < 70) events.push(finish(ms, m, world));
  } else if (ms.index === 2) {
    if (world.police.wanted === 0) events.push(finish(ms, m, world));
  } else if (ms.index === 3) {
    if (ms.stage === 'go' && tp && dist(px, py, tp.x, tp.y) < 70) {
      ms.stage = 'return';
      ms.target = world.city.landmarks.find((l) => l.name === 'Hideout');
      world.money += 150; // cash from the till, on top of the job reward
      ms.message = 'Cash grabbed! Now reach the Hideout.'; ms.messageTimer = 6;
      events.push({ type: 'stage', text: 'Tide Mart robbed — reach the Hideout' });
    } else if (ms.stage === 'return' && tp && dist(px, py, tp.x, tp.y) < 70) {
      events.push(finish(ms, m, world));
    }
  }
  return events;
}

function finish(ms, m, world) {
  world.money += m.reward;
  world.rep += 1;
  ms.done += 1;
  ms.index += 1;
  if (ms.index >= MISSIONS.length) {
    ms.completedAll = true;
    ms.message = `${CONTACT_NAME}: "All four jobs done. Port Meridian is yours, kid."`;
    ms.messageTimer = 10;
    return { type: 'complete', mission: m, allDone: true };
  }
  const next = MISSIONS[ms.index];
  ms.stage = 'go';
  const name = next.id === 2 ? 'Courier' : next.targetName;
  ms.target = name === 'Courier' ? null : world.city.landmarks.find((l) => l.name === name);
  ms.message = next.briefing;
  ms.messageTimer = 9;
  return { type: 'complete', mission: m, allDone: false };
}

export function startCourier(ms, world) {
  const c = { x: world.player.x + 420, y: world.player.y - 120, angle: 0, speed: 130, hp: 100, color: '#ff7a2e', kind: 'courier' };
  ms.courier = c;
  return c;
}
