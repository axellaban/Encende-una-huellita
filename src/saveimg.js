// Guardar y compartir imágenes (estampita, tarjeta para historias, foto del paseo) en cualquier equipo.
//
// Lo que falla si se hace "a lo simple":
// - En iPhone/iPad un <a download> manda la imagen a Archivos (no a Fotos) y en la app agregada a la
//   pantalla de inicio a veces no hace nada. La hoja de compartir del sistema sí tiene "Guardar imagen",
//   pero sólo si se comparte el archivo solo: con texto o link, iOS esconde esa opción.
// - navigator.share() tiene que llamarse enseguida del toque: si antes se pinta o se comprime la imagen,
//   el navegador lo rechaza. Por eso las imágenes se preparan antes (al abrir el diálogo).
// - En la compu, canShare() con archivos a veces da true y abría la hoja de Windows en lugar de bajarla.

const ua = navigator.userAgent || '';
export const isIOS = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isMobile = isIOS || /Android|Mobi/i.test(ua);

const canShareFiles = (data) => {
  try { return !!navigator.share && !!navigator.canShare?.(data); } catch { return false; }
};

export const canvasBlob = (c, type = 'image/jpeg', q = 0.92) => new Promise((res) => {
  try { c.toBlob((b) => res(b), type, q); } catch { res(null); }
});

const fileOf = (blob, name) => new File([blob], name, { type: blob.type || 'image/jpeg', lastModified: Date.now() });

// Una descarga de verdad (compu y Android): el link tiene que estar en la página para Firefox, y
// adentro del diálogo abierto (lo de afuera de un <dialog> modal queda "inerte" y no descarga).
export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  (document.querySelector('dialog[open]') || document.body).append(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 60_000);
}

// Guardar en el equipo. Devuelve 'saved' | 'shared' | 'cancel' | 'hold' ('hold': en iPhone no se
// pudo abrir la hoja de compartir; hay que mantener apretada la imagen para guardarla).
export async function saveImage(blob, name) {
  if (!blob) return 'cancel';
  if (isIOS) {
    const file = fileOf(blob, name);
    if (canShareFiles({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return 'shared';
      } catch (e) {
        if (e?.name === 'AbortError') return 'cancel';
      }
    }
    return 'hold';
  }
  download(blob, name);
  return 'saved';
}

// Compartir la imagen con un texto (WhatsApp, historias…). En la compu, o si el equipo no comparte
// archivos, se descarga y el texto queda copiado para pegarlo. Devuelve 'shared' | 'cancel' | 'saved' | 'hold'.
export async function shareImage(blob, name, text) {
  if (!blob) return 'cancel';
  const file = fileOf(blob, name);
  if (isMobile) {
    for (const data of [{ files: [file], text }, { files: [file] }]) {
      if (!canShareFiles(data)) continue;
      try {
        if (!data.text) await copyText(text);
        await navigator.share(data);
        return 'shared';
      } catch (e) {
        if (e?.name === 'AbortError') return 'cancel';
      }
    }
  }
  await copyText(text);
  return saveImage(blob, name);
}

export async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Link directo para mandar un mensaje por WhatsApp (en la compu abre WhatsApp Web).
export const whatsappUrl = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
