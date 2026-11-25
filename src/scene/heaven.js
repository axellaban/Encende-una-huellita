// Los pisos hacia el cielo: del piso 1 (el jardín al atardecer) al 99 (el cielo idílico).
// Al subir, el jardín de abajo desaparece y el salón queda sobre un mar de nubes; el cielo pasa del
// violeta al celeste, la luz se vuelve de día, sale el sol, aparecen nubes que flotan y rayos de luz.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowTexture, lightConeTexture } from './textures.js';
import { HALL_CENTER, HALL_RADIUS, ROOM_R, uTime } from './world.js';
import { createSkyMagic } from './skymagic.js';
import { createValley } from './valley.js';

export const FLOORS = 99;

const NIGHT = {
  top: '#0c0824', mid: '#34195e', low: '#a3337a', horizon: '#ff8a3d',
  fog: '#2a1640', bg: '#150d24', hemiSky: '#a184d8', hemiGround: '#2c2414', key: '#c3c4ff',
};
// A media altura: amanecer rosado y lila.
const DAWN = {
  top: '#3a4ea8', mid: '#7f86d8', low: '#f0a9c4', horizon: '#ffd9b0',
  fog: '#b9a8de', bg: '#8f86d6', hemiSky: '#efd9ff', hemiGround: '#9a84bd', key: '#ffe0c8',
};
// Arriba de todo: celeste, blanco y luz dorada.
const HEAVEN = {
  top: '#2f7fe0', mid: '#5fb0f0', low: '#a8d8fb', horizon: '#eef8ff',
  fog: '#b9dcfa', bg: '#7fc0f2', hemiSky: '#fff7ea', hemiGround: '#9cc6ea', key: '#fff1d6',
};

const c3 = (hex) => new THREE.Color(hex);
const smooth = (x) => x * x * (3 - 2 * x);

function mixPalette(k, key, out = new THREE.Color()) {
  // 0..0.45: noche -> amanecer; 0.45..1: amanecer -> cielo.
  if (k < 0.45) return out.copy(c3(NIGHT[key])).lerp(c3(DAWN[key]), smooth(k / 0.45));
  return out.copy(c3(DAWN[key])).lerp(c3(HEAVEN[key]), smooth((k - 0.45) / 0.55));
}

// Mar de nubes: un disco enorme con nubes de ruido que se mueven despacio.
function cloudSea() {
  const geo = new THREE.CircleGeometry(420, 96).rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: { uTime, uK: { value: 0 }, uTint: { value: new THREE.Color('#edf4fc') }, uShade: { value: new THREE.Color('#b9a9d8') }, uHole: { value: ROOM_R - 0.4 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime; uniform float uK; uniform vec3 uTint; uniform vec3 uShade; uniform float uHole; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n(p); p *= 2.03; a *= 0.5; } return v; }
      void main(){
        vec2 p = vW.xz * 0.035 + vec2(uTime * 0.012, uTime * 0.006);
        float c = fbm(p);
        float c2 = fbm(p * 2.3 - uTime * 0.01);
        float puff = smoothstep(0.4, 0.78, c * 0.7 + c2 * 0.45);
        vec3 col = mix(uShade, uTint, puff);
        // Sombras suaves entre nubes y brillo arriba.
        col += vec3(0.05) * smoothstep(0.7, 0.95, c2);
        float d = length(vW.xz - vec2(${HALL_CENTER.x.toFixed(1)}, ${HALL_CENTER.z.toFixed(1)}));
        // Debajo del piso redondo del salón no hace falta dibujar; afuera, nubes hasta el horizonte.
        float a = uK * smoothstep(uHole - 1.2, uHole + 1.0, d) * (0.94 + 0.06 * puff);
        a *= 1.0 - smoothstep(300.0, 420.0, d);
        gl_FragColor = vec4(col, a);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.4;
  mesh.renderOrder = 1;
  return mesh;
}

// Nubes con volumen que flotan alrededor (bolitas blandas unidas).
function puffyClouds(rnd) {
  const parts = [];
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rnd() * 0.3;
    const d = HALL_RADIUS + 42 + rnd() * 145;
    // Dejamos libre la franja a la altura de los ojos cerca del salón para que se luzcan los pilares y árboles del valle.
    const y = d < 135 ? (rnd() < 0.65 ? -3.5 + rnd() * 4.5 : 27 + rnd() * 14) : -4 + rnd() * 24;
    const cx = HALL_CENTER.x + Math.sin(a) * d;
    const cz = HALL_CENTER.z + Math.cos(a) * d;
    const s = 2.5 + rnd() * 5 + d * 0.03;
    const blobs = 4 + Math.floor(rnd() * 4);
    for (let k = 0; k < blobs; k++) {
      const g = new THREE.IcosahedronGeometry(s * (0.55 + rnd() * 0.5), 3);
      g.scale(1, 0.62, 1);
      g.deleteAttribute('uv');
      g.translate(cx + (k - blobs / 2) * s * 0.7, y + rnd() * s * 0.3, cz + (rnd() - 0.5) * s);
      parts.push(g);
    }
  }
  const geo = mergeGeometries(parts);
  geo.computeVertexNormals();
  // Nubes de algodón: iluminadas desde arriba, con la panza un poco más oscura y borde luminoso.
  const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#c9d9f2', emissiveIntensity: 0.45, transparent: true, opacity: 0, fog: true });
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float up = normal.y * 0.5 + 0.5;
      totalEmissiveRadiance *= mix(0.55, 1.15, up);
      float rim = pow(clamp(1.0 - abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0);
      totalEmissiveRadiance += vec3(0.35, 0.33, 0.3) * rim;`);
  };
  mat.customProgramCacheKey = () => 'nubes';
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

export function createHeaven(scene, world, { renderer, bloom = null, hideUp = [], tier = null } = {}) {
  let seed = 31;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const sea = cloudSea();
  // Cometas, estrellas fugaces, nubes gigantes, islas y pájaros de luz (en todos los pisos).
  const magic = createSkyMagic(scene, { uTime, rnd });
  // El valle del cielo: pilares de piedra con árboles en flor, puentes y cascadas (valley.js).
  const valley = createValley(scene, { tier });
  const clouds = puffyClouds(rnd);
  scene.add(sea, clouds);

  // Sol suave y rayos de luz que bajan sobre el salón.
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(1.4, 1.25, 0.95), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
  sun.position.set(140, 230, -320);
  sun.scale.setScalar(260);
  sun.renderOrder = -8;
  scene.add(sun);
  const rays = new THREE.Group();
  const rayMat = new THREE.MeshBasicMaterial({ map: lightConeTexture(), color: new THREE.Color(1.0, 0.95, 0.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, side: THREE.DoubleSide, fog: false });
  for (let i = 0; i < 7; i++) {
    const ray = new THREE.Mesh(new THREE.PlaneGeometry(9 + rnd() * 6, 70), rayMat);
    const a = (i / 7) * Math.PI * 2;
    ray.position.set(HALL_CENTER.x + Math.sin(a) * (HALL_RADIUS * 0.6), 30, HALL_CENTER.z + Math.cos(a) * (HALL_RADIUS * 0.6));
    ray.rotation.set(0, a, 0.16);
    rays.add(ray);
  }
  scene.add(rays);

  let k = 0;
  let target = 0;
  const tmp = new THREE.Color();
  // El piso del salón: madera abajo, madera blanqueada con brillo perlado arriba.
  const deckMats = world.deck ? (world.deck.userData.mats || [world.deck.material]) : [];
  const deckBases = deckMats.map((m) => m.color.clone());
  // Un halo dorado suave bajo el salón.
  const halo = new THREE.Mesh(new THREE.CircleGeometry(ROOM_R + 6, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(0.95, 0.8, 0.5), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, fog: false }));
  halo.position.set(HALL_CENTER.x, -0.3, HALL_CENTER.z);
  halo.renderOrder = 2;
  scene.add(halo);

  function apply() {
    const kk = k;
    const u = world.sky.material.uniforms;
    mixPalette(kk, 'top', u.top.value);
    mixPalette(kk, 'mid', u.mid.value);
    mixPalette(kk, 'low', u.low.value);
    mixPalette(kk, 'horizon', u.horizon.value);
    u.uK.value = kk;
    world.stars.material.uniforms.uFade.value = Math.max(0, 1 - kk * 2.4);
    world.moon.material.opacity = Math.max(0, 1 - kk * 2);
    world.moon.visible = world.moon.material.opacity > 0.01;
    mixPalette(kk, 'fog', world.fog.color);
    world.fog.density = 0.0085 * (1 - smooth(kk) * 0.82);
    if (scene.background?.isColor) mixPalette(kk, 'bg', scene.background);
    mixPalette(kk, 'hemiSky', world.hemi.color);
    mixPalette(kk, 'hemiGround', world.hemi.groundColor);
    world.hemi.intensity = 1.3 + kk * 0.55;
    mixPalette(kk, 'key', world.moonLight.color);
    world.moonLight.intensity = 0.6 + kk * 0.9;
    world.moonLight.position.set(-30 + kk * 60, 50 + kk * 30, -40);
    world.warmFill.intensity = 0.35 * (1 - kk);
    if (world.flies) world.flies.visible = kk < 0.35;
    if (renderer) renderer.toneMappingExposure = 1.12 - kk * 0.12;
    if (bloom) bloom.strength = 0.5 - kk * 0.18;
    // El jardín de abajo sólo en el piso 1.
    const up = kk > 0.001;
    world.ground.visible = !up;
    for (const o of hideUp) if (o) o.visible = !up;
    world.colliders.up = up;
    // Nubes y luz de cielo.
    sea.visible = up;
    sea.material.uniforms.uK.value = Math.min(1, kk * 5);
    sea.material.uniforms.uTint.value.copy(tmp.set('#ebf3fc').lerp(c3('#f7dce9'), 1 - kk));
    sea.material.uniforms.uShade.value.copy(c3('#9884c4').lerp(c3('#8eb8e6'), smooth(kk)));
    clouds.visible = up;
    clouds.material.opacity = Math.min(0.92, kk * 3.5);
    clouds.material.transparent = clouds.material.opacity < 0.99;
    clouds.material.depthWrite = !clouds.material.transparent;
    clouds.material.emissive.copy(c3('#c998b8').lerp(c3('#bed4ec'), smooth(kk)));
    deckMats.forEach((deckMat, i) => {
      deckMat.color.copy(deckBases[i]).lerp(c3('#fff4e4'), smooth(kk) * 0.7);
      deckMat.emissive = deckMat.emissive || new THREE.Color();
      deckMat.emissive.copy(c3('#000000')).lerp(c3('#5a4a3a'), smooth(kk) * 0.5);
    });
    halo.visible = up;
    halo.material.opacity = Math.min(0.22, kk * 1.4) * (1 - smooth(kk) * 0.6);
    sun.visible = kk > 0.15;
    sun.material.opacity = smooth(Math.max(0, (kk - 0.15) / 0.85)) * 0.9;
    rays.visible = kk > 0.25;
    rayMat.opacity = smooth(Math.max(0, (kk - 0.25) / 0.75)) * 0.16;
    magic.setK(kk);
    valley.setK(kk, world.fog.color);
  }
  apply();

  return {
    get k() { return k; },
    // Piso 0..98 (se muestra como 1..99). `instant`: cambia de una (con las puertas cerradas).
    setFloor(f, instant = false) {
      target = Math.max(0, Math.min(FLOORS - 1, f)) / (FLOORS - 1);
      if (instant) { k = target; apply(); }
    },
    update(dt, t) {
      if (Math.abs(target - k) > 0.0005) {
        k += (target - k) * Math.min(1, dt * 2.2);
        if (Math.abs(target - k) < 0.0005) k = target;
        apply();
      }
      magic.update(dt, t);
      valley.update(t);
      if (clouds.visible) clouds.position.x = Math.sin(t * 0.03) * 4;
      if (rays.visible) rays.rotation.y = t * 0.02;
    },
  };
}
