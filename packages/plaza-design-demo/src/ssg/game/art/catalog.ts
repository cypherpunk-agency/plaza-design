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

export { BOX20, BOX40, CH, container, PAL, stack, type Crate } from "./props/containers";
export { boomHinge, drawGantry, GANTRIES, STS2, type Gantry, type GantryLook } from "./machinery/crane";
export { drawSpire, SPIRE_LIGHT } from "./architecture/spire";
export { CAR, drawMetroCar, drawTrainCar, METRO } from "./vehicles/train-car";
export { drawStringLights, SALT, saltBack, saltCounter, saltLights, saltLime, saltShell, saltUnder } from "./assemblies/beach-bar";
export { drawBonfire, drawDjBooth, drawLounger } from "./props/beach-party";
export { drawSea, type SeaLook } from "./environment/sea";
export { drawCar, drawForklift, drawReachStacker, drawStraddle, drawTruck, M, PORT_SCALE, PORT_TRAILER_SCALE, SIZE } from "./vehicles/vehicles";
export { bobAt, drawLivery, laneAt, laneSlots, paintBanded, type Lane, type Livery } from "./vehicles/kit";
export { BOAT_KINDS, drawBoat, type BoatKind } from "./vehicles/boats";
export { drawBogies, drawConsist, drawPlatformTrain, PLATFORM_TRAIN, RAIL_CAR } from "./vehicles/rail";
export { AIR_KINDS, BLIMP_SCALE, CRAFT_LEN, drawAircraft, drawBlimp, drawCab, drawCraft, drawDrone, type AirKind, type CraftKind } from "./vehicles/air-traffic";
export { drawPalm } from "./environment/palm";
export { drawGalleriaDome } from "./architecture/galleria-dome";
export { drawTower, NEON, SIGN_COPY, signGlows, towerRow, type Tower, type TowerSign } from "./architecture/downtown-towers";
export { drawRing, RING, ringTraffic } from "./architecture/ring-highway";
export { drawBore, drawTunnelPortal, drawViaduct, drawWallPortal, LINE0 } from "./architecture/line0";
export { drawCanalGlimpse, drawGroundSection } from "./architecture/cutaway";
export { frameView, placed } from "./core/view";
export { puddles, weatherFront, weatherMid, weatherSky, type PuddleSpec, type WeatherLook } from "./atmosphere/weather";
export { drawPane, drawSky, glass, moonDisc, seaCols, skyCols, skyPos, sunPath, windowShaft, type PaneOpts, type SkyOpts } from "./environment/sky";
export { addLight, castShadow, createLightingFrame, drawCasters, drawGrade, drawLights, drawShade, gradeOf, inShade, prepareShade, type LightingFrame, type ShadeFrame, type Caster, type SceneLight, type Shade, type ShadeSide } from "./atmosphere/lighting";

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
    id: 'spire', file: 'art/architecture/spire.ts',
    what: 'The Spire from far off, the monolith: a black slab on its plinth in the bay, thin seams of cold light, three docking decks with their lights, a pointed top with the Registry antenna and its red light, a halo ring of air traffic; with `traffic`, corporate shuttles docking and leaving and a Registry patrol on its loop.',
    users: ['art/harbor/shift-kit.ts: across the bay behind the night-shift yard (`shift.far-shore`, with traffic)', 'scenes/stacks/scene.ts: the bay in the far band (decks, no traffic)', 'story/cutscenes/act2.ts: across the water at the end of Act I (decks, no traffic)', 'story/title/glide.ts: in the bay, nameless, bigger, with its traffic; the camera eases off for it over the bay bridge'],
  },
  {
    id: 'crane', file: 'art/machinery/crane.ts',
    what: 'The ship-to-shore gantry crane frame (STS-1, STS-2, STS-3) in painted steel: legs, beams, A-frame, Warren-truss boom (down and working, or raised about its hinge when idle), machinery house, warning lights.',
    users: ['art/harbor/shift-kit.ts: `shift.crane`, the night-shift berth (STS-1 and STS-3, spreader, load and floodlights)', 'scenes/harbor/index.ts: STS-1 and STS-3 on the pier (booms down)', 'scenes/stacks/scene.ts: STS-2 over the blocks (back and front parts, boom down)', 'story/title/coast.ts: STS-1 and STS-3 booms up, STS-2 working, well apart; drawn at 1.7x the scenes\' scale (`CRANE`) so they stand over 12 m boxes'],
  },
  {
    id: 'containers', file: 'art/props/containers.ts',
    what: 'The shipping container (seeded paint, rust, codes, placards) and a crooked stack of them. A box can carry its own height (`h`); `BOX40`/`BOX20` are true to the player\'s scale (12.2 m and 6 m long, 2.6 m tall). The scenes keep their own boxes (128 x 58).',
    users: ['art/harbor/shift-kit.ts: `shift.stack`, the night-shift yard blocks and the crane loads', 'scenes/harbor/index.ts: the pier stacks, the arch, the crane loads, the bonded store', 'scenes/stacks/scene.ts: blocks A, B, C and the crane loads', 'story/title/coast.ts: the stacks along the quay (NRLU 404 0451), the ship\'s deck, STS-2\'s load (true scale)', 'story/title/traffic.ts, art/vehicles/vehicles.ts, art/architecture/ring-highway.ts, art/vehicles/air-traffic.ts: the boxes on trucks, the straddle carrier, the reach stacker, the hauler'],
  },
  {
    id: 'train-car', file: 'art/vehicles/train-car.ts',
    what: 'A LINE 0 car from outside: body, waist stripe, doors that slide open, lit windows with riders, headlight and destination on the lead car (`drawTrainCar`, the platforms\' own scale). `drawMetroCar`: the same car true to the player\'s scale (20 m), four doors, long windows onto a warm inside with seated and standing riders at their real size, empty seats, reflections sliding on the glass.',
    users: ['art/vehicles/rail.ts drawConsist/drawPlatformTrain (the rail class, `vehicle.rail`): the platforms (metro, galleriaStation, harborStation) from the transport snapshot', 'story/title/finale.ts: the glide\'s train out of its tower, down the ramp, in the bore: drawMetroCar with the rail class\'s bogies'],
  },
  {
    id: 'beach-bar', file: 'art/assemblies/beach-bar.ts',
    what: 'SALT, the beach bar: the shack on stilts, thatch, lit windows, the SALT neon, the ladder, neon string lights (also one run on its own: drawStringLights), the back shelves, LIME the robot bartender, the counter.',
    users: ['scenes/beach/scene.ts: SALT (Moth\'s photo, the jukebox, the mixer, the stools are the scene\'s)', 'story/title/coast.ts: the title\'s bar, string lights out over the dance floor and along the pier'],
  },
  {
    id: 'palm', file: 'art/environment/palm.ts',
    what: 'A palm silhouette: ringed trunk tapering up a curve, nine drooping fronds with leaflets, coconuts, sway, a rim of the sun on one side. Seeded; vary height and lean.',
    users: ['story/title/coast.ts: the title\'s frame, the beach, the foreground wipe where the sand ends'],
  },
  {
    id: 'galleria-dome', file: 'art/architecture/galleria-dome.ts',
    what: 'The Galleria\'s glass dome on its base, the mall\'s landmark on the skyline.',
    users: ['scenes/train (lineRide mechanism, train binding provider): over Galleria on the far skyline from the car', 'story/title/coast.ts: on the Galleria\'s plinth, over the plaza'],
  },
  {
    id: 'downtown-towers', file: 'art/architecture/downtown-towers.ts',
    what: 'Downtown\'s towers, every one seeded and different: skins (punched concrete, glass curtain wall, stacked capsules, panel blocks with balconies, brick walk-ups with fire escapes), setbacks, crowns (needle, stepped, slant, lattice antenna, halo, pyramid), roof gear (tanks, antennas, dishes, AC, gardens, taxi pads), grime; signs of six kinds (plate, neon blade, stacked letters, scrolling ticker, holo ad over its emitter, rooftop billboard on a truss), flickering, a dead letter now and then, dry copy; `signGlows` for wet-street reflections. `storey` sizes the details: 9 for small skylines, 85 true to the player\'s scale.',
    users: ['story/title/town.ts: Downtown\'s street row (true scale, shopfronts, signs), the portal tower, four skyline rows behind it thickening toward the tunnel', 'scenes/library/scene.ts: through the reading room\'s tall windows (varied massing now, no signs, on the city clock)'],
  },
  {
    id: 'building-kit', file: 'art/buildings/front.ts',
    what: 'The building kit: seeded street fronts (skins brick, concrete, tenement, panel, glass; punched, framed or curtained windows; flat, parapet, cornice, stepped or ledge roofs with tanks, vents, dishes and AC; door, shopfront, shutter, tagged or sealed bays; retrofit: AC units, pipes, cable runs, fire escapes, balconies with laundry, bolted-on screens, ID scanners), rows of buildings at a distance (the downtown-towers generator) and single attachments. Registered as building.front, building.row and building.attachment. Shared bodies in art/buildings/parts.ts.',
    users: ['art/proposals/downtown-next.composition.json: the street fronts (editor-only proposal)', 'parts.ts bodies: art/assemblies/downtown.ts (windows, bays, trim), art/assemblies/construction.ts (Market tenement facades), art/assemblies/fixer-yard.ts (fire escape, AC unit, wall textures)'],
  },
  {
    id: 'weather', file: 'art/atmosphere/weather.ts',
    what: "The weather over an outdoor scene, from its district's forecast (world/weather.ts): cloud deck and lightning behind, puddles, smog and fog banks in the middle, rain, low fog, heat shimmer and the storm's flash in front.",
    users: [
      'runtime/game.ts drawWorld: every scene with `ambient.weather` (downtown, market, harbor, stacks, warehouse, beach, yard, metro, harborStation)',
      'Downtown keeps its own neon smears in the street (runtime/game.ts drawStreet), as wet as the weather',
      'story/title/glide.ts does NOT use it: the glide\'s "first rain" stays scripted',
    ],
  },
  {
    id: 'sky', file: 'art/environment/sky.ts',
    what: 'The sky of the moment from the city clock (world/light.ts): gradient by the sun\'s height, twilight glow, stars, the moon with its phase, the slatted sun (option A) where it really is for the scene\'s facing; the sun\'s path on water; window panes and sun shafts for interiors.',
    users: [
      'runtime/game.ts drawWorld: every scene with `ambient.sky` (downtown, harbor, market, stacks, warehouse, yard, metro, harborStation), horizon from `SceneDef.horizon`',
      'scenes/beach/scene.ts: its own sky call (horizon over the sea), seaCols and sunPath on the water',
      'scenes/harbor/index.ts, scenes/stacks/scene.ts, scenes/stations.ts (harbor): seaCols and sunPath on the water',
      'scenes/train (lineRide mechanism, train binding provider): the car\'s windows and the sky over its roof (the train home rides into the dawn)',
      'scenes/capsule/scene.ts: the window (drawPane), the shaft when the blinds are up (windowShaft), the light leaking through the slats',
      'scenes/moth/scene.ts, scenes/laundromat/scene.ts, scenes/library/scene.ts, scenes/shop/index.ts: the window\'s sky and the sun\'s shaft; the mall folder scene: the skylight',
      'runtime/game.ts drawWindow: dark panes reflect the sky by day (glass)',
    ],
  },
  {
    id: 'lighting', file: 'art/atmosphere/lighting.ts',
    what: 'The light over a scene: the grade by the hour and the weather, the light layer (SceneDef.lights: lamps, windows, neon, screens, headlights), cast shadows A (people, robots, animals, SceneDef.casters) and building shade C (SceneDef.shade).',
    users: [
      'runtime/game.ts drawWorld: every scene (grade outdoors; lights, casters and shade where declared); the player\'s and the street NPCs\' shadows',
      'runtime/characters.ts drawCharacter: every person, robot and animal\'s shadow',
      'scenes/train (train binding provider), scenes/laundromat/scene.ts, scenes/library/scene.ts, scenes/shop/index.ts: the grade over what their windows show',
      'declared in: scenes/downtown/scene.json (environment), scenes/harbor/index.ts, scenes/beach/index.ts, scenes/market/index.ts, scenes/warehouse/scene.json (stage), scenes/metro/scene.json (stage)',
    ],
  },
  {
    id: 'sea', file: 'art/environment/sea.ts',
    what: 'The open sea at dawn: the mirror (sky-coloured, long swells, the sun\'s path in dashes) combined with the pixel swell (wave rows in perspective whose crests catch the sun). A screen band, night to dawn, hazier toward the city.',
    users: ['story/title/glide.ts: the title\'s water and the bay all along the glide'],
  },
  {
    id: 'beach-party', file: 'art/props/beach-party.ts',
    what: 'A night on the beach: the sun lounger under its parasol, a bonfire with sparks and its light, the DJ booth (DJ bot, deck, speaker stack on the beat).',
    users: ['scenes/beach/scene.ts: the rental loungers (the tags and your towel are the scene\'s)', 'story/title/coast.ts: the title\'s loungers, bonfire and DJ'],
  },
  {
    id: 'vehicles', file: 'art/vehicles/vehicles.ts',
    what: 'Ground vehicles side on, true to the player\'s scale (a sedan 4.5 x 1.5 m, the bus 12 m, a road truck with its 40 ft box 17.5 m), with their lights: cars (sedan, hatch, van, cab), bus 7, a truck (with a container or empty, or the port\'s yard tractor), and the port\'s straddle carrier, reach stacker and forklift with beacons.',
    users: ['story/title/traffic.ts: the road\'s traffic (trucks out of the port gate, cars and bus 7 from the side streets)', 'story/title/coast.ts: the port office\'s cars, the car shell in the buffer, the yard tractors, the port\'s machines', 'art/architecture/ring-highway.ts: the Ring\'s traffic', 'art/vehicles/road-vehicle.ts: `vehicle.road`', 'art/assemblies/warehouse.ts: the Registry evidence van (van, decal livery)', 'art/assemblies/container-terminal.ts: straddle carrier SC-11 (shuttle lane, back band) and the chassis (trailer)', 'art/assemblies/harbor-pier.ts: the customs chassis (trailer) and the forklift (body and roof parts)'],
  },
  {
    id: 'air-traffic', file: 'art/vehicles/air-traffic.ts',
    what: 'The sky\'s traffic, true to scale, each kind with its look: private pods, yellow sky taxis, Registry patrols (red and blue strobes, a searchlight), corporate shuttles, slow cargo haulers with a box slung under, the medevac, a military dropship and its escort drones; delivery drones; the ad blimp cycling the Registry\'s dry adverts.',
    users: ['story/title/air.ts: the glide\'s lanes, patrol loops, the drone stream from the logistics hub, the hauler, the medevac, the dropship, the blimp', 'story/title/coast.ts: the taxi landing on the public pad by the Galleria', 'art/architecture/spire.ts: the shuttles docking at the Spire and its patrol', 'art/assemblies/taxi-pad.ts and art/sequences/taxi-picture.ts: drawCab, the taxi at a stand\'s scale', 'art/environment/sky-ships.ts: the far sky traffic', 'art/vehicles/air-vehicle.ts: `vehicle.air`'],
  },
  {
    id: 'boats', file: 'art/vehicles/boats.ts',
    what: 'The water class: the lamp boat, the cabin boat, REGISTRY MARINE\'s patrol (strobe, sweeping searchlight) and NIGHT FERRY 7, with waterline heave, wake, reflections, lamp and nav lights, names that read the right way round.',
    users: ['art/assemblies/harbor-pier.ts: the lamp boat, the patrol, the ferry', 'art/assemblies/beach.ts: the moored NOT FISHING boat', 'art/sequences/act2.ts: the ferry pulling out', 'art/vehicles/boats.ts: `vehicle.boat`'],
  },
  {
    id: 'ring-highway', file: 'art/architecture/ring-highway.ts',
    what: 'THE RING, the elevated highway: box girder on columns with cap beams, barrier and railing, sodium lamps, light strips under the deck, sign gantries (RING · EXIT 4), and its two-way traffic (ringTraffic), true to scale (deck 10.7 m up).',
    users: ['story/title/town.ts: over Downtown\'s street, its east end curving away inland behind the Galleria'],
  },
  {
    id: 'line0', file: 'art/architecture/line0.ts',
    what: 'LINE 0\'s own way: the viaduct (columns, girder, rails, walkway railing, signals; its height can ramp), a lit portal in a building\'s wall where the line runs out of it, the tunnel headwall with its arch and plate, and the bore in section (lit, lamps, cable trays, the track).',
    users: ['story/title/finale.ts: the viaduct from the Galleria\'s station, the portal tower, the ramp and headwall, the bore in the cutaway'],
  },
  {
    id: 'cutaway', file: 'art/architecture/cutaway.ts',
    what: 'The city cut open: the ground in section (asphalt, fill, old rubble, water main and ducts, a steam pipe, the sewer\'s egg, foundation piles), and a glimpse of the Undercity: a flooded canal under a brick vault, a boat with a lantern, someone in it.',
    users: ['story/title/finale.ts: the glide\'s end, the camera following LINE 0 down under the street'],
  },
];
