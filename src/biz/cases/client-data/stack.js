// Case 03 · Exhibit 3: the data set's layers stack up as it scrolls into view, and come apart, in reverse, on the way
// back up (gsap ScrollTrigger scrub via the kit's scrubbed()). Layers: [data-drop="k"] (k = step).
// The store rises from below, the sheets drop in from above, the notes fade in.
// JS off / reduced motion / "Turn off animation": nothing runs; the HTML is the finished stack.
import { scrubbed } from '../../kit/scrub.js';

export function init(el, ctx) {
  follow(el);
  return scrubbed(el, ctx, (tl) => {
    const layers = [...el.querySelectorAll('[data-drop]')];
    let last = 0;
    layers.forEach((l, i) => {
      const k = +l.dataset.drop || 1;
      last = Math.max(last, k);
      const store = l.classList.contains('cd-b-layer--store');
      const notes = l.classList.contains('cd-b-layer--notes');
      const from = notes ? { opacity: 0 } : { opacity: 0, y: store ? 26 : -46 };
      const to = notes ? { opacity: 1 } : { opacity: 1, y: 0, ease: store ? 'power2.out' : 'power3.out' };
      tl.fromTo(l, from, to, k - 1 + (i % 2) * 0.14);
    });
    return last;
  });
}

// The hotspot bubble (kit) is placed once, when a number is pointed at or focused. Here the numbers ride on layers
// that move (the stack builds with scroll), so while a bubble is showing, re-place it whenever its number moves: it
// must never end up covering the number it explains.
function follow(el) {
  const fig = el.closest('.k-hs');
  if (!fig) return;
  let raf = 0, lx = NaN, ly = NaN;
  const tick = () => {
    raf = 0;
    const part = el.querySelector('[data-spot].is-on');
    if (!part || !fig.querySelector('.k-hs__bubble.is-on')) { lx = ly = NaN; return; }
    const r = part.getBoundingClientRect();
    if (!(Math.abs(r.left - lx) < 0.5 && Math.abs(r.top - ly) < 0.5)) {
      lx = r.left; ly = r.top;
      part.dispatchEvent(new FocusEvent('focus')); // the kit's own handler re-places the bubble next to the part
    }
    raf = requestAnimationFrame(tick);
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
  fig.addEventListener('focusin', wake);
  fig.addEventListener('pointerover', wake);
}
