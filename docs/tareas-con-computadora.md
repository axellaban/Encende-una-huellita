# Tareas que requieren usar la computadora (paneles web)

Estas no se pueden hacer desde el código ni desde el contenedor: hay que entrar a los paneles con la
cuenta del dueño (a mano o con un agente con "computer use" en su navegador). Ordenadas por importancia.

## 1. Conectar la base de datos (Upstash Redis) — lo más urgente

Hoy `https://encende-una-huellita.vercel.app/api/health` responde `{"ok":false,...}`: el sitio está en
**modo demo** (cada visitante solo, no se ven los demás, y lo que suma cada uno queda sólo en su navegador).

1. Entrar a <https://vercel.com> → proyecto **encende-una-huellita**.
2. Pestaña **Storage** → **Create Database** (o "Connect Store") → **Upstash for Redis** → plan gratis.
3. Conectarla al proyecto en los entornos **Production** y **Preview**. Eso crea solas las variables
   `KV_REST_API_URL` y `KV_REST_API_TOKEN` (no hay que copiar nada a mano).
4. **Deployments** → el último → menú **⋯** → **Redeploy**.
5. Verificar: `https://encende-una-huellita.vercel.app/api/health` tiene que decir `"ok":true` y
   `"storage":"upstash"` (o parecido). En el sitio, el aviso de "modo demo" del menú tiene que desaparecer.

## 2. Rama de producción = `main`

Hoy Vercel publica como producción la rama `claude/ecstatic-gates-rt74m2` (por eso cada IA empuja a las dos).

1. Vercel → proyecto → **Settings** → **Environments** (o **Git**) → **Production Branch** → poner `main`.
2. Guardar y hacer un **Redeploy** de `main`.
3. Verificar que el sitio cargue el mismo `assets/index-*.js` que da `npm run build` en `main`.
4. Avisar en `AGENTS.md` (sacar el "Ojo: hoy Vercel publica…") para que nadie siga empujando a la otra rama.

## 3. Probar en teléfonos de verdad

Desde el contenedor sólo hay un emulador sin GPU. Hace falta un iPhone y un Android reales:

- Que no haya parpadeo en negro ni pantalla negra (si aparece: captura y dónde estaba).
- FPS y temperatura en calidad Alta (Más → Opciones → Calidad) en un Android de gama media.
- La palanca invisible (mitad izquierda) y el botón de acción (abajo a la derecha): que no choquen con
  el gesto de "atrás" de Android ni con la barra de inicio del iPhone.
- El ascensor de punta a punta (~9 s): entrar, elegir piso, subir, salir.
- Grabar la voz de una mascota en iPhone Safari.

## 4. Vistas previas al compartir

Mandar `https://encende-una-huellita.vercel.app/h/luca` por WhatsApp e Instagram y pasarlo por el
depurador de Facebook (<https://developers.facebook.com/tools/debug/>): tiene que salir la foto de Luca,
"Luca · Encendé una huellita" y el texto.

## 5. Cuando haya más gente

- Upstash → **Usage**: mirar comandos por día (el plan gratis da 500.000/mes; ver P3 en `PENDIENTES.md`).
- Si se pasan los límites: plan pago de Upstash o pasar fotos y voces a Vercel Blob (P3).
