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
  fields: {
    width: num('Width', 300, 10, 10000, 1, 'units'), building: text('Building (empty: outdoors)'), label: text('Name on the lift panel'),
    entry: { kind: 'select', label: 'Entered (a building floor at street height)', options: ['walk', 'door'], default: 'walk' },
    indoor: { kind: 'boolean', label: 'Indoors (a tunnel, cellar or hall: no daylight while you stand here)', default: false },
  },
  bounds: p => ({ x: 0, h: 0, w: Number(p.width), tall: 4 }),
  anchors: p => ({ ...origin(), end: { x: Number(p.width), h: 0, role: 'mount' } }),
  draw() {},
};

/** Where the street meets a door-only building floor at the same height: ↑ steps in, ↓ steps out. Walk-in floors need none. */
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
export const shellElement = handle('level.shell', 'Building shell (fades when inside)', { revealSpeed: num('Opens and closes (share per frame)', 0.07, 0.01, 1, 0.01), ghost: num('Wall left while inside', 0, 0, 1, 0.01) });
export const interiorElement = handle('level.interior', 'Building interior (shown when inside)');

/** The inside face of a building's street door, in the look of its outside: shown only while the player is in that building. */
export const ENTRANCE_STYLES = ['glass', 'shop', 'flat', 'service'] as const;
export const entranceElement: Element = {
  type: 'level.entrance', version: 1, label: 'Street door seen from inside', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: {
    building: text('Building (shown while inside it)'), style: { kind: 'select', label: 'Style', options: [...ENTRANCE_STYLES], default: 'glass' },
    width: num('Width', 28, 14, 120, 1, 'units'), height: num('Height', 46, 30, 120, 1, 'units'),
    sign: { kind: 'select', label: 'Shop sign (read from inside)', options: ['CLOSED', 'PULL', 'none'], default: 'CLOSED' },
  },
  bounds: p => ({ x: -Number(p.width) / 2 - 3, h: 0, w: Number(p.width) + 6, tall: Number(p.height) + 4 }),
  anchors: origin,
  draw: (x, v, p) => {
    const w = Number(p.width), t = Number(p.height), hw = w / 2, style = String(p.style ?? 'glass');
    const frame = style === 'glass' ? '#7d8794' : style === 'shop' ? '#4a3222' : style === 'service' ? '#3a3d44' : '#2e2a26';
    // the frame: a glass door shows the lobby through it, the others fill it
    if (style === 'glass') { rect(x, v, -hw - 3, 0, 3, t + 3, frame); rect(x, v, hw, 0, 3, t + 3, frame); rect(x, v, -hw - 3, t, w + 6, 3, frame); }
    else rect(x, v, -hw - 3, 0, w + 6, t + 3, frame);
    if (style === 'glass') {
      // two glass leaves, the street light through them, a push bar across both
      rect(x, v, -hw, 0, w, t, 'rgba(150,200,220,.22)'); rect(x, v, -0.5, 0, 1, t, frame);
      rect(x, v, -hw + 2, t * 0.55, w - 4, t * 0.4, 'rgba(255,220,170,.10)');
      rect(x, v, -hw + 2, 20, w - 4, 2, '#c8ccd4'); rect(x, v, -hw + 2, 19, 1, 4, '#8a8f99'); rect(x, v, hw - 3, 19, 1, 4, '#8a8f99');
      rect(x, v, -hw, 0, w, 2, '#5d616c');
    } else if (style === 'shop') {
      // timber door, a pane in the top half, the bell on its bracket, the hanging sign seen from behind
      rect(x, v, -hw, 0, w, t, '#6b4728'); rect(x, v, -hw + 3, t * 0.5, w - 6, t * 0.42, 'rgba(150,200,220,.25)');
      rect(x, v, -hw + 3, 4, w - 6, t * 0.4, '#5a3b22'); rect(x, v, hw - 5, t * 0.42, 2, 3, '#c9a24a');
      rect(x, v, hw - 4, t + 1, 3, 1, '#8a6a2a'); rect(x, v, hw - 4.5, t - 3, 4, 4, '#c9a24a');
      if (p.sign !== 'none') {
        const sw = Math.min(w - 8, 20), sh = 7, sy = t * 0.62;
        rect(x, v, -sw / 2, sy, sw, sh, '#e8e2d0');
        x.save(); x.translate(v.sx(0), v.y(sy + sh / 2)); x.scale(-1, 1); x.fillStyle = '#2a2622';
        x.font = 'bold ' + Math.max(4, Math.round(sh * 0.7 * Math.abs(v.y(0) - v.y(1)))) + 'px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(String(p.sign ?? 'CLOSED'), 0, 0.5); x.restore();
        rect(x, v, -1, sy + sh, 2, t * 0.92 - sy - sh, '#2a2622');
      }
    } else if (style === 'flat') {
      // a painted flat door: spy-hole, chain across to the frame, the handle and its lock
      rect(x, v, -hw, 0, w, t, '#4e5a52'); rect(x, v, -hw + 2, 2, w - 4, t - 4, '#56635a');
      rect(x, v, -0.75, t * 0.72, 1.5, 1.5, '#0c0d10');
      rect(x, v, hw - 6, t * 0.48, 3, 2, '#c8ccd4'); rect(x, v, hw - 5, t * 0.4, 2, 2, '#8a8f99');
      for (let i = 0; i < 5; i++) rect(x, v, hw - 6 + i * 1.6, t * 0.62 - i * 0.6, 1.2, 1.2, '#b0b4bc');
      rect(x, v, hw + 0.5, t * 0.6, 2, 3, '#8a8f99');
    } else {
      // steel service door: riveted edges, a kick plate, a panic bar, a small wired-glass light
      rect(x, v, -hw, 0, w, t, '#4a4e57');
      for (let h = 4; h < t; h += 8) { rect(x, v, -hw + 1.5, h, 1, 1, '#6f7480'); rect(x, v, hw - 2.5, h, 1, 1, '#6f7480'); }
      rect(x, v, -hw + 2, 0, w - 4, 7, '#5d616c'); rect(x, v, -hw + 3, 21, w - 6, 2, '#b8bcc4');
      rect(x, v, -4, t * 0.68, 8, 9, 'rgba(150,200,220,.25)'); rect(x, v, -4, t * 0.68 + 4, 8, 0.6, '#6f7480');
    }
  },
};


/** A stair's materials: the stringer under the steps, the treads and their nosing, the handrail and its warm rim. */
type StairLook = { stringer: string; tread: string; nose: string; rail: string; rim: string };
const LOOKS: Record<string, StairLook> = {
  concrete: { stringer: C.mid, tread: C.face, nose: C.edge, rail: C.rail, rim: C.rim },
  timber: { stringer: '#3b2716', tread: '#7a5230', nose: '#a8763f', rail: '#6b4728', rim: 'rgba(255,190,120,.3)' },
  stone: { stringer: '#111114', tread: '#2a2a31', nose: '#4a4a55', rail: '#c9a24a', rim: 'rgba(255,215,140,.45)' },
  rust: { stringer: '#2c1a12', tread: '#6e3a20', nose: '#9a5630', rail: '#7a4326', rim: 'rgba(255,150,90,.3)' },
  steel: { stringer: '#24272d', tread: '#4a4e57', nose: '#6f7480', rail: '#8a8f99', rim: 'rgba(200,220,255,.25)' },
};
/** Each stair style: its material and how it is drawn (engine/level.ts STAIR_SHAPES says how it is climbed). */
export const STAIR_STYLES: Readonly<Record<string, { look: string; draw: 'flight' | 'ladder' | 'rungs' | 'spiral' | 'switchback' }>> = {
  concrete: { look: 'concrete', draw: 'flight' }, timber: { look: 'timber', draw: 'flight' }, stone: { look: 'stone', draw: 'flight' },
  ladder: { look: 'timber', draw: 'ladder' }, switchback: { look: 'timber', draw: 'switchback' }, spiral: { look: 'stone', draw: 'spiral' },
  'steel-ladder': { look: 'steel', draw: 'rungs' }, 'rusty-spiral': { look: 'rust', draw: 'spiral' },
};
/** Lift looks: the goods lift, a caged goods lift, an old passenger lift with a brass gate, glass, a gold-door bank, broken, a bare service platform. */
export const LIFT_STYLES = ['goods', 'cage', 'passenger-old', 'glass', 'gold', 'broken', 'service'] as const;
const RAILS: Record<string, string> = { steel: C.rail, timber: '#6b4728', gold: '#c9a24a', none: '' };
/** A view moved by (dx, dh): a piece drawn from another origin (a switchback's upper flight). */
const shifted = (v: View, dx: number, dh: number): View => ({ ...v, sx: (wx: number) => v.sx(wx + dx), y: (h: number) => v.y(h + dh) });

/** Steps from the foot (origin) to the top at (run, rise): a flight with a stringer and a handrail, in its material. */
function drawFlight(x: CanvasRenderingContext2D, v: View, run: number, rise: number, moving: number | null, look: StairLook = LOOKS.concrete, rail = look.rail) {
  const n = Math.max(2, Math.round(Math.abs(rise) / 8)), dx = run / n, dh = rise / n, dir = Math.sign(run) || 1;
  // stringer under the steps (the side we see), with its underside following the slope
  x.fillStyle = look.stringer;
  x.beginPath(); x.moveTo(v.sx(0), v.y(0)); x.lineTo(v.sx(run), v.y(rise)); x.lineTo(v.sx(run), v.y(rise - 10)); x.lineTo(v.sx(0), v.y(-10)); x.closePath(); x.fill();
  // an escalator's steps slide along the incline by a fraction of a step (`moving`)
  const f = moving === null ? 0 : ((moving % 1) + 1) % 1;
  for (let i = moving === null ? 0 : -1; i < n; i++) {
    const k = Math.max(0, Math.min(n - 1, i + f)), sx = k * dx, sh = (k + 1) * dh;
    rect(x, v, sx, sh - 2, dx, 2, look.nose);
    rect(x, v, sx, sh - dh, dx, Math.max(1, dh - 2), look.tread);
  }
  void dir;
  if (!rail) return;
  // handrail on posts, a warm rim on top so the line reads against dark walls
  x.strokeStyle = rail; x.lineWidth = 1;
  x.beginPath(); x.moveTo(v.sx(0), v.y(30)); x.lineTo(v.sx(run), v.y(rise + 30)); x.stroke();
  x.strokeStyle = look.rim; x.beginPath(); x.moveTo(v.sx(0), v.y(31)); x.lineTo(v.sx(run), v.y(rise + 31)); x.stroke();
  for (let i = 0; i <= n; i += 2) rect(x, v, i * dx, i * dh, 1, 30, rail);
}

/** A steep ladder-stair: one heavy stringer along the slope, plank treads, a single rail. */
function drawLadderStair(x: CanvasRenderingContext2D, v: View, run: number, rise: number, look: StairLook, rail: string) {
  const n = Math.max(3, Math.round(Math.abs(rise) / 9)), dir = Math.sign(run) || 1;
  x.strokeStyle = look.stringer; x.lineWidth = 3; x.beginPath(); x.moveTo(v.sx(0), v.y(-2)); x.lineTo(v.sx(run), v.y(rise - 2)); x.stroke();
  for (let i = 1; i <= n; i++) { const k = i / n; rect(x, v, run * k - 4 * dir, rise * k - 2, 8 * dir, 2, look.tread); rect(x, v, run * k - 4 * dir, rise * k, 8 * dir, 1, look.nose); }
  if (!rail) return;
  x.strokeStyle = rail; x.lineWidth = 1; x.beginPath(); x.moveTo(v.sx(0), v.y(28)); x.lineTo(v.sx(run), v.y(rise + 28)); x.stroke();
  x.strokeStyle = look.rim; x.beginPath(); x.moveTo(v.sx(0), v.y(29)); x.lineTo(v.sx(run), v.y(rise + 29)); x.stroke();
  // posts down to the stringer at both ends and the middle, so the rail stands on the stair
  for (const k of [0, 0.5, 1]) rect(x, v, run * k, rise * k - 2, 1, 30, rail);
}
/** A vertical ladder: two rails, rungs, a safety cage of hoops above head height. */
function drawRungs(x: CanvasRenderingContext2D, v: View, rise: number, look: StairLook) {
  const top = rise + 34, lo = Math.min(0, rise), hi = Math.max(0, top);
  rect(x, v, -7, lo, 2, hi - lo, look.stringer); rect(x, v, 5, lo, 2, hi - lo, look.stringer);
  rect(x, v, -6, lo, 1, hi - lo, look.nose); rect(x, v, 6, lo, 1, hi - lo, look.nose);
  for (let h = lo + 4; h < hi; h += 8) rect(x, v, -5, h, 10, 1.5, look.tread);
  for (let h = lo + 40; h < hi - 4; h += 18) { rect(x, v, -10, h, 20, 1, look.rail); rect(x, v, -10, h, 1, 6, look.rail); rect(x, v, 9, h, 1, 6, look.rail); }
}
/** A spiral stair: a central column, wedge treads turning round it (the back ones darker), a rail winding with them. */
function drawSpiral(x: CanvasRenderingContext2D, v: View, run: number, rise: number, look: StairLook, rail: string) {
  const r = Math.max(12, Math.abs(run) / 2 || 14), n = Math.max(6, Math.round(Math.abs(rise) / 7)), dh = rise / n;
  const tread = (i: number, front: boolean) => { const a = i * 0.85, c = Math.cos(a), h = i * dh; if ((Math.sin(a) >= 0) !== front) return; const w = r * c; rect(x, v, Math.min(0, w) - 1, h - 3, Math.max(4, Math.abs(w) + 2), 3, front ? look.tread : look.stringer); if (front) rect(x, v, Math.min(0, w) - 1, h, Math.max(4, Math.abs(w) + 2), 1, look.nose); };
  for (let i = 1; i <= n; i++) tread(i, false);
  rect(x, v, -2, Math.min(0, rise) - 2, 4, Math.abs(rise) + 34, look.stringer); rect(x, v, -1, Math.min(0, rise) - 2, 1, Math.abs(rise) + 34, look.nose);
  for (let i = 1; i <= n; i++) tread(i, true);
  if (!rail) return;
  x.strokeStyle = rail; x.lineWidth = 1; x.beginPath();
  for (let i = 0; i <= n * 4; i++) { const k = i / 4, a = k * 0.85, px = v.sx(r * Math.cos(a)), py = v.y(k * dh + 26); if (i) x.lineTo(px, py); else x.moveTo(px, py); }
  x.stroke();
}
/** A narrow switchback: a flight to a landing over its width, a second flight back above it (drawn behind). */
function drawSwitchback(x: CanvasRenderingContext2D, v: View, run: number, rise: number, look: StairLook, rail: string) {
  const half = rise / 2, dir = Math.sign(run) || 1, back: StairLook = { ...look, tread: look.stringer, nose: look.tread };
  x.save(); x.globalAlpha *= 0.85; drawFlight(x, shifted(v, run, half), -run, half, null, back, rail); x.restore();
  rect(x, v, run - 2 * dir, half - 4, 16 * dir, 4, look.stringer); rect(x, v, run - 2 * dir, half, 16 * dir, 1, look.nose);
  drawFlight(x, v, run, half, null, look, rail);
}

export const stairsElement: Element = {
  type: 'level.stairs', version: 1, label: 'Stairs between two floors', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: {
    run: num('Run (to the top, negative: leftwards)', 120, -2000, 2000, 1, 'units'), rise: num('Rise (to the top floor)', 76, -2000, 2000, 1, 'units'),
    speed: num('Climbing speed (units per frame)', 1, 0.1, 4, 0.05), reach: num('Reach at either end', 10, 2, 60, 1, 'units'),
    style: { kind: 'select', label: 'Style (spiral, rungs and switchback: run is the width; climbed with ↑/↓)', options: Object.keys(STAIR_STYLES), default: 'concrete' },
    rail: { kind: 'select', label: 'Handrail', options: ['auto', ...Object.keys(RAILS)], default: 'auto' },
  },
  bounds: p => { const r = Number(p.run), h = Number(p.rise), d = STAIR_STYLES[String(p.style)]?.draw ?? 'flight'; return d === 'rungs' || d === 'spiral' ? { x: -Math.max(12, Math.abs(r) / 2 + 2), h: Math.min(0, h) - 4, w: Math.max(24, Math.abs(r) + 4), tall: Math.abs(h) + 40 } : { x: Math.min(0, r), h: Math.min(0, h) - 10, w: Math.max(8, Math.abs(r) + (d === 'switchback' ? 16 : 0)), tall: Math.abs(h) + 42 }; },
  anchors: p => { const d = STAIR_STYLES[String(p.style)]?.draw ?? 'flight'; return { ...origin(), top: { x: d === 'flight' || d === 'ladder' ? Number(p.run) : 0, h: Number(p.rise), role: 'mount' } }; },
  draw: (x, v, p) => {
    const style = STAIR_STYLES[String(p.style)] ?? STAIR_STYLES.concrete, look = LOOKS[style.look], rail = p.rail && p.rail !== 'auto' ? RAILS[String(p.rail)] ?? look.rail : look.rail, run = Number(p.run), rise = Number(p.rise);
    if (style.draw === 'ladder') drawLadderStair(x, v, run, rise, look, rail);
    else if (style.draw === 'rungs') drawRungs(x, v, rise, look);
    else if (style.draw === 'spiral') drawSpiral(x, v, run, rise, look, rail);
    else if (style.draw === 'switchback') drawSwitchback(x, v, run, rise, look, rail);
    else drawFlight(x, v, run, rise, null, look, rail);
  },
};

export const escalatorElement: Element = {
  type: 'level.escalator', version: 1, label: 'Escalator between two floors', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: {
    run: num('Run (to the top, negative: leftwards)', 150, -2000, 2000, 1, 'units'), rise: num('Rise (to the top floor)', 90, -2000, 2000, 1, 'units'),
    direction: { kind: 'select', label: 'Runs', options: ['up', 'down'], default: 'up' }, speed: num('Speed', 0.6, 0.1, 3, 0.05),
    reach: num('Reach at either end', 10, 2, 60, 1, 'units'),
    style: { kind: 'select', label: 'Style', options: ['standard', 'glass'], default: 'standard' },
  },
  bounds: p => { const r = Number(p.run), h = Number(p.rise); return { x: Math.min(0, r) - 14, h: Math.min(0, h) - 14, w: Math.abs(r) + 28, tall: Math.abs(h) + 50 }; },
  anchors: p => ({ ...origin(), top: { x: Number(p.run), h: Number(p.rise), role: 'mount' } }),
  draw: (x, v, p) => {
    const run = Number(p.run), rise = Number(p.rise), dir = Math.sign(run) || 1, up = p.direction !== 'down', glass = p.style === 'glass';
    // the truss: a deep steel box under the incline, with flat landings at both ends
    x.fillStyle = glass ? '#2c3037' : C.dark;
    x.beginPath(); x.moveTo(v.sx(-14 * dir), v.y(0)); x.lineTo(v.sx(0), v.y(0)); x.lineTo(v.sx(run), v.y(rise)); x.lineTo(v.sx(run + 14 * dir), v.y(rise));
    x.lineTo(v.sx(run + 14 * dir), v.y(rise - 14)); x.lineTo(v.sx(run), v.y(rise - 14)); x.lineTo(v.sx(0), v.y(-14)); x.lineTo(v.sx(-14 * dir), v.y(-14)); x.closePath(); x.fill();
    drawFlight(x, v, run, rise, (v.t * Number(p.speed) / 40) * (up ? 1 : -1));
    // glass balustrade and the black rubber handrail, lit comb plates at both ends
    // glass-sided (Spire): the balustrade is clear down to the truss, with a lit steel skirt and a bright top rail
    x.fillStyle = glass ? 'rgba(170,215,235,.24)' : C.glass;
    const low = glass ? -12 : 2;
    x.beginPath(); x.moveTo(v.sx(0), v.y(low)); x.lineTo(v.sx(run), v.y(rise + low)); x.lineTo(v.sx(run), v.y(rise + 28)); x.lineTo(v.sx(0), v.y(28)); x.closePath(); x.fill();
    if (glass) { x.strokeStyle = 'rgba(220,240,255,.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(v.sx(0), v.y(low)); x.lineTo(v.sx(run), v.y(rise + low)); x.stroke(); x.strokeStyle = '#c8ccd4'; x.beginPath(); x.moveTo(v.sx(0), v.y(29)); x.lineTo(v.sx(run), v.y(rise + 29)); x.stroke(); }
    x.strokeStyle = '#0b0b0d'; x.lineWidth = 2; x.beginPath(); x.moveTo(v.sx(-10 * dir), v.y(28)); x.lineTo(v.sx(0), v.y(28)); x.lineTo(v.sx(run), v.y(rise + 28)); x.lineTo(v.sx(run + 10 * dir), v.y(rise + 28)); x.stroke();
    rect(x, v, -12 * dir, 0, 8 * dir, 2, C.lamp); rect(x, v, run + 4 * dir, rise, 8 * dir, 2, C.lamp);
    // a direction lamp at the foot: green where it takes you, red against it
    rect(x, v, -14 * dir, 14, 3 * dir, 4, up ? C.go : C.stop); rect(x, v, run + 11 * dir, rise + 14, 3 * dir, 4, up ? C.stop : C.go);
  },
};

/**
 * A lift shaft from its bottom stop (origin) up `height`: frame, cables, counterweight, the car at
 * `car` (units over the bottom) with doors open by `doors` (0..1). The car is a Circuit mover (`device`):
 * its stops, speed and wiring live in the scene's devices; the doors follow its trips.
 */
export const elevatorElement: Element = {
  type: 'level.elevator', version: 1, label: 'Lift between floors', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: { height: num('Shaft height (bottom to top stop)', 280, 20, 4000, 1, 'units'), width: num('Car width', 34, 20, 120, 1, 'units'), device: text('Car: the Circuit mover that moves it (device.part)'),
    doorMs: num('Doors open in', 280, 40, 3000, 10, 'ms'),
    style: { kind: 'select', label: 'Style (broken: out of order, never called)', options: [...LIFT_STYLES], default: 'goods' } },
  visualFields: { car: num('Car height over the bottom stop', 0, -100, 4000, 0.01), doors: num('Doors open', 0, 0, 1, 0.01) },
  bounds: p => ({ x: -Number(p.width) / 2 - 4, h: -4, w: Number(p.width) + 8, tall: Number(p.height) + 58 }),
  anchors: p => ({ ...origin(), top: { x: 0, h: Number(p.height), role: 'mount' } }),
  draw: (x, v, p, s) => {
    const w = Number(p.width), hw = w / 2, top = Number(p.height) + 52, car = Math.max(0, Math.min(Number(p.height), Number(s.car ?? 0))), open = Math.max(0, Math.min(1, Number(s.doors ?? 0)));
    if (p.style && p.style !== 'goods') { drawLiftStyle(x, v, String(p.style), w, Number(p.height), car, open); return; }
    rect(x, v, -hw - 4, -4, w + 8, top + 4, C.dark);
    rect(x, v, -hw - 4, -4, 2, top + 4, C.edge); rect(x, v, hw + 2, -4, 2, top + 4, C.edge);
    // cables from the machine room to the car, the counterweight going the other way
    rect(x, v, -2, car + 46, 1, top - car - 46, C.rail); rect(x, v, 1, car + 46, 1, top - car - 46, C.rail);
    rect(x, v, hw - 6, Number(p.height) - car + 8, 4, 22, C.mid);
    rect(x, v, -hw - 4, top - 6, w + 8, 6, C.mid);
    // the car: lit inside, a hairline frame, a handrail and the floor panel, two sliding doors
    rect(x, v, -hw, car, w, 46, C.face);
    rect(x, v, -hw + 2, car + 2, w - 4, 42, '#a89a7c');
    rect(x, v, -hw + 3, car + 40, w - 6, 3, C.lamp);
    rect(x, v, -hw + 3, car + 2, w - 6, 2, '#6f6552');
    if (w >= 44) { rect(x, v, -hw + 4, car + 17, w - 8, 1, C.rail); rect(x, v, hw - 8, car + 20, 3, 12, C.mid); for (let i = 0; i < 4; i++) rect(x, v, hw - 7.5, car + 22 + i * 2.5, 2, 1, open > 0.5 && i === 0 ? C.go : C.lamp); }
    const leaf = (w / 2 - 2) * (1 - open);
    rect(x, v, -hw + 2, car + 2, leaf, 40, C.edge); rect(x, v, hw - 2 - leaf, car + 2, leaf, 40, C.edge);
    rect(x, v, -hw, car + 46, w, 2, C.rim);
    // floor indicator over the car
    rect(x, v, -3, car + 50, 6, 3, open > 0.5 ? C.go : C.lamp);
  },
};

/** Lift looks beyond the goods lift: a caged goods lift, an old passenger lift with a brass gate, glass, a gold-door bank, broken, a bare service platform. */
function drawLiftStyle(x: CanvasRenderingContext2D, v: View, style: string, w: number, height: number, car: number, open: number) {
  const hw = w / 2, top = height + 52, line = (x0: number, h0: number, x1: number, h1: number, c: string, lw = 1) => { x.strokeStyle = c; x.lineWidth = lw; x.beginPath(); x.moveTo(v.sx(x0), v.y(h0)); x.lineTo(v.sx(x1), v.y(h1)); x.stroke(); };
  const shaft = style === 'glass' ? 'rgba(140,190,210,.12)' : style === 'passenger-old' ? '#24190f' : style === 'gold' ? '#141218' : C.dark;
  rect(x, v, -hw - 4, -4, w + 8, top + 4, shaft);
  const frame = style === 'passenger-old' ? '#b08a3c' : style === 'gold' ? '#c9a24a' : style === 'glass' ? '#7d8794' : style === 'broken' ? '#4a4c52' : C.edge;
  rect(x, v, -hw - 4, -4, 2, top + 4, frame); rect(x, v, hw + 2, -4, 2, top + 4, frame);
  rect(x, v, -hw - 4, top - 6, w + 8, 6, style === 'gold' ? '#8a6a2a' : C.mid);
  if (style === 'cage' || style === 'service') for (let h = 0; h < top - 30; h += 30) { line(-hw - 3, h, hw + 3, h + 30, C.mid); line(hw + 3, h, -hw - 3, h + 30, C.mid); }
  if (style === 'glass') for (let h = 0; h < top; h += 40) rect(x, v, -hw - 4, h, w + 8, 1, frame);
  if (style === 'service') for (let h = 4; h < top - 8; h += 8) rect(x, v, hw - 1, h, 4, 1, C.rail);
  if (style !== 'broken') { rect(x, v, -1, car + 46, 1, top - car - 46, C.rail); rect(x, v, 1, car + 46, 1, top - car - 46, C.rail); }
  if (style === 'service') {
    // an open platform: a deck, a guard rail at hip height, a hoist bar
    rect(x, v, -hw, car - 2, w, 3, C.face); rect(x, v, -hw, car + 1, w, 1, C.edge);
    rect(x, v, -hw, car + 1, 1, 22, C.rail); rect(x, v, hw - 1, car + 1, 1, 22, C.rail); rect(x, v, -hw, car + 22, w, 1, C.rail); rect(x, v, -hw, car + 44, w, 2, C.mid);
    return;
  }
  const inside = style === 'passenger-old' ? '#6e4a2a' : style === 'gold' ? '#c8b07a' : style === 'glass' ? 'rgba(200,230,245,.30)' : style === 'broken' ? '#3c3a36' : '#a89a7c';
  rect(x, v, -hw, car, w, 46, style === 'glass' ? 'rgba(120,170,190,.25)' : C.face);
  rect(x, v, -hw + 2, car + 2, w - 4, 42, inside);
  rect(x, v, -hw + 3, car + 40, w - 6, 3, style === 'broken' ? '#2a2826' : C.lamp);
  if (style === 'glass') { rect(x, v, -hw, car, 1, 46, frame); rect(x, v, hw - 1, car, 1, 46, frame); }
  if (style === 'cage' || style === 'passenger-old') {
    // a lattice gate folding back to the sides as it opens
    const gate = (w - 4) * (1 - open), c = style === 'cage' ? C.rail : '#c9a24a';
    for (let i = 0; i <= gate; i += 3) { line(-hw + 2 + i / 2, car + 2, -hw + 2 + i / 2 + 1.5, car + 42, c); line(hw - 2 - i / 2, car + 2, hw - 2 - i / 2 - 1.5, car + 42, c); }
    if (style === 'cage') for (let i = -hw; i <= hw; i += 4) rect(x, v, i, car + 44, 1, 2, C.rail);
  } else {
    const shut = style === 'broken' ? 0.6 : 1 - open, leaf = (w / 2 - 2) * shut;
    const door = style === 'gold' ? '#c9a24a' : style === 'glass' ? 'rgba(200,230,245,.40)' : style === 'broken' ? '#55575d' : C.edge;
    rect(x, v, -hw + 2, car + 2, leaf, 40, door); rect(x, v, hw - 2 - leaf, car + 2, leaf, 40, door);
    if (style === 'gold') { rect(x, v, -hw + 2 + leaf - 1, car + 2, 1, 40, '#8a6a2a'); rect(x, v, hw - 2 - leaf, car + 2, 1, 40, '#8a6a2a'); rect(x, v, -hw + 3, car + 30, Math.max(0, leaf - 2), 1, 'rgba(255,240,200,.5)'); }
  }
  rect(x, v, -hw, car + 46, w, 2, style === 'broken' ? '#2a2826' : C.rim);
  if (style === 'passenger-old') {
    // the floor dial over the doors: a brass arc and a needle following the car
    const k = height ? car / height : 0, a = Math.PI * (1 - k);
    rect(x, v, -6, car + 50, 12, 1, '#b08a3c');
    line(0, car + 50, 6 * Math.cos(a), car + 50 + 6 * Math.sin(a), '#e8d6a0');
  } else if (style === 'broken') {
    // out of order: dark lamp, warning tape across the doors
    for (let i = 0; i < 3; i++) { line(-hw, car + 10 + i * 12, hw, car + 18 + i * 12, '#d8c040', 2); line(-hw + 4, car + 10 + i * 12, hw - 4, car + 18 + i * 12, '#1a1a1a', 0.6); }
    rect(x, v, -3, car + 50, 6, 3, C.stop);
  } else rect(x, v, -3, car + 50, 6, 3, open > 0.5 ? C.go : C.lamp);
}

/** A call button beside a lift's doors on one floor: press E at the lift to call it; the button lights while the car is on its way here. */
export const liftButtonElement: Element = {
  type: 'level.lift-button', version: 1, label: 'Lift call button', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: { lift: text('Lift (its instance id)') },
  visualFields: { lit: num('Lit (called here)', 0, 0, 1, 1) },
  bounds: () => ({ x: -4, h: 20, w: 8, tall: 14 }),
  anchors: origin,
  draw: (x, v, _p, s) => {
    const lit = Number(s.lit ?? 0) > 0.5;
    rect(x, v, -3, 22, 6, 11, C.mid); rect(x, v, -3, 22, 6, 1, C.edge); rect(x, v, -3, 32, 6, 1, C.rim);
    rect(x, v, -1, 28, 2, 2, lit ? C.lamp : C.edge); rect(x, v, -1, 24, 2, 2, lit ? C.lamp : C.edge);
    if (lit) { x.fillStyle = 'rgba(255,214,138,.25)'; x.fillRect(v.sx(-5), v.y(35), Math.max(1, v.sx(5) - v.sx(-5)), Math.max(1, v.y(20) - v.y(35))); }
  },
};

/** Barrier looks: a ticket-hall turnstile, a barred sliding gate, a locked door with a card reader. */
export const BARRIER_STYLES = ['turnstile', 'gate', 'door'] as const;
/**
 * A barrier across a floor (origin: the middle of its passage, `width` wide): shut, it stops the player on either side
 * until its rule passes (engine/level.ts `levelPass`, world/access.ts `barrierAccess`: the exits' key and flag); E asks it.
 * Its rule is these fields: `key`, a keyring chip the player must carry; `flag`, a flag that must be set; `when`, an
 * optional gameplay condition (flags, items, tokens, the player, time, weather; world/access.ts `validateBarrierCondition`);
 * `refuse`, the words when it refuses. The composer's Access tab (authoring/barrier-authoring.ts) edits the rule with
 * typed pickers, so the Look section hides those three. It draws shut or open from `open` (0..1), which the level eases
 * once it has opened; it stays open.
 */
const hidden = () => false;
/** The shape only (null, or one plain condition object); its vocabulary is checked with the pending sources (world/access.ts). */
const barrierWhen = (v: unknown) => { if (v !== null && (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length !== 1)) throw new Error('level.barrier.when: null or one condition object'); };
export const barrierElement: Element = {
  type: 'level.barrier', version: 1, label: 'Barrier (turnstile, gate, locked door)', category: 'architecture', parts: ['backdrop'], libraryUse: 'reusable',
  fields: {
    style: { kind: 'select', label: 'Style', options: [...BARRIER_STYLES], default: 'turnstile' },
    width: num('Passage width', 24, 10, 200, 1, 'units'),
    key: { ...text('Opens for: key chip carried (keyring id; empty: none)'), showIf: hidden },
    flag: { ...text('Opens once: flag set (empty: none)'), showIf: hidden },
    when: { kind: 'json', label: 'Opens while: condition (null: always)', default: null, showIf: hidden, validate: barrierWhen },
    refuse: text('Refuses with', 'ACCESS DENIED.'),
  },
  visualFields: { open: num('Open', 0, 0, 1, 0.01) },
  bounds: p => ({ x: -Number(p.width) / 2 - 10, h: 0, w: Number(p.width) + 20, tall: 58 }),
  anchors: origin,
  draw: (x, v, p, s) => {
    const w = Number(p.width), hw = w / 2, open = Math.max(0, Math.min(1, Number(s.open ?? 0))), style = String(p.style ?? 'turnstile'), lamp = open > 0.5 ? C.go : C.stop;
    if (style === 'gate') {
      // two posts and a barred leaf that slides into the right post as it opens
      rect(x, v, -hw - 4, 0, 4, 48, C.mid); rect(x, v, hw, 0, 4, 48, C.mid);
      rect(x, v, -hw - 4, 46, 4, 2, C.edge); rect(x, v, hw, 46, 4, 2, C.edge);
      const leaf = w * (1 - open), left = hw - leaf;
      if (leaf > 0.5) {
        rect(x, v, left, 4, leaf, 2, C.rail); rect(x, v, left, 40, leaf, 2, C.rail); rect(x, v, left, 22, leaf, 1, C.edge);
        for (let i = left + 1; i < hw; i += 4) rect(x, v, i, 4, 1, 38, C.rail);
        rect(x, v, left, 41, leaf, 1, C.rim);
      }
      rect(x, v, hw + 1, 34, 2, 3, lamp);
      return;
    }
    if (style === 'door') {
      // a steel door in its frame, swinging away (its leaf narrows), a card reader beside it
      rect(x, v, -hw - 3, 0, 3, 52, C.edge); rect(x, v, hw, 0, 3, 52, C.edge); rect(x, v, -hw - 3, 49, w + 6, 3, C.edge);
      rect(x, v, -hw, 0, w, 49, C.dark);
      const leaf = w * (1 - open * 0.85);
      rect(x, v, -hw, 0, leaf, 49, '#4a4e57'); rect(x, v, -hw + 1, 0, Math.max(1, leaf - 2), 6, C.face);
      if (leaf > 6) rect(x, v, -hw + leaf - 4, 22, 2, 4, C.rail);
      rect(x, v, -hw, 49, leaf, 1, C.rim);
      rect(x, v, hw + 4, 24, 5, 8, C.mid); rect(x, v, hw + 5, 29, 3, 2, lamp);
      return;
    }
    // turnstile: a waist-high cabinet each side, the arm across the passage dropping as it opens, a lamp on top
    rect(x, v, -hw - 8, 0, 8, 34, C.mid); rect(x, v, hw, 0, 8, 34, C.mid);
    rect(x, v, -hw - 8, 32, 8, 2, C.edge); rect(x, v, hw, 32, 8, 2, C.edge);
    rect(x, v, -hw - 6, 26, 4, 3, C.face); rect(x, v, -hw - 5, 27, 2, 1, lamp);
    rect(x, v, hw + 2, 34, 4, 2, lamp);
    // the arm hinges on the left cabinet: level when shut, hanging down when open
    const a = open * Math.PI / 2, len = w - 1, hx = -hw, hh = 26;
    x.strokeStyle = C.rail; x.lineWidth = 2; x.beginPath(); x.moveTo(v.sx(hx), v.y(hh)); x.lineTo(v.sx(hx + len * Math.cos(a)), v.y(hh - Math.min(len, hh - 2) * Math.sin(a))); x.stroke();
    x.strokeStyle = C.rim; x.lineWidth = 1; x.beginPath(); x.moveTo(v.sx(hx), v.y(hh + 1)); x.lineTo(v.sx(hx + len * Math.cos(a)), v.y(hh + 1 - Math.min(len, hh - 2) * Math.sin(a))); x.stroke();
    rect(x, v, -hw - 1, hh - 2, 3, 4, C.edge);
  },
};

export const levelElements: Element[] = [floorElement, doorElement, shellElement, interiorElement, entranceElement, stairsElement, escalatorElement, elevatorElement, liftButtonElement, barrierElement];
