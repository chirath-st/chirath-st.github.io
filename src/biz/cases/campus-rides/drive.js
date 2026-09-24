// Case 04 · Exhibit 1: the full bus drives into the picture as it scrolls up the screen, and back out on the way up.
// Finished picture (JS off, reduced motion): the bus already stuck in traffic.
import { arm, track, armOn, armOff } from '../../kit/util.js';

export function init(el, ctx) {
  const bus = el.querySelector('.cr-t--bus');
  if (!bus) return;
  let disarm = null;
  const start = () => {
    disarm = arm(el, () => {
      armOn(el, 'cr-drive');
      const stop = track(el, (p) => {
        const t = Math.min(1, p / 0.8);
        const e = 1 - (1 - t) ** 3;
        bus.style.transform = e >= 1 ? '' : `translateX(${(-185 * (1 - e)).toFixed(2)}%)`;
      }, { start: 0.95, end: 0.5, name: 'cr-drive' });
      return () => { stop(); bus.style.transform = ''; armOff(el, 'cr-drive'); };
    });
  };
  if (ctx.motion) start();
  return { motion(on) { disarm?.(); disarm = null; if (on) start(); } };
}
