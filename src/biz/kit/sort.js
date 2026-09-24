// Kit · sort: cards that sort themselves into groups as you scroll, and that you can drag (or press Enter on)
// to sort yourself.
//   <div class="k-sort" data-kit="sort" [data-done="All sorted."] [data-wrong="…"] [data-hint="…"]>
//     <div class="k-sort__tray"><span class="k-sort__slot"></span> … one per card … </div>   (where cards start)
//     <div class="k-sort__buckets">
//       <div class="k-sort__bucket" data-bucket="a"><p class="k-sort__bh">Group name</p>
//         <ul class="k-sort__cards"><li class="k-card" data-to="a" [data-slot="3"]>…</li></ul></div> …
//     <div class="k-sort__bar"><button type="button" class="k-sort__try">Sort them yourself</button>
//       <p class="k-sort__note" aria-live="polite"></p></div>
// HTML = sorted (JS off, reduced motion). With motion the cards start in the tray and hop to their groups one by
// one as you scroll (a card is either in the tray or in its group, never hanging in mid-air), and hop back on the
// way up. All are sorted once the picture is in view (kit/util.js span; data-start / data-end as in track()).
// "Sort them yourself" (any mode) sends them back to the tray. data-sorted is set while every card is in its
// group, so the tray can look finished (kit.css).
import { $$, arm, track, layoutChanged, armOn } from './util.js';

export function init(el, ctx) {
  const cards = $$('.k-card', el);
  const slots = $$('.k-sort__slot', el);
  const tryBtn = el.querySelector('.k-sort__try');
  const note = el.querySelector('.k-sort__note');
  if (!cards.length || slots.length < cards.length) return;
  const nameOf = (b) => b.querySelector('.k-sort__bh')?.textContent.trim() || b.dataset.bucket;
  // a card's words as one phrase ("Possible gap, Passes both rules"), for notes and screen readers
  const text = (c) => [...c.childNodes].map((n) => n.textContent.trim()).filter(Boolean).join(', ');
  const say = (t) => { if (note) note.textContent = t; };

  // start slot per card: data-slot, else interleave the groups so the tray looks unsorted
  const groups = [...new Set(cards.map((c) => c.dataset.to))];
  const inter = [];
  for (let i = 0; inter.length < cards.length; i++) groups.forEach((g) => { const c = cards.filter((x) => x.dataset.to === g)[i]; if (c) inter.push(c); });
  const S = cards.map((c) => ({ c, slot: slots[c.dataset.slot != null ? +c.dataset.slot : inter.indexOf(c)], t: 1, placed: true, dx: 0, dy: 0, px: 0, py: 0, drag: false }));
  S.sort((a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot));

  const apply = (s) => {
    const k = 1 - s.t;
    s.c.style.transform = k || s.px || s.py ? `translate(${s.dx * k + s.px}px, ${s.dy * k + s.py}px)` : '';
  };
  const sync = () => {
    if (S.every((s) => (s.placed || s.t >= 1) && !s.drag)) el.dataset.sorted = '';
    else delete el.dataset.sorted;
  };
  // measure with transitions off: a card mid-flight (or a resize during "Sort them yourself") must not be read
  // at its animated place, or it lands off its slot. Then restore where it was and let it fly to the new place.
  const measure = () => {
    const was = S.map((s) => s.c.style.transform);
    S.forEach((s) => { s.c.style.transition = 'none'; s.c.style.transform = 'none'; });
    S.forEach((s) => {
      const c = s.c.getBoundingClientRect(), o = s.slot.getBoundingClientRect();
      s.dx = o.left - c.left + (o.width - c.width) / 2;
      s.dy = o.top - c.top + (o.height - c.height) / 2;
    });
    S.forEach((s, i) => { s.c.style.transform = was[i]; });
    void el.offsetWidth;
    S.forEach((s) => { s.c.style.transition = ''; });
    S.forEach(apply);
  };
  const setFocusable = () => S.forEach((s) => {
    if (s.placed) { s.c.removeAttribute('tabindex'); s.c.removeAttribute('role'); s.c.removeAttribute('aria-label'); }
    else { s.c.tabIndex = 0; s.c.setAttribute('role', 'button'); s.c.setAttribute('aria-label', `${text(s.c)}. Press Enter to put it in its group.`); }
  });
  const place = (s) => {
    s.placed = true; s.t = 1; s.px = s.py = 0; s.drag = false;
    s.c.classList.remove('is-drag');
    apply(s);
    setFocusable();
    const b = el.querySelector(`.k-sort__bucket[data-bucket="${s.c.dataset.to}"]`);
    b?.classList.add('is-hit');
    setTimeout(() => b?.classList.remove('is-hit'), 600);
    const left = S.filter((x) => !x.placed).length;
    say(left ? `${text(s.c)} → ${nameOf(b)}.` : el.dataset.done || 'All sorted.');
    sync();
  };

  // auto: scroll position drives cards that the reader has not sorted
  let stopAuto = null, disarm = null;
  const autoOn = () => {
    disarm = arm(el, () => {
      el.classList.add('is-auto');
      S.forEach((s) => { s.placed = false; s.t = 0; });
      measure();
      setFocusable();
      sync();
      const n = S.length;
      stopAuto = track(el, (p) => {
        S.forEach((s, k) => {
          if (s.placed || s.drag || !el.classList.contains('is-auto')) return;
          // each card hops (with the card's CSS transition) once scroll passes its own point, and back below it;
          // the hops come in the second half, when the groups under the tray are on screen too
          const t = p >= 0.46 + (k / n) * 0.44 ? 1 : 0;
          if (t !== s.t) { s.t = t; apply(s); }
        });
        sync();
      }, { start: +el.dataset.start || 0.92, end: +el.dataset.end || 0.6, name: 'sort' });
      return () => { stopAuto?.(); stopAuto = null; el.classList.remove('is-auto'); };
    });
  };

  // the first drag or Enter ends the scroll-driven mode: cards already in a group stay, the rest go to the tray
  const toManual = () => {
    if (!el.classList.contains('is-auto')) return;
    disarm?.(); disarm = null;
    el.classList.add('is-manual');
    S.forEach((s) => {
      if (s.placed || s.drag) return;
      if (s.t >= 0.999) s.placed = true;
      else { s.t = 0; apply(s); }
    });
    setFocusable();
    sync();
  };

  // drag
  let active = null, sx = 0, sy = 0;
  S.forEach((s) => {
    s.c.addEventListener('pointerdown', (e) => {
      if (s.placed || e.button !== 0) return;
      active = s; s.drag = true; sx = e.clientX; sy = e.clientY;
      s.c.classList.add('is-drag');
      sync();
      s.c.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    s.c.addEventListener('pointermove', (e) => {
      if (active !== s) return;
      s.px = e.clientX - sx; s.py = e.clientY - sy;
      apply(s);
    });
    const drop = (e) => {
      if (active !== s) return;
      active = null;
      s.c.style.visibility = 'hidden';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      s.c.style.visibility = '';
      const b = under?.closest('.k-sort__bucket');
      toManual();
      if (b && b.dataset.bucket === s.c.dataset.to) { place(s); return; }
      s.drag = false; s.px = s.py = 0;
      s.c.classList.remove('is-drag');
      apply(s);
      if (b) say(el.dataset.wrong || 'Not that group. Try another one.');
    };
    s.c.addEventListener('pointerup', drop);
    s.c.addEventListener('pointercancel', drop);
    s.c.addEventListener('keydown', (e) => {
      if (s.placed || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      toManual();
      place(s);
      S.find((x) => !x.placed)?.c.focus();
    });
  });

  tryBtn?.addEventListener('click', () => {
    disarm?.(); disarm = null;
    stopAuto?.(); stopAuto = null;
    el.classList.remove('is-auto');
    el.classList.add('is-manual');
    S.forEach((s) => { s.placed = false; s.t = 0; s.px = s.py = 0; });
    measure();
    setFocusable();
    sync();
    say(el.dataset.hint || 'Drag each card into its group, or tab to it and press Enter.');
    S[0].c.focus({ preventScroll: true });
  });

  const ro = new ResizeObserver(() => { if (!active) measure(); });
  ro.observe(el);
  armOn(el, 'sort');
  sync();
  layoutChanged();
  if (ctx.motion) autoOn();
  return {
    motion(on) {
      disarm?.(); disarm = null;
      if (on) autoOn();
      else { S.forEach((s) => { s.placed = true; s.t = 1; s.px = s.py = 0; apply(s); }); setFocusable(); sync(); }
    },
  };
}
