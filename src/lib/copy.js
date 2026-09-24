// "Copy email" that morphs to "Copied" (rauno.me-style micro-interaction).
export function initCopy() {
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const label = btn.querySelector('[data-copy-label]') || btn;
    const original = label.textContent;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.dataset.state = 'copied';
        label.textContent = 'Copied';
        setTimeout(() => { btn.dataset.state = ''; label.textContent = original; }, 1600);
      } catch {
        window.location.href = `mailto:${btn.dataset.copy}`;
      }
    });
  });
}
