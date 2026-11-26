// Texturas dibujadas en canvas: no hace falta descargar imágenes.
import * as THREE from 'three';
import { drawCover } from '../photoTrim.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat, crisp = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  if (crisp) {
    // Sin mipmaps trilineales: evita que los carteles rectangulares caigan a un mipmap bajo y se vean borrosos.
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
  }
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// Re-dibuja los carteles apenas terminan de cargar las tipografías web (Caveat, Young Serif, Nunito).
const fontRedraws = [];
let fontsDone = false;
if (typeof document !== 'undefined' && document.fonts?.ready) {
  document.fonts.ready.then(() => {
    fontsDone = true;
    while (fontRedraws.length) fontRedraws.pop()();
  }).catch(() => { fontsDone = true; });
} else {
  fontsDone = true;
}
function onFontsReady(fn) {
  if (!fontsDone && fontRedraws.length < 120) {
    fontRedraws.push(fn);
  }
}

// Retrato pintado al óleo/acuarela para huellitas sin foto subida (perritos y gatitos detallados en un paisaje suave, sin emojis).
const BREED_PALETTES = [
  // Perritos: dorado, border collie, ovejero, beagle, caniche blanco, chocolate, mestizo canela, negro fuego
  { fur: '#d89b48', furDark: '#9e6420', furLight: '#f4cf8e', muzzle: '#f7e4be', ears: 'down', spots: false, collar: '#c82838' },
  { fur: '#262428', furDark: '#141216', furLight: '#48444c', muzzle: '#f4f0e8', ears: 'up', blaze: true, chest: '#f4f0e8', collar: '#2b72b8' },
  { fur: '#b87638', furDark: '#4a2e18', furLight: '#e0a868', muzzle: '#382418', ears: 'up', saddle: true, collar: '#2e8b57' },
  { fur: '#c47e3a', furDark: '#7a4418', furLight: '#f2eadc', muzzle: '#f5eee2', ears: 'down', blaze: true, patches: '#3a281c', collar: '#b8324f' },
  { fur: '#ede4d4', furDark: '#c4b49c', furLight: '#fbf7f0', muzzle: '#f7f2e8', ears: 'fluffy', curly: true, collar: '#d97a2b' },
  { fur: '#5c3824', furDark: '#382012', furLight: '#85563c', muzzle: '#72462e', ears: 'down', collar: '#d49b2a' },
  { fur: '#d49a64', furDark: '#8c5a30', furLight: '#f0cfa4', muzzle: '#f6e6ce', ears: 'half', blaze: true, collar: '#7b3fb2' },
  { fur: '#282322', furDark: '#141110', furLight: '#463d3a', muzzle: '#b87338', ears: 'up', eyebrows: '#c88040', collar: '#c93b2b' },
];
const CAT_PALETTES = [
  // Gatitos: naranja atigrado, smoking blanco y negro, siamés, gris azulado, calicó, crema
  { fur: '#df8638', furDark: '#9e4e14', furLight: '#f7c488', muzzle: '#f8ebd8', tabby: true, eyes: '#52a448', collar: '#2e86ab' },
  { fur: '#252428', furDark: '#121214', furLight: '#45444a', muzzle: '#f5f2eb', blaze: true, chest: '#f5f2eb', eyes: '#d9a438', collar: '#c82e4b' },
  { fur: '#e8dcc8', furDark: '#523a2c', furLight: '#faf4e8', muzzle: '#463024', mask: true, eyes: '#3b8ed8', collar: '#9b4dca' },
  { fur: '#767c86', furDark: '#4a5058', furLight: '#a4aab4', muzzle: '#8e949e', tabby: true, eyes: '#d49a2a', collar: '#d65a31' },
  { fur: '#f2ece2', furDark: '#c8b8a4', furLight: '#ffffff', muzzle: '#faf6f0', calico: true, eyes: '#5aa852', collar: '#e05282' },
];

export function portraitCanvas(m, size = 512) {
  const W = size;
  const H = Math.round(size * 1.25);
  const [c, g] = canvas(W, H);
  const nameStr = String(m?.name || 'Huellita');
  let hash = (m?.hue ?? 37) | 0;
  for (let i = 0; i < nameStr.length; i++) hash = ((hash * 31) + nameStr.charCodeAt(i)) | 0;
  hash = Math.abs(hash);
  const isCat = m?.species === 'gato' || (!m?.species && hash % 3 === 1);
  const pal = isCat ? CAT_PALETTES[hash % CAT_PALETTES.length] : BREED_PALETTES[hash % BREED_PALETTES.length];
  const bgKind = hash % 4;

  // 1. Paisaje de fondo suave (pradera soleada, cielo de atardecer, jardín con bokeh o colinas).
  const sky = g.createLinearGradient(0, 0, 0, H);
  if (bgKind === 0) {
    sky.addColorStop(0, '#78aed6');
    sky.addColorStop(0.55, '#c2e0ec');
    sky.addColorStop(1, '#76a862');
  } else if (bgKind === 1) {
    sky.addColorStop(0, '#c896b8');
    sky.addColorStop(0.52, '#f0cba8');
    sky.addColorStop(1, '#7ea466');
  } else if (bgKind === 2) {
    sky.addColorStop(0, '#88b8a8');
    sky.addColorStop(0.55, '#dce8cf');
    sky.addColorStop(1, '#689c5a');
  } else {
    sky.addColorStop(0, '#8fa8d6');
    sky.addColorStop(0.55, '#e6d6bc');
    sky.addColorStop(1, '#7ca668');
  }
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // Colinas de pradera desenfocadas y bokeh de luz solar.
  g.fillStyle = 'rgba(92, 145, 76, 0.55)';
  g.beginPath();
  g.moveTo(0, H * 0.64);
  g.bezierCurveTo(W * 0.3, H * 0.55, W * 0.7, H * 0.7, W, H * 0.6);
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.closePath();
  g.fill();

  for (let i = 0; i < 18; i++) {
    const bx = ((i * 97 + hash * 19) % W);
    const by = ((i * 73 + hash * 11) % Math.round(H * 0.75));
    const br = (0.04 + (i % 4) * 0.022) * W;
    const bk = g.createRadialGradient(bx, by, 1, bx, by, br);
    bk.addColorStop(0, 'rgba(255, 250, 230, 0.28)');
    bk.addColorStop(1, 'rgba(255, 250, 230, 0)');
    g.fillStyle = bk;
    g.beginPath();
    g.arc(bx, by, br, 0, Math.PI * 2);
    g.fill();
  }

  const cx = W * 0.5 + ((hash % 5) - 2) * W * 0.012;
  const cy = H * 0.48;
  const R = W * 0.24;

  // Halo cálido detrás de la cabecita.
  const halo = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.9);
  halo.addColorStop(0, 'rgba(255, 248, 225, 0.55)');
  halo.addColorStop(1, 'rgba(255, 248, 225, 0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, W, H);

  // 2. Cuerpo, pecho y hombros.
  const bodyGrad = g.createLinearGradient(cx - R, cy + R * 0.4, cx + R, H);
  bodyGrad.addColorStop(0, pal.furLight);
  bodyGrad.addColorStop(0.5, pal.fur);
  bodyGrad.addColorStop(1, pal.furDark);
  g.fillStyle = bodyGrad;
  g.beginPath();
  g.ellipse(cx, cy + R * 1.55, R * 1.18, R * 1.35, 0, 0, Math.PI * 2);
  g.fill();

  // Pechera blanca o clara.
  g.fillStyle = pal.chest || pal.muzzle;
  g.beginPath();
  g.ellipse(cx, cy + R * 1.35, R * 0.68, R * 0.82, 0, 0, Math.PI * 2);
  g.fill();

  // Collar con medallita dorada.
  g.strokeStyle = pal.collar || '#c82838';
  g.lineWidth = R * 0.16;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(cx, cy + R * 0.58, R * 0.78, 0.22 * Math.PI, 0.78 * Math.PI);
  g.stroke();
  g.fillStyle = '#f2c448';
  g.beginPath();
  g.arc(cx, cy + R * 1.42, R * 0.13, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#9c6e14';
  g.lineWidth = 2;
  g.stroke();

  // 3. Orejas (atrás o a los costados de la cabeza).
  for (const sd of [-1, 1]) {
    g.save();
    if (isCat) {
      g.fillStyle = pal.mask ? pal.furDark : pal.fur;
      g.beginPath();
      g.moveTo(cx + sd * R * 0.34, cy - R * 0.62);
      g.lineTo(cx + sd * R * 0.96, cy - R * 1.38);
      g.lineTo(cx + sd * R * 0.92, cy - R * 0.22);
      g.closePath();
      g.fill();
      g.fillStyle = '#e8a2a8';
      g.beginPath();
      g.moveTo(cx + sd * R * 0.44, cy - R * 0.64);
      g.lineTo(cx + sd * R * 0.84, cy - R * 1.2);
      g.lineTo(cx + sd * R * 0.82, cy - R * 0.32);
      g.closePath();
      g.fill();
    } else if (pal.ears === 'up') {
      g.fillStyle = pal.furDark;
      g.beginPath();
      g.moveTo(cx + sd * R * 0.35, cy - R * 0.65);
      g.quadraticCurveTo(cx + sd * R * 0.95, cy - R * 1.55, cx + sd * R * 1.02, cy - R * 1.35);
      g.quadraticCurveTo(cx + sd * R * 1.05, cy - R * 0.45, cx + sd * R * 0.82, cy - R * 0.18);
      g.closePath();
      g.fill();
      g.fillStyle = '#d8988e';
      g.beginPath();
      g.ellipse(cx + sd * R * 0.72, cy - R * 0.82, R * 0.18, R * 0.36, sd * 0.28, 0, Math.PI * 2);
      g.fill();
    } else {
      // Orejas caídas o suaves.
      g.fillStyle = pal.patches || pal.furDark;
      g.beginPath();
      g.ellipse(cx + sd * R * 0.94, cy + R * 0.05, R * 0.36, R * 0.76, -sd * 0.22, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  // 4. Cabeza con sombreado volumétrico.
  const headGrad = g.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R * 1.08);
  headGrad.addColorStop(0, pal.furLight);
  headGrad.addColorStop(0.65, pal.fur);
  headGrad.addColorStop(1, pal.furDark);
  g.fillStyle = headGrad;
  g.beginPath();
  g.ellipse(cx, cy, R * (isCat ? 0.96 : 0.94), R * (isCat ? 0.88 : 0.92), 0, 0, Math.PI * 2);
  g.fill();

  // Manchitas, antifaz o rayas tabby en la cabeza.
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, R * (isCat ? 0.96 : 0.94), R * (isCat ? 0.88 : 0.92), 0, 0, Math.PI * 2);
  g.clip();
  if (pal.patches || pal.calico) {
    g.fillStyle = pal.patches || '#d87a2e';
    g.beginPath();
    g.arc(cx - R * 0.55, cy - R * 0.25, R * 0.55, 0, Math.PI * 2);
    g.fill();
    if (pal.calico) {
      g.fillStyle = '#2a2422';
      g.beginPath();
      g.arc(cx + R * 0.62, cy - R * 0.35, R * 0.48, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (pal.blaze) {
    g.fillStyle = '#f7f3eb';
    g.beginPath();
    g.ellipse(cx, cy - R * 0.15, R * 0.22, R * 0.72, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (pal.tabby) {
    g.strokeStyle = pal.furDark;
    g.lineWidth = R * 0.08;
    for (const dx of [-0.24, 0, 0.24]) {
      g.beginPath();
      g.moveTo(cx + dx * R, cy - R * 0.78);
      g.lineTo(cx + dx * R * 0.7, cy - R * 0.38);
      g.stroke();
    }
  }
  if (pal.mask) {
    const maskG = g.createRadialGradient(cx, cy + R * 0.18, R * 0.05, cx, cy + R * 0.12, R * 0.68);
    maskG.addColorStop(0, pal.furDark);
    maskG.addColorStop(1, 'rgba(82,58,44,0)');
    g.fillStyle = maskG;
    g.fillRect(cx - R, cy - R, R * 2, R * 2);
  }
  g.restore();

  // 5. Hocico y mejillas.
  const muzY = cy + R * (isCat ? 0.22 : 0.28);
  g.fillStyle = pal.muzzle;
  g.beginPath();
  g.ellipse(cx, muzY, R * (isCat ? 0.44 : 0.52), R * (isCat ? 0.34 : 0.42), 0, 0, Math.PI * 2);
  g.fill();

  // Cejas expresivas.
  if (pal.eyebrows) {
    g.fillStyle = pal.eyebrows;
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.ellipse(cx + sd * R * 0.36, cy - R * 0.3, R * 0.13, R * 0.08, -sd * 0.2, 0, Math.PI * 2);
      g.fill();
    }
  }

  // 6. Ojos brillantes con doble reflejo de vida.
  const eyeColor = pal.eyes || '#5a3418';
  for (const sd of [-1, 1]) {
    const ex = cx + sd * R * 0.38;
    const ey = cy - R * 0.1;
    const er = R * (isCat ? 0.17 : 0.155);
    g.fillStyle = '#181210';
    g.beginPath();
    g.arc(ex, ey, er * 1.12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = eyeColor;
    g.beginPath();
    g.arc(ex, ey, er, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#120d0c';
    g.beginPath();
    if (isCat) g.ellipse(ex, ey, er * 0.42, er * 0.82, 0, 0, Math.PI * 2);
    else g.arc(ex, ey, er * 0.62, 0, Math.PI * 2);
    g.fill();
    // Brillos de luz en la mirada.
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(ex - er * 0.28, ey - er * 0.28, er * 0.28, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(ex + er * 0.25, ey + er * 0.22, er * 0.12, 0, Math.PI * 2);
    g.fill();
  }

  // 7. Nariz húmeda, boquita tierna y bigotes.
  const ny = muzY - R * 0.08;
  g.fillStyle = isCat ? '#d87282' : '#1e1614';
  g.beginPath();
  if (isCat) {
    g.moveTo(cx - R * 0.13, ny - R * 0.05);
    g.lineTo(cx + R * 0.13, ny - R * 0.05);
    g.lineTo(cx, ny + R * 0.11);
    g.closePath();
  } else {
    g.ellipse(cx, ny, R * 0.2, R * 0.15, 0, 0, Math.PI * 2);
  }
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.ellipse(cx - R * 0.05, ny - R * 0.04, R * 0.07, R * 0.035, -0.2, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = 'rgba(40, 24, 18, 0.75)';
  g.lineWidth = R * 0.045;
  g.lineCap = 'round';
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx, ny + R * 0.1);
    g.quadraticCurveTo(cx + sd * R * 0.12, ny + R * 0.26, cx + sd * R * 0.24, ny + R * 0.16);
    g.stroke();
  }
  if (isCat) {
    g.strokeStyle = 'rgba(255, 250, 242, 0.7)';
    g.lineWidth = 2;
    for (const sd of [-1, 1]) {
      for (const wy of [-0.04, 0.04, 0.12]) {
        g.beginPath();
        g.moveTo(cx + sd * R * 0.28, muzY + wy * R);
        g.lineTo(cx + sd * R * 0.95, muzY + (wy - 0.04) * R);
        g.stroke();
      }
    }
  }

  return c;
}

export function portraitTexture(m) {
  return toTexture(portraitCanvas(m, 384), { crisp: true });
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
    // Sin las franjas negras o blancas de las capturas de pantalla.
    drawCover(g, img, 0, 0, c.width, c.height, 0.4);
    tex.image = c;
    tex.needsUpdate = true;
    onReady?.();
  };
  img.src = url;
  return tex;
}

// Un lugar libre de las vitrinas del salón: nicho crema con una velita encendida y una huellita
// dibujada (sin mascota inventada). Tocándolo se suma a una mascota.
let vacantTex;
export function vacantCellTexture() {
  if (vacantTex) return vacantTex;
  const [c, g] = canvas(384, 480);
  const bg = g.createLinearGradient(0, 0, 0, c.height);
  bg.addColorStop(0, '#5a3a5e');
  bg.addColorStop(1, '#2c1a30');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  const glow = g.createRadialGradient(192, 250, 10, 192, 250, 210);
  glow.addColorStop(0, 'rgba(255,186,96,0.55)');
  glow.addColorStop(1, 'rgba(255,186,96,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, c.width, c.height);
  // Huellita de luz detrás de la vela.
  g.fillStyle = 'rgba(255,226,180,0.22)';
  g.beginPath();
  g.ellipse(192, 176, 66, 54, 0, 0, Math.PI * 2);
  for (const [x, y, r] of [[114, 96, 25], [158, 64, 26], [226, 64, 26], [270, 96, 25]]) {
    g.moveTo(x + r, y);
    g.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2);
  }
  g.fill();
  // Velita encendida.
  g.fillStyle = '#fff3e2';
  g.fillRect(170, 268, 44, 110);
  g.fillStyle = 'rgba(120,70,30,0.22)';
  g.fillRect(201, 268, 13, 110);
  const fl = g.createRadialGradient(192, 236, 2, 192, 236, 52);
  fl.addColorStop(0, 'rgba(255,250,220,1)');
  fl.addColorStop(0.35, 'rgba(255,176,64,0.95)');
  fl.addColorStop(1, 'rgba(255,140,40,0)');
  g.fillStyle = fl;
  g.beginPath();
  g.ellipse(192, 230, 24, 44, 0, 0, Math.PI * 2);
  g.fill();
  // "＋" en un círculo: acá puede ir tu mascota.
  g.fillStyle = 'rgba(255,214,150,0.92)';
  g.beginPath();
  g.arc(192, 428, 30, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#4a2a4c';
  g.fillRect(176, 424, 32, 8);
  g.fillRect(188, 412, 8, 32);
  vacantTex = toTexture(c, { crisp: true });
  return vacantTex;
}

let emptyTex;
export function emptySlotTexture() {
  if (emptyTex) return emptyTex;
  const [c, g] = canvas(512, 640);
  g.fillStyle = 'rgba(255,244,228,0.08)';
  g.fillRect(0, 0, c.width, c.height);
  g.setLineDash([28, 20]);
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(255,226,190,0.55)';
  g.strokeRect(24, 24, c.width - 48, c.height - 48);
  g.fillStyle = 'rgba(255,226,190,0.85)';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '300 210px Nunito, sans-serif';
  g.fillText('+', c.width / 2, c.height / 2 - 20);
  g.font = '700 48px Nunito, sans-serif';
  g.fillText('Lugar libre', c.width / 2, c.height / 2 + 124);
  emptyTex = toTexture(c, { crisp: true });
  return emptyTex;
}

export function labelTexture(text, { w = 512, h = 96, bg = 'rgba(250,240,226,0.95)', fg = '#4a3428', font = '700 50px Caveat, cursive' } = {}) {
  const S = 2;
  const [c, g] = canvas(w * S, h * S);
  const draw = () => {
    g.setTransform(S, 0, 0, S, 0, 0);
    g.clearRect(0, 0, w, h);
    if (bg && bg !== 'rgba(0,0,0,0)' && bg !== 'transparent') {
      g.fillStyle = bg;
      roundRect(g, 4, 4, w - 8, h - 8, 18);
      g.fill();
      g.strokeStyle = 'rgba(235, 195, 130, 0.28)';
      g.lineWidth = 2.5;
      roundRect(g, 7, 7, w - 14, h - 14, 15);
      g.stroke();
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = font;
    // Filete de contraste para que las letras se lean con nitidez perfecta y sin halo de bloom.
    const lightText = fg.startsWith('#f') || fg.startsWith('#e') || fg.startsWith('rgb(2');
    g.lineJoin = 'round';
    g.miterLimit = 2;
    g.strokeStyle = lightText ? 'rgba(22, 11, 5, 0.82)' : 'rgba(255, 245, 225, 0.65)';
    g.lineWidth = lightText ? 4.5 : 3;
    g.strokeText(text, w / 2, h / 2 + 2, w - 28);
    // Bajamos apenas el brillo máximo del texto claro para que el bloom no lo vuelva borroso.
    g.fillStyle = fg === '#f6e3c4' ? '#ecd4ae' : fg;
    g.fillText(text, w / 2, h / 2 + 2, w - 28);
  };
  draw();
  const t = toTexture(c, { crisp: true });
  onFontsReady(() => { draw(); t.needsUpdate = true; });
  return t;
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
  const S = 2;
  const [c, g] = canvas(w * S, h * S);
  const draw = () => {
    g.setTransform(S, 0, 0, S, 0, 0);
    g.clearRect(0, 0, w, h);
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
  };
  draw();
  const t = toTexture(c, { crisp: true });
  t.userData = { aspect: w / h };
  onFontsReady(() => { draw(); t.needsUpdate = true; });
  return t;
}

// Pizarrón de bienvenida escrito con tiza.
export function chalkboardTexture(lines) {
  const S = 2;
  const [c, g] = canvas(512 * S, 384 * S);
  const draw = () => {
    g.setTransform(S, 0, 0, S, 0, 0);
    g.fillStyle = '#253029';
    g.fillRect(0, 0, 512, 384);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
      g.fillRect(Math.random() * 512, Math.random() * 384, 30 * Math.random(), 2);
    }
    g.strokeStyle = '#7a5434';
    g.lineWidth = 22;
    g.strokeRect(0, 0, 512, 384);
    g.textAlign = 'center';
    g.lineJoin = 'round';
    lines.forEach(([text, size, y]) => {
      g.font = `700 ${size}px Caveat, cursive`;
      g.strokeStyle = 'rgba(12, 18, 14, 0.85)';
      g.lineWidth = 4;
      g.strokeText(text, 256, y);
      g.fillStyle = '#e8dec8';
      g.fillText(text, 256, y);
    });
  };
  draw();
  const t = toTexture(c, { crisp: true });
  onFontsReady(() => { draw(); t.needsUpdate = true; });
  return t;
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
