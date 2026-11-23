# Pendientes

Lista para quien siga el proyecto (persona o IA). Leé primero [`AGENTS.md`](AGENTS.md).
Prioridad: **P0** = verificar/arreglar antes de mostrarlo a más gente, **P1** = lo que más suma,
**P2** = completa el relevamiento del sitio de referencia, **P3** = deuda técnica y mejoras.

## ⭐ Empezá por acá: lo que pidió el dueño el 23/11/2026 y quedó sin hacer

Pedidos textuales del dueño (con capturas del original, lightapaw.com, y del juego littleprince.dev).
Ya está hecho: río natural, puente como entrada, regalitos en 3D, cempasúchil con pétalos, arcoíris
que no se ve de canto, **caminito al ascensor**, **5 tamaños de mascota** (Mini a Gigante, bien
distintos; `SIZE_SCALE` en `src/scene/petRig.js`), **calidad alta por defecto** (`autoTier` en
`src/quality.js`) y **brillitos que caen en el aire** (`src/scene/sparkles.js`). Lo que falta, en
el orden en que más se nota. No hagas "berretadas": cada cosa, con capturas en celular antes de mergear.

1. [ ] **Estilo acuarela como littleprince.dev** ("los gráficos son completamente distintos a esa
   acuarela"). El juego usa WebGPU: en este contenedor abre con
   `--enable-unsafe-webgpu --enable-features=Vulkan,WebGPU --use-webgpu-adapter=swiftshader --use-vulkan=swiftshader`
   pero con swiftshader se queda en "PREPARING THE SCENE · 0%" (4 minutos); hay que verlo en un equipo
   con GPU o pedirle capturas al dueño. No copiar su código ni sus imágenes: tomar la idea. Plan: un
   pase de postproceso "acuarela" en `main.js` (después del bloom): textura de papel generada en canvas,
   bordes oscurecidos con Sobel sobre luminancia (y profundidad si se agrega un depth texture),
   manchas de pigmento con ruido de baja frecuencia que tiñen y aclaran, colores levemente
   cuantizados y un poco de "sangrado" (muestras desplazadas por ruido), viñeta cálida. Con perilla de
   intensidad y apagado en calidad baja. Probar que no se vuelva borroso en celular.
2. [ ] **Cielo mágico e inmenso en el piso 1 y en el 99**, con **cometas** ("Cometas en el cielo").
   Piso 1 (noche, `world.js`, shader del cielo con `uK`): Vía Láctea (franja con ruido y polvo),
   nebulosas suaves rosa/violeta, estrellas de varios tamaños que titilan, 2–3 cometas lentos con cola
   larga (sprites aditivos estirados o una cinta con degradé) y estrellas fugaces cada tanto. Piso 99
   (`heaven.js`): más amplitud (horizonte lejano de nubes en capas, nubes gigantes lejos, rayos de sol
   que se mueven, alguna isla flotante muy lejana, pájaros de luz), y cometas tenues también de día.
3. [ ] **Personajes al máximo** (`src/scene/character.js`): proporciones más lindas (cabeza grande tipo
   chibi pero con más forma), cara con ojos que parpadean y expresiones, pelo con volumen y variedad,
   ropa con detalle (rebozo, sarape, sombrero), caminata con rebote, balanceo de brazos y peso,
   animaciones en reposo (mirar, estirarse, saludar a otros), sombra de contacto. Mirar los personajes
   del original (capturas del dueño: cabeza grande, cuerpo simple, cartelito con nombre arriba).
4. [ ] **Perros y gatos al máximo** (`petRig.js`, `spirits.js`): más razas (hocico largo/corto,
   orejas caídas/paradas/grandes, colas), pelaje con más detalle, ojos con brillo, mejores
   transiciones entre marchas, que los chiquitos corran con pasitos rápidos y los grandes con trancos
   lentos (escalar la frecuencia de paso con `size`), sentarse y acostarse más naturales.
5. [ ] **El hall como el original**: pasillos con nombre y contador ("Pasillo 2 · 320 amigos" en el
   original; acá, nombres propios del Día de Muertos, p. ej. "Pasillo de las veladoras · 27
   huellitas"), carteles colgando arriba de cada muro y cada **piso con su nombre** (el original los
   tiene: "Hogar cálido", "Luz de vela"…; inventar los nuestros, no copiarlos) en el ascensor y en el
   diálogo de pisos.
6. [ ] **El obituario como ventanita en la pared** (capturas del original): al abrir una huellita, el
   marco se vuelve un nicho con puertitas de madera que se abren; adentro, el fondo elegido (cielo con
   luna, prado), la foto grande al centro, repisas a los costados con los regalitos y su **contador**
   (x2, x11), un jarrito de flores y una plaquita con el nombre y las fechas. Hoy la ficha es una hoja
   HTML: armar esa vista en 3D (o en un canvas encima) y dejar la hoja para las acciones.
7. [ ] **Botones del ascensor mucho mejores** (`#floors` en `index.html`/`styles.css`, `floorSky()` en
   `main.js`): botonera de bronce con botones redondos que se hunden y se iluminan, el nombre del
   piso, y al viajar una **vista de cabina** (como la captura "24F · Camino en flor": ojo de buey
   redondo con el cielo que pasa, plaquita con el piso arriba y cartel con el nombre abajo).
8. [ ] **Más farolitos y con mejores detalles** (`lanterns.js`, `world.js`, `hall.js`): farolitos de
   papel picado calado (la luz sale por los dibujos), que se mezan con el viento, llama que titila
   adentro, colgados en guirnaldas sobre los caminos y la pérgola; más en el cielo a lo lejos.
9. [ ] **Arcoíris más lindo** (`river.js`): doble arcoíris (el segundo más tenue y con los colores al
   revés), polvo de luz que cae de él, su reflejo en el agua y que "nazca" de la bruma en las orillas.
10. [ ] **Jardín**: el dueño preguntó si está excelente así; no lo está. Faltan canteros con forma
    (no flores sueltas al azar), caminitos secundarios entre canteros, más variedad de árboles
    (jacarandá, ahuehuete, cempasúchil en macetas de barro), un estanque chico, bancos con faroles, y
    menos pasto uniforme. Sacar una captura desde arriba y diseñar el plano antes de tocar.
11. [ ] **A la altura de Coco (sin copiarla)**: intro cinematográfica más emotiva (cámara que baja por el
    puente de pétalos mientras suena la guitarra), transiciones suaves entre lugares, música por zona,
    pétalos que se levantan al caminar, sonidos al tocar cosas, y que cada gesto tenga una pequeña
    "celebración" en 3D. Revisar todo en celular a 60 fps.
12. [ ] **Del original que todavía no tenemos** (capturas): contador por tipo de regalito en la repisa,
    catálogo de regalitos más grande (el original tiene ~20 solo de comida; cada uno nuevo necesita su
    modelo en `gifts3d.js`), aviso para "Agregar a la pantalla de inicio" (PWA), botón "Recuerdo".

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
