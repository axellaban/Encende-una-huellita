// Datos de las huellitas sobre una base tipo Redis (Upstash en producción, emulador en local).
//
// Claves (prefijo hu:):
//   ids            ZSET  id -> createdAt
//   m:<id>         HASH  data (JSON), candles, flowers, gb, tokenHash
//   slots          HASH  slot -> id (HSETNX evita que dos personas tomen el mismo lugar)
//   photo:<id>     STR   JSON { t: mime, d: base64 }
//   gb:<id>        LIST  firmas del libro de visitas (JSON, la más nueva primero)
//   ev / seq       LIST / INT  actividad reciente
//   now            ZSET  sid -> último latido (presencia)
//   cd:<sid>:<id>  STR   vela reciente (evita repetir en 10 min)
//   rl:<k>:<min>   INT   límite de envíos por minuto
import { randomBytes, createHash } from 'node:crypto';
import { FEATURED, FEATURED_IDS } from './seed.js';

const P = 'hu:';
export const SLOTS_PER_FLOOR = 90;
const MAX_SLOT = SLOTS_PER_FLOOR * 200;
const PRESENCE_MS = 60_000;

const newId = () => randomBytes(6).toString('base64url');
const hashToken = (t) => createHash('sha256').update(String(t)).digest('hex');

function fromHash(arr) {
  const o = {};
  for (let i = 0; i < arr.length; i += 2) o[arr[i]] = arr[i + 1];
  return o;
}

export function createStore(kv) {
  const featuredById = new Map(FEATURED.map((f) => [f.id, f]));

  function toPublic(h, id) {
    if (!h || !h.data) return null;
    const d = JSON.parse(h.data);
    const f = featuredById.get(id);
    return {
      ...d,
      ...(f || {}),
      id,
      photo: f ? f.photo : d.hasPhoto ? `/api/photos/${id}` : null,
      candles: Number(h.candles) || 0,
      flowers: Number(h.flowers) || 0,
      guestbookCount: Number(h.gb) || 0,
    };
  }

  let featuredReady = false;
  async function ensureFeatured() {
    if (featuredReady) return;
    const cmds = [];
    for (const f of FEATURED) {
      cmds.push(['HSETNX', `${P}m:${f.id}`, 'data', JSON.stringify({ slot: f.slot, createdAt: 0, featured: true })]);
      cmds.push(['ZADD', `${P}ids`, '0', f.id]);
    }
    if (cmds.length) await kv.pipeline(cmds);
    featuredReady = true;
  }

  async function event(type, m, visitor) {
    const seq = await kv.cmd('INCR', `${P}seq`);
    const ev = { seq, type, memorialId: m.id, petName: m.name, visitor: visitor || 'Alguien', at: Date.now() };
    await kv.pipeline([['LPUSH', `${P}ev`, JSON.stringify(ev)], ['LTRIM', `${P}ev`, '0', '199']]);
  }

  async function getRaw(id) {
    return fromHash(await kv.cmd('HGETALL', `${P}m:${id}`));
  }

  const store = {
    kind: kv.kind,

    async list() {
      await ensureFeatured();
      const ids = await kv.cmd('ZRANGE', `${P}ids`, '0', '-1');
      const rows = await kv.pipeline(ids.map((id) => ['HGETALL', `${P}m:${id}`]));
      return rows.map((r, i) => toPublic(fromHash(r), ids[i])).filter(Boolean);
    },

    async get(id) {
      await ensureFeatured();
      const m = toPublic(await getRaw(id), id);
      if (!m) return null;
      const gb = await kv.cmd('LRANGE', `${P}gb:${id}`, '0', '99');
      return { ...m, guestbook: gb.map((x) => JSON.parse(x)) };
    },

    async create(input, photo, visitor) {
      const id = newId();
      const token = randomBytes(18).toString('base64url');
      // Reservar un lugar libre de forma atómica.
      let slot = null;
      if (Number.isInteger(input.slot) && input.slot >= 0 && input.slot < MAX_SLOT) {
        if (await kv.cmd('HSETNX', `${P}slots`, String(input.slot), id)) slot = input.slot;
      }
      for (let tries = 0; slot === null && tries < 6; tries++) {
        const used = new Set(Object.keys(fromHash(await kv.cmd('HGETALL', `${P}slots`))).map(Number));
        let s = 0;
        while (used.has(s)) s++;
        if (await kv.cmd('HSETNX', `${P}slots`, String(s), id)) slot = s;
      }
      if (slot === null) throw Object.assign(new Error('El muro está muy concurrido. Probá de nuevo.'), { status: 409 });

      const data = {
        slot,
        name: input.name,
        species: input.species,
        message: input.message,
        birthday: input.birthday,
        passedDay: input.passedDay,
        hue: Math.floor(Math.random() * 360),
        hasPhoto: !!photo,
        createdAt: Date.now(),
      };
      const cmds = [
        ['HSET', `${P}m:${id}`, 'data', JSON.stringify(data), 'candles', '1', 'flowers', '0', 'gb', '0', 'tokenHash', hashToken(token)],
        ['ZADD', `${P}ids`, String(data.createdAt), id],
      ];
      if (photo) cmds.push(['SET', `${P}photo:${id}`, JSON.stringify({ t: photo.type, d: photo.bytes.toString('base64') })]);
      await kv.pipeline(cmds);
      const memorial = toPublic(await getRaw(id), id);
      await event('created', memorial, visitor);
      return { memorial, editToken: token };
    },

    async remove(id, token) {
      if (FEATURED_IDS.has(id)) return 'forbidden';
      const h = await getRaw(id);
      if (!h.data) return 'not_found';
      if (!h.tokenHash || h.tokenHash !== hashToken(token || '')) return 'forbidden';
      const { slot } = JSON.parse(h.data);
      await kv.pipeline([
        ['DEL', `${P}m:${id}`, `${P}photo:${id}`, `${P}gb:${id}`],
        ['ZREM', `${P}ids`, id],
        ['HDEL', `${P}slots`, String(slot)],
      ]);
      return 'ok';
    },

    async candle(id, sid, visitor) {
      await ensureFeatured();
      const h = await getRaw(id);
      if (!h.data) return null;
      const fresh = await kv.cmd('SET', `${P}cd:${sid || 'anon'}:${id}`, '1', 'NX', 'EX', '600');
      if (fresh !== 'OK') return { memorial: toPublic(h, id), already: true };
      await kv.cmd('HINCRBY', `${P}m:${id}`, 'candles', '1');
      const memorial = toPublic(await getRaw(id), id);
      await event('candle', memorial, visitor);
      return { memorial };
    },

    async flower(id, visitor) {
      await ensureFeatured();
      const h = await getRaw(id);
      if (!h.data) return null;
      await kv.cmd('HINCRBY', `${P}m:${id}`, 'flowers', '1');
      const memorial = toPublic(await getRaw(id), id);
      await event('flower', memorial, visitor);
      return { memorial };
    },

    async sign(id, entry) {
      await ensureFeatured();
      const h = await getRaw(id);
      if (!h.data) return null;
      const e = { id: newId(), name: entry.name, text: entry.text, at: Date.now() };
      await kv.pipeline([
        ['LPUSH', `${P}gb:${id}`, JSON.stringify(e)],
        ['LTRIM', `${P}gb:${id}`, '0', '499'],
        ['HINCRBY', `${P}m:${id}`, 'gb', '1'],
      ]);
      await event('guestbook', toPublic(h, id), entry.name);
      return e;
    },

    async photo(id) {
      const raw = await kv.cmd('GET', `${P}photo:${id}`);
      if (!raw) return null;
      const { t, d } = JSON.parse(raw);
      return { type: t, bytes: Buffer.from(d, 'base64') };
    },

    async events(since) {
      const [list, seq] = await kv.pipeline([['LRANGE', `${P}ev`, '0', '19'], ['GET', `${P}seq`]]);
      return { events: list.map((x) => JSON.parse(x)).filter((e) => e.seq > since).reverse(), seq: Number(seq) || 0 };
    },

    async touch(sid) {
      const now = Date.now();
      const cmds = [['ZREMRANGEBYSCORE', `${P}now`, '-inf', String(now - PRESENCE_MS)]];
      if (sid) cmds.push(['ZADD', `${P}now`, String(now), sid]);
      cmds.push(['ZCARD', `${P}now`]);
      const r = await kv.pipeline(cmds);
      return r[r.length - 1];
    },

    async here() {
      return store.touch(null);
    },

    // true si se pasó del límite de `max` envíos por minuto para esa clave.
    async limited(key, max) {
      const k = `${P}rl:${key}:${Math.floor(Date.now() / 60_000)}`;
      const [n] = await kv.pipeline([['INCR', k], ['EXPIRE', k, '70']]);
      return n > max;
    },
  };
  return store;
}
