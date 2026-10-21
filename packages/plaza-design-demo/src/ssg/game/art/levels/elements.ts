/**
 * LEVEL KIT: what makes a scene more than one street line. Floors are walkable lines at a height;
 * stairs and escalators join two floors; a lift carries the player between the floors its shaft
 * crosses; a door joins the street to a building's own floors. Shell and interior handles group a
 * building's artwork: what is attached to the shell fades while the player is inside, what is
 * attached to the interior shows only then. engine/level.ts compiles these placements into the
 * scene's level and runs it; the artwork here only draws.
 *
 * Floors, doors and the handles are logic (drawn only as editor diagrams). Stairs, escalators and
 * lifts are artwork with a mechanism. Heights are world units over the street (the player is 42).
 */
import type { Element, Field } from '../core/composition';
import type { View } from '../core/view';

const num = (label: string, value: number, min: number, max: number, step = 1, unit?: string): Field => ({ kind: 'number', label, default: value, min, max, step, ...(unit ? { unit } : {}) });
const text = (label: string, value = ''): Field => ({ kind: 'string', label, default: value });
const origin = () => ({ origin: { x: 0, h: 0, role: 'origin' as const } });

/** Concrete, steel and the warm rim light every set piece carries (ART-GUIDE §3: nothing floats, edges read). */
const C = { dark: '#16171b', mid: '#2a2c33', face: '#3b3e47', edge: '#5d616c', rim: 'rgba(255,190,120,.35)', rail: '#8a8f99', glass: 'rgba(120,170,190,.18)', lamp: '#ffd68a', go: '#7cff9a', stop: '#ff6a4a' };
const rect = (x: CanvasRenderingContext2D, v: View, wx: number, h: number, w: number, tall: number, fill: string) => {
  const a = v.sx(wx), b = v.sx(wx + w), top = v.y(h + tall), bottom = v.y(h);
  x.fillStyle = fill; x.fillRect(Math.min(a, b), Math.min(top, bottom), Math.max(1, Math.abs(b - a)), Math.max(1, Math.abs(bottom - top)));
};

/** A walkable line. `building` names whose floor it is (empty: outdoors, the street); `label` is what a lift shows. */
export const floorElement: Element = {
  type: 'level.floor', version: 1, label: 'Floor (walkable line)', category: 'scene', parts: [], libraryUse: 'reusable',
  fields: { width: num('Width', 300, 10, 10000, 1, 'units'), building: text('Building (empty: outdoors)'), label: text('Name on the lift panel') },
  bounds: p => ({ x: 0, h: 0, w: Number(p.width), tall: 4 }),
  anchors: p => ({ ...origin(), end: { x: Number(p.width), h: 0, role: 'mount' } }),
  draw() {},
};

/** Where the street meets a building's floor at the same height: ↑ steps in, ↓ steps out. */
export const doorElement: Element = {
  type: 'level.door', version: 1, label: 'Way into a building', category: 'scene', parts: [], libraryUse: 'reusable',
  fields: { building: text('Building'), width: num('Width', 24, 8, 200, 1, 'units') },
  bounds: p => ({ x: -Number(p.width) / 2, h: 0, w: Number(p.width), tall: 46 }),
  anchors: origin,
  draw() {},
};

/** Grouping handles: attach a building's facade to its shell and its rooms to its interior. */
const handle = (type: string, label: string, fields: Record<string, Field> = {}): Element => ({
  type, version: 1, label, category: 'scene', parts: [], libraryUse: 'reusable', fields: { building: text('Building'), ...fields },
  bounds: () => ({ x: -6, h: 0, w: 12, tall: 12 }), anchors: origin, draw() {},
});
export const shellElement = handle('level.shell', 'Building shell (fades when inside)', { revealSpeed: num('Opens and closes (share per frame)', 0.07, 0.01, 1, 0.01) });
export const interiorElement = handle('level.interior', 'Building interior (shown when inside)');

/** Steps from the foot (origin) to the top at (run, rise): a concrete flight with a stringer and a handrail. */
function drawFlight(x: CanvasRenderingContext2D, v: View, run: number, rise: number, moving: number | null) {
  const n = Math.max(2, Math.round(Math.abs(rise) / 8)), dx = run / n, dh = rise / n, dir = Math.sign(run) || 1;
  // stringer under the steps (the side we see), with its underside following the slope
  x.fillStyle = C.mid;
  x.beginPath(); x.moveTo(v.sx(0), v.y(0)); x.lineTo(v.sx(run), v.y(rise)); x.lineTo(v.sx(run), v.y(rise - 10)); x.lineTo(v.sx(0), v.y(-10)); x.closePath(); x.fill();
  // an escalator's steps slide along the incline by a fraction of a step (`moving`)
  const f = moving === null ? 0 : ((moving % 1) + 1) % 1;
  for (let i = moving === null ? 0 : -1; i < n; i++) {
    const k = Math.max(0, Math.min(n - 1, i + f)), sx = k * dx, sh = (k + 1) * dh;
    rect(x, v, sx, sh - 2, dx, 2, C.edge);
    rect(x, v, sx, sh - dh, dx, Math.max(1, dh - 2), C.face);
  }
  void dir;
  // handrail on posts, a warm rim on top so the line reads against dark walls
  x.strokeStyle = C.rail; x.lineWidth = 1;
  x.beginPath(); x.moveTo(v.sx(0), v.y(30)); x.lineTo(v.sx(run), v.y(rise + 30)); x.stroke();
  x.strokeStyle = C.rim; x.beginPath(); x.moveTo(v.sx(0), v.y(31)); x.lineTo(v.sx(run), v.y(rise + 31)); x.stroke();
  for (let i = 0; i <= n; i += 2) rect(x, v, i * dx, i * dh, 1, 30, C.rail);
}

export const stairsElement: Element = {
  type: 'level.stairs', version: 1, label: 'Stairs between two floors', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: {
    run: num('Run (to the top, negative: leftwards)', 120, -2000, 2000, 1, 'units'), rise: num('Rise (to the top floor)', 76, -2000, 2000, 1, 'units'),
    speed: num('Climbing speed (units per frame)', 1, 0.1, 4, 0.05), reach: num('Reach at either end', 10, 2, 60, 1, 'units'),
  },
  bounds: p => { const r = Number(p.run), h = Number(p.rise); return { x: Math.min(0, r), h: Math.min(0, h) - 10, w: Math.max(8, Math.abs(r)), tall: Math.abs(h) + 42 }; },
  anchors: p => ({ ...origin(), top: { x: Number(p.run), h: Number(p.rise), role: 'mount' } }),
  draw: (x, v, p) => drawFlight(x, v, Number(p.run), Number(p.rise), null),
};

export const escalatorElement: Element = {
  type: 'level.escalator', version: 1, label: 'Escalator between two floors', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: {
    run: num('Run (to the top, negative: leftwards)', 150, -2000, 2000, 1, 'units'), rise: num('Rise (to the top floor)', 90, -2000, 2000, 1, 'units'),
    direction: { kind: 'select', label: 'Runs', options: ['up', 'down'], default: 'up' }, speed: num('Speed', 0.6, 0.1, 3, 0.05),
    reach: num('Reach at either end', 10, 2, 60, 1, 'units'),
  },
  bounds: p => { const r = Number(p.run), h = Number(p.rise); return { x: Math.min(0, r) - 14, h: Math.min(0, h) - 14, w: Math.abs(r) + 28, tall: Math.abs(h) + 50 }; },
  anchors: p => ({ ...origin(), top: { x: Number(p.run), h: Number(p.rise), role: 'mount' } }),
  draw: (x, v, p) => {
    const run = Number(p.run), rise = Number(p.rise), dir = Math.sign(run) || 1, up = p.direction !== 'down';
    // the truss: a deep steel box under the incline, with flat landings at both ends
    x.fillStyle = C.dark;
    x.beginPath(); x.moveTo(v.sx(-14 * dir), v.y(0)); x.lineTo(v.sx(0), v.y(0)); x.lineTo(v.sx(run), v.y(rise)); x.lineTo(v.sx(run + 14 * dir), v.y(rise));
    x.lineTo(v.sx(run + 14 * dir), v.y(rise - 14)); x.lineTo(v.sx(run), v.y(rise - 14)); x.lineTo(v.sx(0), v.y(-14)); x.lineTo(v.sx(-14 * dir), v.y(-14)); x.closePath(); x.fill();
    drawFlight(x, v, run, rise, (v.t * Number(p.speed) / 40) * (up ? 1 : -1));
    // glass balustrade and the black rubber handrail, lit comb plates at both ends
    x.fillStyle = C.glass;
    x.beginPath(); x.moveTo(v.sx(0), v.y(2)); x.lineTo(v.sx(run), v.y(rise + 2)); x.lineTo(v.sx(run), v.y(rise + 28)); x.lineTo(v.sx(0), v.y(28)); x.closePath(); x.fill();
    x.strokeStyle = '#0b0b0d'; x.lineWidth = 2; x.beginPath(); x.moveTo(v.sx(-10 * dir), v.y(28)); x.lineTo(v.sx(0), v.y(28)); x.lineTo(v.sx(run), v.y(rise + 28)); x.lineTo(v.sx(run + 10 * dir), v.y(rise + 28)); x.stroke();
    rect(x, v, -12 * dir, 0, 8 * dir, 2, C.lamp); rect(x, v, run + 4 * dir, rise, 8 * dir, 2, C.lamp);
    // a direction lamp at the foot: green where it takes you, red against it
    rect(x, v, -14 * dir, 14, 3 * dir, 4, up ? C.go : C.stop); rect(x, v, run + 11 * dir, rise + 14, 3 * dir, 4, up ? C.stop : C.go);
  },
};

/**
 * A lift shaft from its bottom stop (origin) up `height`: frame, cables, counterweight, the car at
 * `car` (units over the bottom) with doors open by `doors` (0..1). The engine moves both.
 */
export const elevatorElement: Element = {
  type: 'level.elevator', version: 1, label: 'Lift between floors', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: { height: num('Shaft height (bottom to top stop)', 280, 20, 4000, 1, 'units'), width: num('Car width', 34, 20, 120, 1, 'units'), device: text('Driven by a mover (device.part; empty: it drives itself)'),
    speed: num('Car speed when it drives itself (units per frame)', 1.4, 0.1, 10, 0.05), doorSpeed: num('Doors (share per frame)', 0.06, 0.01, 1, 0.01) },
  visualFields: { car: num('Car height over the bottom stop', 0, -100, 4000, 0.01), doors: num('Doors open', 0, 0, 1, 0.01) },
  bounds: p => ({ x: -Number(p.width) / 2 - 4, h: -4, w: Number(p.width) + 8, tall: Number(p.height) + 58 }),
  anchors: p => ({ ...origin(), top: { x: 0, h: Number(p.height), role: 'mount' } }),
  draw: (x, v, p, s) => {
    const w = Number(p.width), hw = w / 2, top = Number(p.height) + 52, car = Math.max(0, Math.min(Number(p.height), Number(s.car ?? 0))), open = Math.max(0, Math.min(1, Number(s.doors ?? 0)));
    rect(x, v, -hw - 4, -4, w + 8, top + 4, C.dark);
    rect(x, v, -hw - 4, -4, 2, top + 4, C.edge); rect(x, v, hw + 2, -4, 2, top + 4, C.edge);
    // cables from the machine room to the car, the counterweight going the other way
    rect(x, v, -2, car + 46, 1, top - car - 46, C.rail); rect(x, v, 1, car + 46, 1, top - car - 46, C.rail);
    rect(x, v, hw - 6, Number(p.height) - car + 8, 4, 22, C.mid);
    rect(x, v, -hw - 4, top - 6, w + 8, 6, C.mid);
    // the car: lit inside, a hairline frame, two sliding doors
    rect(x, v, -hw, car, w, 46, C.face);
    rect(x, v, -hw + 2, car + 2, w - 4, 42, '#a89a7c');
    rect(x, v, -hw + 3, car + 40, w - 6, 3, C.lamp);
    const leaf = (w / 2 - 2) * (1 - open);
    rect(x, v, -hw + 2, car + 2, leaf, 40, C.edge); rect(x, v, hw - 2 - leaf, car + 2, leaf, 40, C.edge);
    rect(x, v, -hw, car + 46, w, 2, C.rim);
    // floor indicator over the car
    rect(x, v, -3, car + 50, 6, 3, open > 0.5 ? C.go : C.lamp);
  },
};

export const levelElements: Element[] = [floorElement, doorElement, shellElement, interiorElement, stairsElement, escalatorElement, elevatorElement];
