# Investigación con REA: cómo funciona un memorial de mascotas en 3D

Antes de escribir una línea de código, usamos [REA (Reverse Engineer Anything)](https://github.com/morluto/rea)
para entender **qué hace** un sitio de referencia del mismo género (lightapaw.com, un memorial
online para mascotas en una sala 3D). El objetivo fue relevar funcionalidades y arquitectura;
**no copiamos código, textos, imágenes, audio ni marca**. Todo lo de este repo está escrito desde cero.

## Cómo se hizo

1. Instalamos el CLI: `npm install rea-agents` (versión 6.10.1).
2. Abrimos la página en un Chromium headless con CDP en `127.0.0.1:9222`.
3. Corrimos el análisis estático del bundle web:

   ```bash
   npx rea analyze-web-bundle http://127.0.0.1:9222 <targetId> \
     --detail summary --evidence_output bundle-evidence.json \
     --view '{"kind":"web-bundle","collection":"endpoints","limit":80}'
   ```

   REA capturó 10 scripts (Vite + Three.js, ~540 mil nodos de AST) sin ejecutarlos y devolvió
   los endpoints candidatos con su ubicación en el código.
4. Complementamos con capturas de pantalla del recorrido (bienvenida → jardín → muro → formulario).

## Qué encontró REA (endpoints)

| Endpoint | Mecanismo | Para qué sirve (inferido) |
| --- | --- | --- |
| `/api/memorials` | `fetch` | Listar / crear memoriales |
| `/api/activity` | `fetch` | Feed en vivo ("X encendió una vela por Y") |
| `/api/now` | `fetch` | Presencia: cuántas personas hay ahora |
| `/api/together` | `fetch` | Ver a otros visitantes / acompañar |
| `/api/lantern` | `fetch` | Farolito (función paga) |
| `/api/supporters` | `fetch` | Página de colaboradores |
| `/api/paypal/config` | `fetch` | Pagos únicos (farolito, brillo) |
| `/api/push/key` | `fetch` | Notificaciones push (PWA) |
| `/api/lp`, `/api/load`, `/api/perf`, `/api/gl`, `/api/gplay/*` | `fetch` / `sendBeacon` | Telemetría de carga, rendimiento y WebGL |
| `/bgm-clip.mp3` | `fetch` | Música de fondo |
| `/api/apps` | `fetch` | Links a apps nativas |

REA marcó como *unknown* 20 llamadas `fetch` cuya URL se arma dinámicamente (por ejemplo
`/api/memorials/:id/...`): el análisis estático no las puede resolver sin ejecutar el código.

## Funcionalidades observadas → cómo las resolvimos

| En el sitio de referencia | En Encendé una huellita |
| --- | --- |
| Jardín low-poly al atardecer, cerco de madera, faroles, bancos, luciérnagas | `src/scene/world.js`: geometría procedural propia, cielo con shader de degradé, luciérnagas animadas |
| Sala con muros llenos de fotos | `src/scene/hall.js`: 10 paneles en semicírculo, 3×3 marcos cada uno (90 lugares por piso) |
| "Tocá el suelo para caminar · Arrastrá para mirar" | `src/scene/controls.js`: raycast al piso, arrastre para mirar, WASD, colisiones simples |
| Tocar un hueco libre para sumar a tu mascota | Tocar un marco vacío abre el formulario con ese lugar reservado |
| Velas, flores y libro de visitas | Endpoints `POST /api/memorials/:id/{candle,flower,guestbook}`; las velas se ven en la repisa de cada marco |
| "N aquí ahora" y feed de actividad | `POST /api/now` (latido cada 25 s) y `GET /api/activity?since=` (cada 8 s) |
| Cumpleaños del día | Se guarda sólo día y mes; aviso "🎂 Hoy es el cumpleaños de…" |
| La hora de las velas (21 h) | Aviso local a las 21 h que te lleva a una huellita que espera su primera vela |
| Pisos (ascensor) | Botón "🛗 Piso N": cada piso suma 90 lugares |
| Lista con filtros (todas, esperando…) | Modal con búsqueda y filtros: todas / esperando una vela / cumpleaños |
| Música tranquila | `src/audio.js`: generada con Web Audio en el navegador (sin archivos de audio) |
| Sin registro | Nombre de visitante aleatorio ("Brisa Suave") y token de edición guardado en el navegador |

## Qué dejamos afuera a propósito

- **Pagos** (farolito, brillo, PayPal) y **push**: no hacen falta para la primera versión.
- **Email / enlace mágico**: el dueño de una huellita la puede quitar con el token guardado en su navegador.
- **Telemetría** (`/api/gl`, `/api/perf`, etc.).
- **Avatares de otros visitantes** y video "Juntos": quedan como ideas para más adelante.
