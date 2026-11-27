// El libro del último piso: en el piso 99, frente a la fuente, un atril de madera tallada con un libro
// enorme abierto ("La sexta etapa"). Tocándolo se lee página por página (el lector está en main.js).
// Todo es geometría y canvas propios.
import * as THREE from 'three';
import { glowTexture, flameTexture, woodTexture } from './textures.js';

const TOP_FLOOR = 98; // el piso 99 (los pisos se cuentan desde 0)

// Una página del libro abierto, pintada en canvas (papel viejo, guarda dorada y letra de imprenta antigua).
function pageCanvas(side) {
  const W = 1024;
  const H = 1412;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  // Papel: crema con manchitas y bordes tostados.
  const bg = g.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, W);
  bg.addColorStop(0, '#fbf1dc');
  bg.addColorStop(0.7, '#f1dfbd');
  bg.addColorStop(1, '#d9b98a');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  let seed = side === 'L' ? 3 : 9;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(120,80,40,${0.02 + rnd() * 0.05})`;
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2.5, 1 + rnd() * 2.5);
  }
  // Sombra del lomo (del lado de adentro).
  const spine = side === 'L' ? g.createLinearGradient(W, 0, W - 160, 0) : g.createLinearGradient(0, 0, 160, 0);
  spine.addColorStop(0, 'rgba(90,50,20,.38)');
  spine.addColorStop(1, 'rgba(90,50,20,0)');
  g.fillStyle = spine;
  g.fillRect(0, 0, W, H);
  // Guarda doble dorada y bordó.
  g.strokeStyle = '#b8872f';
  g.lineWidth = 8;
  g.strokeRect(70, 70, W - 140, H - 140);
  g.strokeStyle = '#8e2234';
  g.lineWidth = 3;
  g.strokeRect(90, 90, W - 180, H - 180);
  // Esquinas: florcitas de cempasúchil.
  const marigold = (x, y, r) => {
    for (let k = 3; k >= 1; k--) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + k;
        g.fillStyle = ['#e2661b', '#f08a1c', '#f6b93a'][k - 1];
        g.beginPath();
        g.ellipse(x + Math.cos(a) * r * k * 0.3, y + Math.sin(a) * r * k * 0.3, r * 0.32, r * 0.18, a, 0, Math.PI * 2);
        g.fill();
      }
    }
  };
  for (const [x, y] of [[90, 90], [W - 90, 90], [90, H - 90], [W - 90, H - 90]]) marigold(x, y, 30);
  g.textAlign = 'center';
  if (side === 'L') {
    g.fillStyle = '#8e2234';
    g.font = '700 46px "Cormorant Garamond", Georgia, serif';
    g.fillText('✦  Día de Muertos  ✦', W / 2, 270);
    g.fillStyle = '#3b2418';
    g.font = 'italic 600 150px "Cormorant Garamond", Georgia, serif';
    g.fillText('La sexta', W / 2, 480);
    g.fillText('etapa', W / 2, 620);
    g.strokeStyle = '#b8872f';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(260, 690); g.lineTo(W - 260, 690);
    g.stroke();
    g.fillStyle = '#5a3a26';
    g.font = 'italic 500 58px "Cormorant Garamond", Georgia, serif';
    g.fillText('Crear significado', W / 2, 800);
    g.fillText('después de una pérdida', W / 2, 870);
    // Una velita y una calaverita dibujadas al pie.
    marigold(W / 2 - 170, 1080, 54);
    marigold(W / 2 + 170, 1080, 54);
    g.fillStyle = '#fff4df';
    g.fillRect(W / 2 - 26, 1010, 52, 150);
    const fl = g.createRadialGradient(W / 2, 975, 4, W / 2, 975, 70);
    fl.addColorStop(0, 'rgba(255,240,190,1)');
    fl.addColorStop(0.4, 'rgba(255,160,50,.9)');
    fl.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = fl;
    g.beginPath();
    g.ellipse(W / 2, 975, 36, 62, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#8a6a4c';
    g.font = '600 40px "Cormorant Garamond", Georgia, serif';
    g.fillText('— Jardín de las huellitas —', W / 2, 1270);
  } else {
    // Capitular grande y el comienzo del texto (el resto se lee al tocarlo).
    g.textAlign = 'left';
    g.fillStyle = '#8e2234';
    g.font = '400 230px "Young Serif", Georgia, serif';
    g.fillText('L', 150, 400);
    g.fillStyle = '#3b2418';
    g.font = '500 50px "Cormorant Garamond", Georgia, serif';
    const text = 'as cinco etapas del duelo describen cosas que nos pasan. Una sexta habla de lo que hacemos: crear significado con el amor que quedó. En México, la ofrenda lo hace desde hace siglos: se pone lo que le gustaba, se enciende una vela y se espera la visita.';
    const words = text.split(' ');
    let line = '';
    let y = 250;
    let x0 = 330;
    const maxW = () => W - 150 - x0;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (g.measureText(test).width > maxW() && line) {
        g.fillText(line, x0, y);
        line = w;
        y += 68;
        if (y > 430) x0 = 150;
      } else line = test;
    }
    if (line) g.fillText(line, x0, y);
    y += 120;
    g.textAlign = 'center';
    g.fillStyle = '#b8872f';
    g.font = '700 54px "Cormorant Garamond", Georgia, serif';
    g.fillText('❦', W / 2, y);
    g.fillStyle = '#5a3a26';
    g.font = 'italic 500 50px "Cormorant Garamond", Georgia, serif';
    g.fillText('Mientras los recordemos,', W / 2, y + 110);
    g.fillText('siguen con nosotros.', W / 2, y + 175);
    g.fillStyle = '#8e2234';
    g.font = '700 46px "Cormorant Garamond", Georgia, serif';
    g.fillText('Tocá el libro para leerlo  ›', W / 2, H - 170);
  }
  return c;
}

// Una página abierta: un plano curvado (sube desde el lomo y cae hacia el borde, como un libro de verdad).
function pageGeometry(w, h, side) {
  const geo = new THREE.PlaneGeometry(w, h, 24, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const t = (x + w / 2) / w; // 0..1 de izquierda a derecha
    const u = side === 'L' ? 1 - t : t; // 0 en el lomo, 1 en el borde
    pos.setZ(i, Math.sin(Math.min(1, u * 1.15) * Math.PI) * 0.055 + (1 - u) * 0.012 - u * u * 0.02);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createTome(scene, colliders, center) {
  const group = new THREE.Group();
  // Frente a la fuente, mirando a quien llega por el salón.
  group.position.set(center.x, 0, center.z + 3.4);
  group.scale.setScalar(1.4); // grandote, para que se vea desde lejos
  group.visible = false;
  scene.add(group);
  const col = { x: group.position.x, z: group.position.z, r: -100 };
  colliders.circles.push(col);

  const darkWood = woodTexture('#4a2c1c');
  const wood = new THREE.MeshLambertMaterial({ color: '#4a2a17', map: darkWood, emissive: '#1a0c05' });
  const gold = new THREE.MeshLambertMaterial({ color: '#e2b35a', emissive: '#5a3c10' });
  const leather = new THREE.MeshLambertMaterial({ color: '#6a1628', emissive: '#1e0509' });
  const paperEdge = new THREE.MeshLambertMaterial({ color: '#f2e2c0', emissive: '#3a2c18' });

  // ---------- el atril: base, columna torneada y el pupitre inclinado ----------
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.14, 24), wood);
  base.position.y = 0.07;
  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 0.12, 24), wood);
  base2.position.y = 0.2;
  const column = new THREE.Mesh(new THREE.LatheGeometry([
    [0.13, 0], [0.16, 0.05], [0.1, 0.18], [0.085, 0.4], [0.12, 0.47], [0.085, 0.54], [0.08, 0.72], [0.12, 0.8], [0.15, 0.86], [0.1, 0.9],
  ].map(([r, y]) => new THREE.Vector2(r, y)), 20), wood);
  column.position.y = 0.26;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 8, 24).rotateX(Math.PI / 2), gold);
  ring.position.y = 0.73;
  group.add(base, base2, column, ring);
  const desk = new THREE.Group();
  desk.position.set(0, 1.18, 0);
  desk.rotation.x = 0.42; // inclinado hacia quien lee (el borde de atrás más alto)
  group.add(desk);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.05, 0.98), wood);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.09, 0.05), wood);
  lip.position.set(0, 0.04, 0.5);
  desk.add(board, lip);
  for (const sx of [-1, 1]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), wood);
    brace.position.set(sx * 0.28, -0.18, 0);
    brace.rotation.z = sx * 0.35;
    desk.add(brace);
  }

  // ---------- el libro abierto ----------
  const book = new THREE.Group();
  book.position.y = 0.045;
  desk.add(book);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.03, 0.92), leather);
  book.add(cover);
  for (const [cx, cz] of [[-0.64, -0.43], [0.64, -0.43], [-0.64, 0.43], [0.64, 0.43]]) {
    const corner = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.034, 0.09), gold);
    corner.position.set(cx, 0.002, cz);
    book.add(corner);
  }
  // Los bloques de hojas (con el canto dorado) y las dos páginas curvadas encima.
  for (const sx of [-1, 1]) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.84), paperEdge);
    block.position.set(sx * 0.32, 0.045, 0);
    book.add(block);
    const gilt = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.058, 0.84), gold);
    gilt.position.set(sx * 0.632, 0.045, 0);
    book.add(gilt);
  }
  const pageMats = [];
  for (const side of ['L', 'R']) {
    const tex = new THREE.CanvasTexture(pageCanvas(side));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.02, 1.0, 0.96) });
    pageMats.push(mat);
    const page = new THREE.Mesh(pageGeometry(0.6, 0.82, side), mat);
    page.rotation.x = -Math.PI / 2;
    page.position.set(side === 'L' ? -0.31 : 0.31, 0.078, 0);
    book.add(page);
  }
  // Cinta marcapáginas que cae por delante.
  const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.42), new THREE.MeshLambertMaterial({ color: '#b3122e', emissive: '#3a0610', side: THREE.DoubleSide }));
  ribbon.position.set(0.04, -0.05, 0.62);
  ribbon.rotation.x = 0.2;
  book.add(ribbon);

  // ---------- luz: halo sobre el libro, dos velas y polvo dorado que sube ----------
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(1.5, 1.2, 0.7), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 }));
  halo.scale.set(2.6, 1.8, 1);
  halo.position.set(0, 1.45, 0.05);
  group.add(halo);
  const flames = [];
  for (const sx of [-1, 1]) {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.0, 12), gold);
    stand.position.set(sx * 0.95, 0.5, 0.1);
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.32, 12), new THREE.MeshLambertMaterial({ color: '#fff4e2', emissive: '#4a3018' }));
    wax.position.set(sx * 0.95, 1.16, 0.1);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), color: new THREE.Color(2.2, 1.6, 0.8), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    flame.scale.set(0.12, 0.22, 1);
    flame.position.set(sx * 0.95, 1.42, 0.1);
    const fglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(1.4, 0.9, 0.4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 }));
    fglow.scale.setScalar(0.7);
    fglow.position.copy(flame.position);
    group.add(stand, wax, flame, fglow);
    flames.push(flame);
  }
  const N = 70;
  const dustPos = new Float32Array(N * 3);
  const dustSeed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    dustSeed[i] = Math.random();
    dustPos[i * 3] = (Math.random() - 0.5) * 1.6;
    dustPos[i * 3 + 1] = 1.1 + Math.random() * 1.6;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 1.0;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: glowTexture(), color: new THREE.Color(1.8, 1.4, 0.7), size: 0.06, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false;
  group.add(dust);

  // Lo que se toca (un poco más grande que el libro, para que sea fácil acertarle con el dedo).
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.6, 1.3), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 1.0, 0);
  hit.userData = { kind: 'book' };
  group.add(hit);

  return {
    group,
    hit,
    get visible() { return group.visible; },
    // Dónde está el libro (para el botón de acción y para encuadrarlo).
    pos: group.position,
    bookPoint: () => desk.localToWorld(new THREE.Vector3(0, 0.1, 0)),
    setFloor(n) {
      group.visible = n === TOP_FLOOR;
      col.r = group.visible ? 1.05 : -100;
    },
    update(t) {
      if (!group.visible) return;
      for (const [i, f] of flames.entries()) f.scale.set(0.12 + Math.sin(t * 9 + i) * 0.012, 0.22 + Math.sin(t * 7.3 + i * 2) * 0.03, 1);
      halo.material.opacity = 0.5 + Math.sin(t * 0.9) * 0.08;
      for (let i = 0; i < N; i++) {
        const k = (t * (0.08 + dustSeed[i] * 0.1) + dustSeed[i]) % 1;
        dustPos[i * 3 + 1] = 1.1 + k * 1.8;
        dustPos[i * 3] += Math.sin(t * 0.7 + i) * 0.0006;
      }
      dustGeo.attributes.position.needsUpdate = true;
    },
  };
}
