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
const who = () => ({ visitor: visitor.name, sid: visitor.sid });

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
  if (d.kind === 'slot') return d.local;
  return null;
}

async function buildScene() {
  // Esperar la tipografía para que los carteles del jardín se dibujen con ella.
  await Promise.race([document.fonts?.load('600 40px Lora').catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
  setupRenderer();
  world = buildWorld(scene, tier);
  hall = buildHall(scene, world.colliders, tier);
  lanterns = createLanterns(scene, tier);
  controls = createControls(camera, canvas, world.colliders, { reduced });
  scene.add(controls.marker);
  controls.teleport(INTRO_FROM, INTRO_LOOK);

  controls.onTap((e) => {
    if (document.body.classList.contains('intro')) return skipIntro();
    if (!sheetEl.hidden) { closeSheet(); return; }
    const hit = cast(e, [...hall.pickables(), ...world.walkable]);
    if (!hit) return;
    const key = slotKeyFromHit(hit.object);
    if (key === 'featured') return hall.featured && visit(hall.featured);
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
    const hit = cast(e, hall.pickables());
    const key = hit && hit.distance < 16 ? slotKeyFromHit(hit.object) : null;
    hall.setHover(key);
    canvas.style.cursor = key !== null ? 'pointer' : '';
  });
  controls.onMove(hideHint);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    uTime.value = t;
    controls.update(dt);
    hall.animate(t);
    lanterns.update(dt, t);
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
  if (m.birthday) bits.push(`🎂 ${fmtDay(m.birthday)}`);
  if (m.passedDay) bits.push(`🌈 ${fmtDay(m.passedDay)}`);
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
  const lit = litRecently(m.id);
  $('#s-candle').classList.toggle('lit', lit);
  $('#s-candle-label').textContent = lit ? 'Tu vela está encendida' : 'Encender una vela';
}

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

const litRecently = (id) => Date.now() - Number(store.get(`huellita.lit.${id}`) || 0) < 10 * 60_000;

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
    if (!r.already) store.set(`huellita.lit.${r.memorial.id}`, String(Date.now()));
    updateMemorial(r.memorial);
    if (!r.already) {
      releaseLantern(r.memorial, { burst: true });
      sparkle();
      haptic([10, 40, 16]);
      toast(`🕯️ Encendiste una vela por ${r.memorial.name}. Mirá el farolito subir.`);
    } else toast('🕯️ Tu vela sigue encendida');
  } catch (err) { toast(err.message); }
  btn.disabled = false;
};

$('#s-flower').onclick = async () => {
  if (!current) return;
  try {
    const r = await api.flower(current.id, who());
    updateMemorial(r.memorial);
    tick();
    haptic(10);
    toast(`🌸 Dejaste una flor para ${r.memorial.name}`);
  } catch (err) { toast(err.message); }
};

$('#s-share').onclick = async () => {
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
    await api.sign(current.id, { ...who(), name: name || visitor.name, text });
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
    });
    f.reset();
    photoData = null;
    $('#photo-preview').hidden = true;
    $('#photo-cta').hidden = false;
    $('#photo-change').hidden = true;
    $('#add').close();
    await refresh();
    const fresh = memorials.find((x) => x.id === m.id) || m;
    store.set(`huellita.lit.${fresh.id}`, String(Date.now()));
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
$('#dock-floors').onclick = () => { renderFloors(); $('#floors').showModal(); };
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
  add: () => openAdd(null),
  featured: visitFeatured,
  help: () => $('#help').showModal(),
  home: () => goHome(),
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
};
let tickerTimer;
function showTick(e) {
  const box = $('#ticker');
  box.innerHTML = '';
  const b = document.createElement('button');
  b.className = 'tick';
  b.textContent = `${VERBS[e.type]?.(e) || ''} `;
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

async function heartbeat() {
  if (document.hidden || !api) return;
  try {
    const r = await api.heartbeat(who());
    $('#here').textContent = Math.max(1, r.here);
  } catch { /* nada */ }
}

// ---------- la hora de las velas (21 h) ----------
const candleHourKey = () => `huellita.ch.${new Date().toDateString()}`;
function checkCandleHour() {
  const d = new Date();
  $('#candle-hour').hidden = !(d.getHours() === 21 && d.getMinutes() < 30 && !store.get(candleHourKey()));
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

// ---------- arranque ----------
function openFromHash() {
  const m = location.hash.match(/^#h\/([\w-]+)/);
  if (!m) return false;
  const mem = memorials.find((x) => x.id === m[1]);
  if (mem) { visit(mem); return true; }
  return false;
}

let introDone = false;
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
  setInterval(heartbeat, 25_000);
  setInterval(pollActivity, 8_000);
  setInterval(checkCandleHour, 60_000);
  setTimeout(pollActivity, 1200);
})();
