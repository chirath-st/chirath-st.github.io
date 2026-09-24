// Exhibits: always loaded (no gsap). Everything here also works with reduced motion.
//  - notes: point at, tap or tab to a part of a picture and the note line explains it
//  - route geometry for Exhibit 2 (the wires are drawn here, so they exist without the motion code)
//  - tap a source (Exhibit 2): Email / Slack / Teams send a question into the next lane
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = () =>
  document.documentElement.classList.contains('no-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initNotes() {
  $$('.exhibit').forEach((ex) => {
    const note = ex.querySelector('.ex-note');
    const fx = ex.querySelector('.fx');
    if (!note || !fx) return;
    const targets = $$('[data-note]', fx);
    const reset = () => {
      targets.forEach((t) => t.classList.remove('is-focus'));
      note.textContent = note.dataset.default;
    };
    const show = (el) => {
      targets.forEach((t) => t.classList.toggle('is-focus', t === el));
      note.textContent = el.dataset.note;
    };
    targets.forEach((el) => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(el); });
      el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') reset(); });
      el.addEventListener('focus', () => show(el));
      el.addEventListener('blur', reset);
      el.addEventListener('click', () => show(el));
    });
  });
}

// offset of el inside rootEl (layout coordinates, unaffected by transforms)
export function offsetIn(el, rootEl) {
  let x = 0, y = 0, n = el;
  while (n && n !== rootEl) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

const geos = new WeakMap();
// Positions for the route exhibit: wires between boxes, hub and lanes, and parking spots for the 9 motion dots.
export function routeGeometry(R) {
  if (geos.has(R)) return geos.get(R);
  const boxes = $$('.rt-box', R), hub = R.querySelector('.rt-hub'), lanes = $$('.rt-lane', R);
  const win = $$('.w-in path', R), wout = $$('.w-out path', R);
  const P = { b: [], h: [], l: [], horiz: true };
  const measure = () => {
    if (!R.offsetWidth) return;
    const b = boxes.map((e) => offsetIn(e, R)), h = offsetIn(hub, R), l = lanes.map((e) => offsetIn(e, R));
    const horiz = l[0].x > h.x + h.w - 2;
    P.horiz = horiz;
    for (let i = 0; i < 9; i++) {
      const j = i % 3, k = Math.floor(i / 3), bb = b[j], ll = l[j];
      P.b[i] = horiz ? { x: bb.x + bb.w - 26 - k * 16, y: bb.y + bb.h / 2 - 5 } : { x: bb.x + bb.w / 2 - 20 + k * 15, y: bb.y + bb.h - 16 };
      P.h[i] = horiz ? { x: h.x + 16 + i * 13, y: h.y + h.h - 24 } : { x: h.x + h.w - 24 - i * 14, y: h.y + h.h / 2 - 5 };
      P.l[i] = horiz ? { x: ll.x + ll.w - 22 - k * 14, y: ll.y + 12 } : { x: ll.x + 10 + k * 14, y: ll.y + ll.h - 18 };
    }
    const cur = (x1, y1, x2, y2) =>
      horiz
        ? `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`
        : `M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`;
    win.forEach((p, j) => {
      const bb = b[j];
      p.setAttribute('d', horiz ? cur(bb.x + bb.w, bb.y + bb.h / 2, h.x, h.y + h.h / 2) : cur(bb.x + bb.w / 2, bb.y + bb.h, h.x + h.w / 2, h.y));
    });
    wout.forEach((p, j) => {
      const ll = l[j];
      p.setAttribute('d', horiz ? cur(h.x + h.w, h.y + h.h / 2, ll.x, ll.y + ll.h / 2) : cur(h.x + h.w / 2, h.y + h.h, ll.x + ll.w / 2, ll.y));
    });
  };
  const geo = { P, measure, win, wout, boxes, hub, lanes };
  geos.set(R, geo);
  measure();
  if ('ResizeObserver' in window) new ResizeObserver(() => measure()).observe(R);
  document.fonts?.ready.then(measure);
  return geo;
}

// Tap a source. Buttons are disabled while the motion timeline is before the end of its last phase
// (motion.js reports progress with an "exprogress" event); without motion the picture is finished, so they work at once.
export function initTapSource() {
  $$('.exhibit[data-ex="route"]').forEach((ex) => {
    const R = ex.querySelector('.fx-route');
    const note = ex.querySelector('.ex-note');
    const geo = routeGeometry(R);
    const laneNames = geo.lanes.map((l) => l.firstChild.textContent.trim() + ' ' + (l.querySelector('small')?.textContent.trim() || ''));
    let next = 0;
    let live = [];
    let enabled = true;

    const setEnabled = (on) => {
      enabled = on;
      geo.boxes.forEach((b) => b.setAttribute('aria-disabled', String(!on)));
      if (!on) { live.forEach((a) => a.cancel()); live = []; }
    };

    geo.boxes.forEach((b, j) => {
      b.setAttribute('role', 'button');
      const send = document.createElement('span');
      send.className = 'rt-box__send';
      send.setAttribute('aria-hidden', 'true');
      send.textContent = 'Send';
      b.appendChild(send);
      const fire = () => {
        if (!enabled || live.length >= 3) return;
        const lane = next++ % 3;
        const L = geo.lanes[lane];
        const done = () => {
          L.classList.add('is-hit');
          if (!reduced()) { L.classList.remove('is-pulse'); void L.offsetWidth; L.classList.add('is-pulse'); }
          setTimeout(() => L.classList.remove('is-hit', 'is-pulse'), 650);
        };
        const src = b.firstChild.textContent.trim();
        note.textContent = `A question from ${src} went to: ${laneNames[lane]}.`;
        if (reduced()) { done(); return; }
        // follow the drawn wires: source → channel, then channel → lane
        const pts = [];
        const sample = (path) => {
          const len = path.getTotalLength();
          for (let i = 0; i <= 14; i++) pts.push(path.getPointAtLength((len * i) / 14));
        };
        sample(geo.win[j]);
        sample(geo.wout[lane]);
        const dot = document.createElement('i');
        dot.className = 'rt-tap';
        dot.setAttribute('aria-hidden', 'true');
        R.appendChild(dot);
        const anim = dot.animate(
          pts.map((p) => ({ transform: `translate(${p.x - 5}px, ${p.y - 5}px)` })),
          { duration: 1100, easing: 'ease-in-out', fill: 'forwards' }
        );
        live.push(anim);
        const end = () => { dot.remove(); live = live.filter((a) => a !== anim); };
        anim.onfinish = () => { end(); done(); };
        anim.oncancel = end;
      };
      b.addEventListener('click', fire);
      b.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
      });
    });

    if (note.dataset.defaultTap) { note.dataset.default = note.dataset.defaultTap; note.textContent = note.dataset.default; }
    ex.addEventListener('exprogress', (e) => setEnabled(e.detail >= 0.93));
    ex.addEventListener('exfinished', () => setEnabled(true));
    setEnabled(true);
  });
}
