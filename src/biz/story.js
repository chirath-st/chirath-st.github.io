// Main (light) edition: case (story) pages, template v2. Styles come from <link>s in the page head
// (story-page.css + the case's own CSS), so the page is complete with JS off. Everything here is an enhancement:
// header progress line, footer switches, and the interaction kit (kit/boot.js), which loads each piece lazily
// after first paint, when its picture nears the viewport.
import { enableSmoothScroll, initColour, initMotionToggle, initHeader } from './prefs.js';
import { boot, setMotion } from './kit/boot.js';

initHeader();
// phones: the case chips scroll sideways; bring the current case's chip into view (sideways only, no vertical jump)
{
  const cb = document.querySelector('.cbar__chips');
  const cur = cb?.querySelector('[aria-current="page"]');
  if (cb && cur && cb.scrollWidth > cb.clientWidth + 1) {
    const off = cur.getBoundingClientRect().left - cb.getBoundingClientRect().left;
    if (off + cur.offsetWidth > cb.clientWidth - 8 || off < 0) cb.scrollLeft += off - 16;
  }
}
enableSmoothScroll();
initColour();
boot();
initMotionToggle((off) => setMotion(!off));
