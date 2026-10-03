// Case 01 · Exhibit 3 (the signature picture): the process I mapped, as a funnel.
// The HTML is the finished picture: each step carries its tally of example rows (6 found → 4 pass the rules, 2 there
// on purpose → 3 ticked by a person → 3 draft notes). With motion allowed, and only while the picture is off screen
// (arm), the tallies start empty; as the picture scrolls up the screen the rows travel from step to step: each tally's
// rows fly out of the step before (with a small hop) and settle, the filtered-out rows drop, the reviewed rows get
// their tick. The board itself stays flat and still (nobody reads text at an angle). Everything depends only
// on scroll position, so scrolling up plays it backwards, and it is finished once the picture is in view (its top at
// 30 % of the screen at the latest: kit/util.js span). No gsap, no library: kit/util track().
import { arm, track, armOn, armOff, clamp } from '../../kit/util.js';

const smooth = (t) => t * t * (3 - 2 * t);
// which row of the step before each row of a tally comes from
const FROM = [null, [0, 1, 2, 3, 4, 5], [2, 3, 4, 5], [1, 2, 3]];

export function init(el, ctx) {
  const board = el.querySelector('.sc-steps');
  const steps = [...el.querySelectorAll('.sc-step')];
  if (!board || steps.length !== 4) return;
  const stops = steps.map((s) => s.querySelector('.sc-stop'));
  const tallies = steps.map((s) => [...s.querySelectorAll('.sc-tk')]);
  if (tallies.some((t, k) => k && t.length !== FROM[k].length) || tallies[0].length < 6) return;
  const wideQ = matchMedia('(min-width: 961px)');
  // layout position inside the board
  const pos = (n) => {
    let x = 0, y = 0, m = n;
    while (m && m !== board) { x += m.offsetLeft; y += m.offsetTop; m = m.offsetParent; }
    return { x, y };
  };
  let disarm = null;

  const start = () => {
    disarm = arm(el, () => {
      armOn(el, 'sc-funnel');
      let p = 0, geo = [];
      const all = tallies.flat();

      const paint = () => {
        const wide = wideQ.matches;
        // f runs −0.3 → 3: the first tally pops in, then three hops, one per step; done at p = 0.92
        const f = clamp((p - 0.02) / 0.9) * 3.3 - 0.3;
        tallies.forEach((tk, k) => tk.forEach((t, i) => {
          let o = 1, x = 0, y = 0, sc = 1, fly = false;
          if (!k) {
            const e = smooth(clamp((f + 0.3 - i * 0.03) / 0.2));
            o = e;
            sc = 0.6 + 0.4 * e;
          } else {
            const e = smooth(clamp((f - (k - 1) - 0.1 - i * 0.06) / 0.6));
            const g = geo[k]?.[i] || { dx: 0, dy: 0 };
            const hop = Math.sin(Math.PI * e) * (wide ? 30 : 14);
            x = g.dx * (1 - e);
            y = g.dy * (1 - e) - hop;
            o = e > 0 ? 1 : 0;
            fly = e > 0 && e < 1;
          }
          t.style.opacity = o < 1 ? o.toFixed(3) : '';
          t.style.transform = x || y || sc !== 1 ? `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${sc.toFixed(3)})` : '';
          t.classList.toggle('is-fly', fly);
        }));
        stops.forEach((s, k) => s.classList.toggle('is-reached', f >= (k ? k - 0.5 : -0.25)));
        board.style.setProperty('--fp', clamp(f / 3).toFixed(3));
      };
      // how far each row flies: from its row in the step before to its own place (board layout px)
      const measure = () => {
        geo = tallies.map((tk, k) => tk.map((t, i) => {
          if (!k) return { dx: 0, dy: 0 };
          const a = pos(tallies[k - 1][FROM[k][i]]), b = pos(t);
          return { dx: a.x - b.x, dy: a.y - b.y };
        }));
        paint();
      };
      const ro = new ResizeObserver(measure);
      ro.observe(board);
      measure();
      const stopTrack = track(el, (v) => { p = v; paint(); }, { start: 0.95, name: 'sc-funnel' });
      wideQ.addEventListener('change', measure);

      return () => {
        stopTrack();
        ro.disconnect();
        wideQ.removeEventListener('change', measure);
        all.forEach((t) => { t.style.opacity = ''; t.style.transform = ''; t.classList.remove('is-fly'); });
        stops.forEach((s) => s.classList.remove('is-reached'));
        board.style.removeProperty('--fp');
        armOff(el, 'sc-funnel');
      };
    });
  };

  if (ctx.motion) start();
  return {
    motion(on) {
      disarm?.();
      disarm = null;
      if (on) start();
    },
  };
}
