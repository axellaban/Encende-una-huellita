# Pendientes

Lista para quien siga el proyecto (persona o IA). Leé primero [`AGENTS.md`](AGENTS.md).
Prioridad: **P0** = verificar/arreglar antes de mostrarlo a más gente, **P1** = lo que más suma,
**P2** = completa el relevamiento del sitio de referencia, **P3** = deuda técnica y mejoras.

## ⭐ Empezá por acá: lo que pidió el dueño (23/11/2026) — hecho y lo que falta

Pedidos del dueño con capturas del original (lightapaw.com) y del juego littleprince.dev. Casi todo
quedó hecho en la tanda del 23/11; abajo, qué se hizo y qué se puede seguir mejorando. Regla del dueño:
"no hagas berretadas" — cada cosa, con capturas en celular antes de mergear.

- [x] **Estilo acuarela** (`src/scene/watercolor.js`, último pase del composer): papel con fibras,
      pigmento en los bordes (Sobel), lavados, color que sangra, viñeta. Se apaga en Opciones. Falta:
      verlo en un teléfono real y ajustar `uAmt`; littleprince.dev pide WebGPU y con swiftshader no
      termina de cargar (`--enable-unsafe-webgpu --enable-features=Vulkan,WebGPU
      --use-webgpu-adapter=swiftshader --use-vulkan=swiftshader` abre la portada nada más).
- [x] **Cielo mágico con cometas** (`src/scene/skymagic.js` + shader del cielo en `world.js`): Vía
      Láctea, nebulosas, polvo de estrellas, 3 cometas lentos, estrellas fugaces; arriba cirros, halo
      del sol, bancos de nubes gigantes, islas flotantes (con casitas y farolitos) y pájaros de luz;
      auroras en los pisos del medio.
- [x] **Personajes**: parpadean, cachetes, sarape con flecos, rebozo, respiración, aplastar/estirar,
      miran el cielo, y peinado a elegir (corto, trenzas, chongo, colita; va codificado en `hue % 8`,
      ver `character.js`). Al cruzarse con otro visitante, se saludan (`avatars.greetNear`). Falta:
      expresiones (sonrisa al regalar).
- [x] **Mascotas**: 5 tamaños bien distintos (se pueden cambiar al editar), ojos con iris y
      brillos, bigotes, pechera, nariz que brilla, orejas grandotas y hocico largo/mediano/chato.
      Los espíritus de otros visitantes llevan el mismo pelaje, orejas, tamaño y hocico.
- [x] **Hall con pasillos y pisos con nombre** (`src/floors.js`, propios, no los del original):
      cartel colgado por muro con el contador, 99 nombres de piso.
- [x] **Ventanitas en la pared**: cada lugar ocupado es un marco hondo con postigos pintados que se
      abren (`updateShutters` en `hall.js`); la repisa de la ficha muestra cada regalito con su
      cantidad (`giftCounts`). Falta: al abrir la ficha, una vista grande del nicho en 3D con las
      repisas a los costados (como la captura del original) en lugar de la foto plana.
- [x] **Botonera y cabina del ascensor**: botones de bronce con nombre del piso; al viajar, ojo de
      buey con el cielo que pasa y la plaquita del piso.
- [x] **Farolitos** (`paperLantern` en `lanterns.js`): papel calado, aros, llama que titila,
      guirnaldas sobre el camino, en la pérgola del salón, en el ahuehuete y más en el cielo.
- [x] **Arcoíris doble** con polvo de luz y reflejo en el agua (`river.js`).
- [x] **Jardín**: canteros con borde de piedra, estanque, caminitos de piedras, jacarandás en flor,
      un ahuehuete enorme con farolitos y pétalos que se levantan al caminar.
- [x] **Agregar a la pantalla de inicio**: tarjeta después del primer gesto (iPhone: explica cómo).
- [x] **Experiencia de película (sin copiar Coco)**: intro cinematográfica con leyendas
      (`controls.cinematic`), música por zona (`setMood`: jardín, salón, cielo), pasos según el piso y
      sonidos al tocar espíritus y el frasco. Falta: revisarlo en un celular real a 60 fps y ajustar los
      tiempos de las leyendas (van con `setTimeout`, el vuelo con el reloj del juego).
- [x] **Del original**: 36 regalitos con modelo 3D y botón **Recuerdo** (estampita 1080x1350 para
      guardar o compartir, `drawKeepsake` en `share.js`).

## P0 · Verificaciones que nunca se hicieron en el mundo real

- [ ] **Rama de producción de Vercel**: hoy es `claude/ecstatic-gates-rt74m2` (ver AGENTS). Cambiarla a
      `main` en Vercel → Settings → Environments → Production Branch.
- [ ] **Conectar Upstash en producción**: `/api/health` responde `ok:false` (23/11/2026), así que el
      sitio está en modo demo (cada visitante solo, sin presencia compartida). Vercel → Storage →
      Create Database → Upstash for Redis → conectar a Production y Preview → Redeploy.
- [ ] **Deploy real en Vercel + Upstash.** Todo se probó con un Upstash simulado (`server/api.test.js`).
      Confirmar: rewrite `/api/:path*` → `api/handler.js`, lectura de `KV_REST_API_URL`/`TOKEN`,
      fotos servidas con caché de CDN, y que sin Upstash la app caiga bien al **modo demo**.
- [ ] **Teléfonos reales** (iPhone Safari y Android Chrome): rendimiento del 3D, calidad automática
      (`src/quality.js`), palanca, hoja deslizable, teclado sobre formularios, áreas seguras del notch.
      Con la tercera persona: que la cámara no se meta en los muros, que la palanca se sienta natural
      y cuántos espíritus aguanta un teléfono de gama baja (hoy 3 en "Ahorro", 4 en media, 5 en alta).
      El jardín creció (radio 58 m, salón de 21 m, más pasto y árboles): mirar los FPS en gama baja y,
      si hace falta, bajar `grass`/`flowers` de "Ahorro" en `src/quality.js`.
- [ ] **Grabar la voz en iOS Safari** (MediaRecorder entrega `audio/mp4`; el servidor lo acepta,
      pero nunca se probó en un iPhone).
- [ ] **Moderación mínima** antes de abrirlo al público: hoy cualquiera puede subir fotos y escribir en
      libros de visitas, diario, frasco y consuelo sin filtro ni forma de denunciar.

## P1 · Lo que más suma ahora

- [ ] **Probar las vistas previas en el mundo real**: mandar `https://encende-una-huellita.vercel.app/h/luca`
      por WhatsApp e Instagram (y el depurador de Facebook) y confirmar foto, título y texto. Si Vercel
      no incluyera `dist/index.html` en la función, igual responde (lo pide o redirige), pero conviene mirarlo.
- [ ] **Más viral**: recordatorio "hoy cumpliría años" con link para compartir; contador público de
      velas de la noche en la entrada; QR imprimible para la ofrenda de casa; video corto del paseo.

- [ ] **Regalitos**: que cada uno tenga su gracia al llegar (la pelota rebota, el globo tira para
      arriba, la mariposa da una vuelta al marco) y que al tocarlo en la repisa diga quién lo dejó.
      Si se suma un regalito al catálogo (`server/glow.js`), sumarle su modelo en `src/scene/gifts3d.js`.
- [ ] **El río**: reflejos de verdad (render a textura) en calidad alta, pececitos de luz, y que el
      espíritu en el paseo se pare a mirar el agua en el puente.
- [ ] **Pisos del cielo**: hoy el salón de cada piso es igual (con su muro). Se podría variar la
      decoración según la altura (más flores blancas y luz arriba) y sumar algo único en el piso 99.
- [ ] **Espíritus**: que tu espíritu juegue con los espíritus que pasean otros visitantes; más acciones
      (tirar de una soga entre dos, cavar, perseguir mariposas de luz); ladridos/maullidos suaves.
- [ ] **Tu personaje**: más opciones (rebozo, peinados, farolito de colores); hoy se elige color del
      sarape y sombrero o corona desde "Así te ven los demás" (el sombrero viaja como paridad del `hue`).

- [ ] **Palabras de Luca**: su mensaje sigue siendo el provisorio *"Siempre en nuestro corazón."*
      (`server/seed.js`). Pedírselas al dueño. En la foto principal aparece otro perro negro: preguntar
      si quiere darle su lugar también.
- [ ] **Recordatorios** (email o push): cumpleaños, día que partió, 1 y 2 de noviembre, "alguien le
      encendió una vela". El original los tiene; acá sólo hay archivo `.ics` y avisos dentro de la app.
- [ ] **No perder la huellita**: el permiso de edición vive sólo en localStorage. Falta recuperar por
      email (enlace mágico) o iniciar sesión (Google). Hoy, si se borra el navegador, se pierde el acceso
      (salvo que haya mandado el enlace de familia).
- [ ] **Denunciar / ocultar**: denunciar una huellita o un mensaje, ocultar a un visitante, cerrar el
      libro de visitas a la familia (todo existe en el original).
- [ ] **Quién encendió velas** por mi mascota + botón "🤍 Dar las gracias a todos".
- [ ] **Día de Muertos en vivo** (1 y 2 de noviembre): decoración extra en el 3D, más velas, un
      evento compartido. Hoy sólo hay aviso de temporada (20/10 al 2/11) y la guía.
- [ ] **Encuentro en vivo**: hoy se fija fecha y hora y se agrega al calendario, pero no hay "modo
      encuentro" (aviso "es ahora", velas juntas, contador de personas).

## P2 · Lo que queda del relevamiento del original (ver `docs/investigacion-rea.md`)

- [ ] "Hoy es difícil": compartir algo anónimo y recibir "Estoy contigo".
- [ ] "Lo que me ayudó": tablero de consejos de quienes ya lo vivieron.
- [ ] Pregunta del día ("¿Cómo te despertaba por la mañana?") con respuestas de la comunidad.
- [ ] Racha por mascota ("La vela de Luca lleva N días seguidos encendida") y notas de 100 días / 1 año.
- [ ] "Cruzaron el puente por la misma época": encender una vela a cada una.
- [ ] Visitar a "familias que vinieron de visita" (la luz muestra de qué mascota viene).
- [ ] Bandera del país en la placa; traducción automática de mensajes.
- [ ] Comentarios y corazones en las páginas del diario de otras familias; tablero "Diarios".
- [ ] Videos cortos por huellita; video recuerdo de 15–30 s con fotos y música; tarjeta imprimible con QR.
- [ ] Dirección web propia por huellita (`/luca` además de `#h/luca`).
- [ ] Idiomas (hoy sólo español).
- [ ] Partes pagas a implementar cuando se monetice: ver `MONETIZACION.md` (planes, regalos para otros,
      recuerdos impresos, cartas con IA, donaciones con muro de agradecimiento).

## P3 · Deuda técnica

- [ ] **Dividir `src/main.js`** (≈2.200 líneas) en módulos: ficha, formularios, familia, juego, guía,
      ascensor, presencia.
- [ ] **Archivos fuera de Redis**: fotos (≈100–150 KB) y voces (hasta 600 KB) se guardan en base64 en
      Upstash; pasar a Vercel Blob/S3 y dejar sólo la URL.
- [ ] **Presencia**: un solo latido (`POST /api/now` con `since`) cada 12 s (solo) o 5 s (con gente),
      3 comandos de Redis cada uno; nada con la pestaña oculta. Una visita de 10 min gasta ≈150–400
      comandos (el plan gratis de Upstash da 500.000/mes). Con mucho más tráfico: WebSockets/SSE
      (Ably, Pusher, PartyKit) para que los demás se muevan en tiempo real y gastar todavía menos.
- [ ] **Paquete JS**: three.js ya va en su propio archivo (≈190 KB comprimido, queda en caché entre
      versiones) y la app en otro (≈76 KB). Falta cargar diferido lo que no hace falta al entrar
      (guía, compartir, voz).
- [ ] **Tests de frontend**: sólo hay tests de API. Convertir los recorridos de Playwright (ver
      `AGENTS.md`) en una suite que se pueda correr.
- [x] Encabezados de seguridad (CSP, Permissions-Policy) en `vercel.json` y en el servidor local
      (un test controla que coincidan). Si sumás un dominio externo (fuentes, CDN), agregalo al CSP.
- [ ] Accesibilidad: lector de pantalla para el 3D (hoy la lista "Huellitas" es la alternativa),
      foco en modales, contraste del tema vino.
- [ ] Service worker para abrir sin conexión (manifest e íconos ya están).
- [x] Modo demo: si se llena el almacenamiento del navegador, avisa en vez de perder datos en silencio.

## Detalles visuales conocidos

- [x] `public/og.jpg` rehecha en tercera persona (el camino hacia la ofrenda), con dirección absoluta en las
      etiquetas `og:image`/`twitter:image` para que WhatsApp y redes la muestren.
- [ ] La ilustración de la estampita del Principito tiene firma de su autora: si el sitio es público,
      pedir permiso o darle crédito.
- [ ] En teléfonos lentos, al abrir un link directo (`#h/luca`) la cámara puede tardar en llegar a la ofrenda.
