// El salón: muro en semicírculo con marcos, pérgola con guirnaldas de luces, y el atril central
// con la huellita destacada rodeada de velas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HALL_CENTER, HALL_RADIUS, rand } from './world.js';
import {
  emptySlotTexture, portraitTexture, photoTexture, labelTexture, flameTexture, glowTexture, woodTexture, lightConeTexture,
} from './textures.js';

export const PANELS = 10;
export const PER_PANEL = 9; // 3 x 3
export const SLOTS_PER_FLOOR = PANELS * PER_PANEL;

const FRAME_W = 0.8;
const FRAME_H = 1.0;
const COL_X = [-1.45, 0, 1.45];
const ROW_Y = [3.05, 1.95, 0.85];
const POST_H = 5.0;
const POLE_H = 6.9;
export const EASEL_POS = new THREE.Vector3(HALL_CENTER.x, 0, HALL_CENTER.z + 3.1);

export function candleLevel(n) {
  return n >= 12 ? 3 : n >= 5 ? 2 : n >= 1 ? 1 : 0;
}

const panelAngle = (p) => THREE.MathUtils.degToRad(40 + p * (280 / (PANELS - 1)));

function makeCandle(waxMat, h, flames, bloom) {
  const c = new THREE.Group();
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, h, 10), waxMat);
  wax.position.y = h / 2;
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(1.8, 1.5, 1.2) }));
  flame.scale.set(0.06, 0.12, 1);
  flame.position.y = h + 0.06;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: bloom ? 0.3 : 0.5 }));
  glow.scale.setScalar(0.32);
  glow.position.y = h + 0.04;
  c.add(wax, flame, glow);
  flames.push({ flame, glow, seed: Math.random() * 100, group: c, base: bloom ? 0.3 : 0.5 });
  return c;
}

export function buildHall(scene, colliders, tier) {
  const r = rand(11);
  const panelMat = new THREE.MeshLambertMaterial({ map: woodTexture('#4a3022') });
  const frameMat = new THREE.MeshLambertMaterial({ color: '#cdb390' });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#d9a748', roughness: 0.35, metalness: 0.8, emissive: '#6b4300', emissiveIntensity: 0.55 });
  const matMat = new THREE.MeshLambertMaterial({ color: '#f1e6d4' });
  const ledgeMat = new THREE.MeshLambertMaterial({ color: '#c8b39a' });
  const waxMat = new THREE.MeshLambertMaterial({ color: '#fff3e0', emissive: '#7a5226', emissiveIntensity: 0.45 });
  const postMat = new THREE.MeshLambertMaterial({ map: woodTexture('#5b3a27') });
  const flowerMats = ['#f4a6b8', '#f7d774', '#b9a3f0', '#ffffff', '#f7b58a'].map((c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.12 }));

  const slots = [];
  const flames = [];
  const panelLabels = [];
  const pickables = [];

  // ---------- paneles del muro ----------
  for (let p = 0; p < PANELS; p++) {
    const a = panelAngle(p);
    const panel = new THREE.Group();
    panel.position.set(HALL_CENTER.x + Math.sin(a) * HALL_RADIUS, 0, HALL_CENTER.z + Math.cos(a) * HALL_RADIUS);
    panel.lookAt(HALL_CENTER.x, 0, HALL_CENTER.z);
    scene.add(panel);

    const board = new THREE.Mesh(new THREE.BoxGeometry(4.7, 3.9, 0.22), panelMat);
    board.position.set(0, 2.05, -0.12);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.14, 0.7), panelMat);
    roof.position.set(0, 4.06, 0.08);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 0.36), panelMat);
    plinth.position.set(0, 0.1, -0.05);
    panel.add(board, roof, plinth);

    // Aplique de luz y su haz sobre el muro.
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.08), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.15, 0.75) }));
    bar.position.set(0, 3.93, 0.32);
    const cone = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.7), new THREE.MeshBasicMaterial({ map: lightConeTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 }));
    cone.position.set(0, 2.08, 0.0);
    panel.add(bar, cone);

    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.3), new THREE.MeshBasicMaterial({ transparent: true }));
    label.position.set(0, 4.35, 0.12);
    panel.add(label);
    panelLabels.push(label);

    panel.updateMatrixWorld();
    const lp = new THREE.Vector3(-2.4, 0, 0).applyMatrix4(panel.matrixWorld);
    const rp = new THREE.Vector3(2.4, 0, 0).applyMatrix4(panel.matrixWorld);
    colliders.segments.push([lp.x, lp.z, rp.x, rp.z]);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const local = p * PER_PANEL + row * 3 + col;
        const g = new THREE.Group();
        g.position.set(COL_X[col], ROW_Y[row], 0.03);
        panel.add(g);

        const border = new THREE.Mesh(new THREE.BoxGeometry(FRAME_W + 0.16, FRAME_H + 0.16, 0.07), frameMat);
        border.position.z = 0.01;
        const mat = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W + 0.04, FRAME_H + 0.04), matMat);
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
          c.position.set([-0.3, 0.3, 0.2][i], 0.02, [0, 0, -0.05][i]);
          c.visible = false;
          shelf.add(c);
          return c;
        });
        const flowers = [0, 1, 2, 3].map((i) => {
          const f = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035, 0), flowerMats[(local + i) % flowerMats.length]);
          f.position.set(-0.12 + i * 0.08, 0.05, 0.03 * (i % 2));
          f.visible = false;
          shelf.add(f);
          return f;
        });
        shelf.visible = false;

        g.add(border, mat, photo, name, shelf);
        photo.userData = { kind: 'slot', local };
        pickables.push(photo);
        slots.push({ group: g, border, mat, photo, name, shelf, candles, flowers, memorial: null, textures: [] });
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
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.55), new THREE.MeshBasicMaterial({
      map: labelTexture('Jardín de las huellitas', { w: 1024, h: 166, font: '600 76px Lora, Georgia, serif', bg: 'rgba(74,48,34,0.96)', fg: '#f6e3c4' }),
      side: THREE.DoubleSide,
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
  for (let i = 0; i < posts.length - 1; i++) {
    strand(new THREE.Vector3(posts[i].x, POST_H - 0.05, posts[i].z), new THREE.Vector3(posts[i + 1].x, POST_H - 0.05, posts[i + 1].z), 7, 0.45);
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
  const hallLight = new THREE.PointLight('#ffbf7a', 9, 20, 1.6);
  hallLight.position.set(HALL_CENTER.x, POLE_H - 1.2, HALL_CENTER.z);
  scene.add(hallLight);

  // ---------- cantero central ----------
  {
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.35, 0.45, 40), new THREE.MeshLambertMaterial({ color: '#8b7d72' }));
    bed.position.copy(HALL_CENTER).setY(0.3);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(2.02, 2.02, 0.05, 40), new THREE.MeshLambertMaterial({ color: '#3b2a20' }));
    soil.position.copy(HALL_CENTER).setY(0.53);
    scene.add(bed, soil);
    colliders.circles.push({ x: HALL_CENTER.x, z: HALL_CENTER.z, r: 2.6 });
    const petals = [];
    for (let i = 0; i < 5; i++) {
      const p = new THREE.CircleGeometry(0.05, 6);
      p.translate(0.055, 0, 0);
      p.rotateZ((i / 5) * Math.PI * 2);
      petals.push(p);
    }
    const fgeo = mergeGeometries(petals).rotateX(-Math.PI / 2);
    const n = 320;
    const fl = new THREE.InstancedMesh(fgeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, emissive: '#3a2a30' }), n);
    const pal = ['#f6c3d0', '#f7e3a1', '#c8b6f2', '#fbd1b2', '#ffffff'].map((c) => new THREE.Color(c));
    const m = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 1.9;
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
  colliders.circles.push({ x: EASEL_POS.x, z: EASEL_POS.z, r: 0.9 });
  const easelWood = new THREE.MeshLambertMaterial({ map: woodTexture('#6b4630') });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.7, 0.07), easelWood);
    leg.position.set(s * 0.45, 1.3, 0);
    leg.rotation.z = s * 0.12;
    easel.add(leg);
  }
  const backLeg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.6, 0.07), easelWood);
  backLeg.position.set(0, 1.25, -0.4);
  backLeg.rotation.x = 0.3;
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.18), easelWood);
  ledge.position.set(0, 0.95, 0.06);
  easel.add(backLeg, ledge);
  const fBorder = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.66, 0.08), goldMat);
  fBorder.position.set(0, 1.82, 0.08);
  const fMat = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 1.54), matMat);
  fMat.position.set(0, 1.82, 0.125);
  const fPhoto = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.375), new THREE.MeshBasicMaterial({ color: '#e8e0d4' }));
  fPhoto.position.set(0, 1.82, 0.13);
  fPhoto.userData = { kind: 'featured' };
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.24), new THREE.MeshBasicMaterial({ transparent: true }));
  plaque.position.set(0, 0.8, 0.16);
  easel.add(fBorder, fMat, fPhoto, plaque);
  pickables.push(fPhoto);
  // Velas alrededor del atril: se encienden más a medida que llegan velas.
  const clusterCandles = [];
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI * 0.95 + (i / 25) * Math.PI * 1.9;
    const d = 0.75 + (i % 3) * 0.22 + r() * 0.1;
    const c = makeCandle(waxMat, 0.08 + r() * 0.2, flames, tier.bloom);
    c.scale.setScalar(1.3);
    c.position.set(Math.sin(a) * d, 0.16, Math.cos(a) * d * 0.7 + 0.25);
    c.visible = false;
    easel.add(c);
    clusterCandles.push(c);
  }
  for (let i = 0; i < 10; i++) {
    const f = new THREE.Mesh(new THREE.DodecahedronGeometry(0.045, 0), flowerMats[i % flowerMats.length]);
    const a = (i / 10) * Math.PI - Math.PI / 2;
    f.position.set(Math.sin(a) * 0.55, 0.22, 0.45 + Math.cos(a) * 0.1);
    easel.add(f);
  }
  const easelLight = new THREE.SpotLight('#ffd6a0', 9, 9, 0.5, 0.6, 1.4);
  easelLight.position.set(EASEL_POS.x, 4.6, EASEL_POS.z + 2.6);
  easelLight.target.position.set(EASEL_POS.x, 1.8, EASEL_POS.z);
  scene.add(easelLight, easelLight.target);

  let featured = null;
  let featuredTex = [];

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
        const lt = labelTexture(m.name, { w: 384, h: 72, font: '600 40px Lora, Georgia, serif' });
        s.textures.push(lt);
        s.name.material.map = lt;
        s.name.material.needsUpdate = true;
        s.name.visible = true;
      }
    }
    s.memorial = m;
    s.border.visible = true;
    s.mat.visible = true;
    s.border.material = m.candles >= 20 ? goldMat : frameMat;
    s.shelf.visible = true;
    const lvl = candleLevel(m.candles);
    s.candles.forEach((c, i) => { c.visible = i < lvl; });
    const fl = Math.min(4, Math.ceil(m.flowers / 2));
    s.flowers.forEach((f, i) => { f.visible = i < fl; });
  }

  function setFeatured(m) {
    if (!(featured && featured.photo === m.photo && featured.name === m.name)) {
      featuredTex.forEach((t) => t.dispose());
      const tex = m.photo ? photoTexture(m.photo) : portraitTexture(m);
      const lt = labelTexture(m.name, { w: 512, h: 104, font: '600 58px Lora, Georgia, serif', bg: 'rgba(74,48,34,0.95)', fg: '#f6e3c4' });
      featuredTex = [tex, lt];
      fPhoto.material.map = tex;
      fPhoto.material.needsUpdate = true;
      plaque.material.map = lt;
      plaque.material.needsUpdate = true;
    }
    featured = m;
    fPhoto.userData.id = m.id;
    const lit = Math.min(clusterCandles.length, 3 + Math.ceil(m.candles * 0.8));
    clusterCandles.forEach((c, i) => { c.visible = i < lit; });
  }

  function render(memorials) {
    const here = new Map();
    for (const m of memorials) {
      if (m.slot < 0) setFeatured(m);
      else if (Math.floor(m.slot / SLOTS_PER_FLOOR) === floor) here.set(m.slot % SLOTS_PER_FLOOR, m);
    }
    slots.forEach((s, i) => (here.has(i) ? fillSlot(s, here.get(i)) : clearSlot(s)));
    if (labelFloor === floor) return;
    labelFloor = floor;
    panelLabels.forEach((lbl, p) => {
      lbl.material.map?.dispose();
      lbl.material.map = labelTexture(`Piso ${floor + 1} · Pared ${p + 1}`, { w: 512, h: 96 });
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
        const frame = new THREE.Vector3(EASEL_POS.x, 1.82, EASEL_POS.z);
        const target = new THREE.Vector3(EASEL_POS.x + shift, 1.75, EASEL_POS.z);
        return { stand: new THREE.Vector3(EASEL_POS.x + shift, 1.6, EASEL_POS.z + 3.6 * distMul), target, frame };
      }
      const s = slots[key];
      const frame = new THREE.Vector3();
      s.photo.getWorldPosition(frame);
      const normal = new THREE.Vector3(0, 0, 1).transformDirection(s.photo.matrixWorld);
      const right = new THREE.Vector3(1, 0, 0).transformDirection(s.photo.matrixWorld);
      const target = frame.clone().addScaledVector(right, shift);
      const stand = target.clone().addScaledVector(normal, (3.1 + Math.max(0, target.y - 1.6) * 0.9) * distMul);
      stand.y = 1.6;
      target.y = (target.y + 1.6) / 2 + 0.15;
      return { stand, target, frame };
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
        g.scale.setScalar(1 + Math.sin(Math.min(k, 1) * Math.PI) * amp);
        if (k < 1) requestAnimationFrame(tick);
        else g.scale.setScalar(1);
      };
      tick();
    },
    animate(t) {
      for (const f of flames) {
        if (f.spin) { f.spin.rotation.y = t * 0.6; continue; }
        if (!f.group.visible) continue;
        const n = Math.sin(t * 9 + f.seed) * 0.5 + Math.sin(t * 17 + f.seed * 3) * 0.5;
        f.flame.scale.set(0.06 + n * 0.006, 0.12 + n * 0.02, 1);
        f.glow.material.opacity = f.base + n * 0.06;
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
