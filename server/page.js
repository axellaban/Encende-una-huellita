// Páginas para compartir: /h/<id> devuelve la misma app pero con la vista previa de esa huellita
// (título, texto e imagen) para que WhatsApp, Instagram, Facebook, Telegram y X muestren su foto y su nombre.
// Las personas ven la app de siempre; los robots que arman la vista previa leen estas etiquetas.
import { FEATURED } from './seed.js';

const DEFAULT_IMAGE = '/og.jpg?v=2';
const SITE = 'Encendé una huellita';
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
  // La tarjeta 1200x630 (la destacada o la que subió la familia) se ve grande en WhatsApp; si no hay,
  // la foto (sale chiquita y cuadrada) y si tampoco, la imagen del jardín.
  const card = f?.og || m.ogCard || null;
  const image = card || m.photo || DEFAULT_IMAGE;
  const name = clean(m.name, 30) || 'una huellita';
  const who = clean(de, 40);
  const candles = Number(m.candles) || 0;
  const title = `En memoria de ${name} 🕯️`;
  const description = who
    ? `${who} encendió una vela por ${name} y te invita a encender la tuya 🕯️ Es gratis y lleva un segundo.`
    : candles > 1
      ? `Ya hay ${candles.toLocaleString('es-AR')} velas encendidas por ${name}. Tocá y encendé la tuya 🕯️ Es gratis y lleva un segundo.`
      : `Encendé una vela por ${name} 🕯️ Un jardín de luz para recordar a las mascotas que amamos 🐾`;
  return {
    title,
    pageTitle: `En memoria de ${name} · ${SITE}`,
    description,
    image: abs(image),
    // Medidas y tipo sólo si los sabemos de verdad (con la foto, que la red la mida sola).
    imageSize: card || image === DEFAULT_IMAGE ? [1200, 630] : null,
    imageType: card || image === DEFAULT_IMAGE ? 'image/jpeg' : null,
    url: `${origin}/h/${id}`,
    name,
  };
}

// Las etiquetas de la vista previa (van al principio del <head>: algunos robots leen sólo el comienzo).
function metaTags(meta) {
  const tags = [
    `<title>${esc(meta.pageTitle || meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${esc(meta.url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE}" />`,
    `<meta property="og:locale" content="es_AR" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(meta.url)}" />`,
    `<meta property="og:image" content="${esc(meta.image)}" />`,
  ];
  if (/^https:/.test(meta.image)) tags.push(`<meta property="og:image:secure_url" content="${esc(meta.image)}" />`);
  if (meta.imageType) tags.push(`<meta property="og:image:type" content="${meta.imageType}" />`);
  if (meta.imageSize) tags.push(`<meta property="og:image:width" content="${meta.imageSize[0]}" />`, `<meta property="og:image:height" content="${meta.imageSize[1]}" />`);
  tags.push(
    `<meta property="og:image:alt" content="${esc(`Foto de ${meta.name}`)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${esc(meta.image)}" />`,
  );
  return tags.join('\n    ');
}

// Reemplaza las etiquetas de la página por las de la huellita.
export function injectMeta(html, meta) {
  if (!meta) return html;
  html = html
    .replace(/\s*<title>[^<]*<\/title>/g, '')
    .replace(/\s*<meta (?:name|property)="(?:description|og:[\w:]+|twitter:[\w:]+)" content="[^"]*"\s*\/?>/g, '')
    .replace(/\s*<link rel="canonical" href="[^"]*"\s*\/?>/g, '');
  const block = metaTags(meta);
  const at = html.match(/<meta charset="[^"]*"\s*\/?>/i) || html.match(/<head[^>]*>/i);
  if (!at) return `${block}\n${html}`;
  const i = at.index + at[0].length;
  return `${html.slice(0, i)}\n    ${block}${html.slice(i)}`;
}

// Si no hay index.html a mano (no debería pasar), una página mínima con las etiquetas que lleva a la app.
export function fallbackPage(meta, id) {
  const m = meta || { title: SITE, description: '', image: DEFAULT_IMAGE, url: '/', name: SITE };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
    ${metaTags(m)}
<meta http-equiv="refresh" content="0;url=/#h/${esc(id)}">
</head><body><a href="/#h/${esc(id)}">Encendé una vela 🕯️</a></body></html>`;
}

export const PAGE_RE = /^\/h\/([\w-]{3,24})\/?$/;
