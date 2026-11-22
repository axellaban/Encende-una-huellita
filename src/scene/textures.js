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
  t.anisotropy = 4;
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
  g.font = `600 ${Math.round(size * 0.12)}px Lora, Georgia, serif`;
  g.fillText(m.name, c.width / 2, c.height * 0.82, c.width * 0.9);
  return c;
}

export function portraitTexture(m) {
  return toTexture(portraitCanvas(m));
}

// Foto real: la recortamos a 4:5 en un canvas para que no se deforme en el marco.
export function photoTexture(url, onReady) {
  const tex = new THREE.Texture();
  tex.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const [c, g] = canvas(384, 480);
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

export function labelTexture(text, { w = 512, h = 96, bg = 'rgba(250,240,226,0.95)', fg = '#4a3428', font = '600 44px Lora, Georgia, serif' } = {}) {
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
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#4d6b3c';
  g.fillRect(0, 0, 256, 256);
  noise(g, 256, 256, ['#56763f', '#45603a', '#5c7d45', '#3f5a34'], 1800, 4);
  return toTexture(c, { repeat: [40, 40] });
}

export function woodTexture(base = '#6b4630') {
  const [c, g] = canvas(256, 256);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) {
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(x, 0, 2, 256);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,220,180' : '30,15,5'},0.06)`;
      g.fillRect(x + 3 + Math.random() * 26, 0, 1 + Math.random() * 2, 256);
    }
  }
  return toTexture(c, { repeat: [1, 1] });
}

export function stoneTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#7a7068';
  g.fillRect(0, 0, 256, 256);
  const s = 64;
  for (let y = 0; y < 256; y += s / 2) {
    const off = (y / (s / 2)) % 2 ? s / 2 : 0;
    for (let x = -s; x < 256; x += s) {
      const l = 52 + Math.random() * 12;
      g.fillStyle = `hsl(28 10% ${l}%)`;
      roundRect(g, x + off + 2, y + 2, s - 4, s / 2 - 4, 6);
      g.fill();
    }
  }
  return toTexture(c, { repeat: [1, 6] });
}

export function floorTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#8a6448';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(0, y, 256, 2);
    const off = (y / 32) % 2 ? 64 : 0;
    for (let x = off; x < 256 + 128; x += 128) g.fillRect(x, y, 2, 32);
  }
  noise(g, 256, 256, ['rgba(255,220,180,0.05)', 'rgba(0,0,0,0.05)'], 600, 3);
  return toTexture(c, { repeat: [6, 6] });
}
