// Servidor de Encendé una huellita: API JSON + archivos estáticos (dist/) + fotos subidas.
// Sin dependencias: sólo módulos de Node.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const MAX_BODY = 3 * 1024 * 1024;
const MAX_PHOTO = 1.5 * 1024 * 1024;
const PRESENCE_WINDOW = 60_000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export function createApp({ dataDir = join(ROOT, 'data') } = {}) {
  const store = createStore(dataDir);
  const presence = new Map(); // sid -> { at, name }
  const buckets = new Map(); // ip -> { count, reset }
  const recentCandles = new Map(); // `${sid}:${id}` -> at

  function rateLimited(ip, max = 40) {
    const now = Date.now();
    const b = buckets.get(ip);
    if (!b || b.reset < now) {
      buckets.set(ip, { count: 1, reset: now + 60_000 });
      return false;
    }
    b.count += 1;
    return b.count > max;
  }

  function hereCount() {
    const now = Date.now();
    for (const [sid, p] of presence) if (now - p.at > PRESENCE_WINDOW) presence.delete(sid);
    return presence.size;
  }

  async function api(req, res, url) {
    const path = url.pathname;
    const method = req.method;
    const ip = req.socket.remoteAddress || 'local';

    if (path === '/api/health') return json(res, 200, { ok: true });

    if (path === '/api/memorials' && method === 'GET') {
      return json(res, 200, { memorials: store.list(), stats: store.stats(), seq: store.lastSeq() });
    }

    if (path === '/api/memorials' && method === 'POST') {
      if (rateLimited(ip, 6)) return json(res, 429, { error: 'Demasiados intentos. Probá en un minuto.' });
      const body = await readJson(req);
      const input = validateMemorial(body);
      if (input.error) return json(res, 400, { error: input.error });
      let photoUrl = null;
      if (body.photo) {
        const parsed = parseDataUrl(body.photo);
        if (!parsed) return json(res, 400, { error: 'La foto tiene un formato no soportado (usá JPG, PNG o WebP).' });
        if (parsed.bytes.length > MAX_PHOTO) return json(res, 400, { error: 'La foto es demasiado grande.' });
        const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${parsed.ext}`;
        writeFileSync(join(store.uploadsDir, name), parsed.bytes);
        photoUrl = `/uploads/${name}`;
      }
      const created = store.create({ ...input, photo: photoUrl }, cleanText(body.visitor, 40));
      return json(res, 201, created);
    }

    const m = path.match(/^\/api\/memorials\/([\w-]{4,20})(?:\/(candle|flower|guestbook))?$/);
    if (m) {
      const [, id, action] = m;
      if (!action && method === 'GET') {
        const mem = store.get(id);
        return mem ? json(res, 200, mem) : json(res, 404, { error: 'No encontramos esa huellita.' });
      }
      if (!action && method === 'DELETE') {
        const r = store.remove(id, req.headers['x-edit-token']);
        if (r === 'not_found') return json(res, 404, { error: 'No encontramos esa huellita.' });
        if (r === 'forbidden') return json(res, 403, { error: 'Sólo quien creó esta huellita puede quitarla.' });
        if (r.photo?.startsWith('/uploads/')) {
          try { unlinkSync(join(store.uploadsDir, r.photo.slice('/uploads/'.length))); } catch { /* ya no existe */ }
        }
        return json(res, 200, { ok: true });
      }
      if (action && method === 'POST') {
        if (rateLimited(ip)) return json(res, 429, { error: 'Más despacio, por favor 🤍' });
        const body = await readJson(req);
        const visitor = cleanText(body.visitor, 40) || 'Alguien';
        if (action === 'candle') {
          const key = `${cleanText(body.sid, 40)}:${id}`;
          const last = recentCandles.get(key) || 0;
          if (Date.now() - last < 10 * 60_000) {
            const mem = store.get(id);
            return mem ? json(res, 200, { memorial: mem, already: true }) : json(res, 404, { error: 'No encontrada' });
          }
          recentCandles.set(key, Date.now());
          const mem = store.candle(id, visitor);
          return mem ? json(res, 200, { memorial: mem }) : json(res, 404, { error: 'No encontrada' });
        }
        if (action === 'flower') {
          const mem = store.flower(id, visitor);
          return mem ? json(res, 200, { memorial: mem }) : json(res, 404, { error: 'No encontrada' });
        }
        if (action === 'guestbook') {
          const text = cleanText(body.text, 280);
          if (!text) return json(res, 400, { error: 'Escribí unas palabras.' });
          const entry = store.sign(id, { name: cleanText(body.name, 40) || visitor, text });
          return entry ? json(res, 201, entry) : json(res, 404, { error: 'No encontrada' });
        }
      }
    }

    if (path === '/api/activity' && method === 'GET') {
      const since = Number(url.searchParams.get('since')) || 0;
      return json(res, 200, { events: store.events(since), seq: store.lastSeq(), here: hereCount() });
    }

    if (path === '/api/now' && method === 'POST') {
      const body = await readJson(req);
      const sid = cleanText(body.sid, 40);
      if (sid) presence.set(sid, { at: Date.now(), name: cleanText(body.visitor, 40) });
      return json(res, 200, { here: hereCount() });
    }

    return json(res, 404, { error: 'Ruta desconocida' });
  }

  function serveFile(res, file, cache) {
    const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' });
    createReadStream(file).pipe(res);
  }

  function safeJoin(base, rel) {
    const p = normalize(join(base, rel));
    return p.startsWith(base + sep) || p === base ? p : null;
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (url.pathname.startsWith('/uploads/')) {
        const f = safeJoin(store.uploadsDir, decodeURIComponent(url.pathname.slice('/uploads/'.length)));
        if (f && existsSync(f) && statSync(f).isFile()) return serveFile(res, f, 'public, max-age=31536000, immutable');
        return json(res, 404, { error: 'No encontrada' });
      }
      let f = safeJoin(DIST, decodeURIComponent(url.pathname));
      if (f && existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
      if (f && existsSync(f) && statSync(f).isFile()) {
        return serveFile(res, f, f.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
      }
      const index = join(DIST, 'index.html');
      if (existsSync(index)) return serveFile(res, index, 'no-cache');
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Falta compilar el frontend: corré `npm run build`.');
    } catch (err) {
      if (err?.status) return json(res, err.status, { error: err.message });
      console.error(err);
      json(res, 500, { error: 'Algo salió mal. Probá de nuevo.' });
    }
  });

  return { server, store };
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('El envío es demasiado grande.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolveBody({});
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolveBody(v && typeof v === 'object' ? v : {});
      } catch {
        reject(Object.assign(new Error('JSON inválido'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

export function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  // Sin caracteres de control; espacios colapsados.
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
  return { bytes, ext: m[1] === 'jpeg' ? '.jpg' : `.${m[1]}` };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8787;
  const { server, store } = createApp({ dataDir: process.env.DATA_DIR || join(ROOT, 'data') });
  server.listen(port, () => console.log(`🕯️  Encendé una huellita en http://localhost:${port}`));
  const bye = () => { store.close(); process.exit(0); };
  process.on('SIGINT', bye);
  process.on('SIGTERM', bye);
}
