/**
 * The city's street plan (CITY.md, "The map"): the coast, the Spire's island, the canal, the
 * avenues, and one continuous street network traced through a direction field. Pure geometry, no
 * drawing: citymap.ts draws it. Plan units (city.ts `MAP_W` × `MAP_H`): x east, y south; the sea
 * lies east of the coast.
 *
 * How the streets are made (`plan()`, once, lazily, the same every time: no randomness but a hash):
 * - A **direction field** flows over the whole city: a sum of doubled-angle vectors, one term per
 *   district's character (Downtown a gently warped grid with a ring round Circle Park, the market's
 *   skew, the Galleria planned on a diagonal, streets following the shore and the canal, the Fringe
 *   loose, the Skyport a military grid).
 * - The canal's embankments and the avenues go in first. Then streets are traced from seeds (nearest
 *   Downtown first), along the field (family 0) and across it (family 1), stopping at water or when
 *   they come too close to a street of their own family (a spatial hash; `sep` per district).
 * - **No dead ends**: each end carries on, bending with the field, until it meets another street,
 *   the shore or the canal's bank (or it is left as it was if it meets nothing).
 * - Streets are smoothed (Chaikin, twice). Streets never cross water; only the avenues cross the
 *   canal, on bridges.
 * - Towers stand back from the streets, fewer and bigger, their height by the district's density.
 *
 * `planProblems()` is part of the build's data check: every place on the map stands on land in its
 * own district and inside its district's frame.
 */

import { DISTRICT_MAP, DISTRICTS, MAP_H, MAP_W, PAD_MAP, PLACE_MAP, PLACES, STAND_IDS, STATION_MAP, STATIONS, placeOf, type DistrictId } from './city';

export type Pt = [number, number];

/** The shore, north to south; the sea lies east of it. */
export const COAST: Pt[] = [[700, 0], [690, 60], [660, 92], [650, 150], [700, 188], [740, 230], [736, 290], [760, 340], [790, 390]];
/** The Spire's island in the bay. */
export const ISLE = { x: 770, y: 120, r: 26 };
/** The canal, from the west into the bay, and its width. */
export const CANAL: Pt[] = [[0, 300], [90, 292], [160, 310], [230, 300], [300, 318], [390, 306], [470, 318], [540, 304], [600, 320], [660, 330], [720, 334], [800, 338]];
export const CANAL_W = 8;

/** The avenues: long, continuous, curving through the districts. `ring`: the highway. */
export interface Avenue { pts: Pt[]; w: number; name: string; ring?: boolean }
export const AVENUES: Avenue[] = [
  { pts: [[0, 236], [120, 230], [250, 226], [400, 228], [520, 224], [620, 206], [700, 196]], w: 5, name: 'AVENUE 0' },
  { pts: [[318, 30], [322, 120], [330, 228], [338, 320], [346, 390]], w: 4, name: 'REGISTRY ROAD' },
  { pts: [[130, 80], [190, 150], [228, 228], [246, 300], [250, 390]], w: 3, name: 'OLD QUARTER LANE' },
  { pts: [[470, 20], [478, 120], [486, 228], [500, 300], [520, 380]], w: 4, name: 'GALLERIA WAY' },
  { pts: [[330, 140], [420, 110], [520, 80], [620, 76], [680, 70]], w: 3, name: 'SKYLINE DRIVE' },
  { pts: [[520, 226], [580, 270], [640, 300], [700, 330]], w: 3, name: 'DOCK ROAD' },
  { pts: [[14, 132], [120, 114], [240, 98], [330, 104], [420, 92], [520, 66], [640, 52], [688, 46]], w: 6, name: 'THE RING', ring: true },
  { pts: [[62, 124], [56, 96], [50, 70]], w: 3, name: 'LAUNCH ROAD' },
];
/** Circle Park, Downtown's roundabout. */
export const PARK = { x: 395, y: 205, rx: 12, ry: 9 };
/** The Skyport's fence (x, y, w, h). */
export const FENCE: [number, number, number, number] = [6, 14, 96, 104];

/** The shore's x at a plan y. */
export function coastX(y: number) {
  for (let i = 1; i < COAST.length; i++) {
    const [x0, y0] = COAST[i - 1], [x1, y1] = COAST[i];
    if (y >= y0 && y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
  }
  return 790;
}
/** How far a point is from the canal's middle line. */
export function canalDist(px: number, py: number) {
  let best = 1e9;
  for (let i = 0; i < CANAL.length - 1; i++) {
    const [a, b] = CANAL[i], [c, d] = CANAL[i + 1], dx = c - a, dy = d - b;
    const t = Math.max(0, Math.min(1, ((px - a) * dx + (py - b) * dy) / (dx * dx + dy * dy)));
    const ex = a + dx * t - px, ey = b + dy * t - py, e = ex * ex + ey * ey;
    if (e < best) best = e;
  }
  return Math.sqrt(best);
}
/** Dry land of the city (not the sea, not the canal, not the island). */
export const onLand = (px: number, py: number) => px > 3 && py > 3 && py < MAP_H - 3 && px < coastX(py) - 3 && canalDist(px, py) > CANAL_W / 2 + 1.5;
export const onIsle = (px: number, py: number) => Math.hypot(px - ISLE.x, py - ISLE.y) <= ISLE.r;

/** The districts with streets of their own (a centre on the plan). */
const GROUND = DISTRICTS.map((d) => d.id).filter((d) => DISTRICT_MAP[d].centre) as DistrictId[];

/** The district a point of the plan belongs to: the island is the Spire's, the land is shared out to the nearest centre. */
export function districtAt(px: number, py: number): DistrictId {
  if (onIsle(px, py)) return 'spire';
  let best: DistrictId = 'downtown', bd = 1e9;
  for (const k of GROUND) {
    const [cx, cy] = DISTRICT_MAP[k].centre!, d = (px - cx) ** 2 + ((py - cy) * 1.2) ** 2;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}
/** How far apart the streets run here: each district's `sep`, blended softly between centres. */
function sepAt(px: number, py: number) {
  let s = 0, w = 0;
  for (const k of GROUND) {
    const [cx, cy] = DISTRICT_MAP[k].centre!, d2 = ((px - cx) ** 2 + (py - cy) ** 2) / 4900, q = 1 / (1 + d2 * d2);
    s += DISTRICT_MAP[k].sep * q; w += q;
  }
  return w ? s / w : 14;
}

/** A hash of a number to 0..1 (integer arithmetic, so every browser traces the same streets). */
export function hash(n: number) {
  let h = Math.imul(Math.round(n * 1024) ^ 0x2c1b3c6d, 0x297a2d39);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The direction field: the angle streets run along at a point (the cross streets run at right angles to it). */
function fieldAt(px: number, py: number) {
  let c = 0, s = 0;
  const add = (th: number, w: number) => { c += Math.cos(2 * th) * w; s += Math.sin(2 * th) * w; };
  const g = (x0: number, y0: number, r: number) => { const d2 = (px - x0) ** 2 + (py - y0) ** 2; return Math.exp(-d2 / (2 * r * r)); };
  add(0.04, 0.3);
  add(0.02 + (py - 205) * 0.0012, g(395, 205, 90)); // Downtown: a gently warped grid
  add(Math.atan2(py - PARK.y, px - PARK.x), g(PARK.x, PARK.y, 22) * 2.2); // rings only round Circle Park
  add(0.42, g(230, 262, 50) * 1.1); // the market's skew
  add(-0.62, g(560, 110, 55) * 1.2); // the Galleria, planned on a diagonal
  { const cx = coastX(py), d = cx - px, ang = Math.atan2(10, coastX(py + 10) - cx); add(ang, Math.exp(-(d * d) / (2 * 40 * 40)) * 1.6); } // along the shore
  add(0.25 + Math.sin(py * 0.03) * 0.25, g(80, 190, 70)); // the Fringe, loose
  add(0.06 + Math.sin(px * 0.02) * 0.18, g(300, 322, 60) * 1.1); // the Old Quarter, following the canal
  add(0, g(48, 62, 40) * 2.4); // the Skyport: a military grid
  return Math.atan2(s, c) / 2;
}

/** A street: its points, its district (where it was seeded), its width. `bank`: an embankment along the canal. */
export interface Street { pts: Pt[]; d: DistrictId; w: number; bank?: boolean }
/** A tower's footprint: centre, the angle it is turned to, its size, district and a hash (its height and windows). */
export interface Tower { x: number; y: number; th: number; s: number; d: DistrictId; k: number }
/** An avenue cut into one piece per district it runs through (so each piece can be drawn as that district is known). */
export interface AvenuePiece { pts: Pt[]; w: number; d: DistrictId; ring: boolean; name: string }
/** Where an avenue crosses the canal: a bridge's railing posts (point, the avenue's normal, half its width). */
export interface Bridge { x: number; y: number; nx: number; ny: number; hw: number; d: DistrictId }
export interface Plan {
  streets: Street[];
  towers: Tower[];
  avenues: AvenuePiece[];
  bridges: Bridge[];
  /** The plan in cells of `cell` units: each cell's district (its index in DISTRICTS, +1), 0 for water. */
  cells: Uint8Array; cell: number; cols: number; rows: number;
  /** How long the trace took (ms), for the curious. */
  ms: number;
}

let PLAN: Plan | null = null;

/** The street plan, traced on first use and kept. */
export function plan(): Plan {
  return (PLAN ??= build());
}

function build(): Plan {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const W = MAP_W, H = MAP_H;
  // the field and the land, sampled on a fine grid as the trace asks for them (it asks thousands of times)
  const FG = 2, fc = Math.ceil(W / FG) + 2, fr = Math.ceil(H / FG) + 2;
  const fx = new Float32Array(fc * fr).fill(NaN), fy = new Float32Array(fc * fr);
  const node = (k: number) => {
    if (fx[k] !== fx[k]) { const th = fieldAt((k % fc) * FG, Math.floor(k / fc) * FG); fx[k] = Math.cos(2 * th); fy[k] = Math.sin(2 * th); }
    return k;
  };
  const field = (px: number, py: number) => {
    const gx = Math.max(0, Math.min(fc - 2, px / FG)), gy = Math.max(0, Math.min(fr - 2, py / FG)), i = Math.floor(gx), j = Math.floor(gy), u = gx - i, v = gy - j;
    const k = j * fc + i, w00 = (1 - u) * (1 - v), w10 = u * (1 - v), w01 = (1 - u) * v, w11 = u * v;
    node(k); node(k + 1); node(k + fc); node(k + fc + 1);
    const c = fx[k] * w00 + fx[k + 1] * w10 + fx[k + fc] * w01 + fx[k + fc + 1] * w11;
    const s = fy[k] * w00 + fy[k + 1] * w10 + fy[k + fc] * w01 + fy[k + fc + 1] * w11;
    return Math.atan2(s, c) / 2;
  };
  const lc = W + 1, lr = H + 1, land = new Uint8Array(lc * lr).fill(2);
  const isLand = (px: number, py: number) => {
    const i = Math.round(px), j = Math.round(py);
    if (i < 0 || j < 0 || i >= lc || j >= lr) return false;
    const k = j * lc + i;
    if (land[k] === 2) land[k] = onLand(i, j) ? 1 : 0;
    return land[k] === 1;
  };

  // samples of every street in a grid, with the street's id, so an end can find a street that isn't its own
  const cell = 6, grid = [new Map<number, number[]>(), new Map<number, number[]>()], key = (gx: number, gy: number) => gx * 4096 + gy;
  const put = (f: number, px: number, py: number, id: number) => {
    const k = key(Math.floor(px / cell), Math.floor(py / cell));
    let a = grid[f].get(k); if (!a) grid[f].set(k, (a = [])); a.push(px, py, id);
  };
  const nearest = (fams: number[], px: number, py: number, r: number, not = -1) => {
    const gx = Math.floor(px / cell), gy = Math.floor(py / cell), n = Math.ceil(r / cell);
    let best = 1e18, bq = -1, ba: number[] | null = null;
    for (const f of fams) for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const a = grid[f].get(key(gx + i, gy + j)); if (!a) continue;
      for (let q = 0; q < a.length; q += 3) {
        if (a[q + 2] === not) continue;
        const dx = a[q] - px, dy = a[q + 1] - py, d = dx * dx + dy * dy; if (d < best) { best = d; bq = q; ba = a; }
      }
    }
    return { d: Math.sqrt(best), at: ba ? ([ba[bq], ba[bq + 1]] as Pt) : null };
  };
  const near = (fams: number[], px: number, py: number, r: number) => nearest(fams, px, py, r).d;
  let nextId = 0;
  const streets: Street[] = [];

  // the embankments along both banks of the canal, and the avenues, go in first: streets meet them
  for (const side of [-1, 1]) {
    const b: Pt[] = [];
    for (let i = 0; i < CANAL.length; i++) {
      const [a, bb] = CANAL[Math.max(0, i - 1)], [c, d] = CANAL[Math.min(CANAL.length - 1, i + 1)], L = Math.hypot(c - a, d - bb) || 1;
      const nx = -(d - bb) / L, ny = (c - a) / L, [px, py] = CANAL[i];
      b.push([px + nx * side * (CANAL_W / 2 + 3), py + ny * side * (CANAL_W / 2 + 3)]);
    }
    const pts: Pt[] = [];
    for (let i = 0; i < b.length - 1; i++) {
      const [a, c] = [b[i], b[i + 1]], n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 2);
      for (let k = 0; k < n; k++) { const px = a[0] + ((c[0] - a[0]) * k) / n, py = a[1] + ((c[1] - a[1]) * k) / n; if (px < coastX(py) - 3) pts.push([px, py]); }
    }
    const id = nextId++;
    for (const [px, py] of pts) { put(0, px, py, id); put(1, px, py, id); }
    // one embankment per district it runs through
    let run: Pt[] = [], rd: DistrictId | null = null;
    for (const p of pts) {
      const d = districtAt(p[0], p[1]);
      if (d !== rd && run.length) { streets.push({ pts: [...run, p], d: rd!, w: 1.4, bank: true }); run = []; }
      rd = d; run.push(p);
    }
    if (run.length > 1) streets.push({ pts: run, d: rd!, w: 1.4, bank: true });
  }
  for (const av of AVENUES) {
    const id = nextId++;
    for (let i = 0; i < av.pts.length - 1; i++) {
      const [a, b] = av.pts[i], [c, d] = av.pts[i + 1], n = Math.ceil(Math.hypot(c - a, d - b) / 2);
      for (let k = 0; k < n; k++) { const px = a + ((c - a) * k) / n, py = b + ((d - b) * k) / n; if (isLand(px, py)) { put(0, px, py, id); put(1, px, py, id); } }
    }
  }

  // the streets, traced through the field from seeds (nearest Downtown first)
  const seeds: Pt[] = [];
  for (let gy = 6; gy < H; gy += 8) for (let gx = 6; gx < W; gx += 8) seeds.push([gx + hash(gx * 7 + gy) * 5, gy + hash(gy * 3 + gx + 0.5) * 5]);
  seeds.sort((a, b) => Math.hypot(a[0] - 395, a[1] - 205) - Math.hypot(b[0] - 395, b[1] - 205));
  const step = 2, traced: { pts: Pt[]; id: number; fam: number; d: DistrictId; w: number }[] = [];
  for (const [sx, sy] of seeds) for (const fam of [0, 1]) {
    if (!isLand(sx, sy)) continue;
    const sep = sepAt(sx, sy); if (near([fam], sx, sy, sep) < sep) continue;
    const pts: Pt[] = [[sx, sy]];
    for (const dir of [1, -1]) {
      let px = sx, py = sy;
      const th = field(px, py) + (fam ? Math.PI / 2 : 0);
      let vx = Math.cos(th) * dir, vy = Math.sin(th) * dir;
      const part: Pt[] = [];
      for (let n = 0; n < 300; n++) {
        const t2 = field(px, py) + (fam ? Math.PI / 2 : 0);
        let ux = Math.cos(t2), uy = Math.sin(t2); if (ux * vx + uy * vy < 0) { ux = -ux; uy = -uy; }
        const nx = px + ux * step, ny = py + uy * step; if (!isLand(nx, ny)) break;
        const sp = sepAt(nx, ny) * 0.55; if (near([fam], nx, ny, sp) < sp) break;
        px = nx; py = ny; vx = ux; vy = uy; part.push([px, py]);
      }
      if (dir === 1) pts.push(...part); else pts.unshift(...part.reverse());
    }
    if (pts.length < 5) continue;
    const id = nextId++;
    for (const [px, py] of pts) put(fam, px, py, id);
    traced.push({ pts, id, fam, d: districtAt(sx, sy), w: sep > 15 ? 0.9 : hash(sx + sy) > 0.8 ? 1.5 : 1 });
  }
  // no dead ends: carry each end on until it meets another street (or the shore, or the canal's bank)
  for (const S of traced) for (const end of [0, 1]) {
    const P = S.pts, i0 = end ? P.length - 1 : 0, i1 = end ? Math.max(0, P.length - 4) : Math.min(P.length - 1, 3);
    let [px, py] = P[i0];
    const L = Math.hypot(P[i0][0] - P[i1][0], P[i0][1] - P[i1][1]) || 1;
    let vx = (P[i0][0] - P[i1][0]) / L, vy = (P[i0][1] - P[i1][1]) / L;
    const ext: Pt[] = [];
    for (let n = 0; n < 24; n++) {
      // keep bending with the field, so the extension doesn't kink
      const t2 = field(px, py) + (S.fam ? Math.PI / 2 : 0);
      let ux = Math.cos(t2), uy = Math.sin(t2); if (ux * vx + uy * vy < 0) { ux = -ux; uy = -uy; }
      vx = vx * 0.6 + ux * 0.4; vy = vy * 0.6 + uy * 0.4; const vl = Math.hypot(vx, vy); vx /= vl; vy /= vl;
      const nx = px + vx * 2, ny = py + vy * 2;
      // the shore or the canal's bank: the street runs to the water's edge
      if (!isLand(nx, ny)) { ext.push([nx, ny]); break; }
      const hit = nearest([0, 1], nx, ny, 2.2, S.id); if (hit.d < 2.2) { ext.push(hit.at!); break; }
      px = nx; py = ny; ext.push([px, py]);
      if (n === 23) ext.length = 0; // met nothing: leave the street as it was
    }
    if (end) P.push(...ext); else P.unshift(...ext.reverse());
  }
  for (const S of traced) {
    let sm = S.pts;
    for (let it = 0; it < 2; it++) {
      const o: Pt[] = [sm[0]];
      for (let i = 0; i < sm.length - 1; i++) { const [a, b] = sm[i], [c, d] = sm[i + 1]; o.push([a * 0.75 + c * 0.25, b * 0.75 + d * 0.25], [a * 0.25 + c * 0.75, b * 0.25 + d * 0.75]); }
      o.push(sm[sm.length - 1]); sm = o;
    }
    // every other point is enough to draw (they are a unit apart after smoothing)
    streets.push({ pts: sm.filter((_, i) => i % 2 === 0 || i === sm.length - 1), d: S.d, w: S.w });
  }

  // towers: fewer, bigger footprints set back from the streets
  const towers: Tower[] = [];
  for (let gy = 5; gy < H; gy += 10) for (let gx = 5; gx < W; gx += 10) {
    const px = gx + (hash(gx * 11 + gy) - 0.5) * 3, py = gy + (hash(gy * 13 + gx + 0.25) - 0.5) * 3;
    if (!isLand(px, py)) continue;
    const d = districtAt(px, py), s = d === 'downtown' ? 6 : d === 'fringe' ? 9 : 7;
    if (near([0, 1], px, py, s) < s * 0.7) continue;
    const k = hash(px * 2.7 + py * 3.3);
    if ((d === 'fringe' || d === 'skyport') && k < 0.6) continue;
    towers.push({ x: px, y: py, th: field(px, py), s, d, k });
  }
  towers.sort((a, b) => a.y - b.y);

  // the avenues, cut where they pass from one district into the next; bridges where they cross the canal
  const avenues: AvenuePiece[] = [], bridges: Bridge[] = [];
  for (const av of AVENUES) {
    let run: Pt[] = [], rd: DistrictId | null = null;
    for (let i = 0; i < av.pts.length - 1; i++) {
      const [a, b] = av.pts[i], [c, d] = av.pts[i + 1], L = Math.hypot(c - a, d - b), n = Math.ceil(L / 2), nx = -(d - b) / L, ny = (c - a) / L;
      for (let k = 0; k < n; k++) {
        const px = a + ((c - a) * k) / n, py = b + ((d - b) * k) / n, dd = districtAt(px, py);
        if (canalDist(px, py) < CANAL_W / 2 + 1) bridges.push({ x: px, y: py, nx, ny, hw: av.w / 2 + 1, d: dd });
        if (dd !== rd && run.length) { avenues.push({ pts: [...run, [px, py]], w: av.w, d: rd!, ring: !!av.ring, name: av.name }); run = []; }
        rd = dd; run.push([px, py]);
      }
    }
    run.push(av.pts[av.pts.length - 1]);
    if (run.length > 1) avenues.push({ pts: run, w: av.w, d: rd!, ring: !!av.ring, name: av.name });
  }

  // the district of every cell of the plan (the map veils the ones you do not know)
  const CELL = 3, cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL), cells = new Uint8Array(cols * rows);
  const ids = DISTRICTS.map((d) => d.id) as DistrictId[];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const px = i * CELL + CELL / 2, py = j * CELL + CELL / 2;
    const wet = px >= coastX(py) && !onIsle(px, py);
    cells[j * cols + i] = wet ? 0 : ids.indexOf(districtAt(px, py)) + 1;
  }
  const ms = typeof performance !== 'undefined' ? performance.now() - t0 : 0;
  return { streets, towers, avenues, bridges, cells, cell: CELL, cols, rows, ms };
}

/** What the build checks of the plan: every place, station and pad on land, in its own district, inside its frame. */
export function planProblems(): string[] {
  const out: string[] = [];
  const at = (what: string, pt: [number, number], d: DistrictId | null) => {
    if (!onLand(pt[0], pt[1])) out.push(`${what} at ${pt.join(',')} is not on land (the sea or the canal)`);
    if (!d) return;
    const got = districtAt(pt[0], pt[1]);
    if (got !== d) out.push(`${what} at ${pt.join(',')} lies in ${got}, not ${d}`);
    const [x, y, w, h] = DISTRICT_MAP[d].frame;
    if (pt[0] < x || pt[0] > x + w || pt[1] < y || pt[1] > y + h) out.push(`${what} at ${pt.join(',')} is outside ${d}'s frame`);
  };
  for (const p of PLACES) { const pt = PLACE_MAP[p.id]; if (pt) at(`place "${p.id}"`, pt, p.district); }
  for (const s of Object.keys(STATIONS) as (keyof typeof STATIONS)[]) at(`station "${s}"`, STATION_MAP[s], placeOf(STATIONS[s].scene).district);
  for (const s of STAND_IDS) at(`pad "${s}"`, PAD_MAP[s], null);
  return out;
}
