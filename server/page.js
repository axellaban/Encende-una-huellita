// Páginas para compartir: /h/<id> devuelve la misma app pero con la vista previa de esa huellita
// (título, texto e imagen) para que WhatsApp, Instagram, Facebook y X muestren su foto y su nombre.
// Las personas ven la app de siempre; los robots que arman la vista previa leen estas etiquetas.
import { FEATURED } from './seed.js';

const DEFAULT_IMAGE = '/og.jpg';
const featuredById = new Map(FEATURED.map((f) => [f.id, f]));

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clean = (t, max) => String(t ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

// Qué dice la vista previa de una huellita. `de`: quién invita (viene en el link compartido).
export async function pageMeta(store, id, { origin, de = '' } = {}) {
  if (!/^[\w-]{3,24}$/.test(id || '')) return null;
  // Sin base de datos (o si falla) las destacadas igual tienen su vista previa: viven en el código.
  let m = store ? await store.get(id).catch(() => null) : null;
  if (!m && featuredById.has(id)) m = { ...featuredById.get(id), candles: 0 };
  if (!m) return null;
  const f = featuredById.get(id);
  const abs = (p) => (/^https?:/.test(p) ? p : `${origin}${p}`);
  const image = f?.og || m.ogCard || m.photo || DEFAULT_IMAGE;
  const who = clean(de, 40);
  const candles = Number(m.candles) || 0;
  const title = `${m.name} · Encendé una huellita`;
  const description = who
    ? `${who} encendió una vela por ${m.name} y te invita a encender la tuya 🕯️`
    : candles > 1
      ? `${candles} velas encendidas por ${m.name}. Encendé la tuya 🕯️`
      : `Encendé una vela por ${m.name} 🕯️ Un jardín para recordar a las mascotas que amamos.`;
  return { title, description, image: abs(image), url: `${origin}/h/${id}`, name: m.name };
}

// Reemplaza las etiquetas de la página por las de la huellita.
export function injectMeta(html, meta) {
  if (!meta) return html;
  const set = (re, value) => { html = html.replace(re, (_, a, b) => `${a}${esc(value)}${b}`); };
  set(/(<title>)[^<]*(<\/title>)/, meta.title);
  set(/(<meta name="description" content=")[^"]*(")/, meta.description);
  set(/(<meta property="og:title" content=")[^"]*(")/, meta.title);
  set(/(<meta property="og:description" content=")[^"]*(")/, meta.description);
  set(/(<meta property="og:image" content=")[^"]*(")/, meta.image);
  set(/(<meta property="og:url" content=")[^"]*(")/, meta.url);
  set(/(<meta name="twitter:image" content=")[^"]*(")/, meta.image);
  set(/(<meta property="og:image:alt" content=")[^"]*(")/, `Foto de ${meta.name}`);
  set(/(<link rel="canonical" href=")[^"]*(")/, meta.url);
  // La imagen de cada huellita no siempre es 1200x630: que la red la mida sola.
  html = html.replace(/\s*<meta property="og:image:(width|height)" content="\d+" \/>/g, '');
  return html;
}

// Si no hay index.html a mano (no debería pasar), una página mínima con las etiquetas que lleva a la app.
export function fallbackPage(meta, id) {
  const m = meta || { title: 'Encendé una huellita', description: '', image: DEFAULT_IMAGE, url: '/' };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(m.title)}</title>
<meta property="og:title" content="${esc(m.title)}"><meta property="og:description" content="${esc(m.description)}">
<meta property="og:image" content="${esc(m.image)}"><meta property="og:url" content="${esc(m.url)}">
<meta name="twitter:card" content="summary_large_image"><meta http-equiv="refresh" content="0;url=/#h/${esc(id)}">
</head><body><a href="/#h/${esc(id)}">Encendé una vela 🕯️</a></body></html>`;
}

export const PAGE_RE = /^\/h\/([\w-]{3,24})\/?$/;
