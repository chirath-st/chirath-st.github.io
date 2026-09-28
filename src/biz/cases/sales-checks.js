// Project 01 (/cases/sales-checks/) only, loaded after the template script (briefing.js). Registers the case-only
// piece; it loads lazily, after first paint, when its picture nears the viewport (kit/boot.js):
//   sc-funnel · Exhibit 2 (band 02), the signature: the process as a funnel. On a flat board, six example rows travel
//               through the four steps with scroll (and back on the way up), finished while the picture is well in view.
import { register } from '../kit/boot.js';

register('sc-funnel', () => import('./sales-checks/funnel.js'));
