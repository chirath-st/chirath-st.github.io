// Story pages + 404: shared styles, smooth scroll and reveals.
import './styles/shared.css';
import './styles/pages/story.css';
import { initMotion } from './lib/motion.js';
import { initCopy } from './lib/copy.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
initCopy();
if (!reduced) initMotion();
else document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
