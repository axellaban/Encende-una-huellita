// Espíritus de mascotas: un cuerpo procedural con esqueleto (una sola malla por mascota) y un animador
// que mezcla marchas (paso, trote, galope, saltitos) con acciones (sentarse, echarse, reverencia de
// juego, pararse en dos patas, olfatear, sacudirse, rodar, saltar). Todo en código, sin modelos.
//
// Convención: la mascota mira hacia +Z; `group.rotation.y` es su rumbo (adelante = (sin h, 0, cos h)).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowTexture } from './textures.js';
import { FURS } from '../../server/looks.js';

export { FURS };
const RIMS = ['#8ff3ff', '#ffb3e6', '#ffe08a', '#b9a6ff', '#9dffc8', '#ffc29a'];

const hash = (s) => {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
};
const seq = (seed) => {
  let s = Math.floor(seed * 4294967296) >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
};

// Cómo se ve el espíritu de una huellita: lo que eligió la familia, o algo estable a partir de su id.
export function lookFor(m) {
  const r = seq(hash(m.id || m.name || 'x'));
  const kind = m.species === 'gato' ? 'gato' : m.species === 'otro' ? 'otro' : 'perro';
  const l = m.look || {};
  const fur = FURS.find((f) => f.id === l.fur)?.hex || FURS[Math.floor(r() * FURS.length)].hex;
  const ears = ['up', 'down', 'tip'].includes(l.ears) ? l.ears : kind === 'perro' ? ['down', 'up', 'tip'][Math.floor(r() * 3)] : 'up';
  // Tamaños bien distintos (de un perrito mini a uno gigante); los gatos y los otros, más chicos.
  const SIZE_SCALE = {
    perro: { xs: 0.5, s: 0.68, m: 0.9, l: 1.15, xl: 1.42 },
    gato: { xs: 0.58, s: 0.68, m: 0.8, l: 0.92, xl: 1.06 },
    otro: { xs: 0.45, s: 0.55, m: 0.65, l: 0.78, xl: 0.92 },
  };
  const size = SIZE_SCALE[kind][l.size] || (kind === 'gato' ? 0.78 : kind === 'otro' ? 0.6 : 0.72 + r() * 0.4);
  return {
    kind,
    fur,
    ears,
    size,
    tail: kind === 'gato' ? 'thin' : r() < 0.45 ? 'fluffy' : r() < 0.5 ? 'curl' : 'thin',
    pattern: l.pattern || (r() < 0.35 ? 'tuxedo' : r() < 0.3 ? 'socks' : 'solid'),
    snout: kind === 'perro' ? 0.85 + r() * 0.45 : 0.4,
    rim: RIMS[Math.floor(r() * RIMS.length)],
    seed: r(),
  };
}

const smooth = (k) => k * k * (3 - 2 * k);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, k) => a + (b - a) * k;
const TAU = Math.PI * 2;

function spiritMaterial(rim) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const u = { uRim: { value: new THREE.Color(rim) }, uPulse: { value: 0 }, uInner: { value: 0.24 } };
  mat.userData.u = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = `attribute float aGlow;\nvarying float vGlow;\n${sh.vertexShader}`.replace('#include <color_vertex>', '#include <color_vertex>\n  vGlow = aGlow;');
    sh.fragmentShader = `uniform vec3 uRim; uniform float uPulse; uniform float uInner; varying float vGlow;\n${sh.fragmentShader}`.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float fres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 2.8);
       totalEmissiveRadiance += diffuseColor.rgb * (uInner + vGlow) + uRim * fres * (0.95 + uPulse);
       // Brillo de pelaje: luz suave de arriba y un leve ruido como pelitos.
       float sheen = pow(max(0.0, normal.y), 3.0) * 0.18;
       float fuzz = fract(sin(dot(floor(vViewPosition.xy * 220.0), vec2(12.9898, 78.233))) * 43758.5453);
       totalEmissiveRadiance += diffuseColor.rgb * (sheen + (fuzz - 0.5) * 0.06);`,
    );
  };
  mat.customProgramCacheKey = () => 'spirit-pet-2';
  return mat;
}

// ---------- el cuerpo ----------
export function createPet(look) {
  const s = look.size;
  const cat = look.kind === 'gato';
  const bunny = look.kind === 'otro';
  const bones = [];
  const bone = (name, parent, x, y, z) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x * s, y * s, z * s);
    parent?.add(b);
    bones.push(b);
    return b;
  };
  const torsoR = cat ? 0.105 : bunny ? 0.15 : 0.135;
  const H = bunny ? 0.3 : cat ? 0.36 : 0.425;
  const legU = bunny ? 0.12 : cat ? 0.17 : 0.2;
  const legL = bunny ? 0.12 : cat ? 0.15 : 0.18;
  const bodyL = bunny ? 0.2 : cat ? 0.32 : 0.34;

  const root = bone('root', null, 0, 0, 0);
  const hips = bone('hips', root, 0, H, -bodyL / 2);
  const chest = bone('chest', hips, 0, 0.02, bodyL);
  const neck = bone('neck', chest, 0, 0.07, 0.1);
  const head = bone('head', neck, 0, bunny ? 0.1 : 0.15, 0.05);
  const eyes = bone('eyes', head, 0, 0.03, 0.08);
  const earL = bone('earL', head, 0.07, 0.08, -0.01);
  const earR = bone('earR', head, -0.07, 0.08, -0.01);
  const tongue = bone('tongue', head, 0, -0.065, 0.12 + (look.snout - 1) * 0.06);
  const tail = [];
  const tailLen = (cat ? 0.5 : bunny ? 0.05 : look.tail === 'curl' ? 0.26 : 0.32) / 5;
  let tp = bone('tail0', hips, 0, 0.07, -0.13);
  tail.push(tp);
  for (let i = 1; i < 5; i++) { tp = bone(`tail${i}`, tp, 0, 0, -tailLen); tail.push(tp); }
  const legs = [];
  for (const [front, side] of [[1, 1], [1, -1], [0, 1], [0, -1]]) {
    const parent = front ? chest : hips;
    const up = bone(`leg${front ? 'F' : 'H'}${side > 0 ? 'L' : 'R'}`, parent, side * (cat ? 0.06 : 0.075), front ? -0.06 : -0.03, front ? 0.04 : -0.02);
    const lo = bone('lower', up, 0, -legU, 0);
    const paw = bone('paw', lo, 0, -legL, 0);
    legs.push({ up, lo, paw, front, side });
  }
  root.updateMatrixWorld(true);
  const at = (b, ox = 0, oy = 0, oz = 0) => b.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(ox * s, oy * s, oz * s));

  // Colores.
  const F = new THREE.Color(look.fur);
  const hsl = {};
  F.getHSL(hsl);
  const light = F.clone().lerp(new THREE.Color('#fff6ea'), hsl.l < 0.3 ? 0.25 : 0.42);
  const white = new THREE.Color('#fbf6ee');
  const dark = new THREE.Color('#1c1512');
  const pink = new THREE.Color('#f08aa0');
  const belly = look.pattern === 'tuxedo' ? white : light;

  const parts = [];
  const add = (geo, b, color, glow = 0) => {
    let g = geo.index ? geo.toNonIndexed() : geo;
    g.deleteAttribute('uv');
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count;
    const p = g.attributes.position;
    const nr = g.attributes.normal;
    const col = new Float32Array(n * 3);
    const si = new Uint16Array(n * 4);
    const sw = new Float32Array(n * 4);
    const gl = new Float32Array(n);
    const bi = bones.indexOf(b);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      if (typeof color === 'function') c.copy(color(p.getX(i), p.getY(i), p.getZ(i), nr.getX(i), nr.getY(i), nr.getZ(i)));
      else c.copy(color);
      c.toArray(col, i * 3);
      si[i * 4] = bi;
      sw[i * 4] = 1;
      gl[i] = glow;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.setAttribute('aGlow', new THREE.BufferAttribute(gl, 1));
    parts.push(g);
  };
  // Más segmentos: el espíritu se ve suave de cerca (cuando lo paseás, la cámara está a 3 m).
  const sphere = (r, sx = 1, sy = 1, sz = 1, seg = 14) => new THREE.SphereGeometry(r * s, Math.round(seg * 1.45), Math.max(8, Math.round((seg - 4) * 1.45))).scale(sx, sy, sz);
  const capsule = (r, len, seg = 10) => new THREE.CapsuleGeometry(r * s, len * s, 6, Math.round(seg * 1.5));
  const place = (g, v, rx = 0, ry = 0, rz = 0) => { g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(v.x, v.y, v.z); return g; };
  const bellyShade = (x, y, z, nx, ny) => (ny < -0.25 ? belly : F.clone().lerp(belly, clamp01((-ny - 0.05) * 2.5)));
  const chestShade = (x, y, z, nx, ny, nz) => (look.pattern === 'tuxedo' && nz > 0.35 && ny < 0.5 ? white : bellyShade(x, y, z, nx, ny));

  // Torso: cadera y pecho se superponen para que la columna pueda doblarse sin costuras.
  add(place(capsule(torsoR, bodyL * 0.55), at(hips, 0, 0, bodyL * 0.22), Math.PI / 2), hips, bellyShade);
  add(place(sphere(torsoR * 1.12, 1, 1.05, 1.18), at(chest, 0, 0, -0.03)), chest, chestShade);
  if (bunny) add(place(sphere(0.16, 1.05, 1, 1.1), at(hips, 0, 0.01, 0.02)), hips, bellyShade);
  // Cuello y cabeza.
  add(place(capsule(cat ? 0.06 : 0.075, 0.1), at(neck, 0, 0.06, 0.02), 0.65), neck, chestShade);
  const headR = cat ? 0.105 : bunny ? 0.11 : 0.12;
  add(place(sphere(headR, 1, 0.95, 1.02, 18), at(head)), head, (x, y, z, nx, ny) => (ny < -0.5 ? light : F));
  if (!bunny) {
    // Hocico: un óvalo que se afina hacia la nariz (no un tubo).
    const sl = cat ? 0.02 : 0.085 * look.snout;
    const sr = cat ? 0.05 : 0.064;
    const muzzle = (x, y, z, nx, ny) => (ny < 0.15 ? light : F.clone().lerp(light, 0.25));
    add(place(sphere(sr, 0.92, 0.78, 1 + sl / sr * 0.9, 14), at(head, 0, -0.04, headR * 0.62 + sl * 0.55)), head, muzzle);
    if (!cat) add(place(sphere(0.05, 1.05, 0.5, 1.1, 10), at(head, 0, -0.075, headR * 0.55 + sl * 0.45)), head, light);
    add(place(sphere(cat ? 0.016 : 0.026, 1.25, 0.8, 0.9, 10), at(head, 0, -0.02 + (cat ? 0.005 : 0), headR * 0.62 + sl * 1.05 + sr * 0.82)), head, cat ? pink : dark, 0.05);
    // Brillito en la nariz húmeda.
    if (!cat) add(place(sphere(0.008, 1.4, 0.7, 1, 6), at(head, 0.006, -0.008, headR * 0.62 + sl * 1.05 + sr * 0.82 + 0.018)), head, white, 0.9);
  } else {
    add(place(sphere(0.05, 1.2, 0.9, 1), at(head, 0, -0.03, 0.085)), head, light);
    add(place(sphere(0.014), at(head, 0, -0.01, 0.13)), head, pink, 0.1);
  }
  // Mejillas esponjosas.
  if (look.tail === 'fluffy' || cat) for (const sd of [-1, 1]) add(place(sphere(0.05, 1, 0.8, 1), at(head, sd * 0.07, -0.05, 0.03)), head, light);
  // Ojos grandes y vivos: iris de color (ámbar en los gatos, marrón miel en los perros), pupila
  // (rasgada en los gatos), un brillo grande y otro chiquito.
  const eyeR = cat ? 0.028 : 0.029;
  const iris = new THREE.Color(cat ? '#d9a13a' : bunny ? '#3a2a2a' : '#7a4a22');
  for (const sd of [-1, 1]) {
    add(place(sphere(eyeR, 1, 1.1, 0.7, 12), at(eyes, sd * 0.052, 0, headR * 0.15)), eyes, iris, 0.12);
    add(place(sphere(eyeR * 0.68, cat ? 0.42 : 1, 1.1, 0.6, 10), at(eyes, sd * 0.052, 0, headR * 0.15 + 0.008)), eyes, dark, 0.02);
    add(place(sphere(0.0095, 1, 1, 1, 6), at(eyes, sd * 0.052 + 0.009, 0.012, headR * 0.15 + 0.019)), eyes, white, 1.6);
    add(place(sphere(0.0045, 1, 1, 1, 6), at(eyes, sd * 0.052 - 0.008, -0.009, headR * 0.15 + 0.02)), eyes, white, 1.2);
  }
  // Bigotes de gato: tres de cada lado.
  if (cat) {
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
      const w = capsule(0.0018, 0.075, 4);
      w.rotateZ(Math.PI / 2 + sd * (0.12 - k * 0.12));
      w.rotateY(sd * 0.35);
      add(place(w, at(head, sd * 0.075, -0.045 - k * 0.006, headR * 0.72)), head, white, 0.6);
    }
  }
  // Pechera esponjosa en los de pelo largo.
  if (look.tail === 'fluffy' || cat) {
    for (let k = 0; k < 4; k++) add(place(sphere(0.045, 1, 1.1, 0.7, 10), at(chest, (k - 1.5) * 0.03, -0.03 - Math.abs(k - 1.5) * 0.015, 0.1)), chest, light);
  }
  // Orejas.
  const innerEar = (x, y, z, nx, ny, nz) => (nz > 0.2 ? pink.clone().lerp(F, 0.35) : F);
  for (const [eb, sd] of [[earL, 1], [earR, -1]]) {
    if (bunny) add(place(sphere(0.045, 0.5, 2.6, 0.32), at(eb, sd * 0.0, 0.1, 0), 0, 0, -sd * 0.12), eb, innerEar);
    else if (look.ears === 'down') add(place(sphere(0.052, 0.34, 1.55, 0.85), at(eb, sd * 0.02, -0.062, -0.005), 0.12, 0, sd * 0.14), eb, F.clone().multiplyScalar(0.8));
    else {
      const big = cat ? 1.05 : 1;
      const g = new THREE.ConeGeometry(0.048 * s * big, 0.12 * s * big, 4, 1);
      g.scale(1, 1, 0.45);
      add(place(g, at(eb, 0, 0.05, 0), look.ears === 'tip' ? 0.5 : 0, Math.PI / 4, -sd * 0.22), eb, innerEar);
    }
  }
  // Lengua (se ve al jadear).
  add(place(capsule(0.024, 0.04, 8).scale(1, 1, 0.45), at(tongue, 0, -0.03, 0.01), -0.3), tongue, pink, 0.15);
  // Cola.
  tail.forEach((b, i) => {
    let r = cat ? 0.024 - i * 0.002 : look.tail === 'fluffy' ? 0.062 - i * 0.004 : 0.04 - i * 0.004;
    if (bunny) r = i === 0 ? 0.065 : 0.001;
    const g = i === 0 && bunny ? sphere(r) : capsule(Math.max(0.004, r), tailLen * 0.8, 8);
    if (!(i === 0 && bunny)) g.rotateX(Math.PI / 2);
    add(place(g, at(b, 0, 0, -tailLen * 0.5)), b, i === 4 && look.pattern !== 'solid' ? white : bunny ? white : F.clone().lerp(light, i / 8));
  });
  // Patas.
  for (const L of legs) {
    const sock = look.pattern === 'socks' || look.pattern === 'tuxedo';
    const thick = L.front ? (cat ? 0.034 : 0.044) : cat ? 0.05 : 0.06;
    if (L.front) add(place(capsule(thick, legU * 0.75), at(L.up, 0, -legU / 2, 0)), L.up, F);
    else add(place(sphere(thick * 1.25, 0.9, 1.6, 1.05), at(L.up, 0, -legU * 0.38, 0.0)), L.up, bellyShade);
    add(place(capsule(thick * 0.72, legL * 0.85), at(L.lo, 0, -legL / 2, 0)), L.lo, sock ? F.clone().lerp(white, 0.4) : F);
    add(place(sphere(0.042 * (cat ? 0.85 : 1), 1, 0.55, 1.35, 10), at(L.paw, 0, 0.012, 0.016)), L.paw, sock ? white : F.clone().lerp(dark, 0.15), 0.12);
  }

  // Collar de cuero con medallita dorada (los perros; para engancharle la correa).
  if (!bunny) {
    const nk = at(neck, 0, 0.035, 0.02);
    const collar = new THREE.TorusGeometry((cat ? 0.066 : 0.084) * s, 0.016 * s, 8, 24);
    collar.rotateX(Math.PI / 2 - 0.65);
    collar.translate(nk.x, nk.y, nk.z);
    add(collar, neck, new THREE.Color(cat ? '#d6246e' : '#b5302a'), 0.05);
    const tag = new THREE.CylinderGeometry(0.022 * s, 0.022 * s, 0.006 * s, 14);
    tag.rotateX(Math.PI / 2 - 0.4);
    tag.translate(nk.x, nk.y - 0.07 * s, nk.z + 0.07 * s);
    add(tag, neck, new THREE.Color('#f4c55a'), 0.9);
  }
  const geo = mergeGeometries(parts);
  const mat = spiritMaterial(look.rim);
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.add(root);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.3 * s, 0), 1.1 * s);

  const group = new THREE.Group();
  group.add(mesh);
  // Aura y luz en el piso (en vez de sombra: es un espíritu).
  const rim = new THREE.Color(look.rim);
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: rim.clone().multiplyScalar(0.7), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.22 }));
  aura.scale.setScalar(1.25 * s);
  aura.position.y = 0.4 * s;
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTexture(), color: rim.clone().multiplyScalar(0.3), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  pool.scale.set(0.8 * s, 1, 1.05 * s);
  pool.position.y = 0.025;
  pool.renderOrder = 2;
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.6 * s, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.4 * s;
  group.add(aura, pool, hit);

  const pet = {
    look, group, mesh, hit, aura, pool, s, H,
    bones: { root, hips, chest, neck, head, eyes, earL, earR, tongue, tail, legs },
    // Dónde se engancha la correa (el collar), en coordenadas del mundo.
    collarWorld(v = new THREE.Vector3()) { return neck.localToWorld(v.set(0, 0.0, 0.09 * s)); },
    anim: null,
    mouthWorld(v = new THREE.Vector3()) { return head.localToWorld(v.set(0, -0.06 * s, (headR + (cat ? 0.05 : 0.1 * look.snout + 0.04)) * s)); },
    headWorld(v = new THREE.Vector3()) { return head.getWorldPosition(v); },
    pawWorld(i, v = new THREE.Vector3()) { return legs[i].paw.getWorldPosition(v); },
    setOpacity(o) {
      mesh.visible = o > 0.02;
      mat.transparent = o < 0.99;
      mat.opacity = o;
      aura.material.opacity = 0.22 * o;
      pool.material.opacity = o;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      aura.material.dispose();
      pool.material.dispose();
      pool.geometry.dispose();
      hit.geometry.dispose();
    },
  };
  pet.anim = createAnimator(pet);
  return pet;
}

// ---------- marchas ----------
// Orden de patas: [delantera izq, delantera der, trasera izq, trasera der].
const GAITS = {
  walk: { off: [0.25, 0.75, 0.0, 0.5], duty: 0.64, A: 0.3, B: 0.6, bob: 0.007, bobN: 2, pitch: 0.01, flex: 0.02, cycle: 0.6 },
  trot: { off: [0.0, 0.5, 0.5, 0.0], duty: 0.5, A: 0.48, B: 0.95, bob: 0.018, bobN: 2, pitch: 0.025, flex: 0.05, cycle: 0.95 },
  gallop: { off: [0.1, 0.0, 0.58, 0.5], duty: 0.36, A: 0.78, B: 1.25, bob: 0.05, bobN: 1, pitch: 0.12, flex: 0.2, cycle: 1.65 },
  hop: { off: [0.08, 0.08, 0.5, 0.5], duty: 0.4, A: 0.7, B: 1.1, bob: 0.07, bobN: 1, pitch: 0.16, flex: 0.18, cycle: 0.8 },
};

// Pose: números que se mezclan entre locomoción y acciones.
const POSE_KEYS = ['hipsY', 'hipsPitch', 'hipsRoll', 'chestPitch', 'chestRoll', 'neckPitch', 'neckYaw', 'headPitch', 'headYaw', 'headRoll',
  'tailCarry', 'tailCurl', 'tailAmp', 'tailFreq', 'rootY', 'rootPitch', 'earPerk', 'tongue'];
function newPose() {
  const p = { legs: new Float32Array(12) };
  for (const k of POSE_KEYS) p[k] = 0;
  return p;
}
function mixPose(a, b, k) {
  if (k <= 0.0001) return;
  for (const key of POSE_KEYS) a[key] = lerp(a[key], b[key], k);
  for (let i = 0; i < 12; i++) a.legs[i] = lerp(a.legs[i], b.legs[i], k);
}
function copyPose(a, b) {
  for (const key of POSE_KEYS) a[key] = b[key];
  a.legs.set(b.legs);
}

function createAnimator(pet) {
  const { s, H, look } = pet;
  const B = pet.bones;
  const bunny = look.kind === 'otro';
  const cat = look.kind === 'gato';
  for (const b of [B.neck, B.head]) b.rotation.order = 'YXZ';
  B.hips.rotation.order = 'YXZ';
  const REST = { fu: 0.04, fl: -0.06, hu: -0.32, hl: 0.66 };
  let phase = 0;
  let t = 0;
  let fatigue = 0;
  let blinkT = 1 + Math.random() * 3;
  let glanceT = 2;
  const glance = { yaw: 0, pitch: 0 };
  const ears = [{ a: 0, v: 0 }, { a: 0, v: 0 }];
  let lastHeadY = null;
  let lastHeadVy = 0;
  const w = { sit: 0, lie: 0, bow: 0, rear: 0, sniff: 0, carry: 0, tilt: 0 };
  const shot = { shake: -1, roll: -1, jump: -1, jumpH: 0.5, jumpD: 0.6, spinDir: 1 };
  const P = newPose();
  const Q = newPose();
  const tmp = new THREE.Vector3();
  const stepCbs = [];
  const lastP = [0, 0, 0, 0];
  const tl = new Float32Array(12);

  function legsFor(out, g, ph, amp) {
    for (let i = 0; i < 4; i++) {
      const p = (ph + g.off[i]) % 1;
      let sw;
      let bend;
      if (p < g.duty) { sw = 1 - 2 * (p / g.duty); bend = 0; } else {
        const k = (p - g.duty) / (1 - g.duty);
        sw = -1 + 2 * smooth(k);
        bend = Math.sin(Math.PI * k);
      }
      const front = i < 2;
      const u = (front ? REST.fu : REST.hu) - g.A * sw * amp * (front ? 1 : 0.92);
      const l = (front ? REST.fl : REST.hl) + g.B * bend * amp * (front ? 1 : 0.75);
      out[i * 3] = u;
      out[i * 3 + 1] = l;
      out[i * 3 + 2] = -(u + l) * (front ? 0.85 : 1) + 0.35 * bend * amp;
    }
  }

  // Locomoción + reposo. `st`: { speed, turn, look (Vector3 mundial|null), excite 0..1 }
  function base(dt, st) {
    const speed = st.speed;
    const k = (x, a, b) => clamp01((x - a) / (b - a));
    const sp = speed / s;
    let wg;
    if (bunny) wg = { walk: 0, trot: 0, gallop: 0, hop: 1 };
    else {
      const g = k(sp, 2.6, 3.6);
      const tr = k(sp, 1.0, 1.7) * (1 - g);
      wg = { walk: (1 - tr) * (1 - g), trot: tr, gallop: g, hop: 0 };
    }
    let cycle = 0;
    for (const n in wg) cycle += wg[n] * GAITS[n].cycle;
    phase = (phase + (speed * dt) / (cycle * s)) % 1;
    const amp = smooth(k(speed, 0.03, 0.35));
    P.legs.fill(0);
    let bob = 0;
    let pitch = 0;
    let flex = 0;
    for (const n in wg) {
      if (wg[n] < 0.001) continue;
      const g = GAITS[n];
      legsFor(tl, g, phase, amp);
      for (let i = 0; i < 12; i++) P.legs[i] += tl[i] * wg[n];
      bob += wg[n] * g.bob * Math.cos(TAU * g.bobN * phase);
      pitch += wg[n] * g.pitch * Math.sin(TAU * phase);
      flex += wg[n] * g.flex * Math.sin(TAU * phase + 0.6);
    }
    if (amp < 1) for (let i = 0; i < 4; i++) {
      const front = i < 2;
      const ru = front ? REST.fu : REST.hu;
      const rl = front ? REST.fl : REST.hl;
      P.legs[i * 3] = lerp(ru, P.legs[i * 3], amp);
      P.legs[i * 3 + 1] = lerp(rl, P.legs[i * 3 + 1], amp);
      P.legs[i * 3 + 2] = lerp(-(ru + rl) * (front ? 0.85 : 1), P.legs[i * 3 + 2], amp);
    }
    // Avisar cada vez que una pata apoya (para dejar huellitas de luz).
    for (let i = 0; i < 4; i++) {
      const p = (phase + (wg.gallop > 0.5 ? GAITS.gallop.off[i] : wg.trot > 0.5 ? GAITS.trot.off[i] : GAITS.walk.off[i])) % 1;
      if (amp > 0.5 && p < lastP[i]) stepCbs.forEach((fn) => fn(i));
      lastP[i] = p;
    }
    const breath = Math.sin(t * (2.2 + fatigue * 6)) * (0.004 + fatigue * 0.006);
    P.hipsY = H * s + bob * amp * s * (wg.gallop > 0.3 ? -1 : 1) + breath * s;
    P.hipsPitch = pitch * amp;
    P.chestPitch = -flex * amp;
    P.hipsRoll = Math.sin(TAU * phase) * 0.04 * amp * (wg.walk + wg.trot * 0.5) + Math.sin(t * 0.7) * 0.015 * (1 - amp);
    P.chestRoll = -P.hipsRoll * 0.6;
    P.neckPitch = -0.15 + flex * 0.6 * amp - pitch * 0.5;
    P.headPitch = 0.1 + Math.sin(TAU * phase * 2) * 0.03 * amp;
    P.neckYaw = clampN(st.turn * 0.12, 0.4);
    P.headYaw = 0;
    P.headRoll = 0;
    P.rootY = 0;
    P.rootPitch = 0;
    const ex = st.excite ?? 0.4;
    P.tailCarry = cat ? 0.9 + ex * 0.3 : bunny ? 0.4 : 0.35 + ex * 0.55 + (wg.gallop * -0.25);
    P.tailCurl = look.tail === 'curl' ? 0.35 : cat ? -0.12 : -0.1;
    P.tailAmp = cat ? 0.12 + ex * 0.1 : 0.22 + ex * 0.55;
    P.tailFreq = cat ? 2 : 6 + ex * 9 + wg.gallop * 3;
    if (st.wag && !cat) {
      // Paseando con su familia: cola arriba y moviéndose de lado a lado.
      P.tailCarry = Math.max(P.tailCarry, 0.95);
      P.tailAmp = Math.max(P.tailAmp, 0.85);
      P.tailFreq = Math.max(P.tailFreq, 10 + amp * 3);
      P.hipsRoll += Math.sin(t * P.tailFreq) * 0.03; // la cola mueve un poquito la cadera
    }
    P.earPerk = ex;
    P.tongue = 0;
    // Mirar: a un objetivo, o vistazos sueltos cuando está quieto.
    glanceT -= dt;
    if (glanceT < 0) {
      glanceT = 1.5 + Math.random() * 3.5;
      glance.yaw = (Math.random() - 0.5) * 1.3;
      glance.pitch = (Math.random() - 0.5) * 0.4;
    }
    let ly = glance.yaw * (1 - amp);
    let lp = glance.pitch * (1 - amp);
    if (st.look) {
      pet.group.updateMatrixWorld();
      tmp.copy(st.look);
      pet.group.worldToLocal(tmp);
      const hy = (H + 0.25) * s;
      const hz = 0.35 * s;
      ly = clampN(Math.atan2(tmp.x, tmp.z - hz), 1.1);
      lp = clampN(-Math.atan2(tmp.y - hy, Math.hypot(tmp.x, tmp.z - hz)), 0.7);
      if (Math.abs(Math.atan2(tmp.x, tmp.z)) > 2.3) ly *= 0.3;
    }
    P.neckYaw += ly * 0.45;
    P.headYaw += ly * 0.55;
    P.neckPitch += lp * 0.4;
    P.headPitch += lp * 0.6;
    fatigue = clamp01(fatigue + (speed > 2.4 * s ? dt * 0.12 : -dt * 0.035));
    P.tongue = Math.max(smooth(clamp01((fatigue - 0.15) * 3)), ex > 0.85 ? 0.6 : 0);
  }

  function actionPose(name) {
    copyPose(Q, P);
    const L = Q.legs;
    const set = (i, u, l, p) => { L[i * 3] = u; L[i * 3 + 1] = l; L[i * 3 + 2] = p; };
    if (name === 'sit') {
      const hp = -0.62;
      Q.hipsY = 0.21 * s * (bunny ? 0.9 : 1);
      Q.hipsPitch = hp;
      Q.chestPitch = 0.05;
      Q.hipsRoll = 0;
      Q.chestRoll = 0;
      for (const i of [0, 1]) set(i, -hp - 0.05, 0, 0.0);
      for (const i of [2, 3]) set(i, -0.73, 2.3, -(hp - 0.73 + 2.3));
      Q.neckPitch = P.neckPitch + 0.45;
      Q.headPitch = P.headPitch + 0.15;
      Q.tailCarry = -0.25;
      Q.tailCurl = 0.05;
    } else if (name === 'lie') {
      Q.hipsY = 0.155 * s;
      Q.hipsPitch = 0.02;
      Q.chestPitch = 0;
      Q.hipsRoll = 0.12;
      Q.chestRoll = -0.06;
      for (const i of [0, 1]) set(i, -1.45, 0.05, 1.4);
      for (const i of [2, 3]) set(i, -1.25, 2.45, -1.15);
      Q.neckPitch = P.neckPitch * 0.5 + 0.15;
      Q.headPitch = P.headPitch * 0.5;
      Q.tailCarry = -0.35;
      Q.tailCurl = 0.02;
      Q.tailAmp = P.tailAmp * 0.4;
      Q.tailFreq = P.tailFreq * 0.5;
    } else if (name === 'bow') {
      const hp = 0.55;
      Q.hipsY = (H - 0.035) * s + Math.sin(t * 11) * 0.012 * s;
      Q.hipsPitch = hp;
      Q.chestPitch = 0.1;
      for (const i of [0, 1]) set(i, -hp - 0.1 - 1.15, 0.15, 1.0);
      for (const i of [2, 3]) set(i, REST.hu - hp, REST.hl, -(REST.hu + REST.hl));
      Q.neckPitch = -0.95;
      Q.headPitch = -0.15;
      Q.tailCarry = 1.0;
      Q.tailAmp = 0.75;
      Q.tailFreq = 15;
      Q.earPerk = 1;
    } else if (name === 'rear') {
      const hp = -1.1;
      Q.hipsY = 0.3 * s;
      Q.hipsPitch = hp;
      Q.chestPitch = 0.05;
      const pad = Math.sin(t * 9);
      set(0, -0.35 + pad * 0.5, 0.9 + pad * 0.4, 0.4);
      set(1, -0.35 - pad * 0.5, 0.9 - pad * 0.4, 0.4);
      for (const i of [2, 3]) set(i, 0.9, 0.5, -(hp + 0.9 + 0.5));
      Q.neckPitch = 0.75;
      Q.headPitch = 0.3;
      Q.tailCarry = 0.2;
      Q.tailAmp = 0.6;
      Q.tailFreq = 12;
    } else if (name === 'sniff') {
      Q.neckPitch = 0.8;
      Q.headPitch = 0.45;
      Q.headYaw = Math.sin(t * 3.2) * 0.3;
      Q.neckYaw = P.neckYaw * 0.4;
      Q.hipsPitch = P.hipsPitch + 0.08;
      Q.tailCarry = 0.3;
      Q.tailAmp = P.tailAmp * 0.6;
      Q.earPerk = 0.2;
    } else if (name === 'carry') {
      Q.neckPitch = P.neckPitch - 0.25;
      Q.headPitch = P.headPitch - 0.1;
      Q.tailCarry = P.tailCarry + 0.3;
      Q.tongue = 0;
    } else if (name === 'tilt') {
      Q.headRoll = 0.38 * (look.seed > 0.5 ? 1 : -1);
      Q.headYaw = P.headYaw * 0.5;
      Q.earPerk = 1;
    }
    return Q;
  }

  function apply(st) {
    const L = P.legs;
    // Acciones de un solo golpe.
    if (shot.jump >= 0) {
      const k = clamp01(shot.jump / shot.jumpD);
      const air = 4 * k * (1 - k);
      P.rootY += air * shot.jumpH * s;
      P.rootPitch = -0.35 * Math.cos(Math.PI * k);
      const e = Math.sin(Math.PI * k);
      for (const i of [0, 1]) { L[i * 3] = lerp(L[i * 3], k < 0.65 ? -0.75 : -0.35, e); L[i * 3 + 1] = lerp(L[i * 3 + 1], k < 0.65 ? 1.4 : 0.1, e); }
      for (const i of [2, 3]) { L[i * 3] = lerp(L[i * 3], 0.65, e); L[i * 3 + 1] = lerp(L[i * 3 + 1], 0.25, e); }
      P.tailCarry += 0.4 * e;
      P.earPerk = 1;
    }
    if (shot.roll >= 0) {
      const k = shot.roll / 2.6;
      copyPose(Q, actionPose('lie'));
      const e = smooth(clamp01(k * 6)) * smooth(clamp01((1 - k) * 6));
      mixPose(P, Q, e);
      let roll;
      if (k < 0.3) roll = smooth(k / 0.3) * Math.PI;
      else if (k < 0.75) roll = Math.PI + Math.sin((k - 0.3) * 30) * 0.3;
      else roll = Math.PI + smooth((k - 0.75) / 0.25) * Math.PI;
      P.hipsRoll += roll * shot.spinDir;
      if (k > 0.2 && k < 0.85) {
        const kk = Math.sin(t * 13);
        for (let i = 0; i < 4; i++) {
          const kick = Math.sin(t * 12 + i * 1.7);
          L[i * 3] = lerp(L[i * 3], (i < 2 ? -0.9 : -0.6) + kick * 0.45, e);
          L[i * 3 + 1] = lerp(L[i * 3 + 1], 0.9 + kick * 0.4, e);
        }
        P.headRoll += kk * 0.2;
        P.tongue = 1;
      }
      P.tailAmp = 0.8;
      P.tailFreq = 14;
    }
    if (shot.shake >= 0) {
      const k = shot.shake / 0.9;
      const env = Math.sin(Math.PI * clamp01(k));
      const f = t * 30;
      P.headRoll += Math.sin(f) * 0.55 * env;
      P.chestRoll += Math.sin(f - 0.7) * 0.4 * env;
      P.hipsRoll += Math.sin(f - 1.4) * 0.3 * env;
      P.tailAmp = 1;
      P.tailFreq = 24;
      ears[0].v += Math.sin(f) * 40 * env * 0.016;
      ears[1].v -= Math.sin(f) * 40 * env * 0.016;
    }
    // A los huesos.
    B.root.position.y = P.rootY;
    B.root.rotation.x = P.rootPitch;
    B.root.rotation.z = st.bank || 0;
    B.hips.position.y = P.hipsY;
    B.hips.rotation.set(P.hipsPitch, 0, P.hipsRoll);
    B.chest.rotation.set(P.chestPitch, 0, P.chestRoll);
    const br = 1 + Math.sin(t * (2.2 + fatigue * 7)) * (0.012 + fatigue * 0.02);
    B.chest.scale.set(br, br, 1);
    B.neck.rotation.set(P.neckPitch, P.neckYaw, 0);
    B.head.rotation.set(P.headPitch, P.headYaw, P.headRoll);
    for (let i = 0; i < 4; i++) {
      const lg = B.legs[i];
      lg.up.rotation.x = L[i * 3];
      lg.lo.rotation.x = L[i * 3 + 1];
      lg.paw.rotation.x = L[i * 3 + 2];
    }
    // Cola con retraso entre segmentos.
    B.tail.forEach((b, i) => {
      const a = P.tailAmp * (0.55 + i * 0.15);
      b.rotation.x = i === 0 ? P.tailCarry : P.tailCurl;
      b.rotation.y = Math.sin(t * P.tailFreq - i * 0.75) * a + (st.turn || 0) * -0.12 * (i + 1) * 0.3;
    });
    // Orejas con resorte (rebotan al trotar y al sacudirse).
    const hy = pet.headWorld(tmp).y;
    if (lastHeadY !== null) {
      const vy = (hy - lastHeadY) / Math.max(1e-3, st.dt);
      const ay = (vy - lastHeadVy) / Math.max(1e-3, st.dt);
      lastHeadVy = vy;
      for (const e of ears) {
        e.v += (-60 * e.a - 7 * e.v - ay * 0.05) * st.dt;
        e.a = clampN(e.a + e.v * st.dt, 0.9);
      }
    }
    lastHeadY = hy;
    const down = look.ears === 'down';
    B.earL.rotation.set(down ? 0 : -0.25 * P.earPerk, 0, (down ? 0.18 - P.earPerk * 0.12 : -0.05) + ears[0].a * (down ? 1 : 0.35));
    B.earR.rotation.set(down ? 0 : -0.25 * P.earPerk, 0, (down ? -0.18 + P.earPerk * 0.12 : 0.05) - ears[1].a * (down ? 1 : 0.35));
    // Parpadeo.
    blinkT -= st.dt;
    let eye = 1;
    if (blinkT < 0.12) eye = Math.abs(blinkT - 0.06) / 0.06;
    if (blinkT < 0) blinkT = 2 + Math.random() * 4;
    if (P.tailAmp > 0.7) eye = Math.min(eye, 0.55);
    B.eyes.scale.set(1, Math.max(0.08, eye), 1);
    const tg = P.tongue;
    B.tongue.scale.setScalar(Math.max(0.001, tg));
    B.tongue.rotation.x = Math.sin(t * 9) * 0.12 * tg;
    pet.mesh.material.userData.u.uPulse.value = 0.25 + Math.sin(t * 2 + look.seed * 9) * 0.25;
  }

  return {
    w,
    get busy() { return shot.roll >= 0 || shot.jump >= 0 || shot.shake >= 0; },
    get jumping() { return shot.jump >= 0; },
    onStep(fn) { stepCbs.push(fn); },
    trigger(name, o = {}) {
      if (name === 'jump') { shot.jump = 0; shot.jumpH = o.h ?? 0.5; shot.jumpD = o.d ?? 0.6; }
      if (name === 'roll') { shot.roll = 0; shot.spinDir = Math.random() < 0.5 ? 1 : -1; }
      if (name === 'shake') shot.shake = 0;
    },
    // `st`: { speed, turn, look, excite, bank, want: { sit, lie, bow, rear, sniff, carry, tilt } }
    update(dt, st) {
      t += dt;
      st.dt = dt;
      base(dt, st);
      const want = st.want || {};
      for (const k in w) {
        const rate = k === 'lie' || k === 'sit' ? 3.2 : 6;
        w[k] += ((want[k] ? 1 : 0) - w[k]) * Math.min(1, dt * rate);
        if (w[k] > 0.002) mixPose(P, actionPose(k), smooth(w[k]));
      }
      apply(st);
      if (shot.jump >= 0) { shot.jump += dt; if (shot.jump > shot.jumpD) shot.jump = -1; }
      if (shot.roll >= 0) { shot.roll += dt; if (shot.roll > 2.6) shot.roll = -1; }
      if (shot.shake >= 0) { shot.shake += dt; if (shot.shake > 0.9) shot.shake = -1; }
    },
  };
}

function clampN(x, m) { return Math.max(-m, Math.min(m, x)); }
