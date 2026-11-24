// Cliente de la API. Si no hay servidor con base de datos (por ejemplo, un deploy en Vercel sin Upstash
// conectado), usa un modo local con localStorage para que el jardín siga funcionando en este navegador.
import { FEATURED } from '../server/seed.js';
import { cleanLook } from '../server/looks.js';
import { GLOW } from '../server/glow.js';

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
  gift: (id, who, gift) => req(`/api/memorials/${encodeURIComponent(id)}/gift`, { method: 'POST', body: { ...who, gift } }),
  hug: (id, who) => req(`/api/memorials/${encodeURIComponent(id)}/hug`, { method: 'POST', body: who }),
  sign: (id, entry) => req(`/api/memorials/${encodeURIComponent(id)}/guestbook`, { method: 'POST', body: entry }),
  heartbeat: (info) => req('/api/now', { method: 'POST', body: info }),
  night: () => req('/api/night'),
  jar: () => req('/api/jar'),
  jarAdd: (text, visitor) => req('/api/jar', { method: 'POST', body: { text, visitor } }),
  comfort: () => req('/api/comfort'),
  comfortAdd: (text, visitor) => req('/api/comfort', { method: 'POST', body: { text, visitor } }),
  eternal: (id, who) => req(`/api/memorials/${encodeURIComponent(id)}/eternal`, { method: 'POST', body: who }),
  toAltar: (id, who) => req(`/api/memorials/${encodeURIComponent(id)}/altar`, { method: 'POST', body: who }),
  altar: () => req('/api/altar'),
  ref: (code) => req(`/api/ref/${encodeURIComponent(code)}`),
  heartDiary: (id, pid, sid) => req(`/api/memorials/${encodeURIComponent(id)}/diary/${pid}/heart`, { method: 'POST', body: { sid } }),
  // Herramientas de la familia (con el token de edición).
  own: (id, what, body) => req(`/api/memorials/${encodeURIComponent(id)}/${what}`, { method: 'POST', body, headers: { 'X-Edit-Token': myTokens()[id] || '' } }),
};

function makeLocal() {
  let db;
  try { db = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { db = null; }
  if (!db) db = { seq: 0, events: [], guestbook: {}, memorials: [], counters: {} };
  db.gifts ||= {};
  db.jar ||= [];
  db.done ||= {};
  db.night ||= {};
  const day = () => new Date().toISOString().slice(0, 10);
  const onceToday = (action, id) => {
    const k = `${action}:${id}:${day()}`;
    if (db.done[k]) return false;
    db.done[k] = 1;
    return true;
  };
  const grant = (targetId, kind, who, bonus = 0) => {
    const mine = db.memorials.find((m) => m.id === who.glowTo);
    if (!mine) return { gained: 0, to: null };
    const own = mine.id === targetId;
    if (own && kind !== 'candle') return { gained: 0, to: null };
    const gained = own ? GLOW.ownCandle : GLOW[kind] + bonus;
    mine.glow = (mine.glow || 0) + gained;
    return { gained, total: mine.glow, to: mine.id };
  };
  // Las destacadas siempre vienen del código; acá sólo guardamos sus contadores.
  const featured = () => FEATURED.map((f) => ({ ...f, candles: 0, flowers: 0, gifts: 0, glow: 0, lastGifts: [], createdAt: 0, ...(db.counters[f.id] || {}) }));
  const all = () => [...featured(), ...db.memorials];
  let warned = false;
  const persist = () => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch {
      // Lleno (las fotos ocupan mucho): avisar una vez en vez de perder datos en silencio.
      if (!warned) {
        warned = true;
        dispatchEvent(new CustomEvent('huellita:storage-full'));
      }
    }
  };
  const find = (id) => all().find((m) => m.id === id);
  const bump = (id, field) => {
    const own = db.memorials.find((m) => m.id === id);
    if (own) own[field] = (own[field] || 0) + 1;
    else {
      const c = (db.counters[id] ||= { candles: 0, flowers: 0, gifts: 0, lastGifts: [] });
      c[field] = (c[field] || 0) + 1;
    }
  };
  const pub = (m) => ({ ...m, guestbookCount: (db.guestbook[m.id] || []).length });
  const ev = (type, m, visitor, extra = {}) => {
    db.seq += 1;
    db.events.push({ seq: db.seq, type, memorialId: m.id, petName: m.name, visitor: visitor || 'Alguien', at: Date.now(), ...extra });
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
    async create(data) {
      const used = new Set(db.memorials.map((m) => m.slot));
      let slot = Number.isInteger(data.slot) && data.slot >= 0 && !used.has(data.slot) ? data.slot : 0;
      while (used.has(slot)) slot++;
      const m = {
        id: Math.random().toString(36).slice(2, 10), slot, name: data.name.trim().slice(0, 30), species: data.species,
        message: (data.message || '').slice(0, 200), birthday: data.birthday || null, passedDay: data.passedDay || null,
        photo: data.photo || null, look: cleanLook(data.look), hue: Math.floor(Math.random() * 360), candles: 1, flowers: 0, gifts: 0, lastGifts: [],
        glow: Math.max(0, Math.min(60, Number(data.pendingGlow) || 0)), createdAt: Date.now(),
      };
      db.memorials.push(m);
      ev('created', m, data.visitor);
      persist();
      setToken(m.id, `local-${m.id}`);
      return pub(m);
    },
    async remove(id) {
      db.memorials = db.memorials.filter((m) => m.id !== id);
      delete db.guestbook[id];
      persist();
      setToken(id, null);
    },
    async get(id) {
      const m = find(id);
      if (!m) throw new Error('No encontramos esa huellita.');
      const dh = db.dh || {};
      const diary = ((db.diary || {})[id] || []).slice().reverse().map((p) => ({ ...p, hearts: dh[`${id}:${p.id}`] || 0 }));
      return { ...pub(m), guestbook: (db.guestbook[id] || []).slice().reverse(), giftList: (db.gifts[id] || []).slice().reverse(), diary };
    },
    async candle(id, who) {
      if (!onceToday('c', id)) { persist(); return { memorial: pub(find(id)), already: true }; }
      const first = (find(id).candles || 0) === 0;
      bump(id, 'candles');
      const glow = grant(id, 'candle', who, first ? GLOW.firstLight : 0);
      db.night[day()] = (db.night[day()] || 0) + 1;
      const m = find(id);
      ev('candle', m, who.visitor);
      persist();
      return { memorial: pub(m), glow, firstLight: first };
    },
    async flower(id, who) {
      if (!onceToday('f', id)) { persist(); return { memorial: pub(find(id)), already: true }; }
      bump(id, 'flowers');
      const glow = grant(id, 'flower', who);
      const m = find(id);
      ev('flower', m, who.visitor);
      persist();
      return { memorial: pub(m), glow };
    },
    async gift(id, who, gift) {
      if (!onceToday('g', id)) { persist(); return { memorial: pub(find(id)), already: true }; }
      bump(id, 'gifts');
      (db.gifts[id] ||= []).push({ gift, who: who.visitor, at: Date.now() });
      const own = db.memorials.find((m) => m.id === id);
      const holder = own || db.counters[id];
      holder.lastGifts = [gift.split(" ")[0], ...(holder.lastGifts || [])].slice(0, 3);
      holder.giftCounts = { ...(holder.giftCounts || {}), [gift.split(" ")[0]]: ((holder.giftCounts || {})[gift.split(" ")[0]] || 0) + 1 };
      const glow = grant(id, 'gift', who);
      const m = find(id);
      ev('gift', m, who.visitor, { gift });
      persist();
      return { memorial: pub(m), glow };
    },
    async hug(id, who) {
      if (!onceToday('h', id)) { persist(); return { memorial: pub(find(id)), already: true }; }
      const glow = grant(id, 'hug', who);
      const m = find(id);
      ev('hug', m, who.visitor);
      persist();
      return { memorial: pub(m), glow };
    },
    async sign(id, entry) {
      const m = find(id);
      const e = { id: Math.random().toString(36).slice(2), name: entry.name || entry.visitor, text: entry.text.slice(0, 280), at: Date.now() };
      (db.guestbook[id] ||= []).push(e);
      const glow = onceToday('w', id) ? grant(id, 'words', entry) : { gained: 0, to: null };
      ev('guestbook', m, e.name);
      persist();
      return { entry: e, glow };
    },
    async night() { return { candles: db.night[day()] || 0, countries: 1 }; },
    async comfort() { db.comfort ||= []; return { notes: db.comfort.slice().reverse().slice(0, 60), count: db.comfort.length }; },
    async comfortAdd(text, visitor) {
      db.comfort ||= [];
      const e = { text: text.slice(0, 220), who: visitor, at: Date.now() };
      db.comfort.push(e);
      persist();
      return { entry: e, count: db.comfort.length };
    },
    async eternal(id, who) {
      const m = find(id);
      if (m.eternal) return { memorial: pub(m), already: true };
      const holder = db.memorials.find((x) => x.id === id) || (db.counters[id] ||= { candles: 0, flowers: 0, gifts: 0, lastGifts: [] });
      holder.eternal = { by: who.visitor, at: Date.now() };
      ev('eternal', m, who.visitor);
      persist();
      return { memorial: pub(find(id)) };
    },
    async toAltar(id, who) {
      db.altar ||= {};
      const k = day();
      if (db.altar.done === k) return { memorial: pub(find(id)), already: true };
      db.altar.done = k;
      (db.altar[k] ||= []).includes(id) || db.altar[k].push(id);
      ev('altar', find(id), who.visitor);
      persist();
      return { memorial: pub(find(id)) };
    },
    async altar() { return { ids: (db.altar || {})[day()] || [] }; },
    async heartDiary(id, pid) {
      db.dh ||= {};
      const k = `${id}:${pid}:${day()}`;
      if (db.done[k]) return { already: true };
      db.done[k] = 1;
      db.dh[`${id}:${pid}`] = (db.dh[`${id}:${pid}`] || 0) + 1;
      persist();
      return { hearts: db.dh[`${id}:${pid}`] };
    },
    async ref() { return { n: 0 }; },
    async own(id, what, body) {
      if (what === 'og') return null; // en modo demo no hay vista previa que armar
      const m = db.memorials.find((x) => x.id === id);
      if (!m) throw new Error('Sólo la familia de esta huellita puede hacer esto.');
      if (what === 'edit') {
        for (const k of ['name', 'message', 'birthday', 'passedDay', 'bg']) if (body[k] !== undefined) m[k] = body[k];
        if (body.look !== undefined) m.look = cleanLook(body.look);
        if (body.photo) m.photo = body.photo;
      }
      if (what === 'photos') {
        m.extraPhotos ||= [];
        if (m.extraPhotos.length >= 3) throw new Error('Ya tiene 4 fotos.');
        m.extraPhotos.push(body.photo);
      }
      if (what === 'voice') m.voice = body.audio || null;
      if (what === 'diary') {
        db.diary ||= {};
        const e = { id: Math.random().toString(36).slice(2, 10), text: body.text, prompt: body.prompt || null, at: Date.now() };
        (db.diary[id] ||= []).push(e);
        m.diaryCount = db.diary[id].length;
        persist();
        return e;
      }
      if (what === 'gathering') m.gathering = body.at || null;
      try { persist(); } catch { throw new Error('No hay más lugar en este navegador para guardar eso.'); }
      return pub(m);
    },
    async jar() { return { notes: db.jar.slice().reverse().slice(0, 60), count: db.jar.length }; },
    async jarAdd(text, visitor) {
      const e = { text: text.slice(0, 140), who: visitor, at: Date.now() };
      db.jar.push(e);
      persist();
      return { entry: e, count: db.jar.length };
    },
    async heartbeat(info = {}) {
      const since = Number.isInteger(info.since) ? info.since : null;
      return since === null ? { here: 1, others: [] } : { here: 1, others: [], events: db.events.filter((e) => e.seq > since), seq: db.seq };
    },
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
