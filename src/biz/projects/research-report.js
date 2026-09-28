// /projects/research-report/ only (Research report), loaded after the template script (briefing.js).
// This page needs no pieces of its own: its interactions come from the shared kit, which briefing.js boots (each piece
// loads lazily, after first paint, when its picture nears the viewport; kit/boot.js):
//   hotspots · Exhibit 1 (band 01): the published model, part by part
//   scrub    · Exhibit 2 (band 02): the 95 experiment squares fill row by row; Exhibit 4 (band 04): the bars grow
//   stepper  · Exhibit 3 (band 03): "Act on every signal" / "Hold each position longer" (follows scroll until clicked)
// To add one later:  import { register } from '../kit/boot.js';
//                    register('rr-name', () => import('./research-report/name.js'));   // <div data-kit="rr-name">
export {};
