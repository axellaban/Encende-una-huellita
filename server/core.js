// La API, independiente del servidor: la usan el servidor local (server/index.js) y la función de Vercel (api/handler.js).
// Recibe un pedido simplificado y devuelve { status, json } o { status, bytes, type, cache }.

export const MAX_BODY = 3 * 1024 * 1024;
const MAX_PHOTO = 1.5 * 1024 * 1024;

const ok = (json, status = 200) => ({ status, json });
const fail = (status, error) => ({ status, json: { error } });

export function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function validateMemorial(body) {
  const name = cleanText(body.name, 30);
  if (!name) return { error: 'Contanos su nombre.' };
  const species = ['perro', 'gato', 'otro'].includes(body.species) ? body.species : 'otro';
  const birthday = MMDD.test(body.birthday || '') ? body.birthday : null;
  const passedDay = MMDD.test(body.passedDay || '') ? body.passedDay : null;
  const message = cleanText(body.message, 200);
  const slot = Number.isInteger(body.slot) ? body.slot : undefined;
  return { name, species, birthday, passedDay, message, slot };
}

export function parseDataUrl(s) {
  const m = typeof s === 'string' && s.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const bytes = Buffer.from(m[2], 'base64');
  const sig = {
    jpeg: bytes[0] === 0xff && bytes[1] === 0xd8,
    png: bytes[0] === 0x89 && bytes[1] === 0x50,
    webp: bytes.subarray(8, 12).toString('ascii') === 'WEBP',
  };
  if (!sig[m[1]]) return null;
  return { bytes, type: `image/${m[1]}` };
}

const countryOf = (req) => {
  const c = (req.header('x-vercel-ip-country') || '').toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
};

function whoFrom(body, req) {
  return {
    sid: cleanText(body.sid, 40) || null,
    visitor: cleanText(body.visitor, 40) || 'Alguien',
    glowTo: /^[\w-]{3,24}$/.test(body.glowTo || '') ? body.glowTo : null,
    glowToken: typeof body.glowToken === 'string' ? body.glowToken.slice(0, 64) : null,
    country: countryOf(req),
  };
}

/**
 * @param {{method:string, path:string, ip:string, header:(n:string)=>string|null, json:()=>Promise<any>}} req
 * @param {ReturnType<import('./store.js').createStore>} store
 */
export async function handleApi(req, store) {
  const { method, path, ip } = req;

  if (path === '/api/health') return ok({ ok: true, storage: store.kind });

  if (path === '/api/memorials' && method === 'GET') {
    const memorials = await store.list();
    return ok({
      memorials,
      stats: {
        memorials: memorials.length,
        candles: memorials.reduce((a, m) => a + m.candles, 0),
        flowers: memorials.reduce((a, m) => a + m.flowers, 0),
      },
    });
  }

  if (path === '/api/memorials' && method === 'POST') {
    if (await store.limited(`c:${ip}`, 8)) return fail(429, 'Demasiados intentos. Probá en un minuto.');
    const body = await req.json();
    const input = validateMemorial(body);
    if (input.error) return fail(400, input.error);
    let photo = null;
    if (body.photo) {
      photo = parseDataUrl(body.photo);
      if (!photo) return fail(400, 'La foto tiene un formato no soportado (usá JPG, PNG o WebP).');
      if (photo.bytes.length > MAX_PHOTO) return fail(400, 'La foto es demasiado grande.');
    }
    return ok(await store.create(input, photo, cleanText(body.visitor, 40), body.pendingGlow), 201);
  }

  let m = path.match(/^\/api\/photos\/([\w-]{3,24})$/);
  if (m && method === 'GET') {
    const p = await store.photo(m[1]);
    if (!p) return fail(404, 'No encontrada');
    return { status: 200, bytes: p.bytes, type: p.type, cache: 'public, max-age=31536000, s-maxage=31536000, immutable' };
  }

  m = path.match(/^\/api\/memorials\/([\w-]{3,24})(?:\/(candle|flower|guestbook|gift|hug))?$/);
  if (m) {
    const [, id, action] = m;
    if (!action && method === 'GET') {
      const mem = await store.get(id);
      return mem ? ok(mem) : fail(404, 'No encontramos esa huellita.');
    }
    if (!action && method === 'DELETE') {
      const r = await store.remove(id, req.header('x-edit-token'));
      if (r === 'not_found') return fail(404, 'No encontramos esa huellita.');
      if (r === 'forbidden') return fail(403, 'Sólo quien creó esta huellita puede quitarla.');
      return ok({ ok: true });
    }
    if (action && method === 'POST') {
      if (await store.limited(`a:${ip}`, 40)) return fail(429, 'Más despacio, por favor 🤍');
      const body = await req.json();
      const who = whoFrom(body, req);
      let r;
      if (action === 'candle') r = await store.candle(id, who);
      if (action === 'flower') r = await store.flower(id, who);
      if (action === 'hug') r = await store.hug(id, who);
      if (action === 'gift') r = await store.gift(id, who, cleanText(body.gift, 40));
      if (action === 'guestbook') {
        const text = cleanText(body.text, 280);
        if (!text) return fail(400, 'Escribí unas palabras.');
        r = await store.sign(id, { name: cleanText(body.name, 40) || who.visitor, text }, who);
      }
      return r ? ok(r, action === 'guestbook' ? 201 : 200) : fail(404, 'No encontramos esa huellita.');
    }
  }

  m = path.match(/^\/api\/activity\/(\d{1,12})$/);
  if (m && method === 'GET') {
    const [ev, here] = await Promise.all([store.events(Number(m[1])), store.here()]);
    return ok({ ...ev, here });
  }

  if (path === '/api/now' && method === 'POST') {
    const body = await req.json();
    const info = {
      name: cleanText(body.visitor, 40),
      x: Number(body.x), z: Number(body.z), ry: Number(body.ry), hue: Number(body.hue),
      say: cleanText(body.say, 40) || null,
      emote: cleanText(body.emote, 8) || null,
      country: countryOf(req),
    };
    return ok(await store.touch(cleanText(body.sid, 40), info));
  }

  if (path === '/api/night' && method === 'GET') return ok(await store.night());

  if (path === '/api/jar' && method === 'GET') return ok(await store.jar());
  if (path === '/api/jar' && method === 'POST') {
    if (await store.limited(`j:${ip}`, 4)) return fail(429, 'Más despacio, por favor 🤍');
    const body = await req.json();
    const text = cleanText(body.text, 140);
    if (text.length < 3) return fail(400, 'Escribí por qué das las gracias.');
    return ok(await store.jarAdd(text, cleanText(body.visitor, 40)), 201);
  }

  return fail(404, 'Ruta desconocida');
}

// Envuelve handleApi con manejo de errores comunes.
export async function safeHandle(req, store) {
  try {
    return await handleApi(req, store);
  } catch (err) {
    if (err?.status) return fail(err.status, err.message);
    console.error(err);
    return fail(500, 'Algo salió mal. Probá de nuevo.');
  }
}
