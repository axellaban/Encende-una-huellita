// Almacenamiento simple en un archivo JSON con escritura atómica.
// Suficiente para un jardín de miles de huellitas; para más escala, cambiar por SQLite/Postgres.
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { SEED_MEMORIALS } from './seed.js';

export const SLOTS_PER_FLOOR = 90;

const MAX_EVENTS = 300;

export function createStore(dataDir) {
  mkdirSync(join(dataDir, 'uploads'), { recursive: true });
  const dbPath = join(dataDir, 'db.json');
  let db;
  if (existsSync(dbPath)) {
    db = JSON.parse(readFileSync(dbPath, 'utf8'));
  } else {
    db = { memorials: [], guestbook: {}, events: [], seq: 0 };
    const now = Date.now();
    SEED_MEMORIALS.forEach((m, i) => {
      db.memorials.push({
        id: newId(),
        slot: m.slot ?? i * 7 + 3,
        name: m.name,
        species: m.species,
        message: m.message,
        birthday: m.birthday ?? null,
        passedDay: m.passedDay ?? null,
        photo: null,
        hue: m.hue,
        candles: m.candles,
        flowers: m.flowers,
        demo: true,
        createdAt: now - (SEED_MEMORIALS.length - i) * 86400000,
        tokenHash: null,
      });
    });
  }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 150);
  }
  function flush() {
    const tmp = dbPath + '.tmp';
    writeFileSync(tmp, JSON.stringify(db));
    renameSync(tmp, dbPath);
  }
  flush();

  function publicMemorial(m) {
    const { tokenHash, ...rest } = m;
    return { ...rest, guestbookCount: (db.guestbook[m.id] || []).length };
  }

  function pushEvent(type, memorial, visitor) {
    db.seq += 1;
    db.events.push({ seq: db.seq, type, memorialId: memorial.id, petName: memorial.name, visitor: visitor || 'Alguien', at: Date.now() });
    if (db.events.length > MAX_EVENTS) db.events.splice(0, db.events.length - MAX_EVENTS);
  }

  function find(id) {
    return db.memorials.find((m) => m.id === id) || null;
  }

  return {
    uploadsDir: join(dataDir, 'uploads'),
    flush,
    close() {
      clearTimeout(saveTimer);
      flush();
    },
    list() {
      return db.memorials.map(publicMemorial);
    },
    get(id) {
      const m = find(id);
      if (!m) return null;
      return { ...publicMemorial(m), guestbook: (db.guestbook[m.id] || []).slice(-100).reverse() };
    },
    freeSlot(preferred) {
      const used = new Set(db.memorials.map((m) => m.slot));
      if (Number.isInteger(preferred) && preferred >= 0 && preferred < SLOTS_PER_FLOOR * 50 && !used.has(preferred)) return preferred;
      for (let s = 0; ; s++) if (!used.has(s)) return s;
    },
    create(input, visitor) {
      const token = randomBytes(18).toString('base64url');
      const m = {
        id: newId(),
        slot: this.freeSlot(input.slot),
        name: input.name,
        species: input.species,
        message: input.message,
        birthday: input.birthday,
        passedDay: input.passedDay,
        photo: input.photo,
        hue: Math.floor(Math.random() * 360),
        candles: 1,
        flowers: 0,
        demo: false,
        createdAt: Date.now(),
        tokenHash: hashToken(token),
      };
      db.memorials.push(m);
      pushEvent('created', m, visitor);
      save();
      return { memorial: publicMemorial(m), editToken: token };
    },
    remove(id, token) {
      const m = find(id);
      if (!m) return 'not_found';
      if (!m.tokenHash || m.tokenHash !== hashToken(token || '')) return 'forbidden';
      db.memorials = db.memorials.filter((x) => x.id !== id);
      delete db.guestbook[id];
      db.events = db.events.filter((e) => e.memorialId !== id);
      save();
      return m;
    },
    candle(id, visitor) {
      const m = find(id);
      if (!m) return null;
      m.candles += 1;
      pushEvent('candle', m, visitor);
      save();
      return publicMemorial(m);
    },
    flower(id, visitor) {
      const m = find(id);
      if (!m) return null;
      m.flowers += 1;
      pushEvent('flower', m, visitor);
      save();
      return publicMemorial(m);
    },
    sign(id, entry) {
      const m = find(id);
      if (!m) return null;
      const list = (db.guestbook[id] ||= []);
      const e = { id: newId(), name: entry.name, text: entry.text, at: Date.now() };
      list.push(e);
      if (list.length > 500) list.shift();
      pushEvent('guestbook', m, entry.name);
      save();
      return e;
    },
    events(since) {
      return db.events.filter((e) => e.seq > since).slice(-20);
    },
    lastSeq() {
      return db.seq;
    },
    stats() {
      return {
        memorials: db.memorials.length,
        candles: db.memorials.reduce((a, m) => a + m.candles, 0),
        flowers: db.memorials.reduce((a, m) => a + m.flowers, 0),
      };
    },
  };
}

function newId() {
  return randomBytes(6).toString('base64url');
}

function hashToken(t) {
  return createHash('sha256').update(t).digest('hex');
}
