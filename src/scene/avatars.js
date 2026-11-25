// Las otras personas que están en el jardín ahora: el mismo personaje que el tuyo, con su nombre
// arriba, que dicen frases amables y mandan gestos (🤍 🕯️ 🐾 🌸 🫂 ✨). Si están paseando a su
// mascota, su espíritu camina al lado (lo maneja spirits.js con `list()`).
import * as THREE from 'three';
import { bubbleTexture, emojiTexture } from './textures.js';
import { createCharacter } from './character.js';
import { groundY } from './world.js';

export function createAvatars(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const people = new Map(); // sid -> persona
  const floaters = [];
  let visible = true;

  function make(o) {
    const ch = createCharacter({ hue: o.hue ?? 30 });
    const g = ch.group;
    const name = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture(o.name, { tail: false, font: '800 30px Nunito, sans-serif', bg: 'rgba(26,20,36,0.72)', fg: '#fbf4ea' }), transparent: true, depthWrite: false }));
    const aspect = name.material.map.userData.aspect;
    name.scale.set(0.22 * aspect, 0.22, 1);
    name.position.y = 1.72;
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    bubble.visible = false;
    g.add(name, bubble);
    g.position.set(o.x, 0, o.z);
    g.rotation.y = o.ry || 0;
    group.add(g);
    return { ch, g, bubble, name, target: new THREE.Vector3(o.x, 0, o.z), ry: o.ry || 0, lastGesture: 0, bubbleUntil: 0, speed: 0, data: o };
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
    // Para que los espíritus de los demás los sigan.
    list: () => (visible ? [...people.entries()].map(([sid, p]) => ({ sid, pos: p.g.position, pet: p.data.pet || null })) : []),
    update(list, now = Date.now()) {
      const seen = new Set();
      for (const o of list) {
        seen.add(o.sid);
        let p = people.get(o.sid);
        if (!p) { p = make(o); people.set(o.sid, p); }
        else if ((o.hue ?? 30) !== (p.data.hue ?? 30)) {
          const old = p.ch;
          p.ch = createCharacter({ hue: o.hue ?? 30 });
          p.ch.group.position.copy(p.g.position);
          p.ch.group.rotation.y = p.g.rotation.y;
          p.ch.group.add(p.name, p.bubble);
          group.remove(p.g);
          old.dispose();
          p.g = p.ch.group;
          group.add(p.g);
        }
        p.target.set(o.x, 0, o.z);
        p.ry = o.ry || 0;
        p.data = o;
        // Gestos nuevos.
        if (o.gestureAt && o.gestureAt !== p.lastGesture && now - o.gestureAt < 20_000) {
          p.lastGesture = o.gestureAt;
          if (o.emote) {
            p.ch.wave();
            for (let i = 0; i < 3; i++) setTimeout(() => float(o.emote, p.g.position.clone().add(new THREE.Vector3(0, 1.5, 0))), i * 220);
          }
          if (o.say) {
            const tex = bubbleTexture(o.say);
            p.bubble.material.map?.dispose();
            p.bubble.material.map = tex;
            p.bubble.material.needsUpdate = true;
            p.bubble.scale.set(0.27 * tex.userData.aspect, 0.27, 1);
            p.bubble.position.y = 1.98;
            p.bubble.visible = true;
            p.bubbleUntil = performance.now() + 5000;
          }
        }
      }
      for (const [sid, p] of people) {
        if (!seen.has(sid)) {
          group.remove(p.g);
          p.name.material.map?.dispose();
          p.name.material.dispose();
          p.bubble.material.map?.dispose();
          p.bubble.material.dispose();
          p.ch.dispose();
          people.delete(sid);
        }
      }
    },
    // Un gesto propio: aparece sobre tu personaje para que lo veas.
    // Saludo al cruzarse: devuelve true si alguien que no te saludó hace poco pasa cerca (y lo hace saludar).
    greetNear(pos, r = 3.2, nowMs = performance.now()) {
      if (!visible) return false;
      let any = false;
      for (const p of people.values()) {
        if (p.g.position.distanceTo(pos) > r || nowMs - (p.greetedAt || 0) < 60_000) continue;
        p.greetedAt = nowMs;
        p.g.rotation.y = Math.atan2(pos.x - p.g.position.x, pos.z - p.g.position.z);
        p.ch.wave();
        any = true;
      }
      return any;
    },
    floatAt(ch, at) {
      for (let i = 0; i < 4; i++) setTimeout(() => float(ch, at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0, 0)), 0.3), i * 160);
    },
    animate(dt) {
      const nowMs = performance.now();
      for (const p of people.values()) {
        const g = p.g;
        const dx = p.target.x - g.position.x;
        const dz = p.target.z - g.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 25) { g.position.x = p.target.x; g.position.z = p.target.z; }
        const bx = g.position.x;
        const bz = g.position.z;
        // Camina hacia donde está (a ritmo de caminata, no deslizándose).
        if (d > 0.04 && d <= 25) {
          const step = Math.min(d, Math.max(1.2, d * 1.6) * dt);
          g.position.x += (dx / d) * step;
          g.position.z += (dz / d) * step;
        }
        g.position.y = groundY(g.position.x, g.position.z, (p.data.fl || 0) > 0);
        const moved = Math.hypot(g.position.x - bx, g.position.z - bz) / Math.max(dt, 1e-3);
        p.speed += (moved - p.speed) * Math.min(1, dt * 6);
        const face = d > 0.15 ? Math.atan2(dx, dz) : p.ry;
        const diff = Math.atan2(Math.sin(face - g.rotation.y), Math.cos(face - g.rotation.y));
        g.rotation.y += diff * Math.min(1, dt * 6);
        p.ch.update(dt, { speed: p.speed, turn: diff * 2 });
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
    },
  };
}
