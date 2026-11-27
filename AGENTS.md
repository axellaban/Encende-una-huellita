# Guía para agentes (IA) que sigan este proyecto

> **Empezá por acá.** Después leé [`PENDIENTES.md`](PENDIENTES.md) (arriba de todo, "🧭 Plan": qué falta, en orden),
> [`README.md`](README.md) (qué hace la app), [`MONETIZACION.md`](MONETIZACION.md) (qué será pago)
> y [`docs/investigacion-rea.md`](docs/investigacion-rea.md) (relevamiento del sitio de referencia).
> Configuración de cuentas (paneles web, CLI o conectores) y pruebas en teléfonos reales:
> [`docs/tareas-con-computadora.md`](docs/tareas-con-computadora.md).

## Qué es

**Encendé una huellita**: un jardín memorial 3D para mascotas, con estética de Día de Muertos.
Inspirado en lightapaw.com (relevado con [REA](https://github.com/morluto/rea)), pero con código,
textos y arte propios. La huellita destacada del centro es **Luca**, el perro del dueño del proyecto
(nació el 22/10/2012, partió el 25/10/2026).

## Sobre la persona y cómo trabajar con ella

- Habla español rioplatense (vos, tocá, encendé). **Toda la interfaz y los textos van en ese registro.**
- Quiere ver los avances desplegados: **mergear a `main` cuando algo esté listo y probado**.
  El trabajo se hace en una rama y después se empuja también a `main`.
- **Producción publica `main`** (corregido el 23/11/2026). Ya no hace falta empujar a
  `claude/ecstatic-gates-rt74m2`. Vercel está configurado con Node 22, igual que `package.json`.
- **Upstash ya está conectado en producción**: `/api/health` responde `{"ok":true,"storage":"upstash"}`.
  Base `encende-una-huellita`, región `iad1`, plan Free; eviction y autoUpgrade desactivados para
  no borrar recuerdos al llenar la base ni cambiar de plan automáticamente. Las variables
  `KV_REST_API_URL`/`KV_REST_API_TOKEN` están sólo en Production; las previews siguen en modo demo.
  Fotos, voz, diario, libro, velas, flores, regalitos y presencia ya se verificaron con la base real.
  **Los datos del modo demo se recuperan al volver a entrar desde el mismo navegador** (`src/migrate.js`
  → `POST /api/import` → `server/migration.js`). El original queda como respaldo. La clave privada
  `huellita.import.v1` permite reintentar sin duplicar y conservar el permiso de edición: no borrarla
  para probar un reintento. Si falla la conexión, la entrada ofrece reintentar y descargar una copia.
  `.env*` y `.vercel` no se suben a Git.
- Prioridad absoluta: **experiencia en el celular** (mobile-first, que se sienta como un juego amable).
- Es un proyecto con carga emocional (Luca murió hace poco). Tono cálido, nunca frívolo.
- Decisiones ya tomadas que **no hay que revertir**:
  - No copiar personajes, nombres, diseños puntuales ni música de la película *Coco* (Disney/Pixar).
    La estética es Día de Muertos tradicional (papel picado, cempasúchil, ofrenda, calaveritas, alebrijes).
  - No copiar código, textos ni imágenes de lightapaw.com.
  - Las funciones pagas del original van **gratis por ahora**, centralizadas en `server/plans.js`
    (`allowed()`), documentadas en `MONETIZACION.md` y marcadas con `MONETIZAR` en el frontend.
  - Sin texto libre en lo que se ve en el 3D (las frases de los visitantes salen de un catálogo).

## Cómo correrlo

```bash
npm install
npm run build && npm start   # http://localhost:8787 (datos en data/kv.json)
npm run dev                  # Vite con recarga (5173) + API (8787)
npm test                     # API local/Vercel, conservación y reintentos del rescate
```

Node 22. Sin dependencias de servidor (sólo `three` y `vite`).

## Arquitectura en 1 minuto

- **Plano del jardín**: los números están arriba de `src/scene/world.js` (`HALL_CENTER`, `HALL_RADIUS`,
  `GARDEN_RADIUS`, `SPAWN`, `CREEK_Z`, `BRIDGE`, `MEADOW`, `ELEVATOR_POS`); lo demás se ubica a partir de ellos.
  **Se llega de afuera**: `SPAWN` está del otro lado del río, se cruza el Puente del Arcoíris y se entra
  por el arco de cempasúchil. Afuera es tierra y pasto apagado (`outside(x, z)`), adentro el jardín de
  colores. Al río no se entra (`inWater`); el arco del puente sube y baja al personaje (`groundY`).
  Si se agranda algo, revisar que no quede encimado (camino, faroles, bancos, frasco, carteles en
  `cozy.js`, árboles) y sacar una captura desde arriba (`H.controls.teleportCamera(...)`).
- **Frontend** (Vite + Three.js, sin framework): `index.html` + `src/`.
  - `src/main.js` (≈3.090 líneas, el más grande): arranque, UI, ficha, modales, gamificación, guía,
    ascensor, presencia, paseo. **Candidato a dividir** (ver PENDIENTES).
  - `src/scene/`: `world.js` (cielo, pasto, árboles, faroles, luciérnagas), `hall.js` (muro de
    marcos, pérgola, ofrenda central de Luca, estampita), `muertos.js` (papel picado, cempasúchil,
    calaveritas, pan de muerto, pueblito, fondos), `cozy.js` (camino de pétalos, frasco, alebrijes,
    Prado de los espíritus), `river.js` (el río, el Puente del Arcoíris y el arco de entrada),
    `elevator.js`, `avatars.js` (otros visitantes), `lanterns.js` (farolitos), `sparkles.js`
    (brillitos que caen alrededor de la cámara, todo en el shader), `textures.js`.
  - **Regalitos y gestos en 3D** (`gifts3d.js`): `giftMesh(emoji)` arma cada uno de los 36 regalitos
    de `server/glow.js` con geometría (caché por emoji, tamaño 1, apoyado en y=0); si se suma uno al
    catálogo, hay que sumarle su modelo en `SPECS` (si no, sale el emoji como cartelito).
    `createOfferFx` hace los gestos: la llamita que vuela a la veladora, la flor que estalla en pétalos,
    el regalito que sale de la mano y se apoya en la repisa (`hall.holdGift` lo esconde mientras vuela)
    y los corazones del abrazo. `hall.offerPos(key, kind)` dice dónde cae cada gesto; en `main.js`,
    `offerGesture()` gira al personaje, hace `me.offer()`/`me.hug()` y lanza el efecto.
  - **Interfaz "modo juego"** (casi nada fijo en pantalla): arriba a la derecha `#hub-btn` abre la hoja
    de menú `#hub` (íconos grandes; ahí están "acá ahora", tu personaje, la música y todo lo que era
    la barra de abajo, que ya no existe). Abajo a la derecha, **un solo botón de acción** (`#act-btn`):
    `computeAction()` en `main.js` decide cada 0,3 s qué ofrece según lo que haya cerca (pelota,
    ofrenda, marco, lugar libre, ascensor, frasco, tu mascota; si no, gestos). Si sumás algo tocable
    al jardín, sumalo ahí. `body.moving` desvanece la interfaz al caminar; `toast(texto, acción, true)`
    es un aviso "suave" que no sale mientras caminás. Los avisos van arriba: abajo está el pulgar.
  - **Palanca invisible**: en `controls.js` (`stickZone`, `onStick`, `sticking`). Un toque sin arrastrar
    en esa zona es un toque normal. Los toques se miden con `e.timeStamp` (no con `performance.now()`).
  - **Tercera persona**: `controls.js` mueve a tu personaje (`player.pos`, `player.heading`) y maneja la
    cámara en tres modos: `follow` (detrás del personaje; arrastrar orbita, pellizcar acerca),
    `focus` (mira un punto fijo, p. ej. un marco: `flyTo(stand, target)`) y `fixed` (intro:
    `teleportCamera`). `follow({ path, duration, done })` vuela de vuelta detrás del personaje.
    La cámara se acorta si un muro (`colliders.segments`) o un poste/tronco (`colliders.circles`)
    queda en el medio. `createBlocker(colliders)` es la colisión compartida con los espíritus.
  - `skymagic.js`: cometas, estrellas fugaces, bancos de nubes, islas flotantes y pájaros de luz
    (`setK(k)` desde `heaven.js`). La Vía Láctea, las nebulosas y los cirros están en el shader del
    cielo de `world.js`. `watercolor.js`: el pase final de acuarela (Opciones → Estilo acuarela).
  - `src/floors.js`: nombres propios de los 99 pisos y de los 10 pasillos (no usar los del original).
  - Muro: cada lugar ocupado es una ventanita con postigos (un solo `InstancedMesh`, `updateShutters`).
  - **Modo obituario** (`#obit` en `index.html`, `setObit`/`fillObit`/`obitShot` en `main.js`): abrir una
    huellita la muestra a pantalla completa: el nicho en 3D encuadrado entre la cabecera (nombre, años,
    palabras de la familia, quiénes le encendieron velas, visitas) y la barra de gestos con contadores;
    flechas ‹ › a la huellita de al lado (orden del muro). La ficha de siempre (`#sheet`) queda abierta pero
    guardada fuera de la pantalla (`setSheet('obit')`), así todos sus botones siguen andando: la barra los
    toca por adentro. "Su historia" o "Libro" la muestran (`obitExpand`); su cruz vuelve al obituario
    (`backToObit`) y "‹" vuelve al jardín. Sin WebGL se abre la ficha completa. Visitas:
    `POST /api/memorials/:id/visit` (una por persona por día, `visits`/`visitsToday`, límite propio).
  - **Vitrinas del salón, cuadros de la boca de cada pasillo y atriles** (`hall.js`, `render()` →
    `themedLists`/`paintCell`): **sólo huellitas de verdad**, nunca mascotas inventadas. Cada vitrina tiene
    un tema con su cartel (Siempre en nuestro corazón = más velas, Recién llegadas, Esperando una vela,
    Las recordamos este mes, Perritos, Gatitos); los cuadros de las bocas muestran a quienes están en ese
    pasillo. Lo que sobra es "lugar libre" (`vacantCellTexture`, `userData.kind = 'add'` → `addFromCell`).
    **Tocar cualquier cuadrito con foto abre su obituario ahí mismo** (`visitHere(m, mesh)` en `main.js`:
    la cámara encuadra ese cuadrito, no te lleva al nicho) y el botón de acción lo ofrece si lo tenés
    adelante (`hall.nearestCell`).
  - `heaven.js`: los pisos hacia el cielo (mar de nubes, nubes de algodón, sol, rayos). `elevator.js`:
    la torre: planta baja con el hueco de la puerta y la cabina con interior (descansa en la planta baja
    de cada piso; `setFloor(n)` sólo cambia el indicador). La escena del viaje está en `main.js`
    (`callElevator` → camina a la puerta y entra; `rideTo(f)` → sube o baja de verdad por la torre con
    la toma `elevator.shot()`, el velo de nubes `#lift-veil` tapa el cambio de piso; `leaveLift` → sale
    caminando). Durante la escena `controls.held` deja que la escena mueva al personaje y
    `body.riding` esconde la interfaz. `H.goFloor(n)` sigue cambiando de piso al instante.
  - `character.js`: el personaje de cada visitante (vos y `avatars.js`): caminar, `wave()`, `throw()`, `pet()`.
  - **Espíritus**: `petRig.js` arma un `SkinnedMesh` por mascota (una sola malla, colores por vértice,
    brillo fresnel) y un animador que mezcla marchas (paso/trote/galope/saltitos) con acciones
    (`want.sit/lie/bow/rear/sniff/carry/tilt` y `trigger('jump'|'roll'|'shake')`). `spirits.js` es el
    cerebro: estados por espíritu (`idle`, `wander`, `zoomies`, `chase`, `bow`, `wrestle`, `ball`,
    `carry`, `rest`, `roll`, `greet`, `follow`, `explore`…), la pelota con física, huellitas de luz y
    chispitas. `setPack(memorials)` elige quiénes juegan; `walk(m, from)` saca a pasear.
    En el jardín se reparten por zonas (`zoneForIndex`): el Prado (`meadow`), la plazoleta de después del
    Puente del Arcoíris (`plaza`), claros del campo (`field`, cada uno con su `d.home` en `fieldHomes`) y
    el césped (`lawn`); `field` y `lawn` te acompañan al mundo abierto. Cuántos: 16 / 12 / 8 según la
    calidad: Alta / Media / Ahorro (`maxPack`). Los que están a más de 38 m de la cámara se animan ~8 veces por segundo (LOD).
    Cómo se ve cada uno sale de `m.look` (`server/looks.js`) o, si no hay, de un hash de su id.
  - `src/api.js`: cliente HTTP + **modo demo** (localStorage) si no hay base de datos.
    Una vez usado el jardín compartido, un corte de internet ofrece reintentar y no abre otro jardín
    privado. `src/migrate.js` recupera huellitas, fotos, voz, diarios, libros, regalos, notas y gestos
    locales por lotes; remapea los permisos, preferencias y el progreso del día. El servidor usa un
    script Redis para guardar cada registro junto con su recibo, incluso si se pierde la respuesta.
  - **Compartir** (`src/share.js`, `server/page.js`): cada huellita vive en `/h/<id>` (los links viejos
    `#h/<id>` siguen andando). El servidor devuelve la app con título, texto e imagen de esa huellita
    (Vercel: rewrite `/h/:id` → `api/handler.js?page=:id`, que lee `dist/index.html` incluido con
    `functions.includeFiles`, o lo pide a sí mismo, o devuelve una página mínima que redirige).
    La imagen: `og` de las destacadas (`public/huellitas/luca-og.jpg`), la tarjeta que sube la familia
    (`drawOgCard`, 1200x630, liviana: < 280 KB) o su foto. **`OG_VERSION`** (`share.js`): al cambiar el
    diseño de la tarjeta, subila en uno y quien cuida cada huellita la vuelve a subir sola al abrirla
    (cambia el `?v=` y WhatsApp toma la nueva). Las etiquetas van al principio del `<head>`
    (`injectMeta` saca las viejas y pone las nuevas, con `og:site_name`, tipo y medidas si se saben).
    La función de Vercel responde `HEAD` (antes 405: algunos robots de vista previa preguntan así).
    Si cambiás `public/og.jpg` o `luca-og.jpg`, subí el `?v=` en `index.html`, `page.js` y `seed.js`.
    Invitar: `?de=<nombre>&l=<código>`; la primera vela de quien llega suma al código (`hu:ref:<código>`).
    El texto que acompaña cada link sale de `inviteText()` en `main.js`; "Enviar por WhatsApp" usa `wa.me`.
    **Guardar y compartir imágenes** (`src/saveimg.js`): en iPhone "Guardar" abre la hoja de compartir
    *sin texto* (si no, iOS esconde "Guardar imagen") y si no se puede, se pide mantener apretada la
    imagen; en la compu y Android es una descarga de verdad (el `<a>` va adentro del `<dialog>` abierto,
    afuera queda inerte). Las imágenes se pintan y comprimen **antes** del toque (`keepBlob`,
    `shareBlob`, `lastPhoto.blob`): `navigator.share` falla si pasa mucho entre el toque y la llamada.
    Todo en JPEG. **Fotos con franjas** (`src/photoTrim.js`): `contentRect`/`drawCover` recortan las
    bandas negras o blancas de las capturas de pantalla al subir, en el 3D, en la ficha y en las tarjetas.
    `src/photo.js`: polaroid del modo foto (captura del canvas en el mismo cuadro en que se dibuja,
    `captureNext` en el ciclo).
  - `src/game.js` (gestos del día, racha, Glow guardado), `src/guide.js` (la sexta etapa),
    `src/quality.js` (calidad + resolución adaptativa), `src/audio.js` (todo sintetizado).
    **Calidad: Alta por defecto.** Lo que elige la persona en Opciones queda en `huellita.quality.v3`.
    Si el 3D se pierde (`webglcontextlost`) con el jardín a la vista y en uso, baja un escalón **por un
    día** (`huellita.quality.auto`); si se perdió con la página de fondo (el iPhone le saca la memoria
    gráfica a las pestañas de fondo), sólo se recarga al volver. Antes bajaba para siempre y muchos
    quedaban trabados en "Ahorro".
- **Backend**: `server/core.js` (rutas, independiente del runtime) + `server/store.js` (lógica sobre
  comandos Redis) + `server/kv/` (cliente REST de Upstash y emulador de Redis en memoria/archivo).
  - Local: `server/index.js`. Vercel: `api/handler.js` (todas las `/api/*` llegan por el rewrite de `vercel.json`).
  - `server/seed.js`: huellitas destacadas (Luca) definidas en código; la base sólo guarda sus contadores.
  - `server/glow.js`: reglas del Glow, regalitos, frases y gestos. `server/plans.js`: funciones pagas y fondos.
- **Presencia y novedades**: un solo pedido periódico, `POST /api/now` con `since` (posición del
  personaje, gesto, espíritu que pasea) que devuelve a los demás visitantes y los eventos nuevos. La
  presencia vive en un HASH `hu:pres` (sid → JSON con `at`) y cuesta 3 comandos por latido; hay un
  test que lo controla. Los eventos traen los contadores (`c` velas, `f` flores) para actualizar la
  huellita sin pedir la lista entera. No subas la frecuencia sin mirar el costo (PENDIENTES).
- **Datos**: Upstash Redis (variables `KV_REST_API_URL`/`KV_REST_API_TOKEN` que pone la integración de
  Vercel). Fotos y voces van en base64 dentro de Redis (deuda técnica, ver PENDIENTES).
- **Auth**: no hay cuentas. Quien crea una huellita recibe un `editToken` que queda en localStorage;
  el enlace "Invitar a la familia" (`#familia/<id>/<token>`) lo comparte.

## Convenciones

- Comentarios y textos en español. Nada de nombres de modelos de IA en commits ni código.
- Cambios de API: agregar el test en `server/api.test.js` (corre contra local y contra la función de Vercel).
- Colores HDR (>1) en materiales emisivos para que el *bloom* los haga brillar; cuidado con valores
  enormes (ya hubo un bug de pantalla blanca por luciérnagas gigantes cerca de la cámara).
- **Nunca cambies el tamaño del lienzo fuera del cuadro**: `renderer.setSize`/`setPixelRatio` lo borran y, si
  pasa después de dibujar (o en un evento), se ve un cuadro negro (era el parpadeo del 23/11). Usá
  `sizeDirty`, `pendingRatio` o `adaptive.apply()`, que se aplican en `frameStart()` antes de dibujar.
- **Nada de NaN en el ciclo**: un `NaN` en un espíritu o en la correa hace que el cuadro tire un error y el 3D
  se congele (pasó con `reappear()` en `spirits.js`). Si algo puede dividir por cero o quedar sin un
  campo (p. ej. un `goal` sin `speed`), poné un valor por defecto.
- **Shaders sin NaN** (ya hubo pantalla negra por esto): nunca `pow()` con una base que pueda ser negativa
  (para un cuadrado usar `x * x`), `clamp` en bases tipo `1.0 - dot(...)`, `smoothstep(a, b, x)` siempre con
  `a < b` (si hace falta al revés: `1.0 - smoothstep(b, a, x)`), y cuidado con `atan(0,0)` y `normalize(0)`.
  Un solo píxel NaN lo desparrama el bloom por toda la pantalla; hay un pase que los limpia antes del
  bloom en `setupRenderer()`, pero no hay que depender de él.
- El cempasúchil (`marigoldGeometry` en `muertos.js`) son pétalos sueltos en capas: cualquier material
  que lo use tiene que ser `side: THREE.DoubleSide` (si no, de atrás desaparecen pétalos). Las guirnaldas
  y arcos van sobre un carrizo (un tubo) para que las flores no parezcan flotar.
- Todo lo visible se genera en canvas/geometría: no hay modelos ni imágenes externas salvo las fotos
  de `public/huellitas/` y los íconos de `public/`.
- CSS: tema vino en paneles (`dialog.modal`, `.sheet`) vía variables; los "papeles" (notas, libro,
  diario, estampita) son claros con tinta oscura. `[hidden]` siempre gana (`display:none !important`).

## Recorrido de punta a punta

Antes de mergear algo grande, corré **`scripts/recorrido.mjs`** (con `npm run build && npm start` y
`data/` limpio; `NODE_PATH=$(npm root -g) node scripts/recorrido.mjs http://localhost:8787 celular`, o sin
el último argumento para los 6 dispositivos; `RECORRIDO_SHOTS=<carpeta>` guarda capturas de lo que falle
y `RECORRIDO_DEBUG=1` muestra las trazas de errores de JS). Tarda: con swiftshader cada dispositivo son
5 a 8 minutos. Si agregás algo a la app, agregalo al recorrido. Lo que cubre (como en la auditoría del 23/11/2026):
entrar, bienvenida, visitar a Luca, vela (y que no sume dos veces), flor, abrazo, regalito, libro,
compartir, sumar una mascota con foto y "cómo era", editar, diario, pasear, caminar, pelota, llamar,
Hoy, lista con búsqueda, menú → Prado, gestos y frases, guía, frasco, farolillo, consuelo, "Así te
ven los demás", pisos y quitar la huellita. En celular, compu, celular acostado, iPhone SE, modo demo
(`/api/health` con `ok:false`) y sin WebGL (`--disable-webgl`: tiene que verse el aviso y poder abrir
fichas por encima).

## Cómo verificar visualmente (sin GPU)

En el contenedor hay Chromium + Playwright preinstalados. Patrón usado en todo el proyecto:

```js
const { chromium, devices } = require('playwright'); // NODE_PATH=$(npm root -g)
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ ...devices['iPhone 13'] }); // celular
// localStorage: 'huellita.quality.v3' = 'low' acelera (la clave vieja 'huellita.quality' ya no hace nada);
// 'huellita.welcomed' = '1' salta la bienvenida.
// Entrar: await p.click('#enter'), luego un clic en el canvas salta la intro.
// Con ?debug en la URL: window.__huellita = { controls, camera, THREE, spirits, me, startWalk }:
//   H.controls.placePlayer(new H.THREE.Vector3(x, 0, z), new H.THREE.Vector3(tx, 0, tz)); H.controls.snapFollow();
// H.renderer permite pausar el dibujo en pruebas de dos sesiones sin detener los latidos.
//   H.startWalk('luca')   // sacar a pasear a Luca
```

Los 36 regalitos juntos: `npm run dev` y `/lab/gifts.html?t=1.3`.
Para los espíritus sin entrar al jardín: `npm run dev` y `/lab/pets.html?t=1.5&pose=sit&side&d=0.55`
(congela en t segundos) o `/lab/pets.html?mode=pack` con `window.__lab.advance(20)` (simula 20 s del
Prado y deja en `__lab.log` qué hacía cada espíritu).

Con swiftshader todo anda a pocos FPS: los vuelos de cámara tardan mucho más que en un teléfono real
(esperar 8–10 s antes de sacar captura). Para simular toques, mandá `Input.dispatchTouchEvent` por CDP **con
`timestamp`** (si no, el emulador lento los toma como "mantener apretado" y no cuentan como toque); hay
un ejemplo en `touchDrag()` de `scripts/recorrido.mjs`. Los 99 pisos están abiertos: `H.goFloor(98)` lleva al cielo de una (`src/scene/heaven.js` mezcla los
colores del cielo, la niebla y las luces según el piso; `world.ground` es lo que se esconde arriba y
`colliders.up` desactiva los choques del suelo). Antes, para probar el ascensor hacía falta una huellita en el piso 2
(`POST /api/memorials` con `"slot": 95`).
