// /projects/daily-planner/ only (Daily planner), loaded after the template script (briefing.js).
// This page needs no pieces of its own: its four interactions are shared kit pieces, wired in the HTML
// (01 scrub · 02 hotspots · 03 stepper with data-auto · 04 scrub). To add one later:
//   import { register } from '../kit/boot.js';
//   register('dp-name', () => import('./daily-planner/name.js'));   // <div data-kit="dp-name">
export {};
