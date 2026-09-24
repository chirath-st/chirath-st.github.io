// Case 03 globe: the pure math (no DOM), shared by the live piece (globe.js) and the poster generator.
// Orthographic view of a unit sphere: x right, y up, z towards the reader. lat/lon in degrees.
const D2R = Math.PI / 180;

export const CITIES = {
  cpt: { lat: -33.92, lon: 18.42 }, // Cape Town (Omnisient)
  bkk: { lat: 13.76, lon: 100.5 },  // Bangkok (BuzzeBees)
};
// the view at the start of the scroll (Cape Town in front) and the finished view (both cities and the whole line)
export const VIEW_START = { lat: -24, lon: 8 };
export const VIEW_END = { lat: -6, lon: 60 };
// the stage is drawn in a 500 × 420 box; the globe sits at (CX, CY) with radius R
export const STAGE = { w: 500, h: 420, cx: 250, cy: 214, r: 178 };

export function v3(lat, lon) {
  const a = lat * D2R, b = lon * D2R;
  return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
}

// rotation that brings (lat, lon) to the front, then an optional turn (yaw, pitch in degrees) from dragging
export function rotation(lat, lon, yaw = 0, pitch = 0) {
  const l = -(lon + yaw) * D2R, p = (lat + pitch) * D2R;
  const cl = Math.cos(l), sl = Math.sin(l), cp = Math.cos(p), sp = Math.sin(p);
  return (v) => {
    const x = v[0] * cl + v[2] * sl;
    const z1 = -v[0] * sl + v[2] * cl;
    return [x, v[1] * cp - z1 * sp, v[1] * sp + z1 * cp];
  };
}

export function landPoints(mask, n) {
  const bin = typeof atob === 'function' ? atob(mask) : Buffer.from(mask, 'base64').toString('binary');
  const GA = Math.PI * (3 - Math.sqrt(5));
  const out = [];
  for (let i = 0; i < n; i++) {
    if (!(bin.charCodeAt(i >> 3) & (1 << (i & 7)))) continue;
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), t = i * GA;
    out.push(Math.cos(t) * r, y, Math.sin(t) * r);
  }
  return new Float32Array(out);
}

// points along the great circle from A to B, lifted off the surface by h at the middle
export function arcPoints(A, B, h = 0.14, steps = 96) {
  const d = Math.min(1, Math.max(-1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
  const w = Math.acos(d), sw = Math.sin(w), out = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, s0 = Math.sin((1 - t) * w) / sw, s1 = Math.sin(t * w) / sw, L = 1 + h * Math.sin(Math.PI * t);
    out.push([(s0 * A[0] + s1 * B[0]) * L, (s0 * A[1] + s1 * B[1]) * L, (s0 * A[2] + s1 * B[2]) * L]);
  }
  return out;
}

// is a rotated point in front (on the near side, or lifted clear of the disc)?
export const seen = (q) => q[2] > 0 || q[0] * q[0] + q[1] * q[1] > 1;

export const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const lerp = (a, b, t) => a + (b - a) * t;
