// Brillitos diminutos que caen muy despacio en el aire, alrededor de la cámara (siempre hay, vayas
// donde vayas, y en todos los pisos). Todo se mueve en la GPU: un solo dibujo, sin costo en JS.
import * as THREE from 'three';
import { uTime } from './world.js';

export function createSparkles(scene, tier, pixelRatio = 1) {
  const N = tier.grass >= 40000 ? 460 : tier.grass >= 20000 ? 320 : 180;
  const BOX = new THREE.Vector3(24, 11, 24);
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = Math.random() * BOX.x;
    pos[i * 3 + 1] = Math.random() * BOX.y;
    pos[i * 3 + 2] = Math.random() * BOX.z;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const uCam = { value: new THREE.Vector3() };
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime, uCam, uBox: { value: BOX }, uPx: { value: pixelRatio } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime; uniform vec3 uCam; uniform vec3 uBox; uniform float uPx;
      attribute float aSeed; varying float vA; varying vec3 vC;
      void main(){
        vec3 p = position;
        p.y -= uTime * (0.07 + aSeed * 0.12);                 // caen muy despacio
        p.x += sin(uTime * 0.35 + aSeed * 40.0) * 0.5;        // y se mecen
        p.z += cos(uTime * 0.3 + aSeed * 31.0) * 0.5;
        p = uCam + mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;   // siempre alrededor tuyo
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        float tw = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTime * (1.2 + aSeed * 2.5) + aSeed * 60.0), 2.0);
        vA = tw * smoothstep(0.8, 2.2, d) * (1.0 - smoothstep(8.0, 11.5, d));
        vC = aSeed < 0.65 ? vec3(1.7, 1.3, 0.75) : vec3(1.25, 1.2, 1.6);
        gl_PointSize = (1.4 + aSeed * 1.8) * uPx * clamp(5.0 / max(d, 0.5), 0.5, 2.2);
      }`,
    fragmentShader: `varying float vA; varying vec3 vC;
      void main(){
        float r = length(gl_PointCoord - 0.5);
        float a = (1.0 - smoothstep(0.0, 0.5, r));
        gl_FragColor = vec4(vC, a * a * vA * 0.85);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  scene.add(pts);
  return {
    update(camPos) { uCam.value.copy(camPos); },
    set visible(v) { pts.visible = v; },
  };
}
