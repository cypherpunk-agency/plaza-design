/**
 * The stacks (story Level 7, P15 NRLU 404 0451, the end of Act I): terminal 2
 * behind the harbor pier, a scene of the harbor's place (city.ts). Container
 * blocks A, B and C, crane STS-2, the Port Authority's thermal gate, NIGHT
 * FERRY 7 at berth 4, and the Registry's watchdog walking port → crane → ferry.
 * Moth is in a reefer somewhere in block B.
 *
 * Its devices are data/stacks.json; the crane's lifts, the gate's timing, the
 * watchdog's wiring check and the end of Act I are rules.ts; STS-2's camera is
 * scope.ts; the drawing is scene.ts. Ways out: the gate booth back to the pier,
 * and the lane to warehouse 4 (scenes/warehouse.ts).
 */

import { STACKS } from '../data';
import type { SceneDef } from '../scenes/kit';
import { stacksRulesFor } from './rules';
import { scopePanel } from './scope';
import { drawStacks, drawStacksFront, L, PEOPLE, STACKS_W } from './scene';

export { ACT1_FLAG, ACT2_CUT, CONTACT_FLAG, SPIRE_FLAG, STACKS_RULES_SHAPE } from './rules';

/** The tea urn on its crate by block C: what the night shift runs on. */
const URN_X = 672;

export const stacks: SceneDef = {
  id: 'stacks',
  name: 'the stacks',
  width: STACKS_W,
  spawn: L.spawn,
  ambient: { sky: true, weather: true },
  exits: [
    { id: 'harbor', x: L.gate, to: 'harbor', at: 'stacks', label: '[E] PIER', promptH: 82 },
    { id: 'warehouse', x: L.lane, to: 'warehouse', at: 'stacks', label: '[E] WAREHOUSE 4', promptH: 92 },
  ],
  intro: [
    'Terminal 2, berth 4. A crane, a gate, a ferry waiting for one box.',
    'Somewhere in these stacks is a container the yard system lost. I would bet my deck it has Moth\'s number on it.',
  ],
  pixel: 'along',
  data: STACKS,
  rules: (player) => stacksRulesFor(player),
  panels: { scope: scopePanel },
  drawBackdrop: drawStacks,
  drawFront: drawStacksFront,
  people: PEOPLE,
  readables: [
    { id: 'notice', x: L.notice, name: 'PORT AUTHORITY', promptH: 86, pages: [
      'TERMINAL 2 · ALL OUTBOUND CARGO PASSES THE THERMAL GATE AT BERTH 4.',
      'A CONTAINER WARMER THAN ITS LABEL IS HELD FOR INSPECTION. PERSONS FOUND IN CARGO ARE RETURNED TO THEIR REGISTERED ADDRESS. PERSONS WITHOUT ONE ARE RETURNED TO THE REGISTRY.',
    ] },
  ],
  uses: [
    { id: 'urn', x: URN_X, label: '[E] TEA URN', name: 'TEA URN', promptH: 52, use: (c) => {
      if (c.has('tea')) return ['(A note on the urn: ONE CUP EACH. YOU KNOW WHO YOU ARE.)', 'You do know who you are. You already have a cup.'];
      c.add('tea');
      return ['(You pour a paper cup of black tea from the night shift\'s urn. Nobody stops you. Nobody sees you. Those are the same thing now.)'];
    } },
  ],
};
