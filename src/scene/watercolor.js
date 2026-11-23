// Estilo acuarela (inspirado en ilustraciones pintadas a mano, sin copiar a nadie): un pase de
// postproceso que corre al final. Papel con fibras y grano, pigmento que se acumula en los bordes,
// lavados de color que manchan parejo, colores que "sangran" un poquito y una viñeta cálida.
// `amount` 0..1 (0 = apagado). No vuelve negros los negros: la acuarela nunca tapa del todo el papel.
import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const WatercolorShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uAmt: { value: 0.8 },
    uPr: { value: 1 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uAmt; uniform float uPr; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * n2(p); p = p * 2.1 + 3.7; a *= 0.5; } return v; }
    float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
    void main(){
      vec2 px = uPr / uRes;                        // un píxel "de CSS": igual en un celular de pantalla densa
      vec2 sp = vUv * uRes / uPr;                  // el papel queda quieto en pantalla
      // Bordes que "sangran": la imagen se corre un poquito siguiendo un ruido suave.
      vec2 wob = (vec2(n2(sp / 140.0), n2(sp / 140.0 + 17.3)) - 0.5) * px * 3.5 * uAmt;
      vec2 uv = vUv + wob;
      vec3 c = texture2D(tDiffuse, uv).rgb;
      // Un desenfoque chiquito para que las superficies parezcan lavadas, no renderizadas.
      vec3 b = texture2D(tDiffuse, uv + vec2(px.x * 1.5, 0.0)).rgb + texture2D(tDiffuse, uv - vec2(px.x * 1.5, 0.0)).rgb
             + texture2D(tDiffuse, uv + vec2(0.0, px.y * 1.5)).rgb + texture2D(tDiffuse, uv - vec2(0.0, px.y * 1.5)).rgb;
      c = mix(c, b * 0.25, 0.4 * uAmt);
      // Sangrado más ancho: el color se derrama un poco hacia afuera, como pintura húmeda.
      vec3 wide = vec3(0.0);
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.785 + n2(sp / 60.0) * 3.0;
        wide += texture2D(tDiffuse, uv + vec2(cos(a), sin(a)) * px * 4.0).rgb;
      }
      wide *= 0.125;
      c = mix(c, max(c, wide), 0.35 * uAmt);
      // Pigmento que se junta en los bordes (Sobel sobre la luminancia).
      float tl = lum(texture2D(tDiffuse, uv + px * vec2(-1.0, 1.0)).rgb), tc = lum(texture2D(tDiffuse, uv + px * vec2(0.0, 1.0)).rgb), tr = lum(texture2D(tDiffuse, uv + px * vec2(1.0, 1.0)).rgb);
      float ml = lum(texture2D(tDiffuse, uv + px * vec2(-1.0, 0.0)).rgb), mr = lum(texture2D(tDiffuse, uv + px * vec2(1.0, 0.0)).rgb);
      float bl = lum(texture2D(tDiffuse, uv + px * vec2(-1.0, -1.0)).rgb), bc = lum(texture2D(tDiffuse, uv + px * vec2(0.0, -1.0)).rgb), br = lum(texture2D(tDiffuse, uv + px * vec2(1.0, -1.0)).rgb);
      float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
      float gy = (tl + 2.0 * tc + tr) - (bl + 2.0 * bc + br);
      float edge = smoothstep(0.03, 0.32, sqrt(gx * gx + gy * gy));
      c *= 1.0 - edge * 0.42 * uAmt;
      // Lavados: manchas grandes de más y menos pigmento, y granulado fino.
      float wash = fbm(sp / 260.0);
      float gran = n2(sp / 3.5) * 0.5 + n2(sp / 7.0) * 0.5;
      c *= mix(1.0, 0.8 + wash * 0.4, uAmt);
      c *= mix(1.0, 0.96 + gran * 0.08, uAmt);
      // Un leve corrimiento de tono en los lavados (el pigmento nunca es parejo).
      c *= mix(vec3(1.0), vec3(1.0 + (wash - 0.5) * 0.12, 1.0, 1.0 - (wash - 0.5) * 0.12), uAmt);
      // Papel: fibras y un tono cálido que asoma en las zonas claras y oscuras.
      float fib = n2(vec2(sp.x / 1.6, sp.y / 9.0)) * 0.5 + n2(vec2(sp.x / 9.0, sp.y / 1.6)) * 0.5;
      vec3 paper = vec3(0.98, 0.95, 0.88) * (0.86 + fib * 0.14);
      float L = lum(c);
      c = mix(c, c * paper, 0.9 * uAmt);
      c += vec3(0.07, 0.06, 0.05) * (0.6 + fib * 0.4) * (1.0 - L) * uAmt;   // los negros quedan como tinta sobre papel, no negro puro
      // Viñeta cálida, como el borde de una hoja pintada.
      vec2 q = vUv - 0.5;
      float vig = smoothstep(0.85, 0.35, length(q * vec2(1.0, 1.15)));
      c *= mix(1.0, 0.82 + 0.18 * vig, uAmt);
      c = mix(c, c * vec3(1.03, 0.99, 0.94), (1.0 - vig) * 0.5 * uAmt);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function createWatercolorPass(amount = 0.8) {
  const pass = new ShaderPass(WatercolorShader);
  pass.uniforms.uAmt.value = amount;
  pass.enabled = amount > 0;
  return {
    pass,
    setSize(w, h, pr = 1) { pass.uniforms.uRes.value.set(w, h); pass.uniforms.uPr.value = Math.max(1, pr); },
    set amount(v) { pass.uniforms.uAmt.value = v; pass.enabled = v > 0; },
    get amount() { return pass.uniforms.uAmt.value; },
  };
}
