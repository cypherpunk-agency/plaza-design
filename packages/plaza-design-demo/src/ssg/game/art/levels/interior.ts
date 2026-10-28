import {numericFields} from '../core/fields';
import {appearanceBoolean,appearanceChoice,appearanceRatio,generationCount,generationSeed,shapeLength} from '../core/fields';
import {boundsFromEdges} from '../core/geometry';
import {rectangleControls} from '../core/spatial';
/**
 * INTERIOR KIT: a building seen cut open. A room is the back wall of one storey (its kind sets the
 * finish and what stands against it), a slab is the cut floor between storeys, a section wall is
 * the cut side of the building. Attach them to a building's interior handle (level kit) so they
 * show only while the player is inside, and the facade over them fades.
 */
import type { AssetDefinition } from '../core/composition';
import type { View } from '../core/view';
import { rng } from '../core/primitives';

const num = numericFields({step:1});
const rect = (x: CanvasRenderingContext2D, v: View, wx: number, h: number, w: number, tall: number, fill: string) => {
  const a = v.sx(wx), b = v.sx(wx + w), top = v.y(h + tall), bottom = v.y(h);
  x.fillStyle = fill; x.fillRect(Math.min(a, b), Math.min(top, bottom), Math.max(1, Math.abs(b - a)), Math.max(1, Math.abs(bottom - top)));
};

export const ROOM_KINDS = ['lobby', 'office', 'corridor', 'basement', 'platform'] as const;
type RoomKind = typeof ROOM_KINDS[number];
const FINISH: Record<RoomKind, { wall: string; band: string; floor: string }> = {
  lobby: { wall: '#2b2a2e', band: '#4a4238', floor: '#1d1c1f' },
  office: { wall: '#2a2e33', band: '#3c434b', floor: '#1b1d21' },
  corridor: { wall: '#26282b', band: '#33363b', floor: '#1a1b1d' },
  basement: { wall: '#1f1d1b', band: '#2c2824', floor: '#141312' },
  platform: { wall: '#202428', band: '#c9a227', floor: '#151719' },
};

/**
 * The back wall of one storey: finish by kind, and what stands against it. A room can also open on its own
 * (engine/level.ts `LevelRoom`): `Opens` on arrival or never instead of always, and the artwork attached to it
 * shows only while it is open; shut, it draws its cover (dark, lit windows, a section, earth) over itself.
 */
export const roomElement: AssetDefinition = {
  spatial:rectangleControls({width:'width',height:'height'}),
  type: 'level.room', version: 1, label: 'Room (cut-open storey)', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: {
    width: shapeLength(num('Width', 240, 20, 4000, 1, 'units')), height: shapeLength(num('Height (floor to ceiling)', 62, 30, 400, 1, 'units')),
    kind: appearanceChoice({ kind: 'select', label: 'Kind', options: [...ROOM_KINDS], default: 'office' }),
    lit: appearanceRatio(num('Lights on', 1, 0, 1, 0.05)), seed: generationSeed(num('Seed', 1, 0, 1000000)),
    reveal: appearanceChoice({ kind: 'select', label: 'Opens (always: with its building)', options: ['always', 'arrival', 'never'], default: 'always' }),
    keep: appearanceChoice({ kind: 'select', label: 'Once seen', options: ['remember', 'close'], default: 'remember' }),
    closed: appearanceChoice({ kind: 'select', label: 'Looks while shut', options: ['dark', 'windows', 'section', 'earth'], default: 'dark' }),
    doorLight: appearanceBoolean({ kind: 'boolean', label: 'Light under a door while shut', default: false }),
    doorAt: generationCount(num('Door at (units from where the room starts: its left, its right when mirrored; -1: the middle)', -1, -1, 4000)),
  },
  // from the level while playing: how open the room is, and how much the player is in it (0: remembered from before,
  // drawn darkened); 1 for both is the default for a room nobody set
  visualFields: { open: appearanceRatio(num('Open', 1, 0, 1, 0.01)), here: num('Player in it', 1, 0, 1, 0.01) },
  bounds: p => boundsFromEdges({left:0,right:Number(p.width),bottom:0,top:Number(p.height)}),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' }, middle: { x: Number(p.width) / 2, h: 0, role: 'mount' } }),
  draw: (x, v, p, s) => {
    drawRoom(x, v, p);
    if (p.reveal === 'arrival' || p.reveal === 'never') { drawRemembered(x, v, p, s); drawShut(x, v, p, s); }
  },
};
function drawRoom(x: CanvasRenderingContext2D, v: View, p: Readonly<Record<string, unknown>>) {
    const w = Number(p.width), h = Number(p.height), kind = p.kind as RoomKind, f = FINISH[kind] ?? FINISH.office, lit = Number(p.lit), r = rng(Number(p.seed) * 31 + 7);
    rect(x, v, 0, 0, w, h, f.wall);
    rect(x, v, 0, 0, w, 6, f.band);
    if (kind === 'office' || kind === 'lobby') {
      // the window wall at the back: city lights through the glass, mullions every 40
      for (let wx = 10; wx + 30 < w; wx += 40) {
        rect(x, v, wx, 14, 30, h - 22, '#0d1622');
        for (let i = 0; i < 4; i++) rect(x, v, wx + 3 + Math.floor(r() * 24), 16 + Math.floor(r() * (h - 30)), 2, 2, r() < 0.6 ? '#ffd68a' : '#7fb2c8');
        rect(x, v, wx, 14, 30, 1, '#4b5560');
      }
    }
    if (kind === 'lobby') { rect(x, v, w / 2 - 30, 0, 60, 18, '#3e3730'); rect(x, v, w / 2 - 30, 18, 60, 2, '#8a7a5a'); rect(x, v, w / 2 - 6, 20, 12, 6, '#0f1a1f'); }
    if (kind === 'office') for (let dx = 24; dx + 40 < w; dx += 70) { rect(x, v, dx, 14, 36, 2, '#4a4f58'); rect(x, v, dx + 2, 0, 2, 14, '#33373e'); rect(x, v, dx + 32, 0, 2, 14, '#33373e'); rect(x, v, dx + 12, 16, 12, 9, '#111418'); rect(x, v, dx + 13, 17, 10, 7, lit > 0 ? 'rgba(120,200,220,.55)' : '#1a1d22'); }
    if (kind === 'corridor' || kind === 'basement') for (let dx = 20; dx < w - 10; dx += 34) rect(x, v, dx, h - 10, 2, 10, '#3a3f45');
    if (kind === 'basement') { rect(x, v, 0, h - 6, w, 3, '#4a3f30'); rect(x, v, 8, 0, 18, 30, '#2d2a26'); rect(x, v, w - 30, 0, 22, 24, '#2d2a26'); }
    if (kind === 'platform') { rect(x, v, 0, 0, w, 3, '#c9a227'); for (let dx = 30; dx < w - 20; dx += 90) { rect(x, v, dx, 26, 40, 14, '#0f1416'); rect(x, v, dx + 2, 28, 36, 10, 'rgba(255,214,138,.35)'); } }
    // ceiling lights and their glow on the wall
    if (lit > 0) for (let dx = 30; dx < w - 10; dx += 60) { rect(x, v, dx, h - 3, 14, 2, '#ffe9b8'); x.fillStyle = `rgba(255,220,160,${0.07 * lit})`; x.fillRect(v.sx(dx - 10), v.y(h - 3), Math.abs(v.sx(dx + 24) - v.sx(dx - 10)), Math.abs(v.y(0) - v.y(h - 3))); }
}
/** A room the player has left but remembers: its wall darkened as much as they are away (`s.here`); its things fade over it (engine/level.ts). */
function drawRemembered(x: CanvasRenderingContext2D, v: View, p: Readonly<Record<string, unknown>>, s: Readonly<Record<string, unknown>>) {
    const away = 1 - Math.max(0, Math.min(1, Number(s.here ?? 1))); if (away <= 0.001) return;
    rect(x, v, 0, 0, Number(p.width), Number(p.height), `rgba(6,8,12,${(0.45 * away).toFixed(3)})`);
}
/** A shut room's cover, as much as it is shut (`s.open`, from the level): what the player has not reached yet. */
function drawShut(x: CanvasRenderingContext2D, v: View, p: Readonly<Record<string, unknown>>, s: Readonly<Record<string, unknown>>) {
    const shut = 1 - Math.max(0, Math.min(1, Number(s.open ?? 1))); if (shut <= 0.001) return;
    const w = Number(p.width), t = Number(p.height), look = String(p.closed ?? 'dark');
    x.save(); x.globalAlpha *= shut;
    if (look === 'earth') {
      rect(x, v, 0, 0, w, t, '#1c140e');
      for (let h = 6; h < t; h += 11) rect(x, v, 0, h, w, 2, '#2a1e14');
      for (let i = 0; i < w * t / 90; i++) { const a = (i * 97.13) % w, b = (i * 53.7) % t; rect(x, v, a, b, 1.5, 1.5, i % 3 ? '#3a2a1c' : '#4a3a28'); }
    } else if (look === 'section') {
      // an architect's cut: poured concrete, hatched, with the slabs drawn heavier
      rect(x, v, 0, 0, w, t, '#2b2d33');
      x.save(); x.beginPath(); x.rect(Math.min(v.sx(0), v.sx(w)), Math.min(v.y(0), v.y(t)), Math.abs(v.sx(w) - v.sx(0)), Math.abs(v.y(t) - v.y(0))); x.clip();
      x.strokeStyle = '#41444c'; x.lineWidth = 1; x.beginPath();
      for (let k = -t; k < w; k += 7) { x.moveTo(v.sx(k), v.y(0)); x.lineTo(v.sx(k + t), v.y(t)); }
      x.stroke(); x.restore();
      rect(x, v, 0, 0, w, 3, '#55585f'); rect(x, v, 0, t - 3, w, 3, '#55585f');
    } else {
      rect(x, v, 0, 0, w, t, '#0c0d10');
      rect(x, v, 0, 0, w, 2, '#1d1f25'); rect(x, v, 0, t - 2, w, 2, '#1d1f25');
      if (look === 'windows') for (let i = 0, n = Math.max(1, Math.floor(w / 46)); i < n; i++) {
        // lit from inside, seen from outside: warm panes, a blind half down on some
        const cx = (i + 0.5) * w / n - 9, lit = (i * 7 + Math.round(w)) % 3 !== 0;
        rect(x, v, cx, t * 0.35, 18, Math.min(22, t * 0.45), lit ? 'rgba(255,196,120,.55)' : '#16181d');
        if (lit && i % 2) rect(x, v, cx, t * 0.35 + Math.min(22, t * 0.45) * 0.5, 18, Math.min(22, t * 0.45) * 0.5, 'rgba(60,40,24,.8)');
      }
    }
    if (p.doorLight === true) { const at = Number(p.doorAt ?? -1), cx = at >= 0 ? Math.min(w - 9, Math.max(9, at)) : w / 2; rect(x, v, cx - 9, 0, 18, 1.5, 'rgba(255,200,130,.85)'); }
    x.restore();
}

/** The cut floor between two storeys: concrete with section hatching and a lit edge. */
export const slabElement: AssetDefinition = {
  spatial:rectangleControls({width:'width',height:'thickness',originY:1}),
  type: 'level.slab', version: 1, label: 'Floor slab (cut)', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: { width: shapeLength(num('Width', 240, 10, 4000, 1, 'units')), thickness: shapeLength(num('Thickness', 10, 2, 60, 1, 'units')) },
  bounds: p => boundsFromEdges({left:0,right:Number(p.width),bottom:-Number(p.thickness),top:0}),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, end: { x: Number(p.width), h: 0, role: 'mount' } }),
  draw: (x, v, p) => {
    const w = Number(p.width), t = Number(p.thickness);
    rect(x, v, 0, -t, w, t, '#3a3c42');
    x.strokeStyle = '#2a2c31'; x.lineWidth = 1; x.beginPath();
    for (let dx = 0; dx < w; dx += 6) { x.moveTo(v.sx(dx), v.y(-t)); x.lineTo(v.sx(Math.min(w, dx + t)), v.y(0)); }
    x.stroke();
    rect(x, v, 0, -1, w, 1, 'rgba(255,190,120,.4)');
  },
};

/** A cut side wall of the building, floor to roof. */
export const sectionWallElement: AssetDefinition = {
  spatial:rectangleControls({width:'thickness',height:'height'}),
  type: 'level.section-wall', version: 1, label: 'Section wall (cut)', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: { height: shapeLength(num('Height', 300, 10, 4000, 1, 'units')), thickness: shapeLength(num('Thickness', 8, 2, 40, 1, 'units')) },
  bounds: p => boundsFromEdges({left:0,right:Number(p.thickness),bottom:0,top:Number(p.height)}),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: 0, h: Number(p.height), role: 'mount' } }),
  draw: (x, v, p) => { const t = Number(p.thickness), h = Number(p.height); rect(x, v, 0, 0, t, h, '#34363c'); rect(x, v, 0, 0, 1, h, 'rgba(255,190,120,.35)'); },
};

/** Earth and rock below the street, where a basement or a station is dug in. */
export const groundSectionElement: AssetDefinition = {
  spatial:rectangleControls({width:'width',height:'depth',originY:1}),
  type: 'level.ground-section', version: 1, label: 'Ground in section (below the street)', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: { width: shapeLength(num('Width', 600, 10, 10000, 1, 'units')), depth: shapeLength(num('Depth', 260, 10, 2000, 1, 'units')), seed: generationSeed(num('Seed', 3, 0, 1000000)) },
  bounds: p => boundsFromEdges({left:0,right:Number(p.width)+5,bottom:-Number(p.depth),top:2}),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw: (x, v, p) => {
    const w = Number(p.width), d = Number(p.depth), r = rng(Number(p.seed) * 13 + 1);
    rect(x, v, 0, -d, w, d, '#120f0d');
    for (let i = 0; i < w * d / 900; i++) rect(x, v, Math.floor(r() * w), -Math.floor(r() * d), 2 + Math.floor(r() * 4), 1 + Math.floor(r() * 2), r() < 0.5 ? '#1d1916' : '#0b0a09');
    // pipes and a cable run under the street
    rect(x, v, 0, -14, w, 3, '#2b2f33'); rect(x, v, 0, -22, w, 2, '#3a2a1c');
  },
};

export const interiorElements: AssetDefinition[] = [roomElement, slabElement, sectionWallElement, groundSectionElement];
