// Kit · stepper: clickable steps or versions (v1 → final, topics, stages).
//   <div class="k-stp" data-kit="stepper" [data-auto]>
//     <div class="k-stp__nav"><button type="button">Label</button> … </div>      (hidden without JS)
//     <ol class="k-stp__panels"><li class="k-stp__panel [is-on]"><p class="k-stp__k">Label</p> … </li> … </ol>
// JS off: every panel is listed, one under the other. With JS (html.js in kit.css, from first paint) the panels
// share one place, so the height never changes, and the buttons pick one (arrow keys move between them).
// data-auto: with motion allowed, the step follows scroll position (and goes back on the way up) until the reader
// picks one; it reaches the last step by the time the picture is in view (kit/util.js span; data-start / data-end
// as in track()).
import { $$, track, arm, armOn } from './util.js';

let uid = 0;

export function init(el, ctx) {
  const tabs = $$('.k-stp__nav button', el);
  const panels = $$('.k-stp__panel', el);
  if (!tabs.length || tabs.length !== panels.length) return;
  const nav = el.querySelector('.k-stp__nav');
  nav.setAttribute('role', 'tablist');
  let cur = Math.max(0, panels.findIndex((p) => p.classList.contains('is-on')));
  let manual = false;

  tabs.forEach((t, i) => {
    const id = `k-stp-${++uid}`;
    t.id = `${id}-t`;
    panels[i].id = `${id}-p`;
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-controls', panels[i].id);
    panels[i].setAttribute('role', 'tabpanel');
    panels[i].setAttribute('aria-labelledby', t.id);
  });
  const select = (i, focus) => {
    cur = (i + tabs.length) % tabs.length;
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === cur));
      t.tabIndex = k === cur ? 0 : -1;
      t.classList.toggle('is-done', k < cur);
    });
    panels.forEach((p, k) => p.classList.toggle('is-on', k === cur));
    el.style.setProperty('--f', tabs.length > 1 ? (cur / (tabs.length - 1)).toFixed(3) : '1');
    el.dataset.stpAt = String(cur + 1);
    if (focus) tabs[cur].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { manual = true; select(i); });
    t.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (d) { e.preventDefault(); manual = true; select(cur + d, true); }
      if (e.key === 'Home') { e.preventDefault(); manual = true; select(0, true); }
      if (e.key === 'End') { e.preventDefault(); manual = true; select(tabs.length - 1, true); }
    });
  });
  select(cur);
  armOn(el, 'stepper');

  let stop = null;
  const auto = () => {
    if (!el.hasAttribute('data-auto')) return;
    stop = arm(el, () => track(el, (p) => {
      if (manual) return;
      const i = Math.min(tabs.length - 1, Math.floor(p * tabs.length * 0.999));
      if (i !== cur) select(i);
    }, { start: +el.dataset.start || 0.92, end: +el.dataset.end || 0.6, ease: 1, name: 'stepper' }));
  };
  if (ctx.motion) auto();
  return { motion(on) { stop?.(); stop = null; if (on) auto(); } };
}
