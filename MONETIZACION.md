# 💛 Monetización (pendiente)

> **Hoy todo es gratis para todos.** Estas funciones son pagas en el sitio de referencia y las
> incluimos sin costo para lanzar. Más adelante las vamos a limitar para quienes usan gratis.

Todo está centralizado en [`server/plans.js`](server/plans.js): cada función tiene `free: true` y la
API la consulta con `allowed('…')`. Para monetizar, poner `free: false` en la función, implementar
la verificación del plan dentro de `allowed()` y mostrar el aviso correspondiente en la app
(las rutas ya devuelven `402` con un mensaje cuando no está permitido). En el frontend, buscar
`MONETIZAR` para los lugares donde va el botón de compra.

| Función | Hoy | Límite pensado para el plan gratis | Dónde |
| --- | --- | --- | --- |
| ✨ **Luz eterna** (farolito dorado + marco dorado para siempre, se puede regalar) | Gratis | Pago único por huellita | `POST /api/memorials/:id/eternal` |
| 🎨 **Fondos especiales** para su lugar (12 fondos) | Gratis | 3 básicos gratis (Papel crema, Cempasúchil, Noche de velas); el resto pago único | `POST /api/memorials/:id/edit` (`bg`) |
| 📸 **Más fotos** (hasta 3 extra) | Gratis | 1 foto gratis; más con plan familiar | `POST /api/memorials/:id/photos` |
| 🎙️ **Su voz** (hasta 10 s) | Gratis | Plan familiar | `POST /api/memorials/:id/voice` |
| 🌼 **Lugar en la ofrenda central** (pasa una por una durante el día) | Gratis (1 por día por persona) | Pago por día o semana, cupos limitados | `POST /api/memorials/:id/altar` |
| 🗓️ **Encuentros programados** | Gratis | Plan familiar | `POST /api/memorials/:id/gathering` |
| 📖 **Diario** | Gratis, sin límite | 5 páginas gratis; ilimitado con plan familiar | `POST /api/memorials/:id/diary` |
| 📸 **Tarjeta para historias** | Gratis | Diseño básico gratis; diseños especiales pagos | Frontend (`shareCard`) |

## Ideas de planes (del relevamiento con REA)

- **Plan familiar** (anual o de por vida): mascotas ilimitadas, 20 fotos y 10 videos por mascota,
  voz, encuentros, diario ilimitado, una luz eterna por mascota, todos los fondos, 10 % en recuerdos.
- **Regalos para otros**: luz eterna o fondo regalado, con "Con cariño de {nombre}".
- **Recuerdos impresos** (envío): lámina enmarcada, placa de metal, bloque de acrílico, taza, libro de
  recuerdos con las velas y mensajes. Requiere proveedor de impresión.
- **Cartas con la voz de tu mascota** escritas con IA. Requiere API de IA (costo por uso).
- **Videos de recuerdo** de 15–30 s con fotos y música.
- **Donaciones** mensuales o únicas, con muro de agradecimiento.

## Costos a tener en cuenta antes de abrir todo gratis a escala

- **Fotos y voces en Upstash**: cada foto pesa ~100–150 KB y cada voz hasta 600 KB. El plan gratis
  de Upstash (256 MB) alcanza para unos cientos de huellitas con varias fotos. A escala conviene
  mover archivos a Vercel Blob o S3 y dejar en Redis sólo los datos.
- **Presencia en vivo**: un latido cada 12 s (solo) o 5 s (con más gente), 3 comandos de Redis cada
  uno. Una visita de 10 minutos gasta unos 150–400 comandos, así que el plan gratis de Upstash
  (500.000 comandos/mes) alcanza para miles de visitas por mes. Con mucho tráfico conviene pasar a
  WebSockets o al plan pago de Upstash.
