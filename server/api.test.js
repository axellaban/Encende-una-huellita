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

  test(`[${name}] presencia`, async () => {
    await post('/api/now', { sid: 'a' });
    const j = await (await post('/api/now', { sid: 'b' })).json();
    assert.ok(j.here >= 2);
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
