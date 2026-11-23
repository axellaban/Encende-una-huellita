// Datos de las huellitas sobre una base tipo Redis (Upstash en producción, emulador en local).
//
// Claves (prefijo hu:):
//   ids              ZSET  id -> createdAt
//   m:<id>           HASH  data (JSON), candles, flowers, gb, gifts, glow, tokenHash
//   slots            HASH  slot -> id (HSETNX evita que dos personas tomen el mismo lugar)
//   photo:<id>       STR   JSON { t: mime, d: base64 }
//   gb:<id>          LIST  libro de visitas (JSON, lo más nuevo primero)
//   gf:<id>          LIST  regalitos (JSON)
//   ev / seq         LIST / INT  actividad reciente
//   now              ZSET  sid -> último latido;  p:<sid> STR posición y gesto (expira solo)
//   d:<acc>:<sid>:<id>:<día>  STR  gesto ya hecho hoy (una vela, una flor, un regalo... por día)
//   night:<día> / nco:<día>   INT / SET  velas y países de la noche
//   jar / jarn       LIST / INT  frasco de gracias
//   rl:<k>:<min>     INT   límite de envíos por minuto
import { randomBytes, createHash } from 'node:crypto';
import { FEATURED, FEATURED_IDS } from './seed.js';
import { GLOW, GIFT_SET, SAYINGS, EMOTES } from './glow.js';
import { BACKGROUND_IDS } from './plans.js';

const P = 'hu:';
export const SLOTS_PER_FLOOR = 90;
const MAX_SLOT = SLOTS_PER_FLOOR * 200;
const PRESENCE_MS = 25_000;
const MAX_PRESENT = 150;
const DAY_TTL = 30 * 3600;

const newId = () => randomBytes(6).toString('base64url');
const hashToken = (t) => createHash('sha256').update(String(t)).digest('hex');
const today = () => new Date().toISOString().slice(0, 10);

function fromHash(arr) {
  const o = {};
  for (let i = 0; i < arr.length; i += 2) o[arr[i]] = arr[i + 1];
  return o;
}

// Separa la presencia en los que siguen acá y los que ya se fueron (sin latido hace más de PRESENCE_MS).
function splitPresence(flat, now) {
  const fresh = [];
  const stale = [];
  for (let i = 0; i < flat.length; i += 2) {
    let o = null;
    try { o = JSON.parse(flat[i + 1]); } catch { o = null; }
    if (o && o.at && now - o.at <= PRESENCE_MS) fresh.push([flat[i], o]);
    else stale.push(flat[i]);
  }
  return { fresh, stale };
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
      photo: f ? f.photo : d.hasPhoto ? `/api/photos/${id}${d.photoV ? `?v=${d.photoV}` : ''}` : null,
      candles: Number(h.candles) || 0,
      flowers: Number(h.flowers) || 0,
      gifts: Number(h.gifts) || 0,
      glow: Number(h.glow) || 0,
      guestbookCount: Number(h.gb) || 0,
      lastGifts: h.lastGifts ? JSON.parse(h.lastGifts) : [],
      extraPhotos: f?.extraPhotos || Array.from({ length: Number(h.xp) || 0 }, (_, i) => `/api/photos/${id}/${i + 1}`),
      voice: h.voice ? `/api/voices/${id}?v=${h.voice}` : null,
      eternal: h.eternal ? JSON.parse(h.eternal) : null,
      bg: h.bg || 'crema',
      gathering: Number(h.gathering) > Date.now() - 3 * 3600_000 ? Number(h.gathering) : null,
      diaryCount: Number(h.dc) || 0,
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

  async function event(type, m, visitor, extra = {}) {
    const seq = await kv.cmd('INCR', `${P}seq`);
    const ev = { seq, type, memorialId: m.id, petName: m.name, visitor: visitor || 'Alguien', at: Date.now(), c: m.candles, f: m.flowers, ...extra };
    await kv.pipeline([['LPUSH', `${P}ev`, JSON.stringify(ev)], ['LTRIM', `${P}ev`, '0', '199']]);
  }

  const getRaw = async (id) => fromHash(await kv.cmd('HGETALL', `${P}m:${id}`));

  // true la primera vez del día; false si ya lo hizo hoy.
  async function onceToday(action, sid, id) {
    const r = await kv.cmd('SET', `${P}d:${action}:${sid || 'anon'}:${id}:${today()}`, '1', 'NX', 'EX', String(DAY_TTL));
    return r === 'OK';
  }

  // Suma Glow a la mascota de quien hace el gesto (si demuestra que es suya con su token).
  async function grantGlow(targetId, kind, who, bonus = 0) {
    const toId = who.glowTo;
    if (!toId || !who.glowToken) return { gained: 0, to: null };
    const h = toId === targetId ? null : await getRaw(toId);
    const own = toId === targetId;
    const ownerHash = own ? (await getRaw(targetId)).tokenHash : h?.tokenHash;
    if (!ownerHash || ownerHash !== hashToken(who.glowToken)) return { gained: 0, to: null };
    if (own && kind !== 'candle') return { gained: 0, to: null }; // a la propia sólo cuenta la vela del día
    const gained = own ? GLOW.ownCandle : GLOW[kind] + bonus;
    const total = await kv.cmd('HINCRBY', `${P}m:${toId}`, 'glow', String(gained));
    return { gained, total, to: toId };
  }

  async function country(code) {
    return /^[A-Z]{2}$/.test(code || '') ? code : null;
  }

  async function owner(id, token) {
    const h = await getRaw(id);
    if (!h.data) return { error: 'not_found' };
    if (!token || !h.tokenHash || h.tokenHash !== hashToken(token)) return { error: 'forbidden' };
    return { h };
  }

  const store = {
    kind: kv.kind,
    owner,

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
      const [gb, gf, dy, dh] = await kv.pipeline([
        ['LRANGE', `${P}gb:${id}`, '0', '99'], ['LRANGE', `${P}gf:${id}`, '0', '29'],
        ['LRANGE', `${P}dy:${id}`, '0', '49'], ['HGETALL', `${P}dh:${id}`],
      ]);
      const hearts = fromHash(dh);
      return {
        ...m,
        guestbook: gb.map((x) => JSON.parse(x)),
        giftList: gf.map((x) => JSON.parse(x)),
        diary: dy.map((x) => { const p = JSON.parse(x); return { ...p, hearts: Number(hearts[p.id]) || 0 }; }),
      };
    },

    async create(input, photo, visitor, pendingGlow = 0) {
      const id = newId();
      const token = randomBytes(18).toString('base64url');
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
        look: input.look || null,
        hue: Math.floor(Math.random() * 360),
        hasPhoto: !!photo,
        createdAt: Date.now(),
      };
      // El Glow que la persona juntó antes de sumar a su mascota la estaba esperando (con tope).
      const glow = Math.max(0, Math.min(60, Number(pendingGlow) || 0));
      const cmds = [
        ['HSET', `${P}m:${id}`, 'data', JSON.stringify(data), 'candles', '1', 'flowers', '0', 'gb', '0', 'gifts', '0', 'glow', String(glow), 'tokenHash', hashToken(token)],
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
        ['DEL', `${P}m:${id}`, `${P}photo:${id}`, `${P}gb:${id}`, `${P}gf:${id}`, `${P}dy:${id}`, `${P}dh:${id}`, `${P}voice:${id}`, `${P}photo:${id}:1`, `${P}photo:${id}:2`, `${P}photo:${id}:3`],
        ['ZREM', `${P}ids`, id],
        ['HDEL', `${P}slots`, String(slot)],
      ]);
      return 'ok';
    },

    async candle(id, who) {
      await ensureFeatured();
      const h = await getRaw(id);
      if (!h.data) return null;
      if (!(await onceToday('c', who.sid, id))) return { memorial: toPublic(h, id), already: true };
      const first = (Number(h.candles) || 0) === 0;
      await kv.cmd('HINCRBY', `${P}m:${id}`, 'candles', '1');
      const glow = await grantGlow(id, 'candle', who, first ? GLOW.firstLight : 0);
      const code = await country(who.country);
      const day = today();
      const night = [['INCR', `${P}night:${day}`], ['EXPIRE', `${P}night:${day}`, String(DAY_TTL * 2)]];
      if (code) night.push(['SADD', `${P}nco:${day}`, code], ['EXPIRE', `${P}nco:${day}`, String(DAY_TTL * 2)]);
      await kv.pipeline(night);
      const memorial = toPublic(await getRaw(id), id);
      await event('candle', memorial, who.visitor, code ? { country: code } : {});
      return { memorial, glow, firstLight: first };
    },

    async flower(id, who) {
      await ensureFeatured();
      const h = await getRaw(id);
      if (!h.data) return null;
      if (!(await onceToday('f', who.sid, id))) return { memorial: toPublic(h, id), already: true };
      await kv.cmd('HINCRBY', `${P}m:${id}`, 'flowers', '1');
      const glow = await grantGlow(id, 'flower', who);
      const memorial = toPublic(await getRaw(id), id);
      await event('flower', memorial, who.visitor);
      return { memorial, glow };
    },

    async gift(id, who, gift) {
      await ensureFeatured();
      if (!GIFT_SET.has(gift)) throw Object.assign(new Error('Ese regalito no existe.'), { status: 400 });
      const h = await getRaw(id);
      if (!h.data) return null;
      if (!(await onceToday('g', who.sid, id))) return { memorial: toPublic(h, id), already: true };
      const entry = { gift, who: who.visitor || 'Alguien', at: Date.now() };
      const last = [gift.split(' ')[0], ...(h.lastGifts ? JSON.parse(h.lastGifts) : [])].slice(0, 3);
      await kv.pipeline([
        ['LPUSH', `${P}gf:${id}`, JSON.stringify(entry)],
        ['LTRIM', `${P}gf:${id}`, '0', '49'],
        ['HINCRBY', `${P}m:${id}`, 'gifts', '1'],
        ['HSET', `${P}m:${id}`, 'lastGifts', JSON.stringify(last)],
      ]);
      const glow = await grantGlow(id, 'gift', who);
      const memorial = toPublic(await getRaw(id), id);
      await event('gift', memorial, who.visitor, { gift });
      return { memorial, glow };
    },

    async hug(id, who) {
      await ensureFeatured();
      const h = await getRaw(id);
      if (!h.data) return null;
      if (!(await onceToday('h', who.sid, id))) return { memorial: toPublic(h, id), already: true };
      const glow = await grantGlow(id, 'hug', who);
      const memorial = toPublic(h, id);
      await event('hug', memorial, who.visitor);
      return { memorial, glow };
    },

    async sign(id, entry, who) {
      await ensureFeatured();
      const h = await getRaw(id);
      if (!h.data) return null;
      const e = { id: newId(), name: entry.name, text: entry.text, at: Date.now() };
      await kv.pipeline([
        ['LPUSH', `${P}gb:${id}`, JSON.stringify(e)],
        ['LTRIM', `${P}gb:${id}`, '0', '499'],
        ['HINCRBY', `${P}m:${id}`, 'gb', '1'],
      ]);
      const glow = (await onceToday('w', who.sid, id)) ? await grantGlow(id, 'words', who) : { gained: 0, to: null };
      await event('guestbook', toPublic(h, id), entry.name);
      return { entry: e, glow };
    },

    // ---------- dueños: editar, más fotos, voz, diario, encuentro, fondo ----------
    async edit(id, token, patch, photo) {
      const o = await owner(id, token);
      if (o.error) return o.error;
      const data = JSON.parse(o.h.data);
      for (const k of ['name', 'message', 'birthday', 'passedDay', 'species', 'look']) if (patch[k] !== undefined) data[k] = patch[k];
      const cmds = [];
      if (photo) {
        data.hasPhoto = true;
        data.photoV = (data.photoV || 0) + 1;
        cmds.push(['SET', `${P}photo:${id}`, JSON.stringify({ t: photo.type, d: photo.bytes.toString('base64') })]);
      }
      cmds.push(['HSET', `${P}m:${id}`, 'data', JSON.stringify(data)]);
      if (patch.bg && BACKGROUND_IDS.has(patch.bg)) cmds.push(['HSET', `${P}m:${id}`, 'bg', patch.bg]);
      await kv.pipeline(cmds);
      return toPublic(await getRaw(id), id);
    },

    async addPhoto(id, token, photo) {
      const o = await owner(id, token);
      if (o.error) return o.error;
      const n = Number(o.h.xp) || 0;
      if (n >= 3) return 'full';
      await kv.pipeline([['SET', `${P}photo:${id}:${n + 1}`, JSON.stringify({ t: photo.type, d: photo.bytes.toString('base64') })], ['HSET', `${P}m:${id}`, 'xp', String(n + 1)]]);
      return toPublic(await getRaw(id), id);
    },

    async extraPhoto(id, n) {
      const raw = await kv.cmd('GET', `${P}photo:${id}:${n}`);
      if (!raw) return null;
      const { t, d } = JSON.parse(raw);
      return { type: t, bytes: Buffer.from(d, 'base64') };
    },

    async setVoice(id, token, audio) {
      const o = await owner(id, token);
      if (o.error) return o.error;
      if (!audio) {
        await kv.pipeline([['DEL', `${P}voice:${id}`], ['HDEL', `${P}m:${id}`, 'voice']]);
      } else {
        await kv.pipeline([['SET', `${P}voice:${id}`, JSON.stringify({ t: audio.type, d: audio.bytes.toString('base64') })], ['HSET', `${P}m:${id}`, 'voice', String(Date.now())]]);
      }
      return toPublic(await getRaw(id), id);
    },

    async voice(id) {
      const raw = await kv.cmd('GET', `${P}voice:${id}`);
      if (!raw) return null;
      const { t, d } = JSON.parse(raw);
      return { type: t, bytes: Buffer.from(d, 'base64') };
    },

    async addDiary(id, token, page) {
      const o = await owner(id, token);
      if (o.error) return o.error;
      const e = { id: newId(), text: page.text, prompt: page.prompt || null, at: Date.now() };
      await kv.pipeline([['LPUSH', `${P}dy:${id}`, JSON.stringify(e)], ['LTRIM', `${P}dy:${id}`, '0', '199'], ['HINCRBY', `${P}m:${id}`, 'dc', '1']]);
      await event('diary', toPublic(o.h, id), 'La familia');
      return e;
    },

    async heartDiary(id, pageId, sid) {
      if (!(await onceToday('dh', sid, `${id}:${pageId}`))) return { already: true };
      const n = await kv.cmd('HINCRBY', `${P}dh:${id}`, pageId, '1');
      return { hearts: n };
    },

    async setGathering(id, token, at) {
      const o = await owner(id, token);
      if (o.error) return o.error;
      if (at) await kv.cmd('HSET', `${P}m:${id}`, 'gathering', String(at));
      else await kv.cmd('HDEL', `${P}m:${id}`, 'gathering');
      return toPublic(await getRaw(id), id);
    },

    // Luz eterna: cualquiera puede encenderla (como un regalo) y queda para siempre.
    async eternal(id, who) {
      await ensureFeatured();
      const h = await getRaw(id);
      if (!h.data) return null;
      if (h.eternal) return { memorial: toPublic(h, id), already: true };
      await kv.cmd('HSET', `${P}m:${id}`, 'eternal', JSON.stringify({ by: who.visitor || 'Alguien', at: Date.now() }));
      const memorial = toPublic(await getRaw(id), id);
      await event('eternal', memorial, who.visitor);
      return { memorial };
    },

    // La ofrenda central: las huellitas que alguien puso hoy pasan una por una.
    async toAltar(id, who) {
      await ensureFeatured();
      const h = await getRaw(id);
      if (!h.data) return null;
      if (!(await onceToday('al', who.sid, 'any'))) return { memorial: toPublic(h, id), already: true };
      const k = `${P}altar:${today()}`;
      await kv.pipeline([['ZADD', k, String(Date.now()), id], ['EXPIRE', k, String(DAY_TTL * 2)]]);
      const memorial = toPublic(h, id);
      await event('altar', memorial, who.visitor);
      return { memorial };
    },

    async altar() {
      return kv.cmd('ZRANGE', `${P}altar:${today()}`, '0', '-1');
    },

    // Tableros de notas: frasco de gracias ("jar") y palabras de consuelo ("comfort").
    async boardAdd(name, text, who) {
      const e = { text, who: who || 'Alguien', at: Date.now() };
      const [, , n] = await kv.pipeline([['LPUSH', `${P}${name}`, JSON.stringify(e)], ['LTRIM', `${P}${name}`, '0', '299'], ['INCR', `${P}${name}n`]]);
      return { entry: e, count: n };
    },

    async board(name) {
      const [list, n] = await kv.pipeline([['LRANGE', `${P}${name}`, '0', '59'], ['GET', `${P}${name}n`]]);
      return { notes: list.map((x) => JSON.parse(x)), count: Number(n) || 0 };
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

    // Latido: guarda dónde está cada visitante y devuelve a los demás para dibujarlos en el jardín.
    // Si viene `since`, también devuelve lo que pasó desde entonces (así hay un solo pedido periódico).
    // Toda la presencia vive en un solo HASH (sid -> JSON con `at`): 3 comandos por latido.
    async touch(sid, info = {}, since = null) {
      const now = Date.now();
      const cmds = [];
      if (sid) {
        const say = SAYINGS.includes(info.say) ? info.say : null;
        const emote = EMOTES.includes(info.emote) ? info.emote : null;
        const pos = {
          name: info.name || 'Alguien',
          x: Number.isFinite(info.x) ? Math.round(info.x * 100) / 100 : 0,
          z: Number.isFinite(info.z) ? Math.round(info.z * 100) / 100 : 24,
          ry: Number.isFinite(info.ry) ? Math.round(info.ry * 100) / 100 : 0,
          hue: Number.isFinite(info.hue) ? Math.round(info.hue) % 360 : 30,
          say,
          emote,
          gestureAt: say || emote ? now : 0,
          country: info.country || null,
          pet: info.pet || null,
          at: now,
        };
        cmds.push(['HSET', `${P}pres`, sid, JSON.stringify(pos)]);
      }
      cmds.push(['HGETALL', `${P}pres`]);
      const withEvents = Number.isInteger(since) && since >= 0;
      if (withEvents) cmds.push(['GET', `${P}seq`]);
      const r = await kv.pipeline(cmds);
      const { fresh, stale } = splitPresence(r[sid ? 1 : 0], now);
      const others = [];
      for (const [k, o] of fresh) {
        if (k === sid || others.length >= 40) continue;
        const { at, ...rest } = o;
        void at;
        others.push({ sid: k.slice(0, 8), ...rest });
      }
      const out = { here: fresh.filter(([k]) => k !== sid).length + (sid ? 1 : 0), others };
      // Limpieza de quienes se fueron y, sólo si hay novedades, los eventos.
      const more = [];
      if (stale.length) more.push(['HDEL', `${P}pres`, ...stale]);
      // Tope de presencia: si alguien inunda con sids inventados, los nuevos no se guardan.
      if (sid && fresh.length > MAX_PRESENT && !fresh.slice(0, MAX_PRESENT).some(([k]) => k === sid)) more.push(['HDEL', `${P}pres`, sid]);
      const seq = withEvents ? Number(r[r.length - 1]) || 0 : 0;
      if (withEvents && seq > since) more.push(['LRANGE', `${P}ev`, '0', '19']);
      const x = more.length ? await kv.pipeline(more) : [];
      if (withEvents) {
        const list = seq > since ? x[x.length - 1] : [];
        out.seq = seq;
        out.events = list.map((e) => JSON.parse(e)).filter((e) => e.seq > since).reverse();
      }
      return out;
    },

    async here() {
      const { fresh } = splitPresence(await kv.cmd('HGETALL', `${P}pres`), Date.now());
      return fresh.length;
    },

    async night() {
      const day = today();
      const [c, n] = await kv.pipeline([['GET', `${P}night:${day}`], ['SCARD', `${P}nco:${day}`]]);
      return { candles: Number(c) || 0, countries: Number(n) || 0 };
    },

    jarAdd: (text, who) => store.boardAdd('jar', text, who),
    jar: () => store.board('jar'),

    // true si se pasó del límite de `max` envíos por minuto para esa clave.
    async limited(key, max) {
      const k = `${P}rl:${key}:${Math.floor(Date.now() / 60_000)}`;
      const [n] = await kv.pipeline([['INCR', k], ['EXPIRE', k, '70']]);
      return n > max;
    },
  };
  return store;
}
