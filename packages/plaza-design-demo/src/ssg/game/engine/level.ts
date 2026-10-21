/**
 * LEVELS: floors, stairs, escalators, lifts and buildings you step into (art/levels/elements.ts).
 *
 * `compileLevel` reads the level kit's placements from a resolved composition: where each floor
 * runs, where flights land, which floors a lift shaft crosses, which artwork belongs to a building's
 * shell and interior. `LevelRuntime` is the one physical owner of vertical movement in a scene with
 * a level: the floor the player stands on, a ride on stairs, an escalator or in a lift car, the lift
 * cars and doors, and how far each building is shown cut open. It never touches saves or gameplay;
 * runtime/game.ts asks it where the player is and hands its view state to the renderer.
 *
 * A scene without level floors keeps the old single street line (and its jump ledges).
 */
import type { Resolved } from '../art/core/composition';

export interface LevelFloor { id: string; x: number; w: number; h: number; building: string; label: string }
export interface LevelLink { id: string; kind: 'stairs' | 'escalator'; low: { x: number; h: number }; high: { x: number; h: number }; runs: 'both' | 'up' | 'down'; speed: number; reach?: number }
export interface LevelDoor { id: string; x: number; h: number; w: number; building: string }
export interface LevelLift { id: string; x: number; w: number; bottom: number; height: number; stops: { h: number; floor: string; label: string }[]; device?: string; speed?: number; doorSpeed?: number }
export interface LevelSource {
  floors: LevelFloor[]; links: LevelLink[]; doors: LevelDoor[]; lifts: LevelLift[];
  /** Instance ids of each building's shell and interior handles (their attached artwork follows them). */
  shells: Record<string, string[]>; interiors: Record<string, string[]>;
  /** A building's own reveal speed, where its shell handle sets one other than the default. */
  revealSpeed?: Record<string, number>;
  /** The lowest and highest floor: how far the camera may look down and up. */
  low: number; high: number;
}
/** What the renderer needs this frame: how open each building is (0 outside, 1 inside), each lift car and its doors. */
export interface LevelView { reveal: Record<string, number>; lifts: Record<string, { car: number; doors: number }> }

const near = (a: number, b: number, d = 0.75) => Math.abs(a - b) <= d;
/** The level kit's defaults (art/levels/elements.ts); a compiled piece carries a tuned value only where it differs. */
export const LEVEL_DEFAULTS = { stairSpeed: 1, reach: 10, liftSpeed: 1.4, doorSpeed: 0.06, revealSpeed: 0.07 } as const;
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
  }));
  if (!floors.length) return undefined;
  const links: LevelLink[] = rows.filter(r => r.element.type === 'level.stairs' || r.element.type === 'level.escalator').map(r => {
    const p = r.placement, foot = { x: p.x, h: p.h }, top = { x: p.x + Number(r.props.run) * p.scale * p.facing, h: p.h + Number(r.props.rise) * p.scale };
    const [low, high] = top.h >= foot.h ? [foot, top] : [top, foot], stairs = r.element.type === 'level.stairs';
    // an escalator runs from its foot to its top ('up') or back; physically that may be downhill
    const footToTop = (r.props.direction ?? 'up') !== 'down', uphill = top.h >= foot.h;
    const speed = Number(r.props.speed ?? LEVEL_DEFAULTS.stairSpeed);
    return { id: r.instance.id, kind: stairs ? 'stairs' : 'escalator', low, high, runs: stairs ? 'both' : footToTop === uphill ? 'up' : 'down', speed, ...tuned('reach', r.props.reach, LEVEL_DEFAULTS.reach) } as LevelLink;
  });
  const doors: LevelDoor[] = rows.filter(r => r.element.type === 'level.door').map(r => ({ id: r.instance.id, x: r.placement.x, h: r.placement.h, w: Number(r.props.width) * r.placement.scale, building: String(r.props.building ?? '').trim() }));
  const lifts: LevelLift[] = rows.filter(r => r.element.type === 'level.elevator').map(r => {
    const p = r.placement, bottom = p.h, height = Number(r.props.height) * p.scale;
    // one stop per height the shaft crosses; a building's floor wins over the street at the same height
    const crossed = floors.filter(f => p.x >= f.x && p.x <= f.x + f.w && f.h >= bottom - 0.75 && f.h <= bottom + height + 0.75).sort((a, b) => a.h - b.h || Number(!a.building) - Number(!b.building));
    const stops = crossed.filter((f, i) => i === 0 || !near(f.h, crossed[i - 1].h)).map(f => ({ h: f.h, floor: f.id, label: f.label || f.id }));
    const device = String(r.props.device ?? '').trim();
    return { id: r.instance.id, x: p.x, w: Number(r.props.width) * p.scale, bottom, height, stops, ...(device ? { device } : {}), ...tuned('speed', r.props.speed, LEVEL_DEFAULTS.liftSpeed), ...tuned('doorSpeed', r.props.doorSpeed, LEVEL_DEFAULTS.doorSpeed) };
  });
  const hs = floors.map(f => f.h), revealSpeed: Record<string, number> = {};
  for (const r of rows) if (r.element.type === 'level.shell') Object.assign(revealSpeed, tuned(String(r.props.building ?? ''), r.props.revealSpeed, LEVEL_DEFAULTS.revealSpeed));
  return { floors, links, doors, lifts, shells: group(rows, 'level.shell'), interiors: group(rows, 'level.interior'), low: Math.min(...hs), high: Math.max(...hs), ...(Object.keys(revealSpeed).length ? { revealSpeed } : {}) };
}

/** The player as the level sees it (the same object game.ts moves). */
export interface LevelPlayer { x: number; y: number; vy: number; face: number; onGround: boolean; moving: boolean }
/** A prompt: `h` is the floor it is offered on, `promptH` the absolute height its text stands at. */
export interface LevelHint { id: string; x: number; h: number; label: string; promptH: number }
type Ride = { kind: 'link'; link: LevelLink; t: number; dir: 1 | -1 } | { kind: 'lift'; lift: LevelLift };
/**
 * A lift whose car is a Circuit mover (engine/movers.ts): the level reads where the car is and asks
 * the mover to go to a stop's height; cables and hack vision can send it too.
 */
export interface LiftDrive { position(): number | undefined; target(): number | null; go(h: number): void }
/** What a lift needs from the scene's model (SceneModel): its device parts with movers, and the movers themselves. */
export interface MoverModel {
  devices: ReadonlyMap<string, { data: { nouns: readonly { id: string; mover?: { stops: Readonly<Record<string, number>> } }[] } }>;
  movers: { position(key: string): number | undefined; moving(key: string): boolean; target(key: string): string | undefined };
  moveTo(dev: string, noun: string, stop: string): unknown;
}
/** The drives of the lifts whose `device` names a mover part (device.part) the model has; the rest drive themselves. */
export function moverDrives(source: LevelSource, m: MoverModel): Record<string, LiftDrive> {
  const out: Record<string, LiftDrive> = {};
  for (const lift of source.lifts) {
    if (!lift.device) continue;
    const i = lift.device.indexOf('.'), dev = lift.device.slice(0, i), noun = lift.device.slice(i + 1), key = dev + '.' + noun;
    const stops = m.devices.get(dev)?.data.nouns.find(n => n.id === noun)?.mover?.stops;
    if (!stops) continue;
    out[lift.id] = {
      position: () => m.movers.position(key),
      target: () => { const t = m.movers.moving(key) ? m.movers.target(key) : undefined; return t === undefined ? null : stops[t]; },
      go: h => { const stop = Object.keys(stops).find(k => Math.abs(stops[k] - h) < 0.75); if (stop) m.moveTo(dev, noun, stop); },
    };
  }
  return out;
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
interface Car { h: number; target: number | null; doors: number; open: boolean }


export class LevelRuntime {
  floor: LevelFloor;
  private ride: Ride | null = null;
  private cars = new Map<string, Car>();
  private reveal = new Map<string, number>();
  constructor(readonly source: LevelSource, private drives: Record<string, LiftDrive> = {}) {
    this.floor = source.floors.find(f => !f.building) ?? source.floors[0];
    for (const l of source.lifts) this.cars.set(l.id, { h: l.stops[0]?.h ?? l.bottom, target: null, doors: 0, open: false });
    for (const b of Object.keys({ ...source.shells, ...source.interiors })) this.reveal.set(b, 0);
  }
  get riding() { return !!this.ride; }
  /** The floor at (x, h): outdoors first, so a street door's arrival is on the street, then any building's. */
  floorAt(x: number, h: number, building?: string): LevelFloor | undefined {
    const on = this.source.floors.filter(f => near(f.h, h, 2) && x >= f.x - 0.5 && x <= f.x + f.w + 0.5 && (building === undefined || f.building === building));
    return on.find(f => !f.building) ?? on[0];
  }
  /** Arriving in the scene (spawn or an exit at height h): the floor there, or the nearest one below. */
  arrive(p: LevelPlayer, h: number) {
    this.ride = null;
    const f = this.floorAt(p.x, h) ?? [...this.source.floors].filter(f => p.x >= f.x && p.x <= f.x + f.w && f.h <= h + 2).sort((a, b) => b.h - a.h)[0] ?? this.floor;
    this.floor = f; p.y = f.h; p.vy = 0; p.onGround = true;
    for (const b of this.reveal.keys()) this.reveal.set(b, b === f.building ? 1 : 0);
  }
  /** How far the player may walk on this floor (its walls, or the scene's ends outdoors). */
  bounds(width: number): [number, number] {
    const f = this.floor, a = f.x <= 0.5 ? 12 : f.x + 6, b = f.x + f.w >= width - 0.5 ? width - 12 : f.x + f.w - 6;
    return [a, Math.max(a, b)];
  }

  private doorHere(p: LevelPlayer) { return this.source.doors.find(d => near(d.h, this.floor.h, 2) && Math.abs(p.x - d.x) <= d.w / 2 + 4 && (!this.floor.building || this.floor.building === d.building)); }
  private linkEnd(p: LevelPlayer, end: 'low' | 'high') {
    return this.source.links.find(l => near(l[end].h, this.floor.h, 2) && Math.abs(p.x - l[end].x) <= (l.reach ?? LEVEL_DEFAULTS.reach) && (end === 'low' ? l.runs !== 'down' : l.runs !== 'up') && this.floorAt(l[end === 'low' ? 'high' : 'low'].x, l[end === 'low' ? 'high' : 'low'].h));
  }
  private liftHere(p: LevelPlayer) {
    return this.source.lifts.find(l => Math.abs(p.x - l.x) <= l.w / 2 + 4 && l.stops.some(s => s.floor === this.floor.id));
  }
  private startLink(p: LevelPlayer, link: LevelLink, dir: 1 | -1) {
    this.ride = { kind: 'link', link, t: dir > 0 ? 0 : 1, dir }; p.vy = 0; p.onGround = true;
  }

  /** ↑: into a building, up a flight, or the lift car one stop up. False: nothing here (the game jumps). */
  up(p: LevelPlayer): boolean {
    if (this.ride?.kind === 'lift') { this.send(this.ride.lift, 1); return true; }
    if (this.ride) return true;
    const d = this.doorHere(p);
    if (d && !this.floor.building) { const inside = this.floorAt(p.x, this.floor.h, d.building); if (inside) { this.floor = inside; return true; } }
    const l = this.linkEnd(p, 'low'); if (l) { this.startLink(p, l, 1); return true; }
    return false;
  }
  /** ↓: out of a building, down a flight, or the lift car one stop down. */
  down(p: LevelPlayer): boolean {
    if (this.ride?.kind === 'lift') { this.send(this.ride.lift, -1); return true; }
    if (this.ride) return true;
    const d = this.doorHere(p);
    if (d && this.floor.building) { const out = this.source.floors.find(f => !f.building && near(f.h, this.floor.h, 2) && p.x >= f.x && p.x <= f.x + f.w); if (out) { this.floor = out; return true; } }
    const l = this.linkEnd(p, 'high'); if (l) { this.startLink(p, l, -1); return true; }
    return false;
  }
  /** The lift car to the next stop up (1) or down (-1) from where it is or is heading. */
  private send(lift: LevelLift, dir: 1 | -1) {
    const car = this.cars.get(lift.id)!, from = car.target ?? car.h;
    const next = dir > 0 ? lift.stops.find(s => s.h > from + 0.5) : [...lift.stops].reverse().find(s => s.h < from - 0.5);
    if (next) this.call(lift, next.h);
  }
  /** Send the car to a height: through its mover when it has one, else on its own. */
  private call(lift: LevelLift, h: number) {
    const car = this.cars.get(lift.id)!, drive = this.drives[lift.id];
    car.open = false;
    if (drive) drive.go(h); else car.target = h;
  }

  /** E on a level prompt. */
  interact(id: string, p: LevelPlayer): boolean {
    if (id.startsWith('door:')) return this.floor.building ? this.down(p) : this.up(p);
    if (id.startsWith('up:')) return this.up(p);
    if (id.startsWith('down:')) return this.down(p);
    if (id.startsWith('lift:')) {
      const lift = this.source.lifts.find(l => 'lift:' + l.id === id); if (!lift) return false;
      const car = this.cars.get(lift.id)!;
      if (this.ride?.kind === 'lift') { this.stepOut(p); return true; }
      if (near(car.h, this.floor.h) && car.target === null && car.doors > 0.9) { this.ride = { kind: 'lift', lift }; p.x = lift.x; p.moving = false; return true; }
      this.call(lift, this.floor.h); return true;
    }
    return false;
  }
  private stepOut(p: LevelPlayer) {
    if (this.ride?.kind !== 'lift') return;
    const lift = this.ride.lift, car = this.cars.get(lift.id)!, stop = lift.stops.find(s => near(s.h, car.h));
    if (!stop || car.target !== null || car.doors < 0.9) return;
    this.floor = this.source.floors.find(f => f.id === stop.floor) ?? this.floor; this.ride = null; p.y = this.floor.h;
  }

  /** The prompts the level offers where the player stands. */
  hints(p: LevelPlayer): LevelHint[] {
    const out: LevelHint[] = [], h = this.floor.h;
    if (this.ride?.kind === 'lift') {
      const lift = this.ride.lift, car = this.cars.get(lift.id)!, stop = lift.stops.find(s => near(s.h, car.target ?? car.h, 0.5));
      out.push({ id: 'lift:' + lift.id, x: lift.x, h: car.h, label: (stop ? stop.label.toUpperCase() + ' · ' : '') + '[↑↓] FLOOR' + (car.target === null && car.doors > 0.9 ? ' · [E] OUT' : ''), promptH: car.h + 58 });
      return out;
    }
    if (this.ride) return out;
    const d = this.doorHere(p);
    if (d) out.push({ id: 'door:' + d.id, x: d.x, h, label: this.floor.building ? '[↓] STEP OUT' : '[↑] ENTER' + (d.building ? ' · ' + d.building.toUpperCase() : ''), promptH: h + 56 });
    for (const end of ['low', 'high'] as const) {
      const l = this.linkEnd(p, end); if (!l) continue;
      const word = l.kind === 'stairs' ? (end === 'low' ? 'UPSTAIRS' : 'DOWNSTAIRS') : 'ESCALATOR ' + (end === 'low' ? 'UP' : 'DOWN');
      out.push({ id: (end === 'low' ? 'up:' : 'down:') + l.id, x: l[end].x, h, label: (end === 'low' ? '[↑] ' : '[↓] ') + word, promptH: h + 56 });
    }
    const lift = this.liftHere(p);
    if (lift) { const car = this.cars.get(lift.id)!, here = near(car.h, h) && car.target === null && car.doors > 0.9; out.push({ id: 'lift:' + lift.id, x: lift.x, h, label: here ? '[E] STEP IN' : car.target !== null && near(car.target, h) ? 'LIFT COMING…' : '[E] CALL LIFT', promptH: h + 58 }); }
    return out;
  }

  /**
   * One frame. Moves the lift cars and their doors, carries a riding player, eases each building's
   * reveal. Returns true while the level owns the player's position (a ride); the game then skips walking.
   */
  update(dt: number, p: LevelPlayer, walk: number): boolean {
    for (const lift of this.source.lifts) {
      const car = this.cars.get(lift.id)!, drive = this.drives[lift.id], doorSpeed = lift.doorSpeed ?? LEVEL_DEFAULTS.doorSpeed;
      if (drive) {
        // the mover moves the car; the doors shut while it travels and open when it stops
        const h = drive.position(), target = drive.target();
        if (h !== undefined) car.h = h;
        if (target !== null) { car.target = target; car.doors = Math.max(0, car.doors - doorSpeed * 3 * dt); }
        else { if (car.target !== null) car.open = true; car.target = null; if (car.open) car.doors = Math.min(1, car.doors + doorSpeed * dt); }
        continue;
      }
      if (car.target !== null) {
        if (car.doors > 0) car.doors = Math.max(0, car.doors - doorSpeed * dt);
        else { const d = car.target - car.h, step = Math.sign(d) * Math.min(Math.abs(d), (lift.speed ?? LEVEL_DEFAULTS.liftSpeed) * dt); car.h += step; if (near(car.h, car.target, 0.01)) { car.h = car.target; car.target = null; car.open = true; } }
      } else if (car.open) car.doors = Math.min(1, car.doors + doorSpeed * dt);
    }
    for (const [b, v] of this.reveal) { const goal = this.floor.building === b ? 1 : 0; this.reveal.set(b, v + (goal - v) * Math.min(1, (this.source.revealSpeed?.[b] ?? LEVEL_DEFAULTS.revealSpeed) * dt)); }
    const r = this.ride;
    if (!r) return false;
    if (r.kind === 'lift') {
      const car = this.cars.get(r.lift.id)!;
      p.x = r.lift.x; p.y = car.h; p.moving = false; p.onGround = true; p.vy = 0;
      if (walk && car.target === null && car.doors > 0.9) { this.stepOut(p); p.face = walk; }
      if (this.ride?.kind === 'lift') { const stop = r.lift.stops.find(s => near(s.h, car.h, 0.5)); if (stop) this.floor = this.source.floors.find(f => f.id === stop.floor) ?? this.floor; }
      return this.riding;
    }
    const l = r.link, len = Math.hypot(l.high.x - l.low.x, l.high.h - l.low.h) || 1;
    r.t += r.dir * l.speed * dt / len;
    const t = Math.max(0, Math.min(1, r.t));
    p.x = l.low.x + (l.high.x - l.low.x) * t; p.y = l.low.h + (l.high.h - l.low.h) * t;
    p.face = Math.sign((l.high.x - l.low.x) * r.dir) || p.face; p.moving = l.kind === 'stairs'; p.onGround = true; p.vy = 0;
    if (r.t >= 1 || r.t <= 0) {
      const end = r.t >= 1 ? l.high : l.low;
      this.floor = this.floorAt(end.x, end.h) ?? this.floor; p.y = this.floor.h; this.ride = null;
    }
    return true;
  }

  view(): LevelView {
    return { reveal: Object.fromEntries(this.reveal), lifts: Object.fromEntries([...this.cars].map(([id, c]) => { const l = this.source.lifts.find(x => x.id === id)!; return [id, { car: c.h - l.bottom, doors: c.doors }]; })) };
  }
}

/** The renderer's inputs for a level with nobody inside (editor preview): buildings shut, or all open; lifts at the bottom. */
export function restingLevelView(source: LevelSource, inside: boolean): LevelView {
  return { reveal: Object.fromEntries(Object.keys({ ...source.shells, ...source.interiors }).map(b => [b, inside ? 1 : 0])), lifts: Object.fromEntries(source.lifts.map(l => [l.id, { car: (l.stops[0]?.h ?? l.bottom) - l.bottom, doors: 0 }])) };
}

/** Opacity of each shell and interior handle for a reveal state (its attached artwork follows). Shells keep a ghost. */
export function levelOpacity(source: LevelSource, view: LevelView): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [b, ids] of Object.entries(source.shells)) for (const id of ids) out[id] = 1 - 0.88 * (view.reveal[b] ?? 0);
  for (const [b, ids] of Object.entries(source.interiors)) for (const id of ids) out[id] = view.reveal[b] ?? 0;
  return out;
}
