// Kit · count: a true number rolls up as it scrolls into view, and back down on the way up.
// Never for invented counts.   <b class="k-count" data-kit="count" data-to="20">20</b>
// The HTML shows the real number (JS off, reduced motion); screen readers always get it from aria-label.
import { arm, track, armOn, armOff } from './util.js';

export function init(el, ctx) {
  const to = +el.dataset.to;
  if (!Number.isFinite(to)) return;
  const text = el.textContent;
  el.setAttribute('aria-label', text.trim());
  el.style.setProperty('min-width', `${el.offsetWidth}px`); // the width never changes while it rolls
  let disarm = null;
  const start = () => {
    disarm = arm(el, () => {
      armOn(el, 'count');
      const stop = track(el, (p) => { el.textContent = p >= 1 ? text : String(Math.round(to * p)); }, { start: 0.95, end: 0.6, ease: 0.25, name: 'count' });
      return () => { stop(); el.textContent = text; armOff(el, 'count'); };
    });
  };
  if (ctx.motion) start();
  return { motion(on) { disarm?.(); disarm = null; if (on) start(); } };
}
