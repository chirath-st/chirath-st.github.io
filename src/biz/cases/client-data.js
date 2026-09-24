// Case page script for /cases/client-data/ only (loaded after story.js). Registers the case-only pieces; each one
// loads lazily when its picture nears the viewport (kit/boot.js), never before first paint.
//   cd-globe  Exhibit 1: dot globe, Cape Town → Bangkok (scroll turns it and draws the line; drag or arrow keys turn it)
//   cd-stack  Exhibit 3: the data set's layers stack up with scroll (and come apart on the way back up)
//   cd-flip   Exhibit 8: result cards that turn over (point, tap or Enter)
import { register } from '../kit/boot.js';

register('cd-globe', () => import('./client-data/globe.js'));
register('cd-stack', () => import('./client-data/stack.js'));
register('cd-flip', () => import('./client-data/flip.js'));
