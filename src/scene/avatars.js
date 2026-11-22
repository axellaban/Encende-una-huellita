// Las otras personas que están en el jardín ahora: personajitos con su nombre arriba,
// que dicen frases amables y mandan gestos (🤍 🕯️ 🐾 🌸 🫂 ✨).
import * as THREE from 'three';
import { bubbleTexture, emojiTexture } from './textures.js';
import { calaveraTexture, marigoldGeometry, marigoldMaterial } from './muertos.js';

export function createAvatars(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const people = new Map(); // sid -> persona
  const floaters = [];
  let visible = true;

  const headGeo = new THREE.SphereGeometry(0.19, 16, 12);
  const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.42, 6, 12);
  const eyeGeo = new THREE.SphereGeometry(0.022, 8, 6);
  const scarfGeo = new THREE.TorusGeometry(0.17, 0.05, 8, 18).rotateX(Math.PI / 2);
  const skin = new THREE.MeshLambertMaterial({ color: '#fbf3e6', emissive: '#3a2a2a' });
  const flowerGeo = marigoldGeometry(0.055, '#ff9a1f');
  const flowerMat = marigoldMaterial();
  const hatMat = new THREE.MeshLambertMaterial({ color: '#2a1d2e' });
  const hatBand = new THREE.MeshLambertMaterial({ color: '#e4167c', emissive: '#4a0a2a' });
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#2a1d16' });

  function make(o) {
    const g = new THREE.Group();
    const color = new THREE.Color().setHSL((o.hue ?? 30) / 360, 0.45, 0.62);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color }));
    body.position.y = 0.42;
    const head = new THREE.Mesh(headGeo, skin);
    head.position.y = 0.98;
    const scarf = new THREE.Mesh(scarfGeo, new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(((o.hue ?? 30) + 160) / 360, 0.5, 0.6) }));
    scarf.position.y = 0.8;
    void eyeGeo; void eyeMat;
    // Cara de calaverita pintada.
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), new THREE.MeshLambertMaterial({ map: calaveraTexture(o.hue ?? 30), emissive: '#2a1a1a' }));
    face.position.set(0, 0.99, 0.178);
    const eyes = [face];
    // Corona de cempasúchil o sombrero, según la persona.
    if (Math.round(o.hue ?? 0) % 2 === 0) {
      for (let i = 0; i < 7; i++) {
        const f = new THREE.Mesh(flowerGeo, flowerMat);
        const a = (i / 7) * Math.PI * 2;
        f.position.set(Math.cos(a) * 0.16, 1.13, Math.sin(a) * 0.16);
        eyes.push(f);
      }
    } else {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 20), hatMat);
      brim.position.y = 1.12;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.16, 16), hatMat);
      crown.position.y = 1.2;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.035, 16), hatBand);
      band.position.y = 1.145;
      eyes.push(brim, crown, band);
    }
    const name = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture(o.name, { tail: false, font: '800 30px Nunito, sans-serif', bg: 'rgba(26,20,36,0.72)', fg: '#fbf4ea' }), transparent: true, depthWrite: false }));
    const aspect = name.material.map.userData.aspect;
    name.scale.set(0.22 * aspect, 0.22, 1);
    name.position.y = 1.5;
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    bubble.visible = false;
    g.add(body, head, scarf, ...eyes, name, bubble);
    g.position.set(o.x, 0, o.z);
    group.add(g);
    return { g, body, head, bubble, target: new THREE.Vector3(o.x, 0, o.z), ry: o.ry || 0, lastGesture: 0, bubbleUntil: 0, phase: Math.random() * 6, data: o };
  }

  function float(ch, at, scale = 0.35) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(ch), transparent: true, depthWrite: false }));
    sp.position.copy(at);
    sp.scale.setScalar(scale);
    group.add(sp);
    floaters.push({ sp, t: 0, drift: (Math.random() - 0.5) * 0.4 });
  }

  return {
    get visible() { return visible; },
    set visible(v) { visible = v; group.visible = v; },
    count: () => people.size,
    update(list, now = Date.now()) {
      const seen = new Set();
      for (const o of list) {
        seen.add(o.sid);
        let p = people.get(o.sid);
        if (!p) { p = make(o); people.set(o.sid, p); }
        p.target.set(o.x, 0, o.z);
        p.ry = o.ry || 0;
        p.data = o;
        // Gestos nuevos.
        if (o.gestureAt && o.gestureAt !== p.lastGesture && now - o.gestureAt < 20_000) {
          p.lastGesture = o.gestureAt;
          if (o.emote) for (let i = 0; i < 3; i++) setTimeout(() => float(o.emote, p.g.position.clone().add(new THREE.Vector3(0, 1.2, 0))), i * 220);
          if (o.say) {
            const tex = bubbleTexture(o.say);
            p.bubble.material.map?.dispose();
            p.bubble.material.map = tex;
            p.bubble.material.needsUpdate = true;
            p.bubble.scale.set(0.27 * tex.userData.aspect, 0.27, 1);
            p.bubble.position.y = 1.72;
            p.bubble.visible = true;
            p.bubbleUntil = performance.now() + 5000;
          }
        }
      }
      for (const [sid, p] of people) {
        if (!seen.has(sid)) {
          group.remove(p.g);
          people.delete(sid);
        }
      }
    },
    // Mi propio gesto: aparece delante de la cámara para que lo vea.
    floatAt(ch, at) {
      for (let i = 0; i < 4; i++) setTimeout(() => float(ch, at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0, 0)), 0.3), i * 160);
    },
    animate(dt, t) {
      const nowMs = performance.now();
      for (const p of people.values()) {
        const g = p.g;
        const d = g.position.distanceTo(p.target);
        if (d > 25) g.position.copy(p.target);
        const moving = d > 0.05;
        g.position.lerp(p.target, Math.min(1, dt * 2.2));
        let diff = (moving ? Math.atan2(p.target.x - g.position.x, p.target.z - g.position.z) : p.ry + Math.PI) - g.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        g.rotation.y += diff * Math.min(1, dt * 4);
        p.phase += dt * (moving ? 10 : 2);
        g.position.y = moving ? Math.abs(Math.sin(p.phase)) * 0.05 : 0;
        p.head.rotation.z = Math.sin(p.phase * 0.5) * (moving ? 0.05 : 0.08);
        if (p.bubble.visible && nowMs > p.bubbleUntil) p.bubble.visible = false;
      }
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.t += dt;
        f.sp.position.y += dt * 0.6;
        f.sp.position.x += dt * f.drift;
        f.sp.material.opacity = Math.max(0, 1 - f.t / 2.2);
        if (f.t > 2.2) {
          group.remove(f.sp);
          f.sp.material.dispose();
          floaters.splice(i, 1);
        }
      }
      void t;
    },
  };
}
