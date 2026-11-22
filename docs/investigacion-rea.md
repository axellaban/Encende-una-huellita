# Investigación con REA: cómo funciona un memorial de mascotas en 3D

Antes de escribir código usamos [REA (Reverse Engineer Anything)](https://github.com/morluto/rea) para
entender **qué hace** un sitio de referencia del mismo género (lightapaw.com, un memorial online para
mascotas en una sala 3D). El objetivo fue relevar funciones, mecánicas y arquitectura;
**no copiamos código, textos, imágenes, audio ni marca**: todo lo de este repo está escrito desde cero.

## Cómo se hizo (de punta a punta)

| Paso | Comando de REA | Qué dio |
| --- | --- | --- |
| 1. Endpoints | `rea analyze-web-bundle <cdp> <target>` | 17 rutas de API candidatas con su ubicación en el código (abajo) |
| 2. Captura completa | `rea inspect-web-page <cdp> <target> --observation-ms 8000 --include-script-sources --include-json-body-shapes --include-websocket-shapes --include-storage-keys --include-accessibility-text` | DOM, accesibilidad, red, almacenamiento y el código fuente de los 10 scripts |
| 3. Exportar scripts | `rea export-web-scripts inspect.json scripts/` | Bundle principal (1,9 MB), three.js, muxer de video, etc. |
| 4. Grafo de la app | `rea analyze-javascript-application scripts/files --detail summary` | 161 módulos analizados sin ejecutar nada (evidencia de 131 MB) |
| 5. Catálogo de textos | extracción de los arreglos `[en, es, pt, fr, de, ja, ko, zh]` del bundle | **1.495 textos de interfaz**: el mapa más fiel de todas las funciones |

Más capturas de pantalla del recorrido (bienvenida → jardín → sala → formulario).

## Endpoints encontrados

`/api/memorials`, `/api/activity`, `/api/now` (presencia), `/api/together` (ver a otros visitantes),
`/api/lantern`, `/api/supporters`, `/api/paypal/config`, `/api/push/key`, `/api/apps`,
y telemetría (`/api/lp`, `/api/load`, `/api/perf`, `/api/gl`, `/api/gplay/*`). REA dejó como
*unknown* 20 llamadas `fetch` cuya URL se arma en tiempo de ejecución.

## Inventario de funciones y gamificación (según el catálogo de textos)

### El núcleo gamificado: "Glow"
- Cada gesto amable con *otras* mascotas hace brillar un poco más el lugar de **tu** mascota.
- Etapas: Farol → Estrella → Constelación, con "Faltan N para…".
- "+N Glow · fuiste su primera luz", "+N Glow · guardado para tu mascota" (si todavía no tenés).
- "El Glow nunca se apaga y no hay clasificaciones. Todos son queridos por igual."
- Gestos sugeridos: la vela de hoy para tu mascota, una página del diario, palabras amables a otra
  mascota, corazones/velas/flores para otros. "Necesitan una luz": mascotas a las que nadie escribió.

### Ritmo diario
- Una vela y una flor por mascota por día ("Ya encendiste una vela aquí hoy… Vuelve mañana").
- Racha de vela por mascota ("lleva N días seguidos encendida").
- "Mientras no estabas, {nombre} recibió N palabras amables y corazones".
- La hora de las velas (21 h) con "N velas de M países esta noche".
- Cumpleaños y día del recuerdo, con recordatorios.

### En la sala
- Visitantes como personajes con su nombre arriba, reacciones (🤍🕯️🐾🌸🫂), "Decir algo",
  ocultar a otros (modo tranquilo), ocultar/denunciar personas, palanca para caminar en el celular.
- Abrazo en silencio, regalitos (comida, juguetes, detalles; uno por persona), flores, velas.
- Farolillo con palabras que "se van volando", frasco de gracias, tablero de palabras de consuelo,
  "Lo que me ayudó", "Hoy es difícil" (anónimo, con "Estoy contigo").
- Pisos que se abren cuando se llena el de abajo, pasillos, caballete central (pago).
- Diario de cada mascota con preguntas guía, corazones y comentarios.
- Grabar su voz, encuentros programados, invitar a la familia, agradecer a quien encendió velas.

### Monetización (no la replicamos)
Luz eterna, fondos especiales, plan "Forever Family", cartas escritas con IA, láminas/placas/libros
impresos, caballete pago, donaciones.

## Qué implementamos y cómo

| Mecánica | En Encendé una huellita |
| --- | --- |
| Glow y etapas | `server/glow.js` + `store.grantGlow`: 🕯️ Llamita → 🏮 Farolito → ⭐ Estrella → ✨ Constelación. El servidor sólo suma Glow si demostrás con tu token que la mascota es tuya. En 3D: farolito colgado, estrella y constelación girando alrededor del marco |
| Glow guardado | Si no tenés mascota, se guarda en el navegador (tope 60) y se le transfiere al crearla |
| Gestos de hoy | Panel "✨ Hoy": vela para tu mascota (o para Luca), velas para 3 huellitas, un regalito, palabras amables. Al completarlos: celebración |
| Una vez por día | Vela, flor, regalito y abrazo: una vez por día por huellita (`SET NX EX`) |
| Racha | "🌙 N noches seguidas" en el panel Hoy |
| Mientras no estabas | Al volver, aviso con lo que recibieron tus mascotas |
| Necesitan una luz | Carrusel de huellitas sin tu vela de hoy, ordenadas por menos velas |
| Regalitos | 24 regalitos gratis en 3 categorías; los últimos se ven en la repisa del marco |
| Abrazo en silencio | Botón 🫂 en la ficha, aparece en la actividad en vivo |
| Visitantes | Personajitos con nombre, frases amables de un catálogo (sin texto libre) y gestos que flotan; modo tranquilo |
| Palanca | Joystick en el celular (además de tocar el piso) |
| Hora de las velas | Aviso a las 21 h con velas y países de la noche (país por `x-vercel-ip-country`) |
| Frasco de gracias | Frasco en 3D que se llena de estrellitas; "Gracias por…" |

## Pendiente (posible próxima tanda)
Diario con preguntas guía, grabar su voz, farolillo que se va volando, tablero de consuelo,
encuentros programados, invitar a la familia, recordatorios por email/push.
