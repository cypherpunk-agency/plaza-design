/**
 * INTERIOR KIT: a building seen cut open. A room is the back wall of one storey (its kind sets the
 * finish and what stands against it), a slab is the cut floor between storeys, a section wall is
 * the cut side of the building. Attach them to a building's interior handle (level kit) so they
 * show only while the player is inside, and the facade over them fades.
 */
import type { Element, Field } from '../core/composition';
import type { View } from '../core/view';
import { rng } from '../core/primitives';

const num = (label: string, value: number, min: number, max: number, step = 1, unit?: string): Field => ({ kind: 'number', label, default: value, min, max, step, ...(unit ? { unit } : {}) });
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

/** The back wall of one storey: finish by kind, and what stands against it. */
export const roomElement: Element = {
  type: 'level.room', version: 1, label: 'Room (cut-open storey)', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: {
    width: num('Width', 240, 20, 4000, 1, 'units'), height: num('Height (floor to ceiling)', 62, 30, 400, 1, 'units'),
    kind: { kind: 'select', label: 'Kind', options: [...ROOM_KINDS], default: 'office' },
    lit: num('Lights on', 1, 0, 1, 0.05), seed: num('Seed', 1, 0, 1000000),
  },
  bounds: p => ({ x: 0, h: 0, w: Number(p.width), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, ceiling: { x: 0, h: Number(p.height), role: 'mount' }, middle: { x: Number(p.width) / 2, h: 0, role: 'mount' } }),
  draw: (x, v, p) => {
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
  },
};

/** The cut floor between two storeys: concrete with section hatching and a lit edge. */
export const slabElement: Element = {
  type: 'level.slab', version: 1, label: 'Floor slab (cut)', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: { width: num('Width', 240, 10, 4000, 1, 'units'), thickness: num('Thickness', 10, 2, 60, 1, 'units') },
  bounds: p => ({ x: 0, h: -Number(p.thickness), w: Number(p.width), tall: Number(p.thickness) }),
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
export const sectionWallElement: Element = {
  type: 'level.section-wall', version: 1, label: 'Section wall (cut)', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: { height: num('Height', 300, 10, 4000, 1, 'units'), thickness: num('Thickness', 8, 2, 40, 1, 'units') },
  bounds: p => ({ x: 0, h: 0, w: Number(p.thickness), tall: Number(p.height) }),
  anchors: p => ({ origin: { x: 0, h: 0, role: 'origin' }, top: { x: 0, h: Number(p.height), role: 'mount' } }),
  draw: (x, v, p) => { const t = Number(p.thickness), h = Number(p.height); rect(x, v, 0, 0, t, h, '#34363c'); rect(x, v, 0, 0, 1, h, 'rgba(255,190,120,.35)'); },
};

/** Earth and rock below the street, where a basement or a station is dug in. */
export const groundSectionElement: Element = {
  type: 'level.ground-section', version: 1, label: 'Ground in section (below the street)', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: { width: num('Width', 600, 10, 10000, 1, 'units'), depth: num('Depth', 260, 10, 2000, 1, 'units'), seed: num('Seed', 3, 0, 1000000) },
  bounds: p => ({ x: 0, h: -Number(p.depth), w: Number(p.width), tall: Number(p.depth) }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw: (x, v, p) => {
    const w = Number(p.width), d = Number(p.depth), r = rng(Number(p.seed) * 13 + 1);
    rect(x, v, 0, -d, w, d, '#120f0d');
    for (let i = 0; i < w * d / 900; i++) rect(x, v, Math.floor(r() * w), -Math.floor(r() * d), 2 + Math.floor(r() * 4), 1 + Math.floor(r() * 2), r() < 0.5 ? '#1d1916' : '#0b0a09');
    // pipes and a cable run under the street
    rect(x, v, 0, -14, w, 3, '#2b2f33'); rect(x, v, 0, -22, w, 2, '#3a2a1c');
  },
};

export const interiorElements: Element[] = [roomElement, slabElement, sectionWallElement, groundSectionElement];
