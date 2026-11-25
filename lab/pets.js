// Laboratorio: muestra los espíritus en todas sus poses para ajustarlos sin entrar al jardín.
// Uso: npm run dev → http://localhost:5173/lab/pets.html  (?side para verlos de costado, ?t=2 para congelar)
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createPet, lookFor } from '../src/scene/petRig.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1d1433');
scene.add(new THREE.HemisphereLight('#a184d8', '#2c2414', 1.3));
const dl = new THREE.DirectionalLight('#c3c4ff', 0.7);
dl.position.set(-3, 5, 4);
scene.add(dl);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#2f4a2b' }));
scene.add(ground);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 100);
const side = q.has('side');
const d = Number(q.get('d') || 1);
camera.position.set((side ? 9 : 5.5) * d, 3.2 * d, (side ? 1.6 : 7.5) * d + (side ? 0.75 : 0));
camera.lookAt(0, 0.25, side ? 0.75 : 1.2);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.45, 0.9));
composer.addPass(new OutputPass());

const POSES = ['idle', 'walk', 'trot', 'gallop', 'sit', 'lie', 'bow', 'rear', 'sniff', 'roll', 'shake', 'jump'];
const pick = q.get('pose');
const kinds = [
  { id: 'luca', species: 'perro', look: { fur: 'caramelo', ears: 'down', size: 'l', snout: 'mid', pattern: 'solid' } }, // Luca
  { id: 'a', species: 'perro', look: { fur: 'dorado', ears: 'tip', size: 'm' } },
  { id: 'b', species: 'perro', look: { fur: 'negro', ears: 'down', size: 'l' } },
  { id: 'c', species: 'perro', look: { fur: 'blanco', ears: 'up', size: 's' } },
  { id: 'd', species: 'gato', look: { fur: 'gris' } },
  { id: 'e', species: 'otro', look: { fur: 'crema' } },
  { id: 'f', species: 'perro', look: { fur: 'marron', ears: 'down', size: 'm', pattern: 'tuxedo' } },
];
const pets = [];
(pick ? kinds.map((k) => [k, pick]) : POSES.map((p, i) => [kinds[i % kinds.length], p])).forEach(([k, pose], i) => {
  const pet = createPet(lookFor(k));
  const col = i % 4;
  const row = Math.floor(i / 4);
  pet.group.position.set((col - 1.5) * 1.6, 0, row * 1.5);
  pet.group.rotation.y = side ? 0 : 0.6;
  scene.add(pet.group);
  pets.push({ pet, pose, t: 0 });
});

const SPEED = { walk: 0.8, trot: 1.9, gallop: 4.2 };
function step(dt) {
  for (const p of pets) {
    p.t += dt;
    const want = {};
    if (['sit', 'lie', 'bow', 'rear', 'sniff'].includes(p.pose)) want[p.pose] = true;
    if (p.pose === 'roll' && !p.pet.anim.busy && p.t > 0.3) p.pet.anim.trigger('roll');
    if (p.pose === 'roll') want.lie = true;
    if (p.pose === 'shake' && !p.pet.anim.busy && p.t > 0.3) p.pet.anim.trigger('shake');
    if (p.pose === 'jump' && !p.pet.anim.busy && p.t > 0.3) p.pet.anim.trigger('jump', { h: 0.5, d: 0.7 });
    p.pet.anim.update(dt, { speed: (SPEED[p.pose] || 0) * p.pet.s, turn: 0, excite: 0.7, want });
  }
}
const freeze = q.get('t');
if (freeze) {
  for (let i = 0; i < Number(freeze) * 60; i++) step(1 / 60);
  composer.render();
} else {
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => { step(Math.min(0.05, clock.getDelta())); composer.render(); });
}
window.__lab = { pets, step, render: () => composer.render() };

// ---------- modo manada: ?mode=pack ----------
// Simula el Prado sin renderizar entre medio para revisar estados y movimiento.
if (q.get('mode') === 'pack') {
  const { createSpirits, MEADOW } = await import('../src/scene/spirits.js');
  for (const p of pets) scene.remove(p.pet.group);
  pets.length = 0;
  const sp = createSpirits(scene, { blocked: () => false, tier: { grass: 20000 } });
  sp.setPack([
    { id: 'luca', name: 'Luca', species: 'perro', featured: true, look: { fur: 'dorado', ears: 'tip', size: 'm' } },
    { id: 't1', name: 'Toby', species: 'perro', candles: 3, look: { fur: 'negro', ears: 'down', size: 'l' } },
    { id: 't2', name: 'Nieve', species: 'perro', candles: 2, look: { fur: 'blanco', ears: 'up', size: 's' } },
    { id: 't3', name: 'Coco', species: 'perro', candles: 1, look: { fur: 'rojizo', ears: 'down', size: 'm' } },
    { id: 'g1', name: 'Michi', species: 'gato', candles: 1, look: { fur: 'gris' } },
  ]);
  ground.position.set(MEADOW.x, 0, MEADOW.z);
  camera.position.set(MEADOW.x + 6, 6, MEADOW.z + 9);
  camera.lookAt(MEADOW.x, 0, MEADOW.z);
  const playerPos = new THREE.Vector3(MEADOW.x + 4, 0, MEADOW.z + 6);
  const log = [];
  let simT = 0;
  const advance = (sec) => {
    for (let i = 0; i < sec * 60; i++) {
      simT += 1 / 60;
      sp.setPlayer(playerPos, Math.PI, false, 1 / 60);
      sp.update(1 / 60, camera.position);
      if (i % 30 === 0) log.push(`${simT.toFixed(1)} ${sp.pack.map((a) => `${a.name || '?'}:${a.state}`).join(' ')}`);
    }
    composer.render();
  };
  window.__lab = { sp, advance, log, render: () => composer.render(), camera, THREE, walk: (m) => sp.walk(m), playerPos };
}
