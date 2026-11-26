// Calidad gráfica según el dispositivo, con ajuste dinámico de resolución según los FPS reales.
// La calidad que eligió la persona en Opciones (v3: con la v2 muchos celulares quedaron trabados en
// "Ahorro" para siempre, ver abajo; al cambiar la clave todos vuelven a Alta).
const KEY = 'huellita.quality.v3';
// Una bajada automática (cuando el celular se quedó sin memoria gráfica con el jardín en uso): dura un
// día y después se vuelve a probar en Alta.
const AUTO = 'huellita.quality.auto';
const AUTO_MS = 24 * 3600_000;

export const TIERS = {
  high: { label: 'Alta', maxPixelRatio: 2.25, bloom: true, grass: 18000, flowers: 800, lights: 6, bulbsPerStrand: 18, fireflies: 320 },
  mid: { label: 'Media', maxPixelRatio: 1.75, bloom: true, grass: 11000, flowers: 500, lights: 4, bulbsPerStrand: 14, fireflies: 220 },
  low: { label: 'Ahorro', maxPixelRatio: 1.35, bloom: false, grass: 6000, flowers: 240, lights: 2, bulbsPerStrand: 9, fireflies: 120 },
};

export function isMobile() {
  return matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
}

export function reducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const isTier = (t) => typeof t === 'string' && Object.hasOwn(TIERS, t);
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* sin storage */ } };

// La calidad con la que arranca: la elegida, si no una bajada automática vigente, si no Alta.
export function pickTier() {
  const chosen = read(KEY);
  if (isTier(chosen)) return chosen;
  try {
    const a = JSON.parse(read(AUTO) || 'null');
    if (a && isTier(a.t) && a.until > Date.now()) return a.t;
  } catch { /* nada */ }
  return 'high';
}
export const savedQuality = pickTier;

// La que elige la persona en Opciones: queda guardada y borra cualquier bajada automática.
export function saveQuality(v) {
  write(KEY, v);
  write(AUTO, null);
}

// Un escalón más abajo por un día (no toca la que eligió la persona).
export function stepDownQuality(current) {
  if (isTier(read(KEY))) return current;
  const next = current === 'high' ? 'mid' : 'low';
  write(AUTO, JSON.stringify({ t: next, until: Date.now() + AUTO_MS }));
  return next;
}

export function autoTier() {
  // Por defecto siempre calidad Alta.
  return 'high';
}

// Baja la resolución sólo si la escena va muy lenta de forma sostenida y la sube si sobra rendimiento.
// En calidad Alta mantiene un piso alto de resolución para que los carteles y bordes nunca se vean borrosos.
export function createAdaptiveResolution(renderer, onChange, { max, min = 1.25 }) {
  let ratio = Math.min(window.devicePixelRatio || 1, max);
  let ceiling = ratio;
  let frames = 0;
  let acc = 0;
  let calm = 0;
  let slow = 0;
  let pending = null;
  let raisedAt = -1e9;
  let clock = 0;
  renderer.setPixelRatio(ratio);
  const want = (r) => { pending = Math.round(r * 100) / 100; };
  return {
    get ratio() { return pending ?? ratio; },
    tick(dt) {
      frames++;
      acc += dt;
      clock += dt;
      if (acc < 1.8) return;
      const fps = frames / acc;
      frames = 0;
      acc = 0;
      if (document.hidden) return;
      if (fps < 28 && ratio > min) {
        slow++;
        if (slow >= 2) {
          if (clock - raisedAt < 6) ceiling = Math.max(min, ratio - 0.1);
          want(Math.max(min, ratio - 0.15));
          slow = 0;
          calm = 0;
        }
      } else if (fps > 52) {
        slow = 0;
        calm++;
        const target = Math.min(window.devicePixelRatio || 1, max, ceiling);
        if (calm >= 3 && ratio + 0.05 < target) {
          want(Math.min(target, ratio + 0.15));
          raisedAt = clock;
          calm = 0;
        }
      } else {
        slow = 0;
        calm = 0;
      }
    },
    // Llamar al principio del cuadro, antes de dibujar.
    apply() {
      if (pending === null) return false;
      ratio = pending;
      pending = null;
      renderer.setPixelRatio(ratio);
      onChange(ratio);
      return true;
    },
  };
}
