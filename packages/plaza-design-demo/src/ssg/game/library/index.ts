/**
 * The public library (Act I, between Capsule 7B and Downtown's net puzzles; P16 Long overdue):
 * Downtown's branch, on the street west of the noodle stall. The books were digitized years ago;
 * the building is kept for the chairs. The public terminals give each verified identity thirty
 * minutes; you have none. The library's own LAN (net.json: reachable only from inside) is the way:
 * the card reader knows the catalog, the printer knows SOFTWARE LENDING, the printer's stuck job
 * names the borrower, and renewing an eleven-year-old loan gets you `scan.so`.
 *
 * Its devices and nodes are data/library.json; the one goal the code ticks is rules.ts; the
 * drawing and its life (the librarian, the regulars who come for the heating, SHELF-E, the cat)
 * are scene.ts. The way out is the door, back onto the street.
 */

import { LIBRARY } from '../data';
import type { SceneDef } from '../scenes/kit';
import { LIBRARY_RULES } from './rules';
import { drawLibrary, L, LIBRARY_W, PEOPLE } from './scene';

export { LIBRARY_RULES } from './rules';
export { drawLibraryFront } from './scene';

/** The library, complete: data, rules, drawing, its life, the door. */
export const library: SceneDef = {
  id: 'library',
  name: 'the public library',
  // facing (light.ts): the reading room's tall windows look west over Downtown's towers
  facing: 270,
  width: LIBRARY_W,
  spawn: L.spawn,
  exits: [{ id: 'downtown', x: L.door, to: 'downtown', at: 'library', label: '[E] DOWNTOWN', promptH: 82 }],
  intro: (touch) => [
    'The public library. Warm. Somebody is paying for the heating, and it is not anybody here.',
    'Terminals over there. Thirty minutes each, for people who exist.',
    touch ? 'HACK shows how the room is wired.' : 'H shows how the room is wired.',
  ],
  pixel: 'along',
  data: LIBRARY,
  rules: LIBRARY_RULES,
  drawBackdrop: drawLibrary,
  people: PEOPLE,
  readables: [
    { id: 'notice', x: L.notice, name: 'NOTICE BOARD', promptH: 110, pages: [
      'PUBLIC LIBRARY · DOWNTOWN BRANCH. COLLECTION DIGITIZED 2049. BUILDING RETAINED FOR SEATING.',
      'PUBLIC TERMINALS: 30 MINUTES PER VERIFIED IDENTITY PER DAY. UNUSED MINUTES ARE NOT CARRIED OVER.',
      'SOFTWARE LENDING: SUSPENDED PENDING RETURNS.',
    ] },
    { id: 'terminal3', x: L.seats[2] + 6, name: 'TERMINAL 3', promptH: 62, pages: [
      'PRESENT CARD AT THE READER.',
      'IDENTITY: NOT PRESENTED. SESSION: 00:00 OF 30:00.',
    ] },
    { id: 'book', x: L.book, name: 'REFERENCE ONLY', promptH: 64, pages: [
      'A paper book, chained to its stand. The title has worn off the spine.',
      'A bus ticket marks page 212. Yesterday it was page 211.',
    ] },
  ],
  uses: [
    { id: 'chair', x: L.chairs[3], label: '[E] SIT DOWN', name: 'YOU', promptH: 40, h: 20, use: () => [
      'I sit for a minute. The radiator ticks. Nobody verifies anything.',
      'It is the warmest I have been since Tuesday.',
    ] },
  ],
};
