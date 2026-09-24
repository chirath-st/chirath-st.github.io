// Kit · hotspots: point at, focus or tap a part of a picture to read what happens there.
//   <figure class="k-hs" data-kit="hotspots">
//     <div class="k-hs__stage"> … any part with data-spot="1", holding its number: <span class="k-spot" aria-hidden="true">1</span>
//       (place the number with --x / --y on the .k-spot, relative to the part) … </div>
//     <ol class="k-hs__list"><li data-spot="1"><b>Title.</b> What happens here.</li> … </ol>
// The list is the explanation for everyone: JS off, phones, screen readers (each part is described by its item).
// With a fine pointer on a wide screen a bubble next to the part repeats it. Hovering a list item lights up its part.
// Works the same with reduced motion (only the marker pulse is motion).
import { $$, finePointer, wide, armOn } from './util.js';

let uid = 0;

export function init(fig) {
  const stage = fig.querySelector('.k-hs__stage') || fig;
  const items = $$('.k-hs__list [data-spot]', fig);
  const parts = $$('[data-spot]', stage);
  if (!parts.length) return;
  const itemFor = (n) => items.find((li) => li.dataset.spot === n);
  const partFor = (n) => parts.find((p) => p.dataset.spot === n);

  const bubble = document.createElement('div');
  bubble.className = 'k-hs__bubble';
  bubble.setAttribute('aria-hidden', 'true');
  stage.appendChild(bubble);

  let pinned = null;
  const place = (part, li) => {
    bubble.innerHTML = li.innerHTML;
    bubble.classList.add('is-on');
    const s = stage.getBoundingClientRect();
    const r = part.getBoundingClientRect();
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    // beside the part first (right, else left), so the bubble never covers what it explains; else below / above
    let x = r.right - s.left + 12;
    if (x + bw > s.width) x = r.left - s.left - bw - 12;
    let y = Math.max(0, Math.min(s.height - bh, r.top - s.top + r.height / 2 - bh / 2));
    if (x < 0) {
      x = Math.max(6, Math.min(s.width - bw - 6, r.left - s.left + r.width / 2 - bw / 2));
      y = r.bottom - s.top + 10;
      if (y + bh > s.height && r.top - s.top - bh - 10 >= 0) y = r.top - s.top - bh - 10;
    }
    bubble.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };
  const set = (n, part) => {
    fig.dataset.active = n || '';
    parts.forEach((p) => p.classList.toggle('is-on', !!n && p.dataset.spot === n));
    items.forEach((li) => li.classList.toggle('is-on', !!n && li.dataset.spot === n));
    const li = n && itemFor(n);
    if (li && part && finePointer() && wide()) place(part, li);
    else bubble.classList.remove('is-on');
  };
  const rest = () => (pinned ? set(pinned.dataset.spot, pinned) : set(null));

  parts.forEach((p) => {
    if (!p.hasAttribute('tabindex')) p.tabIndex = 0;
    p.setAttribute('role', 'button');
    const li = itemFor(p.dataset.spot);
    if (li) {
      if (!li.id) li.id = `k-hs-${++uid}`;
      p.setAttribute('aria-describedby', li.id);
    }
    p.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { fig.dataset.touched = ''; set(p.dataset.spot, p); } });
    p.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') rest(); });
    p.addEventListener('focus', () => set(p.dataset.spot, p));
    p.addEventListener('blur', rest);
    p.addEventListener('click', () => {
      fig.dataset.touched = '';
      pinned = pinned === p ? null : p;
      rest();
      // phones: the explanation is in the list under the picture; bring it into view if it is off screen
      if (pinned && li && !wide()) {
        const r = li.getBoundingClientRect();
        if (r.bottom > innerHeight || r.top < 0) li.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
    });
    p.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.click(); }
      if (e.key === 'Escape') { pinned = null; set(null); }
    });
  });
  items.forEach((li) => {
    li.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') set(li.dataset.spot, null); });
    li.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') rest(); });
    li.addEventListener('click', () => { const p = partFor(li.dataset.spot); if (p) { pinned = p; rest(); } });
  });
  document.addEventListener('pointerdown', (e) => { if (pinned && !fig.contains(e.target)) { pinned = null; set(null); } });
  armOn(fig, 'hotspots');
}
