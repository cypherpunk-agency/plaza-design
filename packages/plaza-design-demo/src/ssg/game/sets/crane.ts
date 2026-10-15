/**
 * Set piece (ART-GUIDE §12): the ship-to-shore gantry crane, STS-1, STS-2 and STS-3. Legs with
 * hazard-banded feet on the rail, portal beams and cross-bracing, the A-frame with its stays, the
 * boom out over the water with its truss, the machinery house with the crane's name, red warning
 * lights. What hangs under it (trolley, cab, operator, spreader, load) belongs to the scene: the
 * harbor's and the stacks' cranes do different jobs. Register: sets/index.ts (`crane`).
 *
 * Drawn in its own frame: the caller translates to the crane's origin on the ground (`ref` in the
 * scene, see each `Gantry`); x to the right, heights up (y = -h).
 */

import { box, O, PAPER, RED, text } from '../scenes/kit';
import { YELLOW } from '../scenes/screens';

/** One crane's frame, in its own units (x from its origin, heights above the rail). */
export interface Gantry {
  name: string;
  /** Left edges of the near legs, their width and height. */
  legs: [number, number];
  legW: number;
  legH: number;
  /** The wheels under each foot: x from the leg's edge, width, height. */
  wheel: [number, number, number];
  /** Portal beams between the legs: [height of the top, thickness]. */
  beams: [number, number][];
  /** The cross-bracing between the legs, from and to (heights). */
  brace: [number, number];
  /** The A-frame's top (x, height); `cap`: a small block on it. A-frame line alpha. */
  apex: { x: number; h: number; cap: boolean; alpha: number };
  /** Stays from the apex down to the boom: [x on the boom, drop from the apex at the top]. Their alpha. */
  stays: [number, number][];
  stayAlpha: number;
  /**
   * The boom: from x0 to x1, the top chord's top `h` and thickness, the bottom chord's top and thickness;
   * the truss between them (from, to: heights), its pitch and alpha, and where the stays meet it (height).
   */
  boom: { x0: number; x1: number; h: number; top: number; low: number; lowT: number; truss: [number, number]; pitch: number; trussA: number; stayH: number };
  /** Bracing alpha. */
  braceA: number;
  /** The machinery house on the boom: left, width, top (height), and the name's height and size. */
  house: { x: number; w: number; h: number; nameH: number; size: number; nameA: number };
  /** Red lights: [x, height, size, phase offset]. */
  lights: [number, number, number, number][];
  /** A dimmer pair of legs behind (the far side of the portal), offset this far right; 0 for none. */
  far: number;
}

/** The harbor pier's two cranes (STS-1 by the call box, STS-3 at the far berth): origin at the crane's middle. */
const pier = (name: string): Gantry => ({
  name, legs: [-80, 74], legW: 6, legH: 232, wheel: [-6, 18, 8], beams: [[48, 6], [170, 8]], brace: [54, 162],
  apex: { x: -20, h: 320, cap: true, alpha: 0.5 }, stays: [[-226, 0], [-130, 4], [146, 0]], stayAlpha: 0.3,
  boom: { x0: -230, x1: 150, h: 206, top: 4, low: 194, lowT: 3, truss: [191, 203], pitch: 12, trussA: 0.4, stayH: 206 }, braceA: 0.35,
  house: { x: -40, w: 80, h: 232, nameH: 219, size: 8, nameA: 0.75 },
  lights: [[-21, 329, 3, 1], [-2, 238, 4, 0]], far: 0,
});

/**
 * Terminal 2's STS-2 (the stacks, P15): wider legs, the long boom out over berth 4. Origin at its
 * landside leg (the stacks' x 744); the boom runs from the backreach over the blocks to the quay's end.
 */
export const STS2: Gantry = {
  name: 'STS-2', legs: [0, 256], legW: 8, legH: 232, wheel: [-8, 24, 9], beams: [[176, 8]], brace: [60, 168],
  apex: { x: 126, h: 300, cap: false, alpha: 0.45 }, stays: [[-510, 0], [988, 0], [556, 4]], stayAlpha: 0.28,
  boom: { x0: -514, x1: 992, h: 212, top: 5, low: 200, lowT: 3, truss: [200, 210], pitch: 14, trussA: 0.35, stayH: 210 }, braceA: 0.3,
  house: { x: 76, w: 100, h: 258, nameH: 244, size: 9, nameA: 0.8 },
  lights: [[124, 306, 4, 0]], far: 18,
};

export const GANTRIES = { sts1: pier('STS-1'), sts2: STS2, sts3: pier('STS-3') };

const STEEL = '#21110a';

/**
 * Draw a crane's frame. `part`: 'back' (A-frame, stays, boom, house, lights, the far legs: behind
 * what stands on the quay), 'front' (the near legs, beams, bracing, feet), or 'all' (one crane on
 * its own, legs under the boom). `t` animates the warning lights (frames); `phase` keeps two cranes
 * out of step; `still`: lights steady.
 */
export function drawGantry(x: CanvasRenderingContext2D, g: Gantry, t: number, part: 'back' | 'front' | 'all' = 'all', phase = 0, still = false) {
  const y = (h: number) => -h, edge = 'rgba(' + O + ',.8)';
  const [a, b] = g.legs, w = g.legW, ap = g.apex.x, B = g.boom;
  const top = () => {
    x.strokeStyle = 'rgba(' + O + ',' + g.apex.alpha + ')'; x.lineWidth = 3; x.beginPath();
    x.moveTo(a + 3, y(g.legH)); x.lineTo(ap, y(g.apex.h)); x.lineTo(b + 3, y(g.legH)); x.stroke(); x.lineWidth = 1;
    x.strokeStyle = 'rgba(' + O + ',' + g.stayAlpha + ')'; x.beginPath();
    for (const [sx, drop] of g.stays) { x.moveTo(ap, y(g.apex.h - drop)); x.lineTo(sx, y(B.stayH)); }
    x.stroke();
    if (g.apex.cap) box(x, ap - 6, y(g.apex.h + 6), 12, 6, STEEL, edge);
  };
  const boom = () => {
    box(x, B.x0, y(B.h), B.x1 - B.x0, B.top, STEEL, edge); box(x, B.x0, y(B.low), B.x1 - B.x0, B.lowT, STEEL, edge);
    x.strokeStyle = 'rgba(' + O + ',' + B.trussA + ')'; x.beginPath();
    for (let i = B.x0; i < B.x1 - B.pitch + 2; i += B.pitch) { x.moveTo(i, y(B.truss[0])); x.lineTo(i + B.pitch, y(B.truss[1])); }
    x.stroke();
    const H = g.house;
    box(x, H.x, y(H.h), H.w, 26, '#1a0e08', edge);
    text(x, g.name, H.x + H.w / 2, y(H.nameH), 'rgba(' + PAPER + ',' + H.nameA + ')', H.size, '600');
    for (const [lx, lh, s, ph] of g.lights) {
      x.fillStyle = still || Math.sin(t * 0.04 + phase + ph) > 0 ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.25)'; x.fillRect(lx, y(lh), s, s);
    }
  };
  const legs = () => {
    for (const lx of [a, b]) box(x, lx, y(g.legH), w, g.legH, STEEL, edge);
    for (const [h, th] of g.beams) box(x, a, y(h), b - a + w, th, STEEL, edge);
    x.strokeStyle = 'rgba(' + O + ',' + g.braceA + ')'; x.beginPath();
    x.moveTo(a + w, y(g.brace[0])); x.lineTo(b, y(g.brace[1])); x.moveTo(b, y(g.brace[0])); x.lineTo(a + w, y(g.brace[1])); x.stroke();
    // yellow-and-black hazard bands on the feet, and the wheels on the rail
    for (const lx of [a, b]) {
      for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? 'rgba(20,12,6,1)' : 'rgba(' + YELLOW + ',.6)'; x.fillRect(lx, y(30 - k * 6), w, 6); }
      box(x, lx + g.wheel[0], y(g.wheel[2]), g.wheel[1], g.wheel[2], '#2a160a', edge);
    }
  };
  if (part === 'front') { legs(); return; }
  top();
  if (part === 'all') { legs(); boom(); return; }
  boom();
  if (g.far) for (const lx of [a + g.far, b + g.far]) box(x, lx, y(g.legH), 5, g.legH, '#140a06', 'rgba(' + O + ',.35)');
}
