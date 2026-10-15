/**
 * The set register (ART-GUIDE §12, "Build scenery once, reuse it everywhere"). Every landmark or
 * recurring prop is drawn by one function in this folder, one file each; scenes and cutscenes call
 * it, nobody copies its drawing code. When you call one from somewhere new, add the user here;
 * `grep` a set's id or file to find everywhere it appears.
 *
 * Conventions: a set draws in its own frame (origin at its foot, x to the right, heights up:
 * y = -h), and the caller places it (`placed` in view.ts: translate, scale). The train car takes
 * the caller's `y` instead, and the containers draw on a scene `View` (`frameView` for a frame).
 */

export { CH, container, PAL, stack, type Crate } from './containers';
export { drawGantry, GANTRIES, STS2, type Gantry } from './crane';
export { drawSpire, SPIRE_LIGHT } from './spire';
export { CAR, drawTrainCar } from './train-car';
export { SALT, saltLights, saltShell, saltUnder } from './beach-bar';
export { drawPalm } from './palm';
export { drawGalleriaDome } from './galleria-dome';
export { drawTower, towerRow } from './downtown-towers';
export { frameView, placed } from './view';

export interface SetEntry {
  id: string;
  file: string;
  /** One line: what it is. */
  what: string;
  /** Every scene and cutscene that draws it (file: what for). */
  users: string[];
}

export const SETS: SetEntry[] = [
  {
    id: 'spire', file: 'sets/spire.ts',
    what: 'The Spire from far off: its foot in the bay, the deck, three towers, the Registry antenna and its red light.',
    users: ['stacks/scene.ts: the bay in the far band', 'cutscenes/act2.ts: across the water at the end of Act I', 'title/glide.ts: in the bay, nameless, one red light'],
  },
  {
    id: 'crane', file: 'sets/crane.ts',
    what: 'The ship-to-shore gantry crane frame (STS-1, STS-2, STS-3): legs, beams, A-frame, boom, machinery house, warning lights.',
    users: ['scenes/harbor.ts: STS-1 and STS-3 on the pier', 'stacks/scene.ts: STS-2 over the blocks (back and front parts)', 'title/glide.ts: all three along the harbor'],
  },
  {
    id: 'containers', file: 'sets/containers.ts',
    what: 'The shipping container (seeded paint, rust, codes, placards) and a crooked stack of them.',
    users: ['scenes/harbor.ts: the pier stacks, the arch, the crane loads, the bonded store', 'stacks/scene.ts: blocks A, B, C and the crane loads', 'title/glide.ts: the stacks under STS-2, NRLU 404 0451 among them'],
  },
  {
    id: 'train-car', file: 'sets/train-car.ts',
    what: 'A LINE 0 car from outside: body, waist stripe, doors that slide open, lit windows with riders, headlight and destination on the lead car.',
    users: ['scenes/line.ts drawPlatformTrain: the platforms (metro, galleriaStation, harborStation)', 'title/glide.ts: the train diving into its tunnel'],
  },
  {
    id: 'beach-bar', file: 'sets/beach-bar.ts',
    what: 'SALT, the beach bar: the shack on stilts, thatch, lit windows, the SALT neon, the ladder, string lights on two poles.',
    users: ['beach/scene.ts: SALT (LIME, the counter and the jukebox are the scene\'s)', 'title/glide.ts: on the sand as the glide passes'],
  },
  {
    id: 'palm', file: 'sets/palm.ts',
    what: 'A palm silhouette: curved tapering trunk, swaying fronds, a rim of the sun on one side. Seeded.',
    users: ['title/glide.ts: the title\'s frame and the beach'],
  },
  {
    id: 'galleria-dome', file: 'sets/galleria-dome.ts',
    what: 'The Galleria\'s glass dome on its base, the mall\'s landmark on the skyline.',
    users: ['scenes/train.ts: over Galleria on the far skyline from the car', 'title/glide.ts: between the bay and Downtown'],
  },
  {
    id: 'downtown-towers', file: 'sets/downtown-towers.ts',
    what: 'Downtown as a skyline: tower slabs with seeded lit windows, rooftop masts and tanks, signs on plates.',
    users: ['title/glide.ts: three rows deep, closing in on the sun'],
  },
];
