// Función de Vercel: todas las rutas /api/* llegan acá (ver vercel.json).
// Necesita Upstash Redis conectado al proyecto (Vercel → Storage → Upstash for Redis).
// Sin eso, /api/health responde ok:false y la página funciona en modo demo (datos en el navegador).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_BODY, safeHandle } from '../server/core.js';
import { pageMeta, injectMeta, fallbackPage } from '../server/page.js';
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

// La app (dist/index.html) para servir /h/<id> con la vista previa de esa huellita.
let indexHtml = null;
async function appHtml(origin) {
  if (indexHtml) return indexHtml;
  for (const p of [join(process.cwd(), 'dist', 'index.html'), join(process.cwd(), 'index.html')]) {
    try { indexHtml = readFileSync(p, 'utf8'); if (indexHtml.includes('/assets/')) return indexHtml; } catch { /* sigue */ }
  }
  try {
    const r = await fetch(`${origin}/index.html`, { headers: { 'x-huellita-page': '1' } });
    if (r.ok) { indexHtml = await r.text(); return indexHtml; }
  } catch { /* sin acceso */ }
  indexHtml = null;
  return null;
}

async function page(url, id) {
  const origin = `${url.protocol}//${url.host}`;
  const meta = await pageMeta(store, id, { origin, de: url.searchParams.get('de') || '' });
  const html = await appHtml(origin);
  const body = html ? injectMeta(html, meta) : fallbackPage(meta, id);
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400' },
  });
}

async function handle(request) {
  const url = new URL(request.url);
  const pageId = url.searchParams.get('page');
  if (pageId && /^[\w-]{3,24}$/.test(pageId)) return page(url, pageId);
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

// HEAD: algunos robots de vista previa (WhatsApp, Telegram, iMessage, Slack…) preguntan primero por
// la página o la imagen sin bajarla. Antes respondía 405 y la vista previa podía salir sin foto.
async function head(request) {
  const r = await handle(request);
  return new Response(null, { status: r.status, headers: r.headers });
}

export const GET = handle;
export const HEAD = head;
export const POST = handle;
export const DELETE = handle;
