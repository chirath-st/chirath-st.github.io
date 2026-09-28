// /projects/morning-briefing/ only (Morning news briefing), loaded after the template script (briefing.js).
// This page needs no pieces of its own: its four interactions are shared kit pieces, loaded lazily by briefing.js
// (kit/boot.js) when their picture nears the viewport:
//   compare  · Exhibit 1 (band 01): several news sites by hand vs one message, drag to compare
//   hotspots · Exhibit 2 (band 02): the weekday message, part by part (data-kit on the band, list beside the picture)
//   stepper  · Exhibit 3 (band 03): three things I tested (the voice, the pictures, the charts), click to pick
//   scrub    · Exhibit 4 (band 04): the old way crossed out as it scrolls up the screen, and back on the way up
// To add a page piece later:
//   import { register } from '../kit/boot.js';
//   register('mb-name', () => import('./morning-briefing/name.js'));   // <div data-kit="mb-name">
export {};
