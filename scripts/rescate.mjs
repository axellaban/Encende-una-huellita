// Recorrido del rescate en un servidor de prueba, con datos propios y dos sesiones independientes.
// NODE_PATH=<ruta a Playwright> CHROMIUM_PATH=/usr/bin/chromium node scripts/rescate.mjs http://localhost:8787
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] || 'http://localhost:8787';
const shots = process.env.RESCATE_SHOTS || '/tmp/huellita-rescate-capturas';
mkdirSync(shots, { recursive: true });
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const raw = JSON.stringify({ memorials: [{ id: 'antes01', name: 'Luna de prueba', species: 'gato', photo: PNG, extraPhotos: [PNG],
  candles: 4, flowers: 2, gifts: 0, glow: 9, createdAt: 1700000000000 }], counters: {}, gifts: {},
  diary: { antes01: [{ id: 'pagina01', text: 'Un recuerdo de prueba' }] },
  guestbook: { antes01: [{ id: 'firma01', name: 'Su familia', text: 'Siempre cerca' }] } });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--disable-webgl', '--disable-webgl2'] });
const errors = [];
let id, token;
const ready = (p) => p.waitForSelector('#enter:not([disabled])', { timeout: 30000 });
try {
  const a = await browser.newContext({ ...devices['iPhone SE'], reducedMotion: 'reduce', acceptDownloads: true });
  await a.addInitScript(({ raw, sid }) => {
    if (!localStorage.getItem('huellita.local.v2')) {
      localStorage.setItem('huellita.local.v2', raw);
      localStorage.setItem('huellita.tokens', JSON.stringify({ antes01: 'local-antes01' }));
      localStorage.setItem('huellita.myPet', 'antes01');
      localStorage.setItem('huellita.sid', sid);
    }
    localStorage.setItem('huellita.music', '0'); localStorage.setItem('huellita.sounds', '0');
    localStorage.setItem('huellita.welcomed', '1');
  }, { raw, sid: randomUUID() });
  const p = await a.newPage(); p.on('pageerror', (e) => errors.push(e.message));
  await p.route('**/api/import', async (route) => { await route.fetch(); await route.abort('failed'); }, { times: 1 });
  await p.goto(`${base}/#h/antes01`, { waitUntil: 'domcontentloaded' });
  await ready(p);
  assert.equal(await p.locator('#enter-label').textContent(), 'Volver a intentar');
  assert.equal(await p.locator('#connection-error').isVisible(), true);
  assert.equal(await p.locator('#backup-demo').isVisible(), true);
  assert.equal(await p.evaluate(() => localStorage.getItem('huellita.local.v2')), raw);
  const [download] = await Promise.all([p.waitForEvent('download'), p.locator('#backup-demo').click()]);
  const copy = JSON.parse(readFileSync(await download.path(), 'utf8'));
  assert.equal(copy.data['huellita.local.v2'], raw);
  await p.screenshot({ path: `${shots}/reintento-iphone-se.png` });
  console.log('OK: una respuesta perdida ofrece reintentar y guardar copia en iPhone SE emulado.');
  await p.reload({ waitUntil: 'domcontentloaded' }); await ready(p);
  assert.equal(await p.locator('#connection-error').isVisible(), false);
  const saved = await p.evaluate(() => ({ state: JSON.parse(localStorage.getItem('huellita.import.v1')), tokens: JSON.parse(localStorage.getItem('huellita.tokens')), original: localStorage.getItem('huellita.local.v2') }));
  assert.equal(saved.state.done, true); assert.equal(saved.original, raw);
  id = saved.state.mapping.antes01.id; token = saved.tokens[id];
  assert.ok(p.url().includes(id));
  await p.locator('#enter').click();
  await p.waitForFunction(() => document.querySelector('#s-name')?.textContent === 'Luna de prueba');
  assert.equal(await p.locator('#s-family').isVisible(), true);
  const pet = await (await fetch(`${base}/api/memorials/${id}`)).json();
  assert.equal(pet.candles, 4); assert.equal(pet.diaryCount, 1); assert.equal(pet.guestbookCount, 1); assert.equal(pet.extraPhotos.length, 1);
  console.log('OK: reintentar recupera una sola copia, fotos, diario y permiso familiar.');
  const b = await browser.newContext({ ...devices['Pixel 5'], reducedMotion: 'reduce' });
  const q = await b.newPage(); q.on('pageerror', (e) => errors.push(e.message));
  await q.goto(`${base}/#h/${id}`, { waitUntil: 'domcontentloaded' }); await ready(q); await q.locator('#enter').click();
  await q.waitForFunction(() => document.querySelector('#s-name')?.textContent === 'Luna de prueba');
  assert.equal(await q.locator('#s-family').isVisible(), false);
  await q.locator('#s-candle').click();
  await p.waitForFunction(() => Number(document.querySelector('#s-candles').textContent) === 5, null, { timeout: 25000 });
  await p.waitForFunction(() => Number(document.querySelector('#here').textContent) >= 2, null, { timeout: 25000 });
  console.log('OK: otra sesión en Android emulado ve la huellita y su vela llega a la primera.');
  await p.screenshot({ path: `${shots}/recuperada-iphone-se.png` });
  await q.screenshot({ path: `${shots}/compartida-android.png` });
  await q.close(); await p.close();
  const c = await browser.newContext({ ...devices['iPhone SE'] });
  await c.addInitScript(() => localStorage.setItem('huellita.shared.v1', '1'));
  await c.route('**/api/health', (route) => route.abort());
  const r = await c.newPage(); await r.goto(base, { waitUntil: 'domcontentloaded' }); await ready(r);
  assert.equal(await r.locator('#enter-label').textContent(), 'Volver a intentar');
  assert.equal(await r.evaluate(() => localStorage.getItem('huellita.local.v2')), null);
  console.log('OK: perder internet no crea un jardín privado alternativo.');
  assert.deepEqual(errors, []);
} finally {
  if (id && token) await fetch(`${base}/api/memorials/${id}`, { method: 'DELETE', headers: { 'X-Edit-Token': token } });
  await browser.close();
}
