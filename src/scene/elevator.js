// El ascensor del jardín: una cabina pintada con talavera, indicador de piso de aguja,
// botón que brilla y puertas que se abren. Tocándolo se eligen los pisos del muro.
import * as THREE from 'three';
import { HALL_CENTER, ELEVATOR_POS } from './world.js';
import { labelTexture, glowTexture } from './textures.js';
import { paintedWallTexture, talaveraTexture, marigoldCluster } from './muertos.js';

export { ELEVATOR_POS };
// Más grande que una persona: se ve desde el camino como un edificio propio.
export const ELEVATOR_SCALE = 1.45;

function dialTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 140;
  const g = c.getContext('2d');
  g.fillStyle = '#2a1b14';
  g.beginPath();
  g.arc(128, 130, 120, Math.PI, 0);
  g.fill();
  g.strokeStyle = '#e0b55d';
  g.lineWidth = 8;
  g.beginPath();
  g.arc(128, 130, 112, Math.PI, 0);
  g.stroke();
  g.fillStyle = '#ffe2a8';
  g.font = '700 30px Nunito, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    g.fillText(String(i + 1), 128 + Math.cos(a) * 84, 128 + Math.sin(a) * 84);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createElevator(scene, colliders, rnd) {
  const g = new THREE.Group();
  g.position.copy(ELEVATOR_POS);
  // Mirando hacia el camino.
  g.rotation.y = Math.atan2(0 - ELEVATOR_POS.x, 12 - ELEVATOR_POS.z);
  scene.add(g);
  g.scale.setScalar(ELEVATOR_SCALE);
  colliders.circles.push({ x: ELEVATOR_POS.x, z: ELEVATOR_POS.z, r: 1.1 * ELEVATOR_SCALE });

  const W = 1.7;
  const H = 2.9;
  const D = 1.5;
  const wall = new THREE.MeshLambertMaterial({ map: paintedWallTexture('#159aa0') });
  const brass = new THREE.MeshStandardMaterial({ color: '#d9a748', roughness: 0.35, metalness: 0.8, emissive: '#4a2f00', emissiveIntensity: 0.6 });
  const tile = talaveraTexture().clone();
  tile.repeat.set(2, 6);
  tile.needsUpdate = true;
  const tileMat = new THREE.MeshLambertMaterial({ map: tile });

  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wall);
  body.position.y = H / 2;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.24, 0.16, D + 0.24), new THREE.MeshLambertMaterial({ color: '#b5482a' }));
  roof.position.y = H + 0.08;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 4), new THREE.MeshLambertMaterial({ color: '#b5482a' }));
  crown.rotation.y = Math.PI / 4;
  crown.position.y = H + 0.4;
  g.add(body, roof, crown);

  // Marco de talavera alrededor de la puerta.
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 2.25), tileMat);
    side.position.set(s * 0.6, 1.13, D / 2 + 0.006);
    g.add(side);
  }
  const lintel = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.2), tileMat);
  lintel.position.set(0, 2.33, D / 2 + 0.006);
  g.add(lintel);

  // Interior iluminado (se ve al abrir las puertas).
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 2.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.1, 0.6) }));
  inside.position.set(0, 1.07, D / 2 - 0.08);
  g.add(inside);

  // Puertas de bronce.
  const doorGeo = new THREE.BoxGeometry(0.48, 2.1, 0.04);
  const doors = [-1, 1].map((s) => {
    const d = new THREE.Mesh(doorGeo, brass);
    d.position.set(s * 0.245, 1.07, D / 2 + 0.02);
    g.add(d);
    // Detalle: rombo grabado.
    const deco = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), new THREE.MeshBasicMaterial({ color: '#7a4a10' }));
    deco.rotation.z = Math.PI / 4;
    deco.position.set(0, 0.25, 0.022);
    d.add(deco);
    return d;
  });

  // Indicador de piso con aguja.
  const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.38), new THREE.MeshBasicMaterial({ map: dialTexture(), transparent: true }));
  dial.position.set(0, 2.6, D / 2 + 0.01);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.24, 0.01), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.6, 0.3) }));
  needle.geometry.translate(0, 0.12, 0);
  needle.position.set(0, 2.42, D / 2 + 0.02);
  g.add(dial, needle);

  // Cartel y botón de llamada.
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({
    map: labelTexture('🛗 Ascensor a los pisos', { w: 640, h: 150, font: '700 66px Caveat, cursive', bg: 'rgba(74,48,34,0.95)', fg: '#f6e3c4' }),
  }));
  sign.position.set(0, H + 0.02, D / 2 + 0.13);
  g.add(sign);
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.8, 1.4, 0.4) }));
  button.position.set(0.78, 1.25, D / 2 + 0.03);
  const plate = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), brass);
  plate.position.set(0.78, 1.25, D / 2 + 0.008);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 }));
  halo.scale.setScalar(0.35);
  halo.position.copy(button.position);
  g.add(plate, button, halo);

  // Guirnalda de cempasúchil sobre la puerta.
  const pts = [];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    pts.push([(t - 0.5) * 1.6, 2.82 - Math.sin(t * Math.PI) * 0.18 + (rnd() - 0.5) * 0.05, D / 2 + 0.12, 0.8 + rnd() * 0.5]);
  }
  g.add(marigoldCluster(pts, { r: 0.07, rnd }));

  // Luz cálida que sale de la cabina.
  const light = new THREE.PointLight('#ffb36b', 0, 5, 1.6);
  light.position.set(0, 1.3, D / 2 + 0.6);
  g.add(light);

  // Área para tocar (más grande, para el celular).
  const hit = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, H + 0.6, D + 0.4), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = H / 2;
  hit.userData = { kind: 'elevator' };
  g.add(hit);

  let open = 0;
  let openTarget = 0;
  let needleTarget = 0;
  return {
    hit,
    standPoint() {
      const front = new THREE.Vector3(0, 0, (D / 2 + 2.6) * ELEVATOR_SCALE).applyQuaternion(g.quaternion).add(g.position);
      front.y = 1.9;
      return { stand: front, target: new THREE.Vector3(g.position.x, 1.6 * ELEVATOR_SCALE, g.position.z) };
    },
    setOpen(v) { openTarget = v ? 1 : 0; },
    setFloor(n) { needleTarget = (-Math.PI / 2) + (Math.min(n, 4) / 4) * Math.PI; },
    animate(t, dt) {
      open += (openTarget - open) * Math.min(1, dt * 3);
      doors[0].position.x = -0.245 - open * 0.45;
      doors[1].position.x = 0.245 + open * 0.45;
      light.intensity = open * 3;
      needle.rotation.z += (-needleTarget - needle.rotation.z) * Math.min(1, dt * 4);
      halo.material.opacity = 0.45 + Math.sin(t * 3) * 0.2;
    },
  };
}

void HALL_CENTER;
