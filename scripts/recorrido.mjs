// Recorrido de punta a punta con Playwright (ver AGENTS.md → "Recorrido de punta a punta").
//
// Uso (con el servidor andando: `npm run build && npm start`, y `data/` limpio):
//   NODE_PATH=$(npm root -g) node scripts/recorrido.mjs [url] [dispositivos]
//   dispositivos: celular,se,acostado,compu,demo,sinwebgl (por defecto, todos)
//
// No corras dos recorridos a la vez contra el mismo servidor: se pisan los datos.
// Con swiftshader (sin GPU) todo anda a pocos cuadros por segundo: por eso las esperas son largas.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL0 = process.argv[2] || 'http://localhost:8787';
const ONLY = (process.argv[3] || 'celular,se,acostado,compu,demo,sinwebgl').split(',');
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const CHROME = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const PHOTO = path.join(ROOT, 'public/huellitas/luca-2.jpg');

let fails = 0;
let total = 0;
function check(tag, name, cond, extra = '') {
  total++;
  if (!cond) fails++;
  console.log(`${cond ? '✓' : '✗'} [${tag}] ${name}${extra ? ` (${extra})` : ''}`);
}
const wait = (p, ms) => p.waitForTimeout(ms);
const isOpen = (p, sel) => p.evaluate((s) => !!document.querySelector(s)?.open, sel);
const visible = (p, sel) => p.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el || el.hidden) return false;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05 && r.width > 0 && r.height > 0;
}, sel);
const SHOTS = process.env.RECORRIDO_SHOTS;
let shotN = 0;
const text = (p, sel) => p.evaluate((s) => document.querySelector(s)?.textContent || '', sel);
const toastText = (p) => text(p, '#toast');
// Espera (hasta `ms`) a que el aviso diga algo que coincida: en el emulador lento llegan tarde.
const toastIs = (p, re, ms = 9000) => p.waitForFunction((src) => new RegExp(src, 'i').test(document.querySelector('#toast')?.textContent || ''), re.source, { timeout: ms }).then(() => true, () => false);
// Clic "de verdad" (que el elemento esté visible y no tapado); si falla, cuenta como error.
async function tap(p, tag, sel, label = sel) {
  try { await p.click(sel, { timeout: 15000 }); return true; } catch (e) {
    check(tag, `tocar ${label}`, false, e.message.split('\n').slice(0, 8).filter((l) => /intercepts|not visible|outside|Timeout/.test(l)).pop() || e.message.split('\n')[0]);
    if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `recorrido-fallo-${++shotN}.png`) });
    return false;
  }
}
async function closeTop(p) {
  await p.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); d?.close(); });
  await wait(p, 300);
}
async function hub(p, tag, sel, label) {
  if (!(await tap(p, tag, '#hub-btn', 'menú'))) return false;
  await wait(p, 500);
  return tap(p, tag, `#hub ${sel}`, label);
}

async function enter(p, { welcomed = true } = {}) {
  await p.goto(`${URL0}/?debug`, { waitUntil: 'load' });
  await p.waitForSelector('#enter:not([disabled])', { timeout: 90000 });
  await p.click('#enter');
  await wait(p, 1500);
  // Un toque en el canvas salta la intro.
  await p.mouse.click(Math.round(p.viewportSize().width * 0.7), 200);
  await wait(p, welcomed ? 4000 : 3000);
}

async function context(b, dev, { welcomed = true, demo = false } = {}) {
  const ctx = await b.newContext(dev === 'compu' ? { viewport: { width: 1280, height: 800 } } : { ...devices[dev] });
  await ctx.addInitScript(([w]) => {
    localStorage.setItem('huellita.quality.v3', 'low');
    if (w) localStorage.setItem('huellita.welcomed', '1');
  }, [welcomed]);
  if (demo) await ctx.route('**/api/health', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: false }) }));
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => { errs.push((e.stack || e.message).split('\n').slice(0, 3).join(' ')); if (process.env.RECORRIDO_DEBUG && errs.length < 2) console.log('  ⚠ error de JS:', e.stack); });
  p.on('dialog', (d) => d.accept());
  return { ctx, p, errs };
}

// Toques con la hora real de cada evento (si no, el emulador lento los toma como "mantener apretado").
async function touchDrag(ctx, p, x, y, dx, dy, holdMs) {
  const cdp = await ctx.newCDPSession(p);
  let t = Date.now() / 1000;
  const send = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts, timestamp: t });
  await send('touchStart', [{ x, y, id: 1 }]);
  for (let i = 1; i <= 8; i++) { t += 0.03; await send('touchMove', [{ x: x + (dx * i) / 8, y: y + (dy * i) / 8, id: 1 }]); }
  await wait(p, holdMs);
  t += holdMs / 1000;
  await send('touchEnd', []);
}

async function full(b, tag, dev) {
  const { ctx, p, errs } = await context(b, dev, { welcomed: false });
  const touch = dev !== 'compu';
  await enter(p, { welcomed: false });
  check(tag, 'entrar y bienvenida', await isOpen(p, '#help'));
  await wait(p, 1200);
  await tap(p, tag, '#help [data-then="featured"]', 'Conocer a Luca');
  await wait(p, 6000);
  check(tag, 'visitar a Luca', (await visible(p, '#sheet')) && (await text(p, '#s-name')) === 'Luca');
  // Modo obituario: Luca a pantalla completa, con su nombre, sus visitas y los gestos abajo.
  const visitsOk = await p.waitForFunction(() => /visita/.test(document.querySelector('#obit-visits')?.textContent || ''), null, { timeout: 10000 }).then(() => true, () => false);
  check(tag, 'obituario a pantalla completa (nombre, visitas y gestos)', (await visible(p, '#obit')) && (await text(p, '#obit-name')) === 'Luca' && visitsOk && (await visible(p, '#obit-dock')));

  // Vela (y que no sume dos veces), flor, abrazo, regalito, libro.
  // Relativo a lo que había (si se corren varios dispositivos seguidos, comparten los datos).
  const c0 = Number(await text(p, '#s-candles'));
  await tap(p, tag, '#obit-dock [data-do="candle"]', 'vela');
  await wait(p, 1500);
  const c1 = await text(p, '#s-candles');
  await p.evaluate(() => document.querySelector('#s-candle').click());
  await wait(p, 1500);
  check(tag, 'vela (una sola por día)', Number(c1) === c0 + 1 && (await text(p, '#s-candles')) === c1, `velas ${c0} → ${c1} → ${await text(p, '#s-candles')}`);
  const f0 = Number(await text(p, '#s-flowers'));
  await p.evaluate(() => document.querySelector('#s-flower').click());
  // Espera a que llegue la respuesta (en el emulador lento puede tardar más de un segundo y medio).
  await p.waitForFunction((n) => Number(document.querySelector('#s-flowers')?.textContent) === n, f0 + 1, { timeout: 9000 }).catch(() => {});
  check(tag, 'flor', Number(await text(p, '#s-flowers')) === f0 + 1, `flores ${f0} → ${await text(p, '#s-flowers')}`);
  await p.evaluate(() => document.querySelector('#s-hug').click());
  await wait(p, 1500);
  check(tag, 'abrazo', await toastIs(p, /abrazo/));
  await p.evaluate(() => document.querySelector('#s-gift').click());
  await wait(p, 800);
  check(tag, 'regalitos: se abre el catálogo', await isOpen(p, '#gifts'));
  await p.evaluate(() => document.querySelector('#gift-grid button')?.click());
  await wait(p, 2500);
  check(tag, 'regalito dejado', (await toastIs(p, /regalito|ya tiene tu/)) && !(await isOpen(p, '#gifts')), await toastText(p));
  await p.evaluate(() => document.querySelector('#s-shelf .shelf-item')?.click());
  await wait(p, 600);
  check(tag, 'repisa: tocar regalito muestra quién lo dejó', await toastIs(p, /le dej/), await toastText(p));
  // "Libro" en la barra del obituario abre la ficha completa en el libro de visitas.
  await tap(p, tag, '#obit-dock [data-do="book"]', 'libro');
  await wait(p, 1500);
  check(tag, 'obituario → libro abre la ficha completa', (await p.evaluate(() => document.querySelector('#obit').hidden)) && (await visible(p, '#gb-form')));
  await p.fill('#gb-form textarea', 'Qué lindo eras, Luca 🤍');
  await p.evaluate(() => document.querySelector('#gb-form').requestSubmit());
  await wait(p, 1500);
  check(tag, 'libro de visitas', (await p.locator('#gb-list li').count()) >= 1);
  await p.evaluate(() => document.querySelector('#s-share').click());
  await wait(p, 800);
  check(tag, 'compartir', await isOpen(p, '#share'));
  // La tarjeta para historias queda lista (imagen JPEG) y el botón de WhatsApp lleva el link de Luca.
  const shareReady = await p.waitForFunction(() => {
    const img = document.querySelector('#share-img');
    return img && !img.hidden && img.naturalWidth === 1080;
  }, null, { timeout: 20000 }).then(() => true, () => false);
  const wa = await p.evaluate(() => document.querySelector('#share-wa')?.href || '');
  check(tag, 'compartir: imagen lista y WhatsApp', shareReady && /^https:\/\/wa\.me\/\?text=/.test(wa) && decodeURIComponent(wa).includes('/h/luca'), wa.slice(0, 60));
  await closeTop(p);
  await p.evaluate(() => document.querySelector('#s-keep').click());
  await wait(p, 3000);
  await p.evaluate(() => document.querySelector('#keep-qr')?.click());
  await wait(p, 1200);
  check(tag, 'recuerdo (estampita con QR)', (await isOpen(p, '#keepsake')) && (await p.evaluate(() => document.querySelector('#keep-qr')?.getAttribute('aria-pressed') === 'true')));
  await closeTop(p);
  await p.evaluate(() => document.querySelector('#sheet-x').click());
  await wait(p, 900);
  check(tag, 'cerrar la ficha vuelve al obituario', await p.evaluate(() => !document.querySelector('#obit').hidden));
  await p.evaluate(() => document.querySelector('#obit-back').click());
  await wait(p, 2500);
  check(tag, '"‹" vuelve al jardín', await p.evaluate(() => document.querySelector('#obit').hidden && !document.body.classList.contains('sheet-open')));

  // Sumar una mascota con foto y "cómo era".
  await hub(p, tag, '[data-then="add"]', 'Sumar mascota');
  await wait(p, 600);
  check(tag, 'menú → sumar mascota', await isOpen(p, '#add'));
  await p.setInputFiles('#photo-input', PHOTO);
  await wait(p, 1500);
  await p.fill('#add-form input[name="name"]', 'Nieve');
  await p.evaluate(() => {
    document.querySelector('#add-form input[name="species"][value="gato"]').click();
    document.querySelector('#add-look input[name="look-vibe"][value="saltarin"]')?.click();
    document.querySelector('#add-look input[name="look-fur"][value="blanco"]')?.click();
    document.querySelector('#add-look input[name="look-pattern"][value="spots"]')?.click();
    document.querySelector('#add-look input[name="look-fur2"][value="negro"]')?.click();
    document.querySelector('#add-look input[name="look-coat"][value="fluffy"]')?.click();
    document.querySelector('#add-look input[name="look-eyes"][value="odd"]')?.click();
  });
  await p.evaluate(() => document.querySelector('#add-form').requestSubmit());
  await wait(p, 8000);
  check(tag, 'sumar mascota con foto', (await visible(p, '#sheet')) && (await text(p, '#s-name')) === 'Nieve', await text(p, '#s-name'));

  // Editar, agradecer velas, cerrar/abrir libro y diario (herramientas de la familia).
  await p.evaluate(() => document.querySelector('[data-tool="edit"]').click());
  await wait(p, 800);
  await p.fill('#edit-form input[name="name"]', 'Nievecita');
  await p.evaluate(() => document.querySelector('#edit-form').requestSubmit());
  await wait(p, 2500);
  check(tag, 'editar', (await text(p, '#s-name')) === 'Nievecita');
  await p.evaluate(() => document.querySelector('#s-thanks-btn')?.click());
  await wait(p, 1500);
  check(tag, 'agradecer las velas', await toastIs(p, /agradecimiento/));
  await p.evaluate(() => document.querySelector('#tool-gb-toggle')?.click());
  const closedOk = await p.waitForFunction(() => !document.querySelector('#gb-closed-msg').hidden && document.querySelector('#gb-form').hidden, null, { timeout: 9000 }).then(() => true, () => false);
  await p.evaluate(() => document.querySelector('#tool-gb-toggle')?.click());
  const reopenOk = await p.waitForFunction(() => !document.querySelector('#gb-form').hidden, null, { timeout: 9000 }).then(() => true, () => false);
  check(tag, 'cerrar y reabrir libro de visitas', closedOk && reopenOk);
  await p.evaluate(() => document.querySelector('[data-tool="diary"]').click());
  await wait(p, 800);
  await p.fill('#diary-form textarea', 'Dormía al sol todas las tardes.');
  await p.evaluate(() => document.querySelector('#diary-form').requestSubmit());
  await p.waitForFunction(() => document.querySelectorAll('#diary-list li').length > 0, null, { timeout: 10000 }).catch(() => {});
  check(tag, 'diario', (await p.locator('#diary-list li').count()) >= 1, await toastText(p));

  // Pasear, caminar, pelota, llamar.
  await p.evaluate(() => document.querySelector('#s-walk').click());
  await wait(p, 7000);
  check(tag, 'pasear', await p.evaluate(() => document.body.classList.contains('walking')) && (await visible(p, '#walk-hud')));
  const pos = () => p.evaluate(() => { const P = window.__huellita.controls.player.pos; return [P.x, P.z]; });
  // A un lugar abierto, mirando al salón (después de la ficha quedaba mirando la pared). Saltar lejos
  // mientras paseás también prueba que el espíritu reaparezca sin romperse (antes daba NaN).
  await p.evaluate(() => { const H = window.__huellita; H.controls.placePlayer(new H.THREE.Vector3(0, 0, 30), new H.THREE.Vector3(0, 0, 10)); H.controls.snapFollow(); });
  await wait(p, 3000);
  if (process.env.RECORRIDO_DEBUG) await p.evaluate(() => { window.__stk = []; window.__huellita.controls.onStick((e) => window.__stk.push(e.type)); window.__huellita.controls.onTap(() => window.__stk.push('tap')); document.querySelector('#scene').addEventListener('pointerdown', (e) => window.__stk.push('pd ' + Math.round(e.clientX) + ',' + Math.round(e.clientY))); });
  const a = await pos();
  if (touch) await touchDrag(ctx, p, 80, p.viewportSize().height - 170, 0, -60, 2200);
  else { await p.keyboard.down('w'); await wait(p, 6000); await p.keyboard.up('w'); }
  const b2 = await pos();
  if (process.env.RECORRIDO_DEBUG) console.log('palanca', await p.evaluate(() => { const C = window.__huellita.controls; const el = document.elementFromPoint(80, innerHeight - 170); return { top: el && (el.id || el.className || el.tagName), parent: el?.parentElement?.id || el?.parentElement?.className, stk: window.__stk, mode: C.mode, fly: C.flying, sheet: document.querySelector('#sheet').hidden, cls: document.body.className, dlg: [...document.querySelectorAll('dialog[open]')].map((d) => d.id) }; }));
  check(tag, touch ? 'caminar con la palanca invisible' : 'caminar con el teclado', Math.hypot(b2[0] - a[0], b2[1] - a[1]) > (touch ? 2 : 1), `${Math.hypot(b2[0] - a[0], b2[1] - a[1]).toFixed(1)} m`);
  await wait(p, 600);
  const kind = await p.evaluate(() => document.querySelector('#act-btn').dataset.kind);
  if (kind === 'ball') {
    await tap(p, tag, '#act-btn', 'botón de acción (pelota)');
    await wait(p, 1500);
    check(tag, 'pelota (botón de acción)', await p.evaluate(() => { const B = window.__huellita.spirits.ball; return !B.held || B.inAir; }));
  } else check(tag, 'botón de acción ofrece la pelota al pasear', false, kind);
  await tap(p, tag, '#walk-call', 'llamar');
  await wait(p, 800);
  check(tag, 'llamar', await toastIs(p, /vení/));
  await tap(p, tag, '#walk-stop', 'terminar el paseo');
  await wait(p, 1200);

  // Hoy, lista con búsqueda, Prado, gestos.
  await hub(p, tag, '[data-today]', 'Hoy');
  await wait(p, 700);
  check(tag, 'Hoy', await isOpen(p, '#today'));
  await closeTop(p);
  await hub(p, tag, '[data-list="all"]', 'Huellitas');
  await wait(p, 700);
  await p.fill('#list-search', 'Niev');
  await wait(p, 400);
  check(tag, 'lista con búsqueda', (await isOpen(p, '#list')) && (await p.locator('#list-grid > *').count()) === 1);
  await closeTop(p);
  await hub(p, tag, '[data-then="meadow"]', 'Prado');
  await wait(p, 6000);
  check(tag, 'menú → Prado', await p.evaluate(() => { const P = window.__huellita.controls.player.pos; return Math.hypot(P.x - 24, P.z - 20) < 14; }));
  // Vitrinas del salón: frente a un cuadrito con foto, el botón de acción ofrece su nombre y abre su
  // obituario ahí mismo (sin llevarte a su nicho).
  const cell = await p.evaluate(() => {
    const H = window.__huellita;
    const c = H.hall.debugCells().find((k) => k.kind === 'spot' && k.y < 2.4 && Math.hypot(k.nx, k.nz) > 0.5);
    if (!c) return null;
    const n = Math.hypot(c.nx, c.nz);
    H.controls.placePlayer(new H.THREE.Vector3(c.x + (c.nx / n) * 1.6, 0, c.z + (c.nz / n) * 1.6), new H.THREE.Vector3(c.x, 0, c.z));
    H.controls.snapFollow();
    return c;
  });
  const cellName = cell?.id;
  const actOk = cellName && await p.waitForFunction(() => document.querySelector('#act-btn')?.dataset.kind === 'visit', null, { timeout: 15000 }).then(() => true, () => false);
  if (actOk) await p.evaluate(() => document.querySelector('#act-btn').click());
  const cellSheet = actOk && await p.waitForFunction(() => !document.querySelector('#sheet').hidden && document.querySelector('#s-name').textContent.length > 0, null, { timeout: 15000 }).then(() => true, () => false);
  // Sigue al lado del cuadrito (no lo mandó a su nicho).
  const near = cell && await p.evaluate((c) => { const P = window.__huellita.controls.player.pos; return Math.hypot(P.x - c.x, P.z - c.z) < 3; }, cell);
  check(tag, 'vitrina: cuadrito → obituario ahí mismo', !!(cellSheet && near), `${cellName} → ${await text(p, '#s-name')}`);
  // Las flechas del obituario pasan a la huellita de al lado.
  const before = await text(p, '#obit-name');
  await p.evaluate(() => document.querySelector('#obit-next').click());
  const moved = await p.waitForFunction((n) => (document.querySelector('#obit-name')?.textContent || n) !== n, before, { timeout: 10000 }).then(() => true, () => false);
  check(tag, 'obituario: flecha a la huellita de al lado', moved, `${before} → ${await text(p, '#obit-name')}`);
  await p.evaluate(() => document.querySelector('#obit-back').click());
  await wait(p, 1500);
  await p.evaluate(() => { const H = window.__huellita; H.controls.placePlayer(new H.THREE.Vector3(12, 0, 30), new H.THREE.Vector3(30, 0, 30)); H.controls.snapFollow(); });
  // Con SwiftShader el reloj de la escena avanza más despacio que el reloj real.
  await p.waitForFunction(() => !document.body.classList.contains('moving'), null, { timeout: 20000 });
  if ((await p.evaluate(() => document.querySelector('#act-btn').dataset.kind)) === 'gestures') await tap(p, tag, '#act-btn', 'gestos');
  else await tap(p, tag, '#emote-btn', 'gestos');
  const trayOpen = await p.waitForSelector('#emote-tray', { state: 'visible', timeout: 10000 }).then(() => true, () => false);
  const said = await p.evaluate(() => { document.querySelector('#sayings button')?.click(); return !!document.querySelector('.self-say'); });
  check(tag, 'gestos y frases', trayOpen && said);

  // Guía, frasco, farolillo, consuelo, "Así te ven los demás".
  await hub(p, tag, '[data-guide]', 'La sexta etapa');
  await wait(p, 800);
  const g = await isOpen(p, '#guide');
  await p.evaluate(() => document.querySelector('#guide-next')?.click());
  check(tag, 'guía', g);
  await closeTop(p);
  await hub(p, tag, '[data-jar]', 'Frasco');
  await wait(p, 800);
  await p.fill('#jar-form input[name="text"]', 'esperarme en la puerta');
  await p.evaluate(() => document.querySelector('#jar-form').requestSubmit());
  check(tag, 'frasco de gracias', await toastIs(p, /frasco/), await toastText(p));
  await closeTop(p);
  await hub(p, tag, '[data-then="farolillo"]', 'Farolillo');
  await wait(p, 700);
  await p.fill('#farolillo-form textarea', 'Te extraño');
  await p.evaluate(() => document.querySelector('#farolillo-form').requestSubmit());
  await wait(p, 1500);
  check(tag, 'farolillo', await toastIs(p, /farolillo|camino/), await toastText(p));
  await closeTop(p);
  await hub(p, tag, '[data-then="comfort"]', 'Consuelo');
  await wait(p, 700);
  await p.fill('#comfort-form textarea', 'No estás solo.');
  await p.evaluate(() => document.querySelector('#comfort-form').requestSubmit());
  await wait(p, 1500);
  check(tag, 'consuelo', await toastIs(p, /gracias/), await toastText(p));
  await closeTop(p);
  await hub(p, tag, '#me-chip', 'Así te ven los demás');
  await wait(p, 700);
  await p.fill('#me-name-input', 'Valentina');
  await p.evaluate(() => document.querySelector('input[name="me-outfit"][value="2"]')?.click());
  await wait(p, 300);
  check(tag, '"Así te ven los demás": nombre y ropa', (await isOpen(p, '#me-dialog')) && (await text(p, '#me-name')) === 'Valentina' && (await p.evaluate(() => Math.floor(Number(localStorage.getItem('huellita.hue')) / 360) === 2)));
  await closeTop(p);
  await hub(p, tag, '[data-then="photo"]', 'Foto');
  await p.waitForFunction(() => document.querySelector('#photo-dialog')?.open, null, { timeout: 25000 }).catch(() => {});
  // La polaroid ya viene preparada como JPEG (blob:) para guardarla o compartirla sin demora.
  await p.waitForFunction(() => document.querySelector('#polaroid-preview')?.naturalWidth > 0, null, { timeout: 15000 }).catch(() => {});
  check(tag, 'modo foto (polaroid)', (await isOpen(p, '#photo-dialog')) && (await p.evaluate(() => {
    const img = document.querySelector('#polaroid-preview');
    return /^(blob:|data:image\/jpeg)/.test(img?.getAttribute('src') || '') && img.naturalWidth > 0;
  })));
  await closeTop(p);

  // Pisos: el ascensor (caminás hasta la puerta, entrás, la botonera; al cerrarla salís caminando).
  await hub(p, tag, '[data-then="floors"]', 'Pisos');
  await p.waitForFunction(() => document.querySelector('#floors').open, null, { timeout: 40000 }).catch(() => {});
  check(tag, 'ascensor: entrar y botonera', await isOpen(p, '#floors') && (await p.locator('#floor-list button').count()) === 99);
  await p.evaluate(() => [...document.querySelectorAll('#floor-list button')].find((x) => x.querySelector('b').textContent === '3')?.click());
  await p.waitForFunction(() => !document.body.classList.contains('riding'), null, { timeout: 60000 }).catch(() => {});
  check(tag, 'ascensor: viajar al piso 3 y salir', (await text(p, '.floor-num')) === '3' && (await p.evaluate(() => !document.body.classList.contains('riding') && window.__huellita.controls.mode === 'follow')));
  await hub(p, tag, '[data-then="floors"]', 'Pisos');
  await p.waitForFunction(() => document.querySelector('#floors').open, null, { timeout: 40000 }).catch(() => {});
  await closeTop(p);
  await p.waitForFunction(() => !document.body.classList.contains('riding'), null, { timeout: 30000 }).catch(() => {});
  check(tag, 'ascensor: cerrar la botonera y salir caminando', await p.evaluate(() => !document.body.classList.contains('riding')));
  await p.evaluate(() => window.__huellita.goFloor(5));
  await wait(p, 2500);
  check(tag, 'ir a otro piso (directo) con 2 ascensores y espíritus', (await text(p, '.floor-num')) === '6' && (await p.evaluate(() => window.__huellita.elevator.lifts.length === 2 && window.__huellita.spirits.pack.length >= 6)));
  // El libro del piso 99: el botón de acción ofrece leerlo, se abre y se pasa de página.
  await p.evaluate(() => { const H = window.__huellita; H.goFloor(98); H.controls.placePlayer(new H.THREE.Vector3(0.3, 0, -3.2), new H.THREE.Vector3(0, 0, -5.8)); H.controls.snapFollow(); });
  const bookAct = await p.waitForFunction(() => document.querySelector('#act-btn')?.dataset.kind === 'book', null, { timeout: 15000 }).then(() => true, () => false);
  if (bookAct) await p.evaluate(() => document.querySelector('#act-btn').click());
  await wait(p, 1200);
  const page1 = await text(p, '#tome-count');
  await p.evaluate(() => document.querySelector('#tome-next').click());
  await wait(p, 1500);
  check(tag, 'piso 99: leer el libro de la sexta etapa', bookAct && (await isOpen(p, '#tome')) && page1.startsWith('1 de') && (await text(p, '#tome-count')).startsWith('2 de'), `${page1} → ${await text(p, '#tome-count')}`);
  await closeTop(p);
  await p.evaluate(() => window.__huellita.goFloor(0));
  await wait(p, 2500);
  await hub(p, tag, '[data-list="all"]', 'Huellitas');
  await wait(p, 600);
  await p.fill('#list-search', 'Niev');
  await wait(p, 300);
  await p.evaluate(() => document.querySelector('#list-grid > *')?.click());
  await wait(p, 6000);
  await p.evaluate(() => document.querySelector('#s-delete').click());
  await wait(p, 2500);
  check(tag, 'quitar la huellita', await toastIs(p, /quitada/), await toastText(p));
  check(tag, 'sin errores de JavaScript', errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();
}

async function demo(b) {
  const tag = 'demo';
  const { ctx, p, errs } = await context(b, 'iPhone 13', { demo: true });
  await enter(p);
  check(tag, 'aviso de modo demo', await p.evaluate(() => /demo/i.test(document.querySelector('#menu-foot').textContent)));
  await hub(p, tag, '[data-featured]', 'Luca');
  await wait(p, 6000);
  await p.evaluate(() => document.querySelector('#s-candle').click());
  await wait(p, 1500);
  check(tag, 'vela en modo demo', (await text(p, '#s-candles')) === '1');
  check(tag, 'sin errores de JavaScript', errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();
}

async function noGL() {
  const tag = 'sin WebGL';
  const b = await chromium.launch({ ...CHROME, args: ['--disable-webgl', '--disable-webgl2'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  await ctx.addInitScript(() => localStorage.setItem('huellita.welcomed', '1'));
  const p = await ctx.newPage();
  await p.goto(URL0, { waitUntil: 'load' });
  await wait(p, 3000);
  await p.evaluate(() => document.querySelector('#enter')?.click());
  await wait(p, 2000);
  check(tag, 'aviso sin 3D', await visible(p, '#nogl'));
  await p.evaluate(() => document.querySelector('#nogl [data-list]').click());
  await wait(p, 800);
  await p.evaluate(() => document.querySelector('#list-grid > *')?.click());
  await wait(p, 1500);
  check(tag, 'abrir una ficha por encima', (await visible(p, '#sheet')) && (await text(p, '#s-name')).length > 0);
  await b.close();
}

const b = await chromium.launch({ ...CHROME, args: GL });
if (ONLY.includes('celular')) await full(b, 'celular', 'iPhone 13');
if (ONLY.includes('se')) await full(b, 'iPhone SE', 'iPhone SE');
if (ONLY.includes('acostado')) await full(b, 'acostado', 'iPhone 13 landscape');
if (ONLY.includes('compu')) await full(b, 'compu', 'compu');
if (ONLY.includes('demo')) await demo(b);
await b.close();
if (ONLY.includes('sinwebgl')) await noGL();
console.log(`\n${total - fails}/${total} bien${fails ? ` · ${fails} con problemas` : ''}`);
process.exit(fails ? 1 : 0);
