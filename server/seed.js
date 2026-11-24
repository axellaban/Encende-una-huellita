// Huellitas destacadas: viven en el código (nombre, foto, fechas, mensaje) y la base sólo guarda
// sus velas, flores y libro de visitas. Para cambiar sus datos, editá este archivo y volvé a desplegar.
//
// `slot: 82` = lugar en el pasillo del piso 1 (al lado de Monarkito en el slot 81); en el atril central va la bienvenida del Principito.
export const FEATURED = [
  {
    id: 'luca',
    slot: 82,
    name: 'Luca',
    species: 'perro',
    photo: '/huellitas/luca.jpg', // archivo en public/huellitas/
    extraPhotos: ['/huellitas/luca-2.jpg'],
    // Imagen para la vista previa al compartir su link (1200x630; se arma con drawOgCard en la app).
    og: '/huellitas/luca-og.jpg',
    // Estampita junto a su ofrenda (se ve en el 3D y en su ficha).
    card: { src: '/huellitas/luca-estampita.jpg', w: 360, h: 506, alt: '“No era más que un zorro semejante a cien mil otros. Pero yo le hice mi amigo y ahora es único en el mundo.” Antoine de Saint-Exupéry' },
    hue: 32,
    birthday: '10-22', // 'MM-DD'
    passedDay: '10-25', // 'MM-DD'
    birthYear: 2012,
    passedYear: 2026,
    message: 'Siempre en nuestro corazón.',
    // Cómo es su espíritu en el Prado (ver server/looks.js): caramelo como en su foto, orejas caídas, grande.
    look: { fur: 'caramelo', ears: 'down', size: 'l', snout: 'mid', pattern: 'solid' },
    featured: true,
  },
];

export const FEATURED_IDS = new Set(FEATURED.map((m) => m.id));
