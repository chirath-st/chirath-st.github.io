// Story pages + 404: shared styles, smooth scroll and reveals. No status fetch unless the page has status hooks.
import './styles/shared.css';
import './styles/pages/story.css';
import { initMotion } from './lib/motion.js';
import { initStatus } from './lib/status.js';
import { initCopy } from './lib/copy.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
initStatus(document.querySelector('[data-status-list]'));
initCopy();
if (!reduced) initMotion();
else document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
