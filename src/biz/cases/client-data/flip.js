// Case 03 · Exhibit 8: result cards that turn over (CSS 3D). Point at a card (mouse), tap it, or focus it and press
// Enter / Space to see its back. The first card peeks (a quick part-turn and back, about 1.2 s) as the list comes up
// the screen, to show that it turns; again after the list has gone back below the screen.
// Motion only: JS off, reduced motion and "Turn off animation" show front and back together (the finished picture).
import { arm, armOn, armOff, layoutChanged, arrive, qaRegister } from '../../kit/util.js';

export function init(list, ctx) {
  const cards = [...list.querySelectorAll('.cd-flip')];
  if (!cards.length) return;
  let on = false, disarm = null;
  const set = (c, v) => {
    c.classList.toggle('is-flipped', v);
    if (on) c.setAttribute('aria-pressed', String(v));
  };

  cards.forEach((c) => {
    c.addEventListener('pointerenter', (e) => { if (on && e.pointerType === 'mouse') set(c, true); });
    c.addEventListener('pointerleave', (e) => { if (on && e.pointerType === 'mouse' && !c.dataset.pinned) set(c, false); });
    c.addEventListener('click', () => {
      if (!on) return;
      const v = !c.dataset.pinned;
      if (v) c.dataset.pinned = ''; else delete c.dataset.pinned;
      set(c, v);
    });
    c.addEventListener('keydown', (e) => {
      if (!on || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      c.click();
    });
  });

  const start = () => {
    disarm = arm(list, () => {
      on = true;
      armOn(list, 'cd-flip');
      cards.forEach((c) => { c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-pressed', 'false'); });
      layoutChanged();
      // the first card peeks as the list arrives (top at 85 % of the screen); again after the list went back below
      let peeked = false, t = 0;
      const c0 = cards[0];
      const off = arrive(list, (where) => {
        if (where === 'out') { clearTimeout(t); t = 0; c0.classList.remove('is-peek'); peeked = false; return; }
        if (peeked || c0.classList.contains('is-flipped')) return;
        peeked = true;
        c0.classList.add('is-peek');
        t = setTimeout(() => { c0.classList.remove('is-peek'); t = setTimeout(() => { t = 0; }, 720); }, 440);
      });
      const unQA = qaRegister({ el: list, name: 'cd-flip peek', kind: 'timed', budget: 1400, done: () => (peeked && !t) || c0.classList.contains('is-flipped') });
      return () => {
        off();
        unQA();
        clearTimeout(t);
        on = false;
        cards.forEach((c) => {
          c.classList.remove('is-flipped', 'is-peek');
          delete c.dataset.pinned;
          c.removeAttribute('tabindex'); c.removeAttribute('role'); c.removeAttribute('aria-pressed');
        });
        armOff(list, 'cd-flip');
        layoutChanged();
      };
    });
  };
  if (ctx.motion) start();
  return { motion(m) { disarm?.(); disarm = null; if (m) start(); } };
}
