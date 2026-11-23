// Servidor local: API + archivos estáticos de dist/. En Vercel se usa api/handler.js en su lugar.
// Sin Upstash configurado, guarda todo en data/kv.json (emulador de Redis en memoria).
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_BODY, safeHandle } from './core.js';
import { PAGE_RE, pageMeta, injectMeta, fallbackPage } from './page.js';
import { createStore } from './store.js';
import { createMemoryKv } from './kv/memory.js';
import { createUpstashKv, upstashConfigFromEnv } from './kv/upstash.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// Encabezados de seguridad. Deben coincidir con los de vercel.json (hay un test que lo controla).
export const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const SECURITY = { 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self)' };

export function createApp({ kv } = {}) {
  const store = createStore(kv);

  function readJson(req) {
    return new Promise((res, rej) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          rej(Object.assign(new Error('El envío es demasiado grande.'), { status: 413 }));
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => {
        if (!chunks.length) return res({});
        try {
          const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          res(v && typeof v === 'object' ? v : {});
        } catch {
          rej(Object.assign(new Error('JSON inválido'), { status: 400 }));
        }
      });
      req.on('error', rej);
    });
  }

  function send(res, r) {
    if (r.bytes) {
      res.writeHead(r.status, { 'Content-Type': r.type, 'Cache-Control': r.cache || 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(r.bytes);
    }
    res.writeHead(r.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(r.json));
  }

  function serveFile(res, file, cache) {
    const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache, ...SECURITY });
    createReadStream(file).pipe(res);
  }


  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const r = await safeHandle({
        method: req.method,
        path: url.pathname,
        ip: req.socket.remoteAddress || 'local',
        header: (n) => req.headers[n.toLowerCase()] ?? null,
        json: () => readJson(req),
      }, store);
      return send(res, r);
    }
    const page = url.pathname.match(PAGE_RE);
    if (page) {
      const index = join(DIST, 'index.html');
      const meta = await pageMeta(store, page[1], { origin: `http://${req.headers.host || 'localhost'}`, de: url.searchParams.get('de') || '' });
      const html = existsSync(index) ? injectMeta(readFileSync(index, 'utf8'), meta) : fallbackPage(meta, page[1]);
      res.writeHead(meta ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', ...SECURITY });
      return res.end(html);
    }
    let f;
    try { f = normalize(join(DIST, decodeURIComponent(url.pathname))); } catch { f = null; }
    if (f && !(f === DIST || f.startsWith(DIST + sep))) f = null;
    if (f && existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (f && existsSync(f) && statSync(f).isFile()) {
      return serveFile(res, f, f.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
    }
    const index = join(DIST, 'index.html');
    if (existsSync(index)) return serveFile(res, index, 'no-cache');
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Falta compilar el frontend: corré `npm run build`.');
  });

  return { server, store };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8787;
  const up = upstashConfigFromEnv();
  const kv = up ? createUpstashKv(up) : createMemoryKv({ file: join(process.env.DATA_DIR || join(ROOT, 'data'), 'kv.json') });
  const { server } = createApp({ kv });
  server.listen(port, () => console.log(`🕯️  Encendé una huellita en http://localhost:${port} (datos: ${kv.kind})`));
  const bye = () => { kv.flush?.(); process.exit(0); };
  process.on('SIGINT', bye);
  process.on('SIGTERM', bye);
}
