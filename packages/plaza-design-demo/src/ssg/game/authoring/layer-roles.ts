/**
 * Editor-only kinds: what a piece of artwork is (a human, a chair, a sign), shared by the outline's
 * rows, its Kind view and the artwork library's filter. Characters are classified from their actor
 * look (body = human, bot = robot, a critter name = animal or machine); everything else from its
 * type, label and catalog category. Nothing is written to compositions; draw order stays in layers.
 * The keyword lists are a first pass: a `kind` field on registered artwork can replace them later.
 */
export const LAYER_ROLES = ['Player', 'Human', 'Animal', 'Robot', 'Vehicle', 'Furniture', 'Machine', 'Light', 'Sign', 'Prop', 'Building', 'Scenery', 'Effect', 'Marker', 'Group'] as const;
export type LayerRole = typeof LAYER_ROLES[number];
export const KIND_HINTS: Record<LayerRole, string> = {
  Player: 'Where the player stands in the stack and arrives',
  Human: 'People: residents, vendors, crowds',
  Animal: 'Cats, birds and other creatures',
  Robot: 'Bots, drones and other walking or flying machines',
  Vehicle: 'Cars, taxis, trains, boats, forklifts',
  Furniture: 'Chairs, tables, counters, beds, shelves, stalls',
  Machine: 'Terminals, cameras, printers, vending, cranes and other devices',
  Light: 'Lamps, neon and light washes',
  Sign: 'Signs, notices, posters, tickers and screens with text',
  Prop: 'Smaller objects: books, crates, bins, plants, clutter',
  Building: 'Rooms, walls, floors, doors, windows, stairs, facades',
  Scenery: 'Sky, sun, skyline, water and distant views',
  Effect: 'Reflections, smears, steam, rain and other atmosphere',
  Marker: 'Gameplay positions that never draw',
  Group: 'Named groups of artwork',
};

const ANIMALS = new Set(['cat', 'pigeon', 'gull', 'crab']), MACHINES = new Set(['cleaner', 'drone', 'courier', 'robogull']);
/** A character's kind from its actor look, when the scene document gives one. */
export function lookKind(look: unknown): LayerRole | undefined {
  if (typeof look === 'string') return ANIMALS.has(look) ? 'Animal' : MACHINES.has(look) ? 'Robot' : undefined;
  if (look && typeof look === 'object') return 'bot' in look ? 'Robot' : 'Human';
  return undefined;
}

// Checked in order: the first match wins, so specific kinds come before the broad ones.
const RULES: [LayerRole, RegExp][] = [
  ['Player', /^scene\.player\b/],
  ['Group', /^assembly\.group\b/],
  ['Marker', /marker|spawn|trigger|\bzone\b|\bguide\b|\bposition\b/],
  ['Animal', /\bcat\b|\bdog\b|pigeon|\bgulls?\b|\bbirds?\b|\bfish\b|\brats?\b|\bcrab\b/],
  ['Robot', /robot|android|\bbots?\b|servbot|stockbot|crawler|drone|\bmech\b/],
  ['Human', /person|people|character|crowd|\bactor\b|resident|vendor|worker|guard|clerk|passenger|pedestrian|\bkid\b|keeper|rider|\bcook\b|sleeper|\bnpc\b|surfer|\bdj\b/],
  ['Vehicle', /vehicle|\bcars?\b|taxi|\bcab\b|\bbus\b|\bvans?\b|truck|\btrains?\b|tram|\bboats?\b|\bships?\b|ferry|\bbikes?\b|scooter|forklift|carriage|traffic/],
  ['Effect', /reflection|smear|steam|smoke|\bfog\b|\bmist\b|\brain\b|puddle|splash|spark|haze|glare|\bpool\b|\bsuds\b|bonfire|\bfade\b/],
  ['Light', /light|lamp|pendant|neon|lantern|\bbulbs?\b|spotlight|\bbeam\b|flare|candle|glow|\btube\b/],
  ['Sign', /sign|notice|\bnotes?\b|ticker|poster|\blabels?\b|banner|placard|\bmenu\b|billboard|graffiti|timetable|sticker|\bads?\b|advert|\bwanted\b|\brules\b|\bodds\b|\bscore\b|plaque|board\b|\bstrip\b|\bmap\b|\bmemo\b|\bheader\b|\btitles?\b|\bplate\b/],
  ['Machine', /device|sensor|button|beacon|\bhorn\b|hatch|siren|\bbell\b|conveyor|cutter|spool|netjack|\bmains\b|recorder|metronome|login|cryptex|keypad|\bcranes?\b|gantry|escalator|dispenser|record player|webcam|aircon|pantograph|terminal|camera|\bcam\b|printer|vending|washer|dryer|machine|\bkiosk\b|reader|\btill\b|register|router|\bpc\b|computer|screen|monitor|console|\bfridge\b|kettle|radiator|\bclock\b|timer|\block\b|\bplug\b|jukebox|antenna|\bfan\b|generator|speaker|\bpanel\b|\bmeter\b|scanner|relay|switch|breaker|mixer|\bport\b|\breset\b|\bunit\d*\b|\bbrake\b|\bstamp\b|\bcipher\b|morse|\brgb\b|\baudit\b|\bcoffee\b/],
  ['Furniture', /chair|armchair|table|bench|desk|counter|stools?\b|sofa|\bbeds?\b|cabinet|locker|shel(f|ves)|\bstalls?\b|booth|\brack\b|sunbed|\bseats?\b|lounger|handrail|\bstraps?\b|\bpole\b/],
  ['Scenery', /\bsun\b|\bpalms?\b|spire|\bsky\b|skyline|\bcity\b|horizon|\bsea\b|water|\bshore\b|\bswell\b|\bwaves?\b|\bfar\b|distant|\bview\b|towers?\b|backdrop|\bbay\b|mountain|\bclouds?\b|inlet|\bhero\b|\bmid\b|network|beacons|\bmast\b/],
  ['Building', /\broom\b|wall|floor|ceiling|door|window|gallery|stair|\broof|building|facade|façade|\barch|pillar|column|street|ground|platform|\btrack|\brail|\bpier\b|\bdock|interior|exterior|ramp|bridge|fence|gate|shell|tunnel|corridor|\bfront\b|storey|envelope|\bcells?\b|alley|pavement|boardwalk|\bsteps?\b|awning|canopy|\bpipes?\b|\bbeams?\b|coffers|neighbou?rs|\bpads?\b|\bshed\b|dome|plinth|entrance|\bring\b|outside|gangway|\bclear\b|\bslab\b|\bedges?\b/],
  ['Prop', /./],
];

/** Artwork the keyword rules get wrong (a crane cab is not a vehicle, the people kit is not a robot). */
const KIND_OF: Record<string, LayerRole> = {
  'character.resident': 'Human', 'sequence.opening.coast-mid.machine-tractor': 'Vehicle', 'harbor.fishStall': 'Furniture',
  'moth.resident-panel': 'Machine', 'station.track-base': 'Building', 'beach.tower': 'Building', 'beach.board': 'Prop',
  'warehouse.office': 'Building', 'warehouse.door': 'Building', 'harbor.craneCabBack': 'Machine', 'harbor.craneCabFront': 'Machine',
  'harbor.ferryNotice': 'Sign', 'terminal.trolley-cab': 'Machine', 'terminal.ferry-hatch': 'Building', 'terminal.ferry-kiosk': 'Machine',
  'train.fill': 'Building', 'train.carPlate': 'Sign',
  'sequence.taxi.sky': 'Scenery', 'sequence.taxi.lights': 'Light', 'sequence.taxi.towers': 'Scenery', 'sequence.taxi.destination': 'Sign', 'sequence.taxi.fade': 'Effect',
};
export function layerRole(type: string, label: string, category: string, look?: unknown): LayerRole {
  if (KIND_OF[type]) return KIND_OF[type];
  if (/^(scene\.player|assembly\.group)\b/.test(type)) return type.startsWith('scene.') ? 'Player' : 'Group';
  // the level kit: walkable lines, doors and building handles are positions; lifts and escalators are machines
  if (/^level\.(floor|door|shell|interior)$/.test(type)) return 'Marker';
  if (/^level\.(elevator|escalator)$/.test(type)) return 'Machine';
  const fromLook = lookKind(look);
  if (fromLook) return fromLook;
  // The type's own name and label decide; the namespace (often a scene name) and category only break ties.
  const own = `${type.split('.').slice(1).join(' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ')} ${label}`.toLowerCase();
  const match = (text: string) => RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? 'Prop';
  const first = match(own);
  return first !== 'Prop' ? first : match(`${type} ${label} ${category}`.toLowerCase());
}
