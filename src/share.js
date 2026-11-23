// Todo lo que hace que el jardín se comparta: los links de cada huellita (/h/<id>), quién invita,
// "Pasá la luz" (cuántas velas se encendieron gracias a tus links) y la tarjeta 1200x630 que se ve
// como vista previa en WhatsApp, Instagram, Facebook y X.
import { papelPicadoTexture, PICADO_COLORS } from './scene/muertos.js';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin storage */ } },
};

// Mi código para "Pasá la luz" (no es el sid: sólo sirve para contar).
export function myRef() {
  let c = store.get('huellita.ref');
  if (!/^[a-z0-9]{8}$/.test(c || '')) {
    c = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
    store.set('huellita.ref', c);
  }
  return c;
}

// Cómo llegó esta persona: por el link de una huellita, invitada por alguien.
export function arrival() {
  const path = location.pathname.match(/^\/h\/([\w-]{3,24})\/?$/);
  const hash = location.hash.match(/^#h\/([\w-]{3,24})/);
  const q = new URLSearchParams(location.search);
  const ref = /^[a-z0-9]{6,12}$/.test(q.get('l') || '') ? q.get('l') : null;
  const de = (q.get('de') || '').replace(/[<>]/g, '').trim().slice(0, 40);
  if (ref && ref !== myRef()) store.set('huellita.via', ref);
  return { id: path?.[1] || hash?.[1] || null, de, ref: ref && ref !== myRef() ? ref : null };
}

// El código de quien me invitó (para que mi primera vela le sume a su "luz").
export const viaRef = () => {
  const v = store.get('huellita.via');
  return v && v !== myRef() ? v : null;
};

// Link para compartir una huellita. `invite`: con mi nombre y mi código.
export function shareUrl(id, { invite = false, name = '' } = {}) {
  const u = new URL(`/h/${encodeURIComponent(id)}`, location.origin);
  if (invite) {
    u.searchParams.set('l', myRef());
    if (name) u.searchParams.set('de', name);
  }
  return u.toString();
}

const loadImg = (src) => new Promise((res) => {
  const i = new Image();
  i.crossOrigin = 'anonymous';
  i.onload = () => res(i);
  i.onerror = () => res(null);
  i.src = src;
  setTimeout(() => res(null), 4000);
});

// Tarjeta para la vista previa del link: foto en marco dorado, nombre grande y la invitación.
export async function drawOgCard(m, photoSrc) {
  const W = 1200;
  const H = 630;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  await Promise.all(['italic 600 120px "Cormorant Garamond"', '700 40px Caveat', '800 30px "DM Sans"'].map((f) => document.fonts?.load(f).catch(() => {})));
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1d0f33');
  bg.addColorStop(0.55, '#4a1a52');
  bg.addColorStop(1, '#c4571d');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // Resplandor de vela detrás de la foto.
  const glow = g.createRadialGradient(330, 330, 20, 330, 330, 360);
  glow.addColorStop(0, 'rgba(255,190,110,.55)');
  glow.addColorStop(1, 'rgba(255,190,110,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  // Papel picado arriba.
  for (let i = 0; i < 10; i++) g.drawImage(papelPicadoTexture(PICADO_COLORS[i % 7], i).image, i * 120, -18, 120, 120);
  // Pétalos de cempasúchil.
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 70; i++) {
    g.fillStyle = ['#ff9a1f', '#ffcf3a', '#ff7a1a'][i % 3];
    g.globalAlpha = 0.35 + rnd() * 0.5;
    g.beginPath();
    g.ellipse(rnd() * W, 120 + rnd() * (H - 120), 7, 4, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // Foto en marco dorado, un poco inclinada.
  const img = await loadImg(photoSrc);
  const fw = 340;
  const fh = 425;
  g.save();
  g.translate(330, 345);
  g.rotate(-0.035);
  g.shadowColor = 'rgba(0,0,0,.45)';
  g.shadowBlur = 40;
  g.shadowOffsetY = 14;
  g.fillStyle = '#e0b55d';
  g.fillRect(-fw / 2 - 22, -fh / 2 - 22, fw + 44, fh + 44);
  g.shadowColor = 'transparent';
  g.fillStyle = '#fbefd9';
  g.fillRect(-fw / 2 - 9, -fh / 2 - 9, fw + 18, fh + 18);
  if (img) {
    const r = Math.max(fw / img.naturalWidth, fh / img.naturalHeight);
    const w = img.naturalWidth * r;
    const h = img.naturalHeight * r;
    g.beginPath();
    g.rect(-fw / 2, -fh / 2, fw, fh);
    g.clip();
    g.drawImage(img, -w / 2, -fh / 2 - (h - fh) * 0.35, w, h);
  }
  g.restore();
  // Velita.
  const vx = 560;
  const vy = 520;
  g.fillStyle = '#fff3e0';
  g.fillRect(vx - 9, vy - 46, 18, 46);
  const fl = g.createRadialGradient(vx, vy - 62, 2, vx, vy - 62, 34);
  fl.addColorStop(0, 'rgba(255,240,200,1)');
  fl.addColorStop(0.35, 'rgba(255,170,60,.9)');
  fl.addColorStop(1, 'rgba(255,140,40,0)');
  g.fillStyle = fl;
  g.beginPath();
  g.ellipse(vx, vy - 62, 18, 30, 0, 0, Math.PI * 2);
  g.fill();
  // Textos.
  const x = 640;
  g.textAlign = 'left';
  g.fillStyle = '#ffd9a8';
  g.font = '700 46px Caveat, cursive';
  g.fillText('En memoria de', x, 228);
  g.fillStyle = '#ffffff';
  let size = 128;
  g.font = `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`;
  while (g.measureText(m.name).width > W - x - 50 && size > 60) { size -= 6; g.font = `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`; }
  g.shadowColor = 'rgba(255,170,90,.55)';
  g.shadowBlur = 30;
  g.fillText(m.name, x, 228 + size * 0.95);
  g.shadowBlur = 0;
  const dates = [m.birthYear, m.passedYear].filter(Boolean).join(' – ');
  g.font = '700 30px "DM Sans", sans-serif';
  g.fillStyle = 'rgba(255,240,224,.85)';
  if (dates) g.fillText(dates, x + 4, 228 + size * 0.95 + 52);
  // Botón.
  const by = 470;
  const label = '🕯️  Encendé una vela';
  g.font = '800 34px "DM Sans", sans-serif';
  const bw = g.measureText(label).width + 64;
  const grd = g.createLinearGradient(x, by, x + bw, by + 74);
  grd.addColorStop(0, '#f7951f');
  grd.addColorStop(1, '#e4167c');
  g.fillStyle = grd;
  roundRect(g, x, by, bw, 74, 37);
  g.fill();
  g.fillStyle = '#fff';
  g.fillText(label, x + 32, by + 49);
  g.font = '700 24px "DM Sans", sans-serif';
  g.fillStyle = 'rgba(255,240,224,.75)';
  g.fillText('Un jardín para recordar a quienes amamos 🐾', x + 4, by + 118, W - x - 40);
  return c;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Arma la tarjeta y la sube (sólo quien cuida la huellita). Silencioso: si falla, se usa la foto.
export async function uploadOgCard(api, m, photoSrc) {
  try {
    const c = await drawOgCard(m, photoSrc);
    const image = c.toDataURL('image/jpeg', 0.86);
    return await api.own(m.id, 'og', { image });
  } catch {
    return null;
  }
}
