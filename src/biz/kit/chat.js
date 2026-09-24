// Kit · chat: a demo conversation (or a note filling itself in) that plays as it comes up the screen.
//   <div class="k-chat" data-kit="chat" [data-label="Demo conversation"]>
//     <button class="k-chat__replay" type="button">Replay</button>      (optional; hidden without JS)
//     <ol class="k-chat__log">
//       <li class="k-msg k-msg--in"><span class="k-msg__who">Name</span><div class="k-msg__bubble">…</div></li>
//       <li class="k-msg k-msg--out" data-type [data-wait="600"]> … typed out letter by letter … </li>
// The HTML is the whole transcript (JS off, reduced motion, screen readers). Messages still to come show as grey
// "ghost" bubbles in their own place (never an empty card, and nothing below moves) and light up one by one.
// It starts when its top comes up past 85 % of the screen and is finished about 2 s later (Chirath, Sep 24: never
// scroll past a half-played picture): data-wait values are relative pauses, scaled to fit. Scrolling back up past its
// start clears it again (the reverse of playing), so it plays again on the next way down.
import { $$, armOn, armOff, arrive, qaRegister } from './util.js';

const BUDGET = 2000; // ms from arrival to the last letter
const FIRST = 80, TYPE = 700, DOTS = 300; // first pause, one typed message, the "…" before an incoming message

const sleep = (ms, run) => new Promise((r) => { const t = setTimeout(r, ms); run.timers.push(t); });

// split each text node of a typed bubble into [shown][rest]; rest is visibility:hidden, so wrapping never changes.
// A <mark> (a [placeholder] chip) stays hidden until its first letter is typed, so no empty blue boxes float ahead.
function typer(bubble) {
  const walker = document.createTreeWalker(bubble, NodeFilter.SHOW_TEXT);
  const parts = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue.trim()) parts.push(n);
  const segs = parts.map((n) => {
    const shown = document.createElement('span'), rest = document.createElement('span');
    const mark = n.parentElement?.closest('mark');
    rest.className = 'k-rest';
    rest.textContent = n.nodeValue;
    n.replaceWith(shown, rest);
    return { shown, rest, text: rest.textContent, mark: mark && bubble.contains(mark) ? mark : null };
  });
  const total = segs.reduce((a, s) => a + s.text.length, 0);
  const show = (k) => {
    let left = k;
    segs.forEach((s) => {
      const c = Math.max(0, Math.min(s.text.length, left));
      s.shown.textContent = s.text.slice(0, c);
      s.rest.textContent = s.text.slice(c);
      if (s.mark) s.mark.style.visibility = c ? '' : 'hidden';
      left -= s.text.length;
    });
  };
  return { total, show };
}

export function init(el, ctx) {
  const msgs = $$('.k-msg', el);
  if (!msgs.length) return;
  const replay = el.querySelector('.k-chat__replay');
  const typed = new Map();
  let run = null, played = false, armed = false;

  // the pauses, scaled so the whole conversation fits the budget (never slower than written)
  const isTyped = (m) => m.hasAttribute('data-type');
  const dots = (m) => !isTyped(m) && m.classList.contains('k-msg--in');
  const fixed = FIRST + msgs.filter(isTyped).length * TYPE;
  const loose = msgs.slice(1).reduce((a, m) => a + (+m.dataset.wait || 240), 0) + msgs.filter(dots).length * DOTS;
  const k = Math.max(0.3, Math.min(1, (BUDGET - fixed) / Math.max(1, loose)));
  const wait = (m, i) => (i ? Math.round((+m.dataset.wait || 240) * k) : FIRST);

  const stopRun = () => { if (run) { run.stop = true; run.timers.forEach(clearTimeout); cancelAnimationFrame(run.raf); } run = null; };
  const reset = () => {
    stopRun();
    played = false;
    msgs.forEach((m) => { m.classList.remove('is-shown', 'is-typing'); m.classList.add('is-wait'); typed.get(m)?.show(0); });
    replay?.setAttribute('aria-disabled', 'true');
  };
  const finish = () => {
    stopRun();
    msgs.forEach((m) => { m.classList.remove('is-wait', 'is-typing'); m.classList.add('is-shown'); typed.get(m)?.show(1e9); });
  };
  const typeOut = (t, me) => new Promise((res) => {
    const t0 = performance.now();
    const frame = (now) => {
      if (me.stop) { res(); return; }
      const f = Math.min(1, (now - t0) / TYPE);
      t.show(Math.round(t.total * f));
      if (f < 1) me.raf = requestAnimationFrame(frame); else res();
    };
    me.raf = requestAnimationFrame(frame);
  });
  const play = async () => {
    reset();
    played = true;
    const me = (run = { stop: false, timers: [], raf: 0 });
    for (const [i, m] of msgs.entries()) {
      await sleep(wait(m, i), me);
      if (me.stop) return;
      const t = typed.get(m);
      if (dots(m)) {
        m.classList.replace('is-wait', 'is-typing');
        await sleep(Math.round(DOTS * k), me);
        if (me.stop) return;
      }
      m.classList.remove('is-wait', 'is-typing');
      m.classList.add('is-shown');
      if (t) {
        await typeOut(t, me);
        if (me.stop) return;
        t.show(t.total);
      }
    }
    if (run === me) run = null;
    replay?.setAttribute('aria-disabled', 'false');
  };

  // take over only while fully off screen (nothing the reader is looking at changes). Below the screen: ghost
  // bubbles, ready to play. Above it (already read): stays finished until it goes back below its start line.
  const arm = () => {
    if (armed) return;
    armed = true;
    msgs.forEach((m) => { if (isTyped(m)) typed.set(m, typer(m.querySelector('.k-msg__bubble') || m)); });
    armOn(el, 'chat');
    if (el.getBoundingClientRect().top > innerHeight * 0.85) reset();
    else { finish(); played = true; replay?.setAttribute('aria-disabled', 'false'); }
  };
  const disarmAll = () => { finish(); armOff(el, 'chat'); armed = false; };

  let io = null, off = null, unQA = null;
  const watch = () => {
    io = new IntersectionObserver(([e]) => { if (!e.isIntersecting && !armed) arm(); });
    io.observe(el);
    off = arrive(el, (where) => {
      if (!armed) return;
      if (where === 'in') { if (!played) play(); }
      else if (played || run) reset();
    }, { at: 0.95 });
    unQA = qaRegister({ el, name: 'chat', kind: 'timed', budget: BUDGET + 300, done: () => played && !run });
  };
  replay?.addEventListener('click', () => { if (replay.getAttribute('aria-disabled') !== 'true') play(); });

  if (ctx.motion) watch();
  return {
    motion(on) {
      io?.disconnect(); io = null;
      off?.(); off = null;
      unQA?.(); unQA = null;
      if (on) watch();
      else if (armed) disarmAll();
    },
  };
}
