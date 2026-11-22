// Funciones que en el sitio de referencia son pagas y que por ahora damos GRATIS a todos.
// MONETIZAR: cuando activemos planes, cambiar `free` a false y aplicar `freeLimit` a quienes no pagan.
// Todas las rutas que las usan pasan por `allowed()`, así el cambio se hace en un solo lugar.
// Ver también MONETIZACION.md en la raíz del proyecto.
export const PAID_FEATURES = {
  eternalLight: {
    name: 'Luz eterna (farol dorado y marco dorado para siempre)',
    free: true,
    freeLimit: 'Pago único por huellita (también se puede regalar).',
  },
  backgrounds: {
    name: 'Fondos especiales para su lugar',
    free: true,
    freeLimit: 'Gratis sólo los 3 fondos básicos; el resto, pago único por fondo.',
  },
  extraPhotos: {
    name: 'Más fotos por huellita (hasta 3 extra)',
    free: true,
    freeLimit: 'Gratis 1 foto; más fotos con el plan familiar.',
  },
  voice: {
    name: 'Su voz (ladrido, maullido, hasta 10 s)',
    free: true,
    freeLimit: 'Incluida en el plan familiar.',
  },
  altarSpotlight: {
    name: 'Lugar del día en la ofrenda central',
    free: true,
    freeLimit: 'Pago por día (o semana) con cupos limitados por día.',
  },
  gatherings: {
    name: 'Encuentros programados',
    free: true,
    freeLimit: 'Incluido en el plan familiar.',
  },
  diaryPages: {
    name: 'Diario sin límite de páginas',
    free: true,
    freeLimit: 'Gratis hasta 5 páginas; ilimitado con el plan familiar.',
  },
  shareCards: {
    name: 'Tarjetas para compartir (historias)',
    free: true,
    freeLimit: 'Gratis el diseño básico; diseños especiales con el plan familiar.',
  },
};

// Hoy siempre true. Mañana: mirar el plan de la persona/huellita.
export function allowed(feature /* , context */) {
  return PAID_FEATURES[feature]?.free !== false;
}

export const BACKGROUNDS = [
  { id: 'crema', name: 'Papel crema' },
  { id: 'cempasuchil', name: 'Cempasúchil' },
  { id: 'picado', name: 'Papel picado' },
  { id: 'talavera', name: 'Talavera' },
  { id: 'noche', name: 'Noche de velas' },
  { id: 'estrellas', name: 'Entre estrellas' },
  { id: 'rosa', name: 'Rosa mexicano' },
  { id: 'turquesa', name: 'Turquesa' },
  { id: 'arcoiris', name: 'Puente del arcoíris' },
  { id: 'jardin', name: 'Jardín de flores' },
  { id: 'atardecer', name: 'Atardecer' },
  { id: 'huellitas', name: 'Huellitas' },
];
export const BACKGROUND_IDS = new Set(BACKGROUNDS.map((b) => b.id));
