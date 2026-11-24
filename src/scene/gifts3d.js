// Los regalitos de la ofrenda en 3D (los 24 del catálogo de server/glow.js) y los efectos de los
// gestos: la llamita que viaja hasta la repisa, la flor que estalla en pétalos, el regalito que vuela
// desde tu mano y los corazones del abrazo. Todo hecho con geometría (sin modelos externos).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowTexture, flameTexture, emojiTexture } from './textures.js';
import { marigoldCluster, PALETTE } from './muertos.js';

// ---------- piezas ----------
const col = (c, k = 1) => {
  if (Array.isArray(c)) return c;
  const x = new THREE.Color(c);
  return [x.r * k, x.g * k, x.b * k];
};
// Una pieza: geometría + color (se puede pasar un color HDR [r,g,b] > 1 para que brille).
function P(geo, color, { s, r, p } = {}) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  if (g.attributes.uv1) g.deleteAttribute('uv1');
  if (s) g.scale(...s);
  if (r) { if (r[0]) g.rotateX(r[0]); if (r[1]) g.rotateY(r[1]); if (r[2]) g.rotateZ(r[2]); }
  if (p) g.translate(...p);
  const c = col(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c[0]; arr[i * 3 + 1] = c[1]; arr[i * 3 + 2] = c[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
const sph = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);
const cyl = (a, b, h, n = 16, open = false, t0 = 0, tl = Math.PI * 2) => new THREE.CylinderGeometry(a, b, h, n, 1, open, t0, tl);
const tube = (pts, r, n = 24) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), n, r, 6, false);
const V = (x, y, z) => [x, y, z];

export function heartGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.32, -0.55, -0.12, -0.55, 0.15);
  s.bezierCurveTo(-0.55, 0.4, -0.3, 0.52, -0.15, 0.48);
  s.bezierCurveTo(-0.05, 0.45, 0, 0.36, 0, 0.3);
  s.bezierCurveTo(0, 0.36, 0.05, 0.45, 0.15, 0.48);
  s.bezierCurveTo(0.3, 0.52, 0.55, 0.4, 0.55, 0.15);
  s.bezierCurveTo(0.55, -0.12, 0.15, -0.32, 0, -0.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 3, curveSegments: 12 });
  g.center();
  return g;
}

const DARK = '#1e1420';
const BONE = '#f3ead8';

// Cada regalito: piezas fijas (`parts`) y, si se anima, piezas con pivote (`subs`).
// Se arma en cualquier escala y después se normaliza: apoyado en y=0, centrado, de tamaño 1.
const SPECS = {
  // ----- comida -----
  '🦴': () => ({
    parts: [
      P(cyl(0.085, 0.085, 0.66, 12), BONE, { r: V(0, 0, Math.PI / 2), p: V(0, 0.13, 0) }),
      ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => P(sph(0.12), BONE, { p: V(a * 0.34, 0.13, b * 0.075) })),
    ],
    rot: [0, 0.5, 0],
  }),
  '🧀': () => ({
    parts: [
      P(cyl(0.45, 0.45, 0.3, 18, false, 0, 1.1), '#f6c445', { p: V(0, 0.15, 0) }),
      ...[[0.25, 0.1], [0.75, 0.2], [0.5, 0.06], [0.95, 0.12]].map(([t, y]) => P(sph(0.05, 10, 8), '#c98a1c', { s: V(1, 1, 0.5), r: V(0, t, 0), p: V(Math.sin(t) * 0.45, y + 0.04, Math.cos(t) * 0.45) })),
      ...[[0.4, 0.22], [0.7, 0.3]].map(([t, d]) => P(sph(0.045, 10, 8), '#c98a1c', { s: V(1, 0.4, 1), p: V(Math.sin(t) * d, 0.3, Math.cos(t) * d) })),
    ],
    rot: [0, -0.9, 0],
  }),
  '🍪': () => {
    const chips = (y, ox) => [[0.1, 0.12], [-0.14, 0.05], [0.02, -0.16], [0.18, -0.08], [-0.08, -0.06], [-0.12, 0.2]].map(([x, z]) => P(sph(0.04, 8, 6), '#4a2a18', { s: V(1, 0.6, 1), p: V(x + ox, y, z) }));
    return {
      parts: [
        P(cyl(0.34, 0.35, 0.09, 22), '#d08c4a', { p: V(0, 0.045, 0) }),
        ...chips(0.095, 0),
        P(cyl(0.3, 0.31, 0.08, 22), '#c47f3e', { r: V(0.15, 0, 0.1), p: V(0.06, 0.14, -0.05) }),
        ...chips(0.19, 0.06),
      ],
    };
  },
  '🥕': () => ({
    parts: [
      P(new THREE.ConeGeometry(0.11, 0.62, 12), '#f07a1a', { r: V(0, 0, -Math.PI / 2), p: V(0.05, 0.11, 0) }),
      ...[0.18, 0.06, -0.06].map((x) => P(cyl(0.111 - (0.31 - x) * 0.0, 0.112, 0.012, 12), '#c9580c', { r: V(0, 0, Math.PI / 2), p: V(x, 0.11, 0) })),
      ...[-0.5, 0, 0.5].map((a, i) => P(new THREE.ConeGeometry(0.035, 0.3, 6), '#4caf50', { r: V(a, 0, Math.PI / 2 + 0.5 - i * 0.25), p: V(-0.36, 0.2, a * 0.12) })),
    ],
    rot: [0, 0.4, 0],
  }),
  '🥛': () => ({
    parts: [
      P(cyl(0.42, 0.3, 0.14, 26, true), '#5b8fd8', { p: V(0, 0.07, 0) }),
      P(cyl(0.3, 0.3, 0.01, 26), '#4a78ba', { p: V(0, 0.005, 0) }),
      P(new THREE.TorusGeometry(0.42, 0.025, 8, 36), '#e8eef5', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.14, 0) }),
      P(cyl(0.39, 0.39, 0.02, 26), col('#ffffff', 1.05), { p: V(0, 0.115, 0) }),
      ...[[-0.04, 0.38], [0.05, 0.38], [0, 0.4]].map(([x, z], i) => P(sph(i === 2 ? 0.035 : 0.022, 8, 6), '#f4c55a', { s: V(1, 0.5, 1), p: V(x * 2, 0.06 + i * 0.012, z) })),
    ],
  }),
  '🍗': () => ({
    parts: [
      P(sph(0.25, 18, 14), '#c4712f', { s: V(1, 0.8, 1.35), p: V(0, 0.2, 0.05) }),
      P(sph(0.2, 14, 10), '#d98a45', { s: V(0.9, 0.5, 1.2), p: V(0.03, 0.3, 0.07) }),
      P(cyl(0.05, 0.05, 0.3, 10), BONE, { r: V(Math.PI / 2, 0, 0), p: V(0, 0.2, -0.36) }),
      P(sph(0.065), BONE, { p: V(0.05, 0.2, -0.52) }),
      P(sph(0.065), BONE, { p: V(-0.05, 0.2, -0.52) }),
    ],
    rot: [0, 1.0, 0],
  }),
  '🐟': () => ({
    parts: [
      P(cyl(0.46, 0.42, 0.04, 28), '#f1e6d4', { p: V(0, 0.02, 0) }),
      P(new THREE.TorusGeometry(0.44, 0.015, 6, 36), '#5b8fd8', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.04, 0) }),
      P(sph(0.25, 18, 12), '#6fa8dc', { s: V(1.3, 0.55, 0.42), p: V(0, 0.15, 0) }),
      P(sph(0.22, 14, 10), '#d5e8f5', { s: V(1.2, 0.3, 0.4), p: V(0, 0.1, 0) }),
      P(new THREE.ConeGeometry(0.16, 0.22, 4), '#4f88c0', { s: V(1, 1, 0.25), r: V(0, 0, -Math.PI / 2), p: V(-0.38, 0.16, 0) }),
      P(new THREE.ConeGeometry(0.07, 0.14, 4), '#4f88c0', { s: V(1.5, 1, 0.2), p: V(0.02, 0.29, 0) }),
      P(sph(0.032, 8, 6), DARK, { p: V(0.22, 0.18, 0.09) }),
      P(sph(0.032, 8, 6), DARK, { p: V(0.22, 0.18, -0.09) }),
      P(cyl(0.03, 0.03, 0.04, 8), '#4caf50', { r: V(0, 0, 0.3), p: V(-0.2, 0.06, 0.25) }),
    ],
  }),
  '🍯': () => ({
    parts: [
      P(cyl(0.2, 0.22, 0.34, 18), col('#e8a317', 1.15), { p: V(0, 0.17, 0) }),
      P(cyl(0.206, 0.226, 0.12, 18, true, -0.7, 1.4), '#f6e3c4', { p: V(0, 0.16, 0) }),
      P(cyl(0.17, 0.18, 0.06, 18), '#8a4b22', { p: V(0, 0.37, 0) }),
      P(cyl(0.25, 0.21, 0.05, 18), '#d6246e', { p: V(0, 0.42, 0) }),
      P(new THREE.TorusGeometry(0.185, 0.012, 6, 28), '#f6e3c4', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.385, 0) }),
      P(sph(0.07, 10, 8), col('#f0b020', 1.2), { s: V(0.7, 1.4, 0.5), p: V(0.12, 0.3, 0.15) }),
      P(cyl(0.014, 0.014, 0.42, 6), '#c98a4b', { r: V(0, 0, -0.45), p: V(0.13, 0.55, -0.02) }),
      P(sph(0.05, 10, 8), '#c98a4b', { s: V(1, 1.3, 1), p: V(0.04, 0.37, -0.02) }),
    ],
  }),
  // ----- juguetes -----
  '🎾': () => ({
    parts: [
      P(sph(0.2, 22, 16), '#c7e33a', { p: V(0, 0.2, 0) }),
      P(new THREE.TorusGeometry(0.2, 0.012, 6, 40), '#f4f4f4', { r: V(Math.PI / 2 - 0.7, 0.3, 0), s: V(1, 1, 1), p: V(0, 0.2, 0) }),
      P(new THREE.TorusGeometry(0.2, 0.012, 6, 40), '#f4f4f4', { r: V(0.5, Math.PI / 2, 0), p: V(0, 0.2, 0) }),
    ],
  }),
  '🧶': () => ({
    parts: [
      P(sph(0.22, 18, 14), '#d6246e', { p: V(0, 0.22, 0) }),
      ...[0, 0.6, 1.2, 1.8, 2.4].map((a, i) => P(new THREE.TorusGeometry(0.222, 0.013, 6, 36), '#f06aa8', { r: V(a, a * 1.7, i * 0.4), p: V(0, 0.22, 0) })),
      P(tube([[0.18, 0.12, 0.1], [0.3, 0.03, 0.2], [0.45, 0.01, 0.1], [0.5, 0.01, -0.1]], 0.012), '#f06aa8'),
      P(cyl(0.012, 0.012, 0.6, 6), '#c9a46a', { r: V(0, 0, 0.9), p: V(-0.05, 0.34, 0.05) }),
      P(cyl(0.012, 0.012, 0.6, 6), '#c9a46a', { r: V(0.2, 0, -0.75), p: V(0.05, 0.35, 0.02) }),
      P(sph(0.025, 8, 6), '#7b2cbf', { p: V(-0.29, 0.51, 0.05) }),
      P(sph(0.025, 8, 6), '#7b2cbf', { p: V(0.27, 0.56, 0.08) }),
    ],
  }),
  '🐭': () => ({
    parts: [
      P(sph(0.18, 16, 12), '#b8b0c8', { s: V(1, 0.85, 1.45), p: V(0, 0.15, 0) }),
      P(sph(0.12, 14, 10), '#c4bcd4', { s: V(1, 0.9, 1.2), p: V(0, 0.19, 0.25) }),
      P(sph(0.03, 8, 6), '#ff8fb1', { p: V(0, 0.19, 0.39) }),
      P(cyl(0.075, 0.075, 0.015, 14), '#e6a5c0', { r: V(Math.PI / 2 - 0.3, 0, 0), p: V(0.09, 0.3, 0.2) }),
      P(cyl(0.075, 0.075, 0.015, 14), '#e6a5c0', { r: V(Math.PI / 2 - 0.3, 0, 0), p: V(-0.09, 0.3, 0.2) }),
      P(sph(0.022, 8, 6), DARK, { p: V(0.055, 0.23, 0.35) }),
      P(sph(0.022, 8, 6), DARK, { p: V(-0.055, 0.23, 0.35) }),
      P(tube([[0, 0.1, -0.24], [0.05, 0.05, -0.38], [0.18, 0.04, -0.45], [0.25, 0.12, -0.4]], 0.012), '#e6a5c0'),
      ...[-1, 1].map((s) => P(cyl(0.003, 0.003, 0.18, 4), '#f4f4f4', { r: V(0, 0, s * 1.4), p: V(s * 0.08, 0.18, 0.37) })),
    ],
    rot: [0, 0.6, 0],
  }),
  '🦆': () => ({
    parts: [
      P(sph(0.25, 18, 14), '#ffd23f', { s: V(1, 0.72, 1.25), p: V(0, 0.18, 0) }),
      P(new THREE.ConeGeometry(0.09, 0.18, 10), '#ffd23f', { r: V(-1.0, 0, 0), p: V(0, 0.28, -0.3) }),
      P(sph(0.15, 16, 12), '#ffd23f', { p: V(0, 0.42, 0.17) }),
      P(sph(0.08, 12, 8), '#ff8c1a', { s: V(1.1, 0.42, 1.3), p: V(0, 0.4, 0.32) }),
      P(sph(0.025, 8, 6), DARK, { p: V(0.075, 0.47, 0.28) }),
      P(sph(0.025, 8, 6), DARK, { p: V(-0.075, 0.47, 0.28) }),
      P(sph(0.12, 12, 8), '#f5c22e', { s: V(0.35, 0.7, 1.2), p: V(0.22, 0.22, -0.02) }),
      P(sph(0.12, 12, 8), '#f5c22e', { s: V(0.35, 0.7, 1.2), p: V(-0.22, 0.22, -0.02) }),
    ],
    rot: [0, 0.5, 0],
  }),
  '🥏': () => ({
    parts: [
      P(cyl(0.38, 0.4, 0.06, 30), '#14b3b0', { p: V(0, 0.03, 0) }),
      P(new THREE.TorusGeometry(0.39, 0.03, 8, 40), '#0e8f8c', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.05, 0) }),
      P(new THREE.TorusGeometry(0.18, 0.014, 6, 30), '#f6e3c4', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.062, 0) }),
      P(new THREE.TorusGeometry(0.1, 0.012, 6, 24), '#ffd23f', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.062, 0) }),
    ],
    rot: [-1.05, 0, 0],
  }),
  '🪀': () => ({
    parts: [
      P(cyl(0.22, 0.22, 0.08, 26), '#e63946', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.22, 0.06) }),
      P(cyl(0.22, 0.22, 0.08, 26), '#e63946', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.22, -0.06) }),
      P(cyl(0.09, 0.09, 0.02, 18), '#f6e3c4', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.22, 0.105) }),
      P(cyl(0.09, 0.09, 0.02, 18), '#f6e3c4', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.22, -0.105) }),
      P(cyl(0.035, 0.035, 0.06, 10), '#c9a46a', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.22, 0) }),
      P(tube([[0, 0.22, 0], [0.04, 0.45, 0], [0.02, 0.65, 0.02], [0, 0.72, 0]], 0.006, 16), '#f6e3c4'),
      P(new THREE.TorusGeometry(0.04, 0.008, 6, 16), '#f6e3c4', { p: V(0, 0.76, 0) }),
    ],
    rot: [0, 0.5, 0],
  }),
  '🧸': () => {
    const fur = '#a0662e';
    const cream = '#e9c99b';
    return {
      parts: [
        P(sph(0.2, 16, 12), fur, { s: V(1, 1.1, 0.9), p: V(0, 0.22, 0) }),
        P(sph(0.13, 14, 10), cream, { s: V(1, 1.1, 0.5), p: V(0, 0.21, 0.12) }),
        P(sph(0.16, 18, 14), fur, { p: V(0, 0.5, 0.02) }),
        ...[-1, 1].map((s) => P(sph(0.06, 10, 8), fur, { p: V(s * 0.12, 0.63, 0) })),
        ...[-1, 1].map((s) => P(sph(0.035, 8, 6), cream, { s: V(1, 1, 0.5), p: V(s * 0.12, 0.63, 0.04) })),
        P(sph(0.07, 12, 8), cream, { s: V(1.2, 0.85, 0.9), p: V(0, 0.46, 0.14) }),
        P(sph(0.026, 8, 6), DARK, { s: V(1.3, 1, 1), p: V(0, 0.485, 0.205) }),
        ...[-1, 1].map((s) => P(sph(0.022, 8, 6), DARK, { p: V(s * 0.06, 0.54, 0.14) })),
        ...[-1, 1].map((s) => P(sph(0.07, 10, 8), fur, { s: V(1, 1.5, 1), r: V(0, 0, s * 0.5), p: V(s * 0.2, 0.27, 0.05) })),
        ...[-1, 1].map((s) => P(sph(0.08, 10, 8), fur, { s: V(1, 0.8, 1.4), p: V(s * 0.11, 0.07, 0.1) })),
        ...[-1, 1].map((s) => P(sph(0.045, 8, 6), cream, { s: V(1, 1, 0.4), p: V(s * 0.11, 0.07, 0.21) })),
        ...[-1, 1].map((s) => P(new THREE.ConeGeometry(0.05, 0.09, 8), '#d6246e', { r: V(0, 0, s * Math.PI / 2), p: V(s * 0.05, 0.36, 0.14) })),
        P(sph(0.025, 8, 6), '#b0185a', { p: V(0, 0.36, 0.15) }),
      ],
    };
  },
  '📦': () => ({
    parts: [
      P(new THREE.BoxGeometry(0.5, 0.36, 0.42), '#c8955a', { p: V(0, 0.18, 0) }),
      P(new THREE.BoxGeometry(0.46, 0.02, 0.38), '#7a5530', { p: V(0, 0.35, 0) }),
      P(new THREE.BoxGeometry(0.5, 0.2, 0.012), '#d4a56a', { r: V(0.55, 0, 0), p: V(0, 0.44, 0.25) }),
      P(new THREE.BoxGeometry(0.5, 0.2, 0.012), '#d4a56a', { r: V(-0.55, 0, 0), p: V(0, 0.44, -0.25) }),
      P(new THREE.BoxGeometry(0.012, 0.18, 0.42), '#bf8a50', { r: V(0, 0, -0.6), p: V(0.3, 0.42, 0) }),
      P(new THREE.BoxGeometry(0.012, 0.18, 0.42), '#bf8a50', { r: V(0, 0, 0.6), p: V(-0.3, 0.42, 0) }),
      P(new THREE.BoxGeometry(0.5, 0.04, 0.005), '#d6246e', { p: V(0, 0.25, 0.212) }),
      P(sph(0.1, 14, 10), '#7cc0ff', { p: V(0.08, 0.38, 0) }),
      P(new THREE.TorusGeometry(0.1, 0.01, 6, 24), '#f4f4f4', { r: V(0.6, 0, 0), p: V(0.08, 0.38, 0) }),
    ],
    rot: [0, 0.35, 0],
  }),
  // ----- detalles -----
  '🎀': () => ({
    parts: [
      ...[-1, 1].map((s) => P(sph(0.15, 16, 12), '#ff5fa2', { s: V(1.3, 0.8, 0.45), r: V(0, 0, s * 0.35), p: V(s * 0.18, 0.34, 0) })),
      ...[-1, 1].map((s) => P(sph(0.07, 10, 8), '#e04b8a', { s: V(1.3, 0.7, 0.6), r: V(0, 0, s * 0.35), p: V(s * 0.16, 0.34, 0.03) })),
      P(sph(0.075, 12, 10), '#e04b8a', { s: V(1, 1, 0.8), p: V(0, 0.34, 0.02) }),
      ...[-1, 1].map((s) => P(new THREE.BoxGeometry(0.09, 0.32, 0.02), '#ff5fa2', { r: V(0, 0, s * 0.35), p: V(s * 0.07, 0.16, -0.01) })),
    ],
  }),
  '🛏️': () => ({
    parts: [
      P(new THREE.TorusGeometry(0.34, 0.13, 12, 30), '#7b2cbf', { r: V(Math.PI / 2, 0, 0), s: V(1, 1, 1), p: V(0, 0.13, 0) }),
      P(cyl(0.33, 0.33, 0.1, 26), '#f1e6d4', { p: V(0, 0.08, 0) }),
      P(sph(0.13, 14, 10), '#ffd0e4', { s: V(1.4, 0.5, 1), p: V(0.06, 0.17, -0.08) }),
      ...[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return P(sph(0.03, 8, 6), '#ffd23f', { s: V(1, 0.4, 1), p: V(Math.cos(a) * 0.34, 0.265, Math.sin(a) * 0.34) });
      }),
    ],
  }),
  '🎈': () => ({
    parts: [
      P(tube([[0, 0.47, 0], [0.04, 0.33, 0], [-0.03, 0.18, 0.02], [0, 0.04, 0]], 0.006, 18), '#f6e3c4'),
      P(new THREE.BoxGeometry(0.08, 0.06, 0.08), '#f7951f', { p: V(0, 0.03, 0) }),
    ],
    subs: [{
      name: 'balloon',
      pivot: [0, 0.47, 0],
      parts: [
        P(sph(0.24, 20, 16), col('#e63946', 1.1), { s: V(1, 1.18, 1), p: V(0, 0.3, 0) }),
        P(new THREE.ConeGeometry(0.04, 0.06, 8), '#c62a37', { p: V(0, 0.02, 0) }),
        P(sph(0.05, 8, 6), col('#ffffff', 1.4), { s: V(0.6, 1, 0.3), p: V(0.1, 0.4, 0.19) }),
      ],
    }],
    idle(o, t) { const b = o.getObjectByName('balloon'); if (b) { b.rotation.z = Math.sin(t * 1.1 + o.id) * 0.12; b.rotation.x = Math.sin(t * 0.8 + o.id) * 0.08; } },
  }),
  '🌻': () => {
    const head = [P(cyl(0.11, 0.11, 0.05, 18), '#5a3a1a', { r: V(Math.PI / 2, 0, 0) })];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      head.push(P(sph(0.06, 8, 6), '#ffc61a', { s: V(0.55, 1.6, 0.25), r: V(0, 0, a), p: V(-Math.sin(a) * 0.17, Math.cos(a) * 0.17, -0.01) }));
    }
    head.forEach((g) => { g.rotateX(-0.25); g.translate(0, 0.8, 0.04); });
    return {
      parts: [
        P(cyl(0.15, 0.11, 0.18, 16), '#c0602a', { p: V(0, 0.09, 0) }),
        P(cyl(0.16, 0.16, 0.035, 16), '#a54d20', { p: V(0, 0.18, 0) }),
        P(cyl(0.022, 0.022, 0.62, 8), '#3f8f3a', { p: V(0, 0.48, 0) }),
        ...[-1, 1].map((s) => P(sph(0.08, 10, 6), '#4caf50', { s: V(1.8, 0.25, 0.8), r: V(0, 0, s * 0.45), p: V(s * 0.11, 0.42, 0) })),
        ...head,
      ],
    };
  },
  '🍄': () => {
    const cap = (k, x) => {
      const out = [
        P(cyl(0.08 * k, 0.1 * k, 0.25 * k, 12), '#f4ead8', { p: V(x, 0.125 * k, 0) }),
        P(new THREE.SphereGeometry(0.22 * k, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#e04b3a', { s: V(1, 0.7, 1), p: V(x, 0.22 * k, 0) }),
        P(cyl(0.21 * k, 0.21 * k, 0.01, 18), '#f1d9c0', { p: V(x, 0.22 * k, 0) }),
      ];
      [[0.4, 0.3], [0.9, 1.6], [0.7, 3.0], [1.0, 4.3], [0.55, 5.4], [0.15, 2.2]].forEach(([phi, th]) => {
        const r = 0.22 * k;
        out.push(P(sph(0.032 * k, 8, 6), col('#ffffff', 1.1), { s: V(1, 0.45, 1), p: V(x + Math.sin(phi) * Math.cos(th) * r, 0.22 * k + Math.cos(phi) * r * 0.7, Math.sin(phi) * Math.sin(th) * r) }));
      });
      return out;
    };
    return { parts: [...cap(1, 0), ...cap(0.55, 0.26), P(sph(0.06, 8, 6), '#4caf50', { s: V(2, 0.3, 1.2), p: V(0.14, 0.01, 0.12) })] };
  },
  '🦋': () => {
    const wing = (s) => [
      P(sph(0.16, 16, 10), col('#ffb347', 1.25), { s: V(1.15, 0.06, 0.9), p: V(s * 0.18, 0, 0.07) }),
      P(sph(0.11, 14, 8), col('#e04b8a', 1.25), { s: V(1, 0.06, 0.95), p: V(s * 0.12, 0, -0.1) }),
      P(sph(0.045, 8, 6), col('#7b2cbf', 1.4), { s: V(1, 0.2, 1), p: V(s * 0.2, 0.012, 0.08) }),
      P(sph(0.03, 8, 6), col('#ffffff', 1.6), { s: V(1, 0.2, 1), p: V(s * 0.13, 0.012, -0.1) }),
    ];
    return {
      parts: [
        P(cyl(0.012, 0.012, 0.25, 6), '#3f8f3a', { p: V(0, 0.125, 0) }),
        P(cyl(0.14, 0.1, 0.03, 14), '#3f8f3a', { s: V(1, 1, 0.6), p: V(0, 0.015, 0) }),
      ],
      subs: [
        { name: 'body', pivot: [0, 0.3, 0], parts: [
          P(new THREE.CapsuleGeometry(0.025, 0.22, 4, 8), '#2a1a2a', { r: V(Math.PI / 2, 0, 0) }),
          P(tube([[0.01, 0.02, 0.12], [0.05, 0.1, 0.2], [0.07, 0.14, 0.22]], 0.004, 8), '#2a1a2a'),
          P(tube([[-0.01, 0.02, 0.12], [-0.05, 0.1, 0.2], [-0.07, 0.14, 0.22]], 0.004, 8), '#2a1a2a'),
        ] },
        { name: 'wl', pivot: [0, 0.3, 0], parts: wing(-1) },
        { name: 'wr', pivot: [0, 0.3, 0], parts: wing(1) },
      ],
      idle(o, t) {
        const f = Math.sin(t * 9 + o.id) * 0.55 + 0.5;
        const l = o.getObjectByName('wl');
        const r = o.getObjectByName('wr');
        if (l) l.rotation.z = -f;
        if (r) r.rotation.z = f;
      },
    };
  },
  '🌙': () => ({
    parts: [
      P(cyl(0.12, 0.14, 0.05, 18), '#7b2cbf', { p: V(0, 0.025, 0) }),
      P(cyl(0.012, 0.012, 0.16, 6), '#d9a748', { p: V(0, 0.13, 0) }),
    ],
    subs: [{
      name: 'moon',
      pivot: [0, 0.42, 0],
      parts: [
        P(new THREE.TorusGeometry(0.2, 0.075, 12, 32, Math.PI * 1.25), col('#ffe08a', 2.0), { r: V(0, 0, -Math.PI * 0.12) }),
        P(new THREE.OctahedronGeometry(0.05), col('#fff1c0', 2.2), { p: V(0.05, 0.02, 0) }),
      ],
    }],
    glow: 1.1,
    idle(o, t) { const m = o.getObjectByName('moon'); if (m) m.rotation.z = Math.sin(t * 0.9 + o.id) * 0.15; },
  }),
  // ----- más comida -----
  '🥩': () => ({
    parts: [
      P(cyl(0.46, 0.42, 0.04, 28), '#f1e6d4', { p: V(0, 0.02, 0) }),
      P(sph(0.3, 18, 12), '#a8432f', { s: V(1.25, 0.22, 0.9), p: V(0, 0.09, 0) }),
      P(new THREE.TorusGeometry(0.29, 0.035, 6, 24, Math.PI * 1.1), '#f3d6c4', { s: V(1.25, 1, 0.9), r: V(Math.PI / 2, 0, 0.3), p: V(0, 0.1, 0) }),
      ...[-0.12, 0, 0.12].map((x) => P(new THREE.BoxGeometry(0.03, 0.01, 0.42), '#4a1a12', { r: V(0, 0.6, 0), p: V(x, 0.155, 0) })),
      P(sph(0.04, 8, 6), '#3fae6a', { s: V(1.6, 0.4, 1), p: V(-0.26, 0.06, 0.24) }),
    ],
  }),
  '🍎': () => ({
    parts: [
      P(sph(0.24, 22, 16), col('#d62f2f', 1.05), { s: V(1, 0.92, 1), p: V(0, 0.22, 0) }),
      P(sph(0.05, 8, 6), '#8a1c1c', { s: V(1, 0.4, 1), p: V(0, 0.42, 0) }),
      P(cyl(0.012, 0.016, 0.1, 6), '#5a3a22', { r: V(0, 0, 0.2), p: V(0.01, 0.47, 0) }),
      P(sph(0.06, 10, 6), '#4caf50', { s: V(1.6, 0.25, 0.8), r: V(0, 0.4, 0.4), p: V(0.07, 0.48, 0) }),
      P(sph(0.04, 8, 6), col('#ffffff', 1.4), { s: V(0.7, 1, 0.3), p: V(-0.09, 0.3, 0.19) }),
    ],
  }),
  '🍦': () => ({
    parts: [
      P(new THREE.ConeGeometry(0.13, 0.42, 14), '#d9a35a', { r: V(Math.PI, 0, 0), p: V(0, 0.21, 0) }),
      ...[0.1, 0.2, 0.3].map((y) => P(new THREE.TorusGeometry(0.13 * (y / 0.42) + 0.01, 0.006, 4, 16), '#a8743a', { r: V(Math.PI / 2, 0, 0), p: V(0, y, 0) })),
      P(sph(0.15, 16, 12), '#9fe0c8', { p: V(0, 0.46, 0) }),
      P(sph(0.13, 16, 12), '#ff9ec4', { p: V(0.02, 0.62, 0.01) }),
      P(sph(0.04, 10, 8), col('#e63946', 1.1), { p: V(0.03, 0.76, 0.02) }),
      P(cyl(0.004, 0.004, 0.07, 4), '#5a3a22', { r: V(0, 0, 0.4), p: V(0.05, 0.81, 0.02) }),
    ],
  }),
  '🎂': () => {
    const sprinkles = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      sprinkles.push(P(new THREE.BoxGeometry(0.03, 0.008, 0.01), ['#ffd23f', '#5b8fd8', '#3fae6a', '#e0457b'][i % 4], { r: V(0, a * 2, 0), p: V(Math.cos(a) * 0.15, 0.43, Math.sin(a) * 0.15) }));
    }
    return {
      parts: [
        P(cyl(0.4, 0.4, 0.03, 28), '#e8eef5', { p: V(0, 0.015, 0) }),
        P(cyl(0.32, 0.32, 0.22, 28), '#f8d7e3', { p: V(0, 0.14, 0) }),
        P(new THREE.TorusGeometry(0.32, 0.03, 6, 28), '#ff7fb0', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.25, 0) }),
        P(cyl(0.22, 0.22, 0.16, 24), '#fff1f5', { p: V(0, 0.34, 0) }),
        P(new THREE.TorusGeometry(0.22, 0.025, 6, 24), '#ff7fb0', { r: V(Math.PI / 2, 0, 0), p: V(0, 0.42, 0) }),
        ...sprinkles,
        P(cyl(0.018, 0.018, 0.14, 8), '#7cc0ff', { p: V(0, 0.49, 0) }),
        P(sph(0.025, 8, 6), col('#ffd27a', 2.2), { s: V(1, 1.7, 1), p: V(0, 0.59, 0) }),
      ],
    };
  },
  // ----- más juguetes -----
  '⚽': () => {
    const patches = [];
    const ico = new THREE.IcosahedronGeometry(1, 0);
    const pos = ico.attributes.position;
    const seen = [];
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      if (seen.some((s) => s.distanceTo(v) < 0.1)) continue;
      seen.push(v);
      const g = sph(0.06, 8, 6);
      g.scale(1, 1, 0.35);
      g.lookAt(v);
      patches.push(P(g, '#1e1420', { p: V(v.x * 0.2, 0.2 + v.y * 0.2, v.z * 0.2) }));
    }
    return { parts: [P(sph(0.2, 24, 18), '#f7f4ee', { p: V(0, 0.2, 0) }), ...patches] };
  },
  '🪶': () => {
    const feather = (color, rot, len) => [
      P(sph(0.07, 12, 8), color, { s: V(0.55, len, 0.12), r: V(0, 0, rot), p: V(Math.sin(-rot) * len * 0.07 * 1.2, 0.1 + Math.cos(rot) * len * 0.07, 0) }),
      P(cyl(0.004, 0.004, len * 0.14, 4), '#f4ede0', { r: V(0, 0, rot), p: V(Math.sin(-rot) * len * 0.07 * 1.2, 0.1 + Math.cos(rot) * len * 0.07, 0.01) }),
    ];
    return {
      parts: [
        P(cyl(0.012, 0.012, 0.6, 6), '#c9a46a', { r: V(0, 0, Math.PI / 2 - 0.35), p: V(-0.28, 0.05, 0) }),
        P(sph(0.035, 10, 8), '#e0457b', { p: V(0, 0.1, 0) }),
        ...feather(col('#3fb6c8', 1.1), 0.35, 3.2),
        ...feather(col('#ff8fb1', 1.1), -0.1, 3.6),
        ...feather(col('#ffd23f', 1.1), -0.55, 3.0),
      ],
    };
  },
  '🪢': () => ({
    parts: [
      P(cyl(0.035, 0.035, 0.6, 10), '#3fae6a', { r: V(0, 0, Math.PI / 2), p: V(0, 0.08, 0) }),
      ...[-1, 1].map((s) => P(sph(0.085, 12, 10), '#f4ede0', { p: V(s * 0.26, 0.085, 0) })),
      ...[-1, 1].map((s) => P(new THREE.TorusGeometry(0.075, 0.025, 6, 14), '#e0457b', { r: V(0, Math.PI / 2, 0), p: V(s * 0.26, 0.085, 0) })),
      ...[-1, 1].flatMap((s) => [0, 1, 2].map((k) => P(new THREE.ConeGeometry(0.02, 0.12, 5), '#f4ede0', { r: V(0, 0, s * (Math.PI / 2 + (k - 1) * 0.35)), p: V(s * 0.39, 0.07 + (k - 1) * 0.02, (k - 1) * 0.02) }))),
      ...[-0.1, 0.1].map((x) => P(new THREE.TorusGeometry(0.037, 0.008, 4, 12), '#f4ede0', { r: V(0, Math.PI / 2, 0), p: V(x, 0.08, 0) })),
    ],
  }),
  '🪁': () => {
    const tri = (a, b, c, color) => {
      const sh = new THREE.Shape();
      sh.moveTo(...a); sh.lineTo(...b); sh.lineTo(...c); sh.closePath();
      return P(new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: false }), color, { p: V(0, 0.42, 0) });
    };
    return {
      parts: [
        tri([0, 0.32], [-0.22, 0], [0, 0], col('#e0457b', 1.05)),
        tri([0, 0.32], [0, 0], [0.22, 0], col('#ffd23f', 1.05)),
        tri([-0.22, 0], [0, -0.3], [0, 0], col('#5b8fd8', 1.05)),
        tri([0, 0], [0, -0.3], [0.22, 0], col('#3fae6a', 1.05)),
        P(cyl(0.008, 0.008, 0.62, 4), '#8a6a4a', { p: V(0, 0.43, 0.015) }),
        P(cyl(0.008, 0.008, 0.44, 4), '#8a6a4a', { r: V(0, 0, Math.PI / 2), p: V(0, 0.42, 0.015) }),
        P(tube([[0, 0.12, 0.01], [0.05, 0.06, 0.02], [-0.03, 0.0, 0.03], [0.02, -0.0, 0.02]], 0.005, 12), '#f4ede0'),
        ...[0.09, 0.03].map((y, i) => P(new THREE.ConeGeometry(0.03, 0.05, 4), i ? '#e0457b' : '#ffd23f', { r: V(0, 0, Math.PI / 2), s: V(1, 1, 0.3), p: V(0.02, y, 0.02) })),
        P(new THREE.BoxGeometry(0.1, 0.02, 0.1), '#8a6a4a', { p: V(0, 0.01, 0) }),
      ],
    };
  },
  // ----- más detalles -----
  '🌹': () => {
    const head = [P(sph(0.07, 12, 10), col('#c8203a', 1.05), { s: V(1, 1.1, 1) })];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      head.push(P(sph(0.07, 10, 8), col(i % 2 ? '#d62f4a' : '#b81c34', 1.05), { s: V(0.9, 1, 0.35), r: V(0.35, -a, 0), p: V(Math.sin(a) * 0.065, -0.01, Math.cos(a) * 0.065) }));
    }
    head.forEach((g) => g.translate(0, 0.72, 0));
    return {
      parts: [
        P(cyl(0.015, 0.015, 0.66, 6), '#3f8f3a', { p: V(0, 0.33, 0) }),
        ...[-1, 1].map((s) => P(sph(0.06, 10, 6), '#4caf50', { s: V(1.6, 0.25, 0.8), r: V(0, 0, s * 0.5), p: V(s * 0.07, 0.32 + s * 0.06, 0) })),
        ...head,
      ],
      rot: [0, 0, 0.12],
    };
  },
  '👑': () => ({
    parts: [
      P(cyl(0.22, 0.2, 0.14, 24, true), col('#f2c14e', 1.2), { p: V(0, 0.07, 0) }),
      P(new THREE.TorusGeometry(0.21, 0.018, 6, 28), col('#e0b04a', 1.2), { r: V(Math.PI / 2, 0, 0), p: V(0, 0.01, 0) }),
      ...[0, 1, 2, 3, 4].flatMap((i) => {
        const a = (i / 5) * Math.PI * 2;
        return [
          P(new THREE.ConeGeometry(0.05, 0.14, 4), col('#f2c14e', 1.2), { p: V(Math.cos(a) * 0.205, 0.21, Math.sin(a) * 0.205) }),
          P(sph(0.022, 8, 6), col('#fff4d6', 1.5), { p: V(Math.cos(a) * 0.205, 0.29, Math.sin(a) * 0.205) }),
          P(sph(0.026, 8, 6), col(['#e63946', '#5b8fd8', '#3fae6a', '#8b5cc7', '#e0457b'][i], 1.3), { s: V(1, 1, 0.5), r: V(0, -a + Math.PI / 2, 0), p: V(Math.cos(a) * 0.215, 0.08, Math.sin(a) * 0.215) }),
        ];
      }),
    ],
  }),
  '⭐': () => {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const rr = i % 2 ? 0.1 : 0.24;
      if (i === 0) sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    sh.closePath();
    const star = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2 });
    star.center();
    return {
      parts: [
        P(cyl(0.1, 0.12, 0.04, 16), '#7b2cbf', { p: V(0, 0.02, 0) }),
        P(cyl(0.012, 0.012, 0.18, 6), '#d9a748', { p: V(0, 0.12, 0) }),
      ],
      subs: [{ name: 'star', pivot: [0, 0.44, 0], parts: [P(star, col('#ffd65a', 1.9))] }],
      glow: 1.1,
      idle(o, t) { const m = o.getObjectByName('star'); if (m) m.rotation.y = Math.sin(t * 0.8 + o.id) * 0.5; },
    };
  },
  '🧣': () => {
    const parts = [P(new THREE.TorusGeometry(0.2, 0.06, 10, 32), '#e63946', { r: V(Math.PI / 2, 0, 0), s: V(1, 1, 0.85), p: V(0, 0.07, 0) })];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      parts.push(P(new THREE.TorusGeometry(0.062, 0.014, 6, 14), '#f4ede0', { s: V(1, 0.85, 1), r: V(0, -a, 0), p: V(Math.cos(a) * 0.2, 0.07, Math.sin(a) * 0.2) }));
    }
    // Las dos puntas que caen adelante, con rayas y flecos.
    for (const [x, ry] of [[0.02, 0.15], [0.15, -0.2]]) {
      parts.push(P(new THREE.BoxGeometry(0.12, 0.03, 0.32), '#e63946', { r: V(0.1, ry, 0), p: V(x, 0.035, 0.32) }));
      for (const dz of [-0.06, 0.06]) parts.push(P(new THREE.BoxGeometry(0.122, 0.032, 0.03), '#f4ede0', { r: V(0.1, ry, 0), p: V(x + Math.sin(ry) * dz, 0.037, 0.32 + dz) }));
      for (let k = 0; k < 5; k++) parts.push(P(new THREE.BoxGeometry(0.012, 0.01, 0.06), '#f4ede0', { r: V(0, ry, 0), p: V(x - 0.05 + k * 0.025 + Math.sin(ry) * 0.2, 0.02, 0.5) }));
    }
    return { parts, rot: [0, 0.5, 0] };
  },
  '💌': () => {
    const flap = new THREE.Shape();
    flap.moveTo(-0.23, 0.15);
    flap.lineTo(0.23, 0.15);
    flap.lineTo(0, -0.04);
    flap.closePath();
    const heart = heartGeometry();
    return {
      parts: [
        P(new THREE.BoxGeometry(0.46, 0.3, 0.03), '#fdf1dc', { r: V(-0.25, 0, 0), p: V(0, 0.16, 0) }),
        P(new THREE.ExtrudeGeometry(flap, { depth: 0.006, bevelEnabled: false }), '#efd9bd', { r: V(-0.25, 0, 0), p: V(0, 0.165, 0.018) }),
        P(heart, col('#e63946', 1.2), { s: V(0.11, 0.11, 0.11), r: V(-0.25, 0, 0), p: V(0, 0.16, 0.035) }),
        P(new THREE.BoxGeometry(0.5, 0.03, 0.12), '#c9a46a', { p: V(0, 0.015, -0.03) }),
      ],
    };
  },
};

// ---------- material compartido ----------
let MAT = null;
function giftMaterial() {
  if (MAT) return MAT;
  MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
  // De noche se tienen que ver: un poco de luz propia; lo que tiene color > 1 brilla (bloom).
  MAT.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += vColor.rgb * 0.3 + max(vColor.rgb - 1.0, 0.0) * 1.6;`);
  };
  MAT.customProgramCacheKey = () => 'gift-3d';
  return MAT;
}

// ---------- armado y caché ----------
const cache = new Map();
function built(ch) {
  if (cache.has(ch)) return cache.get(ch);
  const make = SPECS[ch];
  if (!make) { cache.set(ch, null); return null; }
  const spec = make();
  const subs = [{ name: 'base', pivot: [0, 0, 0], parts: spec.parts || [] }, ...(spec.subs || [])];
  const rot = spec.rot ? new THREE.Euler(...spec.rot) : null;
  // Cada parte: rotación general (si hay) alrededor del origen, en coordenadas "del mundo del regalito".
  const merged = subs.filter((s) => s.parts.length).map((s) => {
    const g = mergeGeometries(s.parts);
    const pv = new THREE.Vector3(...s.pivot);
    return { name: s.name, g, pv };
  });
  if (rot) {
    const m = new THREE.Matrix4().makeRotationFromEuler(rot);
    for (const s of merged) {
      // Llevar al mundo, rotar, y volver al pivote rotado.
      s.g.translate(s.pv.x, s.pv.y, s.pv.z);
      s.g.applyMatrix4(m);
      s.pv.applyMatrix4(m);
      s.g.translate(-s.pv.x, -s.pv.y, -s.pv.z);
    }
  }
  // Caja total, para apoyarlo en y=0, centrarlo y dejarlo de tamaño 1.
  const box = new THREE.Box3();
  for (const s of merged) {
    s.g.computeBoundingBox();
    box.union(s.g.boundingBox.clone().translate(s.pv));
  }
  const size = box.getSize(new THREE.Vector3());
  const k = 1 / Math.max(size.x, size.y, size.z);
  const c = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
  const out = merged.map((s) => {
    s.g.scale(k, k, k);
    s.g.computeVertexNormals();
    s.g.computeBoundingSphere();
    return { name: s.name, g: s.g, pos: s.pv.clone().sub(c).multiplyScalar(k) };
  });
  const res = { subs: out, idle: spec.idle || null, glow: spec.glow || 0, height: size.y * k };
  cache.set(ch, res);
  return res;
}

let idSeq = 0;
// Un regalito listo para poner en la escena (tamaño 1, apoyado en y=0). Si el emoji no está en el
// catálogo, se usa el emoji como cartelito.
export function giftMesh(ch) {
  const b = built(ch);
  const o = new THREE.Group();
  o.id2 = idSeq++;
  if (!b) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(ch, 96), transparent: true, depthWrite: false }));
    sp.position.y = 0.5;
    o.add(sp);
    return o;
  }
  for (const s of b.subs) {
    const m = new THREE.Mesh(s.g, giftMaterial());
    m.name = s.name;
    m.position.copy(s.pos);
    o.add(m);
  }
  if (b.glow) {
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55, color: new THREE.Color(1.3, 1.1, 0.6) }));
    gl.scale.setScalar(b.glow * 1.6);
    gl.position.y = b.height * 0.6;
    o.add(gl);
  }
  o.userData.idle = b.idle;
  o.userData.gift = ch;
  return o;
}

// Animación suave de los que se mueven (globo, mariposa, lunita).
export function idleGift(o, t) {
  const f = o.userData.idle;
  if (f) f({ getObjectByName: (n) => o.getObjectByName(n), id: o.id2 }, t);
}

export const GIFT_EMOJIS = Object.keys(SPECS);

// ---------- efectos de los gestos ----------
export function createOfferFx(scene) {
  const live = [];
  const glowTex = glowTexture();

  // Chispitas (un solo dibujo): se apagan bajando el color, porque son aditivas.
  const MAXS = 420;
  const sGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(MAXS * 3);
  const sCol = new Float32Array(MAXS * 3);
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  const sparkPts = new THREE.Points(sGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparkPts.frustumCulled = false;
  scene.add(sparkPts);
  const sparks = [];
  let sNext = 0;
  function spark(p, v, c, life = 0.9, drag = 1.6, grav = -0.6) {
    const s = sparks[sNext] || (sparks[sNext] = { p: new THREE.Vector3(), v: new THREE.Vector3(), c: [0, 0, 0], life: 0, max: 1 });
    s.p.copy(p);
    s.v.copy(v);
    s.c = c;
    s.life = life;
    s.max = life;
    s.drag = drag;
    s.grav = grav;
    sNext = (sNext + 1) % MAXS;
  }
  const rnd = (k = 1) => (Math.random() - 0.5) * 2 * k;
  const tmp = new THREE.Vector3();

  // Un anillo de luz que se abre (al llegar algo a la repisa).
  const ringGeo = new THREE.RingGeometry(0.8, 1, 48);
  function ring(at, color, size = 1, face = null) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.copy(at);
    if (face) m.lookAt(face);
    else m.rotation.x = -Math.PI / 2;
    scene.add(m);
    live.push({ t: 0, dur: 0.8, obj: m, step(k) { const s = size * (0.15 + k * 1.1); m.scale.setScalar(s); m.material.opacity = (1 - k) * 0.9; } });
  }
  function burst(at, color, n = 26, speed = 1.6) {
    for (let i = 0; i < n; i++) {
      tmp.set(rnd(), Math.random() * 1.2 + 0.2, rnd()).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      spark(at, tmp, color, 0.7 + Math.random() * 0.6);
    }
  }

  // Algo que vuela en arco desde `from` hasta `to`, con estela.
  function fly(obj, from, to, { dur = 1.1, height = 1.0, spin = 0, grow = [0.5, 1], trail = [1.6, 1.2, 0.5], land, scale = 1 } = {}) {
    obj.position.copy(from);
    scene.add(obj);
    const mid = from.clone().lerp(to, 0.5);
    mid.y = Math.max(from.y, to.y) + height;
    const q = new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
    let acc = 0;
    live.push({
      t: 0, dur, obj,
      step(k, dt) {
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        q.getPoint(e, obj.position);
        obj.rotation.y += spin * dt;
        obj.scale.setScalar(scale * (grow[0] + (grow[1] - grow[0]) * Math.min(1, k * 1.6)));
        acc += dt;
        while (acc > 0.016) {
          acc -= 0.016;
          spark(obj.position, tmp.set(rnd(0.25), rnd(0.25) + 0.1, rnd(0.25)), trail, 0.6 + Math.random() * 0.4, 2.5, -0.2);
        }
      },
      done() { scene.remove(obj); land?.(); },
    });
  }

  // La gracia de cada regalito al llegar: la pelota rebota, el globo tira para arriba, la mariposa da
  // una vuelta, la lucecita gira; los demás dan un saltito con meneo. Después se queda en la repisa.
  const BOUNCY = new Set(['🎾', '⚽', '🧶', '🥏', '🪀', '🦆']);
  function grace(obj, ch, at, scale, land) {
    const e = [...ch][0];
    const kind = BOUNCY.has(e) ? 'bounce' : e === '🎈' || e === '🪁' ? 'float' : e === '🦋' || e === '🪶' ? 'loop' : e === '🌙' || e === '⭐' || e === '👑' ? 'spin' : 'hop';
    obj.position.copy(at);
    obj.rotation.set(0, Math.random() * Math.PI * 2, 0);
    obj.scale.setScalar(scale);
    scene.add(obj);
    const y0 = at.y;
    const r0 = obj.rotation.y;
    const dur = { bounce: 1.3, float: 1.8, loop: 1.9, spin: 1.2, hop: 0.9 }[kind];
    live.push({
      t: 0, dur, obj,
      step(k) {
        if (kind === 'bounce') {
          // Tres rebotes que se achican, con un poco de aplastarse al tocar.
          const b = Math.abs(Math.sin(k * Math.PI * 3)) * (1 - k) * (1 - k);
          obj.position.y = y0 + b * scale * 1.3;
          const sq = b < 0.05 ? 0.18 * (1 - k) : 0;
          obj.scale.set(scale * (1 + sq), scale * (1 - sq), scale * (1 + sq));
          obj.rotation.y = r0 + k * 6;
        } else if (kind === 'float') {
          // Tira para arriba como queriendo volar, se mece y vuelve a su lugar.
          const up = Math.sin(Math.min(1, k * 1.4) * Math.PI) * scale * 1.6;
          obj.position.y = y0 + Math.max(0, up);
          obj.rotation.z = Math.sin(k * 14) * 0.22 * (1 - k);
        } else if (kind === 'loop') {
          // Una vuelta en el aire alrededor del lugar, aleteando.
          const a = k * Math.PI * 2;
          const rr = Math.sin(k * Math.PI) * scale * 0.9;
          obj.position.set(at.x + Math.sin(a) * rr, y0 + Math.sin(k * Math.PI) * scale * 0.9, at.z + (1 - Math.cos(a)) * rr * 0.4);
          obj.rotation.y = r0 + a;
        } else if (kind === 'spin') {
          obj.position.y = y0 + Math.sin(k * Math.PI) * scale * 0.5;
          obj.rotation.y = r0 + (1 - (1 - k) * (1 - k)) * Math.PI * 4;
          if (Math.random() < 0.35) spark(obj.position, tmp.set(rnd(0.3), rnd(0.3) + 0.2, rnd(0.3)), [2.0, 1.6, 0.8], 0.8, 2.5, -0.2);
        } else {
          // Un saltito y un meneo de contento.
          obj.position.y = y0 + Math.sin(Math.min(1, k * 1.8) * Math.PI) * scale * 0.45;
          obj.rotation.z = Math.sin(k * 20) * 0.18 * (1 - k);
        }
      },
      done() { scene.remove(obj); land?.(); },
    });
  }

  // Pétalos que caen dando vueltas (con gravedad), en un solo dibujo.
  const PET = 90;
  const petalGeo = new THREE.CircleGeometry(0.045, 5);
  const petals = new THREE.InstancedMesh(petalGeo, new THREE.MeshLambertMaterial({ emissive: '#8a3400', emissiveIntensity: 0.8, side: THREE.DoubleSide }), PET);
  petals.frustumCulled = false;
  petals.count = 0;
  const petalCols = [PALETTE.cempasuchil, PALETTE.naranja, PALETTE.amarillo, '#e04b8a'].map((c) => new THREE.Color(c));
  const pData = [];
  for (let i = 0; i < PET; i++) { petals.setColorAt(i, petalCols[i % 4]); pData.push({ life: 0 }); }
  scene.add(petals);
  let pNext = 0;
  function kick(at) {
    const d = pData[pNext];
    d.p = at.clone().add(new THREE.Vector3(rnd(0.15), 0.05, rnd(0.15)));
    d.v = new THREE.Vector3(rnd(0.5), 0.8 + Math.random() * 0.7, rnd(0.5));
    d.r = new THREE.Euler(Math.random() * 6, Math.random() * 6, 0);
    d.w = new THREE.Vector3(rnd(8), rnd(8), rnd(8));
    d.life = 1.0 + Math.random() * 0.6;
    d.floor = at.y + 0.02;
    pNext = (pNext + 1) % PET;
    petals.count = PET;
  }
  function petalBurst(at, n = 50) {
    for (let i = 0; i < n; i++) {
      const d = pData[pNext];
      d.p = at.clone();
      d.v = new THREE.Vector3(rnd(1.2), 1.2 + Math.random() * 1.6, rnd(1.2));
      d.r = new THREE.Euler(Math.random() * 6, Math.random() * 6, 0);
      d.w = new THREE.Vector3(rnd(8), rnd(8), rnd(8));
      d.life = 1.8 + Math.random() * 1.2;
      d.floor = 0.02;
      pNext = (pNext + 1) % PET;
    }
    petals.count = PET;
  }
  const pm = new THREE.Object3D();

  // Corazones del abrazo.
  const heartGeo = heartGeometry();
  const heartMats = [[2.4, 0.6, 1.1], [2.2, 0.9, 1.4], [1.8, 0.5, 0.8]].map((c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), transparent: true, depthWrite: false }));

  function flameOrb() {
    const g = new THREE.Group();
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(2.2, 1.6, 1.0) }));
    fl.scale.set(0.12, 0.24, 1);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.4, 0.8, 0.35), opacity: 0.85 }));
    gl.scale.setScalar(0.7);
    g.add(gl, fl);
    return g;
  }

  return {
    // Una llamita que viaja de tu mano a la vela.
    candle(from, to, land) {
      fly(flameOrb(), from, to, {
        dur: 1.2, height: 0.9, grow: [0.7, 1], trail: [1.8, 1.0, 0.35],
        land: () => { ring(to, [1.6, 1.0, 0.4], 0.5); burst(to, [2.0, 1.2, 0.4], 30, 1.4); land?.(); },
      });
    },
    // Una flor de cempasúchil que vuela girando y se abre en pétalos al llegar.
    flower(from, to, land) {
      const f = marigoldCluster([[0, 0, 0, 1.6]], { r: 0.09 });
      fly(f, from, to, {
        dur: 1.1, height: 1.0, spin: 6, grow: [0.6, 1.1], trail: [1.8, 0.9, 0.2],
        land: () => { petalBurst(to, 45); ring(to, [1.8, 0.9, 0.25], 0.5); land?.(); },
      });
    },
    // El regalito sale de tu mano, vuela dando vueltas, se apoya en la repisa y hace su gracia.
    gift(ch, from, to, scale, land) {
      const g = giftMesh(ch);
      const kept = g.clone();
      fly(g, from, to, {
        dur: 1.25, height: 1.1, spin: 7, grow: [0.6, 1], scale, trail: [1.6, 1.3, 0.7],
        land: () => {
          ring(to.clone().setY(to.y + 0.02), [1.8, 1.5, 0.7], scale * 2.4);
          burst(to.clone().setY(to.y + scale * 0.5), [1.8, 1.4, 0.8], 24, 1.2);
          grace(kept, ch, to, scale, land);
        },
      });
    },
    // Al tocar un regalito en la repisa: hace su gracia en el lugar con un destello.
    playGrace(ch, to, scale, land) {
      if (!to) return;
      ring(to.clone().setY(to.y + 0.02), [1.8, 1.5, 0.7], scale * 2.1);
      burst(to.clone().setY(to.y + scale * 0.4), [1.8, 1.4, 0.8], 14, 0.9);
      grace(giftMesh(ch), ch, to, scale, land);
    },
    // Corazones que salen de tu pecho y suben hacia el marco.
    hug(from, to) {
      ring(from, [2.0, 0.7, 1.2], 0.9, to);
      for (let i = 0; i < 9; i++) {
        const m = new THREE.Mesh(heartGeo, heartMats[i % heartMats.length].clone());
        const delay = i * 0.12;
        const a = rnd(Math.PI);
        const side = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.3 + Math.random() * 0.3);
        const start = from.clone().add(side);
        const end = to.clone().add(new THREE.Vector3(rnd(0.6), rnd(0.4) + 0.3, rnd(0.6)));
        m.scale.setScalar(0.001);
        scene.add(m);
        const size = 0.12 + Math.random() * 0.08;
        live.push({
          t: -delay, dur: 1.7, obj: m,
          step(k, dt) {
            if (k < 0) return;
            const e = 1 - (1 - k) ** 2;
            m.position.lerpVectors(start, end, e);
            m.position.y += Math.sin(k * Math.PI) * 0.6;
            m.position.x += Math.sin(k * 9 + i) * 0.06;
            m.lookAt(end.x, m.position.y, end.z);
            const s = size * (k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1) * (1 + Math.sin(k * 30) * 0.06);
            m.scale.setScalar(Math.max(0.001, s));
            if (Math.random() < dt * 20) spark(m.position, tmp.set(rnd(0.2), 0.2, rnd(0.2)), [1.6, 0.6, 1.0], 0.5, 2, 0);
          },
          done() { scene.remove(m); m.material.dispose(); },
        });
      }
    },
    burst,
    ring,
    petalBurst,
    kick,
    get busy() { return live.length > 0; },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const o = live[i];
        o.t += dt;
        const k = o.t / o.dur;
        o.step(Math.min(1, k), dt);
        if (k >= 1) {
          live.splice(i, 1);
          if (o.done) o.done();
          else { scene.remove(o.obj); o.obj.material?.dispose(); }
        }
      }
      // Chispitas.
      for (let i = 0; i < MAXS; i++) {
        const s = sparks[i];
        if (!s || s.life <= 0) { sCol[i * 3] = sCol[i * 3 + 1] = sCol[i * 3 + 2] = 0; continue; }
        s.life -= dt;
        s.v.multiplyScalar(Math.max(0, 1 - s.drag * dt));
        s.v.y += s.grav * dt;
        s.p.addScaledVector(s.v, dt);
        const f = Math.max(0, s.life / s.max);
        s.p.toArray(sPos, i * 3);
        sCol[i * 3] = s.c[0] * f;
        sCol[i * 3 + 1] = s.c[1] * f;
        sCol[i * 3 + 2] = s.c[2] * f;
      }
      sGeo.attributes.position.needsUpdate = true;
      sGeo.attributes.color.needsUpdate = true;
      // Pétalos.
      if (petals.count) {
        let any = false;
        for (let i = 0; i < PET; i++) {
          const d = pData[i];
          if (d.life <= 0) { pm.scale.setScalar(0); pm.updateMatrix(); petals.setMatrixAt(i, pm.matrix); continue; }
          any = true;
          d.life -= dt;
          d.v.y -= 2.6 * dt;
          d.v.multiplyScalar(1 - 1.4 * dt);
          d.v.x += Math.sin(d.life * 3 + i) * 0.4 * dt;
          d.p.addScaledVector(d.v, dt);
          if (d.p.y < d.floor) { d.p.y = d.floor; d.v.set(0, 0, 0); }
          d.r.x += d.w.x * dt;
          d.r.y += d.w.y * dt;
          pm.position.copy(d.p);
          pm.rotation.copy(d.r);
          pm.scale.setScalar(Math.min(1, d.life * 2));
          pm.updateMatrix();
          petals.setMatrixAt(i, pm.matrix);
        }
        petals.instanceMatrix.needsUpdate = true;
        if (!any) petals.count = 0;
      }
    },
  };
}
