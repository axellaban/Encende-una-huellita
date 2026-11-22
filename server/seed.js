// Huellitas destacadas: viven en el código (nombre, foto, fechas, mensaje) y la base sólo guarda
// sus velas, flores y libro de visitas. Para cambiar sus datos, editá este archivo y volvé a desplegar.
//
// `slot: -1` = el atril del centro del salón, lo primero que se ve al entrar.
export const FEATURED = [
  {
    id: 'luca',
    slot: -1,
    name: 'Luca',
    species: 'perro',
    // Cuando tengamos su foto: '/huellitas/luca.jpg' (archivo en public/huellitas/).
    photo: null,
    hue: 32,
    birthday: null, // 'MM-DD'
    passedDay: null, // 'MM-DD'
    message: 'Siempre en nuestro corazón.',
    featured: true,
  },
];

export const FEATURED_IDS = new Set(FEATURED.map((m) => m.id));
