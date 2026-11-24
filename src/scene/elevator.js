// Los tres ascensores a los 99 pisos, adentro del salón: paredes de madera tallada entre los pasillos,
// con puertas metálicas lisas que se corren, el indicador de piso arriba ("Piso 1") y la botonera al
// costado. Detrás de cada uno está su cabina (con espejo, pasamanos, botonera y luz): la escena del
// viaje (main.js) mete a tu personaje adentro del que tengas más cerca, la cámara se queda en la cabina
// con las puertas cerradas y, al llegar, se abren en el piso nuevo.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ELEVATOR_POS, ELEVATOR_POSITIONS, LIFT_DEGS, LIFT_WIDTH, ROOM_WALL_H } from './world.js';
import { labelTexture, glowTexture, woodTexture } from './textures.js';
import { talaveraTexture, marigoldCluster } from './muertos.js';

export { ELEVATOR_POS, ELEVATOR_POSITIONS };

const W = LIFT_WIDTH + 0.06; // ancho de la pared del ascensor
const T = 0.4; // espesor de la pared (las puertas se esconden adentro)
const DW = 1.44; // hueco de la puerta
const DH = 2.36;
const CW = 1.9; // la cabina por dentro
const CD = 2.0;
const CH = 2.55;
const CZ0 = -T / 2; // la cabina empieza detrás de la pared
const CZ = CZ0 - CD / 2; // centro de la cabina

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// El indicador de piso: "PISO" chiquito, el número grande y la flechita si está viajando.
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
      g.fillStyle = '#1e0f06';
      rrect(g, 4, 4, 248, 120, 22);
      g.fill();
      g.strokeStyle = '#e0b55d';
      g.lineWidth = 6;
      g.stroke();
      g.fillStyle = '#ffd27a';
      g.shadowColor = '#ff9a2e';
      g.shadowBlur = 16;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '800 24px "DM Sans", Nunito, sans-serif';
      g.fillText('PISO', 150, 30);
      g.font = '900 70px "DM Sans", Nunito, sans-serif';
      g.fillText(String(n), 150, 80);
      g.font = '900 44px sans-serif';
      g.globalAlpha = dir ? 1 : 0.22;
      g.fillText(dir < 0 ? '▼' : '▲', 56, 66);
      g.globalAlpha = 1;
      t.needsUpdate = true;
    },
  };
}

// Acero cepillado de las puertas: vetas verticales finitas y una junta en el medio.
function steelTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 128, 0);
  bg.addColorStop(0, '#9aa0a8');
  bg.addColorStop(0.5, '#d4d8de');
  bg.addColorStop(1, '#a3a9b1');
  g.fillStyle = bg;
  g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '40,44,50'},${0.04 + Math.random() * 0.06})`;
    g.fillRect(Math.random() * 128, 0, 1, 256);
  }
  g.fillStyle = 'rgba(30,32,36,0.6)';
  g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// El espejo del fondo de la cabina: oscuro, con un par de brillos en diagonal (si no, parece una pantalla).
function mirrorTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 128, 64);
  bg.addColorStop(0, '#3a2c3e');
  bg.addColorStop(1, '#1e1622');
  g.fillStyle = bg;
  g.fillRect(0, 0, 128, 64);
  g.globalAlpha = 0.22;
  g.fillStyle = '#f3e2ff';
  for (const [x, w] of [[18, 16], [44, 6], [86, 10]]) {
    g.beginPath();
    g.moveTo(x, 64); g.lineTo(x + w, 64); g.lineTo(x + w + 30, 0); g.lineTo(x + 30, 0);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z).toNonIndexed();

export function createElevator(scene, colliders, rnd) {
  const woodTex = woodTexture('#5a3522');
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  const wood = new THREE.MeshLambertMaterial({ map: woodTex, emissive: '#ffffff', emissiveMap: woodTex, emissiveIntensity: 0.2 });
  const panelTex = woodTexture('#7a4a2c');
  const panelWood = new THREE.MeshLambertMaterial({ map: panelTex, emissive: '#ffffff', emissiveMap: panelTex, emissiveIntensity: 0.2 });
  const brass = new THREE.MeshStandardMaterial({ color: '#d9a748', roughness: 0.32, metalness: 0.85, emissive: '#5a3a00', emissiveIntensity: 0.7 });
  const steel = new THREE.MeshStandardMaterial({ map: steelTexture(), color: '#e4e7ec', metalness: 0.5, roughness: 0.3, emissive: '#33373d', emissiveIntensity: 0.55 });
  const outerMat = new THREE.MeshLambertMaterial({ color: '#c9663a', emissive: '#2a0e06' });
  const corniceMat = new THREE.MeshLambertMaterial({ color: '#b5482a', emissive: '#2a0e06' });
  const btnMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.5, 0.5) });
  const lampBoxMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.9, 0.8) });
  const potMat = new THREE.MeshLambertMaterial({ map: talaveraTexture() });
  const gold = new THREE.MeshLambertMaterial({ color: '#cfae78', emissive: '#3a240c', emissiveIntensity: 0.5 });
  const woodIn = new THREE.MeshLambertMaterial({ color: '#7a4a2c', emissive: '#2a1206' });
  const floorMat = new THREE.MeshLambertMaterial({ color: '#5a3420', emissive: '#1c0c04' });
  const mirrorMat = new THREE.MeshBasicMaterial({ map: mirrorTexture() });
  const lampInMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.3, 1.0) });
  const dotsMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.6, 0.6) });
  const signMat = new THREE.MeshBasicMaterial({
    map: labelTexture('Ascensor · 99 pisos', { w: 720, h: 144, font: '400 62px "Young Serif", Georgia, serif', bg: 'rgba(58,36,24,0.96)', fg: '#f6e3c4' }),
  });

  // Los tres ascensores comparten el indicador de piso.
  const display = floorDisplay();
  display.draw(1);
  const screenMat = new THREE.MeshBasicMaterial({ map: display.texture, transparent: true, toneMapped: false });

  const leafW = DW / 2 + 0.03;
  const doorGeo = new THREE.BoxGeometry(leafW, DH - 0.02, 0.04);

  function buildLift(pos, deg, liftIdx) {
    const g = new THREE.Group();
    g.position.copy(pos);
    // La puerta mira al centro del salón.
    g.rotation.y = THREE.MathUtils.degToRad(deg) + Math.PI;
    scene.add(g);
    g.updateMatrixWorld(true);
    const world = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
    // Choques: la pared entera (con la puerta) y la cabina por fuera.
    {
      const segs = [[-W / 2, T / 2, W / 2, T / 2], [-CW / 2 - 0.1, CZ0, -CW / 2 - 0.1, CZ0 - CD - 0.1], [CW / 2 + 0.1, CZ0, CW / 2 + 0.1, CZ0 - CD - 0.1], [-CW / 2 - 0.1, CZ0 - CD - 0.1, CW / 2 + 0.1, CZ0 - CD - 0.1]];
      for (const [x1, z1, x2, z2] of segs) {
        const a = world(x1, 0, z1);
        const b = world(x2, 0, z2);
        colliders.segments.push([a.x, a.z, b.x, b.z]);
      }
    }

    // ---------- la pared: dos hojas finas con un hueco en el medio donde se esconden las puertas ----------
    {
      const parts = [];
      const sideW = (W - DW) / 2;
      for (const z of [T / 2 - 0.05, -T / 2 + 0.05]) {
        parts.push(
          box(sideW, ROOM_WALL_H, 0.1, -(DW / 2 + sideW / 2), ROOM_WALL_H / 2, z),
          box(sideW, ROOM_WALL_H, 0.1, DW / 2 + sideW / 2, ROOM_WALL_H / 2, z),
          box(DW, ROOM_WALL_H - DH, 0.1, 0, DH + (ROOM_WALL_H - DH) / 2, z),
        );
      }
      // Tapas de los costados y el marco interior del hueco.
      parts.push(box(0.08, ROOM_WALL_H, T, -W / 2 + 0.04, ROOM_WALL_H / 2, 0), box(0.08, ROOM_WALL_H, T, W / 2 - 0.04, ROOM_WALL_H / 2, 0), box(DW, 0.08, T, 0, DH + 0.04, 0));
      const wall = new THREE.Mesh(mergeGeometries(parts), wood);
      wall.userData.kind = 'wall';
      g.add(wall);
      // Paneles tallados (en relieve) y la cornisa, del lado del salón.
      const pan = [];
      for (const s of [-1, 1]) {
        const cx = s * (DW / 2 + sideW / 2);
        pan.push(box(sideW - 0.3, 1.1, 0.03, cx, 0.75, T / 2 + 0.015), box(sideW - 0.3, 1.55, 0.03, cx, 2.35, T / 2 + 0.015), box(sideW - 0.3, 0.9, 0.03, cx, 3.75, T / 2 + 0.015));
      }
      g.add(new THREE.Mesh(mergeGeometries(pan), panelWood));
      g.add(new THREE.Mesh(box(W + 0.1, 0.2, T + 0.3, 0, ROOM_WALL_H, 0), corniceMat));
      // Revoque exterior sólo donde no está la cabina (para no tapar el hueco de la puerta).
      const outSideW = Math.max(0.05, (W - CW) / 2);
      g.add(new THREE.Mesh(mergeGeometries([
        box(outSideW, ROOM_WALL_H, 0.02, -(CW / 2 + outSideW / 2), ROOM_WALL_H / 2, -T / 2 - 0.011),
        box(outSideW, ROOM_WALL_H, 0.02, CW / 2 + outSideW / 2, ROOM_WALL_H / 2, -T / 2 - 0.011),
        box(CW, ROOM_WALL_H - CH, 0.02, 0, CH + (ROOM_WALL_H - CH) / 2, -T / 2 - 0.011),
        box(CW + 0.24, CH, 0.02, 0, CH / 2, CZ0 - CD - 0.09),
      ]), outerMat));
      // Marco de bronce alrededor de la puerta y el umbral.
      g.add(new THREE.Mesh(mergeGeometries([
        box(0.1, DH + 0.1, 0.06, -DW / 2 - 0.05, (DH + 0.1) / 2, T / 2 + 0.03),
        box(0.1, DH + 0.1, 0.06, DW / 2 + 0.05, (DH + 0.1) / 2, T / 2 + 0.03),
        box(DW + 0.2, 0.1, 0.06, 0, DH + 0.05, T / 2 + 0.03),
        box(DW, 0.02, T + 0.1, 0, 0.165, 0.05),
      ]), brass));
    }

    // ---------- las puertas ----------
    const doors = [-1, 1].map((s) => {
      const d = new THREE.Mesh(doorGeo, steel);
      d.position.set(s * leafW / 2, (DH - 0.02) / 2 + 0.16, 0);
      g.add(d);
      return d;
    });

    // ---------- indicador, cartel y botonera ----------
    const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.4, 0.04), brass);
    screenFrame.position.set(0, DH + 0.42, T / 2 + 0.03);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), screenMat);
    screen.position.set(0, DH + 0.42, T / 2 + 0.052);
    g.add(screenFrame, screen);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.34), signMat);
    sign.position.set(0, ROOM_WALL_H - 0.62, T / 2 + 0.02);
    g.add(sign);
    // Botonera de llamada: placa de bronce con ▲ y ▼ que se encienden.
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.03), brass);
    plate.position.set(DW / 2 + 0.36, 1.2, T / 2 + 0.015);
    const btns = [0.08, -0.08].map((dy) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 18).rotateX(Math.PI / 2), btnMat);
      b.position.set(DW / 2 + 0.36, 1.2 + dy, T / 2 + 0.04);
      return b;
    });
    const btnHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 }));
    btnHalo.scale.setScalar(0.5);
    btnHalo.position.set(DW / 2 + 0.36, 1.2, T / 2 + 0.08);
    g.add(plate, ...btns, btnHalo);

    // Faroles a los lados, guirnalda de cempasúchil sobre el indicador y macetas.
    const lamps = [];
    for (const s of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.16), lampBoxMat);
      lamp.position.set(s * 1.25, 2.55, T / 2 + 0.14);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.12, 4).rotateY(Math.PI / 4), brass);
      cap.position.set(s * 1.25, 2.74, T / 2 + 0.14);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.16), brass);
      arm.position.set(s * 1.25, 2.55, T / 2 + 0.06);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 }));
      gl.scale.setScalar(1.0);
      gl.position.copy(lamp.position);
      g.add(lamp, cap, arm, gl);
      lamps.push(gl);
    }
    {
      const pts = [];
      for (let i = 0; i <= 44; i++) {
        const x = -1.1 + (i / 44) * 2.2;
        const y = DH + 0.04 + 0.75 * (1 - (x / 1.1) * (x / 1.1));
        pts.push([x, y + (rnd() - 0.5) * 0.05, T / 2 + 0.12, 0.9 + rnd() * 0.5]);
      }
      for (const s of [-1, 1]) {
        for (let i = 0; i < 16; i++) pts.push([s * (1.42 + (rnd() - 0.5) * 0.24), 0.6 + rnd() * 0.32, T / 2 + 0.5 + (rnd() - 0.5) * 0.24, 0.9 + rnd() * 0.5]);
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.42, 14), potMat);
        pot.position.set(s * 1.42, 0.37, T / 2 + 0.5);
        g.add(pot);
        const p = world(s * 1.42, 0, T / 2 + 0.5);
        colliders.circles.push({ x: p.x, z: p.z, r: 0.3 });
      }
      g.add(marigoldCluster(pts, { r: 0.075, rnd }));
    }

    // ---------- la cabina ----------
    {
      const shell = new THREE.Mesh(mergeGeometries([
        box(CW + 0.2, 0.08, CD + 0.1, 0, CH + 0.04, CZ), // techo
        box(CW + 0.2, CH, 0.08, 0, CH / 2, CZ0 - CD - 0.04), // fondo
        box(0.08, CH, CD, -CW / 2 - 0.04, CH / 2, CZ), // costados
        box(0.08, CH, CD, CW / 2 + 0.04, CH / 2, CZ),
      ]), gold);
      const floor = new THREE.Mesh(box(CW + 0.2, 0.152, CD + 0.1, 0, 0.076, CZ), floorMat);
      floor.name = 'ground';
      // Paneles de madera a media altura y pasamanos de bronce.
      const panels = new THREE.Mesh(mergeGeometries([
        box(CW - 0.1, 1.0, 0.02, 0, 0.7, CZ0 - CD + 0.01),
        box(0.02, 1.0, CD - 0.3, -CW / 2 + 0.01, 0.7, CZ - 0.05),
        box(0.02, 1.0, CD - 0.3, CW / 2 - 0.01, 0.7, CZ - 0.05),
      ]), woodIn);
      const railGeo = [];
      for (const [len, x, z, ry] of [[CW - 0.4, 0, CZ0 - CD + 0.08, 0], [CD - 0.6, -CW / 2 + 0.08, CZ - 0.1, Math.PI / 2], [CD - 0.6, CW / 2 - 0.08, CZ - 0.1, Math.PI / 2]]) {
        railGeo.push(new THREE.CylinderGeometry(0.025, 0.025, len, 8).rotateZ(Math.PI / 2).rotateY(ry).translate(x, 1.08, z));
      }
      const rails = new THREE.Mesh(mergeGeometries(railGeo), brass);
      // Espejo a un costado (atrás va la cámara) y la lámpara del techo.
      const mirror = new THREE.Mesh(new THREE.PlaneGeometry(CD - 0.8, 0.9), mirrorMat);
      mirror.rotation.y = Math.PI / 2;
      mirror.position.set(-CW / 2 + 0.025, 1.75, CZ - 0.1);
      const lampIn = new THREE.Mesh(new THREE.PlaneGeometry(CW - 0.6, CD - 0.6).rotateX(Math.PI / 2), lampInMat);
      lampIn.position.set(0, CH - 0.01, CZ);
      // Botonera de adentro, a la derecha de la puerta, con botoncitos que brillan.
      const panelIn = new THREE.Mesh(box(0.02, 0.62, 0.26, CW / 2 - 0.02, 1.25, CZ0 - 0.34), brass);
      const dotGeo = [];
      for (let i = 0; i < 8; i++) dotGeo.push(new THREE.SphereGeometry(0.022, 8, 6).translate(CW / 2 - 0.035, 1.03 + (i % 4) * 0.13 + 0.03, CZ0 - 0.4 + Math.floor(i / 4) * 0.1));
      const dots = new THREE.Mesh(mergeGeometries(dotGeo), dotsMat);
      g.add(shell, floor, panels, rails, mirror, lampIn, panelIn, dots);
    }
    // El indicador también por dentro, arriba de la puerta.
    const screenIn = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), screenMat);
    screenIn.rotation.y = Math.PI;
    screenIn.position.set(0, DH + 0.06, CZ0 - 0.06);
    g.add(screenIn);
    // Luz cálida de la cabina (sale al salón cuando se abren las puertas).
    const light = new THREE.PointLight('#ffe2c2', 0, 4, 2);
    light.position.set(0, 2.1, CZ);
    g.add(light);

    // Área para tocar (más grande, para el celular).
    const hit = new THREE.Mesh(new THREE.BoxGeometry(W, 3.2, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 1.6, T / 2 + 0.4);
    hit.userData = { kind: 'elevator', liftIdx };
    g.add(hit);

    let open = 0;
    let openTarget = 0;
    let inside = false;
    const exitTurn = liftIdx === 0 ? 1.15 : -1.15;
    return {
      liftIdx,
      hit,
      exitTurn,
      get outHeading() { return g.rotation.y; },
      doorPoint(dist, side = 0) { const p = world(side, 0, T / 2 + dist); p.y = 0.16; return p; },
      cabPoint(z = 0, x = 0) { const p = world(x, 0, CZ + z); p.y = 0.16; return p; },
      shot(outPos, outLook, side = 0.95, drop = 0) {
        outPos.copy(world(side * 1.35, 1.9, T / 2 + 3.7));
        outLook.copy(world(0, 1.3 - drop, -0.2));
      },
      insideShot(outPos, outLook, drop = 0) {
        outPos.copy(world(0.42, 2.08, CZ0 - CD + 0.18));
        outLook.copy(world(-0.08, 1.55 - drop, CZ0 + 0.3));
      },
      setInside(v) { inside = v; },
      get open() { return open; },
      standPoint() {
        return { stand: world(0, 1.9, T / 2 + 4.2), target: world(0, 1.5, 0) };
      },
      setOpen(v) { openTarget = v ? 1 : 0; },
      animate(t, dt) {
        open += (openTarget - open) * Math.min(1, dt * 3.2);
        const e = open < 0.002 ? 0 : open;
        doors[0].position.x = -leafW / 2 - e * (leafW - 0.04);
        doors[1].position.x = leafW / 2 + e * (leafW - 0.04);
        light.intensity = inside ? 0.95 : e * 2.5;
        const pulse = 0.55 + Math.sin(t * 3.5) * 0.2;
        btnHalo.material.opacity = pulse;
        for (const l of lamps) l.material.opacity = 0.5 + Math.sin(t * 2.3 + l.position.x) * 0.06;
      },
    };
  }

  const lifts = LIFT_DEGS.map((deg, i) => buildLift(ELEVATOR_POSITIONS[i], deg, i));
  let active = lifts[0];

  return {
    lifts,
    hit: lifts[0].hit,
    hits: lifts.map((l) => l.hit),
    useIndex(i) {
      if (typeof i === 'number' && lifts[i]) active = lifts[i];
      return active;
    },
    useNearest(pos) {
      let best = lifts[0];
      let bestD = Infinity;
      for (const l of lifts) {
        const dp = l.doorPoint(1.2);
        const d = Math.hypot(pos.x - dp.x, pos.z - dp.z);
        if (d < bestD) { bestD = d; best = l; }
      }
      active = best;
      return active;
    },
    nearestDist(pos) {
      let bestD = Infinity;
      for (const l of lifts) {
        const dp = l.doorPoint(1.2);
        const d = Math.hypot(pos.x - dp.x, pos.z - dp.z);
        if (d < bestD) bestD = d;
      }
      return bestD;
    },
    get outHeading() { return active.outHeading; },
    get exitTurn() { return active.exitTurn; },
    doorPoint(dist, side = 0) { return active.doorPoint(dist, side); },
    cabPoint(z = 0, x = 0) { return active.cabPoint(z, x); },
    shot(outPos, outLook, side = 0.95, drop = 0) { return active.shot(outPos, outLook, side, drop); },
    insideShot(outPos, outLook, drop = 0) { return active.insideShot(outPos, outLook, drop); },
    setInside(v) { active.setInside(v); },
    showFloor(n, dir = 0) { display.draw(n, dir); },
    get open() { return active.open; },
    standPoint() { return active.standPoint(); },
    setOpen(v) { active.setOpen(v); },
    setFloor(n) { display.draw(n + 1, 0); },
    animate(t, dt) {
      for (const l of lifts) l.animate(t, dt);
    },
  };
}
