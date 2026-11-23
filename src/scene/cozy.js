// Detalles pequeños que hacen el jardín acogedor: huellitas en el camino, hongos que brillan,
// el cuenco y la pelota de Luca, farolitos de papel, pétalos que caen, pizarrón de bienvenida,
// las huellitas que llevan al Puente del Arcoíris (el río y el puente están en river.js), el Prado
// de los espíritus y el frasco de gracias.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HALL_CENTER, HALL_RADIUS, SPAWN, PATH_HALF, GARDEN_RADIUS, BRIDGE, outside, MEADOW, MEADOW_R, nearCreek, insideHall, uTime, rand } from './world.js';
import { EASEL_POS, ALTAR_SCALE, POST_H } from './hall.js';
import { pawTexture, chalkboardTexture, glowTexture, labelTexture, woodTexture, twoSided } from './textures.js';
import { picadoBanner, PALETTE } from './muertos.js';
import { buildRiver } from './river.js';
import { paperLantern, flickerLantern } from './lanterns.js';

export const JAR_POS = new THREE.Vector3(-4.2, 0, 15.5);

// `ground`: lo que está en el suelo del jardín (se esconde en los pisos de arriba).
export function createCozy(scene, tier, colliders, ground = scene) {
  const r = rand(23);
  const animated = [];
  const pickables = [];

  // ---------- huellitas en el camino ----------
  {
    const steps = [];
    // Del lado de afuera, huellitas que llevan hasta el puente.
    for (let z = SPAWN.z + 2, i = 0; z > BRIDGE.z + BRIDGE.halfL + 0.3; z -= 0.55, i++) {
      steps.push([(i % 2 ? 0.16 : -0.16) + Math.sin(z * 0.35) * 0.35, z, (r() - 0.5) * 0.3]);
    }
    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.24, 0.24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: pawTexture(), transparent: true, depthWrite: false, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }),
      steps.length,
    );
    const m = new THREE.Object3D();
    steps.forEach(([x, z, rot], i) => {
      m.position.set(x, 0.02, z);
      m.rotation.set(0, Math.PI + rot, 0);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.renderOrder = 2;
    ground.add(mesh);
  }

  // ---------- camino de pétalos de cempasúchil (guía hasta la ofrenda) ----------
  {
    const n = tierCount(tier, 900);
    const petal = new THREE.CircleGeometry(0.045, 5).rotateX(-Math.PI / 2);
    const mesh = new THREE.InstancedMesh(petal, new THREE.MeshLambertMaterial({ emissive: '#7a2c00', emissiveIntensity: 0.6, side: THREE.DoubleSide }), n);
    const m = new THREE.Object3D();
    const cols = [PALETTE.cempasuchil, PALETTE.naranja, PALETTE.amarillo].map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) {
      const t = r();
      const zStart = BRIDGE.z - BRIDGE.halfL - 0.4;
      const z = zStart - t * (zStart - (EASEL_POS.z + 1.2 * ALTAR_SCALE));
      const spread = (r() + r() + r() - 1.5) * 0.9;
      const x = spread + Math.sin(z * 0.35) * 0.3;
      m.position.set(x, 0.03 + (z < HALL_CENTER.z + HALL_RADIUS + 1.3 ? 0.14 : 0) + r() * 0.01, z);
      m.rotation.set((r() - 0.5) * 0.3, r() * 6, (r() - 0.5) * 0.3);
      m.scale.setScalar(0.7 + r() * 0.8);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
      mesh.setColorAt(i, cols[i % cols.length]);
    }
    ground.add(mesh);
  }

  // ---------- papel picado cruzando el camino ----------
  // Van altas (con sus postes) para que la cámara en tercera persona pase por debajo.
  {
    const poleMat = new THREE.MeshLambertMaterial({ map: woodTexture('#5a3a28') });
    const poleGeo = new THREE.CylinderGeometry(0.045, 0.06, 4.4, 7);
    for (const [z, seed] of [[27.8, 4], [22.6, 9], [17.4, 13], [12.2, 2]]) {
      const b = picadoBanner(new THREE.Vector3(-2.75, 4.3, z), new THREE.Vector3(2.75, 4.3, z - 0.2), { sag: 0.42, flags: 11, size: 0.4, seed });
      ground.add(b);
      animated.push((t) => b.userData.flutter(t));
      // Una guirnalda de farolitos de papel más abajo, entre los mismos postes.
      {
        const a = new THREE.Vector3(-2.75, 3.7, z);
        const bb = new THREE.Vector3(2.75, 3.7, z - 0.2);
        const pts = [];
        for (let i = 0; i <= 16; i++) {
          const k = i / 16;
          pts.push(new THREE.Vector3().lerpVectors(a, bb, k).add(new THREE.Vector3(0, -Math.sin(k * Math.PI) * 0.45, 0)));
        }
        ground.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#2a1d16' })));
        const TINTS = [[2.2, 0.9, 1.3], [2.2, 1.3, 0.5], [0.8, 1.8, 1.6], [2.2, 1.7, 0.6], [1.3, 0.9, 2.0]];
        for (const [j, k] of [0.22, 0.5, 0.78].entries()) {
          const hang = new THREE.Group();
          hang.position.lerpVectors(a, bb, k).add(new THREE.Vector3(0, -Math.sin(k * Math.PI) * 0.45, 0));
          const string = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 4), new THREE.MeshBasicMaterial({ color: '#2a1d16' }));
          string.position.y = -0.13;
          const l = paperLantern({ scale: 1.05, tint: TINTS[(seed + j) % TINTS.length], glow: 1.5 });
          l.position.y = -0.48;
          hang.add(string, l);
          ground.add(hang);
          const ph = seed + j * 1.7;
          animated.push((t) => { hang.rotation.z = Math.sin(t * 1.1 + ph) * 0.07; hang.rotation.x = Math.sin(t * 0.8 + ph) * 0.05; flickerLantern(l, t); });
        }
      }
      for (const [x, zz] of [[-2.75, z], [2.75, z - 0.2]]) {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(x, 2.2, zz);
        ground.add(pole);
        if (!colliders.circles.some((c) => Math.hypot(c.x - x, c.z - zz) < 0.4)) colliders.circles.push({ x, z: zz, r: 0.12, ground: true });
      }
    }
  }

  // ---------- hongos que brillan ----------
  {
    const n = tierCount(tier, 120);
    const stems = [];
    const caps = [];
    const capColors = [];
    const pal = [new THREE.Color(0.5, 1.4, 1.5), new THREE.Color(1.5, 0.7, 1.2), new THREE.Color(1.4, 1.1, 0.5)];
    for (let i = 0; i < n; i++) {
      // Grupitos en el pasto, lejos del camino y del salón.
      const a = r() * Math.PI * 2;
      const d = 14 + r() * (GARDEN_RADIUS - 16);
      const cx = Math.sin(a) * d;
      const cz = Math.cos(a) * d - 4;
      if ((Math.abs(cx) < PATH_HALF + 1 && cz > -2) || nearCreek(cx, cz, 0.5) || insideHall(cx, cz, 0.5) || outside(cx, cz)) continue;
      for (let k = 0; k < 3; k++) {
        const x = cx + (r() - 0.5) * 0.5;
        const z = cz + (r() - 0.5) * 0.5;
        const h = 0.06 + r() * 0.1;
        const st = new THREE.CylinderGeometry(0.012, 0.018, h, 5).toNonIndexed();
        st.deleteAttribute('uv');
        st.translate(x, h / 2, z);
        stems.push(st);
        const cap = new THREE.SphereGeometry(0.035 + r() * 0.03, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed();
        cap.deleteAttribute('uv');
        cap.scale(1, 0.7, 1);
        cap.translate(x, h, z);
        const c = pal[i % pal.length];
        const cols = new Float32Array(cap.attributes.position.count * 3);
        for (let v = 0; v < cap.attributes.position.count; v++) c.toArray(cols, v * 3);
        cap.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        caps.push(cap);
        capColors.push(c);
      }
    }
    ground.add(new THREE.Mesh(mergeGeometries(stems), new THREE.MeshLambertMaterial({ color: '#e8dccb', emissive: '#3a3030' })));
    const capMesh = new THREE.Mesh(mergeGeometries(caps), new THREE.MeshBasicMaterial({ vertexColors: true }));
    ground.add(capMesh);
  }

  // ---------- el cuenco y la pelota de Luca ----------
  {
    const g = new THREE.Group();
    g.position.set(EASEL_POS.x + 2.95, 0.16, EASEL_POS.z + 1.35);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.08, 20, 1, true), new THREE.MeshLambertMaterial({ color: '#c9704e', side: THREE.DoubleSide }));
    bowl.position.y = 0.04;
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.7, 1.0) }));
    water.position.y = 0.06;
    const base = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#a85a3c' }));
    base.position.y = 0.002;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshLambertMaterial({ color: '#cfe05a', emissive: '#303a00' }));
    ball.position.set(-0.32, 0.07, 0.12);
    g.add(bowl, water, base, ball);
    scene.add(g);
  }

  // ---------- farolitos de papel colgando en la pérgola ----------
  {
    const colors = [new THREE.Color(1.8, 0.9, 0.7), new THREE.Color(1.7, 1.4, 0.6), new THREE.Color(1.1, 0.9, 1.7), new THREE.Color(1.8, 0.8, 1.1), new THREE.Color(0.8, 1.4, 1.2)];
    const geo = new THREE.SphereGeometry(0.22, 14, 10);
    geo.scale(1, 0.85, 1);
    for (let p = 0; p < 11; p++) {
      const a = THREE.MathUtils.degToRad(40 + (p - 0.5) * (280 / 9));
      const rad = HALL_RADIUS - 1.0;
      const lantern = new THREE.Group();
      lantern.position.set(HALL_CENTER.x + Math.sin(a) * rad, POST_H - 0.75, HALL_CENTER.z + Math.cos(a) * rad);
      const ball = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colors[p % colors.length], transparent: true, opacity: 0.92 }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 16).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#2a1d16' }));
      ring.position.y = 0.19;
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 4), new THREE.MeshBasicMaterial({ color: '#1b1512' }));
      cord.position.y = 0.45;
      lantern.add(ball, ring, cord);
      scene.add(lantern);
      const seed = r() * 10;
      animated.push((t) => { lantern.rotation.z = Math.sin(t * 0.9 + seed) * 0.06; lantern.rotation.x = Math.cos(t * 0.7 + seed) * 0.05; });
    }
  }

  // ---------- pétalos que caen ----------
  {
    const n = tierCount(tier, 240);
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos.set([(r() - 0.5) * 80, r() * 9, (r() - 0.5) * 80 - 2], i * 3);
      seed[i] = r();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime, uScale: { value: innerHeight } },
      vertexShader: `attribute float seed; uniform float uTime; uniform float uScale; varying float vS;
        void main(){
          vec3 p = position;
          float fall = mod(p.y + uTime * (0.12 + seed * 0.12), 9.0);
          p.y = fall;
          p.x += sin(uTime * 0.8 + seed * 20.0) * 0.6 + uTime * 0.12;
          p.x = mod(p.x + 40.0, 80.0) - 40.0;
          p.z += cos(uTime * 0.6 + seed * 13.0) * 0.5;
          vS = seed;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(uScale * 0.035 / max(-mv.z, 0.1), 1.0, 14.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vS; void main(){
          vec2 q = gl_PointCoord - 0.5;
          float a = vS * 6.28;
          q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
          float d = length(q * vec2(1.0, 1.9));
          if (d > 0.5) discard;
          gl_FragColor = vec4(mix(vec3(1.4, 0.55, 0.08), vec3(1.6, 0.95, 0.2), vS), 0.9);
        }`,
    }));
    pts.frustumCulled = false;
    scene.add(pts);
    addEventListener('resize', () => { pts.material.uniforms.uScale.value = innerHeight; });
  }

  // ---------- pizarrón de bienvenida ----------
  {
    const g = new THREE.Group();
    g.position.set(PATH_HALF + 1.3, 0, SPAWN.z - 3.2);
    g.rotation.y = -0.55;
    const board = twoSided(new THREE.PlaneGeometry(1.1, 0.82), new THREE.MeshLambertMaterial({
      map: chalkboardTexture([['¡Bienvenidos! 🐾', 64, 92], ['Cruzá el puente', 50, 186], ['y entrá al jardín', 50, 246], ['🌈 🕯️ 🌼', 54, 330]]),
      emissive: '#222',
    }));
    board.position.y = 1.05;
    board.rotation.x = -0.1;
    const wood = new THREE.MeshLambertMaterial({ map: woodTexture('#6b4630') });
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.05), wood);
      leg.position.set(s * 0.45, 0.72, s === -1 ? 0.05 : 0.05);
      leg.rotation.z = s * 0.06;
      g.add(leg);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 0.05), wood);
    back.position.set(0, 0.66, -0.3);
    back.rotation.x = 0.3;
    g.add(board, back);
    ground.add(g);
    colliders.circles.push({ x: g.position.x, z: g.position.z, r: 0.5, ground: true });
  }

  // ---------- el río, el Puente del Arcoíris y el arco de entrada (river.js) ----------
  buildRiver({ ground, animated, colliders, r, density: tierCount(tier, 100) / 100 });

  // ---------- cartel con flecha en la entrada: por acá al Prado ----------
  {
    const g = new THREE.Group();
    g.position.set(PATH_HALF + 1.7, 0, 28.8);
    const wood = new THREE.MeshLambertMaterial({ map: woodTexture('#6b4630') });
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.08), wood);
    post.position.y = 0.9;
    g.add(post);
    const dx = MEADOW.x - g.position.x;
    const dz = MEADOW.z - g.position.z;
    const arm = new THREE.Group();
    arm.position.y = 1.5;
    arm.rotation.y = Math.atan2(-dz, dx);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.3, 0.05), new THREE.MeshLambertMaterial({ color: '#7a5236', emissive: '#2a160c' }));
    plank.position.x = 0.62;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.21, 0.05, 3), plank.material);
    tip.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    tip.position.x = 1.42;
    const tex = (t) => labelTexture(t, { w: 600, h: 124, font: '700 62px Caveat, cursive', bg: 'rgba(0,0,0,0)', fg: '#f6e3c4' });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.29), new THREE.MeshBasicMaterial({ map: tex('Prado de los espíritus 🐾'), transparent: true }));
    front.position.set(0.62, 0, 0.027);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.29), new THREE.MeshBasicMaterial({ map: tex('🐾 Prado de los espíritus'), transparent: true }));
    back.position.set(0.62, 0, -0.027);
    back.rotation.y = Math.PI;
    arm.add(plank, tip, front, back);
    g.add(arm);
    ground.add(g);
    colliders.circles.push({ x: g.position.x, z: g.position.z, r: 0.2, ground: true });
  }

  // ---------- el Prado de los espíritus: cartel, cucha, cuenco y piedritas que brillan ----------
  {
    const wood = new THREE.MeshLambertMaterial({ map: woodTexture('#7a5236') });
    const sign = twoSided(new THREE.PlaneGeometry(1.9, 0.42), new THREE.MeshBasicMaterial({
      map: labelTexture('Prado de los espíritus 🐾', { w: 720, h: 150, font: '700 70px Caveat, cursive', bg: 'rgba(74,48,34,0.95)', fg: '#f6e3c4' }),
    }));
    const sx = MEADOW.x - MEADOW_R * 0.72;
    const sz = MEADOW.z + MEADOW_R * 0.72;
    sign.position.set(sx, 1.15, sz);
    sign.rotation.y = -0.75;
    ground.add(sign);
    for (const o of [-0.8, 0.8]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.25, 0.07), wood);
      post.position.set(sx + Math.cos(0.75) * o, 0.62, sz + Math.sin(0.75) * o);
      ground.add(post);
    }
    colliders.circles.push({ x: sx, z: sz, r: 0.35, ground: true });
    // Cucha de madera con techo a dos aguas.
    const house = new THREE.Group();
    house.position.set(MEADOW.x + MEADOW_R * 0.55, 0, MEADOW.z - MEADOW_R * 0.75);
    house.rotation.y = -2.4;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 1.0), new THREE.MeshLambertMaterial({ map: woodTexture('#b5482a') }));
    walls.position.y = 0.31;
    const roofMat = new THREE.MeshLambertMaterial({ map: woodTexture('#5a3a28') });
    for (const sd of [-1, 1]) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 1.12), roofMat);
      roof.position.set(sd * 0.22, 0.78, 0);
      roof.rotation.z = -sd * 0.72;
      house.add(roof);
    }
    const door = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#160d12' }));
    door.position.set(0, 0.15, 0.505);
    const doorLow = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.15), door.material);
    doorLow.position.set(0, 0.075, 0.505);
    const name = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.11), new THREE.MeshBasicMaterial({ map: labelTexture('Hogar', { w: 256, h: 64, font: '700 44px Caveat, cursive' }) }));
    name.position.set(0, 0.5, 0.506);
    house.add(walls, door, doorLow, name);
    ground.add(house);
    colliders.circles.push({ x: house.position.x, z: house.position.z, r: 0.7, ground: true });
    // Piedritas que brillan marcando el borde del prado.
    const n = 26;
    const glowStones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.032, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.8, 0.9) }), n);
    const m = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.1;
      m.position.set(MEADOW.x + Math.sin(a) * (MEADOW_R + 0.6), 0.04, MEADOW.z + Math.cos(a) * (MEADOW_R + 0.6));
      m.rotation.set(r() * 3, r() * 3, r() * 3);
      m.scale.setScalar(0.7 + r() * 0.6);
      m.updateMatrix();
      glowStones.setMatrixAt(i, m.matrix);
    }
    ground.add(glowStones);
    animated.push((t) => { glowStones.material.color.setRGB(0.32 + Math.sin(t * 1.3) * 0.08, 0.75 + Math.sin(t * 1.3) * 0.12, 0.9); });
  }

  // ---------- frasco de gracias ----------
  const jar = new THREE.Group();
  jar.position.copy(JAR_POS);
  {
    const wood = new THREE.MeshLambertMaterial({ map: woodTexture('#7a5236') });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 20), wood);
    top.position.y = 0.78;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.76, 8), wood);
    leg.position.y = 0.38;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.04, 16), wood);
    foot.position.y = 0.02;
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.19, 0.42, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.85, 1.0), transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    );
    glass.position.y = 1.02;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.07, 16), new THREE.MeshLambertMaterial({ color: '#b98d5a' }));
    cork.position.y = 1.26;
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.13), new THREE.MeshBasicMaterial({
      map: labelTexture('Frasco de gracias', { w: 384, h: 96, font: '700 52px Caveat, cursive' }), transparent: true,
    }));
    tag.position.set(0, 0.62, 0.43);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.4 }));
    halo.scale.setScalar(1.2);
    halo.position.y = 1.0;
    jar.add(top, leg, foot, glass, cork, tag, halo);
    // Área invisible más grande para tocarlo fácil en el celular.
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.75;
    hit.userData = { kind: 'jar' };
    jar.add(hit);
    pickables.push(hit);
  }
  ground.add(jar);
  colliders.circles.push({ x: JAR_POS.x, z: JAR_POS.z, r: 0.45, ground: true });
  const STAR_MAX = 90;
  const stars = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.03, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.5, 0.8) }), STAR_MAX);
  {
    const m = new THREE.Object3D();
    const pal = ['#ffd27a', '#ffb3c7', '#bfe3ff', '#d9c2ff', '#fff2b3'].map((c) => new THREE.Color(c).multiplyScalar(1.8));
    for (let i = 0; i < STAR_MAX; i++) {
      const layer = Math.floor(i / 12);
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 0.14;
      m.position.set(Math.cos(a) * d, 0.84 + layer * 0.042 + r() * 0.02, Math.sin(a) * d);
      m.rotation.set(r() * 3, r() * 3, r() * 3);
      m.updateMatrix();
      stars.setMatrixAt(i, m.matrix);
      stars.setColorAt(i, pal[i % pal.length]);
    }
    stars.count = 0;
  }
  jar.add(stars);

  return {
    pickables,
    animate(t, dt) {
      animated.forEach((fn) => fn(t, dt));
    },
    setJarCount(n) {
      stars.count = Math.min(STAR_MAX, Math.max(3, n));
    },
    jarWorldPos: () => new THREE.Vector3(JAR_POS.x, 1.0, JAR_POS.z),
  };
}

function tierCount(tier, n) {
  return Math.round(n * (tier.grass >= 20000 ? 1 : tier.grass >= 10000 ? 0.7 : 0.4));
}
