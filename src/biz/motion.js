// Scroll motion for the main home page. Loaded with import() after the page has loaded and the browser is idle,
// and only when motion is allowed (no reduced motion, no Save-Data, no "Turn off animation").
// Rules (annex §4.4, §7): the HTML is already the finished picture; anything on screen when this starts stays
// finished until it has left the viewport; scrolling back up plays every scrubbed picture exactly backwards.
// Finish early (Chirath, Sep 24): every scrubbed picture is complete while it is still well in view (a sticky exhibit
// before it moves on; anything else by the time its top reaches 30 % of the screen: kit/util.js span), and every
// play-once moment starts as its top passes 85 % of the screen and lasts at most about 1.2 s.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { routeGeometry, offsetIn } from './exhibits.js';
import { $, $$, onScreen, arm, phased } from './motion-kit.js';
import { QA, qaRegister, span } from './kit/util.js';

gsap.registerPlugin(ScrollTrigger);
if (QA) window.__st = ScrollTrigger; // scripts/story-qa.mjs ("late animations") reads the triggers

// scroll positions (for ScrollTrigger start / end functions) where el starts and where it must be finished
const docTop = (el) => el.getBoundingClientRect().top + scrollY;
const startAt = (el, s, e) => () => docTop(el) - span(el.getBoundingClientRect(), innerHeight, s, e)[0];
const endAt = (el, s, e) => () => docTop(el) - span(el.getBoundingClientRect(), innerHeight, s, e)[1];

const root = document.documentElement;

const builders = {
  funnel(ex) {
    const bars = $$('.fn-bar', ex), br = $$('.fn-brace', ex), gate = $('.fn-gate', ex), note = $('.note', ex);
    const roB = $('.ro-before', ex), roA = $('.ro-after', ex);
    return phased(
      (tl, t) => {
        tl.fromTo(bars[0], { scaleX: 0 }, { scaleX: 1, duration: 0.7 }, t + 0.1)
          .fromTo(roB, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3 }, t)
          .set(roA, { opacity: 0 }, t);
      },
      (tl, t) => {
        tl.to(roB, { opacity: 0, y: -6, duration: 0.25 }, t)
          .fromTo(roA, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25 }, t + 0.2)
          .fromTo(bars[1], { scaleX: 0 }, { scaleX: 1, duration: 0.4 }, t + 0.1)
          .fromTo(bars[2], { scaleX: 0 }, { scaleX: 1, duration: 0.4 }, t + 0.45)
          .fromTo(br[0], { '--s': 0 }, { '--s': 1, duration: 0.3 }, t + 0.65);
      },
      (tl, t) => {
        tl.fromTo(bars[3], { scaleX: 0 }, { scaleX: 1, duration: 0.3 }, t + 0.05)
          .fromTo(gate, { scale: 0, rotate: -45 }, { scale: 1, rotate: 45, duration: 0.3, ease: 'back.out(2)' }, t + 0.3)
          .fromTo(br[1], { '--s': 0 }, { '--s': 1, duration: 0.25 }, t + 0.35)
          .fromTo(note, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3 }, t + 0.5)
          .fromTo(br[2], { '--s': 0 }, { '--s': 1, duration: 0.25 }, t + 0.7);
      }
    );
  },
  route(ex) {
    const R = $('.fx-route', ex);
    const geo = routeGeometry(R);
    const { P } = geo;
    const dots = $$('.rt-dot', R), sq = $$('.rt-sq span', R);
    return phased(
      (tl, t) => {
        tl.fromTo(dots, { x: (i) => P.b[i].x, y: (i) => P.b[i].y + 10, opacity: 0 }, { x: (i) => P.b[i].x, y: (i) => P.b[i].y, opacity: 1, duration: 0.3, stagger: 0.04 }, t + 0.05)
          .fromTo(geo.boxes, { borderColor: '#DAD7CE' }, { borderColor: '#93ACEE', duration: 0.3, stagger: 0.1 }, t + 0.1)
          .fromTo([...geo.win, ...geo.wout], { strokeDashoffset: 1, strokeDasharray: 1 }, { strokeDashoffset: 1, duration: 0.01 }, t)
          .fromTo(sq, { '--q': 0 }, { '--q': 0, duration: 0.01 }, t)
          .fromTo(geo.lanes, { x: -14, borderColor: '#E7E5DE' }, { x: -14, borderColor: '#E7E5DE', duration: 0.01 }, t)
          .fromTo(geo.hub, { scale: 0.92 }, { scale: 0.92, duration: 0.01 }, t);
      },
      (tl, t) => {
        tl.to(geo.win, { strokeDashoffset: 0, duration: 0.35, stagger: 0.05 }, t)
          .to(geo.hub, { scale: 1, duration: 0.2 }, t + 0.1)
          .to(dots, { x: (i) => P.h[i].x, y: (i) => P.h[i].y, duration: 0.45, stagger: 0.025, ease: 'power2.inOut' }, t + 0.25)
          .to(sq, { '--q': 1, duration: 0.12, stagger: 0.14 }, t + 0.3);
      },
      (tl, t) => {
        tl.to(geo.wout, { strokeDashoffset: 0, duration: 0.35, stagger: 0.06 }, t)
          .to(geo.lanes, { x: 0, borderColor: '#DAD7CE', duration: 0.25, stagger: 0.08 }, t + 0.1)
          .to(dots, { x: (i) => P.l[i].x, y: (i) => P.l[i].y, duration: 0.5, stagger: 0.03, ease: 'power2.inOut' }, t + 0.25);
      }
    );
  },
  sort(ex) {
    const S = $('.fx-sort', ex);
    const slots = $$('.st-slot', S), cards = $$('.st-card', S);
    const yes = $('.st-bucket--yes', S), out = $('.st-out', S);
    const D = [];
    const measure = () => {
      cards.forEach((c) => {
        const k = +c.dataset.k, s = offsetIn(slots[k], S), p = offsetIn(c, S);
        D[k] = { x: s.x - p.x, y: s.y - p.y };
      });
    };
    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);
    const k = (c) => +c.dataset.k;
    return phased(
      (tl, t) => {
        tl.fromTo(cards, { x: (i, c) => D[k(c)].x, y: (i, c) => D[k(c)].y - 12, opacity: 0 }, { x: (i, c) => D[k(c)].x, y: (i, c) => D[k(c)].y, opacity: 1, duration: 0.35, stagger: 0.06 }, t + 0.2)
          .fromTo(out, { opacity: 0, y: 8 }, { opacity: 0, y: 8, duration: 0.01 }, t)
          .fromTo(yes, { backgroundColor: '#F8F7F3' }, { backgroundColor: '#F8F7F3', duration: 0.01 }, t);
      },
      (tl, t) => {
        tl.to(cards, { x: 0, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.inOut' }, t + 0.1);
      },
      (tl, t) => {
        tl.to(yes, { backgroundColor: '#E6ECFA', duration: 0.25 }, t + 0.1)
          .to(out, { opacity: 1, y: 0, duration: 0.35 }, t + 0.2);
      }
    );
  },
  map(ex) {
    const M = $('.fx-map', ex);
    const bus = $('.bus-reveal', M), rides = $$('.rides path', M);
    const campus = $$('.campus circle, .campus-ring circle', M), labels = $$('.mp-label', M);
    const busLbl = $('.mp-bus', M), chips = $$('.mp-chip', M), stamp = $('.mp-stamp', M);
    const legend = $$('.mp-legend span', M), flow = $$('.mp-flow .st, .mp-flow .ar', M), never = $('.mp-never', M), river = $('.river', M);
    return phased(
      (tl, t) => {
        tl.fromTo(river, { opacity: 0 }, { opacity: 1, duration: 0.3 }, t)
          .fromTo(campus, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.3, stagger: 0.04, ease: 'back.out(2)' }, t + 0.05)
          .fromTo(labels, { opacity: 0 }, { opacity: 1, duration: 0.25, stagger: 0.05 }, t + 0.15)
          .fromTo(bus, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: 'none' }, t + 0.3)
          .fromTo(busLbl, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t + 0.6)
          .fromTo(legend[0], { opacity: 0 }, { opacity: 1, duration: 0.2 }, t + 0.6)
          .fromTo(rides, { strokeDashoffset: 1 }, { strokeDashoffset: 1, duration: 0.01 }, t)
          .fromTo([...chips, legend[1]], { opacity: 0 }, { opacity: 0, duration: 0.01 }, t)
          .fromTo(flow, { opacity: 0 }, { opacity: 0, duration: 0.01 }, t)
          .fromTo(never, { opacity: 0 }, { opacity: 0, duration: 0.01 }, t)
          .fromTo(stamp, { scale: 0.6, opacity: 0 }, { scale: 0.6, opacity: 0, duration: 0.01 }, t);
      },
      (tl, t) => {
        tl.to(rides, { strokeDashoffset: 0, duration: 0.4, stagger: 0.15, ease: 'power1.inOut' }, t + 0.05)
          .to(chips, { opacity: 1, duration: 0.2, stagger: 0.15 }, t + 0.2)
          .to(legend[1], { opacity: 1, duration: 0.2 }, t + 0.3)
          .to(flow, { opacity: 1, duration: 0.15, stagger: 0.05 }, t + 0.1);
      },
      (tl, t) => {
        tl.to(stamp, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.8)' }, t + 0.05)
          .to(never, { opacity: 1, duration: 0.25 }, t + 0.25);
      }
    );
  },
};

// wrap each word of the quote so it can ink in; returns a function that puts the original HTML back
function wrapWords(node) {
  const original = node.innerHTML;
  const walk = (n) => {
    [...n.childNodes].forEach((ch) => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span'); w.className = 'w'; w.textContent = part;
          const i = document.createElement('span'); i.className = 'w__i'; i.setAttribute('aria-hidden', 'true'); i.textContent = part;
          w.appendChild(i); frag.appendChild(w);
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1) walk(ch);
    });
  };
  walk(node);
  return () => { node.innerHTML = original; };
}

export function start() {
  root.classList.add('motion');
  const mm = gsap.matchMedia();
  const extra = []; // cleanups outside gsap (observers, listeners, DOM changes)

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    /* section rules draw in (scrubbed, both ways) */
    $$('.sec-head').forEach((h) => {
      const i = $('.sec-rule i', h);
      extra.push(arm(h, () => {
        const tw = gsap.fromTo(i, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: h, start: 'top 92%', end: 'top 55%', scrub: 0.5 } });
        return () => { tw.scrollTrigger?.kill(); tw.kill(); gsap.set(i, { clearProps: 'transform' }); };
      }));
    });

    /* at a glance: the numbers play once when the band arrives; reset when you scroll back above it */
    const gRow = $('.glance__row');
    if (gRow) {
      const items = $$('li', gRow);
      const nums = $$('.num[data-count]', gRow);
      const reels = nums.map((n) => {
        const r = document.createElement('span'); r.className = 'num__reel'; r.setAttribute('aria-hidden', 'true'); n.appendChild(r); return r;
      });
      // play once as the row's top passes 85 % of the screen, done in 1.1 s (0.9 s each, 0.06 s apart)
      const gtl = gsap.timeline({ paused: true, onComplete: () => nums.forEach((n) => n.classList.remove('is-rolling')) });
      items.forEach((li, i) => gtl.fromTo(li, { '--k': 0 }, { '--k': 1, duration: 0.7, ease: 'power3.out' }, i * 0.06));
      nums.forEach((n, i) => {
        const o = { v: +n.dataset.from || 0 };
        gtl.fromTo(o, { v: +n.dataset.from || 0 }, { v: +n.dataset.count, duration: 0.9, ease: 'power3.out', onStart: () => n.classList.add('is-rolling'), onUpdate: () => { reels[i].textContent = String(Math.round(o.v)); } }, i * 0.06);
      });
      gtl.progress(1);
      const passed = gRow.getBoundingClientRect().top < innerHeight * 0.85;
      let st = null;
      if (!passed) {
        gtl.progress(0).pause();
        st = ScrollTrigger.create({
          trigger: gRow, start: 'top 85%',
          onEnter: () => gtl.restart(),
          onLeaveBack: () => { gtl.progress(0).pause(); nums.forEach((n) => n.classList.remove('is-rolling')); },
        });
      }
      const unQA = qaRegister({ el: gRow, name: 'glance numbers', kind: 'timed', at: 0.85, budget: 1400, done: () => gtl.progress() >= 1 });
      extra.push(() => { unQA(); st?.kill(); gtl.progress(1).kill(); items.forEach((li) => li.style.removeProperty('--k')); nums.forEach((n) => n.classList.remove('is-rolling')); reels.forEach((r) => r.remove()); });
    }

    /* case photos: a gentle push-in, and the picture drifts inside its frame */
    $$('.ph__frame').forEach((frame) => {
      const img = $('img', frame);
      extra.push(arm(frame, () => {
        const small = matchMedia('(max-width: 960px)').matches;
        const a = gsap.fromTo(frame, { scale: small ? 0.96 : 0.92 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: endAt(frame, 1, 0.6), invalidateOnRefresh: true, scrub: 0.3 } });
        const b = small ? null : gsap.fromTo(img, { yPercent: -5, scale: 1.1 }, { yPercent: 5, scale: 1.1, ease: 'none', scrollTrigger: { id: 'parallax-photo', trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } });
        return () => { [a, b].forEach((t) => { t?.scrollTrigger?.kill(); t?.kill(); }); gsap.set([frame, img], { clearProps: 'transform' }); };
      }));
    });

    /* how I work: the quote inks in word by word (both ways); method numbers switch on */
    const q = $('[data-ink]');
    if (q) {
      extra.push(arm(q, () => {
        q.classList.add('is-inking');
        const unwrap = wrapWords(q);
        const tw = gsap.fromTo($$('.w__i', q), { opacity: 0 }, { opacity: 1, ease: 'none', stagger: 0.12, duration: 0.3, scrollTrigger: { trigger: q, start: startAt(q, 0.88, 0.5), end: endAt(q, 0.88, 0.5), invalidateOnRefresh: true, scrub: 0.4 } });
        return () => { tw.scrollTrigger?.kill(); tw.kill(); unwrap(); q.classList.remove('is-inking'); };
      }));
    }
    $$('.mrow').forEach((r) => {
      extra.push(arm(r, () => {
        const st = ScrollTrigger.create({ trigger: r, start: 'top 85%', end: 'bottom -100%', toggleClass: 'is-on' });
        const unQA = qaRegister({ el: r, name: 'method row', kind: 'timed', at: 0.85, budget: 600, done: () => r.classList.contains('is-on') });
        return () => { unQA(); st.kill(); };
      }));
      if (onScreen(r)) r.classList.add('is-on');
    });
  });

  /* exhibits, scrubbed by the story next to them (tall screens) or by their own position (phones, short laptops) */
  $$('.case').forEach((cs) => {
    const ex = $('.exhibit', cs);
    if (!ex) return;
    const story = $('.story', cs), steps = $$('.step', cs), tabs = $$('.phases a', cs);
    const tl = builders[ex.dataset.ex](ex);
    tl.progress(1);
    const paint = (p) => {
      const on = Math.min(2, Math.floor(p * 3 + 0.0001));
      tabs.forEach((b, i) => {
        const f = Math.max(0, Math.min(1, p * 3 - i));
        b.querySelector('i').style.setProperty('--f', f.toFixed(3));
        b.classList.toggle('is-on', i === on || f >= 1);
      });
      ex.dispatchEvent(new CustomEvent('exprogress', { detail: p }));
    };
    paint(1);
    steps.forEach((s) => s.classList.add('is-on'));
    const wire = (trigger, opts, stepOpts) => arm(ex, () => {
      steps.forEach((s) => s.classList.remove('is-on'));
      const st = ScrollTrigger.create({ trigger, ...opts, scrub: 0.5, animation: tl, invalidateOnRefresh: true, onUpdate: (s) => paint(s.progress) });
      const sts = steps.map((s) => ScrollTrigger.create({ trigger: s, ...stepOpts, toggleClass: 'is-on' }));
      const unQA = qaRegister({ el: trigger, visual: ex, name: `home exhibit ${ex.dataset.ex}`, kind: 'scroll', st, progress: () => tl.progress() });
      paint(st.progress);
      return () => { unQA(); st.kill(); sts.forEach((x) => x.kill()); };
    });
    // tall screens: the exhibit is sticky beside the story, and the story's three steps scrub its three phases. It is
    // complete when the story's end comes up to 88 % of the screen, and always a little before the exhibit moves on.
    const release = () => {
      const g = ex.parentElement.getBoundingClientRect();
      return g.bottom + scrollY - (parseFloat(getComputedStyle(ex).top) || 0) - ex.offsetHeight;
    };
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 961px) and (min-height: 720px)', () =>
      wire(story, {
        start: 'top 62%',
        end: () => Math.min(story.getBoundingClientRect().bottom + scrollY - innerHeight * 0.88, release() - innerHeight * 0.12),
      }, { start: 'top 62%', end: 'bottom 62%' }));
    // phones and short laptops: the exhibit's own position, finished while it is in view (kit/util.js span)
    mm.add('(prefers-reduced-motion: no-preference) and (max-width: 960px), (prefers-reduced-motion: no-preference) and (max-height: 719px)', () =>
      wire(ex, { start: startAt(ex, 0.92, 0.6), end: endAt(ex, 0.92, 0.6) }, { start: 'top 75%', end: 'bottom 40%' }));
    extra.push(() => {
      tl.progress(1).kill();
      tabs.forEach((b) => { b.querySelector('i').style.removeProperty('--f'); b.classList.remove('is-on'); });
      steps.forEach((s) => s.classList.remove('is-on'));
      ex.dispatchEvent(new CustomEvent('exfinished'));
    });
  });

  /* two-lane timeline: the lane lines fill with scroll; each node switches on when the line reaches its year */
  const tlWrap = $('.tl2');
  if (tlWrap) {
    const lines = $$('.tl2__line i', tlWrap), list = $('.tl2__list', tlWrap), items = $$('.tl2__item', tlWrap);
    mm.add({ wide: '(prefers-reduced-motion: no-preference) and (min-width: 1181px)', narrow: '(prefers-reduced-motion: no-preference) and (max-width: 1180px)' }, (ctx) => {
      const { wide } = ctx.conditions;
      const draw = (p) => {
        if (wide) lines.forEach((l) => l.style.setProperty('--t', p.toFixed(3)));
        else list.style.setProperty('--t', p.toFixed(3));
        items.forEach((it, i) => {
          const at = wide ? (+it.style.getPropertyValue('--col') - 1) / 6 + 0.02 : (i / (items.length - 1)) * 0.96;
          it.classList.toggle('is-on', p >= at);
        });
      };
      draw(1);
      const off = arm(tlWrap, () => {
        const st = ScrollTrigger.create({ trigger: tlWrap, start: startAt(tlWrap, 0.85, 0.6), end: endAt(tlWrap, 0.85, 0.6), invalidateOnRefresh: true, scrub: 0.4, onUpdate: (s) => draw(s.progress) });
        const unQA = qaRegister({ el: tlWrap, name: 'timeline', kind: 'scroll', st, progress: () => st.progress });
        draw(st.progress);
        return () => { unQA(); st.kill(); };
      });
      return () => { off(); lines.forEach((l) => l.style.removeProperty('--t')); list.style.removeProperty('--t'); items.forEach((it) => it.classList.remove('is-on')); };
    });
  }

  /* desktop pointer: magnetic buttons and the case-index preview that follows the mouse */
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (hover: hover) and (pointer: fine)', () => {
    const offs = [];
    $$('.magnet').forEach((b) => {
      const xTo = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3' });
      const yTo = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
      const cap = (v) => Math.max(-14, Math.min(14, v));
      const move = (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = b.getBoundingClientRect();
        xTo(cap((e.clientX - (r.left + r.width / 2)) * 0.22));
        yTo(cap((e.clientY - (r.top + r.height / 2)) * 0.35));
      };
      const leave = () => { xTo(0); yTo(0); };
      b.addEventListener('pointermove', move);
      b.addEventListener('pointerleave', leave);
      offs.push(() => { b.removeEventListener('pointermove', move); b.removeEventListener('pointerleave', leave); gsap.set(b, { clearProps: 'transform' }); });
    });
    offs.push(follower());
    return () => offs.forEach((f) => f());
  });

  addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return {
    stop() {
      mm.revert();
      extra.splice(0).forEach((f) => f());
      root.classList.remove('motion');
    },
  };
}

// Case index: the case photo follows the mouse over the list (fine pointer only; everyone else sees inline thumbnails).
function follower() {
  const list = $('.index');
  if (!list || !root.classList.contains('has-follower')) return () => {};
  const rows = $$('a', list);
  const card = document.createElement('div');
  card.className = 'follower';
  card.setAttribute('aria-hidden', 'true');
  const imgs = rows.map((a) => {
    const i = document.createElement('img');
    i.alt = '';
    i.width = 320;
    i.height = 200;
    i.decoding = 'async';
    i.dataset.src = a.dataset.preview;
    i.style.opacity = '0';
    card.appendChild(i);
    return i;
  });
  document.body.appendChild(card);
  const W = 320, H = 200;
  const xTo = gsap.quickTo(card, 'x', { duration: 0.45, ease: 'power3' });
  const yTo = gsap.quickTo(card, 'y', { duration: 0.45, ease: 'power3' });
  let current = -1, shown = false, lastX = 0, lastY = 0, loaded = false;

  // the photo follows the pointer upright (Sep 24: photos never tilt)
  const place = (x, y) => {
    const nx = Math.min(innerWidth - W - 16, x + 28);
    const ny = Math.max(16, Math.min(innerHeight - H - 16, y - H / 2));
    xTo(nx); yTo(ny);
  };
  const select = (i) => {
    if (i === current) return;
    current = i;
    rows.forEach((a, k) => a.classList.toggle('is-hover', k === i));
    imgs.forEach((im, k) => { im.style.opacity = k === i ? '1' : '0'; });
  };
  const show = (x, y) => {
    if (!loaded) { imgs.forEach((im) => { im.src = im.dataset.src; }); loaded = true; }
    if (shown) return;
    shown = true;
    gsap.set(card, { x: Math.min(innerWidth - W - 16, x + 28), y: Math.max(16, y - H / 2), visibility: 'visible' });
    gsap.to(card, { clipPath: 'inset(0 0 0% 0)', duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
  };
  const hide = () => {
    if (!shown) return;
    shown = false;
    select(-1);
    gsap.to(card, { clipPath: 'inset(0 0 100% 0)', duration: 0.25, ease: 'power2.in', overwrite: 'auto', onComplete: () => { if (!shown) gsap.set(card, { visibility: 'hidden' }); } });
  };
  const enter = (e) => {
    const i = rows.indexOf(e.currentTarget);
    show(e.clientX, e.clientY);
    select(i);
  };
  const move = (e) => {
    if (e.pointerType !== 'mouse') return;
    lastX = e.clientX; lastY = e.clientY;
    if (shown) place(e.clientX, e.clientY);
  };
  const leaveList = () => hide();
  rows.forEach((a) => a.addEventListener('pointerenter', enter));
  list.addEventListener('pointermove', move, { passive: true });
  list.addEventListener('pointerleave', leaveList);
  // scrolling with a still mouse: find the row under the pointer once scrolling pauses
  let t = 0;
  const onScroll = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (!lastX && !lastY) return;
      const el = document.elementFromPoint(lastX, lastY);
      const a = el && el.closest('.index a');
      if (a) { show(lastX, lastY); select(rows.indexOf(a)); place(lastX, lastY); } else hide();
    }, 80);
  };
  addEventListener('scroll', onScroll, { passive: true });
  return () => {
    rows.forEach((a) => { a.removeEventListener('pointerenter', enter); a.classList.remove('is-hover'); });
    list.removeEventListener('pointermove', move);
    list.removeEventListener('pointerleave', leaveList);
    removeEventListener('scroll', onScroll);
    clearTimeout(t);
    card.remove();
  };
}
