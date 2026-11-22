// Función de Vercel: todas las rutas /api/* llegan acá (ver vercel.json).
// Necesita Upstash Redis conectado al proyecto (Vercel → Storage → Upstash for Redis).
// Sin eso, /api/health responde ok:false y la página funciona en modo demo (datos en el navegador).
import { MAX_BODY, safeHandle } from '../server/core.js';
import { createStore } from '../server/store.js';
import { createUpstashKv, upstashConfigFromEnv } from '../server/kv/upstash.js';

const config = upstashConfigFromEnv();
const store = config ? createStore(createUpstashKv(config)) : null;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function handle(request) {
  const url = new URL(request.url);
  const rewritten = url.searchParams.get('path');
  const path = rewritten != null ? `/api/${rewritten.replace(/^\/+/, '')}` : url.pathname;

  if (!store) {
    return path === '/api/health'
      ? json(200, { ok: false, reason: 'Falta conectar Upstash Redis al proyecto en Vercel.' })
      : json(503, { error: 'El jardín todavía no tiene base de datos conectada.' });
  }

  const r = await safeHandle({
    method: request.method,
    path,
    ip: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'anon',
    header: (n) => request.headers.get(n),
    async json() {
      const len = Number(request.headers.get('content-length') || 0);
      if (len > MAX_BODY) throw Object.assign(new Error('El envío es demasiado grande.'), { status: 413 });
      const text = await request.text();
      if (text.length > MAX_BODY * 1.4) throw Object.assign(new Error('El envío es demasiado grande.'), { status: 413 });
      if (!text) return {};
      try {
        const v = JSON.parse(text);
        return v && typeof v === 'object' ? v : {};
      } catch {
        throw Object.assign(new Error('JSON inválido'), { status: 400 });
      }
    },
  }, store);

  if (r.bytes) {
    return new Response(r.bytes, {
      status: r.status,
      headers: { 'Content-Type': r.type, 'Cache-Control': r.cache || 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  }
  return json(r.status, r.json);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
