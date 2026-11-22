// Cliente de la API. Si no hay servidor con base de datos (por ejemplo, un deploy en Vercel sin Upstash
// conectado), usa un modo local con localStorage para que el jardín siga funcionando en este navegador.
import { FEATURED } from '../server/seed.js';

const LS_KEY = 'huellita.local.v2';
const TOKENS_KEY = 'huellita.tokens';

async function req(path, opts = {}) {
  let r;
  try {
    r = await fetch(path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error('Sin conexión. Revisá tu internet y probá de nuevo.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'No pudimos conectar. Probá de nuevo.');
  return j;
}

export function myTokens() {
  try { return JSON.parse(localStorage.getItem(TOKENS_KEY) || '{}'); } catch { return {}; }
}
function setToken(id, token) {
  const t = myTokens();
  if (token) t[id] = token;
  else delete t[id];
  try { localStorage.setItem(TOKENS_KEY, JSON.stringify(t)); } catch { /* sin storage */ }
}

const remote = {
  mode: 'server',
  list: () => req('/api/memorials'),
  get: (id) => req(`/api/memorials/${encodeURIComponent(id)}`),
  async create(data) {
    const r = await req('/api/memorials', { method: 'POST', body: data });
    setToken(r.memorial.id, r.editToken);
    return r.memorial;
  },
  async remove(id) {
    await req(`/api/memorials/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'X-Edit-Token': myTokens()[id] || '' } });
    setToken(id, null);
  },
  candle: (id, who) => req(`/api/memorials/${encodeURIComponent(id)}/candle`, { method: 'POST', body: who }),
  flower: (id, who) => req(`/api/memorials/${encodeURIComponent(id)}/flower`, { method: 'POST', body: who }),
  sign: (id, entry) => req(`/api/memorials/${encodeURIComponent(id)}/guestbook`, { method: 'POST', body: entry }),
  activity: (since) => req(`/api/activity/${Math.max(0, since | 0)}`),
  heartbeat: (who) => req('/api/now', { method: 'POST', body: who }),
};

function makeLocal() {
  let db;
  try { db = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { db = null; }
  if (!db) db = { seq: 0, events: [], guestbook: {}, memorials: [], counters: {} };
  // Las destacadas siempre vienen del código; acá sólo guardamos sus contadores.
  const featured = () => FEATURED.map((f) => ({ ...f, candles: 0, flowers: 0, createdAt: 0, ...(db.counters[f.id] || {}) }));
  const all = () => [...featured(), ...db.memorials];
  const persist = () => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch { /* lleno */ }
  };
  const find = (id) => all().find((m) => m.id === id);
  const bump = (id, field) => {
    const own = db.memorials.find((m) => m.id === id);
    if (own) own[field] += 1;
    else {
      const c = (db.counters[id] ||= { candles: 0, flowers: 0 });
      c[field] += 1;
    }
  };
  const pub = (m) => ({ ...m, guestbookCount: (db.guestbook[m.id] || []).length });
  const ev = (type, m, visitor) => {
    db.seq += 1;
    db.events.push({ seq: db.seq, type, memorialId: m.id, petName: m.name, visitor: visitor || 'Alguien', at: Date.now() });
    db.events = db.events.slice(-100);
  };
  const lit = new Map();
  return {
    mode: 'local',
    async list() {
      const memorials = all().map(pub);
      return {
        memorials,
        stats: { memorials: memorials.length, candles: memorials.reduce((a, m) => a + m.candles, 0), flowers: memorials.reduce((a, m) => a + m.flowers, 0) },
      };
    },
    async get(id) {
      const m = find(id);
      if (!m) throw new Error('No encontramos esa huellita.');
      return { ...pub(m), guestbook: (db.guestbook[id] || []).slice().reverse() };
    },
    async create(data) {
      const used = new Set(db.memorials.map((m) => m.slot));
      let slot = Number.isInteger(data.slot) && data.slot >= 0 && !used.has(data.slot) ? data.slot : 0;
      while (used.has(slot)) slot++;
      const m = {
        id: Math.random().toString(36).slice(2, 10), slot, name: data.name.trim().slice(0, 30), species: data.species,
        message: (data.message || '').slice(0, 200), birthday: data.birthday || null, passedDay: data.passedDay || null,
        photo: data.photo || null, hue: Math.floor(Math.random() * 360), candles: 1, flowers: 0, createdAt: Date.now(),
      };
      db.memorials.push(m);
      ev('created', m, data.visitor);
      persist();
      setToken(m.id, 'local');
      return pub(m);
    },
    async remove(id) {
      db.memorials = db.memorials.filter((m) => m.id !== id);
      delete db.guestbook[id];
      persist();
      setToken(id, null);
    },
    async candle(id, who) {
      if (Date.now() - (lit.get(id) || 0) < 10 * 60_000) return { memorial: pub(find(id)), already: true };
      lit.set(id, Date.now());
      bump(id, 'candles');
      const m = find(id);
      ev('candle', m, who.visitor);
      persist();
      return { memorial: pub(m) };
    },
    async flower(id, who) {
      bump(id, 'flowers');
      const m = find(id);
      ev('flower', m, who.visitor);
      persist();
      return { memorial: pub(m) };
    },
    async sign(id, entry) {
      const m = find(id);
      const e = { id: Math.random().toString(36).slice(2), name: entry.name || entry.visitor, text: entry.text.slice(0, 280), at: Date.now() };
      (db.guestbook[id] ||= []).push(e);
      ev('guestbook', m, e.name);
      persist();
      return e;
    },
    async activity(since) { return { events: db.events.filter((e) => e.seq > since), seq: db.seq, here: 1 }; },
    async heartbeat() { return { here: 1 }; },
  };
}

export async function connect() {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch('/api/health', { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(to);
    if (r.ok && (await r.json()).ok) return remote;
  } catch { /* sin servidor */ }
  return makeLocal();
}
