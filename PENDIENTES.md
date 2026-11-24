# Pendientes

Lista para quien siga el proyecto (persona o IA). Leé primero [`AGENTS.md`](AGENTS.md).
Prioridad: **P0** = verificar/arreglar antes de mostrarlo a más gente, **P1** = lo que más suma,
**P2** = completa el relevamiento del sitio de referencia, **P3** = deuda técnica y mejoras.

## 🤝 Traspaso (24/11/2026): hasta dónde llegó la última sesión y qué sigue

Todo lo de abajo ya está en `main` (y en la rama que publica Vercel, ver AGENTS).

**Hecho y probado** (recorrido `scripts/recorrido.mjs`: celular 33/33 con ascensor; iPhone SE, acostado,
compu, modo demo y sin WebGL pasaron antes del ascensor, y SE también con el ascensor):
- Interfaz "modo juego" (palanca invisible, un botón de acción, hoja de menú, se desvanece al caminar).
- Arreglo del parpadeo en negro (el lienzo cambia de tamaño sólo al empezar el cuadro). Publicado.
- Arreglo del 3D congelado al saltar lejos paseando a tu mascota (NaN en `spirits.js`).
- Ascensor de verdad: caminás, entrás, botonera, la cabina sube por la torre de vidrio, salís caminando.
- Quitado `GET /api/activity` (el test ahora usa `POST /api/now`).

**Hecho, sin probar en pantalla** (no dan errores de JS; mirarlos con capturas):
- Sonido de puertas y motor del ascensor (`liftDoors`, `liftHum` en `audio.js`).
- Sonrisa del personaje al regalar, abrazar o saludar (`character.js`: ojitos ∩, sonrisa, cachetes).
- Gracia de cada regalito al llegar a la repisa (`grace()` en `gifts3d.js`: rebota, flota, da una vuelta…).
- Sombras de día en los pisos del cielo, sólo calidad alta (`sunShadows` en `main.js`). Medir FPS.

**Empezado, falta terminar** (en el código pero apagado o sin conectar):
1. **Valle del cielo** (`src/scene/valley.js`, conectado en `heaven.js`, apagado con `VALLEY_READY = false`).
   Pilares, árboles en flor, puentes y cascadas ya se generan. Problemas vistos: el pilar cercano se ve
   como un bloque gris lavado con corte duro sobre el mar de nubes y los árboles no se ven. Falta: más
   contraste y color en la piedra (menos bruma de cerca), que la base se funda con las nubes (no corte),
   pilares más lejos del salón (> 90 m), copas más grandes, y capturas en pisos 20, 50 y 99.
2. **Bruma en capas** (`src/scene/mist.js`, sin conectar). Se conecta con
   `mist = createMist(world.ground, { tier, reduced })` y `mist?.update(world.fog)` en el ciclo. La primera
   versión lavaba de violeta la entrada; ya está más sutil (sobre todo sobre el río) pero sin probar.
3. **Planear con el sarape** (`controls.glide()`, `gliding`, `onLand` en `controls.js`; ya mueve al personaje
   por el aire). Falta: ofrecerlo en `computeAction()` de `main.js` en los pisos del cielo (🌬️ "Planear"),
   la pose de brazos abiertos en `character.js` (pasarle `gliding` en `me.update`), estela de viento,
   un "puf" al aterrizar y probarlo.

**Pedidos nuevos del dueño (24/11), sin empezar — hacer primero:**
4. **Luca sólo en el piso 1.** Hoy su ofrenda (el `easel` de `hall.js`, con el retrato, la estampita, las
   velas, el arco y el marco "hoy en la ofrenda") se ve en los 99 pisos. Plan:
   - `hall.js` → en `render()`: `easel.visible = floor === 0` y `easelLight.visible = floor === 0`.
   - El obstáculo invisible de la ofrenda (`colliders.circles.push({ x: EASEL_POS.x, ... })`, línea ~562):
     guardarlo en una variable y ponerle `r = -100` fuera del piso 1 (si no, choca en el aire).
   - `pickables()`: fuera del piso 1, no devolver los que están dentro del `easel` (`fPhoto`, `spotPhoto`,
     `cardPhoto`); el raycaster no mira `visible`.
   - `main.js` → `visit(m)`: si `m.slot < 0`, `goFloor(0, true)` antes de volar a la ofrenda; en
     `computeAction()` ofrecer "Luca" sólo si `hall.floor === 0`.
   - Revisar si los espíritus del Prado (Luca entre ellos) se ven en los pisos de arriba: `spirits.js` los
     agrega sueltos a la escena (`scene.add(a.pet.group)`); si se ven, esconderlos con `heaven` (`hideUp`).
5. **Efecto del video del dueño** (bioluminiscencia: olas que brillan azul eléctrico donde el agua se mueve,
   chispitas en la orilla mojada, cielo muy cargado de Vía Láctea y árboles como siluetas negras). Plan:
   - **Río** (`river.js`, shader del agua): brillo azul-cian HDR (colores > 1 para que el bloom lo haga
     brillar) en la orilla, en las ondas y alrededor de lo que se mueve (pies en el puente, velitas que
     flotan); puntitos que titilan en el agua y en el barro de la orilla. Nada de `pow()` con base negativa.
   - **Cielo** (shader del cielo en `world.js`): Vía Láctea más densa y brillante, más estrellas, polvo.
   - **Árboles** (`world.js`): de noche, más oscuros (siluetas) con un borde de luz azul suave.
   - Sacar capturas en celular desde el puente y la orilla antes de mergear.

**Tareas que requieren usar la computadora** (Vercel, Upstash, teléfonos reales, vistas previas): paso a
paso en [`docs/tareas-con-computadora.md`](docs/tareas-con-computadora.md).

**Lo que sigue del plan** (abajo, en orden): verificar en teléfonos reales; Upstash y rama de producción
(sólo el dueño, en Vercel); moderación; el resto de P1/P2/P3.

## 🧭 Plan: lo que falta para mejorarlo todo (en orden)

Escrito el 23/11/2026 a la noche, después de las capturas del dueño en su iPhone y del video de
referencia ("Where Winds Meet"). Cada punto dice qué, por qué y dónde tocar. Antes de mergear: capturas
en celular (iPhone 13 y SE) y el recorrido de punta a punta (ver AGENTS).

### 1. Publicar lo que está listo
- [x] **Arreglo de la pantalla negra** publicado el 23/11 (PR #12, verificado en vivo). El recorrido de
      punta a punta dio 35/35 en celular, iPhone SE y compu. Ojo al probar: no correr dos recorridos a la
      vez contra el mismo servidor (se pisan los datos y fallan vela, búsqueda y quitar) y empezar con
      `data/` limpio.
- [x] **Parpadeo en negro de a ratos** (el dueño, 23/11 a la noche): la resolución automática cambiaba el
      tamaño del lienzo *después* de dibujar (ese cuadro salía vacío) y en el celular sube y baja seguido;
      también los eventos `resize` (barra del navegador, teclado) y el modo foto. Ahora todo se aplica
      al empezar el cuadro (`frameStart()` en `main.js`), se ignoran los `resize` que no cambian nada y
      la resolución no sube y baja en ciclo (techo en `quality.js`). Verificado: 0 cambios de tamaño
      fuera del cuadro. Además, sin `backdrop-filter` en lo que se desvanece al caminar (iPhone).
- [ ] Preguntarle al dueño si vuelve a ver el parpadeo o la pantalla negra (con captura y dónde estaba).

### 2. Que se vea limpio en el celular
- [x] **Acuarela apagada por defecto** (`watercolorOn()` en `main.js`, hecho el 23/11). En el iPhone del
      dueño se veía sucia y lavada (líneas negras y textura de lienzo por todos lados). Dejarla como
      opción en Más → Opciones; si se quiere el look de littleprince.dev, pedirle capturas al dueño (el
      juego necesita WebGPU y en el contenedor no carga) y bajarla mucho (`uAmt` ≈ 0.3, sin bordes Sobel).
- [x] **Interfaz "modo juego"** (hecho el 23/11 a la noche; el dueño: "los juegos tienen muy poquitas
      cosas en pantalla"). Arriba sólo un botón de menú con el anillo de los gestos de Hoy (`#hub-btn`);
      la marca, "acá ahora", tu personaje y la música se mudaron a la hoja de menú (`#hub`, íconos
      grandes, sube desde abajo en el celular). **Palanca invisible**: la maneja `controls.js`
      (`stickZone`, `onStick`, `sticking`); aparece donde apoyás el pulgar en la mitad izquierda y un
      toque sin arrastrar sigue siendo "caminar hasta ahí". La primera vez se ve una palanca fantasma
      (`#joy-ghost`) que enseña dónde va el dedo. **Un botón de acción** (`#act-btn`, `computeAction()` en
      `main.js`, cada 0,3 s): 🎾 pelota cerca (o paseando), 🕯️ la ofrenda o un marco al que mirás, ＋ un
      lugar libre, 🛗 ascensor, 🫙 frasco, 🐾 acariciar (quieto 2,5 s al lado de tu mascota) y si no,
      🤍 gestos; cuando hace otra cosa, los gestos quedan en una burbujita al lado (y mantenerlo
      apretado también los abre). **Sin dock.** Al caminar o mientras vuela la cámara, `body.moving`
      desvanece todo y vuelve medio segundo después de frenar. Avisos arriba (abajo va el pulgar);
      los "suaves" (`toast(..., null, true)`) no salen mientras caminás; la hora de las velas y
      "Agregar a la pantalla de inicio" son tiras chicas arriba.
- [x] **Recorrido de punta a punta como script**: `scripts/recorrido.mjs` (ver AGENTS). Dio 129/129 en
      celular, iPhone SE, acostado, compu, modo demo y sin WebGL.
- [x] **Arreglado: el 3D se congelaba** si saltabas lejos mientras paseabas a tu mascota (ascensor,
      volver a la entrada, un marco lejano) estando quieto: el espíritu reaparecía con un destino sin
      velocidad, daba NaN y la correa tiraba un error en cada cuadro. Ahora `reappear()` limpia el destino,
      `move()` se recompone si algo es NaN y la correa no se dibuja con puntos inválidos.
- [ ] Probar la palanca invisible y el botón de acción en un teléfono de verdad (que el pulgar no
      choque con el borde ni con el gesto de "atrás" de Android; ajustar `stickZone` si hace falta).

### 3. Que se sienta como el video (sin copiarlo)
Lo que lo hace lindo: bruma en capas, perspectiva aérea (lo lejos se aclara a celeste), vista inmensa
con capas de profundidad, masas de árboles en flor, y moverse planeando. Etapa A, con lo que tenemos:
- [ ] **Atmósfera en capas**: niebla de altura (shader propio o `onBeforeCompile` del `fog` de three) y
      bancos de bruma entre objetos (sprites/planos con ruido que se mueven), más fuerte a lo lejos.
- [ ] **"Valle del cielo"** en los pisos altos (`heaven.js` / `skymagic.js`): pilares de piedra gigantes
      (karst) a varias distancias, árboles en flor rosa y lila en masas, puentes colgantes entre pilares,
      cascadas que caen en la bruma.
- [ ] **Planear**: saltar desde el borde del piso del cielo (o desde una isla) y planear con el sarape
      abierto como alas (o agarrado a un barrilete), con estelas de viento y un aterrizaje suave. Nuevo
      modo en `controls.js` (velocidad hacia adelante, caída lenta, giro con la palanca) y animación en
      `character.js`.
- [ ] **Luz de día con sombras de verdad** en esos pisos (`DirectionalLight` con sombras sólo en calidad
      alta, `shadow.mapSize` 1024, que siga al personaje).
- [ ] Etapa B (**decide el dueño**): modelos 3D hechos por artistas (glTF) para árboles, rocas, personajes
      y perros con animaciones de verdad; bibliotecas CC0 (Quaternius, Kenney, Poly Pizza) o encargados.
      Rompe la regla de "todo generado en código" de AGENTS, suma peso de descarga y hay que medir FPS en
      gama media. Preguntarle antes de empezar.

### 4. Verificar en teléfonos reales (no se puede desde el contenedor)
- [ ] FPS con **calidad alta por defecto** en un Android de gama media y en un iPhone viejo; si no da,
      que `autoTier` vuelva a elegir media en celulares con poca memoria.
- [ ] Que la intro de película se vea fluida y que las leyendas coincidan con el vuelo (van con
      `setTimeout`, el vuelo con el reloj del juego).
- [ ] Sonidos: pasos, música por zona, murmullo del río, burbujas; que no saturen con todo junto.
- [ ] La pantalla negra (ver punto 1) y que al volver de otra app el 3D siga bien.

### 5. Lo que quedó de antes (sigue valiendo)
- [ ] Al abrir una huellita, una vista grande del nicho en 3D con las repisas a los costados (como el
      original), en lugar de la foto plana de la ficha.
- [ ] Expresiones del personaje (sonrisa al regalar), más ropa a elegir.
- [ ] Regalitos con su gracia al llegar (la pelota rebota, el globo tira para arriba).
- [ ] Todo lo de P0 (Upstash, rama de producción de Vercel, moderación), P1, P2 y P3 de abajo.

## ✅ Ya hecho: lo que pidió el dueño (23/11/2026) — hecho y lo que falta

Pedidos del dueño con capturas del original (lightapaw.com) y del juego littleprince.dev. Casi todo
quedó hecho en la tanda del 23/11; abajo, qué se hizo y qué se puede seguir mejorando. Regla del dueño:
"no hagas berretadas" — cada cosa, con capturas en celular antes de mergear.

- [x] **Estilo acuarela** (`src/scene/watercolor.js`, último pase del composer): papel con fibras,
      pigmento en los bordes (Sobel), lavados, color que sangra, viñeta. Desde el 23/11 viene apagada (se prende en Opciones). Falta:
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
- [x] **Botonera y cabina del ascensor**: botones de bronce con nombre del piso.
- [x] **Entrar y salir del ascensor como uno de verdad** (pedido del dueño, 24/11): caminás hasta la
      puerta, campanita, se abren las puertas, entrás a la cabina (con interior), te das vuelta y elegís el
      piso (la botonera es una hoja baja para que te veas adentro). La cabina sube por la torre de vidrio
      con vos adentro (o baja hacia el piso nuevo), velo de nubes, frena, campanita y salís caminando.
      Con sonido propio de las puertas y del motor (`liftDoors`, `liftHum` en `audio.js`). Falta: verlo
      en un teléfono real (los tiempos: ~9 s de punta a punta).
- [x] **Farolitos** (`paperLantern` en `lanterns.js`): papel calado, aros, llama que titila,
      guirnaldas sobre el camino, colgando de la pérgola del salón (uno cada dos postes, `hall.js`),
      en el ahuehuete y más en el cielo.
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
      `main` en Vercel → Settings → Environments → Production Branch. (Al cierre del 23/11/2026 `main` y
      esa rama apuntan al mismo commit y el sitio sirve el mismo `index-*.js` que `npm run build`.)
- [ ] **Conectar Upstash en producción**: `/api/health` sigue respondiendo `ok:false` ("Falta conectar
      Upstash Redis", revisado de nuevo al cierre del 23/11/2026), así que el sitio está en **modo demo**:
      cada visitante solo, sin presencia compartida, y lo que suma la gente se pierde al borrar el
      navegador. Es lo que más falta para mostrarlo. Vercel → Storage → Create Database → Upstash for
      Redis → conectar a Production y Preview → Redeploy.
- [ ] **Deploy real en Vercel + Upstash.** Todo se probó con un Upstash simulado (`server/api.test.js`).
      Confirmar: rewrite `/api/:path*` → `api/handler.js`, lectura de `KV_REST_API_URL`/`TOKEN`,
      fotos servidas con caché de CDN, y que sin Upstash la app caiga bien al **modo demo**.
- [x] **Conservar los recuerdos al crecer el jardín**: se quitaron los recortes que borraban las
      páginas del diario después de 200, las firmas después de 500, los regalitos después de 50,
      las notas del frasco/consuelo después de 300 y los gestos después de 200. Las lecturas siguen
      acotadas. `server/history.test.js` supera esos límites y vuelve a abrir la base desde disco
      para verificar que los primeros recuerdos, los corazones y el acceso familiar siguen ahí.
- [ ] **Rescatar los datos del modo demo antes de pasar a la base compartida**: conectar Upstash no
      importa `huellita.local.v2`; queda guardado en cada navegador, pero la app deja de mostrarlo
      al pasar a modo servidor. Falta exportar/importar con reintentos sin duplicados (huellitas,
      fotos, voz, diario, libros, regalitos y notas), conservando el permiso de edición. No borrar
      el almacenamiento del navegador para probar la conexión.
- [ ] **Verificación con dos visitantes reales** después de conectar: ambos deben verse en el mismo
      piso, y una vela/flor/mensaje creado en uno debe aparecer en el otro. Cerrar y volver a abrir
      para comprobar el guardado. El movimiento hoy se actualiza cada 5–12 s (no hay WebSockets).
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

- [ ] **Probar las vistas previas en el mundo real**: el servidor ya responde bien (23/11/2026:
      `curl https://encende-una-huellita.vercel.app/h/luca` devuelve `og:title` "Luca · Encendé una
      huellita", su texto y `og:image` absoluta a `/huellitas/luca-og.jpg`). Falta mandarlo por WhatsApp e
      Instagram (y pasarlo por el depurador de Facebook) para ver la tarjeta de verdad.
- [ ] **Más viral**: recordatorio "hoy cumpliría años" con link para compartir; contador público de
      velas de la noche en la entrada; QR imprimible para la ofrenda de casa; video corto del paseo.

- [ ] **Regalitos**: que cada uno tenga su gracia al llegar (la pelota rebota, el globo tira para
      arriba, la mariposa da una vuelta al marco) y que al tocarlo en la repisa diga quién lo dejó.
      Si se suma un regalito al catálogo (`server/glow.js`), sumarle su modelo en `src/scene/gifts3d.js`.
- [ ] **El río**: reflejos de verdad (render a textura) en calidad alta, pececitos de luz, y que el
      espíritu en el paseo se pare a mirar el agua en el puente.
- [ ] **Pisos del cielo**: hoy el salón de cada piso es igual (con su muro). Se podría variar la
      decoración según la altura (más flores blancas y luz arriba) y sumar algo único en el piso 99.
- [ ] **Espíritus**: los que pasean otros visitantes ya se ven (`spirits.setRemote`) pero sólo siguen a
      su dueño: falta que jueguen con la manada del Prado y con el tuyo (hoy `others()` en `spirits.js`
      no los incluye). Más acciones (tirar de una soga entre dos, cavar, perseguir mariposas de luz);
      ladridos/maullidos suaves.

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
- [x] Dirección web propia por huellita: `/h/luca` (con vista previa propia; `#h/luca` sigue andando).
      Opcional: una más corta (`/luca`).
- [ ] Idiomas (hoy sólo español).
- [ ] Partes pagas a implementar cuando se monetice: ver `MONETIZACION.md` (planes, regalos para otros,
      recuerdos impresos, cartas con IA, donaciones con muro de agradecimiento).

## P3 · Deuda técnica

- [ ] **Dividir `src/main.js`** (≈3.090 líneas y creciendo) en módulos: ficha, formularios, familia,
      juego, guía, ascensor, presencia.
- [ ] **Archivos fuera de Redis**: fotos (≈100–150 KB) y voces (hasta 600 KB) se guardan en base64 en
      Upstash; pasar a Vercel Blob/S3 y dejar sólo la URL.
- [ ] **Historial completo y respaldo**: Redis ya conserva las listas sin recortes; la ficha sigue
      mostrando los últimos 100 mensajes, 50 páginas y 30 regalitos (tableros: 60 notas; actividad:
      20 gestos). Agregar paginación para consultar los anteriores y configurar respaldos de la base.
      Medir almacenamiento: ahora aumenta con los recuerdos, además de las fotos y voces.
- [ ] **Presencia**: un solo latido (`POST /api/now` con `since`) cada 12 s (solo) o 5 s (con gente),
      3 comandos de Redis cada uno; nada con la pestaña oculta. Una visita de 10 min gasta ≈150–400
      comandos (el plan gratis de Upstash da 500.000/mes). Con mucho más tráfico: WebSockets/SSE
      (Ably, Pusher, PartyKit) para que los demás se muevan en tiempo real y gastar todavía menos.
- [ ] **Paquete JS**: three.js ya va en su propio archivo (≈193 KB comprimido, queda en caché entre
      versiones) y la app en otro, que creció a ≈118 KB comprimido (326 KB sin comprimir, 23/11/2026 a la noche;
      antes ≈76 KB). Falta cargar diferido lo que no hace falta al entrar: guía, compartir, voz, y del 3D
      lo que está lejos de la entrada (pisos del cielo, `skymagic.js`, ascensor, regalitos).
- [x] `GET /api/activity/:since` quitado (la app usa `POST /api/now` con `since`; el test ahora prueba eso).
- [x] **Tests de frontend**: `scripts/recorrido.mjs` recorre todo en 6 dispositivos (ver AGENTS). Falta
      correrlo en CI (necesita Chromium; con swiftshader tarda unos 25 minutos en total).
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
- [ ] En teléfonos lentos, al abrir un link directo (`/h/luca`) la cámara puede tardar en llegar a la ofrenda.
