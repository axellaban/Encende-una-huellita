// Farolitos de papel que suben al cielo cada vez que alguien enciende una vela,
// unos cuantos que ya flotan a lo lejos, y destellos al encender.
import * as THREE from 'three';
import { glowTexture, lanternTexture, bubbleTexture, flameTexture } from './textures.js';

// El farolito de papel: cuerpo redondeado, aros y tapita de madera, papel calado iluminado desde
// adentro, una llamita que titila y una borla abajo. Se usa para los que suben al cielo, los que
// flotan lejos y las guirnaldas sobre el camino.
let kitCache = null;
function kit() {
  if (kitCache) return kitCache;
  const prof = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    prof.push(new THREE.Vector2(0.1 + Math.sin(t * Math.PI) * 0.085, (t - 0.5) * 0.36));
  }
  kitCache = {
    body: new THREE.LatheGeometry(prof, 16),
    ring: new THREE.TorusGeometry(0.1, 0.012, 6, 16).rotateX(Math.PI / 2),
    cap: new THREE.CylinderGeometry(0.03, 0.06, 0.04, 8).translate(0, 0.2, 0),
    tassel: new THREE.ConeGeometry(0.022, 0.1, 6).rotateX(Math.PI).translate(0, -0.26, 0),
  };
  return kitCache;
}
export function paperLantern({ scale = 1, tint = [2.2, 1.3, 0.6], glow = 1.4 } = {}) {
  const K = kit();
  const g = new THREE.Group();
  const wood = new THREE.MeshBasicMaterial({ color: '#3a2418', transparent: true });
  const body = new THREE.Mesh(K.body, new THREE.MeshBasicMaterial({ map: lanternTexture(), side: THREE.DoubleSide, transparent: true, color: new THREE.Color(tint[0] * 0.52, tint[1] * 0.52, tint[2] * 0.52) }));
  const top = new THREE.Mesh(K.ring, wood);
  top.position.y = 0.18;
  const bot = new THREE.Mesh(K.ring, wood);
  bot.position.y = -0.18;
  const cap = new THREE.Mesh(K.cap, wood);
  const tassel = new THREE.Mesh(K.tassel, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.35, 0.5), transparent: true }));
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), color: new THREE.Color(2.2, 1.6, 0.9), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  flame.scale.set(0.06, 0.11, 1);
  flame.position.y = -0.06;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, color: new THREE.Color(tint[0] * 0.28, tint[1] * 0.28, tint[2] * 0.28) }));
  halo.scale.setScalar(glow);
  g.add(body, top, bot, cap, tassel, flame, halo);
  g.scale.setScalar(scale);
  g.userData.lamp = { flame, halo, seed: Math.random() * 10 };
  return g;
}
// La llamita titila y el halo respira.
export function flickerLantern(l, t) {
  const u = l.userData.lamp;
  if (!u) return;
  const n = Math.sin(t * 9 + u.seed) * 0.5 + Math.sin(t * 15.3 + u.seed * 2) * 0.5;
  u.flame.scale.set(0.06 + n * 0.006, 0.11 + n * 0.016, 1);
  u.halo.material.opacity = (u.base ?? 1) * (0.82 + n * 0.12);
}
function fadeLantern(l, f) {
  l.traverse((o) => { if (o.material) o.material.opacity = f; });
  if (l.userData.lamp) l.userData.lamp.base = f;
}
const TINTS = [[2.2, 0.9, 1.3], [2.2, 1.3, 0.5], [1.3, 0.9, 2.0], [0.8, 1.8, 1.6], [2.2, 1.7, 0.6]];

export function createLanterns(scene, tier) {
  const live = [];

  function makeLantern(scale = 1) {
    return paperLantern({ scale, tint: TINTS[Math.floor(Math.random() * TINTS.length)], glow: tier.bloom ? 1.1 : 1.6 });
  }

  // Farolitos lejanos que siempre están en el cielo.
  const ambient = [];
  for (let i = 0; i < 32; i++) {
    const l = makeLantern(1.6 + Math.random() * 1.2);
    const a = Math.random() * Math.PI * 2;
    const d = 40 + Math.random() * 60;
    Object.assign(l.userData, { a, d, y: 18 + Math.random() * 35, speed: 0.02 + Math.random() * 0.03, seed: Math.random() * 10 });
    scene.add(l);
    ambient.push(l);
  }

  // Destellos.
  const SPARKS = 60;
  const bursts = [];
  const sparkMat = new THREE.PointsMaterial({ map: glowTexture(), size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(2.6, 1.2, 0.3) });

  return {
    // Un farolito que sale desde `from` y sube al cielo.
    release(from, { label = null, scale = 1 } = {}) {
      if (live.length > 30) {
        const old = live.shift();
        scene.remove(old);
      }
      const l = makeLantern(scale);
      l.position.copy(from);
      if (label) {
        const t = bubbleTexture(label, { tail: false, font: '700 40px Caveat, cursive', bg: 'rgba(253,241,220,0.92)', fg: '#3a1f2b' });
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
        sp.scale.set(0.32 * t.userData.aspect, 0.32, 1);
        sp.position.y = 0.55;
        l.add(sp);
      }
      Object.assign(l.userData, { t: 0, seed: Math.random() * 10, vx: (Math.random() - 0.5) * 0.25, vz: (Math.random() - 0.5) * 0.25 });
      scene.add(l);
      live.push(l);
    },
    burst(at) {
      const pos = new Float32Array(SPARKS * 3);
      const vel = [];
      for (let i = 0; i < SPARKS; i++) {
        pos.set([at.x, at.y, at.z], i * 3);
        const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(0.8 + Math.random() * 1.6);
        vel.push(v);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, sparkMat.clone());
      scene.add(pts);
      bursts.push({ pts, vel, t: 0 });
    },
    update(dt, t) {
      for (let i = live.length - 1; i >= 0; i--) {
        const l = live[i];
        const u = l.userData;
        u.t += dt;
        const rise = Math.min(1, u.t / 2.5);
        l.position.y += dt * (0.25 + rise * 0.55);
        l.position.x += dt * (u.vx + Math.sin(t * 0.6 + u.seed) * 0.12);
        l.position.z += dt * (u.vz + Math.cos(t * 0.5 + u.seed) * 0.1);
        l.rotation.y += dt * 0.3;
        const fade = u.t > 45 ? Math.max(0, 1 - (u.t - 45) / 10) : 1;
        if (fade < 1) fadeLantern(l, fade);
        flickerLantern(l, t);
        if (u.t > 55) {
          scene.remove(l);
          live.splice(i, 1);
        }
      }
      for (const l of ambient) {
        const u = l.userData;
        u.a += dt * u.speed * 0.05;
        l.position.set(Math.sin(u.a) * u.d, u.y + Math.sin(t * 0.2 + u.seed) * 1.5, Math.cos(u.a) * u.d - 10);
        flickerLantern(l, t);
      }
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.t += dt;
        const p = b.pts.geometry.attributes.position.array;
        for (let k = 0; k < b.vel.length; k++) {
          const v = b.vel[k];
          v.y -= dt * 1.2;
          v.multiplyScalar(1 - dt * 1.5);
          p[k * 3] += v.x * dt;
          p[k * 3 + 1] += v.y * dt;
          p[k * 3 + 2] += v.z * dt;
        }
        b.pts.geometry.attributes.position.needsUpdate = true;
        b.pts.material.opacity = Math.max(0, 1 - b.t / 1.6);
        if (b.t > 1.6) {
          scene.remove(b.pts);
          b.pts.geometry.dispose();
          b.pts.material.dispose();
          bursts.splice(i, 1);
        }
      }
    },
  };
}
