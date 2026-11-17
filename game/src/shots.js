// Deterministic screenshot scenarios: ?shot=1..4 puts the game into a
// fixed, seeded state so every screenshot is a real render of the code
// and reproducible. Shot 1 is the start screen, 2 is driving downtown,
// 3 is a wanted-3 police chase, 4 is the mission-complete screen.
import { CONFIG } from './config.js';
import { makeCar } from './vehicles.js';
import { addHeat } from './police.js';
import { currentMission } from './missions.js';

export function applyShot(game, shot) {
  const seed = 1000 + shot;
  game.rng = game.rng;
  if (shot === 1) {
    game.screen = 'start';
    return;
  }
  game.screen = 'play';
  if (shot === 2) {
    // Driving downtown at noon: Kio in a coupe on the east-west road,
    // traffic + peds around, mission marker ahead.
    game.player.x = 900;
    game.player.y = 480;
    const car = game.traffic.find((c) => !c.police) || makeCar(900, 480, 0, { rng: game.rng });
    car.x = 900;
    car.y = 480;
    car.angle = 0;
    car.speed = 260;
    car.color = '#e8c33d'; // yellow coupe — reads clearly against the roads
    game.player.inCar = car;
    game.missions.phase = 'active';
    game.missions.index = 0;
    game.missions.target = { x: 1450, y: 560, label: 'Coral Hotel' };
    game.missions.message = 'MISSION 1/4 — First Delivery: Deliver the parcel to the Coral Hotel';
    game.missions.messageTimer = 99;
  } else if (shot === 3) {
    // Wanted 3 chase: police on Kio's tail, mission 2 objective on the HUD.
    // Player drives north on the vertical road x=800; Vico flees ahead.
    game.player.x = 800;
    game.player.y = 880;
    const car = game.traffic.find((c) => !c.police) || makeCar(800, 880, 0, { rng: game.rng });
    car.x = 800;
    car.y = 880;
    car.angle = -Math.PI / 2;
    car.speed = 320;
    car.color = '#3d7dd9'; // blue coupe — distinct from Vico's red
    game.player.inCar = car;
    addHeat(game.wanted, 80);
    game.wanted.level = 3;
    game.wanted.decayTimer = 99;
    game.missions.phase = 'active';
    game.missions.index = 1;
    game.missions.target = { x: 800, y: 580, label: 'Vico Marlowe' };
    game.missions.message = 'MISSION 2/4 — The Debt Collector: Chase Vico Marlowe';
    game.missions.messageTimer = 99;
    game.policeCars = [];
    const policeSpots = [[680, 1150], [920, 1180], [800, 1260]];
    for (const [px, py] of policeSpots) {
      const pc = makeCar(px, py, -Math.PI / 2, { rng: game.rng, police: true });
      pc.sirenOn = true;
      pc.speed = 380;
      game.policeCars.push(pc);
    }
    game.targetCar = makeCar(800, 580, -Math.PI / 2, { rng: game.rng, color: '#d94f3d', name: 'Vico Marlowe' });
    game.targetCar.hp = 60;
  } else if (shot === 4) {
    // Mission complete: payout toast, cash in hand, wanted cooling off.
    game.player.x = 1450;
    game.player.y = 560;
    game.player.cash = 2400;
    game.player.reputation = 3;
    game.missions.done = 3;
    game.missions.index = 3;
    game.missions.phase = 'briefing';
    game.missions.message = 'MISSION COMPLETE: Hot Pursuit — +$900';
    game.missions.messageTimer = 99;
    const m = currentMission(game.missions);
    game.endScreen = {
      title: 'MISSION COMPLETE',
      lines: [
        `${m ? m.title : 'The Tidewater Job'} — Dara Solace pays up.`,
        'Missions finished: 3 of 4. Reputation ★3.',
        'The harbor is yours tonight, Kio.',
      ],
      hint: 'Press ENTER to start the final mission.',
    };
    // Show the win overlay over the city for this shot.
    game.screen = 'won';
  }
  // Center the camera on the player for the shot.
  game.cam.x = game.player.x - CONFIG.canvasWidth / 2;
  game.cam.y = game.player.y - CONFIG.canvasHeight / 2;
}
