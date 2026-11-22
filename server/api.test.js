import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, parseDataUrl, validateMemorial } from './index.js';

let server, store, base, dir;
// PNG de 1x1 transparente.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'huellita-'));
  ({ server, store } = createApp({ dataDir: dir }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const post = (p, body, headers = {}) =>
  fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('lista con huellitas de ejemplo', async () => {
  const r = await fetch(base + '/api/memorials');
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.ok(j.memorials.length >= 10);
  assert.ok(j.memorials.every((m) => !('tokenHash' in m)));
});

test('crear, encender vela, flor, libro de visitas y borrar', async () => {
  let r = await post('/api/memorials', { name: '  Bella ', species: 'gato', photo: PNG, birthday: '05-04', visitor: 'Brisa Suave' });
  assert.equal(r.status, 201);
  const { memorial, editToken } = await r.json();
  assert.equal(memorial.name, 'Bella');
  assert.match(memorial.photo, /^\/uploads\/.+\.png$/);
  assert.equal((await fetch(base + memorial.photo)).status, 200);

  r = await post(`/api/memorials/${memorial.id}/candle`, { sid: 's1', visitor: 'Brisa Suave' });
  assert.equal((await r.json()).memorial.candles, 2);
  r = await post(`/api/memorials/${memorial.id}/candle`, { sid: 's1' });
  const again = await r.json();
  assert.equal(again.already, true);
  assert.equal(again.memorial.candles, 2);

  r = await post(`/api/memorials/${memorial.id}/flower`, {});
  assert.equal((await r.json()).memorial.flowers, 1);

  r = await post(`/api/memorials/${memorial.id}/guestbook`, { name: 'Ana', text: 'Te queremos' });
  assert.equal(r.status, 201);
  const full = await (await fetch(`${base}/api/memorials/${memorial.id}`)).json();
  assert.equal(full.guestbook[0].text, 'Te queremos');

  const act = await (await fetch(base + '/api/activity?since=0')).json();
  assert.deepEqual(act.events.map((e) => e.type), ['created', 'candle', 'flower', 'guestbook']);

  r = await fetch(`${base}/api/memorials/${memorial.id}`, { method: 'DELETE', headers: { 'X-Edit-Token': 'nope' } });
  assert.equal(r.status, 403);
  r = await fetch(`${base}/api/memorials/${memorial.id}`, { method: 'DELETE', headers: { 'X-Edit-Token': editToken } });
  assert.equal(r.status, 200);
  assert.equal((await fetch(base + memorial.photo)).status, 404);
});

test('presencia', async () => {
  await post('/api/now', { sid: 'a' });
  const j = await (await post('/api/now', { sid: 'b' })).json();
  assert.ok(j.here >= 2);
});

test('validación', () => {
  assert.ok(validateMemorial({}).error);
  assert.equal(validateMemorial({ name: 'x', species: 'dragón' }).species, 'otro');
  assert.equal(validateMemorial({ name: 'x', birthday: '13-40' }).birthday, null);
  assert.equal(parseDataUrl('data:image/png;base64,AAAA'), null);
  assert.equal(parseDataUrl('data:text/html;base64,AAAA'), null);
  assert.ok(parseDataUrl(PNG));
});

test('no sirve archivos fuera de las carpetas públicas', async () => {
  const r = await fetch(base + '/uploads/..%2fdb.json');
  assert.equal(r.status, 404);
});
