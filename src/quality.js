// Calidad gráfica según el dispositivo, con ajuste dinámico de resolución según los FPS reales.
const KEY = 'huellita.quality';

export const TIERS = {
  high: { label: 'Alta', maxPixelRatio: 2, bloom: true, grass: 26000, flowers: 700, lights: 6, bulbsPerStrand: 16, fireflies: 260 },
  mid: { label: 'Media', maxPixelRatio: 1.75, bloom: true, grass: 12000, flowers: 380, lights: 4, bulbsPerStrand: 12, fireflies: 170 },
  low: { label: 'Ahorro', maxPixelRatio: 1.3, bloom: false, grass: 4000, flowers: 160, lights: 2, bulbsPerStrand: 8, fireflies: 90 },
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
  if (!isMobile()) return cores <= 2 ? 'mid' : 'high';
  return mem <= 3 || cores <= 4 ? 'low' : 'mid';
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
