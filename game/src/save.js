// Save / load via localStorage: cash, reputation, missions done, and the
// player's last position. One slot, auto-saved on mission completion.
import { CONFIG } from './config.js';

export function loadSave() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function saveGame(player, missions) {
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify({
      cash: player.cash,
      reputation: player.reputation,
      missionsDone: missions.done,
      missionIndex: missions.index,
      x: Math.round(player.x),
      y: Math.round(player.y),
      savedAt: Date.now(),
    }));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(CONFIG.saveKey);
  } catch (e) {
    // Storage unavailable — the game still runs, it just cannot save.
  }
}
