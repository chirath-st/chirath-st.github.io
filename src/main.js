// Entry point. Everything here is an enhancement: the page reads fine with JS off.
// Fonts are self-hosted in public/fonts and declared in shared.css.
import './styles/shared.css';
import './styles/pages/home.css';

import { initMotion } from './lib/motion.js';
import { initStatus } from './lib/status.js';
import { initCopy } from './lib/copy.js';
import { initSectionNav } from './lib/sectionNav.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

initStatus(document.querySelector('[data-status-list]'));
initCopy();
initSectionNav();
if (!reduced) initMotion();
else document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
