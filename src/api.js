// Cliente de la API. Si no hay servidor (por ejemplo, hosting estático), usa un modo local
// con localStorage para que el jardín siga funcionando en este navegador.
import { SEED_MEMORIALS } from '../server/seed.js';

const LS_KEY = 'huellita.local.v1';
const TOKENS_KEY = 'huellita.tokens';

async function req(path, opts = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'No pudimos conectar. Probá de nuevo.');
  return j;
}

export function myTokens() {
  try { return JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}'); } catch { return {}; }
}
function saveToken(id, token) {
  const t = myTokens();
  t[id] = token;
  try { localStorage.setItem(TOKENS_KEY, JSON.stringify(t)); } catch { /* sin storage */ }
}
function dropToken(id) {
  const t = myTokens();
  delete t[id];
  try { localStorage.setItem(TOKENS_KEY, JSON.stringify(t)); } catch { /* sin storage */ }
}

const remote = {
  mode: 'server',
  list: () => req('/api/memorials'),
  get: (id) => req(`/api/memorials/${id}`),
  async create(data) {
    const r = await req('/api/memorials', { method: 'POST', body: data });
    saveToken(r.memorial.id, r.editToken);
    return r.memorial;
  },
  async remove(id) {
    await req(`/api/memorials/${id}`, { method: 'DELETE', headers: { 'X-Edit-Token': myTokens()[id] || '' } });
    dropToken(id);
  },
  candle: (id, who) => req(`/api/memorials/${id}/candle`, { method: 'POST', body: who }),
  flower: (id, who) => req(`/api/memorials/${id}/flower`, { method: 'POST', body: who }),
  sign: (id, entry) => req(`/api/memorials/${id}/guestbook`, { method: 'POST', body: entry }),
  activity: (since) => req(`/api/activity?since=${since}`),
  heartbeat: (who) => req('/api/now', { method: 'POST', body: who }),
};

function makeLocal() {
  let db;
  try { db = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { db = null; }
  if (!db) {
    const now = Date.now();
    db = {
      seq: 0,
      events: [],
      guestbook: {},
      memorials: SEED_MEMORIALS.map((m, i) => ({
        ...m, id: `demo${i}`, slot: i * 7 + 3, photo: null, demo: true,
        birthday: m.birthday ?? null, passedDay: null, createdAt: now - i * 86400000,
      })),
    };
  }
  const persist = () => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch { /* lleno */ }
  };
  const find = (id) => db.memorials.find((m) => m.id === id);
  const pub = (m) => ({ ...m, guestbookCount: (db.guestbook[m.id] || []).length });
  const ev = (type, m, visitor) => {
    db.seq += 1;
    db.events.push({ seq: db.seq, type, memorialId: m.id, petName: m.name, visitor: visitor || 'Alguien', at: Date.now() });
    db.events = db.events.slice(-100);
  };
  const stats = () => ({
    memorials: db.memorials.length,
    candles: db.memorials.reduce((a, m) => a + m.candles, 0),
    flowers: db.memorials.reduce((a, m) => a + m.flowers, 0),
  });
  const lit = new Map();
  return {
    mode: 'local',
    async list() { return { memorials: db.memorials.map(pub), stats: stats(), seq: db.seq }; },
    async get(id) {
      const m = find(id);
      if (!m) throw new Error('No encontramos esa huellita.');
      return { ...pub(m), guestbook: (db.guestbook[id] || []).slice().reverse() };
    },
    async create(data) {
      const used = new Set(db.memorials.map((m) => m.slot));
      let slot = Number.isInteger(data.slot) && !used.has(data.slot) ? data.slot : 0;
      while (used.has(slot)) slot++;
      const m = {
        id: Math.random().toString(36).slice(2, 10), slot, name: data.name.trim().slice(0, 30), species: data.species,
        message: (data.message || '').slice(0, 200), birthday: data.birthday || null, passedDay: data.passedDay || null,
        photo: data.photo || null, hue: Math.floor(Math.random() * 360), candles: 1, flowers: 0, demo: false, createdAt: Date.now(),
      };
      db.memorials.push(m);
      ev('created', m, data.visitor);
      persist();
      saveToken(m.id, 'local');
      return pub(m);
    },
    async remove(id) {
      db.memorials = db.memorials.filter((m) => m.id !== id);
      delete db.guestbook[id];
      persist();
      dropToken(id);
    },
    async candle(id, who) {
      const m = find(id);
      if (Date.now() - (lit.get(id) || 0) < 10 * 60_000) return { memorial: pub(m), already: true };
      lit.set(id, Date.now());
      m.candles += 1; ev('candle', m, who.visitor); persist();
      return { memorial: pub(m) };
    },
    async flower(id, who) {
      const m = find(id); m.flowers += 1; ev('flower', m, who.visitor); persist();
      return { memorial: pub(m) };
    },
    async sign(id, entry) {
      const m = find(id);
      const e = { id: Math.random().toString(36).slice(2), name: entry.name || entry.visitor, text: entry.text.slice(0, 280), at: Date.now() };
      (db.guestbook[id] ||= []).push(e);
      ev('guestbook', m, e.name); persist();
      return e;
    },
    async activity(since) { return { events: db.events.filter((e) => e.seq > since), seq: db.seq, here: 1 }; },
    async heartbeat() { return { here: 1 }; },
  };
}

export async function connect() {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    if (r.ok && (await r.json()).ok) return remote;
  } catch { /* sin servidor */ }
  return makeLocal();
}
