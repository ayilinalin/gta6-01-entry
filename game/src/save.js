// Save: one localStorage slot — money, missions done, reputation, player spot.
const KEY = 'neon-tide-save-v2';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s.money !== 'number' || typeof s.missionsDone !== 'number') return null;
    return s;
  } catch (e) { return null; }
}

export function writeSave(world) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      money: world.money, rep: world.rep, missionsDone: world.missions.done,
      missionIndex: world.missions.index, x: world.player.x, y: world.player.y,
      savedAt: Date.now(),
    }));
  } catch (e) { /* storage full or blocked: progress just is not kept */ }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}
