/**
 * The world as a graph of zones (docs/design/SEAMLESS-WORLD.md §2). A zone is a scene: the unit authored, saved,
 * loaded and unloaded. A seam joins two zones with no cut and fixes where one sits beside the other; exits (the
 * cut joins) stay where they are authored today. Pure: the game loop reads it, nothing here keeps per-frame state.
 *
 * There are no global coordinates. The zone the player stands in is at (0, 0) and every other zone near it is
 * placed by walking seams outward from there (a floating origin), so loops and a city-sized network stay harmless.
 */

/** How a seam is crossed: walked over (one zone's edge meets the next), up or down a flight, or through a door. */
export const SEAM_KINDS = ['walk', 'stairs', 'door'] as const;
export type SeamKind = typeof SEAM_KINDS[number];
/** One side of a seam: its zone, and (stairs, door) the level piece the crossing uses there. */
export interface SeamEnd { zone: string; piece?: string }
/** `b`'s origin sits at (`dx`, `dh`) in `a`'s units: `dh` < 0 is below (an underground station under its street). */
export interface Seam { id: string; kind: SeamKind; a: SeamEnd; b: SeamEnd; dx: number; dh: number }
export interface ZoneGraphSource { version: 1; seams: Seam[] }
/** Where a zone sits relative to the active one, and how many seams away it is. */
export interface ZonePlacement { dx: number; dh: number; hops: number }
/** What the graph needs to know about each zone: its width, and (for residency across floors) its height. */
export interface ZoneInfo { width: number; height?: number }

export const EMPTY_ZONE_GRAPH: ZoneGraphSource = { version: 1, seams: [] };

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const end = (v: unknown, where: string): SeamEnd => {
  const o = v as Partial<SeamEnd> | null;
  if (!o || typeof o.zone !== 'string' || !o.zone.trim()) throw new Error(`${where}: a seam end names its zone`);
  if (o.piece !== undefined && (typeof o.piece !== 'string' || !o.piece.trim())) throw new Error(`${where}: piece must name a level piece`);
  return { zone: o.zone.trim(), ...(o.piece ? { piece: o.piece.trim() } : {}) };
};

/** The document's shape (types, ids, kinds); `worldProblems` checks it against the zones. */
export function validateZoneGraph(value: unknown): ZoneGraphSource {
  const doc = value as Partial<ZoneGraphSource> | null;
  if (!doc || doc.version !== 1 || !Array.isArray(doc.seams)) throw new Error('zone graph: { version: 1, seams: [] }');
  const ids = new Set<string>();
  const seams = doc.seams.map((raw, i): Seam => {
    const s = raw as Partial<Seam>, where = `zone graph seam ${typeof s?.id === 'string' ? s.id : i}`;
    if (typeof s?.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(s.id)) throw new Error(`${where}: id is lower-case letters, digits and dashes`);
    if (ids.has(s.id)) throw new Error(`${where}: duplicate id`); ids.add(s.id);
    if (!SEAM_KINDS.includes(s.kind as SeamKind)) throw new Error(`${where}: kind is one of ${SEAM_KINDS.join(', ')}`);
    if (!finite(s.dx) || !finite(s.dh)) throw new Error(`${where}: dx and dh are numbers`);
    const a = end(s.a, where), b = end(s.b, where);
    if (a.zone === b.zone) throw new Error(`${where}: a seam joins two different zones`);
    return { id: s.id, kind: s.kind as SeamKind, a, b, dx: s.dx, dh: s.dh };
  });
  return { version: 1, seams };
}

/** The seams that touch a zone, each seen from that zone: where the other zone sits from here. */
export function seamsOf(graph: ZoneGraphSource, zone: string): { seam: Seam; other: string; dx: number; dh: number }[] {
  return graph.seams.flatMap(seam => seam.a.zone === zone ? [{ seam, other: seam.b.zone, dx: seam.dx, dh: seam.dh }]
    : seam.b.zone === zone ? [{ seam, other: seam.a.zone, dx: 0 - seam.dx, dh: 0 - seam.dh }] : []);
}

/**
 * The zones around `active`, each placed relative to it by walking seams outward (shortest path first), up to
 * `hops` seams away. `active` itself is at (0, 0). A zone reached twice keeps its first (shortest) placement;
 * `worldProblems` reports paths that disagree. Where `within` is given, a zone it refuses is left out and not
 * walked through (residency stops at the eviction distance rather than placing the whole network).
 */
export function placeFrom(graph: ZoneGraphSource, active: string, hops = 1, within?: (zone: string, at: ZonePlacement) => boolean): Map<string, ZonePlacement> {
  const out = new Map<string, ZonePlacement>([[active, { dx: 0, dh: 0, hops: 0 }]]), queue = [active], refused = new Set<string>();
  while (queue.length) {
    const at = queue.shift()!, here = out.get(at)!;
    if (here.hops >= hops) continue;
    for (const s of seamsOf(graph, at)) {
      if (out.has(s.other) || refused.has(s.other)) continue;
      const there = { dx: here.dx + s.dx, dh: here.dh + s.dh, hops: here.hops + 1 };
      if (within && !within(s.other, there)) { refused.add(s.other); continue; }
      out.set(s.other, there); queue.push(s.other);
    }
  }
  return out;
}

/** Connected coordinates for movers and artwork, relative to a source's origin.
 * Traversal/residency policy stays with the caller; this only projects placed coordinates. */
export function placementCoordinates(placed:ReadonlyMap<string,ZonePlacement>,origin={dx:0,dh:0},info?:Readonly<Record<string,ZoneInfo>>){
 return Object.fromEntries([...placed].map(([id,p])=>[id,{x:p.dx-origin.dx,h:p.dh-origin.dh,...(info?.[id]?{w:info[id].width}:{})}]));
}
/** A source's full authored mobile envelope in the currently placed world's coordinates. */
export function mobileRouteExtent(owner:string,scene:Pick<import('../scenes/kit').SceneDef,'width'|'mobileExtent'|'peopleFlows'|'level'>,placed:ReadonlyMap<string,ZonePlacement>){
 const at=placed.get(owner);if(!at)throw Error('Mobile source must be placed: '+owner);
 const flows=(scene.peopleFlows??[]).flatMap(f=>[...f.flow.route,...f.exit].flatMap(w=>{const p=placed.get(w.zone);return p?[p.dx+w.x]:[];}));
 const vehicles=(scene.level?.vehicles??[]).filter(v=>!v.lift).flatMap(v=>v.source.route.legs.flatMap(l=>{const p=placed.get(l.zone==='here'?owner:l.zone);return p?[p.dx+l.from.x,p.dx+l.to.x]:[];}));
 const points=[...(scene.mobileExtent?[at.dx+scene.mobileExtent.from,at.dx+scene.mobileExtent.to]:[]),...flows,...vehicles];
 return points.length?{from:Math.min(...points),to:Math.max(...points)}:{from:at.dx,to:at.dx+scene.width};
}
/** A timeline's camera uses the ordinary graph, with a source-owned origin and zone list. */
export function sequencePlacements(graph:ZoneGraphSource,origin:string,zones:readonly string[],info:Readonly<Record<string,ZoneInfo>>):Map<string,ZonePlacement>{
  if(!zones.includes(origin))throw Error('World sequence origin must be in its zone list');
  const placed=placeFrom(graph,origin,Infinity),out=new Map<string,ZonePlacement>();
  for(const id of zones){const at=placed.get(id);if(!info[id]||!at)throw Error('World sequence zone is missing or unjoined: '+id);out.set(id,at);}
  return out;
}

// ---------- residency (SEAMLESS-WORLD.md §3): which zones are hosted, decided each frame ----------

/** How a zone is held: the one the player is in, on camera, close enough to be hosted, or not hosted at all. */
export const RESIDENCY_TIERS = ['active', 'visible', 'near', 'unloaded'] as const;
export type ResidencyTier = typeof RESIDENCY_TIERS[number];
/** The world-level residency settings (§6.6): distances are in view widths, the margin in units. */
export const RESIDENCY_DEFAULTS = { prefetch: 1.5, evict: 3, margin: 64, budget: 8 } as const;
/** The camera rect in the active zone's units: `x`..`x + w` across and, where `h` is given, `y`..`y + h` up (no `h`: every height is in view). */
export interface CameraRect { x: number; w: number; y?: number; h?: number }
export interface ResidencyInput {
  active: string; camera: CameraRect; viewW: number;
  /** The zones that exist (a zone not named here cannot be hosted and is not walked through). */
  zones: Readonly<Record<string, ZoneInfo>>;
  /** Zones hosted now (hysteresis: a hosted zone stays until it is past the eviction distance). */
  hosted: Iterable<string>;
  /** Zones with a panel or dialogue open: kept hosted wherever they are. */
  held?: Iterable<string>;
  budget?: number; prefetch?: number; evict?: number; margin?: number;
}
/** One zone's answer: its tier, where it lies (none for a held zone out of reach), its gap from the camera rect, and why. */
export interface ZoneResidency { tier: ResidencyTier; at?: ZonePlacement; gap: number; reason: string }
export interface Residency {
  zones: Map<string, ZoneResidency>;
  /** Zones that should be hosted and are not, in the order to compile them (active, visible, then nearest). */
  load: string[];
  /** Zones hosted now that should not be: persist, then dispose. */
  evict: string[];
}

/** The gap between the camera rect and a zone's rect placed at `at` (0 where they overlap); `[across, up]` apart. */
const gapOf = (camera: CameraRect, at: ZonePlacement, zone: ZoneInfo): [number, number] => {
  const gx = Math.max(0, at.dx - (camera.x + camera.w), camera.x - (at.dx + zone.width));
  if (camera.h === undefined) return [gx, 0];
  const y = camera.y ?? 0;
  return [gx, Math.max(0, at.dh - (y + camera.h), y - (at.dh + (zone.height ?? 0)))];
};
const RANK: Record<ResidencyTier, number> = { active: 0, visible: 1, near: 2, unloaded: 3 };

/**
 * Each zone's tier this frame. Placed from `active` along seams (floating origin) out to the eviction distance:
 * **active** the player's zone; **visible** its rect meets the camera rect grown by `margin`; **near** within
 * `prefetch` view widths of the camera rect, or already hosted and not past `evict` view widths (hysteresis), or
 * held by an open panel; **unloaded** otherwise. If more than `budget` would be hosted, the near set shrinks,
 * nearest kept first; active, visible and held zones are never dropped. Pure: the loop compiles `load` (one per
 * frame) and evicts `evict`.
 */
export function residency(graph: ZoneGraphSource, input: ResidencyInput): Residency {
  const D = RESIDENCY_DEFAULTS, budget = input.budget ?? D.budget, margin = input.margin ?? D.margin, { active, camera, zones: info } = input;
  const prefetch = (input.prefetch ?? D.prefetch) * input.viewW, evict = (input.evict ?? D.evict) * input.viewW;
  const hosted = new Set(input.hosted), held = new Set(input.held ?? []);
  const placed = placeFrom(graph, active, Infinity, (z, at) => !!info[z] && Math.hypot(...gapOf(camera, at, info[z])) <= evict);
  const zones = new Map<string, ZoneResidency>();
  for (const [z, at] of placed) {
    if (!info[z]) continue;
    const [gx, gy] = gapOf(camera, at, info[z]), d = Math.hypot(gx, gy), r = (tier: ResidencyTier, reason: string) => zones.set(z, { tier, at, gap: d, reason });
    if (z === active) r('active', 'the player is here');
    else if (gx <= margin && gy <= margin) r('visible', `visible: ${Math.round(d)} from camera`);
    else if (d <= prefetch) r('near', `near: ${Math.round(d)} from camera <= prefetch ${Math.round(prefetch)}`);
    else if (held.has(z)) r('near', 'held: a panel is open');
    else if (hosted.has(z)) r('near', `kept: ${Math.round(d)} from camera <= eviction ${Math.round(evict)}`);
    else r('unloaded', `unloaded: ${Math.round(d)} from camera > prefetch ${Math.round(prefetch)}`);
  }
  for (const z of [...hosted, ...held]) if (!zones.has(z))
    zones.set(z, held.has(z) && info[z] ? { tier: 'near', gap: Infinity, reason: 'held: a panel is open' } : { tier: 'unloaded', gap: Infinity, reason: 'unloaded: past the eviction distance' });
  // the budget: keep the nearest of the near set, never active, visible or held zones
  const keep = [...zones].filter(([, r]) => r.tier !== 'unloaded').sort(([a, x], [b, y]) => (+!held.has(a) - +!held.has(b)) || RANK[x.tier] - RANK[y.tier] || x.gap - y.gap || a.localeCompare(b));
  for (const [z, r] of keep.slice(Math.max(0, budget))) if (r.tier === 'near' && !held.has(z)) zones.set(z, { ...r, tier: 'unloaded', reason: `unloaded: over the budget of ${budget}` });
  const order = [...zones].filter(([z, r]) => r.tier !== 'unloaded' && !hosted.has(z)).sort(([a, x], [b, y]) => RANK[x.tier] - RANK[y.tier] || x.gap - y.gap || a.localeCompare(b));
  return { zones, load: order.map(([z]) => z), evict: [...hosted].filter(z => zones.get(z)?.tier === 'unloaded') };
}

/** Is a zone joined to anything? A zone with no seams is a world of one zone: it runs exactly as a scene always has. */
export const joined = (graph: ZoneGraphSource, zone: string) => graph.seams.some(s => s.a.zone === zone || s.b.zone === zone);

/**
 * What is wrong with the graph against the zones that exist (and, where given, each zone's level pieces):
 * unknown zones, a walk seam whose edges do not meet, a stairs or door seam whose piece is missing, two paths
 * to the same zone that put it in different places.
 */
export function worldProblems(graph: ZoneGraphSource, zones: Readonly<Record<string, ZoneInfo>>, pieces?: Readonly<Record<string, readonly string[]>>): string[] {
  const out: string[] = [];
  for (const s of graph.seams) {
    for (const e of [s.a, s.b]) {
      if (!zones[e.zone]) { out.push(`${s.id}: unknown zone ${e.zone}`); continue; }
      if (e.piece && pieces?.[e.zone] && !pieces[e.zone].includes(e.piece)) out.push(`${s.id}: ${e.zone} has no level piece ${e.piece}`);
    }
    if (s.kind === 'walk' && zones[s.a.zone] && Math.abs(Math.abs(s.dx) - (s.dx >= 0 ? zones[s.a.zone].width : zones[s.b.zone]?.width ?? 0)) > 1)
      out.push(`${s.id}: a walk seam puts ${s.b.zone} at the edge of ${s.a.zone} (dx ${s.dx >= 0 ? zones[s.a.zone].width : -(zones[s.b.zone]?.width ?? 0)}, not ${s.dx})`);
    if ((s.kind === 'stairs' || s.kind === 'door') && (!s.a.piece || !s.b.piece)) out.push(`${s.id}: a ${s.kind} seam names the piece on both sides`);
  }
  // every loop must close: placing from one zone of each joined group, all paths to a zone agree within a unit
  const done = new Set<string>();
  for (const zone of new Set(graph.seams.flatMap(s => [s.a.zone, s.b.zone]))) {
    if (done.has(zone)) continue;
    const at = new Map<string, { dx: number; dh: number }>([[zone, { dx: 0, dh: 0 }]]), queue = [zone]; done.add(zone);
    while (queue.length) {
      const z = queue.shift()!, p = at.get(z)!;
      for (const s of seamsOf(graph, z)) {
        const want = { dx: p.dx + s.dx, dh: p.dh + s.dh }, had = at.get(s.other);
        if (!had) { at.set(s.other, want); queue.push(s.other); done.add(s.other); }
        else if (Math.abs(had.dx - want.dx) > 1 || Math.abs(had.dh - want.dh) > 1) { const msg = `${s.seam.id}: the seams around ${zone} place ${s.other} in two places`; if (!out.includes(msg)) out.push(msg); }
      }
    }
  }
  return out;
}
