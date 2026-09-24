// Case 04 · Exhibit 2: the pivot. Wide screens keep both ideas side by side (that is the story) and scroll moves the
// emphasis from the first idea to the one we pitched (.is-b on the stage; the first idea's drawing greys out), and back
// on the way up. Narrower screens show one card that turns over (--rot, CSS 3D). A click on the card, or the two buttons
// under it (keyboard), switch it by hand. The faces stay plain content, so screen readers read both. Finished picture
// (JS off, reduced motion): both cards side by side.
import { arm, track, armOn, armOff } from '../../kit/util.js';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function init(el, ctx) {
  const card = el.querySelector('.cr-pv__card');
  if (!card) return;
  let disarm = null;
  const start = () => {
    disarm = arm(el, () => {
      armOn(el, 'cr-flip');
      const bar = document.createElement('div');
      bar.className = 'cr-pv__dots';
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', 'Show a side of the card');
      bar.innerHTML = '<button type="button" aria-pressed="true">First idea</button><button type="button" aria-pressed="false">The idea we pitched</button>';
      el.appendChild(bar);
      const [ba, bb] = bar.children;
      let manual = null;
      let rot = -1;
      let timer = 0;
      const set = (r) => {
        if (Math.abs(r - rot) < 0.05) return;
        rot = r;
        card.style.setProperty('--rot', `${r.toFixed(2)}deg`);
        const back = r > 90;
        el.classList.toggle('is-b', back);
        ba.setAttribute('aria-pressed', String(!back));
        bb.setAttribute('aria-pressed', String(back));
      };
      const stop = track(el, (p) => { if (manual === null) set(180 * ss(0.3, 0.56, p)); }, { start: 0.9, end: 0.5, name: 'cr-flip' });
      const turn = (to) => {
        manual = to;
        card.classList.add('is-tween');
        set(to);
        clearTimeout(timer);
        timer = setTimeout(() => card.classList.remove('is-tween'), 750);
      };
      const flip = () => turn(rot > 90 ? 0 : 180);
      card.addEventListener('click', flip);
      ba.addEventListener('click', () => turn(0));
      bb.addEventListener('click', () => turn(180));
      return () => {
        stop();
        clearTimeout(timer);
        card.removeEventListener('click', flip);
        card.classList.remove('is-tween');
        card.style.removeProperty('--rot');
        el.classList.remove('is-b');
        bar.remove();
        armOff(el, 'cr-flip');
      };
    });
  };
  if (ctx.motion) start();
  return { motion(on) { disarm?.(); disarm = null; if (on) start(); } };
}
