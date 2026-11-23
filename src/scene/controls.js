// Tercera persona: tu personaje camina por el jardín y la cámara lo sigue desde atrás.
// Táctil: tocá el piso para ir, usá la palanca para caminar, arrastrá para girar la cámara,
// pellizcá para acercarla o alejarla. Compu: clic para ir, WASD/flechas para caminar (Shift corre),
// arrastrá para girar, rueda para acercar, Q/E para girar la cámara.
//
// La cámara tiene tres modos: "follow" (sigue al personaje), "focus" (mira un punto fijo, por ejemplo
// un marco del muro; arrastrar orbita alrededor) y "fixed" (la intro).
import * as THREE from 'three';
import { GARDEN_RADIUS, SPAWN } from './world.js';

const BODY = 0.3;
const HEAD = 1.3;
const DIST_MIN = 2.3;
const DIST_MAX = 10;

export function createBlocker(colliders) {
  return function blocked(x, z, body = BODY) {
    if (Math.hypot(x, z) > GARDEN_RADIUS - 0.6 - body) return true;
    for (const c of colliders.circles) if (Math.hypot(x - c.x, z - c.z) < c.r + body) return true;
    for (const [x1, z1, x2, z2] of colliders.segments) {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - (x1 + t * dx), z - (z1 + t * dz)) < body + 0.15) return true;
    }
    return false;
  };
}

// Intersección 2D entre el segmento p→q y un muro; devuelve t en [0,1] o null.
function segHit(px, pz, qx, qz, [x1, z1, x2, z2]) {
  const rx = qx - px;
  const rz = qz - pz;
  const sx = x2 - x1;
  const sz = z2 - z1;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((x1 - px) * sz - (z1 - pz) * sx) / den;
  const u = ((x1 - px) * rz - (z1 - pz) * rx) / den;
  return t >= 0 && t <= 1 && u >= -0.05 && u <= 1.05 ? t : null;
}

export function createControls(camera, dom, colliders, { reduced = false } = {}) {
  const blocked = createBlocker(colliders);
  const player = { pos: new THREE.Vector3(SPAWN.x, 0, SPAWN.z), heading: Math.PI, speed: 0, turn: 0, moving: false };
  let mode = 'fixed';
  let yaw = 0;
  let pitch = 0.3;
  let dist = 4.8;
  let distTarget = 4.8;
  let camDist = 4.8;
  const pivot = new THREE.Vector3(SPAWN.x, HEAD, SPAWN.z);
  const focus = { target: new THREE.Vector3(), yaw0: 0, dist: 3 };
  let vYaw = 0;
  let vPitch = 0;
  let lastDrag = -10;
  let walkTarget = null;
  let fly = null;
  const keys = new Set();
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  let enabled = true;
  const joy = { x: 0, y: 0 };
  const listeners = { tap: [], hover: [], move: [], leave: [] };
  const lookAt = new THREE.Vector3();
  let now = 0;

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.3, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, 1.0), transparent: true, opacity: 0.8, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;

  const portrait = () => camera.aspect < 0.8;
  const defaultDist = () => (portrait() ? 5.6 : 4.8);
  distTarget = dist = camDist = defaultDist();

  function tryMove(dx, dz) {
    const p = player.pos;
    if (!blocked(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; return true; }
    if (!blocked(p.x + dx, p.z)) { p.x += dx; return true; }
    if (!blocked(p.x, p.z + dz)) { p.z += dz; return true; }
    return false;
  }

  const pinchDist = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  function leaveFocus() {
    if (mode !== 'focus' && !(fly && fly.toFocus)) return;
    listeners.leave.forEach((fn) => fn());
    follow();
  }

  dom.addEventListener('pointerdown', (e) => {
    if (!enabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dom.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      drag = null;
      pinch = { d: pinchDist(), dist: distTarget };
      return;
    }
    vYaw = 0;
    vPitch = 0;
    drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), id: e.pointerId, moved: false, lastT: performance.now() };
  });

  dom.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      zoomTo(pinch.dist * (pinch.d / Math.max(20, pinchDist())));
      return;
    }
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      const t = performance.now();
      const dt = Math.max(1, t - drag.lastT) / 1000;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.lastT = t;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 7) drag.moved = true;
      if (drag.moved && mode !== 'fixed' && !fly) {
        const k = e.pointerType === 'touch' ? 0.0068 : 0.0048;
        yaw -= dx * k;
        pitch = clampPitch(pitch + dy * k);
        vYaw = (-dx * k) / dt;
        vPitch = (dy * k) / dt;
        lastDrag = now;
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
    zoomTo(distTarget * (1 + e.deltaY * 0.0012));
  }, { passive: false });

  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select, [contenteditable], dialog')) return;
    keys.add(e.key.toLowerCase());
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  function zoomTo(d) {
    if (mode === 'focus') distTarget = THREE.MathUtils.clamp(d, 1.2, 7);
    else distTarget = THREE.MathUtils.clamp(d, DIST_MIN, DIST_MAX);
  }
  function clampPitch(p) {
    return mode === 'focus' ? THREE.MathUtils.clamp(p, -0.25, 0.9) : THREE.MathUtils.clamp(p, -0.12, 1.25);
  }

  const offset = (y, p, d, out = new THREE.Vector3()) => out.set(Math.sin(y) * Math.cos(p) * d, Math.sin(p) * d, Math.cos(y) * Math.cos(p) * d);

  // Acorta la distancia si un muro del salón o el cerco quedan entre la cámara y lo que mira.
  function clearDistance(from, y, p, d, circles = true) {
    const o = offset(y, p, d);
    let best = d;
    for (const s of colliders.segments) {
      const t = segHit(from.x, from.z, from.x + o.x, from.z + o.z, s);
      if (t !== null) best = Math.min(best, Math.max(0.9, t * d - 0.35));
    }
    // Postes, troncos y faroles: si quedan en la línea de la cámara, se acerca para no taparte.
    const len = Math.hypot(o.x, o.z) || 1;
    const ux = o.x / len;
    const uz = o.z / len;
    for (const c of circles ? colliders.circles : []) {
      const cx = c.x - from.x;
      const cz = c.z - from.z;
      const along = cx * ux + cz * uz;
      if (along < 0.4 || along > len + 0.5) continue;
      const perp = Math.abs(cx * uz - cz * ux);
      const rad = c.r + 0.22;
      if (perp < rad) {
        const hitAt = along - Math.sqrt(rad * rad - perp * perp);
        best = Math.min(best, Math.max(1.0, (hitAt / len) * d - 0.1));
      }
    }
    for (let k = 0; k < 6; k++) {
      const x = from.x + (o.x * best) / d;
      const z = from.z + (o.z * best) / d;
      if (Math.hypot(x, z) < GARDEN_RADIUS + 0.3) break;
      best *= 0.85;
    }
    return best;
  }

  function followPose(outPos, outLook) {
    const lift = portrait() ? 0.15 : 0;
    outLook.set(pivot.x, pivot.y + lift, pivot.z);
    offset(yaw, pitch, camDist, outPos).add(outLook);
    outPos.y = Math.max(0.45, outPos.y);
  }

  function anglesFrom(stand, target) {
    const d = stand.distanceTo(target);
    const o = new THREE.Vector3().subVectors(stand, target);
    return { yaw: Math.atan2(o.x, o.z), pitch: Math.asin(THREE.MathUtils.clamp(o.y / d, -1, 1)), dist: d };
  }

  // Seguir al personaje (con un vuelo corto si la cámara estaba en otro lado).
  function follow({ duration = null, path = null, done = null } = {}) {
    walkTarget = walkTarget && mode === 'follow' ? walkTarget : null;
    const fromPos = camera.position.clone();
    const fromLook = lookAt.clone();
    // Si venimos de mirar un marco, la cámara queda detrás del personaje mirando hacia donde mira él.
    if (mode !== 'follow') {
      yaw = player.heading + Math.PI;
      pitch = 0.3;
      distTarget = defaultDist();
      dist = camDist = distTarget;
    }
    mode = 'follow';
    pivot.set(player.pos.x, HEAD, player.pos.z);
    const curve = path ? [fromPos, ...path] : null;
    fly = { fromPos, fromLook, dynamic: true, curve, t: 0, dur: duration ?? (reduced ? 0.3 : 0.9), done };
  }

  return {
    marker,
    player,
    blocked,
    onTap: (fn) => listeners.tap.push(fn),
    onHover: (fn) => listeners.hover.push(fn),
    onMove: (fn) => listeners.move.push(fn),
    onLeaveFocus: (fn) => listeners.leave.push(fn),
    set enabled(v) { enabled = v; if (!v) { drag = null; pinch = null; pointers.clear(); } },
    get flying() { return !!fly; },
    get mode() { return mode; },
    get yaw() { return yaw; },
    setJoystick(x, y) {
      joy.x = x;
      joy.y = y;
      if (x || y) { walkTarget = null; marker.visible = false; if (mode === 'focus') leaveFocus(); }
    },
    walkTo(point) {
      if (mode === 'focus') leaveFocus();
      walkTarget = new THREE.Vector3(point.x, 0, point.z);
      marker.position.set(point.x, (point.y || 0) + 0.03, point.z);
      marker.visible = true;
    },
    // Vuelo de cámara a un punto mirando a un objetivo; al llegar queda en modo "focus".
    flyTo(stand, target, done, { path = null, duration = null } = {}) {
      walkTarget = null;
      marker.visible = false;
      const dur = duration ?? (reduced ? 0.35 : THREE.MathUtils.clamp(camera.position.distanceTo(stand) / 7, 0.8, 2.4));
      fly = { fromPos: camera.position.clone(), fromLook: lookAt.clone(), toPos: stand.clone(), toLook: target.clone(), curve: path ? [camera.position.clone(), ...path, stand.clone()] : null, t: 0, dur, done, toFocus: true };
    },
    follow,
    // Cámara quieta (intro).
    teleportCamera(p, target) {
      mode = 'fixed';
      fly = null;
      camera.position.copy(p);
      lookAt.copy(target);
      camera.lookAt(lookAt);
    },
    placePlayer(p, facing = null) {
      player.pos.set(p.x, 0, p.z);
      if (facing) player.heading = Math.atan2(facing.x - p.x, facing.z - p.z);
      player.speed = 0;
      walkTarget = null;
      marker.visible = false;
      pivot.set(player.pos.x, HEAD, player.pos.z);
    },
    snapFollow() {
      mode = 'follow';
      fly = null;
      yaw = player.heading + Math.PI;
      pitch = 0.3;
      dist = distTarget = camDist = defaultDist();
      pivot.set(player.pos.x, HEAD, player.pos.z);
      followPose(camera.position, lookAt);
      camera.lookAt(lookAt);
    },
    stop() {
      walkTarget = null;
      marker.visible = false;
    },
    update(dt) {
      now += dt;
      // ---------- personaje ----------
      let mx = 0;
      let mz = 0;
      let run = keys.has('shift') ? 1.6 : 1;
      if (mode !== 'fixed' && !(fly && fly.toFocus)) {
        let fz = 0;
        let fx = 0;
        if (keys.has('w') || keys.has('arrowup')) fz += 1;
        if (keys.has('s') || keys.has('arrowdown')) fz -= 1;
        if (keys.has('a') || keys.has('arrowleft')) fx -= 1;
        if (keys.has('d') || keys.has('arrowright')) fx += 1;
        if (keys.has('q')) yaw += 1.8 * dt;
        if (keys.has('e')) yaw -= 1.8 * dt;
        const jm = Math.hypot(joy.x, joy.y);
        if (jm > 0.12) {
          fz += -joy.y;
          fx += joy.x;
          run = 0.55 + Math.min(1, jm) * 1.05;
        }
        if ((fx || fz) && mode === 'focus') leaveFocus();
        if (fx || fz) {
          const len = Math.max(1, Math.hypot(fx, fz));
          const f = [-Math.sin(yaw), -Math.cos(yaw)];
          const r = [Math.cos(yaw), -Math.sin(yaw)];
          mx = (f[0] * fz + r[0] * fx) / len;
          mz = (f[1] * fz + r[1] * fx) / len;
          walkTarget = null;
          marker.visible = false;
        }
      }
      let want = 0;
      let dirX = 0;
      let dirZ = 0;
      if (mx || mz) {
        want = 3.1 * run;
        dirX = mx;
        dirZ = mz;
      } else if (walkTarget) {
        const dx = walkTarget.x - player.pos.x;
        const dz = walkTarget.z - player.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.08) { walkTarget = null; marker.visible = false; } else {
          want = Math.min(3.9, d * 2.4 + 0.35);
          dirX = dx / d;
          dirZ = dz / d;
        }
      }
      const acc = want > player.speed ? 9 : 12;
      player.speed += THREE.MathUtils.clamp(want - player.speed, -acc * dt, acc * dt);
      let turned = 0;
      if (want > 0) {
        const target = Math.atan2(dirX, dirZ);
        const dh = Math.atan2(Math.sin(target - player.heading), Math.cos(target - player.heading));
        turned = THREE.MathUtils.clamp(dh, -11 * dt, 11 * dt);
        player.heading += turned;
      }
      player.turn = THREE.MathUtils.lerp(player.turn, turned / Math.max(dt, 1e-3), Math.min(1, dt * 8));
      let moving = false;
      if (player.speed > 0.02) {
        const st = player.speed * dt;
        // Se mueve hacia donde quiere ir (no hacia donde mira) para que sea responsivo.
        const hx = want > 0 ? dirX : Math.sin(player.heading);
        const hz = want > 0 ? dirZ : Math.cos(player.heading);
        moving = tryMove(hx * st, hz * st);
        if (!moving && walkTarget) { walkTarget = null; marker.visible = false; }
        if (!moving) player.speed *= 0.5;
      }
      player.moving = moving && player.speed > 0.15;
      if (player.moving) listeners.move.forEach((fn) => fn());
      if (marker.visible) {
        const s = 1 + Math.sin(performance.now() / 160) * 0.12;
        marker.scale.set(s, s, s);
      }

      // ---------- cámara ----------
      if (mode === 'fixed' && !fly) return;
      if (!drag && (Math.abs(vYaw) > 0.01 || Math.abs(vPitch) > 0.01)) {
        yaw += vYaw * dt;
        pitch = clampPitch(pitch + vPitch * dt);
        const decay = Math.exp(-dt * 7);
        vYaw *= decay;
        vPitch *= decay;
      }
      if (mode === 'follow') {
        // Se acomoda sola detrás del personaje cuando camina (salvo que la estés girando vos).
        if (player.moving && now - lastDrag > 1.4 && !keys.has('q') && !keys.has('e')) {
          const behind = player.heading + Math.PI;
          const dy = Math.atan2(Math.sin(behind - yaw), Math.cos(behind - yaw));
          if (Math.abs(dy) < 2.5) yaw += dy * Math.min(1, dt * 0.9 * Math.min(1, player.speed / 3));
        }
        pivot.x += (player.pos.x - pivot.x) * Math.min(1, dt * 12);
        pivot.z += (player.pos.z - pivot.z) * Math.min(1, dt * 12);
        pivot.y = HEAD + Math.min(0.25, Math.max(0, (camDist - 4) * 0.05));
      } else if (mode === 'focus') {
        pivot.copy(focus.target);
        const dy = Math.atan2(Math.sin(yaw - focus.yaw0), Math.cos(yaw - focus.yaw0));
        if (Math.abs(dy) > 1.1) yaw = focus.yaw0 + Math.sign(dy) * 1.1;
      }
      dist += (distTarget - dist) * Math.min(1, dt * 8);
      // En foco (mirando un marco) un farol finito puede quedar en cuadro; los muros no.
      const clear = clearDistance(pivot, yaw, pitch, dist, mode !== 'focus');
      camDist += (clear - camDist) * Math.min(1, dt * (clear < camDist ? 18 : 4));
      const wantPos = new THREE.Vector3();
      const wantLook = new THREE.Vector3();
      if (mode === 'focus') {
        wantLook.copy(pivot);
        offset(yaw, pitch, camDist, wantPos).add(pivot);
      } else followPose(wantPos, wantLook);

      if (fly) {
        fly.t = Math.min(1, fly.t + dt / fly.dur);
        const k = fly.t < 0.5 ? 4 * fly.t ** 3 : 1 - (-2 * fly.t + 2) ** 3 / 2;
        const toPos = fly.dynamic ? wantPos : fly.toPos;
        const toLook = fly.dynamic ? wantLook : fly.toLook;
        if (fly.curve) {
          const pts = fly.dynamic ? [...fly.curve, toPos.clone()] : fly.curve;
          camera.position.copy(new THREE.CatmullRomCurve3(pts).getPoint(k));
        } else {
          camera.position.lerpVectors(fly.fromPos, toPos, k);
          camera.position.y += Math.sin(k * Math.PI) * Math.min(1.4, fly.fromPos.distanceTo(toPos) * 0.06);
        }
        lookAt.lerpVectors(fly.fromLook, toLook, k);
        camera.lookAt(lookAt);
        if (fly.t >= 1) {
          const f = fly;
          fly = null;
          if (f.toFocus) {
            mode = 'focus';
            const a = anglesFrom(f.toPos, f.toLook);
            yaw = focus.yaw0 = a.yaw;
            pitch = a.pitch;
            dist = distTarget = camDist = a.dist;
            focus.target.copy(f.toLook);
            vYaw = vPitch = 0;
          }
          f.done?.();
        }
        return;
      }
      camera.position.copy(wantPos);
      lookAt.copy(wantLook);
      camera.lookAt(lookAt);
    },
  };
}
