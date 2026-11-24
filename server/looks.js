// Cómo era cada mascota, para que su espíritu se le parezca: pelaje, combinación de colores,
// manchitas/dibujo, orejas, cola, ojos, hocico y tamaño.
// Lo usan el formulario (frontend), el rig 3D (src/scene/petRig.js) y la API (validación).
export const FURS = [
  { id: 'negro', name: 'Negro', hex: '#2e2925' },
  { id: 'marron', name: 'Marrón', hex: '#6f4528' },
  { id: 'chocolate', name: 'Chocolate', hex: '#482a19' },
  { id: 'dorado', name: 'Dorado', hex: '#c98a4b' },
  { id: 'naranja', name: 'Naranja', hex: '#d97534' },
  { id: 'crema', name: 'Crema', hex: '#e6cfa3' },
  { id: 'blanco', name: 'Blanco', hex: '#f2ede4' },
  { id: 'gris', name: 'Gris', hex: '#8f8c8a' },
  { id: 'ceniza', name: 'Gris humo', hex: '#575a62' },
  { id: 'rojizo', name: 'Colorado', hex: '#b4552b' },
  { id: 'canela', name: 'Canela', hex: '#a66e44' },
  { id: 'atigrado', name: 'Atigrado', hex: '#87683f' },
];
export const PATTERNS = [
  { id: 'solid', name: 'Liso' },
  { id: 'tuxedo', name: 'Pechera' },
  { id: 'socks', name: 'Botitas' },
  { id: 'spots', name: 'Manchitas' },
  { id: 'patches', name: 'Vaquita / Parches' },
  { id: 'bicolor', name: 'Manto (dos colores)' },
  { id: 'calico', name: 'Tricolor / Carey' },
  { id: 'tabby', name: 'Rayitas / Atigrado' },
  { id: 'mask', name: 'Antifaz / Siamés' },
  { id: 'eye', name: 'Parche en el ojo' },
];
export const COATS = [
  { id: 'short', name: 'Poquito pelo' },
  { id: 'normal', name: 'Normal' },
  { id: 'fluffy', name: 'Peludo' },
  { id: 'curly', name: 'Con rulitos' },
];
export const EARS = [
  { id: 'up', name: 'Paradas' },
  { id: 'tip', name: 'Dobladas' },
  { id: 'down', name: 'Caídas' },
  { id: 'big', name: 'Grandotas' },
];
export const TAILS = [
  { id: 'thin', name: 'Finita' },
  { id: 'fluffy', name: 'Peluda' },
  { id: 'curl', name: 'Enrulada' },
  { id: 'bob', name: 'Cortita' },
];
export const EYES = [
  { id: 'honey', name: 'Miel' },
  { id: 'dark', name: 'Oscuros' },
  { id: 'amber', name: 'Ámbar' },
  { id: 'green', name: 'Verdes' },
  { id: 'blue', name: 'Celestes' },
  { id: 'odd', name: 'Uno y uno' },
];
// El hocico (para los perros): largo como un galgo, mediano o chato como un pug.
export const SNOUTS = [
  { id: 'long', name: 'Largo' },
  { id: 'mid', name: 'Mediano' },
  { id: 'flat', name: 'Chato' },
];
// Bien distintos: de un chihuahua a un gran danés (los gatos van en una escala más chica).
export const SIZES = [
  { id: 'xs', name: 'Mini' },
  { id: 's', name: 'Chico' },
  { id: 'm', name: 'Mediano' },
  { id: 'l', name: 'Grande' },
  { id: 'xl', name: 'Gigante' },
];
const ids = (list) => new Set(list.map((x) => x.id));
const FUR_IDS = ids(FURS);
const EAR_IDS = ids(EARS);
const SIZE_IDS = ids(SIZES);
const PATTERN_IDS = ids(PATTERNS);
const SNOUT_IDS = ids(SNOUTS);
const TAIL_IDS = ids(TAILS);
const EYE_IDS = ids(EYES);
const COAT_IDS = ids(COATS);

// Deja sólo valores conocidos; devuelve null si no queda nada.
export function cleanLook(v) {
  if (!v || typeof v !== 'object') return null;
  const out = {};
  if (FUR_IDS.has(v.fur)) out.fur = v.fur;
  if (FUR_IDS.has(v.fur2)) out.fur2 = v.fur2;
  if (COAT_IDS.has(v.coat)) out.coat = v.coat;
  if (EAR_IDS.has(v.ears)) out.ears = v.ears;
  if (SIZE_IDS.has(v.size)) out.size = v.size;
  if (PATTERN_IDS.has(v.pattern)) out.pattern = v.pattern;
  if (SNOUT_IDS.has(v.snout)) out.snout = v.snout;
  if (TAIL_IDS.has(v.tail)) out.tail = v.tail;
  if (EYE_IDS.has(v.eyes)) out.eyes = v.eyes;
  return Object.keys(out).length ? out : null;
}
