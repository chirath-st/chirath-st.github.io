// Helpers shared by the home page motion (motion.js) and the case-page motion (story-motion.js).
// Only imported from those two dynamically loaded modules, so gsap never ships in a page's first load.
import gsap from 'gsap';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const onScreen = (el) => {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
};

// Build now if the element is off screen; otherwise leave it finished and build once it has fully left the viewport
// (annex §4.4: nothing on screen jumps backwards when the motion code arrives).
export function arm(el, build) {
  if (!onScreen(el)) return build();
  let cleanup = null;
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) return;
    io.disconnect();
    cleanup = build();
  });
  io.observe(el);
  return () => { io.disconnect(); cleanup?.(); };
}

// Three phases, each exactly 1 unit long, so they line up with the three story steps.
export function phased(...builders) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
  builders.forEach((b, i) => b(tl, i));
  tl.set({}, {}, builders.length);
  return tl;
}
