// Glow: cada gesto amable con otras huellitas hace brillar un poco más el lugar de tu mascota.
// Nunca se apaga y no hay rankings: todas son queridas por igual.
export const GLOW = {
  candle: 3, // vela para otra huellita
  firstLight: 5, // bonus si fue su primera vela
  flower: 2,
  gift: 2,
  words: 4, // firmar su libro de visitas
  hug: 1, // abrazo en silencio
  ownCandle: 2, // la vela de hoy para tu propia mascota
  missions: 5, // completar los gestos del día
};

export const STAGES = [
  { min: 0, name: 'Llamita', icon: '🕯️' },
  { min: 12, name: 'Farolito', icon: '🏮' },
  { min: 45, name: 'Estrella', icon: '⭐' },
  { min: 130, name: 'Constelación', icon: '✨' },
];

export function stageOf(glow = 0) {
  let i = 0;
  for (let k = 0; k < STAGES.length; k++) if (glow >= STAGES[k].min) i = k;
  const next = STAGES[i + 1] || null;
  return { index: i, ...STAGES[i], next, toNext: next ? next.min - glow : 0 };
}

// Regalitos gratis: uno por persona y por huellita cada día.
export const GIFTS = {
  Comida: ['🦴 Un hueso', '🧀 Un poco de queso', '🍪 Una galletita', '🥕 Una zanahoria', '🥛 Un platito de leche', '🍗 Un pollito', '🐟 Un pescadito', '🍯 Un tarro de miel'],
  Juguetes: ['🎾 Una pelota', '🧶 Un ovillo de lana', '🐭 Un ratoncito', '🦆 Un patito de goma', '🥏 Un frisbee', '🪀 Un yoyó', '🧸 Un osito', '📦 Una caja de cartón'],
  Detalles: ['🎀 Un moño', '🛏️ Una camita', '🎈 Un globo', '🌻 Un girasol', '🍄 Una setita', '🦋 Una mariposa', '🌙 Una lucecita', '💌 Una cartita'],
};
export const GIFT_SET = new Set(Object.values(GIFTS).flat());

// Frases para "decir" en el jardín (sin texto libre: así el jardín se mantiene amable).
export const SAYINGS = ['🤍', 'Estoy con vos', 'Qué lindo lugar', 'Te mando un abrazo', 'Corran libres 🌈', 'Gracias por estar', 'Qué hermosa foto', 'Buenas noches 🌙', 'Fuerza 💛', 'Lo siento mucho'];
export const EMOTES = ['🤍', '🕯️', '🐾', '🌸', '🫂', '✨'];
