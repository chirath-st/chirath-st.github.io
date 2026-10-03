// Case 02 · Exhibit 2 (the signature picture): "one channel, three lanes".
// The HTML is the finished, flat diagram (JS off, reduced motion, "Turn off animation"). With motion allowed, and only
// while the picture is off screen (arm), the same flat diagram (never slanted: nobody reads text at an angle)
// gets three question cards. Scroll position sends them through, each one ALONG ITS OWN WIRE (the diagram's lines):
// out of its old inbox, through the one channel and the reader bot (a card passes under a tile, like a message going
// through it), and down its lane to an outcome.
// A card is never off its line. Every
// position comes from the real geometry, measured again on every resize: the wire's own path (getPointAtLength,
// mapped to board px) and the tiles' boxes. The three cards start on one shared line just past the inboxes and end
// on one shared line just before the outcomes (a column on wide screens, a row on phones), each on its wire.
// Everything depends only on scroll position, so scrolling up plays it backwards; all three cards have arrived once
// the picture is in view (its top at 30 % of the screen at the latest: kit/util.js span). No gsap, no library.
import { arm, track, armOn, armOff, clamp } from '../../kit/util.js';

const ROUTES = [1, 2, 3].map((k) => [`s${k}`, 'c', 'r', `a${k}`, `o${k}`]);
const DONE = [
  '<svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M6 8h12M6 12h12M6 16h7"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M3.5 7.5h17v3a2 2 0 0 0 0 4v3h-17v-3a2 2 0 0 0 0-4z"/></svg>',
];
const STEP = 3; // px between samples along a wire
const UNDER = 0.3; // share of scroll a px under a tile takes, against a px on a visible line
// piecewise-linear map from one increasing array to another (arc length ↔ scroll "time")
const lerp = (from, to, v) => {
  let lo = 1, hi = from.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (from[mid] < v) lo = mid + 1; else hi = mid; }
  const a = from[lo - 1], b = from[lo];
  return to[lo - 1] + (b > a ? Math.min(1, Math.max(0, (v - a) / (b - a))) : 0) * (to[lo] - to[lo - 1]);
};
const smooth = (t) => t * t * (3 - 2 * t);

export function init(el, ctx) {
  const board = el.querySelector('.qd-board');
  if (!board) return;
  const tiles = {};
  board.querySelectorAll('[data-n]').forEach((t) => { tiles[t.dataset.n] = t; });
  let disarm = null;

  const start = () => {
    disarm = arm(el, () => {
      armOn(el, 'qd-scene');
      const toks = ROUTES.map((route, k) => {
        const tk = document.createElement('span');
        tk.className = 'qd-tok';
        tk.dataset.k = String(k + 1);
        tk.innerHTML = `<span class="qd-tok__q">?</span><span class="qd-tok__a">${DONE[k]}</span>`;
        board.append(tk);
        return { route, tk };
      });

      let p = 0, paths = [];

      // the wires on screen (the wide or the phone set, whichever CSS shows), sampled in board px
      const wire = (key) => [...board.querySelectorAll(`.qd-w[data-w="${key}"]`)].find((w) => w.getClientRects().length);
      const sample = (w, br) => {
        const m = w.getScreenCTM(), L = w.getTotalLength(), pts = [];
        const len = L * Math.hypot(m.a, m.b, m.c, m.d); // rough px length, for the sample count only
        const n = Math.max(2, Math.ceil(len / STEP));
        for (let i = 0; i <= n; i++) {
          const q = w.getPointAtLength((L * i) / n).matrixTransform(m);
          pts.push({ x: q.x - br.left, y: q.y - br.top });
        }
        return pts;
      };
      const box = (n) => {
        const t = tiles[n];
        return { l: t.offsetLeft, t: t.offsetTop, r: t.offsetLeft + t.offsetWidth, b: t.offsetTop + t.offsetHeight };
      };
      const inside = (q, r) => q.x > r.l && q.x < r.r && q.y > r.t && q.y < r.b;
      // arc length (along a route) where the route first reaches `v` on the flow axis
      const crossing = (P, ax, v, from = 0) => {
        for (let i = Math.max(1, from); i < P.q.length; i++) {
          const a = P.q[i - 1][ax], b = P.q[i][ax];
          if ((a - v) * (b - v) <= 0 && a !== b) return P.d[i - 1] + ((v - a) / (b - a)) * (P.d[i] - P.d[i - 1]);
        }
        return null;
      };
      const at = (P, s) => {
        let lo = 1, hi = P.d.length - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (P.d[mid] < s) lo = mid + 1; else hi = mid; }
        const d0 = P.d[lo - 1], d1 = P.d[lo], t = d1 > d0 ? clamp((s - d0) / (d1 - d0)) : 0;
        return { x: P.q[lo - 1].x + (P.q[lo].x - P.q[lo - 1].x) * t, y: P.q[lo - 1].y + (P.q[lo].y - P.q[lo - 1].y) * t };
      };

      const geo = () => {
        const br = board.getBoundingClientRect();
        const w0 = wire('c-r');
        if (!br.width || !w0) return;
        // flow axis, from the straight channel → reader wire: along x when the diagram runs left to right (wide),
        // along y when it runs top to bottom (phones)
        const a0 = sample(w0, br);
        const ax = Math.abs(a0[a0.length - 1].x - a0[0].x) >= Math.abs(a0[a0.length - 1].y - a0[0].y) ? 'x' : 'y';
        const far = ax === 'x' ? 'r' : 'b', near = ax === 'x' ? 'l' : 't';
        const tk0 = toks[0].tk;
        const half = (ax === 'x' ? tk0.offsetWidth : tk0.offsetHeight) / 2;
        const B = Object.fromEntries(Object.keys(tiles).map((n) => [n, box(n)]));
        // start line: just past the furthest inbox edge, but never touching the channel tile (centre of the gap)
        const srcEdge = Math.max(B.s1[far], B.s2[far], B.s3[far]);
        const startV = Math.min(srcEdge + half + 6, (srcEdge + B.c[near]) / 2);
        // end line: just before the nearest outcome edge, but never touching a lane tile (centre of the gap)
        const outEdge = Math.min(B.o1[near], B.o2[near], B.o3[near]);
        const laneEdge = Math.max(B.a1[far], B.a2[far], B.a3[far]);
        const endV = Math.max(outEdge - half - 6, (laneEdge + outEdge) / 2);
        paths = toks.map(({ route }) => {
          const q = [];
          route.slice(1).forEach((n, i) => {
            const w = wire(`${route[i]}-${n}`);
            if (w) q.push(...sample(w, br).slice(q.length ? 1 : 0));
          });
          const d = [0];
          for (let j = 1; j < q.length; j++) d.push(d[j - 1] + Math.hypot(q[j].x - q[j - 1].x, q[j].y - q[j - 1].y));
          const P = { q, d };
          // where the route enters each tile it passes (lights it) and leaves it (the card is under it meanwhile)
          P.span = route.map((n) => {
            const r = B[n];
            let s0 = null, s1 = null;
            q.forEach((pt, j) => { if (inside(pt, r)) { if (s0 === null) s0 = d[j]; s1 = d[j]; } });
            return { n, s0: s0 ?? 0, s1: s1 ?? 0 };
          });
          P.s0 = crossing(P, ax, startV) ?? P.span[0].s1;
          // the last tile's approach: search from the lane tile onwards so a curve earlier on can't match first
          const laneAt = q.findIndex((pt, j) => d[j] >= P.span[3].s1);
          P.s1 = crossing(P, ax, endV, laneAt) ?? P.span[4].s0;
          // scroll "time" along the route: the stretch under a tile counts for less (UNDER), so a card spends most
          // of the scroll visible on its line and passes quickly through the channel, the reader bot and its lane
          const hidden = (j) => route.some((n) => inside(q[j], B[n]));
          const u = [0];
          for (let j = 1; j < q.length; j++) u.push(u[j - 1] + (d[j] - d[j - 1]) * (hidden(j) && hidden(j - 1) ? UNDER : 1));
          P.u = u;
          P.u0 = lerp(d, u, P.s0);
          P.u1 = lerp(d, u, P.s1);
          return P;
        });
        paint();
      };

      const paint = () => {
        if (!paths.length) return;
        const lit = new Set(), gone = new Set(), hit = new Set();
        toks.forEach(({ route, tk }, k) => {
          const P = paths[k];
          const lp = clamp((p - k * 0.08) / 0.76); // each card starts a little later; all have arrived at p = 0.92
          const s = lerp(P.u, P.d, P.u0 + (P.u1 - P.u0) * smooth(lp));
          const { x, y } = at(P, s);
          tk.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
          let under = false;
          P.span.forEach(({ n, s0, s1 }, i) => {
            if (i === 0) { if (lp > 0) gone.add(n); return; }
            if (s > s0 && s < s1) under = true;
            if (s >= s0 || (i === 4 && lp >= 1)) lit.add(n);
            if ((s >= s0 && s <= s1) || (i === 4 && lp >= 1)) hit.add(n);
          });
          tk.classList.toggle('is-done', lp >= 1);
          tk.classList.toggle('is-fly', lp > 0 && lp < 1);
          tk.classList.toggle('is-under', under);
        });
        Object.entries(tiles).forEach(([n, t]) => {
          t.classList.toggle('is-lit', lit.has(n));
          t.classList.toggle('is-gone', gone.has(n));
          t.classList.toggle('is-hit', hit.has(n));
        });
      };

      let queued = 0;
      const regeo = () => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; geo(); }); };
      // the board keeps its size (aspect-ratio) while tiles change (web fonts arriving, text wrapping), so watch both
      const ro = new ResizeObserver(regeo);
      ro.observe(board);
      Object.values(tiles).forEach((t) => ro.observe(t));
      document.fonts?.ready.then(regeo);
      geo();
      const stopTrack = track(el, (v) => { p = v; paint(); }, { start: 0.85, name: 'qd-scene' });

      return () => {
        stopTrack();
        ro.disconnect();
        cancelAnimationFrame(queued);
        toks.forEach(({ tk }) => tk.remove());
        Object.values(tiles).forEach((t) => t.classList.remove('is-lit', 'is-gone', 'is-hit'));
        armOff(el, 'qd-scene');
      };
    });
  };

  if (ctx.motion) start();
  return {
    motion(on) {
      disarm?.();
      disarm = null;
      if (on) start();
    },
  };
}
