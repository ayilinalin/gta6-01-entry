// Procedural sound: everything is synthesized with WebAudio — engine hum,
// two-tone police siren, gunshot noise, coin pickup, mission jingle.
// No audio files, no network.
export function createAudio() {
  return { ctx: null, engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null, muted: false };
}

export function ensureAudio(audio) {
  if (audio.ctx) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new AC();
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 60;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineOsc.connect(audio.engineGain);
    audio.engineGain.connect(audio.ctx.destination);
    audio.engineOsc.start();
    audio.sirenOsc = audio.ctx.createOscillator();
    audio.sirenOsc.type = 'sine';
    audio.sirenOsc.frequency.value = 700;
    audio.sirenGain = audio.ctx.createGain();
    audio.sirenGain.gain.value = 0;
    audio.sirenOsc.connect(audio.sirenGain);
    audio.sirenGain.connect(audio.ctx.destination);
    audio.sirenOsc.start();
  } catch (e) {
    audio.ctx = null;
  }
}

export function setEngine(audio, speedNorm, driving) {
  if (!audio.ctx || !audio.engineOsc) return;
  const target = driving ? 0.03 + speedNorm * 0.05 : 0;
  audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
  audio.engineOsc.frequency.setTargetAtTime(55 + speedNorm * 140, audio.ctx.currentTime, 0.1);
}

export function setSiren(audio, wantedLevel, time) {
  if (!audio.ctx || !audio.sirenOsc) return;
  if (wantedLevel > 0) {
    audio.sirenGain.gain.setTargetAtTime(0.02, audio.ctx.currentTime, 0.2);
    audio.sirenOsc.frequency.setTargetAtTime(Math.sin(time * 4) > 0 ? 750 : 950, audio.ctx.currentTime, 0.05);
  } else {
    audio.sirenGain.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.2);
  }
}

function blip(audio, freq, dur, type = 'square', vol = 0.06) {
  if (!audio.ctx) return;
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, audio.ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + dur);
  o.connect(g);
  g.connect(audio.ctx.destination);
  o.start();
  o.stop(audio.ctx.currentTime + dur);
}

export function playGunshot(audio) {
  if (!audio.ctx) return;
  const len = audio.ctx.sampleRate * 0.12;
  const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audio.ctx.createBufferSource();
  src.buffer = buf;
  const g = audio.ctx.createGain();
  g.gain.value = 0.25;
  src.connect(g);
  g.connect(audio.ctx.destination);
  src.start();
}

export function playPickup(audio) {
  blip(audio, 880, 0.12, 'sine', 0.08);
  setTimeout(() => blip(audio, 1320, 0.15, 'sine', 0.08), 90);
}

export function playMissionComplete(audio) {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(audio, f, 0.22, 'triangle', 0.09), i * 120));
}

export function playBusted(audio) {
  [400, 300, 200].forEach((f, i) => setTimeout(() => blip(audio, f, 0.3, 'sawtooth', 0.07), i * 160));
}
