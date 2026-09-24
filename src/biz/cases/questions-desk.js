// Case page script for /cases/questions-desk/ only (loaded after story.js). Registers the three case-only pieces;
// each loads lazily, after first paint, when its picture nears the viewport (kit/boot.js):
//   qd-scene  · Exhibit 2, the signature: one channel, three lanes; on the flat diagram three questions travel with scroll
//   qd-flip   · Exhibit 5: the three bots as cards that flip (job ↔ why this bot)
//   qd-whatif · Exhibit 7: pick a case and its path through the guards lights up (follows scroll until picked)
import { register, focusEarly } from '../kit/boot.js';

register('qd-scene', () => import('./questions-desk/scene.js'));
register('qd-flip', () => import('./questions-desk/flip.js'));
register('qd-whatif', () => import('./questions-desk/whatif.js'));

// Keyboard: the what-if cases (Exhibit 7) join the tab order before their piece loads (the kit does the same for
// every page's hotspot parts, so Exhibit 3 is covered by kit/boot.js).
focusEarly('qd-whatif', '.qd-wi__list li[data-path]');
