// Main (light) edition: case pages and the 404. Styles, header progress and the footer switches; no motion code.
import '../styles/biz/tokens.css';
import '../styles/biz/base.css';
import '../styles/biz/components.css';
import '../styles/biz/case.css';

import { enableSmoothScroll, initColour, initMotionToggle, initHeader } from './prefs.js';

initHeader();
enableSmoothScroll();
initColour();
initMotionToggle();
