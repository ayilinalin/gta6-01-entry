// Scripted shots: ?shot=1..4 stages the exact scene each screenshot needs.
// Deterministic seeds keep every capture identical between runs.
import { makeRng } from './random.js';
import { MISSIONS } from './missions.js';

export function shotFromUrl() {
  const m = /[?&]shot=([1-4])/.exec(location.search);
  return m ? Number(m[1]) : 0;
}

// Applies a shot preset to a freshly built world. Returns the HUD caption for the shot.
export function applyShot(n, world, api) {
  const { missions, police, player } = world;
  if (n === 1) {
    world.mode = 'start';
    return 'Start screen';
  }
  if (n === 2) {
    // Driving downtown in daylight: player in a red car, traffic + peds around.
    world.mode = 'play';
    const car = world.cars.find((c) => c.kind === 'parked') || world.cars[0];
    api.enterCar(car);
    car.x = 912; car.y = 340; car.angle = Math.PI / 2; car.speed = 150;
    player.x = car.x; player.y = car.y;
    missions.index = 0; missions.done = 0;
    world.money = 250; world.rep = 1;
    world.clock = 12 * 60 + 5;
    return 'Driving downtown';
  }
  if (n === 3) {
    // Chase: wanted 3, cops closing in, mission 2 target car fleeing ahead.
    world.mode = 'play';
    const car = world.cars.find((c) => c.kind === 'parked') || world.cars[0];
    api.enterCar(car);
    car.x = 912; car.y = 700; car.angle = Math.PI / 2; car.speed = 260;
    player.x = car.x; player.y = car.y;
    api.addHeat(3.5);
    missions.index = 1; missions.done = 1; missions.stage = 'go';
    missions.message = MISSIONS[1].briefing; missions.messageTimer = 9;
    api.startCourier();
    world.missions.courier.x = car.x + 60; world.missions.courier.y = car.y + 320;
    world.money = 650; world.rep = 2;
    world.clock = 15 * 60 + 40;
    return 'Police chase, wanted 3';
  }
  // Shot 4: mission complete screen with payout.
  world.mode = 'end';
  world.endKind = 'complete';
  world.money = 2200; world.rep = 4; missions.done = 4; missions.completedAll = true;
  world.clock = 18 * 60 + 20;
  return 'All missions complete';
}
