// El personaje de cada visitante (vos y los demás): cabezón, cara de calaverita pintada, sarape de
// colores, sombrero o corona de cempasúchil, y un farolito en la mano. Camina, mira, saluda y tira
// la pelota. Hecho con formas simples, sin modelos externos.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { calaveraTexture, marigoldGeometry, marigoldMaterial } from './muertos.js';
import { glowTexture, lanternTexture } from './textures.js';

const serapeCache = new Map();
function serapeTexture(hue) {
  const k = Math.round(hue / 20) * 20;
  if (serapeCache.has(k)) return serapeCache.get(k);
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  const base = `hsl(${k} 55% 46%)`;
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 128);
  const bands = [[`hsl(${(k + 180) % 360} 60% 55%)`, 6], ['#fbefd9', 3], [`hsl(${(k + 40) % 360} 80% 58%)`, 5], ['#2a1b2e', 2], [`hsl(${(k + 300) % 360} 60% 52%)`, 4]];
  let y = 54;
  for (const [col, h] of bands) { g.fillStyle = col; g.fillRect(0, y, 64, h); y += h + 2; }
  // Grecas en zigzag.
  g.strokeStyle = '#fbefd9';
  g.lineWidth = 2;
  g.beginPath();
  for (let x = 0; x <= 64; x += 8) g.lineTo(x, x % 16 ? 100 : 106);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  serapeCache.set(k, t);
  return t;
}

const shared = {};
function sharedGeo() {
  if (shared.leg) return shared;
  shared.leg = new THREE.CapsuleGeometry(0.065, 0.26, 4, 8).translate(0, -0.18, 0);
  shared.shoe = new THREE.SphereGeometry(0.075, 10, 8).scale(1, 0.55, 1.5).translate(0, -0.36, 0.035);
  shared.torso = new THREE.CylinderGeometry(0.19, 0.27, 0.48, 16, 1);
  shared.arm = new THREE.CapsuleGeometry(0.052, 0.26, 4, 8).translate(0, -0.17, 0);
  shared.hand = new THREE.SphereGeometry(0.058, 10, 8).translate(0, -0.35, 0);
  shared.head = new THREE.SphereGeometry(0.235, 24, 18);
  shared.face = new THREE.SphereGeometry(0.237, 24, 16, Math.PI / 2 - 1.15, 2.3, 0.62, 1.42);
  shared.neck = new THREE.CylinderGeometry(0.07, 0.08, 0.08, 10);
  // Pelo: todo menos la cara pintada (atrás, arriba y una línea en la frente).
  shared.hairBack = new THREE.SphereGeometry(0.246, 24, 16, Math.PI / 2 + 1.12, Math.PI * 2 - 2.24, 0, 2.15);
  shared.hairTop = new THREE.SphereGeometry(0.246, 24, 8, Math.PI / 2 - 1.2, 2.4, 0, 0.66);
  shared.brim = new THREE.CylinderGeometry(0.4, 0.4, 0.025, 28);
  shared.crown = new THREE.CylinderGeometry(0.15, 0.19, 0.2, 18);
  shared.band = new THREE.CylinderGeometry(0.192, 0.192, 0.04, 18);
  shared.flower = marigoldGeometry(0.06, '#ff9a1f');
  shared.lantern = new THREE.CylinderGeometry(0.06, 0.05, 0.13, 8);
  // Párpados (tapan los ojos pintados al parpadear) y cachetes.
  shared.lid = new THREE.SphereGeometry(0.046, 14, 10).scale(1, 1, 0.45);
  shared.cheek = new THREE.CircleGeometry(0.036, 16);
  // Flecos del sarape: tiritas alrededor del borde de abajo.
  {
    const parts = [];
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2;
      const b = new THREE.BoxGeometry(0.014, 0.07, 0.006);
      b.translate(0, -0.035, 0);
      b.rotateY(-a);
      b.translate(Math.sin(a) * 0.272, 0, Math.cos(a) * 0.272);
      parts.push(b);
    }
    shared.fringe = mergeGeometries(parts);
  }
  // Rebozo: un chal que cae sobre los hombros (una franja curva).
  shared.rebozo = new THREE.TorusGeometry(0.2, 0.045, 8, 24, Math.PI * 1.25).rotateX(Math.PI / 2).rotateY(Math.PI * 0.375).scale(1.1, 1, 0.95);
  return shared;
}

export function createCharacter({ hue = 30, hat = null, light = false } = {}) {
  const G = sharedGeo();
  const skin = new THREE.MeshLambertMaterial({ color: '#fbf1e2', emissive: '#4a3434', emissiveIntensity: 0.55 });
  const clothes = new THREE.MeshLambertMaterial({ map: serapeTexture(hue), emissive: new THREE.Color().setHSL(hue / 360, 0.5, 0.12) });
  const pants = new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(((hue + 200) % 360) / 360, 0.25, 0.22), emissive: '#140c18' });
  const shoeMat = new THREE.MeshLambertMaterial({ color: '#5a3522', emissive: '#1a0d08' });
  const g = new THREE.Group();
  const body = new THREE.Group(); // todo lo que se mueve con el paso
  g.add(body);

  const hips = new THREE.Group();
  hips.position.y = 0.46;
  body.add(hips);
  const legs = [-1, 1].map((sd) => {
    const leg = new THREE.Group();
    leg.position.set(sd * 0.09, 0, 0);
    leg.add(new THREE.Mesh(G.leg, pants), new THREE.Mesh(G.shoe, shoeMat));
    hips.add(leg);
    return leg;
  });
  const torso = new THREE.Group();
  torso.position.y = 0.0;
  hips.add(torso);
  const tor = new THREE.Mesh(G.torso, clothes);
  tor.position.y = 0.23;
  torso.add(tor);
  const arms = [-1, 1].map((sd) => {
    const arm = new THREE.Group();
    arm.position.set(sd * 0.22, 0.42, 0);
    arm.rotation.z = sd * 0.12;
    arm.add(new THREE.Mesh(G.arm, clothes), new THREE.Mesh(G.hand, skin));
    torso.add(arm);
    return arm;
  });
  const neck = new THREE.Mesh(G.neck, skin);
  neck.position.y = 0.5;
  torso.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.72;
  torso.add(head);
  head.add(new THREE.Mesh(G.head, skin));
  const face = new THREE.Mesh(G.face, new THREE.MeshLambertMaterial({ map: calaveraTexture(hue), emissive: '#3a2a2a', emissiveIntensity: 0.6, transparent: false }));
  head.add(face);
  const hairMat = new THREE.MeshLambertMaterial({ color: ['#2a1a14', '#3b2418', '#1c1418', '#5a3a22'][Math.round(hue) % 4], emissive: '#0e0806' });
  head.add(new THREE.Mesh(G.hairBack, hairMat), new THREE.Mesh(G.hairTop, hairMat));
  const useHat = hat ?? Math.round(hue) % 2 === 1;
  if (useHat) {
    const hatMat = new THREE.MeshLambertMaterial({ color: '#2a1d2e', emissive: '#120a14' });
    const bandMat = new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(((hue + 150) % 360) / 360, 0.75, 0.5), emissive: '#3a0a1a' });
    const brim = new THREE.Mesh(G.brim, hatMat);
    brim.position.y = 0.17;
    const crown = new THREE.Mesh(G.crown, hatMat);
    crown.position.y = 0.28;
    const band = new THREE.Mesh(G.band, bandMat);
    band.position.y = 0.205;
    const fl = new THREE.Mesh(G.flower, marigoldMaterial());
    fl.position.set(0.17, 0.23, 0.05);
    head.add(brim, crown, band, fl);
  } else {
    const fm = marigoldMaterial();
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Mesh(G.flower, fm);
      const a = (i / 9) * Math.PI * 2;
      f.position.set(Math.cos(a) * 0.2, 0.15 + Math.sin(a * 3) * 0.01, Math.sin(a) * 0.2);
      f.rotation.set(-0.5 * Math.sin(a), 0, 0.5 * Math.cos(a));
      head.add(f);
    }
  }
  // Farolito en la mano izquierda: ilumina un poquito y hace que se te vea de noche.
  const lantern = new THREE.Group();
  lantern.position.set(0, -0.38, 0.06);
  const lb = new THREE.Mesh(G.lantern, new THREE.MeshBasicMaterial({ map: lanternTexture(), color: new THREE.Color(2.0, 1.45, 0.9) }));
  lb.position.y = -0.1;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, color: new THREE.Color(1, 0.75, 0.45) }));
  halo.scale.setScalar(0.7);
  halo.position.y = -0.1;
  lantern.add(lb, halo);
  arms[1].add(lantern);
  if (light) {
    const l = new THREE.PointLight('#ffb36b', 2.2, 6, 1.8);
    l.position.y = -0.1;
    lantern.add(l);
  }
  // Ojos que parpadean: párpados del color de la cara pintada, encima de los ojos del dibujo.
  const lidMat = new THREE.MeshLambertMaterial({ color: '#fbf3e6', emissive: '#4a3a34', emissiveIntensity: 0.5 });
  const lids = [-1, 1].map((sd) => {
    const l = new THREE.Mesh(G.lid, lidMat);
    l.position.set(sd * 0.079, 0.08, 0.214);
    l.lookAt(sd * 0.079 * 3, 0.08 * 3, 0.214 * 3);
    l.scale.y = 0.01;
    l.visible = false;
    head.add(l);
    return l;
  });
  // Cachetes rosados.
  const cheekMat = new THREE.MeshBasicMaterial({ color: '#ff7aa8', transparent: true, opacity: 0.32, depthWrite: false });
  for (const sd of [-1, 1]) {
    const c = new THREE.Mesh(G.cheek, cheekMat);
    c.position.set(sd * 0.13, -0.005, 0.2);
    c.lookAt(sd * 0.13 * 3, -0.015, 0.6);
    head.add(c);
  }
  // Flecos del sarape y, en algunos, un rebozo sobre los hombros.
  const fringe = new THREE.Mesh(G.fringe, new THREE.MeshLambertMaterial({ color: '#fbefd9', emissive: '#3a2a20' }));
  fringe.position.y = 0.0;
  torso.add(fringe);
  if (Math.round(hue / 7) % 3 === 0) {
    const reb = new THREE.Mesh(G.rebozo, new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(((hue + 160) % 360) / 360, 0.55, 0.42), emissive: '#1a0d14' }));
    reb.position.set(0, 0.45, -0.02);
    torso.add(reb);
  }
  let blinkT = 1 + Math.random() * 3;
  let skyT = 8 + Math.random() * 10;
  let sky = 0;

  // Sombra de contacto suave.
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.32, depthWrite: false }));
  shadow.position.y = 0.025;
  shadow.renderOrder = 1;
  g.add(shadow);

  let phase = 0;
  let t = Math.random() * 10;
  let act = null; // { kind, t, dur }
  let lookYaw = 0;
  let leashing = false;
  let glanceT = 2;
  let glance = 0;
  return {
    group: g,
    head,
    handWorld(v = new THREE.Vector3()) { return arms[0].localToWorld(v.set(0, -0.36, 0.02)); },
    // La mano que lleva la correa (la del farolito es la otra).
    leashHand(v = new THREE.Vector3()) { return arms[0].localToWorld(v.set(0, -0.38, 0.03)); },
    // Con correa: el brazo un poco hacia adelante.
    set leashing(v) { leashing = v; },
    throw() { act = { kind: 'throw', t: 0, dur: 0.55 }; },
    wave() { act = { kind: 'wave', t: 0, dur: 1.6 }; },
    // Ofrecer algo a la ofrenda: los dos brazos hacia adelante, una leve reverencia.
    offer() { act = { kind: 'offer', t: 0, dur: 1.3 }; },
    // Abrazo: se abraza a sí mismo y se mece.
    hug() { act = { kind: 'hug', t: 0, dur: 1.9 }; },
    // Agacharse a acariciar al espíritu.
    pet() { act = { kind: 'pet', t: 0, dur: 1.8 }; },
    get busy() { return !!act; },
    // `speed` en m/s; `turn` en rad/s.
    update(dt, { speed = 0, turn = 0 } = {}) {
      t += dt;
      const k = Math.min(1, speed / 1.2);
      phase += dt * (speed > 0.05 ? 3.2 + speed * 1.35 : 0);
      const swing = Math.sin(phase) * (0.35 + 0.35 * Math.min(1, speed / 4)) * k;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      arms[0].rotation.x = leashing ? -0.55 - swing * 0.2 : -swing * 0.9;
      arms[1].rotation.x = swing * 0.6 - 0.25 * (1 - k * 0.5);
      body.position.y = Math.abs(Math.cos(phase)) * 0.045 * k + Math.sin(t * 2) * 0.006 * (1 - k);
      // Un poquito de aplastar y estirar en cada paso, y la respiración cuando está quieto.
      const squash = k * (Math.abs(Math.cos(phase)) - 0.5) * 0.05;
      body.scale.set(1 - squash * 0.5, 1 + squash, 1 - squash * 0.5);
      tor.scale.set(1, 1 + Math.sin(t * 2.1) * 0.012 * (1 - k), 1);
      hips.rotation.y = Math.sin(phase) * 0.08 * k;
      // Parpadeo.
      blinkT -= dt;
      const closed = blinkT < 0.13 ? 1 - Math.abs(blinkT - 0.065) / 0.065 : 0;
      for (const l of lids) { l.visible = closed > 0.02; l.scale.y = Math.max(0.01, closed); }
      if (blinkT < 0) blinkT = 1.8 + Math.random() * 4;
      // De vez en cuando, quieto, mira el cielo.
      skyT -= dt;
      if (skyT < 0) { skyT = 9 + Math.random() * 12; if (k < 0.1) sky = 2.2; }
      sky = Math.max(0, sky - dt);
      torso.rotation.y = swing * 0.18;
      torso.rotation.x = 0.06 * Math.min(1, speed / 4);
      body.rotation.z = THREE.MathUtils.clamp(-turn * speed * 0.02, -0.15, 0.15);
      // Mira a los costados cuando está quieto.
      glanceT -= dt;
      if (glanceT < 0) { glanceT = 2 + Math.random() * 4; glance = (Math.random() - 0.5) * 1.2; }
      lookYaw += ((speed > 0.3 ? 0 : glance) - lookYaw) * Math.min(1, dt * 3);
      head.rotation.y = lookYaw;
      head.rotation.z = Math.sin(t * 1.3) * 0.03 + lookYaw * 0.08;
      head.rotation.x = -Math.sin(Math.min(1, sky / 2.2) * Math.PI) * 0.32;
      if (act) {
        act.t += dt;
        const p = Math.min(1, act.t / act.dur);
        if (act.kind === 'throw') {
          const a = p < 0.4 ? -2.6 * (p / 0.4) : -2.6 + 3.2 * ((p - 0.4) / 0.6);
          arms[0].rotation.x = a;
          torso.rotation.y = (p < 0.4 ? -0.3 : 0.25) * Math.sin(Math.PI * p);
        } else if (act.kind === 'pet') {
          const e = Math.sin(Math.PI * p);
          torso.rotation.x = 0.55 * e;
          hips.position.y = 0.46 - 0.14 * e;
          legs[0].rotation.x = legs[1].rotation.x = -0.5 * e;
          arms[0].rotation.x = -1.1 * e;
          arms[0].rotation.z = -0.12 + Math.sin(act.t * 7) * 0.18 * e;
          head.rotation.x = 0.3 * e;
        } else if (act.kind === 'offer') {
          const e = Math.sin(Math.PI * Math.min(1, p * 1.25));
          arms[0].rotation.x = arms[1].rotation.x = -1.35 * e;
          arms[0].rotation.z = -0.12 + 0.25 * e;
          arms[1].rotation.z = 0.12 - 0.25 * e;
          torso.rotation.x = 0.18 * e;
          head.rotation.x = 0.22 * e;
        } else if (act.kind === 'hug') {
          const e = Math.sin(Math.PI * Math.min(1, p * 1.1));
          arms[0].rotation.x = arms[1].rotation.x = -1.05 * e;
          arms[0].rotation.z = -0.12 + 1.0 * e;
          arms[1].rotation.z = 0.12 - 1.0 * e;
          body.rotation.z = Math.sin(act.t * 4) * 0.08 * e;
          head.rotation.x = 0.18 * e;
          head.rotation.z = Math.sin(act.t * 4) * 0.1 * e;
        } else if (act.kind === 'wave') {
          arms[0].rotation.x = -2.7;
          arms[0].rotation.z = -0.4 + Math.sin(act.t * 12) * 0.35;
        }
        if (p >= 1) { act = null; arms[0].rotation.z = -0.12; arms[1].rotation.z = 0.12; hips.position.y = 0.46; head.rotation.x = 0; }
      } else arms[0].rotation.z = -0.12;
    },
    dispose() {
      skin.dispose();
      clothes.dispose();
      pants.dispose();
      shoeMat.dispose();
      face.material.dispose();
      hairMat.dispose();
    },
  };
}
