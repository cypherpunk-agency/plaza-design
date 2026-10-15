/**
 * The beach and SALT, its bar: a real beach at sunset, west of the harbor,
 * with Moth's boat moored at the end of the pier.
 *
 * Its devices (the sunbed kiosk, the jukebox, SALT's mixer, the lifeguard
 * drone, the pier's lamp schedule, the boat) are data/beach.json; the kiosk's
 * billing and the drone's flag running out are rules.ts; the drawing is
 * scene.ts. Its life (people who talk, the cat, ordering a drink, a gull to
 * shoo, a crab, the Registry's notice) is `people`, `uses` and `readables`,
 * like any scene's.
 *
 * Ways out: the stairs at the left end (E) and the left edge itself (walk
 * off) lead up to the promenade and the harbor.
 */

import { BEACH } from '../data';
import type { SceneDef } from '../scenes/kit';
import { BEACH_RULES } from './rules';
import { BEACH_EDGE_X, BEACH_SPAWN, BEACH_W, CRAB, drawBeach, GULL, L, PEOPLE } from './scene';

export { BEACH_RULES } from './rules';
export { BEACH_EDGE_X, BEACH_SPAWN, BEACH_W } from './scene';

/** The beach, complete: data, rules, drawing, its life and the ways out. */
export const beach: SceneDef = {
  id: 'beach',
  name: 'the beach',
  width: BEACH_W,
  spawn: BEACH_SPAWN,
  exits: [
    // the stairs up to the promenade and the harbor (E, the scene's own target)
    { id: 'stairs', x: L.stairs, to: 'harbor', label: '', engine: true },
    // the promenade runs on, west, into the harbor: walk off the left edge (the harbor lands you at its exit 'beach' once it has one)
    { id: 'harbor', x: BEACH_EDGE_X, to: 'harbor', at: 'beach', label: '< HARBOR', edge: 'left' },
  ],
  intro: [
    'A beach. A real one: sand, sea, a sunset nobody is charging for. Yet.',
    "SALT, the bar on stilts, is open. And at the end of the pier there's a boat. Moth's status said \"gone fishing\".",
  ],
  keepFace: true,
  // a real beach, under the harbor's sky: its weather (heat by day; weather.ts climate 'beach')
  ambient: { weather: true },
  pixel: 'along',
  data: BEACH,
  rules: BEACH_RULES,
  drawBackdrop: (x, v, e) => drawBeach(x, e.m, v, e.hover),
  targets: (m) => [{ id: 'stairs', x: L.stairs, label: m.label('prompt.out'), promptH: 116 }],
  use: (id, m, say) => {
    if (id !== 'stairs') return;
    say(m.line('stairs.out'));
    return 'stairs';
  },
  people: PEOPLE,
  readables: [
    { id: 'notice', x: L.board, name: 'PUBLIC BEACH', promptH: 102, pages: [
      'PUBLIC BEACH. OPEN TO VERIFIED PERSONS 06:00–22:00.',
      'TOWELS MUST DISPLAY A VALID ID. SAND IS MUNICIPAL PROPERTY. DO NOT REMOVE.',
      'UNVERIFIED BATHERS: SECTOR 4 (THE ROCKS). SWIMMING BEYOND THE BUOY IS NOT RECORDED AND NOT ADVISED.',
    ] },
  ],
  uses: [
    { id: 'order', x: L.order, label: '[E] ORDER', price: 2, name: 'LIME', promptH: 70, h: 70, use: (c) => {
      if (!c.pay(2)) return ['Two tokens. You have ' + c.tokens + '. I would lend you one, but I remember everything.', 'The jukebox is free. Just saying. Nobody listens to the bartender.'];
      c.set('beach:drink');
      return ['One SALT SPECIAL. Mostly lime. Do not tell the lime.', "Moth's usual was water with a slice of me in it. Cheaper. Moth was always cheaper."];
    } },
    { id: 'gull', x: L.gull, label: '[E] SHOO', name: 'GULL', promptH: 62, h: 50, use: (c) => {
      GULL.shooed = c.t;
      return GULL.n++ % 2 === 0
        ? ['The gull looks at your hands, finds no chips, and leaves in disgust.']
        : ['The gull circles once and lands back on its post. It was always going to come back.'];
    } },
    { id: 'crab', x: L.crab, label: '[E] POKE', name: 'CRAB', promptH: 24, h: 16, use: () => (CRAB.n++ % 2 === 0
      ? ['The crab raises one claw. You lower your hand. Fair.']
      : ['The crab walks off sideways, which is the only way it knows, then comes back the same way.']) },
  ],
};
