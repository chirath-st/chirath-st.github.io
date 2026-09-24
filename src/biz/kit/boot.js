// Story-page interaction kit: the loader. Every piece is an enhancement of HTML that is already the finished,
// readable picture (JS off, reduced motion and "Turn off animation" all show that picture).
//   <div data-kit="hotspots">  or several at once: data-kit="scrub hotspots"
// Nothing loads before first paint: after `load` + idle, each [data-kit] element is watched, and its piece's code
// is imported when the element comes within one screen of the viewport. A piece module exports
//   init(el, ctx) → optional api { motion(on) }   (may be async)
// ctx = { motion, fine }: motion is false under reduced motion, Save-Data or "Turn off animation".
// Case pages add their own pieces with register('xx-name', () => import('./xx-name.js')) from src/biz/cases/<slug>.js.
import { motionAllowed } from '../prefs.js';
import { finePointer } from './util.js';

const loaders = {
  hotspots: () => import('./hotspots.js'),
  scrub: () => import('./scrub.js'),
  flow: () => import('./flow.js'),
  compare: () => import('./compare.js'),
  chat: () => import('./chat.js'),
  stepper: () => import('./stepper.js'),
  sort: () => import('./sort.js'),
  depth: () => import('./depth.js'),
  count: () => import('./count.js'),
};

export function register(name, loader) {
  loaders[name] = loader;
}

// Keyboard: parts that become controls only when their piece loads (near the screen) join the tab order now, so a
// reader tabbing down from the top can reach them. If one takes focus before its piece is ready, focus is handed to it
// again once the piece is armed (data-armed~="<name>"), so it lights up. Hotspot parts are wired by boot(); a case adds
// its own with focusEarly('xx-piece', '.selector') from src/biz/cases/<slug>.js.
export function focusEarly(name, sel) {
  document.querySelectorAll(`[data-kit~="${name}"]`).forEach((fig) => {
    fig.querySelectorAll(sel).forEach((n) => {
      if (!n.hasAttribute('tabindex')) n.tabIndex = 0;
      n.setAttribute('role', 'button');
      n.addEventListener('focus', () => {
        const ready = () => (fig.dataset.armed || '').split(' ').includes(name);
        if (ready()) return;
        const t0 = Date.now();
        const wait = () => {
          if (document.activeElement !== n) return;
          if (ready()) { n.blur(); n.focus({ preventScroll: true }); return; }
          if (Date.now() - t0 < 4000) setTimeout(wait, 80);
        };
        setTimeout(wait, 80);
      }, { once: true });
    });
  });
}

const apis = [];
const ctx = () => ({ motion: motionAllowed(), fine: finePointer() });

async function start(el, name) {
  const load = loaders[name];
  if (!load) { console.warn(`[kit] unknown piece "${name}"`); return; }
  try {
    const mod = await load();
    const api = await mod.init(el, ctx());
    if (api) apis.push(api);
  } catch (e) {
    console.warn(`[kit] ${name} failed`, e); // the finished HTML stays in place
  }
}

let booted = false;
export function boot() {
  if (booted) return;
  booted = true;
  focusEarly('hotspots', '.k-hs__stage [data-spot]');
  const scan = () => {
    const els = [...document.querySelectorAll('[data-kit]')];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.dataset.kit.split(/\s+/).filter(Boolean).forEach((n) => start(e.target, n));
      });
    }, { rootMargin: '100% 0px' });
    els.forEach((el) => io.observe(el));
    document.documentElement.dataset.kitReady = '';
  };
  const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 200));
  if (document.readyState === 'complete') idle(scan);
  else addEventListener('load', () => idle(scan), { once: true });
}

// "Turn off animation" (footer): every live piece settles on its finished picture, or starts moving again.
export function setMotion(on) {
  const allowed = on && motionAllowed();
  apis.forEach((a) => { try { a.motion?.(allowed); } catch { /* keep going */ } });
}
