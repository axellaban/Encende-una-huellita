// "La sexta etapa": guía interactiva sobre crear significado después de una pérdida.
// Ideas de Kessler (2019), O'Connor (2022) y Klass, Silverman y Nickman (1996), con la ofrenda de
// Día de Muertos como práctica; inspirada en un carrusel de Oscar Rivas, PhD. Texto propio.

const C = { cream: '#fbeedd', orange: '#ef6a2e', gold: '#f2b25c', rose: '#e88aa8', teal: '#4f9aa0', lav: '#b9a3d6', wood: '#a77a5a' };

const marigold = (x, y, r = 11) => {
  let s = '';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    s += `<circle cx="${(x + Math.cos(a) * r * 0.62).toFixed(1)}" cy="${(y + Math.sin(a) * r * 0.62).toFixed(1)}" r="${(r * 0.45).toFixed(1)}" fill="${i % 2 ? '#ff9a1f' : '#ff7a1a'}"/>`;
  }
  return `${s}<circle cx="${x}" cy="${y}" r="${r * 0.35}" fill="#ffcf3a"/>`;
};
const candle = (x, y) => `<rect x="${x - 4}" y="${y}" width="8" height="16" rx="2" fill="${C.cream}"/><path d="M${x} ${y - 12} q5 6 0 10 q-5 -4 0 -10z" fill="${C.gold}"/>`;
const skull = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-11 0a11 11 0 1 1 22 0v5h-4v4h-14v-4h-4z" fill="${C.cream}"/><circle cx="-4.5" cy="-1" r="3.2" fill="#3a1f2b"/><circle cx="4.5" cy="-1" r="3.2" fill="#3a1f2b"/><path d="M0 3l-2 3h4z" fill="#3a1f2b"/></g>`;

const ART = {
  ofrenda: `<svg viewBox="0 0 200 110">${marigold(52, 56, 14)}${marigold(148, 56, 14)}<rect x="74" y="18" width="52" height="64" rx="3" fill="none" stroke="${C.gold}" stroke-width="5"/><rect x="80" y="24" width="40" height="52" fill="#3a1f2b"/>${skull(100, 52, 1.15)}${candle(66, 70)}${candle(134, 70)}<rect x="40" y="86" width="120" height="6" rx="3" fill="${C.lav}"/></svg>`,
  preguntas: `<svg viewBox="0 0 200 110"><g transform="rotate(-4 64 55)"><rect x="24" y="28" width="80" height="54" rx="6" fill="#f3e2c6"/><text x="64" y="52" text-anchor="middle" font-family="Cormorant Garamond, serif" font-style="italic" font-size="19" fill="#3a1f2b">¿dónde?</text><path d="M38 66h52" stroke="${C.orange}" stroke-dasharray="4 4"/></g><g transform="rotate(5 140 55)"><rect x="100" y="30" width="80" height="54" rx="6" fill="#f3e2c6"/><text x="140" y="54" text-anchor="middle" font-family="Cormorant Garamond, serif" font-style="italic" font-size="19" fill="#3a1f2b">¿cuándo?</text><path d="M114 68h52" stroke="${C.orange}" stroke-dasharray="4 4"/></g></svg>`,
  cosa: `<svg viewBox="0 0 200 110"><circle cx="64" cy="66" r="20" fill="#cfe05a"/><path d="M47 56q17 10 34 0M47 76q17 -10 34 0" stroke="#fff" stroke-width="3" fill="none"/><path d="M98 82h52l-6 -18h-40z" fill="${C.teal}"/><ellipse cx="124" cy="64" rx="22" ry="5" fill="#2f6f74"/><g transform="translate(160 44) rotate(-30)"><rect x="-16" y="-4" width="32" height="8" rx="4" fill="${C.cream}"/><circle cx="-16" cy="-4" r="5" fill="${C.cream}"/><circle cx="-16" cy="4" r="5" fill="${C.cream}"/><circle cx="16" cy="-4" r="5" fill="${C.cream}"/><circle cx="16" cy="4" r="5" fill="${C.cream}"/></g></svg>`,
  falto: `<svg viewBox="0 0 200 110"><g transform="rotate(-8 92 56)"><rect x="46" y="30" width="96" height="58" rx="5" fill="#f3e2c6"/><path d="M60 48h66M60 58h58M60 68h44" stroke="${C.lav}" stroke-width="3" stroke-linecap="round"/></g>${candle(156, 66)}</svg>`,
  juntos: `<svg viewBox="0 0 200 110">${skull(46, 58)}${skull(82, 58)}${skull(118, 58)}${skull(154, 58)}<path d="M30 84h140" stroke="${C.lav}" stroke-width="5" stroke-linecap="round"/></svg>`,
  vinculo: `<svg viewBox="0 0 200 110"><path d="M36 76q64 -70 128 0" stroke="${C.orange}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="36" cy="76" r="7" fill="${C.orange}"/><path d="M164 76l-14 -4l9 -10z" fill="${C.orange}"/></svg>`,
  aviso: `<svg viewBox="0 0 200 110">${candle(84, 60)}<circle cx="116" cy="54" r="16" fill="none" stroke="${C.lav}" stroke-width="3" stroke-dasharray="4 5"/>${candle(116, 60)}</svg>`,
};

export const GUIDE_STEPS = [
  {
    art: 'ofrenda', eyebrow: 'Día de Muertos',
    title: 'La sexta etapa: crear <em>significado</em>',
    body: 'Las cinco etapas del duelo describen cosas que nos pasan. En 2019, David Kessler —que había perdido a su hijo— sumó una sexta: crear significado. No es algo que la pérdida te da: es algo que hacés vos, con el amor que quedó. En México, la ofrenda lo hace hace siglos.',
  },
  {
    art: 'preguntas', eyebrow: 'Paso 1',
    title: 'Respondé dos preguntas por <em>escrito</em>',
    body: '¿Dónde está? ¿Cuándo lo volvés a ver? Mientras esas casillas quedan vacías, la cabeza sigue buscando. No importa si tu respuesta es el cielo, el otro lado, la memoria o "el 1 y 2 de noviembre": importa escribirla.',
    action: 'answers',
  },
  {
    art: 'cosa', eyebrow: 'Paso 2',
    title: 'Ponele su <em>cosa</em>',
    body: 'Lo específico, no lo genérico: su pelota, su golosina, la manta donde dormía. Una ofrenda es una cita, no un recuerdo: se prepara lo que le gustaba para que venga.',
    action: 'gift',
  },
  {
    art: 'falto', eyebrow: 'Paso 3',
    title: 'Decile lo que <em>faltó</em>',
    body: 'El gracias que no llegaste a decir, el perdón, la despedida. Escribilo o decilo en voz alta frente a su foto. Las cuentas abiertas se cierran diciéndolas, no ignorándolas.',
    action: 'falto',
  },
  {
    art: 'juntos', eyebrow: 'Paso 4',
    title: 'No lo hagas <em>solo</em>',
    body: 'La ofrenda se pone en familia. Invitá a quienes también lo querían, organicen un encuentro o vení a la hora de las velas (21 h): siempre hay alguien encendiendo una al mismo tiempo que vos.',
    action: 'together',
  },
  {
    art: 'vinculo', eyebrow: 'Paso 5',
    title: 'Decidí cómo sigue el <em>vínculo</em>',
    body: 'No se trata de soltar. Quienes mantienen un lazo con quien murió suelen transitar mejor el duelo (vínculos continuos). Elegí qué se queda: un paseo, una frase, una costumbre. Y una fecha para volver cada año.',
    action: 'bond',
  },
  {
    art: 'aviso', eyebrow: 'Una advertencia honesta',
    title: 'No es una obligación ni un <em>plazo</em>',
    body: 'No hace falta esperar a que duela menos: se hace mientras duele. Pero cada duelo tiene su tiempo, y hay duelos que necesitan acompañamiento. Si el dolor te desborda, buscá ayuda profesional; no tenés que poder sola o solo.',
    action: 'start',
    sources: [
      'Kessler, D. (2019). Finding Meaning: The Sixth Stage of Grief.',
      "O'Connor, M.-F. (2022). The Grieving Brain.",
      'Klass, D., Silverman, P. R. y Nickman, S. (1996). Continuing Bonds.',
      'Kübler-Ross, E. (1969). On Death and Dying.',
      'Inspirado en un carrusel de Oscar Rivas, PhD (@oscarjrivas).',
    ],
  },
];

export function renderGuide(track, dots) {
  track.innerHTML = '';
  dots.innerHTML = '';
  GUIDE_STEPS.forEach((st, i) => {
    const card = document.createElement('section');
    card.className = 'guide-card';
    card.dataset.i = i;
    card.innerHTML = `<div class="guide-art">${ART[st.art]}</div>
      <p class="eyebrow">${st.eyebrow}</p>
      <h3>${st.title}</h3>
      <p class="guide-body">${st.body}</p>
      <div class="guide-actions" data-action="${st.action || ''}"></div>
      ${st.sources ? `<ul class="guide-sources">${st.sources.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}`;
    track.append(card);
    const d = document.createElement('button');
    d.setAttribute('aria-label', `Paso ${i + 1}`);
    d.onclick = () => card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    dots.append(d);
  });
}
