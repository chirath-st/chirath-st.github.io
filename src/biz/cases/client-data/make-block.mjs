// Build-time helper (not loaded by the page): prints the isometric "data set" for Case 03 Exhibit 3 as HTML, one SVG
// per layer (same 500 × 380 viewBox, stacked in the page) with the hotspot pins placed in % of the stage. Paste the
// output inside <div class="cd-block"> in cases/client-data/index.html:  node src/biz/cases/client-data/make-block.mjs
const VW = 500, VH = 380;
const s = 1.18, c = Math.cos(Math.PI / 6);
const CX = 244, CY = 122;
const P = (x, y, z) => [CX + (x - y) * c * s, CY + (x + y) * 0.5 * s - z * s];
const pt = (a) => `${a[0].toFixed(1)},${a[1].toFixed(1)}`;
const poly = (pts, attrs) => `<polygon points="${pts.map(pt).join(' ')}" ${attrs}/>`;
const line = (a, b, attrs) => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" ${attrs}/>`;
const W = 200, D = 150, HEAD = 24, COLS = 5, ROWS = 5, GAP = 24, T = 4;
const zs = [0, GAP, GAP * 2, GAP * 3];

function sheet(z, top) {
  const o = [];
  // thickness: the two front faces
  o.push(poly([P(0, D, z), P(W, D, z), P(W, D, z - T), P(0, D, z - T)], 'class="cd-b-edge"'));
  o.push(poly([P(W, 0, z), P(W, D, z), P(W, D, z - T), P(W, 0, z - T)], 'class="cd-b-edge cd-b-edge--r"'));
  o.push(poly([P(0, 0, z), P(W, 0, z), P(W, D, z), P(0, D, z)], 'class="cd-b-face"'));
  // header band (the column names) along the back edge
  o.push(poly([P(0, 0, z), P(W, 0, z), P(W, HEAD, z), P(0, HEAD, z)], `class="cd-b-head${top ? ' cd-b-head--top' : ''}"`));
  if (top) {
    // the column that fits the client's use (hotspot 4)
    o.push(poly([P(80, HEAD, z), P(120, HEAD, z), P(120, D, z), P(80, D, z)], 'class="cd-b-col"'));
    // value marks in each cell
    for (let r = 0; r < ROWS; r++) for (let k = 0; k < COLS; k++) {
      const y = HEAD + (r + 0.5) * ((D - HEAD) / ROWS), x0 = k * 40 + 8, len = [22, 16, 26, 12, 20][(r * 2 + k) % 5];
      o.push(line(P(x0, y, z), P(x0 + len, y, z), 'class="cd-b-val"'));
    }
    for (let k = 0; k < COLS; k++) {
      const x0 = k * 40 + 8;
      o.push(line(P(x0, HEAD / 2, z), P(x0 + 18, HEAD / 2, z), 'class="cd-b-hval"'));
    }
  }
  for (let k = 1; k < COLS; k++) o.push(line(P(k * 40, 0, z), P(k * 40, D, z), 'class="cd-b-grid"'));
  for (let r = 0; r <= ROWS; r++) { const y = HEAD + r * ((D - HEAD) / ROWS); if (r < ROWS) o.push(line(P(0, y, z), P(W, y, z), 'class="cd-b-grid"')); }
  o.push(poly([P(0, 0, z), P(W, 0, z), P(W, D, z), P(0, D, z)], 'class="cd-b-rim"'));
  return o.join('');
}

// the store: a flat cylinder under the stack
function store() {
  const z = -30, cx0 = W / 2, cy0 = D / 2, rx = 128;
  const top = P(cx0, cy0, z), bot = P(cx0, cy0, z - 30);
  const ex = rx * c * s * 1.02, ey = rx * 0.5 * s * 1.02;
  const o = [];
  o.push(`<path class="cd-b-cyl-side" d="M${(top[0] - ex).toFixed(1)} ${top[1].toFixed(1)}V${bot[1].toFixed(1)}A${ex.toFixed(1)} ${ey.toFixed(1)} 0 0 0 ${(bot[0] + ex).toFixed(1)} ${bot[1].toFixed(1)}V${top[1].toFixed(1)}Z"/>`);
  o.push(`<path class="cd-b-cyl-band" d="M${(top[0] - ex).toFixed(1)} ${(top[1] + 11).toFixed(1)}A${ex.toFixed(1)} ${ey.toFixed(1)} 0 0 0 ${(top[0] + ex).toFixed(1)} ${(top[1] + 11).toFixed(1)}"/>`);
  o.push(`<ellipse class="cd-b-cyl-top" cx="${top[0].toFixed(1)}" cy="${top[1].toFixed(1)}" rx="${ex.toFixed(1)}" ry="${ey.toFixed(1)}"/>`);
  o.push(`<ellipse class="cd-b-cyl-in" cx="${top[0].toFixed(1)}" cy="${top[1].toFixed(1)}" rx="${(ex * 0.8).toFixed(1)}" ry="${(ey * 0.8).toFixed(1)}"/>`);
  return { svg: o.join(''), pin: [top[0] - ex * 0.55, bot[1] + ey * 0.62] };
}

// annotations: the height bracket (how much) and the rows / columns arrows (its shape)
function notes() {
  const o = [];
  const zt = zs[3];
  // height bracket at the right corner
  const a = P(W, 0, zs[0] - T), b = P(W, 0, zt);
  const off = 26;
  const A = [a[0] + off, a[1]], B = [b[0] + off, b[1]];
  o.push(line(A, B, 'class="cd-b-dim" data-fx="draw" pathLength="1"'));
  o.push(line([A[0] - 5, A[1]], [A[0] + 5, A[1]], 'class="cd-b-dim"'));
  o.push(line([B[0] - 5, B[1]], [B[0] + 5, B[1]], 'class="cd-b-dim"'));
  // rows arrow along the back-left edge (y direction), columns arrow along the back-right edge (x direction)
  const r0 = P(0, 0, zt), r1 = P(0, D, zt);
  const k0 = P(0, 0, zt), k1 = P(W, 0, zt);
  const shift = (p, dx, dy) => [p[0] + dx, p[1] + dy];
  const R0 = shift(r0, -15, -9), R1 = shift(r1, -15, -9);
  const K0 = shift(k0, 15, -9), K1 = shift(k1, 15, -9);
  const arrow = (p, q) => {
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), h = 7;
    const l = [q[0] - h * Math.cos(ang - 0.45), q[1] - h * Math.sin(ang - 0.45)], r = [q[0] - h * Math.cos(ang + 0.45), q[1] - h * Math.sin(ang + 0.45)];
    return `<path class="cd-b-arr" d="M${pt(p)}L${pt(q)}M${pt(l)}L${pt(q)}L${pt(r)}"/>`;
  };
  o.push(arrow(R0, R1));
  o.push(arrow(K0, K1));
  return {
    svg: o.join(''),
    dimPin: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2],
    rowsLbl: [(R0[0] + R1[0]) / 2 - 24, (R0[1] + R1[1]) / 2 - 12],
    colsLbl: [(K0[0] + K1[0]) / 2 + 26, (K0[1] + K1[1]) / 2 - 14],
  };
}

const pct = (p) => `left:${((p[0] / VW) * 100).toFixed(2)}%;top:${((p[1] / VH) * 100).toFixed(2)}%`;
const st = store();
const nt = notes();
const svgOpen = `<svg viewBox="0 0 ${VW} ${VH}" aria-hidden="true" focusable="false">`;
const headPin = P(W * 0.72, HEAD / 2, zs[3]);
const colPin = P(100, D * 0.72, zs[3]);
const layers = [];
layers.push(`<div class="cd-b-layer cd-b-layer--store" data-depth=".15" data-drop="1">${svgOpen}${st.svg}</svg><span class="cd-pin" data-spot="3" style="${pct(st.pin)}"><span class="k-spot" aria-hidden="true">3</span></span></div>`);
zs.forEach((z, i) => {
  const top = i === zs.length - 1;
  const pins = top
    ? `<span class="cd-pin" data-spot="1" style="${pct(headPin)}"><span class="k-spot" aria-hidden="true">1</span></span><span class="cd-pin" data-spot="4" style="${pct(colPin)}"><span class="k-spot" aria-hidden="true">4</span></span>`
    : '';
  layers.push(`<div class="cd-b-layer${top ? ' cd-b-layer--top' : ''}" data-depth="${(0.3 + i * 0.18).toFixed(2)}" data-drop="${i < 2 ? 2 : 3}">${svgOpen}${sheet(z, top)}</svg>${pins}</div>`);
});
layers.push(`<div class="cd-b-layer cd-b-layer--notes" data-depth="1" data-drop="4">${svgOpen}${nt.svg}</svg><span class="cd-b-lbl cd-b-lbl--rows" style="${pct(nt.rowsLbl)}">Rows</span><span class="cd-b-lbl cd-b-lbl--cols cd-pin-lbl" data-spot="5" style="${pct(nt.colsLbl)}">Columns<span class="k-spot" aria-hidden="true">5</span></span><span class="cd-pin" data-spot="2" style="${pct(nt.dimPin)}"><span class="k-spot" aria-hidden="true">2</span></span></div>`);
console.log(layers.join('\n'));
