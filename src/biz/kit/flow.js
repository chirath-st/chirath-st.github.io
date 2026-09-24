// Kit · flow: a traveller (a dot, a row, a note) visits the nodes of a diagram in order, along a line drawn
// through them (SVG stroke-dash), so the reader sees one thing move through the process.
//   <div class="k-flow" data-kit="flow" [data-flow="scroll|loop"] [data-shape="elbow|curve"] [data-closed]
//        [data-start=".92"] [data-end=".6"] [data-dur="6"]>   (start / end: see track() in util.js)
//     nodes: [data-flow-node="1"] … in any layout (the line is re-drawn through their centres on resize)
//     traveller: optional [data-flow-traveller] element (hidden without JS); otherwise a small dot is made
//     static connectors for JS off: give them class "k-flow__static" (hidden once the drawn line takes over)
// scroll: the traveller's place follows scroll position, so scrolling up takes it back; it has visited every node by
//   the time the picture is in view (kit/util.js span). Nodes it has passed get
//   .is-reached; the element gets data-flow-at="k" (nodes reached) for CSS states of the traveller.
// loop: it travels on a timer while visible (nodes flash .is-hit as it passes).
// JS off / reduced motion: the finished picture (every node reached, static connectors, no traveller).
import { $$, arm, track, clamp, armOn, armOff } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const mk = (cls) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls); return p; };

// layout position inside the flow root (ignores transforms, so scrub or depth motion never skews the line)
function box(n, root) {
  let x = 0, y = 0, m = n;
  while (m && m !== root) { x += m.offsetLeft; y += m.offsetTop; m = m.offsetParent; }
  return { x: x + n.offsetWidth / 2, y: y + n.offsetHeight / 2 };
}

function pathThrough(pts, closed, shape) {
  const n = pts.length;
  const Q = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const segs = closed ? n : n - 1;
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < segs; i++) {
    const p0 = Q(i - 1), a = Q(i), b = Q(i + 1), p3 = Q(i + 2);
    if (shape === 'curve') {
      // Catmull-Rom through the centres, as cubic Béziers
      d += ` C${a.x + (b.x - p0.x) / 6} ${a.y + (b.y - p0.y) / 6} ${b.x - (p3.x - a.x) / 6} ${b.y - (p3.y - a.y) / 6} ${b.x} ${b.y}`;
    } else if (Math.abs(a.y - b.y) < 8 || Math.abs(a.x - b.x) < 8) {
      d += ` L${b.x} ${b.y}`;
    } else {
      const my = (a.y + b.y) / 2; // elbow: down, across, down
      d += ` L${a.x} ${my} L${b.x} ${my} L${b.x} ${b.y}`;
    }
  }
  return d;
}

export function init(el, ctx) {
  const nodes = $$('[data-flow-node]', el).sort((a, b) => a.dataset.flowNode - b.dataset.flowNode);
  if (nodes.length < 2) return;
  const closed = el.hasAttribute('data-closed');
  const shape = el.dataset.shape || 'elbow';
  const loop = el.dataset.flow === 'loop';
  let disarm = null;

  const start = () => {
    disarm = arm(el, () => {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'k-flow__svg');
      svg.setAttribute('aria-hidden', 'true');
      const base = mk('k-flow__track'), done = mk('k-flow__done');
      svg.append(base, done);
      el.prepend(svg);
      let trav = el.querySelector('[data-flow-traveller]');
      const made = !trav;
      if (made) { trav = document.createElement('i'); trav.className = 'k-flow__dot'; trav.setAttribute('aria-hidden', 'true'); el.appendChild(trav); }
      armOn(el, 'flow');

      let total = 1, stops = [], p = 0;
      const geo = () => {
        if (!el.offsetWidth) return;
        svg.setAttribute('viewBox', `0 0 ${el.offsetWidth} ${el.offsetHeight}`);
        const pts = nodes.map((n) => box(n, el));
        const d = pathThrough(pts, closed, shape);
        base.setAttribute('d', d);
        done.setAttribute('d', d);
        total = base.getTotalLength() || 1;
        // where along the line each node sits: the nearest of 240 samples to its centre
        const samples = [];
        for (let i = 0; i <= 240; i++) { const L = (total * i) / 240; samples.push([L, base.getPointAtLength(L)]); }
        stops = pts.map((c, k) => {
          if (k === 0) return 0;
          let best = samples[0][0], bd = Infinity;
          for (const [L, q] of samples) { const dd = (q.x - c.x) ** 2 + (q.y - c.y) ** 2; if (dd < bd - 0.01) { bd = dd; best = L; } }
          return best;
        });
        paint(p);
      };
      const paint = (v) => {
        p = v;
        const at = clamp(v) * total;
        done.style.strokeDasharray = `${at} ${total + 1}`;
        const q = base.getPointAtLength(Math.min(at, total - 0.01));
        trav.style.transform = `translate(${q.x - trav.offsetWidth / 2}px, ${q.y - trav.offsetHeight / 2}px)`;
        let reached = 0;
        nodes.forEach((n, k) => {
          const on = loop ? true : at >= stops[k] - 2;
          n.classList.toggle('is-reached', on);
          if (on) reached = k + 1;
          if (loop) n.classList.toggle('is-hit', Math.abs(at - stops[k]) < 18);
        });
        el.dataset.flowAt = String(loop ? nodes.length : reached);
        el.classList.toggle('is-moving', v > 0 && v < 1);
      };
      const ro = new ResizeObserver(geo);
      ro.observe(el);
      geo();

      let stop;
      if (loop) {
        const dur = (+el.dataset.dur || 6) * 1000;
        let raf = 0, t0 = 0, vis = false;
        const frame = (t) => { if (!t0) t0 = t; paint(((t - t0) % dur) / dur); raf = vis ? requestAnimationFrame(frame) : 0; };
        const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis && !raf) raf = requestAnimationFrame(frame); });
        io.observe(el);
        stop = () => { io.disconnect(); cancelAnimationFrame(raf); };
      } else {
        stop = track(el, paint, { start: +el.dataset.start || 0.92, end: +el.dataset.end || 0.6, name: 'flow' });
      }
      return () => {
        stop();
        ro.disconnect();
        svg.remove();
        if (made) trav.remove(); else trav.style.transform = '';
        nodes.forEach((n) => n.classList.remove('is-reached', 'is-hit'));
        el.classList.remove('is-moving');
        armOff(el, 'flow');
        delete el.dataset.flowAt;
      };
    });
  };
  if (ctx.motion) start();
  return { motion(on) { disarm?.(); disarm = null; if (on) start(); } };
}
