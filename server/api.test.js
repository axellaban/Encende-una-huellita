import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from './index.js';
import { parseDataUrl, validateMemorial } from './core.js';
import { createMemoryKv } from './kv/memory.js';
import { createStore } from './store.js';

// JPG de 1x1.
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
// PNG de 1x1.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Servidor falso con la misma API REST que Upstash, respaldado por el emulador.
function fakeUpstash() {
  const kv = createMemoryKv();
  return createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      if (req.headers.authorization !== 'Bearer secreto') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
      }
      const parsed = JSON.parse(body);
      const out = req.url === '/pipeline'
        ? parsed.map((c) => { try { return { result: kv.exec(c) }; } catch (e) { return { error: e.message }; } })
        : (() => { try { return { result: kv.exec(parsed) }; } catch (e) { return { error: e.message }; } })();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    });
  });
}

const listen = (s) => new Promise((r) => s.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${s.address().port}`)));

// La misma batería de pruebas corre contra el servidor local y contra la función de Vercel.
const targets = {};
let local, upstash;

before(async () => {
  ({ server: local } = createApp({ kv: createMemoryKv() }));
  const localBase = await listen(local);
  targets.local = (p, init) => fetch(localBase + p, init);

  upstash = fakeUpstash();
  const upBase = await listen(upstash);
  process.env.KV_REST_API_URL = upBase;
  process.env.KV_REST_API_TOKEN = 'secreto';
  const fn = await import('../api/handler.js');
  // Simula el rewrite de vercel.json: /api/:path* -> /api/handler?path=:path*
  targets.vercel = (p, init = {}) => {
    const u = new URL(p, 'https://huellita.test');
    // Simula el rewrite /h/:id -> /api/handler?page=:id
    const page = u.pathname.match(/^\/h\/([\w-]+)$/);
    if (page) {
      const q = new URLSearchParams(u.search);
      q.set('page', page[1]);
      return fn.GET(new Request(`https://huellita.test/api/handler?${q}`));
    }
    const rewritten = new URL(`https://huellita.test/api/handler?path=${encodeURIComponent(u.pathname.replace(/^\/api\//, ''))}`);
    const method = init.method || 'GET';
    return fn[method](new Request(rewritten, { ...init, method }));
  };
});

after(() => {
  local.close();
  upstash.close();
});

for (const name of ['local', 'vercel']) {
  const call = (p, init) => targets[name](p, init);
  const post = (p, body, headers = {}) =>
    call(p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

  test(`[${name}] salud y Luca destacado en el atril`, async () => {
    assert.equal((await (await call('/api/health')).json()).ok, true);
    const j = await (await call('/api/memorials')).json();
    const luca = j.memorials.find((m) => m.id === 'luca');
    assert.ok(luca, 'Luca tiene que estar');
    assert.equal(luca.slot, -1);
    assert.equal(luca.featured, true);
    assert.ok(j.memorials.every((m) => !('tokenHash' in m)));
  });

  test(`[${name}] crear, vela, flor, libro, foto y borrar`, async () => {
    let r = await post('/api/memorials', { name: '  Bella ', species: 'gato', photo: PNG, birthday: '05-04', visitor: 'Brisa Suave' });
    assert.equal(r.status, 201);
    const { memorial, editToken } = await r.json();
    assert.equal(memorial.name, 'Bella');
    assert.equal(memorial.slot, 0);
    assert.equal(memorial.candles, 1);
    const photo = await call(memorial.photo);
    assert.equal(photo.status, 200);
    assert.equal(photo.headers.get('content-type'), 'image/png');

    r = await post(`/api/memorials/${memorial.id}/candle`, { sid: 's1', visitor: 'Brisa' });
    assert.equal((await r.json()).memorial.candles, 2);
    const again = await (await post(`/api/memorials/${memorial.id}/candle`, { sid: 's1' })).json();
    assert.equal(again.already, true);
    assert.equal(again.memorial.candles, 2);

    r = await post(`/api/memorials/${memorial.id}/flower`, {});
    assert.equal((await r.json()).memorial.flowers, 1);

    r = await post(`/api/memorials/${memorial.id}/guestbook`, { name: 'Ana', text: 'Te queremos' });
    assert.equal(r.status, 201);
    const full = await (await call(`/api/memorials/${memorial.id}`)).json();
    assert.equal(full.guestbook[0].text, 'Te queremos');
    assert.equal(full.guestbookCount, 1);

    // Un lugar ya ocupado no se pisa.
    r = await post('/api/memorials', { name: 'Otro', species: 'perro', slot: 0 });
    assert.equal((await r.json()).memorial.slot, 1);

    const act = await (await call('/api/activity/0')).json();
    assert.deepEqual(act.events.map((e) => e.type).slice(0, 4), ['created', 'candle', 'flower', 'guestbook']);
    const later = await (await call(`/api/activity/${act.seq}`)).json();
    assert.equal(later.events.length, 0);

    r = await call(`/api/memorials/${memorial.id}`, { method: 'DELETE', headers: { 'X-Edit-Token': 'nope' } });
    assert.equal(r.status, 403);
    r = await call(`/api/memorials/${memorial.id}`, { method: 'DELETE', headers: { 'X-Edit-Token': editToken } });
    assert.equal(r.status, 200);
    assert.equal((await call(`/api/memorials/${memorial.id}`)).status, 404);
    assert.equal((await call('/api/memorials/luca', { method: 'DELETE', headers: { 'X-Edit-Token': 'x' } })).status, 403);
  });

  test(`[${name}] vela y libro para Luca`, async () => {
    const r = await (await post('/api/memorials/luca/candle', { sid: 'z', visitor: 'Nube' })).json();
    assert.equal(r.memorial.name, 'Luca');
    assert.ok(r.memorial.candles >= 1);
  });

  test(`[${name}] presencia: los demás visitantes con su posición y gestos`, async () => {
    await post('/api/now', { sid: 'a', visitor: 'Nube Clara', x: 1.234, z: 5, ry: 0.5, hue: 200, say: 'Estoy con vos' });
    const j = await (await post('/api/now', { sid: 'b', visitor: 'Luz', x: 0, z: 20, emote: '🤍' })).json();
    assert.ok(j.here >= 2);
    const a = j.others.find((o) => o.name === 'Nube Clara');
    assert.equal(a.x, 1.23);
    assert.equal(a.say, 'Estoy con vos');
    assert.ok(!j.others.some((o) => o.name === 'Luz'), 'no me devuelve a mí');
    // Las frases libres no se aceptan: sólo las del catálogo.
    const k = await (await post('/api/now', { sid: 'c', visitor: 'X', say: 'cualquier cosa' })).json();
    assert.equal(k.others.find((o) => o.name === 'Luz').emote, '🤍');
    const again = await (await post('/api/now', { sid: 'b', visitor: 'Luz' })).json();
    assert.equal(again.others.find((o) => o.name === 'X').say, null);
    assert.equal(again.events, undefined, 'sin `since` no trae eventos');
    // Con `since`, el mismo latido trae las novedades (un solo pedido periódico).
    const withEv = await (await post('/api/now', { sid: 'b', visitor: 'Luz', since: 0 })).json();
    assert.ok(withEv.seq > 0);
    assert.ok(Array.isArray(withEv.events) && withEv.events.length > 0);
    assert.ok(!('at' in withEv.others[0]), 'no expone la hora interna');
  });

  test(`[${name}] cómo era (pelaje, orejas, tamaño) y el espíritu que alguien pasea`, async () => {
    const c = await (await post('/api/memorials', { name: 'Toby', species: 'perro', look: { fur: 'dorado', ears: 'down', size: 'l', pattern: 'raro', x: 1 } })).json();
    assert.deepEqual(c.memorial.look, { fur: 'dorado', ears: 'down', size: 'l' });
    const own = { 'X-Edit-Token': c.editToken };
    let r = await (await post(`/api/memorials/${c.memorial.id}/edit`, { look: { fur: 'negro', ears: 'up' }, species: 'gato' }, own)).json();
    assert.deepEqual(r.look, { fur: 'negro', ears: 'up' });
    assert.equal(r.species, 'gato');
    r = await (await post(`/api/memorials/${c.memorial.id}/edit`, { look: 'cualquier cosa' }, own)).json();
    assert.equal(r.look, null);
    // Presencia con mascota paseando.
    await post('/api/now', { sid: 'p1', visitor: 'Con Toby', x: 2, z: 3, pet: { n: 'Toby', sp: 'perro', fur: 'dorado', ears: 'down', size: 'm' } });
    const j = await (await post('/api/now', { sid: 'p2', visitor: 'Otra', pet: { n: '', sp: 'perro' } })).json();
    const p = j.others.find((o) => o.name === 'Con Toby');
    assert.deepEqual(p.pet, { n: 'Toby', sp: 'perro', fur: 'dorado', ears: 'down', size: 'm' });
    const k = await (await post('/api/now', { sid: 'p3', visitor: 'X' })).json();
    assert.equal(k.others.find((o) => o.name === 'Otra').pet, null, 'sin nombre no hay espíritu');
  });

  test(`[${name}] compartir: /h/<id> con vista previa, imagen propia y "Pasá la luz"`, async () => {
    // Luca: su imagen para compartir y su nombre en el título.
    let html = await (await call('/h/luca')).text();
    assert.match(html, /<title>Luca · Encendé una huellita<\/title>/);
    assert.match(html, /og:image" content="https?:\/\/[^"]+\/huellitas\/luca-og\.jpg"/);
    assert.match(html, /og:url" content="https?:\/\/[^"]+\/h\/luca"/);
    // Quién invita aparece en el texto (y escapado).
    html = await (await call('/h/luca?de=' + encodeURIComponent('Ana <b>'))).text();
    assert.match(html, /Ana b encendió una vela por Luca/);
    assert.ok(!/og:description" content="[^"]*</.test(html), 'sin etiquetas inyectadas');
    // Una huellita nueva sube su imagen y la vista previa la usa.
    const c = await (await post('/api/memorials', { name: 'Kira', species: 'perro', photo: PNG })).json();
    const own = { 'X-Edit-Token': c.editToken };
    html = await (await call(`/h/${c.memorial.id}`)).text();
    assert.match(html, new RegExp(`og:image" content="[^"]+/api/photos/${c.memorial.id}`), 'sin imagen propia usa la foto');
    assert.equal((await post(`/api/memorials/${c.memorial.id}/og`, { image: PNG }, own)).status, 400, 'sólo JPG');
    const r = await (await post(`/api/memorials/${c.memorial.id}/og`, { image: JPG }, own)).json();
    assert.match(r.ogCard, /\/api\/og\//);
    assert.equal((await post(`/api/memorials/${c.memorial.id}/og`, { image: JPG }, { 'X-Edit-Token': 'no' })).status, 403);
    const img = await call(`/api/og/${c.memorial.id}`);
    assert.equal(img.headers.get('content-type'), 'image/jpeg');
    html = await (await call(`/h/${c.memorial.id}`)).text();
    assert.match(html, /og:image" content="[^"]+\/api\/og\//);
    // Pasá la luz: una vela que llega por un link suma a quien lo compartió (una vez por persona y día).
    const code = name === 'local' ? 'abc123loc' : 'abc123ver';
    await post(`/api/memorials/${c.memorial.id}/candle`, { sid: 'r1', visitor: 'X', ref: code });
    await post(`/api/memorials/${c.memorial.id}/candle`, { sid: 'r1', visitor: 'X', ref: code });
    await post(`/api/memorials/${c.memorial.id}/candle`, { sid: 'r2', visitor: 'Y', ref: 'MAL!' });
    assert.equal((await (await call(`/api/ref/${code}`)).json()).n, 1);
  });

  test(`[${name}] Glow, regalitos, abrazos, frasco y noche de velas`, async () => {
    const mine = await (await post('/api/memorials', { name: 'Mía', species: 'perro', pendingGlow: 500 })).json();
    assert.equal(mine.memorial.glow, 60, 'el Glow guardado tiene tope');
    const who = { sid: 'g1', visitor: 'Brisa', glowTo: mine.memorial.id, glowToken: mine.editToken };
    const other = (await (await post('/api/memorials', { name: 'Otra', species: 'gato' })).json()).memorial;

    let r = await (await post(`/api/memorials/${other.id}/candle`, who)).json();
    assert.equal(r.glow.gained, 3);
    assert.equal(r.glow.total, 63);
    r = await (await post(`/api/memorials/${other.id}/flower`, who)).json();
    assert.equal(r.glow.gained, 2);
    assert.equal((await (await post(`/api/memorials/${other.id}/flower`, who)).json()).already, true);
    r = await (await post(`/api/memorials/${other.id}/gift`, { ...who, gift: '🎾 Una pelota' })).json();
    assert.equal(r.memorial.gifts, 1);
    assert.deepEqual(r.memorial.lastGifts, ['🎾']);
    assert.equal((await post(`/api/memorials/${other.id}/gift`, { ...who, sid: 'g2', gift: '💣 Bomba' })).status, 400);
    r = await (await post(`/api/memorials/${other.id}/hug`, who)).json();
    assert.equal(r.glow.gained, 1);
    r = await (await post(`/api/memorials/${other.id}/guestbook`, { ...who, text: 'Hola' })).json();
    assert.equal(r.glow.gained, 4);
    // Token falso: no suma Glow.
    r = await (await post(`/api/memorials/${other.id}/candle`, { ...who, sid: 'g3', glowToken: 'falso' })).json();
    assert.equal(r.glow.gained, 0);
    // La vela de hoy para la propia mascota suma poquito.
    r = await (await post(`/api/memorials/${mine.memorial.id}/candle`, who)).json();
    assert.equal(r.glow.gained, 2);
    const full = await (await call(`/api/memorials/${mine.memorial.id}`)).json();
    assert.equal(full.glow, 63 + 2 + 2 + 1 + 4 + 2);
    const det = await (await call(`/api/memorials/${other.id}`)).json();
    assert.equal(det.giftList[0].gift, '🎾 Una pelota');

    const night = await (await call('/api/night')).json();
    assert.ok(night.candles >= 2);

    assert.equal((await post('/api/jar', { text: 'x' })).status, 400);
    const j = await (await post('/api/jar', { text: 'esperarme siempre en la puerta', visitor: 'Ana' })).json();
    assert.ok(j.count >= 1);
    const jar = await (await call('/api/jar')).json();
    assert.equal(jar.notes[0].text, 'esperarme siempre en la puerta');
  });

  test(`[${name}] herramientas de la familia, luz eterna, ofrenda y consuelo`, async () => {
    const { memorial, editToken } = await (await post('/api/memorials', { name: 'Coco', species: 'perro' })).json();
    const id = memorial.id;
    const own = { 'X-Edit-Token': editToken };
    assert.equal((await post(`/api/memorials/${id}/edit`, { message: 'x' }, { 'X-Edit-Token': 'mal' })).status, 403);
    let r = await (await post(`/api/memorials/${id}/edit`, { message: 'Mi compañero', bg: 'talavera', birthday: '02-11', photo: PNG }, own)).json();
    assert.equal(r.message, 'Mi compañero');
    assert.equal(r.bg, 'talavera');
    assert.equal(r.birthday, '02-11');
    assert.match(r.photo, /\?v=1$/);
    r = await (await post(`/api/memorials/${id}/photos`, { photo: PNG }, own)).json();
    assert.equal(r.extraPhotos.length, 1);
    assert.equal((await call(r.extraPhotos[0])).status, 200);
    const WEBM = 'data:audio/webm;codecs=opus;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15';
    r = await (await post(`/api/memorials/${id}/voice`, { audio: WEBM }, own)).json();
    assert.match(r.voice, /^\/api\/voices\//);
    const v = await call(r.voice);
    assert.equal(v.status, 200);
    assert.equal(v.headers.get('content-type'), 'audio/webm');
    const page = await (await post(`/api/memorials/${id}/diary`, { text: 'Le encantaba el sol', prompt: '¿Dónde le encantaba dormir?' }, own)).json();
    assert.equal((await (await post(`/api/memorials/${id}/diary/${page.id}/heart`, { sid: 'h1' })).json()).hearts, 1);
    assert.equal((await (await post(`/api/memorials/${id}/diary/${page.id}/heart`, { sid: 'h1' })).json()).already, true);
    const at = Date.now() + 86400_000;
    r = await (await post(`/api/memorials/${id}/gathering`, { at }, own)).json();
    assert.equal(r.gathering, at);
    r = await (await post(`/api/memorials/${id}/eternal`, { visitor: 'Ana' })).json();
    assert.equal(r.memorial.eternal.by, 'Ana');
    assert.equal((await (await post(`/api/memorials/${id}/eternal`, { visitor: 'Otro' })).json()).already, true);
    await post(`/api/memorials/${id}/altar`, { sid: 'al1' });
    assert.ok((await (await call('/api/altar')).json()).ids.includes(id));
    const full = await (await call(`/api/memorials/${id}`)).json();
    assert.equal(full.diary[0].hearts, 1);
    assert.equal(full.diaryCount, 1);
    assert.equal((await post('/api/comfort', { text: 'No estás solo', visitor: 'Luz' })).status, 201);
    assert.equal((await (await call('/api/comfort')).json()).notes[0].text, 'No estás solo');
  });

  test(`[${name}] errores`, async () => {
    assert.equal((await post('/api/memorials', { name: '' })).status, 400);
    assert.equal((await post('/api/memorials', { name: 'x', photo: 'data:text/html;base64,AAAA' })).status, 400);
    assert.equal((await call('/api/nada')).status, 404);
  });
}

test('validación', () => {
  assert.ok(validateMemorial({}).error);
  assert.equal(validateMemorial({ name: 'x', species: 'dragón' }).species, 'otro');
  assert.equal(validateMemorial({ name: 'x', birthday: '13-40' }).birthday, null);
  assert.equal(parseDataUrl('data:image/png;base64,AAAA'), null);
  assert.ok(parseDataUrl(PNG));
});

test('el servidor local no sirve archivos fuera de dist', async () => {
  const r = await targets.local('/..%2fpackage.json');
  assert.notEqual(r.headers.get('content-type'), 'application/json');
});

test('latido barato: 3 comandos, trae novedades y limpia a quien se fue', async () => {
  const kv = createMemoryKv();
  let n = 0;
  const counted = {
    kind: 'memoria',
    async cmd(...a) { n += 1; return kv.cmd(...a); },
    async pipeline(cmds) { n += cmds.length; return kv.pipeline(cmds); },
  };
  const store = createStore(counted);
  // Alguien que se fue hace rato y otra persona que sigue acá.
  kv.exec(['HSET', 'hu:pres', 'viejo', JSON.stringify({ name: 'Viejo', at: Date.now() - 120_000 })]);
  await store.touch('b', { name: 'Luz' });
  const before = (await kv.cmd('HGETALL', 'hu:pres')).filter((_, i) => i % 2 === 0);
  assert.deepEqual(before.sort(), ['b'], 'se limpió al que se fue');
  // Un latido normal (sin novedades ni limpieza) cuesta 3 comandos.
  const r0 = await store.touch('a', { name: 'Nube' }, 0);
  n = 0;
  const r1 = await store.touch('a', { name: 'Nube', x: 3 }, r0.seq);
  assert.equal(n, 3);
  assert.deepEqual(r1.events, []);
  assert.equal(r1.others[0].name, 'Luz');
  assert.equal(r1.here, 2);
  assert.equal(await store.here(), 2);
  // Una vela de otra persona llega en el próximo latido, con el contador nuevo.
  const r = await store.candle('luca', { sid: 'v1', visitor: 'Luz' });
  const r2 = await store.touch('a', { name: 'Nube' }, r1.seq);
  assert.equal(r2.events.length, 1);
  assert.equal(r2.events[0].type, 'candle');
  assert.equal(r2.events[0].c, r.memorial.candles);
  assert.ok(r2.seq > r1.seq);
});

test('los encabezados de seguridad del servidor local y de Vercel coinciden', async () => {
  const { readFileSync } = await import('node:fs');
  const { CSP } = await import('./index.js');
  const v = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const all = v.headers.find((h) => h.source === '/(.*)').headers;
  assert.equal(all.find((h) => h.key === 'Content-Security-Policy').value, CSP);
  const r = await targets.local('/');
  assert.equal(r.headers.get('content-security-policy'), CSP);
});

test('la vista previa de Luca no depende de la base de datos', async () => {
  const { pageMeta, injectMeta } = await import('./page.js');
  const meta = await pageMeta(null, 'luca', { origin: 'https://x.test', de: 'Axel' });
  assert.equal(meta.image, 'https://x.test/huellitas/luca-og.jpg');
  assert.match(meta.description, /Axel encendió una vela por Luca/);
  assert.equal(await pageMeta(null, 'otra', { origin: 'https://x.test' }), null);
  const html = injectMeta('<title>x</title><meta property="og:title" content="y" />', meta);
  assert.match(html, /<title>Luca · Encendé una huellita<\/title>/);
});
