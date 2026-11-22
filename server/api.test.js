import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from './index.js';
import { parseDataUrl, validateMemorial } from './core.js';
import { createMemoryKv } from './kv/memory.js';

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
