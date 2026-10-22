/**
 * LEVELS: floors, stairs, escalators, lifts and buildings you step into (art/levels/elements.ts).
 *
 * Not a runtime of its own. `compileLevel` reads the level kit's placements from a resolved
 * composition into data (`LevelSource`); the functions below are pure rules the one runtime applies:
 * runtime/game.ts keeps the player's place in the level (`LevelState`: the floor, a walk on a flight,
 * standing in a lift car, how open each building is) beside the rest of the player, and steps it in
 * its own frame. A lift car is nothing but its Circuit mover in the scene's model (engine/movers.ts):
 * the level reads where the mover is and asks it to go; its doors follow the mover's trip.
 *
 * What the player sees is what the player can use: a flight or lift attached to a building's interior
 * works only from that building's own floors. A building whose ground floor meets the street is walked
 * into from either side; its facade fades with how far in the player is.
 *
 * A building's rooms (`level.room`) can open one by one: a room shows its insides once the player is in it
 * (or never), and stays open or closes again when they leave; a closed room shows its cover. Only the room the
 * player is in is live: a room remembered from before shows how it looked, darkened, without its people.
 * Rooms remembered as seen are the save's (`Save.rooms`); the game passes them in and stores them back.
 *
 * A scene without level floors keeps the old single street line (and its jump ledges).
 */
import type { Resolved } from '../art/core/composition';

/** A walkable line. `entry: 'door'` marks a building floor entered only at a door (default: walked into from the street). */
export interface LevelFloor { id: string; x: number; w: number; h: number; building: string; label: string; entry?: 'door'; indoor?: true; zone?: string }
/** `inside`: the building whose interior shows it; it is usable only from that building's floors. */
/**
 * `shape`: stairs that are not a straight flight (a steep ladder-stair, rungs, a spiral, a switchback) are climbed by
 * holding ↑/↓; a straight flight is walked with ←/→. `path`: the walking line from the low end to the high end when it
 * is not straight (a switchback's landing).
 */
export interface LevelLink { id: string; kind: 'stairs' | 'escalator'; low: { x: number; h: number }; high: { x: number; h: number }; runs: 'both' | 'up' | 'down'; speed: number; reach?: number; inside?: string; shape?: StairShape; path?: { x: number; h: number }[] }
export interface LevelDoor { id: string; x: number; h: number; w: number; building: string }
/**
 * A lift: its car is the mover `device` (device.part) names. `buttons`: the call buttons beside the
 * shaft (instance ids and floor heights); they light while the car is on its way there.
 */
/** `broken`: out of order: offered as a sign, never called or ridden. */
export interface LevelLift { id: string; x: number; w: number; bottom: number; height: number; stops: { h: number; floor: string; label: string }[]; device?: string; doorMs?: number; inside?: string; buttons?: { id: string; h: number }[]; broken?: true; zone?: string; dh?: number }
export interface LevelSource {
  floors: LevelFloor[]; links: LevelLink[]; doors: LevelDoor[]; lifts: LevelLift[];
  /** Instance ids of each building's shell and interior handles (their attached artwork follows them). */
  shells: Record<string, string[]>; interiors: Record<string, string[]>;
  /** A building's own reveal speed, where its shell handle sets one other than the default. */
  revealSpeed?: Record<string, number>;
  /** How much of a building's shell stays while inside, where its shell handle sets more than none. */
  ghost?: Record<string, number>;
  /** The lowest and highest floor: how far the camera may look down and up. */
  low: number; high: number;
  /** Joined zones (`mergeLevels`): where each zone lies in the active zone's units. Pieces then carry their zone, ids are `zone/id`. */
  zones?: Record<string, { x: number; w: number; h: number }>;
  /** Rooms that open one by one (absent: a building shows all its insides at once). */
  rooms?: LevelRoom[];
  /** Each building's street doors seen from inside (`level.entrance`): shown with its interior. */
  entrances?: Record<string, string[]>;
}
/**
 * A part of a building that opens on its own: x..x+w, h..h+tall. `reveal`: always open, open once the player
 * is in it ('arrival'), or never (a room that is not part of the game). A room that opens always is not one of these. `keep`: a room once seen stays open
 * ('remember', saved) or closes again behind the player ('close'). `children`: the artwork attached to it.
 * `live`: what in it is going on now (its people and devices, at any depth): shown only while the player is there.
 */
export interface LevelRoom { id: string; building: string; x: number; w: number; h: number; tall: number; reveal: 'arrival' | 'never'; keep: 'remember' | 'close'; children: string[]; live: string[] }
/**
 * What the renderer needs this frame: how open each building is (0 outside, 1 inside), each lift car and its doors, each call button lit or not,
 * each room's openness (`rooms`) and how much the player is in it (`here`: 1 live, 0 a room remembered from before).
 */
export interface LevelView { reveal: Record<string, number>; lifts: Record<string, { car: number; doors: number }>; buttons?: Record<string, number>; rooms?: Record<string, number>; here?: Record<string, number> }

const near = (a: number, b: number, d = 0.75) => Math.abs(a - b) <= d;
export type StairShape = 'ladder' | 'rungs' | 'spiral' | 'switchback';
/** How each stair style is climbed (art/levels/elements.ts): a straight flight (none), a steep ladder-stair, vertical rungs, a spiral, a switchback. */
export const STAIR_SHAPES: Readonly<Record<string, StairShape | 'flight'>> = {
  concrete: 'flight', timber: 'flight', stone: 'flight', ladder: 'ladder', switchback: 'switchback', spiral: 'spiral', 'steel-ladder': 'rungs', 'rusty-spiral': 'spiral',
};
/** The level kit's defaults (art/levels/elements.ts); a compiled piece carries a tuned value only where it differs. */
export const LEVEL_DEFAULTS = { stairSpeed: 1, reach: 10, doorMs: 280, revealSpeed: 0.07, ghost: 0 } as const;
/** How far into a walk-in building the facade has fully faded (units from its side). */
const ENTRY_DEPTH = 30;
const tuned = <K extends string>(key: K, value: unknown, fallback: number): Partial<Record<K, number>> => { const n = Number(value); return value !== undefined && Number.isFinite(n) && n !== fallback ? { [key]: n } as Record<K, number> : {}; };
const group = (rows: readonly Resolved[], type: string) => {
  const out: Record<string, string[]> = {};
  for (const r of rows) if (r.element.type === type) (out[String(r.props.building ?? '')] ??= []).push(r.instance.id);
  return out;
};

/** The scene's level, or undefined when it places no floors. Ends that land on no floor make their piece inert. */
export function compileLevel(rows: readonly Resolved[]): LevelSource | undefined {
  const floors: LevelFloor[] = rows.filter(r => r.element.type === 'level.floor').map(r => ({
    id: r.instance.id, x: r.placement.x, w: Number(r.props.width) * r.placement.scale, h: r.placement.h,
    building: String(r.props.building ?? '').trim(), label: String(r.props.label ?? '').trim(),
    ...(r.props.entry === 'door' ? { entry: 'door' as const } : {}), ...(r.props.indoor === true ? { indoor: true as const } : {}),
  }));
  if (!floors.length) return undefined;
  // which building's interior shows a piece: follow its attachments (and parents) up to an interior handle
  const byId = new Map(rows.map(r => [r.instance.id, r])), parent = new Map<string, string>();
  for (const r of rows) for (const c of r.instance.children ?? []) parent.set(c.id, r.instance.id);
  const insideOf = (id: string): Partial<{ inside: string }> => {
    for (let at: string | undefined = id, n = 0; at && n < 64; n++) {
      const r = byId.get(at); if (!r) break;
      if (r.element.type === 'level.interior') { const b = String(r.props.building ?? '').trim(); return b ? { inside: b } : {}; }
      at = r.instance.attach?.instance ?? parent.get(at);
    }
    return {};
  };
  const links: LevelLink[] = rows.filter(r => r.element.type === 'level.stairs' || r.element.type === 'level.escalator').map(r => {
    const p = r.placement, style = String(r.props.style ?? 'concrete'), run = Number(r.props.run) * p.scale * p.facing, rise = Number(r.props.rise) * p.scale;
    // a spiral, a vertical ladder and a switchback come out above where they start; a steep ladder-stair leans its run
    const shape = r.element.type === 'level.stairs' ? STAIR_SHAPES[style] ?? 'flight' : 'flight', foot = { x: p.x, h: p.h }, top = { x: shape === 'flight' || shape === 'ladder' ? p.x + run : p.x, h: p.h + rise };
    const [low, high] = top.h >= foot.h ? [foot, top] : [top, foot], stairs = r.element.type === 'level.stairs';
    const turn = shape === 'switchback' ? [low, { x: p.x + run, h: (low.h + high.h) / 2 }, high] : undefined;
    // an escalator runs from its foot to its top ('up') or back; physically that may be downhill
    const footToTop = (r.props.direction ?? 'up') !== 'down', uphill = top.h >= foot.h;
    const speed = Number(r.props.speed ?? LEVEL_DEFAULTS.stairSpeed);
    return { id: r.instance.id, kind: stairs ? 'stairs' : 'escalator', low, high, runs: stairs ? 'both' : footToTop === uphill ? 'up' : 'down', speed, ...tuned('reach', r.props.reach, LEVEL_DEFAULTS.reach), ...insideOf(r.instance.id),
      ...(shape !== 'flight' ? { shape } : {}), ...(turn ? { path: turn } : {}) } as LevelLink;
  });
  const doors: LevelDoor[] = rows.filter(r => r.element.type === 'level.door').map(r => ({ id: r.instance.id, x: r.placement.x, h: r.placement.h, w: Number(r.props.width) * r.placement.scale, building: String(r.props.building ?? '').trim() }));
  const buttons = rows.filter(r => r.element.type === 'level.lift-button');
  const lifts: LevelLift[] = rows.filter(r => r.element.type === 'level.elevator').map(r => {
    const p = r.placement, bottom = p.h, height = Number(r.props.height) * p.scale;
    // one stop per height the shaft crosses; a building's floor wins over the street at the same height
    const crossed = floors.filter(f => p.x >= f.x && p.x <= f.x + f.w && f.h >= bottom - 0.75 && f.h <= bottom + height + 0.75).sort((a, b) => a.h - b.h || Number(!a.building) - Number(!b.building));
    const stops = crossed.filter((f, i) => i === 0 || !near(f.h, crossed[i - 1].h)).map(f => ({ h: f.h, floor: f.id, label: f.label || f.id }));
    const device = String(r.props.device ?? '').trim(), own = buttons.filter(b => String(b.props.lift ?? '').trim() === r.instance.id).map(b => ({ id: b.instance.id, h: b.placement.h }));
    return { id: r.instance.id, x: p.x, w: Number(r.props.width) * p.scale, bottom, height, stops, ...(device ? { device } : {}), ...tuned('doorMs', r.props.doorMs, LEVEL_DEFAULTS.doorMs), ...insideOf(r.instance.id), ...(own.length ? { buttons: own } : {}), ...(r.props.style === 'broken' ? { broken: true as const } : {}) };
  });
  // rooms that open on their own (a room that opens always just shows with its building); their building is the interior they are attached to
  const rooms: LevelRoom[] = rows.filter(r => r.element.type === 'level.room' && (r.props.reveal === 'arrival' || r.props.reveal === 'never')).map(r => {
    const p = r.placement, w = Number(r.props.width) * p.scale, reveal = r.props.reveal;
    // what the room holds: the artwork attached to it, or placed inside it as its children
    const owner = (o: Resolved) => o.instance.attach?.instance ?? parent.get(o.instance.id);
    const children = rows.filter(o => owner(o) === r.instance.id).map(o => o.instance.id);
    // its people and devices, however deep: drawn in the people or devices pass
    const within = (o: Resolved): boolean => { for (let at = owner(o), n = 0; at && n < 64; at = byId.get(at) ? owner(byId.get(at)!) : undefined, n++) if (at === r.instance.id) return true; return false; };
    const live = rows.filter(o => (o.element.parts ?? []).some(part => part === 'people' || part === 'devices') && within(o)).map(o => o.instance.id);
    return { id: r.instance.id, building: insideOf(r.instance.id).inside ?? '', x: p.facing < 0 ? p.x - w : p.x, w, h: p.h, tall: Number(r.props.height) * p.scale, reveal, keep: r.props.keep === 'close' ? 'close' : 'remember', children, live } as LevelRoom;
  });
  const hs = floors.map(f => f.h), revealSpeed: Record<string, number> = {}, ghost: Record<string, number> = {};
  for (const r of rows) if (r.element.type === 'level.shell') { const b = String(r.props.building ?? ''); Object.assign(revealSpeed, tuned(b, r.props.revealSpeed, LEVEL_DEFAULTS.revealSpeed)); Object.assign(ghost, tuned(b, r.props.ghost, LEVEL_DEFAULTS.ghost)); }
  return { floors, links, doors, lifts, shells: group(rows, 'level.shell'), interiors: group(rows, 'level.interior'), low: Math.min(...hs), high: Math.max(...hs), ...(Object.keys(revealSpeed).length ? { revealSpeed } : {}), ...(Object.keys(ghost).length ? { ghost } : {}), ...(rooms.length ? { rooms } : {}), ...(rows.some(r => r.element.type === 'level.entrance') ? { entrances: group(rows, 'level.entrance') } : {}) };
}

/** The player as the level sees it (the same object game.ts moves). */
export interface LevelPlayer { x: number; y: number; vy: number; face: number; onGround: boolean; moving: boolean }
/** A prompt: `h` is the floor it is offered on, `promptH` the absolute height its text stands at. */
export interface LevelHint { id: string; x: number; h: number; label: string; promptH: number }
/** A walk up or down a flight (`t` 0 at the low end, 1 at the high end), or standing in a lift car with a floor chosen on its panel. */
type Ride = { kind: 'link'; link: string; t: number; dir: 1 | -1 } | { kind: 'lift'; lift: string; pick: number };
/**
 * The player's place in the level, kept by the game beside the player: the floor, the ride, each building's openness,
 * each room's openness (`rooms`), how much the player is in it (`here`) and the rooms seen on this save that stay open (`seen`; the game saves them).
 */
export interface LevelState { floor: string; ride: Ride | null; reveal: Record<string, number>; rooms?: Record<string, number>; here?: Record<string, number>; seen?: string[] }
/** A scene's level as the game holds it: the compiled pieces and the player's place in them. */
export interface Level { source: LevelSource; state: LevelState }

/** What the level needs from the scene's model (SceneModel): its clock, its device parts with movers, and the movers. */
export interface MoverModel {
  now(): number;
  movers: { stopPositions(key: string): Readonly<Record<string, number>> | undefined; position(key: string): number | undefined; moving(key: string): boolean; target(key: string): string | undefined; trip(key: string): { t0: number; t1: number } | undefined };
  moveTo(dev: string, noun: string, stop: string): unknown;
}
/** The models a level's lifts read: one scene's, or (joined zones) each zone's own. */
export type Movers = MoverModel | ((zone: string | undefined) => MoverModel);
/** A lift's car read from its mover: where it is, where it is heading (null: still), its doors (0 shut, 1 open). Undefined: no mover, the lift is inert. */
function car(lift: LevelLift, movers: Movers) {
  if (!lift.device) return undefined;
  const m = typeof movers === 'function' ? movers(lift.zone) : movers, dh = lift.dh ?? 0;
  const i = lift.device.indexOf('.'), dev = lift.device.slice(0, i), noun = lift.device.slice(i + 1), key = dev + '.' + noun;
  const local = m.movers.stopPositions(key), at = m.movers.position(key), trip = m.movers.trip(key);
  // a joined zone's lift moves in its own zone's heights: read and set them shifted by where the zone lies
  const stops = local && (dh ? Object.fromEntries(Object.entries(local).map(([k, v]) => [k, v + dh])) : local), h = at === undefined ? undefined : at + dh;
  if (!stops || h === undefined || !trip) return undefined;
  const moving = m.movers.moving(key), to = moving ? m.movers.target(key) : undefined, ms = lift.doorMs ?? LEVEL_DEFAULTS.doorMs, now = m.now();
  // the doors shut quickly as it sets off and open once it has stopped
  const doors = moving ? Math.max(0, 1 - (now - trip.t0) / (ms / 3)) : Math.max(0, Math.min(1, (now - trip.t1) / ms));
  return { h, target: to === undefined ? null : stops[to], doors, go: (at: number) => { const stop = Object.keys(stops).find(k => Math.abs(stops[k] - at) < 0.75); if (stop) m.moveTo(dev, noun, stop); } };
}

/** A prompt the player may act on with E: where it stands and whose it is ('level' for a door, flight or lift). */
export interface Prompt { kind: string; x: number; h: number }
/** How far E reaches along the floor, and how far off the player's height a prompt may stand. */
export const PROMPT_REACH = 26, PROMPT_FLOOR = 8;
/**
 * The prompt E acts on: the nearest in reach on the player's floor. A level's own (door, flight, lift)
 * wins over anything else in reach: it is the way on, and a device on the same spot (the lift's own
 * mover) stays reachable through hack vision and the deck.
 */
export function nearestPrompt<T extends Prompt>(list: readonly T[], at: { x: number; y: number }): T | null {
  let best: T | null = null, bd = PROMPT_REACH, level = false;
  for (const t of list) {
    if (Math.abs(at.y - t.h) > PROMPT_FLOOR) continue;
    const d = Math.abs(at.x - t.x), isLevel = t.kind === 'level';
    if (d >= PROMPT_REACH) continue;
    if ((isLevel && !level) || (isLevel === level && d < bd)) { best = t; bd = d; level = isLevel; }
  }
  return best;
}

const floorOf = (src: LevelSource, id: string) => src.floors.find(f => f.id === id) ?? src.floors[0];
/** The floor the player stands on. */
export const levelFloor = (lv: Level) => floorOf(lv.source, lv.state.floor);
/** Is the player on a flight or in a car (the level sets their position)? */
export const levelRiding = (lv: Level) => !!lv.state.ride;
/** The floor at (x, h): outdoors first, so a street door's arrival is on the street, then any building's. */
function floorAt(src: LevelSource, x: number, h: number, building?: string): LevelFloor | undefined {
  const on = src.floors.filter(f => near(f.h, h, 2) && x >= f.x - 0.5 && x <= f.x + f.w + 0.5 && (building === undefined || f.building === building));
  return on.find(f => !f.building) ?? on[0];
}
/** The street floor a walk-in building floor opens onto (same height, running past its sides), if any. */
function street(src: LevelSource, f: LevelFloor): LevelFloor | undefined {
  if (!f.building || f.entry === 'door') return undefined;
  return src.floors.find(o => !o.building && near(o.h, f.h, 2) && o.x < f.x + 1 && o.x + o.w > f.x + f.w - 1);
}
/** Can the player use a piece from their floor: one inside a building only from that building's floors. */
const sees = (f: LevelFloor, piece: { inside?: string }) => !piece.inside || piece.inside === f.building;
const onFloor = (f: LevelFloor, at: { x: number; h: number }) => near(at.h, f.h, 2) && at.x >= f.x - 0.5 && at.x <= f.x + f.w + 0.5;

/** Arriving in the scene (spawn or an exit at height h): the floor there, or the nearest one below; buildings open only around it. */
export function levelArrive(src: LevelSource, p: LevelPlayer, h: number, seen: readonly string[] = []): LevelState {
  const f = floorAt(src, p.x, h) ?? [...src.floors].filter(f => p.x >= f.x && p.x <= f.x + f.w && f.h <= h + 2).sort((a, b) => b.h - a.h)[0] ?? src.floors.find(f => !f.building) ?? src.floors[0];
  p.y = f.h; p.vy = 0; p.onGround = true;
  const state: LevelState = { floor: f.id, ride: null, reveal: Object.fromEntries(Object.keys({ ...src.shells, ...src.interiors }).map(b => [b, b === f.building ? 1 : 0])) };
  if (src.rooms) {
    state.seen = src.rooms.filter(r => r.keep === 'remember' && seen.includes(r.id)).map(r => r.id);
    state.rooms = Object.fromEntries(src.rooms.map(r => [r.id, roomGoal(r, f, p.x, f.h, state.seen!)]));
    state.here = Object.fromEntries(src.rooms.map(r => [r.id, hereGoal(r, f, p.x, f.h)]));
  }
  return state;
}
/** Is the player (on floor `f`, at x and height h) inside a room? A room in a building holds only that building's floors. */
const inRoom = (r: LevelRoom, f: LevelFloor, x: number, h: number, body = 0) => (!r.building || r.building === f.building) && x >= r.x - 0.5 && x <= r.x + r.w + 0.5 && h + body >= r.h - 2 && h < r.h + r.tall - 2;
/** How tall the player is: on a flight or in a car, a room opens as soon as they rise into it. */
const BODY = 30;
/** How open a room should be: always, never, or while the player is in it (and after, once seen, when it remembers). */
function roomGoal(r: LevelRoom, f: LevelFloor, x: number, h: number, seen: readonly string[], body = 0) {
  return r.reveal === 'never' ? 0 : inRoom(r, f, x, h, body) || seen.includes(r.id) ? 1 : 0;
}
/** Is the room live (the player is in it)? A remembered room elsewhere shows only how it looked. */
const hereGoal = (r: LevelRoom, f: LevelFloor, x: number, h: number, body = 0) => r.reveal !== 'never' && inRoom(r, f, x, h, body) ? 1 : 0;
/** How far the player may walk on their floor (its walls, or the scene's ends outdoors; a walk-in floor opens onto its street). */
export function levelBounds(lv: Level, width: number): [number, number] {
  const here = levelFloor(lv), f = street(lv.source, here) ?? here, [a, b] = ownBounds(lv.source, f, width);
  // joined zones: a floor that meets the next zone's floor at a seam walks on into it
  const before = across(lv.source, f, -1), after = across(lv.source, f, 1);
  return [before ? ownBounds(lv.source, before, width)[0] : a, Math.max(a, after ? ownBounds(lv.source, after, width)[1] : b)];
}
/** A floor's own walls, or its zone's ends where it reaches them (one scene: the scene's ends). */
function ownBounds(src: LevelSource, f: LevelFloor, width: number): [number, number] {
  const z = f.zone ? src.zones?.[f.zone] : undefined, left = z?.x ?? 0, right = z ? z.x + z.w : width;
  return [f.x <= left + 0.5 ? left + 12 : f.x + 6, f.x + f.w >= right - 0.5 ? right - 12 : f.x + f.w - 6];
}
/** The floor in the neighbouring zone that this one meets at a seam, walking `dir` (outdoor floors at one height). */
function across(src: LevelSource, f: LevelFloor, dir: -1 | 1): LevelFloor | undefined {
  if (!f.zone || f.building) return undefined;
  return src.floors.find(o => o.zone !== undefined && o.zone !== f.zone && !o.building && near(o.h, f.h, 2) && (dir > 0 ? Math.abs(o.x - (f.x + f.w)) <= 1.5 : Math.abs(o.x + o.w - f.x) <= 1.5));
}

function doorHere(lv: Level, p: LevelPlayer) {
  const f = levelFloor(lv);
  return lv.source.doors.find(d => near(d.h, f.h, 2) && Math.abs(p.x - d.x) <= d.w / 2 + 4 && (!f.building || f.building === d.building)
    && lv.source.floors.some(o => o.building === d.building && o.entry === 'door' && near(o.h, d.h, 2)));
}
function linkEnd(lv: Level, p: LevelPlayer, end: 'low' | 'high') {
  const f = levelFloor(lv), other = end === 'low' ? 'high' : 'low';
  return lv.source.links.find(l => sees(f, l) && onFloor(f, l[end]) && Math.abs(p.x - l[end].x) <= (l.reach ?? LEVEL_DEFAULTS.reach) && (end === 'low' ? l.runs !== 'down' : l.runs !== 'up') && floorAt(lv.source, l[other].x, l[other].h));
}
function liftHere(lv: Level, p: LevelPlayer) {
  const f = levelFloor(lv);
  return lv.source.lifts.find(l => sees(f, l) && Math.abs(p.x - l.x) <= l.w / 2 + 4 && l.stops.some(s => s.floor === f.id));
}
const ready = (c: { target: number | null; doors: number }) => c.target === null && c.doors > 0.9;

/** ↑: through a door, onto a flight, or the lift panel's choice one floor up. False: nothing here (the game jumps). */
export function levelUp(lv: Level, p: LevelPlayer): boolean { return step(lv, p, 1); }
/** ↓: out through a door, onto a flight going down, or the lift panel's choice one floor down. */
export function levelDown(lv: Level, p: LevelPlayer): boolean { return step(lv, p, -1); }
function step(lv: Level, p: LevelPlayer, dir: 1 | -1): boolean {
  const s = lv.state, ride = s.ride;
  if (ride?.kind === 'lift') { const lift = lv.source.lifts.find(l => l.id === ride.lift)!; ride.pick = Math.max(0, Math.min(lift.stops.length - 1, ride.pick + dir)); return true; }
  if (ride) return true;
  const f = levelFloor(lv), d = doorHere(lv, p);
  if (d && dir > 0 && !f.building) { const inside = floorAt(lv.source, p.x, f.h, d.building); if (inside) { s.floor = inside.id; return true; } }
  if (d && dir < 0 && f.building) { const out = lv.source.floors.find(o => !o.building && near(o.h, f.h, 2) && p.x >= o.x && p.x <= o.x + o.w); if (out) { s.floor = out.id; return true; } }
  const l = linkEnd(lv, p, dir > 0 ? 'low' : 'high'); if (l) { s.ride = { kind: 'link', link: l.id, t: dir > 0 ? 0 : 1, dir }; p.vy = 0; p.onGround = true; return true; }
  return false;
}

/** E on a level prompt: a door, a flight; at a lift, call it or step in; in the car, go to the chosen floor or step out. */
export function levelInteract(lv: Level, id: string, p: LevelPlayer, m: Movers): boolean {
  const s = lv.state;
  if (id.startsWith('door:')) return levelFloor(lv).building ? levelDown(lv, p) : levelUp(lv, p);
  if (id.startsWith('up:')) return levelUp(lv, p);
  if (id.startsWith('down:')) return levelDown(lv, p);
  if (!id.startsWith('lift:')) return false;
  const lift = lv.source.lifts.find(l => 'lift:' + l.id === id), c = lift && !lift.broken && car(lift, m); if (!lift || !c) return false;
  const ride = s.ride;
  if (ride?.kind === 'lift') {
    const pick = lift.stops[ride.pick];
    if (pick && near(pick.h, c.h) && ready(c)) stepOut(lv, p, m);
    else if (pick && !(c.target !== null && near(c.target, pick.h))) c.go(pick.h);
    return true;
  }
  const f = levelFloor(lv);
  if (near(c.h, f.h) && ready(c)) { s.ride = { kind: 'lift', lift: lift.id, pick: Math.max(0, lift.stops.findIndex(st => near(st.h, c.h, 0.5))) }; p.x = lift.x; p.moving = false; return true; }
  c.go(f.h); return true;
}
function stepOut(lv: Level, p: LevelPlayer, m: Movers) {
  const ride = lv.state.ride; if (ride?.kind !== 'lift') return;
  const lift = lv.source.lifts.find(l => l.id === ride.lift)!, c = car(lift, m), stop = c && lift.stops.find(st => near(st.h, c.h));
  if (!c || !stop || !ready(c)) return;
  lv.state.floor = stop.floor; lv.state.ride = null; p.y = floorOf(lv.source, stop.floor).h;
}

/** The prompts the level offers where the player stands. */
export function levelHints(lv: Level, p: LevelPlayer, m: Movers): LevelHint[] {
  const out: LevelHint[] = [], f = levelFloor(lv), h = f.h, ride = lv.state.ride;
  if (ride?.kind === 'lift') {
    const lift = lv.source.lifts.find(l => l.id === ride.lift)!, c = car(lift, m); if (!c) return out;
    const pick = lift.stops[ride.pick], here = !!pick && near(pick.h, c.h) && ready(c), going = c.target !== null ? lift.stops.find(st => near(st.h, c.target!, 0.5)) : undefined;
    const label = going ? 'TO ' + going.label.toUpperCase() + ' …' : (pick ? pick.label.toUpperCase() : '') + ' · [↑↓] FLOOR · ' + (here ? '[E] OUT' : '[E] GO');
    out.push({ id: 'lift:' + lift.id, x: lift.x, h: c.h, label, promptH: c.h + 58 });
    return out;
  }
  if (ride) return out;
  const d = doorHere(lv, p);
  if (d) out.push({ id: 'door:' + d.id, x: d.x, h, label: f.building ? '[↓] STEP OUT' : '[↑] ENTER' + (d.building ? ' · ' + d.building.toUpperCase() : ''), promptH: h + 56 });
  for (const end of ['low', 'high'] as const) {
    const l = linkEnd(lv, p, end); if (!l) continue;
    const word = l.kind === 'escalator' ? 'ESCALATOR ' + (end === 'low' ? 'UP' : 'DOWN') : l.shape === 'ladder' || l.shape === 'rungs' ? (end === 'low' ? 'CLIMB UP' : 'CLIMB DOWN') : end === 'low' ? 'UPSTAIRS' : 'DOWNSTAIRS';
    out.push({ id: (end === 'low' ? 'up:' : 'down:') + l.id, x: l[end].x, h, label: (end === 'low' ? '[↑] ' : '[↓] ') + word, promptH: h + 56 });
  }
  const lift = liftHere(lv, p), c = lift && !lift.broken && car(lift, m);
  if (lift?.broken) out.push({ id: 'broken:' + lift.id, x: lift.x, h, label: 'OUT OF ORDER', promptH: h + 58 });
  if (lift && c) out.push({ id: 'lift:' + lift.id, x: lift.x, h, label: near(c.h, h) && ready(c) ? '[E] STEP IN' : c.target !== null && near(c.target, h) ? 'LIFT COMING…' : '[E] CALL LIFT', promptH: h + 58 });
  return out;
}

/**
 * The level's part of the game's frame for the player: walk or carry them on a flight, carry them in a
 * car, move them between the street and a walk-in building, ease each building's reveal. `walk` is the
 * player's ←/→ (-1, 0, 1). True while the level sets the player's position (the game then skips walking).
 */
export function levelStep(lv: Level, p: LevelPlayer, walk: number, dt: number, m: Movers, climb = 0): boolean {
  const s = lv.state, src = lv.source;
  if (!s.ride) {
    // the street and a walk-in building at the same height are one walk: crossing its side steps in or out
    const f = levelFloor(lv);
    if (!f.building) { const into = src.floors.find(o => street(src, o) === f && p.x > o.x && p.x < o.x + o.w); if (into) s.floor = into.id; }
    else { const out = street(src, f); if (out && (p.x <= f.x || p.x >= f.x + f.w)) s.floor = out.id; }
    // over a seam onto the next zone's floor
    const on = levelFloor(lv), next = p.x > on.x + on.w ? across(src, on, 1) : p.x < on.x ? across(src, on, -1) : undefined;
    if (next) s.floor = next.id;
    // an escalator takes whoever walks onto its boarding end, towards the flight
    if (walk) for (const end of ['low', 'high'] as const) {
      const l = linkEnd(lv, p, end), other = end === 'low' ? 'high' : 'low';
      if (l?.kind === 'escalator' && Math.sign(l[other].x - l[end].x) === walk) { s.ride = { kind: 'link', link: l.id, t: end === 'low' ? 0 : 1, dir: end === 'low' ? 1 : -1 }; break; }
    }
  }
  easeReveal(lv, p, dt);
  easeRooms(lv, p, dt);
  const ride = s.ride;
  if (!ride) return false;
  if (ride.kind === 'lift') {
    const lift = src.lifts.find(l => l.id === ride.lift)!, c = car(lift, m);
    if (!c) { s.ride = null; return false; }
    p.x = lift.x; p.y = c.h; p.moving = false; p.onGround = true; p.vy = 0;
    if (walk && ready(c)) { stepOut(lv, p, m); p.face = walk; }
    if (s.ride) { const stop = lift.stops.find(st => near(st.h, c.h, 0.5)); if (stop) s.floor = stop.floor; }
    return !!s.ride;
  }
  const l = src.links.find(k => k.id === ride.link)!, line = l.path ?? [l.low, l.high], len = pathLength(line) || 1, upward = Math.sign(l.high.x - l.low.x) || 1;
  // stairs: ←/→ walk along a straight flight, ↑/↓ climb a ladder, spiral or switchback; both stop when let go. An escalator carries on by itself.
  const move = l.kind === 'escalator' ? ride.dir : l.shape ? climb : walk * upward;
  ride.t += move * l.speed * dt / len;
  const at = pathAt(line, Math.max(0, Math.min(1, ride.t)));
  if (move && Math.abs(at.x - p.x) > 0.01) p.face = Math.sign(at.x - p.x) || p.face;
  p.x = at.x; p.y = at.h;
  p.moving = l.kind === 'stairs' && move !== 0; p.onGround = true; p.vy = 0;
  if ((move > 0 && ride.t >= 1) || (move < 0 && ride.t <= 0)) {
    // the far end's floor: the flight's own building first (a shophouse stair lands indoors, not on the street at the same height)
    const end = ride.t >= 1 ? l.high : l.low, own = l.inside ?? levelFloor(lv).building, f = (own ? floorAt(src, end.x, end.h, own) : undefined) ?? floorAt(src, end.x, end.h);
    if (f) s.floor = f.id;
    p.y = levelFloor(lv).h; s.ride = null;
  }
  return true;
}
/** A walking line's length, and the point a share `t` of the way along it. */
function pathLength(line: readonly { x: number; h: number }[]) { let n = 0; for (let i = 1; i < line.length; i++) n += Math.hypot(line[i].x - line[i - 1].x, line[i].h - line[i - 1].h); return n; }
function pathAt(line: readonly { x: number; h: number }[], t: number) {
  let left = t * pathLength(line);
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], d = Math.hypot(b.x - a.x, b.h - a.h);
    if (left <= d || i === line.length - 1) { const k = d ? Math.min(1, left / d) : 1; return { x: a.x + (b.x - a.x) * k, h: a.h + (b.h - a.h) * k }; }
    left -= d;
  }
  return line[line.length - 1];
}
/** Is the player climbing a ladder, spiral or switchback (↑/↓ held move them)? */
export function levelClimbing(lv: Level) { const r = lv.state.ride; return r?.kind === 'link' && !!lv.source.links.find(l => l.id === r.link)?.shape; }
/** Does the player stand on an indoor floor (a tunnel, a cellar, an underground hall): the scene is lit as indoors. */
export function levelIndoor(lv: Level) { return !!levelFloor(lv).indoor; }
/** Each building opens towards its goal: shut outside; on a walk-in floor, as far as the player is in from its side; else open. */
function easeReveal(lv: Level, p: LevelPlayer, dt: number) {
  const f = levelFloor(lv), depth = street(lv.source, f) && !lv.state.ride ? Math.min(p.x - f.x, f.x + f.w - p.x) / ENTRY_DEPTH : 1;
  for (const [b, v] of Object.entries(lv.state.reveal)) {
    const goal = f.building === b ? Math.max(0, Math.min(1, depth)) : 0;
    lv.state.reveal[b] = v + (goal - v) * Math.min(1, (lv.source.revealSpeed?.[b] ?? LEVEL_DEFAULTS.revealSpeed) * dt);
  }
}

/** Each room opens (and comes alive) towards its goal at its building's reveal speed; a room that opened for the player is seen (kept if it remembers). */
function easeRooms(lv: Level, p: LevelPlayer, dt: number) {
  const s = lv.state, rooms = lv.source.rooms; if (!rooms || !s.rooms) return;
  const f = levelFloor(lv), h = s.ride ? p.y : f.h, body = s.ride ? BODY : 0, seen = s.seen ??= [], here = s.here ??= {};
  for (const r of rooms) {
    // passing through on a flight or in a car counts: it opened for them, so they remember it
    if (r.reveal === 'arrival' && r.keep === 'remember' && !seen.includes(r.id) && inRoom(r, f, p.x, h, body)) seen.push(r.id);
    const k = Math.min(1, (lv.source.revealSpeed?.[r.building] ?? LEVEL_DEFAULTS.revealSpeed) * 1.6 * dt);
    const v = s.rooms[r.id] ?? 0, goal = roomGoal(r, f, p.x, h, seen, body);
    s.rooms[r.id] = v + (goal - v) * k;
    const lv0 = here[r.id] ?? 0; here[r.id] = lv0 + (hereGoal(r, f, p.x, h, body) - lv0) * k;
  }
}
/** The rooms seen on this visit that stay open: the game keeps them in the save. */
export const levelSeen = (lv: Level): readonly string[] => lv.state.seen ?? [];

/** The renderer's inputs this frame: each building's openness, each lift car (from its mover) and doors, each call button. */
export function levelView(lv: Level, m: Movers): LevelView {
  const lifts: LevelView['lifts'] = {}, buttons: Record<string, number> = {};
  for (const l of lv.source.lifts) {
    const c = car(l, m);
    lifts[l.id] = { car: (c?.h ?? l.stops[0]?.h ?? l.bottom) - l.bottom, doors: c?.doors ?? 0 };
    for (const b of l.buttons ?? []) buttons[b.id] = c && c.target !== null && near(c.target, b.h, 2) ? 1 : 0;
  }
  return { reveal: { ...lv.state.reveal }, lifts, ...(Object.keys(buttons).length ? { buttons } : {}), ...(lv.state.rooms ? { rooms: { ...lv.state.rooms }, here: { ...lv.state.here } } : {}) };
}

/**
 * The renderer's inputs for a level with nobody inside (editor preview): buildings shut, or all open; lifts at the bottom,
 * buttons dark. Rooms: all open and live for authoring, or (`at`: the floors walked, comma-separated, each `floor` or `floor@x`
 * (x: where on it, the floor's middle if left out), the last where the player stands) as the player sees them after that path,
 * by the same rule as play: rooms that remember stay open on the way (darkened, as remembered), rooms that close only where they stand.
 */
export function restingLevelView(source: LevelSource, inside: boolean, at?: string): LevelView {
  const buttons = Object.fromEntries(source.lifts.flatMap(l => (l.buttons ?? []).map(b => [b.id, 0])));
  const path = (at ?? '').split(',').flatMap(step => {
    const [id, x] = step.split('@').map(t => t.trim()), f = source.floors.find(o => o.id === id);
    return f ? [{ f, x: x !== undefined && x !== '' && Number.isFinite(Number(x)) ? Number(x) : f.x + f.w / 2 }] : [];
  });
  const end = path[path.length - 1], seen = source.rooms?.filter(r => r.reveal === 'arrival' && r.keep === 'remember' && path.some(o => inRoom(r, o.f, o.x, o.f.h))).map(r => r.id) ?? [];
  const rooms = source.rooms && Object.fromEntries(source.rooms.map(r => [r.id, end ? roomGoal(r, end.f, end.x, end.f.h, seen) : 1]));
  const here = source.rooms && Object.fromEntries(source.rooms.map(r => [r.id, end ? hereGoal(r, end.f, end.x, end.f.h) : 1]));
  const f = end?.f, open = inside || !!f?.building;
  return { reveal: Object.fromEntries(Object.keys({ ...source.shells, ...source.interiors }).map(b => [b, open && (!f || f.building === b) ? 1 : 0])), lifts: Object.fromEntries(source.lifts.map(l => [l.id, { car: (l.stops[0]?.h ?? l.bottom) - l.bottom, doors: 0 }])), ...(Object.keys(buttons).length ? { buttons } : {}), ...(rooms ? { rooms, here } : {}) };
}

/** One zone's level and where it lies from the active zone (world/zone-graph.ts `placeFrom`). */
export interface LevelPart { zone: string; source: LevelSource; dx: number; dh: number; width: number }
const ns = (zone: string, id: string) => zone + '/' + id;
/**
 * Joined zones walked as one level (docs/design/SEAMLESS-WORLD.md "Joining"): each zone's pieces moved by where it lies
 * from the active zone, with ids (and buildings) as `zone/id` so zones never collide. A stair whose end lands on the
 * other zone's floor joins them; outdoor floors that meet at a seam continue. The level rules then work unchanged.
 */
export function mergeLevels(parts: readonly LevelPart[]): LevelSource {
  const floors: LevelFloor[] = [], links: LevelLink[] = [], doors: LevelDoor[] = [], lifts: LevelLift[] = [], rooms: LevelRoom[] = [];
  const shells: Record<string, string[]> = {}, interiors: Record<string, string[]> = {}, entrances: Record<string, string[]> = {}, revealSpeed: Record<string, number> = {}, ghost: Record<string, number> = {};
  const zones: Record<string, { x: number; w: number; h: number }> = {};
  for (const { zone: z, source: src, dx, dh, width } of parts) {
    zones[z] = { x: dx, w: width, h: dh };
    const b = (building: string | undefined) => building ? ns(z, building) : '', at = (o: { x: number; h: number }) => ({ x: o.x + dx, h: o.h + dh });
    const inside = (o: { inside?: string }) => o.inside ? { inside: ns(z, o.inside) } : {};
    for (const f of src.floors) floors.push({ ...f, id: ns(z, f.id), x: f.x + dx, h: f.h + dh, building: b(f.building), zone: z });
    for (const l of src.links) links.push({ ...l, id: ns(z, l.id), low: at(l.low), high: at(l.high), ...(l.path ? { path: l.path.map(at) } : {}), ...inside(l) });
    for (const d of src.doors) doors.push({ ...d, id: ns(z, d.id), x: d.x + dx, h: d.h + dh, building: b(d.building) });
    for (const l of src.lifts) lifts.push({ ...l, id: ns(z, l.id), x: l.x + dx, bottom: l.bottom + dh, stops: l.stops.map(st => ({ ...st, h: st.h + dh, floor: ns(z, st.floor) })),
      ...(l.buttons ? { buttons: l.buttons.map(k => ({ id: ns(z, k.id), h: k.h + dh })) } : {}), ...inside(l), zone: z, dh });
    for (const r of src.rooms ?? []) rooms.push({ ...r, id: ns(z, r.id), building: b(r.building), x: r.x + dx, h: r.h + dh, children: r.children.map(c => ns(z, c)), live: r.live.map(c => ns(z, c)) });
    for (const [into, from] of [[shells, src.shells], [interiors, src.interiors], [entrances, src.entrances ?? {}]] as const) for (const [k, ids] of Object.entries(from)) into[b(k)] = ids.map(id => ns(z, id));
    for (const [k, v] of Object.entries(src.revealSpeed ?? {})) revealSpeed[b(k)] = v;
    for (const [k, v] of Object.entries(src.ghost ?? {})) ghost[b(k)] = v;
  }
  const hs = floors.map(f => f.h);
  return { floors, links, doors, lifts, shells, interiors, low: Math.min(...hs), high: Math.max(...hs), zones,
    ...(Object.keys(revealSpeed).length ? { revealSpeed } : {}), ...(Object.keys(ghost).length ? { ghost } : {}), ...(rooms.length ? { rooms } : {}), ...(Object.keys(entrances).length ? { entrances } : {}) };
}
/**
 * Over a seam the joined level is built again around the new zone, and may now take in zones it did not hold:
 * the player's state carries over and gains their buildings (shut), rooms (shut, or open where the save remembers them).
 */
export function levelRejoin(lv: Level, source: LevelSource, seen: readonly string[] = []): Level {
  const s = lv.state;
  for (const b of Object.keys({ ...source.shells, ...source.interiors })) s.reveal[b] ??= 0;
  if (source.rooms) {
    const had = new Set(s.seen ?? []);
    for (const r of source.rooms) if (r.keep === 'remember' && seen.includes(r.id)) had.add(r.id);
    s.seen = [...had]; s.rooms ??= {}; s.here ??= {};
    for (const r of source.rooms) { s.rooms[r.id] ??= r.reveal !== 'never' && had.has(r.id) ? 1 : 0; s.here[r.id] ??= 0; }
  }
  return { source, state: s };
}
/** Joined zones: the floor's zone (the zone the player is in), or undefined for one scene's own level. */
export const levelZone = (lv: Level): string | undefined => levelFloor(lv).zone;
/** One zone's part of a joined level's view, in that zone's own ids: what its composition draws from. */
export function splitLevelView(view: LevelView, zone: string): LevelView {
  const pre = zone + '/', own = <T>(r: Record<string, T> | undefined) => r && Object.fromEntries(Object.entries(r).filter(([k]) => k.startsWith(pre)).map(([k, v]) => [k.slice(pre.length), v]));
  const rooms = own(view.rooms), here = own(view.here), buttons = own(view.buttons);
  return { reveal: own(view.reveal)!, lifts: own(view.lifts)!, ...(buttons && Object.keys(buttons).length ? { buttons } : {}), ...(rooms && Object.keys(rooms).length ? { rooms, here } : {}) };
}
/** Joined zones: the rooms remembered on the save, by zone, from a joined level's seen list (and back). */
export const seenByZone = (seen: readonly string[]): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const id of seen) { const i = id.indexOf('/'); if (i > 0) (out[id.slice(0, i)] ??= []).push(id.slice(i + 1)); }
  return out;
};

/**
 * Each level piece's state as the renderer hands it to its artwork (each key must be one of that element's visual fields):
 * a lift car and its doors, a call button lit, a room's openness and how much the player is in it.
 */
export function levelVisualState(view: LevelView): Record<string, Record<string, number>> {
  return { ...Object.fromEntries(Object.entries(view.lifts).map(([id, c]) => [id, { car: c.car, doors: c.doors }])), ...Object.fromEntries(Object.entries(view.buttons ?? {}).map(([id, lit]) => [id, { lit }])),
    ...Object.fromEntries(Object.entries(view.rooms ?? {}).map(([id, open]) => [id, { open, here: view.here?.[id] ?? 1 }])) };
}

/** How much a remembered room's things fade while the player is elsewhere (its wall darkens by `level.room`'s own `here`). */
const REMEMBERED_FADE = 0.3;
/** Opacity of each shell and interior handle for a reveal state (its attached artwork follows). Inside, a shell keeps only its ghost (none by default). */
export function levelOpacity(source: LevelSource, view: LevelView): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [b, ids] of Object.entries(source.shells)) for (const id of ids) out[id] = 1 - (1 - (source.ghost?.[b] ?? LEVEL_DEFAULTS.ghost)) * (view.reveal[b] ?? 0);
  for (const [b, ids] of Object.entries(source.interiors)) for (const id of ids) out[id] = view.reveal[b] ?? 0;
  for (const [b, ids] of Object.entries(source.entrances ?? {})) for (const id of ids) out[id] = view.reveal[b] ?? 0;
  // a room's insides follow its openness; the room itself stays, drawing its cover over what is shut.
  // Away from the player a remembered room shows how it looked: its things a little faded over its darkened wall, its people and devices gone.
  for (const r of source.rooms ?? []) {
    const open = view.rooms?.[r.id] ?? 1, here = view.here?.[r.id] ?? 1;
    for (const id of r.children) out[id] = (out[id] ?? 1) * open * (r.live.includes(id) ? 1 : 1 - REMEMBERED_FADE * (1 - here));
    for (const id of r.live) out[id] = (out[id] ?? 1) * here;
  }
  return out;
}
