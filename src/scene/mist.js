// Atmósfera en capas: bruma baja que se arrastra por el suelo (más espesa sobre el río y afuera del
// jardín, apenas un hilo en el camino y en el salón) y bancos de bruma a lo lejos, entre el jardín y
// las colinas, para que el paisaje tenga profundidad: lo cerca nítido, lo lejos cada vez más velado.
// Todo se mueve en la GPU (ruido que se desplaza despacio); sólo se esconde en los pisos del cielo.
import * as THREE from 'three';
import { uTime, HALL_CENTER, HALL_RADIUS, GARDEN_RADIUS, CREEK_Z, rand } from './world.js';

// Ruido suave (value noise + fbm). Sin pow() con bases negativas ni smoothstep al revés (ver AGENTS).
const NOISE = /* glsl */ `
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p, int oct){
    float s = 0.0; float a = 0.5;
    for (int k = 0; k < 4; k++) { if (k >= oct) break; s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
    return s;
  }
`;

const MOON = new THREE.Color('#a596d2');

export function createMist(parent, { tier, reduced = false } = {}) {
  const low = !tier || tier.grass < 10000;
  const oct = low ? 2 : 3;
  const group = new THREE.Group();
  group.name = 'bruma';
  parent.add(group);
  const uColor = { value: new THREE.Color('#8f7fbf') };
  const uAmt = { value: 1 };
  const uDrift = { value: reduced ? 0 : 1 };

  // ---------- bruma baja ----------
  const groundMat = (y, amt, scale, speed) => new THREE.ShaderMaterial({
    uniforms: { uTime, uColor, uAmt, uDrift, uY: { value: y }, uK: { value: amt }, uS: { value: scale }, uV: { value: speed } },
    transparent: true,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAmt, uDrift, uK, uS, uV; uniform vec3 uColor;
      varying vec3 vW;
      ${NOISE}
      void main(){
        vec2 p = vW.xz;
        float r = length(p);
        // Dónde se junta la bruma: sobre el río, afuera del jardín y lejos; poca en el jardín y casi nada en el salón.
        float creek = ${CREEK_Z.toFixed(1)} + sin(p.x * 0.07) * 3.2 + sin(p.x * 0.19 + 1.0) * 0.9;
        float river = 1.0 - smoothstep(2.0, 9.0, abs(p.y - creek));
        float out_ = smoothstep(${(GARDEN_RADIUS - 8).toFixed(1)}, ${(GARDEN_RADIUS + 14).toFixed(1)}, r);
        float beyond = smoothstep(creek + 2.0, creek + 14.0, p.y);
        float hall = 1.0 - smoothstep(${(HALL_RADIUS - 4).toFixed(1)}, ${(HALL_RADIUS + 4).toFixed(1)}, length(p - vec2(${HALL_CENTER.x.toFixed(1)}, ${HALL_CENTER.z.toFixed(1)})));
        // Sobre todo sobre el agua; afuera apenas un velo (ahí se entra: no tiene que lavar la imagen).
        float dens = 0.08 + 0.5 * river + 0.3 * max(out_, beyond);
        dens *= 1.0 - 0.9 * hall;
        float t = uTime * uDrift * uV;
        float n = fbm(p * uS + vec2(t * 0.9, t * 0.35), ${oct});
        float n2 = fbm(p * uS * 2.3 - vec2(t * 0.4, -t * 0.7), 2);
        float wisp = smoothstep(0.4, 0.82, n * 0.75 + n2 * 0.4);
        // Cerca de la cámara se abre (si no, se vería el borde del velo cortando todo).
        float dc = distance(cameraPosition, vW);
        float nearFade = smoothstep(5.0, 18.0, dc);
        float a = clamp(wisp * dens * uK * uAmt * nearFade, 0.0, 0.85);
        gl_FragColor = vec4(uColor * (0.85 + 0.3 * n), a);
      }`,
  });
  const disc = new THREE.CircleGeometry(150, 64).rotateX(-Math.PI / 2);
  const layers = [[0.4, 0.32, 0.045, 0.9], ...(low ? [] : [[1.25, 0.16, 0.03, 0.55]])];
  for (const [y, amt, sc, sp] of layers) {
    const m = new THREE.Mesh(disc, groundMat(y, amt, sc, sp));
    m.position.y = y;
    m.renderOrder = 2;
    m.frustumCulled = false;
    group.add(m);
  }

  // ---------- bancos de bruma a lo lejos ----------
  const bankMat = new THREE.ShaderMaterial({
    uniforms: { uTime, uColor, uAmt, uDrift },
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aSeed; varying vec2 vUv; varying vec3 vW; varying float vSeed;
      void main(){ vUv = uv; vSeed = aSeed; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAmt, uDrift; uniform vec3 uColor;
      varying vec2 vUv; varying vec3 vW; varying float vSeed;
      ${NOISE}
      void main(){
        float t = uTime * uDrift * 0.025;
        vec2 q = vec2(vUv.x * 3.2 + vSeed * 11.0 + t, vUv.y * 1.4 - t * 0.3);
        float n = fbm(q, ${oct});
        // Espesa abajo, se deshace hacia arriba y en los costados.
        float v = 1.0 - smoothstep(0.08, 0.95, vUv.y + (n - 0.5) * 0.35);
        float h = sin(3.14159 * clamp(vUv.x, 0.0, 1.0));
        float a = clamp(v * h * h * (0.45 + 0.75 * n) * 0.42 * uAmt, 0.0, 0.6);
        // Si estás muy cerca de un banco (subiendo una colina), se abre.
        a *= smoothstep(6.0, 22.0, distance(cameraPosition, vW));
        gl_FragColor = vec4(uColor * (0.95 + 0.35 * (1.0 - vUv.y)), a);
      }`,
  });
  const r = rand(91);
  const N = low ? 9 : 14;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2 + (r() - 0.5) * 0.35;
    const rad = 70 + r() * 22;
    const w = 46 + r() * 34;
    const hgt = 9 + r() * 9;
    const g = new THREE.PlaneGeometry(w, hgt, 1, 1);
    g.translate(0, hgt / 2 - 0.5, 0);
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(new Array(4).fill(r()), 1));
    const m = new THREE.Mesh(g, bankMat);
    m.position.set(Math.sin(ang) * rad, 0, Math.cos(ang) * rad);
    m.lookAt(0, 0, 0);
    m.renderOrder = 1;
    group.add(m);
  }

  return {
    group,
    // El color sigue a la niebla del cielo (más clarito: es luz de luna en la bruma).
    update(fog) {
      if (fog) uColor.value.copy(fog.color).lerp(MOON, 0.4);
    },
    set amount(v) { uAmt.value = v; },
  };
}
