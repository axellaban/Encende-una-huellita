# Tareas que requieren usar la computadora (paneles web)

Estas tareas requieren acceso a la cuenta del dueño o a dispositivos físicos. La configuración de
Vercel también se puede hacer con su CLI o con un conector autorizado. Estado actualizado después
de conectar la base real; las pruebas en teléfonos y apps siguen separadas de las pruebas de API.

## 1. Conectar la base de datos (Upstash Redis) — completado

`https://encende-una-huellita.vercel.app/api/health` ya responde `{"ok":true,"storage":"upstash"}`.
Base `encende-una-huellita`, plan Free, región `iad1`, sin eviction ni cambio automático de plan.
Se verificaron presencia en ambas direcciones con dos clientes independientes, velas, flores,
libro, regalitos, diario, fotos y voz. Los datos del modo demo anterior siguen en cada navegador;
su migración está pendiente (ver `PENDIENTES.md`).

Pasos de referencia para una instalación nueva:

1. Entrar a <https://vercel.com> → proyecto **encende-una-huellita**.
2. Pestaña **Storage** → **Create Database** (o "Connect Store") → **Upstash for Redis** → plan gratis.
3. Conectarla al proyecto en **Production**. Eso crea solas las variables
   `KV_REST_API_URL` y `KV_REST_API_TOKEN` (no hay que copiar nada a mano).
   Las previews de este proyecto siguen en demo; para probar escritura allí, conectar otra base
   para no alterar los recuerdos de producción.
4. **Deployments** → el último → menú **⋯** → **Redeploy**.
5. Verificar: `https://encende-una-huellita.vercel.app/api/health` tiene que decir `"ok":true` y
   `"storage":"upstash"` (o parecido). En el sitio, el aviso de "modo demo" del menú tiene que desaparecer.

## 2. Rama de producción = `main` — completado

Vercel ya publica desde `main`, con Node 22. Ya no hay que empujar a
`claude/ecstatic-gates-rt74m2` para publicar. `AGENTS.md` y las notas del proyecto están actualizados.

Pasos de referencia:

1. Vercel → proyecto → **Settings** → **Environments** (o **Git**) → **Production Branch** → poner `main`.
2. Guardar y hacer un **Redeploy** de `main`.
3. Verificar que el sitio cargue el mismo `assets/index-*.js` que da `npm run build` en `main`.
4. Avisar en `AGENTS.md` (sacar el "Ojo: hoy Vercel publica…") para que nadie siga empujando a la otra rama.

## 3. Probar en teléfonos de verdad — pendiente

Desde el contenedor sólo hay un emulador sin GPU. Hace falta un iPhone y un Android reales:

- Que no haya parpadeo en negro ni pantalla negra (si aparece: captura y dónde estaba).
- FPS y temperatura en calidad Alta (Más → Opciones → Calidad) en un Android de gama media.
- La palanca invisible (mitad izquierda) y el botón de acción (abajo a la derecha): que no choquen con
  el gesto de "atrás" de Android ni con la barra de inicio del iPhone.
- El ascensor de punta a punta (~9 s): entrar, elegir piso, subir, salir.
- Grabar la voz de una mascota en iPhone Safari.

## 4. Vistas previas al compartir — pendiente en las apps

Verificado en el sitio: los agentes de WhatsApp y Facebook reciben el título, descripción, URL
canónica e imagen correctos; la imagen de Luca es accesible con HTTP 200. Falta comprobar cómo
las apps muestran esa tarjeta y sus cachés; lo anterior no reemplaza enviar el enlace desde ellas.

Mandar `https://encende-una-huellita.vercel.app/h/luca` por WhatsApp e Instagram y pasarlo por el
depurador de Facebook (<https://developers.facebook.com/tools/debug/>): tiene que salir la foto de Luca,
"Luca · Encendé una huellita" y el texto.

## 5. Cuando haya más gente

- Upstash → **Usage**: mirar comandos por día (el plan gratis da 500.000/mes; ver P3 en `PENDIENTES.md`).
- Si se pasan los límites: plan pago de Upstash o pasar fotos y voces a Vercel Blob (P3).
