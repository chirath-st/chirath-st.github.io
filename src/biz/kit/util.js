// Story-page kit: tiny helpers shared by the pieces. No gsap here, so gsap-free pieces stay small.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const onScreen = (el) => {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
};
export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
export const wide = () => matchMedia('(min-width: 961px)').matches;

// Take over an element's visible state only while it is off screen, so nothing the reader is looking at jumps
// backwards when the code arrives (annex §4.4). Returns a cleanup function.
export function arm(el, build) {
  if (!onScreen(el)) return build() || (() => {});
  let cleanup = null;
  let done = false;
  const io = new IntersectionObserver(([e]) => {
    if (done || e.isIntersecting) return;
    done = true;
    io.disconnect();
    cleanup = build();
  });
  io.observe(el);
  return () => { done = true; io.disconnect(); cleanup?.(); };
}

// QA hook (scripts/story-qa.mjs, "late animations"): with ?qa=1 in the address, or under browser automation, every
// scroll- or time-driven piece lists itself on window.__qaAnims, so the check can scroll to where the piece must be
// finished and read its progress. Never used by the page itself.
export const QA = (() => {
  try { return /[?&]qa=1\b/.test(location.search) || navigator.webdriver === true; } catch { return false; }
})();
export function qaRegister(entry) {
  if (!QA) return () => {};
  const list = (window.__qaAnims ||= []);
  list.push(entry);
  return () => { const i = list.indexOf(entry); if (i >= 0) list.splice(i, 1); };
}

// When a scroll-driven piece is finished (Chirath, Sep 24: "you scroll past it before it completes"): as soon as the
// whole element is in view (top at `end` × viewport at the earliest; default 60 %), and never later than its top at
// 30 % of the viewport, or, for an element taller than the viewport, its centre at the viewport centre. Never later
// than the page can scroll to. It starts when its top reaches start × viewport (0.7–1), 0.45 × viewport of scrolling
// before the finish where that fits, but never below the screen's bottom edge (out of sight, a picture is always
// fully back at its start). r = the element's getBoundingClientRect().
// Returns [startTop, finishTop]: the element's top, in px from the viewport top, at the start and at the finish.
export function span(r, vh, start = 0.92, end = 0.6) {
  const h = r.height;
  let fin = h <= vh ? clamp(vh - h - 0.06 * vh, 0.3 * vh, clamp(end || 0.6, 0.3, 0.6) * vh) : (vh - h) / 2;
  fin += 8; // a little early, never exactly on the line
  const st = Math.min(vh, Math.max(clamp(start || 0.92, 0.7, 1) * vh, fin + 0.45 * vh));
  const maxScroll = document.documentElement.scrollHeight - vh;
  fin = Math.max(fin, r.top + scrollY - maxScroll + 4); // near the page end: finish where the page stops
  return [Math.max(st, fin + 1), fin];
}

// What a scroll-driven piece is timed against: its whole exhibit (the <figure>, title included), so the picture is
// finished by the time the exhibit's title reaches 30 % of the screen, not only its inner drawing (design review,
// Sep 24). Pieces outside a figure use their own box.
export const timingBox = (el) => el.closest('figure') || el;

// Scroll progress of an element without gsap: 0 when its exhibit's top (timingBox) reaches the start line, 1 when it
// must be finished (see span). Only listens while the element is near the viewport; eases towards the target so a scrubbed picture glides,
// and depends only on scroll position, so scrolling up plays it backwards.
//   opts: start (top at start × viewport), end (top at end × viewport: the earliest finish), ease, name (QA list)
export function track(el, cb, { start = 0.92, end = 0.6, ease = 0.2, name } = {}) {
  let target = 0, value = -1, raf = 0, on = false;
  const box = timingBox(el);
  const measure = () => {
    const r = box.getBoundingClientRect();
    const [a, b] = span(r, innerHeight, start, end);
    target = clamp((a - r.top) / Math.max(1, a - b));
  };
  const tick = () => {
    raf = 0;
    const next = value < 0 ? target : value + (target - value) * ease;
    value = Math.abs(target - next) < 0.001 ? target : next;
    cb(value);
    if (value !== target) raf = requestAnimationFrame(tick);
  };
  const kick = () => { measure(); if (!raf) raf = requestAnimationFrame(tick); };
  const io = new IntersectionObserver(([e]) => {
    on = e.isIntersecting;
    kick();
  }, { rootMargin: '50% 0px' });
  const onScroll = () => { if (on) kick(); };
  io.observe(el);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', kick, { passive: true });
  kick();
  const unQA = qaRegister({ el, name: name || el.dataset.kit || el.className, kind: 'scroll', progress: () => (value < 0 ? target : value) });
  return () => {
    io.disconnect();
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', kick);
    cancelAnimationFrame(raf);
    unQA();
  };
}

// A time-based (play-once) moment: cb('in') when the element's top comes up past `at` × viewport (default 85 %, so
// it plays early, while the reader scrolls towards it), cb('out') when it goes back down below that line.
// Returns a cleanup function.
export function arrive(el, cb, { at = 0.85 } = {}) {
  let inside = null;
  const io = new IntersectionObserver(([e]) => {
    const now = e.isIntersecting || e.boundingClientRect.top < 0;
    if (now === inside) return;
    inside = now;
    cb(now ? 'in' : 'out');
  }, { rootMargin: `0px 0px ${-Math.round((1 - at) * 100)}% 0px` });
  io.observe(el);
  return () => io.disconnect();
}

// data-armed holds the names of the pieces that control an element right now ("flow", "chat" …), so CSS can
// style an unbuilt state per piece: [data-armed~="flow"]. JS off / reduced motion: never set.
export function armOn(el, name) {
  const t = new Set((el.dataset.armed || '').split(' ').filter(Boolean));
  t.add(name);
  el.dataset.armed = [...t].join(' ');
}
export function armOff(el, name) {
  const t = new Set((el.dataset.armed || '').split(' ').filter(Boolean));
  t.delete(name);
  if (t.size) el.dataset.armed = [...t].join(' ');
  else delete el.dataset.armed;
}

// Pieces that change their own height call this, so scroll-driven pieces below re-measure.
export const layoutChanged = () => document.dispatchEvent(new Event('kit:layout'));

// A polite live region inside a piece (created once) for screen-reader announcements.
export function announcer(el) {
  let n = el.querySelector('[data-kit-live]');
  if (!n) {
    n = document.createElement('p');
    n.className = 'sr';
    n.setAttribute('aria-live', 'polite');
    n.dataset.kitLive = '';
    el.appendChild(n);
  }
  return (text) => { n.textContent = text; };
}
