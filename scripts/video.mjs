// Graba videos de la jugabilidad cuadro a cuadro, con tiempo virtual: aunque el navegador dibuje a
// 1 cuadro por segundo (swiftshader, sin GPU), el video sale fluido a 30 cuadros por segundo.
//
//   npm run build && npm start      (con data/ limpio)
//   NODE_PATH=$(npm root -g) node scripts/video.mjs vertical   [salida.mp4]
//   NODE_PATH=$(npm root -g) node scripts/video.mjs horizontal [salida.mp4]
//
// VIDEO_FROM=<segundo> y VIDEO_TO=<segundo> graban sólo un tramo (para probar tomas);
// VIDEO_FPS cambia los cuadros por segundo (30 por defecto).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const FORMAT = process.argv[2] || 'vertical';
const OUT = process.argv[3] || `video-${FORMAT}.mp4`;
const BASE = process.env.VIDEO_URL || 'http://localhost:8787';
const FPS = Number(process.env.VIDEO_FPS || 30);
const SIZES = {
  // 1080x1920 (reel) y 1920x1080.
  vertical: { viewport: { width: 360, height: 640 }, scale: 3, mobile: true },
  horizontal: { viewport: { width: 1280, height: 720 }, scale: 1.5, mobile: false },
};
const S = SIZES[FORMAT];
if (!S) throw new Error(`Formato desconocido: ${FORMAT} (vertical u horizontal)`);

// ---------- tiempo virtual ----------
// performance.now, Date.now, requestAnimationFrame, setTimeout y setInterval pasan a depender de un
// reloj que avanza sólo cuando lo pedimos. Mientras carga, avanza solo (al ritmo real); para grabar
// se pasa a modo manual y cada __vt.step(ms) mueve el reloj, corre los temporizadores y dibuja.
const VIRTUAL_TIME = () => {
  const realST = window.setTimeout.bind(window);
  const realNow = performance.now.bind(performance);
  const DateNow = Date.now;
  const base = DateNow();
  let vt = realNow();
  let raf = [];
  let timers = [];
  let id = 1;
  let auto = true;
  performance.now = () => vt;
  Date.now = () => base + vt;
  window.requestAnimationFrame = (cb) => { raf.push({ id, cb }); return id++; };
  window.cancelAnimationFrame = (x) => { raf = raf.filter((r) => r.id !== x); };
  window.setTimeout = (fn, ms = 0, ...a) => { timers.push({ id, at: vt + (+ms || 0), fn, a }); return id++; };
  window.setInterval = (fn, ms = 0, ...a) => { timers.push({ id, at: vt + Math.max(1, +ms || 0), fn, a, every: Math.max(1, +ms || 0) }); return id++; };
  window.clearTimeout = window.clearInterval = (x) => { timers = timers.filter((t) => t.id !== x); };
  const runTimers = () => {
    for (let guard = 0; guard < 1000; guard++) {
      let next = null;
      for (const t of timers) if (t.at <= vt && (!next || t.at < next.at)) next = t;
      if (!next) break;
      if (next.every) next.at += next.every; else timers = timers.filter((t) => t !== next);
      try { typeof next.fn === 'function' ? next.fn(...next.a) : (0, eval)(next.fn); } catch (e) { console.error(e); }
    }
  };
  const frame = () => {
    const q = raf;
    raf = [];
    for (const r of q) { try { r.cb(vt); } catch (e) { console.error(e); } }
  };
  const step = (ms) => { vt += ms; runTimers(); frame(); };
  // Mientras carga: al ritmo real.
  let last = realNow();
  const pump = () => {
    if (!auto) return;
    const now = realNow();
    step(Math.min(100, now - last));
    last = now;
    realST(pump, 16);
  };
  realST(pump, 16);
  window.__vt = { step, manual() { auto = false; }, get now() { return vt; } };
};

// ---------- guion ----------
// Cada toma: en qué segundo arranca, qué hace al empezar (`run`) y, si hace falta, qué hace en cada
// cuadro (`tick`, con k = segundos desde que arrancó la toma). Es código que corre en la página, con
// H = __huellita, V(x, y, z) = un Vector3 y C = un objeto para guardar estado entre cuadros.
// Cortes rápidos cada 5–7 s; la cámara siempre en movimiento.
const TICK_PACK = `
    // La cámara sigue a la manada (los que están cerca), bajita, y mira un poco hacia la pelota.
    const M = C.M;
    const ball = H.spirits.ball.pos;
    // Los tres más cerca de la pelota (si están en la zona), que son los que juegan.
    const near = [...H.spirits.pack, H.spirits.companion].filter((a) => a && a.pos.distanceTo(M) < (C.R || 14))
      .sort((a, b) => a.pos.distanceTo(ball) - b.pos.distanceTo(ball)).slice(0, C.N || 9);
    const c = V(0, 0, 0);
    near.forEach((a) => c.add(a.pos));
    if (near.length) c.divideScalar(near.length); else c.copy(M);
    const target = c.clone().lerp(ball.clone().setY(0), 0.3).setY(C.ty || 0.45);
    const want = target.clone().add(C.off || V(-3.4 + k * 0.15, 1.15, 2.6));
    C.cam = C.cam ? C.cam.lerp(want, C.lerp || 0.06) : want;
    C.look = C.look ? C.look.lerp(target, 0.08) : target;
    H.controls.teleportCamera(C.cam, C.look);
`;
const SHOTS = [
  // 1. Del cielo estrellado baja sobre el salón con sus farolitos y la ofrenda central.
  { at: 0, run: `
    H.controls.placePlayer(V(0, 0, 50), V(0, 0, 30));
    H.controls.cinematic([
      { pos: V(12, 30, -10), look: V(-20, 40, -110) },
      { pos: V(9, 19, 4), look: V(0, 2, -14) },
      { pos: V(2, 10, 10), look: V(0, 1, -12) },
    ], 4.6);
  ` },
  // 2. El nicho de Luca: la llamita vuela a la veladora, la flor estalla en pétalos y el abrazo.
  { at: 4.5, run: `
    const m = H.memorials.find((x) => x.id === 'luca');
    const k = H.hall.memorialKey(m);
    H.goFloor(0);
    const { frame, stand } = H.hall.viewpoint(k, 0, 1);
    const n = stand.clone().sub(frame).setY(0).normalize();
    const r = V(n.z, 0, -n.x);
    H.controls.placePlayer(frame.clone().addScaledVector(n, 1.3).addScaledVector(r, -0.95).setY(0), frame.clone().setY(0));
    Object.assign(C, { frame, n, r });
    setTimeout(() => H.offer('luca', 'candle'), 700);
    setTimeout(() => H.offer('luca', 'flower'), 3000);
    setTimeout(() => H.offer('luca', 'hug'), 5100);
  `, tick: `
    // Un acercamiento lento al nicho.
    const u = Math.min(1, k / 7.3);
    const e = 1 - (1 - u) ** 2;
    const pos = C.frame.clone().addScaledVector(C.n, 3.95 - 0.8 * e).addScaledVector(C.r, 1.0 - 0.15 * e).setY(1.8 - 0.1 * e);
    H.controls.teleportCamera(pos, C.frame.clone().addScaledVector(C.r, -0.3).setY(C.frame.y - 0.25));
  ` },
  // 3. El Puente del Arcoíris: tu personaje cruza con Luca al lado; la cámara los acompaña de costado.
  { at: 11.8, run: `
    H.controls.placePlayer(V(0.2, 0, 49), V(0, 0, 30));
    H.startWalk('luca');
    H.controls.walkTo(V(0, 0, 37));
    H.controls.marker.scale.setScalar(0);
    C.cam = null;
  `, tick: `
    const P = H.controls.player.pos;
    const L = H.spirits.companion ? H.spirits.companion.pos : P;
    const mid = P.clone().lerp(L, 0.4).add(V(0, 0.9, -0.6));
    const want = P.clone().add(V(-4.2 + k * 0.25, 1.7 + k * 0.08, -3.2 + k * 0.1));
    C.cam = C.cam ? C.cam.lerp(want, 0.12) : want;
    C.look = C.look ? C.look.lerp(mid, 0.15) : mid;
    H.controls.teleportCamera(C.cam, C.look);
  ` },
  // 4. El Prado de los espíritus: la pelota, y todos corren atrás de ella.
  { at: 15.8, run: `
    const M = V(24, 0, 20);
    C.M = M;
    H.controls.placePlayer(V(M.x - 6, 0, M.z + 1), V(M.x + 4, 0, M.z - 1));
    C.cam = null; C.look = null;
    setTimeout(() => H.throwBall(), 500);
    setTimeout(() => H.throwBall(), 3000);
  `, tick: TICK_PACK },
  // 5. Final: el cielo del piso 99, el salón sobre las nubes y los perritos jugando.
  { at: 21.3, run: `
    H.goFloor(98);
    H.controls.placePlayer(V(-3, 0, 6), V(8, 0, 7));
    C.M = V(0, 0, 4);
    // Que la manada esté cerca para jugar con la pelota.
    H.spirits.pack.forEach((a, i) => a.pos.set(-2 + (i % 4) * 1.6, 0, 3.2 + Math.floor(i / 4) * 1.8));
    C.R = 22; C.N = 4; C.ty = 0.8; C.off = V(0.6, 0.45, 3.4); C.lerp = 0.12;
    C.cam = null; C.look = null;
    setTimeout(() => H.throwBall(), 300);
    setTimeout(() => H.throwBall(), 2900);
  `, tick: TICK_PACK },
  { at: 26.2, run: `
    H.controls.cinematic([
      { pos: H.camera.position.clone(), look: C.look.clone() },
      { pos: V(10, 5, 20), look: V(0, 4, -14) },
      { pos: V(16, 11, 29), look: V(-4, 13, -30) },
    ], 3.9);
  ` },
];
const DURATION = 30;

// ---------- grabar ----------
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({
  viewport: S.viewport, deviceScaleFactor: S.scale, isMobile: S.mobile, hasTouch: S.mobile,
  userAgent: S.mobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : undefined,
});
await ctx.addInitScript(VIRTUAL_TIME);
await ctx.addInitScript(() => {
  localStorage.setItem('huellita.welcomed', '1');
  localStorage.setItem('huellita.quality', 'high');
  localStorage.setItem('huellita.music', '0');
  localStorage.setItem('huellita.sounds', '0');
  localStorage.setItem('huellita.refSeen', '1');
});
const p = await ctx.newPage();
p.on('pageerror', (e) => console.error('[pageerror]', e.message));
await p.goto(`${BASE}/?debug`);
await p.waitForFunction(() => !document.querySelector('#enter')?.disabled, null, { timeout: 180_000 });
await p.click('#enter');
await p.waitForTimeout(1500);
// Saltear la intro de la app (la nuestra es otra) y esconder toda la interfaz: sólo el 3D.
await p.evaluate(() => {
  document.querySelector('#scene').dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true, pointerId: 1, isPrimary: true }));
  document.querySelector('#scene').dispatchEvent(new PointerEvent('pointerup', { clientX: 100, clientY: 100, bubbles: true, pointerId: 1, isPrimary: true }));
});
await p.waitForTimeout(1000);
await p.addStyleTag({ content: 'body > *:not(#scene):not(canvas) { display: none !important; } #scene { display: block !important; }' });
// Que se asiente todo (sombreadores, espíritus) antes de arrancar.
await p.waitForTimeout(3000);
await p.evaluate(() => window.__vt.manual());

const from = Number(process.env.VIDEO_FROM || 0);
const to = Number(process.env.VIDEO_TO || DURATION);
const W = S.viewport.width * S.scale;
const Hh = S.viewport.height * S.scale;
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-vf', `scale=${W}:${Hh}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
const cdp = await ctx.newCDPSession(p);
const dt = 1000 / FPS;
const total = Math.round(to * FPS);
const shots = SHOTS.map((s) => ({ ...s, frame: Math.round(s.at * FPS) }));
const t0 = Date.now();
const PRE = 'const H = window.__huellita; const V = (x, y, z) => new H.THREE.Vector3(x, y, z); const C = (window.__shot ||= {});';
let cur = null;
for (let f = 0; f < total; f++) {
  for (const s of shots) {
    if (s.frame === f) { cur = s; await p.evaluate(`(() => { ${PRE} ${s.run} })()`); }
  }
  if (cur?.tick) await p.evaluate(`((k) => { ${PRE} ${cur.tick} })(${(f - cur.frame) / FPS})`);
  await p.evaluate((ms) => window.__vt.step(ms), dt);
  if (f < from * FPS) continue;
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95 });
  if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 30 === 0) console.log(`${(f / FPS).toFixed(1)} s · ${((Date.now() - t0) / 1000 / 60).toFixed(1)} min`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await b.close();
console.log('Listo:', OUT);
