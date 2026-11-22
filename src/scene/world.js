// El jardín: cielo con luna y estrellas, colinas, pasto con viento, flores, árboles, cerco de ligustros,
// camino con balizas, faroles, bancos y luciérnagas. Todo procedural (sin modelos ni imágenes externas).
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { grassTexture, stoneTexture, woodTexture, floorTexture, glowTexture, blobShadowTexture, moonTexture } from './textures.js';
import { marigoldGeometry, marigoldMaterial, buildPueblo, PALETTE } from './muertos.js';

export const HALL_CENTER = new THREE.Vector3(0, 0, -10);
export const HALL_RADIUS = 11.5;
export const GARDEN_RADIUS = 37;
export const SPAWN = new THREE.Vector3(0, 1.6, 24);
export const PATH_HALF = 1.6;
export const CREEK_Z = -29.5;
// El Prado de los espíritus: un claro sin árboles donde juegan las mascotas de luz.
export const MEADOW = new THREE.Vector3(13, 0, 11);
export const MEADOW_R = 7;
export const creekZ = (x) => CREEK_Z + Math.sin(x * 0.12) * 2.2;
export const nearCreek = (x, z, pad = 0) => Math.abs(z - creekZ(x)) < 2.1 + pad;

// Reloj compartido por todos los shaders animados (viento, luciérnagas, estrellas).
export const uTime = { value: 0 };

export function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function withWind(material, key, glsl) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = `uniform float uTime;\n${sh.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>\n${glsl}`);
  };
  material.customProgramCacheKey = () => key + '2';
  return material;
}

// Una piedra/mata low-poly con vértices desplazados (sin grietas entre caras).
function lumpy(radius, detail, r, amount = 0.18) {
  let g = new THREE.IcosahedronGeometry(radius, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (r() - 0.5) * amount * 2;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.92, p.getZ(i) * k);
  }
  g = g.toNonIndexed();
  g.computeVertexNormals();
  return g;
}

function paint(geo, color) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(arr, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

export function insideHall(x, z, pad = 0) {
  return Math.hypot(x - HALL_CENTER.x, z - HALL_CENTER.z) < HALL_RADIUS + 1.6 + pad;
}
export function onPath(x, z, pad = 0) {
  return Math.abs(x) < PATH_HALF + pad && z > HALL_CENTER.z + HALL_RADIUS - 1 && z < SPAWN.z + 6;
}

export function buildWorld(scene, tier) {
  const colliders = { segments: [], circles: [] };
  const animated = [];
  const walkable = [];
  const r = rand(7);

  scene.fog = new THREE.FogExp2('#2a1640', 0.012);
  scene.background = new THREE.Color('#150d24');

  // ---------- cielo ----------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 40, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color('#0c0824') },
        mid: { value: new THREE.Color('#34195e') },
        low: { value: new THREE.Color('#a3337a') },
        horizon: { value: new THREE.Color('#ff8a3d') },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 horizon; varying vec3 vP;
        void main(){
          float h = vP.y;
          vec3 c = mix(mid, top, smoothstep(0.18, 0.75, h));
          c = mix(low, c, smoothstep(0.02, 0.2, h));
          c = mix(horizon, c, smoothstep(-0.04, 0.07, h));
          // Resplandor del atardecer hacia el oeste.
          float sunset = pow(max(0.0, dot(normalize(vec3(-0.2, 0.0, -1.0)), normalize(vec3(vP.x, 0.0, vP.z)))), 6.0);
          c += vec3(0.45, 0.18, 0.06) * sunset * (1.0 - smoothstep(0.0, 0.35, h));
          float band = smoothstep(0.25, 0.45, h) * (1.0 - smoothstep(0.45, 0.75, h));
          float wave = sin(atan(vP.z, vP.x) * 5.0 + h * 9.0) * 0.5 + 0.5;
          c += mix(vec3(0.25, 0.04, 0.18), vec3(0.04, 0.16, 0.18), wave) * band * 0.55;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  sky.renderOrder = -10;
  scene.add(sky);

  // Estrellas que titilan.
  {
    const n = 1100;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(0.12 + r() * 0.88);
      pos.set([Math.sin(ph) * Math.cos(th) * 400, Math.cos(ph) * 400, Math.sin(ph) * Math.sin(th) * 400], i * 3);
      seed[i] = r();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const stars = new THREE.Points(geo, new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime },
      vertexShader: `attribute float seed; uniform float uTime; varying float vA;
        void main(){ vA = 0.45 + 0.55 * sin(uTime * (0.6 + seed * 2.4) + seed * 60.0);
          vA *= smoothstep(0.05, 0.35, normalize(position).y);
          gl_PointSize = 1.2 + seed * seed * 2.6;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * 1.3, vA * smoothstep(0.5, 0.0, d)); }`,
    }));
    stars.renderOrder = -9;
    scene.add(stars);
  }

  // Luna.
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(), fog: false, depthWrite: false, transparent: true, color: new THREE.Color(1.6, 1.55, 1.45) }));
  moon.position.set(-150, 150, -300);
  moon.scale.setScalar(70);
  moon.renderOrder = -8;
  scene.add(moon);

  // ---------- luces generales ----------
  scene.add(new THREE.HemisphereLight('#a184d8', '#2c2414', 1.3));
  const moonLight = new THREE.DirectionalLight('#c3c4ff', 0.6);
  moonLight.position.set(-30, 50, -40);
  scene.add(moonLight);
  const warmFill = new THREE.DirectionalLight('#ff8a3d', 0.35);
  warmFill.position.set(-10, 6, -60);
  scene.add(warmFill);

  // ---------- suelo ----------
  const grassTex = grassTexture();
  grassTex.repeat.set(55, 55);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(220, 64), new THREE.MeshLambertMaterial({ map: grassTex, color: '#c8d6b4' }));
  ground.rotation.x = -Math.PI / 2;
  ground.name = 'ground';
  scene.add(ground);
  walkable.push(ground);

  // Colinas lejanas.
  {
    const seg = 96;
    const pos = [];
    const col = [];
    const near = new THREE.Color('#2a1d3c');
    const far = new THREE.Color('#41275a');
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      const h = (a) => 14 + Math.sin(a * 3) * 7 + Math.sin(a * 7 + 1) * 4 + Math.sin(a * 13) * 2;
      const p = (a, rad, y) => [Math.sin(a) * rad, y, Math.cos(a) * rad];
      const quad = [p(a0, 95, -1), p(a1, 95, -1), p(a1, 160, h(a1)), p(a0, 160, h(a0))];
      for (const idx of [0, 1, 2, 0, 2, 3]) {
        pos.push(...quad[idx]);
        (idx < 2 ? near : far).toArray(col, col.length);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const hills = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    scene.add(hills);
    scene.add(buildPueblo(r));
  }

  // Camino de piedra.
  const pathLen = SPAWN.z - (HALL_CENTER.z + HALL_RADIUS) + 7;
  const pathTex = stoneTexture();
  pathTex.repeat.set(1, pathLen / 4);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(PATH_HALF * 2, pathLen), new THREE.MeshLambertMaterial({ map: pathTex }));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.012, HALL_CENTER.z + HALL_RADIUS - 1 + pathLen / 2);
  path.name = 'ground';
  scene.add(path);
  walkable.push(path);
  // Bordes del camino.
  for (const s of [-1, 1]) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, pathLen), new THREE.MeshLambertMaterial({ color: '#6d625a' }));
    edge.position.set(s * (PATH_HALF + 0.05), 0.04, path.position.z);
    scene.add(edge);
  }

  // Piso de madera del salón y borde de piedra.
  const floorTex = floorTexture();
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(HALL_RADIUS + 1.2, HALL_RADIUS + 1.35, 0.16, 64), new THREE.MeshLambertMaterial({ map: floorTex }));
  deck.position.copy(HALL_CENTER).setY(0.08);
  deck.name = 'ground';
  scene.add(deck);
  walkable.push(deck);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(HALL_RADIUS + 1.3, 0.12, 6, 72), new THREE.MeshLambertMaterial({ color: '#7d7166' }));
  rim.rotation.x = Math.PI / 2;
  rim.position.copy(HALL_CENTER).setY(0.12);
  scene.add(rim);

  // ---------- pasto con viento ----------
  {
    const w = 0.055;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.8, 0.35, 0, w * 0.8, 0.35, 0, -w * 0.45, 0.7, 0, w * 0.45, 0.7, 0, 0, 1, 0], 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(7).fill([0, 1, 0]).flat(), 3));
    const base = new THREE.Color('#2c4223');
    const tip = new THREE.Color('#a3bb73');
    const cols = [];
    [0, 0, 0.35, 0.35, 0.7, 0.7, 1].forEach((h) => base.clone().lerp(tip, h).toArray(cols, cols.length));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6]);
    const mat = withWind(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 'grass',
      `vec3 ip = vec3(0.0);
       #ifdef USE_INSTANCING
         ip = instanceMatrix[3].xyz;
       #endif
       float h = position.y;
       float bend = (sin(uTime * 1.5 + ip.x * 0.32 + ip.z * 0.21) * 0.55 + sin(uTime * 3.3 + ip.x * 1.3 - ip.z * 0.9) * 0.22 + 0.35) * h * h;
       transformed.x += bend * 0.22;
       transformed.z += bend * 0.1;
       // Cerca de la cámara (tercera persona) las hojas se achican para no tapar la vista.
       float camD = distance(ip.xz, cameraPosition.xz);
       transformed *= mix(0.18, 1.0, smoothstep(1.2, 4.2, camD));`);
    const count = tier.grass;
    const grass = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Object3D();
    const tint = new THREE.Color();
    let placed = 0;
    for (let i = 0; i < count * 4 && placed < count; i++) {
      // Más densidad cerca del camino y del salón, donde mira la gente.
      const rad = Math.pow(r(), 0.75) * (GARDEN_RADIUS - 0.5);
      const a = r() * Math.PI * 2;
      const x = Math.sin(a) * rad;
      const z = Math.cos(a) * rad - 2;
      if (onPath(x, z, 0.2) || insideHall(x, z, 0.1) || nearCreek(x, z) || Math.hypot(x, z) > GARDEN_RADIUS - 0.4) continue;
      m.position.set(x, 0, z);
      m.rotation.set((r() - 0.5) * 0.3, r() * Math.PI * 2, (r() - 0.5) * 0.3);
      const s = 0.22 + r() * 0.38;
      m.scale.set(1 + r(), s, 1);
      m.updateMatrix();
      grass.setMatrixAt(placed, m.matrix);
      tint.setHSL(0.22 + r() * 0.08, 0.35 + r() * 0.2, 0.45 + r() * 0.2);
      grass.setColorAt(placed, tint);
      placed++;
    }
    grass.count = placed;
    grass.frustumCulled = false;
    scene.add(grass);
  }

  // Flores entre el pasto.
  {
    const petals = [];
    for (let i = 0; i < 5; i++) {
      const p = new THREE.CircleGeometry(0.045, 6);
      p.translate(0.05, 0, 0);
      p.rotateZ((i / 5) * Math.PI * 2);
      petals.push(p);
    }
    void petals;
    const flowers = new THREE.InstancedMesh(marigoldGeometry(0.07, '#ffffff', r), marigoldMaterial(), tier.flowers);
    const palette = [PALETTE.cempasuchil, PALETTE.naranja, PALETTE.amarillo, PALETTE.cempasuchil, '#d6246e', '#ff9a1f'].map((c) => new THREE.Color(c));
    const m = new THREE.Object3D();
    let placed = 0;
    for (let i = 0; i < tier.flowers * 6 && placed < tier.flowers; i++) {
      const x = (r() - 0.5) * 2 * GARDEN_RADIUS;
      const z = (r() - 0.5) * 2 * GARDEN_RADIUS - 2;
      if (onPath(x, z, 0.3) || insideHall(x, z, 0.2) || nearCreek(x, z, 0.3) || Math.hypot(x, z) > GARDEN_RADIUS - 1) continue;
      // Agrupadas en manchones.
      if (Math.sin(x * 0.35) * Math.cos(z * 0.3) < 0.15 && r() < 0.8) continue;
      m.position.set(x, 0.16 + r() * 0.2, z);
      m.rotation.set((r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.5);
      m.scale.setScalar(0.7 + r() * 0.8);
      m.updateMatrix();
      flowers.setMatrixAt(placed, m.matrix);
      flowers.setColorAt(placed, palette[placed % palette.length]);
      placed++;
    }
    flowers.count = placed;
    scene.add(flowers);
  }

  // ---------- sombras de contacto ----------
  const blobs = [];
  const addBlob = (x, z, sx, sz = sx) => blobs.push([x, z, sx, sz]);

  // ---------- árboles ----------
  {
    const trunkParts = [];
    const leafParts = [];
    const greens = ['#3d5a33', '#4b6b3b', '#56733f', '#35502f'];
    const blossoms = ['#e7a7bd', '#f0bfcf', '#d98fac'];
    let placed = 0;
    for (let i = 0; i < 400 && placed < 30; i++) {
      const a = r() * Math.PI * 2;
      const d = 16 + r() * 20;
      const x = HALL_CENTER.x + Math.sin(a) * d;
      const z = HALL_CENTER.z + Math.cos(a) * d;
      if (Math.abs(x) < 5 && z > -2) continue;
      if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 6) continue;
      if (Math.hypot(x - MEADOW.x, z - MEADOW.z) < MEADOW_R + 2.5) continue;
      if (Math.hypot(x, z) > GARDEN_RADIUS - 2.5 || nearCreek(x, z, 1.5)) continue;
      if (colliders.circles.some((c) => Math.hypot(c.x - x, c.z - z) < 4)) continue;
      const blossom = r() < 0.28;
      const h = 2.2 + r() * 1.8;
      const trunk = new THREE.CylinderGeometry(0.14, 0.3, h, 7);
      trunk.translate(x, h / 2, z);
      trunkParts.push(trunk);
      for (let b = 0; b < 2; b++) {
        const br = new THREE.CylinderGeometry(0.05, 0.1, 1.3, 5);
        br.translate(0, 0.65, 0);
        br.rotateZ((b ? 1 : -1) * (0.6 + r() * 0.3));
        br.rotateY(r() * Math.PI);
        br.translate(x, h * 0.7, z);
        trunkParts.push(br);
      }
      const blobsN = 4 + Math.floor(r() * 3);
      for (let k = 0; k < blobsN; k++) {
        const s = 1.0 + r() * 0.9;
        const g = lumpy(s, 1, r, 0.16);
        g.translate(x + (r() - 0.5) * 1.8, h + 0.3 + r() * 1.3, z + (r() - 0.5) * 1.8);
        const pal = blossom ? blossoms : greens;
        leafParts.push(paint(g, pal[Math.floor(r() * pal.length)]));
      }
      colliders.circles.push({ x, z, r: 0.5 });
      addBlob(x, z, 4.2);
      placed++;
    }
    const trunks = new THREE.Mesh(mergeGeometries(trunkParts.map((g) => g.toNonIndexed())), new THREE.MeshLambertMaterial({ color: '#4a3223', flatShading: true }));
    scene.add(trunks);
    const leaves = new THREE.Mesh(mergeGeometries(leafParts), withWind(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 'leaves',
      `float k = max(0.0, position.y - 2.0);
       transformed.x += sin(uTime * 0.9 + position.x * 0.25 + position.z * 0.15) * 0.04 * k;
       transformed.z += cos(uTime * 0.75 + position.z * 0.2) * 0.03 * k;`));
    scene.add(leaves);
  }

  // Cerco de ligustros alrededor del jardín y siluetas de árboles detrás.
  {
    const parts = [];
    const n = 150;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.01;
      const rad = GARDEN_RADIUS + 1.2 + r() * 0.4;
      const g = lumpy(1.1 + r() * 0.5, 1, r, 0.2);
      g.scale(1, 1.1 + r() * 0.5, 1);
      g.translate(Math.sin(a) * rad, 0.8 + r() * 0.3, Math.cos(a) * rad);
      parts.push(paint(g, ['#2f4a2b', '#38552f', '#2a4226'][i % 3]));
    }
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      const rad = 44 + r() * 26;
      const h = 7 + r() * 9;
      const g = new THREE.ConeGeometry(1.8 + r() * 1.6, h, 7).toNonIndexed();
      g.deleteAttribute('uv');
      g.translate(Math.sin(a) * rad, h / 2, Math.cos(a) * rad);
      parts.push(paint(g, r() < 0.5 ? '#1f2d22' : '#25332a'));
    }
    const hedge = new THREE.Mesh(mergeGeometries(parts), withWind(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 'hedge',
      'transformed.x += sin(uTime * 0.6 + position.z * 0.1) * 0.03 * max(0.0, position.y - 1.0);'));
    scene.add(hedge);
  }

  // ---------- faroles ----------
  const poleMat = new THREE.MeshLambertMaterial({ color: '#1d1a1c' });
  const glassMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.0, 0.9) });
  const lampSpots = [
    [-2.7, 19], [2.7, 13.5], [-2.7, 8], [2.7, 2.5],
    [HALL_CENTER.x - 5.5, HALL_CENTER.z + 5.5], [HALL_CENTER.x + 5.5, HALL_CENTER.z + 5.5],
    [HALL_CENTER.x - 6.5, HALL_CENTER.z - 4.5], [HALL_CENTER.x + 6.5, HALL_CENTER.z - 4.5],
  ];
  const lampParts = [];
  const lightOrder = [5, 4, 1, 3, 0, 6, 7, 2]; // prioridad de luces reales
  lampSpots.forEach(([x, z], i) => {
    const base = new THREE.CylinderGeometry(0.16, 0.2, 0.35, 8);
    base.translate(x, 0.17, z);
    const pole = new THREE.CylinderGeometry(0.045, 0.06, 2.8, 8);
    pole.translate(x, 1.7, z);
    const cap = new THREE.ConeGeometry(0.26, 0.22, 4);
    cap.rotateY(Math.PI / 4);
    cap.translate(x, 3.55, z);
    const collar = new THREE.CylinderGeometry(0.12, 0.08, 0.1, 8);
    collar.translate(x, 3.06, z);
    lampParts.push(base, pole, cap, collar);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), glassMat);
    glass.position.set(x, 3.27, z);
    scene.add(glass);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: tier.bloom ? 0.35 : 0.75 }));
    glow.scale.setScalar(tier.bloom ? 1.4 : 2);
    glow.position.set(x, 3.27, z);
    scene.add(glow);
    colliders.circles.push({ x, z, r: 0.25 });
    addBlob(x, z, 0.9);
    if (lightOrder.indexOf(i) < tier.lights) {
      const l = new THREE.PointLight('#ffb36b', 5, 11, 1.7);
      l.position.set(x, 3.0, z);
      scene.add(l);
    }
  });
  scene.add(new THREE.Mesh(mergeGeometries(lampParts.map((g) => g.toNonIndexed())), poleMat));

  // Balizas a los lados del camino.
  {
    const posts = [];
    for (let z = 1.5; z < SPAWN.z + 4; z += 3.2) {
      for (const s of [-1, 1]) {
        const x = s * (PATH_HALF + 0.35);
        const g = new THREE.CylinderGeometry(0.06, 0.07, 0.42, 8);
        g.translate(x, 0.21, z + (s > 0 ? 1.6 : 0));
        posts.push(g);
      }
    }
    scene.add(new THREE.Mesh(mergeGeometries(posts.map((g) => g.toNonIndexed())), poleMat));
    const tops = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.9, 1.5, 0.6) }), posts.length);
    const m = new THREE.Object3D();
    let i = 0;
    for (let z = 1.5; z < SPAWN.z + 4; z += 3.2) {
      for (const s of [-1, 1]) {
        m.position.set(s * (PATH_HALF + 0.35), 0.46, z + (s > 0 ? 1.6 : 0));
        m.updateMatrix();
        tops.setMatrixAt(i++, m.matrix);
      }
    }
    scene.add(tops);
  }

  // ---------- bancos ----------
  {
    const parts = [];
    const metal = [];
    const benchSpots = [[-3.8, 16, Math.PI / 2], [3.8, 16, -Math.PI / 2], [-3.8, 5, Math.PI / 2], [3.8, 5, -Math.PI / 2]];
    for (const [x, z, rot] of benchSpots) {
      const tr = new THREE.Matrix4().makeRotationY(rot).setPosition(x, 0, z);
      for (let s = 0; s < 4; s++) {
        const slat = new THREE.BoxGeometry(1.8, 0.04, 0.1);
        slat.translate(0, 0.48, -0.18 + s * 0.12);
        parts.push(slat.applyMatrix4(tr));
      }
      for (let s = 0; s < 3; s++) {
        const slat = new THREE.BoxGeometry(1.8, 0.09, 0.03);
        slat.rotateX(-0.15);
        slat.translate(0, 0.66 + s * 0.13, -0.27 - s * 0.02);
        parts.push(slat.applyMatrix4(tr));
      }
      for (const lx of [-0.8, 0.8]) {
        const leg = new THREE.BoxGeometry(0.05, 0.5, 0.48);
        leg.translate(lx, 0.25, -0.05);
        metal.push(leg.applyMatrix4(tr));
        const back = new THREE.BoxGeometry(0.05, 0.45, 0.05);
        back.translate(lx, 0.72, -0.29);
        metal.push(back.applyMatrix4(tr));
      }
      colliders.circles.push({ x, z, r: 0.85 });
      addBlob(x, z, 2.2, 1.2);
    }
    scene.add(new THREE.Mesh(mergeGeometries(parts), new THREE.MeshLambertMaterial({ map: woodTexture('#7a4f33') })));
    scene.add(new THREE.Mesh(mergeGeometries(metal), poleMat));
  }

  // ---------- luciérnagas ----------
  {
    const n = tier.fireflies;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = 2 + Math.sqrt(r()) * 32;
      pos.set([Math.sin(a) * d, 0.4 + r() * 4, Math.cos(a) * d - 4], i * 3);
      seed[i] = r();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const flies = new THREE.Points(geo, new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime, uScale: { value: 1 } },
      vertexShader: `attribute float seed; uniform float uTime; uniform float uScale; varying float vA;
        void main(){
          vec3 p = position;
          float t = uTime * (0.25 + seed * 0.3) + seed * 40.0;
          p.x += sin(t) * 1.4 + sin(t * 2.3) * 0.3;
          p.y += sin(t * 1.7 + seed * 8.0) * 0.5;
          p.z += cos(t * 0.8) * 1.4;
          vA = pow(0.5 + 0.5 * sin(uTime * (1.2 + seed * 1.8) + seed * 30.0), 2.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float dist = -mv.z;
          vA *= smoothstep(0.6, 2.5, dist);
          gl_PointSize = clamp(uScale * (0.05 + seed * 0.035) / max(dist, 0.1), 1.0, 26.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5);
          float g = smoothstep(0.5, 0.0, d); g *= g; gl_FragColor = vec4(vec3(1.0, 0.68, 0.25) * 1.9, g * vA); }`,
    }));
    flies.frustumCulled = false;
    scene.add(flies);
    const resize = () => { flies.material.uniforms.uScale.value = innerHeight * Math.min(devicePixelRatio, 2); };
    resize();
    addEventListener('resize', resize);
  }

  // Sombras de contacto (todas en un solo dibujo).
  {
    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false, opacity: 0.85 }),
      blobs.length + 40,
    );
    const m = new THREE.Object3D();
    blobs.forEach(([x, z, sx, sz], i) => {
      m.position.set(x, 0.02, z);
      m.scale.set(sx, 1, sz);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.count = blobs.length;
    mesh.renderOrder = 1;
    scene.add(mesh);
  }

  return { colliders, animated, walkable };
}
