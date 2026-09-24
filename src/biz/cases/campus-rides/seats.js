// Case 04 · Exhibit 5: one shared trip. Riders take the empty seats one by one as it scrolls (and leave again on the way
// up); each rider's payment flows to the driver, with a small commission to the app. The buttons pick the riders by
// hand (any mode, keyboard too). Finished picture (JS off, reduced motion): all three seats taken.
import { $$, arm, track, armOn, armOff } from '../../kit/util.js';

const NOTES = [
  '<b>Driver only.</b> The driver is going to class anyway, with three empty seats.',
  '<b>1 rider.</b> The rider pays the driver for a seat that was empty. The app keeps a commission.',
  '<b>2 riders.</b> Each rider pays the driver for a seat that was empty. The app keeps a commission on each ride.',
  '<b>3 riders.</b> Each rider pays the driver for a seat that was empty. The app keeps a commission on each ride.',
];

export function init(el, ctx) {
  const btns = $$('.cr-share__ctl button', el);
  const note = el.querySelector('.cr-share__note');
  if (!btns.length) return;
  note?.removeAttribute('aria-live');
  let n = 3, manual = false;
  const set = (k) => {
    n = k;
    el.dataset.riders = String(k);
    btns.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.n === k)));
    if (note) note.innerHTML = NOTES[k];
  };
  // the note keeps the height of its longest version, so nothing below it moves when the riders change
  const fit = () => {
    if (!note || !note.offsetWidth) return;
    const was = note.innerHTML;
    note.style.minHeight = '';
    const hs = NOTES.map((t) => { note.innerHTML = t; return note.offsetHeight; });
    note.innerHTML = was;
    note.style.minHeight = `${Math.max(...hs)}px`;
  };
  fit();
  if (note) new ResizeObserver(() => { const w = note.offsetWidth; if (w !== fit.w) { fit.w = w; fit(); } }).observe(note);
  btns.forEach((b) => b.addEventListener('click', () => {
    manual = true;
    note?.setAttribute('aria-live', 'polite');
    set(+b.dataset.n);
  }));
  let disarm = null;
  const auto = () => {
    disarm = arm(el, () => {
      armOn(el, 'cr-seats');
      if (!manual) set(0);
      const stop = track(el, (p) => {
        if (manual) return;
        const k = Math.min(3, Math.floor(p * 4.3));
        if (k !== n) set(k);
      }, { start: 0.88, end: 0.5, ease: 1, name: 'cr-seats' });
      return () => { stop(); armOff(el, 'cr-seats'); if (!manual) set(3); };
    });
  };
  if (ctx.motion) auto();
  return { motion(on) { disarm?.(); disarm = null; if (on) auto(); } };
}
