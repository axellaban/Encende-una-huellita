// Caminar y mirar.
// Táctil: tocá el piso para caminar, arrastrá con un dedo para mirar, pellizcá para acercar.
// Compu: clic para caminar, arrastrá para mirar, rueda para acercar, WASD/flechas para moverte.
import * as THREE from 'three';
import { GARDEN_RADIUS } from './world.js';

const EYE = 1.6;
const BODY = 0.4;
const FOV_MIN = 38;
const FOV_MAX = 72;

export function createControls(camera, dom, colliders, { reduced = false } = {}) {
  let yaw = 0;
  let pitch = -0.06;
  let vYaw = 0;
  let vPitch = 0;
  let fovTarget = camera.fov;
  const pos = camera.position;
  let walkTarget = null;
  let walkSpeed = 0;
  let fly = null;
  let bob = 0;
  const keys = new Set();
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  let enabled = true;
  const joy = { x: 0, y: 0 };
  const listeners = { tap: [], hover: [], move: [] };

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.3, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, 1.0), transparent: true, opacity: 0.8, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;

  const apply = () => camera.rotation.set(pitch, yaw, 0, 'YXZ');
  apply();

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

  const pinchDist = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  dom.addEventListener('pointerdown', (e) => {
    if (!enabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dom.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      drag = null;
      pinch = { d: pinchDist(), fov: fovTarget };
      return;
    }
    vYaw = 0;
    vPitch = 0;
    drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), id: e.pointerId, moved: false, lastT: performance.now() };
  });

  dom.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      fovTarget = THREE.MathUtils.clamp(pinch.fov * (pinch.d / Math.max(20, pinchDist())), FOV_MIN, FOV_MAX);
      return;
    }
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      const now = performance.now();
      const dt = Math.max(1, now - drag.lastT) / 1000;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.lastT = now;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 7) drag.moved = true;
      if (drag.moved) {
        // Más sensibilidad con zoom abierto, menos con zoom cerrado.
        const k = (e.pointerType === 'touch' ? 0.0062 : 0.0042) * (camera.fov / 62);
        yaw += dx * k;
        pitch = THREE.MathUtils.clamp(pitch + dy * k, -1.05, 0.95);
        vYaw = (dx * k) / dt;
        vPitch = (dy * k) / dt;
        fly = null;
        apply();
      }
    } else if (e.pointerType === 'mouse' && !e.buttons) {
      listeners.hover.forEach((fn) => fn(e));
    }
  });

  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!drag || drag.id !== e.pointerId) return;
    const wasTap = !drag.moved && performance.now() - drag.t < 500;
    if (performance.now() - drag.lastT > 60) { vYaw = 0; vPitch = 0; }
    drag = null;
    if (wasTap && e.type === 'pointerup') listeners.tap.forEach((fn) => fn(e));
  };
  dom.addEventListener('pointerup', end);
  dom.addEventListener('pointercancel', end);

  dom.addEventListener('wheel', (e) => {
    e.preventDefault();
    fovTarget = THREE.MathUtils.clamp(fovTarget + e.deltaY * 0.03, FOV_MIN, FOV_MAX);
  }, { passive: false });

  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select, [contenteditable], dialog')) return;
    keys.add(e.key.toLowerCase());
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  function faceAngles(from, target) {
    const look = new THREE.Vector3().subVectors(target, from);
    return { yaw: Math.atan2(-look.x, -look.z), pitch: Math.atan2(look.y, Math.hypot(look.x, look.z)) };
  }

  return {
    marker,
    onTap: (fn) => listeners.tap.push(fn),
    onHover: (fn) => listeners.hover.push(fn),
    onMove: (fn) => listeners.move.push(fn),
    set enabled(v) { enabled = v; if (!v) { drag = null; pinch = null; pointers.clear(); } },
    get flying() { return !!fly; },
    get yaw() { return yaw; },
    setJoystick(x, y) { joy.x = x; joy.y = y; if (x || y) { fly = null; walkTarget = null; marker.visible = false; } },
    walkTo(point) {
      fly = null;
      walkTarget = new THREE.Vector3(point.x, EYE, point.z);
      marker.position.set(point.x, (point.y || 0) + 0.03, point.z);
      marker.visible = true;
    },
    // Vuelo suave a un punto mirando a un objetivo. `path` opcional: puntos intermedios (curva).
    flyTo(stand, target, done, { path = null, duration = null } = {}) {
      walkTarget = null;
      marker.visible = false;
      const to = faceAngles(stand, target);
      let dYaw = to.yaw - yaw;
      dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
      const dist = pos.distanceTo(stand);
      const curve = path ? new THREE.CatmullRomCurve3([pos.clone(), ...path, stand.clone()]) : null;
      fly = {
        from: pos.clone(), to: stand.clone(), curve, yaw0: yaw, dYaw, pitch0: pitch, pitch1: to.pitch,
        t: 0, dur: duration ?? (reduced ? 0.35 : THREE.MathUtils.clamp(dist / 7, 0.7, 2.6)), done,
      };
    },
    teleport(p, target) {
      pos.copy(p);
      const a = faceAngles(p, target);
      yaw = a.yaw;
      pitch = a.pitch;
      fly = null;
      walkTarget = null;
      apply();
    },
    stop() {
      walkTarget = null;
      marker.visible = false;
    },
    update(dt) {
      if (Math.abs(camera.fov - fovTarget) > 0.05) {
        camera.fov += (fovTarget - camera.fov) * Math.min(1, dt * 10);
        camera.updateProjectionMatrix();
      }
      if (fly) {
        fly.t = Math.min(1, fly.t + dt / fly.dur);
        const k = fly.t < 0.5 ? 4 * fly.t ** 3 : 1 - (-2 * fly.t + 2) ** 3 / 2;
        if (fly.curve) pos.copy(fly.curve.getPoint(k));
        else {
          pos.lerpVectors(fly.from, fly.to, k);
          pos.y = THREE.MathUtils.lerp(fly.from.y, fly.to.y, k) + Math.sin(k * Math.PI) * Math.min(1.6, fly.from.distanceTo(fly.to) * 0.07);
        }
        yaw = fly.yaw0 + fly.dYaw * k;
        pitch = fly.pitch0 + (fly.pitch1 - fly.pitch0) * k;
        apply();
        if (fly.t >= 1) {
          const cb = fly.done;
          fly = null;
          cb?.();
        }
        return;
      }
      // Inercia al soltar el arrastre.
      if (!drag && (Math.abs(vYaw) > 0.01 || Math.abs(vPitch) > 0.01)) {
        yaw += vYaw * dt;
        pitch = THREE.MathUtils.clamp(pitch + vPitch * dt, -1.05, 0.95);
        const decay = Math.exp(-dt * 7);
        vYaw *= decay;
        vPitch *= decay;
        apply();
      }
      const run = keys.has('shift') ? 2 : 1;
      let fx = 0;
      let fz = 0;
      if (keys.has('w') || keys.has('arrowup')) fz -= 1;
      if (keys.has('s') || keys.has('arrowdown')) fz += 1;
      if (keys.has('a')) fx -= 1;
      if (keys.has('d')) fx += 1;
      if (keys.has('arrowleft') || keys.has('q')) { yaw += 1.8 * dt; apply(); }
      if (keys.has('arrowright') || keys.has('e')) { yaw -= 1.8 * dt; apply(); }
      const jm = Math.hypot(joy.x, joy.y);
      if (jm > 0.12) {
        // Palanca: hacia arriba camina, a los costados gira suave y se corre un poco.
        fz += joy.y * Math.min(1, jm * 1.2);
        fx += joy.x * 0.55;
        yaw -= joy.x * 1.5 * dt;
        apply();
      }
      let moving = false;
      if (fx || fz) {
        walkTarget = null;
        marker.visible = false;
        const len = Math.max(1, Math.hypot(fx, fz));
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);
        const sp = 3.6 * run * dt;
        moving = tryMove(((fx * cos + fz * sin) / len) * sp, ((-fx * sin + fz * cos) / len) * sp);
      } else if (walkTarget) {
        const dx = walkTarget.x - pos.x;
        const dz = walkTarget.z - pos.z;
        const d = Math.hypot(dx, dz);
        // Acelera al arrancar y frena al llegar.
        walkSpeed = Math.min(walkSpeed + dt * 9, 4.8, d * 2.2 + 0.4);
        if (d < 0.06) {
          walkTarget = null;
          walkSpeed = 0;
          marker.visible = false;
        } else {
          const step = Math.min(d, walkSpeed * dt);
          moving = tryMove((dx / d) * step, (dz / d) * step);
          if (!moving) { walkTarget = null; walkSpeed = 0; marker.visible = false; }
        }
      }
      if (moving && !reduced) bob += dt * 9;
      const targetY = EYE + (moving && !reduced ? Math.sin(bob) * 0.025 : 0);
      pos.y += (targetY - pos.y) * Math.min(1, dt * 10);
      if (moving) listeners.move.forEach((fn) => fn());
      if (marker.visible) {
        const s = 1 + Math.sin(performance.now() / 160) * 0.12;
        marker.scale.set(s, s, s);
      }
    },
  };
}
