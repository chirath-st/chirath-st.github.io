// Main (light) edition, home page. Everything here is an enhancement: the page reads fine with JS off.
// No static gsap import here, so the motion chunk is never preloaded; it arrives after load, when the browser is idle.
import '../styles/biz/tokens.css';
import '../styles/biz/base.css';
import '../styles/biz/components.css';
import '../styles/biz/home-exhibits.css';
import '../styles/biz/home.css';

import { enableSmoothScroll, initColour, initMotionToggle, initHeader, motionAllowed } from './prefs.js';
import { initNotes, initTapSource } from './exhibits.js';

initHeader();
enableSmoothScroll();
initColour();
initNotes();
initTapSource();

let motion = null;
let loading = false;
function loadMotion() {
  if (motion || loading || !motionAllowed()) return;
  loading = true;
  import('./motion.js')
    .then((m) => { if (motionAllowed()) motion = m.start(); })
    .catch(() => { /* motion is optional */ })
    .finally(() => { loading = false; });
}
const whenIdle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300));
if (document.readyState === 'complete') whenIdle(loadMotion);
else addEventListener('load', () => whenIdle(loadMotion), { once: true });

initMotionToggle((off) => {
  if (off) { motion?.stop(); motion = null; }
  else loadMotion();
});
