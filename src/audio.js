// Sonido generado en el momento con Web Audio: guitarra de cuerdas punteadas en vals (composición
// propia, progresión menor típica de la canción mexicana), un colchón muy suave, grillos y efectos.
// No usa archivos, así que no hay nada que descargar ni licenciar.
let ctx = null;
let music = null;
let nature = null;
let sfx = null;
let chimeTimer = null;
let cricketTimer = null;
let bubbleTimer = null;
let stream = null; // el murmullo del río (sube cuando estás cerca)
let riverK = 0;
let musicOn = false;
let soundsOn = true;

const ROOT = 196; // Sol
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
      g.gain.value = 0.012;
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

  // El río: el mismo ruido con un filtro que se mueve (borbotea), más fuerte cerca del agua.
  const shp = ctx.createBiquadFilter();
  shp.type = 'highpass';
  shp.frequency.value = 240;
  const sbp = ctx.createBiquadFilter();
  sbp.type = 'bandpass';
  sbp.frequency.value = 760;
  sbp.Q.value = 0.55;
  const wob = ctx.createOscillator();
  wob.frequency.value = 0.37;
  const wg = ctx.createGain();
  wg.gain.value = 280;
  wob.connect(wg).connect(sbp.frequency);
  wob.start();
  stream = ctx.createGain();
  stream.gain.value = 0.22 * riverK;
  const water = ctx.createBufferSource();
  water.buffer = buf;
  water.loop = true;
  water.playbackRate.value = 0.83;
  water.connect(shp).connect(sbp).connect(stream).connect(nature);
  water.start();
  scheduleBubble();

  scheduleChime();
  scheduleCricket();
}

// Cuerda punteada: triángulo + diente de sierra con filtro que se cierra, como una guitarra de nylon.
function pluck(midi, t, vel = 1) {
  const f = 440 * 2 ** ((midi - 69) / 12);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.8;
  lp.frequency.setValueAtTime(Math.min(5200, f * 9), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.4), t + 0.45);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.07 * vel, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  for (const [type, k, det] of [['triangle', 1, 0], ['sawtooth', 0.35, 4]]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = det;
    const og = ctx.createGain();
    og.gain.value = k;
    o.connect(og).connect(lp);
    o.start(t);
    o.stop(t + 2.7);
  }
  lp.connect(g).connect(music);
}

// Vals lento: bajo en el 1, acorde en el 2 y el 3. Am – Dm – G – C – F – Dm – E7 – Am.
const CHORDS = [
  [45, [57, 60, 64]], [50, [57, 62, 65]], [43, [55, 59, 62]], [48, [55, 60, 64]],
  [41, [57, 60, 65]], [50, [57, 62, 65]], [40, [56, 59, 62, 64]], [45, [57, 60, 64]],
];
const MELODY = [76, 74, 72, 71, 72, 74, 72, 69, 77, 76, 74, 72, 71, 72, 69, null];
let bar = 0;
let nextT = 0;
function scheduleChime() {
  chimeTimer = setTimeout(() => {
    if (musicOn && ctx.state === 'running') {
      const beat = 60 / 76;
      if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.1;
      while (nextT < ctx.currentTime + 1.2) {
        const [bass, chord] = CHORDS[bar % CHORDS.length];
        pluck(bass, nextT, 1);
        chord.forEach((n, i) => pluck(n, nextT + beat + i * 0.025, 0.55));
        chord.forEach((n, i) => pluck(n, nextT + beat * 2 + i * 0.025, 0.45));
        // Una melodía suave cada tanto (cada dos vueltas).
        const mel = MELODY[bar % MELODY.length];
        if (mel && Math.floor(bar / CHORDS.length) % 2 === 1) pluck(mel, nextT + 0.02, 0.6);
        nextT += beat * 3;
        bar++;
      }
    }
    scheduleChime();
  }, 300);
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

// Burbujitas del agua (un "plip" que sube de tono), más seguidas cuanto más cerca.
function bubble() {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  const f0 = 320 + Math.random() * 520;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + 0.07);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.022 * riverK, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(g).connect(nature);
  o.start(t);
  o.stop(t + 0.1);
}

function scheduleBubble() {
  bubbleTimer = setTimeout(() => {
    if (soundsOn && riverK > 0.15 && nature.gain.value > 0.01) bubble();
    scheduleBubble();
  }, 140 + Math.random() * (900 - riverK * 650));
}

// 0 = lejos del río, 1 = en la orilla o sobre el puente.
export function setRiver(k) {
  riverK = k;
  if (!ctx || !stream) return;
  stream.gain.setTargetAtTime(0.22 * k, ctx.currentTime, 0.4);
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

// "Ding" del ascensor.
export function ding() {
  if (!ctx || !soundsOn) return;
  [[1318.5, 0], [1046.5, 0.22]].forEach(([f, d]) => {
    const t = ctx.currentTime + d;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g).connect(sfx);
    o.start(t);
    o.stop(t + 1.7);
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
  clearTimeout(bubbleTimer);
  ctx?.close();
}
