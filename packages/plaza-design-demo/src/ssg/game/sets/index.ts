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
export { boomHinge, drawGantry, GANTRIES, STS2, type Gantry, type GantryLook } from './crane';
export { drawSpire, SPIRE_LIGHT } from './spire';
export { CAR, drawTrainCar } from './train-car';
export { drawStringLights, SALT, saltBack, saltCounter, saltLights, saltLime, saltShell, saltUnder } from './beach-bar';
export { drawBonfire, drawDjBooth, drawLounger } from './beach-party';
export { drawSea, type SeaLook } from './sea';
export { drawCar, drawForklift, drawReachStacker, drawStraddle, drawTruck } from './vehicles';
export { drawAirTaxi, drawBlimp, drawDrone } from './air-traffic';
export { drawPalm } from './palm';
export { drawGalleriaDome } from './galleria-dome';
export { drawTower, towerRow } from './downtown-towers';
export { frameView, placed } from './view';
export { puddles, weatherFront, weatherMid, weatherSky, type PuddleSpec, type WeatherLook } from './weather';
export { drawPane, drawSky, glass, moonDisc, seaCols, skyCols, skyPos, sunPath, windowShaft, type PaneOpts, type SkyOpts } from './sky';
export { addLight, castShadow, drawCasters, drawGrade, drawLights, drawShade, gradeOf, inShade, prepareLights, prepareShade, shadowsOn, type Caster, type SceneLight, type Shade, type ShadeSide } from './lighting';

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
    what: 'The Spire from far off, the monolith: a black slab on its plinth in the bay, thin seams of cold light, a pointed top with the Registry antenna and its red light, a halo ring of air traffic.',
    users: ['stacks/scene.ts: the bay in the far band', 'cutscenes/act2.ts: across the water at the end of Act I', 'title/glide.ts: in the bay, nameless, from the harbor to the Galleria'],
  },
  {
    id: 'crane', file: 'sets/crane.ts',
    what: 'The ship-to-shore gantry crane frame (STS-1, STS-2, STS-3) in painted steel: legs, beams, A-frame, Warren-truss boom (down and working, or raised about its hinge when idle), machinery house, warning lights.',
    users: ['scenes/harbor.ts: STS-1 and STS-3 on the pier (booms down)', 'stacks/scene.ts: STS-2 over the blocks (back and front parts, boom down)', 'title/coast.ts: STS-1 and STS-3 booms up, STS-2 working, one boom apart'],
  },
  {
    id: 'containers', file: 'sets/containers.ts',
    what: 'The shipping container (seeded paint, rust, codes, placards) and a crooked stack of them.',
    users: ['scenes/harbor.ts: the pier stacks, the arch, the crane loads, the bonded store', 'stacks/scene.ts: blocks A, B, C and the crane loads', 'title/coast.ts: the stacks along the quay (NRLU 404 0451 under STS-2), STS-2\'s load', 'sets/vehicles.ts: the boxes on trucks, the straddle carrier, the reach stacker'],
  },
  {
    id: 'train-car', file: 'sets/train-car.ts',
    what: 'A LINE 0 car from outside: body, waist stripe, doors that slide open, lit windows with riders, headlight and destination on the lead car.',
    users: ['scenes/line.ts drawPlatformTrain: the platforms (metro, galleriaStation, harborStation)', 'title/glide.ts: the train diving into its tunnel (line0)'],
  },
  {
    id: 'beach-bar', file: 'sets/beach-bar.ts',
    what: 'SALT, the beach bar: the shack on stilts, thatch, lit windows, the SALT neon, the ladder, neon string lights (also one run on its own: drawStringLights), the back shelves, LIME the robot bartender, the counter.',
    users: ['beach/scene.ts: SALT (Moth\'s photo, the jukebox, the mixer, the stools are the scene\'s)', 'title/coast.ts: the title\'s bar, string lights out over the dance floor and along the pier'],
  },
  {
    id: 'palm', file: 'sets/palm.ts',
    what: 'A palm silhouette: ringed trunk tapering up a curve, nine drooping fronds with leaflets, coconuts, sway, a rim of the sun on one side. Seeded; vary height and lean.',
    users: ['title/coast.ts: the title\'s frame, the beach, the foreground wipe at the port gate'],
  },
  {
    id: 'galleria-dome', file: 'sets/galleria-dome.ts',
    what: 'The Galleria\'s glass dome on its base, the mall\'s landmark on the skyline.',
    users: ['scenes/train.ts: over Galleria on the far skyline from the car', 'title/coast.ts: on the Galleria\'s plinth, over the plaza'],
  },
  {
    id: 'downtown-towers', file: 'sets/downtown-towers.ts',
    what: 'Downtown as a skyline: tower slabs with seeded lit windows, rooftop masts and tanks, signs on plates.',
    users: ['title/coast.ts: Downtown\'s street towers and the far row across the water, hiding the sun', 'library/scene.ts: through the reading room\'s tall windows'],
  },
  {
    id: 'weather', file: 'sets/weather.ts',
    what: "The weather over an outdoor scene, from its district's forecast (weather.ts): cloud deck and lightning behind, puddles, smog and fog banks in the middle, rain, low fog, heat shimmer and the storm's flash in front.",
    users: [
      'game.ts drawWorld: every scene with `ambient.weather` (downtown, market, harbor, stacks, warehouse, beach, yard, metro, harborStation)',
      'Downtown keeps its own neon smears in the street (game.ts drawStreet), as wet as the weather',
      'title/glide.ts does NOT use it: the glide\'s "first rain" stays scripted',
    ],
  },
  {
    id: 'sky', file: 'sets/sky.ts',
    what: 'The sky of the moment from the city clock (light.ts): gradient by the sun\'s height, twilight glow, stars, the moon with its phase, the slatted sun (option A) where it really is for the scene\'s facing; the sun\'s path on water; window panes and sun shafts for interiors.',
    users: [
      'game.ts drawWorld: every scene with `ambient.sky` (downtown, harbor, market, stacks, warehouse, yard, metro, harborStation), horizon from `SceneDef.horizon`',
      'beach/scene.ts: its own sky call (horizon over the sea), seaCols and sunPath on the water',
      'scenes/harbor.ts, stacks/scene.ts, scenes/stations.ts (harbor): seaCols and sunPath on the water',
      'scenes/train.ts: the car\'s windows and the sky over its roof (the train home rides into the dawn)',
      'capsule/scene.ts: the window (drawPane), the shaft when the blinds are up (windowShaft), the light leaking through the slats',
      'moth/scene.ts, laundromat/scene.ts, library/scene.ts, scenes/shop.ts: the window\'s sky and the sun\'s shaft; scenes/mall.ts: the skylight',
      'game.ts drawWindow: dark panes reflect the sky by day (glass)',
    ],
  },
  {
    id: 'lighting', file: 'sets/lighting.ts',
    what: 'The light over a scene: the grade by the hour and the weather, the light layer (SceneDef.lights: lamps, windows, neon, screens, headlights), cast shadows A (people, robots, animals, SceneDef.casters) and building shade C (SceneDef.shade).',
    users: [
      'game.ts drawWorld: every scene (grade outdoors; lights, casters and shade where declared); the player\'s and the street NPCs\' shadows',
      'characters.ts drawCharacter: every person, robot and animal\'s shadow',
      'scenes/train.ts, laundromat/scene.ts, library/scene.ts, scenes/shop.ts: the grade over what their windows show',
      'declared in: downtown/index.ts, scenes/harbor.ts, beach/index.ts, scenes/market.ts, scenes/warehouse.ts, scenes/metro.ts',
    ],
  },
  {
    id: 'sea', file: 'sets/sea.ts',
    what: 'The open sea at dawn: the mirror (sky-coloured, long swells, the sun\'s path in dashes) combined with the pixel swell (wave rows in perspective whose crests catch the sun). A screen band, night to dawn, hazier toward the city.',
    users: ['title/glide.ts: the title\'s water and the bay all along the glide'],
  },
  {
    id: 'beach-party', file: 'sets/beach-party.ts',
    what: 'A night on the beach: the sun lounger under its parasol, a bonfire with sparks and its light, the DJ booth (DJ bot, deck, speaker stack on the beat).',
    users: ['beach/scene.ts: the rental loungers (the tags and your towel are the scene\'s)', 'title/coast.ts: the title\'s loungers, bonfire and DJ'],
  },
  {
    id: 'vehicles', file: 'sets/vehicles.ts',
    what: 'Ground vehicles side on, with their lights: cars (sedan, hatch, van, cab), a truck (with a container or empty), and the port\'s straddle carrier, reach stacker and forklift with beacons.',
    users: ['title/coast.ts: the road\'s traffic, the port office\'s cars, the truck under STS-2, the port\'s machines'],
  },
  {
    id: 'air-traffic', file: 'sets/air-traffic.ts',
    what: 'The sky\'s traffic: air taxis on their lanes, drones (survey or cargo), the ad blimp cycling the Registry\'s dry adverts.',
    users: ['title/glide.ts: sky lanes and the blimp over the bay', 'title/coast.ts: drones over the harbor, the bridge, the plaza and Downtown'],
  },
];
