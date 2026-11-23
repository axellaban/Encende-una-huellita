// La magia del cielo, en todos los pisos: cometas que cruzan muy despacio con su cola larga, estrellas
// fugaces de noche y, al subir, la inmensidad del cielo de día: bancos de nubes gigantes en el
// horizonte, islas que flotan lejos con cascadas de luz y bandadas de pájaros de luz.
// `setK(k)`: 0 = piso 1 (noche), 1 = piso 99 (cielo de día).
import * as THREE from 'three';
import { glowTexture } from './textures.js';
import { paperLantern, flickerLantern } from './lanterns.js';

const smooth = (x) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };

// Una nube cúmulo dibujada en canvas: muchas bolas suaves, con la panza un poco más gris azulada.
let cloudTex = null;
function cumulusTexture() {
  if (cloudTex) return cloudTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  let s = 7;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 70; i++) {
    const x = 70 + r() * 372;
    const base = 200 - Math.sin(((x - 70) / 372) * Math.PI) * 120;
    const y = base + r() * 40;
    const rad = 26 + r() * 46 * Math.sin(((x - 70) / 372) * Math.PI + 0.2);
    const grd = g.createRadialGradient(x, y - rad * 0.3, rad * 0.1, x, y, rad);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)');
    grd.addColorStop(0.55, 'rgba(246,249,255,0.75)');
    grd.addColorStop(1, 'rgba(220,232,250,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  // Panza: un degradé que oscurece apenas la parte de abajo.
  g.globalCompositeOperation = 'source-atop';
  const belly = g.createLinearGradient(0, 120, 0, 256);
  belly.addColorStop(0, 'rgba(180,200,235,0)');
  belly.addColorStop(1, 'rgba(160,180,225,0.55)');
  g.fillStyle = belly;
  g.fillRect(0, 0, 512, 256);
  cloudTex = new THREE.CanvasTexture(c);
  cloudTex.colorSpace = THREE.SRGBColorSpace;
  return cloudTex;
}

// La cola de un cometa: una cinta curva con degradé (blanca en la cabeza, turquesa y rosa al final).
function cometTail(len, width, bend) {
  const pts = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(new THREE.Vector3(-t * len, Math.sin(t * Math.PI * 0.5) * bend * len, 0));
  }
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const w = width * (0.25 + t * 1.2);
    const p = pts[i];
    pos.push(p.x, p.y - w / 2, 0, p.x, p.y + w / 2, 0);
    uv.push(t, 0, t, 1);
    if (i < N) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

const tailShader = (uTime) => new THREE.ShaderMaterial({
  uniforms: { uTime, uA: { value: 1 }, uTint: { value: new THREE.Color(0.6, 0.9, 1.0) }, uSeed: { value: 0 } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  fog: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float uTime; uniform float uA; uniform vec3 uTint; uniform float uSeed; varying vec2 vUv;
    void main(){
      float across = abs(vUv.y - 0.5) * 2.0;
      float core = exp(-across * across * 6.0);
      // Filamentos que se mueven a lo largo de la cola.
      float fil = 0.75 + 0.25 * sin(vUv.y * 40.0 + vUv.x * 9.0 - uTime * 0.6 + uSeed);
      float along = pow(1.0 - vUv.x, 1.6);
      vec3 c = mix(vec3(1.6, 1.5, 1.35), uTint, smoothstep(0.0, 0.5, vUv.x));
      c = mix(c, vec3(1.0, 0.45, 0.8), smoothstep(0.55, 1.0, vUv.x) * 0.6);
      gl_FragColor = vec4(c, core * along * fil * uA * 0.75);
    }`,
});

export function createSkyMagic(scene, { uTime, rnd = Math.random }) {
  const root = new THREE.Group();
  scene.add(root);
  const glow = glowTexture();

  // ---------- cometas ----------
  const comets = [];
  const COMETS = [
    { az: -0.7, el: 0.42, len: 90, w: 6, bend: 0.08, rot: 0.55, tint: [0.55, 0.95, 1.1], speed: 0.0035 },
    { az: 1.9, el: 0.3, len: 60, w: 6, bend: -0.06, rot: -0.35, tint: [0.9, 0.7, 1.2], speed: -0.0025 },
    { az: 3.6, el: 0.55, len: 45, w: 4.5, bend: 0.1, rot: 0.9, tint: [0.6, 1.1, 0.9], speed: 0.0042 },
  ];
  for (const [i, c] of COMETS.entries()) {
    const pivot = new THREE.Group();
    const g = new THREE.Group();
    const R = 360;
    g.position.set(Math.cos(c.az) * Math.cos(c.el) * R, Math.sin(c.el) * R, Math.sin(c.az) * Math.cos(c.el) * R);
    g.lookAt(0, g.position.y * 0.2, 0);
    const tail = new THREE.Mesh(cometTail(c.len, c.w, c.bend), tailShader(uTime));
    tail.material.uniforms.uTint.value.setRGB(...c.tint);
    tail.material.uniforms.uSeed.value = i * 3.1;
    tail.rotation.z = c.rot;
    // Segunda cola, de polvo: más ancha, más tenue y curvada al revés.
    const dust = new THREE.Mesh(cometTail(c.len * 0.75, c.w * 1.8, -c.bend * 2.5), tailShader(uTime));
    dust.material.uniforms.uTint.value.setRGB(1.2, 0.85, 0.7);
    dust.material.uniforms.uA.value = 0.45;
    dust.rotation.z = c.rot;
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(1.8, 1.7, 1.5), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    head.scale.setScalar(c.w * 1.05);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(2.4, 2.3, 2.1), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    core.scale.setScalar(c.w * 0.32);
    g.add(dust, tail, head, core);
    pivot.add(g);
    root.add(pivot);
    comets.push({ pivot, tail, dust, head, core, c });
  }

  // ---------- estrellas fugaces ----------
  const shootMat = () => new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uA; varying vec2 vUv;
      void main(){ float a = pow(vUv.x, 2.5) * exp(-pow((vUv.y - 0.5) * 3.2, 2.0)); gl_FragColor = vec4(vec3(1.6, 1.5, 1.3), a * uA); }`,
  });
  const shoots = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.7), shootMat());
    m.visible = false;
    root.add(m);
    shoots.push({ m, life: 0, dur: 1, from: new THREE.Vector3(), dir: new THREE.Vector3() });
  }
  let nextShoot = 3;
  const X = new THREE.Vector3();
  const Y = new THREE.Vector3();
  const Z = new THREE.Vector3();
  const M = new THREE.Matrix4();
  function launch(s) {
    const az = rnd() * Math.PI * 2;
    const el = 0.35 + rnd() * 0.45;
    const R = 300;
    s.from.set(Math.cos(az) * Math.cos(el) * R, Math.sin(el) * R, Math.sin(az) * Math.cos(el) * R);
    // Hacia abajo y de costado, tangente a la esfera.
    const n = s.from.clone().normalize();
    const side = new THREE.Vector3(0, 1, 0).cross(n).normalize();
    s.dir.copy(side).multiplyScalar(rnd() < 0.5 ? 1 : -1).addScaledVector(new THREE.Vector3(0, -1, 0).projectOnPlane(n).normalize(), 0.7).normalize();
    s.life = 0;
    s.dur = 0.7 + rnd() * 0.6;
    s.m.visible = true;
  }

  // ---------- la inmensidad de arriba ----------
  const high = new THREE.Group();
  root.add(high);
  // Bancos de nubes gigantes en el horizonte.
  const banks = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rnd() * 0.2;
    const d = 230 + rnd() * 110;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cumulusTexture(), transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    const w = 120 + rnd() * 110;
    sp.scale.set(w, w * 0.5, 1);
    sp.position.set(Math.cos(a) * d, -6 + rnd() * 30, Math.sin(a) * d);
    high.add(sp);
    banks.push({ sp, a, d, base: sp.position.y, ph: rnd() * 6 });
  }
  // Islas que flotan lejos, con árboles y una cascada de luz.
  const islands = [];
  const rockMat = new THREE.MeshLambertMaterial({ color: '#b9a6c9', emissive: '#4a3a5a', emissiveIntensity: 0.5, flatShading: true, fog: false });
  const grassMat = new THREE.MeshLambertMaterial({ color: '#9fe0a2', emissive: '#3d7a52', emissiveIntensity: 0.45, flatShading: true, fog: false });
  const treeMat = new THREE.MeshLambertMaterial({ color: '#f7c6dc', emissive: '#a05a80', emissiveIntensity: 0.45, flatShading: true, fog: false });
  const trunkMat = new THREE.MeshLambertMaterial({ color: '#8a6a5a', emissive: '#3a2a2a', emissiveIntensity: 0.4, fog: false });
  const stoneMat = new THREE.MeshLambertMaterial({ color: '#fff4e4', emissive: '#8a7a6a', emissiveIntensity: 0.5, fog: false });
  const goldMat = new THREE.MeshLambertMaterial({ color: '#ffe7a8', emissive: '#a07a30', emissiveIntensity: 0.5, flatShading: true, fog: false });
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const s = 9 + rnd() * 12;
    // Roca de abajo: varias puntas colgando, como una estalactita grande.
    const rock = new THREE.Mesh(new THREE.ConeGeometry(s, s * 1.6, 8, 3), rockMat);
    rock.rotation.x = Math.PI;
    rock.position.y = -s * 0.8;
    g.add(rock);
    for (let k = 0; k < 4; k++) {
      const sub = new THREE.Mesh(new THREE.ConeGeometry(s * (0.3 + rnd() * 0.25), s * (0.7 + rnd() * 0.7), 6), rockMat);
      sub.rotation.x = Math.PI;
      const ang = rnd() * 6.28;
      sub.position.set(Math.cos(ang) * s * 0.55, -s * (0.35 + rnd() * 0.3), Math.sin(ang) * s * 0.55);
      g.add(sub);
    }
    // Arriba: una lomita de pasto.
    g.add(new THREE.Mesh(new THREE.SphereGeometry(s * 1.02, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.28, 1), grassMat));
    // Arbolitos con tronco y copa (rosa, blanco y dorado).
    const crowns = [treeMat, stoneMat, goldMat];
    for (let k = 0; k < 5; k++) {
      const ang = rnd() * 6.28;
      const rr = s * 0.6 * Math.sqrt(rnd());
      const th = s * (0.25 + rnd() * 0.2);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.025, s * 0.04, th, 5), trunkMat);
      trunk.position.set(Math.cos(ang) * rr, s * 0.2 + th / 2, Math.sin(ang) * rr);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(s * (0.14 + rnd() * 0.1), 0), crowns[k % 3]);
      crown.position.set(trunk.position.x, s * 0.2 + th + s * 0.08, trunk.position.z);
      g.add(trunk, crown);
    }
    // Un arquito de piedra blanca, como una puerta, en algunas.
    if (i % 2 === 0) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(s * 0.22, s * 0.04, 6, 14, Math.PI), stoneMat);
      arch.position.set(-s * 0.25, s * 0.22, s * 0.1);
      g.add(arch);
    } else {
      // Una casita blanca con techo rosa y la ventana encendida.
      const house = new THREE.Group();
      const walls = new THREE.Mesh(new THREE.BoxGeometry(s * 0.3, s * 0.24, s * 0.26), stoneMat);
      walls.position.y = s * 0.12;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(s * 0.25, s * 0.18, 4).rotateY(Math.PI / 4), new THREE.MeshLambertMaterial({ color: '#e0457b', emissive: '#6a1a3a', emissiveIntensity: 0.5, fog: false }));
      roof.position.y = s * 0.33;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.07, s * 0.07), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.8), fog: false }));
      win.position.set(0, s * 0.13, s * 0.131);
      house.add(walls, roof, win);
      house.position.set(s * 0.2, s * 0.18, -s * 0.15);
      g.add(house);
    }
    // Un farolito colgando del borde de la isla.
    const lan = paperLantern({ scale: s * 0.09, tint: [[2.2, 0.9, 1.3], [2.2, 1.3, 0.5], [0.8, 1.8, 1.6]][i % 3], glow: 1.4 });
    lan.position.set(-s * 0.85, -s * 0.15, s * 0.2);
    g.add(lan);
    g.userData.lantern = lan;
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.25, s * 2.4), new THREE.MeshBasicMaterial({ map: glow, color: new THREE.Color(1.2, 1.4, 1.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0.6 }));
    fall.position.set(s * 0.9, -s * 1.1, 0);
    g.add(fall);
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const d = 120 + rnd() * 100;
    g.position.set(Math.cos(a) * d, 25 + rnd() * 45, Math.sin(a) * d);
    g.lookAt(0, g.position.y, 0);
    high.add(g);
    islands.push({ g, base: g.position.y, ph: rnd() * 6 });
  }
  // Pájaros de luz: bandadas que planean en círculos.
  const birds = [];
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.35, 0, 0, -0.25, -1.2, 0.05, 0.05, 0, 0, 0.35, 1.2, 0.05, 0.05, 0, 0, -0.25], 3));
  wing.computeVertexNormals();
  const birdMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.25), side: THREE.DoubleSide, transparent: true, opacity: 0, fog: false });
  for (let f = 0; f < 3; f++) {
    const flock = new THREE.Group();
    const R = 60 + f * 30;
    const y = 30 + f * 9;
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(wing, birdMat);
      const row = Math.ceil(i / 2);
      b.position.set((i % 2 ? 1 : -1) * row * 4.5, rnd() * 1.2, -row * 4);
      b.scale.setScalar(2.6);
      flock.add(b);
      birds.push({ b, ph: rnd() * 6 });
    }
    high.add(flock);
    birds.push({ flock, R, y, sp: 0.04 + f * 0.012, a0: f * 2.1 });
  }

  let k = 0;
  return {
    setK(v) {
      k = v;
      const night = 1 - smooth(v / 0.4);
      const day = smooth((v - 0.35) / 0.5);
      for (const o of comets) {
        // De noche brillan; de día quedan como un trazo pálido.
        const a = 0.35 + night * 0.65;
        o.tail.material.uniforms.uA.value = a;
        o.dust.material.uniforms.uA.value = a * 0.45;
        o.head.material.opacity = a;
        o.core.material.opacity = a;
      }
      high.visible = day > 0.01;
      for (const b of banks) b.sp.material.opacity = day * 0.95;
      birdMat.opacity = day;
    },
    update(dt, t) {
      for (const o of comets) o.pivot.rotation.y = t * o.c.speed;
      // Estrellas fugaces, sólo de noche (o al amanecer).
      if (k < 0.5) {
        nextShoot -= dt;
        if (nextShoot < 0) {
          const s = shoots.find((x) => !x.m.visible);
          if (s) launch(s);
          nextShoot = 4 + rnd() * 9;
        }
      }
      for (const s of shoots) {
        if (!s.m.visible) continue;
        s.life += dt;
        const p = s.life / s.dur;
        if (p >= 1) { s.m.visible = false; continue; }
        s.m.position.copy(s.from).addScaledVector(s.dir, p * 70);
        X.copy(s.dir);
        Z.copy(s.m.position).normalize().negate();
        Y.crossVectors(Z, X).normalize();
        X.crossVectors(Y, Z).normalize();
        M.makeBasis(X, Y, Z);
        s.m.quaternion.setFromRotationMatrix(M);
        s.m.material.uniforms.uA.value = Math.sin(Math.PI * p) * (1 - k * 1.6);
      }
      if (!high.visible) return;
      for (const b of banks) b.sp.position.y = b.base + Math.sin(t * 0.05 + b.ph) * 2;
      for (const o of islands) {
        o.g.position.y = o.base + Math.sin(t * 0.25 + o.ph) * 1.6;
        o.g.rotation.y += dt * 0.01;
        if (o.g.userData.lantern) flickerLantern(o.g.userData.lantern, t);
      }
      for (const b of birds) {
        if (b.flock) {
          const a = b.a0 + t * b.sp;
          b.flock.position.set(Math.cos(a) * b.R, b.y + Math.sin(t * 0.3 + b.a0) * 3, Math.sin(a) * b.R);
          b.flock.rotation.y = -a;
        } else {
          b.b.scale.y = 2.6 * (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + b.ph)));
          b.b.rotation.z = Math.sin(t * 6 + b.ph) * 0.35;
        }
      }
    },
  };
}
