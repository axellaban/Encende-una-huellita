// El original queda en este dispositivo. El servidor recibe lotes con recibos para reintentar.
import { FEATURED } from '../server/seed.js';

export const DEMO_KEY = 'huellita.local.v2';
export const MIGRATION_KEY = 'huellita.import.v1';
export const SHARED_KEY = 'huellita.shared.v1';
const TOKENS_KEY = 'huellita.tokens';
const day = () => new Date().toISOString().slice(0, 10);
const read = (storage, key) => storage.getItem(key);
const write = (storage, key, value) => {
  try { if (storage.getItem(key) !== value) storage.setItem(key, value); }
  catch { throw new Error('Este dispositivo no tiene lugar para guardar el acceso a tus recuerdos. Guardá una copia antes de seguir.'); }
};

export function demoRecords(db) {
  if (!db || typeof db !== 'object' || Array.isArray(db)) throw new Error('No pudimos leer los recuerdos de este dispositivo. Guardá una copia antes de seguir.');
  const pets = Array.isArray(db.memorials) ? db.memorials : [];
  const featured = new Set(FEATURED.map((f) => f.id));
  const known = new Set([...featured, ...pets.map((m) => m.id)]);
  const out = [];
  const add = (kind, localId, value, suffix = '') => out.push({ kind, localId, value, key: `${kind}:${localId || value?.board || value?.day || 'all'}:${suffix}` });
  for (const m of pets) {
    const gifts = db.gifts?.[m.id] || [];
    const counts = m.giftCounts || gifts.reduce((a, g) => { const emoji = g.gift.split(' ')[0]; a[emoji] = (a[emoji] || 0) + 1; return a; }, {});
    const { photo, extraPhotos, voice, ...fields } = m;
    add('memorial', m.id, { ...fields, hasPhoto: !!photo, giftCounts: counts });
  }
  for (const id of featured) if (db.counters?.[id]) add('featured', id, db.counters[id]);
  for (const m of pets) {
    if (m.photo) add('photo', m.id, { n: 0, data: m.photo }, '0');
    for (const [i, photo] of (m.extraPhotos || []).entries()) add('photo', m.id, { n: i + 1, data: photo }, String(i + 1));
    if (m.voice) add('voice', m.id, { data: m.voice });
  }
  for (const [id, entries] of Object.entries(db.diary || {})) {
    if (!known.has(id) || featured.has(id)) continue;
    entries.forEach((p, i) => add('diary', id, { ...p, hearts: db.dh?.[`${id}:${p.id}`] || p.hearts || 0 }, String(i)));
  }
  for (const [kind, lists] of [['guestbook', db.guestbook], ['gift', db.gifts]]) {
    for (const [id, entries] of Object.entries(lists || {})) if (known.has(id)) entries.forEach((e, i) => add(kind, id, e, String(i)));
  }
  for (const board of ['jar', 'comfort']) (db[board] || []).forEach((e, i) => add('board', null, { ...e, board }, String(i)));
  (db.events || []).forEach((e, i) => { if (known.has(e.memorialId)) add('event', e.memorialId, e, String(i)); });
  for (const key of Object.keys(db.done || {})) {
    const [action, id, date] = key.split(':');
    if (['c', 'f', 'g', 'h', 'w'].includes(action) && known.has(id) && date === day()) add('daily', id, { action, day: date }, action);
    else if (known.has(action) && date === day()) add('daily', action, { action: 'dh', pageId: id, day: date }, `dh-${id}`);
  }
  for (const id of db.altar?.[day()] || []) if (known.has(id)) add('altar', id);
  if (db.altar?.done === day()) add('daily', FEATURED[0].id, { action: 'al', day: day() }, 'al');
  if (db.night?.[day()]) add('night', null, { day: day(), candles: db.night[day()] });
  // Publicar sólo después de recuperar todas las fotos, palabras y recuerdos de cada huellita.
  for (const m of pets) add('publish', m.id);
  return out;
}

function applyMapping(storage, mapping) {
  let tokens;
  try { tokens = JSON.parse(read(storage, TOKENS_KEY) || '{}'); }
  catch { throw new Error('No pudimos leer el acceso familiar de este dispositivo. Guardá una copia antes de seguir.'); }
  if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens)) throw new Error('No pudimos leer el acceso familiar. Guardá una copia antes de seguir.');
  const ids = Object.create(null);
  for (const [old, value] of Object.entries(mapping)) {
    if (!value || !/^[\w-]{3,24}$/.test(value.id) || typeof value.editToken !== 'string') throw new Error('No pudimos guardar el acceso familiar. Tus recuerdos originales siguen acá.');
    tokens[value.id] = value.editToken;
    ids[old] = value.id;
    for (const action of ['c', 'f', 'g', 'h', 'w']) {
      const oldKey = `huellita.did.${action}.${old}`;
      const value = read(storage, oldKey);
      if (value !== null) write(storage, `huellita.did.${action}.${ids[old]}`, value);
    }
  }
  write(storage, TOKENS_KEY, JSON.stringify(tokens));
  for (const key of ['huellita.myPet', 'huellita.walking']) {
    const old = read(storage, key);
    if (ids[old]) write(storage, key, ids[old]);
  }
  return ids;
}

async function recover({ request, storage, onProgress = () => {} }) {
  let raw;
  try { storage ||= localStorage; raw = read(storage, DEMO_KEY); }
  catch { return null; }
  if (!raw) return null;
  let state;
  try { state = JSON.parse(read(storage, MIGRATION_KEY) || 'null'); }
  catch { throw new Error('No pudimos leer el estado de tus recuerdos. Guardá una copia antes de seguir.'); }
  if (state && (!/^[a-f0-9]{64}$/.test(state.source || '') || !state.mapping || typeof state.mapping !== 'object' || Array.isArray(state.mapping))) {
    throw new Error('No pudimos leer el estado de tus recuerdos. Guardá una copia antes de seguir.');
  }
  if (state?.done) return { mapping: applyMapping(storage, state.mapping), recovered: 0 };
  let db;
  try { db = JSON.parse(raw); } catch { throw new Error('No pudimos leer los recuerdos de este dispositivo. Guardá una copia antes de seguir.'); }
  let records;
  try { records = demoRecords(db); }
  catch { throw new Error('No pudimos leer todos los recuerdos de este dispositivo. Guardá una copia antes de seguir.'); }
  if (!records.length) return null;
  if (!state) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    state = { source: [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(''), mapping: {}, done: false };
    write(storage, MIGRATION_KEY, JSON.stringify(state)); // Antes del primer envío: no perder el permiso.
  }
  let batch = [], size = 0, done = 0;
  const send = async () => {
    if (!batch.length) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    let result;
    try {
      result = await request('/api/import', { method: 'POST', signal: ctrl.signal, body: { source: state.source, sid: read(storage, 'huellita.sid'), records: batch } });
    } finally { clearTimeout(timer); }
    if (!result.mapping || !Number.isFinite(result.imported)) throw new Error('No pudimos confirmar el guardado de tus recuerdos. Volvé a intentar.');
    Object.assign(state.mapping, result.mapping);
    applyMapping(storage, state.mapping);
    write(storage, MIGRATION_KEY, JSON.stringify(state));
    done += batch.length; onProgress(done, records.length);
    batch = []; size = 0;
  };
  onProgress(0, records.length);
  for (const record of records) {
    const bytes = new TextEncoder().encode(JSON.stringify(record)).length;
    if (batch.length && (batch.length >= 20 || size + bytes > 2.8 * 1024 * 1024)) await send();
    if (bytes > 2.8 * 1024 * 1024) throw new Error('Uno de tus recuerdos es demasiado grande para enviarlo. Guardá una copia antes de seguir.');
    batch.push(record); size += bytes;
  }
  await send();
  state.done = true;
  write(storage, MIGRATION_KEY, JSON.stringify(state));
  return { mapping: applyMapping(storage, state.mapping), recovered: (db.memorials || []).length };
}

export async function recoverDemo(options) {
  // Dos pestañas del mismo navegador comparten el rescate y la clave privada.
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('huellita-rescate-demo', () => recover(options));
  }
  return recover(options);
}

export function downloadDemoBackup() {
  const backup = { version: 1, savedAt: new Date().toISOString(), data: {} };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('huellita.')) backup.data[key] = localStorage.getItem(key);
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'mis-recuerdos-huellita.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
