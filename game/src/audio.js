// Procedural WebAudio: engine hum, siren, gunshots, pickup and mission jingles.
// No audio files — every sound is synthesized on the fly.
export function makeAudio() {
  return { ctx: null, master: null, engine: null, engineGain: null, muted: false, sirenOn: false, sirenOsc: null };
}

export function ensureAudio(a) {
  if (a.ctx) { if (a.ctx.state === 'suspended') a.ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    a.ctx = new AC();
    a.master = a.ctx.createGain();
    a.master.gain.value = 0.32;
    a.master.connect(a.ctx.destination);
    // Looping engine oscillator, pitch follows speed.
    a.engine = a.ctx.createOscillator();
    a.engine.type = 'sawtooth';
    a.engine.frequency.value = 55;
    a.engineGain = a.ctx.createGain();
    a.engineGain.gain.value = 0;
    const lp = a.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    a.engine.connect(lp); lp.connect(a.engineGain); a.engineGain.connect(a.master);
    a.engine.start();
  } catch (e) { /* audio unavailable: the game stays silent, never crashes */ }
}

function tone(a, freq, dur, type, vol, slideTo) {
  if (!a.ctx || a.muted) return;
  const t = a.ctx.currentTime;
  const o = a.ctx.createOscillator(), g = a.ctx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(a.master);
  o.start(t); o.stop(t + dur + 0.02);
}

export function setEngine(a, speed01, driving) {
  if (!a.ctx || !a.engine) return;
  a.engine.frequency.value = 50 + speed01 * 130;
  a.engineGain.gain.value = driving ? 0.05 + speed01 * 0.06 : 0;
}

export function sfxShoot(a) { tone(a, 880, 0.09, 'square', 0.16, 140); }
export function sfxHit(a) { tone(a, 220, 0.08, 'triangle', 0.2, 90); }
export function sfxPickup(a) { tone(a, 660, 0.1, 'sine', 0.2); setTimeout(() => tone(a, 990, 0.14, 'sine', 0.2), 90); }
export function sfxMission(a) {
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(a, f, 0.18, 'triangle', 0.22), i * 110));
}
export function sfxBusted(a) {
  [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(a, f, 0.3, 'sawtooth', 0.16), i * 160));
}
export function sfxSteal(a) { tone(a, 300, 0.12, 'square', 0.14, 520); }

export function setSiren(a, on) {
  if (!a.ctx || a.sirenOn === on) return;
  a.sirenOn = on;
  if (!on) { if (a.sirenOsc) { try { a.sirenOsc.stop(); } catch (e) {} a.sirenOsc = null; } return; }
  const o = a.ctx.createOscillator(), g = a.ctx.createGain();
  o.type = 'sine'; g.gain.value = 0.045;
  const lfo = a.ctx.createOscillator(), lg = a.ctx.createGain();
  lfo.frequency.value = 0.7; lg.gain.value = 320;
  lfo.connect(lg); lg.connect(o.frequency);
  o.frequency.value = 780;
  o.connect(g); g.connect(a.master);
  o.start(); lfo.start();
  a.sirenOsc = o; a.sirenLfo = lfo;
}
