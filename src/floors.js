// Nombres propios de los 99 pisos (del jardín de la ofrenda al cielo de las huellitas) y de los 10
// pasillos de cada piso. Inventados para este proyecto: no copiar los del sitio de referencia.
export const FLOOR_NAMES = [
  'Jardín de la ofrenda', 'Patio de las veladoras', 'Sendero de cempasúchil', 'Rincón del copal',
  'Plaza del papel picado', 'Casita del pan dulce', 'Fuente de los colibríes', 'Calle de las calaveritas',
  'Huerto de calabazas', 'Balcón de las buganvilias', 'Pasaje de los alebrijes', 'Paseo de las monarcas',
  'Glorieta de la guitarra', 'Kiosco de la serenata', 'Mercado de flores', 'Puente de los girasoles',
  'Patio del limonero', 'Terraza de la jacaranda', 'Callejón de los farolitos', 'Mirador del atardecer',
  'Huerta del maíz', 'Jardín de las dalias', 'Plazuela del chocolate', 'Corredor de las nubes rosas',
  'Escalera de las luciérnagas', 'Balcón de la primera estrella', 'Rincón de la siesta', 'Prado de los tréboles',
  'Barrio de las campanitas', 'Laguna de los nenúfares', 'Arco de las rosas', 'Paseo del viento tibio',
  'Patio de los pájaros cantores', 'Jardín del ahuehuete', 'Sendero de la lavanda', 'Mirador de los volcanes',
  'Plaza de las palomas', 'Colina del amanecer', 'Terraza de los geranios', 'Corredor de los suspiros',
  'Lomita de los panaderos', 'Balcón de la luna nueva', 'Jardín de las orquídeas', 'Puerta del alba',
  'Nube de los abrazos', 'Escalinata rosada', 'Patio de las campanas de viento', 'Jardín del rocío',
  'Mirador de los colibríes', 'Mitad del camino', 'Nube de las pelotas perdidas', 'Prado de las siestas al sol',
  'Colina de los ladridos felices', 'Jardín de los ronroneos', 'Nube de las caricias', 'Rincón de la cucha tibia',
  'Plaza de los paseos largos', 'Patio de los huesitos dorados', 'Balcón de las orejas al viento', 'Jardín de las colas contentas',
  'Nube del primer encuentro', 'Sendero de las huellitas de luz', 'Lago de los reflejos', 'Valle del arcoíris',
  'Mirador de los cometas', 'Jardín de las estrellas fugaces', 'Nube de los deseos', 'Puente de las nubes',
  'Patio de la brisa celeste', 'Terraza del sol de la tarde', 'Isla de los pájaros de luz', 'Cascada de luz',
  'Nube de merengue', 'Jardín flotante', 'Mirador del horizonte', 'Escalera del sol',
  'Plaza de los rayos dorados', 'Balcón del cielo abierto', 'Corredor de las plumas', 'Isla de las campanas',
  'Jardín de la luz tibia', 'Nube de los recuerdos', 'Terraza celeste', 'Sendero del resplandor',
  'Patio de las nubes altas', 'Puerta dorada', 'Jardín de los ángeles de cuatro patas', 'Nube del reencuentro',
  'Escalinata de cristal', 'Balcón de la eternidad', 'Prado celeste', 'Isla del sol naciente',
  'Corredor del silencio dulce', 'Nube de la paz', 'Jardín del último ladrido', 'Mirador de todas las estrellas',
  'Umbral de luz', 'Casi en el cielo', 'El cielo de las huellitas',
];

export const CORRIDOR_NAMES = [
  'Pasillo de las veladoras', 'Pasillo del cempasúchil', 'Pasillo de las mariposas', 'Pasillo del pan dulce',
  'Pasillo de los alebrijes', 'Pasillo de la luna', 'Pasillo del copal', 'Pasillo de las estrellas',
  'Pasillo del papel picado', 'Pasillo de los colibríes',
];

export const floorName = (f) => FLOOR_NAMES[Math.max(0, Math.min(FLOOR_NAMES.length - 1, f))];
