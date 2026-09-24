// Case 04 · Exhibit 3 (the signature): the campus map. With scroll: 1 · cars driven by students already going to class
// appear and post their trip; 2 · riders walk over and take the empty seats; 3 · the cars drive on towards their campus,
// drawing their route. Everything depends only on scroll position, so scrolling up plays it backwards.
// The finished picture (JS off, reduced motion) is the last frame: seats taken, cars on their way.
import { $$, arm, track, armOn, armOff, clamp } from '../../kit/util.js';

const W = 900, H = 560, END = 0.7;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export function init(el, ctx) {
  const stage = el.querySelector('.cr-map__stage');
  const tracks = $$('.cr-m-track', el);
  const done = $$('.cr-m-done', el);
  const cars = $$('.cr-car', el);
  const riders = $$('.cr-rider', el);
  const chips = $$('.cr-m-chip', el);
  const steps = $$('.cr-step', el);
  if (!stage || tracks.length !== cars.length || done.length !== cars.length) return;
  let disarm = null;

  const start = () => {
    disarm = arm(el, () => {
      armOn(el, 'cr-map');
      const len = tracks.map((t) => t.getTotalLength());
      const orig = cars.map((c) => ({ left: c.style.left, top: c.style.top, r: c.style.getPropertyValue('--r') }));
      const home = riders.map((d) => ({ x: parseFloat(d.style.left), y: parseFloat(d.style.top), car: +d.dataset.car }));
      const seatsOf = cars.map((c) => $$('[data-seat]', c));
      const order = riders.map((d, i) => riders.slice(0, i).filter((o) => o.dataset.car === d.dataset.car).length);
      const at = (k, f) => {
        const L = len[k] * f;
        const a = tracks[k].getPointAtLength(Math.max(0, L - 1));
        const b = tracks[k].getPointAtLength(Math.min(len[k], L + 1));
        const q = tracks[k].getPointAtLength(L);
        return { x: (q.x / W) * 100, y: (q.y / H) * 100, r: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
      };
      // cars post their trip a little way out of campus, clear of the campus name (labels are relatively bigger on phones)
      const START = stage.offsetWidth < 600 ? 0.2 : 0.1;
      const starts = cars.map((_, k) => at(k, START));

      const paint = (p) => {
        const show = ss(0, 0.16, p); // 1 · post
        const drive = ss(0.54, 0.94, p); // 3 · ride
        cars.forEach((c, k) => {
          const f = START + (END - START) * drive;
          const q = at(k, f);
          c.style.left = `${q.x.toFixed(3)}%`;
          c.style.top = `${q.y.toFixed(3)}%`;
          c.style.setProperty('--r', `${q.r.toFixed(2)}deg`);
          c.style.transform = show >= 1 ? '' : `translate(-50%,-50%) scale(${(0.35 + 0.65 * show).toFixed(3)})`;
          c.style.opacity = show >= 1 ? '' : show.toFixed(3);
          done[k].style.strokeDasharray = `${f.toFixed(4)} 1`;
        });
        chips.forEach((ch) => { ch.style.opacity = show >= 1 ? '' : show.toFixed(3); });
        riders.forEach((d, i) => { // 2 · join: each rider walks to the car, then takes a seat
          const h = home[i];
          const t = ss(0.18 + order[i] * 0.12, 0.36 + order[i] * 0.12, p);
          const s = starts[h.car];
          d.style.left = `${(h.x + (s.x - h.x) * t).toFixed(3)}%`;
          d.style.top = `${(h.y + (s.y - h.y) * t).toFixed(3)}%`;
          d.style.opacity = t >= 1 ? '0' : '';
          seatsOf[h.car][order[i]]?.classList.toggle('cr-seat--on', t >= 1);
        });
        const now = p < 0.17 ? 1 : p < 0.52 ? 2 : 3;
        steps.forEach((s, i) => {
          s.classList.toggle('is-on', i < now);
          s.classList.toggle('is-now', i === now - 1 && p < 0.985);
        });
        el.dataset.mapAt = String(now);
      };
      const stop = track(stage, paint, { start: 0.92, end: 0.5, ease: 0.18, name: 'cr-map' });
      return () => {
        stop();
        cars.forEach((c, k) => {
          c.style.left = orig[k].left;
          c.style.top = orig[k].top;
          c.style.setProperty('--r', orig[k].r);
          c.style.transform = '';
          c.style.opacity = '';
          done[k].style.strokeDasharray = `${END} 1`;
          seatsOf[k].forEach((s) => s.classList.add('cr-seat--on'));
        });
        riders.forEach((d, i) => { d.style.left = `${home[i].x}%`; d.style.top = `${home[i].y}%`; d.style.opacity = ''; });
        chips.forEach((ch) => { ch.style.opacity = ''; });
        steps.forEach((s) => s.classList.remove('is-on', 'is-now'));
        delete el.dataset.mapAt;
        armOff(el, 'cr-map');
      };
    });
  };
  if (ctx.motion) start();
  return { motion(on) { disarm?.(); disarm = null; if (on) start(); } };
}
