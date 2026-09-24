// Case 02 · Exhibit 2 (the signature picture): "one channel, three lanes".
// The HTML is the finished, flat diagram (JS off, reduced motion, "Turn off animation"). With motion allowed, and only
// while the picture is off screen (arm), the same flat diagram (never slanted: Sep 24, nobody reads text at an angle)
// gets three question cards, one on each old inbox. Scroll position sends them through: into the one channel (each
// inbox then fades to its pale "before" outline), past the reader bot, and down their three lanes to an outcome. A card
// rests on the top edge of a tile, like a badge, so it never covers the tile's words, and hops to the next one.
// Everything depends only on scroll position, so scrolling up plays it backwards; all three cards have arrived once
// the picture is in view (its top at 30 % of the screen at the latest: kit/util.js span). No gsap, no library.
import { arm, track, armOn, armOff, clamp } from '../../kit/util.js';

const ROUTES = [1, 2, 3].map((k) => [`s${k}`, 'c', 'r', `a${k}`, `o${k}`]);
const DONE = [
  '<svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M6 8h12M6 12h12M6 16h7"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M3.5 7.5h17v3a2 2 0 0 0 0 4v3h-17v-3a2 2 0 0 0 0-4z"/></svg>',
];
const SHARED = new Set(['c', 'r']); // tiles all three cards pass: they stand side by side there
const smooth = (t) => t * t * (3 - 2 * t);

export function init(el, ctx) {
  const board = el.querySelector('.qd-board');
  if (!board) return;
  const tiles = {};
  board.querySelectorAll('[data-n]').forEach((t) => { tiles[t.dataset.n] = t; });
  const wideQ = matchMedia('(min-width: 641px)');
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

      const pts = {};
      let p = 0, legs = [];
      // one hop: from a resting place, along the tile's top edge to the gap between the two columns, through the
      // gap, and along the next tile's top edge, so a card never slides across a tile's words. Straight where the
      // two tiles are level, or where the columns have no gap (phones: the card shrinks while it travels).
      const rest = (n, k) => ({ x: pts[n].x + (SHARED.has(n) ? (k - 1) * (wideQ.matches ? 46 : 30) : 0), y: pts[n].y });
      const leg = (na, nb, k) => {
        const a = rest(na, k), b = rest(nb, k);
        const ar = tiles[na].offsetLeft + tiles[na].offsetWidth, bl = tiles[nb].offsetLeft;
        const q = Math.abs(a.y - b.y) < 12 || bl - ar < 36 ? [a, b] : [a, { x: (ar + bl) / 2, y: a.y }, { x: (ar + bl) / 2, y: b.y }, b];
        const d = [0];
        for (let j = 1; j < q.length; j++) d.push(d[j - 1] + Math.hypot(q[j].x - q[j - 1].x, q[j].y - q[j - 1].y));
        return { q, d, elbow: q.length > 2 };
      };
      const along = ({ q, d }, e) => {
        const L = d[d.length - 1] * e;
        let j = 1;
        while (j < q.length - 1 && d[j] < L) j++;
        const t = d[j] > d[j - 1] ? (L - d[j - 1]) / (d[j] - d[j - 1]) : 1;
        return { x: q[j - 1].x + (q[j].x - q[j - 1].x) * t, y: q[j - 1].y + (q[j].y - q[j - 1].y) * t };
      };
      const paint = () => {
        const lit = new Set(), gone = new Set(), hit = new Set();
        toks.forEach(({ route, tk }, k) => {
          if (!legs[k]) return;
          const lp = clamp((p - k * 0.08) / 0.76); // each card starts a little later; all have arrived at p = 0.92
          const segs = route.length - 1;
          const f = lp * segs;
          const i = Math.min(segs - 1, Math.floor(f));
          const e = smooth(clamp((f - i - 0.3) / 0.7)); // rest on a tile, then hop to the next
          const lg = legs[k][i], s = Math.sin(Math.PI * e);
          const { x, y } = along(lg, e);
          tk.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${(lg.elbow ? 1 + 0.06 * s : 1 - 0.4 * s).toFixed(3)})`;
          const at = e >= 1 ? i + 1 : i; // the last tile this card has reached
          for (let n = 1; n <= at; n++) lit.add(route[n]);
          if (at > 0 || e > 0) gone.add(route[0]);
          if (e <= 0 || e >= 1) hit.add(route[at]);
          tk.classList.toggle('is-done', at === segs);
          tk.classList.toggle('is-fly', e > 0 && e < 1);
        });
        Object.entries(tiles).forEach(([n, t]) => {
          t.classList.toggle('is-lit', lit.has(n));
          t.classList.toggle('is-gone', gone.has(n));
          t.classList.toggle('is-hit', hit.has(n) && !n.startsWith('s'));
        });
      };
      // where a card rests on each tile: on its top edge (board layout px), centred on the shared tiles and near the
      // right end on the others, clear of the tile's words (they sit on the left) and of the column headings
      const geo = () => {
        const wide = wideQ.matches;
        const th = wide ? 32 : 26; // card height (CSS)
        Object.entries(tiles).forEach(([n, t]) => {
          const x = SHARED.has(n) ? t.offsetLeft + t.offsetWidth / 2 : t.offsetLeft + t.offsetWidth - (wide ? 32 : 18);
          pts[n] = { x, y: t.offsetTop - th * 0.3 };
        });
        legs = toks.map(({ route }, k) => route.slice(1).map((n, i) => leg(route[i], n, k)));
        paint();
      };
      const ro = new ResizeObserver(geo);
      ro.observe(board);
      geo();
      const stopTrack = track(el, (v) => { p = v; paint(); }, { start: 0.85, name: 'qd-scene' });
      wideQ.addEventListener('change', geo);

      return () => {
        stopTrack();
        ro.disconnect();
        wideQ.removeEventListener('change', geo);
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
