import * as THREE from 'three';
import './styles.css';
import { connect, myTokens } from './api.js';
import { buildWorld, SPAWN } from './scene/world.js';
import { buildHall, SLOTS_PER_FLOOR } from './scene/hall.js';
import { createControls } from './scene/controls.js';
import { portraitCanvas } from './scene/textures.js';
import { setMusic, musicOn, sparkle } from './audio.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// ---------- quién visita ----------
const ADJ = ['Suave', 'Serena', 'Tibia', 'Estrellada', 'Tranquila', 'Dorada', 'Clara', 'Calma', 'Lunar', 'Dulce'];
const NOUN = ['Brisa', 'Luz', 'Nube', 'Lluvia', 'Hoja', 'Flor', 'Estrella', 'Luciérnaga', 'Pluma', 'Calandria', 'Margarita', 'Aurora'];
function store(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v) return v;
    localStorage.setItem(key, fallback);
  } catch { /* sin storage */ }
  return fallback;
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const visitor = {
  sid: store('huellita.sid', Math.random().toString(36).slice(2) + Date.now().toString(36)),
  name: store('huellita.name', `${pick(NOUN)} ${pick(ADJ)}`),
};
$('#me-name').textContent = visitor.name;
$('#me-initial').textContent = visitor.name[0];
const who = () => ({ visitor: visitor.name, sid: visitor.sid });

// ---------- escena ----------
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.05, 900);
camera.position.copy(SPAWN);

const world = buildWorld(scene);
const hall = buildHall(scene, world.colliders);
const controls = createControls(camera, canvas, world.colliders);
scene.add(controls.marker);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function cast(e, objects) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObjects(objects, false)[0] || null;
}

controls.onTap((e) => {
  if (!$('#sheet').hidden) closeSheet();
  const hit = cast(e, [...hall.pickables(), ...world.walkable]);
  if (!hit) return;
  if (hit.object.userData.kind === 'slot') {
    const { local } = hit.object.userData;
    const m = hall.slots[local].memorial;
    if (m) visit(m);
    else openAdd(hall.floor * SLOTS_PER_FLOOR + local);
    return;
  }
  controls.walkTo(hit.point);
  hideHint();
});

controls.onHover((e) => {
  const hit = cast(e, hall.pickables());
  const local = hit && hit.distance < 14 ? hit.object.userData.local : null;
  hall.setHover(local);
  canvas.style.cursor = local !== null ? 'pointer' : 'grab';
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  controls.update(dt);
  world.animated.forEach((fn) => fn(t));
  hall.animate(t);
  renderer.render(scene, camera);
});

// ---------- datos ----------
let api;
let memorials = [];
let seq = 0;

async function refresh() {
  const r = await api.list();
  memorials = r.memorials;
  hall.render(memorials);
  renderStats(r.stats);
  renderBirthdays();
  renderFloors();
  return r;
}

function renderStats(s) {
  $('#stats').textContent = `${s.memorials.toLocaleString('es-AR')} huellitas recordadas · ${s.candles.toLocaleString('es-AR')} velas encendidas`;
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
  el.textContent = list.length === 1
    ? `🎂 Hoy es el cumpleaños de ${list[0].name}`
    : `🎂 Hoy es el cumpleaños de ${list[0].name} y ${list.length - 1} más`;
  el.onclick = () => (list.length === 1 ? visit(list[0]) : openList('birthday'));
}

function renderFloors() {
  const maxSlot = memorials.reduce((a, m) => Math.max(a, m.slot), 0);
  const count = Math.max(1, Math.floor(maxSlot / SLOTS_PER_FLOOR) + 1);
  const total = count + 1; // siempre hay un piso nuevo con lugar
  const menu = $('#floors-menu');
  menu.innerHTML = '';
  for (let f = 0; f < total; f++) {
    const n = memorials.filter((m) => Math.floor(m.slot / SLOTS_PER_FLOOR) === f).length;
    const b = document.createElement('button');
    b.className = f === hall.floor ? 'on' : '';
    b.innerHTML = `<span>Piso ${f + 1}</span><small>${n}/${SLOTS_PER_FLOOR}</small>`;
    b.onclick = () => { goFloor(f); menu.hidden = true; };
    menu.append(b);
  }
  $('#floor-num').textContent = hall.floor + 1;
}

function goFloor(f) {
  if (f === hall.floor) return;
  hall.setFloor(f, memorials);
  renderFloors();
  toast(`🛗 Piso ${f + 1}`);
}

$('#floors-btn').onclick = () => { $('#floors-menu').hidden = !$('#floors-menu').hidden; };

// ---------- visitar una huellita ----------
let current = null;

function visit(m) {
  closeModals();
  const f = Math.floor(m.slot / SLOTS_PER_FLOOR);
  if (f !== hall.floor) { hall.setFloor(f, memorials); renderFloors(); }
  const local = m.slot % SLOTS_PER_FLOOR;
  const wide = innerWidth > 640;
  const { stand, target } = hall.viewpoint(local, wide ? 1.1 : 0);
  if (!wide) target.y -= 0.9; // en celular la ficha tapa la parte de abajo: subimos el marco en pantalla
  hideHint();
  controls.flyTo(stand, target, () => hall.pulse(local));
  openSheet(m);
}

function photoSrc(m) {
  return m.photo || portraitCanvas(m, 320).toDataURL('image/png');
}

async function openSheet(m) {
  current = m;
  const sheet = $('#sheet');
  sheet.hidden = false;
  document.body.classList.add('sheet-open');
  fillSheet(m);
  renderGuestbook([]);
  history.replaceState(null, '', `#h/${m.id}`);
  try {
    const full = await api.get(m.id);
    if (current?.id === m.id) { fillSheet(full); renderGuestbook(full.guestbook || []); }
  } catch { /* se ve igual */ }
}

function fillSheet(m) {
  $('#s-photo').src = photoSrc(m);
  $('#s-photo').alt = `Foto de ${m.name}`;
  $('#s-name').textContent = m.name;
  const kind = { perro: 'Perro', gato: 'Gato', otro: 'Compañero' }[m.species] || '';
  const bits = [kind];
  if (m.birthday) bits.push(`🎂 ${fmtDay(m.birthday)}`);
  if (m.passedDay) bits.push(`🌈 ${fmtDay(m.passedDay)}`);
  $('#s-meta').textContent = bits.join(' · ');
  $('#s-msg').textContent = m.message ? `“${m.message}”` : '';
  $('#s-candles').textContent = m.candles;
  $('#s-flowers').textContent = m.flowers;
  $('#s-gb').textContent = m.guestbookCount ?? 0;
  $('#s-demo').hidden = !m.demo;
  $('#s-delete').hidden = !myTokens()[m.id];
}

function renderGuestbook(list) {
  const ul = $('#gb-list');
  ul.innerHTML = '';
  for (const e of list) {
    const li = document.createElement('li');
    li.textContent = e.text;
    const s = document.createElement('small');
    s.textContent = `— ${e.name} · ${timeAgo(e.at)}`;
    li.append(s);
    ul.append(li);
  }
}

function closeSheet() {
  $('#sheet').hidden = true;
  document.body.classList.remove('sheet-open');
  current = null;
  history.replaceState(null, '', location.pathname + location.search);
}
$('[data-close-sheet]').onclick = closeSheet;

function updateMemorial(m) {
  const i = memorials.findIndex((x) => x.id === m.id);
  if (i >= 0) memorials[i] = { ...memorials[i], ...m };
  hall.render(memorials);
  if (current?.id === m.id) {
    current = { ...current, ...m };
    fillSheet(current);
  }
}

$('#s-candle').onclick = async () => {
  if (!current) return;
  const id = current.id;
  try {
    const r = await api.candle(id, who());
    updateMemorial(r.memorial);
    hall.pulse(r.memorial.slot % SLOTS_PER_FLOOR);
    sparkle();
    toast(r.already ? '🕯️ Tu vela sigue encendida' : `🕯️ Encendiste una vela por ${r.memorial.name}`);
  } catch (err) { toast(err.message); }
};

$('#s-flower').onclick = async () => {
  if (!current) return;
  try {
    const r = await api.flower(current.id, who());
    updateMemorial(r.memorial);
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

const IDEAS = ['Corré libre 🤍', 'Siempre en nuestro corazón', 'Gracias por tanto amor', 'Te mando un abrazo enorme', 'Que brille tu estrella 🌟', 'Nunca te vamos a olvidar'];
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

$('#gb-form').onsubmit = async (e) => {
  e.preventDefault();
  if (!current) return;
  const f = e.target;
  const text = f.text.value.trim();
  if (!text) return;
  try {
    await api.sign(current.id, { ...who(), name: f.name.value.trim() || visitor.name, text });
    f.text.value = '';
    renderIdeas();
    const full = await api.get(current.id);
    fillSheet(full);
    renderGuestbook(full.guestbook || []);
    toast('📖 Gracias. Su familia lo va a leer 🤍');
  } catch (err) { toast(err.message); }
};

// ---------- sumar una mascota ----------
let addSlot = null;
let photoData = null;

function openAdd(slot = null) {
  closeModals();
  addSlot = slot;
  $('#add-error').hidden = true;
  $('#add').showModal();
}
$('#add-btn').onclick = () => openAdd(null);

$('#photo-input').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    photoData = await resizePhoto(file, api.mode === 'local' ? 420 : 720);
    $('#photo-preview').src = photoData;
    $('#photo-preview').hidden = false;
    $('#photo-cta').hidden = true;
  } catch {
    toast('No pudimos leer esa imagen. Probá con otra.');
  }
};

async function resizePhoto(file, max) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toMMDD = (v) => (v ? v.slice(5) : null);

$('#add-form').onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = $('#add-submit');
  btn.disabled = true;
  $('#add-error').hidden = true;
  try {
    const m = await api.create({
      name: f.name.value.trim(),
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
    $('#add').close();
    await refresh();
    const fresh = memorials.find((x) => x.id === m.id) || m;
    visit(fresh);
    sparkle();
    toast(`🕯️ ${fresh.name} ya tiene su lugar. Le encendimos la primera vela.`);
  } catch (err) {
    $('#add-error').textContent = err.message;
    $('#add-error').hidden = false;
  } finally {
    btn.disabled = false;
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
  list.sort((a, b) => b.createdAt - a.createdAt);
  const grid = $('#list-grid');
  grid.innerHTML = '';
  if (!list.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = listFilter === 'waiting' ? 'Todas las huellitas tienen al menos una vela 🤍' : 'No encontramos huellitas acá.';
    grid.append(p);
    return;
  }
  for (const m of list.slice(0, 200)) {
    const b = document.createElement('button');
    b.className = 'card';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = '';
    img.src = photoSrc(m);
    const name = document.createElement('b');
    name.textContent = m.name;
    const s = document.createElement('small');
    s.textContent = `🕯️ ${m.candles} · Piso ${Math.floor(m.slot / SLOTS_PER_FLOOR) + 1}`;
    b.append(img, name, s);
    b.onclick = () => visit(m);
    grid.append(b);
  }
}
$('#list-search').oninput = renderList;
$$('#list-seg button').forEach((b) => { b.onclick = () => { listFilter = b.dataset.f; renderList(); }; });
$$('[data-list]').forEach((b) => { b.onclick = () => openList(b.dataset.list); });

// ---------- modales y avisos ----------
function closeModals() {
  $$('dialog[open]').forEach((d) => d.close());
}
$$('[data-open]').forEach((b) => { b.onclick = () => { closeModals(); $(`#${b.dataset.open}`).showModal(); }; });
$$('dialog [data-close]').forEach((b) => {
  b.onclick = () => {
    b.closest('dialog').close();
    if (b.dataset.then === 'add') openAdd(null);
  };
});
$$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
$$('[data-close="candle-hour"]').forEach((b) => { b.onclick = () => dismissCandleHour(); });

let toastTimer;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

function hideHint() {
  $('#hint').classList.add('gone');
}

function timeAgo(at) {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return 'ahora mismo';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} días`;
}

$('#me-chip').onclick = () => toast(`Así te ven los demás: ${visitor.name} 🤍`);

$('#music-btn').onclick = () => {
  setMusic(!musicOn());
  $('#music-btn').setAttribute('aria-pressed', String(musicOn()));
};

// ---------- actividad en vivo ----------
const VERBS = {
  created: (e) => `🤍 ${e.visitor} le dio un lugar a ${e.petName}`,
  candle: (e) => `🕯️ ${e.visitor} encendió una vela por ${e.petName}`,
  flower: (e) => `🌸 ${e.visitor} dejó una flor para ${e.petName}`,
  guestbook: (e) => `📖 ${e.visitor} firmó el libro de ${e.petName}`,
};
function showTick(e) {
  const box = $('#ticker');
  box.innerHTML = '';
  const span = document.createElement('span');
  span.className = 'tick';
  span.textContent = `${VERBS[e.type]?.(e) || ''} `;
  const small = document.createElement('small');
  small.textContent = `· ${timeAgo(e.at)}`;
  span.append(small);
  span.style.cursor = 'pointer';
  span.onclick = () => {
    const m = memorials.find((x) => x.id === e.memorialId);
    if (m) visit(m);
  };
  box.append(span);
}

async function pollActivity() {
  try {
    const r = await api.activity(seq);
    $('#here').textContent = Math.max(1, r.here);
    if (r.events.length) {
      const mine = r.events.every((e) => e.visitor === visitor.name);
      r.events.forEach((e, i) => setTimeout(() => showTick(e), i * 2500));
      if (!mine || seq === 0) await refresh();
    }
    seq = r.seq;
  } catch { /* reintenta en el próximo ciclo */ }
}

async function heartbeat() {
  try {
    const r = await api.heartbeat(who());
    $('#here').textContent = Math.max(1, r.here);
  } catch { /* nada */ }
}

// ---------- la hora de las velas (21 h) ----------
function candleHourKey() {
  return `huellita.ch.${new Date().toDateString()}`;
}
function checkCandleHour() {
  const d = new Date();
  let dismissed = false;
  try { dismissed = !!localStorage.getItem(candleHourKey()); } catch { /* nada */ }
  $('#candle-hour').hidden = !(d.getHours() === 21 && d.getMinutes() < 30 && !dismissed);
}
function dismissCandleHour() {
  $('#candle-hour').hidden = true;
  try { localStorage.setItem(candleHourKey(), '1'); } catch { /* nada */ }
}
$('#candle-hour-btn').onclick = () => {
  dismissCandleHour();
  const waiting = memorials.filter((m) => m.candles === 0);
  const m = pick(waiting.length ? waiting : memorials);
  if (m) visit(m);
};

// ---------- arranque ----------
function openFromHash() {
  const m = location.hash.match(/^#h\/([\w-]+)/);
  if (!m) return false;
  const mem = memorials.find((x) => x.id === m[1]);
  if (mem) { visit(mem); return true; }
  return false;
}

(async () => {
  api = await connect();
  $('#mode').hidden = api.mode !== 'local';
  const r = await refresh();
  seq = r.seq ?? 0;
  $('#loading').textContent = '';
  heartbeat();
  setInterval(heartbeat, 25_000);
  setInterval(pollActivity, 8_000);
  setInterval(checkCandleHour, 60_000);
  setTimeout(pollActivity, 1500);
})();

$('#enter').onclick = () => {
  $('#splash').classList.add('out');
  setTimeout(() => $('#splash').remove(), 1300);
  setMusic(true);
  $('#music-btn').setAttribute('aria-pressed', 'true');
  checkCandleHour();
  if (openFromHash()) return;
  let seen = false;
  try { seen = !!localStorage.getItem('huellita.welcomed'); localStorage.setItem('huellita.welcomed', '1'); } catch { /* nada */ }
  if (!seen) $('#help').showModal();
};

addEventListener('hashchange', openFromHash);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
