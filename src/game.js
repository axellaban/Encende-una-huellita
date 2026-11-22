// La parte "juego" amable del jardín: gestos del día, racha de noches, Glow guardado
// y "mientras no estabas". Todo vive en este navegador; el Glow real lo guarda el servidor.
import { GLOW } from '../server/glow.js';

const KEY = 'huellita.game.v1';
const day = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch { return {}; }
}

export function createGame() {
  let s = load();
  s.pendingGlow ||= 0;
  s.seen ||= {};
  s.streak ||= { last: null, n: 0, best: 0 };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin storage */ } };
  function today() {
    if (s.day !== day()) {
      s.day = day();
      s.done = { own: false, featured: false, lit: [], gift: false, words: false, celebrated: false };
      save();
    }
    return s.done;
  }

  return {
    // Racha: cuántas noches seguidas viniste al jardín.
    visit() {
      const t = day();
      if (s.streak.last === t) return { ...s.streak, isNew: false };
      const y = new Date();
      y.setDate(y.getDate() - 1);
      s.streak.n = s.streak.last === day(y) ? s.streak.n + 1 : 1;
      s.streak.best = Math.max(s.streak.best || 0, s.streak.n);
      s.streak.last = t;
      save();
      return { ...s.streak, isNew: true };
    },
    get streak() { return s.streak; },

    missions({ hasPet, featuredName }) {
      const d = today();
      return [
        hasPet
          ? { id: 'own', icon: '🕯️', label: 'Encendé la vela de hoy para tu mascota', done: d.own }
          : { id: 'own', icon: '🕯️', label: `Encendé una vela para ${featuredName}`, done: d.featured },
        { id: 'lit', icon: '🌙', label: 'Encendé velas para 3 huellitas', sub: `${Math.min(3, d.lit.length)} de 3`, done: d.lit.length >= 3 },
        { id: 'gift', icon: '🎁', label: 'Dejale un regalito a alguien', done: d.gift },
        { id: 'words', icon: '✍️', label: 'Dejá unas palabras amables', done: d.words },
      ];
    },
    allDone(hasPet) {
      const d = today();
      return [hasPet ? d.own : d.featured, d.lit.length >= 3, d.gift, d.words].every(Boolean);
    },
    progress(ctx) {
      const m = this.missions(ctx);
      return { done: m.filter((x) => x.done).length, total: m.length };
    },

    // Anota un gesto. Devuelve true si con esto se completaron todos los gestos del día.
    record(kind, { memorialId, isOwn, isFeatured, hasPet } = {}) {
      const d = today();
      const before = this.allDone(hasPet);
      if (kind === 'candle') {
        if (isOwn) d.own = true;
        if (isFeatured) d.featured = true;
        if (!isOwn && memorialId && !d.lit.includes(memorialId)) d.lit.push(memorialId);
      }
      if (kind === 'gift' && !isOwn) d.gift = true;
      if (kind === 'words' && !isOwn) d.words = true;
      const after = this.allDone(hasPet);
      save();
      if (after && !before && !d.celebrated) {
        d.celebrated = true;
        save();
        return true;
      }
      return false;
    },

    // Glow que se junta antes de tener mascota: la va a estar esperando.
    get pendingGlow() { return s.pendingGlow; },
    bank(kind, bonus = 0) {
      const n = (GLOW[kind] || 0) + bonus;
      s.pendingGlow = Math.min(60, s.pendingGlow + n);
      save();
      return n;
    },
    clearBank() { s.pendingGlow = 0; save(); },

    // "Mientras no estabas": compara lo que recibieron mis mascotas desde la última visita.
    whileAway(mine) {
      const news = [];
      for (const m of mine) {
        const prev = s.seen[m.id];
        const now = { c: m.candles, f: m.flowers, w: m.guestbookCount || 0, g: m.gifts || 0 };
        if (prev) {
          const dc = now.c - prev.c;
          const df = now.f - prev.f;
          const dw = now.w - prev.w;
          const dg = now.g - prev.g;
          if (dc + df + dw + dg > 0) news.push({ m, dc, df, dw, dg });
        }
        s.seen[m.id] = now;
      }
      save();
      return news;
    },
  };
}
