// Texturas dibujadas en canvas: no hace falta descargar imágenes.
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

const EMOJI = { perro: '🐶', gato: '🐱', otro: '🐾' };

// Retrato ilustrado para huellitas sin foto.
export function portraitCanvas(m, size = 384) {
  const [c, g] = canvas(size, Math.round(size * 1.25));
  const hue = m.hue ?? 30;
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, `hsl(${hue} 55% 82%)`);
  grad.addColorStop(1, `hsl(${(hue + 30) % 360} 45% 62%)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  // Halo suave.
  const halo = g.createRadialGradient(c.width / 2, c.height * 0.42, 10, c.width / 2, c.height * 0.42, c.width * 0.6);
  halo.addColorStop(0, 'rgba(255,250,235,0.8)');
  halo.addColorStop(1, 'rgba(255,250,235,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, c.width, c.height);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `${Math.round(size * 0.45)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  g.fillText(EMOJI[m.species] || '🐾', c.width / 2, c.height * 0.43);
  g.fillStyle = 'rgba(40,28,24,0.85)';
  g.font = `700 ${Math.round(size * 0.15)}px Caveat, cursive`;
  g.fillText(m.name, c.width / 2, c.height * 0.82, c.width * 0.9);
  return c;
}

export function portraitTexture(m) {
  return toTexture(portraitCanvas(m));
}

// Foto real: la recortamos a 4:5 en un canvas de alta definición para que se vea bien nítida en el marco.
export function photoTexture(url, onReady) {
  const tex = new THREE.Texture();
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const [c, g] = canvas(768, 960);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    const r = Math.max(c.width / img.width, c.height / img.height);
    const w = img.width * r;
    const h = img.height * r;
    g.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
    tex.image = c;
    tex.needsUpdate = true;
    onReady?.();
  };
  img.src = url;
  return tex;
}

let emptyTex;
export function emptySlotTexture() {
  if (emptyTex) return emptyTex;
  const [c, g] = canvas(256, 320);
  g.fillStyle = 'rgba(255,244,228,0.08)';
  g.fillRect(0, 0, c.width, c.height);
  g.setLineDash([14, 10]);
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(255,226,190,0.55)';
  g.strokeRect(12, 12, c.width - 24, c.height - 24);
  g.fillStyle = 'rgba(255,226,190,0.8)';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '300 110px Nunito, sans-serif';
  g.fillText('+', c.width / 2, c.height / 2 - 10);
  g.font = '700 24px Nunito, sans-serif';
  g.fillText('Lugar libre', c.width / 2, c.height / 2 + 62);
  emptyTex = toTexture(c);
  return emptyTex;
}

export function labelTexture(text, { w = 512, h = 96, bg = 'rgba(250,240,226,0.95)', fg = '#4a3428', font = '700 50px Caveat, cursive' } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg;
  roundRect(g, 4, 4, w - 8, h - 8, 18);
  g.fill();
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = font;
  g.fillText(text, w / 2, h / 2 + 2, w - 30);
  return toTexture(c);
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

let glowTex;
export function glowTexture() {
  if (glowTex) return glowTex;
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,240,200,1)');
  grad.addColorStop(0.25, 'rgba(255,200,120,0.55)');
  grad.addColorStop(1, 'rgba(255,170,80,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = toTexture(c);
  return glowTex;
}

let flameTex;
export function flameTexture() {
  if (flameTex) return flameTex;
  const [c, g] = canvas(64, 128);
  const grad = g.createRadialGradient(32, 84, 2, 32, 76, 40);
  grad.addColorStop(0, 'rgba(255,255,235,1)');
  grad.addColorStop(0.35, 'rgba(255,205,90,0.95)');
  grad.addColorStop(0.7, 'rgba(255,120,30,0.5)');
  grad.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(32, 6);
  g.bezierCurveTo(58, 52, 56, 118, 32, 120);
  g.bezierCurveTo(8, 118, 6, 52, 32, 6);
  g.fill();
  flameTex = toTexture(c);
  return flameTex;
}

function noise(g, w, h, colors, n, size) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[(Math.random() * colors.length) | 0];
    const s = size * (0.5 + Math.random());
    g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
}

export function grassTexture() {
  const [c, g] = canvas(512, 512);
  const bg = g.createRadialGradient(256, 256, 40, 256, 256, 360);
  bg.addColorStop(0, '#4a6b38');
  bg.addColorStop(0.5, '#3f5d30');
  bg.addColorStop(1, '#466536');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 512);
  // Manchones suaves de musgo y trébol.
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 18 + Math.random() * 36;
    const gr = g.createRadialGradient(x, y, 2, x, y, r);
    gr.addColorStop(0, i % 3 === 0 ? 'rgba(98,136,68,0.22)' : 'rgba(34,54,26,0.22)');
    gr.addColorStop(1, 'rgba(60,90,45,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  noise(g, 512, 512, ['#56783f', '#425e34', '#608448', '#38522c', '#6e9450'], 4200, 3.5);
  // Brizna pintada a mano y puntitos de polen dorado.
  g.lineWidth = 1.6;
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    g.strokeStyle = i % 5 === 0 ? 'rgba(170,205,110,0.28)' : 'rgba(32,48,22,0.26)';
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + (Math.random() - 0.5) * 6, y - 5, x + (Math.random() - 0.5) * 10, y - 9 - Math.random() * 6);
    g.stroke();
  }
  return toTexture(c, { repeat: [40, 40] });
}

export function woodTexture(base = '#6b4630') {
  const [c, g] = canvas(512, 512);
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) {
    // Sombra y bisel entre tablas.
    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.fillRect(x, 0, 3, 512);
    g.fillStyle = 'rgba(255,225,185,0.1)';
    g.fillRect(x + 3, 0, 2, 512);
    // Vetas orgánicas curvas.
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,224,185' : '25,12,4'},${0.04 + Math.random() * 0.06})`;
      g.lineWidth = 1 + Math.random() * 2.5;
      const vx = x + 6 + Math.random() * 52;
      g.beginPath();
      g.moveTo(vx, 0);
      g.bezierCurveTo(vx + (Math.random() - 0.5) * 14, 170, vx + (Math.random() - 0.5) * 14, 340, vx, 512);
      g.stroke();
    }
  }
  return toTexture(c, { repeat: [1, 1] });
}

export function stoneTexture() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#483f3a';
  g.fillRect(0, 0, 512, 512);
  // Junta de mortero con musgo sutil.
  noise(g, 512, 512, ['#3e3631', '#524942', '#3f4c36'], 1400, 3);
  const s = 128;
  for (let y = 0; y < 512; y += s / 2) {
    const off = (y / (s / 2)) % 2 ? s / 2 : 0;
    for (let x = -s; x < 512; x += s) {
      const l = 49 + Math.random() * 13;
      const h = 24 + (Math.random() - 0.5) * 12;
      const sx = x + off + 4;
      const sy = y + 4;
      const sw = s - 8;
      const sh = s / 2 - 8;
      // Sombra inferior de la laja.
      g.fillStyle = 'rgba(18,12,10,0.45)';
      roundRect(g, sx + 2, sy + 3, sw, sh, 12);
      g.fill();
      // Cuerpo de la piedra con degradé cálido.
      const gr = g.createLinearGradient(sx, sy, sx + sw, sy + sh);
      gr.addColorStop(0, `hsl(${h} 14% ${l + 6}%)`);
      gr.addColorStop(1, `hsl(${h} 11% ${l - 5}%)`);
      g.fillStyle = gr;
      roundRect(g, sx, sy, sw, sh, 12);
      g.fill();
      // Bisel iluminado arriba.
      g.strokeStyle = 'rgba(255,235,205,0.22)';
      g.lineWidth = 2;
      roundRect(g, sx + 1, sy + 1, sw - 2, sh - 2, 11);
      g.stroke();
    }
  }
  noise(g, 512, 512, ['rgba(255,235,200,0.06)', 'rgba(20,12,8,0.08)'], 1800, 2.5);
  return toTexture(c, { repeat: [1, 6] });
}

export function floorTexture() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#7d563a';
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    const off = (y / 64) % 2 ? 128 : 0;
    for (let x = -128; x < 512; x += 256) {
      const px = x + off;
      const tone = 42 + ((px * 7 + y * 13) % 9);
      const gr = g.createLinearGradient(0, y, 0, y + 64);
      gr.addColorStop(0, `hsl(25 38% ${tone + 4}%)`);
      gr.addColorStop(0.5, `hsl(24 36% ${tone}%)`);
      gr.addColorStop(1, `hsl(23 38% ${tone - 4}%)`);
      g.fillStyle = gr;
      g.fillRect(px, y, 256, 64);
      // Vetas finas de la madera a lo largo del tablón.
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = k % 2 ? 'rgba(255,220,175,0.06)' : 'rgba(25,10,2,0.08)';
        g.lineWidth = 1.2 + (k % 3) * 0.6;
        const vy = y + 6 + k * 4;
        g.beginPath();
        g.moveTo(px, vy);
        g.bezierCurveTo(px + 80, vy + Math.sin(k) * 4, px + 170, vy - Math.sin(k) * 4, px + 256, vy);
        g.stroke();
      }
      // Clavitos de bronce en las puntas del tablón.
      g.fillStyle = 'rgba(220,175,95,0.45)';
      for (const dy of [14, 50]) {
        g.beginPath(); g.arc(px + 10, y + dy, 2.2, 0, Math.PI * 2); g.arc(px + 246, y + dy, 2.2, 0, Math.PI * 2); g.fill();
      }
    }
    g.fillStyle = 'rgba(15,6,2,0.36)';
    g.fillRect(0, y, 512, 3);
    g.fillStyle = 'rgba(255,224,180,0.12)';
    g.fillRect(0, y + 3, 512, 1.5);
    for (let x = off; x < 512 + 256; x += 256) {
      g.fillStyle = 'rgba(15,6,2,0.34)';
      g.fillRect(x, y, 3, 64);
    }
  }
  return toTexture(c, { repeat: [6, 6] });
}

let blobTex;
// Sombra de contacto suave para apoyar objetos en el piso.
export function blobShadowTexture() {
  if (blobTex) return blobTex;
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  blobTex = toTexture(c);
  return blobTex;
}

let coneTex;
// Haz de luz de un aplique sobre el muro (de arriba hacia abajo).
export function lightConeTexture() {
  if (coneTex) return coneTex;
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, -40, 10, 128, -40, 300);
  grad.addColorStop(0, 'rgba(255,214,160,0.9)');
  grad.addColorStop(0.45, 'rgba(255,190,120,0.35)');
  grad.addColorStop(1, 'rgba(255,170,90,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  coneTex = toTexture(c);
  return coneTex;
}

let moonTex;
export function moonTexture() {
  if (moonTex) return moonTex;
  const [c, g] = canvas(512, 512);
  const halo = g.createRadialGradient(256, 256, 56, 256, 256, 256);
  halo.addColorStop(0, 'rgba(255,248,228,0.62)');
  halo.addColorStop(0.45, 'rgba(255,232,195,0.22)');
  halo.addColorStop(1, 'rgba(255,248,230,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, 512, 512);
  const disk = g.createRadialGradient(236, 232, 10, 256, 256, 76);
  disk.addColorStop(0, '#fffef8');
  disk.addColorStop(0.7, '#f8efd9');
  disk.addColorStop(1, '#e8dcc0');
  g.fillStyle = disk;
  g.beginPath();
  g.arc(256, 256, 74, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(185,168,142,0.32)';
  for (const [x, y, r] of [[232, 236, 16], [280, 272, 13], [260, 212, 9], [224, 280, 11], [248, 254, 7], [272, 240, 6]]) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  moonTex = toTexture(c);
  return moonTex;
}

let paperTex;
// Papel del farolito: más claro en el centro, como si la luz atravesara.
export function lanternTexture() {
  if (paperTex) return paperTex;
  // Papel de seda en alta definición con dibujos calados donde brilla la vela interior.
  const [c, g] = canvas(256, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#e88d4f');
  grad.addColorStop(0.28, '#ffbe73');
  grad.addColorStop(0.5, '#ffe6b3');
  grad.addColorStop(0.72, '#ffbe73');
  grad.addColorStop(1, '#e08243');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 512);
  // Resplandor central de la vela sobre la seda.
  const core = g.createRadialGradient(128, 256, 12, 128, 256, 190);
  core.addColorStop(0, 'rgba(255,250,225,0.48)');
  core.addColorStop(1, 'rgba(255,210,140,0)');
  g.fillStyle = core;
  g.fillRect(0, 0, 256, 512);
  // Bandas arriba y abajo con filete dorado.
  g.fillStyle = 'rgba(115,40,18,0.52)';
  g.fillRect(0, 0, 256, 36);
  g.fillRect(0, 476, 256, 36);
  g.fillStyle = 'rgba(255,220,140,0.45)';
  g.fillRect(0, 34, 256, 3);
  g.fillRect(0, 475, 256, 3);
  // Calados artesanales: flores, rombos y puntitos luminosos.
  g.fillStyle = '#fff7e2';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const x = 64 + col * 128 + (row % 2) * 64;
      const y = 120 + row * 136;
      if (row === 1) {
        g.beginPath(); g.moveTo(x, y - 36); g.lineTo(x + 28, y); g.lineTo(x, y + 36); g.lineTo(x - 28, y); g.closePath(); g.fill();
      } else {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          g.beginPath(); g.ellipse(x + Math.cos(a) * 20, y + Math.sin(a) * 20, 14, 9, a, 0, Math.PI * 2); g.fill();
        }
        g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill();
      }
    }
  }
  for (let x = 16; x < 256; x += 32) {
    g.beginPath(); g.arc(x, 56, 5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x, 456, 5, 0, Math.PI * 2); g.fill();
  }
  // Costillas del armazón de bambú.
  g.fillStyle = 'rgba(110,40,15,0.34)';
  for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 5, 512);
  for (let y = 128; y < 512; y += 128) g.fillRect(0, y, 256, 2.5);
  paperTex = toTexture(c);
  return paperTex;
}

const emojiCache = new Map();
// Un emoji como textura (para regalitos, gestos y burbujas).
export function emojiTexture(ch, size = 128) {
  const k = `${ch}:${size}`;
  if (emojiCache.has(k)) return emojiCache.get(k);
  const [c, g] = canvas(size, size);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `${Math.round(size * 0.78)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  g.fillText(ch, size / 2, size / 2 + size * 0.05);
  const t = toTexture(c);
  emojiCache.set(k, t);
  return t;
}

// Globito de texto o cartelito de nombre sobre la cabeza.
export function bubbleTexture(text, { bg = 'rgba(251,244,234,0.96)', fg = '#3b2a22', font = '800 34px Nunito, sans-serif', tail = true } = {}) {
  const [m, mg] = canvas(8, 8);
  mg.font = font;
  const w = Math.min(560, Math.ceil(mg.measureText(text).width) + 44);
  void m;
  const h = tail ? 76 : 60;
  const [c, g] = canvas(w, h);
  g.fillStyle = bg;
  roundRect(g, 2, 2, w - 4, 56, 26);
  g.fill();
  if (tail) {
    g.beginPath();
    g.moveTo(w / 2 - 10, 56);
    g.lineTo(w / 2, 72);
    g.lineTo(w / 2 + 10, 56);
    g.fill();
  }
  g.fillStyle = fg;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, 31, w - 24);
  const t = toTexture(c);
  t.userData = { aspect: w / h };
  return t;
}

// Pizarrón de bienvenida escrito con tiza.
export function chalkboardTexture(lines) {
  const [c, g] = canvas(512, 384);
  g.fillStyle = '#2f3a33';
  g.fillRect(0, 0, 512, 384);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    g.fillRect(Math.random() * 512, Math.random() * 384, 30 * Math.random(), 2);
  }
  g.strokeStyle = '#7a5434';
  g.lineWidth = 22;
  g.strokeRect(0, 0, 512, 384);
  g.fillStyle = 'rgba(250,244,230,0.92)';
  g.textAlign = 'center';
  lines.forEach(([text, size, y]) => {
    g.font = `700 ${size}px Caveat, cursive`;
    g.fillText(text, 256, y);
  });
  return toTexture(c);
}

let pawTex;
// Huellita para el camino.
export function pawTexture() {
  if (pawTex) return pawTex;
  const [c, g] = canvas(128, 128);
  g.fillStyle = 'rgba(60,40,30,0.55)';
  const blob = (x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
  blob(64, 82, 26, 21);
  blob(30, 52, 10, 13, -0.3);
  blob(98, 52, 10, 13, 0.3);
  blob(48, 32, 10, 13, -0.1);
  blob(80, 32, 10, 13, 0.1);
  pawTex = toTexture(c);
  return pawTex;
}

// Cartel que se lee bien de los dos lados (con DoubleSide, de atrás el texto se ve al revés).
export function twoSided(geo, mat) {
  mat.side = THREE.FrontSide;
  const g = new THREE.Group();
  const back = new THREE.Mesh(geo, mat);
  back.rotation.y = Math.PI;
  g.add(new THREE.Mesh(geo, mat), back);
  return g;
}
