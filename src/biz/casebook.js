// Home page ("the casebook"). Everything here is an enhancement: with JS off all four projects
// are open, stacked, and the timeline is finished.
//  - Wide screens (≥ 1180 × 600): all four projects on one screen. Pointer, keyboard focus, a tap or the scroll wheel
//    opens a project; its row joins its panel in one tint and the panel's mini picture builds. With motion, the
//    casebook holds still for one screen while the scroll steps 01 → 04 (and back on the way up); the project shown
//    is always the one nearest the scroll position.
//  - Phones and tablets: a sticky 01–04 bar whose tinted marker slides to the project being read; each card's photo
//    settles as it arrives (scrubbed, so it reverses).
//  - Experience (wide screens): each lane's line draws in as the timeline arrives and each marker appears as its line
//    reaches it (scrubbed, finished while the timeline is still low on the screen).
// No gsap on the home page: CSS transitions, the Web Animations API and requestAnimationFrame do the motion.
// Reduced motion, Save-Data or "Turn off animation": finished pictures, instant swaps, no hold.
import { track, arm, clamp } from './kit/util.js';
import { motionAllowed } from './prefs.js';

const root = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const mqBook = matchMedia('(min-width: 1180px) and (min-height: 600px)');
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const mqFine = matchMedia('(hover: hover) and (pointer: fine)');
const mqWide = matchMedia('(min-width: 1024px)');
const headH = () => parseFloat(getComputedStyle(root).getPropertyValue('--head-h')) || 72;
const r1 = (n) => Math.round(n * 10) / 10;
const plainClick = (e) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

export function initHome() {
  const book = initCasebook();
  const tl = initTimeline();
  initMagnets();
  const refresh = () => { book?.setMode(); tl?.set(); };
  mqReduce.addEventListener('change', refresh);
  return { refresh };
}

/* ---------------- 02 · the route picture: wires and questions ----------------
   The wires are drawn from the boxes' real positions: each one starts and ends at the middle of a box's edge, so they
   stay joined at every width, after the fonts load and in either colour. One question (a dot) rides each wire: three
   leave Email, Slack and Teams together and reach the channel together, then three leave the channel together and
   reach the three lanes together, which light up as they arrive. */
function routeWires(mx) {
  const R = $('.mx-route', mx);
  const hub = $('.rt-hub span', R);
  const legs = [
    { svg: $('.rt-w--in', R), boxes: $$('.rt-in span', R), out: false },
    { svg: $('.rt-w--out', R), boxes: $$('.rt-lanes span', R), out: true },
  ].map((l) => ({ ...l, paths: $$('path', l.svg), dots: $$('circle', l.svg) }));
  const lanes = legs[1].boxes;

  // a box inside the picture, where it rests, measured from the picture's corner: its own slide is taken out (the
  // lanes come in from 8 px to the left while the picture builds, and a wire measured mid-slide would stop short)
  let m = null;
  const box = (el) => {
    const r = el.getBoundingClientRect();
    const t = new DOMMatrixReadOnly(getComputedStyle(el).transform === 'none' ? undefined : getComputedStyle(el).transform);
    const left = r.left - t.m41 - m.left;
    const top = r.top - t.m42 - m.top;
    return { left, top, right: left + r.width, width: r.width, height: r.height };
  };
  function measure() {
    if (!hub.offsetWidth) return false; // hidden (phones and tablets: the picture lives on the project page)
    m = mx.getBoundingClientRect();
    const h = box(hub);
    legs.forEach(({ svg, boxes, paths, out }) => {
      const sr = svg.getBoundingClientRect(); // the wires' own box is never transformed
      const s = { left: sr.left - m.left, top: sr.top - m.top };
      svg.setAttribute('viewBox', `0 0 ${r1(sr.width)} ${r1(sr.height)}`);
      const hy = h.top + h.height / 2 - s.top;
      paths.forEach((p, k) => {
        const b = box(boxes[k]);
        const by = b.top + b.height / 2 - s.top;
        const [x1, y1, x2, y2] = out ? [h.right - s.left, hy, b.left - s.left, by] : [b.right - s.left, by, h.left - s.left, hy];
        const cx = (x1 + x2) / 2;
        p.setAttribute('d', `M${r1(x1)} ${r1(y1)}C${r1(cx)} ${r1(y1)} ${r1(cx)} ${r1(y2)} ${r1(x2)} ${r1(y2)}`);
      });
    });
    return true;
  }

  let raf = 0;
  let timer = 0;
  function stop() {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    raf = 0;
    legs.forEach((l) => l.dots.forEach((c) => { c.style.opacity = 0; }));
    lanes.forEach((b) => b.classList.remove('is-hit'));
  }
  function run() {
    stop();
    if (!measure()) return;
    // after the wires have drawn in (CSS, about 0.55 s): in, a short pause at the channel, then out
    const DELAY = 560, T = 620, GAP = 120;
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    let t0 = 0;
    let hit = false;
    const tick = (now) => {
      t0 ||= now;
      const e = now - t0 - DELAY;
      let busy = false;
      legs.forEach((l, leg) => {
        const t = (e - leg * (T + GAP)) / T;
        if (t < 1) busy = true;
        l.paths.forEach((p, k) => {
          const c = l.dots[k];
          if (t <= 0 || t >= 1) { c.style.opacity = 0; return; }
          const pt = p.getPointAtLength(ease(t) * p.getTotalLength()); // the live wire, so a resize mid-run stays on it
          c.setAttribute('cx', r1(pt.x));
          c.setAttribute('cy', r1(pt.y));
          c.style.opacity = Math.min(1, t * 14, (1 - t) * 14).toFixed(2);
        });
        if (leg === 1 && t >= 1 && !hit) {
          hit = true;
          lanes.forEach((b) => b.classList.add('is-hit'));
          timer = setTimeout(() => lanes.forEach((b) => b.classList.remove('is-hit')), 650);
        }
      });
      raf = busy ? requestAnimationFrame(tick) : 0;
    };
    raf = requestAnimationFrame(tick);
  }

  measure();
  if ('ResizeObserver' in window) new ResizeObserver(() => measure()).observe(R);
  document.fonts?.ready.then(measure);
  return { measure, run, stop };
}

/* ---------------- 03 · the casebook ---------------- */
function initCasebook() {
  const list = $('.cb');
  if (!list) return null;
  const section = $('#cases');
  const zone = $('.cb-zone');
  const stage = $('.cb-stage');
  const hl = $('.cb-hl', list);
  const cases = $$('.cb-case', list);
  const rows = cases.map((c) => $('.cb-row', c));
  const panels = cases.map((c) => $('.cb-panel', c));
  const exhibits = cases.map((c) => $('.mx', c));
  const routes = exhibits.map((mx) => (mx && $('.mx-route', mx) ? routeWires(mx) : null));
  const tabBar = $('.cb-tabs');
  const tabLinks = tabBar ? $$('[data-tab]', tabBar) : [];
  const ind = $('.cb-tabs__ind');
  let active = -1;
  let book = false;
  let scrub = false;
  let scrollIdx = 0;
  let io = null;
  let tabOn = -1;
  let tabDrawn = false;
  let stickTop = 72;
  let holdDist = 800;
  let photoOff = [];

  /* the mini pictures build when their project opens (CSS transitions on .is-built) */
  function build(i, on) {
    const mx = exhibits[i];
    if (!mx) return;
    if (!on) { mx.classList.remove('is-built'); routes[i]?.stop(); return; }
    if (mx.classList.contains('is-built')) return;
    void mx.offsetWidth; // start from the pre-build state
    mx.classList.add('is-built');
    if (motionAllowed()) routes[i]?.run();
    else routes[i]?.measure();
  }

  function placeHighlight(i, animate) {
    if (!hl || !book) return;
    const r = rows[i];
    hl.classList.toggle('is-still', !animate || !motionAllowed());
    hl.style.setProperty('--y', `${r.offsetTop}px`);
    hl.style.setProperty('--h', `${r.offsetHeight}px`);
    hl.style.setProperty('--hl', getComputedStyle(cases[i]).getPropertyValue('--tint').trim());
  }

  // open project i: the new panel wipes in over the old one (downwards when moving down the list, upwards when up)
  let finishWipe = null;
  function activate(i) {
    if (i === active || i < 0 || i > 3) return;
    const prev = active;
    active = i;
    cases.forEach((c, k) => c.classList.toggle('is-active', k === i));
    if (!book) return;
    placeHighlight(i, prev !== -1);
    finishWipe?.();
    const incoming = panels[i];
    const outgoing = prev >= 0 ? panels[prev] : null;
    panels.forEach((p, k) => {
      if (k !== i && p !== outgoing) { p.classList.remove('is-shown', 'is-front'); p.inert = true; build(k, false); }
    });
    incoming.inert = false;
    incoming.classList.add('is-shown', 'is-front');
    if (outgoing) { outgoing.classList.remove('is-front'); outgoing.inert = true; }
    build(i, true);
    const done = () => {
      finishWipe = null;
      if (outgoing && active !== prev) { outgoing.classList.remove('is-shown'); build(prev, false); }
    };
    if (!outgoing || !motionAllowed() || !incoming.animate) { done(); return; }
    const down = i > prev;
    const wipe = incoming.animate(
      [{ clipPath: down ? 'inset(100% 0% 0% 0% round 24px)' : 'inset(0% 0% 100% 0% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)' }],
      { duration: 300, easing: 'cubic-bezier(.45,0,.55,1)' }
    );
    // No extra slide on the panel's parts: in Chrome, an animation on a part of a panel that is later hidden and shown
    // again can leave that part with a stale "hidden" style (the panel came back empty). The wipe alone is safe.
    wipe.onfinish = done;
    finishWipe = () => { wipe.onfinish = null; wipe.finish(); done(); };
  }

  // every panel must fit the one slot: the casebook grows to the tallest panel
  function fitBook() {
    list.style.minHeight = '';
    if (!book) return;
    let need = 0;
    panels.forEach((p) => {
      const kids = [...p.children];
      const cs = getComputedStyle(p);
      const inner = kids.reduce((s, k) => s + (k.classList.contains('cb-media') ? parseFloat(getComputedStyle(k).minHeight) || 118 : k.getBoundingClientRect().height), 0)
        + (parseFloat(cs.rowGap) || 0) * (kids.length - 1) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      need = Math.max(need, inner);
    });
    if (need > list.getBoundingClientRect().height) list.style.minHeight = `${Math.ceil(need)}px`;
    if (active >= 0) placeHighlight(active, false);
  }

  // the one-screen hold: the stage is only as tall as the casebook (no empty gap when it lets go), centred under the header
  function sizeZone() {
    const h = stage.getBoundingClientRect().height;
    const avail = innerHeight - headH();
    if (h > avail + 1) return false; // taller than the screen: no hold, the casebook just scrolls
    stickTop = Math.round(headH() + Math.max(0, (avail - h) / 2));
    holdDist = Math.round(innerHeight);
    root.style.setProperty('--stage-h', `${Math.ceil(h)}px`);
    root.style.setProperty('--stick-top', `${stickTop}px`);
    root.style.setProperty('--cb-dist', `${holdDist}px`);
    return true;
  }
  // 0 when the stage has just stuck, 1 when it lets go
  const holdProgress = () => clamp((stickTop - zone.getBoundingClientRect().top) / holdDist);

  function setMode() {
    book = mqBook.matches;
    root.classList.toggle('cb-book', book);
    scrub = book && motionAllowed() && innerHeight >= 640;
    root.classList.toggle('cb-scrub', scrub);
    finishWipe?.();
    stopObserver();
    const keep = active < 0 ? 0 : active;
    active = -1;
    panels.forEach((p) => { p.classList.remove('is-shown', 'is-front'); p.inert = false; });
    exhibits.forEach((_, k) => build(k, false));
    if (book) {
      fitBook();
      if (scrub && !sizeZone()) { scrub = false; root.classList.remove('cb-scrub'); fitBook(); }
      if (scrub) { scrollIdx = Math.round(holdProgress() * 3); activate(scrollIdx); }
      else activate(keep);
    } else {
      startObserver();
    }
    if (!scrub) ['--stage-h', '--stick-top', '--cb-dist'].forEach((v) => root.style.removeProperty(v));
    setPhotos(!book);
    tabDrawn = false;
    updateTabs(true);
  }

  /* scroll: step the hold; keep the phone bar on the card being read; and once the casebook is fully off screen,
     line it up with the scroll again (01 above it, 04 below it) */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (book) {
        const r = section.getBoundingClientRect();
        if (r.top > innerHeight) { scrollIdx = 0; activate(0); }
        else if (r.bottom < 0) { scrollIdx = 3; activate(3); }
        else if (scrub) {
          const idx = Math.round(holdProgress() * 3); // 01 at the start of the hold, 04 at its end, 02 and 03 between
          // keyboard focus inside the casebook: the reader's choice wins over the scroll (tabbing to a panel's link
          // scrolls the page, and switching panels then would drop the focus)
          if (list.querySelector(':focus-visible')) scrollIdx = idx;
          else if (idx !== scrollIdx) { scrollIdx = idx; activate(idx); }
        }
      } else updateTabs();
    });
  }
  addEventListener('scroll', onScroll, { passive: true });

  /* phones, tablets: each card's photo settles from 1.06 to its resting size as the card arrives. Scrubbed, so it
     reverses exactly; finished when the photo's top is about 45 % down the screen, well in view. */
  function setPhotos(on) {
    photoOff.forEach((off) => off());
    photoOff = [];
    cases.forEach((c) => { const ph = $('.cb-photo', c); ph.classList.remove('is-scrub'); ph.style.removeProperty('--ps'); });
    if (!on || !motionAllowed()) return;
    cases.forEach((c, k) => {
      const media = $('.cb-media', c);
      const ph = $('.cb-photo', c);
      photoOff.push(arm(media, () => {
        ph.classList.add('is-scrub');
        const stop = track(media, (v) => ph.style.setProperty('--ps', (1.06 - 0.06 * v).toFixed(4)), { start: 1, end: 0.45, name: `project photo ${k + 1}` });
        return () => { stop(); ph.classList.remove('is-scrub'); ph.style.removeProperty('--ps'); };
      }));
    });
  }

  /* the phone / tablet bar: the marker slides to the card being read and takes its tint */
  function currentCard() {
    const line = headH() + innerHeight * 0.5;
    let k = -1;
    cases.forEach((c, j) => { if (c.getBoundingClientRect().top <= line) k = j; });
    return k;
  }
  function updateTabs(force) {
    if (!tabBar || book) return;
    const k = currentCard();
    if (k === tabOn && !force) return;
    tabOn = k;
    tabLinks.forEach((a, j) => {
      a.classList.toggle('is-on', j === k);
      if (j === k) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    if (!ind) return;
    if (k < 0) { ind.classList.remove('is-on'); return; }
    const a = tabLinks[k].getBoundingClientRect();
    const b = tabBar.getBoundingClientRect();
    const cs = getComputedStyle(cases[k]);
    ind.classList.toggle('is-still', !tabDrawn || !motionAllowed());
    const set = { '--x': `${r1(a.left - b.left)}px`, '--y': `${r1(a.top - b.top)}px`, '--w': `${r1(a.width)}px`, '--h': `${r1(a.height)}px`, '--ind': cs.getPropertyValue('--tint').trim(), '--ind-d': cs.getPropertyValue('--deep').trim() };
    Object.entries(set).forEach(([p, v]) => ind.style.setProperty(p, v));
    ind.classList.add('is-on');
    tabDrawn = true;
  }

  // wide but short windows (the cards layout with its mini pictures): each builds as it comes into view and resets
  // when it leaves below
  function startObserver() {
    stopObserver();
    if (!('IntersectionObserver' in window)) { exhibits.forEach((_, k) => build(k, true)); return; }
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const k = exhibits.indexOf(e.target);
        if (e.isIntersecting) build(k, true);
        else if (e.boundingClientRect.top > innerHeight * 0.5) build(k, false); // it left below: scrolled back up
      });
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0.25 });
    exhibits.forEach((m) => m && io.observe(m));
  }
  function stopObserver() { io?.disconnect(); io = null; }

  /* pointer: a row opens only when the mouse really moves over it (not when the page scrolls under a still mouse),
     after a short pause, so a diagonal path to the panel does not flick through other rows */
  let lastX = -1;
  let lastY = -1;
  let intent = 0;
  list.addEventListener('pointermove', (e) => {
    if (!book || e.pointerType !== 'mouse') return;
    if (e.clientX === lastX && e.clientY === lastY) return;
    lastX = e.clientX;
    lastY = e.clientY;
    const row = e.target.closest('.cb-row');
    clearTimeout(intent);
    if (!row) return;
    const i = +row.dataset.i;
    if (i !== active) intent = setTimeout(() => activate(i), 70);
  });
  list.addEventListener('pointerleave', () => clearTimeout(intent));

  let lastPointer = 'mouse';
  addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; }, { passive: true, capture: true });
  rows.forEach((row, i) => {
    row.addEventListener('focus', () => { if (book && row.matches(':focus-visible')) activate(i); });
    row.addEventListener('click', (e) => {
      if (e.defaultPrevented || !plainClick(e)) return;
      if (book && i !== active && lastPointer !== 'mouse') { e.preventDefault(); activate(i); return; } // a first tap previews
      nameForTransition(i);
    });
  });
  panels.forEach((p, i) => $$('.cb-media, .read', p).forEach((a) => a.addEventListener('click', (e) => { if (plainClick(e)) nameForTransition(i); })));

  /* into the project page: the browser's cross-page view transition morphs the photo and the title (Chrome, Safari
     18.2+). Elsewhere the page simply changes. */
  const clearNames = () => cases.forEach((c) => { $('.cb-media', c).style.viewTransitionName = ''; $('.cb-title', c).style.viewTransitionName = ''; });
  function nameForTransition(i) {
    if (!motionAllowed() || !('onpagereveal' in window)) return;
    clearNames();
    $('.cb-media', cases[i]).style.viewTransitionName = 'case-photo';
    $('.cb-title', cases[i]).style.viewTransitionName = 'case-title';
  }
  addEventListener('pageshow', clearNames);

  /* the photo in the open panel drifts a little towards the pointer: at most 3 % of the photo, never the text */
  panels.forEach((p) => {
    const ph = $('.cb-photo', p);
    p.addEventListener('pointermove', (e) => {
      if (!book || e.pointerType !== 'mouse' || !motionAllowed()) return;
      const r = p.getBoundingClientRect();
      ph.style.setProperty('--dx', `${(((e.clientX - r.left) / r.width - 0.5) * -3).toFixed(2)}%`);
      ph.style.setProperty('--dy', `${(((e.clientY - r.top) / r.height - 0.5) * -3).toFixed(2)}%`);
    });
    p.addEventListener('pointerleave', () => { ph.style.removeProperty('--dx'); ph.style.removeProperty('--dy'); });
  });

  /* links to a project (#case-N: hero tags, the timeline, the phone bar) */
  function goToCase(i) {
    const behavior = motionAllowed() ? 'smooth' : 'auto';
    if (scrub) {
      const y = zone.getBoundingClientRect().top + scrollY - stickTop + holdDist * (i / 3);
      scrollIdx = i;
      activate(i);
      scrollTo({ top: Math.round(y) + 2, behavior });
    } else if (book) {
      activate(i);
      section.scrollIntoView({ behavior, block: 'start' });
    } else {
      cases[i].scrollIntoView({ behavior, block: 'start' });
    }
    history.replaceState(null, '', `#case-${i + 1}`);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#case-"]');
    if (!a || !plainClick(e)) return;
    const i = +a.getAttribute('href').slice(6) - 1;
    if (i >= 0 && i < 4) { e.preventDefault(); goToCase(i); }
  });

  /* start */
  setMode();
  mqBook.addEventListener('change', setMode);
  let rz = 0;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (mqBook.matches || book) setMode(); else updateTabs(true); }, 160);
  });
  const settle = () => { if (!book) return; fitBook(); if (scrub && !sizeZone()) setMode(); };
  document.fonts?.ready.then(settle);
  addEventListener('load', () => {
    settle();
    const m = /^#case-([1-4])$/.exec(location.hash);
    if (m) goToCase(+m[1] - 1);
  }, { once: true });
  return { setMode };
}

/* ---------------- 04 · the experience timeline (wide screens) ---------------- */
function initTimeline() {
  const T = $('[data-tl]');
  if (!T) return null;
  const years = $$('.tl__years li', T);
  const lanes = $$('.tl__lane', T).map((lane) => ({ line: $('.tl__line', lane), fill: $('.tl__line i', lane), marks: $$('.tl__it', lane) }));
  let geo = [];
  let off = null;

  // one axis for both lanes, 2023 → 2028; each line and marker as a share of it (a second entry in a year a little later)
  function measure() {
    const m = parseFloat(getComputedStyle(T).getPropertyValue('--m')) || 14;
    const a0 = years[0].getBoundingClientRect().left;
    const len = years[years.length - 1].getBoundingClientRect().left + m / 2 - a0 || 1;
    geo = lanes.map(({ line, marks }) => {
      const r = line.getBoundingClientRect();
      return {
        s: (r.left - a0) / len,
        e: (r.right - a0) / len,
        m: marks.map((it) => (it.getBoundingClientRect().left + m / 2 - a0) / len + (it.previousElementSibling ? 0.03 : 0)),
      };
    });
  }
  function paint(p) {
    lanes.forEach((l, k) => {
      const g = geo[k];
      l.fill.style.setProperty('--tl', clamp((p - g.s) / Math.max(0.001, g.e - g.s)).toFixed(3));
      l.marks.forEach((it, j) => it.classList.toggle('is-on', p >= g.m[j] - 0.002));
    });
  }
  function finished() {
    root.classList.remove('tl-anim');
    lanes.forEach((l) => { l.fill.style.removeProperty('--tl'); l.marks.forEach((it) => it.classList.add('is-on')); });
  }
  function set() {
    off?.();
    off = null;
    if (!mqWide.matches || !motionAllowed()) { finished(); return; }
    // take over only while the timeline is off screen, so nothing the reader is looking at jumps backwards
    off = arm(T, () => {
      measure();
      paint(0);
      root.classList.add('tl-anim');
      const stop = track(T, paint, { start: 0.95, end: 0.6, name: 'experience timeline' });
      return () => { stop(); finished(); };
    });
  }
  set();
  let rz = 0;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      const want = mqWide.matches && motionAllowed();
      if (want !== !!off) set();
      else if (root.classList.contains('tl-anim')) measure();
    }, 160);
  });
  return { set };
}

/* the two main hero buttons lean towards the pointer, at most 6 px */
function initMagnets() {
  const cap = (v) => Math.max(-6, Math.min(6, v));
  $$('.magnet').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !motionAllowed() || !mqFine.matches) return;
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', `${cap((e.clientX - (r.left + r.width / 2)) * 0.2).toFixed(1)}px`);
      b.style.setProperty('--my', `${cap((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1)}px`);
    });
    b.addEventListener('pointerleave', () => { b.style.removeProperty('--mx'); b.style.removeProperty('--my'); });
  });
}
