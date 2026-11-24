// Rescate del modo demo. Cada registro tiene un recibo duradero para poder reintentar sin duplicarlo.
import { createHash, createHmac } from 'node:crypto';
import { cleanText, validateMemorial, parseDataUrl, parseAudioUrl } from './core.js';
import { FEATURED_IDS } from './seed.js';
import { GIFT_SET } from './glow.js';
import { BACKGROUND_IDS } from './plans.js';

const digest = (v) => createHash('sha256').update(v).digest('hex');
const idOK = (v) => typeof v === 'string' && /^[\w-]{3,24}$/.test(v) && !['__proto__', 'constructor', 'prototype'].includes(v);
const count = (v) => Math.max(0, Math.min(1e9, Math.floor(Number(v) || 0)));
const at = (v) => Number.isFinite(v) && v > 0 ? Math.min(v, Date.now()) : Date.now();
const day = () => new Date().toISOString().slice(0, 10);
const bad = (message = 'No pudimos leer uno de tus recuerdos. Guardá una copia antes de seguir.') => {
  throw Object.assign(new Error(message), { status: 400 });
};
const emojis = new Set([...GIFT_SET].map((g) => g.split(' ')[0]));
const kinds = new Set(['memorial', 'photo', 'voice', 'diary', 'guestbook', 'gift', 'board', 'featured', 'event', 'daily', 'altar', 'night', 'publish']);
const publicKinds = new Set(['guestbook', 'gift', 'featured', 'event', 'daily', 'altar']);

function prepare(r) {
  if (!r || !kinds.has(r.kind) || typeof r.key !== 'string' || !/^[\w:.-]{1,120}$/.test(r.key)) bad();
  if (!['board', 'night'].includes(r.kind) && !idOK(r.localId)) bad();
  if (FEATURED_IDS.has(r.localId) && !publicKinds.has(r.kind)) bad();
  const v = r.value || {};
  const base = { kind: r.kind, key: r.key, localId: r.localId };
  if (r.kind === 'memorial') {
    const input = validateMemorial(v);
    if (input.error) bad(input.error);
    return { ...base, value: { ...input, candles: count(v.candles), flowers: count(v.flowers), gifts: count(v.gifts), glow: count(v.glow),
      hue: Number.isFinite(v.hue) ? Math.abs(Math.round(v.hue)) % 360 : 30, createdAt: at(v.createdAt), hasPhoto: !!v.hasPhoto,
      bg: BACKGROUND_IDS.has(v.bg) ? v.bg : 'crema', gathering: Number.isFinite(v.gathering) ? v.gathering : 0,
      giftCounts: Object.fromEntries(Object.entries(v.giftCounts || {}).filter(([k]) => emojis.has(k)).map(([k, n]) => [k, count(n)])),
      lastGifts: Array.isArray(v.lastGifts) ? v.lastGifts.filter((g) => emojis.has(g)).slice(0, 3) : [],
      eternal: v.eternal ? { by: cleanText(v.eternal.by, 40) || 'Alguien', at: at(v.eternal.at) } : null } };
  }
  if (r.kind === 'photo' || r.kind === 'voice') {
    const media = r.kind === 'photo' ? parseDataUrl(v.data) : parseAudioUrl(v.data);
    if (!media || media.bytes.length > (r.kind === 'photo' ? 1.5 * 1024 * 1024 : 600 * 1024)) bad('Una foto o un sonido no se pudo recuperar. La copia original sigue en este dispositivo.');
    if (r.kind === 'photo' && (!Number.isInteger(v.n) || v.n < 0 || v.n > 3)) bad();
    return { ...base, value: { n: v.n, media: JSON.stringify({ t: media.type, d: media.bytes.toString('base64') }) } };
  }
  if (r.kind === 'guestbook' || r.kind === 'diary' || r.kind === 'board') {
    if (r.kind === 'board' && !['jar', 'comfort'].includes(v.board)) bad();
    const max = r.kind === 'diary' ? 1200 : r.kind === 'guestbook' ? 280 : v.board === 'jar' ? 140 : 220;
    const text = cleanText(v.text, max);
    if (!text) bad();
    return { ...base, value: { text, name: cleanText(v.name || v.who, 40) || 'Alguien', at: at(v.at), board: v.board,
      id: idOK(v.id) ? v.id : digest(r.key).slice(0, 16), prompt: cleanText(v.prompt, 120) || null, hearts: count(v.hearts) } };
  }
  if (r.kind === 'gift') {
    if (!GIFT_SET.has(v.gift)) bad();
    return { ...base, value: { gift: v.gift, who: cleanText(v.who, 40) || 'Alguien', at: at(v.at) } };
  }
  if (r.kind === 'featured') {
    if (!FEATURED_IDS.has(r.localId)) bad();
    return { ...base, value: { candles: count(v.candles), flowers: count(v.flowers), gifts: count(v.gifts),
      giftCounts: Object.fromEntries(Object.entries(v.giftCounts || {}).filter(([k]) => emojis.has(k)).map(([k, n]) => [k, count(n)])),
      lastGifts: Array.isArray(v.lastGifts) ? v.lastGifts.filter((g) => emojis.has(g)).slice(0, 3) : [],
      eternal: v.eternal ? { by: cleanText(v.eternal.by, 40) || 'Alguien', at: at(v.eternal.at) } : null } };
  }
  if (r.kind === 'event') {
    if (!['created', 'candle', 'flower', 'gift', 'hug', 'guestbook', 'diary', 'eternal', 'altar'].includes(v.type)) bad();
    return { ...base, value: { type: v.type, visitor: cleanText(v.visitor, 40) || 'Alguien', petName: cleanText(v.petName, 30), at: at(v.at), ...(GIFT_SET.has(v.gift) ? { gift: v.gift } : {}) } };
  }
  if (r.kind === 'daily') {
    if (!['c', 'f', 'g', 'h', 'w', 'al', 'dh'].includes(v.action) || !/^\d{4}-\d{2}-\d{2}$/.test(v.day || '')) bad();
    if (v.action === 'dh' && !idOK(v.pageId)) bad();
    return { ...base, value: { action: v.action, day: v.day, pageId: v.pageId } };
  }
  if (r.kind === 'night') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.day || '')) bad();
    return { ...base, value: { day: v.day, candles: count(v.candles) } };
  }
  return base;
}

export function createImporter(kv, { ensureFeatured, claimSlot, getRaw, toPublic, event }) {
  async function limited(kind, max, ip) {
    const key = `hu:rl:${kind}:${ip}:${Math.floor(Date.now() / 60000)}`;
    const [n] = await kv.pipeline([['INCR', key], ['EXPIRE', key, 70]]);
    if (n > max) throw Object.assign(new Error('Estamos guardando muchos recuerdos. Esperá un minuto y volvé a intentar.'), { status: 429 });
  }
  return async ({ source, records, sid } = {}, ip = 'anon') => {
    if (typeof source !== 'string' || !/^[a-f0-9]{64}$/.test(source) || !Array.isArray(records) || records.length < 1 || records.length > 20) bad('El paquete de recuerdos no es válido.');
    const prepared = records.map(prepare); // Validar el lote entero antes de escribir.
    const sourceHash = digest(source);
    const target = (id) => FEATURED_IDS.has(id) ? id : digest(`${source}:${id}`).slice(0, 16);
    const tokenFor = (id) => createHmac('sha256', source).update(`familia:${id}`).digest('base64url');
    const mapping = Object.create(null);
    const visitorSid = cleanText(sid, 40) || 'anon';
    let imported = 0;
    await ensureFeatured();
    for (const r of prepared) {
      const receipt = `hu:im:${sourceHash}:${digest(`${r.kind}:${r.key}`)}`;
      const id = r.localId ? target(r.localId) : null;
      if (r.kind === 'memorial') mapping[r.localId] = { id, editToken: tokenFor(r.localId) };
      if (await kv.cmd('EXISTS', receipt)) continue;
      const v = r.value;
      const cmds = [];
      let current;
      if (r.kind === 'memorial') {
        const raw = await getRaw(id);
        const tokenHash = digest(tokenFor(r.localId));
        if (raw.data && raw.tokenHash !== tokenHash) bad();
        if (!raw.data) await limited('c', 12, ip);
        const slot = await claimSlot(v.slot, id);
        const data = { name: v.name, species: v.species, message: v.message, birthday: v.birthday, passedDay: v.passedDay,
          look: v.look, slot, hue: v.hue, createdAt: v.createdAt, hasPhoto: v.hasPhoto };
        cmds.push(['HSET', `hu:m:${id}`, 'data', JSON.stringify(data), 'tokenHash', tokenHash,
          'candles', v.candles, 'flowers', v.flowers, 'gifts', v.gifts, 'glow', v.glow, 'gb', 0, 'dc', 0,
          'bg', v.bg, 'gathering', v.gathering, 'lastGifts', JSON.stringify(v.lastGifts)]);
        for (const [emoji, n] of Object.entries(v.giftCounts)) cmds.push(['HSET', `hu:m:${id}`, `gc:${emoji}`, n]);
        if (v.eternal) cmds.push(['HSET', `hu:m:${id}`, 'eternal', JSON.stringify(v.eternal)]);
      } else if (!['board', 'night'].includes(r.kind)) {
        current = await getRaw(id);
        if (!current.data || (!FEATURED_IDS.has(id) && current.tokenHash !== digest(tokenFor(r.localId)))) bad('Primero necesitamos recuperar la huellita de ese recuerdo.');
      }
      // Las escrituras públicas conservan los límites de la API normal; los reintentos no cuentan.
      if (FEATURED_IDS.has(id) && ['guestbook', 'gift', 'featured', 'altar'].includes(r.kind)) await limited('a', 40, ip);
      if (r.kind === 'board') await limited('j', 4, ip);
      if (r.kind === 'photo') {
        // Fotos grandes se suben en partes para no superar el tamaño de pedido de Redis REST.
        const key = `hu:photo:${id}${v.n ? `:${v.n}` : ''}`;
        if (v.media.length > 384 * 1024) {
          const parts = [];
          const version = digest(v.media).slice(0, 16);
          for (let offset = 0; offset < v.media.length; offset += 384 * 1024) {
            const part = `${receipt}:${version}:${offset}`;
            await kv.cmd('SET', part, v.media.slice(offset, offset + 384 * 1024), 'EX', 3600);
            parts.push(part);
          }
          cmds.push(['HUELLITA_ASSEMBLE', key, ...parts]);
        } else cmds.push(['SET', key, v.media]);
        if (v.n) cmds.push(['HINCRBY', `hu:m:${id}`, 'xp', 1]);
      }
      if (r.kind === 'voice') cmds.push(['SET', `hu:voice:${id}`, v.media], ['HSET', `hu:m:${id}`, 'voice', Date.now()]);
      if (r.kind === 'guestbook') cmds.push(['LPUSH', `hu:gb:${id}`, JSON.stringify({ id: v.id, name: v.name, text: v.text, at: v.at })], ['HINCRBY', `hu:m:${id}`, 'gb', 1]);
      if (r.kind === 'diary') cmds.push(['LPUSH', `hu:dy:${id}`, JSON.stringify({ id: v.id, text: v.text, prompt: v.prompt, at: v.at })], ['HINCRBY', `hu:m:${id}`, 'dc', 1], ['HSET', `hu:dh:${id}`, v.id, v.hearts]);
      if (r.kind === 'gift') cmds.push(['LPUSH', `hu:gf:${id}`, JSON.stringify(v)]);
      if (r.kind === 'board') cmds.push(['LPUSH', `hu:${v.board}`, JSON.stringify({ text: v.text, who: v.name, at: v.at })], ['INCR', `hu:${v.board}n`]);
      if (r.kind === 'featured') {
        for (const field of ['candles', 'flowers', 'gifts']) if (v[field]) cmds.push(['HINCRBY', `hu:m:${id}`, field, v[field]]);
        for (const [emoji, n] of Object.entries(v.giftCounts)) cmds.push(['HINCRBY', `hu:m:${id}`, `gc:${emoji}`, n]);
        if (v.lastGifts.length) cmds.push(['HSETNX', `hu:m:${id}`, 'lastGifts', JSON.stringify(v.lastGifts)]);
        if (v.eternal) cmds.push(['HSETNX', `hu:m:${id}`, 'eternal', JSON.stringify(v.eternal)]);
      }
      if (r.kind === 'event') {
        const seq = await kv.cmd('INCR', 'hu:seq');
        cmds.push(['LPUSH', 'hu:ev', JSON.stringify({ ...v, seq, memorialId: id, migrated: true, c: Number(current.candles) || 0, f: Number(current.flowers) || 0 })]);
      }
      if (r.kind === 'daily' && v.day === day()) cmds.push(['SET', `hu:d:${v.action}:${visitorSid}:${v.action === 'al' ? 'any' : v.action === 'dh' ? `${id}:${v.pageId}` : id}:${v.day}`, '1', 'EX', 30 * 3600]);
      if (r.kind === 'altar') cmds.push(['ZADD', `hu:altar:${day()}`, Date.now(), id], ['EXPIRE', `hu:altar:${day()}`, 60 * 3600]);
      if (r.kind === 'night' && v.day === day()) cmds.push(['INCRBY', `hu:night:${v.day}`, v.candles], ['EXPIRE', `hu:night:${v.day}`, 60 * 3600]);
      if (r.kind === 'publish') {
        const raw = await getRaw(id);
        cmds.push(['ZADD', 'hu:ids', JSON.parse(raw.data).createdAt, id]);
      }
      const applied = await kv.once(receipt, cmds);
      imported += applied;
      if (applied && r.kind === 'publish') await event('created', toPublic(await getRaw(id), id), 'Su familia');
    }
    return { mapping, imported };
  };
}
