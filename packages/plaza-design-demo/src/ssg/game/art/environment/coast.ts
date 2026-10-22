/**
 * COAST AND SHORE KIT: the shore seen side on, in the coast's coarse pixels (art/core/pixels.ts, three world
 * units each). It began as the title glide's hand-drawn panorama (Tommi reviewed it, 2026-10-15/22) and is a kit
 * now, for any scene or zone by the water:
 *
 * - `coast.ground`     the near strip under the ground line, material by material along it: sand with its surf,
 *                      the inlet's open water, rocks, gravel, the quay's concrete, the bridge deck over the bay,
 *                      plaza paving, the city street with its wet sign colours, the road and its crossings.
 * - `coast.wall`       a wall into the water at a change of material: the inlet's sea wall, a bridge abutment.
 * - `coast.pier`       a timber pier on braced piles: deck, railing, stairs to the sand, kiosk, benches, lamps
 *                      with string lights between them, the lantern at its seaward end.
 * - `coast.footbridge` a steel walkway over an inlet, lamps at both ends, a moored dinghy.
 * - `coast.lifeguard`  the off-duty lifeguard hut on stilts, its flag, the NO SWIMMING post.
 * - `coast.breakwater` a mole out in the bay with its light tower (distance; parallax about 0.6).
 * - `coast.far-shore`  the low city along the far shore of the bay (distance; parallax about 0.12).
 * - `coast.boats`      boats far out on the sea, sail and stack silhouettes (distance).
 * - `coast.wipe`       something big and dark passing close to the camera (foreground, parallax > 1): a palm,
 *                      a post, a lamp, a signal pole.
 * - `environment.sea`  the open sea between the horizon and the shore (sea.ts, the mirror and the pixel swell),
 *                      the sun's path under the sky's sunset sun.
 * - `environment.reflection` a dark shape and its red light lying on the water under a far landmark.
 *
 * Heights are world units over the ground line (h 0 at the back edge of the near strip); the strip's depth lines
 * are `SHORE` (back, mid, beach, the road's lanes). Lengths are world units. A piece placed facing -1 is the same
 * piece mirrored (the west beach), its text still readable.
 */
import type { Bounds, Element, Field, Properties, Value } from '../core/composition';
import { inPixels, SHORE, STRIP_K, R, hash, lerp, mixHex, smooth, ART, type Pixels } from '../core/pixels';
import { text } from '../core/primitives';
import { drawStringLights } from '../assemblies/beach-bar';
import { placed } from '../core/view';
import { drawPalm } from './palm';
import { drawSea } from './sea';
import { sunsetSun } from './sunset-sky';

const S = 1 / ART;
export const PAPER = '255,217,165', ORANGE = '255,136,0', RED = '255,42,68', DAWN = '255,150,90';
const num = (label: string, value: number, min = -1e6, max = 1e6, step = 1, unit?: string): Field => ({ kind: 'number', label, default: value, min, max, step, ...(unit ? { unit } : {}) });
const str = (label: string, value: string): Field => ({ kind: 'string', label, default: value });
const color = (label: string, value: string): Field => ({ kind: 'color', label, default: value });
const n = (p: Properties, k: string) => Number(p[k]);
const s = (p: Properties, k: string) => String(p[k]);
const list = (label: string, value: Value, check: (row: Record<string, unknown>) => boolean, what: string): Field => ({ kind: 'json', label, default: value,
  validate: v => { if (!Array.isArray(v) || v.length > 200 || !v.every(r => !!r && typeof r === 'object' && !Array.isArray(r) && check(r as Record<string, unknown>))) throw new Error(label + ': ' + what); } });
const fin = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** The strip's depth lines on screen (pixels), for a piece standing at `h0`. */
export function stripLines(P: Pixels, h0 = 0) {
  return { GY: P.y(h0), BACK: P.y(h0 + SHORE.back), MID: P.y(h0 + SHORE.mid), BEACH: P.y(h0 + SHORE.beach), PIER: P.y(h0 + SHORE.pier), ROAD0: P.y(h0 + SHORE.road0), ROAD1: P.y(h0 + SHORE.road1), FAR_LANE: P.y(h0 + SHORE.farLane), NEAR_LANE: P.y(h0 + SHORE.nearLane), k: STRIP_K };
}
export type StripLines = ReturnType<typeof stripLines>;

interface Def { type: string; label: string; fields: Record<string, Field>; bounds: (p: Properties) => Bounds; draw: (P: Pixels, p: Properties, h0: number) => void; visual?: Record<string, Field>; parts?: Element['parts'] }
const kit = (d: Def): Element => ({
  type: d.type, version: 1, label: d.label, category: 'coast', coordinates: 'world', libraryUse: 'reusable', parts: d.parts ?? ['backdrop'], fields: d.fields,
  ...(d.visual ? { visualFields: d.visual } : {}),
  bounds: p => d.bounds(p), anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw(ctx, view, props, _state, _pass, at) { inPixels(ctx, view, at, P => d.draw(P, props, at.h)); },
});

// ---------- the ground strip ----------

export const GROUND_KINDS = ['sand', 'inlet', 'rocks', 'gravel', 'quay', 'bridge', 'plaza', 'street', 'road'] as const;
type GroundKind = typeof GROUND_KINDS[number];
interface Segment { kind: GroundKind; from: number; to: number }

/** A span of the strip on screen (pixels) for the segment from..to (world units east of the anchor), or null. */
function spanOf(P: Pixels, from: number, to: number): [number, number] | null {
  const [v0, v1] = P.span(), a = Math.max(v0 - 2, Math.floor(P.u(from * S))), b = Math.min(v1 + 2, Math.ceil(P.u(to * S)));
  return b > a ? [a, b] : null;
}

function groundSegment(P: Pixels, L: StripLines, seg: Segment, O: number, p: Properties) {
  const x = P.x, GY = L.GY, bottom = P.H + 90, warm = P.warm, H = P.H;
  const sp = spanOf(P, seg.from, seg.to); if (!sp) return;
  const [a, b] = sp;
  const fill = (top: string, low: string, from = GY) => { const gr = x.createLinearGradient(0, from, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, low); x.fillStyle = gr; x.fillRect(a, from, b - a, bottom - from); };
  switch (seg.kind) {
    case 'sand': {
      // warm at dawn, wet at the waterline, the surf washing in
      fill(mixHex('#2a1424', '#5a2a3a', warm), '#2a1424');
      const wash = P.still ? 0.5 : (Math.sin(P.t * 1.8) + 1) / 2, reach = R(2 + wash * 7);
      x.fillStyle = 'rgba(190,110,150,' + (0.35 * lerp(0.4, 1, warm)).toFixed(3) + ')'; x.fillRect(a, GY, b - a, reach + 2);
      for (let px = a - (((a % 4) + 4) % 4); px < b; px += 4) {
        const wx = R(px - O), k = hash(Math.floor((px - O) / 4) * 3.1), dy = R(reach + (k - 0.5) * 3);
        x.fillStyle = 'rgba(255,236,226,' + ((0.3 + k * 0.45) * lerp(0.4, 1, warm)).toFixed(2) + ')'; x.fillRect(px, GY + dy, 3, 1);
        if (k > 0.65) x.fillRect(px + 1, GY + dy - 2, 2, 1);
        if (hash(wx * 0.37) > 0.93) { x.fillStyle = 'rgba(30,10,20,.35)'; x.fillRect(px, GY + 12 + R(hash(wx) * (H - GY - 14)), 2, 1); }
      }
      const br = P.still ? 0.5 : (P.t * 0.5) % 1; x.fillStyle = 'rgba(255,240,230,' + (0.55 * Math.sin(br * Math.PI) * lerp(0.4, 1, warm)).toFixed(2) + ')'; x.fillRect(a, GY - 3 + R(br * 3), b - a, 1);
      return;
    }
    case 'inlet': {
      // open water in the strip, deeper toward the camera, the swell coming in from the bay
      const wg = x.createLinearGradient(0, GY, 0, H); wg.addColorStop(0, mixHex('#2a1438', '#6a2a5a', warm)); wg.addColorStop(1, mixHex('#0c0418', '#1e0c2a', warm));
      x.fillStyle = wg; x.fillRect(a, GY, b - a, bottom - GY);
      for (let i = 0; i < 30; i++) {
        const row = i % 6, py = GY + 3 + row * (H - GY) / 6, len = 6 + row * 3, drift = P.still ? 0 : P.f * (0.12 + row * 0.04);
        const px = a + ((((i * 47 + drift + O) % (b - a + 30)) + (b - a + 30)) % (b - a + 30)) - 15;
        x.fillStyle = 'rgba(255,190,200,' + (0.1 + row * 0.03).toFixed(2) + ')'; x.fillRect(R(px), R(py), len, 1);
      }
      // the sun's path crossing it, and the footbridge's shadow
      const sun = sunsetSun(P.view, P.lighting, 0).x / ART, sunX = P.facing < 0 ? 2 * P.ax - sun : sun;
      x.fillStyle = 'rgba(255,170,90,' + (0.18 * warm).toFixed(2) + ')'; x.fillRect(R(Math.max(a, sunX - 10)), GY + 2, R(Math.max(0, Math.min(b, sunX + 10) - Math.max(a, sunX - 10))), H - GY);
      x.fillStyle = 'rgba(10,4,16,.45)'; x.fillRect(a, L.MID + 2, b - a, 3);
      return;
    }
    case 'rocks': {
      // big dark blocks from the sand down into the water
      const count = Math.max(1, Math.round((seg.to - seg.from) * S / 6));
      for (let i = 0; i < count; i++) {
        const sx = P.u(seg.from * S + 4 + i * 6), d = R(i * 3.2 * L.k);
        x.fillStyle = mixHex('#1a0e16', '#33202a', warm * (0.6 + hash(i) * 0.4)); x.beginPath(); x.moveTo(sx - 8, bottom); x.lineTo(sx - 8, GY + d - 2); x.lineTo(sx - 3, GY + d - 6 - R(hash(i + 4) * 4)); x.lineTo(sx + 5, GY + d - 4); x.lineTo(sx + 8, bottom); x.closePath(); x.fill();
        x.fillStyle = 'rgba(' + DAWN + ',' + (0.25 * warm).toFixed(2) + ')'; x.fillRect(R(sx - 3), GY + d - 6 - R(hash(i + 4) * 4), 6, 1);
      }
      return;
    }
    case 'gravel': {
      fill('#2a2026', '#120c10');
      for (let px = a - (((a % 3) + 3) % 3); px < b; px += 3) { const k = hash(Math.floor((px - O) / 3) * 1.7); if (k > 0.55) { x.fillStyle = 'rgba(150,120,120,' + (0.1 + (k - 0.55) * 0.5).toFixed(2) + ')'; x.fillRect(px, GY + 4 + R(hash(px - O) * (H - GY - 6)), 2, 1); } if (k > 0.93) { x.fillStyle = 'rgba(60,80,40,.6)'; x.fillRect(px, L.BACK + 1, 1, 3); x.fillRect(px + 1, L.BACK, 1, 4); } }
      x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(a, L.MID + 6, b - a, 1); x.fillRect(a, L.MID + 12, b - a, 1);
      return;
    }
    case 'quay': {
      // concrete, its coping along the water, the cranes' rails, bollards, the apron's painted lanes
      fill('#2e2228', '#120c10');
      x.fillStyle = '#4a3a40'; x.fillRect(a, GY, b - a, 2); x.fillStyle = 'rgba(' + ORANGE + ',.55)'; x.fillRect(a, GY, b - a, 1);
      x.fillStyle = 'rgba(200,180,170,.25)'; x.fillRect(a, L.BACK - 1, b - a, 1); x.fillRect(a, L.BACK + 2, b - a, 1);
      for (let u = seg.from * S + 20; u < seg.to * S; u += 46) { const sx = P.u(u); if (sx < a - 4 || sx > b + 4) continue; x.fillStyle = '#16100e'; x.fillRect(R(sx), GY - 3, 4, 4); x.fillStyle = 'rgba(' + ORANGE + ',.5)'; x.fillRect(R(sx), GY - 3, 4, 1); }
      x.fillStyle = 'rgba(255,200,60,.22)'; for (let px = a; px < b; px++) if ((((px - O) % 18) + 18) % 18 < 8) x.fillRect(px, L.FAR_LANE - 2, 1, 1);
      return;
    }
    case 'bridge': {
      // the walkway and deck, the girder's face, the bay under it
      const deckBot = L.ROAD1 + R(4 * L.k);
      const wg = x.createLinearGradient(0, deckBot, 0, H); wg.addColorStop(0, mixHex('#1a0828', '#3a1446', warm)); wg.addColorStop(1, '#0c0414');
      x.fillStyle = wg; x.fillRect(a, deckBot, b - a, bottom - deckBot);
      for (let i = 0; i < 26; i++) { const px = a + ((i * 53 + (P.still ? 0 : P.f * 0.2) + O * 0.6) % (b - a + 40) + (b - a + 40)) % (b - a + 40) - 20, py = deckBot + 3 + (i * 7) % Math.max(4, H - deckBot - 2); x.fillStyle = 'rgba(255,190,200,' + (0.08 + (i % 3) * 0.04).toFixed(2) + ')'; x.fillRect(R(px), R(py), 4 + (i % 4) * 2, 1); }
      x.fillStyle = '#2a1e2c'; x.fillRect(a, GY, b - a, L.ROAD0 - GY);
      x.fillStyle = '#1a1220'; x.fillRect(a, L.ROAD1, b - a, deckBot - L.ROAD1);
      x.fillStyle = 'rgba(' + ORANGE + ',.4)'; x.fillRect(a, deckBot - 1, b - a, 1);
      for (let u = seg.from * S + 8; u < seg.to * S; u += 30) { const sx = P.u(u); if (sx < a || sx > b) continue; x.fillStyle = 'rgba(255,214,150,.5)'; x.fillRect(R(sx), deckBot - 3, 2, 1); x.fillStyle = 'rgba(255,214,150,.1)'; x.fillRect(R(sx), deckBot + 2, 2, 8); }
      return;
    }
    case 'plaza': {
      fill('#3a2c3c', '#1a121c');
      x.fillStyle = 'rgba(255,217,165,.08)'; for (let u = seg.from * S; u < seg.to * S; u += 12) { const sx = P.u(u); if (sx > a && sx < b) x.fillRect(R(sx), GY, 1, L.ROAD0 - GY); }
      x.fillRect(a, GY + R(6 * L.k), b - a, 1); x.fillRect(a, GY + R(12 * L.k), b - a, 1);
      return;
    }
    case 'street': {
      // the street's surface, its joints, the steps up to the plaza at its east end (`steps`)
      const gr = x.createLinearGradient(0, GY, 0, H); gr.addColorStop(0, '#241a22'); gr.addColorStop(1, '#0e0a0e');
      x.fillStyle = gr; x.fillRect(a, GY, b - a, P.H + 400 - GY);
      x.fillStyle = 'rgba(255,217,165,.07)'; for (let px = a - ((((a - O) % 9) + 9) % 9); px < b; px += 9) x.fillRect(R(px), GY, 1, L.ROAD0 - GY);
      if (p.steps === true) { const s0 = P.u(seg.to * S); if (P.onScreen(s0, s0, 30)) for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? '#3a2c3c' : '#2e2232'; x.fillRect(R(s0) - 6, GY + k * 3, 14, 3); x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(R(s0) - 6, GY + k * 3, 14, 1); } }
      // the wet street: every sign's colour lying in it, broken up
      const wet = n(p, 'wet');
      if (wet > 0) for (const g of (p.glows as unknown as { x: number; w: number; col: string; a: number }[])) {
        const gx = P.u(g.x * S), gw = Math.max(3, g.w * S * 0.6);
        if (gx < a - 20 || gx > b + 20) continue;
        for (let r = 0; r < 7; r++) { const py = GY + 2 + r * 4 + (r > 3 ? 6 : 0), wob = P.still ? 0 : Math.sin(P.t * 2 + r + gx) * 1.2; x.fillStyle = 'rgba(' + g.col + ',' + (0.2 * wet * g.a * (1 - r / 8)).toFixed(3) + ')'; x.fillRect(R(gx - gw / 2 + wob), R(py), R(gw * (1 - r * 0.07)), 1); }
      }
      return;
    }
    case 'road': {
      x.fillStyle = '#151014'; x.fillRect(a, L.ROAD0, b - a, L.ROAD1 - L.ROAD0);
      x.fillStyle = 'rgba(255,217,165,.18)'; x.fillRect(a, L.ROAD0, b - a, 1);
      const mid = R((L.ROAD0 + L.ROAD1) / 2), wet = n(p, 'wet');
      x.fillStyle = 'rgba(255,217,165,' + (wet > 0 ? 0.45 : 0.35) + ')';
      for (let px = a; px < b; px++) if ((((px - O) % 14) + 14) % 14 < 6) x.fillRect(px, mid, 1, 1);
      if (wet > 0) { x.fillStyle = 'rgba(160,170,220,' + (0.08 * wet).toFixed(3) + ')'; x.fillRect(a, L.ROAD0 + 1, b - a, L.ROAD1 - L.ROAD0 - 1); }
      // the crossings at the side streets
      for (const cx of p.crossings as number[]) { const sx = P.u(cx * S); if (!P.onScreen(sx, sx, 30)) continue; x.fillStyle = 'rgba(255,217,165,.22)'; for (let k = 0; k < 6; k++) x.fillRect(R(sx) - 14 + k * 5, L.ROAD0 + 2, 3, L.ROAD1 - L.ROAD0 - 3); }
      return;
    }
  }
}

export const groundElement = kit({
  type: 'coast.ground', label: 'Shore strip: sand, water, rocks, quay, bridge, plaza, street, road (coast kit)',
  fields: {
    segments: list('Segments, drawn in order (kind, from, to: world units east of the piece)', [{ kind: 'sand', from: 0, to: 1200 }], r => GROUND_KINDS.includes(r.kind as GroundKind) && fin(r.from) && fin(r.to) && Number(r.to) > Number(r.from), 'expected { kind, from, to } rows'),
    origin: num('Pattern origin (world units east of the piece)', 0),
    wet: num('Wet street (rain sheen, sign colours lying in it)', 0, 0, 1, 0.05),
    steps: { kind: 'boolean', label: 'Steps up to the plaza at the street’s east end', default: false },
    glows: list('Sign colours in the wet street (x, w: world units; col "r,g,b"; a)', [], r => fin(r.x) && fin(r.w) && typeof r.col === 'string' && fin(r.a), 'expected { x, w, col, a } rows'),
    crossings: { kind: 'json', label: 'Road crossings (world x east of the piece)', default: [], validate: v => { if (!Array.isArray(v) || !v.every(fin)) throw new Error('Road crossings: expected numbers'); } },
  },
  bounds: p => { const seg = p.segments as unknown as Segment[], a = Math.min(0, ...seg.map(q => q.from)), b = Math.max(0, ...seg.map(q => q.to)); return { x: a, h: 0, w: b - a, tall: 130 }; },
  draw(P, p, h0) {
    const L = stripLines(P, h0), O = P.u(n(p, 'origin') * S);
    for (const seg of p.segments as unknown as Segment[]) groundSegment(P, L, seg, O, p);
  },
});

/** A wall into the water where the strip changes: the inlet's sea wall (the port's side) or a bridge abutment. */
export const wallElement = kit({
  type: 'coast.wall', label: 'Sea wall or bridge abutment (coast kit)',
  fields: { kind: { kind: 'select', label: 'Kind', options: ['sea-wall', 'abutment'], default: 'sea-wall' } },
  bounds: () => ({ x: -24, h: 12, w: 48, tall: 150 }),
  draw(P, p, h0) {
    const x = P.x, GY = P.y(h0), bottom = P.H + 90, sx = P.ax;
    if (!P.onScreen(sx, sx, 30)) return;
    if (p.kind === 'sea-wall') {
      x.fillStyle = '#3a2c32'; x.fillRect(R(sx) - 2, GY - 4, 10, bottom - GY);
      x.fillStyle = 'rgba(' + ORANGE + ',.5)'; x.fillRect(R(sx) - 2, GY - 4, 10, 1); x.fillRect(R(sx) - 2, GY - 4, 1, bottom - GY);
      x.fillStyle = 'rgba(0,0,0,.3)'; for (let h = GY + 4; h < P.H + 40; h += 5) x.fillRect(R(sx) - 1, h, 8, 1);
    } else {
      x.fillStyle = '#2e2228'; x.fillRect(R(sx) - 8, GY, 16, bottom - GY);
      x.fillStyle = 'rgba(' + ORANGE + ',.45)'; x.fillRect(R(sx) - 8, GY, 1, bottom - GY); x.fillRect(R(sx) + 7, GY, 1, bottom - GY);
      x.fillStyle = 'rgba(0,0,0,.3)'; for (let h = GY + 6; h < P.H + 40; h += 6) x.fillRect(R(sx) - 7, h, 14, 1);
    }
  },
});

// ---------- the pier, the footbridge, the lifeguard's hut ----------

/**
 * The pier: a timber deck out over the water on braced piles, from its land end (the anchor) `length` west, planks
 * and a railing catching the light, lamps with string lights between them, a kiosk at the land end, benches,
 * stairs down to the sand east of the land end, the lantern at the seaward end. Black against the sun.
 */
export const pierElement = kit({
  type: 'coast.pier', label: 'Timber pier: piles, deck, railing, kiosk, lamps, lantern (coast kit)',
  fields: {
    length: num('Length', 720, 60, 6000, 3, 'units'), paint: color('Timber silhouette', '#0a0310'), kiosk: str('Kiosk sign (empty: no kiosk)', 'BAIT · ICE · TEA'),
    lamp: str('Lamp colour', 'rgba(255,220,160,.95)'), lantern: str('Lantern colour', 'rgba(255,232,190,.95)'), sag: num('String light sag', 6, 0, 100), lights: { kind: 'boolean', label: 'String lights between the lamps', default: true },
  },
  bounds: p => ({ x: -n(p, 'length'), h: 160, w: n(p, 'length') + 72, tall: 250 }),
  draw(P, p, h0) {
    const x = P.x, len = R(n(p, 'length') * S), L = stripLines(P, h0), deck = L.PIER, GY = L.GY;
    const a = R(P.u(-len)), b = R(P.ax);
    if (!P.onScreen(a - 10, b + 30, 40)) return;
    const ink = s(p, 'paint'), rim = 'rgba(' + DAWN + ',' + (0.55 * P.warm).toFixed(2) + ')';
    // the piles into the water, their cross-bracing, their reflections
    for (let u = -6; u >= -len; u -= 16) {
      const sx = R(P.u(u)); x.fillStyle = ink; x.fillRect(sx, deck, 3, GY - deck + 1);
      x.fillStyle = 'rgba(10,3,16,.45)'; x.fillRect(sx, GY + 1, 3, 5);
      if (u - 16 >= -len) { const s2 = R(P.u(u - 16)); x.strokeStyle = 'rgba(10,3,16,.8)'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(sx, deck + 3); x.lineTo(s2 + 2, GY - 2); x.moveTo(sx + 2, GY - 2); x.lineTo(s2, deck + 3); x.stroke(); }
    }
    // the deck: a thick beam, planks catching the light
    x.fillStyle = ink; x.fillRect(a, deck - 2, b - a, 5);
    x.fillStyle = rim; x.fillRect(a, deck - 2, b - a, 1);
    x.fillStyle = 'rgba(255,190,120,.12)'; for (let sx = a; sx < b; sx += 3) x.fillRect(sx, deck - 1, 1, 1);
    // the railing
    x.fillStyle = ink; x.fillRect(a, deck - 9, b - a, 1); x.fillRect(a, deck - 5, b - a, 1);
    for (let u = 0; u >= -len; u -= 8) x.fillRect(R(P.u(u)), deck - 9, 1, 9);
    x.fillStyle = rim; x.fillRect(a, deck - 10, b - a, 1);
    // stairs from the deck down to the sand at the land end, their handrail
    x.fillStyle = ink; for (let i = 0; i < 7; i++) x.fillRect(b - 2 + i * 3, deck + R(i * (L.BEACH - deck) / 7), 5, 2);
    x.fillRect(b + 20, deck, 1, L.BEACH - deck); x.strokeStyle = ink; x.lineWidth = 1; x.beginPath(); x.moveTo(b, deck - 9); x.lineTo(b + 21, L.BEACH - 9); x.stroke();
    // the kiosk at the land end: a hut with a lit hatch and a plate
    if (s(p, 'kiosk')) {
      const k = R(P.u(-26));
      x.fillStyle = '#1a0c18'; x.fillRect(k - 10, deck - 22, 20, 20); x.fillRect(k - 12, deck - 25, 24, 3);
      x.fillStyle = 'rgba(255,200,130,.75)'; x.fillRect(k - 7, deck - 18, 14, 6);
      x.fillStyle = '#0d0705'; x.fillRect(k - 11, deck - 31, 22, 6); x.strokeStyle = 'rgba(' + ORANGE + ',.6)'; x.lineWidth = 0.6; x.strokeRect(k - 10.5, deck - 30.5, 21, 5);
      text(x, s(p, 'kiosk'), k, deck - 28, 'rgba(' + PAPER + ',.85)', 2.4, '600');
    }
    // benches along it
    for (const u of [-70, -150]) { if (-u > len) continue; const sx = R(P.u(u)); x.fillStyle = ink; x.fillRect(sx - 6, deck - 5, 12, 1); x.fillRect(sx - 5, deck - 4, 1, 4); x.fillRect(sx + 4, deck - 4, 1, 4); x.fillRect(sx - 6, deck - 8, 1, 3); }
    // lamps along it, their glow, string lights between them
    const posts = [-50, -120, -190].filter(u => -u < len);
    for (const u of posts) {
      const sx = R(P.u(u)); x.fillStyle = ink; x.fillRect(sx, deck - 28, 1, 28); x.fillRect(sx - 2, deck - 29, 5, 1);
      x.fillStyle = s(p, 'lamp'); x.fillRect(sx - 1, deck - 28, 3, 2);
      const g = x.createRadialGradient(sx, deck - 26, 0, sx, deck - 26, 16); g.addColorStop(0, 'rgba(255,210,150,.25)'); g.addColorStop(1, 'rgba(255,210,150,0)'); x.fillStyle = g; x.fillRect(sx - 16, deck - 42, 32, 32);
      x.fillStyle = 'rgba(255,200,140,.18)'; x.fillRect(sx - 3, GY + 1, 7, 2);
    }
    if (p.lights !== false) for (let i = 0; i + 1 < posts.length; i++) {
      const s0 = P.u(posts[i + 1]), s1 = P.u(posts[i]);
      placed(x, R(s0), deck, S, () => drawStringLights(x, 0, 78, (s1 - s0) / S, 78, P.f, { sag: n(p, 'sag'), phase: i, still: P.still }));
    }
    // the lantern on its mast at the seaward end: a warm white, the pier's own
    const e = R(P.u(-len + 2));
    x.fillStyle = ink; x.fillRect(e, deck - 34, 2, 34); x.fillRect(e - 2, deck - 36, 6, 2);
    x.fillStyle = s(p, 'lantern'); x.fillRect(e - 1, deck - 41, 4, 5);
    const gg = x.createRadialGradient(e + 1, deck - 39, 0, e + 1, deck - 39, 14); gg.addColorStop(0, 'rgba(255,220,170,.3)'); gg.addColorStop(1, 'rgba(255,220,170,0)'); x.fillStyle = gg; x.fillRect(e - 14, deck - 54, 30, 30);
  },
});

/** A steel truss walkway over an inlet at the ground line, from the anchor `length` west; lamps at both ends, a moored dinghy. */
export const footbridgeElement = kit({
  type: 'coast.footbridge', label: 'Footbridge over an inlet, lamps, a moored dinghy (coast kit)',
  fields: { length: num('Span', 480, 60, 3000, 3, 'units'), dinghy: { kind: 'boolean', label: 'Moored dinghy', default: true } },
  bounds: p => ({ x: -n(p, 'length'), h: 60, w: n(p, 'length'), tall: 230 }),
  draw(P, p, h0) {
    const x = P.x, len = R(n(p, 'length') * S), L = stripLines(P, h0);
    const a = R(P.u(-len)), b = R(P.ax), d = L.MID + 1, ink = '#120a14';
    if (!P.onScreen(a, b, 40)) return;
    x.fillStyle = ink; x.fillRect(a, d, b - a, 3); x.fillRect(a, d - 9, b - a, 1); x.fillRect(a, d - 5, b - a, 1);
    for (let u = 0; u >= -len; u -= 7) x.fillRect(R(P.u(u)), d - 9, 1, 9);
    x.strokeStyle = 'rgba(18,10,20,.9)'; x.lineWidth = 0.8; x.beginPath();
    for (let u = 0; u > -len; u -= 20) { const s0 = P.u(u), s1 = P.u(u - 20); x.moveTo(s0, d + 3); x.lineTo((s0 + s1) / 2, d + 9); x.lineTo(s1, d + 3); }
    x.moveTo(a, d + 9); x.lineTo(b, d + 9); x.stroke();
    x.fillStyle = 'rgba(' + DAWN + ',' + (0.4 * P.warm).toFixed(2) + ')'; x.fillRect(a, d - 10, b - a, 1);
    // the back rail on the far side of the deck (the sea side)
    x.fillStyle = 'rgba(18,10,20,.7)'; x.fillRect(a, L.BACK - 6, b - a, 1); for (let u = 0; u >= -len; u -= 14) x.fillRect(R(P.u(u)), L.BACK - 6, 1, 6);
    for (const u of [-6, -len + 6]) { const sx = R(P.u(u)); x.fillStyle = ink; x.fillRect(sx, d - 26, 1, 26); x.fillStyle = 'rgba(255,220,160,.9)'; x.fillRect(sx - 1, d - 27, 3, 2); }
    if (p.dinghy !== false) {
      const sx = R(P.u(-30)), bob = P.still ? 0 : R(Math.sin(P.t * 1.3) * 0.8), dy = L.ROAD1 - 2 + bob;
      x.fillStyle = '#2a1820'; x.beginPath(); x.moveTo(sx - 12, dy); x.lineTo(sx + 12, dy); x.lineTo(sx + 9, dy + 4); x.lineTo(sx - 10, dy + 4); x.closePath(); x.fill();
      x.fillStyle = 'rgba(200,190,170,.6)'; x.fillRect(sx - 12, dy, 24, 1);
      x.strokeStyle = 'rgba(200,190,170,.35)'; x.lineWidth = 0.5; x.beginPath(); x.moveTo(sx - 12, dy); x.lineTo(sx - 26, d + 2); x.stroke();
    }
  },
});

/** The lifeguard's hut on stilts, off duty: shutter down, the flag; the NO SWIMMING sign on its post `sign` units west. */
export const lifeguardElement = kit({
  type: 'coast.lifeguard', label: 'Lifeguard hut on stilts, flag, NO SWIMMING post (coast kit)',
  fields: { sign: num('Sign post (units west of the hut; 0: none)', 132, 0, 1200), text: str('Sign', 'NO SWIMMING') },
  bounds: () => ({ x: -45, h: 190, w: 90, tall: 190 }),
  draw(P, p, h0) {
    const x = P.x, L = stripLines(P, h0), sx = P.ax;
    if (P.onScreen(sx, sx, 40)) {
      const b = L.BACK + 6, ink = '#140812';
      x.fillStyle = ink; x.fillRect(R(sx) - 8, b - 26, 2, 26); x.fillRect(R(sx) + 7, b - 26, 2, 26); x.fillRect(R(sx) - 9, b - 16, 19, 1);
      x.fillRect(R(sx) - 11, b - 38, 23, 12); x.beginPath(); x.moveTo(R(sx) - 13, b - 38); x.lineTo(R(sx), b - 45); x.lineTo(R(sx) + 13, b - 38); x.fill();
      x.fillStyle = 'rgba(' + DAWN + ',' + (0.35 * P.warm).toFixed(2) + ')'; x.fillRect(R(sx) - 11, b - 38, 23, 1);
      x.fillStyle = 'rgba(80,60,60,.8)'; x.fillRect(R(sx) - 8, b - 35, 17, 7);
      x.fillStyle = ink; x.fillRect(R(sx) + 9, b - 58, 1, 20);
      const wave = P.still ? 0 : Math.sin(P.f * 0.08) * 1;
      x.fillStyle = '#c8302a'; x.fillRect(R(sx) + 10, b - 58 + wave, 6, 4);
    }
    const off = n(p, 'sign') * S;
    if (off > 0) {
      const ps = P.u(-off); if (!P.onScreen(ps, ps, 20)) return;
      x.fillStyle = '#140812'; x.fillRect(R(ps), L.BACK - 14, 1, 16);
      x.fillStyle = '#e8e0d0'; x.fillRect(R(ps) - 12, L.BACK - 22, 25, 9); x.fillStyle = '#c8302a'; x.fillRect(R(ps) - 12, L.BACK - 22, 25, 2);
      text(x, s(p, 'text'), R(ps) + 0.5, L.BACK - 16.5, 'rgba(30,10,10,.9)', 2.6, '600');
    }
  },
});

// ---------- out on the water ----------

/** The mole out in the bay: rough blocks along the water from the anchor `length` west, the swell breaking white, the light tower at its seaward end. */
export const breakwaterElement = kit({
  type: 'coast.breakwater', label: 'Breakwater with its light tower (coast kit, distance)',
  fields: { windowFrom:num('Visible east of (world x)',-1e6,-1e7,1e7),windowTo:num('Visible west of (world x)',1e6,-1e7,1e7),
    length: num('Length (in its own depth)', 497, 30, 6000, 1, 'units'), water: num('Height on the water (over the ground line)', 85, -400, 600) },
  bounds: p => ({ x: -n(p, 'length'), h: n(p, 'water') + 70, w: n(p, 'length'), tall: 80 }),
  draw(P, p) {
    const x = P.x, len = n(p, 'length') * S, a = P.u(-len), b = P.ax;
    if (!P.onScreen(a - 20, b + 20)) return;
    const yb = R(P.y(n(p, 'water'))), O = P.ax;
    x.fillStyle = mixHex('#140a16', '#2a1828', P.warm);
    x.beginPath(); x.moveTo(a, yb + 3); for (let sx = a; sx <= b; sx += 4) x.lineTo(sx, yb - 3 - (hash(R(sx - O) * 0.3) > 0.5 ? 1 : 0)); x.lineTo(b + 6, yb + 4); x.closePath(); x.fill();
    x.fillStyle = 'rgba(' + DAWN + ',' + (0.3 * P.warm).toFixed(2) + ')'; x.fillRect(R(a), yb - 3, R(b - a), 1);
    const br = P.still ? 0.5 : (Math.sin(P.t * 1.1) + 1) / 2;
    x.fillStyle = 'rgba(255,240,230,' + (0.25 + br * 0.3).toFixed(2) + ')'; for (let sx = a; sx < b; sx += 7) if (hash(R(sx - O)) > 0.4) x.fillRect(R(sx), yb + 2 + R(hash(sx) * 2), 3, 1);
    const lx = R(a + 3);
    for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? '#d8d0c4' : '#a82a2a'; x.fillRect(lx, yb - 7 - k * 3, 3, 3); }
    const on = P.still || Math.floor(P.f / 45) % 3 === 0;
    x.fillStyle = on ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.3)'; x.fillRect(lx - 1, yb - 21, 5, 3);
    if (on) { const g = x.createRadialGradient(lx + 1.5, yb - 20, 0, lx + 1.5, yb - 20, 14); g.addColorStop(0, 'rgba(' + RED + ',.35)'); g.addColorStop(1, 'rgba(' + RED + ',0)'); x.fillStyle = g; x.fillRect(lx - 14, yb - 34, 30, 30); }
  },
});

/**
 * The far shore across the bay: a low city along the horizon from the anchor `length` west, blocks of seeded width
 * and height, taller toward the west end (`rise` per unit), a few lit windows. In its own depth (place it with a
 * small parallax). `town` from..to (units west of the anchor): where the city's haze lies over it.
 */
export const farShoreElement = kit({
  type: 'coast.far-shore', label: 'Far shore: a low city along the horizon (coast kit, distance)',
  fields: {
    windowFrom:num('Visible east of (world x)',-1e6,-1e7,1e7),windowTo:num('Visible west of (world x)',1e6,-1e7,1e7),
    length: num('Length (in its own depth)', 1566, 30, 40000, 1, 'units'), seed: num('Seed', 17, 0, 1e6), horizon: num('Horizon (over the ground line)', 189, -400, 1200),
    spacing: num('Block spacing (world units across the far shore)', 144, 4, 2000), rise: num('Taller toward the west, from (units west)', 378, 0, 40000), clipEast: num('Hidden east of (units west of the anchor; 0: none)', 0, 0, 40000),
  },
  bounds: p => ({ x: -n(p, 'length'), h: n(p, 'horizon') + 60, w: n(p, 'length'), tall: 60 }),
  draw(P, p) {
    const x = P.x, rng = seeded(n(p, 'seed')), len = n(p, 'length') * S, base = P.y(n(p, 'horizon')), rise = n(p, 'rise') * S, clip = n(p, 'clipEast') * S;
    // laid out as the original row: 40 + r·90 apart in the shore's own units (`spacing` scales it)
    const unit = n(p, 'spacing') * S / 130;
    x.save();x.beginPath();const lo=Math.max(0,P.sx(n(p,'windowFrom'),1)),hi=Math.min(P.W,P.sx(n(p,'windowTo'),1));x.rect(lo,0,Math.max(0,hi-lo),P.H);x.clip();
    for (let u = 0; u < len; u += (40 + rng() * 90) * unit) {
      const h = 3 + rng() * 7 + Math.max(0, u - rise) * 0.005 / unit, w = 4 + rng() * 12, r = rng();
      if (clip > 0 && u < clip) continue;
      const sx = P.u(-u); if (!P.onScreen(sx - w, sx)) continue;
      x.fillStyle = mixHex('#140a1e', '#3a1640', P.warm); x.fillRect(R(sx - w), R(base - h), R(w), R(h) + 1);
      if (r > 0.55) { x.fillStyle = 'rgba(255,160,90,.4)'; x.fillRect(R(sx - w + 2), R(base - h + 2), 1, 1); }
    }
    x.restore();
  },
});
function seeded(seed: number) { let v = seed; return () => (v = (v * 9301 + 49297) % 233280) / 233280; }

/** Boats far out on the sea: hulls on the water, a sail or a little wheelhouse with a lit window, bobbing. */
export const boatsElement = kit({
  type: 'coast.boats', label: 'Boats far out on the sea, silhouettes (coast kit, distance)',
  fields: {
    boats: list('Boats (x: units east of the piece, len: pixels, mast: 1 sail / 0 wheelhouse, flip)', [{ x: 0, len: 22, mast: 0 }], r => fin(r.x) && fin(r.len) && (r.mast === 0 || r.mast === 1), 'expected { x, len, mast } rows'),
    water: num('Height on the water (over the ground line)', 180, -400, 1200),
  },
  bounds: p => { const b = p.boats as unknown as { x: number }[]; const a = Math.min(0, ...b.map(q => q.x)), e = Math.max(0, ...b.map(q => q.x)); return { x: a, h: n(p, 'water') + 40, w: e - a + 100, tall: 50 }; },
  draw(P, p) {
    const x = P.x, by = R(P.y(n(p, 'water')));
    for (const boat of p.boats as unknown as { x: number; len: number; mast: number; flip?: boolean }[]) {
      const len = boat.len, sx = P.u(boat.x * S) - (boat.flip ? len : 0);
      if (!P.onScreen(sx - len, sx + len)) continue;
      const bob = P.still ? 0 : R(Math.sin(P.t * 1.4 + boat.x) * 0.6);
      x.save(); if (boat.flip) { x.translate(2 * R(sx) + len, 0); x.scale(-1, 1); }
      x.fillStyle = '#12061a'; x.fillRect(R(sx), by + bob, len, 2); x.fillRect(R(sx) + 2, by + 2 + bob, len - 4, 1);
      if (boat.mast) { x.fillRect(R(sx + len / 2), by - 12 + bob, 1, 12); x.beginPath(); x.moveTo(sx + len / 2 + 1, by - 11 + bob); x.lineTo(sx + len / 2 + 7, by - 1 + bob); x.lineTo(sx + len / 2 + 1, by - 1 + bob); x.fill(); }
      else { x.fillRect(R(sx + 3), by - 3 + bob, 6, 3); x.fillStyle = 'rgba(255,217,165,.5)'; x.fillRect(R(sx + 4), by - 2 + bob, 1, 1); }
      x.restore();
    }
  },
});

/** Something big and dark passing close to the camera at the bottom of the view: a palm, a post with a lit sign, a lamp, a signal pole. Place it with a parallax over 1. */
export const wipeElement = kit({
  type: 'coast.wipe', label: 'Foreground wipe: a palm, a post, a lamp or a signal close to the camera (coast kit)', parts: ['foreground'],
  fields: { kind: { kind: 'select', label: 'Kind', options: ['palm', 'post', 'lamp', 'signal'], default: 'palm' }, ink: color('Silhouette', '#040106') },
  bounds: () => ({ x: -60, h: 700, w: 120, tall: 900 }),
  draw(P, p) {
    const x = P.x, sx = P.ax, ink = s(p, 'ink'), kind = s(p, 'kind'), H = P.H;
    if (!P.onScreen(sx, sx, 120)) return;
    if (kind === 'palm') { placed(x, R(sx), H + 30, 1, () => drawPalm(x, { h: H * 1.15, lean: 30, seed: 21, t: P.f, still: P.still, fill: ink, rim: DAWN, side: -1 })); return; }
    const w = kind === 'post' ? 12 : 6;
    x.fillStyle = ink; x.fillRect(R(sx), -10, w, H + 100);
    if (kind === 'post') { x.fillRect(R(sx) - 30, 30, 42, 5); x.fillStyle = 'rgba(255,230,180,.85)'; x.fillRect(R(sx) - 28, 35, 14, 2); x.fillStyle = 'rgba(' + ORANGE + ',.25)'; x.fillRect(R(sx) + w - 1, 0, 1, H); }
    else if (kind === 'lamp') { x.fillRect(R(sx) - 18, 44, 24, 4); x.fillStyle = 'rgba(255,230,180,.85)'; x.fillRect(R(sx) - 16, 48, 8, 2); }
    else { x.fillRect(R(sx) - 4, 50, 14, 30); const go = P.still || Math.floor(P.f / 150) % 2 === 0; x.fillStyle = go ? 'rgba(60,255,140,.9)' : 'rgba(255,42,68,.9)'; x.fillRect(R(sx) - 1, go ? 70 : 54, 8, 6); }
  },
});

// ---------- the sea ----------

/**
 * The open sea from the horizon (`horizon`, over the ground line) down to `bottom`, across the view: the mirror and
 * the pixel swell (sea.ts), the swell moving with its depth, the sun's path under the sunset sun (sky kit). In the
 * distance layer; its own depth (`parallax` of the placement) moves the swell as the camera does.
 */
export const seaElement: Element = {
  type: 'environment.sea', version: 1, label: 'Open sea: mirror, swell and the sun’s path (coast kit)', category: 'coast', coordinates: 'world', libraryUse: 'reusable', parts: ['backdrop'],
  fields: { horizon: num('Horizon (over the ground line)', 189, -400, 1200), bottom: num('Near edge (over the ground line)', 0, -600, 1200), haze: num('City haze over it', 0, 0, 1, 0.05) },
  bounds: p => ({ x: 0, h: n(p, 'horizon'), w: 4000, tall: n(p, 'horizon') - n(p, 'bottom') }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw(ctx, v, p, _s, _pass, at) {
    const top = R(v.y(at.h + n(p, 'horizon')) / ART), bot = v.y(at.h + n(p, 'bottom')) / ART, l = v.lighting;
    const sun = sunsetSun(v, l, v.y(at.h + n(p, 'horizon'))), depth = sun.r > 0 ? (sun.y - v.y(at.h + n(p, 'horizon'))) / sun.r : 0;
    const refl = smooth(0, 0.45, 1 - depth), warm = lerp(0.35, 1, smooth(-0.17, 0, l.sun.el));
    ctx.save(); ctx.scale(ART, ART);
    try { drawSea(ctx, { W: v.viewW / ART, top, bottom: Math.max(top + 4, bot + 2), sunX: sun.x / ART, sunR: sun.r / ART, refl: refl * (1 - n(p, 'haze') * 0.8), t: v.t, warm, haze: n(p, 'haze') * 0.6, shift: -v.sx(0, at.parallax) / ART * 0.4 / Math.max(0.01, at.parallax) }); }
    finally { ctx.restore(); }
  },
};

/** A far landmark's shadow and its red light lying on the water under it (the Spire across the bay). */
export const reflectionElement = kit({
  type: 'environment.reflection', label: 'Landmark reflection on the water: dark shape, red light (coast kit, distance)',
  fields: { size: num('Landmark size (its scale)', 1.49, 0.1, 10, 0.01), horizon: num('Horizon (over the ground line)', 189, -400, 1200), depth: num('Down to (over the ground line)', 0, -600, 1200) },
  bounds: p => ({ x: -100 * n(p, 'size'), h: n(p, 'horizon'), w: 200 * n(p, 'size'), tall: n(p, 'horizon') - n(p, 'depth') }),
  draw(P, p) {
    const x = P.x, sx = P.ax, spS = n(p, 'size') * S, top = R(P.y(n(p, 'horizon'))), bot = P.y(n(p, 'depth'));
    if (!P.onScreen(sx, sx, 60)) return;
    x.fillStyle = 'rgba(8,3,14,.35)'; x.fillRect(R(sx - 16 * spS * 2), top + 1, R(64 * spS * 2), R((bot - top) * 0.45));
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(' + RED + ',' + (0.12 * (1 - i / 6)).toFixed(3) + ')'; x.fillRect(R(sx - 2 + (P.still ? 0 : Math.sin(P.t * 2 + i) * 1.5)), top + 2 + i * 3, 3, 1); }
  },
});

/** Low bay bridge: railing, end signals and widely spaced lamps, in the shared world's pixels. */
export const bridgeElement = kit({
  type: 'coast.bridge', label: 'Bay bridge rail, signals and lamps (coast kit)',
  fields: {length:num('Length',1380,120,12000),paint:{kind:'color',label:'Rail',default:'#3a2a3a'}},
  bounds:p=>({x:0,h:150,w:n(p,'length'),tall:150}),
  draw(P,p,h){const x=P.x,len=n(p,'length')/ART,a=P.ax,b=P.u(len),gy=P.y(h),L=stripLines(P,h);
    x.fillStyle=String(p.paint);x.fillRect(R(a),R(gy-5),R(b-a),1);
    for(let u=0;u<len;u+=10){const s=R(P.u(u));if(P.onScreen(s,s,2))x.fillRect(s,R(gy-5),1,5);}
    for(const u of [14,len-14]){const s=R(P.u(u)),top=gy-46;if(!P.onScreen(s,s,20))continue;x.fillStyle='#1e1222';x.fillRect(s-3,R(top),6,46);x.fillRect(s-5,R(top),10,3);x.fillStyle='rgba(255,136,0,.35)';x.fillRect(s+2,R(top),1,46);x.fillStyle=P.still||Math.floor(P.f/20)%2?'rgba(255,42,68,1)':'rgba(255,42,68,.3)';x.fillRect(s-1,R(top-3),3,3);}
    for(let u=80;u<len-40;u+=115){const s=R(P.u(u)),top=L.BACK-36;if(!P.onScreen(s,s,30))continue;x.fillStyle='#0e080c';x.fillRect(s,R(top),2,R(L.BACK-top));x.fillRect(s-6,R(top),8,2);x.fillStyle='rgba(255,220,160,.95)';x.fillRect(s-6,R(top+2),4,1);const glow=x.createRadialGradient(s-4,top+3,1,s-4,top+3,22);glow.addColorStop(0,'rgba(255,210,150,.18)');glow.addColorStop(1,'rgba(255,210,150,0)');x.fillStyle=glow;x.fillRect(s-26,top-18,44,44);}
  },
});

export const coastElements: Element[] = [groundElement, bridgeElement, wallElement, pierElement, footbridgeElement, lifeguardElement, breakwaterElement, farShoreElement, boatsElement, wipeElement, seaElement, reflectionElement];
