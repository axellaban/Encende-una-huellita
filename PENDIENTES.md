# Pendientes

Lista para quien siga el proyecto (persona o IA). Leé primero [`AGENTS.md`](AGENTS.md).
Prioridad: **P0** = verificar/arreglar antes de mostrarlo a más gente, **P1** = lo que más suma,
**P2** = completa el relevamiento del sitio de referencia, **P3** = deuda técnica y mejoras.

## 🗺️ Plan Maestro en curso (24/11/2026) — Implementar por etapas y mergear a `main` en cada avance

> **Instrucción para cualquier IA que continúe este plan**: cada etapa se implementa, se prueba con
> `npm run build && npm test`, se marca `[x]` acá en `PENDIENTES.md` y se hace commit + push directo a `main`.

### Etapa 1: Corrección de lámina del Principito y hoja de ruta
- [x] Tapar por completo las 4 líneas originales de `luca-estampita.jpg` (hasta `y = 590` a los costados del corazón) para que la 4ª línea (*“y ahora es único en el mundo.”*) no se vea duplicada debajo de la versión en alta definición.
- [x] Documentar el Plan Maestro completo en `PENDIENTES.md`.

### Etapa 2: Mundo abierto infinito con hitos, puentes, fogatas y botón "Volver al salón"
- [ ] **Hitos mágicos en el mundo abierto (`src/scene/world.js`)**:
  - **Puentes de madera rústicos y piedras de paso** sobre los arroyos (`openStreamX`, `openStreamZ`) para cruzarlos también por arriba.
  - **Fogatas / altares de descanso** en los claros del valle (troncos para sentarse, fueguito cálido o veladoras y faroles) y **Árboles de los Deseos** más grandes con farolitos colgantes.
- [ ] **Brújula / botón discreto `🏛️ Volver al salón` (`index.html`, `src/main.js`, `src/styles.css`)**:
  - Cuando tu personaje se aleja más allá del jardín central (`r > 64 m`), mostrar una pastilla suave arriba o abajo (`🏛️ Volver al salón · N m`) que con un toque te trae de regreso a la entrada del salón junto a tu mascota.

### Etapa 3: Paseo vivo y nuevas interacciones con los perritos y gatitos
- [ ] **Sacudirse el agua (`shake`) al salir del arroyo o lagunita (`src/scene/spirits.js`)**:
  - Cuando un espíritu estuvo chapoteando en el agua (`inWater`) y sale a tierra firme, dispara automáticamente `a.pet.anim.trigger('shake')` salpicando gotitas brillantes (`fx.splash`).
- [ ] **Tomar agüita en la orilla (`src/scene/spirits.js`)**:
  - Si te detenés cerca del borde de un arroyo o lagunita, tu mascota de paseo se acerca a la orilla, agacha la cabecita (`want.bow` / `want.sniff`) y toma agüita generando ondas suaves en el agua.
- [ ] **Botón de Mimo / Premio (`🦴` / `🤍`) en la barra de paseo (`index.html`, `src/main.js`, `src/scene/spirits.js`)**:
  - Sumar en `#walk-hud` un botón `#walk-treat` (`🦴 Darle un mimo`) para que tu personaje se agache o le ofrezca un premio luminoso y tu mascota haga una pirueta feliz (salto, vueltita o reverencia con corazones y chispitas).

### Etapa 4: Atmósfera, pétalos en flor, reflejos del agua y clima nocturno
- [ ] **Pétalos que caen debajo de los jacarandás y árboles en flor (`src/scene/world.js`)**:
  - Partículas suaves lilas, rosadas y doradas que flotan y caen despacio alrededor de las copas de los árboles en flor en el jardín y el mundo abierto.
- [ ] **Reflejos bioluminiscentes del agua en las orillas (`src/scene/world.js`, `src/scene/river.js`)**:
  - Halo turquesa suave en las piedras y orillas junto a los arroyos y lagunitas.
- [ ] **Selector de atmósfera / cielo en Opciones (`index.html`, `src/main.js`, `src/scene/world.js`, `src/scene/skymagic.js`)**:
  - Permitir elegir en `#menu` (*Opciones*) el clima del cielo: **Noche estrellada** (por defecto), **Atardecer dorado** o **Lluvia de estrellas fugaces**.

### Etapa 5: Nichos vivos, estilos de marco y guía luminosa al pasillo
- [ ] **Luz cálida interior en los nichos ocupados (`src/scene/hall.js`)**:
  - Que las velas encendidas de cada nicho iluminen con más calidez el interior de la caja de madera, las repisas laterales y los regalitos.
- [ ] **Estilos de marco para la foto (`index.html`, `src/main.js`, `src/scene/hall.js`, `server/store.js`)**:
  - Permitir elegir o lucir marcos especiales en el nicho (madera clásica, dorado luminoso, talavera y cempasúchil).
- [ ] **Camino de chispitas guía al buscar o visitar una huellita (`src/main.js`, `src/scene/spirits.js`)**:
  - Al elegir una huellita desde la lista o el buscador, además de encuadrar su nicho, soltar una estela de pétalos/chispitas desde la boca de su pasillo hasta su marco.

---

## 🆕 Última tanda (24/11/2026, noche) — verificada con capturas y recorrido en los 6 dispositivos

Hecho y verificado en `main` (`npm test` 37/37, build OK, capturas de todas las escenas y recorrido completo `scripts/recorrido.mjs` en celular, iPhone SE, acostado, compu, modo demo y sin WebGL):
- **Salón nuevo** (`hall.js`): salón redondo (`ROOM_R` = 12) con la pérgola, y 5 pasillos anchos
  (`CORRIDOR_DEG` en `world.js`), 18 nichos cada uno (siguen siendo 90 lugares por piso, mismos números).
  Nichos libres: puertitas de madera con plaquita de bronce (un `InstancedMesh`, `updateDoors`); al
  llegar una huellita se abren y quedan foto en marco claro detrás de un vidrio, lucecitas de colores
  (`nicheBulbs`), repisas de madera a los costados con hasta 5 regalitos y plaquita con el nombre. Vitral al fondo, alfombra, macetas, cartel en cada boca (elevado a `y = 4.06` para no cortar la cámara).
  Los muros tapan los toques (`hall.blockers`).
- **Luca sólo en el piso 1**: la ofrenda se esconde arriba (y su choque); en su lugar, una fuente con velitas (con flores que varían según la altura y una corona dorada con huella de estrellas en el piso 99).
  Visitar a Luca baja al piso 1. En los 99 pisos juegan manadas de espíritus (`spirits.setFloor`): en el piso 1 en el Prado y en el césped del jardín, y en los pisos 2..99 adentro del salón alrededor de la fuente y en la terraza de nubes.
- **3 ascensores adentro del salón** (`elevator.js`, `LIFT_DEGS = [247.5, 112.5, 202.5]` en `world.js`): tres paredes de madera tallada entre los pasillos (izquierda, derecha y fondo), con puertas metálicas
  lisas, indicador "PISO n" compartido y botonera; detrás de cada uno está su cabina. Llamar al ascensor (o tocar cualquiera de las 3 puertas) usa automáticamente el más cercano. Corregida la pared exterior (`outerMat`) que tapaba la puerta desde adentro y calibrada la luz e `insideShot` de la cabina.
- **Río bioluminiscente y pececitos de luz** (`river.js`): azul eléctrico en orillas y olas, anillos alrededor de velitas,
  tus pasos y tu mascota (`setMovers`), chispitas en el barro y cardumen de 32 pececitos de luz nadando bajo el puente (tu mascota se asoma a mirarlos cuando frenás en el puente). Vía Láctea más cargada, árboles en silueta con borde azul.
- **Valle del cielo encendido** (`VALLEY_READY = true`, `uHole` ajustado al radio del salón nuevo `ROOM_R - 0.4`, corte limpio bajo el mar de nubes y halo suave en el piso 99), **bruma** conectada (`mist.js`) y **planear** (🌬️ en los pisos del cielo, brazos abiertos, estela, aterrizaje). Verificado en pisos 20, 50 y 99 a 60 FPS en calidad alta.

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

**Más pedidos del dueño (24/11), con capturas del original que mandó desde Instagram** (no copiar textos,
nombres ni imágenes del original: tomar la idea, que es la de un columbario/memorial de verdad):
6. **El salón da a pasillos anchos.** En el original, del salón central salen pasillos rectos y anchos
   (unos 4–5 m), largos, con un cartel colgado en la entrada de cada uno ("Pasillo N · cuántas huellitas";
   acá ya tenemos nombres propios en `src/floors.js`). Cada pasillo: piso de madera cálida, paredes
   cubiertas de nichos del piso hasta ~2,5 m a los dos lados, macetas con plantas a lo largo, una ventana
   o un panel de retratos al fondo. Hoy nuestro salón es un muro en semicírculo con 10 paneles de 3×3
   (`hall.js`, `PANELS`/`PER_PANEL`, slots ~línea 214–330). Plan: el salón central queda con la ofrenda
   (sólo piso 1) y de él salen 4–6 pasillos; los 90 lugares por piso se reparten en los pasillos.
   Hay que rehacer posiciones de slots, `viewpoint()`, colisiones (`colliders.segments`), la cámara que
   esquiva muros, `nearestFrame()` en `main.js`, faroles/guirnaldas de la pérgola y revisar el plano
   desde arriba (AGENTS → "Plano del jardín").
7. **El ascensor, adentro del salón** como en la captura: puertas metálicas lisas metidas en una pared de
   madera del salón (entre dos pasillos), indicador de piso arriba ("Piso 1") y botonera al costado. Hoy es
   una torre de vidrio en el jardín (`elevator.js`, `ELEVATOR_POS` en `world.js`). Mantener la escena de
   entrar caminando / elegir piso / salir caminando (`callElevator`, `rideTo`, `leaveLift` en `main.js`),
   pero el viaje con la cámara dentro de la cabina (no hay torre de vidrio): puertas que se cierran,
   indicador que cuenta, un leve sacudón, velo de nubes y se abren en el piso nuevo. Decidir con el dueño
   si la torre del jardín se saca o queda como decoración.
8. **Nichos más reales.** Cerrados (lugares libres): puertitas de madera oscura tipo columbario, en grilla,
   cada una con una plaquita de bronce chiquita en el medio, con biselado y un brillo suave (hoy son
   ventanitas con postigos pintados: `updateShutters` en `hall.js`). Abiertos (con una huellita): el nicho
   abierto con la foto en un marco claro detrás de un vidrio (ventanita) y una guirnalda de lucecitas de
   colores alrededor (HDR para el bloom), la repisa con sus regalitos. Todo en geometría/canvas propio.
   Después de 6, 7 y 8: capturas en celular y el recorrido (`scripts/recorrido.mjs`).

**Tareas que requieren usar la computadora** (Vercel, Upstash, teléfonos reales, vistas previas): paso a
paso en [`docs/tareas-con-computadora.md`](docs/tareas-con-computadora.md).

**Lo que sigue del plan** (abajo, en orden): verificar en teléfonos reales; vistas previas en las apps;
moderación; el resto de P1/P2/P3. Upstash, la rama de producción `main` y el rescate automático de los
recuerdos del modo demo ya están implementados.

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
- [x] **Atmósfera en capas**: niebla de altura (`mist.js`) y
      bancos de bruma entre objetos (sprites/planos con ruido que se mueven), más fuerte a lo lejos.
- [x] **"Valle del cielo"** en los pisos altos (`heaven.js` / `valley.js`): pilares de piedra gigantes
      (karst) a varias distancias, árboles en flor rosa y lila en masas, puentes colgantes entre pilares,
      cascadas que caen en la bruma.
- [x] **Planear**: saltar desde el borde del piso del cielo (o desde una isla) y planear con el sarape
      abierto como alas, con estelas de viento y un aterrizaje suave. Nuevo
      modo en `controls.js` (velocidad hacia adelante, caída lenta, giro con la palanca) y animación en
      `character.js`.
- [x] **Luz de día con sombras de verdad** en esos pisos (`DirectionalLight` con sombras sólo en calidad
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
- [x] Al abrir una huellita, una vista grande del nicho en 3D con las repisas a los costados (como el
      original), y marco en arco con repisas laterales en la ficha.
- [x] Expresiones del personaje (sonrisa al regalar) y 4 estilos de ropa a elegir (Sarape, Con rebozo, Poncho, Chaleco).
- [x] Regalitos con su gracia al llegar (la pelota rebota, el globo tira para arriba) y al tocarlos en la repisa (anima en 3D y muestra quién lo dejó).
- [ ] Lo que sigue abierto de P0 (teléfonos reales), P1, P2 y P3.

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
- [x] **Personajes**: nombre propio editable en el jardín (`#me-name-input` en `#me-dialog`, accesible desde la barra superior en compu y desde el menú en celular), 4 estilos de ropa (Sarape, Con rebozo, Poncho, Chaleco), parpadean, cachetes, respiración, aplastar/estirar,
      miran el cielo, y peinado a elegir (corto, trenzas, chongo, colita; va codificado en `hue`,
      ver `character.js`). Al cruzarse con otro visitante, se saludan (`avatars.greetNear`) y sonríen al regalar o abrazar.
- [x] **Mascotas**: 8 personalidades (`Juguetón`, `Saltarín`, `Mimoso`, `Tranquilo / Pachorra`, `Curioso`, `Tímido / Antisocial`, `Guardián`, `Travieso`) que cambian cómo juega y cómo te acompaña en el paseo, 13 colores principales, segundo color combinable (`fur2`), 10 dibujos/manchitas (`Liso`, `Pechera`, `Botitas`, `Manchitas`, `Vaquita / Parches`, `Manto`, `Tricolor / Carey`, `Rayitas / Atigrado`, `Antifaz / Siamés`, `Parche en el ojo`), 4 tipos de pelo (`Poquito pelo`, `Normal`, `Peludo`, `Con rulitos`), 4 tipos de orejas, 4 tipos de colita (`Finita`, `Peluda`, `Enrulada`, `Cortita`), 6 colores de ojos (incluyendo heterocromía `Uno y uno`), 3 hocicos, 5 tamaños bien distintos y tarjeta de vista previa en vivo mientras elegís.
      Los espíritus juegan en los 99 pisos y los de otros visitantes llevan todas estas opciones.
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

## P0 · Producción y verificaciones reales

- [x] **Rama de producción de Vercel**: corregida a `main`, con Node 22. No hace falta seguir
      empujando a la rama anterior (ver AGENTS).
- [x] **Conectar Upstash en producción**: base `encende-una-huellita`, región `iad1`, plan Free,
      eviction y autoUpgrade desactivados. Variables `KV_REST_API_URL`/`TOKEN` en Production.
      `/api/health` responde `{"ok":true,"storage":"upstash"}`. Las previews siguen en demo;
      para probar escritura en ellas, usar otra base para no modificar recuerdos de producción.
- [x] **Deploy real en Vercel + Upstash.** Verificados los rewrites, fotos principal y extra, voz,
      diario, libro, velas, flores y regalitos contra la base real. La huellita técnica de prueba
      se quita al terminar; las pruebas no modifican los recuerdos de Luca.
- [x] **Conservar los recuerdos al crecer el jardín**: se quitaron los recortes que borraban las
      páginas del diario después de 200, las firmas después de 500, los regalitos después de 50,
      las notas del frasco/consuelo después de 300 y los gestos después de 200. Las lecturas siguen
      acotadas. `server/history.test.js` supera esos límites y vuelve a abrir la base desde disco
      para verificar que los primeros recuerdos, los corazones y el acceso familiar siguen ahí.
- [x] **Rescatar los datos del modo demo anterior**: al volver desde el mismo navegador,
      `src/migrate.js` → `/api/import` recupera huellitas, fotos, voz, diario, libros, regalos, notas,
      gestos y marcas del día. Se conserva el original y se actualizan permisos y preferencias.
      Recibos atómicos de Redis evitan duplicados al perder una respuesta, abrir dos pestañas o
      reiniciar. Si falta conexión o espacio para guardar el acceso familiar, ofrece reintentar y
      descargar una copia; no abre otro jardín privado. Ver `server/migration.test.js` y
      `scripts/rescate.mjs` (interfaz en iPhone SE y Android emulados). Una persona que aún no volvió
      al sitio conserva sus datos sólo en ese navegador hasta la próxima visita.
- [x] **Dos clientes independientes de la API**: presencia en ambas direcciones y velas/flores/
      mensajes que llegan por el siguiente latido; una vela repetida no suma dos veces.
- [x] **Verificación visual con dos navegadores**: `scripts/presencia.mjs` abre dos sesiones
      Chromium independientes (iPhone 13 y Pixel 5 emulados), verifica los nombres recibidos por
      los latidos, los personajes 3D y el contador de visitantes en ambas direcciones. Se revisaron
      las capturas con los dos personajes juntos. En CI sin GPU se pausa una escena al iniciar la
      otra; los latidos siguen activos. El movimiento se actualiza cada 5–12 s (no hay WebSockets).
      Esto no mide rendimiento en teléfonos físicos.
- [ ] **Teléfonos reales** (iPhone Safari y Android Chrome): rendimiento del 3D, calidad automática
      (`src/quality.js`), palanca, hoja deslizable, teclado sobre formularios, áreas seguras del notch.
      Con la tercera persona: que la cámara no se meta en los muros, que la palanca se sienta natural
      y cuántos espíritus aguanta un teléfono de gama baja (hoy 3 en "Ahorro", 4 en media, 5 en alta).
      El jardín creció (radio 58 m, salón de 21 m, más pasto y árboles): mirar los FPS en gama baja y,
      si hace falta, bajar `grass`/`flowers` de "Ahorro" en `src/quality.js`.
- [ ] **Grabar la voz en iOS Safari** (MediaRecorder entrega `audio/mp4`; el servidor lo acepta,
      pero nunca se probó en un iPhone).
- [x] **Moderación mínima** antes de abrirlo al público: filtro de insultos/spam en servidor (`checkModeration` en `server/core.js`), botón para denunciar u ocultar huellitas y firmas (`POST /api/report` + ocultamiento local), y herramientas de la familia para borrar firmas individuales o cerrar el libro de visitas.

## P1 · Lo que más suma ahora

- [ ] **Probar las vistas previas en el mundo real**: el servidor ya responde bien (23/11/2026:
      `curl https://encende-una-huellita.vercel.app/h/luca` devuelve `og:title` "Luca · Encendé una
      huellita", su texto y `og:image` absoluta a `/huellitas/luca-og.jpg`). Falta mandarlo por WhatsApp e
      Instagram (y pasarlo por el depurador de Facebook) para ver la tarjeta de verdad.
- [x] **Más viral**: contador público de velas de la noche en la entrada (`#splash-night`); QR imprimible en la estampita de recuerdo (`drawKeepsake` con generador QR ISO 18004 propio en `src/share.js`) para la ofrenda de casa. (Queda opcional: video corto del paseo).

- [x] **Regalitos**: cada uno tiene su gracia al llegar (la pelota rebota, el globo tira para
      arriba, la mariposa da una vuelta al marco) y al tocarlo en la repisa vuelve a hacer su gracia en 3D y dice quién lo dejó.
      Si se suma un regalito al catálogo (`server/glow.js`), sumarle su modelo en `src/scene/gifts3d.js`.
- [x] **El río**: pececitos de luz nadando en cardumen cerca del puente, y el espíritu en el paseo se asoma a mirar el agua cuando frenás en el puente. (Queda opcional: reflejos render-to-texture en calidad alta).
- [x] **Pisos del cielo**: varía el color del cantero central según la altura (más flores blancas y doradas arriba) y en el piso 99 hay una corona dorada con huella de estrellas sobre la fuente central.
- [x] **Espíritus**: los que pasean otros visitantes juegan con la manada del Prado y con el tuyo (`others()` en `spirits.js` los incluye y se suman al Prado cuando su dueño está cerca); nuevas acciones (tirar de una soga entre dos, cavar con chispitas, perseguir mariposas de luz) y ladridos/maullidos suaves (`petVoice` en `audio.js`).

- [ ] **Palabras de Luca**: su mensaje sigue siendo el provisorio *"Siempre en nuestro corazón."*
      (`server/seed.js`). Pedírselas al dueño. En la foto principal aparece otro perro negro: preguntar
      si quiere darle su lugar también.
- [ ] **Recordatorios** (email o push): cumpleaños, día que partió, 1 y 2 de noviembre, "alguien le
      encendió una vela". El original los tiene; acá sólo hay archivo `.ics` y avisos dentro de la app.
- [ ] **No perder la huellita**: el permiso de edición vive sólo en localStorage. Falta recuperar por
      email (enlace mágico) o iniciar sesión (Google). Hoy, si se borra el navegador, se pierde el acceso
      (salvo que haya mandado el enlace de familia).
- [x] **Denunciar / ocultar**: denunciar u ocultar una huellita o un mensaje del libro, borrar firmas individuales y cerrar/abrir el libro de visitas desde las herramientas de la familia.
- [x] **Quién encendió velas** por mi mascota + racha de días con vela encendida + botón "🤍 Dar las gracias a todos" (envía el agradecimiento a la actividad en vivo del jardín).
- [ ] **Día de Muertos en vivo** (1 y 2 de noviembre): decoración extra en el 3D, más velas, un
      evento compartido. Hoy sólo hay aviso de temporada (20/10 al 2/11) y la guía.
- [x] **Encuentro en vivo**: modo encuentro activo cuando llega la hora fijada ("El encuentro es ahora", contador de personas acompañando en el jardín y botón "🕯️ Encender vela juntos").

## P2 · Lo que queda del relevamiento del original (ver `docs/investigacion-rea.md`)

- [ ] "Hoy es difícil": compartir algo anónimo y recibir "Estoy contigo".
- [ ] "Lo que me ayudó": tablero de consejos de quienes ya lo vivieron.
- [ ] Pregunta del día ("¿Cómo te despertaba por la mañana?") con respuestas de la comunidad.
- [x] Racha por mascota ("🔥 N días seguidos con una vela encendida" en la ficha). (Falta: notas especiales de 100 días / 1 año).
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
