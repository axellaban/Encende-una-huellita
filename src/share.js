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

// Generador de código QR (ISO 18004, nivel L, modo byte, versiones 3 y 4: hasta 78 caracteres)
// para poder imprimir la estampita y llevarla a la ofrenda de casa.
function makeQrMatrix(text) {
  const bytes = [...new TextEncoder().encode(String(text).slice(0, 78))];
  const ver = bytes.length <= 53 ? 3 : 4;
  const N = ver === 3 ? 29 : 33;
  const dataLen = ver === 3 ? 55 : 80;
  const ecLen = ver === 3 ? 15 : 20;
  const align = ver === 3 ? 22 : 26;

  // Empaquetar bits: modo byte (0100), largo (8 bits), datos, terminador y relleno.
  const bits = [0, 1, 0, 0];
  for (let i = 7; i >= 0; i--) bits.push((bytes.length >> i) & 1);
  for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  for (let i = 0; i < 4 && bits.length < dataLen * 8; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    data.push(v);
  }
  const pads = [0xec, 0x11];
  for (let i = 0; data.length < dataLen; i++) data.push(pads[i % 2]);

  // Reed-Solomon en GF(256) con polinomio 0x11d.
  const exp = new Uint8Array(512);
  const log = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = x;
    log[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
  const mul = (a, b) => (a && b ? exp[log[a] + log[b]] : 0);
  let gen = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= mul(gen[j], exp[i]);
    }
    gen = next;
  }
  const ec = new Array(ecLen).fill(0);
  for (const b of data) {
    const f = b ^ ec.shift();
    ec.push(0);
    for (let j = 0; j < ecLen; j++) ec[j] ^= mul(gen[j + 1], f);
  }
  const codewords = [...data, ...ec];

  const grid = Array.from({ length: N }, () => new Int8Array(N));
  const used = Array.from({ length: N }, () => new Uint8Array(N));
  const setMod = (r, c, v) => {
    if (r < 0 || r >= N || c < 0 || c >= N) return;
    grid[r][c] = v ? 1 : 0;
    used[r][c] = 1;
  };
  const finder = (r0, c0) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const on = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setMod(r0 + dr, c0 + dc, on);
      }
    }
  };
  finder(0, 0);
  finder(0, N - 7);
  finder(N - 7, 0);
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      setMod(align + dr, align + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }
  }
  for (let i = 8; i < N - 8; i++) {
    setMod(6, i, i % 2 === 0);
    setMod(i, 6, i % 2 === 0);
  }
  setMod(N - 8, 8, 1);
  // Reservar información de formato.
  for (let i = 0; i < 9; i++) {
    if (i !== 6) { used[8][i] = 1; used[i][8] = 1; }
    if (i < 8) { used[8][N - 1 - i] = 1; used[N - 1 - i][8] = 1; }
  }

  let bitIdx = 0;
  let up = true;
  for (let col = N - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < N; i++) {
      const r = up ? N - 1 - i : i;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (used[r][c]) continue;
        const bit = bitIdx < codewords.length * 8 ? (codewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1 : 0;
        bitIdx++;
        grid[r][c] = bit ^ ((r + c) % 2 === 0 ? 1 : 0);
      }
    }
    up = !up;
  }
  // Formato para nivel L (01) y máscara 0 (000): 0x77c4.
  const fmt = 0x77c4;
  const fPosA = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  const fPosB = [[N - 1, 8], [N - 2, 8], [N - 3, 8], [N - 4, 8], [N - 5, 8], [N - 6, 8], [N - 7, 8], [8, N - 8], [8, N - 7], [8, N - 6], [8, N - 5], [8, N - 4], [8, N - 3], [8, N - 2], [8, N - 1]];
  for (let i = 0; i < 15; i++) {
    const b = (fmt >> i) & 1;
    grid[fPosA[i][0]][fPosA[i][1]] = b;
    grid[fPosB[i][0]][fPosB[i][1]] = b;
  }
  return grid;
}

// "Recuerdo": una estampita vertical (1080x1350) para guardar, imprimir o compartir en historias.
// Papel cálido, papel picado arriba, la foto bajo un arco dorado, el nombre, las fechas, las palabras
// de la familia y una velita con flores de cempasúchil.
export async function drawKeepsake(m, photoSrc, { dates = '', years = '', link = '', qrUrl = '' } = {}) {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  await Promise.all(['italic 600 120px "Cormorant Garamond"', '700 40px Caveat', '700 30px "DM Sans"'].map((f) => document.fonts?.load(f).catch(() => {})));
  // Papel.
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#fbf3e6');
  bg.addColorStop(1, '#f0dcc0');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(120,80,40,${0.02 + rnd() * 0.04})`;
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  // Doble borde.
  g.strokeStyle = '#c9973f';
  g.lineWidth = 6;
  g.strokeRect(34, 34, W - 68, H - 68);
  g.strokeStyle = '#d6246e';
  g.lineWidth = 2;
  g.strokeRect(50, 50, W - 100, H - 100);
  // Papel picado arriba.
  for (let i = 0; i < 9; i++) g.drawImage(papelPicadoTexture(PICADO_COLORS[i % 7], i).image, 60 + i * 107, 46, 107, 107);
  // Foto bajo un arco dorado.
  const ax = W / 2;
  const top = 186;
  const aw = 560;
  const ah = 610;
  const arch = (pad) => {
    g.beginPath();
    g.moveTo(ax - aw / 2 - pad, top + ah + pad);
    g.lineTo(ax - aw / 2 - pad, top + aw / 2);
    g.arc(ax, top + aw / 2, aw / 2 + pad, Math.PI, 0);
    g.lineTo(ax + aw / 2 + pad, top + ah + pad);
    g.closePath();
  };
  g.save();
  g.shadowColor = 'rgba(90,50,20,.35)';
  g.shadowBlur = 40;
  g.shadowOffsetY = 12;
  arch(24);
  g.fillStyle = '#e0b55d';
  g.fill();
  g.restore();
  arch(10);
  g.fillStyle = '#fbefd9';
  g.fill();
  const img = await loadImg(photoSrc);
  if (img) {
    g.save();
    arch(0);
    g.clip();
    const r = Math.max(aw / img.naturalWidth, ah / img.naturalHeight);
    const w = img.naturalWidth * r;
    const h = img.naturalHeight * r;
    g.drawImage(img, ax - w / 2, top - (h - ah) * 0.35, w, h);
    g.restore();
  }
  // Flores de cempasúchil en las esquinas del arco.
  const marigold = (x, y, rr) => {
    for (let k = 3; k >= 1; k--) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + k;
        g.fillStyle = ['#ff7a1a', '#ff9a1f', '#ffcf3a'][k - 1];
        g.beginPath();
        g.ellipse(x + Math.cos(a) * rr * k * 0.3, y + Math.sin(a) * rr * k * 0.3, rr * 0.32, rr * 0.18, a, 0, Math.PI * 2);
        g.fill();
      }
    }
  };
  for (const [x, y, rr] of [[ax - aw / 2 - 20, top + ah + 10, 46], [ax + aw / 2 + 20, top + ah + 10, 46], [ax - aw / 2 + 30, top + ah + 34, 34], [ax + aw / 2 - 30, top + ah + 34, 34]]) marigold(x, y, rr);
  // Textos.
  g.textAlign = 'center';
  g.fillStyle = '#8a4b22';
  g.font = '700 46px Caveat, cursive';
  g.fillText('En memoria de', ax, top + ah + 96);
  let size = 120;
  g.font = `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`;
  while (g.measureText(m.name).width > W - 160 && size > 60) { size -= 6; g.font = `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`; }
  g.fillStyle = '#3b2a22';
  g.fillText(m.name, ax, top + ah + 96 + size * 0.92);
  let y = top + ah + 96 + size * 0.92 + 50;
  g.font = '700 30px "DM Sans", sans-serif';
  g.fillStyle = '#6b5a4c';
  if (dates) { g.fillText(dates, ax, y); y += 42; }
  if (years) { g.fillStyle = '#b5302a'; g.fillText(years, ax, y); y += 42; }
  if (m.message) {
    g.font = 'italic 500 34px "Cormorant Garamond", Georgia, serif';
    g.fillStyle = '#4a3428';
    const words = `“${m.message}”`.split(' ');
    let line = '';
    let lines = 0;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (g.measureText(test).width > W - 220 && line) {
        g.fillText(line, ax, y + 6); y += 40; line = w; lines++;
        if (lines >= 2) { line += '…'; break; }
      } else line = test;
    }
    if (line) g.fillText(line, ax, y + 6);
  }
  // Dos velitas a los costados del pie.
  for (const [vx, col] of [[ax - 380, '#d6246e'], [ax + 380, '#7b2cbf']]) {
    const vy = H - 74;
    g.fillStyle = col;
    g.fillRect(vx - 16, vy - 50, 32, 50);
    g.fillStyle = '#fff3e0';
    g.fillRect(vx - 12, vy - 54, 24, 8);
    const fl = g.createRadialGradient(vx, vy - 74, 2, vx, vy - 74, 34);
    fl.addColorStop(0, 'rgba(255,240,200,1)');
    fl.addColorStop(0.35, 'rgba(255,170,60,.9)');
    fl.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = fl;
    g.beginPath();
    g.ellipse(vx, vy - 74, 16, 28, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.font = '700 24px "DM Sans", sans-serif';
  g.fillStyle = '#8a6a4c';
  g.fillText(`Encendé una huellita${link ? ` · ${link}` : ''}`, ax, H - 62);
  if (qrUrl) {
    const mat = makeQrMatrix(qrUrl);
    const N = mat.length;
    const mod = 4.2;
    const pad = 12;
    const sizeQr = N * mod + pad * 2;
    const qx = W - 76 - sizeQr;
    const qy = H - 76 - sizeQr;
    g.save();
    g.fillStyle = '#fffaf0';
    g.strokeStyle = '#c9973f';
    g.lineWidth = 3;
    roundRect(g, qx, qy, sizeQr, sizeQr, 12);
    g.fill();
    g.stroke();
    g.fillStyle = '#2d1c14';
    for (let r = 0; r < N; r++) {
      for (let col = 0; col < N; col++) {
        if (mat[r][col]) g.fillRect(qx + pad + col * mod, qy + pad + r * mod, Math.ceil(mod), Math.ceil(mod));
      }
    }
    g.restore();
  }
  return c;
}
