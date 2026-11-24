// El valle del cielo (pisos altos): pilares de piedra gigantes que salen del mar de nubes, a varias
// distancias, con árboles en flor (rosa, lila y blanco) arriba, puentes colgantes entre los cercanos y
// cascadas que caen hasta perderse en la bruma. Lo lejano se aclara hacia el color del cielo y la base
// de cada pilar se hunde en la bruma: así el paisaje tiene capas, como en un valle de montaña.
// Todo procedural (geometría + un shader con luz simple), sin modelos.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HALL_CENTER, uTime, rand } from './world.js';
import { glowTexture } from './textures.js';

// Se puede apagar (false) si en algún teléfono pesa demasiado.
export const VALLEY_READY = true;

const SUN = new THREE.Vector3(-0.45, 0.8, -0.4).normalize();

// Piedra, árboles y puentes: color por vértice, luz del sol, y bruma por distancia y por altura.
function hazeMaterial(uHaze, uRise) {
  return new THREE.ShaderMaterial({
    fog: false,
    vertexColors: true,
    uniforms: { uHaze, uRise, uSun: { value: SUN }, uCenter: { value: new THREE.Vector2(HALL_CENTER.x, HALL_CENTER.z) } },
    vertexShader: /* glsl */ `
      uniform float uRise;
      varying vec3 vC; varying vec3 vN; varying vec3 vW;
      void main(){
        vC = color;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        w.y -= uRise;
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uHaze; uniform vec3 uSun; uniform vec2 uCenter;
      varying vec3 vC; varying vec3 vN; varying vec3 vW;
      void main(){
        vec3 n = normalize(vN);
        // Luz de sol con sombra marcada (la piedra tiene volumen) y un poco de cielo desde arriba.
        float lit = 0.34 + 0.86 * max(dot(n, uSun), 0.0) + 0.16 * max(n.y, 0.0);
        vec3 c = vC * lit;
        float d = length(vW.xz - uCenter);
        // Lo lejano se aclara hacia el color del cielo (perspectiva aérea); lo cercano conserva el color.
        float far = smoothstep(90.0, 330.0, d);
        // La base se hunde en el mar de nubes: al llegar al nivel de las nubes ya es del color de la bruma.
        float low = 1.0 - smoothstep(-1.0, 20.0, vW.y);
        c = mix(c, uHaze, clamp(max(far * 0.72, low), 0.0, 1.0));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

const col = (hex) => new THREE.Color(hex);
function paint(geo, c) {
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(a, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

// Un pilar de piedra irregular (facetado), con musgo arriba.
function pillarGeo(r, h, rnd) {
  const g = new THREE.CylinderGeometry(r * (0.7 + rnd() * 0.25), r, h, 7, 7, false).toNonIndexed();
  const p = g.attributes.position;
  const rock = [col('#8c7f9c'), col('#6c6283'), col('#a8977e')];
  const moss = col('#6fa45a');
  const cs = new Float32Array(p.count * 3);
  const seed = rnd() * 100;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + 0.16 * Math.sin(a * 3 + seed + y * 0.08) + 0.1 * Math.sin(a * 5 - y * 0.15 + seed * 2);
    const top = y > h / 2 - 0.1;
    p.setXYZ(i, x * (top ? 1 : k), y + (top ? Math.sin(a * 4 + seed) * r * 0.08 : 0), z * (top ? 1 : k));
    const yk = (y + h / 2) / h;
    const c = (yk > 0.9 || top ? moss : rock[Math.floor((Math.sin(seed + i * 0.37) * 0.5 + 0.5) * 2.99)]).clone();
    if (!top && yk > 0.78) c.lerp(moss, (yk - 0.78) * 3);
    c.toArray(cs, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cs, 3));
  g.computeVertexNormals();
  return g;
}

// Árboles en flor arriba de un pilar: tronquitos y copas facetadas en masas de color.
function bloomGeo(r, topY, rnd) {
  const parts = [];
  const PALS = [['#f6b3cf', '#f9cfe0'], ['#c9a7f0', '#e0cbfa'], ['#fbeef4', '#ffffff'], ['#f29ab8', '#f7c0d4']];
  const n = 4 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * r * 0.62;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const s = r * (0.36 + rnd() * 0.26);
    const trunk = paint(new THREE.CylinderGeometry(s * 0.08, s * 0.12, s * 0.9, 5).translate(x, topY + s * 0.45, z).toNonIndexed(), col('#5a3e34'));
    parts.push(trunk);
    const pal = PALS[Math.floor(rnd() * PALS.length)];
    for (let j = 0; j < 3; j++) {
      const cs = s * (0.55 + rnd() * 0.35);
      const cg = new THREE.IcosahedronGeometry(cs, 1).toNonIndexed();
      cg.scale(1, 0.78, 1);
      cg.translate(x + (rnd() - 0.5) * s * 0.7, topY + s * (0.95 + rnd() * 0.35), z + (rnd() - 0.5) * s * 0.7);
      parts.push(paint(cg, col(pal[j % 2])));
    }
  }
  return mergeGeometries(parts);
}

// Puente colgante de tablones entre dos puntos, con su comba y dos sogas.
function bridgeGeo(a, b) {
  const parts = [];
  const n = 26;
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const yaw = Math.atan2(dir.x, dir.z);
  const sag = Math.min(6, len * 0.12);
  const at = (k) => new THREE.Vector3().lerpVectors(a, b, k).setY(a.y + (b.y - a.y) * k - Math.sin(Math.PI * k) * sag);
  for (let i = 0; i <= n; i++) {
    const p = at(i / n);
    const plank = new THREE.BoxGeometry(2.0, 0.12, len / n * 0.72).rotateY(yaw).translate(p.x, p.y, p.z).toNonIndexed();
    parts.push(paint(plank, col(i % 3 ? '#9a6a46' : '#86593a')));
  }
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 20; i++) pts.push(at(i / 20).addScaledVector(side, s * 1.05).add(new THREE.Vector3(0, 1.0, 0)));
    parts.push(paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.06, 4, false).toNonIndexed(), col('#d9c49a')));
    for (let i = 1; i < n; i += 3) {
      const p = at(i / n).addScaledVector(side, s * 1.05);
      parts.push(paint(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 4).translate(p.x, p.y + 0.5, p.z).toNonIndexed(), col('#d9c49a')));
    }
  }
  return mergeGeometries(parts);
}

// Una cascada: agua que corre (franjas que bajan) y se deshace en bruma abajo.
function fallMaterial(uRise) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    uniforms: { uTime, uRise },
    vertexShader: /* glsl */ `
      uniform float uRise; varying vec2 vUv; varying float vY;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); w.y -= uRise; vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv; varying float vY;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        float x = vUv.x;
        float col = floor(x * 14.0);
        float sp = 0.5 + h(vec2(col, 3.0)) * 0.6;
        float s = fract(vUv.y * 5.0 + uTime * sp + h(vec2(col, 7.0)));
        float streak = smoothstep(0.0, 0.25, s) * (1.0 - smoothstep(0.55, 1.0, s));
        float edge = smoothstep(0.0, 0.18, x) * (1.0 - smoothstep(0.82, 1.0, x));
        float bottom = smoothstep(-24.0, 4.0, vY);
        float a = edge * bottom * (0.35 + 0.5 * streak);
        gl_FragColor = vec4(vec3(0.92, 0.97, 1.0) * (0.95 + 0.25 * streak), clamp(a, 0.0, 0.85));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function createValley(scene, { tier } = {}) {
  const low = !tier || tier.grass < 10000;
  const group = new THREE.Group();
  group.name = 'valle-del-cielo';
  group.visible = false;
  scene.add(group);
  const uHaze = { value: new THREE.Color('#cfe4fb') };
  const uRise = { value: 0 };
  const mat = hazeMaterial(uHaze, uRise);
  const rnd = rand(4242);
  const pillars = [];
  const N = low ? 11 : 19;
  const rocks = [];
  const blooms = [];
  for (let i = 0; i < N; i++) {
    // Cada vez más lejos (y más grandes), repartidos alrededor.
    const layer = i / N;
    const dist = 96 + layer * 150 + rnd() * 25;
    const ang = i * 2.399 + rnd() * 0.4; // ángulo áureo: bien repartidos
    const x = HALL_CENTER.x + Math.cos(ang) * dist;
    const z = HALL_CENTER.z + Math.sin(ang) * dist;
    const r = 6 + rnd() * 7 + layer * 8;
    const topY = 10 + rnd() * 30 + layer * 22;
    const h = topY + 45;
    const g = pillarGeo(r, h, rnd);
    g.translate(x, topY - h / 2, z);
    rocks.push(g);
    blooms.push(bloomGeo(r, topY, rnd).translate(x, 0, z));
    pillars.push({ x, z, r, topY, dist });
  }
  const rockMesh = new THREE.Mesh(mergeGeometries(rocks), mat);
  const bloomMesh = new THREE.Mesh(mergeGeometries(blooms), mat);
  group.add(rockMesh, bloomMesh);

  // Puentes colgantes entre pilares cercanos entre sí (y no demasiado lejos tuyo).
  const bridges = [];
  const near = pillars.filter((p) => p.dist < 185);
  const used = new Set();
  for (const a of near) {
    let best = null;
    for (const b of near) {
      if (a === b || used.has(b)) continue;
      const d = Math.hypot(a.x - b.x, a.z - b.z) - a.r - b.r;
      if (d > 8 && d < 55 && (!best || d < best.d)) best = { b, d };
    }
    if (!best || used.has(a) || bridges.length >= (low ? 2 : 4)) continue;
    used.add(a);
    used.add(best.b);
    const b = best.b;
    const dir = new THREE.Vector2(b.x - a.x, b.z - a.z).normalize();
    const pa = new THREE.Vector3(a.x + dir.x * a.r * 0.75, a.topY + 0.2, a.z + dir.y * a.r * 0.75);
    const pb = new THREE.Vector3(b.x - dir.x * b.r * 0.75, b.topY + 0.2, b.z - dir.y * b.r * 0.75);
    bridges.push(bridgeGeo(pa, pb));
  }
  if (bridges.length) group.add(new THREE.Mesh(mergeGeometries(bridges), mat));

  // Cascadas en algunos pilares, del lado que se ve desde el salón.
  const fallMat = fallMaterial(uRise);
  const falls = [];
  for (const p of pillars) {
    if (rnd() > (low ? 0.3 : 0.45)) continue;
    const toHall = Math.atan2(HALL_CENTER.z - p.z, HALL_CENTER.x - p.x) + (rnd() - 0.5) * 0.8;
    const w = 2.5 + p.r * 0.25;
    const len = p.topY + 26;
    const g = new THREE.PlaneGeometry(w, len, 1, 1);
    g.translate(0, p.topY - 0.5 - len / 2, 0);
    const m = new THREE.Mesh(g, fallMat);
    m.position.set(p.x + Math.cos(toHall) * (p.r * 1.02), 0, p.z + Math.sin(toHall) * (p.r * 1.02));
    m.rotation.y = -toHall + Math.PI / 2;
    m.renderOrder = 2;
    falls.push(m);
    group.add(m);
  }

  // Bancos de bruma entre las capas (más cerca, más tenues).
  const mistTex = glowTexture();
  const mists = [];
  for (let i = 0; i < (low ? 6 : 12); i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = 70 + rnd() * 160;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: new THREE.Color('#ffffff'), transparent: true, depthWrite: false, opacity: 0.4, fog: false }));
    sp.scale.set(70 + rnd() * 60, 16 + rnd() * 10, 1);
    sp.position.set(HALL_CENTER.x + Math.cos(ang) * dist, 2 + rnd() * 8, HALL_CENTER.z + Math.sin(ang) * dist);
    sp.userData.base = sp.position.clone();
    sp.renderOrder = 1;
    mists.push(sp);
    group.add(sp);
  }

  const tmp = new THREE.Color();
  return {
    group,
    // k: 0 en el jardín, 1 en el piso 99. El valle aparece desde los primeros pisos del cielo:
    // los pilares suben desde el mar de nubes y la bruma toma el color del cielo de ese piso.
    setK(k, fogColor) {
      const vis = VALLEY_READY && k > 0.03;
      group.visible = vis;
      if (!vis) return;
      const e = Math.min(1, (k - 0.03) / 0.22);
      uRise.value = (1 - e * e * (3 - 2 * e)) * 55;
      if (fogColor) uHaze.value.copy(fogColor).lerp(tmp.set('#ffffff'), 0.25);
      for (const m of mists) {
        m.material.color.copy(uHaze.value).lerp(tmp.set('#ffffff'), 0.4);
        m.material.opacity = 0.42 * e;
      }
    },
    update(t) {
      if (!group.visible) return;
      for (const m of mists) {
        m.position.x = m.userData.base.x + Math.sin(t * 0.03 + m.userData.base.z) * 6;
        m.position.y = m.userData.base.y - uRise.value * 0.6;
      }
    },
  };
}
