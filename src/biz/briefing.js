// Main edition: "The Briefing", story template v3. The page script for every page built
// on it (/cases/<slug>/ as they are rebuilt, /projects/<slug>/), loaded before the page's own script. Styles come from
// the <link> to briefing.css in the page head, so the page is complete with JS off. Everything here is an enhancement:
//   · the shared page bits: header, project chips, footer switches, and the interaction kit (kit/boot.js loads each
//     piece lazily, after first paint, when its picture nears the viewport)
//   · "You are here": which numbered band (.bp) is being read, and how far → the "In this project" card (current
//     item + fill), a part line along the bottom of the header (wide screens) and a slim bar under the header
//     (tablets and phones). Both are built here, fixed or absolutely placed, so nothing on the page moves.
//   · "Open all details", and a re-measure of the scroll-driven pictures when a detail row opens or closes.
import { enableSmoothScroll, initColour, initMotionToggle, initHeader } from './prefs.js';
import { boot, setMotion } from './kit/boot.js';
import { clamp } from './kit/util.js';

const $$ = (s, r = document) => [...r.querySelectorAll(s)];

initHeader();
chipsIntoView();
enableSmoothScroll();
initColour();
boot();
initMotionToggle((off) => setMotion(!off));
youAreHere();
detailRows();

// phones: the project chips scroll sideways; bring the current one into view (sideways only, no vertical jump)
function chipsIntoView() {
  const cb = document.querySelector('.cbar__chips');
  const cur = cb?.querySelector('[aria-current="page"]');
  if (!cb || !cur || cb.scrollWidth <= cb.clientWidth + 1) return;
  const off = cur.getBoundingClientRect().left - cb.getBoundingClientRect().left;
  if (off + cur.offsetWidth > cb.clientWidth - 8 || off < 0) cb.scrollLeft += off - 16;
}

function youAreHere() {
  const bands = $$('.bp');
  if (!bands.length) return;
  const pad = (i) => String(i + 1).padStart(2, '0');
  const total = pad(bands.length - 1);
  // the band's name = the text of its kicker, without the screen-reader "Part 1 of 5:" prefix
  const names = bands.map((b) => {
    const k = b.querySelector('.bp__k');
    return k ? [...k.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim() : '';
  });
  const seg = (extra = '') => {
    const s = document.createElement('div');
    s.className = `bq-seg${extra}`;
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<i></i>'.repeat(bands.length);
    return s;
  };

  document.querySelector('header.top')?.appendChild(seg(' bq-seg--head'));
  const pill = document.createElement('div');
  pill.className = 'bq-pill';
  pill.setAttribute('aria-hidden', 'true');
  pill.innerHTML = `<div class="wrap bq-pill__row"><span class="bq-pill__n"><b>01</b><span>/ ${total}</span></span><span class="bq-pill__t"></span></div>`;
  pill.firstChild.appendChild(seg());
  (document.querySelector('header.top') || document.body.firstChild)?.after(pill);

  const toc = $$('.bq-toc a');
  const segs = $$('.bq-seg').map((s) => [...s.children]);
  const pn = pill.querySelector('.bq-pill__n b');
  const pt = pill.querySelector('.bq-pill__t');
  let last = null;
  let ticking = false;

  const update = () => {
    ticking = false;
    const vh = innerHeight;
    const line = vh * 0.38; // a band counts as "being read" once its top passes 38 % of the screen
    const atEnd = scrollY >= document.documentElement.scrollHeight - vh - 2;
    const rects = bands.map((b) => b.getBoundingClientRect());
    let cur = -1;
    rects.forEach((r, i) => { if (r.top <= line) cur = i; });
    // at the very end of the page, the last band on screen counts as reached, and every band on screen as read
    if (atEnd) rects.forEach((r, i) => { if (r.top < vh) cur = Math.max(cur, i); });
    rects.forEach((r, i) => {
      const p = atEnd && r.top < vh ? 1 : clamp((line - r.top) / Math.max(1, r.height));
      toc[i]?.style.setProperty('--p', p.toFixed(3));
      segs.forEach((s) => s[i]?.style.setProperty('--p', p.toFixed(3)));
    });
    pill.classList.toggle('is-on', cur >= 0 && rects[rects.length - 1].bottom > vh * 0.25);
    if (cur === last) return;
    last = cur;
    toc.forEach((a, i) => (i === cur ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    if (cur >= 0) {
      pn.textContent = pad(cur);
      pt.textContent = names[cur];
    }
  };
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick, { passive: true });
  document.addEventListener('kit:layout', kick);
  update();
}

// detail rows (<details class="bp__more">): "Open all details" in the card, and after a row opens or closes the
// scroll-driven pictures below it re-measure (kit:layout; again once the open animation has finished)
function detailRows() {
  const all = $$('.bp__more');
  if (!all.length) return;
  const btn = document.querySelector('.bq-openall');
  const label = btn?.querySelector('.bq-openall__l');
  const sync = () => {
    if (!btn) return;
    const open = all.every((d) => d.open);
    btn.setAttribute('aria-pressed', String(open));
    if (label) label.textContent = open ? 'Close all details' : 'Open all details';
  };
  let t = 0;
  const layout = () => {
    document.dispatchEvent(new Event('kit:layout'));
    clearTimeout(t);
    t = setTimeout(() => document.dispatchEvent(new Event('kit:layout')), 520);
  };
  all.forEach((d) => d.addEventListener('toggle', () => { sync(); layout(); }));
  btn?.addEventListener('click', () => {
    const open = !all.every((d) => d.open);
    all.forEach((d) => { d.open = open; });
  });
  sync();
}
