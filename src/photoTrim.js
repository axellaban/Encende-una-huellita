// Fotos con franjas: muchas fotos llegan como captura de pantalla (de WhatsApp, Instagram o la galería)
// y traen bandas negras o blancas arriba y abajo (o a los costados). Acá se mide dónde empieza la foto
// de verdad para recortarlas en el marco, en las tarjetas para compartir y al subirla.

const cache = new WeakMap();

// ¿Esta fila (o columna) es una franja lisa? Casi negra o casi blanca, sin detalle.
function flat(data, idx) {
  let sum = 0;
  let sum2 = 0;
  let lo = 255;
  let hi = 0;
  for (const i of idx) {
    const y = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    sum += y;
    sum2 += y * y;
    if (y < lo) lo = y;
    if (y > hi) hi = y;
  }
  const n = idx.length;
  const mean = sum / n;
  const sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  if (sd > 5) return false;
  return (mean < 24 && hi < 48) || (mean > 240 && lo > 214);
}

// Devuelve { sx, sy, sw, sh } (en píxeles de la imagen) sin las franjas lisas de los bordes.
export function contentRect(img) {
  const W = img.naturalWidth || img.width;
  const H = img.naturalHeight || img.height;
  const full = { sx: 0, sy: 0, sw: W, sh: H };
  if (!W || !H) return full;
  if (cache.has(img)) return cache.get(img);
  let out = full;
  try {
    const k = Math.min(1, 160 / Math.max(W, H));
    const w = Math.max(8, Math.round(W * k));
    const h = Math.max(8, Math.round(H * k));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    const { data } = g.getImageData(0, 0, w, h);
    const row = (y) => Array.from({ length: w }, (_, x) => (y * w + x) * 4);
    const col = (x, y0, y1) => Array.from({ length: y1 - y0 }, (_, j) => ((y0 + j) * w + x) * 4);
    let top = 0;
    let bottom = h;
    while (top < h * 0.45 && flat(data, row(top))) top++;
    while (bottom > h * 0.55 && flat(data, row(bottom - 1))) bottom--;
    let left = 0;
    let right = w;
    while (left < w * 0.45 && flat(data, col(left, top, bottom))) left++;
    while (right > w * 0.55 && flat(data, col(right - 1, top, bottom))) right--;
    // Un pixelito de margen por el borde suave del JPEG; si casi no hay franja, no se toca.
    const pad = (v, lim, d) => (v === lim ? v : v + d);
    top = pad(top, 0, 1);
    left = pad(left, 0, 1);
    bottom = pad(bottom, h, -1);
    right = pad(right, w, -1);
    const cut = top + (h - bottom) + left + (w - right);
    if (cut >= 2 && bottom - top > h * 0.3 && right - left > w * 0.3) {
      out = { sx: (left / w) * W, sy: (top / h) * H, sw: ((right - left) / w) * W, sh: ((bottom - top) / h) * H };
    }
  } catch {
    // Imagen de otro sitio sin permiso para leerla: se usa entera.
  }
  cache.set(img, out);
  return out;
}

// Dibuja la imagen cubriendo el rectángulo (x, y, w, h) sin franjas, con el encuadre un poco hacia
// arriba (donde suelen estar las caras). `bias`: 0.5 centrado, menos = más arriba.
export function drawCover(g, img, x, y, w, h, bias = 0.35) {
  const r0 = contentRect(img);
  const s = Math.max(w / r0.sw, h / r0.sh);
  const cw = w / s;
  const ch = h / s;
  const sx = r0.sx + (r0.sw - cw) / 2;
  const sy = r0.sy + (r0.sh - ch) * bias;
  g.drawImage(img, sx, sy, cw, ch, x, y, w, h);
}
