// El salón de las huellitas, como un columbario: un salón redondo con la pérgola de luces y la ofrenda
// de la huellita destacada (sólo en el piso 1), y cinco pasillos anchos que salen de él con las dos
// paredes cubiertas de nichos. Los nichos libres son puertitas de madera oscura con una plaquita de
// bronce; cuando llega una huellita, la puertita se abre y queda la foto en un marco claro detrás de un
// vidrio, con una guirnalda de lucecitas de colores alrededor y, adentro, lo que le dejaron.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HALL_CENTER, ROOM_R, ROOM_WALL_H, CORRIDOR, CORRIDOR_DEG, ROOM_ARCS, LIFT_ARCS, corridorFrame, rand, uTime } from './world.js';
import { portraitTexture, photoTexture, vacantCellTexture, labelTexture, twoSided, flameTexture, glowTexture, woodTexture, lightConeTexture, emojiTexture, lanternTexture } from './textures.js';
import { stageOf } from '../../server/glow.js';
import { giftMesh, idleGift } from './gifts3d.js';
import { CORRIDOR_NAMES } from '../floors.js';
import { paperLantern, flickerLantern } from './lanterns.js';
import { PALETTE, paintedWallTexture, talaveraTexture, marigoldGeometry, marigoldMaterial, marigoldCluster, picadoBanner, sugarSkull, panDeMuerto, backgroundTexture } from './muertos.js';

// Ramo del jarrito: [x, y, z, tamaño] de cada flor (se van sumando con las flores que le dejan).
const BOUQUET = [[0, 0.135, 0, 1.15], [-0.032, 0.12, 0.018, 1], [0.03, 0.125, -0.012, 1], [0.006, 0.118, 0.034, 0.95], [-0.012, 0.15, -0.028, 0.9]];

const WALL_COLORS = ['#178f8c', '#c2186b', '#d9901c', '#6a2aa6', '#239a62', '#d9661a', '#2f6fd6', '#b5307a'];

// ---------- el plano de los nichos ----------
export const CORRIDORS = CORRIDOR_DEG.length;
const COLS = 9; // nichos a lo largo de cada pared (tres tramos de 3 columnas = pasillos bien largos)
const ROWS = 3;
export const PER_CORRIDOR = 2 * COLS * ROWS;
export const SLOTS_PER_FLOOR = CORRIDORS * PER_CORRIDOR; // 270 por piso (0..89 mantienen el mismo lugar de las primeras 3 columnas)
const PX = 1.35; // paso entre columnas de nichos
const OW = 1.0; // hueco de cada nicho
const OH = 0.9;
const DEPTH = 0.4; // lo hondo del nicho
const ROWS_Y = [0.92, 2.02, 3.12]; // de abajo hacia arriba (la fila de abajo queda bien arriba del piso de madera y=0.16)
// Orden de los lugares: primero la fila del medio (a la altura de los ojos), después la de abajo y la de arriba.
const ROW_ORDER = [1, 0, 2];
const Z0 = 0.7; // dónde empieza la grilla de nichos, desde la boca del pasillo
const ZB = Z0 + COLS * PX;
const PW = 0.43; // foto central con espacio a los costados para las 4 repisitas de madera
const PH = 0.53;
const PHOTO_Y = 0.05;
const { hw: HW, wall: WALL, len: LEN, h: WALL_H } = CORRIDOR;

export const POST_H = 7.4;
const POLE_H = 11.5;
// La ofrenda central es grande (se ve desde la entrada y domina el salón en tercera persona).
export const ALTAR_SCALE = 2.2;
export const EASEL_POS = new THREE.Vector3(HALL_CENTER.x, 0, HALL_CENTER.z + 6.8);
const BED_R = 2.0; // cantero de flores alrededor del poste central

export function candleLevel(n) {
  return n >= 12 ? 3 : n >= 5 ? 2 : n >= 1 ? 1 : 0;
}

const rad = THREE.MathUtils.degToRad;
const onRing = (deg, r, y = 0) => new THREE.Vector3(HALL_CENTER.x + Math.sin(rad(deg)) * r, y, HALL_CENTER.z + Math.cos(rad(deg)) * r);

// Brillo de cada lugar según su Glow: 🏮 farolito, ⭐ estrella, ✨ constelación.
const starMatBase = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
function makeGlowFx(fxList, scale = 1) {
  const g = new THREE.Group();
  const lantern = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.16, 8), new THREE.MeshBasicMaterial({ map: lanternTexture(), color: new THREE.Color(1.8, 1.4, 1.0) }));
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 4), new THREE.MeshBasicMaterial({ color: '#2a1d16' }));
  string.position.y = 0.19;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.45 }));
  halo.scale.setScalar(0.5);
  lantern.add(body, string, halo);
  lantern.position.set(0.62 * scale, 0.22 * scale, 0.14);
  const star = new THREE.Sprite(starMatBase.clone());
  star.material.map = emojiTexture('⭐', 96);
  star.scale.setScalar(0.2 * scale);
  star.position.set(0, 0.68 * scale, 0.12);
  const cons = [];
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.6, 1.4, 1.0) }));
    sp.scale.setScalar(0.09 * scale);
    g.add(sp);
    cons.push(sp);
  }
  g.add(lantern, star);
  const fx = { group: g, lantern, star, cons, stage: -1, scale, seed: Math.random() * 10 };
  fxList.push(fx);
  setStage(fx, 0);
  return fx;
}
function setStage(fx, stage, eternal = false) {
  fx.stage = Math.max(stage, eternal ? 1 : 0);
  fx.lantern.visible = stage >= 1 || eternal;
  fx.lantern.children[0].material.color.set(eternal ? new THREE.Color(2.6, 1.9, 0.6) : new THREE.Color(1.8, 1.4, 1.0));
  fx.star.visible = stage >= 2;
  fx.cons.forEach((c) => { c.visible = stage >= 3; });
}

// Veladoras de vidrio de colores (como las de las ofrendas), con la cera y la llamita adentro.
const VELA_COLS = ['#d6246e', '#f7951f', '#7b2cbf', '#14b3b0', '#e63946', '#ffc61a'];
let velaKit = null;
function velaParts() {
  if (velaKit) return velaKit;
  const glass = new THREE.CylinderGeometry(0.036, 0.032, 1, 16, 1, true).translate(0, 0.5, 0);
  const bottom = new THREE.CylinderGeometry(0.032, 0.032, 0.008, 16).translate(0, 0.004, 0);
  const wax = new THREE.CylinderGeometry(0.031, 0.031, 1, 16).translate(0, 0.5, 0);
  const rim = new THREE.TorusGeometry(0.036, 0.004, 6, 20).rotateX(Math.PI / 2);
  const band = new THREE.CylinderGeometry(0.0365, 0.0345, 1, 16, 1, true).translate(0, 0.5, 0);
  const mats = VELA_COLS.map((c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.85, transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false }));
  const glowCols = VELA_COLS.map((c) => new THREE.Color(c).lerp(new THREE.Color('#ffd9a0'), 0.55));
  const waxMat = new THREE.MeshLambertMaterial({ color: '#fff3e0', emissive: '#ffb36b', emissiveIntensity: 0.8 });
  const goldMat = new THREE.MeshLambertMaterial({ color: '#e0b04a', emissive: '#6b4300', emissiveIntensity: 0.6 });
  const bandMat = new THREE.MeshLambertMaterial({ color: '#fbf3e6', emissive: '#7a5226', emissiveIntensity: 0.6, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  velaKit = { glass, bottom, wax, rim, band, mats, glowCols, waxMat, goldMat, bandMat };
  return velaKit;
}
let velaSeq = 0;
function makeCandle(_waxMat, h, flames, bloom) {
  const K = velaParts();
  const ci = velaSeq++ % VELA_COLS.length;
  const c = new THREE.Group();
  const glass = new THREE.Mesh(K.glass, K.mats[ci]);
  glass.scale.y = h;
  const bottom = new THREE.Mesh(K.bottom, K.mats[ci]);
  const wax = new THREE.Mesh(K.wax, K.waxMat);
  wax.scale.y = h * 0.82;
  const rim = new THREE.Mesh(K.rim, K.goldMat);
  rim.position.y = h;
  // Una franjita clara, como la estampita pegada en el vaso.
  const band = new THREE.Mesh(K.band, K.bandMat);
  band.scale.y = h * 0.3;
  band.position.y = h * 0.3;
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.9, 1.5, 1.1) }));
  flame.scale.set(0.05, 0.1, 1);
  flame.position.y = h * 0.82 + 0.045;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: bloom ? 0.32 : 0.5, color: K.glowCols[ci] }));
  glow.scale.setScalar(0.34);
  glow.position.y = h * 0.7;
  c.add(glass, bottom, wax, rim, band, flame, glow);
  flames.push({ flame, glow, seed: Math.random() * 100, group: c, base: bloom ? 0.32 : 0.5, fy: flame.position.y });
  return c;
}

// Un lugar para un regalito 3D (se llena con giftMesh según lo último que le dejaron).
function giftHolder(scale) {
  const g = new THREE.Group();
  g.scale.setScalar(scale);
  g.visible = false;
  return g;
}

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function canvasTex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// La puertita de un nicho libre: madera de nogal con un panel biselado y una plaquita de bronce en el
// medio. `glow` es la máscara de brillo (la plaquita y el bisel se ven aunque el pasillo esté oscuro).
let doorTex = null;
function doorTextures() {
  if (doorTex) return doorTex;
  const W = 512;
  const H = 464;
  const panel = (g, inset) => rrect(g, inset, inset, W - inset * 2, H - inset * 2, 12);
  const plaque = (g) => rrect(g, W / 2 - 92, H / 2 - 30, 184, 60, 10);
  const map = canvasTex(W, H, (g) => {
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#462a1a');
    bg.addColorStop(0.5, '#3b2315');
    bg.addColorStop(1, '#311c10');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // Veta de la madera de nogal en alta definición.
    for (let i = 0; i < 140; i++) {
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? '135,90,55' : '18,9,4'},${0.08 + Math.random() * 0.11})`;
      g.lineWidth = 1.5 + Math.random() * 3.5;
      const y = Math.random() * H;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(W * 0.3, y + (Math.random() - 0.5) * 20, W * 0.6, y + (Math.random() - 0.5) * 20, W, y + (Math.random() - 0.5) * 12);
      g.stroke();
    }
    // Marco exterior biselado.
    g.lineWidth = 12;
    g.strokeStyle = 'rgba(255,218,165,0.3)';
    g.beginPath(); g.moveTo(10, H - 10); g.lineTo(10, 10); g.lineTo(W - 10, 10); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.58)';
    g.beginPath(); g.moveTo(W - 10, 10); g.lineTo(W - 10, H - 10); g.lineTo(10, H - 10); g.stroke();
    // Panel central rehundido y biselado con filete dorado.
    g.fillStyle = 'rgba(0,0,0,0.2)';
    panel(g, 60);
    g.fill();
    g.lineWidth = 18;
    g.strokeStyle = 'rgba(0,0,0,0.52)';
    g.beginPath(); g.moveTo(60, H - 60); g.lineTo(60, 60); g.lineTo(W - 60, 60); g.stroke();
    g.strokeStyle = 'rgba(255,214,155,0.26)';
    g.beginPath(); g.moveTo(W - 60, 60); g.lineTo(W - 60, H - 60); g.lineTo(60, H - 60); g.stroke();
    g.strokeStyle = 'rgba(255,224,175,0.2)';
    g.lineWidth = 3.5;
    panel(g, 80);
    g.stroke();
    // La plaquita de bronce bruñido con sus tornillitos y una florcita grabada.
    const gr = g.createLinearGradient(0, H / 2 - 30, 0, H / 2 + 30);
    gr.addColorStop(0, '#fae39c');
    gr.addColorStop(0.45, '#d4a146');
    gr.addColorStop(1, '#8c6022');
    g.fillStyle = gr;
    plaque(g);
    g.fill();
    g.strokeStyle = '#5a3a14';
    g.lineWidth = 3.5;
    g.stroke();
    g.fillStyle = '#6a4416';
    for (const x of [W / 2 - 76, W / 2 + 76]) { g.beginPath(); g.arc(x, H / 2, 5.2, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath(); g.arc(W / 2 + Math.cos(a) * 11, H / 2 + Math.sin(a) * 11, 5.5, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#fae39c';
    g.beginPath(); g.arc(W / 2, H / 2, 4, 0, Math.PI * 2); g.fill();
    // Tirador de bronce con sombra.
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.beginPath(); g.arc(W - 34, H / 2 + 3, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e6b85c';
    g.beginPath(); g.arc(W - 36, H / 2, 12, 0, Math.PI * 2); g.fill();
  });
  const glow = canvasTex(W, H, (g) => {
    g.fillStyle = '#1c130d';
    g.fillRect(0, 0, W, H);
    g.lineWidth = 8;
    g.strokeStyle = '#4a3420';
    g.beginPath(); g.moveTo(64, H - 64); g.lineTo(64, 64); g.lineTo(W - 64, 64); g.stroke();
    g.fillStyle = '#d6a852';
    plaque(g);
    g.fill();
    g.fillStyle = '#b8873a';
    g.beginPath(); g.arc(W - 36, H / 2, 12, 0, Math.PI * 2); g.fill();
  });
  doorTex = { map, glow };
  return doorTex;
}

// El vidrio de la ventanita: bien cristalino (sólo un bisel suave en el borde para que no tape ni lave la foto).
function glassTexture() {
  return canvasTex(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255,255,255,0.025)';
    g.beginPath();
    g.moveTo(8, 128); g.lineTo(18, 128); g.lineTo(44, 0); g.lineTo(34, 0);
    g.fill();
    g.strokeStyle = 'rgba(255,245,225,0.14)';
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, 125, 125);
  });
}

// El vitral del fondo de cada pasillo: un rosetón de vidrios de colores con una huellita en el medio.
function vitralTexture(hue) {
  return canvasTex(512, 512, (g) => {
    const cx = 256;
    const R = 252;
    const baseCols = ['#ff9a1f', '#e0457b', '#2bb3a8', '#8b5cc7', '#ffcf3a', '#3f8fd8'];
    const cols = baseCols.map((_, i) => baseCols[(i + hue) % 6]);
    g.fillStyle = '#1a0f0a';
    g.fillRect(0, 0, 512, 512);
    // Anillo de 16 pétalos luminosos con degradé interior.
    for (let i = 0; i < 16; i++) {
      const a0 = (i / 16) * Math.PI * 2;
      const a1 = ((i + 1) / 16) * Math.PI * 2;
      g.fillStyle = cols[i % 3];
      g.beginPath(); g.moveTo(cx, cx); g.arc(cx, cx, R - 10, a0 + 0.025, a1 - 0.025); g.closePath(); g.fill();
      g.fillStyle = cols[3 + (i % 3)];
      g.beginPath(); g.moveTo(cx, cx); g.arc(cx, cx, R * 0.68, a0 + 0.032, a1 - 0.032); g.closePath(); g.fill();
    }
    // Luz radial que atraviesa el vitral.
    const rad = g.createRadialGradient(cx, cx, 30, cx, cx, R);
    rad.addColorStop(0, 'rgba(255,248,220,0.38)');
    rad.addColorStop(0.55, 'rgba(255,220,160,0.12)');
    rad.addColorStop(1, 'rgba(15,8,5,0.28)');
    g.fillStyle = rad;
    g.beginPath(); g.arc(cx, cx, R - 8, 0, Math.PI * 2); g.fill();
    // Plomo entre vidrios.
    g.strokeStyle = '#1a0f0a';
    g.lineWidth = 9;
    for (const r of [R * 0.4, R * 0.68, R - 10]) { g.beginPath(); g.arc(cx, cx, r, 0, Math.PI * 2); g.stroke(); }
    // Centro: una huellita clara sobre ámbar dorado.
    g.fillStyle = '#ffd27a';
    g.beginPath(); g.arc(cx, cx, R * 0.38, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff8e8';
    g.beginPath(); g.ellipse(cx, cx + 20, 40, 34, 0, 0, Math.PI * 2); g.fill();
    for (const [dx, dy] of [[-48, -28], [-18, -56], [18, -56], [48, -28]]) {
      g.beginPath(); g.ellipse(cx + dx, cx + dy, 15, 19, dx * 0.01, 0, Math.PI * 2); g.fill();
    }
    // Textura de vidrio soplado artesanal.
    for (let i = 0; i < 480; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.09})`;
      g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, 1.5 + Math.random() * 5, 0, Math.PI * 2); g.fill();
    }
  });
}

// Alfombra del pasillo: roja tejida con guarda dorada y medallones de cempasúchil.
function runnerTexture() {
  return canvasTex(256, 512, (g) => {
    g.fillStyle = '#7a1630';
    g.fillRect(0, 0, 256, 512);
    // Trama textil suave.
    for (let y = 0; y < 512; y += 4) {
      g.fillStyle = y % 8 === 0 ? 'rgba(255,215,175,0.04)' : 'rgba(20,4,10,0.06)';
      g.fillRect(0, y, 256, 2);
    }
    g.fillStyle = '#e5ad3a';
    g.fillRect(12, 0, 14, 512);
    g.fillRect(230, 0, 14, 512);
    g.fillStyle = '#3a0a18';
    g.fillRect(32, 0, 6, 512);
    g.fillRect(218, 0, 6, 512);
    for (let y = 64; y < 512; y += 128) {
      g.fillStyle = '#ff9a1f';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        g.beginPath(); g.arc(128 + Math.cos(a) * 22, y + Math.sin(a) * 22, 13, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#ffd645';
      g.beginPath(); g.arc(128, y, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e0457b';
      for (const dx of [-68, 68]) {
        g.beginPath(); g.moveTo(128 + dx, y - 20); g.lineTo(128 + dx + 14, y); g.lineTo(128 + dx, y + 20); g.lineTo(128 + dx - 14, y); g.fill();
      }
    }
  }, { repeat: true });
}

// Cuadros decorativos para las paredes vacías del salón y los pasillos (arte popular mexicano y memorial).
const paintingCache = new Map();
function folkPaintingTexture(kind = 0) {
  const k = kind % 6;
  if (paintingCache.has(k)) return paintingCache.get(k);
  const t = canvasTex(384, 300, (g, W, H) => {
    const bg = g.createLinearGradient(0, 0, 0, H);
    const skies = [
      ['#140b2c', '#3d1c68', '#a83672', '#f7951f'],
      ['#0e1738', '#1e3068', '#3c629e', '#d6a456'],
      ['#240d2e', '#52194e', '#9e2a5b', '#e87a2e'],
      ['#0c1228', '#222854', '#583878', '#c86446'],
      ['#182e38', '#1f5462', '#2b8a88', '#e6a845'],
      ['#1a0e36', '#3b1d64', '#753288', '#e88b3a'],
    ][k];
    bg.addColorStop(0, skies[0]);
    bg.addColorStop(0.45, skies[1]);
    bg.addColorStop(0.78, skies[2]);
    bg.addColorStop(1, skies[3]);
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // Marco interno pintado con guarda dorada.
    g.strokeStyle = 'rgba(255,220,145,0.45)';
    g.lineWidth = 4;
    g.strokeRect(12, 12, W - 24, H - 24);
    // Estrellitas y luna.
    g.fillStyle = '#fff6d8';
    for (let i = 0; i < 38; i++) {
      const sx = 22 + ((i * 89 + k * 37) % (W - 44));
      const sy = 20 + ((i * 53 + k * 19) % Math.round(H * 0.58));
      const sr = (i % 5 === 0 ? 2.4 : 1.3);
      g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
    }
    const drawFlower = (cx, cy, r0, col1 = '#ff9a1f', col2 = '#ffd645') => {
      g.fillStyle = col1;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.beginPath(); g.arc(cx + Math.cos(a) * r0 * 0.65, cy + Math.sin(a) * r0 * 0.65, r0 * 0.46, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = col2;
      g.beginPath(); g.arc(cx, cy, r0 * 0.36, 0, Math.PI * 2); g.fill();
    };
    const drawPaw = (cx, cy, r0, col = '#ffe7a8') => {
      g.fillStyle = col;
      g.beginPath(); g.ellipse(cx, cy + r0 * 0.18, r0 * 0.46, r0 * 0.38, 0, 0, Math.PI * 2); g.fill();
      for (const [dx, dy] of [[-0.48, -0.26], [-0.17, -0.52], [0.17, -0.52], [0.48, -0.26]]) {
        g.beginPath(); g.ellipse(cx + dx * r0, cy + dy * r0, r0 * 0.18, r0 * 0.24, dx * 0.3, 0, Math.PI * 2); g.fill();
      }
    };
    if (k === 0) {
      // El Puente del Arcoíris sobre el río luminoso.
      const cols = ['#ff5e6c', '#ff9a3c', '#ffe052', '#52d68a', '#48b8ff', '#9b6bff'];
      cols.forEach((c, i) => {
        g.strokeStyle = c;
        g.lineWidth = 7;
        g.beginPath(); g.arc(W / 2, H * 0.82, 128 - i * 7, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      });
      g.fillStyle = '#123852';
      g.fillRect(14, H * 0.76, W - 28, H * 0.24 - 14);
      g.strokeStyle = '#6ce8ff';
      g.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        g.beginPath(); g.moveTo(45 + i * 52, H * 0.84 + (i % 2) * 10); g.lineTo(78 + i * 52, H * 0.84 + (i % 2) * 10); g.stroke();
      }
      drawPaw(W / 2, H * 0.32, 26, '#fff3cf');
    } else if (k === 1) {
      // El Principito, el zorro y la rosa bajo una luna grande.
      g.fillStyle = '#fff2c2';
      g.beginPath(); g.arc(W * 0.76, H * 0.26, 30, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2d4a32';
      g.beginPath(); g.arc(W * 0.5, H * 1.18, 175, Math.PI * 1.15, Math.PI * 1.85); g.fill();
      // Principito (silueta dorada y verde) y zorrito naranja.
      g.fillStyle = '#7bc47f';
      g.beginPath(); g.moveTo(W * 0.46, H * 0.52); g.lineTo(W * 0.53, H * 0.74); g.lineTo(W * 0.39, H * 0.74); g.closePath(); g.fill();
      g.fillStyle = '#ffd86b';
      g.beginPath(); g.arc(W * 0.46, H * 0.47, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e85d2a';
      g.beginPath(); g.ellipse(W * 0.58, H * 0.67, 16, 12, -0.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(W * 0.61, H * 0.56, 10, 0, Math.PI * 2); g.fill();
      drawFlower(W * 0.33, H * 0.66, 12, '#e62e5c', '#ffd24c');
    } else if (k === 2) {
      // Árbol de la vida con flores de cempasúchil y huellitas.
      g.fillStyle = '#1f1210';
      g.fillRect(14, H * 0.82, W - 28, H * 0.18 - 14);
      g.strokeStyle = '#d99b42';
      g.lineWidth = 10;
      g.beginPath(); g.moveTo(W / 2, H * 0.84); g.lineTo(W / 2, H * 0.46); g.stroke();
      for (const [ang, len] of [[-0.9, 68], [-0.45, 78], [0, 82], [0.45, 78], [0.9, 68]]) {
        const ex = W / 2 + Math.sin(ang) * len;
        const ey = H * 0.48 - Math.cos(ang) * len * 0.72;
        g.lineWidth = 5;
        g.beginPath(); g.moveTo(W / 2, H * 0.52); g.quadraticCurveTo(W / 2 + Math.sin(ang) * 35, H * 0.38, ex, ey); g.stroke();
        drawFlower(ex, ey, 16, '#ff9a1f', '#ffe066');
      }
      drawPaw(W / 2, H * 0.52, 18, '#fff4d6');
    } else if (k === 3) {
      // Pueblito iluminado con farolitos flotando al cielo.
      g.fillStyle = '#fff0be';
      g.beginPath(); g.arc(W * 0.24, H * 0.25, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#23132c';
      for (let i = 0; i < 6; i++) {
        const bx = 28 + i * 56;
        const bh = 52 + (i % 3) * 18;
        g.fillRect(bx, H * 0.86 - bh, 46, bh);
        g.fillStyle = '#ffb84d';
        g.fillRect(bx + 12, H * 0.86 - bh + 14, 10, 14);
        g.fillRect(bx + 26, H * 0.86 - bh + 14, 10, 14);
        g.fillStyle = '#23132c';
      }
      for (const [lx, ly] of [[110, 74], [175, 52], [240, 82], [295, 58], [145, 112], [220, 118]]) {
        g.fillStyle = '#ff9e2c';
        g.beginPath(); g.roundRect(lx - 7, ly - 10, 14, 20, 4); g.fill();
        g.fillStyle = '#fff6c8';
        g.beginPath(); g.arc(lx, ly, 4, 0, Math.PI * 2); g.fill();
      }
    } else if (k === 4) {
      // Corazón alado de hojalata (milagrito) rodeado de flores.
      g.fillStyle = '#f2d9a6';
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.ellipse(W / 2 + sd * 66, H * 0.52, 46, 22, sd * -0.28, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#d92356';
      g.beginPath();
      g.moveTo(W / 2, H * 0.74);
      g.bezierCurveTo(W / 2 - 58, H * 0.56, W / 2 - 54, H * 0.3, W / 2, H * 0.44);
      g.bezierCurveTo(W / 2 + 54, H * 0.3, W / 2 + 58, H * 0.56, W / 2, H * 0.74);
      g.fill();
      drawFlower(W / 2, H * 0.27, 16, '#ff9a1f', '#ffe35c');
      drawPaw(W / 2, H * 0.54, 18, '#fff2cf');
    } else {
      // Perrito y gatito de luz en un campo de cempasúchil.
      g.fillStyle = '#243b24';
      g.fillRect(14, H * 0.7, W - 28, H * 0.3 - 14);
      for (let i = 0; i < 9; i++) drawFlower(36 + i * 39, H * 0.78 + (i % 2) * 14, 12);
      // Siluetas luminosas mirando la luna.
      g.fillStyle = '#9cf5ff';
      g.beginPath(); g.ellipse(W * 0.42, H * 0.64, 22, 15, -0.1, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(W * 0.46, H * 0.51, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe394';
      g.beginPath(); g.ellipse(W * 0.59, H * 0.66, 16, 12, 0.1, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(W * 0.58, H * 0.55, 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff5c8';
      g.beginPath(); g.arc(W * 0.5, H * 0.24, 24, 0, Math.PI * 2); g.fill();
    }
    for (const [fx, fy] of [[24, 24], [W - 24, 24], [24, H - 24], [W - 24, H - 24]]) drawFlower(fx, fy, 11);
  });
  paintingCache.set(k, t);
  return t;
}

// Una caja con las UV escaladas a metros (para texturas que se repiten, como la madera o la talavera).
function box(w, h, d, x, y, z, uvScale = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (uvScale) {
    const uv = g.attributes.uv;
    const n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const ax = Math.abs(n.getX(i));
      const ay = Math.abs(n.getY(i));
      const su = ax > 0.5 ? d : w;
      const sv = ay > 0.5 ? d : h;
      uv.setXY(i, uv.getX(i) * su * uvScale, uv.getY(i) * sv * uvScale);
    }
  }
  return g.translate(x, y, z).toNonIndexed();
}

export function buildHall(scene, colliders, tier) {
  const r = rand(11);
  const frameMat = new THREE.MeshLambertMaterial({ color: '#efe2c8', emissive: '#3a2a1a', emissiveIntensity: 0.5 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#d9a748', roughness: 0.35, metalness: 0.8, emissive: '#6b4300', emissiveIntensity: 0.55 });
  const talaveraFrameMat = new THREE.MeshLambertMaterial({ color: '#2ea8a5', emissive: '#103c42', emissiveIntensity: 0.55 });
  const marigoldFrameMat = new THREE.MeshLambertMaterial({ color: '#f09426', emissive: '#5c2808', emissiveIntensity: 0.55 });
  const innerWarmMat = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.24, color: new THREE.Color(1.4, 0.95, 0.48) });
  const matMat = new THREE.MeshLambertMaterial({ color: '#f1e6d4' });
  const waxMat = new THREE.MeshLambertMaterial({ color: '#fff3e0', emissive: '#7a5226', emissiveIntensity: 0.45 });
  const postMat = new THREE.MeshLambertMaterial({ map: paintedWallTexture('#b5307a') });
  const marigoldGeo = marigoldGeometry(0.04, '#ffffff', r);
  const flowerMats = [PALETTE.cempasuchil, PALETTE.naranja, PALETTE.amarillo, '#e04b8a'].map((c) => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, color: c, emissive: c, emissiveIntensity: 0.25 }));
  const talavera = (() => { const t = talaveraTexture().clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t; })();
  const tileMat = new THREE.MeshLambertMaterial({ map: talavera, emissive: '#ffffff', emissiveMap: talavera, emissiveIntensity: 0.12 });
  // Madera de los muros: un poco de luz propia, para que de noche no queden negros.
  const darkWood = woodTexture('#4a2c1c');
  darkWood.wrapS = darkWood.wrapT = THREE.RepeatWrapping;
  const nicheMat = new THREE.MeshLambertMaterial({ map: darkWood, emissive: '#ffffff', emissiveMap: darkWood, emissiveIntensity: 0.2 });
  const trimWood = woodTexture('#8a5a36');
  trimWood.wrapS = trimWood.wrapT = THREE.RepeatWrapping;
  const trimMat = new THREE.MeshLambertMaterial({ map: trimWood, emissive: '#ffffff', emissiveMap: trimWood, emissiveIntensity: 0.22 });
  const creamMat = new THREE.MeshLambertMaterial({ color: '#fbefd9', emissive: '#3a2a1a', emissiveIntensity: 0.6 });
  const roofMat = new THREE.MeshLambertMaterial({ color: '#b5482a', emissive: '#2a0e06' });
  const animators = [];
  // Lo que tapa los toques (muros): así no se abre un nicho que está del otro lado de una pared.
  const blockers = [];

  // Jarrito de barro de la repisa (geometrías compartidas por todos los nichos).
  const jarGeo = new THREE.LatheGeometry([[0.0, 0], [0.032, 0], [0.045, 0.03], [0.046, 0.055], [0.034, 0.08], [0.03, 0.095], [0.038, 0.105]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  const jarRimGeo = new THREE.TorusGeometry(0.036, 0.006, 6, 16).rotateX(Math.PI / 2).translate(0, 0.105, 0);
  const jarLeafGeo = mergeGeometries([0, 1, 2, 3].map((i) => new THREE.SphereGeometry(0.03, 6, 4).scale(1.6, 0.25, 0.7).rotateZ(0.5).translate(0.04, 0.1, 0).rotateY(i * 1.57 + 0.4)));
  const jarMat = new THREE.MeshLambertMaterial({ color: '#b5532a', emissive: '#3a1408', emissiveIntensity: 0.6 });
  const leafMat = new THREE.MeshLambertMaterial({ color: '#4c8a3a', emissive: '#10200a' });

  const slots = [];
  const flames = [];
  const glowFx = [];
  const corridorLabels = [];
  const pickables = [];
  const bulbs = []; // lucecitas de las guirnaldas (pérgola y pasillos)
  const wallCells = []; // obituarios en las vitrinas de madera de las paredes del salón
  const vitrines = []; // cada vitrina con su cartel (el título sale de su tema, ver themedLists)
  const standingEasels = []; // atriles de madera con cuadritos en el centro del salón
  const sofas = []; // sillones del salón donde el personaje puede sentarse y descansar
  const wallTexCache = new Map(); // caché de retratos y plaquitas para no duplicar texturas en memoria móvil

  // ---------- el muro del salón ----------
  // Cada tramo es una serie de paredes rectas (cuerdas del círculo): por fuera pintadas, por dentro
  // con zócalo de madera, una franja de talavera, el revoque de color y una cornisa.
  // En todas las paredes del salón que no tienen ascensor van vitrinas de madera con obituarios (3x4).
  {
    const outer = [];
    const wains = [];
    const tiles = [];
    const trims = [];
    const cornices = [];
    const T = 0.4;
    const outerMat = new THREE.MeshLambertMaterial({ map: paintedWallTexture('#c9663a'), emissive: '#2a0e06' });
    const cabMat = new THREE.MeshLambertMaterial({ map: darkWood, color: '#331d10', emissive: '#170b05' });
    // Interior crema cálido de cada nicho de la vitrina (debajo del umbral de bloom para que se vea nítido y luminoso).
    const cabAlcoveMat = new THREE.MeshBasicMaterial({ color: '#ddd3c2' });
    const cabShelfMat = new THREE.MeshLambertMaterial({ color: '#ebe1d0', emissive: '#594836', emissiveIntensity: 0.55 });
    const darkFrameMat = new THREE.MeshLambertMaterial({ color: '#1b120c', emissive: '#0a0604' });
    let vitrineIdx = 0;

    // Vitrina de madera oscura con 12 obituarios iluminados (3 columnas x 4 filas) y cartel superior,
    // ubicada completamente delante del muro curvo y del friso de talavera para que nada la corte.
    const makeWallVitrine = (deg, w = 3.24, h = 3.44) => {
      const vIdx = vitrineIdx++;
      const g = new THREE.Group();
      const pos = onRing(deg, ROOM_R - 0.82, 0.16);
      g.position.copy(pos);
      g.lookAt(HALL_CENTER.x, 0.16, HALL_CENTER.z);
      const D = 0.34;
      const cols = 3;
      const rows = 4;
      const innerW = w - 0.24;
      const innerH = h - 0.28;
      const cellW = innerW / cols;
      const cellH = innerH / rows;
      const cabParts = [
        // Cuerpo macizo hacia atrás (hasta tocar la pared), cornisa superior y zócalo inferior.
        box(w + 0.08, h + 0.06, 0.48, 0, h / 2, -D / 2 - 0.22),
        box(w + 0.22, 0.15, D + 0.16, 0, h + 0.06, 0.03),
        box(w + 0.14, 0.14, D + 0.1, 0, 0.07, 0.02),
      ];
      for (let c = 0; c <= cols; c++) {
        const x = -innerW / 2 + c * cellW;
        cabParts.push(box(0.085, h, D, x, h / 2, 0));
      }
      for (let rIdx = 0; rIdx <= rows; rIdx++) {
        const y = 0.14 + rIdx * cellH;
        cabParts.push(box(w, 0.075, D, 0, y, 0));
      }
      g.add(new THREE.Mesh(mergeGeometries(cabParts), cabMat));
      // Cartel claro arriba de la vitrina (sin banderitas adelante que lo tapen). El título depende del
      // tema de la vitrina (recién llegadas, esperando una vela…) y se escribe al poblarla.
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, 0.38), new THREE.MeshBasicMaterial({ transparent: true }));
      banner.position.set(0, h + 0.34, 0.08);
      g.add(banner);
      vitrines.push({ banner, title: null });

      const alcoveParts = [];
      const shelfParts = [];
      const frameParts = [];
      const goldParts = [];
      const cw = cellW - 0.085;
      const ch = cellH - 0.075;
      const pw = cw * 0.54;
      const ph = ch * 0.64;
      const photoGeo = new THREE.PlaneGeometry(pw, ph);
      const plaqueGeo = new THREE.PlaneGeometry(cw * 0.62, 0.088);

      for (let rIdx = 0; rIdx < rows; rIdx++) {
        for (let c = 0; c < cols; c++) {
          const cx = -innerW / 2 + (c + 0.5) * cellW;
          const cy = 0.14 + (rows - 1 - rIdx + 0.5) * cellH;
          alcoveParts.push(
            box(cw, ch, 0.02, cx, cy, -D / 2 + 0.04),
            box(0.015, ch, D - 0.06, cx - cw / 2 + 0.008, cy, 0),
            box(0.015, ch, D - 0.06, cx + cw / 2 - 0.008, cy, 0),
          );
          shelfParts.push(box(cw, 0.024, D - 0.04, cx, cy - ch / 2 + 0.012, 0.01));

          const isSpecial = (rIdx === 3 && c === 1) || (rIdx === 2 && c === 1);
          if (isSpecial) {
            const bgPlane = new THREE.Mesh(
              new THREE.PlaneGeometry(cw - 0.01, ch - 0.01),
              new THREE.MeshBasicMaterial({ map: backgroundTexture(rIdx === 3 ? 'cempasuchil' : 'jardin'), color: new THREE.Color(0.88, 0.86, 0.82) }),
            );
            bgPlane.position.set(cx, cy, -D / 2 + 0.055);
            g.add(bgPlane);
          }

          const fBox = box(pw + 0.065, ph + 0.065, 0.03, cx, cy + 0.035, -0.02);
          if (isSpecial) goldParts.push(fBox);
          else frameParts.push(fBox);

          // Soporte de bronce de la plaquita (unido en una sola malla por vitrina).
          goldParts.push(
            new THREE.BoxGeometry(cw * 0.64, 0.095, 0.022)
              .rotateX(-0.15)
              .translate(cx, cy - ch / 2 + 0.045, D / 2 - 0.01)
              .toNonIndexed(),
          );

          const photo = new THREE.Mesh(photoGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.88, 0.86, 0.84) }));
          photo.position.set(cx, cy + 0.035, -0.002);
          photo.userData = { kind: 'decor' };
          pickables.push(photo);

          const plaqueMesh = new THREE.Mesh(plaqueGeo, new THREE.MeshBasicMaterial({ transparent: true }));
          plaqueMesh.position.set(cx, cy - ch / 2 + 0.046, D / 2 + 0.003);
          plaqueMesh.rotation.x = -0.15;

          g.add(photo, plaqueMesh);
          wallCells.push({ photo, plaque: plaqueMesh, vitrine: vIdx, pos: rIdx * cols + c });
        }
      }
      g.add(new THREE.Mesh(mergeGeometries(alcoveParts), cabAlcoveMat));
      g.add(new THREE.Mesh(mergeGeometries(shelfParts), cabShelfMat));
      if (frameParts.length) g.add(new THREE.Mesh(mergeGeometries(frameParts), darkFrameMat));
      if (goldParts.length) g.add(new THREE.Mesh(mergeGeometries(goldParts), goldMat));
      scene.add(g);
    };

    ROOM_ARCS.forEach(([a0, a1], ai) => {
      if (LIFT_ARCS.some((arc) => arc && a0 === arc[0])) return; // esos tramos son las paredes de los dos ascensores (elevator.js)
      const n = Math.max(1, Math.ceil((a1 - a0) / 9));
      const inner = [];
      for (let k = 0; k < n; k++) {
        const ta = a0 + ((a1 - a0) * k) / n;
        const tb = a0 + ((a1 - a0) * (k + 1)) / n;
        const pa = onRing(ta, ROOM_R);
        const pb = onRing(tb, ROOM_R);
        const len = pa.distanceTo(pb) + 0.06;
        const mid = onRing((ta + tb) / 2, ROOM_R * Math.cos(rad((tb - ta) / 2)));
        const ry = rad((ta + tb) / 2) + Math.PI; // la cara +z mira al centro
        const place = (g) => g.rotateY(ry).translate(mid.x, 0, mid.z);
        outer.push(place(box(len, ROOM_WALL_H, T, 0, ROOM_WALL_H / 2, 0)));
        inner.push(place(new THREE.PlaneGeometry(len, ROOM_WALL_H - 1.5).translate(0, 1.4 + (ROOM_WALL_H - 1.5) / 2, T / 2 + 0.005).toNonIndexed()));
        wains.push(place(box(len, 1.1, 0.05, 0, 0.55, T / 2 + 0.025, 1)));
        tiles.push(place(box(len, 0.3, 0.02, 0, 1.25, T / 2 + 0.012, 3.4)));
        trims.push(place(box(len, 0.06, 0.08, 0, 1.1, T / 2 + 0.04)), place(box(len, 0.05, 0.05, 0, 1.4, T / 2 + 0.025)));
        cornices.push(place(box(len + 0.04, 0.2, T + 0.3, 0, ROOM_WALL_H, 0)));
        colliders.segments.push([pa.x, pa.z, pb.x, pb.z]);
      }
      const paint = new THREE.Mesh(mergeGeometries(inner), new THREE.MeshLambertMaterial({ map: paintedWallTexture(WALL_COLORS[ai % WALL_COLORS.length]), emissive: '#1a0c08' }));
      scene.add(paint);
      if (a1 - a0 > 30) {
        // Tramos largos de la entrada: dos vitrinas grandes de obituarios por pared, centradas a cada lado del pilar central del tramo.
        for (let k = 0; k < 2; k++) {
          const ta = a0 + 3 + k * ((a1 - a0 - 6) / 2);
          const tb = ta + (a1 - a0 - 6) / 2;
          makeWallVitrine((ta + tb) / 2, 3.24, 3.44);
        }
      } else if (a1 - a0 > 14) {
        // Tramos entre pasillos sin ascensor: vitrina completa de 3x4 obituarios.
        makeWallVitrine((a0 + a1) / 2, 3.24, 3.44);
      }
    });
    const walls = new THREE.Mesh(mergeGeometries(outer), outerMat);
    walls.userData.kind = 'wall';
    blockers.push(walls);
    scene.add(walls, new THREE.Mesh(mergeGeometries(wains), nicheMat), new THREE.Mesh(mergeGeometries(tiles), tileMat), new THREE.Mesh(mergeGeometries(trims), creamMat), new THREE.Mesh(mergeGeometries(cornices), roofMat));
  }

  // Geometrías y materiales compartidos por los nichos (se usan dentro de makeSlot).
  const frameGeo = (() => {
    const t = 0.05;
    const w = PW + 2 * t;
    const h = PH + 2 * t;
    return mergeGeometries([
      new THREE.BoxGeometry(w, t, 0.03).translate(0, h / 2 - t / 2, 0),
      new THREE.BoxGeometry(w, t, 0.03).translate(0, -h / 2 + t / 2, 0),
      new THREE.BoxGeometry(t, h - 2 * t, 0.03).translate(-w / 2 + t / 2, 0, 0),
      new THREE.BoxGeometry(t, h - 2 * t, 0.03).translate(w / 2 - t / 2, 0, 0),
    ].map((x) => x.toNonIndexed()));
  })();
  const clothMat = new THREE.MeshLambertMaterial({ color: '#fbf3e6', emissive: '#4a3626', emissiveIntensity: 0.5 });
  const glassMat = new THREE.MeshBasicMaterial({ map: glassTexture(), transparent: true, depthWrite: false });
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  // Geometrías compartidas para las dos ventanitas batientes de vidrio de cada nicho y las 4 repisitas de madera.
  const casementFrameMat = new THREE.MeshLambertMaterial({ color: '#d8d4ce', emissive: '#4a453e', emissiveIntensity: 0.45 });
  const casementGlassTex = canvasTex(128, 256, (g) => {
    g.fillStyle = 'rgba(235, 242, 250, 0.14)';
    g.fillRect(0, 0, 128, 256);
    g.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    g.lineWidth = 3;
    g.strokeRect(2, 2, 124, 252);
    // Puntitos sutiles del vidrio esmerilado y reflejo diagonal.
    g.fillStyle = 'rgba(255, 255, 255, 0.18)';
    for (let y = 16; y < 256; y += 24) {
      for (let x = 16; x < 128; x += 24) {
        g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill();
      }
    }
    g.fillStyle = 'rgba(255, 255, 255, 0.06)';
    g.beginPath(); g.moveTo(12, 256); g.lineTo(38, 256); g.lineTo(96, 0); g.lineTo(70, 0); g.closePath(); g.fill();
  });
  const casementGlassMat = new THREE.MeshBasicMaterial({ map: casementGlassTex, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
  const winW = OW / 2 - 0.008;
  const winH = OH - 0.016;
  const winBar = 0.026;
  const makeCasementLeafGeo = (dir) => {
    // dir = +1 para hoja izquierda (se extiende de 0 a +winW desde la bisagra), -1 para hoja derecha (0 a -winW).
    const cx = dir * (winW / 2);
    return mergeGeometries([
      new THREE.BoxGeometry(winW, winBar, 0.022).translate(cx, winH / 2 - winBar / 2, 0),
      new THREE.BoxGeometry(winW, winBar, 0.022).translate(cx, -winH / 2 + winBar / 2, 0),
      new THREE.BoxGeometry(winBar, winH - 2 * winBar, 0.022).translate(dir * (winBar / 2), 0, 0),
      new THREE.BoxGeometry(winBar, winH - 2 * winBar, 0.022).translate(dir * (winW - winBar / 2), 0, 0),
      // Bisagras metálicas en el borde exterior.
      new THREE.CylinderGeometry(0.01, 0.01, 0.07, 6).translate(dir * 0.008, winH * 0.28, 0.008),
      new THREE.CylinderGeometry(0.01, 0.01, 0.07, 6).translate(dir * 0.008, -winH * 0.28, 0.008),
    ].map((x) => x.toNonIndexed()));
  };
  const winLeafGeoL = makeCasementLeafGeo(1);
  const winLeafGeoR = makeCasementLeafGeo(-1);
  const winGlassGeoL = new THREE.PlaneGeometry(winW - winBar * 2, winH - winBar * 2).translate(winW / 2, 0, 0);
  const winGlassGeoR = new THREE.PlaneGeometry(winW - winBar * 2, winH - winBar * 2).translate(-winW / 2, 0, 0);
  const darkPictureFrameMat = new THREE.MeshLambertMaterial({ color: '#1e1612', emissive: '#0c0806' });
  const shelfWoodMat = new THREE.MeshLambertMaterial({ map: trimWood, color: '#c48d56', emissive: '#3d2410', emissiveIntensity: 0.45 });
  const pillBadgeMat = new THREE.MeshBasicMaterial({ color: '#e2d8c8' });
  const DEFAULT_SHELF_GIFTS = ['🧸', '🎾', '🦴', '🧁', '🧶', '🦆'];
  // Geometrías únicas compartidas por los 270 nichos para ahorrar memoria gráfica en celulares.
  const SHELF_SPOTS = [
    [-0.36, 0.145, -DEPTH * 0.56],
    [-0.36, -0.055, -DEPTH * 0.56],
    [0.36, 0.145, -DEPTH * 0.56],
    [0.36, -0.055, -DEPTH * 0.56],
  ];
  const slotMatGeo = new THREE.PlaneGeometry(OW - 0.02, OH - 0.02);
  const slotPhotoGeo = new THREE.PlaneGeometry(PW, PH);
  const slotNameGeo = new THREE.PlaneGeometry(0.68, 0.125);
  const slotInnerNameGeo = new THREE.PlaneGeometry(0.44, 0.098);
  const slotPickGeo = new THREE.PlaneGeometry(OW + 0.1, OH + 0.1);
  const slotShelvesGeo = mergeGeometries(
    SHELF_SPOTS.map(([sx, sy, sz]) => box(0.22, 0.024, DEPTH * 0.44, sx, sy, sz)),
  );
  const slotCreamStaticGeo = mergeGeometries([
    box(OW - 0.03, 0.036, DEPTH - 0.03, 0, -OH / 2 + 0.018, -DEPTH / 2),
    new THREE.BoxGeometry(0.46, 0.11, 0.024).rotateX(-0.22).translate(0, -OH / 2 + 0.068, -DEPTH * 0.36).toNonIndexed(),
    ...SHELF_SPOTS.map(([sx, sy, sz]) => box(0.058, 0.024, 0.012, sx + (sx < 0 ? 0.04 : -0.04), sy + 0.002, sz + DEPTH * 0.225)),
  ]);
  void glassMat;
  void pillBadgeMat;

  // ---------- los pasillos ----------
  {
    const wallParts = [];
    const trimParts = [];
    const roofParts = [];
    const beamParts = [];
    const potParts = [];
    const leafParts = [];
    const flowerPts = [];
    const coneMat = new THREE.MeshBasicMaterial({ map: lightConeTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: tier.bloom ? 0.035 : 0.06 });
    const runnerMat = new THREE.MeshLambertMaterial({ map: runnerTexture(), emissive: '#3a0a12', polygonOffset: true, polygonOffsetFactor: -2 });
    const vitralGlow = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.1, color: new THREE.Color(1.0, 0.7, 0.45) });
    const leafMat2 = new THREE.MeshLambertMaterial({ color: '#3f7a35', emissive: '#0c1c08', side: THREE.DoubleSide });
    const slotRow = (rowIdx) => ROWS_Y[ROW_ORDER[rowIdx]];

    for (let c = 0; c < CORRIDORS; c++) {
      const { u, o } = corridorFrame(c);
      const cg = new THREE.Group();
      cg.position.copy(o);
      cg.rotation.y = Math.atan2(u.x, u.z);
      scene.add(cg);
      cg.updateMatrixWorld(true);
      const M = cg.matrixWorld;
      const toWorld = (g) => g.applyMatrix4(M);
      const P = (x, z) => new THREE.Vector3(x, 0, z).applyMatrix4(M);
      const lw = [];
      const lt = [];
      const lr = [];

      // Paredes de nichos (las dos) y la del fondo.
      for (const sd of [-1, 1]) {
        const xf = sd * HW; // cara de los nichos
        const xm = sd * (HW + DEPTH / 2);
        const xb = sd * (HW + DEPTH + (WALL - DEPTH) / 2);
        const zs = -0.65;
        // Fondo macizo, partes sin nichos y las franjas entre filas y columnas.
        lw.push(box(WALL - DEPTH, WALL_H, LEN - zs, xb, WALL_H / 2, (zs + LEN) / 2, 1));
        lw.push(box(DEPTH, WALL_H, Z0 - zs, xm, WALL_H / 2, (zs + Z0) / 2, 1));
        lw.push(box(DEPTH, WALL_H, LEN - ZB, xm, WALL_H / 2, (ZB + LEN) / 2, 1));
        const bandY = [0, ...ROWS_Y.flatMap((y) => [y - OH / 2, y + OH / 2]), WALL_H];
        for (let k = 0; k < bandY.length; k += 2) {
          const y0 = bandY[k];
          const y1 = bandY[k + 1];
          lw.push(box(DEPTH, y1 - y0, ZB - Z0, xm, (y0 + y1) / 2, (Z0 + ZB) / 2, 1));
        }
        for (const y of ROWS_Y) {
          for (let k = 0; k <= COLS; k++) {
            const za = k === 0 ? Z0 : Z0 + k * PX - (PX - OW) / 2;
            const zb = k === COLS ? ZB : Z0 + k * PX + (PX - OW) / 2;
            lw.push(box(DEPTH, OH, zb - za, xm, y, (za + zb) / 2, 1));
          }
          // Moldura clara alrededor de cada hueco (el bisel del nicho).
          for (let k = 0; k < COLS; k++) {
            const zc = Z0 + PX / 2 + k * PX;
            const xt = xf - sd * 0.012;
            lt.push(
              box(0.03, 0.05, OW + 0.1, xt, y + OH / 2 + 0.025, zc),
              box(0.03, 0.05, OW + 0.1, xt, y - OH / 2 - 0.025, zc),
              box(0.03, OH, 0.05, xt, y, zc - OW / 2 - 0.025),
              box(0.03, OH, 0.05, xt, y, zc + OW / 2 + 0.025),
            );
          }
        }
        // Cornisa arriba y zócalo.
        lr.push(box(WALL + 0.25, 0.16, LEN - zs + 0.3, sd * (HW + WALL / 2 - 0.1), WALL_H + 0.08, (zs + LEN) / 2 + 0.1));
        lt.push(box(0.04, 0.16, Z0 - zs, xf - sd * 0.02, 0.08, (zs + Z0) / 2), box(0.04, 0.16, LEN - ZB, xf - sd * 0.02, 0.08, (ZB + LEN) / 2));
        // Haz de luz cálida sobre la pared de nichos.
        const cone = new THREE.Mesh(new THREE.PlaneGeometry(ZB - Z0 + 0.8, WALL_H - 0.1), coneMat);
        cone.position.set(xf - sd * 0.03, WALL_H / 2, (Z0 + ZB) / 2);
        cone.rotation.y = -sd * Math.PI / 2;
        cg.add(cone);
        // Macetas con plantas, después de los nichos.
        const pot = P(sd * (HW - 0.38), ZB + 0.6);
        potParts.push(toWorld(new THREE.CylinderGeometry(0.3, 0.21, 0.55, 14).translate(sd * (HW - 0.38), 0.27, ZB + 0.6).toNonIndexed()));
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + r();
          const tilt = 0.5 + r() * 0.5;
          const leaf = new THREE.SphereGeometry(0.11, 6, 4).scale(0.55, 0.12, 2.4).translate(0, 0, 0.24);
          leaf.rotateX(-tilt).rotateY(a).translate(sd * (HW - 0.38), 0.62 + r() * 0.12, ZB + 0.6);
          leafParts.push(toWorld(leaf.toNonIndexed()));
        }
        for (let i = 0; i < 10; i++) {
          const a = r() * Math.PI * 2;
          const p = new THREE.Vector3(sd * (HW - 0.38) + Math.cos(a) * 0.16, 0.66 + r() * 0.18, ZB + 0.6 + Math.sin(a) * 0.16).applyMatrix4(M);
          flowerPts.push([p.x, p.y, p.z, 0.8 + r() * 0.5]);
        }
        colliders.circles.push({ x: pot.x, z: pot.z, r: 0.36 });
        // Choque: la cara de los nichos.
        const a = P(xf, zs);
        const b = P(xf, LEN);
        colliders.segments.push([a.x, a.z, b.x, b.z]);
      }
      // Pared del fondo con el vitral, y un banco abajo.
      lw.push(box(2 * (HW + WALL), WALL_H, 0.3, 0, WALL_H / 2, LEN + 0.15, 1));
      lr.push(box(2 * (HW + WALL) + 0.3, 0.16, 0.6, 0, WALL_H + 0.08, LEN + 0.15));
      {
        const e1 = P(-HW, LEN);
        const e2 = P(HW, LEN);
        colliders.segments.push([e1.x, e1.z, e2.x, e2.z]);
        const vitTex = vitralTexture(c);
        const vit = new THREE.Mesh(new THREE.CircleGeometry(0.82, 40), new THREE.MeshBasicMaterial({ map: vitTex, color: tier.bloom ? new THREE.Color(1.12, 1.04, 0.96) : new THREE.Color(0.95, 0.9, 0.85) }));
        vit.position.set(0, 2.3, LEN - 0.006);
        vit.rotation.y = Math.PI;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.06, 8, 40), goldMat);
        ring.position.copy(vit.position).setZ(LEN - 0.02);
        const gl = new THREE.Sprite(vitralGlow);
        gl.scale.setScalar(2.4);
        gl.position.set(0, 2.3, LEN - 0.3);
        // Reflejo multicolor del vitral proyectado sobre el piso del pasillo.
        const floorProj = new THREE.Mesh(
          new THREE.CircleGeometry(1.15, 32).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ map: vitTex, transparent: true, opacity: 0.19, blending: THREE.AdditiveBlending, depthWrite: false }),
        );
        floorProj.position.set(0, 0.016, LEN - 1.35);
        cg.add(vit, ring, gl, floorProj);
        // Cuadros decorativos a los lados del vitral del fondo y en los tramos libres al final del pasillo.
        for (const [si, sx] of [[-1, -1.52], [1, 1.52]]) {
          const pw = 0.78;
          const ph = 0.98;
          const pf = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.1, ph + 0.1, 0.045), goldMat);
          pf.position.set(sx, 2.25, LEN - 0.025);
          const pa = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: folkPaintingTexture(c * 2 + (si > 0 ? 1 : 0)), color: new THREE.Color(0.95, 0.92, 0.88) }));
          pa.position.set(sx, 2.25, LEN - 0.052);
          pa.rotation.y = Math.PI;
          cg.add(pf, pa);
        }
        for (const sd of [-1, 1]) {
          const pw = 0.74;
          const ph = 0.9;
          const pf = new THREE.Mesh(new THREE.BoxGeometry(0.045, ph + 0.1, pw + 0.1), goldMat);
          pf.position.set(sd * (HW - 0.02), 2.15, ZB + 0.58);
          const pa = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: folkPaintingTexture(c + (sd > 0 ? 3 : 5)), color: new THREE.Color(0.95, 0.92, 0.88) }));
          pa.position.set(sd * (HW - 0.048), 2.15, ZB + 0.58);
          pa.rotation.y = -sd * Math.PI / 2;
          cg.add(pf, pa);
        }
        // Banco de madera bajo el vitral.
        beamParts.push(
          toWorld(box(1.7, 0.08, 0.42, 0, 0.46, LEN - 0.42)),
          toWorld(box(1.7, 0.4, 0.06, 0, 0.78, LEN - 0.2)),
          ...[-0.75, 0.75].flatMap((x) => [toWorld(box(0.08, 0.46, 0.38, x, 0.23, LEN - 0.42))]),
        );
        for (const x of [-0.5, 0.5]) { const p = P(x, LEN - 0.4); colliders.circles.push({ x: p.x, z: p.z, r: 0.35 }); }
      }
      // Vigas cruzadas arriba, alfombra y una guirnalda de lucecitas en zigzag de viga a viga.
      const beamZ = [0.0, 1.8, 3.6, 5.4, 7.2, 9.0, 10.8, 12.6, LEN - 0.2];
      for (const z of beamZ) beamParts.push(toWorld(box(2 * (HW + WALL) + 0.3, 0.16, 0.2, 0, WALL_H + 0.24, z)));
      for (let k = 0; k < beamZ.length - 1; k++) {
        const sd = k % 2 ? 1 : -1;
        const a = new THREE.Vector3(sd * (HW - 0.2), WALL_H + 0.12, beamZ[k]);
        const b = new THREE.Vector3(-sd * (HW - 0.2), WALL_H + 0.12, beamZ[k + 1]);
        const n = Math.max(4, Math.round(tier.bulbsPerStrand * 0.4));
        for (let i = 1; i < n; i++) {
          const t = i / n;
          const p = new THREE.Vector3().lerpVectors(a, b, t);
          p.y -= Math.sin(Math.PI * t) * 0.35 + 0.06;
          bulbs.push(p.applyMatrix4(M));
        }
      }
      const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.5, LEN - 0.9).rotateX(-Math.PI / 2), runnerMat);
      runner.material.map.repeat.set(1, (LEN - 0.9) / 1.6);
      runner.position.set(0, 0.168, (LEN - 0.9) / 2 + 0.05);
      cg.add(runner);
      // Tres farolitos de papel colgando a lo largo del pasillo largo.
      for (const [li, lz] of [[0, 3.0], [1, 7.4], [2, 11.8]]) {
        const hang = new THREE.Group();
        hang.position.set(0, WALL_H + 0.24, lz);
        const string = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 4), new THREE.MeshBasicMaterial({ color: '#2a1d16' }));
        string.position.y = -0.18;
        const TINTS = [[2.2, 0.9, 1.3], [2.2, 1.3, 0.5], [0.8, 1.8, 1.6], [2.2, 1.7, 0.6], [1.3, 0.9, 2.0]];
        const l = paperLantern({ scale: 1.4, tint: TINTS[(c + li) % TINTS.length], glow: 1.0 });
        l.position.y = -0.48;
        hang.add(string, l);
        cg.add(hang);
        animators.push((tt) => { hang.rotation.z = Math.sin(tt * 0.9 + c + li) * 0.05; hang.rotation.x = Math.sin(tt * 0.7 + c * 2 + li) * 0.04; flickerLantern(l, tt); });
      }
      // La boca del pasillo: dintel sobre la entrada, cartel colgado y cuadros verticales en las jambas.
      {
        lr.push(box(2 * (HW + WALL) + 0.2, 0.42, 0.5, 0, ROOM_WALL_H - 0.21, -0.25));
        const labelMat = new THREE.MeshBasicMaterial({ transparent: true });
        const label = twoSided(new THREE.PlaneGeometry(3.3, 0.52), labelMat);
        label.userData.mat = labelMat;
        label.position.set(0, 3.92, -0.58);
        label.rotation.y = Math.PI; // mira al salón
        cg.add(label);
        for (const sx of [-1.25, 1.25]) {
          const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 4), new THREE.MeshLambertMaterial({ color: '#c9973f' }));
          chain.position.set(sx, 4.3, -0.58);
          cg.add(chain);
        }
        corridorLabels.push(label);
        // Cuadros verticales con retrato y nombre en las jambas de entrada a cada pasillo (sin brillo que encandile).
        for (const [si, sd] of [[0, -1], [1, 1]]) {
          const pg = new THREE.Group();
          pg.position.set(sd * (HW - 0.03), 1.98, 0.02);
          pg.rotation.y = -sd * Math.PI / 2;
          const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.38, 0.04), nicheMat);
          const pMat = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.28), new THREE.MeshBasicMaterial({ color: '#d8cfc0' }));
          pMat.position.z = 0.022;
          const pInnerBorder = new THREE.Mesh(new THREE.PlaneGeometry(0.575, 0.895), new THREE.MeshBasicMaterial({ color: '#2b1c12' }));
          pInnerBorder.position.set(0, 0.14, 0.024);
          const pPhoto = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.87), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.88, 0.86, 0.84) }));
          pPhoto.position.set(0, 0.14, 0.026);
          pPhoto.userData = { kind: 'decor' };
          pickables.push(pPhoto);
          const pName = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.2), new THREE.MeshBasicMaterial({ transparent: true }));
          pName.position.set(0, -0.44, 0.026);
          pg.add(pFrame, pMat, pInnerBorder, pPhoto, pName);
          cg.add(pg);
          wallCells.push({ photo: pPhoto, plaque: pName, corridor: c, pos: si, lightPlaque: true });
        }
        // Macetitas verdes con hojas en la entrada de cada pasillo.
        for (const sd of [-1, 1]) {
          const ep = new THREE.Group();
          ep.position.set(sd * (HW - 0.28), 0.16, 0.52);
          const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.28, 12), creamMat);
          pot.position.y = 0.14;
          ep.add(pot);
          for (let l = 0; l < 7; l++) {
            const la = (l / 7) * Math.PI * 2;
            const lf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4).scale(0.5, 1.8, 0.25), leafMat2);
            lf.position.set(Math.cos(la) * 0.07, 0.34 + (l % 2) * 0.05, Math.sin(la) * 0.07);
            lf.rotation.set(0.35 * Math.sin(la), la, -0.35 * Math.cos(la));
            ep.add(lf);
          }
          cg.add(ep);
        }
      }

      // ---------- los nichos de este pasillo ----------
      // Las primeras 3 columnas conservan los números 0..89; las 3 columnas del fondo usan 90..179.
      for (let rowIdx = 0; rowIdx < ROWS; rowIdx++) {
        for (const [sdIdx, sd] of [[0, -1], [1, 1]]) {
          for (let col = 0; col < COLS; col++) {
            const block = Math.floor(col / 3);
            const local = block * 90 + c * 18 + rowIdx * 6 + sdIdx * 3 + (col % 3);
            const g = new THREE.Group();
            g.position.set(sd * HW, slotRow(rowIdx), Z0 + PX / 2 + col * PX);
            g.rotation.y = -sd * Math.PI / 2; // +z hacia el pasillo
            cg.add(g);
            slots[local] = makeSlot(g, local);
          }
        }
      }
      wallParts.push(...lw.map(toWorld));
      trimParts.push(...lt.map(toWorld));
      roofParts.push(...lr.map(toWorld));
      cg.updateMatrixWorld(true);
    }
    const walls = new THREE.Mesh(mergeGeometries(wallParts), nicheMat);
    walls.userData.kind = 'wall';
    blockers.push(walls);
    scene.add(walls);
    scene.add(new THREE.Mesh(mergeGeometries(trimParts), trimMat));
    scene.add(new THREE.Mesh(mergeGeometries(roofParts), roofMat));
    scene.add(new THREE.Mesh(mergeGeometries(beamParts), nicheMat));
    scene.add(new THREE.Mesh(mergeGeometries(potParts), new THREE.MeshLambertMaterial({ map: talavera })));
    scene.add(new THREE.Mesh(mergeGeometries(leafParts), leafMat2));
    scene.add(marigoldCluster(flowerPts, { r: 0.07, rnd: r }));
  }

  // Arma un nicho liviano al inicio; el interior detallado (velas, flores, repisitas, ventanitas y efectos)
  // se construye recién cuando el nicho se ocupa (fillSlot), ahorrando >11.000 objetos 3D en celulares.
  function makeSlot(g, local) {
    const inside = new THREE.Group();
    inside.visible = false;
    const pick = new THREE.Mesh(slotPickGeo, pickMat);
    pick.position.z = 0.05;
    pick.userData = { kind: 'slot', local };
    pickables.push(pick);
    g.add(inside, pick);
    return {
      group: g, inside, pick, photo: pick,
      built: false, memorial: null, textures: [], open: 0, openTarget: 0, openDelay: 0, local,
    };
  }

  function buildSlotInside(s) {
    if (s.built) return;
    s.built = true;
    const { inside, local } = s;
    const mat = new THREE.Mesh(slotMatGeo, new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#4a3828', emissiveIntensity: 0.42 }));
    mat.position.z = -DEPTH + 0.01;
    const border = new THREE.Mesh(frameGeo, darkPictureFrameMat);
    border.position.set(0, PHOTO_Y, -DEPTH * 0.65 - 0.006);
    const photo = new THREE.Mesh(slotPhotoGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.92, 0.92, 0.92) }));
    photo.position.set(0, PHOTO_Y, -DEPTH * 0.65);
    const creamStatic = new THREE.Mesh(slotCreamStaticGeo, clothMat);
    const name = new THREE.Mesh(slotNameGeo, new THREE.MeshBasicMaterial({ transparent: true }));
    name.position.set(0, -OH / 2 - 0.055, 0.048);
    const innerName = new THREE.Mesh(slotInnerNameGeo, new THREE.MeshBasicMaterial({ transparent: true }));
    innerName.position.set(0, -OH / 2 + 0.07, -DEPTH * 0.36 + 0.014);
    innerName.rotation.x = -0.22;

    const shelf = new THREE.Group();
    shelf.position.set(0, -OH / 2 + 0.032, -DEPTH / 2 + 0.02);
    shelf.scale.setScalar(1.18);
    const candles = [0, 1, 2].map((i) => {
      const c = makeCandle(waxMat, 0.09 + i * 0.03, flames, tier.bloom);
      c.position.set([0.31, 0.38, 0.25][i], 0.0, [0.05, -0.03, -0.06][i]);
      c.visible = false;
      shelf.add(c);
      return c;
    });
    const jar = new THREE.Group();
    jar.position.set(-0.32, 0.0, 0.03);
    jar.scale.setScalar(1.22);
    jar.add(new THREE.Mesh(jarGeo, jarMat), new THREE.Mesh(jarRimGeo, jarMat), new THREE.Mesh(jarLeafGeo, leafMat));
    jar.visible = false;
    shelf.add(jar);
    const flowers = BOUQUET.map(([x, y, z, sc], i) => {
      const f = new THREE.Mesh(marigoldGeo, flowerMats[(local + i) % flowerMats.length]);
      f.position.set(x, y, z);
      f.scale.setScalar(sc);
      f.rotation.set(x * 4, i, z * 4);
      f.visible = false;
      jar.add(f);
      return f;
    });
    const sideShelves = new THREE.Mesh(slotShelvesGeo, shelfWoodMat);
    const gifts = [0, 1, 2, 3, 4].map((i) => {
      const h = giftHolder(i < 4 ? 0.125 : 0.145);
      if (i < 4) {
        const [sx, sy, sz] = SHELF_SPOTS[i];
        h.position.set(sx, sy + 0.012, sz + 0.01);
        h.rotation.y = sx < 0 ? 0.32 : -0.32;
        inside.add(h);
      } else {
        h.position.set(0.22, 0.0, 0.06);
        h.rotation.y = -0.25;
        shelf.add(h);
      }
      return h;
    });
    const winL = new THREE.Group();
    winL.position.set(-OW / 2 + 0.006, 0, 0.01);
    winL.add(new THREE.Mesh(winLeafGeoL, casementFrameMat), new THREE.Mesh(winGlassGeoL, casementGlassMat));
    const winR = new THREE.Group();
    winR.position.set(OW / 2 - 0.006, 0, 0.01);
    winR.add(new THREE.Mesh(winLeafGeoR, casementFrameMat), new THREE.Mesh(winGlassGeoR, casementGlassMat));

    const fx = makeGlowFx(glowFx, 0.72);
    fx.group.position.set(0, 0.04, 0.02);
    const warmHalo = new THREE.Sprite(innerWarmMat);
    warmHalo.scale.set(0.98, 0.9, 1);
    warmHalo.position.set(0, -0.02, -DEPTH * 0.45);
    warmHalo.visible = false;
    inside.add(mat, border, photo, creamStatic, sideShelves, innerName, winL, winR, name, shelf, warmHalo, fx.group);
    Object.assign(s, { border, mat, photo, name, innerName, winL, winR, shelf, candles, jar, flowers, gifts, warmHalo, fx });
  }

  // ---------- puertitas de los nichos (todas en un solo dibujo) ----------
  const DT = doorTextures();
  const doorGeo = new THREE.BoxGeometry(OW - 0.02, OH - 0.02, 0.045).translate((OW - 0.02) / 2, 0, 0.0225);
  const doorMat = new THREE.MeshLambertMaterial({ map: DT.map, emissive: '#ffcf8a', emissiveMap: DT.glow, emissiveIntensity: 0.75 });
  const doors = new THREE.InstancedMesh(doorGeo, doorMat, SLOTS_PER_FLOOR);
  doors.frustumCulled = false;
  const doorBase = slots.map((_, i) => new THREE.Color().setHSL(0.07 + ((i * 37) % 10) * 0.003, 0.25, 0.62 + ((i * 53) % 7) * 0.03));
  slots.forEach((s, i) => doors.setColorAt(i, doorBase[i]));
  scene.add(doors);

  // ---------- lucecitas alrededor de los nichos abiertos ----------
  const PER_BULB = tier.bloom ? 18 : 12;
  const bulbGeo = new THREE.IcosahedronGeometry(0.024, 0);
  const nicheBulbMat = new THREE.MeshBasicMaterial();
  nicheBulbMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = `uniform float uTime;\nvarying float vTw;\n${sh.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      vTw = 0.74 + 0.26 * sin(uTime * 2.1 + ip.x * 7.1 + ip.y * 5.3 + ip.z * 3.7) + 0.5 * step(0.992, sin(uTime * 4.3 + ip.x * 13.0 + ip.z * 11.0));`);
    sh.fragmentShader = `varying float vTw;\n${sh.fragmentShader}`.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= vTw;');
  };
  nicheBulbMat.customProgramCacheKey = () => 'nicho-lucecitas-1';
  const nicheBulbs = new THREE.InstancedMesh(bulbGeo, nicheBulbMat, SLOTS_PER_FLOOR * PER_BULB);
  nicheBulbs.frustumCulled = false;
  const BULB_COLS = ['#ff4fa0', '#ffb02e', '#37d6c8', '#a46bff', '#6fe36a', '#ff6a3d'].map((c) => new THREE.Color(c).multiplyScalar(tier.bloom ? 2.3 : 1.25));
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  // Puntos del contorno del hueco (en el sistema del nicho), con un poco de comba como una guirnalda.
  const bulbLocal = [];
  {
    const w = OW + 0.12;
    const h = OH + 0.12;
    const per = 2 * (w + h);
    for (let i = 0; i < PER_BULB; i++) {
      let d = ((i + 0.5) / PER_BULB) * per;
      let x;
      let y;
      if (d < w) { x = -w / 2 + d; y = h / 2 - Math.sin((d / w) * Math.PI) * 0.035; } else if ((d -= w) < h) { x = w / 2; y = h / 2 - d; } else if ((d -= h) < w) { x = w / 2 - d; y = -h / 2; } else { d -= w; x = -w / 2; y = -h / 2 + d; }
      bulbLocal.push(new THREE.Vector3(x, y, 0.04));
    }
  }
  const tmpM = new THREE.Matrix4();
  const tmpV = new THREE.Vector3();
  slots.forEach((s, i) => {
    for (let k = 0; k < PER_BULB; k++) {
      nicheBulbs.setMatrixAt(i * PER_BULB + k, zero);
      nicheBulbs.setColorAt(i * PER_BULB + k, BULB_COLS[(k + i) % BULB_COLS.length]);
    }
  });
  scene.add(nicheBulbs);
  function setBulbs(s, on) {
    if (s.bulbsOn === on) return;
    s.bulbsOn = on;
    s.group.updateMatrixWorld(true);
    for (let k = 0; k < PER_BULB; k++) {
      if (on) {
        tmpV.copy(bulbLocal[k]).applyMatrix4(s.group.matrixWorld);
        tmpM.makeTranslation(tmpV.x, tmpV.y, tmpV.z);
        nicheBulbs.setMatrixAt(s.local * PER_BULB + k, tmpM);
      } else nicheBulbs.setMatrixAt(s.local * PER_BULB + k, zero);
    }
    nicheBulbs.instanceMatrix.needsUpdate = true;
  }

  // Las puertitas: cerradas en los lugares libres; cuando llega una huellita se abren hacia el pasillo
  // (con un rebote) y se pliegan contra el marco, y quedan el vidrio y las lucecitas.
  const dM = new THREE.Matrix4();
  const dL = new THREE.Matrix4();
  const dT = new THREE.Matrix4().makeTranslation(-(OW - 0.02) / 2, 0, 0.0);
  const dR = new THREE.Matrix4();
  const dS = new THREE.Matrix4();
  let lastAnimT = 0;
  let hoverDoor = -1;
  function updateDoors(t) {
    const dt = Math.min(0.1, Math.max(0, t - lastAnimT));
    lastAnimT = t;
    let dirty = false;
    for (const s of slots) {
      const target = s.memorial ? 1 : 0;
      s.openTarget = target;
      if (s.open === target && s.drawn) continue;
      if (s.openDelay > 0) s.openDelay -= dt;
      else {
        const sp = dt * (target ? 1.5 : 2.6);
        s.open = target > s.open ? Math.min(target, s.open + sp) : Math.max(target, s.open - sp);
      }
      const e = s.open;
      // 0 → 0,7: se abre hasta ~105° (con un pequeño rebote); 0,7 → 1: se pliega contra la bisagra.
      const swing = Math.min(1, e / 0.7);
      const ang = (swing + Math.sin(swing * Math.PI) * 0.06) * 1.83;
      const fold = e > 0.7 ? 1 - (e - 0.7) / 0.3 : 1;
      if (fold <= 0.001) dL.copy(zero);
      else {
        dR.makeRotationY(-ang);
        dS.makeScale(Math.max(0.001, fold), 1, 1);
        dL.multiplyMatrices(dT, dR).multiply(dS);
      }
      dM.multiplyMatrices(s.group.matrixWorld, dL);
      doors.setMatrixAt(s.local, fold <= 0.001 ? zero : dM);
      s.drawn = true;
      dirty = true;
      // Adentro, las dos ventanitas batientes de vidrio y las lucecitas aparecen apenas se entreabre.
      const showIn = e > 0.08;
      if (s.inside.visible !== showIn) s.inside.visible = showIn;
      if (s.winL && s.winR) {
        const wAng = Math.min(1, e * 1.1) * 1.82;
        s.winL.rotation.y = -wAng;
        s.winR.rotation.y = wAng;
      }
      setBulbs(s, e > 0.55);
    }
    if (dirty) doors.instanceMatrix.needsUpdate = true;
  }
  function setDoorHover(i) {
    if (i === hoverDoor) return;
    if (hoverDoor >= 0) doors.setColorAt(hoverDoor, doorBase[hoverDoor]);
    hoverDoor = i;
    if (i >= 0) doors.setColorAt(i, doorBase[i].clone().multiplyScalar(1.45));
    if (doors.instanceColor) doors.instanceColor.needsUpdate = true;
  }

  // Las lucecitas de los pasillos (ya están en `bulbs`) brillan menos que las de la pérgola: están cerca de la cámara.
  const corridorBulbs = bulbs.length;

  // ---------- pérgola y guirnaldas ----------
  // Pilares sólo en los bordes de cada boca de pasillo/entrada y en el centro exacto entre las dos vitrinas de los tramos largos (para que ningún pilar tape una vitrina).
  const postDeg = [];
  for (const [a0, a1] of ROOM_ARCS) {
    postDeg.push(a0);
    if (a1 - a0 > 30) postDeg.push((a0 + a1) / 2);
    postDeg.push(a1);
  }
  const posts = postDeg.map((d) => onRing(d, ROOM_R - 0.38));
  {
    const parts = [];
    for (const pt of posts) {
      parts.push(new THREE.BoxGeometry(0.26, POST_H, 0.26).translate(pt.x, POST_H / 2, pt.z).toNonIndexed());
      colliders.circles.push({ x: pt.x, z: pt.z, r: 0.2 });
    }
    // Vigas entre pilares, todo alrededor (también sobre la entrada y las bocas).
    for (let i = 0; i < posts.length; i++) {
      const a = posts[i];
      const b = posts[(i + 1) % posts.length];
      const g = new THREE.BoxGeometry(a.distanceTo(b) + 0.2, 0.2, 0.18);
      g.rotateY(-Math.atan2(b.z - a.z, b.x - a.x));
      g.translate((a.x + b.x) / 2, POST_H, (a.z + b.z) / 2);
      parts.push(g.toNonIndexed());
    }
    const pole = new THREE.CylinderGeometry(0.07, 0.1, POLE_H, 10);
    pole.translate(HALL_CENTER.x, POLE_H / 2, HALL_CENTER.z);
    parts.push(pole.toNonIndexed());
    scene.add(new THREE.Mesh(mergeGeometries(parts), postMat));

    // Cartel de bienvenida colgado en la entrada.
    const a = onRing(-17, ROOM_R - 0.38);
    const b = onRing(17, ROOM_R - 0.38);
    const sign = twoSided(new THREE.PlaneGeometry(5.6, 0.92), new THREE.MeshBasicMaterial({
      map: labelTexture('Jardín de las huellitas', { w: 1024, h: 168, font: '400 70px "Young Serif", Georgia, serif', bg: 'rgba(74,48,34,0.96)', fg: '#f6e3c4' }),
    }));
    sign.position.set((a.x + b.x) / 2, POST_H - 0.55, (a.z + b.z) / 2);
    sign.lookAt(sign.position.x, sign.position.y, sign.position.z + 10);
    scene.add(sign);

    // Estrella en la punta del poste.
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.4) }));
    star.position.set(HALL_CENTER.x, POLE_H + 0.15, HALL_CENTER.z);
    scene.add(star);
    const starGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 }));
    starGlow.scale.setScalar(2.2);
    starGlow.position.copy(star.position);
    scene.add(starGlow);
    flames.push({ spin: star });
  }

  const wire = [];
  const top = new THREE.Vector3(HALL_CENTER.x, POLE_H - 0.2, HALL_CENTER.z);
  function strand(a, b, n, sag) {
    let prev = null;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      p.y -= Math.sin(Math.PI * t) * sag;
      if (prev) wire.push(prev, p);
      prev = p;
    }
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      p.y -= Math.sin(Math.PI * t) * sag + 0.06;
      bulbs.push(p);
    }
  }
  for (const pt of posts) strand(new THREE.Vector3(pt.x, POST_H + 0.1, pt.z), top, Math.round(tier.bulbsPerStrand * 0.7), 0.7);
  // Farolitos de papel colgando de las guías de luces de la pérgola (uno cada dos pilares, a dos alturas).
  {
    const TINTS = [[2.2, 0.9, 1.3], [2.2, 1.3, 0.5], [0.8, 1.8, 1.6], [2.2, 1.7, 0.6], [1.3, 0.9, 2.0]];
    posts.forEach((pt, i) => {
      if (i % 2) return;
      const a = new THREE.Vector3(pt.x, POST_H + 0.1, pt.z);
      for (const [j, t] of [0.32, 0.62].entries()) {
        const p = new THREE.Vector3().lerpVectors(a, top, t);
        p.y -= Math.sin(Math.PI * t) * 0.7;
        const hang = new THREE.Group();
        hang.position.copy(p);
        const string = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4), new THREE.MeshBasicMaterial({ color: '#2a1d16' }));
        string.position.y = -0.25;
        const l = paperLantern({ scale: 1.7, tint: TINTS[(i + j) % TINTS.length], glow: 1.4 });
        l.position.y = -0.8;
        hang.add(string, l);
        scene.add(hang);
        const ph = i * 1.3 + j;
        animators.push((tt) => { hang.rotation.z = Math.sin(tt * 0.9 + ph) * 0.06; hang.rotation.x = Math.sin(tt * 0.7 + ph) * 0.04; flickerLantern(l, tt); });
      }
    });
  }
  // Papel picado entre los pilares y cruzando hacia el poste central.
  for (let i = 0; i < posts.length; i++) {
    const a = posts[i];
    const b = posts[(i + 1) % posts.length];
    if (a.distanceTo(b) < 1) continue;
    const pb = picadoBanner(new THREE.Vector3(a.x, POST_H - 0.12, a.z), new THREE.Vector3(b.x, POST_H - 0.12, b.z), { sag: 0.3, flags: Math.max(4, Math.round(a.distanceTo(b) / 0.42)), size: 0.34, seed: i });
    scene.add(pb);
    animators.push(pb.userData.flutter);
  }
  for (let i = 0; i < posts.length; i += 2) {
    const a = new THREE.Vector3(posts[i].x, POST_H - 0.4, posts[i].z);
    const mid = new THREE.Vector3().lerpVectors(a, new THREE.Vector3(HALL_CENTER.x, POLE_H - 1.0, HALL_CENTER.z), 0.9);
    const b = picadoBanner(a, mid, { sag: 0.5, flags: 10, size: 0.32, seed: i * 3 });
    scene.add(b);
    animators.push(b.userData.flutter);
  }
  // Arco de cempasúchil en la entrada.
  {
    const a = onRing(-16, ROOM_R + 0.45);
    const b = onRing(16, ROOM_R + 0.45);
    const pts = [];
    const gatePts = [];
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const x = THREE.MathUtils.lerp(a.x, b.x, t);
      const z = THREE.MathUtils.lerp(a.z, b.z, t);
      const y = 0.3 + Math.sin(t * Math.PI) * (POST_H - 0.4) * (0.62 + 0.38 * Math.sin(t * Math.PI));
      for (let k = 0; k < 3; k++) pts.push([x + (r() - 0.5) * 0.16, y + (r() - 0.5) * 0.16, z + (r() - 0.5) * 0.16, 0.9 + r() * 0.5]);
      gatePts.push(new THREE.Vector3(x, y, z));
    }
    scene.add(marigoldCluster(pts, { r: 0.11, rnd: r }));
    // El carrizo que sostiene las flores (para que no parezcan flotar).
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gatePts), 90, 0.06, 6, false), new THREE.MeshLambertMaterial({ color: '#4a6a2e', emissive: '#14200a' })));
  }
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: '#1b1512', transparent: true, opacity: 0.7 })));
  const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial(), bulbs.length);
  const bulbPhase = bulbs.map(() => r() * 100);
  const bulbBase = bulbs.map((_, i) => new THREE.Color().setHSL(0.09 + (i % 5 === 0 ? 0.03 : 0), 0.9, 0.62));
  {
    const m = new THREE.Object3D();
    bulbs.forEach((p, i) => {
      m.position.copy(p);
      m.updateMatrix();
      bulbMesh.setMatrixAt(i, m.matrix);
      bulbMesh.setColorAt(i, bulbBase[i]);
    });
  }
  scene.add(bulbMesh);
  const bulbColor = new THREE.Color();

  // Luz cálida general del salón (las guirnaldas).
  const hallLight = new THREE.PointLight('#ffbf7a', 18, 46, 1.3);
  hallLight.position.set(HALL_CENTER.x, POLE_H - 1.2, HALL_CENTER.z);
  scene.add(hallLight);

  // ---------- cantero alrededor del poste ----------
  let bedFlowersMesh = null;
  const bedBaseCols = [];
  {
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(BED_R, BED_R + 0.15, 0.45, 40), new THREE.MeshLambertMaterial({ color: '#8b7d72' }));
    bed.position.copy(HALL_CENTER).setY(0.3);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(BED_R - 0.18, BED_R - 0.18, 0.05, 40), new THREE.MeshLambertMaterial({ color: '#3b2a20' }));
    soil.position.copy(HALL_CENTER).setY(0.53);
    scene.add(bed, soil);
    colliders.circles.push({ x: HALL_CENTER.x, z: HALL_CENTER.z, r: BED_R + 0.4 });
    const n = 300;
    const fl = new THREE.InstancedMesh(marigoldGeometry(0.075, '#ffffff', r), marigoldMaterial(), n);
    const pal = [PALETTE.cempasuchil, PALETTE.naranja, PALETTE.amarillo, '#e04b8a', '#ff9a1f'].map((c) => new THREE.Color(c));
    const m = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * (BED_R - 0.3);
      m.position.set(HALL_CENTER.x + Math.cos(a) * d, 0.6 + r() * 0.18, HALL_CENTER.z + Math.sin(a) * d);
      m.rotation.set((r() - 0.5) * 0.6, r() * 6, (r() - 0.5) * 0.6);
      m.scale.setScalar(0.8 + r() * 0.8);
      m.updateMatrix();
      fl.setMatrixAt(i, m.matrix);
      const bc = pal[i % pal.length].clone();
      bedBaseCols.push(bc);
      fl.setColorAt(i, bc);
    }
    bedFlowersMesh = fl;
    scene.add(fl);
  }

  // ---------- living central del salón: sillones cómodos, alfombra circular y atriles con cuadritos ----------
  {
    const sofaFabric = new THREE.MeshLambertMaterial({ color: '#f3ece0', emissive: '#4d3e30', emissiveIntensity: 0.48 });
    const cushionMat = new THREE.MeshLambertMaterial({ color: '#fbf6ec', emissive: '#594736', emissiveIntensity: 0.5 });
    const rugMat = new THREE.MeshLambertMaterial({ color: '#e2d3be', emissive: '#382b1e', emissiveIntensity: 0.42 });
    const rugRimMat = new THREE.MeshLambertMaterial({ color: '#c8b398', emissive: '#2e2216', emissiveIntensity: 0.4 });
    const easelWoodMat = new THREE.MeshLambertMaterial({ map: darkWood, color: '#3b2416', emissive: '#170c06' });
    const potWhiteMat = new THREE.MeshLambertMaterial({ color: '#f4eee4', emissive: '#3b3228', emissiveIntensity: 0.45 });
    const plantGreenMat = new THREE.MeshLambertMaterial({ color: '#589c48', emissive: '#183312', emissiveIntensity: 0.35 });

    // Arma un sillón acolchado de dos cuerpos donde el personaje puede sentarse y descansar.
    const makeSofa = (x, z, rotY, width = 2.2) => {
      const sg = new THREE.Group();
      sg.position.set(x, 0.16, z);
      sg.rotation.y = rotY;
      const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.34, 0.88), sofaFabric);
      base.position.set(0, 0.2, 0);
      const back = new THREE.Mesh(new THREE.BoxGeometry(width, 0.56, 0.24), sofaFabric);
      back.position.set(0, 0.56, -0.32);
      back.rotation.x = -0.08;
      sg.add(base, back);
      for (const sd of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.52, 0.92), sofaFabric);
        arm.position.set(sd * (width / 2 - 0.1), 0.34, 0.02);
        const armTop = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.92, 12).rotateX(Math.PI / 2), cushionMat);
        armTop.position.set(sd * (width / 2 - 0.1), 0.6, 0.02);
        sg.add(arm, armTop);
      }
      const cw = (width - 0.48) / 2 - 0.03;
      for (const sd of [-0.5, 0.5]) {
        const seatC = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.14, 0.68), cushionMat);
        seatC.position.set(sd * (cw + 0.04), 0.41, 0.06);
        const backC = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.42, 0.16), cushionMat);
        backC.position.set(sd * (cw + 0.04), 0.62, -0.2);
        backC.rotation.x = -0.1;
        sg.add(seatC, backC);
      }
      scene.add(sg);
      sg.updateMatrixWorld(true);
      // Choques sólo en el respaldo para que el asiento delantero quede libre al sentarse.
      for (const lx of [-width * 0.32, width * 0.32]) {
        const bp = sg.localToWorld(new THREE.Vector3(lx, 0, -0.36));
        colliders.circles.push({ x: bp.x, z: bp.z, r: 0.38 });
      }
      const seatPos = sg.localToWorld(new THREE.Vector3(0, 0, 0.18));
      seatPos.y = 0.16;
      const sofaInfo = { seat: seatPos, heading: rotY };
      sofas.push(sofaInfo);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 1.0, 1.1), pickMat);
      hit.position.set(0, 0.5, 0);
      hit.userData = { kind: 'sofa', sofa: sofaInfo };
      sg.add(hit);
      pickables.push(hit);
    };

    // Living principal entre el cantero central y las vitrinas del fondo (como en la tercera foto).
    const loungeZ = HALL_CENTER.z - 5.6;
    const rug = new THREE.Mesh(new THREE.CircleGeometry(3.25, 48).rotateX(-Math.PI / 2), rugMat);
    rug.position.set(HALL_CENTER.x, 0.168, loungeZ);
    const rugRim = new THREE.Mesh(new THREE.RingGeometry(3.12, 3.28, 48).rotateX(-Math.PI / 2), rugRimMat);
    rugRim.position.set(HALL_CENTER.x, 0.17, loungeZ);
    scene.add(rug, rugRim);
    makeSofa(HALL_CENTER.x, loungeZ - 1.55, 0, 2.35);
    makeSofa(HALL_CENTER.x, loungeZ + 1.55, Math.PI, 2.35);
    // Centro de luz cálido entre los dos sillones.
    const tableGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.72, color: new THREE.Color(1.8, 1.35, 0.8),
    }));
    tableGlow.scale.set(2.8, 1.8, 1);
    tableGlow.position.set(HALL_CENTER.x, 0.62, loungeZ);
    const lowTable = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.58, 0.26, 24), cushionMat);
    lowTable.position.set(HALL_CENTER.x, 0.29, loungeZ);
    scene.add(lowTable, tableGlow);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const c = makeCandle(waxMat, 0.12 + (i % 2) * 0.04, flames, tier.bloom);
      c.position.set(HALL_CENTER.x + Math.cos(a) * 0.28, 0.42, loungeZ + Math.sin(a) * 0.28);
      c.scale.setScalar(1.25);
      c.visible = true;
      scene.add(c);
    }
    colliders.circles.push({ x: HALL_CENTER.x, z: loungeZ, r: 0.72 });

    // Dos livings laterales con sillones mirando hacia el centro del salón.
    for (const sd of [-1, 1]) {
      const sx = HALL_CENTER.x + sd * 7.6;
      const sz = HALL_CENTER.z + 1.2;
      const sRug = new THREE.Mesh(new THREE.CircleGeometry(2.1, 36).rotateX(-Math.PI / 2), rugMat);
      sRug.position.set(sx, 0.168, sz);
      scene.add(sRug);
      makeSofa(sx + sd * 0.55, sz, -sd * Math.PI / 2, 2.05);
    }

    // Atriles de madera de pie con cuadritos ("Luz de hoy") y macetita blanca al lado (como en la tercera imagen).
    const makeStandingEasel = (x, z, rotY) => {
      const eg = new THREE.Group();
      eg.position.set(x, 0.16, z);
      eg.rotation.y = rotY;
      // Patas del atril de madera oscura y travesaño donde apoya el cuadro.
      const legs = mergeGeometries([
        box(0.06, 1.85, 0.06, -0.42, 0.9, 0.02).rotateX(-0.08),
        box(0.06, 1.85, 0.06, 0.42, 0.9, 0.02).rotateX(-0.08),
        box(0.06, 1.75, 0.06, 0, 0.84, -0.36).rotateX(0.24),
        box(1.18, 0.07, 0.12, 0, 0.72, 0.1),
      ]);
      eg.add(new THREE.Mesh(legs, easelWoodMat));
      // Marco dorado con arquito ornamental arriba.
      const fw = 1.08;
      const fh = 1.34;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.055), goldMat);
      frame.position.set(0, 1.42, 0.08);
      frame.rotation.x = -0.06;
      const topOrn = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.028, 8, 24, Math.PI), goldMat);
      topOrn.position.set(0, 2.1, 0.04);
      topOrn.rotation.x = -0.06;
      // Paspartú crema cálido (sin bloom que encandile) con encabezado "Luz de hoy", foto central y plaquita con el nombre abajo.
      const cardBg = new THREE.Mesh(
        new THREE.PlaneGeometry(fw - 0.1, fh - 0.1),
        new THREE.MeshBasicMaterial({ color: '#d8cfc0' }),
      );
      cardBg.position.set(0, 1.42, 0.11);
      cardBg.rotation.x = -0.06;
      const headerLbl = new THREE.Mesh(
        new THREE.PlaneGeometry(0.84, 0.13),
        new THREE.MeshBasicMaterial({
          map: labelTexture('✨ Luz de hoy ✨', { w: 520, h: 84, font: '400 38px "Young Serif", Georgia, serif', bg: 'rgba(216,207,192,0.98)', fg: '#4a331e' }),
          transparent: true,
        }),
      );
      headerLbl.position.set(0, 1.92, 0.115);
      headerLbl.rotation.x = -0.06;
      const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.78), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.88, 0.86, 0.84) }));
      photo.position.set(0, 1.44, 0.116);
      photo.rotation.x = -0.06;
      photo.userData = { kind: 'decor' };
      pickables.push(photo);
      const nameLbl = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.18), new THREE.MeshBasicMaterial({ transparent: true }));
      nameLbl.position.set(0, 0.93, 0.118);
      nameLbl.rotation.x = -0.06;
      // Maceta blanca con planta verde al pie del atril.
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.34, 16), potWhiteMat);
      pot.position.set(-0.78, 0.17, -0.08);
      eg.add(frame, topOrn, cardBg, headerLbl, photo, nameLbl, pot);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6).scale(0.55, 2.2, 0.25), plantGreenMat);
        leaf.position.set(-0.78 + Math.cos(a) * 0.08, 0.45 + (i % 2) * 0.08, -0.08 + Math.sin(a) * 0.08);
        leaf.rotation.set(0.32 * Math.sin(a), a, -0.32 * Math.cos(a));
        eg.add(leaf);
      }
      scene.add(eg);
      colliders.circles.push({ x, z, r: 0.65 });
      standingEasels.push({ photo, name: nameLbl });
    };

    makeStandingEasel(HALL_CENTER.x + 3.9, loungeZ + 1.4, -0.38);
    makeStandingEasel(HALL_CENTER.x - 3.9, loungeZ + 1.4, 0.38);
    makeStandingEasel(HALL_CENTER.x + 4.8, HALL_CENTER.z + 5.4, -0.45);
  }

  // ---------- en los pisos de arriba, donde está la ofrenda: una fuente con velitas flotando ----------
  const fountain = new THREE.Group();
  fountain.position.set(EASEL_POS.x, 0, EASEL_POS.z);
  fountain.visible = false;
  scene.add(fountain);
  const fountainCol = { x: EASEL_POS.x, z: EASEL_POS.z, r: -100 };
  colliders.circles.push(fountainCol);
  const floaters = [];
  // En el piso 99 ("El cielo de las huellitas"): un arco dorado con una huellita de luz y estrellas que giran sobre la fuente.
  const crown99 = new THREE.Group();
  crown99.visible = false;
  fountain.add(crown99);
  {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.16, 10, 48).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ map: talavera }));
    rim.position.y = 0.42;
    const wallB = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.05, 0.42, 48, 1, true), new THREE.MeshLambertMaterial({ map: talavera, side: THREE.DoubleSide }));
    wallB.position.y = 0.21;
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.95, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#1b4d6b', emissive: '#0f3a5a', emissiveIntensity: 0.8, transparent: true, opacity: 0.92 }));
    water.position.y = 0.34;
    fountain.add(rim, wallB, water);
    for (let i = 0; i < 7; i++) {
      const c = makeCandle(waxMat, 0.08 + r() * 0.06, flames, tier.bloom);
      const a = (i / 7) * Math.PI * 2 + r();
      const d = 0.5 + r() * 1.1;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.12, 10).rotateX(-Math.PI / 2), leafMat);
      pad.position.y = -0.005;
      c.add(pad);
      c.position.set(Math.cos(a) * d, 0.35, Math.sin(a) * d);
      c.scale.setScalar(1.6);
      fountain.add(c);
      floaters.push({ c, a, d, s: 0.05 + r() * 0.08 });
    }
    const pts = [];
    for (let i = 0; i < 70; i++) { const a = (i / 70) * Math.PI * 2; pts.push([Math.cos(a) * 2.0, 0.6 + r() * 0.06, Math.sin(a) * 2.0, 0.9 + r() * 0.4]); }
    fountain.add(marigoldCluster(pts, { r: 0.09, rnd: r }));

    // Arco celestial y constelación de huellita del piso 99.
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.045, 10, 48, Math.PI), goldMat);
    arch.position.y = 0.45;
    crown99.add(arch);
    const pawGroup = new THREE.Group();
    pawGroup.position.y = 1.95;
    const starMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 1.1) });
    const padMain = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12).scale(1.15, 0.9, 0.45), starMat);
    pawGroup.add(padMain);
    for (const [dx, dy, rot] of [[-0.28, 0.22, 0.35], [-0.1, 0.38, 0.12], [0.1, 0.38, -0.12], [0.28, 0.22, -0.35]]) {
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10).scale(0.85, 1.15, 0.45), starMat);
      toe.position.set(dx, dy, 0);
      toe.rotation.z = rot;
      pawGroup.add(toe);
    }
    const pawHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(1.4, 1.15, 0.65), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7 }));
    pawHalo.scale.setScalar(2.4);
    pawGroup.add(pawHalo);
    crown99.add(pawGroup);
    crown99.userData.paw = pawGroup;
  }

  // ---------- la ofrenda de la huellita destacada (sólo en el piso 1) ----------
  const easel = new THREE.Group();
  easel.position.copy(EASEL_POS);
  scene.add(easel);
  const easelCol = { x: EASEL_POS.x, z: EASEL_POS.z - 0.2 * ALTAR_SCALE, r: 1.7 * ALTAR_SCALE };
  colliders.circles.push(easelCol);
  // Ofrenda de tres escalones con mantel, papel picado, flores, calaveritas y pan de muerto.
  const cloth = new THREE.MeshLambertMaterial({ color: '#fbf3e6', emissive: '#2a1a14' });
  const steps = [[3.0, 0.35, 1.7, -0.15], [2.4, 0.7, 1.15, -0.42], [1.8, 1.05, 0.6, -0.7]];
  steps.forEach(([w, h, d, z], i) => {
    const bx = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cloth);
    bx.position.set(0, h / 2, z);
    easel.add(bx);
    const front = z + d / 2 + 0.01;
    const b = picadoBanner(new THREE.Vector3(-w / 2, h - 0.01, front), new THREE.Vector3(w / 2, h - 0.01, front), { sag: 0.0, flags: Math.round(w / 0.32), size: 0.27, seed: i * 5 });
    b.children.forEach((ch) => { if (ch.isMesh) ch.rotation.y = 0; });
    easel.add(b);
    animators.push((t) => { if (easel.visible) b.children.forEach((ch, k) => { if (ch.isMesh) ch.rotation.x = Math.sin(t * 1.0 + k * 0.6 + i) * 0.03; }); });
  });
  // Flores en macetas a los costados y en los escalones.
  {
    const pts = [];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 26; i++) pts.push([s * (1.3 + (r() - 0.5) * 0.25), 0.4 + r() * 0.45, 0.45 + (r() - 0.5) * 0.3, 0.8 + r() * 0.6]);
      for (let i = 0; i < 12; i++) pts.push([s * (1.0 + r() * 0.15), 0.76 + r() * 0.2, -0.2 + (r() - 0.5) * 0.2, 0.7 + r() * 0.5]);
    }
    // Arco de flores sobre la ofrenda: un arco de carrizo forrado de cempasúchil bien tupido.
    const archPts = [];
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const a = Math.PI * t;
      archPts.push(new THREE.Vector3(-Math.cos(a) * 1.55, Math.sin(a) * 3.0, -0.95));
      for (let k = 0; k < 3; k++) {
        const sp = (k / 3) * Math.PI * 2 + r();
        pts.push([-Math.cos(a) * 1.55 + Math.cos(sp) * 0.06 * Math.cos(a), Math.sin(a) * 3.0 + Math.sin(sp) * 0.06, -0.95 + Math.cos(sp) * 0.07, 0.85 + r() * 0.4]);
      }
    }
    const reed = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPts), 60, 0.045, 6, false), new THREE.MeshLambertMaterial({ color: '#4a6a2e', emissive: '#14200a' }));
    easel.add(reed, marigoldCluster(pts, { r: 0.09, rnd: r }));
    for (const s of [-1, 1]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.34, 14), new THREE.MeshLambertMaterial({ map: talaveraTexture() }));
      pot.position.set(s * 1.3, 0.17, 0.45);
      easel.add(pot);
    }
  }
  [[0.62, 0.7, -0.1, 190], [-0.6, 0.35, 0.45, 30]].forEach(([x, y, z, hue]) => {
    const sk = sugarSkull(hue, 1.15);
    sk.position.set(x, y, z);
    sk.rotation.y = -x * 0.25;
    easel.add(sk);
  });
  for (const x of [-0.95, 0.95]) {
    const pan = panDeMuerto(1);
    pan.position.set(x, 0.35, 0.3);
    easel.add(pan);
  }
  // Marco de "hoy en la ofrenda": pasan una por una las huellitas que pusieron hoy.
  const spot = new THREE.Group();
  spot.position.set(0.98, 0.7, -0.15);
  spot.rotation.x = -0.1;
  const spotBorder = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.04), goldMat);
  spotBorder.position.y = 0.27;
  const spotPhoto = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.45), new THREE.MeshBasicMaterial({ color: '#e8e0d4' }));
  spotPhoto.position.set(0, 0.27, 0.025);
  spotPhoto.userData = { kind: 'spot' };
  spot.add(spotBorder, spotPhoto);
  spot.visible = false;
  easel.add(spot);

  // Estampita de la familia (si la huellita destacada tiene una), apoyada en el escalón.
  const card = new THREE.Group();
  card.position.set(-0.82, 0.7, -0.2);
  card.rotation.set(-0.18, 0.28, 0);
  card.visible = false;
  easel.add(card);
  const cardBorder = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.03), new THREE.MeshLambertMaterial({ color: '#fbf3e6', emissive: '#3a2a20' }));
  const cardPhoto = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#f2ece4' }));
  cardPhoto.userData = { kind: 'featured' };
  card.add(cardBorder, cardPhoto);
  let cardSrc = null;
  function setCard(cd) {
    card.visible = !!cd;
    if (!cd || cd.src === cardSrc) return;
    cardSrc = cd.src;
    const h = 0.62;
    const w = h * (cd.w / cd.h);
    cardBorder.scale.set(w + 0.05, h + 0.05, 1);
    cardBorder.position.set(0, h / 2 + 0.03, 0);
    cardPhoto.scale.set(w, h, 1);
    cardPhoto.position.set(0, h / 2 + 0.03, 0.017);
    new THREE.TextureLoader().load(cd.src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      cardPhoto.material.map = t;
      cardPhoto.material.needsUpdate = true;
    });
  }

  const fBorder = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.68, 0.08), goldMat);
  fBorder.position.set(0, 1.9, -0.6);
  const fMat = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 1.56), matMat.clone());
  fMat.position.set(0, 1.9, -0.555);
  const fPhoto = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.43), new THREE.MeshBasicMaterial({ color: '#f5efe6' }));
  fPhoto.position.set(0, 1.9, -0.55);
  fPhoto.userData = { kind: 'featured' };
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.21), new THREE.MeshBasicMaterial({ transparent: true }));
  plaque.position.set(0, 0.47, 0.32);
  plaque.rotation.x = -0.25;
  easel.add(fBorder, fMat, fPhoto, plaque);
  // Lo que se toca de la ofrenda (sólo cuenta en el piso 1: el rayo no mira si algo está escondido).
  const featuredPicks = [fPhoto, spotPhoto, cardPhoto];
  // Velas alrededor del atril: se encienden más a medida que llegan velas.
  const clusterCandles = [];
  for (let i = 0; i < 26; i++) {
    const onFirst = i % 2 === 0;
    const k = Math.floor(i / 2);
    const x = (k / 12 - 0.5) * (onFirst ? 2.5 : 1.6) + (r() - 0.5) * 0.08;
    const c = makeCandle(waxMat, 0.08 + r() * 0.2, flames, tier.bloom);
    c.scale.setScalar(1.3);
    c.position.set(x, onFirst ? 0.35 : 0.7, onFirst ? 0.5 + (r() - 0.5) * 0.15 : -0.05);
    c.visible = false;
    easel.add(c);
    clusterCandles.push(c);
  }
  const featuredFx = makeGlowFx(glowFx, 1.6);
  featuredFx.group.position.set(0, 1.9, -0.5);
  easel.add(featuredFx.group);
  // Los últimos regalitos para la destacada, en el segundo escalón (adelante de las velas).
  const featuredGifts = [0, 1, 2].map((i) => {
    const h = giftHolder(0.23);
    h.position.set([-0.36, 0.02, 0.4][i], 0.7, 0.07);
    h.rotation.y = [0.35, 0, -0.35][i];
    easel.add(h);
    return h;
  });
  easel.scale.setScalar(ALTAR_SCALE);
  easel.userData.baseScale = ALTAR_SCALE;
  const easelLight = new THREE.SpotLight('#ffd6a0', 14, 14, 0.55, 0.6, 1.3);
  easelLight.position.set(EASEL_POS.x, 6.2, EASEL_POS.z + 4.2);
  easelLight.target.position.set(EASEL_POS.x, 2.6, EASEL_POS.z);
  scene.add(easelLight, easelLight.target);

  let featured = null;
  let featuredTex = [];
  let spotList = [];
  let spotIdx = 0;
  let spotT = 0;
  let spotTex = null;
  function showSpot(m) {
    spotTex?.dispose();
    spotTex = m.photo ? photoTexture(m.photo) : portraitTexture(m);
    spotPhoto.material.map = spotTex;
    spotPhoto.material.needsUpdate = true;
    spotPhoto.userData.id = m.id;
  }

  // ---------- estado ----------
  let floor = 0;
  let hovered = null;
  // La ofrenda (y lo que la rodea) sólo en el piso 1; arriba, en su lugar, la fuente.
  function showAltar(on) {
    easel.visible = on;
    easelLight.visible = on;
    easelCol.r = on ? 1.7 * ALTAR_SCALE : -100;
    fountain.visible = !on;
    fountainCol.r = on ? -100 : 2.25;
  }
  showAltar(true);

  function clearSlot(s) {
    s.textures.forEach((t) => t.dispose());
    s.textures = [];
    s.memorial = null;
    if (!s.built) return;
    s.shelf.visible = false;
    s.fx.group.visible = false;
    s.name.visible = false;
    if (s.innerName) s.innerName.visible = false;
  }

  function fillSlot(s, m) {
    if (!s.built) buildSlotInside(s);
    const prev = s.memorial;
    // Al llegar una huellita nueva (o al cambiar de piso) las puertitas se abren de a una.
    if (!prev || prev.id !== m.id) { s.open = 0; s.drawn = false; s.openDelay = Math.random() * 0.9; }
    if (!(prev && prev.id === m.id && prev.photo === m.photo && prev.name === m.name)) {
      clearSlot(s);
      const tex = m.photo ? photoTexture(m.photo) : portraitTexture(m);
      s.textures.push(tex);
      s.photo.material.map = tex;
      s.photo.material.needsUpdate = true;
      const lt = labelTexture(m.name, { w: 400, h: 74, font: '400 44px "Young Serif", Georgia, serif', bg: 'rgba(201,151,63,0.98)', fg: '#3a2410' });
      s.textures.push(lt);
      s.name.material.map = lt;
      s.name.material.needsUpdate = true;
      if (s.innerName) {
        const ilt = labelTexture(m.name, { w: 460, h: 96, font: '400 54px "Young Serif", Georgia, serif', bg: 'rgba(245,235,214,0.98)', fg: '#2b1b10' });
        s.textures.push(ilt);
        s.innerName.material.map = ilt;
        s.innerName.material.needsUpdate = true;
      }
    }
    s.memorial = m;
    s.name.visible = true;
    if (s.innerName) s.innerName.visible = true;
    s.border.material = (m.candles >= 12 || m.eternal || m.bg === 'estrellas')
      ? goldMat
      : (m.bg === 'talavera' || m.bg === 'cielo')
        ? talaveraFrameMat
        : (m.bg === 'cempasuchil' || m.bg === 'atardecer')
          ? marigoldFrameMat
          : darkPictureFrameMat;
    if (s.bg !== m.bg) {
      s.mat.material.map = backgroundTexture(m.bg || 'crema');
      s.mat.material.needsUpdate = true;
      s.bg = m.bg;
    }
    s.mat.material.emissiveIntensity = 0.38 + Math.min(0.28, (m.candles || 0) * 0.03) + (m.eternal ? 0.15 : 0);
    s.shelf.visible = true;
    const lvl = candleLevel(m.candles);
    s.candles.forEach((c, i) => { c.visible = i < lvl; });
    if (s.warmHalo) s.warmHalo.visible = lvl > 0 || !!m.eternal;
    const fl = Math.max(2, Math.min(BOUQUET.length, Math.ceil((m.flowers || 1) / 2)));
    s.jar.visible = true;
    s.flowers.forEach((f, i) => { f.visible = i < fl; });
    // Llenamos las 4 repisitas de madera con los regalitos recibidos y recuerdos tiernos para que siempre luzcan vivas.
    const shelfGifts = [...(m.lastGifts || [])];
    for (let k = 0; shelfGifts.length < 4 && k < DEFAULT_SHELF_GIFTS.length; k++) {
      const gEmo = DEFAULT_SHELF_GIFTS[(s.local + k) % DEFAULT_SHELF_GIFTS.length];
      if (!shelfGifts.includes(gEmo)) shelfGifts.push(gEmo);
    }
    showGifts(s.gifts, shelfGifts);
    s.fx.group.visible = true;
    setStage(s.fx, stageOf(m.glow).index, !!m.eternal);
  }

  function showGifts(holders, list = []) {
    holders.forEach((h, i) => {
      const ch = list[i];
      if (ch && h.userData.ch !== ch) {
        h.clear();
        h.add(giftMesh(ch));
        h.userData.ch = ch;
      }
      h.visible = !!ch && !h.userData.held;
    });
  }
  const holdersFor = (key) => (key === 'featured' ? featuredGifts : slots[key]?.gifts) || null;

  function setFeatured(m) {
    if (!(featured && featured.photo === m.photo && featured.name === m.name)) {
      featuredTex.forEach((t) => t.dispose());
      const tex = m.photo ? photoTexture(m.photo) : portraitTexture(m);
      const lt = labelTexture(m.name, { w: 512, h: 104, font: '700 72px Caveat, cursive', bg: 'rgba(74,48,34,0.95)', fg: '#f6e3c4' });
      featuredTex = [tex, lt];
      fPhoto.material.map = tex;
      fPhoto.material.needsUpdate = true;
      plaque.material.map = lt;
      plaque.material.needsUpdate = true;
    }
    featured = m;
    fPhoto.userData.id = m.id;
    setCard(m.card);
    const lit = Math.min(clusterCandles.length, 3 + Math.ceil(m.candles * 0.8));
    clusterCandles.forEach((c, i) => { c.visible = i < lit; });
    showGifts(featuredGifts, m.lastGifts);
    // La destacada brilla con el cariño que recibe.
    setStage(featuredFx, stageOf((m.glow || 0) + m.candles * 3 + m.flowers * 2 + (m.gifts || 0) * 2).index, !!m.eternal);
    fMat.material.map = backgroundTexture(m.bg || 'cempasuchil');
    fMat.material.needsUpdate = true;
  }

  let welcomeReady = false;
  function setWelcomeAltar(memorials = []) {
    featured = null;
    fPhoto.userData.id = null;
    if (!welcomeReady) {
      welcomeReady = true;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const W = 1024;
        const H = 1440;
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, 0, 0, W, H);
        // Tapar por completo las 4 líneas originales del JPEG (que llegan hasta y=565 a los costados del corazón)
        // con el mismo color papel acuarela celeste para que ninguna línea salga duplicada.
        const sky = g.createLinearGradient(0, 0, 0, 565);
        sky.addColorStop(0, '#78abc9');
        sky.addColorStop(0.55, '#86b5d1');
        sky.addColorStop(0.92, '#8ebbd6');
        sky.addColorStop(1, 'rgba(142, 187, 214, 0)');
        g.fillStyle = sky;
        g.fillRect(0, 0, W, 565);
        // A los costados del corazón central (x < 395 y x > 625) cubrimos hasta y=590 donde caía la "y" y el final de la 4ª línea original.
        g.fillStyle = '#8ebbd6';
        g.fillRect(0, 480, 395, 95);
        g.fillRect(625, 480, W - 625, 95);
        // Gotitas de colores suaves arriba a la derecha como en la lámina original.
        const dropCols = ['rgba(235,205,70,0.48)', 'rgba(218,95,72,0.48)', 'rgba(86,158,196,0.48)', 'rgba(232,145,68,0.48)'];
        for (let i = 0; i < 32; i++) {
          g.fillStyle = dropCols[i % dropCols.length];
          const dx = 220 + (i * 25) % 740;
          const dy = 28 + Math.floor(i / 9) * 58 + (i % 3) * 14;
          g.beginPath();
          g.ellipse(dx, dy, 10, 26, 0.38, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#121820';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = '700 72px Caveat, cursive';
        const lines = [
          '“No era más que un zorro',
          'semejante a cien mil otros.',
          'Pero yo le hice mi amigo',
          'y ahora es único en el mundo.”',
        ];
        lines.forEach((ln, idx) => {
          const ly = 152 + idx * 106;
          g.strokeStyle = 'rgba(235, 246, 255, 0.65)';
          g.lineWidth = 5;
          g.strokeText(ln, W / 2, ly, W - 96);
          g.fillText(ln, W / 2, ly, W - 96);
        });
        // Banda inferior tipo papel madera con la firma bien nítida.
        const kraft = g.createLinearGradient(0, 1270, 0, H);
        kraft.addColorStop(0, 'rgba(164, 132, 94, 0.94)');
        kraft.addColorStop(1, 'rgba(138, 108, 74, 0.98)');
        g.fillStyle = kraft;
        g.fillRect(0, 1274, W, H - 1274);
        g.fillStyle = '#1c130c';
        g.font = '700 66px Caveat, cursive';
        g.fillText('Antoine de Saint-Exupéry.', W / 2, 1358);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        fPhoto.material.map = t;
        fPhoto.material.color.setRGB(0.9, 0.9, 0.9);
        fPhoto.material.needsUpdate = true;
      };
      img.src = '/huellitas/luca-estampita.jpg';
      const lt = labelTexture('Bienvenidos al jardín 🐾', { w: 680, h: 112, font: '700 60px Caveat, cursive', bg: 'rgba(74,48,34,0.95)', fg: '#f6e3c4' });
      plaque.material.map = lt;
      plaque.material.needsUpdate = true;
      fMat.material.map = backgroundTexture('estrellas');
      fMat.material.needsUpdate = true;
    }
    setCard(null);
    const totalCandles = memorials.reduce((a, m) => a + (m.candles || 0), 0);
    const lit = Math.min(clusterCandles.length, 8 + Math.ceil(totalCandles * 0.5));
    clusterCandles.forEach((c, i) => { c.visible = i < lit; });
    showGifts(featuredGifts, ['🌹', '👑', '⭐']);
    setStage(featuredFx, 2, true);
  }

  // Los temas de las vitrinas del salón (cada una con su cartel). Si un tema no tiene a nadie
  // (p. ej., ningún cumpleaños este mes), la vitrina usa su título de siempre con todas.
  function themedLists(real) {
    const hash = (id, k) => { let h = k * 2654435761; for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
    const mix = (k) => [...real].sort((p, q) => hash(p.id, k) - hash(q.id, k));
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const themed = (title, list, fallback, k) => (list.length ? { title, list } : { title: fallback, list: mix(k) });
    return [
      { title: 'Siempre en nuestro corazón', list: [...real].sort((p, q) => (q.candles || 0) - (p.candles || 0)) },
      { title: 'Recién llegadas al jardín', list: [...real].sort((p, q) => (q.createdAt || 0) - (p.createdAt || 0)) },
      { title: 'Esperando una vela', list: [...real].sort((p, q) => (p.candles || 0) - (q.candles || 0) || (q.createdAt || 0) - (p.createdAt || 0)) },
      themed('Las recordamos este mes', real.filter((m) => m.birthday?.startsWith(month) || m.passedDay?.startsWith(month)), 'Huellitas de luz eterna', 1),
      themed('Perritos del jardín', real.filter((m) => m.species === 'perro'), 'Amigos que nunca se olvidan', 2),
      themed('Gatitos y compañeros', real.filter((m) => m.species && m.species !== 'perro'), 'Recuerdos que brillan', 3),
    ];
  }
  // Un cuadrito de vitrina (o de la boca de un pasillo): la foto y el nombre de una huellita, o
  // "lugar libre" si no hay nadie para mostrar ahí.
  function paintCell(cell, m, corridor) {
    const key = m ? `${m.id}:${m.photo || ''}:${m.name}:${cell.lightPlaque ? 'L' : 'G'}` : `vacant:${cell.lightPlaque ? 'L' : 'G'}`;
    if (cell.key === key) return;
    cell.key = key;
    let cached = wallTexCache.get(key);
    if (!cached) {
      const tex = m ? (m.photo ? photoTexture(m.photo) : portraitTexture(m)) : vacantCellTexture();
      const lt = labelTexture(m ? m.name : 'Lugar libre', {
        w: 360, h: 74,
        font: '400 44px "Young Serif", Georgia, serif',
        bg: cell.lightPlaque ? 'rgba(216,207,192,0.98)' : 'rgba(201,151,63,0.98)',
        fg: '#26160a',
      });
      cached = { tex, lt };
      wallTexCache.set(key, cached);
    }
    cell.photo.material.map = cached.tex;
    cell.photo.material.needsUpdate = true;
    cell.photo.userData = m ? { kind: 'spot', id: m.id } : { kind: 'add', corridor };
    cell.plaque.material.map = cached.lt;
    cell.plaque.material.needsUpdate = true;
  }

  function render(memorials) {
    const here = new Map();
    let hasCenterFeatured = false;
    for (const m of memorials) {
      if (m.slot < 0) { setFeatured(m); hasCenterFeatured = true; }
      else if (Math.floor(m.slot / SLOTS_PER_FLOOR) === floor) here.set(m.slot % SLOTS_PER_FLOOR, m);
    }
    if (!hasCenterFeatured) setWelcomeAltar(memorials);
    slots.forEach((s, i) => (here.has(i) ? fillSlot(s, here.get(i)) : clearSlot(s)));
    // Poblar las vitrinas de obituarios de las paredes del salón, cuadros de entrada y los atriles de pie.
    // Sólo huellitas de verdad: cada cuadrito abre el obituario de la mascota que muestra. Lo que
    // sobra queda como "lugar libre" (tocándolo, sumás a tu mascota), nunca con mascotas inventadas.
    const real = memorials.filter((m) => m && m.id && m.name);
    const lists = themedLists(real);
    vitrines.forEach((v, i) => {
      const theme = lists[i % lists.length];
      if (v.title !== theme.title) {
        v.title = theme.title;
        const mat = v.banner.material;
        mat.map?.dispose();
        mat.map = labelTexture(theme.title, { w: 760, h: 112, font: '400 48px "Young Serif", Georgia, serif', bg: 'rgba(228,218,202,0.98)', fg: '#2b1b10' });
        mat.needsUpdate = true;
      }
    });
    // Los cuadros de la boca de cada pasillo: quienes descansan en ese pasillo, en este piso.
    const byCorridor = Array.from({ length: CORRIDORS }, () => []);
    for (const [i, m] of here) byCorridor[Math.floor((i % 90) / 18)].push(m);
    for (const list of byCorridor) list.sort((p, q) => (q.createdAt || 0) - (p.createdAt || 0));
    for (const cell of wallCells) {
      const m = cell.corridor !== undefined ? byCorridor[cell.corridor][cell.pos] : lists[cell.vitrine % lists.length].list[cell.pos];
      paintCell(cell, m || null, cell.corridor);
    }
    // "Luz de hoy": tres huellitas que cambian cada día.
    const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
    standingEasels.forEach((ea, idx) => {
      const m = real.length ? real[(day * 7 + idx) % real.length] : null;
      const key = m ? `${m.id}:${m.photo || ''}:${m.name}` : 'vacant';
      if (ea.key === key) return;
      ea.key = key;
      ea.tex?.dispose();
      ea.lt?.dispose();
      ea.tex = m ? (m.photo ? photoTexture(m.photo) : portraitTexture(m)) : null;
      ea.lt = labelTexture(m ? `🐾 ${m.name}` : 'Lugar libre', {
        w: 480, h: 96, font: '700 54px "Young Serif", Georgia, serif', bg: 'rgba(216,207,192,0.98)', fg: '#26160a',
      });
      ea.photo.material.map = ea.tex || vacantCellTexture();
      ea.photo.material.needsUpdate = true;
      ea.photo.userData = m ? { kind: 'spot', id: m.id } : { kind: 'add' };
      ea.name.material.map = ea.lt;
      ea.name.material.needsUpdate = true;
    });
    // Cada pasillo con su nombre y cuántas huellitas tiene en este piso.
    const per = new Array(CORRIDORS).fill(0);
    const corridorOfSlot = (i) => Math.floor((i % 90) / 18);
    for (const i of here.keys()) per[corridorOfSlot(i)]++;
    corridorLabels.forEach((lbl, c) => {
      const n = per[c];
      const text = n ? `${CORRIDOR_NAMES[c]} · ${n} ${n === 1 ? 'huellita' : 'huellitas'}` : CORRIDOR_NAMES[c];
      if (lbl.userData.text === text) return;
      lbl.userData.text = text;
      const mat = lbl.userData.mat;
      mat.map?.dispose();
      mat.map = labelTexture(text, { w: 1100, h: 178, font: '400 70px "Young Serif", Georgia, serif', bg: 'rgba(58,36,24,0.95)', fg: '#f6e3c4' });
      mat.needsUpdate = true;
    });
  }

  const objFor = (key) => (key === 'featured' ? easel : slots[key]?.inside);
  const _n = new THREE.Vector3();

  return {
    slots,
    blockers,
    sofas,
    nearestSofa(pos) {
      let best = null;
      let bestD = Infinity;
      for (const s of sofas) {
        const d = Math.hypot(pos.x - s.seat.x, pos.z - s.seat.z);
        if (d < bestD) { bestD = d; best = s; }
      }
      return best && bestD < 2.6 ? best : null;
    },
    get featured() { return featured; },
    get floor() { return floor; },
    setFloor(n, memorials) {
      floor = n;
      showAltar(n === 0);
      crown99.visible = n === 98;
      // Cuanto más alto el piso, más flores blancas y doradas en el cantero central.
      if (bedFlowersMesh) {
        const hk = Math.min(1, Math.max(0, n / 98));
        const white = new THREE.Color('#fff9ef');
        const c = new THREE.Color();
        for (let i = 0; i < bedBaseCols.length; i++) {
          const blend = (i % 3 === 0 ? hk * 0.88 : i % 3 === 1 ? hk * 0.55 : hk * 0.25);
          c.copy(bedBaseCols[i]).lerp(white, blend);
          bedFlowersMesh.setColorAt(i, c);
        }
        if (bedFlowersMesh.instanceColor) bedFlowersMesh.instanceColor.needsUpdate = true;
      }
      render(memorials);
    },
    render,
    pickables() {
      return floor === 0 ? [...pickables, ...featuredPicks] : pickables;
    },
    // De qué pasillo es un lugar (0..4).
    corridorOf: (i) => Math.floor((i % 90) / 18),
    // Dónde pararse para mirar un lugar. `shift` corre la vista para que la ficha no tape el marco.
    // El cuadrito (vitrina, boca de pasillo o atril) que tenés adelante y cerca, para el botón de acción.
    nearestCell(pos, heading, maxD = 2.6) {
      let best = null;
      let bd = maxD;
      const fx = Math.sin(heading);
      const fz = Math.cos(heading);
      for (const cell of [...wallCells, ...standingEasels]) {
        const ud = cell.photo.userData;
        if (ud.kind !== 'spot' && ud.kind !== 'add') continue;
        cell.wp ||= cell.photo.getWorldPosition(new THREE.Vector3());
        const dx = cell.wp.x - pos.x;
        const dz = cell.wp.z - pos.z;
        const d = Math.hypot(dx, dz);
        if (d > bd || d < 0.2 || (dx * fx + dz * fz) / d < 0.55) continue;
        bd = d;
        best = { photo: cell.photo, id: ud.id || null, corridor: ud.corridor };
      }
      return best;
    },
    viewpoint(key, shift = 0, distMul = 1) {
      if (key === 'featured') {
        const k = ALTAR_SCALE;
        const frame = new THREE.Vector3(EASEL_POS.x, 1.75 * k, EASEL_POS.z - 0.5 * k);
        const target = new THREE.Vector3(EASEL_POS.x + shift * k, 1.66 * k, EASEL_POS.z - 0.5 * k);
        return { stand: new THREE.Vector3(EASEL_POS.x + shift * k, 1.85 * k, EASEL_POS.z + 2.45 * k * distMul), target, frame };
      }
      const s = slots[key];
      const frame = new THREE.Vector3();
      s.group.getWorldPosition(frame);
      const normal = new THREE.Vector3(0, 0, 1).transformDirection(s.group.matrixWorld);
      const right = new THREE.Vector3(1, 0, 0).transformDirection(s.group.matrixWorld);
      frame.addScaledVector(normal, 0.04);
      const cy = frame.y - 0.02;
      frame.y = cy;
      const target = frame.clone().addScaledVector(right, shift * 0.48);
      target.y = cy;
      // Vista completa del nicho en 3D con su plaquita, repisa, lucecitas y foto detrás del vidrio.
      const dist = Math.min(2 * HW - 0.55, 2.15 * distMul);
      const stand = target.clone().addScaledVector(normal, dist);
      stand.y = cy + 0.05;
      return { stand, target, frame };
    },
    setAltar(list) {
      const ids = list.map((m) => m.id).join();
      if (ids === spotList.map((m) => m.id).join()) return;
      spotList = list;
      spot.visible = list.length > 0;
      spotIdx = 0;
      if (list.length) showSpot(list[0]);
    },
    // Para encuadrar o soltar efectos desde un memorial (null si no está a la vista en este piso).
    memorialKey(m) {
      if (m.slot < 0) return floor === 0 ? 'featured' : null;
      return Math.floor(m.slot / SLOTS_PER_FLOOR) === floor ? m.slot % SLOTS_PER_FLOOR : null;
    },
    // Dónde está la foto; con `out`, ese tanto hacia afuera del nicho (hacia el pasillo).
    worldPos(key, out = 0) {
      const v = new THREE.Vector3();
      if (key === 'featured') return fPhoto.getWorldPosition(v);
      const s = slots[key];
      if (!s) return null;
      s.photo.getWorldPosition(v);
      if (out) v.addScaledVector(_n.set(0, 0, 1).transformDirection(s.group.matrixWorld), out + DEPTH);
      return v;
    },
    setHover(key) {
      const occupied = key !== null && key !== 'featured' && typeof key === 'number' && slots[key]?.memorial;
      if (hovered !== null && hovered !== key && hovered !== 'featured') objFor(hovered)?.scale.setScalar(1);
      hovered = key;
      if (occupied) objFor(key)?.scale.setScalar(1.04);
      setDoorHover(typeof key === 'number' && !occupied ? key : -1);
    },
    pulse(key) {
      const g = objFor(key);
      if (!g) return;
      const start = performance.now();
      const amp = key === 'featured' ? 0.05 : 0.06;
      const tick = () => {
        const k = (performance.now() - start) / 700;
        const base = g.userData.baseScale || 1;
        g.scale.setScalar(base * (1 + Math.sin(Math.min(k, 1) * Math.PI) * amp));
        if (k < 1) requestAnimationFrame(tick);
        else g.scale.setScalar(base);
      };
      tick();
    },
    // Dónde cae cada gesto (en el mundo): la vela, el jarrito de flores o el lugar del regalito.
    offerPos(key, kind) {
      const v = new THREE.Vector3();
      if (key === 'featured') {
        if (kind === 'candle') v.set(0, 0.86, -0.05);
        else if (kind === 'flower') v.set(0, 1.12, -0.5);
        else if (kind === 'gift') return featuredGifts[0].getWorldPosition(v);
        else v.set(0, 1.9, -0.5);
        return easel.localToWorld(v);
      }
      const s = slots[key];
      if (!s) return null;
      if (!s.built) buildSlotInside(s);
      s.group.updateMatrixWorld(true);
      if (kind === 'candle') return s.shelf.localToWorld(v.set(0.31, 0.15, 0.03));
      if (kind === 'flower') return s.jar.localToWorld(v.set(0, 0.13, 0));
      if (kind === 'gift') return s.gifts[0].getWorldPosition(v);
      return s.photo.getWorldPosition(v);
    },
    // Tamaño (en el mundo) del regalito en ese lugar.
    giftScale(key) {
      const h = holdersFor(key)?.[0];
      return h ? h.getWorldScale(new THREE.Vector3()).x : 0.15;
    },
    // Esconder el regalito nuevo mientras vuela hasta la repisa.
    holdGift(key, on) {
      const h = holdersFor(key)?.[0];
      if (!h) return;
      h.userData.held = on;
      h.visible = !on && !!h.userData.ch;
    },
    // Hacer que un regalito de la repisa haga su gracia en 3D (escondiendo el fijo mientras salta/gira).
    bounceGift(key, emo, offerFx) {
      const holders = holdersFor(key);
      if (!holders?.length || !offerFx) return;
      const h = holders.find((x) => x.visible && x.userData.ch === emo) || holders.find((x) => x.visible) || holders[0];
      if (!h) return;
      const pos = h.getWorldPosition(new THREE.Vector3());
      const scale = h.getWorldScale(new THREE.Vector3()).x || 0.15;
      const hadFixed = h.visible && h.userData.ch === emo;
      if (hadFixed) {
        h.userData.held = true;
        h.visible = false;
      }
      offerFx.playGrace(emo, pos, scale, () => {
        if (hadFixed) {
          h.userData.held = false;
          h.visible = !!h.userData.ch;
        }
      });
    },
    animate(t) {
      updateDoors(t);
      for (const f of flames) {
        if (f.spin) { f.spin.rotation.y = t * 0.6; continue; }
        if (!f.group.visible) continue;
        const n = Math.sin(t * 9 + f.seed) * 0.5 + Math.sin(t * 17 + f.seed * 3) * 0.5;
        if (f.fy) {
          f.flame.scale.set(0.05 + n * 0.005, 0.1 + n * 0.018, 1);
          f.flame.position.x = Math.sin(t * 5 + f.seed) * 0.003;
        } else f.flame.scale.set(0.06 + n * 0.006, 0.12 + n * 0.02, 1);
        f.glow.material.opacity = f.base + n * 0.06;
      }
      if (easel.visible) for (const h of featuredGifts) if (h.visible && h.children[0]) idleGift(h.children[0], t);
      for (const s of slots) if (s.inside.visible && s.shelf.visible) for (const h of s.gifts) if (h.visible && h.children[0]?.userData.idle) idleGift(h.children[0], t);
      for (const fx of glowFx) {
        if (fx.stage < 1 || !fx.group.visible || !fx.group.parent?.visible) continue;
        fx.lantern.rotation.z = Math.sin(t * 1.3 + fx.seed) * 0.08;
        if (fx.stage >= 2) {
          const k = 1 + Math.sin(t * 2.2 + fx.seed) * 0.12;
          fx.star.scale.setScalar(0.2 * fx.scale * k);
        }
        if (fx.stage >= 3) {
          fx.cons.forEach((c, i) => {
            const a = t * 0.35 + (i / fx.cons.length) * Math.PI * 2 + fx.seed;
            c.position.set(Math.cos(a) * 0.62 * fx.scale, Math.sin(a) * 0.72 * fx.scale, 0.14);
            c.material.opacity = 0.6 + Math.sin(t * 3 + i) * 0.4;
          });
        }
      }
      animators.forEach((fn) => fn(t));
      if (fountain.visible) {
        for (const f of floaters) { const a = f.a + t * f.s; f.c.position.x = Math.cos(a) * f.d; f.c.position.z = Math.sin(a) * f.d; f.c.position.y = 0.35 + Math.sin(t * 1.3 + f.a) * 0.01; }
        if (crown99.visible && crown99.userData.paw) {
          crown99.userData.paw.rotation.y = Math.sin(t * 0.7) * 0.35;
          crown99.userData.paw.position.y = 1.95 + Math.sin(t * 1.4) * 0.08;
        }
      }
      // Ofrenda: cambiar de huellita cada 6 s.
      if (spotList.length && t - spotT > 6) {
        spotT = t;
        spotIdx = (spotIdx + 1) % spotList.length;
        showSpot(spotList[spotIdx]);
      }
      // Guirnaldas que titilan suave.
      for (let i = 0; i < bulbs.length; i++) {
        const k = 1.7 + Math.sin(t * 1.3 + bulbPhase[i]) * 0.35 + (Math.sin(t * 7 + bulbPhase[i] * 3) > 0.985 ? 0.8 : 0);
        bulbColor.copy(bulbBase[i]).multiplyScalar(tier.bloom ? (i < corridorBulbs ? k * 0.5 : k) : i < corridorBulbs ? 0.8 : 1);
        bulbMesh.setColorAt(i, bulbColor);
      }
      bulbMesh.instanceColor.needsUpdate = true;
      hallLight.intensity = 9 + Math.sin(t * 2.1) * 0.6;
    },
  };
}
