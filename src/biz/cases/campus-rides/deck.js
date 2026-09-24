// Case 04 · Exhibit 7: our pitch deck. With scroll the cards are dealt, face down to face up, from a pile in the middle
// into their places (and gathered back on the way up); all are dealt, flat and readable, by the time the deck is in
// view (kit/util.js span). Dealt cards lift a little under the mouse (CSS), never tilt: nobody reads text at an angle.
// Finished picture (JS off, reduced motion): the six cards in their grid.
import { $$, arm, track, armOn, armOff, clamp } from '../../kit/util.js';

const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function init(el, ctx) {
  const cards = $$('.cr-sl', el);
  if (!cards.length) return;
  const N = cards.length;
  let disarm = null;

  const start = () => {
    disarm = arm(el, () => {
      armOn(el, 'cr-deck');
      let off = [], p = 0;
      const measure = () => {
        const W = el.offsetWidth, H = el.offsetHeight;
        off = cards.map((c, i) => ({
          dx: W / 2 - (c.offsetLeft + c.offsetWidth / 2) + (i - (N - 1) / 2) * 2,
          dy: H / 2 - (c.offsetTop + c.offsetHeight / 2) - i * 1.5,
          rz: (i % 2 ? 1 : -1) * (2 + i * 0.7),
        }));
      };
      const paint = (v) => {
        p = v;
        cards.forEach((c, i) => {
          const e = io(clamp((v - i * 0.09) / 0.3)); // the last card lands at 0.75
          const o = off[i];
          if (e >= 1) { c.style.transform = ''; c.style.zIndex = ''; return; }
          const lift = Math.sin(e * Math.PI);
          c.style.transform = `translate3d(${(o.dx * (1 - e)).toFixed(1)}px,${(o.dy * (1 - e) - lift * 34).toFixed(1)}px,${(lift * 60).toFixed(1)}px) rotateZ(${(o.rz * (1 - e)).toFixed(2)}deg) rotateY(${(180 * (1 - e)).toFixed(2)}deg)`;
          c.style.zIndex = String(e > 0 ? 20 + i : N - i);
        });
        el.classList.toggle('is-dealt', v >= 0.76);
      };
      measure();
      const ro = new ResizeObserver(() => { measure(); paint(p); }); // offsets are layout values, transforms never change them
      ro.observe(el);
      const stop = track(el, paint, { start: 0.92, end: 0.6, ease: 0.2, name: 'cr-deck' });
      return () => {
        stop();
        ro.disconnect();
        cards.forEach((c) => { c.style.transform = ''; c.style.zIndex = ''; });
        el.classList.remove('is-dealt');
        armOff(el, 'cr-deck');
      };
    });
  };
  if (ctx.motion) start();
  return { motion(on) { disarm?.(); disarm = null; if (on) start(); } };
}
