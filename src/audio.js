// Música ambiente generada en el momento con Web Audio: un colchón suave y campanitas pentatónicas.
// No usa archivos de audio, así que no hay nada que licenciar ni descargar.
let ctx = null;
let master = null;
let chimeTimer = null;
let on = false;

const ROOT = 196; // Sol
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];

function semis(n) {
  return ROOT * 2 ** (n / 12);
}

function start() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  master.connect(ctx.destination);
  lp.connect(master);

  // Colchón: acorde abierto con osciladores levemente desafinados y respiración lenta.
  for (const n of [0, 7, 12, 16, 19]) {
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = semis(n - 12);
      o.detune.value = det;
      const g = ctx.createGain();
      g.gain.value = 0.035;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain).connect(g.gain);
      o.connect(g).connect(lp);
      o.start();
      lfo.start();
    }
  }
  scheduleChime();
}

function chime() {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = semis(PENTA[(Math.random() * PENTA.length) | 0] + 12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 3.6);
}

function scheduleChime() {
  chimeTimer = setTimeout(() => {
    if (on) chime();
    scheduleChime();
  }, 2500 + Math.random() * 5000);
}

export function setMusic(enabled) {
  on = enabled;
  if (enabled && !ctx) start();
  if (!ctx) return;
  if (enabled) ctx.resume();
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.linearRampToValueAtTime(enabled ? 0.9 : 0, ctx.currentTime + 1.5);
}

// Sonido corto al encender una vela.
export function sparkle() {
  if (!ctx || !on) return;
  [0, 4, 7].forEach((n, i) => setTimeout(() => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = semis(n + 24);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 1.3);
  }, i * 90));
}

export function musicOn() {
  return on;
}

export function stopAll() {
  clearTimeout(chimeTimer);
  ctx?.close();
}
