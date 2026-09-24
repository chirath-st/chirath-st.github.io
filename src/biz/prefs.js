// Footer controls on every main page: "Colour: Navy · Blue" (lets Chirath compare the two live) and "Turn off animation".
// Both are remembered in localStorage; the inline head script applies them before first paint.
const root = document.documentElement;

function store(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* private windows can block storage; the switch still works for this page */ }
}

export function initColour() {
  const buttons = [...document.querySelectorAll('[data-accent]')];
  if (!buttons.length) return;
  const paint = () => {
    const blue = root.classList.contains('accent-blue');
    buttons.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.accent === 'blue') === blue)));
  };
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const blue = b.dataset.accent === 'blue';
      root.classList.toggle('accent-blue', blue);
      store('biz-accent', blue ? 'blue' : 'navy');
      // drop ?accent= from the address so a reload keeps the choice just made
      const url = new URL(location.href);
      if (url.searchParams.has('accent')) {
        url.searchParams.delete('accent');
        history.replaceState(history.state, '', url);
      }
      paint();
    })
  );
  paint();
}

// onChange(off) lets the page stop or restart its motion code.
export function initMotionToggle(onChange) {
  const btn = document.querySelector('[data-motion-toggle]');
  if (!btn) return;
  const label = () => { btn.textContent = root.classList.contains('no-motion') ? 'Turn animation back on' : 'Turn off animation'; };
  btn.addEventListener('click', () => {
    const off = !root.classList.contains('no-motion');
    root.classList.toggle('no-motion', off);
    store('biz-motion', off ? 'off' : null);
    if (off) root.classList.remove('has-follower');
    label();
    onChange?.(off);
  });
  label();
}

export function motionAllowed() {
  return (
    !root.classList.contains('no-motion') &&
    matchMedia('(prefers-reduced-motion: no-preference)').matches &&
    !(navigator.connection && navigator.connection.saveData)
  );
}

// Smooth anchor scrolling is switched on only after the page has loaded (see base.css).
export function enableSmoothScroll() {
  const on = () => setTimeout(() => root.classList.add('smooth'), 400);
  if (document.readyState === 'complete') on();
  else addEventListener('load', on, { once: true });
}

// Header progress line (and, on the home page, the "03 / 10 · The cases" counter).
export function initHeader() {
  const bar = document.querySelector('.progress i');
  if (bar) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : '0');
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update, { passive: true });
    update();
  }

  const pn = document.querySelector('[data-pager-n]');
  const pt = document.querySelector('[data-pager-t]');
  const pages = [...document.querySelectorAll('[data-page]')];
  if (!pn || !pages.length || !('IntersectionObserver' in window)) return;
  const set = (el) => {
    const i = pages.indexOf(el);
    pn.textContent = String(i + 1).padStart(2, '0');
    pt.textContent = el.dataset.page;
  };
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) set(e.target); }),
    { rootMargin: '-45% 0px -54% 0px' }
  );
  pages.forEach((p) => io.observe(p));
}
