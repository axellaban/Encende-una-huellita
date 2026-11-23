// Modo foto: una polaroid de tu momento en el jardín (con el espíritu de tu mascota si lo paseás),
// lista para historias. La foto sale del 3D tal cual se ve, sin botones encima.

const loadImg = (src) => new Promise((res) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => res(null);
  i.src = src;
});

// Polaroid 1080x1350 (4:5, el formato que mejor se ve en el feed y en historias).
export async function polaroid(shotUrl, { caption, sub }) {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  await Promise.all(['700 80px Caveat', '700 30px "DM Sans"'].map((f) => document.fonts?.load(f).catch(() => {})));
  // Fondo de papel con grano.
  g.fillStyle = '#fbf4e6';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(120,90,60,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  // La foto (recortada al centro).
  const img = await loadImg(shotUrl);
  const px = 64;
  const py = 64;
  const pw = W - 128;
  const ph = 1000;
  g.fillStyle = '#1a1028';
  g.fillRect(px, py, pw, ph);
  if (img) {
    const r = Math.max(pw / img.width, ph / img.height);
    const w = img.width * r;
    const h = img.height * r;
    g.save();
    g.beginPath();
    g.rect(px, py, pw, ph);
    g.clip();
    g.drawImage(img, px + (pw - w) / 2, py + (ph - h) * 0.45, w, h);
    // Viñeta cálida, como una foto de rollo.
    const v = g.createRadialGradient(W / 2, py + ph / 2, ph * 0.3, W / 2, py + ph / 2, ph * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(30,10,30,.35)');
    g.fillStyle = v;
    g.fillRect(px, py, pw, ph);
    g.restore();
  }
  // Cintitas.
  const tape = (x, y, rot, col) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = col;
    g.globalAlpha = 0.78;
    g.fillRect(-90, -24, 180, 48);
    g.restore();
  };
  tape(150, 52, -0.32, '#f2b8c6');
  tape(W - 150, 52, 0.3, '#bfe3d0');
  // Leyenda escrita a mano.
  g.textAlign = 'center';
  g.fillStyle = '#3b2430';
  g.font = '700 82px Caveat, cursive';
  g.fillText(caption, W / 2, py + ph + 118, W - 120);
  g.font = '700 28px "DM Sans", sans-serif';
  g.fillStyle = '#8a6a5a';
  g.fillText(sub, W / 2, py + ph + 176, W - 120);
  return c;
}
