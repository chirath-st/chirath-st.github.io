// The gsap layer for the case (story) pages: gsap + ScrollTrigger, registered once. Imported only by kit pieces
// that scrub a timeline with scroll (kit/scrub.js and case scenes built on it), and only when motion is allowed,
// so gsap never ships in a case page's first load. Keeps ScrollTrigger measured when fonts or pieces change the layout.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { QA } from './kit/util.js';

gsap.registerPlugin(ScrollTrigger);
if (QA) window.__st = ScrollTrigger; // scripts/story-qa.mjs ("late animations") reads the triggers

let wired = false;
let timer = 0;
// Re-measure only once scrolling has stopped: ScrollTrigger.refresh() jumps to the top and back to measure, which
// would cancel a smooth scroll in progress (an in-page link, like Case 03's "Also at BuzzeBees" pointer, would stop short).
let lastY = -1;
const refresh = () => {
  clearTimeout(timer);
  timer = setTimeout(function go() {
    if (Math.abs(scrollY - lastY) > 1) { lastY = scrollY; timer = setTimeout(go, 150); return; }
    ScrollTrigger.refresh();
  }, 120);
};

export function motionLib() {
  if (!wired) {
    wired = true;
    document.fonts?.ready.then(refresh);
    document.fonts?.addEventListener?.('loadingdone', refresh);
    document.addEventListener('kit:layout', refresh);
    if (document.readyState !== 'complete') addEventListener('load', refresh, { once: true });
  }
  return { gsap, ScrollTrigger };
}
