// El río y el Puente del Arcoíris: la entrada al jardín. Llegás del lado de afuera (tierra, pasto
// apagado), cruzás el puente bajo un arcoíris y entrás por un arco de cempasúchil al jardín de colores.
// El río es natural: orillas de barro húmedo, piedras, juncos, nenúfares, agua que corre con reflejos
// del cielo, pétalos y velitas que flotan, y bruma.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CREEK_HALF, BRIDGE, creekZ, uTime } from './world.js';
import { glowTexture, labelTexture, woodTexture, twoSided } from './textures.js';
import { paintedWallTexture, talaveraTexture, marigoldCluster, picadoBanner, PALETTE } from './muertos.js';

export function buildRiver({ ground, animated, colliders, r, density = 1 }) {
  // ---------- el cauce ----------
  const pts = [];
  for (let x = -72; x <= 72; x += 2) pts.push(new THREE.Vector3(x, 0.03, creekZ(x)));
  const curve = new THREE.CatmullRomCurve3(pts);
  const segs = 260;
  const widthAt = (t) => CREEK_HALF + Math.sin(t * 17) * 0.35 + Math.sin(t * 41 + 1.3) * 0.18;

  // Una cinta a lo largo del río (para el agua y para las orillas).
  function ribbon(halfAt, y, cols = null) {
    const pos = [];
    const uvs = [];
    const col = [];
    const idx = [];
    const across = cols ? cols.length : 2;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      for (let k = 0; k < across; k++) {
        const v = k / (across - 1);
        const w = halfAt(t, v);
        pos.push(p.x + n.x * w, y, p.z + n.z * w);
        uvs.push(t * 140, v);
        if (cols) cols[k].toArray(col, col.length);
      }
      if (i < segs) {
        for (let k = 0; k < across - 1; k++) {
          const a = i * across + k;
          const b = a + across;
          idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (cols) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // Que las caras miren hacia arriba.
    if (geo.attributes.normal.getY(0) < 0) {
      const ix = geo.index.array;
      for (let i = 0; i < ix.length; i += 3) { const tmp = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = tmp; }
      geo.computeVertexNormals();
    }
    return geo;
  }

  // Orillas: pasto -> tierra húmeda -> barro oscuro, del lado de afuera y del de adentro.
  {
    const grass = new THREE.Color('#2c3d24');
    const soil = new THREE.Color('#4a3a2c');
    const wet = new THREE.Color('#2a211b');
    const cols = [grass, soil, wet, wet, soil, grass];
    const off = [-2.2, -1.05, -0.45, 0.45, 1.05, 2.2];
    const banks = new THREE.Mesh(
      ribbon((t, v) => {
        const k = Math.round(v * 5);
        const base = widthAt(t);
        return Math.sign(off[k]) * (base + Math.abs(off[k]) - 0.45 + (k === 0 || k === 5 ? Math.sin(t * 90) * 0.3 : 0));
      }, 0.018, cols),
      new THREE.MeshLambertMaterial({ vertexColors: true }),
    );
    banks.renderOrder = 0;
    ground.add(banks);
  }

  // ---------- el agua ----------
  // Agua de noche: oscura, que refleja el cielo del atardecer, la luna y los faroles del puente,
  // con olitas que corren río abajo (las normales salen del ruido y mueven los reflejos).
  const lamps = [];
  for (const s of [-1, 1]) for (const e of [-1, 1]) lamps.push(new THREE.Vector3(BRIDGE.x + s * BRIDGE.halfW, 0.98, BRIDGE.z + e * BRIDGE.halfL));
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uLamps: { value: lamps } }]);
  uniforms.uTime = uTime;
  const water = new THREE.Mesh(
    ribbon((t, v) => (v - 0.5) * 2 * widthAt(t), 0.045),
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      fog: true,
      vertexShader: `#include <fog_pars_vertex>
        varying vec2 vUv; varying vec3 vW;
        void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
          vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uTime; uniform vec3 uLamps[4]; varying vec2 vUv; varying vec3 vW;
        #include <fog_pars_fragment>
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * n2(p); p = p * 2.07 + 3.1; a *= 0.5; } return v; }
        // El cielo que se refleja: violeta oscuro arriba, rosado y naranja contra el horizonte.
        vec3 skyAt(vec3 d){
          float y = clamp(d.y, 0.0, 1.0);
          vec3 c = mix(vec3(0.22, 0.06, 0.16), vec3(0.06, 0.025, 0.11), smoothstep(0.0, 0.2, y));
          return mix(c, vec3(0.008, 0.01, 0.03), smoothstep(0.2, 0.75, y));
        }
        void main(){
          float across = vUv.y;                 // 0..1 de orilla a orilla
          float mid = 1.0 - abs(across - 0.5) * 2.0;
          float depth = smoothstep(0.0, 0.8, mid);
          // La corriente: más rápida en el medio que contra las orillas.
          float speed = 0.2 + depth * 0.38;
          vec2 q = vec2(vUv.x * 1.5 - uTime * speed, across * 6.5);
          float e = 0.06;
          float f0 = fbm(q), fx = fbm(q + vec2(e, 0.0)), fy = fbm(q + vec2(0.0, e));
          vec2 q2 = vec2(vUv.x * 5.0 - uTime * speed * 1.7, across * 18.0 + sin(vUv.x * 2.0 + uTime) * 0.4);
          float g0 = n2(q2), gx = n2(q2 + vec2(e, 0.0)), gy = n2(q2 + vec2(0.0, e));
          vec2 grad = vec2(fx - f0, fy - f0) / e * 0.09 + vec2(gx - g0, gy - g0) / e * 0.035;
          vec3 N = normalize(vec3(-grad.x, 1.0, -grad.y));
          vec3 V = normalize(cameraPosition - vW);
          vec3 R = reflect(-V, N);
          float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 refl = skyAt(R);
          // La luna (lejos, detrás del salón) deja un camino de luz que tiembla.
          float km = max(dot(R, normalize(vec3(-150.0, 150.0, -300.0) - vW)), 0.0);
          refl += vec3(0.85, 0.88, 1.0) * (pow(km, 700.0) * 5.0 + pow(km, 50.0) * 0.12);
          // Los faroles del puente: estelas cálidas sobre el agua.
          for (int i = 0; i < 4; i++) {
            float k = max(dot(R, normalize(uLamps[i] - vW)), 0.0);
            refl += vec3(1.0, 0.55, 0.18) * (pow(k, 300.0) * 3.5 + pow(k, 30.0) * 0.1);
          }
          // Lo que se ve a través del agua: barro cerca de la orilla, azul muy oscuro en el medio.
          vec3 body = mix(vec3(0.035, 0.032, 0.022), vec3(0.01, 0.03, 0.035), smoothstep(0.0, 0.3, mid));
          body = mix(body, vec3(0.003, 0.012, 0.028), depth);
          body *= 0.75 + f0 * 0.5;
          vec3 c = mix(body, refl, clamp(fres, 0.0, 1.0));
          // Destellos sueltos que viajan con el agua.
          vec2 g = vec2(vUv.x * 1.4 - uTime * 0.45, across * 9.0);
          float sp = h(floor(g));
          float tw = smoothstep(0.94, 1.0, sp) * (0.5 + 0.5 * sin(uTime * 3.0 + sp * 40.0));
          c += vec3(0.9, 0.85, 0.75) * tw * smoothstep(0.2, 0.0, length(fract(g) - 0.5)) * depth;
          // Espumita contra las orillas, cortada por la corriente.
          float band = (1.0 - smoothstep(0.0, 0.06, across)) + smoothstep(0.94, 1.0, across);
          float foam = band * smoothstep(0.5, 0.75, fbm(vec2(vUv.x * 3.0 - uTime * 0.5, across * 10.0)));
          c = mix(c, vec3(0.14, 0.15, 0.18), foam * 0.55);
          gl_FragColor = vec4(c, mix(0.8, 0.97, smoothstep(0.0, 0.12, mid)));
          #include <fog_fragment>
        }`,
    }),
  );
  water.renderOrder = 1;
  ground.add(water);

  const along = (t, side) => {
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    return new THREE.Vector3(p.x - tan.z * side, 0, p.z + tan.x * side);
  };
  const nearBridge = (x, z, pad = 0) => Math.abs(x - BRIDGE.x) < BRIDGE.halfW + 0.6 + pad && Math.abs(z - BRIDGE.z) < BRIDGE.halfL + pad;

  // ---------- piedras en la orilla y algunas en el agua ----------
  {
    const stones = [];
    const pal = ['#7d7682', '#8c8478', '#5f5a63', '#9a9184'].map((c) => new THREE.Color(c));
    for (let i = 0; i < 300 * density; i++) {
      const t = r();
      const sd = (r() < 0.5 ? -1 : 1) * (widthAt(t) + (r() < 0.25 ? -0.4 - r() * 0.6 : 0.1 + r() * 0.9));
      const p = along(t, sd);
      if (nearBridge(p.x, p.z)) continue;
      const wet = Math.abs(sd) < widthAt(t);
      const big = r() < 0.12;
      const sg = new THREE.DodecahedronGeometry((big ? 0.32 : 0.1) + r() * (big ? 0.3 : 0.16), big ? 1 : 0).toNonIndexed();
      sg.deleteAttribute('uv');
      sg.scale(1 + r() * 0.5, wet ? 0.7 + r() * 0.3 : 0.45 + r() * 0.3, 1 + r() * 0.4);
      sg.rotateY(r() * 6);
      sg.translate(p.x, wet ? -0.02 : 0.04, p.z);
      const c = pal[i % pal.length].clone().multiplyScalar((wet ? 0.45 : 0.85) + r() * 0.3);
      const arr = new Float32Array(sg.attributes.position.count * 3);
      for (let v = 0; v < sg.attributes.position.count; v++) {
        // Musgo arriba de las piedras grandes.
        const top = sg.attributes.position.getY(v) > 0.18 && big;
        (top ? new THREE.Color('#4f6a3a') : c).toArray(arr, v * 3);
      }
      sg.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      stones.push(sg);
    }
    ground.add(new THREE.Mesh(mergeGeometries(stones), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  }

  // ---------- juncos y totoras que se mecen ----------
  {
    const blades = [];
    for (let i = 0; i < 520 * density; i++) {
      const t = r();
      const sd = (r() < 0.5 ? -1 : 1) * (widthAt(t) + 0.05 + r() * 0.8);
      const p = along(t, sd);
      if (nearBridge(p.x, p.z, 0.6)) continue;
      const h = 0.5 + r() * 1.1;
      const b = new THREE.ConeGeometry(0.022, h, 3);
      b.translate(0, h / 2, 0);
      b.rotateZ((r() - 0.5) * 0.4);
      b.rotateX((r() - 0.5) * 0.4);
      b.translate(p.x, 0, p.z);
      blades.push(b.toNonIndexed());
      if (r() < 0.22) {
        const tip = new THREE.CylinderGeometry(0.032, 0.032, 0.18, 6);
        tip.translate(p.x, h * 0.9, p.z);
        blades.push(tip.toNonIndexed());
      }
    }
    const reeds = new THREE.Mesh(mergeGeometries(blades), new THREE.MeshLambertMaterial({ color: '#46613a', emissive: '#14200e' }));
    reeds.material.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = `uniform float uTime;\n${sh.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.x += sin(uTime * 1.3 + position.z * 0.7 + position.x * 0.3) * 0.06 * max(0.0, position.y);`);
    };
    reeds.material.customProgramCacheKey = () => 'juncos-2';
    ground.add(reeds);
  }

  // ---------- nenúfares con flores ----------
  {
    const N = Math.round(90 * density);
    const pad = new THREE.CircleGeometry(0.28, 14, 0.4, Math.PI * 2 - 0.4).rotateX(-Math.PI / 2);
    const pads = new THREE.InstancedMesh(pad, new THREE.MeshLambertMaterial({ color: '#3f6b35', emissive: '#0f2410', side: THREE.DoubleSide }), N);
    const flowerGeo = new THREE.ConeGeometry(0.07, 0.09, 6, 1, true).rotateX(Math.PI);
    const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshLambertMaterial({ color: '#f2a6c4', emissive: '#5a2034', side: THREE.DoubleSide }), N);
    const data = [];
    const m = new THREE.Object3D();
    let nf = 0;
    for (let i = 0; i < N; i++) {
      const t = r();
      const sd = (r() < 0.5 ? -1 : 1) * (widthAt(t) - 0.35 - r() * 0.7);
      const p = along(t, sd);
      if (nearBridge(p.x, p.z, 1)) { data.push(null); continue; }
      const s = 0.7 + r() * 0.8;
      data.push({ p, s, rot: r() * 6, ph: r() * 6, flower: r() < 0.35 });
    }
    flowers.count = 0;
    animated.push((time) => {
      nf = 0;
      data.forEach((d, i) => {
        if (!d) { m.scale.setScalar(0); m.updateMatrix(); pads.setMatrixAt(i, m.matrix); return; }
        m.position.set(d.p.x, 0.05 + Math.sin(time * 1.2 + d.ph) * 0.008, d.p.z);
        m.rotation.set(0, d.rot + Math.sin(time * 0.3 + d.ph) * 0.15, 0);
        m.scale.setScalar(d.s);
        m.updateMatrix();
        pads.setMatrixAt(i, m.matrix);
        if (d.flower) {
          m.position.y += 0.06;
          m.updateMatrix();
          flowers.setMatrixAt(nf++, m.matrix);
        }
      });
      flowers.count = nf;
      pads.instanceMatrix.needsUpdate = true;
      flowers.instanceMatrix.needsUpdate = true;
    });
    ground.add(pads, flowers);
  }

  // ---------- pétalos de cempasúchil que lleva la corriente ----------
  {
    const N = Math.round(380 * density);
    const petal = new THREE.CircleGeometry(0.055, 5).rotateX(-Math.PI / 2);
    const mesh = new THREE.InstancedMesh(petal, new THREE.MeshLambertMaterial({ emissive: '#8a3400', emissiveIntensity: 0.6, side: THREE.DoubleSide }), N);
    const cols = [PALETTE.cempasuchil, PALETTE.naranja, PALETTE.amarillo, '#e04b8a'].map((c) => new THREE.Color(c));
    const data = [];
    for (let i = 0; i < N; i++) {
      data.push({ t: r(), v: (r() - 0.5) * 1.6, sp: 0.0016 + r() * 0.0022, rot: r() * 6, s: 0.6 + r() * 0.9 });
      mesh.setColorAt(i, cols[i % cols.length]);
    }
    mesh.frustumCulled = false;
    ground.add(mesh);
    const m = new THREE.Object3D();
    animated.push((t, dt) => {
      for (let i = 0; i < N; i++) {
        const o = data[i];
        o.t = (o.t + (dt || 0.016) * o.sp * (1.3 - Math.abs(o.v) * 0.5)) % 1;
        const p = along(o.t, o.v * widthAt(o.t) * 0.85);
        m.position.set(p.x, 0.055 + Math.sin(t * 2 + i) * 0.006, p.z);
        m.rotation.set(0, o.rot + t * 0.25 * (i % 2 ? 1 : -1), 0);
        m.scale.setScalar(o.s);
        m.updateMatrix();
        mesh.setMatrixAt(i, m.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  // ---------- velitas que flotan río abajo ----------
  {
    const N = 22;
    const cupGeo = new THREE.CylinderGeometry(0.11, 0.08, 0.07, 12);
    const cupMat = new THREE.MeshLambertMaterial({ color: '#f2b84b', emissive: '#7a3d00', emissiveIntensity: 0.6 });
    const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.7, 0.7) });
    const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(1.0, 0.7, 0.35), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5 });
    const boats = [];
    for (let i = 0; i < N; i++) {
      const b = new THREE.Group();
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6).scale(1, 1.8, 1), flameMat);
      flame.position.y = 0.1;
      const glow = new THREE.Sprite(glowMat);
      glow.scale.setScalar(0.9);
      glow.position.y = 0.12;
      b.add(marigoldCluster([[0, 0.02, 0, 0.6]], { r: 0.09, rnd: r }), new THREE.Mesh(cupGeo, cupMat), flame, glow);
      ground.add(b);
      boats.push({ b, t: r(), v: (r() - 0.5) * 1.2, sp: 0.0014 + r() * 0.0016, bob: r() * 6 });
    }
    animated.push((t, dt) => {
      for (const o of boats) {
        o.t = (o.t + (dt || 0.016) * o.sp) % 1;
        const p = along(o.t, o.v * widthAt(o.t) * 0.8);
        o.b.position.set(p.x, 0.06 + Math.sin(t * 1.6 + o.bob) * 0.015, p.z);
        o.b.rotation.y = t * 0.2 + o.bob;
      }
    });
  }

  // ---------- bruma baja ----------
  {
    const mist = new THREE.Group();
    const mat = new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(0.42, 0.38, 0.62), transparent: true, depthWrite: false, opacity: 0.06 });
    for (let i = 0; i < 34; i++) {
      const p = curve.getPoint((i + r() * 0.5) / 34);
      const sp = new THREE.Sprite(mat);
      sp.position.set(p.x, 0.4 + r() * 0.3, p.z + (r() - 0.5) * 2);
      sp.scale.set(8 + r() * 6, 1.4 + r(), 1);
      mist.add(sp);
    }
    ground.add(mist);
    animated.push((t) => { mist.position.x = Math.sin(t * 0.07) * 1.5; });
  }

  // ---------- el Puente del Arcoíris ----------
  const wood = new THREE.MeshLambertMaterial({ map: woodTexture('#7a5236') });
  const { halfW: BW, halfL, arch: ARCH } = BRIDGE;
  const L = halfL * 2;
  {
    const bridge = new THREE.Group();
    bridge.position.set(BRIDGE.x, 0, BRIDGE.z);
    const parts = [];
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const z = (t - 0.5) * L;
      const y = Math.sin(t * Math.PI) * ARCH + 0.1;
      const pg = new THREE.BoxGeometry(BW * 2 + 0.06, 0.07, L / n + 0.02);
      pg.rotateX(-Math.cos(t * Math.PI) * Math.atan(ARCH * Math.PI / L));
      pg.translate(0, y, z);
      parts.push(pg);
    }
    // Vigas debajo y postes.
    for (const s of [-1, 1]) {
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const beam = new THREE.BoxGeometry(0.12, 0.16, L / n + 0.05);
        beam.rotateX(-Math.cos(t * Math.PI) * Math.atan(ARCH * Math.PI / L));
        beam.translate(s * (BW - 0.08), Math.sin(t * Math.PI) * ARCH - 0.02, (t - 0.5) * L);
        parts.push(beam);
      }
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const post = new THREE.BoxGeometry(0.08, 0.75, 0.08);
        post.translate(s * BW, Math.sin(t * Math.PI) * ARCH + 0.48, (t - 0.5) * L);
        parts.push(post);
      }
      const railPts = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        railPts.push(new THREE.Vector3(s * BW, Math.sin(t * Math.PI) * ARCH + 0.86, (t - 0.5) * L));
      }
      bridge.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 30, 0.045, 6, false), wood));
    }
    bridge.add(new THREE.Mesh(mergeGeometries(parts.map((g) => g.toNonIndexed())), wood));
    // Bases de piedra en las dos puntas.
    const stoneMat = new THREE.MeshLambertMaterial({ color: '#8a8290', flatShading: true });
    for (const e of [-1, 1]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(BW * 2 + 0.6, 0.35, 0.8), stoneMat);
      base.position.set(0, 0.12, e * (halfL - 0.25));
      bridge.add(base);
    }
    // Faroles en las cuatro puntas.
    for (const s of [-1, 1]) for (const e of [-1, 1]) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.8, 1.0) }));
      bulb.position.set(s * BW, 0.98, e * halfL);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 }));
      gl.scale.setScalar(1.2);
      gl.position.copy(bulb.position);
      bridge.add(bulb, gl);
    }
    // Cempasúchil a lo largo de las barandas.
    const fl = [];
    for (const s of [-1, 1]) for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      fl.push([s * BW, Math.sin(t * Math.PI) * ARCH + 0.9 + (r() - 0.5) * 0.06, (t - 0.5) * L, 0.8 + r() * 0.5]);
    }
    bridge.add(marigoldCluster(fl, { r: 0.075, rnd: r }));
    ground.add(bridge);
    // Choques: las barandas (para no caerse al río).
    for (const s of [-1, 1]) for (let i = 0; i <= 8; i++) colliders.circles.push({ x: BRIDGE.x + s * (BW + 0.12), z: BRIDGE.z + (i / 8 - 0.5) * L, r: 0.1, ground: true });
  }

  // ---------- el arcoíris sobre el puente ----------
  // Una cinta plana con los colores fundidos y un destello que la recorre. Como un arcoíris de
  // verdad, sólo se ve de frente: de canto se apaga (si no, desde la orilla quedaba una franja
  // de luz vertical en el cielo). Las puntas se pierden en la bruma del agua.
  {
    const R0 = 5.6;
    const R1 = 7.9;
    const rainbow = new THREE.Mesh(
      new THREE.RingGeometry(R0, R1, 120, 1, 0, Math.PI),
      new THREE.ShaderMaterial({
        uniforms: { uTime },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        vertexShader: 'varying vec2 vP; varying vec3 vW; varying vec3 vN; void main(){ vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0)); gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: `uniform float uTime; varying vec2 vP; varying vec3 vW; varying vec3 vN;
          vec3 band(float k){
            vec3 c = mix(vec3(0.55, 0.32, 1.0), vec3(0.28, 0.55, 1.0), smoothstep(0.0, 0.2, k));
            c = mix(c, vec3(0.4, 0.9, 0.5), smoothstep(0.2, 0.4, k));
            c = mix(c, vec3(1.0, 0.92, 0.38), smoothstep(0.4, 0.6, k));
            c = mix(c, vec3(1.0, 0.58, 0.26), smoothstep(0.6, 0.8, k));
            return mix(c, vec3(1.0, 0.36, 0.42), smoothstep(0.8, 1.0, k));
          }
          void main(){
            float r = length(vP);
            float k = (r - ${R0.toFixed(2)}) / ${(R1 - R0).toFixed(2)};
            float edge = smoothstep(0.0, 0.14, k) * smoothstep(1.0, 0.86, k);
            vec3 V = normalize(cameraPosition - vW);
            float face = smoothstep(0.25, 0.7, abs(dot(V, vN)));
            float foot = smoothstep(-0.3, 1.8, vW.y);
            // Un destello que baja por el arco, de un lado al otro.
            float th = atan(vP.y, vP.x);
            float ts = 3.14159 * (1.0 - fract(uTime * 0.07));
            float spark = exp(-pow((th - ts) * r * 1.6, 2.0)) * exp(-pow((k - 0.5) * 3.0, 2.0));
            float a = edge * (0.22 + 0.05 * sin(uTime * 0.6 + k * 3.0)) + spark * 0.9;
            gl_FragColor = vec4(band(k) + spark * vec3(0.6), a * face * foot);
          }`,
      }),
    );
    rainbow.position.set(BRIDGE.x, -0.6, BRIDGE.z);
    rainbow.renderOrder = 2;
    ground.add(rainbow);
  }

  // Cartel del puente (del lado de afuera).
  {
    const sign = twoSided(new THREE.PlaneGeometry(2.2, 0.46), new THREE.MeshBasicMaterial({
      map: labelTexture('Puente del Arcoíris 🌈', { w: 720, h: 150, font: '700 72px Caveat, cursive', bg: 'rgba(74,48,34,0.95)', fg: '#f6e3c4' }),
    }));
    const sx = BRIDGE.x + BW + 1.3;
    const sz = BRIDGE.z + halfL + 0.9;
    sign.position.set(sx, 1.25, sz);
    sign.rotation.y = -0.35;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.2, 0.07), wood);
    post.position.set(sx, 0.6, sz);
    ground.add(sign, post);
    colliders.circles.push({ x: sx, z: sz, r: 0.2, ground: true });
  }

  // ---------- el arco de entrada al jardín (del otro lado del puente) ----------
  {
    const gate = new THREE.Group();
    const gz = BRIDGE.z - halfL - 1.4;
    gate.position.set(BRIDGE.x, 0, gz);
    const pillarMat = new THREE.MeshLambertMaterial({ map: paintedWallTexture('#c2186b') });
    const tile = talaveraTexture().clone();
    tile.repeat.set(1, 4);
    tile.needsUpdate = true;
    const tileMat = new THREE.MeshLambertMaterial({ map: tile });
    const PX = 2.5;
    const PH = 3.6;
    for (const s of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, PH, 0.6), pillarMat);
      pillar.position.set(s * PX, PH / 2, 0);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.9, 0.62), tileMat);
      band.position.set(s * PX, 0.6, 0);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.55, 4).rotateY(Math.PI / 4), new THREE.MeshLambertMaterial({ color: '#b5482a' }));
      cap.position.set(s * PX, PH + 0.27, 0);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.9, 0.8) }));
      lamp.position.set(s * PX, PH - 0.5, 0.42);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 }));
      gl.scale.setScalar(1.3);
      gl.position.copy(lamp.position);
      gate.add(pillar, band, cap, lamp, gl);
      colliders.circles.push({ x: BRIDGE.x + s * PX, z: gz, r: 0.45, ground: true });
    }
    // Arco de cempasúchil bien tupido.
    const fl = [];
    for (let i = 0; i <= 90; i++) {
      const t = i / 90;
      const a = Math.PI * t;
      for (let k = 0; k < 2; k++) fl.push([-Math.cos(a) * PX + (r() - 0.5) * 0.25, PH + Math.sin(a) * 1.5 + (r() - 0.5) * 0.25, (r() - 0.5) * 0.3, 1 + r() * 0.5]);
    }
    for (const s of [-1, 1]) for (let i = 0; i < 26; i++) fl.push([s * PX + (r() - 0.5) * 0.5, PH * r(), 0.36, 0.8 + r() * 0.4]);
    gate.add(marigoldCluster(fl, { r: 0.1, rnd: r }));
    // Cartel colgado.
    const signOpts = { w: 980, h: 180, font: '400 74px "Young Serif", Georgia, serif', bg: 'rgba(74,48,34,0.96)', fg: '#f6e3c4' };
    const signGeo = new THREE.PlaneGeometry(3.4, 0.62);
    const front = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ map: labelTexture('Bienvenidos al jardín 🌼', signOpts) }));
    front.position.set(0, PH + 0.1, 0.12);
    const back = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ map: labelTexture('Volvé cuando quieras 🌈', signOpts) }));
    back.position.set(0, PH + 0.1, 0.08);
    back.rotation.y = Math.PI;
    gate.add(front, back);
    // Papel picado entre los pilares.
    const pp = picadoBanner(new THREE.Vector3(-PX, PH - 0.4, 0.2), new THREE.Vector3(PX, PH - 0.4, 0.2), { sag: 0.5, flags: 12, size: 0.36, seed: 31 });
    gate.add(pp);
    animated.push((t) => pp.userData.flutter(t));
    // Veladoras en la base.
    const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.7, 0.7) });
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const x = s * (PX - 0.7 - i * 0.22);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.16, 10), new THREE.MeshLambertMaterial({ color: ['#d6246e', '#f7951f', '#7b2cbf', '#14b3b0'][i], emissive: '#3a1020', transparent: true, opacity: 0.85 }));
      cup.position.set(x, 0.08, 0.55);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6).scale(1, 1.8, 1), flameMat);
      f.position.set(x, 0.2, 0.55);
      gate.add(cup, f);
    }
    ground.add(gate);
  }

  return { curve, widthAt };
}
