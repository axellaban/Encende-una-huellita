// Calidad gráfica según el dispositivo, con ajuste dinámico de resolución según los FPS reales.
const KEY = 'huellita.quality';

export const TIERS = {
  high: { label: 'Alta', maxPixelRatio: 2, bloom: true, grass: 44000, flowers: 1100, lights: 6, bulbsPerStrand: 18, fireflies: 380 },
  mid: { label: 'Media', maxPixelRatio: 1.75, bloom: true, grass: 21000, flowers: 600, lights: 4, bulbsPerStrand: 14, fireflies: 240 },
  low: { label: 'Ahorro', maxPixelRatio: 1.3, bloom: false, grass: 7500, flowers: 260, lights: 2, bulbsPerStrand: 9, fireflies: 130 },
};

export function isMobile() {
  return matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
}

export function reducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function savedQuality() {
  try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; }
}

export function saveQuality(v) {
  try { localStorage.setItem(KEY, v); } catch { /* sin storage */ }
}

export function autoTier() {
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  // Por defecto, calidad alta (la resolución adaptativa baja los píxeles si el equipo no da);
  // sólo los equipos muy justos arrancan en media.
  if (!isMobile()) return cores <= 2 ? 'mid' : 'high';
  return mem <= 2 || cores <= 2 ? 'mid' : 'high';
}

export function pickTier() {
  const s = savedQuality();
  return TIERS[s] ? s : autoTier();
}

// Baja la resolución si la escena va lenta y la sube de a poco si sobra rendimiento.
export function createAdaptiveResolution(renderer, onChange, { max, min = 0.75 }) {
  let ratio = Math.min(window.devicePixelRatio || 1, max);
  let frames = 0;
  let acc = 0;
  let calm = 0;
  renderer.setPixelRatio(ratio);
  return {
    get ratio() { return ratio; },
    tick(dt) {
      frames++;
      acc += dt;
      if (acc < 1.5) return;
      const fps = frames / acc;
      frames = 0;
      acc = 0;
      if (document.hidden) return;
      if (fps < 42 && ratio > min) {
        ratio = Math.max(min, ratio - (fps < 28 ? 0.3 : 0.15));
        calm = 0;
        renderer.setPixelRatio(ratio);
        onChange(ratio);
      } else if (fps > 58) {
        calm++;
        const target = Math.min(window.devicePixelRatio || 1, max);
        if (calm >= 4 && ratio < target) {
          ratio = Math.min(target, ratio + 0.1);
          calm = 0;
          renderer.setPixelRatio(ratio);
          onChange(ratio);
        }
      } else calm = 0;
    },
  };
}
