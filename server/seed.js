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
    photo: '/huellitas/luca.jpg', // archivo en public/huellitas/
    hue: 32,
    birthday: '10-22', // 'MM-DD'
    passedDay: '10-25', // 'MM-DD'
    birthYear: 2012,
    passedYear: 2026,
    message: 'Siempre en nuestro corazón.',
    featured: true,
  },
];

export const FEATURED_IDS = new Set(FEATURED.map((m) => m.id));
