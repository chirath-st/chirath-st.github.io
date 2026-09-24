// Highlights the sticky-left nav item for the section in view.
export function initSectionNav() {
  const links = [...document.querySelectorAll('[data-section-link]')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        byId.get(e.target.id)?.setAttribute('aria-current', 'true');
      });
    },
    { rootMargin: '-35% 0px -55% 0px', threshold: 0 }
  );
  byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}
