// El salón: muro en semicírculo con marcos, pérgola con guirnaldas de luces, y el atril central
// con la huellita destacada rodeada de velas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HALL_CENTER, HALL_RADIUS, rand } from './world.js';
import {
  emptySlotTexture, portraitTexture, photoTexture, labelTexture, twoSided, flameTexture, glowTexture, woodTexture, lightConeTexture, emojiTexture, lanternTexture,
} from './textures.js';
import { stageOf } from '../../server/glow.js';
import { giftMesh, idleGift } from './gifts3d.js';
import { CORRIDOR_NAMES } from '../floors.js';
import { PALETTE, paintedWallTexture, talaveraTexture, marigoldGeometry, marigoldMaterial, marigoldCluster, picadoBanner, sugarSkull, panDeMuerto, backgroundTexture } from './muertos.js';

// Ramo del jarrito: [x, y, z, tamaño] de cada flor (se van sumando con las flores que le dejan).
const BOUQUET = [[0, 0.135, 0, 1.15], [-0.032, 0.12, 0.018, 1], [0.03, 0.125, -0.012, 1], [0.006, 0.118, 0.034, 0.95], [-0.012, 0.15, -0.028, 0.9]];

const WALL_COLORS = ['#178f8c', '#c2186b', '#d9901c', '#6a2aa6', '#239a62', '#d9661a', '#2f6fd6', '#b5307a', '#159aa0', '#7b3fc4'];

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

export const PANELS = 10;
export const PER_PANEL = 9; // 3 x 3
export const SLOTS_PER_FLOOR = PANELS * PER_PANEL;

const FRAME_W = 0.8;
const FRAME_H = 1.0;
const COL_X = [-1.8, 0, 1.8];
const PANEL_W = 5.8; // ancho de cada pared (local, antes de escalar)
const ROW_Y = [3.05, 1.95, 0.85];
// Paredes del muro más grandes (marcos, repisas y techitos crecen juntos) para el salón amplio.
export const WALL_SCALE = 1.45;
export const POST_H = 7.4;
const POLE_H = 11.5;
// La ofrenda central es grande (se ve desde la entrada y domina el salón en tercera persona).
export const ALTAR_SCALE = 2.2;
export const EASEL_POS = new THREE.Vector3(HALL_CENTER.x, 0, HALL_CENTER.z + 9.5);
const BED_R = 3.3; // cantero de flores del centro

export function candleLevel(n) {
  return n >= 12 ? 3 : n >= 5 ? 2 : n >= 1 ? 1 : 0;
}

const panelAngle = (p) => THREE.MathUtils.degToRad(40 + p * (280 / (PANELS - 1)));

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

export function buildHall(scene, colliders, tier) {
  const r = rand(11);
  const panelMat = new THREE.MeshLambertMaterial({ map: woodTexture('#4a3022') });
  const frameMat = new THREE.MeshLambertMaterial({ color: '#cdb390' });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#d9a748', roughness: 0.35, metalness: 0.8, emissive: '#6b4300', emissiveIntensity: 0.55 });
  const matMat = new THREE.MeshLambertMaterial({ color: '#f1e6d4' });
  const ledgeMat = new THREE.MeshLambertMaterial({ color: '#c8b39a' });
  const waxMat = new THREE.MeshLambertMaterial({ color: '#fff3e0', emissive: '#7a5226', emissiveIntensity: 0.45 });
  const postMat = new THREE.MeshLambertMaterial({ map: paintedWallTexture('#b5307a') });
  const marigoldGeo = marigoldGeometry(0.04, '#ffffff', r);
  const flowerMats = [PALETTE.cempasuchil, PALETTE.naranja, PALETTE.amarillo, '#e04b8a'].map((c) => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, color: c, emissive: c, emissiveIntensity: 0.25 }));
  const tileMat = new THREE.MeshLambertMaterial({ map: talaveraTexture() });
  const animators = [];
  // Jarrito de barro de la repisa (geometrías compartidas por todos los marcos).
  const jarGeo = new THREE.LatheGeometry([[0.0, 0], [0.032, 0], [0.045, 0.03], [0.046, 0.055], [0.034, 0.08], [0.03, 0.095], [0.038, 0.105]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  const jarRimGeo = new THREE.TorusGeometry(0.036, 0.006, 6, 16).rotateX(Math.PI / 2).translate(0, 0.105, 0);
  const jarLeafGeo = mergeGeometries([0, 1, 2, 3].map((i) => new THREE.SphereGeometry(0.03, 6, 4).scale(1.6, 0.25, 0.7).rotateZ(0.5).translate(0.04, 0.1, 0).rotateY(i * 1.57 + 0.4)));
  const jarMat = new THREE.MeshLambertMaterial({ color: '#b5532a', emissive: '#3a1408', emissiveIntensity: 0.6 });
  const leafMat = new THREE.MeshLambertMaterial({ color: '#4c8a3a', emissive: '#10200a' });

  const slots = [];
  const flames = [];
  const glowFx = [];
  const panelLabels = [];
  const pickables = [];

  // ---------- paneles del muro ----------
  for (let p = 0; p < PANELS; p++) {
    const a = panelAngle(p);
    const panel = new THREE.Group();
    panel.position.set(HALL_CENTER.x + Math.sin(a) * HALL_RADIUS, 0, HALL_CENTER.z + Math.cos(a) * HALL_RADIUS);
    panel.scale.setScalar(WALL_SCALE);
    panel.lookAt(HALL_CENTER.x, 0, HALL_CENTER.z);
    scene.add(panel);

    // Pared pintada de colores, con techito y un friso de talavera abajo.
    const wallMat = new THREE.MeshLambertMaterial({ map: paintedWallTexture(WALL_COLORS[p % WALL_COLORS.length]) });
    const board = new THREE.Mesh(new THREE.BoxGeometry(PANEL_W, 3.9, 0.22), wallMat);
    board.position.set(0, 2.05, -0.12);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(PANEL_W + 0.3, 0.14, 0.7), new THREE.MeshLambertMaterial({ color: '#b5482a' }));
    roof.position.set(0, 4.06, 0.08);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(PANEL_W + 0.1, 0.2, 0.36), panelMat);
    plinth.position.set(0, 0.1, -0.05);
    const tiles = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_W, 0.3), tileMat.clone());
    tiles.material.map = talaveraTexture().clone();
    tiles.material.map.repeat.set(20, 1);
    tiles.material.map.needsUpdate = true;
    tiles.position.set(0, 0.36, 0.0);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(PANEL_W + 0.04, 0.06, 0.05), new THREE.MeshLambertMaterial({ color: '#fbefd9' }));
    trim.position.set(0, 3.98, 0.0);
    panel.add(board, roof, plinth, tiles, trim);

    // Aplique de luz y su haz sobre el muro.
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.05, 0.08), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.15, 0.75) }));
    bar.position.set(0, 3.93, 0.32);
    const cone = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_W - 0.1, 3.7), new THREE.MeshBasicMaterial({ map: lightConeTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 }));
    cone.position.set(0, 2.08, 0.0);
    panel.add(bar, cone);

    // Cartel del pasillo, colgado de dos cadenitas sobre el techito.
    const label = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.52), new THREE.MeshBasicMaterial({ transparent: true }));
    label.position.set(0, 4.62, 0.36);
    for (const sx of [-1.35, 1.35]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 4), new THREE.MeshLambertMaterial({ color: '#c9973f' }));
      chain.position.set(sx, 5.02, 0.36);
      panel.add(chain);
    }
    panel.add(label);
    panelLabels.push(label);

    panel.updateMatrixWorld();
    const lp = new THREE.Vector3(-PANEL_W / 2 - 0.05, 0, 0).applyMatrix4(panel.matrixWorld);
    const rp = new THREE.Vector3(PANEL_W / 2 + 0.05, 0, 0).applyMatrix4(panel.matrixWorld);
    colliders.segments.push([lp.x, lp.z, rp.x, rp.z]);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const local = p * PER_PANEL + row * 3 + col;
        const g = new THREE.Group();
        g.position.set(COL_X[col], ROW_Y[row], 0.03);
        panel.add(g);

        const border = new THREE.Mesh(new THREE.BoxGeometry(FRAME_W + 0.16, FRAME_H + 0.16, 0.07), frameMat);
        border.position.z = 0.01;
        const mat = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W + 0.04, FRAME_H + 0.04), new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#3a2a20', emissiveIntensity: 0.3 }));
        mat.position.z = 0.05;
        const photo = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W - 0.06, FRAME_H - 0.06), new THREE.MeshBasicMaterial({ map: emptySlotTexture(), transparent: true, color: '#e8e0d4' }));
        photo.position.z = 0.055;
        const name = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.15), new THREE.MeshBasicMaterial({ transparent: true }));
        name.position.set(0, -FRAME_H / 2 - 0.15, 0.06);
        name.visible = false;

        const shelf = new THREE.Group();
        shelf.position.set(0, -FRAME_H / 2 - 0.29, 0.13);
        shelf.add(new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.04, 0.22), ledgeMat));
        const candles = [0, 1, 2].map((i) => {
          const c = makeCandle(waxMat, 0.09 + i * 0.03, flames, tier.bloom);
          c.position.set([0.31, 0.39, 0.25][i], 0.02, [0.03, -0.05, -0.07][i]);
          c.visible = false;
          shelf.add(c);
          return c;
        });
        // Jarrito de barro con el ramo de cempasúchil (más flores, más ramo).
        const jar = new THREE.Group();
        jar.position.set(-0.35, 0.02, -0.02);
        jar.scale.setScalar(1.25);
        jar.add(new THREE.Mesh(jarGeo, jarMat), new THREE.Mesh(jarRimGeo, jarMat), new THREE.Mesh(jarLeafGeo, leafMat));
        jar.visible = false;
        shelf.add(jar);
        const flowers = BOUQUET.map(([x, y, z, s], i) => {
          const f = new THREE.Mesh(marigoldGeo, flowerMats[(local + i) % flowerMats.length]);
          f.position.set(x, y, z);
          f.scale.setScalar(s);
          f.rotation.set(x * 4, i, z * 4);
          f.visible = false;
          jar.add(f);
          return f;
        });
        const gifts = [0, 1, 2].map((i) => {
          const h = giftHolder(0.17);
          h.position.set(-0.17 + i * 0.18, 0.02, 0.035);
          h.rotation.y = (i - 1) * 0.3;
          shelf.add(h);
          return h;
        });
        shelf.visible = false;
        const fx = makeGlowFx(glowFx);
        fx.group.visible = false;

        g.add(border, mat, photo, name, shelf, fx.group);
        photo.userData = { kind: 'slot', local };
        pickables.push(photo);
        slots.push({ group: g, border, mat, photo, name, shelf, candles, jar, flowers, gifts, fx, memorial: null, textures: [] });
      }
    }
  }

  // ---------- pérgola y guirnaldas ----------
  const posts = [];
  for (let p = 0; p <= PANELS; p++) {
    const a = THREE.MathUtils.degToRad(40 + (p - 0.5) * (280 / (PANELS - 1)));
    posts.push(new THREE.Vector3(HALL_CENTER.x + Math.sin(a) * (HALL_RADIUS + 0.1), 0, HALL_CENTER.z + Math.cos(a) * (HALL_RADIUS + 0.1)));
  }
  {
    const parts = [];
    for (const pt of posts) {
      const g = new THREE.BoxGeometry(0.22, POST_H, 0.22);
      g.translate(pt.x, POST_H / 2, pt.z);
      parts.push(g);
      colliders.circles.push({ x: pt.x, z: pt.z, r: 0.2 });
    }
    // Vigas entre postes (incluida la de la entrada).
    for (let i = 0; i < posts.length; i++) {
      const a = posts[i];
      const b = posts[(i + 1) % posts.length];
      const g = new THREE.BoxGeometry(a.distanceTo(b) + 0.2, 0.2, 0.18);
      g.rotateY(-Math.atan2(b.z - a.z, b.x - a.x));
      g.translate((a.x + b.x) / 2, POST_H, (a.z + b.z) / 2);
      parts.push(g);
    }
    const pole = new THREE.CylinderGeometry(0.07, 0.1, POLE_H, 10);
    pole.translate(HALL_CENTER.x, POLE_H / 2, HALL_CENTER.z);
    parts.push(pole);
    scene.add(new THREE.Mesh(mergeGeometries(parts.map((g) => g.toNonIndexed())), postMat));

    // Cartel de bienvenida colgado en la entrada.
    const a = posts[0];
    const b = posts[posts.length - 1];
    const sign = twoSided(new THREE.PlaneGeometry(6.4, 1.04), new THREE.MeshBasicMaterial({
      map: labelTexture('Jardín de las huellitas', { w: 1024, h: 166, font: '400 70px "Young Serif", Georgia, serif', bg: 'rgba(74,48,34,0.96)', fg: '#f6e3c4' }),
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

  const bulbs = [];
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
  for (const pt of posts) strand(new THREE.Vector3(pt.x, POST_H + 0.1, pt.z), top, tier.bulbsPerStrand, 0.9);
  // Papel picado entre los postes y cruzando hacia el poste central.
  for (let i = 0; i < posts.length - 1; i++) {
    const b = picadoBanner(new THREE.Vector3(posts[i].x, POST_H - 0.12, posts[i].z), new THREE.Vector3(posts[i + 1].x, POST_H - 0.12, posts[i + 1].z), { sag: 0.35, flags: 9, size: 0.36, seed: i });
    scene.add(b);
    animators.push(b.userData.flutter);
  }
  for (let i = 0; i < posts.length; i += 2) {
    const a = new THREE.Vector3(posts[i].x, POST_H - 0.4, posts[i].z);
    const mid = new THREE.Vector3().lerpVectors(a, new THREE.Vector3(HALL_CENTER.x, POLE_H - 1.0, HALL_CENTER.z), 0.92);
    const b = picadoBanner(a, mid, { sag: 0.6, flags: 12, size: 0.34, seed: i * 3 });
    scene.add(b);
    animators.push(b.userData.flutter);
  }
  // Arco de cempasúchil en la entrada.
  {
    const a = posts[0];
    const b = posts[posts.length - 1];
    const pts = [];
    const gatePts = [];
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const x = THREE.MathUtils.lerp(a.x, b.x, t);
      const z = THREE.MathUtils.lerp(a.z, b.z, t);
      const y = 0.3 + Math.sin(t * Math.PI) * (POST_H + 0.9) * (0.65 + 0.35 * Math.sin(t * Math.PI));
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
  const hallLight = new THREE.PointLight('#ffbf7a', 18, 44, 1.4);
  hallLight.position.set(HALL_CENTER.x, POLE_H - 1.2, HALL_CENTER.z);
  scene.add(hallLight);

  // ---------- cantero central ----------
  {
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(BED_R, BED_R + 0.15, 0.45, 48), new THREE.MeshLambertMaterial({ color: '#8b7d72' }));
    bed.position.copy(HALL_CENTER).setY(0.3);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(BED_R - 0.18, BED_R - 0.18, 0.05, 48), new THREE.MeshLambertMaterial({ color: '#3b2a20' }));
    soil.position.copy(HALL_CENTER).setY(0.53);
    scene.add(bed, soil);
    colliders.circles.push({ x: HALL_CENTER.x, z: HALL_CENTER.z, r: BED_R + 0.4 });
    const petals = [];
    for (let i = 0; i < 5; i++) {
      const p = new THREE.CircleGeometry(0.05, 6);
      p.translate(0.055, 0, 0);
      p.rotateZ((i / 5) * Math.PI * 2);
      petals.push(p);
    }
    void petals;
    const n = 520;
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
      fl.setColorAt(i, pal[i % pal.length]);
    }
    scene.add(fl);
  }

  // ---------- atril de la huellita destacada ----------
  const easel = new THREE.Group();
  easel.position.copy(EASEL_POS);
  scene.add(easel);
  colliders.circles.push({ x: EASEL_POS.x, z: EASEL_POS.z - 0.2 * ALTAR_SCALE, r: 1.7 * ALTAR_SCALE });
  // Ofrenda de tres escalones con mantel, papel picado, flores, calaveritas y pan de muerto.
  const cloth = new THREE.MeshLambertMaterial({ color: '#fbf3e6', emissive: '#2a1a14' });
  const steps = [[3.0, 0.35, 1.7, -0.15], [2.4, 0.7, 1.15, -0.42], [1.8, 1.05, 0.6, -0.7]];
  steps.forEach(([w, h, d, z], i) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cloth);
    box.position.set(0, h / 2, z);
    easel.add(box);
    const front = z + d / 2 + 0.01;
    const b = picadoBanner(new THREE.Vector3(-w / 2, h - 0.01, front), new THREE.Vector3(w / 2, h - 0.01, front), { sag: 0.0, flags: Math.round(w / 0.32), size: 0.27, seed: i * 5 });
    b.children.forEach((c) => { if (c.isMesh) c.rotation.y = 0; });
    easel.add(b);
    animators.push((t) => b.children.forEach((c, k) => { if (c.isMesh) c.rotation.x = Math.sin(t * 1.6 + k + i) * 0.06; }));
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
  pickables.push(spotPhoto);

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
  pickables.push(cardPhoto);
  let cardSrc = null;
  function setCard(c) {
    card.visible = !!c;
    if (!c || c.src === cardSrc) return;
    cardSrc = c.src;
    const h = 0.62;
    const w = h * (c.w / c.h);
    cardBorder.scale.set(w + 0.05, h + 0.05, 1);
    cardBorder.position.set(0, h / 2 + 0.03, 0);
    cardPhoto.scale.set(w, h, 1);
    cardPhoto.position.set(0, h / 2 + 0.03, 0.017);
    new THREE.TextureLoader().load(c.src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      cardPhoto.material.map = t;
      cardPhoto.material.needsUpdate = true;
    });
  }

  const fBorder = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.66, 0.08), goldMat);
  fBorder.position.set(0, 1.9, -0.6);
  const fMat = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 1.54), matMat.clone());
  fMat.position.set(0, 1.9, -0.555);
  const fPhoto = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.375), new THREE.MeshBasicMaterial({ color: '#e8e0d4' }));
  fPhoto.position.set(0, 1.9, -0.55);
  fPhoto.userData = { kind: 'featured' };
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.2), new THREE.MeshBasicMaterial({ transparent: true }));
  plaque.position.set(0, 0.47, 0.32);
  plaque.rotation.x = -0.25;
  easel.add(fBorder, fMat, fPhoto, plaque);
  pickables.push(fPhoto);
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
  let labelFloor = -1;
  let hovered = null;

  function clearSlot(s) {
    s.textures.forEach((t) => t.dispose());
    s.textures = [];
    s.memorial = null;
    s.photo.material.map = emptySlotTexture();
    s.photo.material.opacity = 0.75;
    s.photo.material.needsUpdate = true;
    s.border.visible = false;
    s.mat.visible = false;
    s.name.visible = false;
    s.shelf.visible = false;
    s.fx.group.visible = false;
  }

  function fillSlot(s, m) {
    const prev = s.memorial;
    if (!(prev && prev.id === m.id && prev.photo === m.photo)) {
      clearSlot(s);
      const tex = m.photo ? photoTexture(m.photo) : portraitTexture(m);
      s.textures.push(tex);
      s.photo.material.map = tex;
      s.photo.material.opacity = 1;
      s.photo.material.needsUpdate = true;
      if (m.photo) {
        const lt = labelTexture(m.name, { w: 384, h: 72, font: '700 50px Caveat, cursive' });
        s.textures.push(lt);
        s.name.material.map = lt;
        s.name.material.needsUpdate = true;
        s.name.visible = true;
      }
    }
    s.memorial = m;
    s.border.visible = true;
    s.mat.visible = true;
    s.border.material = m.candles >= 20 || m.eternal ? goldMat : frameMat;
    if (s.bg !== m.bg) {
      s.mat.material.map = backgroundTexture(m.bg || 'crema');
      s.mat.material.needsUpdate = true;
      s.bg = m.bg;
    }
    s.shelf.visible = true;
    const lvl = candleLevel(m.candles);
    s.candles.forEach((c, i) => { c.visible = i < lvl; });
    const fl = Math.min(BOUQUET.length, Math.ceil(m.flowers / 2));
    s.jar.visible = fl > 0;
    s.flowers.forEach((f, i) => { f.visible = i < fl; });
    showGifts(s.gifts, m.lastGifts);
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

  function render(memorials) {
    const here = new Map();
    for (const m of memorials) {
      if (m.slot < 0) setFeatured(m);
      else if (Math.floor(m.slot / SLOTS_PER_FLOOR) === floor) here.set(m.slot % SLOTS_PER_FLOOR, m);
    }
    slots.forEach((s, i) => (here.has(i) ? fillSlot(s, here.get(i)) : clearSlot(s)));
    // Cada pasillo con su nombre y cuántas huellitas tiene en este piso.
    const per = new Array(PANELS).fill(0);
    for (const i of here.keys()) per[Math.floor(i / PER_PANEL)]++;
    labelFloor = floor;
    panelLabels.forEach((lbl, p) => {
      const n = per[p];
      const text = n ? `${CORRIDOR_NAMES[p]} · ${n} ${n === 1 ? 'huellita' : 'huellitas'}` : CORRIDOR_NAMES[p];
      if (lbl.userData.text === text) return;
      lbl.userData.text = text;
      lbl.material.map?.dispose();
      lbl.material.map = labelTexture(text, { w: 1100, h: 172, font: '400 70px "Young Serif", Georgia, serif', bg: 'rgba(58,36,24,0.95)', fg: '#f6e3c4' });
      lbl.material.needsUpdate = true;
    });
  }

  const objFor = (key) => (key === 'featured' ? easel : slots[key]?.group);

  return {
    slots,
    get featured() { return featured; },
    get floor() { return floor; },
    setFloor(n, memorials) {
      floor = n;
      render(memorials);
    },
    render,
    pickables() {
      return pickables;
    },
    // Dónde pararse para mirar un lugar. `shift` corre la vista para que la ficha no tape el marco.
    viewpoint(key, shift = 0, distMul = 1) {
      if (key === 'featured') {
        const k = ALTAR_SCALE;
        const frame = new THREE.Vector3(EASEL_POS.x, 1.75 * k, EASEL_POS.z - 0.5 * k);
        const target = new THREE.Vector3(EASEL_POS.x + shift * k, 1.55 * k, EASEL_POS.z - 0.5 * k);
        return { stand: new THREE.Vector3(EASEL_POS.x + shift * k, 2.1, EASEL_POS.z + 3.4 * k * distMul), target, frame };
      }
      const s = slots[key];
      const frame = new THREE.Vector3();
      s.photo.getWorldPosition(frame);
      const normal = new THREE.Vector3(0, 0, 1).transformDirection(s.photo.matrixWorld);
      const right = new THREE.Vector3(1, 0, 0).transformDirection(s.photo.matrixWorld);
      const target = frame.clone().addScaledVector(right, shift);
      const stand = target.clone().addScaledVector(normal, (3.1 * WALL_SCALE + Math.max(0, target.y - 1.6) * 0.9) * distMul);
      stand.y = 1.6;
      target.y = (target.y + 1.6) / 2 + 0.15;
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
    // Para encuadrar o soltar efectos desde un memorial.
    memorialKey(m) {
      if (m.slot < 0) return 'featured';
      return Math.floor(m.slot / SLOTS_PER_FLOOR) === floor ? m.slot % SLOTS_PER_FLOOR : null;
    },
    worldPos(key) {
      const v = new THREE.Vector3();
      if (key === 'featured') return fPhoto.getWorldPosition(v);
      return slots[key]?.photo.getWorldPosition(v) || null;
    },
    setHover(key) {
      if (hovered !== null && hovered !== key && hovered !== 'featured') objFor(hovered)?.scale.setScalar(1);
      hovered = key;
      if (key !== null && key !== 'featured') objFor(key)?.scale.setScalar(1.06);
    },
    pulse(key) {
      const g = objFor(key);
      if (!g) return;
      const start = performance.now();
      const amp = key === 'featured' ? 0.05 : 0.12;
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
    animate(t) {
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
      for (const h of featuredGifts) if (h.visible && h.children[0]) idleGift(h.children[0], t);
      for (const s of slots) if (s.shelf.visible) for (const h of s.gifts) if (h.visible && h.children[0]?.userData.idle) idleGift(h.children[0], t);
      for (const fx of glowFx) {
        if (fx.stage < 1 || !fx.group.parent?.visible) continue;
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
      // Ofrenda: cambiar de huellita cada 6 s.
      if (spotList.length && t - spotT > 6) {
        spotT = t;
        spotIdx = (spotIdx + 1) % spotList.length;
        showSpot(spotList[spotIdx]);
      }
      // Guirnaldas que titilan suave.
      for (let i = 0; i < bulbs.length; i++) {
        const k = 1.7 + Math.sin(t * 1.3 + bulbPhase[i]) * 0.35 + (Math.sin(t * 7 + bulbPhase[i] * 3) > 0.985 ? 0.8 : 0);
        bulbColor.copy(bulbBase[i]).multiplyScalar(tier.bloom ? k : 1);
        bulbMesh.setColorAt(i, bulbColor);
      }
      bulbMesh.instanceColor.needsUpdate = true;
      hallLight.intensity = 9 + Math.sin(t * 2.1) * 0.6;
    },
  };
}
