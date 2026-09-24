// Kit · scrub: a picture that builds step by step as it scrolls up the screen, and takes itself apart, exactly in
// reverse, on the way back up (gsap ScrollTrigger with scrub; the picture depends only on scroll position).
//   <div data-kit="scrub" [data-start="top 92%"] [data-end="top 60%"]>
// It is finished as soon as its exhibit (the <figure> around it, title included) is fully in view, and never later than
// the exhibit's top at 30 % of the viewport (or its centre at the viewport centre, when it is taller than the
// viewport): see span() and timingBox() in util.js. data-start ("top N%") moves
// the start; data-end ("top N%", 30–60) the earliest finish.
//     parts: data-step="1".."n"  [data-fx="up|fade|left|right|pop|draw|grow|growy"]  (draw: an SVG path with pathLength="1")
// Each step is one time unit: the change takes 0.55 of it and the rest is a hold, so a reader who stops mid-scroll
// usually sees a finished step. The element gets data-scrub-at="k" (steps finished) for CSS extras.
// Case scenes build their own timeline with the same driver:  scrubbed(el, ctx, (tl, gsap) => steps, opts)
// JS off / reduced motion / "Turn off animation": nothing runs, the HTML is the finished picture.
import { $$, arm, armOn, armOff, span, qaRegister, timingBox } from './util.js';

// "top 80%" → 0.8 (other forms, like "bottom 60%" from the first version, fall back to the default)
const topPct = (v) => { const m = /^\s*top\s+([\d.]+)%\s*$/.exec(v || ''); return m ? +m[1] / 100 : undefined; };

const FX = {
  up: [{ opacity: 0, y: 14 }, { opacity: 1, y: 0 }],
  fade: [{ opacity: 0 }, { opacity: 1 }],
  left: [{ opacity: 0, x: -20 }, { opacity: 1, x: 0 }],
  right: [{ opacity: 0, x: 20 }, { opacity: 1, x: 0 }],
  pop: [{ opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, ease: 'back.out(2)' }],
  draw: [{ strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDasharray: 1, strokeDashoffset: 0, ease: 'none' }],
  grow: [{ scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1 }],
  growy: [{ scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1 }],
};

export async function scrubbed(el, ctx, build, opts = {}) {
  const { motionLib } = await import('../story-motion.js');
  const { gsap, ScrollTrigger } = motionLib();
  let disarm = null;
  const start = () => {
    disarm = arm(el, () => {
      armOn(el, 'scrub');
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out', duration: 0.55 } });
      const steps = build(tl, gsap) || 0;
      tl.set({}, {}, Math.max(steps, tl.duration()));
      const startF = topPct(opts.start || el.dataset.start) ?? 0.92;
      const endF = topPct(opts.end || el.dataset.end) ?? 0.6;
      const box = timingBox(el); // timed against the whole exhibit, title included (util.js)
      const at = (i) => () => {
        const r = box.getBoundingClientRect();
        return r.top + scrollY - span(r, innerHeight, startF, endF)[i];
      };
      const st = ScrollTrigger.create({
        trigger: box,
        start: at(0),
        end: at(1),
        invalidateOnRefresh: true,
        scrub: opts.scrub ?? 0.5,
        animation: tl,
        onUpdate: () => { el.dataset.scrubAt = String(Math.floor(tl.time() + 0.0001)); opts.onUpdate?.(tl); },
      });
      const unQA = qaRegister({ el, name: opts.name || el.dataset.kit, kind: 'scroll', st, progress: () => tl.progress() });
      return () => {
        unQA();
        st.kill();
        tl.revert();
        armOff(el, 'scrub');
        delete el.dataset.scrubAt;
        opts.onRevert?.();
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

export function init(el, ctx) {
  return scrubbed(el, ctx, (tl) => {
    const byStep = new Map();
    $$('[data-step]', el).forEach((p) => {
      const k = +p.dataset.step || 1;
      if (!byStep.has(k)) byStep.set(k, []);
      byStep.get(k).push(p);
    });
    let last = 0;
    byStep.forEach((parts, k) => {
      last = Math.max(last, k);
      parts.forEach((p, i) => {
        const [from, to] = FX[p.dataset.fx] || FX.up;
        tl.fromTo(p, from, { ...to }, k - 1 + i * 0.08);
      });
    });
    return last;
  });
}
