// Los espíritus que juegan en el Prado y el que te acompaña cuando lo sacás a pasear.
// Cada espíritu tiene un "cerebro" con estados (pasear, zoomies, perseguir, invitar a jugar con una
// reverencia, luchar parados en dos patas, rodar, descansar, ir a buscar la pelota, llevarla, devolverla)
// y un animador (petRig.js) que convierte velocidad y ganas en movimiento.
import * as THREE from 'three';
import { createPet, lookFor } from './petRig.js';
import { glowTexture, bubbleTexture } from './textures.js';
import { HALL_CENTER, HALL_RADIUS, GARDEN_RADIUS, MEADOW, MEADOW_R } from './world.js';

export { MEADOW, MEADOW_R };

const R = Math.random;
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const pickW = (opts) => {
  let sum = 0;
  for (const [, w] of opts) sum += Math.max(0, w);
  let x = R() * sum;
  for (const [v, w] of opts) { x -= Math.max(0, w); if (x <= 0) return v; }
  return opts[0][0];
};

let pawTex;
function pawGlowTexture() {
  if (pawTex) return pawTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.shadowColor = '#fff';
  g.shadowBlur = 4;
  const blob = (x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); };
  blob(32, 41, 12, 10);
  blob(16, 26, 5, 6.5, -0.3);
  blob(48, 26, 5, 6.5, 0.3);
  blob(24, 16, 5, 6.5, -0.1);
  blob(40, 16, 5, 6.5, 0.1);
  pawTex = new THREE.CanvasTexture(c);
  pawTex.colorSpace = THREE.SRGBColorSpace;
  return pawTex;
}

// ---------- efectos: huellitas de luz y chispitas ----------
function createFx(scene) {
  const N = 140;
  const prints = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.12, 0.12).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: pawGlowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
    N,
  );
  prints.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  prints.frustumCulled = false;
  prints.renderOrder = 3;
  const life = new Float32Array(N);
  const tint = [];
  const m = new THREE.Object3D();
  m.scale.setScalar(0);
  m.updateMatrix();
  for (let i = 0; i < N; i++) { prints.setMatrixAt(i, m.matrix); tint.push(new THREE.Color()); }
  scene.add(prints);
  let next = 0;

  const M = 420;
  const pos = new Float32Array(M * 3);
  const col = new Float32Array(M * 3);
  const alpha = new Float32Array(M);
  const size = new Float32Array(M);
  const vel = new Float32Array(M * 3);
  const age = new Float32Array(M).fill(9);
  const maxAge = new Float32Array(M).fill(1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: innerHeight } },
    vertexShader: `attribute vec3 aColor; attribute float aAlpha; attribute float aSize; uniform float uScale; varying vec3 vC; varying float vA;
      void main(){ vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(uScale * aSize / max(-mv.z, 0.1), 1.0, 28.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5);
      float g = smoothstep(0.5, 0.0, d); g *= g; gl_FragColor = vec4(vC * 1.7, g * vA); }`,
  }));
  pts.frustumCulled = false;
  scene.add(pts);
  addEventListener('resize', () => { pts.material.uniforms.uScale.value = innerHeight; });
  let pnext = 0;

  return {
    print(x, z, heading, color, s = 1) {
      const i = next;
      next = (next + 1) % N;
      m.position.set(x, 0.024 + i * 0.00002, z);
      m.rotation.set(0, heading, 0);
      m.scale.setScalar(s);
      m.updateMatrix();
      prints.setMatrixAt(i, m.matrix);
      prints.instanceMatrix.needsUpdate = true;
      life[i] = 1;
      tint[i].copy(color);
    },
    emit(p, color, n = 8, { spread = 0.25, up = 0.6, speed = 0.6, sz = 0.05, lifeT = 1.2 } = {}) {
      for (let k = 0; k < n; k++) {
        const i = pnext;
        pnext = (pnext + 1) % M;
        pos[i * 3] = p.x + (R() - 0.5) * spread;
        pos[i * 3 + 1] = p.y + (R() - 0.5) * spread;
        pos[i * 3 + 2] = p.z + (R() - 0.5) * spread;
        const a = R() * TAU;
        vel[i * 3] = Math.cos(a) * speed * R();
        vel[i * 3 + 1] = up * (0.4 + R() * 0.8);
        vel[i * 3 + 2] = Math.sin(a) * speed * R();
        color.toArray(col, i * 3);
        size[i] = sz * (0.6 + R() * 0.8);
        age[i] = 0;
        maxAge[i] = lifeT * (0.6 + R() * 0.7);
      }
    },
    update(dt) {
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] = Math.max(0, life[i] - dt / 3.2);
        const k = life[i] * life[i];
        prints.instanceColor.setXYZ(i, tint[i].r * k, tint[i].g * k, tint[i].b * k);
        if (life[i] === 0) { m.scale.setScalar(0); m.updateMatrix(); prints.setMatrixAt(i, m.matrix); prints.instanceMatrix.needsUpdate = true; }
      }
      prints.instanceColor.needsUpdate = true;
      for (let i = 0; i < M; i++) {
        if (age[i] >= maxAge[i]) { alpha[i] = 0; continue; }
        age[i] += dt;
        const k = age[i] / maxAge[i];
        vel[i * 3 + 1] -= dt * 0.15;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        alpha[i] = Math.sin(Math.PI * Math.min(1, k)) * (0.75 + 0.25 * Math.sin(age[i] * 20 + i));
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aAlpha.needsUpdate = true;
      geo.attributes.aColor.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
    },
  };
}

// ---------- la pelota ----------
function createBall(scene) {
  const r = 0.075;
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.8, 0.55) }));
  const seam = new THREE.Mesh(new THREE.TorusGeometry(r * 1.005, 0.006, 6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.9, 1.7) }));
  seam.rotation.x = 0.6;
  mesh.add(seam);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(0.9, 1.0, 0.4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 }));
  halo.scale.setScalar(0.42);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  hit.userData = { kind: 'ball' };
  g.add(mesh, halo, hit);
  scene.add(g);
  return {
    r, group: g, mesh, hit,
    pos: g.position,
    vel: new THREE.Vector3(),
    held: null,
    thrower: null,
    idle: 0,
    bounced: 0,
    get free() { return !this.held; },
    get inAir() { return this.pos.y > r + 0.03 || Math.abs(this.vel.y) > 0.3; },
    // Dónde va a tocar el piso (para correr hacia ahí y no hacia donde está ahora).
    landing(out = new THREE.Vector3()) {
      if (!this.inAir) return out.copy(this.pos);
      const vy = this.vel.y;
      const h = this.pos.y - r;
      const tl = (vy + Math.sqrt(vy * vy + 2 * 9.8 * Math.max(0, h))) / 9.8;
      return out.set(this.pos.x + this.vel.x * tl, r, this.pos.z + this.vel.z * tl);
    },
  };
}

// ---------- un espíritu ----------
function makeAgent(look, info) {
  const pet = createPet(look);
  const a = {
    pet, look, s: pet.s,
    pos: pet.group.position,
    heading: R() * TAU,
    speed: 0,
    turn: 0,
    goal: null,
    want: {},
    look: null,
    excite: 0.5,
    state: 'idle',
    t: 0,
    dur: 1,
    d: {},
    cool: {},
    fade: 1,
    role: 'pack',
    name: info.name || '',
    memorialId: info.memorialId || null,
    kind: look.kind,
    label: null,
    rim: new THREE.Color(look.rim),
  };
  pet.hit.userData = { kind: 'spirit' };
  if (a.name) {
    const tex = bubbleTexture(a.name, { tail: false, font: '800 30px Nunito, sans-serif', bg: 'rgba(26,20,36,0.62)', fg: '#fff6ea' });
    a.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
    a.label.scale.set(0.2 * tex.userData.aspect, 0.2, 1);
    a.label.position.y = 0.78 * pet.s + 0.2;
    a.label.renderOrder = 5;
    pet.group.add(a.label);
  }
  return a;
}

export function createSpirits(scene, { blocked, tier }) {
  const fx = createFx(scene);
  const ball = createBall(scene);
  ball.pos.set(MEADOW.x + 1.5, ball.r, MEADOW.z - 1);
  const pack = [];
  let companion = null;
  const remotes = new Map();
  const pickables = [ball.hit];
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const player = { pos: new THREE.Vector3(0, 0, 24), heading: Math.PI, moving: false, still: 0, vel: new THREE.Vector3() };
  const listeners = { fetch: [], event: [] };
  let camPos = new THREE.Vector3();
  const maxPack = tier?.grass >= 20000 ? 5 : tier?.grass >= 10000 ? 4 : 3;

  const meadowPoint = (rad = MEADOW_R - 1) => {
    const a = R() * TAU;
    const d = Math.sqrt(R()) * rad;
    return new THREE.Vector3(MEADOW.x + Math.sin(a) * d, 0, MEADOW.z + Math.cos(a) * d);
  };
  const others = (a) => [...pack, ...(companion?.role === 'joined' ? [companion] : [])].filter((b) => b !== a);
  const free = (b) => ['idle', 'wander', 'sniff', 'watch'].includes(b.state);
  const say = (type, a, extra) => listeners.event.forEach((fn) => fn(type, a, extra));

  // ---------- moverse ----------
  function move(a, dt) {
    const g = a.goal;
    let dSpeed = 0;
    let dHead = a.heading;
    if (g) {
      const dx = g.x - a.pos.x;
      const dz = g.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      const stop = g.stop ?? 0.15;
      if (d > stop) {
        dHead = Math.atan2(dx, dz);
        dSpeed = Math.min(g.speed, (d - stop) * 2.4 + 0.25 * a.s);
      } else if (g.face) dHead = Math.atan2(g.face.x - a.pos.x, g.face.z - a.pos.z);
    }
    if (dSpeed > 0.05) {
      let vx = Math.sin(dHead);
      let vz = Math.cos(dHead);
      // Esquivar a los otros espíritus.
      for (const b of [...pack, companion, ...remotes.values()]) {
        if (!b || b === a || b === a.d.partner) continue;
        const ox = a.pos.x - b.pos.x;
        const oz = a.pos.z - b.pos.z;
        const od = Math.hypot(ox, oz);
        const min = 0.55 * (a.s + b.s);
        if (od < min && od > 1e-3) { vx += (ox / od) * (1 - od / min) * 1.6; vz += (oz / od) * (1 - od / min) * 1.6; }
      }
      // Los del Prado no entran al salón ni se van contra el cerco.
      if (a.role === 'pack' || a.role === 'joined') {
        const hx = a.pos.x - HALL_CENTER.x;
        const hz = a.pos.z - HALL_CENTER.z;
        const hd = Math.hypot(hx, hz);
        if (hd < HALL_RADIUS + 3) { vx += (hx / hd) * 1.5; vz += (hz / hd) * 1.5; }
      }
      const rd = Math.hypot(a.pos.x, a.pos.z);
      if (rd > GARDEN_RADIUS - 3) { vx -= (a.pos.x / rd) * 1.2; vz -= (a.pos.z / rd) * 1.2; }
      dHead = Math.atan2(vx, vz);
    }
    const dh = wrap(dHead - a.heading);
    const maxTurn = lerp(6, 2.6, clamp(a.speed / (4 * a.s), 0, 1));
    const step = clamp(dh, -maxTurn * dt, maxTurn * dt);
    a.heading = wrap(a.heading + step);
    a.turn = lerp(a.turn, step / Math.max(dt, 1e-3), Math.min(1, dt * 8));
    if (Math.abs(dh) > 1.3) dSpeed *= 0.4;
    const acc = dSpeed > a.speed ? 5.5 * a.s : 10 * a.s;
    a.speed += clamp(dSpeed - a.speed, -acc * dt, acc * dt);
    const st = a.speed * dt;
    if (st > 0) {
      const nx = a.pos.x + Math.sin(a.heading) * st;
      const nz = a.pos.z + Math.cos(a.heading) * st;
      const body = 0.18 * a.s;
      if (!blocked(nx, nz, body)) a.pos.set(nx, 0, nz);
      else if (!blocked(nx, a.pos.z, body)) a.pos.x = nx;
      else if (!blocked(a.pos.x, nz, body)) a.pos.z = nz;
      else a.speed *= 0.3;
    }
  }

  function animate(a, dt) {
    a.pet.group.rotation.y = a.heading;
    const animSpeed = Math.max(a.speed, Math.min(0.45 * a.s, Math.abs(a.turn) * 0.2 * a.s));
    a.pet.anim.update(dt, {
      speed: animSpeed, turn: a.turn, look: a.look, excite: a.excite, want: a.want, wag: a.role === 'companion' ? 1 : 0,
      bank: clamp(-a.turn * a.speed * 0.05, -0.32, 0.32),
    });
    // Chispitas al correr y huellitas al pisar.
    if (a.speed > 2.4 * a.s && R() < dt * 14) fx.emit(tmp.copy(a.pos).setY(0.35 * a.s), a.rim, 1, { spread: 0.3, up: 0.25, speed: 0.2, sz: 0.035, lifeT: 0.9 });
    if (a.label) {
      const d = a.pos.distanceTo(camPos);
      const want = (a.role === 'companion' ? d < 14 : d < 8) ? 0.95 : 0;
      a.label.material.opacity += (want - a.label.material.opacity) * Math.min(1, dt * 4);
      a.label.visible = a.label.material.opacity > 0.02;
    }
  }

  function attachSteps(a) {
    a.pet.anim.onStep((i) => {
      if (a.speed < 0.35 * a.s || a.pet.anim.jumping || a.fade < 0.5) return;
      const p = a.pet.pawWorld(i, tmp2);
      if (p.y > 0.12 * a.s) return;
      fx.print(p.x, p.z, a.heading, a.rim, a.s * (i < 2 ? 0.95 : 0.85));
    });
  }

  function arrived(a, extra = 0) {
    return !a.goal || dist2(a.pos, a.goal) <= (a.goal.stop ?? 0.15) + 0.08 + extra;
  }

  // ---------- estados ----------
  const S = {
    idle: {
      enter(a) { a.goal = null; a.dur = 1.2 + R() * 2.8; a.want = { sit: a.kind !== 'otro' && R() < 0.5 }; a.excite = 0.4; a.look = null; },
      tick(a) {
        if (ball.free && dist2(a.pos, ball.pos) < 7 && ball.inAir) a.look = ball.pos;
        return a.t > a.dur;
      },
    },
    watch: {
      enter(a, target) { a.goal = null; a.d.target = target; a.dur = 2 + R() * 2.5; a.want = { sit: R() < 0.7, tilt: R() < 0.3 }; a.excite = 0.6; },
      tick(a) { a.look = a.d.target?.pos ? tmp.copy(a.d.target.pos).setY(0.4) : null; return a.t > a.dur; },
    },
    wander: {
      enter(a) {
        const p = a.role === 'pack' || a.role === 'joined' ? meadowPoint() : tmp.copy(a.pos).add(new THREE.Vector3((R() - 0.5) * 6, 0, (R() - 0.5) * 6));
        a.goal = { x: p.x, z: p.z, speed: (a.kind === 'gato' ? 0.6 : R() < 0.5 ? 0.75 : 1.5) * a.s, stop: 0.2 };
        a.want = {};
        a.excite = 0.5;
        a.look = null;
        a.dur = 9;
      },
      tick(a) { return arrived(a) || a.t > a.dur; },
    },
    sniff: {
      enter(a) {
        const d = 0.8 + R() * 1.4;
        a.goal = { x: a.pos.x + Math.sin(a.heading + (R() - 0.5)) * d, z: a.pos.z + Math.cos(a.heading + (R() - 0.5)) * d, speed: 0.32 * a.s, stop: 0.1 };
        a.want = { sniff: true };
        a.look = null;
        a.excite = 0.35;
        a.dur = 2.5 + R() * 2.5;
      },
      tick(a) { return a.t > a.dur; },
    },
    zoomies: {
      enter(a) {
        a.d.dir = R() < 0.5 ? 1 : -1;
        a.d.rad = 2.8 + R() * 2.8;
        a.d.ang = Math.atan2(a.pos.x - MEADOW.x, a.pos.z - MEADOW.z);
        a.dur = 4 + R() * 3.5;
        a.excite = 1;
        a.want = {};
        a.look = null;
        say('zoomies', a);
      },
      tick(a, dt) {
        a.d.ang += a.d.dir * (Math.max(a.speed, 1) / a.d.rad) * dt;
        if (R() < dt * 0.22) { a.d.dir *= -1; a.d.rad = 2.5 + R() * 3; }
        const lead = 0.85 * a.d.dir;
        a.goal = { x: MEADOW.x + Math.sin(a.d.ang + lead) * a.d.rad, z: MEADOW.z + Math.cos(a.d.ang + lead) * a.d.rad, speed: 4.5 * a.s, stop: 0 };
        return a.t > a.dur;
      },
      next: () => pickW([['idle', 2], ['bow', 1], ['tailchase', 0.4], ['rest', 0.6]]),
    },
    chase: {
      enter(a, target) { a.d.tgt = target; a.dur = 7; a.excite = 1; a.want = {}; },
      tick(a) {
        const L = a.d.tgt;
        if (!L || L.fade < 0.5) return true;
        const running = ['zoomies', 'carry', 'flee', 'follow', 'fetch'].includes(L.state) && L.speed > 0.8;
        a.look = tmp.copy(L.pos).setY(0.4);
        if (!running) {
          if (dist2(a.pos, L.pos) < 2.6 && free(L) && L.kind === 'perro' && L.role !== 'companion' && R() < 0.7) { go(a, 'wrestle', L); go(L, 'wrestle', a); return null; }
          return true;
        }
        const lead = clamp(dist2(a.pos, L.pos) / 6, 0.1, 0.6);
        a.goal = { x: L.pos.x + Math.sin(L.heading) * L.speed * lead, z: L.pos.z + Math.cos(L.heading) * L.speed * lead, speed: Math.min(4.7 * a.s, L.speed + 0.9), stop: 0.45 * (a.s + L.s) };
        // A veces le roba la pelota.
        if (L.state === 'carry' && ball.held === L && dist2(a.pos, L.pos) < 0.7 && R() < 0.003) { dropBall(L, 0.8); go(L, 'chase', a); }
        return a.t > a.dur;
      },
    },
    bow: {
      enter(a) {
        const buddy = others(a).find((b) => free(b) && dist2(a.pos, b.pos) < 8 && b.kind === 'perro');
        a.d.b = buddy || null;
        a.goal = buddy ? { x: buddy.pos.x, z: buddy.pos.z, speed: 1.6 * a.s, stop: 1.3, face: buddy.pos } : null;
        a.dur = buddy ? 5 : 1.6;
        a.excite = 1;
        a.want = {};
        a.d.bowT = 0;
      },
      tick(a, dt) {
        const b = a.d.b;
        if (b) a.look = tmp.copy(b.pos).setY(0.4);
        if (!b || arrived(a, 0.5)) {
          a.want = { bow: true };
          a.d.bowT += dt;
          if (R() < dt * 1.2 && !a.pet.anim.busy) a.pet.anim.trigger('jump', { h: 0.12, d: 0.3 });
          if (b && a.d.bowT > 0.6 && free(b)) go(b, 'watch', a);
          if (a.d.bowT > 1.5) {
            a.want = {};
            if (b && b.state === 'watch') { go(a, 'zoomies'); go(b, 'chase', a); return null; }
            return true;
          }
        }
        return a.t > a.dur;
      },
    },
    wrestle: {
      enter(a, partner) { a.d.partner = partner; a.dur = 3 + R() * 1.5; a.excite = 1; a.d.ph = R() * TAU; },
      tick(a, dt) {
        const p = a.d.partner;
        if (!p || p.state !== 'wrestle') { a.want = {}; return true; }
        const dx = a.pos.x - p.pos.x;
        const dz = a.pos.z - p.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        const gap = 0.42 * (a.s + p.s);
        a.goal = { x: p.pos.x + (dx / d) * gap, z: p.pos.z + (dz / d) * gap, speed: 1.2 * a.s, stop: 0.05, face: p.pos };
        a.look = tmp.copy(p.pos).setY(0.6);
        const ph = Math.sin(a.t * 2.6 + a.d.ph);
        a.want = { rear: ph > 0.15, bow: ph < -0.55 };
        if (R() < dt * 0.6 && !a.pet.anim.busy) a.pet.anim.trigger('jump', { h: 0.18, d: 0.35 });
        if (a.t > a.dur) {
          a.want = {};
          a.d.partner = null;
          if (p.state === 'wrestle') { p.d.partner = null; go(p, 'chase', a); }
          go(a, R() < 0.25 ? 'roll' : 'zoomies');
          return null;
        }
        return false;
      },
    },
    ball: {
      enter(a) { a.dur = 9; a.excite = 1; a.want = {}; say('ball', a); },
      tick(a) {
        if (ball.held && ball.held !== a) {
          if (ball.held.role === 'companion' && a.role === 'pack') return true;
          go(a, 'chase', ball.held);
          return null;
        }
        if (!ball.held) {
          const land = ball.landing(tmp);
          a.look = ball.pos;
          // Llegar con la boca a la pelota (la boca está adelante del centro).
          const off = 0.35 * a.s;
          const dx = land.x - a.pos.x;
          const dz = land.z - a.pos.z;
          const d = Math.hypot(dx, dz) || 1;
          a.goal = { x: land.x - (dx / d) * off * 0.6, z: land.z - (dz / d) * off * 0.6, speed: 4.7 * a.s, stop: 0 };
          const mouth = a.pet.mouthWorld(tmp2);
          if (mouth.distanceTo(ball.pos) < 0.22 + 0.15 * a.s && ball.pos.y < 0.45) {
            ball.held = a;
            ball.idle = 0;
            a.pet.anim.trigger('jump', { h: 0.14, d: 0.32 });
            fx.emit(ball.pos, new THREE.Color(1.4, 1.6, 0.6), 10, { spread: 0.15, up: 0.8 });
            say('catch', a);
            go(a, 'carry');
            return null;
          }
        }
        return a.t > a.dur;
      },
    },
    carry: {
      enter(a) {
        const back = ball.thrower === 'player' && (a.role === 'companion' || R() < 0.75);
        a.d.mode = back ? 'return' : 'keep';
        a.dur = back ? 14 : 3.5 + R() * 3.5;
        a.want = { carry: true };
        a.excite = 1;
        a.d.dir = R() < 0.5 ? 1 : -1;
        a.d.rad = 3 + R() * 2;
        a.d.ang = Math.atan2(a.pos.x - MEADOW.x, a.pos.z - MEADOW.z);
        // Los demás salen a perseguirlo.
        for (const b of others(a)) if (b.kind === 'perro' && (free(b) || b.state === 'ball') && dist2(a.pos, b.pos) < 10 && R() < 0.8) go(b, 'chase', a);
      },
      tick(a, dt) {
        if (ball.held !== a) { a.want = {}; return true; }
        if (a.d.mode === 'return') {
          const toward = a.role === 'companion' || a.role === 'joined' ? companionOwner(a) : player;
          a.goal = { x: toward.pos.x, z: toward.pos.z, speed: 3.6 * a.s, stop: 0.8 + 0.2 * a.s };
          a.look = null;
          if (arrived(a, 0.15)) {
            a.goal = null;
            dropBall(a, 0);
            ball.thrower = null;
            say('dropped', a);
            go(a, 'present', toward);
            return null;
          }
        } else {
          a.d.ang += a.d.dir * (Math.max(a.speed, 1) / a.d.rad) * dt;
          a.goal = { x: MEADOW.x + Math.sin(a.d.ang + 0.8 * a.d.dir) * a.d.rad, z: MEADOW.z + Math.cos(a.d.ang + 0.8 * a.d.dir) * a.d.rad, speed: 3.3 * a.s, stop: 0 };
          if (a.t > a.dur) {
            // Revoleo de cabeza: la tira para que la busquen.
            a.pet.anim.trigger('jump', { h: 0.1, d: 0.3 });
            dropBall(a, 2.6 + R() * 1.5);
            a.want = {};
            go(a, R() < 0.6 ? 'ball' : 'bow');
            return null;
          }
        }
        return a.t > a.dur;
      },
    },
    present: {
      enter(a, who) { a.d.who = who; a.goal = null; a.want = { sit: true }; a.excite = 1; a.dur = 3.5; },
      tick(a) {
        const w = a.d.who || player;
        a.look = tmp.copy(w.pos).setY(1.2);
        a.want.tilt = a.t > 1.5;
        return a.t > a.dur;
      },
    },
    rest: {
      enter(a) { a.goal = null; a.want = { lie: true }; a.excite = 0.15; a.dur = 6 + R() * 7; a.look = null; },
      tick(a) {
        if (ball.inAir && dist2(a.pos, ball.pos) < 5) a.look = ball.pos;
        if (a.t > a.dur) { a.want = {}; a.pet.anim.trigger('shake'); return true; }
        return false;
      },
    },
    roll: {
      enter(a) { a.goal = null; a.want = {}; a.excite = 1; a.dur = 2.9; a.pet.anim.trigger('roll'); },
      tick(a) {
        if (a.t > a.dur) { a.pet.anim.trigger('shake'); return true; }
        return false;
      },
    },
    tailchase: {
      enter(a) { a.d.c = a.pos.clone(); a.d.ang = a.heading; a.d.dir = R() < 0.5 ? 1 : -1; a.dur = 2 + R() * 1.5; a.excite = 1; a.want = {}; a.look = null; },
      tick(a, dt) {
        a.d.ang += a.d.dir * 4.8 * dt;
        a.goal = { x: a.d.c.x + Math.sin(a.d.ang) * 0.5 * a.s, z: a.d.c.z + Math.cos(a.d.ang) * 0.5 * a.s, speed: 2.2 * a.s, stop: 0 };
        return a.t > a.dur;
      },
    },
    greet: {
      enter(a, who) { a.d.who = who || player; a.dur = 9; a.excite = 0.9; a.want = {}; a.cool.greet = a.kind === 'gato' ? 70 : 30; say('greet', a); },
      tick(a, dt) {
        const w = a.d.who;
        const d = dist2(a.pos, w.pos);
        if (d > 9) return true;
        a.goal = { x: w.pos.x, z: w.pos.z, speed: 2.4 * a.s, stop: 1.15, face: w.pos };
        a.look = tmp.copy(w.pos).setY(1.25);
        if (arrived(a, 0.2)) {
          a.want = { sit: !w.moving, tilt: Math.sin(a.t * 1.3) > 0.4 };
          a.excite = 0.95;
          if (R() < dt * 0.25 && !a.pet.anim.busy) a.pet.anim.trigger('jump', { h: 0.25, d: 0.45 });
        } else a.want = {};
        return a.t > a.dur;
      },
    },
    poked: {
      enter(a) {
        a.goal = null;
        a.want = {};
        a.excite = 1;
        a.dur = 0.75;
        a.d.spin = R() < 0.6 ? (R() < 0.5 ? 1 : -1) : 0;
        a.pet.anim.trigger('jump', { h: 0.5, d: 0.7 });
        fx.emit(tmp.copy(a.pos).setY(0.5 * a.s), a.rim, 16, { spread: 0.4, up: 1, speed: 0.8 });
      },
      tick(a, dt) {
        if (a.d.spin) a.heading = wrap(a.heading + a.d.spin * TAU * dt / 0.7);
        return a.t > a.dur;
      },
      next: (a) => (a.role === 'companion' ? 'follow' : 'greet'),
    },
    // ---------- acompañante ----------
    follow: {
      enter(a) { a.d.side = a.d.side || (R() < 0.5 ? 1 : -1); a.want = {}; a.dur = 1e9; a.d.explore = 8 + R() * 8; },
      tick(a, dt) {
        const o = companionOwner(a);
        const d = dist2(a.pos, o.pos);
        if (d > 24 && (a.role === 'companion' || a.role === 'remote')) { reappear(a, o); return false; }
        const fx2 = Math.sin(o.heading);
        const fz2 = Math.cos(o.heading);
        if (o.moving) {
          // Como en un paseo de verdad: adelante tuyo, un poco al costado, con la correa floja.
          // De vez en cuando se desvía a olfatear algo (hasta donde da la correa).
          a.d.sniffT = (a.d.sniffT ?? (6 + R() * 6)) - dt;
          let lead = 1.55 * a.s + 0.35;
          let lat = 0.38 * a.d.side;
          if (a.d.sniffT < 0) {
            lat = 1.1 * a.d.side;
            lead = 1.0;
            a.want = { sniff: true };
            if (a.d.sniffT < -1.4) { a.d.sniffT = 6 + R() * 8; a.d.side = R() < 0.5 ? 1 : -1; }
          } else a.want = {};
          const tx = o.pos.x + fx2 * lead + fz2 * lat;
          const tz = o.pos.z + fz2 * lead - fx2 * lat;
          const dt2 = Math.hypot(tx - a.pos.x, tz - a.pos.z);
          a.goal = { x: tx, z: tz, speed: clamp(dt2 * 2.6 + o.vel.length(), 0.6, 5.5) * a.s, stop: 0.08 };
          a.look = a.want.sniff ? null : tmp.set(a.pos.x + fx2 * 3, 0.4, a.pos.z + fz2 * 3);
          a.excite = 0.95;
        } else {
          const still = o.still;
          if (d > 1.6 || still < 0.6) a.goal = { x: o.pos.x + (a.pos.x - o.pos.x) / Math.max(d, 0.01) * 1.1, z: o.pos.z + (a.pos.z - o.pos.z) / Math.max(d, 0.01) * 1.1, speed: 2.2 * a.s, stop: 0.15, face: o.pos };
          else a.goal = { x: a.pos.x, z: a.pos.z, stop: 1, face: o.pos };
          a.look = still < 10 ? tmp.copy(o.pos).setY(1.25) : null;
          a.want = { sit: still > 1.4 && still < 16, lie: still >= 16, tilt: still > 3 && still < 5 };
          a.excite = still < 8 ? 0.7 : 0.3;
          // Si estás quieto cerca del Prado, se va a jugar un rato.
          if (a.role === 'companion' && still > 5 && dist2(o.pos, MEADOW) < MEADOW_R + 6 && pack.length && (a.cool.join || 0) <= 0) {
            a.role = 'joined';
            a.cool.join = 40;
            a.d.joinT = 14 + R() * 10;
            say('join', a);
            go(a, 'bow');
            return null;
          }
          if (a.role === 'companion' && still > 6 && still < 7 && R() < dt * 0.3) { go(a, pickW([['sniff', 1], ['tailchase', 0.5], ['roll', 0.4]])); return null; }
        }
        return false;
      },
    },
    explore: {
      enter(a) {
        const o = companionOwner(a);
        const side = (R() - 0.5) * 2.5;
        const p = new THREE.Vector3(o.pos.x + Math.sin(o.heading) * 4 + Math.cos(o.heading) * side, 0, o.pos.z + Math.cos(o.heading) * 4 - Math.sin(o.heading) * side);
        if (blocked(p.x, p.z, 0.3)) p.copy(o.pos);
        a.goal = { x: p.x, z: p.z, speed: 3.8 * a.s, stop: 0.2 };
        a.want = {};
        a.excite = 0.9;
        a.dur = 4;
        a.d.sn = 0;
      },
      tick(a, dt) {
        if (arrived(a)) { a.want = { sniff: true }; a.goal = null; a.d.sn += dt; }
        return a.d.sn > 1.4 || a.t > a.dur;
      },
      next: () => 'follow',
    },
    called: {
      enter(a) { a.want = {}; a.excite = 1; a.dur = 8; },
      tick(a) {
        const o = companionOwner(a);
        a.goal = { x: o.pos.x, z: o.pos.z, speed: 5 * a.s, stop: 0.9 };
        a.look = tmp.copy(o.pos).setY(1.2);
        if (arrived(a, 0.2)) { a.pet.anim.trigger('jump', { h: 0.55, d: 0.7 }); fx.emit(tmp.copy(a.pos).setY(0.6), a.rim, 18, { up: 1.1, speed: 0.7 }); return true; }
        return a.t > a.dur;
      },
      next: () => 'follow',
    },
  };

  function go(a, state, arg) {
    a.state = state;
    a.t = 0;
    a.goal = null;
    a.want = {};
    S[state].enter(a, arg);
  }

  function companionOwner(a) {
    return a.owner || player;
  }

  function dropBall(a, power) {
    if (ball.held !== a) return;
    ball.held = null;
    a.pet.mouthWorld(ball.pos);
    ball.pos.y = Math.max(ball.r, ball.pos.y);
    const f = new THREE.Vector3(Math.sin(a.heading), 0, Math.cos(a.heading));
    ball.vel.copy(f).multiplyScalar(power).add(new THREE.Vector3(0, power * 0.55, 0));
    if (!power) ball.vel.set(f.x * 0.4, 0.5, f.z * 0.4);
    ball.idle = 0;
  }

  function reappear(a, o) {
    fx.emit(tmp.copy(a.pos).setY(0.4), a.rim, 14, { up: 1 });
    a.pos.set(o.pos.x - Math.sin(o.heading) * 1.4, 0, o.pos.z - Math.cos(o.heading) * 1.4);
    if (blocked(a.pos.x, a.pos.z, 0.2)) a.pos.set(o.pos.x, 0, o.pos.z);
    a.heading = o.heading;
    a.fade = 0;
    fx.emit(tmp.copy(a.pos).setY(0.4), a.rim, 20, { up: 1 });
  }

  // Qué hace un espíritu del Prado cuando termina lo que estaba haciendo.
  function chooseNext(a) {
    if (a.role === 'joined' && (a.d.joinT ?? 0) <= 0) { a.role = 'companion'; return ['follow']; }
    const cat = a.kind === 'gato';
    const bunny = a.kind === 'otro';
    const near = dist2(player.pos, a.pos) < 7 && player.still > 0.5;
    if (!ball.held && !ball.inAir && ball.idle > 2.5 && dist2(ball.pos, MEADOW) < MEADOW_R + 4 && !others(a).some((b) => b.state === 'ball')) {
      if (!bunny && R() < (cat ? 0.25 : 0.7)) return ['ball'];
    }
    const runner = others(a).find((b) => (b.state === 'zoomies' || b.state === 'carry') && dist2(a.pos, b.pos) < 12);
    if (runner && !cat && !bunny && R() < 0.55) return ['chase', runner];
    if (near && (a.cool.greet || 0) <= 0 && a.role === 'pack' && R() < (cat ? 0.2 : 0.6)) return ['greet', player];
    const buddy = !cat && !bunny && others(a).find((b) => b.kind === 'perro' && free(b) && dist2(a.pos, b.pos) < 3.5 && b.role !== 'companion');
    if (buddy && R() < 0.22) { go(buddy, 'wrestle', a); return ['wrestle', buddy]; }
    const tired = a.pet.anim && a.excite < 0.3;
    if (cat) return [pickW([['idle', 3], ['wander', 2], ['sniff', 1], ['rest', 2], ['roll', 0.5], ['watch', 1.5]]), others(a)[0]];
    if (bunny) return [pickW([['wander', 3], ['sniff', 2], ['idle', 2], ['rest', 1]])];
    return [pickW([['wander', 2.5], ['idle', 1.2], ['sniff', 1.4], ['bow', 1.6], ['zoomies', 1.1], ['roll', 0.45], ['rest', tired ? 2 : 0.5], ['tailchase', 0.35], ['watch', 0.6]]), others(a)[Math.floor(R() * others(a).length)]];
  }

  function think(a, dt) {
    a.t += dt;
    for (const k in a.cool) a.cool[k] -= dt;
    if (a.role === 'joined') {
      a.d.joinT = (a.d.joinT ?? 0) - dt;
      const o = companionOwner(a);
      if (o.moving && dist2(o.pos, a.pos) > 4) { a.role = 'companion'; if (ball.held === a) dropBall(a, 0); go(a, 'follow'); return; }
    }
    const r = S[a.state].tick(a, dt);
    if (r === null) return;
    if (r) {
      const nx = S[a.state].next?.(a);
      if (nx) go(a, nx);
      else if (a.role === 'companion') go(a, 'follow');
      else { const [st, arg] = chooseNext(a); go(a, st, arg); }
    }
  }

  // ---------- la pelota ----------
  function updateBall(dt) {
    if (ball.held) {
      ball.held.pet.mouthWorld(ball.pos);
      ball.vel.set(0, 0, 0);
      return;
    }
    const v = ball.vel;
    v.y -= 9.8 * dt;
    ball.pos.addScaledVector(v, dt);
    if (ball.pos.y < ball.r) {
      ball.pos.y = ball.r;
      if (v.y < -1.2) {
        if (v.y < -2.6 && dist2(ball.pos, camPos) < 14) listeners.event.forEach((fn) => fn('bounce'));
        v.y = -v.y * 0.55;
        v.x *= 0.82;
        v.z *= 0.82;
      } else v.y = 0;
    }
    if (ball.pos.y <= ball.r + 0.001) { const f = Math.exp(-dt * 1.6); v.x *= f; v.z *= f; }
    // Rebota contra el cerco, el salón y los árboles.
    const rd = Math.hypot(ball.pos.x, ball.pos.z);
    if (rd > GARDEN_RADIUS - 1.2) { const nx = ball.pos.x / rd; const nz = ball.pos.z / rd; const dot = v.x * nx + v.z * nz; if (dot > 0) { v.x -= 1.6 * dot * nx; v.z -= 1.6 * dot * nz; } }
    const hx = ball.pos.x - HALL_CENTER.x;
    const hz = ball.pos.z - HALL_CENTER.z;
    const hd = Math.hypot(hx, hz);
    const inHall = hd < HALL_RADIUS + 1.4;
    if (inHall && !ball.wasInHall && ball.thrower !== 'player' && ball.pos.y < 3) { const dot = (v.x * hx + v.z * hz) / hd; if (dot < 0) { v.x -= 1.6 * dot * hx / hd; v.z -= 1.6 * dot * hz / hd; } }
    else ball.wasInHall = inHall;
    if (blocked(ball.pos.x, ball.pos.z, 0.02) && ball.pos.y < 1.2) { v.x *= -0.5; v.z *= -0.5; ball.pos.addScaledVector(v, dt * 2); }
    const sp = Math.hypot(v.x, v.z);
    if (sp > 0.01) {
      ball.mesh.rotation.x += (v.z / ball.r) * dt;
      ball.mesh.rotation.z -= (v.x / ball.r) * dt;
    }
    if (sp < 0.08 && !ball.inAir) ball.idle += dt; else ball.idle = 0;
    // Si quedó olvidada lejos del Prado, vuelve sola.
    // (Si estás cerca jugando con ella, no se la lleva.)
    if (ball.idle > 25 && dist2(ball.pos, MEADOW) > MEADOW_R + 3 && dist2(ball.pos, player.pos) > 8) {
      fx.emit(ball.pos, new THREE.Color(1.3, 1.5, 0.5), 12, { up: 1 });
      ball.pos.copy(meadowPoint(3)).setY(1.6);
      ball.vel.set(0, 0, 0);
      ball.thrower = null;
      ball.idle = 0;
    }
  }

  // ---------- armar la manada ----------
  function spawnAgent(look, info, role) {
    const a = makeAgent(look, info);
    a.role = role;
    scene.add(a.pet.group);
    pickables.push(a.pet.hit);
    attachSteps(a);
    return a;
  }
  function removeAgent(a) {
    if (ball.held === a) dropBall(a, 0);
    scene.remove(a.pet.group);
    const i = pickables.indexOf(a.pet.hit);
    if (i >= 0) pickables.splice(i, 1);
    a.pet.dispose();
    a.label?.material.map.dispose();
    a.label?.material.dispose();
  }

  let packKey = '';
  function setPack(memorials, excludeId = null) {
    // Juegan las huellitas del muro: primero las destacadas, después perros, y algún gato.
    const all = memorials.filter((m) => m.id !== excludeId);
    const dogs = all.filter((m) => (m.species || 'perro') === 'perro');
    const featured = dogs.filter((m) => m.featured);
    const rest = dogs.filter((m) => !m.featured).sort((a, b) => (b.candles || 0) - (a.candles || 0));
    const chosen = [...featured, ...rest].slice(0, maxPack - 1);
    const cat = all.find((m) => m.species === 'gato');
    if (cat) chosen.push(cat);
    while (chosen.length < Math.min(maxPack, 3)) chosen.push({ id: `jardin-${chosen.length}`, species: 'perro', name: '' });
    const key = chosen.map((m) => `${m.id}:${m.look ? JSON.stringify(m.look) : ''}`).join('|');
    if (key === packKey) return;
    packKey = key;
    const keep = new Map(pack.map((a) => [a.d.key, a]));
    const next = [];
    for (const m of chosen) {
      const k = `${m.id}:${m.look ? JSON.stringify(m.look) : ''}`;
      let a = keep.get(k);
      if (a) keep.delete(k);
      else {
        a = spawnAgent(lookFor(m), { name: m.name, memorialId: m.featured || m.candles !== undefined ? m.id : null }, 'pack');
        a.d.key = k;
        a.pos.copy(meadowPoint());
        go(a, 'idle');
      }
      next.push(a);
    }
    for (const a of keep.values()) removeAgent(a);
    pack.length = 0;
    pack.push(...next);
  }

  // ---------- pasear ----------
  function walk(m, from) {
    if (companion) { removeAgent(companion); companion = null; }
    if (!m) return null;
    const a = spawnAgent(lookFor(m), { name: m.name, memorialId: m.id }, 'companion');
    companion = a;
    a.owner = player;
    a.fade = 0;
    // Aparece como una lucecita que viaja desde su marco hasta vos.
    const start = from ? from.clone() : player.pos.clone().setY(1.5);
    // Aparece adelante tuyo (en el paseo va adelante, con la correa).
    const end = new THREE.Vector3(player.pos.x + Math.sin(player.heading) * 1.6, 0, player.pos.z + Math.cos(player.heading) * 1.6);
    if (blocked(end.x, end.z, 0.25)) end.copy(player.pos);
    a.pos.copy(end);
    a.heading = player.heading;
    a.d.orb = { start, end: end.clone().setY(0.5), t: 0 };
    go(a, 'follow');
    return a;
  }

  // Tirar la pelota hacia adelante (desde la mano del personaje).
  function throwBall(from, heading, power = 1) {
    if (ball.held) {
      const h = ball.held;
      ball.held = null;
      if (h.state === 'carry') go(h, h.role === 'pack' ? 'idle' : 'follow');
    }
    ball.pos.copy(from);
    ball.vel.set(Math.sin(heading) * 6.5 * power, 4.3 * power, Math.cos(heading) * 6.5 * power);
    ball.thrower = 'player';
    ball.idle = 0;
    fx.emit(from, new THREE.Color(1.3, 1.6, 0.5), 6, { up: 0.4 });
    if (companion && companion.fade > 0.5) { companion.role = 'companion'; go(companion, 'ball'); }
    for (const a of pack) if (a.kind === 'perro' && dist2(a.pos, from) < 16 && !a.pet.anim.busy && R() < 0.65) go(a, 'ball');
  }

  function setRemote(list) {
    const seen = new Set();
    for (const o of list) {
      if (!o.pet) continue;
      const key = `${o.sid}:${o.pet.n}:${o.pet.sp}:${o.pet.fur}:${o.pet.ears}:${o.pet.size}`;
      seen.add(o.sid);
      let a = remotes.get(o.sid);
      if (a && a.d.key !== key) { removeAgent(a); remotes.delete(o.sid); a = null; }
      if (!a) {
        a = spawnAgent(lookFor({ id: `${o.sid}-${o.pet.n}`, name: o.pet.n, species: o.pet.sp, look: { fur: o.pet.fur, ears: o.pet.ears, size: o.pet.size } }), { name: o.pet.n }, 'remote');
        a.d.key = key;
        a.owner = { pos: o.pos, heading: 0, moving: false, still: 0, vel: new THREE.Vector3(), last: o.pos.clone() };
        a.pos.set(o.pos.x + 1, 0, o.pos.z);
        remotes.set(o.sid, a);
        go(a, 'follow');
      }
      a.owner.pos = o.pos;
    }
    for (const [sid, a] of remotes) if (!seen.has(sid)) { removeAgent(a); remotes.delete(sid); }
  }

  const allAgents = () => [...pack, ...(companion ? [companion] : []), ...remotes.values()];

  // ---------- la correa ----------
  // Una soga roja que va de tu mano al collar: floja cuando camina cerca, tirante si se adelanta.
  // Se suelta sola cuando sale a buscar la pelota o se va a jugar.
  const LEASH_PTS = 22;
  const leashPos = new Float32Array((LEASH_PTS + 1) * 3);
  const leashGeo = new THREE.BufferGeometry();
  leashGeo.setAttribute('position', new THREE.BufferAttribute(leashPos, 3));
  const leashMat = new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 0.35, 0.3), transparent: true, opacity: 0.95 });
  const leash = new THREE.Line(leashGeo, leashMat);
  leash.frustumCulled = false;
  leash.visible = false;
  // Una versión con grosor (la línea de WebGL mide 1 píxel): tubito que se rehace cada cuadro.
  let leashTube = null;
  const tubeMat = new THREE.MeshLambertMaterial({ color: '#c0392b', emissive: '#5a1010', emissiveIntensity: 0.6 });
  scene.add(leash);
  const leashA = new THREE.Vector3();
  const leashB = new THREE.Vector3();
  let handFn = null;
  const ON_LEASH = new Set(['follow', 'called', 'present', 'poked', 'idle', 'watch']);
  function updateLeash() {
    const a = companion;
    const show = !!(a && handFn && a.fade > 0.9 && !a.d.orb && ON_LEASH.has(a.state) && a.role === 'companion');
    if (!show) {
      leash.visible = false;
      if (leashTube) leashTube.visible = false;
      return;
    }
    handFn(leashA);
    a.pet.collarWorld(leashB);
    const d = leashA.distanceTo(leashB);
    if (d > 4.2) { leash.visible = false; if (leashTube) leashTube.visible = false; return; }
    // Comba de una cuerda de ~2,4 m: cuanto más cerca, más cuelga.
    const slack = Math.max(0.03, (2.4 - d) * 0.45);
    const pts = [];
    for (let i = 0; i <= LEASH_PTS; i++) {
      const k = i / LEASH_PTS;
      const p = new THREE.Vector3().lerpVectors(leashA, leashB, k);
      p.y -= Math.sin(Math.PI * k) * slack;
      p.y = Math.max(0.04, p.y);
      pts.push(p);
      p.toArray(leashPos, i * 3);
    }
    leashGeo.attributes.position.needsUpdate = true;
    leash.visible = true;
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), LEASH_PTS, 0.012, 5, false);
    if (!leashTube) { leashTube = new THREE.Mesh(tube, tubeMat); leashTube.frustumCulled = false; scene.add(leashTube); } else { leashTube.geometry.dispose(); leashTube.geometry = tube; }
    leashTube.visible = true;
  }

  return {
    pickables,
    ball,
    get companion() { return companion; },
    get pack() { return pack; },
    setPack,
    walk,
    throwBall,
    setRemote,
    on(type, fn) { listeners[type]?.push(fn); },
    sparkle(p, color = new THREE.Color(1.6, 1.2, 0.8), n = 18) { fx.emit(p, color, n, { spread: 0.5, up: 1, speed: 0.8, sz: 0.06 }); },
    spiritOf(obj) { return allAgents().find((a) => a.pet.hit === obj) || null; },
    poke(a) {
      if (!a || a.pet.anim.busy) return;
      if (a.state === 'carry' && ball.held === a) { dropBall(a, 0); }
      go(a, 'poked');
    },
    // Se sienta para que lo acaricies, te mira y mueve la cola.
    cuddle(a) {
      if (!a) return;
      if (ball.held === a) dropBall(a, 0);
      go(a, 'present', a.owner || player);
      a.dur = 2.6;
      fx.emit(tmp.copy(a.pos).setY(0.6 * a.s), a.rim, 10, { spread: 0.3, up: 0.6, speed: 0.3 });
    },
    call() {
      if (!companion) return;
      companion.role = 'companion';
      if (ball.held === companion) dropBall(companion, 0);
      go(companion, 'called');
    },
    // El personaje: posición, rumbo y si se está moviendo (para que el acompañante lo siga).
    // De dónde sale la correa (la mano de tu personaje).
    setHand(fn) { handFn = fn; },
    setPlayer(pos, heading, moving, dt) {
      player.vel.subVectors(pos, player.pos).divideScalar(Math.max(dt, 1e-3));
      player.pos.copy(pos);
      player.heading = heading;
      player.moving = moving;
      player.still = moving ? 0 : player.still + dt;
    },
    update(dt, cam) {
      camPos = cam;
      for (const a of remotes.values()) {
        const o = a.owner;
        const moved = o.pos.distanceTo(o.last);
        o.vel.subVectors(o.pos, o.last).divideScalar(Math.max(dt, 1e-3));
        if (moved > 0.002) { o.heading = Math.atan2(o.pos.x - o.last.x, o.pos.z - o.last.z); o.still = 0; o.moving = true; } else { o.still += dt; o.moving = o.still < 0.3; }
        o.last.copy(o.pos);
      }
      for (const a of allAgents()) {
        if (a.d.orb) {
          // Lucecita en arco desde el marco; al llegar, se materializa.
          const ob = a.d.orb;
          ob.t += dt / 1.3;
          const k = Math.min(1, ob.t);
          tmp.lerpVectors(ob.start, ob.end, k);
          tmp.y += Math.sin(Math.PI * k) * 2.2;
          fx.emit(tmp, a.rim, 3, { spread: 0.12, up: 0.1, speed: 0.15, sz: 0.07, lifeT: 0.8 });
          if (k >= 1) {
            a.d.orb = null;
            fx.emit(tmp.copy(a.pos).setY(0.45 * a.s), a.rim, 40, { spread: 0.5, up: 1.2, speed: 1.2, sz: 0.06 });
            a.pet.anim.trigger('jump', { h: 0.35, d: 0.55 });
            say('arrived', a);
          }
          a.pet.setOpacity(0);
          a.pet.group.rotation.y = a.heading;
          continue;
        }
        if (a.fade < 1) { a.fade = Math.min(1, a.fade + dt * 1.8); a.pet.setOpacity(a.fade); }
        think(a, dt);
        move(a, dt);
        animate(a, dt);
      }
      updateBall(dt);
      updateLeash();
      fx.update(dt);
    },
  };
}
