// NEON TIDE — tuning and palette. Every number the other modules share lives here.
export const GAME_NAME = 'NEON TIDE';
export const CITY_NAME = 'Port Meridian';
export const CONTACT_NAME = 'Dara Solace';
export const POLICE_NAME = 'PMPD';

export const WORLD = { w: 2600, h: 1900, blockW: 220, blockH: 150, roadW: 56 };
export const VIEW = { w: 1280, h: 720 };

export const PALETTE = {
  grass: '#2e6b34', grass2: '#357a3b', road: '#23262e', roadEdge: '#3a3f4c',
  line: '#e8c832', sidewalk: '#4a4f5c', water: '#1d6f8e', sand: '#c9a86a',
  roof: ['#b5503c', '#3c6fb5', '#5d4a9e', '#2f8f6a', '#a8842f', '#7a3a5e'],
  neon: ['#ff2e88', '#22e6ff', '#ffd23c', '#7cff4a'],
  player: '#ffd23c', playerDark: '#c89b12', cop: '#2f6df6', copLight: '#ff3b30',
  pedSkin: ['#f2c79b', '#c98d5f', '#8a5a34', '#f7d7b0'],
};

export const TUNE = {
  walkSpeed: 205, runMult: 1.0, carAccel: 560, carBrake: 900, carMax: 520,
  carTurn: 2.9, carDrag: 0.55, trafficSpeed: 95, pedSpeed: 42,
  playerHp: 100, bulletSpeed: 720, bulletDamage: 34, fireCooldown: 0.22,
  copSpeed: 300, copRam: 8, wantedDecay: 0.012, bustRadius: 26,
  missionReward: [250, 400, 600, 900],
};

export const WANTED_LABELS = ['Clean', 'Suspicious', 'Wanted', 'Hot', 'Manhunt', 'LOCKDOWN'];
export const DISTRICTS = [
  { name: 'Downtown', x: 0, y: 0, w: 1500, h: 900 },
  { name: 'Old Docks', x: 0, y: 900, w: 1500, h: 500 },
  { name: 'Marina Bay', x: 1500, y: 0, w: 1100, h: 900 },
  { name: 'Southside', x: 1500, y: 900, w: 1100, h: 1000 },
];
