// Smooth scroll (Lenis) + once-only section reveals (GSAP ScrollTrigger).
// The logo marquee and the live dots are pure CSS; nothing here is required to read the page.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export function initMotion() {
  const lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    anchors: true, // Lenis subtracts each target's scroll-margin-top itself
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll('[data-reveal]').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => el.classList.add('is-in'),
    });
  });

  if (import.meta.env.DEV) window.__motion = { lenis, gsap, ScrollTrigger };
  return { lenis, gsap, ScrollTrigger };
}
