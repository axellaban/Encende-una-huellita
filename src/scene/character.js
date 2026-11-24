// El personaje de cada visitante (vos y los demás): cabezón, cara de calaverita pintada, sarape de
// colores, sombrero o corona de cempasúchil, y un farolito en la mano. Camina, mira, saluda y tira
// la pelota. Hecho con formas simples, sin modelos externos.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { calaveraTexture, marigoldGeometry, marigoldMaterial } from './muertos.js';
import { glowTexture, lanternTexture } from './textures.js';

const serapeCache = new Map();
function serapeTexture(hue, outfit = 0) {
  const bh = ((Math.round(hue) % 360) + 360) % 360;
  const k = Math.round(bh / 20) * 20;
  const key = `${k}:${outfit}`;
  if (serapeCache.has(key)) return serapeCache.get(key);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  const base = `hsl(${k} 58% 45%)`;
  if (outfit === 3) {
    // Chaleco de fiesta bordado sobre camisa clara y faja artesanal.
    g.fillStyle = '#fbf1e2';
    g.fillRect(0, 0, 128, 256);
    g.fillStyle = base;
    g.fillRect(0, 0, 44, 204);
    g.fillRect(84, 0, 44, 204);
    g.fillStyle = '#e6b03c';
    g.fillRect(40, 0, 6, 204);
    g.fillRect(82, 0, 6, 204);
    // Botones dorados y bordado floral en las solapas.
    for (let y = 32; y < 180; y += 36) {
      g.fillStyle = '#ffd86b';
      g.beginPath(); g.arc(22, y, 4.5, 0, Math.PI * 2); g.arc(106, y, 4.5, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = `hsl(${(k + 160) % 360} 68% 48%)`;
    g.fillRect(0, 192, 128, 36);
    g.fillStyle = '#ffe082';
    g.fillRect(0, 192, 128, 4);
    g.fillRect(0, 224, 128, 4);
  } else {
    g.fillStyle = base;
    g.fillRect(0, 0, 128, 256);
    // Textura de tejido artesanal.
    g.fillStyle = 'rgba(255,255,255,0.06)';
    for (let y = 0; y < 256; y += 4) g.fillRect(0, y, 128, 1.5);
    const bands = [
      [`hsl(${(k + 180) % 360} 65% 55%)`, 12],
      ['#fbefd9', 6],
      [`hsl(${(k + 40) % 360} 85% 58%)`, 10],
      ['#2a1b2e', 4],
      [`hsl(${(k + 300) % 360} 65% 52%)`, 8],
      ['#ffd25a', 5],
    ];
    let y = outfit === 2 ? 72 : 108;
    for (const [col, h] of bands) { g.fillStyle = col; g.fillRect(0, y, 128, h); y += h + 4; }
    if (outfit === 2) {
      // Poncho con rombos tejidos y florcitas en el pecho.
      g.fillStyle = '#fbefd9';
      for (let x = 16; x < 128; x += 32) {
        g.beginPath();
        g.moveTo(x, 150); g.lineTo(x + 12, 168); g.lineTo(x, 186); g.lineTo(x - 12, 168);
        g.closePath();
        g.fill();
        g.fillStyle = '#ff9a1f';
        g.beginPath(); g.arc(x, 168, 4.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fbefd9';
      }
    }
    // Grecas en zigzag.
    g.strokeStyle = '#fbefd9';
    g.lineWidth = 4;
    g.beginPath();
    for (let x = 0; x <= 128; x += 16) g.lineTo(x, x % 32 ? 202 : 214);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(outfit === 3 ? 1 : 3, 1);
  serapeCache.set(key, t);
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
  // Para sonreír: ojitos cerrados de contento (∩) y una sonrisa (∪).
  shared.arc = new THREE.TorusGeometry(0.03, 0.0075, 6, 14, Math.PI);
  shared.smile = new THREE.TorusGeometry(0.05, 0.009, 6, 16, Math.PI).rotateZ(Math.PI);
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
  const rawHue = Math.max(0, Math.round(hue));
  const baseHue = ((rawHue % 360) + 360) % 360;
  const outfit = rawHue >= 360 ? Math.floor(rawHue / 360) % 4 : (Math.round(baseHue / 7) % 3 === 0 ? 1 : 0);
  const skin = new THREE.MeshLambertMaterial({ color: '#fbf1e2', emissive: '#4a3434', emissiveIntensity: 0.55 });
  const clothes = new THREE.MeshLambertMaterial({ map: serapeTexture(baseHue, outfit), emissive: new THREE.Color().setHSL(baseHue / 360, 0.5, 0.14) });
  // Luz de borde cálida sobre el sarape para que el personaje tenga relieve de noche.
  clothes.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float rimC = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.6);
       totalEmissiveRadiance += vec3(0.42, 0.26, 0.12) * rimC;`,
    );
  };
  clothes.customProgramCacheKey = () => 'char-clothes-rim-1';
  const pants = new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(((baseHue + 200) % 360) / 360, 0.25, 0.22), emissive: '#140c18' });
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
  const face = new THREE.Mesh(G.face, new THREE.MeshLambertMaterial({ map: calaveraTexture(baseHue), emissive: '#3a2a2a', emissiveIntensity: 0.6, transparent: false }));
  head.add(face);
  const hairMat = new THREE.MeshLambertMaterial({ color: ['#2a1a14', '#3b2418', '#1c1418', '#5a3a22'][Math.round(baseHue) % 4], emissive: '#0e0806' });
  head.add(new THREE.Mesh(G.hairBack, hairMat), new THREE.Mesh(G.hairTop, hairMat));
  const useHat = hat ?? Math.round(baseHue) % 2 === 1;
  // El peinado viaja escondido en el color (baseHue % 8: el bit 0 es el sombrero, los bits 1-2 el
  // peinado), así los demás te ven igual sin tocar el servidor.
  const hairStyle = Math.floor((Math.round(baseHue) % 8) / 2);
  const ribbon = new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(((baseHue + 150) % 360) / 360, 0.75, 0.55), emissive: '#2a0a1a' });
  if (hairStyle === 1) {
    // Trenzas que caen detrás de los hombros, con moñitos.
    for (const sd of [-1, 1]) {
      const pts = [new THREE.Vector3(sd * 0.17, 0.02, -0.08), new THREE.Vector3(sd * 0.21, -0.14, -0.1), new THREE.Vector3(sd * 0.2, -0.3, -0.07), new THREE.Vector3(sd * 0.19, -0.42, -0.04)];
      const curve = new THREE.CatmullRomCurve3(pts);
      head.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.038, 7, false), hairMat));
      for (let k = 1; k < 4; k++) {
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.044, 8, 6), hairMat);
        knot.position.copy(curve.getPoint(k / 4));
        head.add(knot);
      }
      const bow = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6).scale(1.5, 0.7, 0.6), ribbon);
      bow.position.copy(pts[3]);
      head.add(bow);
    }
  } else if (hairStyle === 2 && !useHat) {
    // Chongo arriba con una flor.
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), hairMat);
    bun.position.set(0, 0.2, -0.12);
    const fl = new THREE.Mesh(G.flower, marigoldMaterial());
    fl.position.set(0.08, 0.22, -0.05);
    head.add(bun, fl);
  } else if (hairStyle === 3) {
    // Colita atada atrás.
    const pts = [new THREE.Vector3(0, 0.1, -0.22), new THREE.Vector3(0, 0.0, -0.32), new THREE.Vector3(0.02, -0.18, -0.33), new THREE.Vector3(0, -0.32, -0.28)];
    head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.05, 8, false), hairMat));
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 6, 12), ribbon);
    tie.position.copy(pts[0]).add(new THREE.Vector3(0, -0.02, -0.02));
    tie.rotation.x = 1.2;
    head.add(tie);
  }
  if (useHat) {
    const hatMat = new THREE.MeshLambertMaterial({ color: '#2a1d2e', emissive: '#120a14' });
    const bandMat = new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(((baseHue + 150) % 360) / 360, 0.75, 0.5), emissive: '#3a0a1a' });
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
  let lanternLight = null;
  if (light) {
    const l = new THREE.PointLight('#ffb36b', 2.2, 6, 1.8);
    l.position.y = -0.1;
    lantern.add(l);
    lanternLight = l;
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
  // Contento (al dejar una vela, una flor o un regalito, al abrazar o saludar): ojitos ∩ y sonrisa.
  const inkMat = new THREE.MeshBasicMaterial({ color: '#3a1f2b' });
  const happyEyes = [-1, 1].map((sd) => {
    const a = new THREE.Mesh(G.arc, inkMat);
    a.position.set(sd * 0.079, 0.075, 0.226);
    a.lookAt(sd * 0.079 * 3, 0.075 * 3, 0.226 * 3);
    a.visible = false;
    head.add(a);
    return a;
  });
  const smile = new THREE.Mesh(G.smile, inkMat);
  smile.position.set(0, -0.045, 0.228);
  smile.lookAt(0, -0.045 * 3, 0.228 * 3);
  smile.visible = false;
  head.add(smile);
  let happy = 0;
  let gk = 0; // cuánto está planeando (0..1, suave)
  // Cachetes rosados.
  const cheekMat = new THREE.MeshBasicMaterial({ color: '#ff7aa8', transparent: true, opacity: 0.32, depthWrite: false });
  for (const sd of [-1, 1]) {
    const c = new THREE.Mesh(G.cheek, cheekMat);
    c.position.set(sd * 0.13, -0.005, 0.2);
    c.lookAt(sd * 0.13 * 3, -0.015, 0.6);
    head.add(c);
  }
  // Flecos del sarape y detalles según la ropa elegida (rebozo, cuello tejido o chaleco).
  if (outfit !== 3) {
    const fringe = new THREE.Mesh(G.fringe, new THREE.MeshLambertMaterial({ color: '#fbefd9', emissive: '#3a2a20' }));
    fringe.position.y = 0.0;
    torso.add(fringe);
  }
  if (outfit === 1) {
    const reb = new THREE.Mesh(G.rebozo, new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(((baseHue + 160) % 360) / 360, 0.55, 0.42), emissive: '#1a0d14' }));
    reb.position.set(0, 0.45, -0.02);
    torso.add(reb);
  } else if (outfit === 2) {
    const collar = new THREE.Mesh(G.rebozo, new THREE.MeshLambertMaterial({ color: '#fbefd9', emissive: '#3a2a20' }));
    collar.scale.set(0.88, 0.85, 0.88);
    collar.position.set(0, 0.46, 0.0);
    torso.add(collar);
  }
  let blinkT = 1 + Math.random() * 3;
  let skyT = 8 + Math.random() * 10;
  let sky = 0;

  // Sombra de contacto suave.
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.32, depthWrite: false }));
  shadow.position.y = 0.025;
  shadow.renderOrder = 1;
  // Con sombras de verdad (pisos del cielo, calidad alta) el cuerpo proyecta su sombra.
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
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
    wave() { act = { kind: 'wave', t: 0, dur: 1.6 }; happy = Math.max(happy, 1.8); },
    // Ofrecer algo a la ofrenda: los dos brazos hacia adelante, una leve reverencia (y una sonrisa).
    offer() { act = { kind: 'offer', t: 0, dur: 1.3 }; happy = 2.6; },
    // Abrazo: se abraza a sí mismo y se mece.
    hug() { act = { kind: 'hug', t: 0, dur: 1.9 }; happy = 2.8; },
    // Sonreír un rato (segundos).
    smile(sec = 2) { happy = Math.max(happy, sec); },
    // Agacharse a acariciar al espíritu.
    pet() { act = { kind: 'pet', t: 0, dur: 1.8 }; },
    get busy() { return !!act; },
    // Con la cámara muy cerca (adentro del ascensor): el farolito sin halo ni luz, para no encandilar.
    set close(v) { halo.visible = !v; lb.material.color.setRGB(v ? 1.1 : 2.0, v ? 0.8 : 1.45, v ? 0.5 : 0.9); if (lanternLight) lanternLight.visible = !v; },
    // `speed` en m/s; `turn` en rad/s.
    update(dt, { speed = 0, turn = 0, gliding = false } = {}) {
      t += dt;
      gk += ((gliding ? 1 : 0) - gk) * Math.min(1, dt * 6);
      const k = Math.min(1, speed / 1.2);
      phase += dt * (speed > 0.05 ? 3.2 + speed * 1.35 : 0);
      const swing = Math.sin(phase) * (0.38 + 0.36 * Math.min(1, speed / 4)) * k;
      const idleSway = Math.sin(t * 1.45) * 0.015 * (1 - k);
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      arms[0].rotation.x = leashing ? -0.55 - swing * 0.22 : -swing * 0.92 + Math.sin(t * 1.7) * 0.03 * (1 - k);
      arms[1].rotation.x = swing * 0.58 - 0.28 * (1 - k * 0.45);
      // El farolito se balancea suave como un péndulo con cada paso y en los giros.
      lantern.rotation.x = -swing * 0.32 + Math.sin(t * 2.4) * 0.04;
      lantern.rotation.z = THREE.MathUtils.clamp(turn * 0.08, -0.25, 0.25) + Math.cos(t * 1.9) * 0.03;
      body.position.y = Math.abs(Math.cos(phase)) * 0.048 * k + Math.sin(t * 2.1) * 0.007 * (1 - k);
      body.position.x = idleSway;
      // Un poquito de aplastar y estirar en cada paso, y la respiración cuando está quieto.
      const squash = k * (Math.abs(Math.cos(phase)) - 0.5) * 0.055;
      body.scale.set(1 - squash * 0.5, 1 + squash, 1 - squash * 0.5);
      const breath = 1 + Math.sin(t * 2.2) * 0.014 * (1 - k * 0.5);
      tor.scale.set(breath, breath, breath);
      hips.rotation.y = Math.sin(phase) * 0.095 * k + idleSway * 1.5;
      // Parpadeo.
      blinkT -= dt;
      const closed = blinkT < 0.13 ? 1 - Math.abs(blinkT - 0.065) / 0.065 : 0;
      for (const l of lids) { l.visible = closed > 0.02; l.scale.y = Math.max(0.01, closed); }
      if (blinkT < 0) blinkT = 1.8 + Math.random() * 4;
      // Contento: los párpados tapan los ojos pintados y aparecen los ojitos ∩ y la sonrisa.
      happy = Math.max(0, happy - dt);
      const hk = Math.min(1, happy / 0.25);
      if (hk > 0.02) for (const l of lids) { l.visible = true; l.scale.y = Math.max(l.scale.y, hk); }
      for (const a of happyEyes) { a.visible = hk > 0.3; }
      smile.visible = hk > 0.05;
      smile.scale.setScalar(0.4 + 0.6 * hk);
      cheekMat.opacity = 0.32 + 0.3 * hk;
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
      // Planeando: brazos bien abiertos (el sarape hace de alas), el cuerpo hacia adelante, las piernas
      // atrás y se inclina en las curvas.
      if (gk > 0.01) {
        const flap = Math.sin(t * 5) * 0.06;
        arms[0].rotation.z = THREE.MathUtils.lerp(arms[0].rotation.z, -1.45 - flap, gk);
        arms[1].rotation.z = THREE.MathUtils.lerp(arms[1].rotation.z, 1.45 + flap, gk);
        arms[0].rotation.x = THREE.MathUtils.lerp(arms[0].rotation.x, -0.2, gk);
        arms[1].rotation.x = THREE.MathUtils.lerp(arms[1].rotation.x, -0.2, gk);
        legs[0].rotation.x = THREE.MathUtils.lerp(legs[0].rotation.x, 0.35 + flap, gk);
        legs[1].rotation.x = THREE.MathUtils.lerp(legs[1].rotation.x, 0.5 - flap, gk);
        torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, 0.32, gk);
        body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, THREE.MathUtils.clamp(-turn * 0.22, -0.45, 0.45), gk);
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -0.2, gk);
        happy = Math.max(happy, 0.5 * gk);
      }
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
