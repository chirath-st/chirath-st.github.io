// Build-time helper (not loaded by the page): writes the Case 03 globe poster SVG, the finished view shown with JS off,
// reduced motion and before the live globe arrives, from the same math as globe.js. Run from site/ after changing
// VIEW_END, STAGE or CITIES in globe-math.js, then copy the printed label positions (cpt, bkk, mid as %) into the page:
//   node src/biz/cases/client-data/make-globe-poster.mjs public/img/cases/client-data/globe.svg
import { writeFileSync } from 'node:fs';
const M = await import('./globe-math.js');
const L = await import('./globe-land.js');
const out = process.argv[2];
const view = process.argv[3] ? JSON.parse(process.argv[3]) : M.VIEW_END;
const { w, h, cx, cy, r } = M.STAGE;
const rot = M.rotation(view.lat, view.lon);
const pts = M.landPoints(L.MASK, L.N);
const buckets = [[], [], [], []];
for (let i = 0; i < pts.length; i += 3) {
  const q = rot([pts[i], pts[i + 1], pts[i + 2]]);
  if (q[2] <= 0.02) continue;
  const b = q[2] > 0.6 ? 3 : q[2] > 0.35 ? 2 : q[2] > 0.15 ? 1 : 0;
  const x = cx + q[0] * r, y = cy - q[1] * r;
  buckets[b].push(`M${Math.round(x * 2)} ${Math.round(y * 2)}h0`);
}
const alpha = [0.18, 0.36, 0.56, 0.74];
const dotW = (r * 0.0078 * 2 * 2).toFixed(2);
const A = M.v3(M.CITIES.cpt.lat, M.CITIES.cpt.lon), B = M.v3(M.CITIES.bkk.lat, M.CITIES.bkk.lon);
const arc = M.arcPoints(A, B).map((p) => rot(p)).map((q) => `${(cx + q[0] * r).toFixed(1)} ${(cy - q[1] * r).toFixed(1)}`);
const P = (c) => { const q = rot(M.v3(c.lat, c.lon)); return [cx + q[0] * r, cy - q[1] * r]; };
const [ax, ay] = P(M.CITIES.cpt), [bx, by] = P(M.CITIES.bkk);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs><radialGradient id="g" cx="40%" cy="32%" r="78%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".72" stop-color="#F2F4F9"/><stop offset="1" stop-color="#E4E9F3"/></radialGradient></defs>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g)" stroke="#C9D4F6" stroke-width="1"/>
<g transform="scale(.5)">
${buckets.map((b, k) => `<path d="${b.join('')}" stroke="#0F2147" stroke-opacity="${alpha[k]}" stroke-width="${dotW}" stroke-linecap="round"/>`).join('\n')}
</g>
<path d="M${arc.join('L')}" fill="none" stroke="#2346D8" stroke-width="2.6" stroke-linecap="round"/>
<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="5" fill="#fff" stroke="#2346D8" stroke-width="2.4"/>
<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="11" fill="#2346D8" fill-opacity=".14"/>
<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="5.5" fill="#2346D8" stroke="#fff" stroke-width="2"/>
</svg>`;
writeFileSync(out, svg);
console.log(JSON.stringify({ bytes: svg.length, dots: buckets.map((b) => b.length), cpt: [ax / w, ay / h], bkk: [bx / w, by / h], mid: arc[48] }));
