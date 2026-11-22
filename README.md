# 🕯️ Encendé una huellita

Un jardín memorial en 3D para recordar a las mascotas que amamos. Gratis y sin registro:
poné su foto en el muro, encendé una vela, dejá flores y firmá su libro de visitas.

![El jardín de las huellitas](public/og.jpg)

| Compu | Celular |
| --- | --- |
| ![Visitando a Luca en la compu](docs/captura-escritorio.jpg) | ![Visitando a Luca en el celular](docs/captura-celular.jpg) |

## Qué tiene

- **Jardín 3D al atardecer** (Three.js, todo procedural): luna y estrellas que titilan, pasto que se
  mueve con el viento, árboles y cerezos, cerco de ligustros, camino con balizas, faroles, luciérnagas
  y un salón con pérgola y guirnaldas de luces. Postprocesado con *bloom* para que todo brille.
- **Luca en el centro del salón**: un atril con su retrato, rodeado de velas que se van encendiendo
  a medida que la gente le deja una.
- **Farolitos**: cada vela que se enciende (tuya o de cualquier visitante) suelta un farolito de papel
  que sube al cielo.
- **Caminar y mirar**: tocá el piso para caminar, deslizá para mirar, pellizcá o usá la rueda para
  acercarte. En compu también WASD / flechas.
- **Sumar a tu mascota**: tocá un lugar libre del muro (o el ＋), subí una foto (se recorta sola al
  marco), nombre, especie, fechas y unas palabras.
- **Velas, flores y libro de visitas** en cada huellita. Con 20 velas el marco se vuelve dorado.
- **En vivo**: cuántas personas hay ahora y qué está pasando ("Brisa Suave encendió una vela por Luca").
- **Cumpleaños**, **la hora de las velas** (21 h), **pisos** (90 lugares cada uno), **lista con
  búsqueda**, **links para compartir** (`/#h/luca`) e imagen para WhatsApp/redes.
- **Sonido** generado en el navegador: música suave, grillos y efectos.

### Pensado para el celular

- Barra inferior al alcance del pulgar: Huellitas · Luca · ＋ · Pisos · Más.
- La ficha de cada huellita es una hoja que se desliza: a media altura se ve el marco en 3D arriba;
  la arrastrás para abrirla entera o hacia abajo para cerrarla.
- Formularios a pantalla completa con el botón siempre visible, campos de 16 px (sin zoom en iPhone),
  áreas seguras del notch respetadas, vibración al encender una vela y modo horizontal.
- **Calidad automática**: detecta el dispositivo (alta / media / ahorro) y ajusta la resolución en
  vivo según los cuadros por segundo. Se puede cambiar a mano en *Más → Calidad gráfica*.
- Se puede agregar a la pantalla de inicio como app.

## Publicarlo en Vercel

1. En Vercel: **Add New → Project** e importá este repositorio. No hace falta tocar nada:
   `vercel.json` ya configura el build (Vite → `dist/`) y la API (`api/handler.js`).
2. **Conectá la base de datos** para que las velas, flores y huellitas se compartan entre todos:
   en el proyecto, **Storage → Create Database → Upstash for Redis** (tiene plan gratis) →
   conectalo al proyecto. Eso agrega solo las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
3. **Redeploy** (Deployments → ⋯ → Redeploy) para que tome las variables.

Sin el paso 2 el sitio funciona igual en **modo demo**: cada visitante ve sólo lo que suma en su
propio navegador (aparece un aviso abajo). Con Upstash conectado, todo es compartido y en vivo.

## Cambiar los datos de Luca

Están en [`server/seed.js`](server/seed.js): nombre, foto, cumpleaños, día que partió y mensaje.
Para la foto, poné el archivo en `public/huellitas/luca.jpg` y escribí `photo: '/huellitas/luca.jpg'`.
Las velas, flores y firmas de Luca se guardan aparte, así que cambiar sus datos no las borra.

## Correrlo en tu compu

Requiere Node 22.

```bash
npm install
npm run build
npm start            # http://localhost:8787 (guarda todo en data/kv.json)
npm run dev          # desarrollo con recarga: http://localhost:5173
npm test             # tests de la API (servidor local y función de Vercel)
```

Si definís `KV_REST_API_URL` y `KV_REST_API_TOKEN`, el servidor local también usa Upstash.

## Cómo está hecho

```
index.html              Interfaz (barra, dock, ficha, modales)
src/main.js             Arranque, intro, interacción, ficha deslizable, actividad en vivo
src/quality.js          Calidad por dispositivo y resolución adaptativa
src/api.js              Cliente de la API + modo demo (localStorage)
src/audio.js            Música, grillos y efectos con Web Audio
src/scene/world.js      Cielo, luna, colinas, pasto con viento, árboles, faroles, luciérnagas
src/scene/hall.js       Muro, marcos, pérgola, guirnaldas, atril de Luca
src/scene/lanterns.js   Farolitos que suben y destellos
src/scene/controls.js   Caminar, mirar, pellizcar, inercia, vuelos de cámara
src/scene/textures.js   Texturas dibujadas en canvas
server/core.js          La API (independiente del servidor)
server/store.js         Datos sobre Redis (Upstash o emulador local)
server/kv/              Cliente REST de Upstash y emulador de Redis
server/seed.js          Huellitas destacadas (Luca)
api/handler.js          Función de Vercel
server/index.js         Servidor local
```

### API

| Método y ruta | Qué hace |
| --- | --- |
| `GET /api/health` | Si hay base de datos conectada |
| `GET /api/memorials` | Todas las huellitas y totales |
| `POST /api/memorials` | Crea una (`name`, `species`, `photo` como data URL, `birthday`/`passedDay` en `MM-DD`, `message`, `slot`). Devuelve `editToken` |
| `GET /api/memorials/:id` | Una huellita con su libro de visitas |
| `DELETE /api/memorials/:id` | La quita (header `X-Edit-Token`) |
| `POST /api/memorials/:id/candle` | Enciende una vela (una cada 10 min por visitante) |
| `POST /api/memorials/:id/flower` | Deja una flor |
| `POST /api/memorials/:id/guestbook` | Firma el libro (`text`, `name`) |
| `GET /api/photos/:id` | La foto (cacheada en el CDN) |
| `GET /api/activity/:since` | Eventos nuevos + cuántos hay ahora |
| `POST /api/now` | Latido de presencia (`sid`) |

La investigación inicial, hecha con [REA](https://github.com/morluto/rea), está en
[`docs/investigacion-rea.md`](docs/investigacion-rea.md).

## Pendientes posibles

- Moderación de fotos y textos antes de publicarlos.
- Recuperar la edición por email (enlace mágico) en lugar del token guardado en el navegador.
- Ver a otros visitantes como siluetas en el jardín.
