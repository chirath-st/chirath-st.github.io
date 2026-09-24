// Case 03 · Exhibit 1: a small dot globe, drawn by hand on a 2D canvas (no 3D library). As the picture scrolls
// through the screen the globe turns from Cape Town towards Bangkok and the line between them draws itself, with the
// client's question riding its tip; scrolling back up plays it backwards (it depends only on scroll position).
// Drag it (mouse, pen, or sideways on touch) or use the arrow keys to turn it; it eases back to the story view.
// The HTML holds the finished picture (poster SVG + labels) for JS off, reduced motion and "Turn off animation".
import { arm, track, armOn, armOff, clamp } from '../../kit/util.js';
import { N, MASK } from './globe-land.js';
import { CITIES, VIEW_START, VIEW_END, STAGE, v3, rotation, landPoints, arcPoints, seen, ease, lerp } from './globe-math.js';

const D2R = Math.PI / 180;
let POINTS = null;

export function init(stage, ctx) {
  const chips = { cpt: stage.querySelector('[data-city="cpt"]'), bkk: stage.querySelector('[data-city="bkk"]') };
  const talk = stage.querySelector('.cd-talk');
  const ask = stage.querySelector('.cd-ask');
  const keep = [chips.cpt, chips.bkk, talk].map((n) => n && [n, n.getAttribute('style')]);
  let disarm = null;

  const build = () => {
    POINTS = POINTS || landPoints(MASK, N);
    const cv = document.createElement('canvas');
    cv.className = 'cd-globe__cv';
    cv.setAttribute('aria-hidden', 'true');
    stage.querySelector('.cd-globe__poster').after(cv);
    const g = cv.getContext('2d');
    if (!g) { cv.remove(); return () => {}; }
    armOn(stage, 'cd-globe');
    stage.tabIndex = 0;
    stage.setAttribute('role', 'group');
    stage.setAttribute('aria-label', 'Globe from Cape Town to Bangkok. Drag it, or use the arrow keys, to turn it.');

    const A = v3(CITIES.cpt.lat, CITIES.cpt.lon), B = v3(CITIES.bkk.lat, CITIES.bkk.lon);
    const ARC = arcPoints(A, B, 0.14, 120);
    let W = 0, H = 0, dpr = 1, k = 1;
    let p = 1, yaw = 0, pitch = 0, dragging = false, released = 0, raf = 0;

    // labels stay inside the stage (a label at the globe's edge must never push the page sideways)
    const place = (el, x, y, show) => {
      if (!el) return;
      const half = el.classList.contains('cd-talk') ? 0 : el.offsetWidth / 2 + 2;
      if (half) x = clamp(x, half, W - half);
      el.style.left = `${((x / W) * 100).toFixed(2)}%`;
      el.style.top = `${((y / H) * 100).toFixed(2)}%`;
      el.classList.toggle('is-off', !show);
    };

    const draw = () => {
      if (!W) return;
      const t = ease(clamp(p / 0.8));
      const lat = lerp(VIEW_START.lat, VIEW_END.lat, t), lon = lerp(VIEW_START.lon, VIEW_END.lon, t);
      const rot = rotation(lat, lon, yaw, pitch);
      const cx = STAGE.cx * k, cy = STAGE.cy * k, R = STAGE.r * k;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      // the disc
      const fx = cx - 0.2 * R, fy = cy - 0.36 * R;
      const grad = g.createRadialGradient(fx, fy, 0, fx, fy, 1.56 * R);
      grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(0.72, '#F2F4F9'); grad.addColorStop(1, '#E4E9F3');
      g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2);
      g.fillStyle = grad; g.fill();
      g.lineWidth = 1; g.strokeStyle = '#C9D4F6'; g.stroke();

      // land dots, in four depth bands (fainter towards the edge)
      const l = -(lon + yaw) * D2R, q = (lat + pitch) * D2R;
      const cl = Math.cos(l), sl = Math.sin(l), cp = Math.cos(q), sp = Math.sin(q);
      const r = Math.max(0.9, R * 0.0078);
      const bands = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      for (let i = 0; i < POINTS.length; i += 3) {
        const px = POINTS[i], py = POINTS[i + 1], pz = POINTS[i + 2];
        const z1 = -px * sl + pz * cl;
        const z = py * sp + z1 * cp;
        if (z <= 0.02) continue;
        const x = cx + (px * cl + pz * sl) * R, y = cy - (py * cp - z1 * sp) * R;
        const b = bands[z > 0.6 ? 3 : z > 0.35 ? 2 : z > 0.15 ? 1 : 0];
        b.moveTo(x + r, y); b.arc(x, y, r, 0, Math.PI * 2);
      }
      [0.18, 0.36, 0.56, 0.74].forEach((a, j) => { g.fillStyle = `rgba(15,33,71,${a})`; g.fill(bands[j]); });

      // the line: a dashed route, and the part drawn so far
      const f = clamp((p - 0.1) / 0.62);
      const P = ARC.map((v) => { const w = rot(v); return [cx + w[0] * R, cy - w[1] * R, seen(w)]; });
      const n = P.length - 1;
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (f < 1) {
        g.setLineDash([3, 5]); g.lineWidth = 1.5; g.strokeStyle = '#93ACEE';
        g.beginPath();
        P.forEach((a, i) => { if (!a[2]) return; if (i && P[i - 1][2]) g.lineTo(a[0], a[1]); else g.moveTo(a[0], a[1]); });
        g.stroke(); g.setLineDash([]);
      }
      let head = null;
      if (f > 0) {
        const upto = f * n, kmax = Math.floor(upto);
        g.lineWidth = 2.6; g.strokeStyle = '#2346D8';
        g.beginPath();
        for (let i = 0; i <= Math.min(kmax, n); i++) {
          const a = P[i];
          if (!a[2]) continue;
          if (i && P[i - 1][2]) g.lineTo(a[0], a[1]); else g.moveTo(a[0], a[1]);
        }
        if (kmax < n) {
          const a = P[kmax], b = P[kmax + 1], s = upto - kmax;
          head = [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] && b[2]];
          if (a[2] && b[2]) g.lineTo(head[0], head[1]);
        }
        g.stroke();
      }

      // the two cities
      const city = (c) => { const w = rot(v3(c.lat, c.lon)); return [cx + w[0] * R, cy - w[1] * R, w[2] > 0.05]; };
      const cpt = city(CITIES.cpt), bkk = city(CITIES.bkk);
      const arrived = f >= 0.995;
      if (cpt[2]) {
        g.beginPath(); g.arc(cpt[0], cpt[1], 5, 0, Math.PI * 2);
        g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.4; g.strokeStyle = '#2346D8'; g.stroke();
      }
      if (bkk[2]) {
        g.beginPath(); g.arc(bkk[0], bkk[1], arrived ? 11 : 8, 0, Math.PI * 2);
        g.fillStyle = arrived ? 'rgba(35,70,216,.14)' : 'rgba(35,70,216,.08)'; g.fill();
        g.beginPath(); g.arc(bkk[0], bkk[1], 5.5, 0, Math.PI * 2);
        g.fillStyle = arrived ? '#2346D8' : '#fff'; g.fill(); g.lineWidth = 2; g.strokeStyle = arrived ? '#fff' : '#2346D8'; g.stroke();
      }
      place(chips.cpt, cpt[0], cpt[1], cpt[2]);
      place(chips.bkk, bkk[0], bkk[1], bkk[2]);
      // the "talks" pill sits under the middle of the line: shown only while that point faces the reader, and kept
      // inside the stage (its CSS shifts it sideways by a share of its width, so clamp with that shift included)
      const mid = P[Math.round(n / 2)];
      const midFront = rot(ARC[Math.round(n / 2)])[2] > 0.08;
      if (talk) {
        const tw = talk.offsetWidth;
        const sx = new DOMMatrixReadOnly(getComputedStyle(talk).transform).m41 || 0;
        place(talk, clamp(mid[0], 4 - sx, W - 4 - tw - sx), mid[1], true);
        talk.classList.toggle('is-on', arrived && midFront);
      }
      if (ask) {
        const on = !!head && head[2] && f > 0.02 && f < 0.9;
        ask.classList.toggle('is-on', on);
        if (head) {
          const aw = ask.offsetWidth;
          const ax = head[0] + 12 + aw > W - 2 ? head[0] - 12 - aw : head[0] + 12;
          ask.style.transform = `translate(${Math.round(clamp(ax, 2, W - aw - 2))}px, ${Math.round(Math.max(2, head[1] - 34))}px)`;
        }
      }
    };

    // spring back to the story view after a drag or a key press
    const loop = () => {
      raf = 0;
      if (!dragging && performance.now() - released > 900 && (yaw || pitch)) {
        yaw *= 0.9; pitch *= 0.9;
        if (Math.abs(yaw) < 0.05 && Math.abs(pitch) < 0.05) { yaw = 0; pitch = 0; }
      }
      draw();
      if (dragging || yaw || pitch) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    const resize = () => {
      const r = stage.getBoundingClientRect();
      if (!r.width) return;
      W = r.width; H = r.height; k = W / STAGE.w;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    // input: drag (mouse / pen both ways, touch sideways only: vertical swipes keep scrolling the page)
    let lx = 0, ly = 0, id = null, touch = false;
    const down = (e) => {
      if (e.button !== 0) return;
      dragging = true; id = e.pointerId; touch = e.pointerType === 'touch';
      lx = e.clientX; ly = e.clientY;
      stage.classList.add('is-drag');
      try { stage.setPointerCapture(id); } catch { /* ignore */ }
      if (!touch) e.preventDefault();
      kick();
    };
    const move = (e) => {
      if (!dragging || e.pointerId !== id) return;
      const s = 360 / Math.max(260, W);
      yaw = clamp(yaw - (e.clientX - lx) * s * 0.5, -150, 150);
      if (!touch) pitch = clamp(pitch + (e.clientY - ly) * s * 0.4, -45, 45);
      lx = e.clientX; ly = e.clientY;
    };
    const up = (e) => {
      if (!dragging || e.pointerId !== id) return;
      dragging = false; released = performance.now();
      stage.classList.remove('is-drag');
      kick();
    };
    const key = (e) => {
      const d = { ArrowLeft: [12, 0], ArrowRight: [-12, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[e.key];
      if (!d) return;
      e.preventDefault();
      yaw = clamp(yaw + d[0], -150, 150); pitch = clamp(pitch + d[1], -45, 45);
      released = performance.now();
      kick();
    };
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('keydown', key);

    const stop = track(stage, (v) => { p = v; kick(); }, { start: 0.95, end: 0.6, name: 'cd-globe' });

    return () => {
      stop();
      ro.disconnect();
      cancelAnimationFrame(raf);
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
      stage.removeEventListener('keydown', key);
      cv.remove();
      keep.forEach((x) => { if (x) { x[0].setAttribute('style', x[1]); x[0].classList.remove('is-off', 'is-on'); } });
      ask?.classList.remove('is-on');
      if (ask) ask.style.transform = '';
      stage.classList.remove('is-drag');
      stage.removeAttribute('tabindex'); stage.removeAttribute('role'); stage.removeAttribute('aria-label');
      armOff(stage, 'cd-globe');
    };
  };

  const start = () => { disarm = arm(stage, build); };
  if (ctx.motion) start();
  return { motion(on) { disarm?.(); disarm = null; if (on) start(); } };
}
