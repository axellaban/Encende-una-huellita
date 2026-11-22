// Caminar y mirar: tocá el piso para caminar, arrastrá para mirar, WASD/flechas en teclado.
import * as THREE from 'three';
import { GARDEN_RADIUS } from './world.js';

const EYE = 1.6;
const BODY = 0.4;

export function createControls(camera, dom, colliders) {
  let yaw = 0;
  let pitch = -0.05;
  const pos = camera.position;
  let walkTarget = null;
  let fly = null; // { from, to, lookFrom, lookTo, t, dur, done }
  const keys = new Set();
  let drag = null;
  const listeners = { tap: [], hover: [] };
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.3, 32),
    new THREE.MeshBasicMaterial({ color: '#ffe2b8', transparent: true, opacity: 0.8, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;

  function applyRotation() {
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }
  applyRotation();

  function blocked(x, z) {
    if (Math.hypot(x, z) > GARDEN_RADIUS - 0.8) return true;
    for (const c of colliders.circles) if (Math.hypot(x - c.x, z - c.z) < c.r + BODY) return true;
    for (const [x1, z1, x2, z2] of colliders.segments) {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - (x1 + t * dx), z - (z1 + t * dz)) < BODY + 0.15) return true;
    }
    return false;
  }

  function tryMove(dx, dz) {
    if (!blocked(pos.x + dx, pos.z + dz)) { pos.x += dx; pos.z += dz; return true; }
    if (!blocked(pos.x + dx, pos.z)) { pos.x += dx; return true; }
    if (!blocked(pos.x, pos.z + dz)) { pos.z += dz; return true; }
    return false;
  }

  dom.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), id: e.pointerId };
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointermove', (e) => {
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
        const k = e.pointerType === 'touch' ? 0.006 : 0.004;
        yaw += dx * k;
        pitch = THREE.MathUtils.clamp(pitch + dy * k, -1.0, 0.9);
        fly = null;
        applyRotation();
      }
    } else if (e.pointerType === 'mouse') {
      listeners.hover.forEach((fn) => fn(e));
    }
  });
  dom.addEventListener('pointerup', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
    const quick = performance.now() - drag.t < 450;
    drag = null;
    if (moved < 8 && quick) listeners.tap.forEach((fn) => fn(e));
  });
  dom.addEventListener('pointercancel', () => { drag = null; });

  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  return {
    marker,
    onTap: (fn) => listeners.tap.push(fn),
    onHover: (fn) => listeners.hover.push(fn),
    get yaw() { return yaw; },
    walkTo(point) {
      fly = null;
      walkTarget = new THREE.Vector3(point.x, EYE, point.z);
      marker.position.set(point.x, (point.y || 0) + 0.03, point.z);
      marker.visible = true;
    },
    // Vuelo suave hasta un punto mirando a un objetivo (por ejemplo, un marco del muro).
    flyTo(stand, target, done) {
      walkTarget = null;
      marker.visible = false;
      const look = new THREE.Vector3().subVectors(target, stand);
      const toYaw = Math.atan2(-look.x, -look.z);
      const toPitch = Math.atan2(look.y, Math.hypot(look.x, look.z));
      let dYaw = toYaw - yaw;
      dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
      const dist = pos.distanceTo(stand);
      fly = {
        from: pos.clone(), to: stand.clone(), yaw0: yaw, dYaw, pitch0: pitch, pitch1: toPitch,
        t: 0, dur: THREE.MathUtils.clamp(dist / 6, 0.6, 3.2), done,
      };
    },
    teleport(p, newYaw = 0) {
      pos.copy(p);
      yaw = newYaw;
      pitch = -0.05;
      fly = null;
      walkTarget = null;
      applyRotation();
    },
    update(dt) {
      if (fly) {
        fly.t = Math.min(1, fly.t + dt / fly.dur);
        const k = fly.t < 0.5 ? 4 * fly.t ** 3 : 1 - (-2 * fly.t + 2) ** 3 / 2;
        pos.lerpVectors(fly.from, fly.to, k);
        // Arco suave por encima del piso para no atravesar cosas visualmente.
        pos.y = EYE + Math.sin(k * Math.PI) * Math.min(2, fly.from.distanceTo(fly.to) * 0.08);
        yaw = fly.yaw0 + fly.dYaw * k;
        pitch = fly.pitch0 + (fly.pitch1 - fly.pitch0) * k;
        applyRotation();
        if (fly.t >= 1) {
          const cb = fly.done;
          fly = null;
          cb?.();
        }
        return;
      }
      const speed = (keys.has('shift') ? 7 : 3.6) * dt;
      let fx = 0;
      let fz = 0;
      if (keys.has('w') || keys.has('arrowup')) fz -= 1;
      if (keys.has('s') || keys.has('arrowdown')) fz += 1;
      if (keys.has('a')) fx -= 1;
      if (keys.has('d')) fx += 1;
      if (keys.has('arrowleft') || keys.has('q')) { yaw += 1.8 * dt; applyRotation(); }
      if (keys.has('arrowright') || keys.has('e')) { yaw -= 1.8 * dt; applyRotation(); }
      if (fx || fz) {
        walkTarget = null;
        marker.visible = false;
        const len = Math.hypot(fx, fz);
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);
        tryMove(((fx * cos + fz * sin) / len) * speed, ((-fx * sin + fz * cos) / len) * speed);
      } else if (walkTarget) {
        const dx = walkTarget.x - pos.x;
        const dz = walkTarget.z - pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.08) {
          walkTarget = null;
          marker.visible = false;
        } else {
          const step = Math.min(d, speed * 1.2);
          if (!tryMove((dx / d) * step, (dz / d) * step)) { walkTarget = null; marker.visible = false; }
        }
      }
      pos.y += (EYE - pos.y) * Math.min(1, dt * 8);
      if (marker.visible) marker.material.opacity = 0.5 + Math.sin(performance.now() / 180) * 0.3;
    },
  };
}
