import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createMemoryKv } from './kv/memory.js';
import { createStore } from './store.js';
import { createUpstashKv } from './kv/upstash.js';
import { recoverDemo, DEMO_KEY, MIGRATION_KEY, SHARED_KEY, demoRecords } from '../src/migrate.js';
import { connect } from '../src/api.js';
import { createGame } from '../src/game.js';

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k),
    key: (i) => [...data.keys()][i], get length() { return data.size; } };
}
const snapshot = () => ({
  memorials: [{ id: 'antes01', name: 'Luna', species: 'gato', candles: 4, flowers: 2, gifts: 0, createdAt: 1700000000000 }],
  guestbook: { antes01: [{ id: 'firma01', name: 'Ana', text: 'Mi compañera' }] },
  diary: { antes01: [{ id: 'pagina01', text: 'Te recuerdo' }] },
  gifts: {}, counters: {}, jar: [{ text: 'Gracias por estar', who: 'Ana' }], comfort: [{ text: 'Estoy con vos', who: 'Ana' }], events: [],
});

test('una respuesta perdida se recupera después de reiniciar sin duplicar recuerdos', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'huellita-rescate-'));
  const file = join(dir, 'kv.json');
  const raw = JSON.stringify(snapshot());
  const ls = storage({ [DEMO_KEY]: raw, 'huellita.tokens': JSON.stringify({ antes01: 'local-antes01' }),
    'huellita.myPet': 'antes01', 'huellita.walking': 'antes01', 'huellita.sid': 'mi-visita' });
  const first = createMemoryKv({ file });
  let reopened;
  try {
    const store = createStore(first);
    let committed;
    await assert.rejects(recoverDemo({ storage: ls, request: async (_, opts) => {
      committed = await store.importBatch(opts.body);
      throw new Error('Se perdió la respuesta después de guardar');
    } }), /Se perdió/);
    assert.equal(ls.getItem(DEMO_KEY), raw, 'no se toca la copia original');
    assert.equal(JSON.parse(ls.getItem(MIGRATION_KEY)).done, false);
    first.flush();
    reopened = createMemoryKv({ file });
    const after = createStore(reopened);
    const result = await recoverDemo({ storage: ls, request: (_, opts) => after.importBatch(opts.body) });
    const id = result.mapping.antes01;
    assert.equal(id, committed.mapping.antes01.id);
    const pet = await after.get(id);
    assert.equal(pet.candles, 4); assert.equal(pet.guestbookCount, 1); assert.equal(pet.diaryCount, 1);
    assert.equal((await after.jar()).count, 1);
    assert.equal((await after.board('comfort')).count, 1);
    assert.equal((await after.list()).filter((m) => m.name === 'Luna').length, 1);
    assert.equal(ls.getItem(DEMO_KEY), raw);
    assert.equal(ls.getItem('huellita.myPet'), id);
    assert.equal(ls.getItem('huellita.walking'), id);
    const tokens = JSON.parse(ls.getItem('huellita.tokens'));
    assert.equal((await after.owner(id, tokens[id])).error, undefined);
    assert.equal(JSON.parse(ls.getItem(MIGRATION_KEY)).done, true);
    let called = false;
    await recoverDemo({ storage: ls, request: () => { called = true; } });
    assert.equal(called, false, 'una visita siguiente no vuelve a importar');
  } finally { first.flush(); reopened?.flush(); rmSync(dir, { recursive: true, force: true }); }
});

test('dos rescates concurrentes del mismo navegador conservan una sola copia', async () => {
  const ls = storage({ [DEMO_KEY]: JSON.stringify(snapshot()) });
  const store = createStore(createMemoryKv());
  const request = (_, opts) => store.importBatch(opts.body);
  const [a, b] = await Promise.all([recoverDemo({ storage: ls, request }), recoverDemo({ storage: ls, request })]);
  assert.equal(a.mapping.antes01, b.mapping.antes01);
  assert.equal((await store.list()).filter((m) => m.name === 'Luna').length, 1);
  assert.equal((await store.get(a.mapping.antes01)).guestbookCount, 1);
  assert.equal((await store.jar()).count, 1);
  assert.equal((await store.board('comfort')).count, 1);
});

test('sin espacio para guardar la clave privada no se envía ningún recuerdo', async () => {
  const ls = storage({ [DEMO_KEY]: JSON.stringify(snapshot()) });
  const set = ls.setItem;
  ls.setItem = (key, value) => { if (key === MIGRATION_KEY) throw new Error('QuotaExceeded'); set(key, value); };
  let called = false;
  await assert.rejects(recoverDemo({ storage: ls, request: () => { called = true; } }), /Guardar|Guardá/);
  assert.equal(called, false);
  assert.ok(ls.getItem(DEMO_KEY));
});

test('los lotes no superan el límite de cuerpo aunque haya varias fotos grandes', async () => {
  const db = snapshot();
  const photo = 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50]), Buffer.alloc(1200000)]).toString('base64');
  db.memorials[0].photo = photo; db.memorials[0].extraPhotos = [photo, photo, photo];
  const ls = storage({ [DEMO_KEY]: JSON.stringify(db) });
  let batches = 0;
  await recoverDemo({ storage: ls, request: async (_, opts) => {
    batches++;
    assert.ok(Buffer.byteLength(JSON.stringify(opts.body)) < 3.5 * 1024 * 1024);
    assert.ok(opts.body.records.length <= 20);
    const mapping = opts.body.records.some((r) => r.kind === 'memorial') ? { antes01: { id: 'despues01', editToken: 'permiso-seguro-de-prueba' } } : {};
    return { mapping, imported: opts.body.records.length };
  } });
  assert.ok(batches >= 4);
});

test('no se rescatan mascotas quitadas ni sus registros huérfanos', () => {
  const db = snapshot(); db.memorials = [];
  assert.equal(demoRecords(db).some((r) => r.localId === 'antes01'), false);
});

test('el rescate respeta el límite de creación normal y permite reintentar lo ya guardado', async () => {
  const store = createStore(createMemoryKv());
  const source = 'b'.repeat(64);
  const records = Array.from({ length: 13 }, (_, i) => ({ kind: 'memorial', key: `mascota:${i}`, localId: `antes${String(i).padStart(2, '0')}`, value: { name: `Mascota ${i}`, species: 'otro' } }));
  await assert.rejects(store.importBatch({ source, records }, 'prueba'), (e) => e.status === 429);
  const retry = await store.importBatch({ source, records: records.slice(0, 12) }, 'prueba');
  assert.equal(retry.imported, 0);
  assert.equal(Object.keys(retry.mapping).length, 12);
});

test('las fotos grandes se conservan con pedidos a Redis menores de 1 MB', async () => {
  const memory = createMemoryKv();
  const client = createUpstashKv({ url: 'https://redis.test', token: 'prueba', fetchImpl: async (url, opts) => {
    assert.ok(Buffer.byteLength(opts.body) < 1024 * 1024);
    const commands = JSON.parse(opts.body);
    const result = url.endsWith('/pipeline') ? commands.map((c) => ({ result: memory.exec(c) })) : { result: memory.exec(commands) };
    return new Response(JSON.stringify(result));
  } });
  const store = createStore(client);
  const db = snapshot();
  const bytes = Buffer.concat([Buffer.from([0x89, 0x50]), Buffer.alloc(1200000)]);
  db.memorials[0].photo = 'data:image/png;base64,' + bytes.toString('base64');
  db.memorials[0].extraPhotos = [db.memorials[0].photo];
  const ls = storage({ [DEMO_KEY]: JSON.stringify(db) });
  const result = await recoverDemo({ storage: ls, request: (_, opts) => store.importBatch(opts.body) });
  const id = result.mapping.antes01;
  assert.deepEqual((await store.photo(id)).bytes, bytes);
  assert.deepEqual((await store.extraPhoto(id, 1)).bytes, bytes);
  assert.equal((await store.get(id)).extraPhotos.length, 1);
});

test('una conexión compartida no vuelve a demo al fallar internet; una instalación sin base sí ofrece demo', async () => {
  const previous = { fetch: globalThis.fetch, storage: globalThis.localStorage };
  try {
    const ls = storage(); globalThis.localStorage = ls;
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }));
    assert.equal((await connect()).mode, 'server'); assert.equal(ls.getItem(SHARED_KEY), '1');
    globalThis.fetch = async () => { throw new Error('sin internet'); };
    await assert.rejects(connect(), /jardín compartido/);
    assert.equal(ls.getItem(DEMO_KEY), null);
    globalThis.localStorage = storage();
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: false }));
    assert.equal((await connect()).mode, 'local');
  } finally { globalThis.fetch = previous.fetch; globalThis.localStorage = previous.storage; }
});

test('el progreso del día y lo recibido por mis mascotas siguen asociados a las huellitas recuperadas', () => {
  const previous = globalThis.localStorage;
  try {
    globalThis.localStorage = storage({ 'huellita.game.v1': JSON.stringify({ seen: { antes01: { c: 4 } },
      done: { lit: ['antes01'] }, pendingGlow: 12, streak: { last: '2026-11-23', n: 4, best: 4 } }) });
    const game = createGame(); game.remap({ antes01: 'despues01' });
    const saved = JSON.parse(localStorage.getItem('huellita.game.v1'));
    assert.deepEqual(saved.done.lit, ['despues01']); assert.deepEqual(saved.seen.despues01, { c: 4 });
    assert.equal(saved.pendingGlow, 12); assert.equal(saved.streak.n, 4);
  } finally { globalThis.localStorage = previous; }
});
