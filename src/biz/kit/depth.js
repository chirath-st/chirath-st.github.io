// Kit · depth: an object that turns a little towards the pointer, as if it had depth (CSS 3D).
// 3D only with a purpose (Chirath, Sep 24): nobody reads text at an angle, so diagrams stay flat and still. Only an
// object that is itself a 3D thing opts in with data-tilt: today the phone in Case 04 (Exhibit 6). Never photos.
//   <div class="…" data-kit="depth" data-tilt> … layers with data-depth="0.2".."1" (1 = nearest) … </div>
// Without data-tilt the piece does nothing (older pages still carry data-kit="depth" on diagrams).
// Fine pointer + motion only; it eases back flat when the pointer leaves. The layers move with the CSS
// `translate` property and the frame with `transform`, so a scrub build on the same layers never clashes.
import { $$, armOn, armOff } from './util.js';

export function init(el, ctx) {
  if (!el.hasAttribute('data-tilt')) return;
  const layers = $$('[data-depth]', el);
  layers.forEach((l) => l.style.setProperty('--d', l.dataset.depth));
  let on = false, raf = 0, tx = 0, ty = 0, x = 0, y = 0;
  const frame = () => {
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    if (Math.abs(tx - x) < 0.001 && Math.abs(ty - y) < 0.001) { x = tx; y = ty; raf = 0; }
    el.style.setProperty('--px', x.toFixed(4));
    el.style.setProperty('--py', y.toFixed(4));
    el.style.transform = x || y ? `perspective(1100px) rotateX(${(-y * 3).toFixed(3)}deg) rotateY(${(x * 4).toFixed(3)}deg)` : '';
    if (raf) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const move = (e) => {
    if (!on || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    kick();
  };
  const leave = () => { tx = ty = 0; kick(); };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  const set = (m) => {
    on = m && ctx.fine;
    if (on) armOn(el, 'depth'); else armOff(el, 'depth');
    if (!on) { tx = ty = 0; x = y = 0; el.style.transform = ''; el.style.removeProperty('--px'); el.style.removeProperty('--py'); }
  };
  set(ctx.motion);
  return { motion: set };
}
