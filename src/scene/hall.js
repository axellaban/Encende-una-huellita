// El muro de las huellitas: paneles en semicírculo con marcos, velas y flores.
import * as THREE from 'three';
import { HALL_CENTER, HALL_RADIUS } from './world.js';
import { emptySlotTexture, portraitTexture, photoTexture, labelTexture, flameTexture, glowTexture, woodTexture } from './textures.js';

export const PANELS = 10;
export const PER_PANEL = 9; // 3 x 3
export const SLOTS_PER_FLOOR = PANELS * PER_PANEL;

const FRAME_W = 0.8;
const FRAME_H = 1.0;
const COL_X = [-1.45, 0, 1.45];
const ROW_Y = [3.05, 1.95, 0.85];

export function candleLevel(n) {
  return n >= 12 ? 3 : n >= 5 ? 2 : n >= 1 ? 1 : 0;
}

export function buildHall(scene, colliders) {
  const panelMat = new THREE.MeshStandardMaterial({ map: woodTexture('#4a3022'), roughness: 0.85 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#d9c3a0', roughness: 0.6 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#d8a64a', roughness: 0.3, metalness: 0.7, emissive: '#5a3a00', emissiveIntensity: 0.4 });
  const ledgeMat = new THREE.MeshStandardMaterial({ color: '#c8b39a', roughness: 0.7 });
  const waxMat = new THREE.MeshStandardMaterial({ color: '#fff3e0', roughness: 0.6, emissive: '#6b4a20', emissiveIntensity: 0.3 });
  const flowerMats = ['#f4a6b8', '#f7d774', '#b9a3f0', '#ffffff', '#f7b58a'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));

  const slots = []; // por índice local 0..89
  const flames = [];
  const panelLabels = [];

  for (let p = 0; p < PANELS; p++) {
    // Ángulos de 40° a 320° (la entrada queda al sur, mirando al camino).
    const a = THREE.MathUtils.degToRad(40 + p * (280 / (PANELS - 1)));
    const panel = new THREE.Group();
    panel.position.set(HALL_CENTER.x + Math.sin(a) * HALL_RADIUS, 0, HALL_CENTER.z + Math.cos(a) * HALL_RADIUS);
    panel.lookAt(HALL_CENTER.x, 0, HALL_CENTER.z);
    scene.add(panel);

    const board = new THREE.Mesh(new THREE.BoxGeometry(4.7, 3.9, 0.22), panelMat);
    board.position.set(0, 2.05, -0.12);
    panel.add(board);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.16, 0.6), panelMat);
    roof.position.set(0, 4.05, 0.05);
    panel.add(roof);

    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.3), new THREE.MeshBasicMaterial({ transparent: true }));
    label.position.set(0, 4.35, 0.02);
    panel.add(label);
    panelLabels.push(label);

    // Colisión: el panel como segmento en el piso.
    panel.updateMatrixWorld();
    const l = new THREE.Vector3(-2.4, 0, 0).applyMatrix4(panel.matrixWorld);
    const rgt = new THREE.Vector3(2.4, 0, 0).applyMatrix4(panel.matrixWorld);
    colliders.segments.push([l.x, l.z, rgt.x, rgt.z]);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const local = p * PER_PANEL + row * 3 + col;
        const g = new THREE.Group();
        g.position.set(COL_X[col], ROW_Y[row], 0.02);
        panel.add(g);

        const border = new THREE.Mesh(new THREE.BoxGeometry(FRAME_W + 0.12, FRAME_H + 0.12, 0.06), frameMat);
        border.position.z = 0.01;
        const photo = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W, FRAME_H), new THREE.MeshBasicMaterial({ map: emptySlotTexture(), transparent: true, toneMapped: false }));
        photo.position.z = 0.05;
        const name = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.15), new THREE.MeshBasicMaterial({ transparent: true }));
        name.position.set(0, -FRAME_H / 2 - 0.13, 0.05);
        name.visible = false;

        // Repisa con velas y flores.
        const shelf = new THREE.Group();
        shelf.position.set(0, -FRAME_H / 2 - 0.27, 0.12);
        const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.04, 0.2), ledgeMat);
        shelf.add(ledge);
        const candles = [];
        for (let i = 0; i < 3; i++) {
          const c = new THREE.Group();
          const h = 0.1 + i * 0.03;
          const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 10), waxMat);
          wax.position.y = h / 2 + 0.02;
          const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
          flame.scale.set(0.06, 0.12, 1);
          flame.position.y = h + 0.08;
          const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5, toneMapped: false }));
          glow.scale.setScalar(0.35);
          glow.position.y = h + 0.06;
          c.add(wax, flame, glow);
          c.position.x = [-0.3, 0.3, 0.2][i];
          c.position.z = [0, 0, -0.05][i];
          c.visible = false;
          shelf.add(c);
          candles.push(c);
          flames.push({ flame, glow, seed: Math.random() * 100, group: c });
        }
        const flowers = [];
        for (let i = 0; i < 4; i++) {
          const f = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035, 0), flowerMats[(local + i) % flowerMats.length]);
          f.position.set(-0.12 + i * 0.08, 0.05, 0.03 * (i % 2));
          f.visible = false;
          shelf.add(f);
          flowers.push(f);
        }
        shelf.visible = false;

        g.add(border, photo, name, shelf);
        photo.userData = { kind: 'slot', local };
        slots.push({ group: g, border, photo, name, shelf, candles, flowers, memorial: null, textures: [] });
      }
    }
  }

  let floor = 0;
  let labelFloor = -1;
  const byId = new Map();
  let hovered = null;

  function clearSlot(s) {
    s.textures.forEach((t) => t.dispose());
    s.textures = [];
    s.memorial = null;
    s.photo.material.map = emptySlotTexture();
    s.photo.material.opacity = 0.9;
    s.photo.material.needsUpdate = true;
    s.border.material = frameMat;
    s.name.visible = false;
    s.shelf.visible = false;
  }

  function fillSlot(s, m) {
    const prev = s.memorial;
    const same = prev && prev.id === m.id && prev.photo === m.photo;
    if (!same) {
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
    s.border.material = m.candles >= 20 ? goldMat : frameMat;
    s.shelf.visible = true;
    const lvl = candleLevel(m.candles);
    s.candles.forEach((c, i) => { c.visible = i < lvl; });
    const fl = Math.min(4, Math.ceil(m.flowers / 2));
    s.flowers.forEach((f, i) => { f.visible = i < fl; });
  }

  function render(memorials) {
    byId.clear();
    const here = new Map();
    for (const m of memorials) {
      byId.set(m.id, m);
      if (Math.floor(m.slot / SLOTS_PER_FLOOR) === floor) here.set(m.slot % SLOTS_PER_FLOOR, m);
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

  return {
    slots,
    get floor() { return floor; },
    setFloor(n, memorials) {
      floor = n;
      render(memorials);
    },
    render,
    pickables() {
      return slots.map((s) => s.photo);
    },
    // Dónde pararse para mirar un lugar del muro.
    // `shift` corre la vista hacia un costado para que el marco no quede tapado por la ficha.
    viewpoint(local, shift = 0) {
      const s = slots[local];
      const target = new THREE.Vector3();
      s.photo.getWorldPosition(target);
      const normal = new THREE.Vector3(0, 0, 1).transformDirection(s.photo.matrixWorld);
      const right = new THREE.Vector3(1, 0, 0).transformDirection(s.photo.matrixWorld);
      target.addScaledVector(right, shift);
      // Las filas altas se miran desde más lejos para no torcer la perspectiva.
      const stand = target.clone().addScaledVector(normal, 3.1 + Math.max(0, target.y - 1.6) * 0.9);
      stand.y = 1.6;
      target.y = (target.y + 1.6) / 2 + 0.15; // mirar un poco hacia el marco, sin torcer el cuello
      return { stand, target };
    },
    setHover(local) {
      if (hovered !== null && hovered !== local) slots[hovered].group.scale.setScalar(1);
      hovered = local;
      if (local !== null) slots[local].group.scale.setScalar(1.06);
    },
    pulse(local) {
      const g = slots[local]?.group;
      if (!g) return;
      const start = performance.now();
      const tick = () => {
        const k = (performance.now() - start) / 600;
        g.scale.setScalar(1 + Math.sin(Math.min(k, 1) * Math.PI) * 0.12);
        if (k < 1) requestAnimationFrame(tick);
      };
      tick();
    },
    animate(t) {
      for (const f of flames) {
        if (!f.group.visible) continue;
        const n = Math.sin(t * 9 + f.seed) * 0.5 + Math.sin(t * 17 + f.seed * 3) * 0.5;
        f.flame.scale.set(0.06 + n * 0.006, 0.12 + n * 0.02, 1);
        f.glow.material.opacity = 0.42 + n * 0.08;
      }
    },
  };
}
