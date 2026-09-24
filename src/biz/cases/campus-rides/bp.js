// Case 04 · Exhibit 4: the finished picture of the lane diagram. The kit's flow piece draws the line (and moves the
// trip) only while motion is on; with reduced motion or "Turn off animation" this draws the whole line through the six
// steps, so the finished diagram still shows how one trip connects them. It carries k-flow__static, so kit.css hides
// it whenever the moving line is armed. JS off: the numbered steps carry the order.
import { $$ } from '../../kit/util.js';

const NS = 'http://www.w3.org/2000/svg';

function box(n, root) {
  let x = 0, y = 0, m = n;
  while (m && m !== root) { x += m.offsetLeft; y += m.offsetTop; m = m.offsetParent; }
  return { x: x + n.offsetWidth / 2, y: y + n.offsetHeight / 2 };
}

export function init(el) {
  const nodes = $$('[data-flow-node]', el).sort((a, b) => a.dataset.flowNode - b.dataset.flowNode);
  if (nodes.length < 2) return;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'k-flow__svg k-flow__static cr-bp__static');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('class', 'k-flow__done');
  svg.appendChild(path);
  el.prepend(svg);
  const draw = () => {
    if (!el.offsetWidth) return;
    svg.setAttribute('viewBox', `0 0 ${el.offsetWidth} ${el.offsetHeight}`);
    const p = nodes.map((n) => box(n, el));
    let d = `M${p[0].x} ${p[0].y}`;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i];
      if (Math.abs(a.y - b.y) < 8 || Math.abs(a.x - b.x) < 8) d += ` L${b.x} ${b.y}`;
      else { const my = (a.y + b.y) / 2; d += ` L${a.x} ${my} L${b.x} ${my} L${b.x} ${b.y}`; }
    }
    path.setAttribute('d', d);
  };
  new ResizeObserver(draw).observe(el);
  draw();
}
