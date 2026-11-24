// Estética de Día de Muertos (tradición mexicana): papel picado, cempasúchil, ofrenda escalonada,
// calaveritas de azúcar, pan de muerto, veladoras, camino de pétalos y un pueblito iluminado.
// Todo dibujado/generado acá, sin modelos ni imágenes de terceros.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const PALETTE = {
  cempasuchil: '#ff9a1f',
  naranja: '#ff7a1a',
  amarillo: '#ffcf3a',
  rosa: '#e4167c',
  morado: '#7b2cbf',
  turquesa: '#14b3b0',
  verde: '#2bb673',
  azul: '#2f6fd6',
  crema: '#fbefd9',
};
export const PICADO_COLORS = [PALETTE.rosa, PALETTE.naranja, PALETTE.morado, PALETTE.verde, PALETTE.turquesa, PALETTE.amarillo, PALETTE.azul];

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// ---------- texturas ----------
const picadoCache = new Map();
// Papel picado: banderita de papel con UN recorte grande y limpio en el medio (flor, huellita,
// calaverita o corazón), una fila de agujeritos arriba y flecos abajo. Antes tenía muchos recortes
// chiquitos que de lejos se mezclaban y no se entendía el dibujo.
export function papelPicadoTexture(color, variant = 0) {
  const k = `${color}:${variant % 4}`;
  if (picadoCache.has(k)) return picadoCache.get(k);
  const [c, g] = canvas(512, 600);
  g.scale(2, 2); // se dibuja en 256x300 con el doble de resolución (bordes nítidos)
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 300);
  g.globalCompositeOperation = 'destination-out';
  // Flecos de abajo.
  for (let x = 0; x < 256; x += 21.33) {
    g.beginPath();
    g.moveTo(x, 300);
    g.lineTo(x + 10.66, 270);
    g.lineTo(x + 21.33, 300);
    g.fill();
  }
  // Fila de agujeritos arriba (donde se dobla sobre el hilo) y una guarda de rombitos abajo.
  for (let x = 20; x < 250; x += 27) { g.beginPath(); g.arc(x, 20, 5, 0, Math.PI * 2); g.fill(); }
  for (let x = 24; x < 240; x += 26) { g.beginPath(); g.moveTo(x, 246); g.lineTo(x + 7, 254); g.lineTo(x, 262); g.lineTo(x - 7, 254); g.fill(); }
  const v = variant % 4;
  g.save();
  g.translate(128, 140);
  if (v === 0) {
    // Flor: 6 pétalos separados por puentes de papel y el centro de papel con un agujero.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      g.beginPath();
      g.ellipse(Math.cos(a) * 52, Math.sin(a) * 52, 30, 17, a, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.fill();
  } else if (v === 1) {
    // Huellita: almohadilla grande y cuatro deditos, con papel entre medio.
    g.beginPath();
    g.moveTo(0, -4);
    g.bezierCurveTo(34, -8, 56, 30, 40, 52);
    g.bezierCurveTo(26, 70, -26, 70, -40, 52);
    g.bezierCurveTo(-56, 30, -34, -8, 0, -4);
    g.fill();
    for (const [dx, dy, rot] of [[-62, -24, -0.45], [-24, -64, -0.15], [24, -64, 0.15], [62, -24, 0.45]]) {
      g.beginPath(); g.ellipse(dx, dy, 17, 23, rot, 0, Math.PI * 2); g.fill();
    }
  } else if (v === 2) {
    // Calaverita: la cabeza recortada y los ojos, la nariz y los dientes de papel.
    g.beginPath(); g.arc(0, -10, 66, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.roundRect?.(-34, 40, 68, 34, 10); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = color;
    g.beginPath(); g.arc(-25, -14, 19, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(25, -14, 19, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(0, 6); g.lineTo(-10, 26); g.lineTo(10, 26); g.closePath(); g.fill();
    for (let i = -2; i <= 2; i++) g.fillRect(i * 13 - 2.5, 40, 5, 34);
    g.fillRect(-36, 54, 72, 5);
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(-25, -14, 7, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(25, -14, 7, 0, Math.PI * 2); g.fill();
  } else {
    // Corazón grande con un corazoncito de papel adentro.
    const heart = (s) => {
      g.beginPath();
      g.moveTo(0, 70 * s);
      g.bezierCurveTo(-100 * s, 0, -46 * s, -86 * s, 0, -34 * s);
      g.bezierCurveTo(46 * s, -86 * s, 100 * s, 0, 0, 70 * s);
      g.fill();
    };
    heart(1);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = color;
    heart(0.42);
  }
  g.restore();
  g.globalCompositeOperation = 'source-over';
  const t = tex(c);
  picadoCache.set(k, t);
  return t;
}

let talaTex;
// Azulejo de talavera poblana en alta definición.
export function talaveraTexture() {
  if (talaTex) return talaTex;
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#faf3e4';
  g.fillRect(0, 0, 256, 256);
  // Borde azul cobalto doble con guarda punteada.
  g.strokeStyle = '#1b4a9c';
  g.lineWidth = 8;
  g.strokeRect(4, 4, 248, 248);
  g.lineWidth = 2.5;
  g.strokeRect(16, 16, 224, 224);
  // Pétalos diagonales y axiales estilo cerámica artesanal.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const diag = i % 2 === 1;
    g.fillStyle = diag ? '#1b4a9c' : '#2a64c2';
    g.beginPath();
    g.ellipse(128 + Math.cos(a) * (diag ? 54 : 42), 128 + Math.sin(a) * (diag ? 54 : 42), diag ? 34 : 24, diag ? 15 : 11, a, 0, Math.PI * 2);
    g.fill();
  }
  // Centro dorado y terracota.
  g.fillStyle = '#d96b27';
  g.beginPath(); g.arc(128, 128, 26, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f5be2b';
  g.beginPath(); g.arc(128, 128, 17, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#faf3e4';
  g.beginPath(); g.arc(128, 128, 7, 0, Math.PI * 2); g.fill();
  // Esquinas florales que se unen al repetir el azulejo.
  for (const [x, y] of [[16, 16], [240, 16], [16, 240], [240, 240]]) {
    g.fillStyle = '#f5be2b';
    g.beginPath(); g.arc(x, y, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1b4a9c';
    g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill();
  }
  talaTex = tex(c, [1, 1]);
  return talaTex;
}

const skullCache = new Map();
// Cara de calaverita de azúcar en alta definición (para visitantes y la ofrenda).
export function calaveraTexture(hue = 330) {
  const k = Math.round(hue / 30) * 30;
  if (skullCache.has(k)) return skullCache.get(k);
  const [c, g] = canvas(512, 512);
  const bg = g.createRadialGradient(256, 230, 30, 256, 256, 260);
  bg.addColorStop(0, '#fffaf0');
  bg.addColorStop(1, '#f4e6d0');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 512);
  const col = `hsl(${k} 78% 54%)`;
  const col2 = `hsl(${(k + 140) % 360} 72% 48%)`;
  // Ojos: coronas de pétalos festoneados con borde dorado y doble brillo en la pupila.
  for (const x of [176, 336]) {
    g.fillStyle = col;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.beginPath(); g.ellipse(x + Math.cos(a) * 52, 220 + Math.sin(a) * 52, 21, 13, a, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = '#e6a832';
    g.lineWidth = 4;
    g.beginPath(); g.arc(x, 220, 43, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#231528';
    g.beginPath(); g.arc(x, 220, 39, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(x - 12, 208, 10, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x + 11, 231, 4.5, 0, Math.PI * 2); g.fill();
  }
  // Nariz de corazón invertido.
  g.fillStyle = '#231528';
  g.beginPath();
  g.moveTo(256, 324);
  g.bezierCurveTo(224, 300, 232, 272, 256, 288);
  g.bezierCurveTo(280, 272, 288, 300, 256, 324);
  g.fill();
  // Sonrisa bordada con arabescos en las comisuras.
  g.strokeStyle = '#231528';
  g.lineWidth = 7.5;
  g.lineCap = 'round';
  g.beginPath(); g.arc(256, 320, 84, 0.24 * Math.PI, 0.76 * Math.PI); g.stroke();
  for (let i = -3; i <= 3; i++) {
    const a = Math.PI / 2 + i * 0.11;
    const x = 256 + Math.cos(a) * 84;
    const y = 320 + Math.sin(a) * 84;
    g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x, y + 14); g.stroke();
  }
  // Flor de cempasúchil y filigrana en la frente.
  g.fillStyle = col2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath(); g.arc(256 + Math.cos(a) * 24, 104 + Math.sin(a) * 24, 13, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = PALETTE.amarillo;
  g.beginPath(); g.arc(256, 104, 14, 0, Math.PI * 2); g.fill();
  g.fillStyle = col;
  for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(140 + i * 38, 392 + Math.sin(i) * 6, 7, 0, Math.PI * 2); g.fill(); }
  const t = tex(c);
  skullCache.set(k, t);
  return t;
}

const paintCache = new Map();
// Muro artesanal pintado con textura de estuco cálido, tablones y sombreado vertical.
export function paintedWallTexture(color) {
  if (paintCache.has(color)) return paintCache.get(color);
  const [c, g] = canvas(512, 512);
  g.fillStyle = color;
  g.fillRect(0, 0, 512, 512);
  const shade = g.createLinearGradient(0, 0, 0, 512);
  shade.addColorStop(0, 'rgba(255,235,200,0.12)');
  shade.addColorStop(0.5, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(15,5,10,0.24)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) {
    g.fillStyle = 'rgba(0,0,0,0.14)';
    g.fillRect(x, 0, 3, 512);
    g.fillStyle = 'rgba(255,240,215,0.08)';
    g.fillRect(x + 3, 0, 2, 512);
    for (let i = 0; i < 10; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      g.fillRect(x + 5 + Math.random() * 52, 0, 1.5 + Math.random() * 3, 512);
    }
  }
  for (let i = 0; i < 550; i++) {
    g.fillStyle = `rgba(255,240,220,${Math.random() * 0.055})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 18, 2.5);
  }
  const t = tex(c);
  paintCache.set(color, t);
  return t;
}

// ---------- geometrías ----------
// Flor de cempasúchil: un pompón de pétalos en capas (los de afuera abiertos, los de adentro
// parados), oscuros en la base y claros en la punta. Antes era una bola facetada y de cerca parecía
// una piedra. Pocas caras (≈115): se usa por miles.
const MARIGOLD_LAYERS = [
  // [pétalos, largo, elevación (rad), radio de la base, altura de la base]
  [12, 0.88, 0.22, 0.18, -0.2],
  [11, 0.8, 0.6, 0.14, -0.06],
  [9, 0.66, 0.98, 0.09, 0.08],
  [6, 0.46, 1.35, 0.03, 0.22],
];
export function marigoldGeometry(r = 0.1, color = PALETTE.cempasuchil, rnd = Math.random) {
  const pos = [];
  const col = [];
  const base = new THREE.Color(color);
  const push = (p, k) => {
    pos.push(p[0], p[1], p[2]);
    col.push(base.r * k, base.g * k, base.b * k);
  };
  for (const [n, len, elev, b0, y0] of MARIGOLD_LAYERS) {
    const off = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
      const e = elev + (rnd() - 0.5) * 0.35;
      const L = r * len * (0.85 + rnd() * 0.3);
      const w = L * 0.78;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const dx = ca * Math.cos(e);
      const dy = Math.sin(e);
      const dz = sa * Math.cos(e);
      const ox = ca * r * b0;
      const oy = r * y0;
      const oz = sa * r * b0;
      // Un punto del pétalo: t a lo largo, s de costado, curl hacia abajo (la punta rizada).
      const P = (t, s, curl = 0) => [ox + dx * L * t - sa * w * s, oy + dy * L * t - curl * r, oz + dz * L * t + ca * w * s];
      const bl = P(0, -0.2);
      const br = P(0, 0.2);
      const ml = P(0.6, -0.5, -0.04);
      const mr = P(0.6, 0.5, -0.04);
      const tip = P(1, (rnd() - 0.5) * 0.3, 0.06);
      const j = 0.9 + rnd() * 0.2;
      const kb = 0.4 * j;
      const km = 0.82 * j;
      const kt = 1.08 * j;
      push(bl, kb); push(br, kb); push(mr, km);
      push(bl, kb); push(mr, km); push(ml, km);
      push(ml, km); push(mr, km); push(tip, kt);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export function marigoldMaterial() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, emissive: '#752d00', emissiveIntensity: 0.62 });
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float rimM = 1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
       totalEmissiveRadiance += diffuseColor.rgb * (rimM * rimM * 0.45);`,
    );
  };
  mat.customProgramCacheKey = () => 'marigold-velvet-1';
  return mat;
}

// Muchas flores en un solo dibujo (para guirnaldas, arcos y macetas).
export function marigoldCluster(points, { r = 0.1, rnd = Math.random, colors = [PALETTE.cempasuchil, PALETTE.naranja, PALETTE.amarillo] } = {}) {
  const parts = points.map(([x, y, z, s = 1], i) => {
    const g = marigoldGeometry(r * s, colors[i % colors.length], rnd);
    g.translate(x, y, z);
    return g;
  });
  return new THREE.Mesh(mergeGeometries(parts), marigoldMaterial());
}

// Hilera de banderitas de papel picado colgando entre dos puntos.
export function picadoBanner(a, b, { sag = 0.4, flags = 10, size = 0.42, seed = 0 } = {}) {
  const group = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(Math.PI * t) * sag;
    pts.push(p);
  }
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#2a1b14' })));
  const dir = new THREE.Vector3().subVectors(b, a);
  const yaw = Math.atan2(dir.x, dir.z) + Math.PI / 2;
  const geo = new THREE.PlaneGeometry(size, size * 1.17);
  geo.translate(0, -size * 0.58, 0);
  const pieces = [];
  for (let i = 0; i < flags; i++) {
    const t = (i + 0.5) / flags;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(Math.PI * t) * sag;
    const color = PICADO_COLORS[(i + seed) % PICADO_COLORS.length];
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
      map: papelPicadoTexture(color, i + seed), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
      emissive: color, emissiveIntensity: 0.4,
    }));
    m.position.copy(p);
    m.rotation.y = yaw;
    group.add(m);
    pieces.push({ m, seed: seed * 7 + i });
  }
  // Una brisa suave: se mecen despacio y en ola a lo largo de la hilera (antes subían y bajaban
  // rápido y el dibujo no se llegaba a leer).
  group.userData.flutter = (t) => {
    for (const pc of pieces) {
      pc.m.rotation.x = Math.sin(t * 1.1 + pc.seed * 0.55) * 0.07 + Math.sin(t * 2.3 + pc.seed) * 0.015;
      pc.m.rotation.z = Math.sin(t * 0.8 + pc.seed * 0.55) * 0.03;
    }
  };
  return group;
}

// Calaverita de azúcar.
export function sugarSkull(hue = 330, scale = 1) {
  const g = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: '#fbf3e6', emissive: '#3a2a2a' });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1 * scale, 16, 12), white);
  head.scale.set(1, 0.95, 0.9);
  head.position.y = 0.11 * scale;
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.11 * scale, 0.05 * scale, 0.08 * scale), white);
  jaw.position.set(0, 0.035 * scale, 0.015 * scale);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.17 * scale, 0.17 * scale), new THREE.MeshLambertMaterial({ map: calaveraTexture(hue), transparent: true, emissive: '#2a1a1a' }));
  face.position.set(0, 0.1 * scale, 0.091 * scale);
  g.add(head, jaw, face);
  return g;
}

// Pan de muerto.
export function panDeMuerto(scale = 1) {
  const g = new THREE.Group();
  const bread = new THREE.MeshLambertMaterial({ color: '#c47a3a', emissive: '#2a1200' });
  const sugar = new THREE.MeshLambertMaterial({ color: '#d79b52', emissive: '#2a1200' });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), bread);
  dome.scale.y = 0.6;
  g.add(dome);
  for (let i = 0; i < 4; i++) {
    const bone = new THREE.Mesh(new THREE.CapsuleGeometry(0.018 * scale, 0.2 * scale, 4, 8), sugar);
    bone.rotation.z = Math.PI / 2;
    bone.rotation.y = (i / 4) * Math.PI;
    bone.position.y = 0.06 * scale;
    bone.rotation.x = 0.35;
    g.add(bone);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035 * scale, 10, 8), sugar);
  knob.position.y = 0.09 * scale;
  g.add(knob);
  return g;
}

// Veladora de vaso de color.
export function veladoraGeometryParts() {
  return {
    glass: new THREE.CylinderGeometry(0.045, 0.04, 0.13, 12),
  };
}

// Pueblito de colores en las colinas, con ventanas encendidas.
export function buildPueblo(rnd) {
  const walls = [];
  const roofs = [];
  const windows = [];
  const wallColors = ['#e4167c', '#ff9a1f', '#14b3b0', '#7b2cbf', '#ffcf3a', '#2f6fd6', '#2bb673', '#f25c54'];
  const winColor = new THREE.Color(2.2, 1.5, 0.7);
  const place = (a, rad, y) => [Math.sin(a) * rad, y, Math.cos(a) * rad];
  for (let i = 0; i < 46; i++) {
    // Arco de colinas al norte, detrás del salón.
    const a = Math.PI + (rnd() - 0.5) * 2.4;
    const rad = 98 + rnd() * 14;
    const hill = 14 + Math.sin(a * 3) * 7 + Math.sin(a * 7 + 1) * 4 + Math.sin(a * 13) * 2;
    const y = ((rad - 95) / 65) * hill - 0.5;
    const [x, , z] = place(a, rad, 0);
    const w = 2 + rnd() * 2.2;
    const h = 1.6 + rnd() * 1.6;
    const d = 2 + rnd() * 1.5;
    const rot = -a + (rnd() - 0.5) * 0.4;
    const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z);
    const wall = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    wall.deleteAttribute('uv');
    wall.translate(0, h / 2, 0);
    wall.applyMatrix4(m);
    paintGeo(wall, wallColors[i % wallColors.length]);
    walls.push(wall);
    const roof = new THREE.ConeGeometry(Math.max(w, d) * 0.78, 0.9 + rnd() * 0.5, 4).toNonIndexed();
    roof.deleteAttribute('uv');
    roof.rotateY(Math.PI / 4);
    roof.translate(0, h + 0.4, 0);
    roof.applyMatrix4(m);
    paintGeo(roof, rnd() < 0.5 ? '#b5482a' : '#8e3a22');
    roofs.push(roof);
    const nW = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < nW; k++) {
      const win = new THREE.PlaneGeometry(0.42, 0.5);
      win.translate((k - (nW - 1) / 2) * (w / (nW + 0.5)), h * (0.35 + rnd() * 0.3), d / 2 + 0.02);
      win.applyMatrix4(m);
      windows.push(win);
    }
  }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(mergeGeometries([...walls, ...roofs]), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  const winMesh = new THREE.Mesh(mergeGeometries(windows), new THREE.MeshBasicMaterial({ color: winColor, fog: false, side: THREE.DoubleSide }));
  g.add(winMesh);
  return g;
}

function paintGeo(geo, color) {
  const c = new THREE.Color(color);
  const arr = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < geo.attributes.position.count; i++) c.toArray(arr, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}

const bgCache = new Map();
// Fondos para el lugar de cada huellita (el paspartú detrás de la foto).
export function backgroundTexture(id = 'crema') {
  if (bgCache.has(id)) return bgCache.get(id);
  const [c, g] = canvas(160, 200);
  const W = 160;
  const H = 200;
  const grad = (a, b) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
  const dots = (col, n, r) => { g.fillStyle = col; for (let i = 0; i < n; i++) { g.beginPath(); g.arc(Math.random() * W, Math.random() * H, r * (0.5 + Math.random()), 0, Math.PI * 2); g.fill(); } };
  switch (id) {
    case 'cempasuchil': grad('#ffb238', '#ff7a1a'); dots('rgba(255,230,140,.6)', 30, 6); break;
    case 'picado': {
      grad('#fbefd9', '#f3dfc0');
      PICADO_COLORS.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * (W / 7), 0, W / 7 - 2, 26); g.beginPath(); g.moveTo(i * (W / 7), 26); g.lineTo(i * (W / 7) + W / 14, 36); g.lineTo((i + 1) * (W / 7) - 2, 26); g.fill(); });
      break;
    }
    case 'talavera': {
      const t = talaveraTexture().image;
      for (let y = 0; y < H; y += 40) for (let x = 0; x < W; x += 40) g.drawImage(t, x, y, 40, 40);
      break;
    }
    case 'noche': grad('#2a1846', '#120c22'); dots('rgba(255,200,120,.8)', 24, 2.2); break;
    case 'estrellas': grad('#1b2350', '#3a1f5c'); dots('rgba(255,255,230,.9)', 60, 1.4); break;
    case 'rosa': grad('#ff4fa3', '#c2186b'); dots('rgba(255,220,240,.35)', 26, 7); break;
    case 'turquesa': grad('#3fd6cf', '#118f8b'); dots('rgba(230,255,250,.35)', 26, 7); break;
    case 'arcoiris': ['#ff8a8a', '#ffb870', '#ffe58a', '#9be38f', '#8ec5ff', '#a99bff', '#e0a0ff'].forEach((col, i) => { g.fillStyle = col; g.fillRect(0, (i * H) / 7, W, H / 7 + 1); }); break;
    case 'jardin': grad('#cfe8b0', '#7fb46b'); ['#ff9a1f', '#e4167c', '#ffcf3a', '#ffffff'].forEach((col) => dots(col, 10, 5)); break;
    case 'atardecer': grad('#ffcf7a', '#c2397a'); break;
    case 'huellitas': {
      grad('#fbefd9', '#f0dcc0');
      g.fillStyle = 'rgba(201,112,78,.35)';
      for (let y = 18; y < H; y += 40) for (let x = 18 + ((y / 40) % 2) * 20; x < W; x += 40) {
        g.beginPath(); g.ellipse(x, y + 5, 7, 6, 0, 0, Math.PI * 2); g.fill();
        for (const [dx, dy] of [[-8, -4], [8, -4], [-3, -10], [3, -10]]) { g.beginPath(); g.arc(x + dx, y + dy, 2.6, 0, Math.PI * 2); g.fill(); }
      }
      break;
    }
    default: grad('#fbf1e0', '#efe0c6');
  }
  const t = tex(c);
  bgCache.set(id, t);
  return t;
}
