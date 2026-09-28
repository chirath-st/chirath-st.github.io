// Main (light) edition, home page. Styles come from the <link> in index.html's <head>, so the page is complete with
// JS off. Everything here is an enhancement: header progress line, footer switches (Navy · Blue, "Turn off
// animation") and the casebook, timeline and small pointer touches (casebook.js). No gsap on the home page.
import { enableSmoothScroll, initColour, initMotionToggle, initHeader } from './prefs.js';
import { initHome } from './casebook.js';

initHeader();
enableSmoothScroll();
initColour();
const home = initHome();
initMotionToggle(() => home.refresh());
