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
/** What the graph needs to know about each zone. */
export interface ZoneInfo { width: number }

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
 * `worldProblems` reports paths that disagree.
 */
export function placeFrom(graph: ZoneGraphSource, active: string, hops = 1): Map<string, ZonePlacement> {
  const out = new Map<string, ZonePlacement>([[active, { dx: 0, dh: 0, hops: 0 }]]), queue = [active];
  while (queue.length) {
    const at = queue.shift()!, here = out.get(at)!;
    if (here.hops >= hops) continue;
    for (const s of seamsOf(graph, at)) if (!out.has(s.other)) { out.set(s.other, { dx: here.dx + s.dx, dh: here.dh + s.dh, hops: here.hops + 1 }); queue.push(s.other); }
  }
  return out;
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
