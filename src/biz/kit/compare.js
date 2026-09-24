// Kit · compare: a before/after slider you drag (or move with the arrow keys).
//   <figure class="k-cmp" data-kit="compare">
//     <div class="k-cmp__stage">
//       <div class="k-cmp__pane k-cmp__pane--before"><span class="k-cmp__tag">Before</span> … </div>
//       <div class="k-cmp__pane k-cmp__pane--after"><span class="k-cmp__tag">Now</span> … </div>
//     </div>
// JS off: the two panes sit side by side (stacked on phones). With JS the layout is the slider from first paint
// (html.js in kit.css, so nothing shifts when this code arrives); this adds the handle and dragging. A short hint
// sweep (1.2 s) plays as the handle comes up past 85 % of the screen, and again after it has gone back below that
// line, until the reader moves the slider (motion only). Reduced motion: the slider works, no sweep.
import { clamp, armOn, arrive, qaRegister } from './util.js';

export function init(fig, ctx) {
  const stage = fig.querySelector('.k-cmp__stage');
  if (!stage) return;
  const before = fig.querySelector('.k-cmp__pane--before .k-cmp__tag')?.textContent.trim() || 'Before';
  const after = fig.querySelector('.k-cmp__pane--after .k-cmp__tag')?.textContent.trim() || 'After';
  const handle = document.createElement('div');
  handle.className = 'k-cmp__handle';
  handle.tabIndex = 0;
  handle.setAttribute('role', 'slider');
  handle.setAttribute('aria-label', `Compare: ${before} on the left, ${after} on the right`);
  handle.setAttribute('aria-valuemin', '0');
  handle.setAttribute('aria-valuemax', '100');
  handle.innerHTML = '<span class="k-cmp__grip" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5M15 7l5 5-5 5"/></svg></span>';
  stage.appendChild(handle);
  armOn(fig, 'compare');

  let x = 50, touched = false, anim = 0;
  const set = (v) => {
    x = clamp(v, 0, 100);
    stage.style.setProperty('--x', `${x}%`);
    handle.setAttribute('aria-valuenow', String(Math.round(x)));
    handle.setAttribute('aria-valuetext', `${Math.round(x)}% ${before}, ${100 - Math.round(x)}% ${after}`);
  };
  const fromPointer = (e) => {
    const r = stage.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  };
  const grab = () => { touched = true; cancelAnimationFrame(anim); fig.classList.add('is-used'); };
  set(50);

  let dragging = false;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    grab();
    dragging = true;
    stage.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  stage.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
  const end = (e) => { dragging = false; try { stage.releasePointerCapture(e.pointerId); } catch { /* not captured */ } };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  handle.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -25, PageUp: 25 }[e.key];
    if (step != null) { e.preventDefault(); grab(); set(x + step); }
    else if (e.key === 'Home') { e.preventDefault(); grab(); set(0); }
    else if (e.key === 'End') { e.preventDefault(); grab(); set(100); }
  });

  // a short sweep as the handle arrives, to show that it moves (armed once; "Turn off animation" pauses it)
  let allowed = ctx.motion, wired = false;
  const wire = () => {
    wired = true;
    const keys = [[0, 50], [0.35, 74], [0.75, 28], [1, 50]];
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    let swept = false, sweeping = false;
    arrive(handle.querySelector('.k-cmp__grip') || stage, (where) => {
      if (touched || !allowed) return;
      if (where === 'out') { cancelAnimationFrame(anim); sweeping = false; swept = false; set(50); return; }
      if (swept) return;
      swept = sweeping = true;
      const t0 = performance.now(), dur = 1200;
      const frame = (now) => {
        if (touched) { sweeping = false; return; }
        const t = Math.min(1, (now - t0) / dur);
        let k = 1;
        while (k < keys.length - 1 && keys[k][0] < t) k++;
        const [ta, va] = keys[k - 1], [tb, vb] = keys[k];
        set(va + (vb - va) * ease(clamp((t - ta) / (tb - ta))));
        if (t < 1) anim = requestAnimationFrame(frame); else sweeping = false;
      };
      anim = requestAnimationFrame(frame);
    });
    qaRegister({ el: handle.querySelector('.k-cmp__grip') || stage, name: 'compare sweep', kind: 'timed', budget: 1400, done: () => touched || !allowed || (swept && !sweeping) });
  };
  if (allowed) wire();
  return {
    motion(on) {
      allowed = on;
      if (on && !wired) wire();
      if (!on && !touched) { cancelAnimationFrame(anim); set(50); }
    },
  };
}
