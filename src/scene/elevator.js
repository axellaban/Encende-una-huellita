// El ascensor a los 99 pisos: una torre de vidrio con armazón de bronce, cúpula de talavera y una
// cabina dorada que sube y baja por adentro (se la ve viajar hacia el cielo). Tiene puertas que se
// abren, un indicador luminoso con el número de piso, papel picado, cempasúchil y luces.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ELEVATOR_POS } from './world.js';
import { labelTexture, glowTexture, twoSided } from './textures.js';
import { paintedWallTexture, talaveraTexture, marigoldCluster, picadoBanner } from './muertos.js';

export { ELEVATOR_POS };
export const ELEVATOR_SCALE = 1.5;

const W = 2.6; // ancho de la torre
const D = 2.2; // fondo
const H = 3.1; // alto de la planta baja (donde está la puerta)
const TOWER = 13; // alto del vidrio por donde viaja la cabina

// Número de piso en un cartelito luminoso (canvas que se redibuja).
function floorDisplay() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  let last = null;
  return {
    texture: t,
    draw(n, dir = 0) {
      const key = `${n}:${dir}`;
      if (key === last) return;
      last = key;
      g.clearRect(0, 0, 256, 128);
      g.fillStyle = '#2a1408';
      g.beginPath();
      g.roundRect(4, 4, 248, 120, 26);
      g.fill();
      g.strokeStyle = '#e0b55d';
      g.lineWidth = 7;
      g.stroke();
      g.fillStyle = '#ffd27a';
      g.shadowColor = '#ff9a2e';
      g.shadowBlur = 18;
      g.font = '900 78px "DM Sans", Nunito, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(n), dir ? 150 : 128, 68);
      if (dir) {
        g.font = '900 44px sans-serif';
        g.fillText(dir > 0 ? '▲' : '▼', 56, 66);
      }
      t.needsUpdate = true;
    },
  };
}

export function createElevator(scene, colliders, rnd) {
  const g = new THREE.Group();
  g.position.copy(ELEVATOR_POS);
  // De frente a quien entra al jardín por el camino.
  g.rotation.y = Math.atan2(0 - ELEVATOR_POS.x, 6);
  g.scale.setScalar(ELEVATOR_SCALE);
  scene.add(g);
  colliders.circles.push({ x: ELEVATOR_POS.x, z: ELEVATOR_POS.z, r: 1.55 * ELEVATOR_SCALE });

  const wall = new THREE.MeshLambertMaterial({ map: paintedWallTexture('#159aa0') });
  const rosa = new THREE.MeshLambertMaterial({ map: paintedWallTexture('#c2186b') });
  const brass = new THREE.MeshStandardMaterial({ color: '#d9a748', roughness: 0.32, metalness: 0.85, emissive: '#5a3a00', emissiveIntensity: 0.7 });
  const tile = talaveraTexture().clone();
  tile.repeat.set(3, 1);
  tile.needsUpdate = true;
  const tileMat = new THREE.MeshLambertMaterial({ map: tile });
  const roofMat = new THREE.MeshLambertMaterial({ color: '#b5482a' });

  // ---------- planta baja ----------
  const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.3, D + 0.5), new THREE.MeshLambertMaterial({ color: '#8b7d72' }));
  base.position.y = 0.15;
  const steps = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.15, 0.6), new THREE.MeshLambertMaterial({ color: '#a69689' }));
  steps.position.set(0, 0.075, D / 2 + 0.5);
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wall);
  body.position.y = 0.3 + H / 2;
  const frieze = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.34, D + 0.04), tileMat);
  frieze.position.y = 0.3 + 0.17;
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(W + 0.36, 0.2, D + 0.36), roofMat);
  cornice.position.y = 0.3 + H + 0.1;
  g.add(base, steps, body, frieze, cornice);

  // Columnas de bronce en las esquinas, de arriba a abajo.
  const colParts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c = new THREE.CylinderGeometry(0.09, 0.11, H + TOWER + 0.6, 10);
    c.translate(sx * (W / 2 + 0.02), 0.3 + (H + TOWER + 0.6) / 2, sz * (D / 2 + 0.02));
    colParts.push(c);
  }
  // Aros de bronce cada tanto a lo largo de la torre.
  for (let y = H + 1.5; y < H + TOWER; y += 2.6) {
    for (const [w, d, x, z] of [[W + 0.1, 0.07, 0, D / 2], [W + 0.1, 0.07, 0, -D / 2], [0.07, D + 0.1, W / 2, 0], [0.07, D + 0.1, -W / 2, 0]]) {
      const b = new THREE.BoxGeometry(w, 0.09, d);
      b.translate(x, 0.3 + y, z);
      colParts.push(b);
    }
  }
  g.add(new THREE.Mesh(mergeGeometries(colParts.map((x) => x.toNonIndexed())), brass));

  // ---------- la torre de vidrio ----------
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.06, TOWER, D - 0.06),
    new THREE.MeshPhysicalMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, transmission: 0, depthWrite: false, side: THREE.DoubleSide, emissive: '#5aa7d0', emissiveIntensity: 0.12 }),
  );
  glass.position.y = 0.3 + H + TOWER / 2;
  glass.renderOrder = 3;
  g.add(glass);
  // Rieles de luz por donde sube la cabina.
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, TOWER, 0.04), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.8) }));
  for (const s of [-1, 1]) {
    const r = rail.clone();
    r.position.set(s * (W / 2 - 0.25), 0.3 + H + TOWER / 2, -D / 2 + 0.2);
    g.add(r);
  }

  // ---------- la cabina dorada ----------
  const cab = new THREE.Group();
  const cabW = W - 0.5;
  const cabH = 2.2;
  const cabD = D - 0.5;
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(cabW, cabH, cabD), new THREE.MeshStandardMaterial({ color: '#e6bd6a', roughness: 0.35, metalness: 0.6, emissive: '#7a4a10', emissiveIntensity: 0.55, transparent: true, opacity: 0.92 }));
  cabBody.position.y = cabH / 2;
  const cabTop = new THREE.Mesh(new THREE.CylinderGeometry(0.1, cabW * 0.62, 0.55, 4).rotateY(Math.PI / 4), brass);
  cabTop.position.y = cabH + 0.27;
  const cabLight = new THREE.Mesh(new THREE.BoxGeometry(cabW - 0.2, cabH - 0.3, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.9) }));
  cabLight.position.set(0, cabH / 2, cabD / 2 + 0.012);
  const cabGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(1.0, 0.75, 0.4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 }));
  cabGlow.scale.setScalar(4.2);
  cabGlow.position.y = cabH / 2;
  cab.add(cabBody, cabTop, cabLight, cabGlow);
  cab.position.y = 0.3 + 0.05;
  g.add(cab);
  const CAB_MIN = 0.35;
  const CAB_MAX = 0.3 + H + TOWER - cabH - 0.8;

  // ---------- cúpula de talavera y faro ----------
  const topY = 0.3 + H + TOWER;
  const ring = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.35, D + 0.5), rosa);
  ring.position.y = topY + 0.17;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(W * 0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ map: (() => { const t = talaveraTexture().clone(); t.repeat.set(6, 2); t.needsUpdate = true; return t; })() }));
  dome.scale.y = 0.9;
  dome.position.y = topY + 0.35;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.0, 8), brass);
  spire.position.y = topY + 0.35 + W * 0.56 + 0.5;
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.3, 1.2) }));
  beacon.position.y = spire.position.y + 0.7;
  const beaconGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.85, color: new THREE.Color(1, 0.8, 0.5) }));
  beaconGlow.scale.setScalar(3.4);
  beaconGlow.position.copy(beacon.position);
  g.add(ring, dome, spire, beacon, beaconGlow);

  // ---------- frente: arco, puertas, indicador, botonera ----------
  const front = D / 2 + 0.006;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.12, 8, 28, Math.PI), brass);
  arch.position.set(0, 0.3 + 2.25, front + 0.03);
  const doorFrame = [];
  for (const s of [-1, 1]) {
    const side = new THREE.BoxGeometry(0.2, 2.25, 0.12);
    side.translate(s * 0.92, 0.3 + 1.125, front + 0.03);
    doorFrame.push(side);
  }
  g.add(arch, new THREE.Mesh(mergeGeometries(doorFrame), brass));
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(1.64, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.25, 0.7) }));
  inside.position.set(0, 0.3 + 1.1, front - 0.05);
  g.add(inside);
  const doorGeo = new THREE.BoxGeometry(0.82, 2.2, 0.05);
  const doors = [-1, 1].map((s) => {
    const d = new THREE.Mesh(doorGeo, brass);
    d.position.set(s * 0.41, 0.3 + 1.1, front + 0.02);
    g.add(d);
    // Calaverita y flor grabadas en cada hoja.
    const deco = new THREE.Mesh(new THREE.CircleGeometry(0.16, 6), new THREE.MeshBasicMaterial({ color: '#7a4a10' }));
    deco.position.set(-s * 0.1, 0.35, 0.03);
    const deco2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.04), deco.material);
    deco2.position.set(0, -0.35, 0.03);
    d.add(deco, deco2);
    return d;
  });

  const display = floorDisplay();
  display.draw(1);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.43), new THREE.MeshBasicMaterial({ map: display.texture, transparent: true, toneMapped: false }));
  screen.position.set(0, 0.3 + H - 0.38, front + 0.03);
  g.add(screen);

  // Cartel colgado arriba.
  const sign = twoSided(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({
    map: labelTexture('🛗 Ascensor al cielo · 99 pisos', { w: 900, h: 180, font: '700 74px Caveat, cursive', bg: 'rgba(74,48,34,0.95)', fg: '#f6e3c4' }),
  }));
  sign.position.set(0, 0.3 + H + 0.55, D / 2 + 0.25);
  g.add(sign);

  // Botonera con luz.
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.8, 1.4, 0.4) }));
  button.position.set(1.15, 0.3 + 1.3, front + 0.05);
  const plate = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), brass);
  plate.position.set(1.15, 0.3 + 1.3, front + 0.01);
  const btnHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7 }));
  btnHalo.scale.setScalar(0.55);
  btnHalo.position.copy(button.position);
  g.add(plate, button, btnHalo);

  // Faroles a los lados de la puerta.
  for (const s of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.9, 0.8) }));
    lamp.position.set(s * 1.55, 0.3 + 2.1, D / 2 + 0.15);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 }));
    gl.scale.setScalar(1.1);
    gl.position.copy(lamp.position);
    g.add(lamp, gl);
  }

  // Guirnalda de cempasúchil sobre el arco y macetas a los lados.
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = Math.PI * t;
    pts.push([-Math.cos(a) * 1.05, 0.3 + 2.25 + Math.sin(a) * 1.05 + (rnd() - 0.5) * 0.06, front + 0.16, 0.9 + rnd() * 0.5]);
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < 18; i++) pts.push([s * (1.45 + (rnd() - 0.5) * 0.3), 0.55 + rnd() * 0.5, D / 2 + 0.55 + (rnd() - 0.5) * 0.3, 0.9 + rnd() * 0.5]);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.45, 14), new THREE.MeshLambertMaterial({ map: talaveraTexture() }));
    pot.position.set(s * 1.45, 0.3 + 0.22, D / 2 + 0.55);
    g.add(pot);
  }
  g.add(marigoldCluster(pts, { r: 0.08, rnd }));

  // Papel picado desde la cúpula hasta el suelo, a los costados.
  const banners = [];
  for (const s of [-1, 1]) {
    const b = picadoBanner(new THREE.Vector3(s * (W / 2 + 0.02), topY, D / 2 + 0.02), new THREE.Vector3(s * 3.4, 0.3 + H + 0.3, D / 2 + 1.6), { sag: 0.5, flags: 9, size: 0.32, seed: 20 + s });
    g.add(b);
    banners.push(b);
  }

  // Luz cálida que sale de la cabina cuando se abren las puertas.
  const light = new THREE.PointLight('#ffb36b', 0, 7, 1.6);
  light.position.set(0, 0.3 + 1.3, D / 2 + 0.8);
  g.add(light);

  // Área para tocar (más grande, para el celular).
  const hit = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, H + TOWER, D + 1.2), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = (H + TOWER) / 2;
  hit.userData = { kind: 'elevator' };
  g.add(hit);

  let open = 0;
  let openTarget = 0;
  let floor = 0;
  let cabY = CAB_MIN;
  let cabTarget = CAB_MIN;
  let travelDir = 0;
  return {
    hit,
    standPoint() {
      const frontPt = new THREE.Vector3(0, 0, (D / 2 + 3.4) * ELEVATOR_SCALE).applyQuaternion(g.quaternion).add(g.position);
      frontPt.y = 2.4;
      return { stand: frontPt, target: new THREE.Vector3(g.position.x, 1.9 * ELEVATOR_SCALE, g.position.z) };
    },
    setOpen(v) { openTarget = v ? 1 : 0; },
    setFloor(n) {
      travelDir = Math.sign(n - floor);
      floor = n;
      // La cabina sube por la torre (piso 1 abajo, piso 99 arriba de todo).
      cabTarget = CAB_MIN + (CAB_MAX - CAB_MIN) * Math.min(1, n / 98);
      display.draw(n + 1, travelDir);
    },
    animate(t, dt) {
      open += (openTarget - open) * Math.min(1, dt * 3);
      doors[0].position.x = -0.41 - open * 0.8;
      doors[1].position.x = 0.41 + open * 0.8;
      light.intensity = open * 5;
      const prev = cabY;
      cabY += (cabTarget - cabY) * Math.min(1, dt * 1.6);
      cab.position.y = cabY;
      if (Math.abs(cabTarget - cabY) < 0.01 && travelDir) { travelDir = 0; display.draw(floor + 1, 0); }
      cabGlow.material.opacity = 0.65 + Math.abs(cabY - prev) * 20;
      const pulse = 0.65 + Math.sin(t * 3.5) * 0.25;
      btnHalo.material.opacity = pulse;
      beaconGlow.material.opacity = 0.6 + Math.sin(t * 1.8) * 0.25;
      beacon.rotation.y = t * 0.8;
      banners.forEach((b) => b.userData.flutter?.(t));
    },
  };
}
