// Case 02 · Exhibit 5: the three bots as cards that flip (front: its job; back: why this bot was chosen).
// JS off: both faces are listed, one under the other. With JS (html.js, from first paint) the faces share one place
// and a button on each face (or a click / tap on the card) turns it over; the button on the hidden face leaves the
// tab order. With motion, the first card peeks (a quick part-turn and back, about 1.2 s) as the row comes up the
// screen, to show that the cards flip; it peeks again after the row has gone back below the screen, until the reader
// has turned a card. Reduced motion: the cards still flip, without the turn animation.
import { armOn, arrive, qaRegister } from '../../kit/util.js';

export function init(el, ctx) {
  const cards = [...el.querySelectorAll('.qd-flip')];
  if (!cards.length) return;
  let touched = false;

  const set = (c, on, focus) => {
    c.classList.toggle('is-flipped', on);
    const [front, back] = c.querySelectorAll('.qd-flip__b');
    if (front) { front.tabIndex = on ? -1 : 0; front.setAttribute('aria-expanded', String(on)); }
    if (back) back.tabIndex = on ? 0 : -1;
    if (focus) (on ? back : front)?.focus({ preventScroll: true });
  };

  cards.forEach((c) => {
    const [front, back] = c.querySelectorAll('.qd-flip__b');
    set(c, false);
    front?.addEventListener('click', (e) => { e.stopPropagation(); touched = true; set(c, true, true); });
    back?.addEventListener('click', (e) => { e.stopPropagation(); touched = true; set(c, false, true); });
    c.addEventListener('click', (e) => {
      if (window.getSelection?.().toString()) return; // selecting text, not flipping
      if (e.target.closest('a,button')) return;
      touched = true;
      set(c, !c.classList.contains('is-flipped'));
    });
  });
  armOn(el, 'qd-flip');

  let off = null, unQA = null, timer = 0, peeked = false;
  const row = el.querySelector('.qd-cards') || el;
  const stopPeek = () => { clearTimeout(timer); timer = 0; cards[0].classList.remove('is-peek'); };
  const hint = () => {
    off = arrive(row, (where) => {
      if (where === 'out') { stopPeek(); peeked = false; return; }
      if (touched || peeked) return;
      peeked = true;
      cards[0].classList.add('is-peek');
      timer = setTimeout(() => { cards[0].classList.remove('is-peek'); timer = setTimeout(() => { timer = 0; }, 760); }, 440);
    });
    unQA = qaRegister({ el: row, name: 'qd-flip peek', kind: 'timed', budget: 1400, done: () => touched || (peeked && !timer) });
  };
  if (ctx.motion) hint();
  return {
    motion(on) {
      off?.(); off = null; unQA?.(); unQA = null;
      stopPeek();
      if (on) hint();
    },
  };
}
