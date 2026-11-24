import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createWatercolorPass } from './scene/watercolor.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { floorName } from './floors.js';
import './styles.css';
import { connect, myTokens } from './api.js';
import { downloadDemoBackup } from './migrate.js';
import { buildWorld, SPAWN, HALL_CENTER, uTime, creekZ, CREEK_HALF, onPath, insideHall, inCorridor, onBridge } from './scene/world.js';
import { buildHall, SLOTS_PER_FLOOR, EASEL_POS } from './scene/hall.js';
import { createControls } from './scene/controls.js';
import { createLanterns } from './scene/lanterns.js';
import { createCozy, JAR_POS } from './scene/cozy.js';
import { createAvatars } from './scene/avatars.js';
import { createElevator } from './scene/elevator.js';
import { createSpirits, MEADOW } from './scene/spirits.js';
import { createHeaven, FLOORS } from './scene/heaven.js';
import { createCharacter } from './scene/character.js';
import { createOfferFx } from './scene/gifts3d.js';
import { createSparkles } from './scene/sparkles.js';
import { createMist } from './scene/mist.js';
import { FURS, EARS, SIZES, SNOUTS } from '../server/looks.js';
import { arrival, viaRef, myRef, shareUrl, uploadOgCard, drawOgCard, drawKeepsake } from './share.js';
import { polaroid } from './photo.js';
// Cómo llegó esta persona (link de una huellita, invitación de alguien). Se lee antes de tocar la URL.
const ARRIVAL = arrival();
import { createGame } from './game.js';
import { GIFTS, SAYINGS, EMOTES, STAGES, stageOf } from '../server/glow.js';
import { BACKGROUNDS } from '../server/plans.js';
import { papelPicadoTexture, backgroundTexture, PICADO_COLORS } from './scene/muertos.js';
import { GUIDE_STEPS, renderGuide } from './guide.js';

// Tira de papel picado para paneles y entrada: banderitas pastel con caritas de calavera.
{
  const colors = ['#2b3f86', '#e88aa8', '#b9c47a', '#4f9aa0', '#e8743b', '#b9a3d6', '#d9474f'];
  const fw = 64;
  const c = document.createElement('canvas');
  c.width = colors.length * (fw + 12);
  c.height = 84;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(40,20,20,.55)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 3);
  g.lineTo(c.width, 3);
  g.stroke();
  colors.forEach((col, i) => {
    const x = i * (fw + 12) + 6;
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x, 4);
    g.lineTo(x + fw, 4);
    g.lineTo(x + fw, 52);
    g.arc(x + fw / 2, 52, fw / 2, 0, Math.PI);
    g.closePath();
    g.fill();
    // Carita de calavera.
    const cx = x + fw / 2;
    g.fillStyle = 'rgba(30,14,20,.85)';
    g.beginPath(); g.arc(cx - 11, 44, 7, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 11, 44, 7, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(cx, 52); g.lineTo(cx - 4, 59); g.lineTo(cx + 4, 59); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.arc(cx - 12, 42, 2.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 10, 42, 2.2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(30,14,20,.7)';
    g.lineWidth = 2;
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx + k * 5, 64); g.lineTo(cx + k * 5, 70); g.stroke(); }
  });
  document.documentElement.style.setProperty('--picado-url', `url(${c.toDataURL()})`);
  // Grano sutil para los paneles.
  const n = document.createElement('canvas');
  n.width = n.height = 120;
  const ng = n.getContext('2d');
  const img = ng.createImageData(120, 120);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 14;
  }
  ng.putImageData(img, 0, 0);
  document.documentElement.style.setProperty('--grain-url', `url(${n.toDataURL()})`);
  void papelPicadoTexture;
  void PICADO_COLORS;
}
import { portraitCanvas } from './scene/textures.js';
import { setMusic, setSounds, isMusicOn, isSoundsOn, sparkle, tick, pauseAll, ding, setRiver, setMood, step, boop, clink, liftDoors, liftHum, petVoice } from './audio.js';
import { TIERS, pickTier, savedQuality, saveQuality, createAdaptiveResolution, reducedMotion } from './quality.js';
import { FEATURED } from '../server/seed.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin storage */ } },
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const haptic = (p = 12) => navigator.vibrate?.(p);

const mqMobile = matchMedia('(max-width: 760px), (pointer: coarse) and (max-height: 540px)');
const mqLand = matchMedia('(pointer: coarse) and (max-height: 540px) and (orientation: landscape)');
const bottomSheet = () => mqMobile.matches && !mqLand.matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const reduced = reducedMotion();

// ---------- quién visita ----------
const ADJ = ['Suave', 'Serena', 'Tibia', 'Estrellada', 'Tranquila', 'Dorada', 'Clara', 'Calma', 'Lunar', 'Dulce'];
const NOUN = ['Brisa', 'Luz', 'Nube', 'Lluvia', 'Hoja', 'Flor', 'Estrella', 'Luciérnaga', 'Pluma', 'Calandria', 'Margarita', 'Aurora'];
function remember(key, make) {
  let v = store.get(key);
  if (!v) { v = make(); store.set(key, v); }
  return v;
}
const visitor = {
  sid: remember('huellita.sid', () => Math.random().toString(36).slice(2) + Date.now().toString(36)),
  name: remember('huellita.name', () => `${pick(NOUN)} ${pick(ADJ)}`),
};
$('#me-name').textContent = visitor.name;
$('#me-initial').textContent = visitor.name[0];
// El color del sarape; si es impar lleva sombrero y si es par, corona de flores (así lo ven los demás).
let visitorHue = Number(remember('huellita.hue', () => String(Math.floor(Math.random() * 360))));
const game = createGame();
// Mi mascota: la que recibe el Glow de mis gestos (tengo que ser quien la creó).
function myPet() {
  const tokens = myTokens();
  const chosen = store.get('huellita.myPet');
  const mine = memorials.filter((m) => tokens[m.id] && !m.featured);
  return mine.find((m) => m.id === chosen) || mine[0] || null;
}
const myMemorials = () => memorials.filter((m) => myTokens()[m.id] && !m.featured);
const who = () => {
  const pet = myPet();
  return { visitor: visitor.name, sid: visitor.sid, ...(pet ? { glowTo: pet.id, glowToken: myTokens()[pet.id] } : {}) };
};

const featuredDef = FEATURED[0];
$$('.featured-name').forEach((el) => { el.textContent = featuredDef?.name || 'Destacada'; });
if (!featuredDef) $$('[data-featured]').forEach((el) => el.remove());

// ---------- escena ----------
const tierName = pickTier();
const tier = TIERS[tierName];
const canvas = $('#scene');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !tier.bloom, powerPreference: 'high-performance', stencil: false });
} catch {
  renderer = null;
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 900);
const INTRO_FROM = new THREE.Vector3(24, 26, 80);
const INTRO_LOOK = new THREE.Vector3(HALL_CENTER.x, 1, HALL_CENTER.z);
const ENTRY_LOOK = new THREE.Vector3(EASEL_POS.x, 2.6, EASEL_POS.z);
camera.position.copy(INTRO_FROM);

let world;
let hall;
let controls;
let lanterns;
let offerFx; // los gestos de la ofrenda en 3D (llamita, flor, regalito, corazones)
let sparkles; // brillitos que caen en el aire
let sunShadows = null; // la luz del sol con sombras (pisos del cielo, calidad alta)
const sunDir = new THREE.Vector3();
let cozy;
let avatars;
let elevator;
let spirits;
let me; // tu personaje
let captureNext = null; // modo foto
let heaven = null; // el cielo que cambia con el piso
let mist = null; // la bruma en capas del jardín (mist.js)
let glideFx = 0; // para la estela de viento al planear
let bloomPass = null;
let composer = null;
let adaptive = null;
let watercolor = null; // estilo acuarela (pase final)
// Apagada por defecto (en el celular se veía sucia); se prende en Opciones.
const watercolorOn = () => store.get('huellita.watercolor') === '1';

function setupRenderer() {
  renderer.setSize(innerWidth, innerHeight);
  lastW = innerWidth;
  lastH = innerHeight;
  // Si el celular se queda sin memoria gráfica, el lienzo queda negro: recargamos un escalón más abajo.
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    const next = tierName === 'high' ? 'mid' : 'low';
    saveQuality(next);
    toast('✨ Ajustamos la calidad para que ande mejor en tu equipo…');
    setTimeout(() => location.reload(), 1200);
  }, { once: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  adaptive = createAdaptiveResolution(renderer, (r) => { composer?.setPixelRatio(r); sizeWatercolor(); }, { max: tier.maxPixelRatio, min: tierName === 'low' ? 0.7 : 0.85 });
  if (tier.bloom) {
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: tierName === 'high' ? 4 : 2 });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(adaptive.ratio);
    composer.setSize(innerWidth, innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    // Un solo píxel NaN o infinito alcanza para que el bloom ponga toda la pantalla en negro: se limpia acá.
    composer.addPass(new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
        void main(){
          vec4 c = texture2D(tDiffuse, vUv);
          if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0);
          gl_FragColor = vec4(clamp(c.rgb, 0.0, 64.0), c.a);
        }`,
    }));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.45, 0.9);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    // Acuarela: el último pase, en el color final de la pantalla.
    watercolor = createWatercolorPass(watercolorOn() ? 1 : 0);
    composer.addPass(watercolor.pass);
    sizeWatercolor();
  }
}
function sizeWatercolor() {
  if (!watercolor) return;
  const pr = adaptive?.ratio || renderer.getPixelRatio();
  watercolor.setSize(Math.max(1, innerWidth * pr), Math.max(1, innerHeight * pr), pr);
}

// Cambiar el tamaño del lienzo lo borra: si pasa fuera del cuadro (en el evento 'resize'), el
// navegador puede mostrarlo vacío, en negro, hasta el próximo dibujo. Por eso el evento sólo avisa y
// el cambio se hace al empezar el cuadro, justo antes de dibujar. Y si el tamaño no cambió (en el
// celular 'resize' salta seguido: barra del navegador, teclado), no se toca nada.
let sizeDirty = false;
let lastW = 0;
let lastH = 0;
function resize() {
  // Al cambiar de app o rotar, a veces el tamaño llega en 0 por un instante: no achicar todo a nada.
  if (!innerWidth || !innerHeight) return;
  if (innerWidth === lastW && innerHeight === lastH) return;
  lastW = innerWidth;
  lastH = innerHeight;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer?.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
  sizeWatercolor();
}
addEventListener('resize', () => {
  if (renderer) sizeDirty = true;
  else resize();
});
// Lo que haya que cambiar de tamaño o resolución, al principio del cuadro (antes de dibujar).
let pendingRatio = null;
function frameStart() {
  if (sizeDirty) { sizeDirty = false; resize(); }
  if (pendingRatio !== null) {
    const r = pendingRatio;
    pendingRatio = null;
    renderer.setPixelRatio(r);
    composer?.setPixelRatio(r);
  }
  adaptive?.apply();
}

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function cast(e, objects) {
  const rect = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObjects(objects, false)[0] || null;
}

function slotKeyFromHit(obj) {
  const d = obj.userData;
  if (d.kind === 'featured') return 'featured';
  if (d.kind === 'spot') return `spot:${d.id}`;
  if (d.kind === 'slot') return d.local;
  return null;
}

async function buildScene() {
  // Esperar la tipografía para que los carteles del jardín se dibujen con ella.
  await Promise.race([
    Promise.all(['700 40px Caveat', '400 40px "Young Serif"', '800 30px Nunito'].map((f) => document.fonts?.load(f))).catch(() => {}),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  setupRenderer();
  world = buildWorld(scene, tier);
  hall = buildHall(scene, world.colliders, tier);
  lanterns = createLanterns(scene, tier);
  offerFx = createOfferFx(scene);
  if (!reduced) sparkles = createSparkles(scene, tier, renderer.getPixelRatio());
  cozy = createCozy(scene, tier, world.colliders, world.ground);
  avatars = createAvatars(scene);
  elevator = createElevator(scene, world.colliders, Math.random);
  avatars.visible = store.get('huellita.quiet') !== '1';
  controls = createControls(camera, canvas, world.colliders, { reduced });
  // Al aterrizar de un planeo: un puf de brillitos y un pasito.
  controls.onLand(() => {
    const P = controls.player;
    spirits?.sparkle(new THREE.Vector3(P.pos.x, 0.15, P.pos.z), new THREE.Color(1.6, 1.5, 1.9), 22);
    step(world.colliders.up ? 'cloud' : 'grass');
    haptic(8);
  });
  scene.add(controls.marker);
  me = createCharacter({ hue: visitorHue, light: tierName !== 'low' });
  scene.add(me.group);
  spirits = createSpirits(scene, { blocked: controls.blocked, tier });
  heaven = createHeaven(scene, world, { renderer, bloom: bloomPass, tier });
  // Bruma en capas sobre el río y a lo lejos (se esconde con el jardín en los pisos del cielo).
  mist = createMist(world.ground, { tier, reduced });
  // Sombras de día en los pisos del cielo (sólo calidad alta): el sol proyecta tu sombra y la de los
  // espíritus sobre el piso del salón. La luz sigue a tu personaje (así alcanza un mapa chico).
  if (tierName === 'high') {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const L = world.moonLight;
    L.shadow.mapSize.set(1024, 1024);
    Object.assign(L.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 150 });
    L.shadow.camera.updateProjectionMatrix();
    L.shadow.bias = -0.0008;
    L.shadow.normalBias = 0.03;
    scene.add(L.target);
    world.deck.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    sunShadows = L;
  }
  spirits.setHand((v) => me.leashHand(v));
  wireSpirits();
  controls.placePlayer(SPAWN, ENTRY_LOOK);
  controls.teleportCamera(INTRO_FROM, INTRO_LOOK);
  controls.onLeaveFocus(() => { if (!sheetEl.hidden) closeSheet(); });

  controls.onTap((e) => {
    if (document.body.classList.contains('intro')) return skipIntro();
    if (!sheetEl.hidden) { closeSheet(); return; }
    const hit = cast(e, [...hall.pickables(), ...hall.blockers, ...(world.colliders.up ? [] : cozy.pickables), ...spirits.pickables, elevator.hit, ...world.walkable]);
    if (!hit) return;
    // Un muro: caminar hacia él (no abrir lo que haya del otro lado).
    if (hit.object.userData.kind === 'wall') { controls.walkTo(hit.point.clone().setY(0)); hideHint(); return; }
    if (hit.object.userData.kind === 'jar') { clink(); return openJar(); }
    if (hit.object.userData.kind === 'elevator') return callElevator();
    if (hit.object.userData.kind === 'spirit') return tapSpirit(spirits.spiritOf(hit.object));
    if (hit.object.userData.kind === 'ball') {
      if (controls.player.pos.distanceTo(spirits.ball.pos.clone().setY(0)) < 4) return throwBall();
      controls.walkTo(spirits.ball.pos.clone().setY(0));
      return;
    }
    const key = slotKeyFromHit(hit.object);
    if (key === 'featured') return hall.featured && visit(hall.featured);
    if (typeof key === 'string' && key.startsWith('spot:')) {
      const m = memorials.find((x) => x.id === key.slice(5));
      return m && visit(m);
    }
    if (key !== null) {
      const m = hall.slots[key].memorial;
      if (m) visit(m);
      else openAdd(hall.floor * SLOTS_PER_FLOOR + key);
      return;
    }
    controls.walkTo(hit.point);
    hideHint();
  });
  controls.onHover((e) => {
    const hit = cast(e, [...hall.pickables(), ...hall.blockers, ...(world.colliders.up ? [] : cozy.pickables), ...spirits.pickables, elevator.hit]);
    const key = hit && hit.distance < 16 ? slotKeyFromHit(hit.object) : null;
    hall.setHover(key);
    canvas.style.cursor = hit && hit.distance < 16 && (key !== null || (hit.object.userData.kind && hit.object.userData.kind !== 'wall')) ? 'pointer' : '';
  });
  controls.onMove(hideHint);
  if (new URLSearchParams(location.search).has('debug')) window.__huellita = { controls, camera, scene, renderer, THREE, spirits, me, startWalk: (id) => startWalk(memorials.find((m) => m.id === id)),
    goFloor: (f) => goFloor(f, true, true),
    ogCard: async (id) => { const m = memorials.find((x) => x.id === id); return (await drawOgCard(m, photoSrc(m))).toDataURL('image/jpeg', 0.88); } };

  const clock = new THREE.Clock();
  let riverT = 0;
  let kickT = 0;
  let stepT = 0;
  let moodT = 0;
  let greetT = 3;
  let actT = 0;
  let calmT = 0;
  let hudAway = false;
  setupStick();
  renderer.setAnimationLoop(() => {
    frameStart();
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    uTime.value = t;
    controls.update(dt);
    const P = controls.player;
    me.group.position.copy(P.pos);
    me.group.rotation.y = P.heading;
    me.leashing = !!(walking && spirits.companion && spirits.companion.state === 'follow');
    me.update(dt, { speed: P.speed, turn: P.turn, gliding: controls.gliding });
    // Planeando: una estela de viento detrás tuyo.
    if (controls.gliding && !reduced) {
      glideFx -= dt;
      if (glideFx < 0) {
        glideFx = 0.07;
        _v.set(P.pos.x - Math.sin(P.heading) * 0.5, P.pos.y + 1.0, P.pos.z - Math.cos(P.heading) * 0.5);
        spirits.sparkle(_v, new THREE.Color(1.3, 1.5, 1.9), 3);
      }
    }
    spirits.setPlayer(P.pos, P.heading, P.moving, dt);
    spirits.update(dt, camera.position);
    // Botón de acción según lo que haya cerca, y la interfaz que se desvanece al caminar o mientras
    // vuela la cámara (vuelve medio segundo después de frenar).
    stillFor = P.moving ? 0 : stillFor + dt;
    actT -= dt;
    if (actT < 0) { actT = 0.3; updateAction(); }
    const busy = introDone && (P.moving || controls.sticking || controls.flying);
    calmT = busy ? 0.6 : calmT - dt;
    if ((calmT > 0) !== hudAway) { hudAway = calmT > 0; document.body.classList.toggle('moving', hudAway); }
    heaven.update(dt, t);
    mist?.update(world.fog);
    if (sunShadows) {
      // De día (arriba) hay sombras; de noche, en el jardín, no.
      const day = heaven.k > 0.3;
      sunShadows.castShadow = day;
      if (day) {
        sunDir.set(-30 + heaven.k * 60, 50 + heaven.k * 30, -40).normalize();
        sunShadows.target.position.copy(P.pos);
        sunShadows.position.copy(P.pos).addScaledVector(sunDir, 70);
      }
    }
    hall.animate(t);
    lanterns.update(dt, t);
    offerFx.update(dt);
    // Pasos que suenan según el piso: piedra en el camino y el salón, madera en el puente, pasto o nube.
    if (P.moving && P.speed > 0.4 && introDone) {
      stepT -= dt * P.speed / 0.62;
      if (stepT < 0) {
        stepT = 1;
        const x = P.pos.x;
        const z = P.pos.z;
        step(world.colliders.up ? 'cloud' : onBridge(x, z, 0.1) ? 'wood' : insideHall(x, z) ? 'wood' : onPath(x, z, 0.1) ? 'stone' : 'grass');
      }
    }
    // Si otro visitante pasa cerca, se saludan.
    greetT -= dt;
    if (greetT < 0) {
      greetT = 1;
      if (introDone && !P.moving && avatars.greetNear(P.pos) && !me.busy) me.wave();
    }
    // La música cambia con el lugar: jardín, salón o cielo.
    moodT -= dt;
    if (moodT < 0) {
      moodT = 1;
      setMood(heaven.k > 0.4 ? 'sky' : insideHall(P.pos.x, P.pos.z) ? 'hall' : 'garden');
    }
    // Al caminar se levantan pétalos de cempasúchil de los pies (en el jardín y el salón).
    if (P.moving && !world.colliders.up && !reduced) {
      kickT -= dt * Math.min(2, P.speed / 2);
      if (kickT < 0) { kickT = 0.28; offerFx.kick(P.pos); }
    }
    sparkles?.update(camera.position);
    // El murmullo del río sube al acercarte (en los pisos de arriba no hay río).
    riverT -= dt;
    if (riverT < 0) {
      riverT = 0.3;
      const d = Math.abs(P.pos.z - creekZ(P.pos.x)) - CREEK_HALF;
      setRiver(world.colliders.up ? 0 : Math.max(0, 1 - d / 16) ** 1.6);
    }
    // Tus pasos sobre el puente (o cerca del agua) y tu mascota encienden el plancton del río.
    if (!world.colliders.up) {
      const near = (p) => Math.abs(p.z - creekZ(p.x)) < CREEK_HALF + 1.2;
      const c = spirits?.companion;
      cozy.setRiverMovers([
        near(P.pos) ? { x: P.pos.x, z: P.pos.z, w: P.moving ? 1 : 0.45 } : null,
        c && c.fade > 0.5 && near(c.pos) ? { x: c.pos.x, z: c.pos.z, w: 0.8 } : null,
      ]);
    }
    cozy.animate(t, dt);
    elevator.animate(t, dt);
    avatars.animate(dt, t);
    if (composer) composer.render(dt);
    else renderer.render(scene, camera);
    // Modo foto: leer el cuadro recién dibujado (antes de que el navegador lo borre).
    if (captureNext) {
      const cb = captureNext;
      captureNext = null;
      try { cb(renderer.domElement.toDataURL('image/jpeg', 0.92)); } catch { cb(null); }
    }
    adaptive.tick(dt);
  });
  // Compilar los shaders antes de entrar evita tirones en el primer movimiento.
  try { await renderer.compileAsync(scene, camera); } catch { /* algunos navegadores no lo soportan */ }
}

// ---------- datos ----------
let api;
let memorials = [];
let seq = 0;

function hiddenSet(kind) {
  try {
    const raw = JSON.parse(store.get('huellita.hidden') || '{}');
    return new Set(Array.isArray(raw[kind]) ? raw[kind] : []);
  } catch {
    return new Set();
  }
}
function hideItem(kind, id) {
  try {
    const raw = JSON.parse(store.get('huellita.hidden') || '{}');
    const set = new Set(Array.isArray(raw[kind]) ? raw[kind] : []);
    set.add(id);
    raw[kind] = [...set];
    store.set('huellita.hidden', JSON.stringify(raw));
  } catch { /* sin storage */ }
}

async function refresh() {
  const r = await api.list();
  lastFull = Date.now();
  const hid = hiddenSet('m');
  memorials = r.memorials.filter((m) => m.featured || !hid.has(m.id));
  if (walking) {
    const w = memorials.find((m) => m.id === walking.id);
    if (!w) stopWalk();
    else if (w.name !== walking.name || JSON.stringify(w.look) !== JSON.stringify(walking.look) || w.species !== walking.species) {
      // Cambió cómo es (lo editaron): su espíritu vuelve a aparecer con el aspecto nuevo.
      walking = w;
      spirits?.walk(w, null);
      $('#walk-name').textContent = w.name;
      $('#walk-photo').src = photoSrc(w);
    } else walking = w;
  }
  hall?.render(memorials);
  spirits?.setPack(memorials, walking?.id);
  renderStats(r.stats);
  renderBirthdays();
  renderFloors();
  updateTodayBadge();
  api.altar().then(({ ids }) => hall?.setAltar(ids.map((id) => memorials.find((m) => m.id === id)).filter(Boolean))).catch(() => {});
  return r;
}

function renderStats(s) {
  const txt = `${s.memorials.toLocaleString('es-AR')} huellitas · ${s.candles.toLocaleString('es-AR')} velas encendidas`;
  $('#stats').textContent = txt;
  $('#menu-foot').textContent = `${txt}${api.mode === 'local' ? ' · Modo demo: lo que sumes queda en este navegador.' : ''}`;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fmtDay = (mmdd) => {
  const [m, d] = mmdd.split('-').map(Number);
  return `${d} de ${MONTHS[m - 1]}`;
};
const todayMMDD = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isBirthday = (m) => m.birthday === todayMMDD();

function renderBirthdays() {
  const list = memorials.filter(isBirthday);
  const el = $('#bday');
  el.hidden = !list.length;
  if (!list.length) return;
  el.textContent = list.length === 1 ? `🎂 Hoy es el cumpleaños de ${list[0].name}` : `🎂 Hoy cumplen ${list[0].name} y ${list.length - 1} más`;
  el.onclick = () => (list.length === 1 ? visit(list[0]) : openList('birthday'));
}

const floorOf = (m) => (m.slot < 0 ? -1 : Math.floor(m.slot / SLOTS_PER_FLOOR));
const currentFloor = () => hall?.floor ?? 0;

// Los 99 pisos, todos abiertos: del jardín (1) al cielo (99). Cada botón se tiñe del cielo de su piso.
const floorSky = (f) => {
  const k = f / (FLOORS - 1);
  const a = k < 0.45 ? [52 + (143 - 52) * (k / 0.45), 25 + (134 - 25) * (k / 0.45), 94 + (214 - 94) * (k / 0.45)]
    : [143 + (134 - 143) * ((k - 0.45) / 0.55), 134 + (195 - 134) * ((k - 0.45) / 0.55), 214 + (242 - 214) * ((k - 0.45) / 0.55)];
  return `rgb(${a.map(Math.round).join(',')})`;
};
function renderFloors() {
  const counts = new Array(FLOORS).fill(0);
  for (const m of memorials) { const f = floorOf(m); if (f >= 0 && f < FLOORS) counts[f]++; }
  const list = $('#floor-list');
  list.innerHTML = '';
  for (let f = FLOORS - 1; f >= 0; f--) {
    const n = counts[f];
    const b = document.createElement('button');
    b.className = `${f === currentFloor() ? 'on' : ''} ${n ? 'has' : ''}`;
    b.style.setProperty('--sky', floorSky(f));
    b.innerHTML = `<b>${f + 1}</b><span class="fn"></span>${n ? `<small>${n} 🐾</small>` : ''}`;
    b.querySelector('.fn').textContent = floorName(f);
    b.title = `Piso ${f + 1} · ${floorName(f)}${n ? ` · ${n} ${n === 1 ? 'huellita' : 'huellitas'}` : ''}`;
    b.setAttribute('aria-label', b.title);
    b.onclick = () => {
      $('#floors').close();
      if (f === currentFloor()) return;
      rideTo(f);
    };
    list.append(b);
  }
  $$('.floor-num').forEach((el) => { el.textContent = currentFloor() + 1; });
  const here = $('#floor-here');
  if (here) here.textContent = `Estás en el piso ${currentFloor() + 1} · ${floorName(currentFloor())}`;
  elevator?.setFloor(currentFloor());
}

// ---------- el ascensor, como uno de verdad ----------
// Está en la pared del salón, entre dos pasillos. Llamarlo: tu personaje camina hasta la puerta,
// suena la campanita y se abren las puertas metálicas (adentro, la cabina iluminada). Entra caminando,
// se da vuelta y la cámara entra con vos: queda al fondo de la cabina, detrás tuyo, mirando las
// puertas, y aparece la botonera. Al elegir el piso se cierran las puertas, el indicador cuenta los
// pisos, hay un sacudón al arrancar y al frenar, un velo de nubes tapa el cambio de piso, campanita,
// se abren las puertas en el piso nuevo y salís caminando. Si cerrás la botonera sin elegir, salís.
let riding = false; // la escena del ascensor está en curso
let insideLift = false; // tu personaje está adentro de la cabina, con la botonera abierta
const tween = (dur, fn) => new Promise((res) => {
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / (dur * 1000));
    fn(k);
    if (k < 1) requestAnimationFrame(step); else res();
  };
  requestAnimationFrame(step);
});
const easeIO = (k) => (k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) * (-2 * k + 2)) / 2);
const easeOut = (k) => 1 - (1 - k) * (1 - k) * (1 - k);
const angleTo = (from, to) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from));

// Camina en línea recta (la escena maneja al personaje: sin choques ni palanca).
async function scriptedWalk(to, dur, yTo = null) {
  const P = controls.player;
  const from = P.pos.clone();
  const y0 = P.pos.y;
  const y1 = yTo ?? y0;
  P.heading = Math.atan2(to.x - from.x, to.z - from.z);
  await tween(dur, (k) => {
    P.pos.set(from.x + (to.x - from.x) * k, y0 + (y1 - y0) * Math.min(1, k * 1.6), from.z + (to.z - from.z) * k);
    P.speed = k < 1 ? 1.45 : 0;
    P.moving = k < 1;
  });
  P.speed = 0;
  P.moving = false;
}
async function scriptedTurn(heading, dur = 0.5) {
  const P = controls.player;
  const h0 = P.heading;
  const h1 = angleTo(h0, heading);
  await tween(dur, (k) => {
    const prev = P.heading;
    P.heading = h0 + (h1 - h0) * easeIO(k);
    P.turn = (P.heading - prev) * 30;
  });
  P.turn = 0;
}
// Espera a que tu personaje llegue caminando (con la cámara de siempre); si algo lo traba, lo acerca.
function walkUntil(point, maxS = 6) {
  return new Promise((res) => {
    controls.walkTo(point);
    const t0 = performance.now();
    const check = () => {
      const P = controls.player;
      const d = Math.hypot(P.pos.x - point.x, P.pos.z - point.z);
      if (d < 0.35 || performance.now() - t0 > maxS * 1000 || !controls.player) return res(d);
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}
// El velo de nubes que tapa el cambio de piso.
function cloudVeil(on, dur = 0.5) {
  const el = $('#lift-veil');
  el.hidden = false;
  el.style.transitionDuration = `${dur}s`;
  requestAnimationFrame(() => { el.classList.toggle('on', on); });
  return later(dur * 1000 + 30).then(() => { if (!on) el.hidden = true; });
}
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
let liftDrop = 0; // cuánto baja la mirada de la cámara de la cabina (con la botonera abierta)
// La cámara dentro de la cabina; `shake` es el sacudón del viaje.
function liftCam(drop = liftDrop, shake = 0) {
  elevator.insideShot(camPos, camLook, drop);
  if (shake) {
    camPos.x += (Math.random() - 0.5) * shake;
    camPos.y += (Math.random() - 0.5) * shake;
  }
  controls.teleportCamera(camPos, camLook);
}
function liftBegin() {
  riding = true;
  closeSheet();
  closeModals();
  hideHint();
  $('#emote-tray').hidden = true;
  document.body.classList.add('riding');
  controls.held = true;
  controls.enabled = false;
}
function liftEnd() {
  controls.held = false;
  controls.enabled = true;
  document.body.classList.remove('riding');
  elevator.setInside(false);
  if (me) me.close = false;
  riding = false;
  insideLift = false;
}

async function callElevator() {
  if (!controls || !elevator || riding) return;
  if (reduced) { renderFloors(); $('#floors').showModal(); return; }
  liftBegin();
  const P = controls.player;
  const door = elevator.doorPoint(1.1);
  // Lejos (desde el menú): aparece en el salón, cerca del ascensor, mirándolo.
  if (Math.hypot(P.pos.x - door.x, P.pos.z - door.z) > 11) {
    teleportPlayer(elevator.doorPoint(4.2), door);
    controls.snapFollow();
  }
  controls.held = false;
  await walkUntil(door, 6);
  controls.held = true;
  await scriptedWalk(door, 0.35);
  await scriptedTurn(elevator.outHeading + Math.PI, 0.35);
  // Campanita, se prende el botón y se abren las puertas; la cámara se pone de costado para verte entrar.
  ding();
  haptic(8);
  elevator.shot(camPos, camLook, 0.6);
  controls.flyTo(camPos, camLook, null, { duration: 1.0 });
  await later(450);
  elevator.setOpen(true);
  liftDoors();
  await later(850);
  // Entra (cruza el umbral) y se da vuelta hacia las puertas.
  elevator.setInside(true);
  await scriptedWalk(elevator.doorPoint(-0.15), 0.5);
  await scriptedWalk(elevator.cabPoint(0.45, -0.1), 0.6);
  await scriptedTurn(elevator.outHeading, 0.55);
  me.close = true;
  // La cámara entra con vos (por el medio de la puerta) y se queda al fondo de la cabina.
  elevator.insideShot(camPos, camLook, 0);
  controls.flyTo(camPos, camLook, null, { duration: 1.0, path: [elevator.doorPoint(0.9).setY(1.95), elevator.doorPoint(-0.3).setY(2.0)] });
  await later(1050);
  // La botonera tapa la mitad de abajo: la puerta y el indicador, arriba en la pantalla.
  await tween(0.5, (k) => liftCam(easeIO(k) * 0.38));
  liftDrop = 0.38;
  insideLift = true;
  renderFloors();
  $('#floors').showModal();
}

// Salir caminando de la cabina (al llegar, o si no elegiste piso).
async function leaveLift(fromPanel = false) {
  if (fromPanel) await tween(0.45, (k) => liftCam((1 - easeIO(k)) * liftDrop));
  liftDrop = 0;
  if (elevator.open < 0.5) {
    elevator.setOpen(true);
    liftDoors();
    await later(700);
  }
  me.close = false;
  await scriptedWalk(elevator.doorPoint(-0.1), 0.6);
  elevator.setInside(false);
  await scriptedWalk(elevator.doorPoint(1.9), 0.65);
  // Gira hacia el salón antes de que la cámara lo siga (detrás suyo está la pared del ascensor).
  await scriptedTurn(elevator.outHeading + 1.15, 0.45);
  controls.placePlayer(controls.player.pos, null);
  controls.follow({ duration: 1.1, path: [elevator.doorPoint(0.6).setY(2.0)] });
  await later(650);
  elevator.setOpen(false);
  liftDoors(true);
  liftEnd();
}

async function rideTo(f) {
  if (!controls || !elevator) return;
  if (reduced || !insideLift) { goFloor(f); return; }
  insideLift = false;
  const from = currentFloor();
  const up = f > from;
  const count = (k) => {
    const n = Math.round(from + (f - from) * k);
    if (n !== count.last) { count.last = n; elevator.showFloor(n + 1, up ? 1 : -1); tick(); }
  };
  count.last = from;
  // Se cierran las puertas (la cámara vuelve a mirar derecho las puertas).
  const d0 = liftDrop;
  tween(0.6, (k) => liftCam((1 - easeIO(k)) * d0));
  liftDrop = 0;
  elevator.setOpen(false);
  liftDoors(true);
  haptic(10);
  await later(1000);
  liftHum(4.8);
  // Arranca con un sacudón y cuenta los pisos; a mitad de camino, el velo de nubes tapa el cambio.
  const shakeAt = (k) => (k < 0.1 ? Math.sin((k / 0.1) * Math.PI) * 0.035 : 0.004);
  await tween(1.6, (k) => { liftCam(0, shakeAt(k * 0.45)); count(easeIO(k) * 0.45); });
  await cloudVeil(true, 0.35);
  goFloor(f, true, true);
  cloudVeil(false, 0.7);
  await tween(2.0, (k) => {
    const kk = 0.45 + k * 0.55;
    liftCam(0, kk > 0.9 ? Math.sin(((kk - 0.9) / 0.1) * Math.PI) * 0.03 : 0.004);
    count(0.45 + easeOut(k) * 0.55);
  });
  liftCam(0);
  elevator.showFloor(f + 1, 0);
  await later(220);
  ding();
  haptic([10, 40, 10]);
  elevator.setOpen(true);
  liftDoors();
  toast(`🛗 Piso ${f + 1} · ${floorName(f)}`);
  await later(900);
  await leaveLift();
}

function goFloor(f, quiet = false, instant = false) {
  if (!hall || f === hall.floor) return;
  hall.setFloor(f, memorials);
  heaven?.setFloor(f, instant);
  spirits?.setUp(f > 0);
  renderFloors();
  elevator?.setFloor(f);
  heartbeat();
  if (!quiet) toast(`🛗 Llegaste al piso ${f + 1}`);
}

// ---------- visitar ----------
let current = null;

function visit(m) {
  closeModals();
  if (hall && controls) {
    const key = m.slot < 0 ? 'featured' : m.slot % SLOTS_PER_FLOOR;
    // La ofrenda de la destacada está sólo en el piso 1.
    goFloor(m.slot < 0 ? 0 : floorOf(m), true);
    const sheet = bottomSheet();
    const shift = sheet ? 0 : key === 'featured' ? 0.9 : 1.1;
    // En pantallas verticales el campo horizontal es angosto: nos paramos más lejos.
    const distMul = camera.aspect < 0.8 ? 1.55 : camera.aspect < 1.2 ? 1.25 : 1;
    let { stand, target, frame } = hall.viewpoint(key, shift, distMul);
    if (sheet) {
      // La hoja tapa la mitad de abajo: el marco tiene que quedar en el cuarto de arriba.
      target = frame.clone();
      target.y -= 0.42 * stand.distanceTo(frame) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    }
    hideHint();
    if (key === 'featured') placeNear(stand, frame, 1.6, 5.4);
    else placeNear(stand, frame, 0.85);
    controls.flyTo(stand, target, () => hall.pulse(key));
  }
  openSheet(m);
}

// Pone a tu personaje parado frente a un marco (o al ascensor), a un costado para no taparlo.
function placeNear(stand, frame, side = 0.85, dist = 1.45) {
  if (!controls) return;
  const front = new THREE.Vector3(stand.x - frame.x, 0, stand.z - frame.z);
  if (front.lengthSq() < 1e-4) return;
  front.normalize();
  const sideV = new THREE.Vector3(front.z, 0, -front.x);
  // Del lado contrario a donde queda la cámara, para no tapar la foto.
  const camSide = Math.sign((stand.x - frame.x) * sideV.x + (stand.z - frame.z) * sideV.z) || 1;
  const away = -camSide * side;
  for (const s of [away, away * 1.5, -away, 0]) {
    const spot = new THREE.Vector3(frame.x, 0, frame.z).addScaledVector(front, dist).addScaledVector(sideV, s);
    if (controls.blocked(spot.x, spot.z)) continue;
    teleportPlayer(spot, new THREE.Vector3(frame.x, 0, frame.z));
    return;
  }
}
function teleportPlayer(spot, facing) {
  if (spot.distanceTo(controls.player.pos.clone().setY(spot.y)) > 0.5) {
    spirits?.sparkle(controls.player.pos.clone().setY(0.8));
    spirits?.sparkle(new THREE.Vector3(spot.x, 0.8, spot.z));
  }
  controls.placePlayer(spot, facing);
}

const photoCache = new Map();
function photoSrc(m) {
  if (m.photo) return m.photo;
  const k = `${m.id}:${m.name}`;
  if (!photoCache.has(k)) photoCache.set(k, portraitCanvas(m, 320).toDataURL('image/png'));
  return photoCache.get(k);
}

// Ficha: en celular es una hoja que se desliza (media altura → completa → cerrada).
const sheetEl = $('#sheet');
let sheetState = 'closed';
const sheetHeight = () => sheetEl.getBoundingClientRect().height || innerHeight * 0.92;
const peekY = () => Math.max(0, sheetHeight() - innerHeight * 0.5);
function setSheet(state) {
  sheetState = state;
  if (!bottomSheet()) return;
  const y = state === 'full' ? 0 : state === 'peek' ? peekY() : sheetHeight() + 20;
  sheetEl.style.setProperty('--sheet-y', `${y}px`);
}

async function openSheet(m) {
  current = m;
  const wasHidden = sheetEl.hidden;
  sheetEl.hidden = false;
  document.body.classList.add('sheet-open');
  if (bottomSheet() && wasHidden) {
    sheetEl.classList.add('dragging');
    setSheet('closed');
    sheetEl.getBoundingClientRect();
    sheetEl.classList.remove('dragging');
    requestAnimationFrame(() => setSheet('peek'));
  } else if (bottomSheet()) setSheet(sheetState === 'full' ? 'full' : 'peek');
  $('#sheet-scroll').scrollTop = 0;
  fillSheet(m);
  renderGuestbook(null);
  history.replaceState(null, '', `/h/${m.id}`);
  try {
    const full = await api.get(m.id);
    if (current?.id === m.id) {
      current = { ...current, ...full };
      fillSheet(current);
      renderGuestbook(full.guestbook || []);
    }
  } catch { /* se ve igual con lo que hay */ }
}

function closeSheet() {
  if (sheetEl.hidden) return;
  current = null;
  if (controls?.mode === 'focus') controls.follow();
  document.body.classList.remove('sheet-open');
  history.replaceState(null, '', '/');
  if (bottomSheet()) {
    setSheet('closed');
    setTimeout(() => { if (!current) sheetEl.hidden = true; }, 420);
  } else sheetEl.hidden = true;
}

// Arrastre de la hoja.
{
  let drag = null;
  const startDrag = (e) => {
    if (!bottomSheet() || e.target.closest('button, input, textarea, a')) return;
    const cur = parseFloat(getComputedStyle(sheetEl).getPropertyValue('--sheet-y')) || 0;
    drag = { y0: e.clientY, s0: cur, last: e.clientY, t: performance.now(), v: 0, id: e.pointerId };
    sheetEl.classList.add('dragging');
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now();
    drag.v = (e.clientY - drag.last) / Math.max(1, now - drag.t);
    drag.last = e.clientY;
    drag.t = now;
    const y = Math.max(-20, drag.s0 + (e.clientY - drag.y0));
    sheetEl.style.setProperty('--sheet-y', `${y}px`);
  };
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    sheetEl.classList.remove('dragging');
    const y = drag.s0 + (e.clientY - drag.y0);
    const moved = Math.abs(e.clientY - drag.y0) > 6;
    const v = drag.v;
    drag = null;
    if (!moved) { setSheet(sheetState === 'peek' ? 'full' : 'peek'); return; }
    if (v > 0.6 || y > peekY() + 90) {
      if (sheetState === 'full' && y < peekY() + 90 && v < 1.2) setSheet('peek');
      else closeSheet();
    } else if (v < -0.4 || y < peekY() * 0.5) setSheet('full');
    else setSheet('peek');
  };
  for (const el of [$('#sheet-grab'), $('.sheet-head')]) {
    el.addEventListener('pointerdown', startDrag);
    el.addEventListener('pointermove', moveDrag);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }
  // Al scrollear el contenido desde media altura, la hoja se abre entera.
  $('#sheet-scroll').addEventListener('scroll', (e) => {
    if (sheetState === 'peek' && e.target.scrollTop > 8) setSheet('full');
  }, { passive: true });
  $('#sheet-scroll').addEventListener('focusin', () => { if (sheetState === 'peek') setSheet('full'); });
  mqMobile.addEventListener('change', () => { if (!sheetEl.hidden) setSheet(sheetState); });
  addEventListener('resize', () => { if (!sheetEl.hidden && bottomSheet()) setSheet(sheetState); });
}
$('#sheet-x').onclick = closeSheet;

function inspectShelfGift(m, emo, single = null) {
  tick();
  haptic(8);
  if (hall && offerFx) {
    const key = hall.memorialKey(m);
    if (key !== null) hall.bounceGift(key, emo, offerFx);
  }
  if (single) {
    const rest = single.gift.split(' ').slice(1).join(' ');
    return toast(`🎁 ${single.who} le dejó ${(rest || single.gift).toLowerCase()} · ${timeAgo(single.at)}`);
  }
  const matching = (m.giftList || []).filter((x) => x.gift.startsWith(emo));
  if (matching.length === 1) {
    const g = matching[0];
    const rest = g.gift.split(' ').slice(1).join(' ');
    return toast(`🎁 ${g.who} le dejó ${(rest || g.gift).toLowerCase()} · ${timeAgo(g.at)}`);
  }
  if (matching.length > 1) {
    const names = [...new Set(matching.map((x) => x.who))].slice(0, 3).join(', ');
    const rest = matching[0].gift.split(' ').slice(1).join(' ');
    return toast(`🎁 ${names} le dejaron ${(rest || emo).toLowerCase()}`);
  }
  toast(`🎁 Regalito en la repisa de ${m.name}`);
}

function fillSheet(m) {
  $('#s-photo').src = photoSrc(m);
  $('#s-photo').alt = `Foto de ${m.name}`;
  $('.sheet-photo').classList.toggle('gold', !!m.featured || m.candles >= 20);
  const topGifts = (m.lastGifts && m.lastGifts.length ? m.lastGifts : Object.keys(m.giftCounts || {})).slice(0, 4);
  $('.sheet-photo').dataset.leftGift = topGifts[0] || '🕯️';
  $('.sheet-photo').dataset.rightGift = topGifts[1] || '🌼';
  $('#s-name').textContent = m.name;
  const kind = { perro: 'Perro', gato: 'Gato', otro: 'Compañero' }[m.species] || '';
  const bits = [kind];
  if (m.birthday) bits.push(`🎂 ${fmtDay(m.birthday)}${m.birthYear ? ` de ${m.birthYear}` : ''}`);
  if (m.passedDay) bits.push(`🌈 ${fmtDay(m.passedDay)}${m.passedYear ? ` de ${m.passedYear}` : ''}`);
  if (m.birthYear && m.passedYear) bits.push(`${m.passedYear - m.birthYear} años de amor`);
  $('#s-meta').textContent = bits.filter(Boolean).join(' · ');
  $('#s-msg').textContent = m.message ? `“${m.message}”` : '';
  const tag = m.featured ? 'Huellita destacada' : isBirthday(m) ? '🎂 Hoy es su cumpleaños' : m.slot >= 0 ? `Piso ${floorOf(m) + 1}` : '';
  $('#s-tag').textContent = tag;
  $('#s-tag').hidden = !tag;
  const same = sheetEl.dataset.id === m.id;
  setCount('#s-candles', m.candles, same);
  setCount('#s-flowers', m.flowers, same);
  setCount('#s-gb', m.guestbookCount ?? 0, same);
  sheetEl.dataset.id = m.id;
  const mine = !!myTokens()[m.id] && !m.featured;
  $('#s-delete').hidden = !myTokens()[m.id];
  $('#s-report').hidden = !!m.featured || mine;
  $('#gb-closed-msg').hidden = !m.gbClosed;
  $('#gb-form').hidden = !!m.gbClosed;
  const gbLbl = $('#tool-gb-label');
  if (gbLbl) gbLbl.textContent = m.gbClosed ? 'Abrir libro' : 'Cerrar libro';
  $('#s-walk').hidden = !canWalk(m);
  $('#s-walk-act').hidden = !canWalk(m);
  $('#s-walk-act').classList.toggle('on', walking?.id === m.id);
  $('#s-walk-act span').textContent = walking?.id === m.id ? 'Soltar' : 'Pasear';
  $('#s-walk-label').textContent = walking?.id === m.id ? `Terminar el paseo con ${m.name}` : `Sacar a pasear a ${m.name}`;
  const lit = didToday('c', m.id);
  $('#s-candle').classList.toggle('lit', lit);
  $('#s-pass').hidden = true; // (la invitación va en el botón de la vela)
  $('#s-pass-label').textContent = `Pasá la luz: invitá a alguien a encenderle una vela a ${m.name}`;
  maybeOgCard(m);
  $('#s-candle-label').innerHTML = lit ? 'Tu vela brilla · <b>Pasá la luz a alguien</b>' : 'Encender una vela';
  $('#s-flower').classList.toggle('done', didToday('f', m.id));
  $('#s-gift').classList.toggle('done', didToday('g', m.id));
  $('#s-hug').classList.toggle('done', didToday('h', m.id));
  // Quiénes encendieron una vela, racha de luz y agradecimiento de la familia.
  const cw = $('#s-candles-who');
  const cl = m.candleList || [];
  const hasStreak = (m.streak || 0) > 1;
  const recentThanks = m.thankedAt && Date.now() - m.thankedAt < 36 * 3600_000;
  cw.hidden = !cl.length && !hasStreak && !recentThanks && !(mine && m.candles > 0);
  cw.innerHTML = '';
  if (!cw.hidden) {
    if (hasStreak) {
      const st = document.createElement('span');
      st.className = 'candle-streak';
      st.textContent = `🔥 ${m.streak} días seguidos con una vela encendida`;
      cw.append(st);
    }
    if (cl.length) {
      const names = [...new Set(cl.map((c) => `${c.who}${c.country ? ` ${flag(c.country)}` : ''}`))].slice(0, 6);
      const whoSpan = document.createElement('span');
      whoSpan.className = 'candle-names';
      whoSpan.textContent = `🕯️ Encendieron una vela: ${names.join(', ')}${cl.length > names.length ? ' y más' : ''}`;
      cw.append(whoSpan);
    }
    if (recentThanks) {
      const th = document.createElement('span');
      th.className = 'candle-thanked';
      th.textContent = `🤍 La familia de ${m.name} agradece cada vela encendida`;
      cw.append(th);
    }
    if (mine && m.candles > 0) {
      const thankedToday = didToday('th', m.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn soft small thanks-btn';
      btn.id = 's-thanks-btn';
      btn.disabled = thankedToday;
      btn.textContent = thankedToday ? '🤍 Ya diste las gracias hoy' : '🤍 Dar las gracias a todos';
      btn.onclick = async () => {
        btn.disabled = true;
        const r = await ownAction('thanks', {}, '🤍 Tu agradecimiento llegó al jardín');
        if (r) {
          markToday('th', m.id);
          confetti(['🤍', '🕯️', '✨']);
          sparkle();
          fillSheet(current);
        } else btn.disabled = false;
      };
      cw.append(btn);
    }
  }
  // Glow: sólo en mis mascotas.
  const pet = myPet();
  $('#s-glow').hidden = !mine;
  if (mine) $('#s-glow').innerHTML = glowCardHTML(m);
  $('#s-mine').hidden = !(mine && pet && pet.id !== m.id);
  // La repisa: cada regalito con cuántos le dejaron (como en una ofrenda de verdad). Tocarlo lo anima en 3D y muestra quién lo dejó.
  const gc = Object.entries(m.giftCounts || {}).sort((a, b) => b[1] - a[1]);
  $('#s-shelf').hidden = !gc.length;
  $('#s-shelf').innerHTML = '';
  for (const [emo, n] of gc.slice(0, 12)) {
    const sp = document.createElement('button');
    sp.type = 'button';
    sp.className = 'shelf-item';
    sp.innerHTML = '<i></i><b></b>';
    sp.querySelector('i').textContent = emo;
    sp.querySelector('b').textContent = `×${n}`;
    sp.title = 'Tocar para ver quién lo dejó';
    sp.onclick = () => inspectShelfGift(m, emo);
    $('#s-shelf').append(sp);
  }
  const gl = m.giftList || [];
  $('#s-gifts').hidden = !gl.length;
  $('#s-gifts').innerHTML = '';
  for (const g of gl.slice(0, 8)) {
    const sp = document.createElement('button');
    sp.type = 'button';
    sp.className = 'gift-chip';
    const [emo, ...rest] = g.gift.split(' ');
    sp.innerHTML = '<i></i>';
    sp.querySelector('i').textContent = emo;
    sp.append(`${rest.join(' ')} · ${g.who}`);
    sp.title = timeAgo(g.at);
    sp.onclick = () => inspectShelfGift(m, emo, g);
    $('#s-gifts').append(sp);
  }
  fillExtras(m);
}

function glowCardHTML(m) {
  const st = stageOf(m.glow || 0);
  const pct = st.next ? Math.round(((m.glow - st.min) / (st.next.min - st.min)) * 100) : 100;
  const next = st.next ? `Faltan ${st.toNext} para ${st.next.icon} ${st.next.name}` : 'Brilla como una constelación ✨';
  return `<span class="big">${st.icon}</span><div style="flex:1"><b>${st.name} · ${m.glow || 0} de Glow</b><small>${next}</small><div class="bar"><i style="width:${pct}%"></i></div></div>`;
}

const dayStamp = () => new Date().toISOString().slice(0, 10);
const didToday = (a, id) => store.get(`huellita.did.${a}.${id}`) === dayStamp();
const markToday = (a, id) => store.set(`huellita.did.${a}.${id}`, dayStamp());

function setCount(sel, n, animate) {
  const el = $(sel);
  const prev = Number(el.textContent);
  el.textContent = n;
  if (animate && n > prev) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
}


function renderGuestbook(list) {
  const ul = $('#gb-list');
  ul.innerHTML = '';
  if (!list) return;
  const hid = hiddenSet('gb');
  const visible = list.filter((e) => !hid.has(e.id));
  if (!visible.length) {
    const li = document.createElement('li');
    li.className = 'gb-empty';
    li.textContent = 'Todavía nadie firmó. ¿Querés ser la primera persona?';
    ul.append(li);
    return;
  }
  const mine = current && isMine(current);
  for (const e of visible) {
    const li = document.createElement('li');
    li.textContent = e.text;
    const s = document.createElement('small');
    s.textContent = `— ${e.name} · ${timeAgo(e.at)}`;
    const acts = document.createElement('span');
    acts.className = 'gb-acts';
    if (mine) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'gb-act';
      del.title = 'Borrar esta firma';
      del.setAttribute('aria-label', 'Borrar esta firma');
      del.textContent = '✕';
      del.onclick = async () => {
        await ownAction('del-gb', { entryId: e.id }, 'Firma borrada');
        if (current) {
          const full = await api.get(current.id).catch(() => null);
          if (full) renderGuestbook(full.guestbook || []);
        }
      };
      acts.append(del);
    }
    const rep = document.createElement('button');
    rep.type = 'button';
    rep.className = 'gb-act';
    rep.title = 'Ocultar o denunciar este mensaje';
    rep.setAttribute('aria-label', 'Ocultar o denunciar este mensaje');
    rep.textContent = '⚑';
    rep.onclick = () => {
      hideItem('gb', e.id);
      if (current) api.report({ kind: 'guestbook', targetId: current.id, subId: e.id, sid: visitor.sid }).catch(() => {});
      renderGuestbook(list);
      toast('Mensaje ocultado 🤍');
    };
    acts.append(rep);
    s.append(acts);
    li.append(s);
    ul.append(li);
  }
}

function updateMemorial(m) {
  const i = memorials.findIndex((x) => x.id === m.id);
  if (i >= 0) memorials[i] = { ...memorials[i], ...m };
  hall?.render(memorials);
  if (current?.id === m.id) {
    current = { ...current, ...m };
    fillSheet(current);
  }
}

function releaseLantern(m, { burst = false } = {}) {
  if (!hall || !lanterns) return;
  const key = hall.memorialKey(m);
  const from = key !== null ? hall.worldPos(key, 0.5) : new THREE.Vector3(HALL_CENTER.x, 7.2, HALL_CENTER.z);
  if (key !== null) {
    // Un poco adelante del marco (de la ofrenda, hacia la entrada; del nicho, hacia el pasillo).
    if (key === 'featured') from.z += 0.6;
    from.y -= 0.35;
    if (burst) lanterns.burst(from.clone());
  }
  lanterns.release(from);
}

$('#s-candle').onclick = async () => {
  if (!current) return;
  // Con la vela ya encendida, el botón invita a pasar la luz.
  if (didToday('c', current.id)) { haptic(10); return shareLinkNow(); }
  const btn = $('#s-candle');
  btn.disabled = true;
  try {
    const via = viaRef();
    const r = await api.candle(current.id, { ...who(), ...(via ? { ref: via } : {}) });
    markToday('c', r.memorial.id);
    $('#s-candle').classList.remove('invite');
    if (via && !r.already) store.set('huellita.via', '');
    updateMemorial(r.memorial);
    if (!r.already) {
      const lit = r.memorial;
      if (!offerGesture(lit, 'candle', (from, to, done) => offerFx.candle(from, to, () => { releaseLantern(lit, { burst: true }); done(); }))) releaseLantern(lit, { burst: true });
      sparkle();
      haptic([10, 40, 16]);
      const own = myPet()?.id === r.memorial.id;
      toast(own ? `🕯️ Encendiste la vela de hoy para ${r.memorial.name}` : `🕯️ Tu luz ya acompaña a ${r.memorial.name}. Mirá el farolito subir.`);
      afterGesture('candle', r, { bonus: r.firstLight ? 5 : 0 });
    } else toast(`🕯️ Tu vela para ${r.memorial.name} sigue encendida. Volvé mañana.`);
  } catch (err) { toast(err.message); }
  btn.disabled = false;
};

$('#s-flower').onclick = async () => {
  if (!current) return;
  try {
    const r = await api.flower(current.id, who());
    markToday('f', r.memorial.id);
    updateMemorial(r.memorial);
    if (r.already) return toast(`🌸 ${r.memorial.name} ya tiene tus flores hoy. Volvé mañana.`);
    tick();
    haptic(10);
    if (!offerGesture(r.memorial, 'flower', (from, to, done) => offerFx.flower(from, to, done))) floatFromCurrent('🌸');
    toast(`🌸 ${r.memorial.name} ya tiene tus flores`);
    afterGesture('flower', r);
  } catch (err) { toast(err.message); }
};

$('#s-share').onclick = () => openShare();

// ---------- recuerdo: la estampita para guardar o compartir ----------
let keepBlob = null;
let keepQr = false;
async function openKeepsake() {
  if (!current) return;
  const m = current;
  $('#keep-img').hidden = true;
  $('#keep-wait').hidden = false;
  $('#keep-save').removeAttribute('href');
  const qrBtn = $('#keep-qr');
  if (qrBtn) {
    qrBtn.setAttribute('aria-pressed', String(keepQr));
    qrBtn.textContent = keepQr ? '📱 Con QR ✓' : '📱 Con QR';
  }
  if (!$('#keepsake').open) $('#keepsake').showModal();
  const dates = [
    m.birthday ? `${fmtDay(m.birthday)}${m.birthYear ? ` de ${m.birthYear}` : ''}` : m.birthYear || '',
    m.passedDay ? `${fmtDay(m.passedDay)}${m.passedYear ? ` de ${m.passedYear}` : ''}` : m.passedYear || '',
  ].filter(Boolean).join('  –  ');
  const years = m.birthYear && m.passedYear ? `${m.passedYear - m.birthYear} años de amor` : '';
  try {
    const c = await drawKeepsake(m, photoSrc(m), { dates, years, link: `${location.host}/h/${m.id}`, qrUrl: keepQr ? shareUrl(m.id) : '' });
    keepBlob = await new Promise((res) => c.toBlob(res, 'image/png'));
    const url = URL.createObjectURL(keepBlob);
    $('#keep-img').src = url;
    $('#keep-img').hidden = false;
    $('#keep-wait').hidden = true;
    $('#keep-save').href = url;
    $('#keep-save').download = `recuerdo-${(m.name || 'huellita').toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-')}.png`;
  } catch { $('#keep-wait').textContent = 'No se pudo pintar la estampita. Probá de nuevo.'; }
}
$('#s-keep').onclick = openKeepsake;
$('#keep-qr').onclick = () => {
  keepQr = !keepQr;
  openKeepsake();
};
$('#keep-share').onclick = async () => {
  if (!keepBlob || !current) return;
  const file = new File([keepBlob], 'recuerdo.png', { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `En memoria de ${current.name}`, text: `Encendé una vela para ${current.name} 🕯️ ${shareUrl(current.id)}` });
    else { $('#keep-save').click(); toast('🖼️ Guardamos la estampita en tu equipo'); }
  } catch { /* el usuario cerró el compartir */ }
};
async function shareLinkNow() {
  if (!current) return;
  const url = shareUrl(current.id, { invite: true, name: shareName() });
  const text = didToday('c', current.id) ? `Encendí una vela por ${current.name} 🕯️ ¿Le encendés una vos también?` : `Encendé una vela por ${current.name} 🕯️`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Encendé una huellita', text, url }); } catch { /* cancelado */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast('💌 Link copiado. Compartilo con quien quieras.');
  } catch {
    prompt('Copiá este link:', url);
  }
};

$('#s-delete').onclick = async () => {
  if (!current || !confirm(`¿Quitar a ${current.name} del muro? No se puede deshacer.`)) return;
  try {
    await api.remove(current.id);
    closeSheet();
    await refresh();
    toast('La huellita fue quitada del muro.');
  } catch (err) { toast(err.message); }
};

$('#s-report').onclick = async () => {
  if (!current || current.featured) return;
  const m = current;
  hideItem('m', m.id);
  api.report({ kind: 'memorial', targetId: m.id, sid: visitor.sid }).catch(() => {});
  closeSheet();
  await refresh().catch(() => {});
  toast('Ocultamos esta huellita en tu equipo y avisamos para revisarla 🤍');
};

const IDEAS = ['Corré libre 🤍', 'Siempre en nuestro corazón', 'Gracias por tanto amor', 'Te mando un abrazo enorme', 'Que brille tu estrella 🌟', 'Nunca te vamos a olvidar', 'Fuiste el mejor compañero'];
function renderIdeas() {
  const box = $('#gb-ideas');
  box.innerHTML = '';
  [...IDEAS].sort(() => Math.random() - 0.5).slice(0, 3).forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.onclick = () => { $('#gb-form').text.value = t; };
    box.append(b);
  });
}
renderIdeas();
$('#gb-form').elements.name.value = store.get('huellita.signName') || '';

$('#gb-form').onsubmit = async (e) => {
  e.preventDefault();
  if (!current) return;
  const f = e.target;
  const text = f.text.value.trim();
  if (!text) return f.text.focus();
  const name = f.elements.name.value.trim();
  if (name) store.set('huellita.signName', name);
  const btn = f.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    const res = await api.sign(current.id, { ...who(), name: name || visitor.name, text });
    afterGesture('words', res);
    f.text.value = '';
    f.text.blur();
    renderIdeas();
    const full = await api.get(current.id);
    current = { ...current, ...full };
    fillSheet(current);
    renderGuestbook(full.guestbook || []);
    haptic(10);
    toast('📖 Gracias. Su familia lo va a leer 🤍');
  } catch (err) { toast(err.message); }
  btn.disabled = false;
};

// ---------- sumar una mascota ----------
let addSlot = null;
let photoData = null;

function openAdd(slot = null) {
  closeModals();
  closeSheet();
  addSlot = slot;
  $('#add-error').hidden = true;
  $('#add-sub').textContent = slot !== null
    ? `Va a quedar en este lugar del muro (piso ${Math.floor(slot / SLOTS_PER_FLOOR) + 1}) para que todos puedan visitarla.`
    : 'Va a quedar en el muro para que todos puedan visitarla.';
  $('#add').showModal();
}
// Sumar sin elegir marco: en el piso donde estás (el primer lugar libre).
function addHere() {
  const f = currentFloor();
  if (f <= 0) return openAdd(null);
  const used = new Set(memorials.filter((m) => floorOf(m) === f).map((m) => m.slot));
  for (let i = 0; i < SLOTS_PER_FLOOR; i++) if (!used.has(f * SLOTS_PER_FLOOR + i)) return openAdd(f * SLOTS_PER_FLOOR + i);
  return openAdd(null);
}
$('#add-btn').onclick = () => addHere();

async function takePhoto(file) {
  if (!file || !file.type.startsWith('image/')) return toast('Elegí una imagen (JPG, PNG o similar).');
  try {
    photoData = await resizePhoto(file, api.mode === 'local' ? 480 : 820);
    $('#photo-preview').src = photoData;
    $('#photo-preview').hidden = false;
    $('#photo-cta').hidden = true;
    $('#photo-change').hidden = false;
  } catch {
    toast('No pudimos leer esa imagen. Probá con otra.');
  }
}
$('#photo-input').onchange = (e) => takePhoto(e.target.files[0]);
{
  const drop = $('#photo-drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('drag'); takePhoto(e.dataTransfer.files[0]); });
}

async function resizePhoto(file, max) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    // Recorte a 4:5 como el marco, un poco hacia arriba (donde suelen estar las caras).
    const ar = 4 / 5;
    let sw = img.width;
    let sh = img.height;
    if (sw / sh > ar) sw = sh * ar; else sh = sw / ar;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) * 0.4;
    const k = Math.min(1, max / sh);
    const c = document.createElement('canvas');
    c.width = Math.round(sw * k);
    c.height = Math.round(sh * k);
    c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.84);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toMMDD = (v) => (v ? v.slice(5) : null);

$('#add-form').onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  const name = f.elements.name.value.trim();
  if (!name) {
    $('#add-error').textContent = 'Contanos su nombre.';
    $('#add-error').hidden = false;
    f.elements.name.focus();
    return;
  }
  const btn = $('#add-submit');
  btn.disabled = true;
  btn.textContent = 'Encendiendo su vela…';
  $('#add-error').hidden = true;
  try {
    const m = await api.create({
      name,
      species: f.species.value,
      birthday: toMMDD(f.birthday.value),
      passedDay: toMMDD(f.passedDay.value),
      message: f.message.value.trim(),
      photo: photoData,
      look: readLook($('#add-look')),
      slot: addSlot ?? undefined,
      visitor: visitor.name,
      pendingGlow: game.pendingGlow,
    });
    // Guardar el número antes de vaciar el banco (si no, el aviso decía "+0 Glow").
    const banked = game.pendingGlow;
    if (banked) setTimeout(() => showGlowToast(`✨ +${banked} Glow · tu Glow guardado ya hace brillar a ${m.name}`), 2600);
    game.clearBank();
    if (!store.get('huellita.myPet')) store.set('huellita.myPet', m.id);
    // Al ponerla en el muro le encendemos su primera vela: cuenta como la vela de hoy.
    setTimeout(() => { game.record('candle', { memorialId: m.id, isOwn: myPet()?.id === m.id, hasPet: true }); updateTodayBadge(); }, 100);
    f.reset();
    lookPicker($('#add-look'));
    photoData = null;
    $('#photo-preview').hidden = true;
    $('#photo-cta').hidden = false;
    $('#photo-change').hidden = true;
    $('#add').close();
    await refresh();
    const fresh = memorials.find((x) => x.id === m.id) || m;
    markToday('c', fresh.id);
    maybeOgCard(fresh, true);
    visit(fresh);
    setTimeout(() => releaseLantern(fresh, { burst: true }), reduced ? 100 : 1600);
    sparkle();
    haptic([10, 50, 10, 50, 20]);
    toast(`🕯️ ${fresh.name} ya tiene su lugar. Le encendimos la primera vela.`);
  } catch (err) {
    $('#add-error').textContent = err.message;
    $('#add-error').hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = '🕯️ Ponerla en el muro';
  }
};

// ---------- lista ----------
let listFilter = 'all';
function openList(filter = 'all') {
  closeModals();
  closeSheet();
  listFilter = filter;
  $('#list-search').value = '';
  renderList();
  $('#list').showModal();
}
function renderList() {
  const q = $('#list-search').value.trim().toLowerCase();
  const titles = { all: 'Todas las huellitas', waiting: 'Esperando una vela', birthday: 'Cumpleaños de hoy' };
  $('#list-title').textContent = titles[listFilter];
  $$('#list-seg button').forEach((b) => b.classList.toggle('on', b.dataset.f === listFilter));
  let list = memorials.slice();
  if (listFilter === 'waiting') list = list.filter((m) => m.candles === 0);
  if (listFilter === 'birthday') list = list.filter(isBirthday);
  if (q) list = list.filter((m) => m.name.toLowerCase().includes(q));
  list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.createdAt - a.createdAt);
  const grid = $('#list-grid');
  grid.innerHTML = '';
  if (!list.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = listFilter === 'waiting' ? 'Todas las huellitas tienen al menos una vela 🤍'
      : listFilter === 'birthday' ? 'Hoy no cumple años ninguna huellita.' : 'No encontramos huellitas con ese nombre.';
    grid.append(p);
    return;
  }
  for (const m of list.slice(0, 300)) {
    const b = document.createElement('button');
    b.className = `card${m.featured ? ' featured-card' : ''}`;
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = '';
    img.src = photoSrc(m);
    const name = document.createElement('b');
    name.textContent = m.name;
    const s = document.createElement('small');
    s.textContent = `🕯️ ${m.candles} · ${m.featured ? 'Centro del salón' : `Piso ${floorOf(m) + 1}`}`;
    b.append(img, name, s);
    b.onclick = () => visit(m);
    grid.append(b);
  }
}
$('#list-search').oninput = renderList;
$$('#list-seg button').forEach((b) => { b.onclick = () => { listFilter = b.dataset.f; renderList(); }; });
$$('[data-list]').forEach((b) => {
  b.onclick = () => {
    b.closest('dialog')?.close();
    openList(b.dataset.list);
  };
});
const visitFeatured = () => { const f = memorials.find((m) => m.featured); if (f) visit(f); };
$$('[data-featured]').forEach((b) => { b.onclick = visitFeatured; });

// ---------- pisos, menú y modales ----------
$('#floors-btn').onclick = () => callElevator();
// Si cerrás la botonera sin elegir piso, tu personaje sale caminando de la cabina.
$('#floors').addEventListener('close', () => {
  if (insideLift) { insideLift = false; leaveLift(true); } else if (!riding) elevator?.setOpen(false);
});
$('#hub-btn').onclick = () => openHub();

// La hoja de menú: todo lo que antes estaba en la barra de abajo, con íconos grandes.
function openHub() {
  closeModals();
  hideHint();
  $('#emote-tray').hidden = true;
  syncMusicBtn();
  updateTodayBadge();
  $('#hub').showModal();
  haptic(6);
}
// Cualquier botón de la hoja la cierra antes de hacer lo suyo (menos la música).
$('#hub').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b && b.id !== 'hub-music') $('#hub').close();
}, true);
$$('#hub [data-then]').forEach((b) => { b.onclick = () => THEN[b.dataset.then]?.(); });
$('#hub-music').onclick = () => $('#music-btn').click();

function openMenu() {
  closeModals();
  $('#opt-music').checked = isMusicOn();
  $('#opt-sounds').checked = isSoundsOn();
  $('#opt-watercolor').checked = watercolorOn();
  $('#opt-watercolor').disabled = !watercolor;
  const q = savedQuality();
  $$('#opt-quality button').forEach((b) => b.classList.toggle('on', b.dataset.q === q));
  $('#menu').showModal();
}
$('#opt-music').onchange = (e) => { setMusic(e.target.checked); syncMusicBtn(); store.set('huellita.music', e.target.checked ? '1' : '0'); };
$('#opt-watercolor').onchange = (e) => {
  store.set('huellita.watercolor', e.target.checked ? '1' : '0');
  if (watercolor) watercolor.amount = e.target.checked ? 1 : 0;
};
$('#opt-sounds').onchange = (e) => { setSounds(e.target.checked); store.set('huellita.sounds', e.target.checked ? '1' : '0'); };
$$('#opt-quality button').forEach((b) => {
  b.onclick = () => {
    if (b.dataset.q === savedQuality()) return;
    saveQuality(b.dataset.q);
    toast('✨ Cambiando la calidad…');
    setTimeout(() => location.reload(), 400);
  };
});

function closeModals() {
  $$('dialog[open]').forEach((d) => d.close());
}
const THEN = {
  guide: () => openGuide(),
  farolillo: () => openFarolillo(),
  comfort: () => openComfort(),
  add: () => openAdd(null),
  featured: visitFeatured,
  help: () => $('#help').showModal(),
  home: () => goHome(),
  floors: () => callElevator(),
  install: () => installPrompt?.prompt(),
  photo: () => photoMode(),
  meadow: () => goMeadow(),
  options: () => openMenu(),
};
$$('dialog [data-close]').forEach((b) => {
  b.onclick = () => {
    b.closest('dialog').close();
    THEN[b.dataset.then]?.();
  };
});
$$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

function goHome() {
  closeSheet();
  closeModals();
  if (!controls) return;
  goFloor(0, true, true);
  teleportPlayer(SPAWN, ENTRY_LOOK);
  controls.follow();
}
$('#brand').onclick = goHome;

let toastTimer;
// `soft`: avisos que no hacen falta mientras caminás (no se muestran si la interfaz está desvanecida).
function toast(text, action = null, soft = false) {
  if (soft && document.body.classList.contains('moving')) return;
  const el = $('#toast');
  el.hidden = true;
  void el.offsetWidth;
  el.textContent = text;
  if (action) {
    const b = document.createElement('button');
    b.textContent = action.label;
    b.onclick = () => { el.hidden = true; action.fn(); };
    el.append(b);
  }
  el.classList.toggle('has-action', !!action);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, action ? 5200 : 3400);
}

let hintTimer;
function hideHint() {
  $('#hint').classList.add('gone');
  clearTimeout(hintTimer);
}
$('#hint-text').textContent = coarse ? 'Deslizá a la derecha para mirar alrededor' : 'Clic en el piso o WASD para caminar · Arrastrá para girar la cámara';

function timeAgo(at) {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return 'ahora mismo';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} días`;
}

// Así te ven los demás: ropa, color, sombrero o corona y peinado.
{
  const HUES = [8, 32, 50, 140, 176, 210, 262, 318];
  const HUE_NAMES = ['Rojo', 'Naranja', 'Amarillo', 'Verde', 'Turquesa', 'Azul', 'Violeta', 'Rosa'];
  const box = $('#me-hues');
  const outfitOf = (h) => Math.floor(Math.max(0, Math.round(h)) / 360) % 4;
  const baseOf = (h) => ((Math.round(h) % 360) + 360) % 360;
  const hatOf = (h) => baseOf(h) % 2 === 1;
  // baseHue % 8: el bit 0 es el sombrero y los bits 1-2 el peinado; floor(hue / 360) % 4 es la ropa.
  const styleOf = (h) => baseOf(h) % 8;
  const hairOf = (h) => Math.floor(styleOf(h) / 2);
  const withStyle = (h, st, out = outfitOf(h)) => out * 360 + (((baseOf(h) - styleOf(h) + st) % 360) + 360) % 360;
  const swapCharacter = (h) => {
    const old = me;
    me = createCharacter({ hue: h, light: tierName !== 'low' });
    me.group.position.copy(old.group.position);
    me.group.rotation.y = old.group.rotation.y;
    old.group.parent?.remove(old.group);
    old.dispose();
    scene.add(me.group);
    spirits?.sparkle(me.group.position.clone().setY(1));
    me.wave();
  };
  const paintChip = () => { $('#me-initial').style.background = `hsl(${baseOf(visitorHue)} 55% 46%)`; };
  paintChip();
  const setHue = (h) => {
    visitorHue = h;
    paintChip();
    store.set('huellita.hue', String(h));
    if (me) swapCharacter(h);
    heartbeat();
  };
  for (const h of HUES) {
    const l = document.createElement('label');
    const i = document.createElement('input');
    i.type = 'radio';
    i.name = 'me-hue';
    i.value = String(h);
    const sp = document.createElement('span');
    sp.className = 'swatch';
    sp.style.setProperty('--c', `hsl(${h} 55% 46%)`);
    sp.setAttribute('aria-label', HUE_NAMES[HUES.indexOf(h)]);
    sp.title = HUE_NAMES[HUES.indexOf(h)];
    l.append(i, sp);
    i.onchange = () => setHue(withStyle(h, styleOf(visitorHue), outfitOf(visitorHue)));
    box.append(l);
  }
  $$('input[name="me-outfit"]').forEach((i) => {
    i.onchange = () => setHue(withStyle(visitorHue, styleOf(visitorHue), Number(i.value)));
  });
  $$('input[name="me-head"]').forEach((i) => {
    i.onchange = () => setHue(withStyle(visitorHue, hairOf(visitorHue) * 2 + (i.value === 'hat' ? 1 : 0)));
  });
  $$('input[name="me-hair"]').forEach((i) => {
    i.onchange = () => setHue(withStyle(visitorHue, Number(i.value) * 2 + (hatOf(visitorHue) ? 1 : 0)));
  });
  $('#me-chip').onclick = () => {
    $('#me-dialog-name').textContent = visitor.name;
    $$('input[name="me-hue"]').forEach((i) => { i.checked = Math.abs(Number(i.value) - (baseOf(visitorHue) - styleOf(visitorHue))) <= 8; });
    $$('input[name="me-outfit"]').forEach((i) => { i.checked = Number(i.value) === outfitOf(visitorHue); });
    $$('input[name="me-head"]').forEach((i) => { i.checked = (i.value === 'hat') === hatOf(visitorHue); });
    $$('input[name="me-hair"]').forEach((i) => { i.checked = Number(i.value) === hairOf(visitorHue); });
    $('#me-dialog').showModal();
  };
}

function syncMusicBtn() {
  $('#music-btn').setAttribute('aria-pressed', String(isMusicOn()));
  $('#hub-music').setAttribute('aria-pressed', String(isMusicOn()));
  $('#hub-music').textContent = isMusicOn() ? '🎵' : '🔇';
}
$('#music-btn').onclick = () => {
  setMusic(!isMusicOn());
  store.set('huellita.music', isMusicOn() ? '1' : '0');
  syncMusicBtn();
  toast(isMusicOn() ? '🎵 Música encendida' : 'Música apagada');
};

// ---------- actividad en vivo ----------
const VERBS = {
  created: (e) => `🤍 ${e.visitor} le dio un lugar a ${e.petName}`,
  candle: (e) => `🕯️ ${e.visitor} encendió una vela por ${e.petName}`,
  flower: (e) => `🌸 ${e.visitor} dejó una flor para ${e.petName}`,
  guestbook: (e) => `📖 ${e.visitor} firmó el libro de ${e.petName}`,
  eternal: (e) => `✨ ${e.visitor} encendió la luz eterna de ${e.petName}`,
  altar: (e) => `🌼 ${e.visitor} puso a ${e.petName} en la ofrenda`,
  diary: (e) => `📖 La familia de ${e.petName} escribió una página en su diario`,
  thanks: (e) => `🤍 La familia de ${e.petName} agradece las velas encendidas`,
  gift: (e) => `🎁 ${e.visitor} le dejó ${e.gift?.split(' ')[0] || 'un regalito'} a ${e.petName}`,
  hug: (e) => `🫂 ${e.visitor} le mandó un abrazo a la familia de ${e.petName}`,
};
const flag = (cc) => (cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0))) : '');
let tickerTimer;
function showTick(e) {
  const box = $('#ticker');
  box.innerHTML = '';
  const b = document.createElement('button');
  b.className = 'tick';
  b.textContent = `${VERBS[e.type]?.({ ...e, visitor: `${e.visitor}${e.country ? ` ${flag(e.country)}` : ''}` }) || ''} `;
  const small = document.createElement('small');
  small.textContent = `· ${timeAgo(e.at)}`;
  b.append(small);
  b.onclick = () => {
    const m = memorials.find((x) => x.id === e.memorialId);
    if (m) visit(m);
  };
  box.append(b);
  clearTimeout(tickerTimer);
  tickerTimer = setTimeout(() => { box.innerHTML = ''; }, 7_000);
}

// Un solo pedido periódico (el "latido"): dice dónde está tu personaje y trae a los demás visitantes
// y lo que pasó desde la última vez. Cada 12 s si estás solo y cada 5 s si hay más gente; nada si la
// pestaña está oculta. Así la base de datos gasta 3 comandos por latido (ver server/store.js).
let firstPoll = true;
let lastFull = Date.now();

// Aplica las novedades sin volver a pedir todas las huellitas (los eventos traen los contadores).
async function applyEvents(list) {
  const fresh = list.filter((e) => e.seq > seq);
  if (!fresh.length) return;
  if (firstPoll) {
    firstPoll = false;
    const last = fresh[fresh.length - 1];
    if (last && Date.now() - last.at < 3 * 3600_000) showTick(last);
    return;
  }
  // Lo que hice yo no me lo avisa (el diario se firma "La familia": es mío si tengo su permiso).
  const others = fresh.filter((e) => e.visitor !== visitor.name && !(e.type === 'diary' && myTokens()[e.memorialId]));
  if (!others.length) return;
  others.forEach((e, i) => setTimeout(() => showTick(e), i * 2600));
  let needFull = false;
  for (const e of others) {
    const m = memorials.find((x) => x.id === e.memorialId);
    if (!m) { needFull = needFull || e.type === 'created'; continue; }
    if (Number.isFinite(e.c)) m.candles = e.c;
    if (Number.isFinite(e.f)) m.flowers = e.f;
    if (e.type === 'guestbook') m.guestbookCount = (m.guestbookCount || 0) + 1;
    if (e.type === 'eternal' || e.type === 'diary') needFull = true;
  }
  if (needFull) await refresh().catch(() => {});
  else {
    hall?.render(memorials);
    renderStats({ memorials: memorials.length, candles: memorials.reduce((a, m) => a + (m.candles || 0), 0), flowers: memorials.reduce((a, m) => a + (m.flowers || 0), 0) });
    if (others.some((e) => e.type === 'altar')) api.altar().then(({ ids }) => hall?.setAltar(ids.map((id) => memorials.find((m) => m.id === id)).filter(Boolean))).catch(() => {});
  }
  for (const e of others) {
    const m = memorials.find((x) => x.id === e.memorialId);
    if (!m) continue;
    if (e.type === 'candle' || e.type === 'created') releaseLantern(m);
    const key = hall && offerFx ? hall.memorialKey(m) : null;
    if (key === null || reduced) continue;
    if (e.type === 'flower') offerFx.petalBurst(hall.offerPos(key, 'flower'), 26);
    else if (e.type === 'gift') { const at = hall.offerPos(key, 'gift'); offerFx.ring(at, [1.8, 1.5, 0.7], 0.4); offerFx.burst(at, [1.8, 1.4, 0.8], 16, 1); }
    else if (e.type === 'hug') { const at = hall.offerPos(key, 'photo'); offerFx.hug(at.clone().add(new THREE.Vector3(0, -0.9, 0)), at); }
  }
  // Si tenés abierta la ficha de esa huellita, se actualiza entera (libro, regalitos).
  if (current && others.some((e) => e.memorialId === current.id)) {
    try {
      const full = await api.get(current.id);
      if (current?.id === full.id) { current = { ...current, ...full }; fillSheet(current); renderGuestbook(full.guestbook || []); }
    } catch { /* se ve igual */ }
  }
}

let pendingGesture = null;
let hbTimer;
async function heartbeat() {
  clearTimeout(hbTimer);
  let next = 12_000;
  if (!document.hidden && api) {
    try {
      const pos = controls?.player.pos || SPAWN;
      const g = pendingGesture;
      pendingGesture = null;
      const r = await api.heartbeat({
        sid: visitor.sid, visitor: visitor.name, hue: visitorHue,
        x: pos.x, z: pos.z, ry: controls?.player.heading ?? 0, fl: currentFloor(), ...(g || {}),
        ...(walking ? { pet: { n: walking.name, sp: walking.species, ...(walking.look || {}) } } : {}),
        since: seq,
      });
      $('#here').textContent = Math.max(1, r.here);
      // Sólo se ven quienes están en tu mismo piso.
      avatars?.update((r.others || []).filter((o) => (o.fl || 0) === currentFloor()));
      spirits?.setRemote(avatars?.list() || []);
      if ((r.others || []).length) next = 5_000;
      if (r.events) await applyEvents(r.events);
      if (Number.isFinite(r.seq)) seq = Math.max(seq, r.seq);
      firstPoll = false;
    } catch { /* reintenta en el próximo latido */ }
  }
  hbTimer = setTimeout(heartbeat, next);
}
// Una recarga completa cada tanto (por si alguien editó o quitó una huellita).
setInterval(() => { if (!document.hidden && api && Date.now() - lastFull > 10 * 60_000) refresh().catch(() => {}); }, 60_000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !api) return;
  heartbeat();
  if (Date.now() - lastFull > 3 * 60_000) refresh().catch(() => {});
});

// ---------- la hora de las velas (21 h) ----------
const candleHourKey = () => `huellita.ch.${new Date().toDateString()}`;
function checkCandleHour() {
  const d = new Date();
  const show = d.getHours() === 21 && d.getMinutes() < 30 && !store.get(candleHourKey());
  $('#candle-hour').hidden = !show;
  if (show && api) {
    api.night().then((n) => {
      const el = $('#candle-hour > div');
      const extra = n.candles ? ` <b>${n.candles} ${n.candles === 1 ? 'vela' : 'velas'}${n.countries > 1 ? ` de ${n.countries} países` : ''} esta noche.</b>` : '';
      el.innerHTML = `<b>🕯️ La hora de las velas.</b> <span class="more">Cada noche a las 21, quienes visitan el jardín encienden una vela al mismo tiempo.</span>${extra}`;
    }).catch(() => {});
  }
}
function dismissCandleHour() {
  $('#candle-hour').hidden = true;
  store.set(candleHourKey(), '1');
}
$('#candle-hour-x').onclick = dismissCandleHour;
$('#candle-hour-btn').onclick = () => {
  dismissCandleHour();
  const waiting = memorials.filter((m) => m.candles === 0);
  const m = waiting.length ? pick(waiting) : memorials.find((x) => x.featured) || pick(memorials);
  if (m) visit(m);
};

// ---------- instalar como app ----------
let installPrompt = null;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  $('#install-item').hidden = false;
});

// ---------- Glow, gestos del día y celebraciones ----------
function showGlowToast(text) {
  const el = $('#glow-toast');
  el.hidden = true;
  void el.offsetWidth;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(showGlowToast.t);
  showGlowToast.t = setTimeout(() => { el.hidden = true; }, 2700);
}

// ---------- gestos en 3D ----------
// Tu personaje se vuelve hacia la ofrenda, extiende los brazos (o se abraza) y el gesto sale de su
// mano hasta el lugar justo: la vela, el jarrito de flores o la repisa de los regalitos.
// Devuelve false si esa huellita no está a la vista (otro piso), para usar el efecto simple.
function offerGesture(m, kind, run) {
  if (!hall || !offerFx || !controls || !m) return false;
  const key = hall.memorialKey(m);
  if (key === null) return false;
  const to = hall.offerPos(key, kind === 'hug' ? 'photo' : kind);
  if (!to) return false;
  const P = controls.player;
  const near = me && P.pos.distanceTo(to) < 10;
  if (near) {
    // Girar despacito hacia el marco.
    const want = Math.atan2(to.x - P.pos.x, to.z - P.pos.z);
    const from0 = P.heading;
    const d = Math.atan2(Math.sin(want - from0), Math.cos(want - from0));
    const t0 = performance.now();
    const turn = () => {
      const k = Math.min(1, (performance.now() - t0) / 280);
      if (!P.moving) P.heading = from0 + d * k;
      if (k < 1) requestAnimationFrame(turn);
    };
    turn();
    if (kind === 'hug') me.hug(); else me.offer();
  }
  const go = () => {
    let from;
    if (near && kind === 'hug') from = P.pos.clone().add(new THREE.Vector3(0, 1.05, 0));
    else if (near) from = me.handWorld(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0));
    else {
      const dir = camera.getWorldDirection(new THREE.Vector3());
      from = camera.position.clone().addScaledVector(dir, 0.9).add(new THREE.Vector3(0, -0.35, 0));
    }
    run(from, to, () => {});
  };
  if (reduced) { offerFx.ring(to, [1.6, 1.1, 0.5], 0.5); return true; }
  setTimeout(go, near ? (kind === 'hug' ? 450 : 420) : 0);
  return true;
}

function floatFromCurrent(ch) {
  if (!avatars || !current || !hall) return;
  const key = hall.memorialKey(current);
  const at = key !== null ? hall.worldPos(key) : controls.player.pos.clone().setY(1.6);
  avatars.floatAt(ch, at.clone().add(new THREE.Vector3(0, -0.2, 0)));
}

// Invitación a llevarla en la pantalla de inicio (como el original, pero a nuestro modo): después
// del primer gesto, una sola vez cada dos semanas. En iPhone explica cómo hacerlo desde Compartir.
function maybeInstallCard() {
  if (maybeInstallCard.done) return;
  maybeInstallCard.done = true;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const until = Number(store.get('huellita.installNo') || 0);
  if (standalone || Date.now() < until) return;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  if (!installPrompt && !ios) return;
  $('#install-hint').textContent = ios && !installPrompt ? 'Tocá Compartir (el cuadrado con la flechita) y después “Agregar a inicio”.' : 'Abrila con un toque, como una app, y volvé a visitarlos cuando quieras.';
  $('#install-yes').hidden = !installPrompt;
  setTimeout(() => { $('#install-card').hidden = false; }, 3500);
}
$('#install-yes').onclick = async () => {
  $('#install-card').hidden = true;
  try { await installPrompt?.prompt(); } catch { /* el navegador no quiso */ }
};
$('#install-no').onclick = () => {
  $('#install-card').hidden = true;
  store.set('huellita.installNo', String(Date.now() + 14 * 86400_000));
};

function afterGesture(kind, r, { bonus = 0 } = {}) {
  maybeInstallCard();
  const target = r.memorial || current;
  const pet = myPet();
  const isOwn = !!pet && target?.id === pet.id;
  const g = r.glow;
  if (g?.gained) {
    const pm = memorials.find((x) => x.id === g.to);
    const before = stageOf((g.total || 0) - g.gained).index;
    if (pm) { pm.glow = g.total; hall?.render(memorials); }
    const after = stageOf(g.total || 0);
    const msg = r.firstLight ? `✨ +${g.gained} Glow · fuiste su primera luz 🤍` : `✨ +${g.gained} Glow · ${pm?.name || 'tu mascota'} brilla un poco más`;
    setTimeout(() => showGlowToast(msg), 700);
    if (after.index > before) {
      setTimeout(() => { confetti(['✨', '⭐', '🤍']); toast(`${after.icon} ¡${pm?.name || 'Tu mascota'} ahora es ${after.name}!`); }, 1500);
    }
  } else if (!pet) {
    const n = game.bank(kind, bonus);
    if (n) setTimeout(() => showGlowToast(`✨ +${n} Glow · guardado para tu mascota`), 700);
  }
  const done = game.record(kind, { memorialId: target?.id, isOwn, isFeatured: !!target?.featured, hasPet: !!pet });
  updateTodayBadge();
  if (done) {
    setTimeout(() => {
      confetti(['🌸', '✨', '🤍', '🕯️', '🐾']);
      haptic([20, 60, 20, 60, 40]);
      sparkle();
      toast('🤍 Completaste los gestos de hoy. Gracias por tanto cariño.');
    }, 1800);
  }
}

function confetti(chars) {
  const box = $('#confetti');
  for (let i = 0; i < 26; i++) {
    const sp = document.createElement('span');
    sp.textContent = pick(chars);
    sp.style.setProperty('--x', `${Math.random() * 100}vw`);
    sp.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
    sp.style.setProperty('--r', `${(Math.random() - 0.5) * 540}deg`);
    sp.style.setProperty('--s', `${16 + Math.random() * 18}px`);
    sp.style.setProperty('--d', `${2.4 + Math.random() * 1.6}s`);
    sp.style.setProperty('--delay', `${Math.random() * 0.5}s`);
    box.append(sp);
    setTimeout(() => sp.remove(), 4800);
  }
}

const todayCtx = () => ({ hasPet: !!myPet(), featuredName: featuredDef?.name || 'Luca' });
function updateTodayBadge() {
  const p = game.progress(todayCtx());
  $$('.today-count').forEach((el) => {
    el.textContent = `${p.done}/${p.total}`;
    el.classList.toggle('full', p.done === p.total);
  });
  const hb = $('#hub-btn');
  hb.style.setProperty('--ring', String(Math.round((p.done / Math.max(1, p.total)) * 100)));
  hb.classList.toggle('full', p.done === p.total);
  hb.classList.toggle('zero', p.done === 0);
  hb.setAttribute('aria-label', `Menú (gestos de hoy: ${p.done} de ${p.total})`);
}

function renderToday() {
  const pet = myPet();
  const box = $('#pet-glow');
  if (pet) {
    const st = stageOf(pet.glow || 0);
    const pct = st.next ? Math.round(((pet.glow - st.min) / (st.next.min - st.min)) * 100) : 100;
    box.innerHTML = `<img alt="" /><div><div class="stage">${st.icon} ${''}</div><small></small><div class="bar"><i style="width:${pct}%"></i></div>
      <div class="stages">${STAGES.map((x, i) => `<span class="${i <= st.index ? 'on' : ''}" title="${x.name}">${x.icon}</span>`).join('')}</div></div>
      <button class="btn soft small" data-go-pet>Visitar a mi mascota</button>`;
    box.querySelector('img').src = photoSrc(pet);
    box.querySelector('.stage').textContent = `${st.icon} ${pet.name} · ${st.name}`;
    box.querySelector('small').textContent = st.next ? `${pet.glow || 0} de Glow · faltan ${st.toNext} para ${st.next.icon} ${st.next.name}` : `${pet.glow} de Glow · brilla como una constelación`;
    box.querySelector('[data-go-pet]').onclick = () => visit(pet);
  } else {
    box.innerHTML = `<div style="font-size:40px;text-align:center">🏮</div><div><div class="stage">Tu Glow te espera</div>
      <small>Tenés ${game.pendingGlow} de Glow guardado. Cuando sumes a tu mascota, la va a hacer brillar.</small></div>
      <button class="btn primary small" data-add-pet>🐾 Sumar a mi mascota</button>`;
    box.querySelector('[data-add-pet]').onclick = () => openAdd(null);
  }
  $('#reach').hidden = !lightReach;
  $('#reach').textContent = `✨ Tu luz llegó a ${lightReach} ${lightReach === 1 ? 'persona' : 'personas'}: encendieron una vela gracias a tus invitaciones.`;
  const st = game.streak;
  const n = st.last ? st.n : 0;
  $('#streak').innerHTML = `<span>🌙</span><span>${n <= 1 ? 'Primera noche en el jardín' : `${n} noches seguidas`}</span><span class="moons">${'●'.repeat(Math.min(7, n))}${'○'.repeat(Math.max(0, 7 - n))}</span>`;
  const ul = $('#missions');
  ul.innerHTML = '';
  for (const mi of game.missions(todayCtx())) {
    const li = document.createElement('li');
    li.className = mi.done ? 'done' : '';
    li.innerHTML = `<span class="ic">${mi.icon}</span><div><b></b>${mi.sub ? '<small></small>' : ''}</div><span class="check">${mi.done ? '✓' : ''}</span>`;
    li.querySelector('b').textContent = mi.label;
    if (mi.sub) li.querySelector('small').textContent = mi.sub;
    if (!mi.done) {
      li.style.cursor = 'pointer';
      li.onclick = () => goMission(mi.id);
    }
    ul.append(li);
  }
  const need = $('#need-light');
  need.innerHTML = '';
  const waiting = needLight();
  if (!waiting.length) {
    need.innerHTML = '<p class="empty-light">Todas las huellitas tienen su vela esta noche 🤍</p>';
  }
  for (const m of waiting) {
    const b = document.createElement('button');
    const img = document.createElement('img');
    img.alt = '';
    img.src = photoSrc(m);
    const nm = document.createElement('b');
    nm.textContent = m.name;
    b.append(img, nm);
    b.onclick = () => visit(m);
    need.append(b);
  }
}

function needLight() {
  const mine = new Set(myMemorials().map((m) => m.id));
  return memorials.filter((m) => !mine.has(m.id) && !didToday('c', m.id))
    .sort((a, b) => a.candles - b.candles || b.createdAt - a.createdAt).slice(0, 12);
}

function goMission(id) {
  $('#today').close();
  const pet = myPet();
  const others = needLight();
  if (id === 'own') return visit(pet || memorials.find((m) => m.featured));
  const target = others[0] || memorials.find((m) => m.featured);
  if (target) visit(target);
  if (id === 'gift') setTimeout(() => openGifts(), 900);
}

$$('[data-today]').forEach((b) => { b.onclick = () => { closeModals(); closeSheet(); renderToday(); $('#today').showModal(); }; });

// ---------- regalitos ----------
let giftTab = 'Comida';
function openGifts() {
  if (!current) return;
  if (didToday('g', current.id)) return toast(`🎁 Ya le dejaste un regalito a ${current.name} hoy. Volvé mañana 🤍`);
  $('#gifts-sub').textContent = `Elegí uno para ${current.name}. Podés dejarle uno por día.`;
  const tabs = $('#gift-tabs');
  tabs.innerHTML = '';
  for (const t of Object.keys(GIFTS)) {
    const b = document.createElement('button');
    b.textContent = t;
    b.className = t === giftTab ? 'on' : '';
    b.onclick = () => { giftTab = t; openGifts(); };
    tabs.append(b);
  }
  const grid = $('#gift-grid');
  grid.innerHTML = '';
  for (const gft of GIFTS[giftTab]) {
    const [emo, ...rest] = gft.split(' ');
    const b = document.createElement('button');
    b.innerHTML = '<i></i><span></span>';
    b.querySelector('i').textContent = emo;
    b.querySelector('span').textContent = rest.join(' ').replace(/^(Un|Una|Unos|Unas) /, '');
    b.onclick = () => leaveGift(gft);
    grid.append(b);
  }
  if (!$('#gifts').open) $('#gifts').showModal();
}
async function leaveGift(gft) {
  $('#gifts').close();
  if (!current) return;
  try {
    const r = await api.gift(current.id, who(), gft);
    markToday('g', r.memorial.id);
    if (r.already) return toast(`🎁 Ya le dejaste un regalito a ${r.memorial.name} hoy. Volvé mañana 🤍`);
    const emo = gft.split(' ')[0];
    const gm = r.memorial;
    const gkey = hall?.memorialKey(gm) ?? null;
    if (gkey !== null) hall.holdGift(gkey, true);
    updateMemorial(r.memorial);
    const full = await api.get(r.memorial.id).catch(() => null);
    if (full && current?.id === full.id) { current = { ...current, ...full }; fillSheet(current); }
    const flew = offerGesture(gm, 'gift', (from, to, done) => offerFx.gift(emo, from, to, hall.giftScale(gkey), () => { hall.holdGift(gkey, false); done(); }));
    if (!flew) { if (gkey !== null) hall.holdGift(gkey, false); floatFromCurrent(emo); }
    tick();
    haptic(12);
    toast(`🎁 ${r.memorial.name} ya tiene tu ${gft.split(' ').slice(2).join(' ') || 'regalito'} 🤍`);
    afterGesture('gift', r);
  } catch (err) { toast(err.message); }
}
$('#s-gift').onclick = openGifts;

$('#s-hug').onclick = async () => {
  if (!current) return;
  try {
    const r = await api.hug(current.id, who());
    markToday('h', r.memorial.id);
    fillSheet(current);
    if (r.already) return toast(`🫂 Ya le mandaste un abrazo a la familia de ${r.memorial.name} hoy 🤍`);
    if (!offerGesture(r.memorial, 'hug', (from, to, done) => { offerFx.hug(from, to); setTimeout(done, 1200); })) floatFromCurrent('🫂');
    haptic([8, 30, 8]);
    toast(`🫂 Tu abrazo en silencio llegó a la familia de ${r.memorial.name}`);
    afterGesture('hug', r);
  } catch (err) { toast(err.message); }
};

$('#s-mine').onclick = () => {
  if (!current) return;
  store.set('huellita.myPet', current.id);
  fillSheet(current);
  updateTodayBadge();
  toast(`🐾 Ahora tus gestos hacen brillar a ${current.name}`);
};

// ---------- frasco de gracias ----------
const JAR_IDEAS = ['esperarme siempre en la puerta', 'cada siesta juntos', 'enseñarme a querer sin condiciones', 'los paseos de la tarde', 'acompañarme en los días tristes'];
async function openJar() {
  closeModals();
  closeSheet();
  const box = $('#jar-notes');
  box.innerHTML = '<p>…</p>';
  const ideas = $('#jar-ideas');
  ideas.innerHTML = '';
  [...JAR_IDEAS].sort(() => Math.random() - 0.5).slice(0, 3).forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `…${t}`;
    b.onclick = () => { $('#jar-form').text.value = t; };
    ideas.append(b);
  });
  $('#jar').showModal();
  try {
    const j = await api.jar();
    cozy?.setJarCount(j.count);
    renderJar(j);
  } catch { box.innerHTML = ''; }
}
function renderJar(j) {
  const box = $('#jar-notes');
  box.innerHTML = '';
  if (!j.notes.length) box.innerHTML = '<p>Todavía está vacío. ¿Ponés la primera estrellita?<small>— el jardín</small></p>';
  for (const n of j.notes.slice(0, 30)) {
    const p = document.createElement('p');
    p.textContent = `Gracias por ${n.text}`;
    const sm = document.createElement('small');
    sm.textContent = `— ${n.who} · ${timeAgo(n.at)}`;
    p.append(sm);
    box.append(p);
  }
  $('#jar-count').textContent = `${j.count} ${j.count === 1 ? 'estrellita' : 'estrellitas'} de gracias`;
}
$('#jar-form').onsubmit = async (e) => {
  e.preventDefault();
  const text = e.target.text.value.trim().replace(/^gracias por\s*/i, '').replace(/^…/, '');
  if (text.length < 3) return;
  try {
    const r = await api.jarAdd(text, visitor.name);
    e.target.reset();
    cozy?.setJarCount(r.count);
    renderJar(await api.jar());
    if (lanterns && cozy) lanterns.burst(cozy.jarWorldPos());
    sparkle();
    haptic(12);
    toast('🫙 Tu gracias ya brilla en el frasco 🤍');
  } catch (err) { toast(err.message); }
};
$$('[data-jar]').forEach((b) => { b.onclick = () => { b.closest('dialog')?.close(); openJar(); }; });

// ---------- gestos y frases en el jardín ----------
{
  const tray = $('#emote-tray');
  const em = $('#emotes');
  for (const e of EMOTES) {
    const b = document.createElement('button');
    b.textContent = e;
    b.onclick = () => gesture({ emote: e });
    em.append(b);
  }
  const sy = $('#sayings');
  for (const t of SAYINGS.filter((x) => x.length > 2)) {
    const b = document.createElement('button');
    b.textContent = t;
    b.onclick = () => gesture({ say: t });
    sy.append(b);
  }
  $('#emote-btn').onclick = () => { tray.hidden = !tray.hidden; haptic(6); };
  canvas.addEventListener('pointerdown', () => { tray.hidden = true; });
  // Atajo: mantener apretado el botón de acción abre siempre los gestos.
  let pressT = 0;
  const act = $('#act-btn');
  act.addEventListener('pointerdown', () => { pressT = setTimeout(() => { pressT = -1; tray.hidden = false; haptic(10); }, 520); });
  const clear = () => { if (pressT > 0) clearTimeout(pressT); };
  act.addEventListener('pointerup', clear);
  act.addEventListener('pointercancel', clear);
  act.addEventListener('pointerleave', clear);
  act.onclick = () => {
    if (pressT === -1) { pressT = 0; return; }
    haptic(8);
    const c = actionNow;
    if (!c || c.kind === 'gestures') { tray.hidden = !tray.hidden; return; }
    tray.hidden = true;
    c.run();
  };
}
function gesture(g) {
  $('#emote-tray').hidden = true;
  pendingGesture = g;
  heartbeat();
  haptic(8);
  if (g.emote && avatars && controls) {
    me?.wave();
    avatars.floatAt(g.emote, controls.player.pos.clone().setY(1.7));
  }
  if (g.say) {
    const d = document.createElement('div');
    d.className = 'self-say';
    d.textContent = `💬 ${g.say}`;
    document.body.append(d);
    setTimeout(() => d.remove(), 3100);
  }
}
$('#opt-quiet').checked = store.get('huellita.quiet') === '1';
$('#opt-quiet').onchange = (e) => {
  store.set('huellita.quiet', e.target.checked ? '1' : '0');
  if (avatars) avatars.visible = !e.target.checked;
  toast(e.target.checked ? '🙈 Modo tranquilo: ahora sólo estás vos.' : 'Volvés a ver a los demás visitantes.');
};

// ---------- palanca invisible (celular) ----------
// La maneja controls.js: acá sólo se dibuja donde apoyaste el pulgar. La primera vez se ve una
// "palanca fantasma" que enseña dónde va el dedo; después de usarla una vez, no aparece más.
function setupStick() {
  const joy = $('#joy');
  const knob = joy.querySelector('i');
  const ghost = $('#joy-ghost');
  const learned = () => store.get('huellita.stick') === '1';
  if (coarse && !learned()) ghost.hidden = false;
  controls.stickZone = (x, y) => {
    if (!coarse || !sheetEl.hidden || document.body.classList.contains('intro') || document.body.classList.contains('photo-mode')) return false;
    const w = innerWidth;
    const h = innerHeight;
    return x < w * (w > h ? 0.42 : 0.5) && y > h * 0.22 && y < h - 30;
  };
  controls.onStick((ev) => {
    if (ev.type === 'start') {
      joy.style.left = `${ev.x}px`;
      joy.style.top = `${ev.y}px`;
      knob.style.setProperty('--jx', '0px');
      knob.style.setProperty('--jy', '0px');
    } else if (ev.type === 'move') {
      if (!joy.classList.contains('on')) {
        joy.classList.add('on');
        hideHint();
        haptic(5);
        if (!learned()) { store.set('huellita.stick', '1'); ghost.hidden = true; }
      }
      joy.style.left = `${ev.x}px`;
      joy.style.top = `${ev.y}px`;
      knob.style.setProperty('--jx', `${ev.dx}px`);
      knob.style.setProperty('--jy', `${ev.dy}px`);
    } else joy.classList.remove('on');
  });
}

// ---------- botón de acción según lo que tengas cerca ----------
// Cada ~0,3 s mira qué hay alrededor de tu personaje y cambia el único botón de acción:
// 🎾 la pelota, 🕯️ un marco, ＋ un lugar libre, 🛗 el ascensor, 🫙 el frasco, 🤍 tu mascota… y si no hay
// nada, 🤍 gestos y frases. Mantenerlo apretado abre siempre los gestos.
let actionNow = null;
let actionKey = '';
let stillFor = 0; // cuánto hace que tu personaje está quieto
const _v = new THREE.Vector3();
function nearestFrame(P) {
  if (!hall) return null;
  let best = null;
  const hx = Math.sin(P.heading);
  const hz = Math.cos(P.heading);
  hall.slots.forEach((s, i) => {
    s.photo.getWorldPosition(_v);
    const dx = _v.x - P.pos.x;
    const dz = _v.z - P.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 5.2) return;
    const facing = (dx * hx + dz * hz) / Math.max(d, 1e-3);
    if (facing < 0.25) return;
    // Mejor el ocupado y a la altura de los ojos; entre iguales, el más cerca y de frente.
    const score = d - facing * 1.6 + (s.memorial ? 0 : 1.2) + Math.max(0, _v.y - 2.2) * 0.35;
    if (!best || score < best.score) best = { i, s, score };
  });
  return best;
}
function startGlide() {
  if (!controls?.glide()) return;
  me?.smile(3);
  haptic(12);
  hideHint();
}
function computeAction() {
  if (!controls || !hall || !introDone) return null;
  const P = controls.player;
  const b = spirits?.ball;
  if (b && !b.held && !b.inAir && P.pos.distanceTo(_v.set(b.pos.x, 0, b.pos.z)) < 2.6) return { kind: 'ball', ic: '🎾', lbl: 'Tirar', key: 'ball', run: throwBall };
  // La ofrenda de la destacada es enorme: se la ofrece desde la entrada del salón si la mirás.
  const fd = Math.hypot(EASEL_POS.x - P.pos.x, EASEL_POS.z - P.pos.z);
  const ff = ((EASEL_POS.x - P.pos.x) * Math.sin(P.heading) + (EASEL_POS.z - P.pos.z) * Math.cos(P.heading)) / Math.max(fd, 1e-3);
  if (hall.featured && hall.floor === 0 && (fd < 6 || (fd < 11.5 && ff > 0.5))) {
    const f = hall.featured;
    return { kind: 'visit', ic: '🕯️', lbl: f.name, key: `f:${f.id}`, run: () => visit(f) };
  }
  const fr = nearestFrame(P);
  if (fr) {
    const m = fr.s.memorial;
    if (m) return { kind: 'visit', ic: '🕯️', lbl: m.name, key: `m:${m.id}`, run: () => visit(m) };
    return { kind: 'add', ic: '＋', lbl: 'Sumar acá', key: `a:${fr.i}`, run: () => openAdd(hall.floor * SLOTS_PER_FLOOR + fr.i) };
  }
  if (elevator && P.pos.distanceTo(elevator.doorPoint(1.2)) < 3.4) return { kind: 'lift', ic: '🛗', lbl: 'Ascensor', key: 'lift', run: callElevator };
  if (currentFloor() === 0 && P.pos.distanceTo(_v.set(JAR_POS.x, 0, JAR_POS.z)) < 3.2) return { kind: 'jar', ic: '🫙', lbl: 'Frasco', key: 'jar', run: () => { clink(); openJar(); } };
  const c = spirits?.companion;
  // Paseando, el botón es la pelota; si te quedás quieto un rato al lado de tu mascota, acariciarla.
  if (c && c.fade > 0.5 && stillFor > 2.5 && P.pos.distanceTo(c.pos) < 2.4) return { kind: 'pet', ic: '🐾', lbl: 'Acariciar', key: 'pet', run: () => { stillFor = 0; tapSpirit(c); } };
  if (walking) return { kind: 'ball', ic: '🎾', lbl: 'Tirar', key: 'ball-w', run: throwBall };
  // En los pisos del cielo, afuera de los pasillos: saltar y planear con el sarape abierto.
  if (currentFloor() > 0 && !inCorridor(P.pos.x, P.pos.z) && !controls.gliding) return { kind: 'glide', ic: '🌬️', lbl: 'Planear', key: 'glide', run: startGlide };
  return { kind: 'gestures', ic: '🤍', lbl: 'Gestos', key: 'g', run: null };
}
function updateAction() {
  const a = computeAction();
  actionNow = a;
  const key = a ? a.key + a.lbl : '';
  if (key === actionKey) return;
  actionKey = key;
  const btn = $('#act-btn');
  if (!a) return;
  $('#act-ic').textContent = a.ic;
  $('#act-lbl').textContent = a.lbl;
  btn.dataset.kind = a.kind;
  btn.setAttribute('aria-label', a.kind === 'visit' ? `Visitar a ${a.lbl}` : a.kind === 'gestures' ? 'Gestos y frases' : a.lbl);
  btn.classList.remove('pop');
  void btn.offsetWidth;
  btn.classList.add('pop');
  // Cuando el botón hace otra cosa, los gestos quedan en una burbujita al lado.
  $('#emote-btn').hidden = a.kind === 'gestures';
}

// ---------- fotos, voz, luz eterna, encuentro, diario y familia ----------
let photoIdx = 0;
let photoList = [];
let voiceAudio = null;
const isMine = (m) => !!myTokens()[m.id] && !m.featured;

function fillExtras(m) {
  // Fotos: tocar la foto pasa a la siguiente.
  const list = [photoSrc(m), ...(m.extraPhotos || [])];
  if (list.join() !== photoList.join()) photoIdx = 0;
  photoList = list;
  $('#s-photo').src = photoList[photoIdx] || photoList[0];
  $('#s-dots').innerHTML = photoList.length > 1 ? photoList.map((_, i) => `<i class="${i === photoIdx ? 'on' : ''}"></i>`).join('') : '';
  $('#s-voice').hidden = !m.voice;
  // Luz eterna. MONETIZAR: pago único (ver MONETIZACION.md).
  const et = $('#s-eternal');
  if (m.eternal) {
    et.innerHTML = '<div><i>🏮</i><span>Su luz eterna brilla para siempre<small></small></span></div>';
    et.querySelector('small').textContent = `Encendida por ${m.eternal.by} · ${timeAgo(m.eternal.at)}`;
  } else {
    et.innerHTML = '<button id="s-eternal-btn"><i>✨</i><span>Encender su luz eterna<small>Un farolito dorado junto a su foto que nunca se apaga</small></span></button>';
    $('#s-eternal-btn').onclick = lightEternal;
  }
  // Encuentro.
  const ga = $('#s-gathering');
  ga.hidden = !m.gathering;
  if (m.gathering) {
    const when = new Date(m.gathering);
    const now = Date.now() >= m.gathering - 15 * 60_000 && Date.now() < m.gathering + 3 * 3600_000;
    const hereCount = Number($('#here')?.textContent) || 1;
    if (now) {
      ga.innerHTML = `<span>🕯️ <b>El encuentro de ${escapeHtml(m.name)} es ahora</b> · ${hereCount} ${hereCount === 1 ? 'persona acompañando' : 'personas acompañando'}</span><button class="btn primary small" id="s-gather-now">🕯️ Encender vela juntos</button>`;
      $('#s-gather-now').onclick = () => {
        if (!didToday('c', m.id)) return $('#s-candle').click();
        releaseLantern(m, { burst: true });
        sparkle();
        haptic([10, 40, 16]);
        toast(`🕯️ Tu vela brilla junto a quienes recuerdan hoy a ${m.name}`);
      };
    } else {
      ga.innerHTML = `<span>🕯️ Encuentro de ${escapeHtml(m.name)} · ${when.toLocaleString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span><button class="btn soft small" id="s-ics">📅 Añadir al calendario</button>`;
      $('#s-ics').onclick = () => downloadIcs(m);
    }
  }
  $('#s-family').hidden = !isMine(m);
  const card = $('#s-card');
  card.hidden = !m.card;
  if (m.card) {
    const img = card.querySelector('img');
    if (img.getAttribute('src') !== m.card.src) { img.src = m.card.src; card.classList.remove('big'); }
    img.alt = m.card.alt || '';
  }
  renderDiary(m);
}

const escapeHtml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

$('#s-card').onclick = () => $('#s-card').classList.toggle('big');

$('#s-photo-box').onclick = () => {
  if (photoList.length < 2) return;
  photoIdx = (photoIdx + 1) % photoList.length;
  $('#s-photo').src = photoList[photoIdx];
  $$('#s-dots i').forEach((d, i) => d.classList.toggle('on', i === photoIdx));
};

$('#s-voice').onclick = () => {
  if (!current?.voice) return;
  voiceAudio?.pause();
  voiceAudio = new Audio(current.voice);
  $('#s-voice').classList.add('playing');
  voiceAudio.onended = () => $('#s-voice').classList.remove('playing');
  voiceAudio.play().catch(() => $('#s-voice').classList.remove('playing'));
};

async function lightEternal() {
  if (!current) return;
  try {
    const r = await api.eternal(current.id, who());
    updateMemorial(r.memorial);
    if (r.already) return toast(`✨ La luz eterna de ${r.memorial.name} ya brilla`);
    releaseLantern(r.memorial, { burst: true });
    confetti(['✨', '🌼', '🏮']);
    sparkle();
    haptic([10, 40, 10, 40, 20]);
    toast(`✨ La luz de ${r.memorial.name} brilla aquí para siempre`);
  } catch (err) { toast(err.message); }
}

function downloadIcs(m) {
  const d = new Date(m.gathering);
  const fmt = (x) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const url = shareUrl(m.id);
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Encende una huellita//ES', 'BEGIN:VEVENT', `UID:${m.id}-${m.gathering}@huellita`,
    `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(d)}`, `DTEND:${fmt(new Date(m.gathering + 3600_000))}`,
    `SUMMARY:Encuentro de ${m.name} 🕯️`, `DESCRIPTION:Encendemos velas juntos por ${m.name}. ${url}`, `URL:${url}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `encuentro-${m.name}.ics`;
  a.click();
}

function renderDiary(m) {
  const ul = $('#diary-list');
  ul.innerHTML = '';
  const pages = m.diary || [];
  $('#s-diary').hidden = !pages.length && !isMine(m);
  $('#s-diary-sub').textContent = pages.length ? `${pages.length} ${pages.length === 1 ? 'página' : 'páginas'} · dejá un corazón 🤍` : 'Escribí la primera página antes de que las pequeñas cosas se desvanezcan.';
  for (const p of pages.slice(0, 30)) {
    const li = document.createElement('li');
    if (p.prompt) {
      const q = document.createElement('span');
      q.className = 'q';
      q.textContent = p.prompt;
      li.append(q);
    }
    li.append(p.text);
    const foot = document.createElement('div');
    foot.className = 'foot';
    const when = document.createElement('span');
    when.textContent = timeAgo(p.at);
    const heart = document.createElement('button');
    heart.textContent = `🤍 ${p.hearts || 0}`;
    heart.onclick = async () => {
      try {
        const r = await api.heartDiary(m.id, p.id, visitor.sid);
        if (r.already) return toast('Ya dejaste un corazón en esta página hoy 🤍');
        heart.textContent = `🤍 ${r.hearts}`;
        haptic(8);
      } catch (err) { toast(err.message); }
    };
    foot.append(when, heart);
    li.append(foot);
    ul.append(li);
  }
}

// Herramientas de la familia.
const TOOLS = {
  edit: () => openEdit(),
  bg: () => openBackgrounds(),
  photos: () => $('#extra-photo-input').click(),
  voice: () => openVoice(),
  diary: () => openDiary(),
  gathering: () => { $('#gathering').showModal(); },
  invite: () => inviteFamily(),
  'gb-toggle': async () => {
    if (!current) return;
    const next = !current.gbClosed;
    await ownAction('edit', { gbClosed: next }, next ? '🔒 Libro de visitas cerrado' : '📖 Libro de visitas abierto');
  },
  altar: async () => {
    try {
      const r = await api.toAltar(current.id, who());
      if (r.already) return toast('🌼 Hoy ya pusiste una huellita en la ofrenda. Volvé mañana.');
      await refresh();
      toast(`🌼 ${current.name} está hoy en la ofrenda del centro del salón`);
      confetti(['🌼', '🕯️']);
    } catch (err) { toast(err.message); }
  },
};
$$('[data-tool]').forEach((b) => { b.onclick = () => current && TOOLS[b.dataset.tool]?.(); });

async function ownAction(what, body, okMsg) {
  try {
    const r = await api.own(current.id, what, body);
    // Mostrar el cambio enseguida con lo que devuelve el servidor; después se completa.
    if (r && r.id === current?.id) { current = { ...current, ...r }; fillSheet(current); }
    await refresh();
    const fresh = memorials.find((x) => x.id === current.id);
    if (fresh) {
      const full = await api.get(fresh.id).catch(() => fresh);
      current = { ...current, ...full };
      fillSheet(current);
    }
    if (okMsg) toast(okMsg);
    return r;
  } catch (err) {
    toast(err.message);
    return null;
  }
}

$('#extra-photo-input').onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file || !current) return;
  const photo = await resizePhoto(file, api.mode === 'local' ? 420 : 720).catch(() => null);
  if (!photo) return toast('No pudimos leer esa imagen.');
  await ownAction('photos', { photo }, '📸 Foto guardada. Tocá su foto para verlas todas.');
};

let editPhoto = null;
function openEdit() {
  const f = $('#edit-form');
  const m = current;
  f.elements.name.value = m.name;
  f.elements.message.value = m.message || '';
  const y = new Date().getFullYear();
  f.elements.birthday.value = m.birthday ? `${y}-${m.birthday}` : '';
  f.elements.passedDay.value = m.passedDay ? `${y}-${m.passedDay}` : '';
  $('#edit-preview').src = photoSrc(m);
  lookPicker($('#edit-look'), m.look || {});
  editPhoto = null;
  $('#edit').showModal();
}
$('#edit-photo').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  editPhoto = await resizePhoto(file, api.mode === 'local' ? 480 : 820).catch(() => null);
  if (editPhoto) $('#edit-preview').src = editPhoto;
};
$('#edit-form').onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = {
    name: f.elements.name.value.trim(),
    message: f.elements.message.value.trim(),
    birthday: toMMDD(f.elements.birthday.value),
    passedDay: toMMDD(f.elements.passedDay.value),
    look: readLook($('#edit-look')),
    ...(editPhoto ? { photo: editPhoto } : {}),
  };
  $('#edit').close();
  await ownAction('edit', body, 'Guardado 🤍');
  if (current) maybeOgCard(current, true);
};

function openBackgrounds() {
  const grid = $('#bg-grid');
  grid.innerHTML = '';
  for (const b of BACKGROUNDS) {
    const btn = document.createElement('button');
    btn.className = (current.bg || 'crema') === b.id ? 'on' : '';
    const img = document.createElement('img');
    img.alt = '';
    img.src = backgroundTexture(b.id).image.toDataURL();
    btn.append(img, b.name);
    // MONETIZAR: fondos especiales (todos menos crema, cempasúchil y noche).
    btn.onclick = async () => {
      $('#bgs').close();
      await ownAction('edit', { bg: b.id }, `🎨 ${b.name}: así se ve su lugar ahora`);
    };
    grid.append(btn);
  }
  $('#bgs').showModal();
}

// Su voz: grabar hasta 10 s o elegir un archivo.
let recorder = null;
let voiceData = null;
let recTimer = null;
function openVoice() {
  voiceData = null;
  $('#voice-save').disabled = true;
  $('#rec-audio').hidden = true;
  $('#voice-del').hidden = !current.voice;
  $('#rec-label').textContent = 'Grabar';
  $('#rec-time').textContent = '0 / 10 s';
  $('#voice').showModal();
}
const blobToDataUrl = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
async function useVoiceBlob(blob) {
  if (blob.size > 600 * 1024) return toast('El sonido es muy largo. Que sea corto (unos 10 segundos).');
  voiceData = await blobToDataUrl(blob);
  $('#rec-audio').src = voiceData;
  $('#rec-audio').hidden = false;
  $('#voice-save').disabled = false;
}
$('#rec-btn').onclick = async () => {
  if (recorder?.state === 'recording') { recorder.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      clearInterval(recTimer);
      stream.getTracks().forEach((t) => t.stop());
      $('#rec-btn').classList.remove('on');
      $('#rec-label').textContent = 'Grabar otra vez';
      useVoiceBlob(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
    };
    recorder.start();
    $('#rec-btn').classList.add('on');
    $('#rec-label').textContent = 'Parar';
    const t0 = Date.now();
    recTimer = setInterval(() => {
      const sec = Math.floor((Date.now() - t0) / 1000);
      $('#rec-time').textContent = `${sec} / 10 s`;
      if (sec >= 10) recorder.stop();
    }, 250);
  } catch {
    toast('Permití el micrófono para grabar.');
  }
};
$('#voice-file').onchange = (e) => { const f = e.target.files[0]; if (f) useVoiceBlob(f); e.target.value = ''; };
$('#voice-save').onclick = async () => {
  if (!voiceData) return;
  $('#voice').close();
  await ownAction('voice', { audio: voiceData.replace(/;codecs=[^;,]+/, (m) => m) }, '🎙️ Su voz quedó guardada. Quien la visite podrá escucharla.');
};
$('#voice-del').onclick = async () => {
  $('#voice').close();
  await ownAction('voice', { audio: null }, 'Listo, quitamos el sonido.');
};

// Diario con preguntas para empezar.
const DIARY_PROMPTS = ['¿Cómo te recibía al llegar a casa?', '¿Dónde le encantaba dormir?', '¿Qué golosina lo volvía loco?', '¿Qué costumbre graciosa tenía?', '¿Cuál era su paseo favorito?',
  '¿Cómo te consolaba cuando estabas triste?', '¿A qué olía?', '¿Cómo fue su primera noche en casa?', '¿Qué apodos le decías?', 'Si pudieras decirle una cosa, ¿qué sería?',
  '¿Qué te enseñó?', '¿Qué pequeño detalle extrañás sin esperarlo?', '¿Cómo eligieron su nombre?', '¿Qué hacía en los días de lluvia?', 'Describí un día perfecto juntos'];
let diaryPrompt = null;
function openDiary() {
  diaryPrompt = null;
  $('#diary-prompt').textContent = '';
  const box = $('#diary-prompts');
  box.innerHTML = '';
  [...DIARY_PROMPTS].sort(() => Math.random() - 0.5).slice(0, 4).forEach((q) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = q;
    b.onclick = () => { diaryPrompt = q; $('#diary-prompt').textContent = q; $('#diary-form').text.focus(); };
    box.append(b);
  });
  $('#diary-form').reset();
  $('#diary').showModal();
}
$('#diary-form').onsubmit = async (e) => {
  e.preventDefault();
  const text = e.target.text.value.trim();
  if (!text) return;
  $('#diary').close();
  await ownAction('diary', { text, prompt: diaryPrompt }, '📖 Guardado en el diario 🤍');
  afterGesture('words', {});
};

$('#gathering-form').onsubmit = async (e) => {
  e.preventDefault();
  const at = new Date(e.target.at.value).getTime();
  if (!at) return;
  $('#gathering').close();
  const r = await ownAction('gathering', { at }, '🕯️ Encuentro listo. Ahora invitá a familia y amigos.');
  if (r) shareLinkNow();
};
$('#gathering-cancel').onclick = async () => {
  $('#gathering').close();
  await ownAction('gathering', { at: null }, 'Encuentro cancelado.');
};

async function inviteFamily() {
  const url = `${location.origin}${location.pathname}#familia/${current.id}/${encodeURIComponent(myTokens()[current.id] || '')}`;
  const text = `Recordemos juntos a ${current.name}. Con este enlace podés cuidar su lugar: sumar fotos, escribir en su diario y más. Es sólo para la familia 🤍`;
  if (navigator.share) {
    try { await navigator.share({ title: `El lugar de ${current.name}`, text, url }); } catch { /* cancelado */ }
    return;
  }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast('Enlace copiado. Envialo sólo a tu familia 🤍'); } catch { prompt('Copiá este enlace y envialo a tu familia:', url); }
}

// Enlace de familia: guarda el token y abre la huellita.
function acceptFamilyLink() {
  const m = location.hash.match(/^#familia\/([\w-]+)\/(.+)$/);
  if (!m) return false;
  const tokens = myTokens();
  tokens[m[1]] = decodeURIComponent(m[2]);
  try { localStorage.setItem('huellita.tokens', JSON.stringify(tokens)); } catch { /* sin storage */ }
  history.replaceState(null, '', `/h/${m[1]}`);
  ARRIVAL.id = m[1];
  setTimeout(() => toast('🧡 Ya podés cuidar su lugar desde este dispositivo'), 1500);
  return true;
}
acceptFamilyLink();

// ---------- farolillo que se va volando ----------
function openFarolillo() {
  $('#farolillo-form').reset();
  const pet = myPet();
  if (pet) $('#farolillo-form').to.value = pet.name;
  $('#farolillo').showModal();
}
$('#farolillo-form').onsubmit = (e) => {
  e.preventDefault();
  const to = e.target.to.value.trim();
  const text = e.target.text.value.trim();
  if (!text) return;
  $('#farolillo').close();
  if (lanterns) {
    const P = controls.player;
    const from = new THREE.Vector3(P.pos.x + Math.sin(P.heading) * 0.6, 1.3, P.pos.z + Math.cos(P.heading) * 0.6);
    const label = `${to ? `${to}: ` : ''}${text}`.slice(0, 60);
    lanterns.release(from, { label, scale: 1.6 });
    lanterns.burst(from.clone());
  }
  sparkle();
  haptic([10, 30, 10]);
  toast('🏮 Tus palabras van en camino');
};

// ---------- palabras de consuelo ----------
let comfortNotes = [];
let comfortIdx = 0;
async function openComfort() {
  $('#comfort').showModal();
  showComfortNote();
  try {
    comfortNotes = (await api.comfort()).notes.sort(() => Math.random() - 0.5);
    comfortIdx = 0;
    showComfortNote();
  } catch { /* nada */ }
}
function showComfortNote() {
  const box = $('#comfort-note');
  const n = comfortNotes[comfortIdx];
  box.textContent = n ? n.text : 'No estás solo. Sabían que eran amados. 🤍';
  const sm = document.createElement('small');
  sm.textContent = n ? `— ${n.who}` : '— el jardín';
  box.append(sm);
}
$('#comfort-next').onclick = () => { if (comfortNotes.length) { comfortIdx = (comfortIdx + 1) % comfortNotes.length; showComfortNote(); } };
$('#comfort-form').onsubmit = async (e) => {
  e.preventDefault();
  const text = e.target.text.value.trim();
  if (!text) return;
  try {
    await api.comfortAdd(text, visitor.name);
    e.target.reset();
    toast('Gracias. Alguien lo va a leer en un día difícil 🤍');
    afterGesture('words', {});
  } catch (err) { toast(err.message); }
};

// ---------- compartir (enlace o imagen para historias) ----------
async function drawShareCard(m) {
  const c = $('#share-preview');
  const g = c.getContext('2d');
  const W = c.width;
  const H = c.height;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1d0f33');
  bg.addColorStop(0.55, '#5a1f63');
  bg.addColorStop(1, '#f07a2a');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // Papel picado arriba.
  for (let i = 0; i < 8; i++) g.drawImage(papelPicadoTexture(PICADO_COLORS[i % 7], i).image, i * 135, 0, 135, 160);
  // Pétalos.
  for (let i = 0; i < 90; i++) {
    g.fillStyle = ['#ff9a1f', '#ffcf3a', '#ff7a1a'][i % 3];
    g.globalAlpha = 0.5 + Math.random() * 0.5;
    g.beginPath();
    g.ellipse(Math.random() * W, 200 + Math.random() * (H - 200), 9, 5, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // Foto en marco dorado.
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = photoSrc(m);
  await new Promise((res) => { img.onload = res; img.onerror = res; setTimeout(res, 3000); });
  const fw = 640;
  const fh = 800;
  const fx = (W - fw) / 2;
  const fy = 330;
  g.fillStyle = '#e0b55d';
  g.fillRect(fx - 26, fy - 26, fw + 52, fh + 52);
  g.fillStyle = '#fbefd9';
  g.fillRect(fx - 10, fy - 10, fw + 20, fh + 20);
  if (img.naturalWidth) {
    const r = Math.max(fw / img.naturalWidth, fh / img.naturalHeight);
    const w = img.naturalWidth * r;
    const h = img.naturalHeight * r;
    g.save();
    g.beginPath();
    g.rect(fx, fy, fw, fh);
    g.clip();
    g.drawImage(img, fx + (fw - w) / 2, fy + (fh - h) / 2, w, h);
    g.restore();
  }
  g.textAlign = 'center';
  g.fillStyle = '#ffe0b0';
  // Fuentes que la página ya carga (antes usaba Lobster, que no se carga, y salía en letra genérica).
  await document.fonts?.load('italic 600 150px "Cormorant Garamond"').catch(() => {});
  g.font = 'italic 600 70px "Cormorant Garamond", Georgia, serif';
  g.fillText('En memoria de', W / 2, 1290);
  g.fillStyle = '#ffffff';
  g.font = 'italic 600 160px "Cormorant Garamond", Georgia, serif';
  g.fillText(m.name, W / 2, 1450, W - 120);
  g.font = '800 52px Nunito, sans-serif';
  g.fillStyle = '#fff3e0';
  g.fillText(`🕯️ ${m.candles} ${m.candles === 1 ? 'vela encendida' : 'velas encendidas'}`, W / 2, 1560);
  g.fillStyle = 'rgba(255,255,255,.92)';
  roundRectPath(g, W / 2 - 330, 1640, 660, 110, 55);
  g.fill();
  g.fillStyle = '#b8326f';
  g.font = '800 46px Nunito, sans-serif';
  g.fillText(`Encendé una vela → ${location.host}`, W / 2, 1712, 620);
  return c;
}
function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
async function openShare() {
  if (!current) return;
  $('#share-sub').textContent = `Ayudá a que más personas recuerden a ${current.name}.`;
  $('#share').showModal();
  await drawShareCard(current);
}
$('#share-link').onclick = () => { $('#share').close(); shareLinkNow(); };
$('#share-image').onclick = async () => {
  const c = $('#share-preview');
  const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
  const file = new File([blob], `${current?.name || 'huellita'}.jpg`, { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: `Encendé una vela por ${current.name} 🕯️ ${shareUrl(current.id, { invite: true, name: shareName() })}` }); } catch { /* cancelado */ }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  toast('Imagen guardada. Publicala en tu historia 📸');
};

// ---------- guía: la sexta etapa ----------
let guideReady = false;
function openGuide(step = 0) {
  closeModals();
  closeSheet();
  const track = $('#guide-track');
  if (!guideReady) {
    renderGuide(track, $('#guide-dots'));
    wireGuideActions();
    track.addEventListener('scroll', () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      $$('#guide-dots button').forEach((d, k) => d.classList.toggle('on', k === i));
    }, { passive: true });
    guideReady = true;
  }
  $('#guide').showModal();
  requestAnimationFrame(() => {
    track.scrollLeft = step * track.clientWidth;
    $$('#guide-dots button').forEach((d, k) => d.classList.toggle('on', k === step));
  });
}
const guideGo = (d) => {
  const track = $('#guide-track');
  const i = Math.max(0, Math.min(GUIDE_STEPS.length - 1, Math.round(track.scrollLeft / track.clientWidth) + d));
  track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
};
$('#guide-prev').onclick = () => guideGo(-1);
$('#guide-next').onclick = () => guideGo(1);
$$('[data-guide]').forEach((b) => { b.onclick = () => openGuide(); });

function wireGuideActions() {
  const btn = (label, cls, fn) => {
    const b = document.createElement('button');
    b.className = `btn ${cls} wide`;
    b.style.marginTop = '0';
    b.textContent = label;
    b.onclick = fn;
    return b;
  };
  for (const box of $$('#guide-track .guide-actions')) {
    const a = box.dataset.action;
    const pet = () => myPet();
    if (a === 'answers') {
      const saved = JSON.parse(store.get('huellita.dondecuando') || '{}');
      box.innerHTML = `<label class="field">¿Dónde está?<input name="donde" maxlength="80" placeholder="del otro lado, conmigo, en el sol de la tarde…" /></label>
        <label class="field">¿Cuándo lo vuelvo a ver?<input name="cuando" maxlength="80" placeholder="el 1 y 2 de noviembre, cada vez que…" /></label>`;
      box.querySelector('[name=donde]').value = saved.donde || '';
      box.querySelector('[name=cuando]').value = saved.cuando || '';
      box.append(btn(pet() ? '📖 Guardarlo en su diario' : '💛 Guardar mis respuestas', 'primary', async () => {
        const donde = box.querySelector('[name=donde]').value.trim();
        const cuando = box.querySelector('[name=cuando]').value.trim();
        if (!donde && !cuando) return toast('Escribí aunque sea una de las dos 🤍');
        store.set('huellita.dondecuando', JSON.stringify({ donde, cuando }));
        const p = pet();
        if (p) {
          try {
            await api.own(p.id, 'diary', { text: `¿Dónde está? ${donde || '…'}\n¿Cuándo lo vuelvo a ver? ${cuando || '…'}`, prompt: 'Las dos preguntas' });
            toast(`📖 Guardado en el diario de ${p.name}`);
          } catch (err) { return toast(err.message); }
        } else toast('💛 Guardado. Tu cabeza ya puede dejar de buscar en el vacío.');
        haptic(10);
        guideGo(1);
      }));
    }
    if (a === 'gift') {
      box.append(btn('🎁 Dejarle su cosa', 'primary', () => {
        const target = pet() || memorials.find((m) => m.featured);
        $('#guide').close();
        if (target) { visit(target); setTimeout(openGifts, 1200); }
      }));
    }
    if (a === 'falto') {
      box.append(btn('🏮 Soltarlo en un farolillo', 'primary', () => { $('#guide').close(); openFarolillo(); }));
      if (pet()) box.append(btn('📖 Escribirlo en su diario', 'soft', () => { $('#guide').close(); visit(pet()); setTimeout(openDiary, 1200); }));
    }
    if (a === 'together') {
      if (pet()) box.append(btn('👨‍👩‍👧 Invitar a la familia', 'primary', () => { current = pet(); inviteFamily(); }));
      box.append(btn('🕯️ Ver a quienes están en el jardín', pet() ? 'soft' : 'primary', () => { $('#guide').close(); goHome(); }));
    }
    if (a === 'bond') {
      box.append(btn('📅 Agendar el 1 y 2 de noviembre', 'primary', () => downloadMuertosIcs()));
    }
    if (a === 'start') {
      box.append(btn(pet() ? `🌼 Visitar a ${pet().name}` : '🌼 Poner su foto en la ofrenda', 'primary', () => {
        $('#guide').close();
        if (pet()) visit(pet()); else openAdd(null);
      }));
    }
  }
}

function downloadMuertosIcs() {
  const y = new Date().getMonth() > 10 || (new Date().getMonth() === 10 && new Date().getDate() > 2) ? new Date().getFullYear() + 1 : new Date().getFullYear();
  const pet = myPet();
  const name = pet ? pet.name : 'quienes extrañamos';
  const url = pet ? shareUrl(pet.id) : `${location.origin}/`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Encende una huellita//ES', 'BEGIN:VEVENT', `UID:muertos-${y}@huellita`,
    `DTSTART;VALUE=DATE:${y}1101`, `DTEND;VALUE=DATE:${y}1103`, 'RRULE:FREQ=YEARLY',
    `SUMMARY:🌼 Día de Muertos: ofrenda para ${name}`, `DESCRIPTION:Poner su foto y su cosa en la ofrenda. Encender una vela: ${url}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'dia-de-muertos.ics';
  a.click();
  toast('📅 Cada 1 y 2 de noviembre, una cita con su ofrenda');
}

// Aviso de temporada: del 20 de octubre al 2 de noviembre.
function checkMuertos() {
  const d = new Date();
  const m = d.getMonth();
  const day = d.getDate();
  const season = (m === 9 && day >= 20) || (m === 10 && day <= 2);
  const key = `huellita.muertos.${d.getFullYear()}`;
  const banner = $('#muertos-banner');
  banner.hidden = !season || !!store.get(key);
  if (!banner.hidden && myPet()) {
    $('#muertos-text').textContent = `Este año, ${myPet().name} está en la ofrenda. Encendele una vela y dejale su cosa.`;
    $('#muertos-add').textContent = `Visitar a ${myPet().name}`;
  }
}
$('#muertos-x').onclick = () => { $('#muertos-banner').hidden = true; store.set(`huellita.muertos.${new Date().getFullYear()}`, '1'); };
$('#muertos-add').onclick = () => {
  $('#muertos-banner').hidden = true;
  store.set(`huellita.muertos.${new Date().getFullYear()}`, '1');
  if (myPet()) visit(myPet()); else openAdd(null);
};


// ---------- modo foto: una polaroid con tu espíritu ----------
let shooting = false;
let lastPhoto = null;
const later = (ms) => new Promise((r) => setTimeout(r, ms));
function grabFrame() {
  return new Promise((res) => {
    // Un cuadro con más resolución para que la foto se vea nítida.
    const prev = renderer.getPixelRatio();
    const want = Math.min(2, Math.max(prev, devicePixelRatio || 1));
    if (want !== prev) pendingRatio = want;
    captureNext = (url) => {
      if (want !== prev) pendingRatio = prev;
      res(url);
    };
  });
}
async function photoMode() {
  if (!renderer || !controls || shooting) return;
  shooting = true;
  closeSheet();
  closeModals();
  $('#emote-tray').hidden = true;
  const P = controls.player;
  let comp = spirits?.companion && spirits.companion.fade > 0.5 ? spirits.companion : null;
  document.body.classList.add('photo-mode');
  if (comp && comp.pos.distanceTo(P.pos) > 1.7) {
    // Primero lo llamás: viene corriendo a tu lado.
    spirits.call();
    for (let i = 0; i < 30 && comp.pos.distanceTo(P.pos) > 1.7; i++) await later(100);
  }
  const center = P.pos.clone();
  if (comp && comp.pos.distanceTo(P.pos) < 2.6) {
    // Se sienta a tu lado y mira a cámara.
    center.lerp(comp.pos, 0.4);
    spirits.cuddle(comp);
  }
  const dist = comp ? 3.4 : 2.8;
  let stand = null;
  for (const off of [0.55, -0.55, 0.95, -0.95, 0]) {
    const a = P.heading + off;
    const s = new THREE.Vector3(center.x + Math.sin(a) * dist, 1.3, center.z + Math.cos(a) * dist);
    if (!controls.blocked(s.x, s.z, 0.25)) { stand = s; break; }
  }
  stand ||= new THREE.Vector3(center.x + Math.sin(P.heading) * dist, 1.4, center.z + Math.cos(P.heading) * dist);
  controls.flyTo(stand, center.clone().setY(0.82), async () => {
    me.wave();
    await later(550);
    $('#flash').hidden = false;
    tick();
    haptic(15);
    const url = await grabFrame();
    setTimeout(() => { $('#flash').hidden = true; }, 500);
    document.body.classList.remove('photo-mode');
    shooting = false;
    controls.follow();
    if (!url) return toast('No pudimos sacar la foto en este navegador.');
    const caption = comp ? `Paseando con ${comp.name} 🐾` : 'En el jardín de las huellitas 🌼';
    const when = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    lastPhoto = { canvas: await polaroid(url, { caption, sub: `${when} · Encendé una huellita` }), name: comp?.name || 'jardin', id: comp?.memorialId || null };
    $('#polaroid-preview').src = lastPhoto.canvas.toDataURL('image/jpeg', 0.9);
    $('#photo-dialog-sub').textContent = comp ? `Un recuerdo de tu paseo con ${comp.name}.` : 'Un recuerdo de tu visita al jardín.';
    $('#photo-dialog').showModal();
  }, { duration: reduced ? 0.3 : 1.1 });
}
async function sharePhoto() {
  if (!lastPhoto) return;
  const blob = await new Promise((res) => lastPhoto.canvas.toBlob(res, 'image/jpeg', 0.92));
  const file = new File([blob], `huellita-${lastPhoto.name}.jpg`, { type: 'image/jpeg' });
  const link = lastPhoto.id ? shareUrl(lastPhoto.id, { invite: true, name: shareName() }) : `${location.origin}/`;
  const text = lastPhoto.id ? `Paseando con ${lastPhoto.name} en el jardín de las huellitas 🐾 ${link}` : `Un jardín para recordar a las mascotas que amamos 🌼 ${link}`;
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); } catch { /* cancelado */ }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  toast('📸 Foto guardada. Subila a tu historia y etiquetá a quien también lo quería.');
}
$('#walk-photo-btn').onclick = photoMode;
$('#photo-btn').onclick = photoMode;
$('#photo-share').onclick = sharePhoto;
$('#photo-again').onclick = () => { $('#photo-dialog').close(); photoMode(); };

// ---------- compartir: Pasá la luz, vista previa y entrada personalizada ----------
// El nombre con el que invito: el que puse al firmar un libro, o mi apodo del jardín.
const shareName = () => store.get('huellita.signName') || visitor.name;

$('#s-pass').onclick = () => { haptic(10); shareLinkNow(); };

// La tarjeta de la vista previa: la arma y la sube quien cuida la huellita (una vez por sesión).
const ogDone = new Set();
function maybeOgCard(m, force = false) {
  if (!m || !isMine(m) || api?.mode !== 'server' || (!force && (m.ogCard || ogDone.has(m.id)))) return;
  ogDone.add(m.id);
  uploadOgCard(api, m, photoSrc(m)).then((r) => {
    if (r?.ogCard) { const x = memorials.find((y) => y.id === m.id); if (x) x.ogCard = r.ogCard; }
  });
}

// "Tu luz llegó a N personas": cuántas velas se encendieron gracias a tus links.
let lightReach = 0;
async function checkReach() {
  if (!api || api.mode !== 'server') return;
  try {
    const { n } = await api.ref(myRef());
    lightReach = n;
    const seen = Number(store.get('huellita.refSeen')) || 0;
    if (n > seen) {
      store.set('huellita.refSeen', String(n));
      setTimeout(() => toast(n - seen === 1 ? '✨ Alguien encendió una vela gracias a tu invitación' : `✨ ${n - seen} personas encendieron una vela gracias a tus invitaciones`), 2600);
    }
  } catch { /* sin datos */ }
}

// Si llegó por el link de una huellita, la entrada la muestra a ella (y a quien invitó).
function personalizeSplash() {
  const m = ARRIVAL.id && memorials.find((x) => x.id === ARRIVAL.id);
  if (!m) return;
  const box = $('#splash-pet');
  box.hidden = false;
  $('#splash-photo').src = photoSrc(m);
  $('#splash-photo').alt = `Foto de ${m.name}`;
  $('#splash-name').textContent = m.name;
  $('#splash-invite').textContent = ARRIVAL.de ? `${ARRIVAL.de} te invita a encenderle una vela` : 'Te espera en el jardín';
  $('#splash-candles').textContent = m.candles > 0 ? `🕯️ ${m.candles.toLocaleString('es-AR')} ${m.candles === 1 ? 'vela encendida' : 'velas encendidas'}` : '';
  $('#splash').classList.add('has-pet');
  $('#enter-label').textContent = `🕯️ Encenderle una vela a ${m.name}`;
}

// ---------- el Prado y el paseo con su espíritu ----------
let walking = null; // la huellita cuyo espíritu te acompaña
const canWalk = (m) => !!renderer && !!m && (m.featured || isMine(m));
const walkHud = $('#walk-hud');

function startWalk(m, { quiet = false } = {}) {
  if (!m || !spirits || !controls) return;
  closeSheet();
  closeModals();
  walking = m;
  store.set('huellita.walking', m.id);
  const key = hall?.memorialKey(m);
  const from = key !== null && key !== undefined ? hall.worldPos(key) : null;
  spirits.setPack(memorials, m.id);
  // Que el espíritu aparezca adelante de donde estás ahora (no de donde estabas en el cuadro anterior).
  spirits.setPlayer(controls.player.pos, controls.player.heading, controls.player.moving, 0.016);
  spirits.walk(m, from);
  walkHud.hidden = false;
  $('#walk-photo').src = photoSrc(m);
  $('#walk-name').textContent = m.name;
  document.body.classList.add('walking');
  hideHint();
  haptic([10, 40, 10]);
  if (!quiet) toast(`✨ ${m.name} viene a tu lado…`);
  heartbeat();
}
function goMeadow() {
  if (!controls) return;
  closeSheet();
  closeModals();
  goFloor(0, true);
  const spot = new THREE.Vector3(MEADOW.x - 5.2, 0, MEADOW.z + 5.2);
  teleportPlayer(spot, MEADOW);
  controls.follow();
  setTimeout(() => toast('🐾 El Prado de los espíritus: acá juegan las huellitas'), 700);
}
function stopWalk() {
  if (!walking) return;
  const name = walking.name;
  walking = null;
  store.set('huellita.walking', '');
  spirits?.walk(null);
  spirits?.setPack(memorials, null);
  walkHud.hidden = true;
  document.body.classList.remove('walking');
  toast(`🌈 ${name} se fue a jugar al Prado. Volvé a buscarlo cuando quieras.`);
  heartbeat();
}
function throwBall() {
  if (!spirits || !controls) return;
  me.throw();
  haptic(8);
  const P = controls.player;
  setTimeout(() => spirits.throwBall(me.handWorld(), P.heading), 230);
}
$('#walk-call').onclick = () => { spirits?.call(); haptic(8); if (walking) toast(`📣 ¡${walking.name}, vení!`); };
$('#walk-stop').onclick = stopWalk;
$('#walk-who').onclick = () => { if (walking) visit(memorials.find((m) => m.id === walking.id) || walking); };
$('#s-walk-act').onclick = () => $('#s-walk').click();
$('#s-walk').onclick = () => {
  if (!current) return;
  if (walking?.id === current.id) stopWalk();
  else startWalk(current);
};

const SPIRIT_LINES = ['mueve la cola de felicidad', 'te mira con ojitos brillantes', 'da un saltito de alegría', 'te quiere invitar a jugar'];
function tapSpirit(a) {
  boop();
  if (!a) return;
  petVoice(a.kind);
  const P0 = controls.player;
  const petting = a.role === 'companion' && P0.pos.distanceTo(a.pos) < 2.2 && !P0.moving;
  if (petting) spirits.cuddle(a); else spirits.poke(a);
  haptic([8, 30, 8]);
  avatars?.floatAt('🤍', a.pos.clone().setY(0.9 * a.s + 0.3));
  if (a.role === 'companion') {
    // Si está cerca, tu personaje se agacha a acariciarlo.
    const P = controls.player;
    if (petting) {
      P.heading = Math.atan2(a.pos.x - P.pos.x, a.pos.z - P.pos.z);
      me.pet();
      return toast(`🤍 Acariciaste a ${a.name}`);
    }
    return toast(`🐾 ${a.name} ${pick(SPIRIT_LINES)}`);
  }
  if (a.role === 'remote') return toast(`🐾 ${a.name} pasea con su familia`);
  const m = a.memorialId && memorials.find((x) => x.id === a.memorialId);
  if (m) toast(`🐾 ${m.name} juega en el Prado de los espíritus`, { label: 'Visitar su lugar', fn: () => visit(m) });
  else toast(a.kind === 'gato' ? '🐱 Un gatito de luz te saluda. Corré libre 🌈' : '🐶 Un perrito de luz mueve la cola. Corré libre 🌈');
}

function wireSpirits() {
  const told = new Set();
  const once = (k, fn) => { if (!told.has(k)) { told.add(k); fn(); } };
  spirits.on('event', (type, a) => {
    if (type === 'bounce') return tick();
    if (!a) return;
    if (type === 'arrived' && a.role === 'companion') {
      sparkle();
      petVoice(a.kind);
      haptic([10, 40, 16]);
      toast(`🐾 ${a.name} está con vos. Caminen juntos por el jardín.`);
      once('tip-ball', () => setTimeout(() => toast('🎾 Tocá la pelota para tirársela'), 4200));
    }
    if (type === 'bridge' && a.role === 'companion') once('bridge', () => toast(`🌈 ${a.name} se asomó a mirar los pececitos de luz`, null, true));
    if (type === 'dropped' && (a.role === 'companion' || a.role === 'joined')) once('drop', () => toast(`🎾 ${a.name} te trajo la pelota. ¡Tirala de nuevo!`));
    if (type === 'dropped' && a.role === 'pack' && a.name) toast(`🎾 ${a.name} te devolvió la pelota`, null, true);
    if (type === 'join') once('join', () => toast(`🐾 ${a.name} se fue a jugar con los del Prado. Cuando camines, vuelve con vos.`));
    if (type === 'greet' && a.name && a.role === 'pack') once(`greet-${a.name}`, () => { petVoice(a.kind); toast(`🐶 ${a.name} vino a saludarte`, null, true); });
  });
}

// Cómo era: pelaje, orejas y tamaño (para que su espíritu se le parezca).
function lookPicker(box, value = {}) {
  box.innerHTML = '';
  const make = (title, name, list, swatch) => {
    const fs = document.createElement('fieldset');
    fs.className = `look-row look-${name}`;
    const lg = document.createElement('legend');
    lg.textContent = title;
    fs.append(lg);
    for (const it of list) {
      const l = document.createElement('label');
      const i = document.createElement('input');
      i.type = 'radio';
      i.name = `look-${name}`;
      i.value = it.id;
      i.checked = value[name] === it.id;
      const sp = document.createElement('span');
      if (swatch) { sp.className = 'swatch'; sp.style.setProperty('--c', it.hex); sp.title = it.name; sp.setAttribute('aria-label', it.name); } else sp.textContent = it.name;
      l.append(i, sp);
      fs.append(l);
    }
    box.append(fs);
  };
  make('Su pelaje', 'fur', FURS, true);
  make('Sus orejas', 'ears', EARS);
  make('Su tamaño', 'size', SIZES);
  make('Su hocico (perros)', 'snout', SNOUTS);
}
function readLook(box) {
  const v = (n) => box.querySelector(`input[name="look-${n}"]:checked`)?.value;
  const out = { fur: v('fur'), ears: v('ears'), size: v('size'), snout: v('snout') };
  return Object.values(out).some(Boolean) ? out : null;
}
lookPicker($('#add-look'));

// ---------- arranque ----------
function openFromHash() {
  const m = location.hash.match(/^#h\/([\w-]+)/) || location.pathname.match(/^\/h\/([\w-]+)/);
  if (!m) return false;
  const mem = memorials.find((x) => x.id === m[1]);
  if (mem) {
    visit(mem);
    // Llegó invitada a encender una vela: el botón la llama.
    if (ARRIVAL.id === mem.id && !didToday('c', mem.id)) setTimeout(() => $('#s-candle').classList.add('invite'), 900);
    return true;
  }
  return false;
}

let introDone = false;
let awayMsg = null;
function finishIntro() {
  if (introDone) return;
  introDone = true;
  document.body.classList.remove('intro');
  // Si la última vez estaban paseando, vuelve a acompañarte.
  const wid = store.get('huellita.walking');
  const wm = wid && memorials.find((m) => m.id === wid);
  if (canWalk(wm) && !walking) setTimeout(() => startWalk(wm, { quiet: true }), 600);
  checkCandleHour();
  if (openFromHash()) return;
  // Sin 3D no tiene sentido explicar cómo caminar: el aviso ya ofrece ver las huellitas.
  if (!store.get('huellita.welcomed') && renderer) {
    store.set('huellita.welcomed', '1');
    setTimeout(() => $('#help').showModal(), 250);
  }
  hintTimer = setTimeout(hideHint, 14_000);
  checkMuertos();
  const st = game.visit();
  setTimeout(() => {
    if (awayMsg) toast(awayMsg);
    else if (st.isNew && st.n > 1) toast(`🌙 ${st.n} noches seguidas visitando el jardín`);
  }, 1200);
}
function skipIntro() {
  if (introDone || !controls) return;
  $('#intro-cap')?.classList.remove('on');
  controls.snapFollow();
  finishIntro();
}

$('#enter').onclick = () => {
  $('#splash').classList.add('out');
  setTimeout(() => $('#splash').remove(), 1500);
  if (store.get('huellita.music') !== '0') setMusic(true);
  if (store.get('huellita.sounds') !== '0') setSounds(true);
  syncMusicBtn();
  if (!renderer || !controls) return finishIntro();
  if (reduced || ARRIVAL.id) {
    controls.snapFollow();
    finishIntro();
    return;
  }
  // La intro, como el comienzo de una película: el cielo con la Vía Láctea y los cometas, la cámara
  // baja sobre el salón con sus farolitos, sigue el camino hasta el río y se da vuelta sobre el
  // puente, a través del arcoíris, hasta quedar detrás tuyo. Tocando la pantalla se saltea.
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  controls.cinematic([
    { pos: V3(10, 26, -30), look: V3(-70, 130, -220) },
    { pos: V3(13, 20, -6), look: V3(-20, 40, -120) },
    { pos: V3(12, 15, 4), look: V3(0, 2, -14) },
    { pos: V3(7, 9, 22), look: V3(0, 2.5, 38) },
    { pos: V3(9, 5.5, 46), look: V3(0, 2.6, 40) },
    { pos: V3(3, 4.2, 56), look: V3(0, 2.2, 38) },
  ], 13, () => controls.follow({ duration: 1.6, done: finishIntro }));
  introCaption('Hay un jardín donde siguen brillando', 1200, 4200);
  introCaption('Cruzá el puente y encendé una luz', 7600, 4200);
};
function introCaption(text, at, dur) {
  setTimeout(() => {
    if (introDone) return;
    const el = $('#intro-cap');
    el.textContent = text;
    el.classList.add('on');
    setTimeout(() => el.classList.remove('on'), dur);
  }, at);
}

document.addEventListener('visibilitychange', () => pauseAll(document.hidden));
addEventListener('huellita:storage-full', () => toast('Este navegador ya no tiene lugar para guardar más (modo demo). Lo nuevo se puede perder al cerrar.'));
addEventListener('hashchange', openFromHash);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheetEl.hidden && !$$('dialog[open]').length) closeSheet(); });

(async () => {
  const label = $('#enter-label');
  try {
    api = await connect({ onProgress: () => { label.textContent = 'Guardando tus recuerdos…'; } });
  } catch (err) {
    $('#splash').classList.add('connection-issue');
    $('#connection-error').hidden = false;
    $('#connection-error').textContent = err.message;
    $('#backup-demo').hidden = false;
    $('#backup-demo').onclick = downloadDemoBackup;
    label.textContent = 'Volver a intentar';
    $('#enter').disabled = false;
    $('#enter').onclick = () => location.reload();
    return;
  }
  const recoveredIds = api.migration?.mapping || {};
  game.remap(recoveredIds);
  if (recoveredIds[ARRIVAL.id]) {
    ARRIVAL.id = recoveredIds[ARRIVAL.id];
    const url = new URL(location.href);
    if (/^\/h\//.test(url.pathname)) url.pathname = `/h/${ARRIVAL.id}`;
    if (url.hash.startsWith('#h/')) url.hash = `#h/${ARRIVAL.id}`;
    history.replaceState(null, '', url);
  }
  if (api.mode === 'local') {
    $('#mode').hidden = false;
    $('#mode').textContent = 'Modo demo · lo que sumes queda en este navegador';
  }
  if (renderer) {
    try {
      await buildScene();
    } catch (err) {
      console.error(err);
      renderer.setAnimationLoop(null);
      renderer = null;
    }
  }
  if (!renderer) {
    $('#nogl').hidden = false;
    document.body.classList.add('no-gl');
  }
  await refresh().catch((err) => toast(err.message));
  label.textContent = 'Entrar al jardín 🕯️';
  personalizeSplash();
  api.night().then((n) => {
    const el = $('#splash-night');
    if (!el) return;
    const total = memorials.reduce((a, m) => a + (m.candles || 0), 0);
    const count = n?.candles || total;
    if (count > 0) {
      el.hidden = false;
      el.textContent = n?.candles
        ? `🕯️ ${n.candles.toLocaleString('es-AR')} ${n.candles === 1 ? 'vela encendida' : 'velas encendidas'} esta noche${n.countries > 1 ? ` · ${n.countries} países` : ''}`
        : `🕯️ ${total.toLocaleString('es-AR')} ${total === 1 ? 'vela encendida' : 'velas encendidas'} en el jardín`;
    }
  }).catch(() => {});
  $('#enter').disabled = false;
  checkReach();
  heartbeat();
  const away = game.whileAway(myMemorials());
  if (away.length) {
    const a = away[0];
    const bits = [];
    if (a.dc) bits.push(`${a.dc} ${a.dc === 1 ? 'vela' : 'velas'}`);
    if (a.df) bits.push(`${a.df} ${a.df === 1 ? 'flor' : 'flores'}`);
    if (a.dg) bits.push(`${a.dg} ${a.dg === 1 ? 'regalito' : 'regalitos'}`);
    if (a.dw) bits.push(`${a.dw} ${a.dw === 1 ? 'palabra amable' : 'palabras amables'}`);
    awayMsg = `🤍 Mientras no estabas, ${a.m.name} recibió ${bits.join(', ').replace(/, ([^,]*)$/, ' y $1')}.`;
  }
  try { cozy?.setJarCount((await api.jar()).count); } catch { /* nada */ }
  setInterval(checkCandleHour, 60_000);
})();
