// El jardín: cielo con luna y estrellas, colinas, pasto con viento, flores, árboles, cerco de ligustros,
// camino con balizas, faroles, bancos y luciérnagas. Todo procedural (sin modelos ni imágenes externas).
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { grassTexture, stoneTexture, woodTexture, floorTexture, glowTexture, blobShadowTexture, moonTexture, lanternTexture } from './textures.js';
import { marigoldGeometry, marigoldMaterial, buildPueblo, PALETTE } from './muertos.js';

// Plano del jardín (en metros). Todo lo demás se ubica a partir de estos números.
export const HALL_CENTER = new THREE.Vector3(0, 0, -14);
// El salón es grande: con la cámara en tercera persona tiene que sentirse amplio (antes 11,5).
export const HALL_RADIUS = 21;
const HK = HALL_RADIUS / 11.5; // cuánto creció (para lo que estaba medido con el salón viejo)
export const GARDEN_RADIUS = 58;
// Llegás del otro lado del río y cruzás el Puente del Arcoíris para entrar al jardín.
export const SPAWN = new THREE.Vector3(0, 1.6, 50);
export const PATH_HALF = 1.6;
export const CREEK_Z = 40;
export const CREEK_HALF = 2.8; // medio ancho del río
// El Prado de los espíritus: un claro sin árboles donde juegan las mascotas de luz.
export const MEADOW = new THREE.Vector3(24, 0, 20);
export const MEADOW_R = 9;
// El ascensor (al costado de la entrada del salón): sin árboles adelante para que se vea.
export const ELEVATOR_POS = new THREE.Vector3(-9.5, 0, 17);
// El río serpentea (dos ondas, para que no se vea dibujado con regla).
export const creekZ = (x) => CREEK_Z + Math.sin(x * 0.07) * 3.2 + Math.sin(x * 0.19 + 1) * 0.9;
// El Puente del Arcoíris: la única forma de cruzar el río (entrar y salir del jardín).
export const BRIDGE = { x: 0, z: CREEK_Z + Math.sin(1) * 0.9, halfW: 1.05, halfL: 4.3, arch: 1.0 };
export const onBridge = (x, z, pad = 0) => Math.abs(x - BRIDGE.x) < BRIDGE.halfW + pad && Math.abs(z - BRIDGE.z) < BRIDGE.halfL + pad;
// ¿Está del lado de afuera (antes de cruzar el río)?
export const outside = (x, z) => z > creekZ(x) + CREEK_HALF * 0.5;
// En el agua (no se puede caminar, salvo por el puente).
export const inWater = (x, z) => Math.abs(z - creekZ(x)) < CREEK_HALF + 0.15 && !onBridge(x, z, -0.12);
// Altura del piso donde se camina: el arco del puente y el piso de madera del salón.
export function groundY(x, z) {
  if (onBridge(x, z, 0.15)) {
    const k = (z - (BRIDGE.z - BRIDGE.halfL)) / (BRIDGE.halfL * 2);
    return Math.sin(Math.min(1, Math.max(0, k)) * Math.PI) * BRIDGE.arch + 0.13;
  }
  return 0;
}
export const nearCreek = (x, z, pad = 0) => Math.abs(z - creekZ(x)) < CREEK_HALF + 0.6 + pad;

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

// Donde empieza el camino (justo afuera del piso del salón).
export const PATH_START = HALL_CENTER.z + HALL_RADIUS + 2;

export function insideHall(x, z, pad = 0) {
  return Math.hypot(x - HALL_CENTER.x, z - HALL_CENTER.z) < HALL_RADIUS + 1.6 + pad;
}
// Caminito al ascensor: sale del camino principal y llega a la puerta de la torre
// (la torre mira hacia el camino con este ángulo, igual que en elevator.js).
const ELEV_RY = Math.atan2(-ELEVATOR_POS.x, 6);
const ELEV_DIR = new THREE.Vector3(Math.sin(ELEV_RY), 0, Math.cos(ELEV_RY));
export const ELEV_PATH_B = ELEVATOR_POS.clone().addScaledVector(ELEV_DIR, 2.2);
export const ELEV_PATH_A = ELEV_PATH_B.clone().addScaledVector(ELEV_DIR, (-PATH_HALF + 0.3 - ELEV_PATH_B.x) / ELEV_DIR.x);
const ELEV_PATH_HALF = 0.95;
function onElevatorPath(x, z, pad = 0) {
  const ax = ELEV_PATH_A.x, az = ELEV_PATH_A.z, bx = ELEV_PATH_B.x, bz = ELEV_PATH_B.z;
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t)) < ELEV_PATH_HALF + pad;
}
export function onPath(x, z, pad = 0) {
  return (Math.abs(x) < PATH_HALF + pad && z > HALL_CENTER.z + HALL_RADIUS - 1 && z < SPAWN.z + 6) || onElevatorPath(x, z, pad);
}

export function buildWorld(scene, tier) {
  const colliders = { segments: [], circles: [], up: false };
  // Lo que está en el suelo del jardín: en los pisos de arriba se esconde (el salón queda sobre las nubes).
  const groundRoot = new THREE.Group();
  groundRoot.name = 'suelo-del-jardin';
  scene.add(groundRoot);
  const animated = [];
  const walkable = [];
  const r = rand(7);

  scene.fog = new THREE.FogExp2('#2a1640', 0.0085);
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
        uK: { value: 0 },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 horizon; uniform float uK; varying vec3 vP;
        void main(){
          float h = vP.y;
          vec3 c = mix(mid, top, smoothstep(0.18, 0.75, h));
          c = mix(low, c, smoothstep(0.02, 0.2, h));
          c = mix(horizon, c, smoothstep(-0.04, 0.07, h));
          // Resplandor del atardecer hacia el oeste.
          float sunset = pow(max(0.0, dot(normalize(vec3(-0.2, 0.0, -1.0)), normalize(vec3(vP.x, 0.0, vP.z)))), 6.0);
          c += vec3(0.45, 0.18, 0.06) * sunset * (1.0 - smoothstep(0.0, 0.35, h)) * (1.0 - uK);
          float band = smoothstep(0.25, 0.45, h) * (1.0 - smoothstep(0.45, 0.75, h));
          float wave = sin(atan(vP.z, vP.x) * 5.0 + h * 9.0) * 0.5 + 0.5;
          c += mix(vec3(0.25, 0.04, 0.18), vec3(0.04, 0.16, 0.18), wave) * band * 0.55 * (1.0 - uK);
          // Arriba de todo: luz de cielo, más clara cerca del sol.
          float sun = pow(max(0.0, dot(normalize(vP), normalize(vec3(0.35, 0.55, -0.75)))), 12.0);
          c += vec3(1.0, 0.95, 0.85) * sun * 0.55 * uK;
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
      uniforms: { uTime, uFade: { value: 1 } },
      vertexShader: `attribute float seed; uniform float uTime; uniform float uFade; varying float vA; varying float vS;
        void main(){ vA = (0.45 + 0.55 * sin(uTime * (0.6 + seed * 2.4) + seed * 60.0)) * uFade;
          vA *= smoothstep(0.05, 0.35, normalize(position).y);
          vS = seed;
          // Las más grandes son destellos de cuatro puntas.
          gl_PointSize = seed > 0.93 ? 9.0 + seed * 7.0 : 1.4 + seed * seed * 2.8;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying float vA; varying float vS; void main(){
          vec2 q = gl_PointCoord - 0.5;
          float d = length(q);
          float a;
          if (vS > 0.93) {
            vec2 aq = abs(q);
            float cross = max(exp(-aq.x * 46.0 - aq.y * 5.0), exp(-aq.y * 46.0 - aq.x * 5.0));
            a = cross + exp(-d * d * 120.0);
          } else {
            if (d > 0.5) discard;
            a = smoothstep(0.5, 0.0, d);
          }
          vec3 gold = vec3(1.25, 1.02, 0.6);
          vec3 white = vec3(1.25, 1.2, 1.1);
          gl_FragColor = vec4(mix(white, gold, step(0.6, vS)), vA * a); }`,
    }));
    stars.renderOrder = -9;
    scene.add(stars);
    sky.userData.stars = stars;
  }

  // Luna.
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(), fog: false, depthWrite: false, transparent: true, color: new THREE.Color(1.6, 1.55, 1.45) }));
  moon.position.set(-150, 150, -300);
  moon.scale.setScalar(70);
  moon.renderOrder = -8;
  scene.add(moon);

  // ---------- luces generales ----------
  const hemi = new THREE.HemisphereLight('#a184d8', '#2c2414', 1.3);
  scene.add(hemi);
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
  groundRoot.add(ground);
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
    groundRoot.add(hills);
    groundRoot.add(buildPueblo(r));
  }

  // Camino: de piedra adentro del jardín y de tierra afuera (cortado por el río y el puente).
  const pathPiece = (z0, z1, tex, color, edgeColor) => {
    const len = z1 - z0;
    tex.repeat.set(1, len / 4);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PATH_HALF * 2, len), new THREE.MeshLambertMaterial({ map: tex, color }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0.012, (z0 + z1) / 2);
    mesh.name = 'ground';
    groundRoot.add(mesh);
    walkable.push(mesh);
    for (const s of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, len), new THREE.MeshLambertMaterial({ color: edgeColor }));
      edge.position.set(s * (PATH_HALF + 0.05), 0.04, mesh.position.z);
      groundRoot.add(edge);
    }
  };
  pathPiece(HALL_CENTER.z + HALL_RADIUS - 1, BRIDGE.z - BRIDGE.halfL + 0.25, stoneTexture(), '#ffffff', '#6d625a');
  pathPiece(BRIDGE.z + BRIDGE.halfL - 0.25, SPAWN.z + 6, stoneTexture(), '#8a7864', '#4a4038');
  // El caminito al ascensor, con dos farolitos de papel que lo marcan.
  {
    const d = ELEV_PATH_B.clone().sub(ELEV_PATH_A);
    const len = d.length();
    const g = new THREE.Group();
    g.position.copy(ELEV_PATH_A).addScaledVector(d, 0.5);
    g.rotation.y = Math.atan2(d.x, d.z);
    const tex = stoneTexture();
    tex.repeat.set(0.6, len / 4);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ELEV_PATH_HALF * 2, len), new THREE.MeshLambertMaterial({ map: tex }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.016;
    mesh.name = 'ground';
    g.add(mesh);
    walkable.push(mesh);
    for (const s of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, len), new THREE.MeshLambertMaterial({ color: '#6d625a' }));
      edge.position.set(s * (ELEV_PATH_HALF + 0.04), 0.035, 0);
      g.add(edge);
      // Farolito de papel colgado de un poste curvo, a cada lado.
      const z = s * len * 0.18;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.7, 8), new THREE.MeshLambertMaterial({ color: '#3a2a22' }));
      post.position.set(s * (ELEV_PATH_HALF + 0.35), 0.85, z);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), post.material);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(s * (ELEV_PATH_HALF + 0.15), 1.68, z);
      const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.3, 10, 1, true), new THREE.MeshBasicMaterial({ map: lanternTexture(), color: new THREE.Color(2.2, 1.2, 0.6), side: THREE.DoubleSide }));
      lan.position.set(s * (ELEV_PATH_HALF - 0.05), 1.42, z);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6, color: new THREE.Color(1.3, 0.75, 0.4) }));
      glow.scale.setScalar(1.3);
      glow.position.copy(lan.position);
      g.add(post, arm, lan, glow);
      const wp = new THREE.Vector3(s * (ELEV_PATH_HALF + 0.35), 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y).add(g.position);
      colliders.circles.push({ x: wp.x, z: wp.z, r: 0.12, ground: true });
    }
    groundRoot.add(g);
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
      if (outside(x, z)) tint.setHSL(0.36 + r() * 0.06, 0.12 + r() * 0.08, 0.22 + r() * 0.1);
      else tint.setHSL(0.22 + r() * 0.08, 0.35 + r() * 0.2, 0.45 + r() * 0.2);
      grass.setColorAt(placed, tint);
      placed++;
    }
    grass.count = placed;
    grass.frustumCulled = false;
    groundRoot.add(grass);
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
      if (onPath(x, z, 0.3) || insideHall(x, z, 0.2) || nearCreek(x, z, 0.3) || outside(x, z) || Math.hypot(x, z) > GARDEN_RADIUS - 1) continue;
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
    groundRoot.add(flowers);
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
    for (let i = 0; i < 1200 && placed < 64; i++) {
      const a = r() * Math.PI * 2;
      const d = HALL_RADIUS + 5 + r() * (GARDEN_RADIUS - HALL_RADIUS + 4);
      const x = HALL_CENTER.x + Math.sin(a) * d;
      const z = HALL_CENTER.z + Math.cos(a) * d;
      if (Math.abs(x) < 5 && z > -2) continue;
      if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 6) continue;
      if (Math.hypot(x - MEADOW.x, z - MEADOW.z) < MEADOW_R + 2.5) continue;
      if (Math.hypot(x - ELEVATOR_POS.x, z - ELEVATOR_POS.z) < 6) continue;
      if (Math.hypot(x - BRIDGE.x, z - BRIDGE.z) < 9) continue;
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
      colliders.circles.push({ x, z, r: 0.5, ground: true });
      addBlob(x, z, 4.2);
      placed++;
    }
    const trunks = new THREE.Mesh(mergeGeometries(trunkParts.map((g) => g.toNonIndexed())), new THREE.MeshLambertMaterial({ color: '#4a3223', flatShading: true }));
    groundRoot.add(trunks);
    const leaves = new THREE.Mesh(mergeGeometries(leafParts), withWind(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 'leaves',
      `float k = max(0.0, position.y - 2.0);
       transformed.x += sin(uTime * 0.9 + position.x * 0.25 + position.z * 0.15) * 0.04 * k;
       transformed.z += cos(uTime * 0.75 + position.z * 0.2) * 0.03 * k;`));
    groundRoot.add(leaves);
  }

  // Cerco de ligustros alrededor del jardín y siluetas de árboles detrás.
  {
    const parts = [];
    const n = Math.round(GARDEN_RADIUS * 4.2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.01;
      const rad = GARDEN_RADIUS + 1.2 + r() * 0.4;
      const g = lumpy(1.1 + r() * 0.5, 1, r, 0.2);
      g.scale(1, 1.1 + r() * 0.5, 1);
      g.translate(Math.sin(a) * rad, 0.8 + r() * 0.3, Math.cos(a) * rad);
      parts.push(paint(g, ['#2f4a2b', '#38552f', '#2a4226'][i % 3]));
    }
    for (let i = 0; i < 140; i++) {
      const a = r() * Math.PI * 2;
      const rad = GARDEN_RADIUS + 7 + r() * 28;
      const h = 7 + r() * 9;
      const g = new THREE.ConeGeometry(1.8 + r() * 1.6, h, 7).toNonIndexed();
      g.deleteAttribute('uv');
      g.translate(Math.sin(a) * rad, h / 2, Math.cos(a) * rad);
      parts.push(paint(g, r() < 0.5 ? '#1f2d22' : '#25332a'));
    }
    const hedge = new THREE.Mesh(mergeGeometries(parts), withWind(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 'hedge',
      'transformed.x += sin(uTime * 0.6 + position.z * 0.1) * 0.03 * max(0.0, position.y - 1.0);'));
    groundRoot.add(hedge);
  }

  // ---------- faroles ----------
  const poleMat = new THREE.MeshLambertMaterial({ color: '#1d1a1c' });
  const glassMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.0, 0.9) });
  const lampSpots = [
    [2.7, 31], [-2.7, 25.5], [2.7, 20], [-2.7, 15], [2.7, 10],
    [HALL_CENTER.x - 5.5 * HK, HALL_CENTER.z + 5.5 * HK], [HALL_CENTER.x + 5.5 * HK, HALL_CENTER.z + 5.5 * HK],
    [HALL_CENTER.x - 6.5 * HK, HALL_CENTER.z - 4.5 * HK], [HALL_CENTER.x + 6.5 * HK, HALL_CENTER.z - 4.5 * HK],
  ];
  const lampParts = [];
  const hallLampParts = [];
  const PATH_LAMPS = 5;
  const lightOrder = [6, 5, 2, 4, 0, 7, 8, 3, 1]; // prioridad de luces reales (primero las del salón)
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
    (i < PATH_LAMPS ? lampParts : hallLampParts).push(base, pole, cap, collar);
    const into = i < PATH_LAMPS ? groundRoot : scene;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), glassMat);
    glass.position.set(x, 3.27, z);
    into.add(glass);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: tier.bloom ? 0.35 : 0.75 }));
    glow.scale.setScalar(tier.bloom ? 1.4 : 2);
    glow.position.set(x, 3.27, z);
    into.add(glow);
    colliders.circles.push({ x, z, r: 0.25, ground: i < PATH_LAMPS });
    addBlob(x, z, 0.9);
    const rank = lightOrder.indexOf(i);
    if (rank >= 0 && rank < tier.lights) {
      const l = new THREE.PointLight('#ffb36b', 5, 11, 1.7);
      l.position.set(x, 3.0, z);
      into.add(l);
    }
  });
  groundRoot.add(new THREE.Mesh(mergeGeometries(lampParts.map((g) => g.toNonIndexed())), poleMat));
  scene.add(new THREE.Mesh(mergeGeometries(hallLampParts.map((g) => g.toNonIndexed())), poleMat));

  // Balizas a los lados del camino.
  {
    const posts = [];
    for (let z = PATH_START; z < SPAWN.z + 4; z += 3.2) {
      for (const s of [-1, 1]) {
        const x = s * (PATH_HALF + 0.35);
        if (Math.abs(z + (s > 0 ? 1.6 : 0) - BRIDGE.z) < BRIDGE.halfL + 1.4) continue;
        const g = new THREE.CylinderGeometry(0.06, 0.07, 0.42, 8);
        g.translate(x, 0.21, z + (s > 0 ? 1.6 : 0));
        posts.push(g);
      }
    }
    groundRoot.add(new THREE.Mesh(mergeGeometries(posts.map((g) => g.toNonIndexed())), poleMat));
    const tops = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.9, 1.5, 0.6) }), posts.length);
    const m = new THREE.Object3D();
    let i = 0;
    for (let z = PATH_START; z < SPAWN.z + 4; z += 3.2) {
      for (const s of [-1, 1]) {
        if (Math.abs(z + (s > 0 ? 1.6 : 0) - BRIDGE.z) < BRIDGE.halfL + 1.4) continue;
        m.position.set(s * (PATH_HALF + 0.35), 0.46, z + (s > 0 ? 1.6 : 0));
        m.updateMatrix();
        tops.setMatrixAt(i++, m.matrix);
      }
    }
    tops.count = i;
    groundRoot.add(tops);
  }

  // ---------- bancos ----------
  {
    const parts = [];
    const metal = [];
    const benchSpots = [[-3.8, 29, Math.PI / 2], [3.8, 26, -Math.PI / 2], [-3.8, 32.5, Math.PI / 2], [3.8, 14, -Math.PI / 2]];
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
      colliders.circles.push({ x, z, r: 0.85, ground: true });
      addBlob(x, z, 2.2, 1.2);
    }
    groundRoot.add(new THREE.Mesh(mergeGeometries(parts), new THREE.MeshLambertMaterial({ map: woodTexture('#7a4f33') })));
    groundRoot.add(new THREE.Mesh(mergeGeometries(metal), poleMat));
  }

  // ---------- luciérnagas ----------
  {
    const n = tier.fireflies;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = 2 + Math.sqrt(r()) * GARDEN_RADIUS * 0.85;
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
    sky.userData.flies = flies;
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
    groundRoot.add(mesh);
  }

  const fog = scene.fog;
  return { colliders, animated, walkable, ground: groundRoot, deck, sky, stars: sky.userData.stars, moon, hemi, moonLight, warmFill, fog, flies: sky.userData.flies };
}
