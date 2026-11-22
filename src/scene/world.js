// El jardín: cielo al atardecer, pasto, camino de piedra, faroles, árboles, bancos y luciérnagas.
import * as THREE from 'three';
import { grassTexture, stoneTexture, woodTexture, floorTexture, glowTexture } from './textures.js';

export const HALL_CENTER = new THREE.Vector3(0, 0, -10);
export const HALL_RADIUS = 11.5;
export const GARDEN_RADIUS = 38;
export const SPAWN = new THREE.Vector3(0, 1.6, 24);

function rand(seed) {
  // PRNG determinista para que el jardín se vea igual en cada visita.
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildWorld(scene) {
  const colliders = { segments: [], circles: [] };
  const animated = [];
  const walkable = [];

  // Cielo con degradé y estrellas.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color('#1c1630') },
      mid: { value: new THREE.Color('#4a3a5e') },
      bottom: { value: new THREE.Color('#c98a6c') },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.7, h)) : mix(bottom, mid, smoothstep(-0.05, 0.12, h));
      gl_FragColor = vec4(c, 1.0); }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMat));

  const r = rand(7);
  const starPos = [];
  for (let i = 0; i < 700; i++) {
    const th = r() * Math.PI * 2;
    const ph = Math.acos(0.15 + r() * 0.85);
    starPos.push(Math.sin(ph) * Math.cos(th) * 380, Math.cos(ph) * 380, Math.sin(ph) * Math.sin(th) * 380);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3)),
    new THREE.PointsMaterial({ color: '#fff4dc', size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }),
  );
  scene.add(stars);

  scene.fog = new THREE.FogExp2('#3a2d44', 0.016);

  // Luces generales.
  scene.add(new THREE.HemisphereLight('#8f7fb8', '#2f3a22', 1.1));
  const moon = new THREE.DirectionalLight('#c9c2ff', 0.55);
  moon.position.set(-30, 50, 20);
  scene.add(moon);

  // Pasto.
  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(160, 48),
    new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.name = 'ground';
  scene.add(grass);
  walkable.push(grass);

  // Camino de piedra desde la entrada hasta el salón.
  const pathLen = SPAWN.z - (HALL_CENTER.z + HALL_RADIUS) + 6;
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(3, pathLen),
    new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.95 }),
  );
  path.material.map.repeat.set(1, pathLen / 4);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, HALL_CENTER.z + HALL_RADIUS + pathLen / 2 - 1);
  path.name = 'ground';
  scene.add(path);
  walkable.push(path);

  // Piso de madera del salón.
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(HALL_RADIUS + 1.2, HALL_RADIUS + 1.4, 0.16, 48),
    new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.85 }),
  );
  deck.position.copy(HALL_CENTER).setY(0.08);
  deck.name = 'ground';
  scene.add(deck);
  walkable.push(deck);

  // Cantero central de flores con una vela grande.
  const bed = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.35, 0.45, 32),
    new THREE.MeshStandardMaterial({ color: '#8b7d72', roughness: 0.9 }),
  );
  bed.position.copy(HALL_CENTER).setY(0.3);
  scene.add(bed);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.05, 32), new THREE.MeshStandardMaterial({ color: '#3b2a20' }));
  soil.position.copy(HALL_CENTER).setY(0.54);
  scene.add(soil);
  colliders.circles.push({ x: HALL_CENTER.x, z: HALL_CENTER.z, r: 2.7 });
  const petals = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.09, 5),
    new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }),
    260,
  );
  const tmp = new THREE.Object3D();
  const palette = ['#f6c3d0', '#f7e3a1', '#c8b6f2', '#fbd1b2', '#ffffff'].map((c) => new THREE.Color(c));
  for (let i = 0; i < petals.count; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 1.85;
    tmp.position.set(HALL_CENTER.x + Math.cos(a) * d, 0.58 + r() * 0.04, HALL_CENTER.z + Math.sin(a) * d);
    tmp.rotation.set(-Math.PI / 2 + (r() - 0.5) * 0.4, 0, r() * 6);
    tmp.updateMatrix();
    petals.setMatrixAt(i, tmp.matrix);
    petals.setColorAt(i, palette[i % palette.length]);
  }
  scene.add(petals);

  const centerLight = new THREE.PointLight('#ffb870', 18, 16, 1.6);
  centerLight.position.copy(HALL_CENTER).setY(2.2);
  scene.add(centerLight);
  animated.push((t) => { centerLight.intensity = 16 + Math.sin(t * 7.1) * 1.2 + Math.sin(t * 13.3) * 0.8; });

  // Faroles.
  const lampSpots = [
    [-2.6, 18, true], [2.6, 12, true], [-2.6, 6, true], [2.6, 0, false],
    [HALL_CENTER.x - 6, HALL_CENTER.z + 4, false], [HALL_CENTER.x + 6, HALL_CENTER.z + 4, false],
    [HALL_CENTER.x - 6, HALL_CENTER.z - 5, false], [HALL_CENTER.x + 6, HALL_CENTER.z - 5, false],
  ];
  const poleMat = new THREE.MeshStandardMaterial({ color: '#1e1b1c', roughness: 0.5, metalness: 0.4 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#fff1d0' });
  for (const [x, z, real] of lampSpots) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 3, 8), poleMat);
    pole.position.set(x, 1.5, z);
    scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), bulbMat);
    bulb.position.set(x, 3.1, z);
    scene.add(bulb);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
    glow.scale.setScalar(1.6);
    glow.position.copy(bulb.position);
    scene.add(glow);
    colliders.circles.push({ x, z, r: 0.3 });
    if (real) {
      const l = new THREE.PointLight('#ffd9a0', 9, 11, 1.7);
      l.position.set(x, 2.9, z);
      scene.add(l);
    }
  }

  // Bancos.
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture('#7a4f33'), roughness: 0.8 });
  const benchSpots = [[-3.6, 15, Math.PI / 2], [3.6, 15, -Math.PI / 2], [-3.6, 3, Math.PI / 2], [3.6, 3, -Math.PI / 2]];
  for (const [x, z, rot] of benchSpots) {
    const bench = makeBench(woodMat, poleMat);
    bench.position.set(x, 0, z);
    bench.rotation.y = rot;
    scene.add(bench);
    colliders.circles.push({ x, z, r: 0.9 });
  }

  // Árboles low-poly alrededor.
  const leafMats = ['#3f5d34', '#4a6b3a', '#56703f'].map((c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9 }));
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4b3324', flatShading: true });
  let placed = 0;
  for (let i = 0; i < 200 && placed < 34; i++) {
    const a = r() * Math.PI * 2;
    const d = 17 + r() * 20;
    const x = HALL_CENTER.x + Math.cos(a) * d;
    const z = HALL_CENTER.z + Math.sin(a) * d;
    if (Math.abs(x) < 5.5 && z > -2) continue; // dejar libre el camino
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 6) continue;
    if (Math.hypot(x, z) > GARDEN_RADIUS - 1) continue;
    const tree = makeTree(r, leafMats, trunkMat);
    tree.position.set(x, 0, z);
    scene.add(tree);
    colliders.circles.push({ x, z, r: 0.6 });
    placed++;
  }

  // Cerco de madera que rodea el jardín.
  const fenceMat = new THREE.MeshStandardMaterial({ map: woodTexture('#5a3b28'), roughness: 0.9 });
  const boards = 120;
  for (let i = 0; i < boards; i++) {
    const a = (i / boards) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.BoxGeometry(GARDEN_RADIUS * 2 * Math.PI / boards + 0.05, 2.4 + r() * 0.3, 0.12), fenceMat);
    b.position.set(Math.sin(a) * (GARDEN_RADIUS + 1), 1.2, Math.cos(a) * (GARDEN_RADIUS + 1));
    b.rotation.y = a;
    scene.add(b);
  }

  // Luciérnagas.
  const N = 180;
  const base = new Float32Array(N * 3);
  const phase = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2;
    const d = 3 + r() * 30;
    base[i * 3] = Math.cos(a) * d;
    base[i * 3 + 1] = 0.6 + r() * 4.5;
    base[i * 3 + 2] = Math.sin(a) * d - 2;
    phase[i] = r() * 100;
  }
  const ffGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(base.slice(), 3));
  const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({
    map: glowTexture(), size: 0.45, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffe39a',
  }));
  scene.add(fireflies);
  animated.push((t) => {
    const p = ffGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const ph = phase[i];
      p[i * 3] = base[i * 3] + Math.sin(t * 0.3 + ph) * 1.2;
      p[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.7 + ph * 2) * 0.4;
      p[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.25 + ph) * 1.2;
    }
    ffGeo.attributes.position.needsUpdate = true;
    fireflies.material.opacity = 0.75 + Math.sin(t * 1.3) * 0.2;
  });

  return { colliders, animated, walkable };
}

function makeBench(woodMat, metalMat) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), woodMat);
  seat.position.y = 0.48;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.06), woodMat);
  back.position.set(0, 0.82, -0.24);
  back.rotation.x = -0.12;
  g.add(seat, back);
  for (const x of [-0.8, 0.8]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.5), metalMat);
    leg.position.set(x, 0.24, 0);
    g.add(leg);
  }
  return g;
}

function makeTree(r, leafMats, trunkMat) {
  const g = new THREE.Group();
  const h = 2.2 + r() * 1.6;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, h, 6), trunkMat);
  trunk.position.y = h / 2;
  g.add(trunk);
  const blobs = 3 + Math.floor(r() * 3);
  for (let i = 0; i < blobs; i++) {
    const s = 1.1 + r() * 0.9;
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), leafMats[i % leafMats.length]);
    leaf.position.set((r() - 0.5) * 1.6, h + 0.4 + r() * 1.2, (r() - 0.5) * 1.6);
    leaf.rotation.set(r() * 3, r() * 3, 0);
    g.add(leaf);
  }
  g.rotation.y = r() * Math.PI * 2;
  return g;
}
