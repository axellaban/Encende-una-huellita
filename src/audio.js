// Sonido generado en el momento con Web Audio: colchón suave, campanitas, grillos y efectos.
// No usa archivos, así que no hay nada que descargar ni licenciar.
let ctx = null;
let music = null;
let nature = null;
let sfx = null;
let chimeTimer = null;
let cricketTimer = null;
let musicOn = false;
let soundsOn = true;

const ROOT = 196; // Sol
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
const semis = (n) => ROOT * 2 ** (n / 12);

function init() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  const out = ctx.createDynamicsCompressor();
  out.connect(ctx.destination);
  music = ctx.createGain();
  music.gain.value = 0;
  nature = ctx.createGain();
  nature.gain.value = 0;
  sfx = ctx.createGain();
  sfx.gain.value = 0.9;
  // Reverb simple (eco corto filtrado) para que todo suene a jardín abierto.
  const delay = ctx.createDelay();
  delay.delayTime.value = 0.32;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 1800;
  delay.connect(damp).connect(fb).connect(delay);
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  delay.connect(wet).connect(out);
  for (const g of [music, nature, sfx]) {
    g.connect(out);
    g.connect(delay);
  }

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 850;
  lp.connect(music);
  for (const n of [0, 7, 12, 16, 19]) {
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = semis(n - 12);
      o.detune.value = det;
      const g = ctx.createGain();
      g.gain.value = 0.03;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.04 + Math.random() * 0.08;
      const lg = ctx.createGain();
      lg.gain.value = 0.02;
      lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(lp);
      o.start();
      lfo.start();
    }
  }

  // Brisa: ruido filtrado muy bajito.
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'lowpass';
  bp.frequency.value = 420;
  const ng = ctx.createGain();
  ng.gain.value = 0.05;
  noise.connect(bp).connect(ng).connect(nature);
  noise.start();

  scheduleChime();
  scheduleCricket();
}

function chime() {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = semis(PENTA[(Math.random() * PENTA.length) | 0] + 12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.045, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
  o.connect(g).connect(music);
  o.start(t);
  o.stop(t + 3.6);
}

function scheduleChime() {
  chimeTimer = setTimeout(() => {
    if (musicOn) chime();
    scheduleChime();
  }, 2500 + Math.random() * 5000);
}

// Grillos: ráfagas cortas de un tono agudo.
function cricket() {
  const t0 = ctx.currentTime;
  const f = 4200 + Math.random() * 600;
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pan) pan.pan.value = Math.random() * 2 - 1;
  const chirps = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < chirps; i++) {
    const t = t0 + i * 0.07;
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.012, t + 0.01);
    g.gain.linearRampToValueAtTime(0, t + 0.045);
    o.connect(g);
    if (pan) g.connect(pan); else g.connect(nature);
    o.start(t);
    o.stop(t + 0.05);
  }
  if (pan) pan.connect(nature);
}

function scheduleCricket() {
  cricketTimer = setTimeout(() => {
    if (soundsOn && nature.gain.value > 0.01) cricket();
    scheduleCricket();
  }, 600 + Math.random() * 2200);
}

function ramp(node, v) {
  node.gain.cancelScheduledValues(ctx.currentTime);
  node.gain.setValueAtTime(node.gain.value, ctx.currentTime);
  node.gain.linearRampToValueAtTime(v, ctx.currentTime + 1.5);
}

export function setMusic(enabled) {
  musicOn = enabled;
  if (enabled) init();
  if (!ctx) return;
  ctx.resume();
  ramp(music, enabled ? 0.9 : 0);
}

export function setSounds(enabled) {
  soundsOn = enabled;
  if (enabled) init();
  if (!ctx) return;
  ctx.resume();
  ramp(nature, enabled ? 1 : 0);
  ramp(sfx, enabled ? 0.9 : 0);
}

export const isMusicOn = () => musicOn;
export const isSoundsOn = () => soundsOn;

// Al encender una vela: un arpegio brillante.
export function sparkle() {
  if (!ctx || !soundsOn) return;
  [0, 4, 7, 12].forEach((n, i) => {
    const t = ctx.currentTime + i * 0.08;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = semis(n + 24);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g).connect(sfx);
    o.start(t);
    o.stop(t + 1.5);
  });
}

// Toque suave para botones.
export function tick() {
  if (!ctx || !soundsOn) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.frequency.value = 880;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.03, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(sfx);
  o.start(t);
  o.stop(t + 0.13);
}

export function pauseAll(paused) {
  if (!ctx) return;
  if (paused) ctx.suspend();
  else if (musicOn || soundsOn) ctx.resume();
}

export function stopAll() {
  clearTimeout(chimeTimer);
  clearTimeout(cricketTimer);
  ctx?.close();
}
