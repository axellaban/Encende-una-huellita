import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import './styles.css';
import { connect, myTokens } from './api.js';
import { buildWorld, SPAWN, HALL_CENTER, uTime } from './scene/world.js';
import { buildHall, SLOTS_PER_FLOOR, EASEL_POS } from './scene/hall.js';
import { createControls } from './scene/controls.js';
import { createLanterns } from './scene/lanterns.js';
import { createCozy } from './scene/cozy.js';
import { createAvatars } from './scene/avatars.js';
import { createGame } from './game.js';
import { GIFTS, SAYINGS, EMOTES, STAGES, stageOf } from '../server/glow.js';
import { BACKGROUNDS } from '../server/plans.js';
import { papelPicadoTexture, backgroundTexture, PICADO_COLORS } from './scene/muertos.js';

// Tira de papel picado para los bordes de paneles y la entrada (generada una vez).
{
  const c = document.createElement('canvas');
  c.width = 7 * 76;
  c.height = 88;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(60,30,30,.6)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 3);
  g.lineTo(c.width, 3);
  g.stroke();
  PICADO_COLORS.forEach((col, i) => g.drawImage(papelPicadoTexture(col, i).image, i * 76 + 3, 3, 70, 82));
  document.documentElement.style.setProperty('--picado-url', `url(${c.toDataURL()})`);
}
import { portraitCanvas } from './scene/textures.js';
import { setMusic, setSounds, isMusicOn, isSoundsOn, sparkle, tick, pauseAll } from './audio.js';
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
const visitorHue = Number(remember('huellita.hue', () => String(Math.floor(Math.random() * 360))));
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
const INTRO_FROM = new THREE.Vector3(16, 17, 31);
const INTRO_LOOK = new THREE.Vector3(HALL_CENTER.x, 1, HALL_CENTER.z);
const ENTRY_LOOK = new THREE.Vector3(EASEL_POS.x, 1.9, EASEL_POS.z);
camera.position.copy(INTRO_FROM);

let world;
let hall;
let controls;
let lanterns;
let cozy;
let avatars;
let composer = null;
let adaptive = null;

function setupRenderer() {
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  adaptive = createAdaptiveResolution(renderer, (r) => composer?.setPixelRatio(r), { max: tier.maxPixelRatio, min: tierName === 'low' ? 0.7 : 0.85 });
  if (tier.bloom) {
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: tierName === 'high' ? 4 : 2 });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(adaptive.ratio);
    composer.setSize(innerWidth, innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.45, 0.9));
    composer.addPass(new OutputPass());
  }
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer?.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);

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
  cozy = createCozy(scene, tier, world.colliders);
  avatars = createAvatars(scene);
  avatars.visible = store.get('huellita.quiet') !== '1';
  controls = createControls(camera, canvas, world.colliders, { reduced });
  scene.add(controls.marker);
  controls.teleport(INTRO_FROM, INTRO_LOOK);

  controls.onTap((e) => {
    if (document.body.classList.contains('intro')) return skipIntro();
    if (!sheetEl.hidden) { closeSheet(); return; }
    const hit = cast(e, [...hall.pickables(), ...cozy.pickables, ...world.walkable]);
    if (!hit) return;
    if (hit.object.userData.kind === 'jar') return openJar();
    if (hit.object.userData.kind === 'spirit') {
      const sp = cozy.spiritOf(hit.object);
      cozy.hop(sp);
      avatars.floatAt('🤍', sp.group.position.clone().setY(1));
      haptic(10);
      return toast(sp.kind === 'gato' ? '🐱 Un gatito de luz te saluda. Corré libre 🌈' : '🐶 Un perrito de luz mueve la cola. Corré libre 🌈');
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
    const hit = cast(e, [...hall.pickables(), ...cozy.pickables]);
    const key = hit && hit.distance < 16 ? slotKeyFromHit(hit.object) : null;
    hall.setHover(key);
    canvas.style.cursor = hit && hit.distance < 16 && (key !== null || hit.object.userData.kind) ? 'pointer' : '';
  });
  controls.onMove(hideHint);
  if (new URLSearchParams(location.search).has('debug')) window.__huellita = { controls, camera, THREE };

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    uTime.value = t;
    controls.update(dt);
    hall.animate(t);
    lanterns.update(dt, t);
    cozy.animate(t, dt);
    avatars.animate(dt, t);
    if (composer) composer.render(dt);
    else renderer.render(scene, camera);
    adaptive.tick(dt);
  });
  // Compilar los shaders antes de entrar evita tirones en el primer movimiento.
  try { await renderer.compileAsync(scene, camera); } catch { /* algunos navegadores no lo soportan */ }
}

// ---------- datos ----------
let api;
let memorials = [];
let seq = 0;

async function refresh() {
  const r = await api.list();
  memorials = r.memorials;
  hall?.render(memorials);
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

function renderFloors() {
  const maxFloor = memorials.reduce((a, m) => Math.max(a, floorOf(m)), 0);
  const total = maxFloor + 2; // siempre hay un piso nuevo con lugar
  const list = $('#floor-list');
  list.innerHTML = '';
  for (let f = 0; f < total; f++) {
    const n = memorials.filter((m) => floorOf(m) === f).length;
    const b = document.createElement('button');
    b.className = f === currentFloor() ? 'on' : '';
    b.innerHTML = `<span>Piso ${f + 1}</span><span class="bar"><i style="width:${Math.round((n / SLOTS_PER_FLOOR) * 100)}%"></i></span><small>${n} / ${SLOTS_PER_FLOOR}</small>`;
    b.onclick = () => { $('#floors').close(); goFloor(f); };
    list.append(b);
  }
  $$('.floor-num').forEach((el) => { el.textContent = currentFloor() + 1; });
}

function goFloor(f, quiet = false) {
  if (!hall || f === hall.floor) return;
  hall.setFloor(f, memorials);
  renderFloors();
  if (!quiet) toast(`🛗 Llegaste al piso ${f + 1}`);
}

// ---------- visitar ----------
let current = null;

function visit(m) {
  closeModals();
  if (hall && controls) {
    const key = m.slot < 0 ? 'featured' : m.slot % SLOTS_PER_FLOOR;
    if (m.slot >= 0) goFloor(floorOf(m), true);
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
    controls.flyTo(stand, target, () => hall.pulse(key));
  }
  openSheet(m);
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
  history.replaceState(null, '', `#h/${m.id}`);
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
  document.body.classList.remove('sheet-open');
  history.replaceState(null, '', location.pathname + location.search);
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

function fillSheet(m) {
  $('#s-photo').src = photoSrc(m);
  $('#s-photo').alt = `Foto de ${m.name}`;
  $('.sheet-photo').classList.toggle('gold', !!m.featured || m.candles >= 20);
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
  $('#s-delete').hidden = !myTokens()[m.id];
  const lit = didToday('c', m.id);
  $('#s-candle').classList.toggle('lit', lit);
  $('#s-candle-label').textContent = lit ? 'Tu vela está encendida · volvé mañana' : 'Encender una vela';
  $('#s-flower').classList.toggle('done', didToday('f', m.id));
  $('#s-gift').classList.toggle('done', didToday('g', m.id));
  $('#s-hug').classList.toggle('done', didToday('h', m.id));
  // Glow: sólo en mis mascotas.
  const mine = !!myTokens()[m.id] && !m.featured;
  const pet = myPet();
  $('#s-glow').hidden = !mine;
  if (mine) $('#s-glow').innerHTML = glowCardHTML(m);
  $('#s-mine').hidden = !(mine && pet && pet.id !== m.id);
  const gl = m.giftList || [];
  $('#s-gifts').hidden = !gl.length;
  $('#s-gifts').innerHTML = '';
  for (const g of gl.slice(0, 8)) {
    const sp = document.createElement('span');
    const [emo, ...rest] = g.gift.split(' ');
    sp.innerHTML = '<i></i>';
    sp.querySelector('i').textContent = emo;
    sp.append(`${rest.join(' ')} · ${g.who}`);
    sp.title = timeAgo(g.at);
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
  if (list && !list.length) {
    const li = document.createElement('li');
    li.className = 'gb-empty';
    li.textContent = 'Todavía nadie firmó. ¿Querés ser la primera persona?';
    ul.append(li);
    return;
  }
  for (const e of list || []) {
    const li = document.createElement('li');
    li.textContent = e.text;
    const s = document.createElement('small');
    s.textContent = `— ${e.name} · ${timeAgo(e.at)}`;
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
  const key = m.slot < 0 ? 'featured' : floorOf(m) === hall.floor ? m.slot % SLOTS_PER_FLOOR : null;
  const from = key !== null ? hall.worldPos(key) : new THREE.Vector3(HALL_CENTER.x, 7.2, HALL_CENTER.z);
  if (key !== null) {
    // Un poco hacia adelante del marco, hacia el centro del salón.
    const toCenter = new THREE.Vector3(HALL_CENTER.x - from.x, 0, HALL_CENTER.z - from.z).normalize();
    from.addScaledVector(toCenter, key === 'featured' ? -0.6 : 0.5);
    from.y -= 0.35;
    if (burst) lanterns.burst(from.clone());
  }
  lanterns.release(from);
}

$('#s-candle').onclick = async () => {
  if (!current) return;
  const btn = $('#s-candle');
  btn.disabled = true;
  try {
    const r = await api.candle(current.id, who());
    markToday('c', r.memorial.id);
    updateMemorial(r.memorial);
    if (!r.already) {
      releaseLantern(r.memorial, { burst: true });
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
    floatFromCurrent('🌸');
    toast(`🌸 ${r.memorial.name} ya tiene tus flores`);
    afterGesture('flower', r);
  } catch (err) { toast(err.message); }
};

$('#s-share').onclick = () => openShare();
async function shareLinkNow() {
  if (!current) return;
  const url = `${location.origin}${location.pathname}#h/${current.id}`;
  const text = `Encendé una vela por ${current.name} 🕯️`;
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
$('#add-btn').onclick = () => openAdd(null);
$('#dock-add').onclick = () => { haptic(8); openAdd(null); };

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
      slot: addSlot ?? undefined,
      visitor: visitor.name,
      pendingGlow: game.pendingGlow,
    });
    if (game.pendingGlow) setTimeout(() => showGlowToast(`✨ +${game.pendingGlow} Glow · tu Glow guardado ya hace brillar a ${m.name}`), 2600);
    game.clearBank();
    if (!store.get('huellita.myPet')) store.set('huellita.myPet', m.id);
    // Al ponerla en el muro le encendemos su primera vela: cuenta como la vela de hoy.
    setTimeout(() => { game.record('candle', { memorialId: m.id, isOwn: myPet()?.id === m.id, hasPet: true }); updateTodayBadge(); }, 100);
    f.reset();
    photoData = null;
    $('#photo-preview').hidden = true;
    $('#photo-cta').hidden = false;
    $('#photo-change').hidden = true;
    $('#add').close();
    await refresh();
    const fresh = memorials.find((x) => x.id === m.id) || m;
    markToday('c', fresh.id);
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
$('#floors-btn').onclick = () => { renderFloors(); $('#floors').showModal(); };
$('#dock-menu').onclick = () => openMenu();
$('#menu-btn').onclick = () => openMenu();

function openMenu() {
  closeModals();
  $('#opt-music').checked = isMusicOn();
  $('#opt-sounds').checked = isSoundsOn();
  const q = savedQuality();
  $$('#opt-quality button').forEach((b) => b.classList.toggle('on', b.dataset.q === q));
  $('#menu').showModal();
}
$('#opt-music').onchange = (e) => { setMusic(e.target.checked); syncMusicBtn(); store.set('huellita.music', e.target.checked ? '1' : '0'); };
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
  farolillo: () => openFarolillo(),
  comfort: () => openComfort(),
  add: () => openAdd(null),
  featured: visitFeatured,
  help: () => $('#help').showModal(),
  home: () => goHome(),
  floors: () => { renderFloors(); $('#floors').showModal(); },
  install: () => installPrompt?.prompt(),
};
$$('dialog [data-close]').forEach((b) => {
  b.onclick = () => {
    b.closest('dialog').close();
    THEN[b.dataset.then]?.();
  };
});
$$('#menu .menu-item[data-then]').forEach((b) => { b.onclick = () => { $('#menu').close(); THEN[b.dataset.then]?.(); }; });
$$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

function goHome() {
  closeSheet();
  closeModals();
  if (!controls) return;
  goFloor(0, true);
  controls.flyTo(SPAWN.clone(), ENTRY_LOOK);
}
$('#brand').onclick = goHome;

let toastTimer;
function toast(text) {
  const el = $('#toast');
  el.hidden = true;
  void el.offsetWidth;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3400);
}

let hintTimer;
function hideHint() {
  $('#hint').classList.add('gone');
  clearTimeout(hintTimer);
}
$('#hint-text').textContent = coarse ? 'Tocá el piso para caminar · Deslizá para mirar' : 'Clic en el piso para caminar · Arrastrá para mirar';

function timeAgo(at) {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return 'ahora mismo';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} días`;
}

$('#me-chip').onclick = () => toast(`Así te ven los demás: ${visitor.name} 🤍`);

function syncMusicBtn() {
  $('#music-btn').setAttribute('aria-pressed', String(isMusicOn()));
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
  tickerTimer = setTimeout(() => { box.innerHTML = ''; }, 12_000);
}

let firstPoll = true;
async function pollActivity() {
  if (document.hidden || !api) return;
  try {
    const r = await api.activity(seq);
    $('#here').textContent = Math.max(1, r.here);
    if (firstPoll) {
      firstPoll = false;
      const last = r.events[r.events.length - 1];
      if (last && Date.now() - last.at < 3 * 3600_000) showTick(last);
    } else if (r.events.length) {
      const others = r.events.filter((e) => e.visitor !== visitor.name);
      others.forEach((e, i) => setTimeout(() => showTick(e), i * 2600));
      if (others.length) {
        await refresh();
        for (const e of others) {
          if (e.type !== 'candle' && e.type !== 'created') continue;
          const m = memorials.find((x) => x.id === e.memorialId);
          if (m) releaseLantern(m);
        }
        if (current) {
          const m = memorials.find((x) => x.id === current.id);
          if (m) updateMemorial(m);
        }
      }
    }
    seq = r.seq;
  } catch { /* reintenta en el próximo ciclo */ }
}

let pendingGesture = null;
let hbTimer;
async function heartbeat() {
  clearTimeout(hbTimer);
  let next = 10_000;
  if (!document.hidden && api) {
    try {
      const pos = camera.position;
      const g = pendingGesture;
      pendingGesture = null;
      const r = await api.heartbeat({
        sid: visitor.sid, visitor: visitor.name, hue: visitorHue,
        x: pos.x, z: pos.z, ry: controls?.yaw ?? 0, ...(g || {}),
      });
      $('#here').textContent = Math.max(1, r.here);
      avatars?.update(r.others || []);
      if ((r.others || []).length) next = 4_000;
    } catch { /* nada */ }
  }
  hbTimer = setTimeout(heartbeat, next);
}

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
      el.innerHTML = `<b>🕯️ La hora de las velas.</b> Cada noche a las 21, quienes visitan el jardín encienden una vela al mismo tiempo.${extra}`;
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

function floatFromCurrent(ch) {
  if (!avatars || !current || !hall) return;
  const key = hall.memorialKey(current);
  const at = key !== null ? hall.worldPos(key) : camera.position.clone();
  avatars.floatAt(ch, at.clone().add(new THREE.Vector3(0, -0.2, 0)));
}

function afterGesture(kind, r, { bonus = 0 } = {}) {
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
    updateMemorial(r.memorial);
    const full = await api.get(r.memorial.id).catch(() => null);
    if (full && current?.id === full.id) { current = { ...current, ...full }; fillSheet(current); }
    floatFromCurrent(gft.split(' ')[0]);
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
    floatFromCurrent('🫂');
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
}
function gesture(g) {
  $('#emote-tray').hidden = true;
  pendingGesture = g;
  heartbeat();
  haptic(8);
  if (g.emote && avatars) {
    const fwd = new THREE.Vector3(0, -0.3, -2.2).applyQuaternion(camera.quaternion).add(camera.position);
    avatars.floatAt(g.emote, fwd);
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

// ---------- palanca para caminar (celular) ----------
{
  const joy = $('#joy');
  const knob = joy.querySelector('i');
  let id = null;
  const R = 40;
  const setKnob = (x, y) => { knob.style.setProperty('--jx', `${x}px`); knob.style.setProperty('--jy', `${y}px`); };
  const move = (e) => {
    const r = joy.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setKnob(dx, dy);
    controls?.setJoystick(dx / R, dy / R);
  };
  joy.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    joy.setPointerCapture(id);
    joy.classList.add('active');
    hideHint();
    haptic(5);
    move(e);
  });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    joy.classList.remove('active');
    setKnob(0, 0);
    controls?.setJoystick(0, 0);
  };
  joy.addEventListener('pointerup', end);
  joy.addEventListener('pointercancel', end);
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
    const now = Date.now() >= m.gathering && Date.now() < m.gathering + 3 * 3600_000;
    ga.innerHTML = `<span>🕯️ ${now ? `El encuentro de ${escapeHtml(m.name)} es ahora` : `Encuentro de ${escapeHtml(m.name)} · ${when.toLocaleString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`}</span><button class="btn soft small" id="s-ics">📅 Añadir al calendario</button>`;
    $('#s-ics').onclick = () => downloadIcs(m);
  }
  $('#s-family').hidden = !isMine(m);
  renderDiary(m);
}

const escapeHtml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

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
  const url = `${location.origin}/#h/${m.id}`;
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
    ...(editPhoto ? { photo: editPhoto } : {}),
  };
  $('#edit').close();
  await ownAction('edit', body, 'Guardado 🤍');
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
  history.replaceState(null, '', `#h/${m[1]}`);
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
    const from = new THREE.Vector3(0, -0.4, -2.4).applyQuaternion(camera.quaternion).add(camera.position);
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
  g.font = '64px Lobster, cursive';
  g.fillText('En memoria de', W / 2, 1290);
  g.fillStyle = '#ffffff';
  g.font = '150px Lobster, cursive';
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
    try { await navigator.share({ files: [file], text: `Encendé una vela por ${current.name} 🕯️ ${location.origin}/#h/${current.id}` }); } catch { /* cancelado */ }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  toast('Imagen guardada. Publicala en tu historia 📸');
};

// ---------- arranque ----------
function openFromHash() {
  const m = location.hash.match(/^#h\/([\w-]+)/);
  if (!m) return false;
  const mem = memorials.find((x) => x.id === m[1]);
  if (mem) { visit(mem); return true; }
  return false;
}

let introDone = false;
let awayMsg = null;
function finishIntro() {
  if (introDone) return;
  introDone = true;
  document.body.classList.remove('intro');
  checkCandleHour();
  if (openFromHash()) return;
  if (!store.get('huellita.welcomed')) {
    store.set('huellita.welcomed', '1');
    setTimeout(() => $('#help').showModal(), 250);
  }
  hintTimer = setTimeout(hideHint, 14_000);
  const st = game.visit();
  setTimeout(() => {
    if (awayMsg) toast(awayMsg);
    else if (st.isNew && st.n > 1) toast(`🌙 ${st.n} noches seguidas visitando el jardín`);
  }, 1200);
}
function skipIntro() {
  if (introDone || !controls) return;
  controls.teleport(SPAWN, ENTRY_LOOK);
  finishIntro();
}

$('#enter').onclick = () => {
  $('#splash').classList.add('out');
  setTimeout(() => $('#splash').remove(), 1500);
  if (store.get('huellita.music') !== '0') setMusic(true);
  if (store.get('huellita.sounds') !== '0') setSounds(true);
  syncMusicBtn();
  if (!renderer || !controls) return finishIntro();
  if (reduced || location.hash.startsWith('#h/')) {
    controls.teleport(SPAWN, ENTRY_LOOK);
    finishIntro();
    return;
  }
  controls.flyTo(SPAWN, ENTRY_LOOK, finishIntro, {
    duration: 5.2,
    path: [new THREE.Vector3(9, 11, 33), new THREE.Vector3(2, 4.5, 29)],
  });
};

document.addEventListener('visibilitychange', () => pauseAll(document.hidden));
addEventListener('hashchange', openFromHash);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheetEl.hidden && !$$('dialog[open]').length) closeSheet(); });

(async () => {
  const label = $('#enter-label');
  api = await connect();
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
  if (!renderer) $('#nogl').hidden = false;
  await refresh().catch((err) => toast(err.message));
  label.textContent = 'Entrar al jardín 🕯️';
  $('#enter').disabled = false;
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
  setInterval(pollActivity, 8_000);
  setInterval(checkCandleHour, 60_000);
  setTimeout(pollActivity, 1200);
})();
