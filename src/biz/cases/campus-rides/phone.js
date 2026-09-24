// Case 04 · Exhibit 6: the prototype, redrawn. Works alongside the kit stepper (which switches the screens): tap a car
// on the map for its demo ride, "Request to join", the dark-mode switch, and the phone's own tab bar.
// Nothing here is motion, so it runs in every mode. JS off: the four screens are listed side by side.
import { $$ } from '../../kit/util.js';

const RIDES = [
  { t: 'Leaves 9:40', r: 'Busch → College Ave', s: '2 of 3 seats taken' },
  { t: 'Leaves 10:05', r: 'Livingston → Cook/Douglass', s: '2 of 3 seats taken' },
  { t: 'Leaves 11:15', r: 'College Ave → Livingston', s: '2 of 3 seats taken' },
];
const press = (node, fn) => {
  node.addEventListener('click', fn);
  node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
};

export function init(el) {
  const device = el.querySelector('.cr-ph__device');
  const cars = $$('.cr-sm-car', el);
  const t = el.querySelector('.cr-sheet__t');
  const r = el.querySelector('.cr-sheet__r');
  const s = el.querySelector('.cr-sheet__s');
  const join = el.querySelector('.cr-scr__join');
  const sw = el.querySelector('[data-dark-switch]');
  const nav = $$('.k-stp__nav button', el);
  const tabs = $$('.cr-ph__tabs span', el);
  if (!device) return;

  const resetJoin = () => { if (join) { join.classList.remove('is-done'); join.textContent = 'Request to join'; join.setAttribute('aria-pressed', 'false'); } };
  const pick = (i) => {
    cars.forEach((c, k) => { c.classList.toggle('is-on', k === i); c.setAttribute('aria-pressed', String(k === i)); });
    if (t) t.textContent = RIDES[i].t;
    if (r) r.textContent = RIDES[i].r;
    if (s) s.textContent = RIDES[i].s;
    resetJoin();
  };
  cars.forEach((c, i) => {
    c.setAttribute('role', 'button');
    c.tabIndex = 0;
    c.setAttribute('aria-pressed', String(c.classList.contains('is-on')));
    c.setAttribute('aria-label', `Demo ride, ${RIDES[i].t.toLowerCase()}, ${RIDES[i].r.replace('→', 'to')}`);
    press(c, () => pick(i));
  });
  if (join) {
    join.setAttribute('role', 'button');
    join.tabIndex = 0;
    join.setAttribute('aria-pressed', 'false');
    press(join, () => {
      const on = !join.classList.contains('is-done');
      join.classList.toggle('is-done', on);
      join.textContent = on ? 'Requested ✓' : 'Request to join';
      join.setAttribute('aria-pressed', String(on));
    });
  }
  if (sw) {
    sw.setAttribute('role', 'switch');
    sw.tabIndex = 0;
    sw.setAttribute('aria-checked', 'false');
    sw.setAttribute('aria-label', 'Dark mode');
    press(sw, () => {
      const on = !sw.classList.contains('is-on');
      sw.classList.toggle('is-on', on);
      sw.setAttribute('aria-checked', String(on));
      device.classList.toggle('is-dark', on);
    });
  }
  tabs.forEach((tab, i) => tab.addEventListener('click', () => nav[i]?.click()));
}
