// Case 04 (/cases/campus-rides/) only, loaded after story.js. Registers the case's own pieces; each one loads lazily,
// after first paint, when its picture comes within a screen of the viewport (kit/boot.js). The HTML is always the
// finished picture; see design/STORY_TEMPLATE_v2.md.
import { register } from '../kit/boot.js';

register('cr-drive', () => import('./campus-rides/drive.js')); // Ex 1: the bus drives in with scroll
register('cr-flip', () => import('./campus-rides/flip.js'));   // Ex 2: the idea card turns over (scroll, click, key)
register('cr-map', () => import('./campus-rides/map.js'));     // Ex 3: riders fill empty seats, cars drive on
register('cr-bp', () => import('./campus-rides/bp.js'));       // Ex 4: the whole line, when motion is off
register('cr-seats', () => import('./campus-rides/seats.js')); // Ex 5: pick the riders; fills itself on scroll
register('cr-phone', () => import('./campus-rides/phone.js')); // Ex 6: tap a car, dark mode, tab bar
register('cr-deck', () => import('./campus-rides/deck.js'));   // Ex 7: the pitch deck is dealt from a pile

// 3D only with a purpose (Sep 24): the phone (Ex 6) is the one object on this page that turns towards the pointer.
// The kit's depth piece acts only on elements with data-tilt; mark the phone here too, in case the HTML does not yet.
document.querySelector('.cr-ph__tilt[data-kit~="depth"]')?.setAttribute('data-tilt', '');
