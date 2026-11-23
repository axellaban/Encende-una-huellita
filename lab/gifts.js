// Muestra los 36 regalitos en 3D en una grilla, con la misma luz de noche del jardín.
import * as THREE from 'three';
import { giftMesh, idleGift, GIFT_EMOJIS } from '../src/scene/gifts3d.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a1230');
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 8.2, 11.5);
camera.lookAt(0, 0.2, 0);
scene.add(new THREE.HemisphereLight('#b7a6ff', '#3a2030', 1.4));
const key = new THREE.DirectionalLight('#ffd9a0', 1.6);
key.position.set(3, 6, 5);
scene.add(key);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshLambertMaterial({ color: '#3a2a40' }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const items = GIFT_EMOJIS.map((ch, i) => {
  const g = giftMesh(ch);
  const col = i % 6;
  const row = Math.floor(i / 6);
  g.position.set((col - 2.5) * 1.5, 0, (row - 2.5) * 1.35);
  scene.add(g);
  return g;
});
const frozen = Number(new URLSearchParams(location.search).get('t'));
function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = frozen || clock.getElapsedTime();
  items.forEach((g, i) => { g.rotation.y = Math.sin(t * 0.5 + i) * 0.5; idleGift(g, t); });
  renderer.render(scene, camera);
});
window.__lab = { items, scene, camera };
