// Dos sesiones reales de Chromium contra un servidor de prueba con datos separados.
// En CI sin GPU se pausa el dibujo de cada escena mientras inicia la otra; los latidos siguen vivos.
// NODE_PATH=<Playwright> CHROMIUM_PATH=/usr/bin/chromium node scripts/presencia.mjs http://localhost:8787
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] || 'http://localhost:8787';
const shots = process.env.PRESENCIA_SHOTS || '/tmp/huellita-presencia-capturas';
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pages = [];
const errors = [];
const seen = [[], []];
const run = randomUUID().slice(0, 5);
const names = [`Prueba A ${run}`, `Prueba B ${run}`];
try {
  for (let i = 0; i < 2; i++) {
    const ctx = await browser.newContext({ ...(i === 0 ? devices['iPhone 13'] : devices['Pixel 5']), deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await ctx.addInitScript(({ name, sid }) => {
      for (const [k, v] of Object.entries({ quality: 'low', welcomed: '1', music: '0', sounds: '0', name, sid })) localStorage.setItem(`huellita.${k}`, v);
      let debug;
      Object.defineProperty(window, '__huellita', { get: () => debug, set: (value) => {
        debug = value;
        const setLoop = value.renderer.setAnimationLoop.bind(value.renderer);
        value.renderer.setAnimationLoop = (fn) => { if (fn) window.__presenceLoop = fn; setLoop(fn); };
      } });
    }, { name: names[i], sid: randomUUID() });
    const p = await ctx.newPage(); pages.push(p);
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('response', async (r) => { if (new URL(r.url()).pathname === '/api/now' && r.ok()) { try { seen[i] = (await r.json()).others || []; } catch { /* cierre */ } } });
    await p.goto(`${base}/?debug`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForSelector('#enter:not([disabled])', { timeout: 120000 });
    assert.equal(await p.locator('#mode').evaluate((e) => e.hidden), true);
    await p.locator('#enter').click();
    await p.waitForFunction(() => !!window.__huellita?.renderer, null, { timeout: 20000 });
    await p.mouse.click(250, 200); // salta la intro antes de ubicar el personaje
    await p.evaluate((i) => {
      const H = window.__huellita;
      H.controls.placePlayer(new H.THREE.Vector3(i === 0 ? -0.8 : 0.8, 0, 25), new H.THREE.Vector3(0, 0, 15));
      H.controls.snapFollow();
      H.renderer.setAnimationLoop(null);
      H.me.group.position.copy(H.controls.player.pos);
    }, i);
    console.log(`OK: sesión ${i + 1} inició el jardín 3D con datos compartidos.`);
  }
  for (let i = 0; i < 2; i++) {
    const p = pages[i];
    await p.waitForResponse(async (r) => new URL(r.url()).pathname === '/api/now' && r.ok() &&
      (await r.json()).others.some((o) => o.name === names[1 - i]), { timeout: 30000 });
    await p.evaluate(() => window.__huellita.renderer.setAnimationLoop(window.__presenceLoop));
    await p.waitForTimeout(3000);
    await p.evaluate(() => window.__huellita.renderer.setAnimationLoop(null));
    await p.waitForFunction(() => {
      let avatars = 0;
      window.__huellita.scene.traverse((o) => { if (o.isSprite && o.position.y === 1.72) avatars++; });
      return avatars > 0 && Number(document.querySelector('#here').textContent) >= 2;
    }, null, { timeout: 30000 });
    assert.ok(seen[i].some((o) => o.name === names[1 - i]));
    await p.evaluate(() => { const H = window.__huellita; H.camera.position.set(0, 3, 30); H.camera.lookAt(0, 1, 25); H.renderer.render(H.scene, H.camera); });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${shots}/sesion-${i + 1}.png` });
    console.log(`OK: sesión ${i + 1} recibió y dibujó al personaje de la otra.`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
