# Guía para agentes (IA) que sigan este proyecto

> **Empezá por acá.** Después leé [`PENDIENTES.md`](PENDIENTES.md) (qué falta, priorizado),
> [`README.md`](README.md) (qué hace la app), [`MONETIZACION.md`](MONETIZACION.md) (qué será pago)
> y [`docs/investigacion-rea.md`](docs/investigacion-rea.md) (relevamiento del sitio de referencia).

## Qué es

**Encendé una huellita**: un jardín memorial 3D para mascotas, con estética de Día de Muertos.
Inspirado en lightapaw.com (relevado con [REA](https://github.com/morluto/rea)), pero con código,
textos y arte propios. La huellita destacada del centro es **Luca**, el perro del dueño del proyecto
(nació el 22/10/2012, partió el 25/10/2026).

## Sobre la persona y cómo trabajar con ella

- Habla español rioplatense (vos, tocá, encendé). **Toda la interfaz y los textos van en ese registro.**
- Quiere ver los avances desplegados: **mergear a `main` cuando algo esté listo y probado**.
  El trabajo se hace en una rama y después se empuja también a `main`.
- **Ojo: hoy Vercel publica como producción la rama `claude/ecstatic-gates-rt74m2`, no `main`**
  (verificado el 23/11/2026: `main` se construía pero el sitio seguía en la versión vieja). Después de
  mergear a `main`, empujá `main` también a esa rama con avance rápido
  (`git push origin origin/main:refs/heads/claude/ecstatic-gates-rt74m2`) y verificá que
  `https://encende-una-huellita.vercel.app/` cargue el mismo `assets/index-*.js` que `npm run build`.
  Se arregla del todo en Vercel → Settings → Environments → Production Branch = `main`.
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
npm test                     # 16 tests de API: servidor local Y función de Vercel con Upstash simulado
```

Node 22. Sin dependencias de servidor (sólo `three` y `vite`).

## Arquitectura en 1 minuto

- **Frontend** (Vite + Three.js, sin framework): `index.html` + `src/`.
  - `src/main.js` (≈2.400 líneas, el más grande): arranque, UI, ficha, modales, gamificación, guía,
    ascensor, presencia, paseo. **Candidato a dividir** (ver PENDIENTES).
  - `src/scene/`: `world.js` (cielo, pasto, árboles, faroles, luciérnagas), `hall.js` (muro de
    marcos, pérgola, ofrenda central de Luca, estampita), `muertos.js` (papel picado, cempasúchil,
    calaveritas, pan de muerto, pueblito, fondos), `cozy.js` (camino de pétalos, puente, frasco,
    alebrijes, Prado de los espíritus), `elevator.js`, `avatars.js` (otros visitantes), `lanterns.js`
    (farolitos), `textures.js`.
  - **Tercera persona**: `controls.js` mueve a tu personaje (`player.pos`, `player.heading`) y maneja la
    cámara en tres modos: `follow` (detrás del personaje; arrastrar orbita, pellizcar acerca),
    `focus` (mira un punto fijo, p. ej. un marco: `flyTo(stand, target)`) y `fixed` (intro:
    `teleportCamera`). `follow({ path, duration, done })` vuela de vuelta detrás del personaje.
    La cámara se acorta si un muro (`colliders.segments`) o un poste/tronco (`colliders.circles`)
    queda en el medio. `createBlocker(colliders)` es la colisión compartida con los espíritus.
  - `character.js`: el personaje de cada visitante (vos y `avatars.js`): caminar, `wave()`, `throw()`, `pet()`.
  - **Espíritus**: `petRig.js` arma un `SkinnedMesh` por mascota (una sola malla, colores por vértice,
    brillo fresnel) y un animador que mezcla marchas (paso/trote/galope/saltitos) con acciones
    (`want.sit/lie/bow/rear/sniff/carry/tilt` y `trigger('jump'|'roll'|'shake')`). `spirits.js` es el
    cerebro: estados por espíritu (`idle`, `wander`, `zoomies`, `chase`, `bow`, `wrestle`, `ball`,
    `carry`, `rest`, `roll`, `greet`, `follow`, `explore`…), la pelota con física, huellitas de luz y
    chispitas. `setPack(memorials)` elige quiénes juegan en el Prado; `walk(m, from)` saca a pasear.
    Cómo se ve cada uno sale de `m.look` (`server/looks.js`) o, si no hay, de un hash de su id.
  - `src/api.js`: cliente HTTP + **modo demo** (localStorage) si no hay base de datos.
  - `src/game.js` (gestos del día, racha, Glow guardado), `src/guide.js` (la sexta etapa),
    `src/quality.js` (calidad por dispositivo + resolución adaptativa), `src/audio.js` (todo sintetizado).
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
- Todo lo visible se genera en canvas/geometría: no hay modelos ni imágenes externas salvo las fotos
  de `public/huellitas/` y los íconos de `public/`.
- CSS: tema vino en paneles (`dialog.modal`, `.sheet`) vía variables; los "papeles" (notas, libro,
  diario, estampita) son claros con tinta oscura. `[hidden]` siempre gana (`display:none !important`).

## Cómo verificar visualmente (sin GPU)

En el contenedor hay Chromium + Playwright preinstalados. Patrón usado en todo el proyecto:

```js
const { chromium, devices } = require('playwright'); // NODE_PATH=$(npm root -g)
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ ...devices['iPhone 13'] }); // celular
// localStorage: 'huellita.quality' = 'low' acelera; 'huellita.welcomed' = '1' salta la bienvenida.
// Entrar: await p.click('#enter'), luego un clic en el canvas salta la intro.
// Con ?debug en la URL: window.__huellita = { controls, camera, THREE, spirits, me, startWalk }:
//   H.controls.placePlayer(new H.THREE.Vector3(x, 0, z), new H.THREE.Vector3(tx, 0, tz)); H.controls.snapFollow();
//   H.startWalk('luca')   // sacar a pasear a Luca
```

Para los espíritus sin entrar al jardín: `npm run dev` y `/lab/pets.html?t=1.5&pose=sit&side&d=0.55`
(congela en t segundos) o `/lab/pets.html?mode=pack` con `window.__lab.advance(20)` (simula 20 s del
Prado y deja en `__lab.log` qué hacía cada espíritu).

Con swiftshader todo anda a pocos FPS: los vuelos de cámara tardan mucho más que en un teléfono real
(esperar 8–10 s antes de sacar captura). Para probar el ascensor hace falta una huellita en el piso 2
(`POST /api/memorials` con `"slot": 95`).
