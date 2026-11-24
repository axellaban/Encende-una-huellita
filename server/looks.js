// Cómo era cada mascota, para que su espíritu se le parezca: pelaje, orejas y tamaño.
// Lo usan el formulario (frontend), el rig 3D (src/scene/petRig.js) y la API (validación).
export const FURS = [
  { id: 'negro', name: 'Negro', hex: '#2e2925' },
  { id: 'marron', name: 'Marrón', hex: '#6f4528' },
  { id: 'dorado', name: 'Dorado', hex: '#c98a4b' },
  { id: 'crema', name: 'Crema', hex: '#e6cfa3' },
  { id: 'blanco', name: 'Blanco', hex: '#f2ede4' },
  { id: 'gris', name: 'Gris', hex: '#8f8c8a' },
  { id: 'rojizo', name: 'Colorado', hex: '#b4552b' },
  { id: 'caramelo', name: 'Caramelo', hex: '#9e5a2c' },
  { id: 'atigrado', name: 'Atigrado', hex: '#87683f' },
];
export const EARS = [
  { id: 'up', name: 'Paradas' },
  { id: 'tip', name: 'Dobladas' },
  { id: 'down', name: 'Caídas' },
  { id: 'big', name: 'Grandotas' },
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
export const PATTERNS = [
  { id: 'solid', name: 'Liso' },
  { id: 'tuxedo', name: 'Pechera blanca' },
  { id: 'socks', name: 'Patitas blancas' },
];
const ids = (list) => new Set(list.map((x) => x.id));
const FUR_IDS = ids(FURS);
const EAR_IDS = ids(EARS);
const SIZE_IDS = ids(SIZES);
const PATTERN_IDS = ids(PATTERNS);
const SNOUT_IDS = ids(SNOUTS);

// Deja sólo valores conocidos; devuelve null si no queda nada.
export function cleanLook(v) {
  if (!v || typeof v !== 'object') return null;
  const out = {};
  if (FUR_IDS.has(v.fur)) out.fur = v.fur;
  if (EAR_IDS.has(v.ears)) out.ears = v.ears;
  if (SIZE_IDS.has(v.size)) out.size = v.size;
  if (PATTERN_IDS.has(v.pattern)) out.pattern = v.pattern;
  if (SNOUT_IDS.has(v.snout)) out.snout = v.snout;
  return Object.keys(out).length ? out : null;
}
