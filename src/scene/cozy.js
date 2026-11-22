// Detalles pequeños que hacen el jardín acogedor: huellitas en el camino, hongos que brillan,
// el cuenco y la pelota de Luca, farolitos de papel, pétalos que caen, pizarrón de bienvenida,
// el Puente del Arcoíris con su arroyo, espíritus de mascotas que pasean y el frasco de gracias.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HALL_CENTER, HALL_RADIUS, SPAWN, PATH_HALF, GARDEN_RADIUS, CREEK_Z, nearCreek, uTime, rand } from './world.js';
import { EASEL_POS } from './hall.js';
import { pawTexture, chalkboardTexture, glowTexture, labelTexture, woodTexture } from './textures.js';

export const JAR_POS = new THREE.Vector3(-3.3, 0, 2.2);

export function createCozy(scene, tier, colliders) {
  const r = rand(23);
  const animated = [];
  const pickables = [];

  // ---------- huellitas en el camino ----------
  {
    const steps = [];
    for (let z = SPAWN.z + 2, i = 0; z > HALL_CENTER.z + HALL_RADIUS + 1.5; z -= 0.55, i++) {
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
    scene.add(mesh);
  }

  // ---------- hongos que brillan ----------
  {
    const n = tierCount(tier, 70);
    const stems = [];
    const caps = [];
    const capColors = [];
    const pal = [new THREE.Color(0.5, 1.4, 1.5), new THREE.Color(1.5, 0.7, 1.2), new THREE.Color(1.4, 1.1, 0.5)];
    for (let i = 0; i < n; i++) {
      // Grupitos en el pasto, lejos del camino y del salón.
      const a = r() * Math.PI * 2;
      const d = 14 + r() * 21;
      const cx = Math.sin(a) * d;
      const cz = Math.cos(a) * d - 4;
      if ((Math.abs(cx) < PATH_HALF + 1 && cz > -2) || nearCreek(cx, cz, 0.5)) continue;
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
    scene.add(new THREE.Mesh(mergeGeometries(stems), new THREE.MeshLambertMaterial({ color: '#e8dccb', emissive: '#3a3030' })));
    const capMesh = new THREE.Mesh(mergeGeometries(caps), new THREE.MeshBasicMaterial({ vertexColors: true }));
    scene.add(capMesh);
  }

  // ---------- el cuenco y la pelota de Luca ----------
  {
    const g = new THREE.Group();
    g.position.set(EASEL_POS.x + 1.05, 0.16, EASEL_POS.z + 0.75);
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
      lantern.position.set(HALL_CENTER.x + Math.sin(a) * rad, 4.35, HALL_CENTER.z + Math.cos(a) * rad);
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
    const n = tierCount(tier, 140);
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos.set([(r() - 0.5) * 50, r() * 9, (r() - 0.5) * 50 - 2], i * 3);
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
          float fall = mod(p.y - uTime * (0.35 + seed * 0.25), 9.0);
          p.y = fall;
          p.x += sin(uTime * 0.8 + seed * 20.0) * 0.6 + uTime * 0.12;
          p.x = mod(p.x + 25.0, 50.0) - 25.0;
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
          gl_FragColor = vec4(mix(vec3(0.98, 0.72, 0.8), vec3(1.0, 0.86, 0.9), vS), 0.85);
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
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.82), new THREE.MeshLambertMaterial({
      map: chalkboardTexture([['¡Bienvenidos! 🐾', 64, 92], ['Encendé una vela', 50, 186], ['por quien extrañás', 50, 246], ['🕯️ ✨ 🌸', 54, 330]]),
      emissive: '#222', side: THREE.DoubleSide,
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
    scene.add(g);
    colliders.circles.push({ x: g.position.x, z: g.position.z, r: 0.5 });
  }

  // ---------- el Puente del Arcoíris y su arroyo ----------
  {
    // Arroyo: una cinta que serpentea de lado a lado detrás del salón.
    const pts = [];
    for (let x = -36; x <= 36; x += 2) pts.push(new THREE.Vector3(x, 0.03, CREEK_Z + Math.sin(x * 0.12) * 2.2));
    const curve = new THREE.CatmullRomCurve3(pts);
    const segs = 120;
    const pos = [];
    const uvs = [];
    const idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const w = 1.5 + Math.sin(t * 9) * 0.25;
      pos.push(p.x + n.x * w, 0.03, p.z + n.z * w, p.x - n.x * w, 0.03, p.z - n.z * w);
      uvs.push(t * 30, 0, t * 30, 1);
      if (i < segs) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    const water = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { uTime },
      transparent: true,
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        void main(){
          float edge = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
          vec3 deep = vec3(0.06, 0.09, 0.2);
          vec3 c = mix(vec3(0.16, 0.2, 0.32), deep, edge);
          // Destellos de la luna que corren con el agua.
          vec2 g = vec2(vUv.x * 2.0 - uTime * 0.6, vUv.y * 6.0);
          vec2 cell = floor(g);
          float s = h(cell);
          float tw = smoothstep(0.92, 1.0, s) * (0.5 + 0.5 * sin(uTime * 3.0 + s * 40.0));
          float d = length(fract(g) - 0.5);
          c += vec3(1.4, 1.3, 1.1) * tw * smoothstep(0.25, 0.0, d) * edge;
          gl_FragColor = vec4(c, 0.92);
        }`,
    }));
    scene.add(water);
    // Piedritas en la orilla.
    const stones = [];
    for (let i = 0; i < 70; i++) {
      const t = r();
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar((r() < 0.5 ? -1 : 1) * (1.6 + r() * 0.4));
      const sg = new THREE.DodecahedronGeometry(0.12 + r() * 0.15, 0).toNonIndexed();
      sg.deleteAttribute('uv');
      sg.scale(1, 0.5, 1);
      sg.translate(p.x + n.x, 0.05, p.z + n.z);
      stones.push(sg);
    }
    scene.add(new THREE.Mesh(mergeGeometries(stones), new THREE.MeshLambertMaterial({ color: '#8a8290', flatShading: true })));

    // Puente de madera en arco.
    const bridge = new THREE.Group();
    bridge.position.set(0, 0, curve.getPoint(0.5).z);
    const wood = new THREE.MeshLambertMaterial({ map: woodTexture('#7a5236') });
    const planks = [];
    const L = 5.2;
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const z = (t - 0.5) * L;
      const y = Math.sin(t * Math.PI) * 0.75 + 0.1;
      const pg = new THREE.BoxGeometry(1.7, 0.07, 0.3);
      pg.rotateX(-Math.cos(t * Math.PI) * 0.42);
      pg.translate(0, y, z);
      planks.push(pg);
    }
    for (const s of [-1, 1]) {
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const z = (t - 0.5) * L;
        const y = Math.sin(t * Math.PI) * 0.75 + 0.1;
        const post = new THREE.BoxGeometry(0.07, 0.7, 0.07);
        post.translate(s * 0.82, y + 0.35, z);
        planks.push(post);
      }
      const railPts = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        railPts.push(new THREE.Vector3(s * 0.82, Math.sin(t * Math.PI) * 0.75 + 0.78, (t - 0.5) * L));
      }
      const rail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 24, 0.035, 5, false);
      bridge.add(new THREE.Mesh(rail, wood));
    }
    bridge.add(new THREE.Mesh(mergeGeometries(planks.map((g) => g.toNonIndexed())), wood));
    // Faroles chiquitos en las puntas.
    for (const s of [-1, 1]) for (const e of [-1, 1]) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 1.0) }));
      bulb.position.set(s * 0.82, 0.9 + 0.08, e * L / 2);
      bridge.add(bulb);
    }
    scene.add(bridge);

    // Arcoíris tenue, como el de una noche de luna.
    const colors = ['#ff8a8a', '#ffb870', '#ffe58a', '#9be38f', '#8ec5ff', '#a99bff', '#e0a0ff'];
    const rainbow = new THREE.Group();
    colors.forEach((c, i) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(14 - i * 0.5, 0.26, 6, 64, Math.PI),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      );
      rainbow.add(arc);
    });
    rainbow.position.set(0, -2, CREEK_Z - 6);
    scene.add(rainbow);
    animated.push((t) => rainbow.children.forEach((a, i) => { a.material.opacity = 0.065 + Math.sin(t * 0.4 + i * 0.5) * 0.02; }));

    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.36), new THREE.MeshBasicMaterial({
      map: labelTexture('Puente del Arcoíris 🌈', { w: 640, h: 136, font: '700 66px Caveat, cursive', bg: 'rgba(74,48,34,0.95)', fg: '#f6e3c4' }),
      side: THREE.DoubleSide,
    }));
    sign.position.set(1.6, 1.0, bridge.position.z + L / 2 + 0.6);
    scene.add(sign);
    const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), wood);
    signPost.position.set(1.6, 0.5, bridge.position.z + L / 2 + 0.58);
    scene.add(signPost);
  }

  // ---------- espíritus de mascotas que pasean ----------
  const spirits = [makeSpirit('perro'), makeSpirit('gato')];
  spirits.forEach((sp, i) => {
    sp.group.position.set(i ? 8 : -8, 0, 8);
    scene.add(sp.group);
    pickables.push(sp.hit);
  });
  animated.push((t, dt) => spirits.forEach((sp) => walkSpirit(sp, t, dt, r)));

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
  scene.add(jar);
  colliders.circles.push({ x: JAR_POS.x, z: JAR_POS.z, r: 0.45 });
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
    spiritOf: (obj) => spirits.find((s) => s.hit === obj),
    hop(sp) {
      sp.hopT = 0;
      sp.pause = 1.5;
    },
  };
}

function tierCount(tier, n) {
  return Math.round(n * (tier.grass >= 20000 ? 1 : tier.grass >= 10000 ? 0.7 : 0.4));
}

// Un perrito o gatito de luz, hecho con formas simples.
function makeSpirit(kind) {
  const cat = kind === 'gato';
  const g = new THREE.Group();
  const col = cat ? new THREE.Color(1.3, 1.0, 1.6) : new THREE.Color(0.9, 1.25, 1.7);
  const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = cat ? 0.75 : 1;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), mat);
  body.scale.set(0.85 * s, 0.75 * s, 1.35 * s);
  body.position.y = 0.36 * s;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15 * s, 14, 10), mat);
  head.position.set(0, 0.56 * s, 0.27 * s);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.07 * s, 10, 8), mat);
  snout.position.set(0, 0.52 * s, 0.4 * s);
  snout.visible = !cat;
  const earGeo = new THREE.ConeGeometry(0.055 * s, cat ? 0.13 * s : 0.15 * s, 6);
  const ears = [-1, 1].map((e) => {
    const ear = new THREE.Mesh(earGeo, mat);
    ear.position.set(e * 0.08 * s, cat ? 0.7 * s : 0.64 * s, 0.25 * s);
    ear.rotation.z = cat ? -e * 0.25 : -e * 2.4;
    return ear;
  });
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * s, 0.035 * s, cat ? 0.42 * s : 0.26 * s, 6), mat);
  tail.position.set(0, 0.5 * s, -0.3 * s);
  tail.rotation.x = cat ? -0.3 : -0.9;
  const legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.24 * s, 6), mat);
    leg.geometry.translate(0, -0.12 * s, 0);
    leg.position.set(x * 0.09 * s, 0.26 * s, z * 0.14 * s);
    return leg;
  });
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5 }));
  aura.scale.setScalar(1.3 * s);
  aura.position.y = 0.4 * s;
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.4 * s;
  hit.userData = { kind: 'spirit', pet: kind };
  g.add(body, head, snout, ...ears, tail, ...legs, aura, hit);
  return { group: g, body, head, tail, legs, hit, kind, target: new THREE.Vector3(), pause: 0, phase: 0, hopT: 1, speed: cat ? 1.0 : 1.3 };
}

function pickTarget(sp, r) {
  // Pasean entre el camino, el salón y el puente.
  for (let i = 0; i < 20; i++) {
    const a = r() * Math.PI * 2;
    const d = 6 + r() * (GARDEN_RADIUS - 10);
    const x = Math.sin(a) * d;
    const z = Math.cos(a) * d - 4;
    if (Math.hypot(x - HALL_CENTER.x, z - HALL_CENTER.z) > HALL_RADIUS + 2.5) { sp.target.set(x, 0, z); return; }
  }
  sp.target.set(0, 0, 10);
}

function walkSpirit(sp, t, dt, r) {
  const g = sp.group;
  if (sp.target.lengthSq() === 0) pickTarget(sp, r);
  if (sp.hopT < 1) sp.hopT = Math.min(1, sp.hopT + dt * 1.6);
  const hop = sp.hopT < 1 ? Math.sin(sp.hopT * Math.PI) * 0.5 : 0;
  if (sp.pause > 0) {
    sp.pause -= dt;
    sp.tail.rotation.z = Math.sin(t * 9) * 0.5;
    g.position.y = hop;
    return;
  }
  const dx = sp.target.x - g.position.x;
  const dz = sp.target.z - g.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.3) {
    sp.pause = 1.5 + r() * 4;
    pickTarget(sp, r);
    return;
  }
  const want = Math.atan2(dx, dz);
  let diff = want - g.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  g.rotation.y += diff * Math.min(1, dt * 3);
  const step = Math.min(d, sp.speed * dt);
  g.position.x += Math.sin(g.rotation.y) * step;
  g.position.z += Math.cos(g.rotation.y) * step;
  sp.phase += dt * 10;
  g.position.y = Math.abs(Math.sin(sp.phase)) * 0.05 + hop;
  sp.legs.forEach((l, i) => { l.rotation.x = Math.sin(sp.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6; });
  sp.tail.rotation.z = Math.sin(t * 6) * 0.3;
}
