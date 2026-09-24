// Case 02 · Exhibit 7: "What if…?". Four cases; picking one lights up its path through the checks and guards.
//   list items: <li data-path="st e0 c1 …"> name the diagram parts ([data-id]) on that case's path, in order.
// JS off / reduced motion: the whole diagram and every case with its outcome in words (nothing picked).
// With JS the cases become toggle buttons (click, Enter / Space, arrow keys). With motion, the picked case follows
// scroll position (1 → 4 on the way down, back on the way up) until the reader picks one.
import { arm, track, armOn } from '../../kit/util.js';

export function init(el, ctx) {
  const items = [...el.querySelectorAll('.qd-wi__list li[data-path]')];
  if (!items.length) return;
  const parts = new Map([...el.querySelectorAll('.qd-wi__grid [data-id]')].map((n) => [n.dataset.id, n]));
  let cur = -1, manual = false;

  const select = (i) => {
    cur = i;
    const path = i >= 0 ? items[i].dataset.path.split(/\s+/) : [];
    el.classList.toggle('has-sel', i >= 0);
    parts.forEach((n, id) => {
      const k = path.indexOf(id);
      n.classList.toggle('is-on', k >= 0);
      if (k >= 0) n.style.setProperty('--i', String(k)); else n.style.removeProperty('--i');
    });
    items.forEach((li, k) => { li.classList.toggle('is-on', k === i); li.setAttribute('aria-pressed', String(k === i)); });
  };

  items.forEach((li, k) => {
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    li.setAttribute('aria-pressed', 'false');
    const pick = () => { manual = true; select(cur === k ? -1 : k); };
    li.addEventListener('click', pick);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); return; }
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (d) {
        e.preventDefault();
        const n = (k + d + items.length) % items.length;
        manual = true;
        select(n);
        items[n].focus();
      }
    });
  });
  armOn(el, 'qd-whatif');

  let stop = null;
  const auto = () => {
    stop = arm(el, () => {
      if (!manual) select(0);
      const off = track(el, (p) => {
        if (manual) return;
        const i = Math.min(items.length - 1, Math.floor(p * items.length * 0.999));
        if (i !== cur) select(i);
      }, { start: +el.dataset.start || 0.92, end: +el.dataset.end || 0.6, ease: 1, name: 'qd-whatif' });
      return () => { off(); if (!manual) select(-1); };
    });
  };
  if (ctx.motion) auto();
  return { motion(on) { stop?.(); stop = null; if (on) auto(); } };
}
