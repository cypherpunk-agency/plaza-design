/**
 * Set piece (ART-GUIDE §12): the ship-to-shore gantry crane, STS-1, STS-2 and STS-3. Painted steel
 * (a lit top edge, a shadowed underside, an orange rim): legs with hazard-banded feet on the rail,
 * portal beams and cross-bracing, the A-frame with its stays, the boom with a Warren truss, the
 * machinery house with the crane's name and a lit window, red warning lights. The boom works two
 * ways (`boomUp`): down, out over the water (a working crane), or raised near vertical about its
 * hinge (an idle crane: the harbor skyline, and raised booms never cross each other). What hangs
 * under it (trolley, cab, operator, spreader, load) belongs to the scene: the harbor's and the
 * stacks' cranes do different jobs. Register: sets/index.ts (`crane`).
 *
 * Drawn in its own frame: the caller translates to the crane's origin on the ground (`ref` in the
 * scene, see each `Gantry`); x to the right, heights up (y = -h).
 */

import { O, PAPER, RED, text } from '../scenes/kit';
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
  /** Which way the boom's outreach (the part over the water) runs from the hinge: -1 left (default), 1 right. */
  out?: -1 | 1;
}

/** The harbor pier's two cranes (STS-1 by the call box, STS-3 at the far berth): origin at the crane's middle. */
const pier = (name: string): Gantry => ({
  name, legs: [-80, 74], legW: 6, legH: 232, wheel: [-6, 18, 8], beams: [[48, 6], [170, 8]], brace: [54, 162],
  apex: { x: -20, h: 320, cap: true, alpha: 0.5 }, stays: [[-226, 0], [-130, 4], [146, 0]], stayAlpha: 0.3,
  boom: { x0: -230, x1: 150, h: 206, top: 4, low: 194, lowT: 3, truss: [191, 203], pitch: 12, trussA: 0.4, stayH: 206 }, braceA: 0.35,
  house: { x: -40, w: 80, h: 232, nameH: 219, size: 8, nameA: 0.75 },
  lights: [[-21, 329, 3, 1], [-2, 238, 4, 0]], far: 0, out: -1,
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
  lights: [[124, 306, 4, 0]], far: 18, out: 1,
};

export const GANTRIES = { sts1: pier('STS-1'), sts2: STS2, sts3: pier('STS-3') };

/** How a crane is painted and posed (all optional: the harbor's and the stacks' night look). */
export interface GantryLook {
  /** The steel's paint (#rrggbb). Night scenes: a dark rust red; the dawn glide: lit crane orange. */
  paint?: string;
  /** The rim's alpha (orange outline) and the lit top edge's alpha. */
  rim?: number;
  lit?: number;
  /** The outreach raised about its hinge: 0 down (working) .. 1 near vertical (idle, about 78°). */
  boomUp?: number;
}

const HOUSE = '#1a0e08';
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const shade = (c: string, f: number) => 'rgb(' + hex(c).map((v) => Math.round(Math.min(255, v * f))).join(',') + ')';

/** Where the boom's outreach is hinged (at the waterside leg) and which way it runs. */
export function boomHinge(g: Gantry) {
  const out = g.out ?? -1;
  return { out, x: out < 0 ? g.legs[0] : g.legs[1] + g.legW };
}

/**
 * Draw a crane's frame. `part`: 'back' (A-frame, stays, boom, house, lights, the far legs: behind
 * what stands on the quay), 'front' (the near legs, beams, bracing, feet), or 'all' (one crane on
 * its own, legs under the boom). `t` animates the warning lights (frames); `phase` keeps two cranes
 * out of step; `still`: lights steady. `look`: paint and the boom's pose.
 */
export function drawGantry(x: CanvasRenderingContext2D, g: Gantry, t: number, part: 'back' | 'front' | 'all' = 'all', phase = 0, still = false, look: GantryLook = {}) {
  const y = (h: number) => -h, rimA = look.rim ?? 0.8, litA = look.lit ?? 0.35;
  const paint = look.paint ?? '#4a1c0c', under = shade(paint, 0.55), edge = 'rgba(' + O + ',' + rimA + ')', lit = 'rgba(255,190,120,' + litA + ')';
  const [a, b] = g.legs, w = g.legW, ap = g.apex.x, B = g.boom;
  const { out, x: hx } = boomHinge(g);
  const ang = Math.max(0, Math.min(1, look.boomUp ?? 0)) * 1.36;
  /** A painted member: fill, the lit top edge, the shadowed underside, the rim. */
  const member = (sx: number, top: number, mw: number, mh: number) => {
    x.fillStyle = paint; x.fillRect(sx, top, mw, mh);
    if (mh > 3) { x.fillStyle = under; x.fillRect(sx, top + mh - Math.max(1, Math.round(mh * 0.3)), mw, Math.max(1, Math.round(mh * 0.3))); }
    x.fillStyle = lit; x.fillRect(sx, top, mw, 1);
    x.strokeStyle = edge; x.lineWidth = 1; x.strokeRect(sx + 0.5, top + 0.5, mw - 1, mh - 1);
  };
  /** A straight painted strut between two points (heights up). */
  const strut = (x0: number, h0: number, x1: number, h1: number, th: number) => {
    x.strokeStyle = paint; x.lineWidth = th; x.beginPath(); x.moveTo(x0, y(h0)); x.lineTo(x1, y(h1)); x.stroke();
    x.strokeStyle = edge; x.lineWidth = 1; x.beginPath(); x.moveTo(x0, y(h0) - th / 2); x.lineTo(x1, y(h1) - th / 2); x.stroke();
  };
  /** A stretch of boom from u0 to u1 (local x), its top chord's top at 0 (heights below it are negative). */
  const boomRun = (u0: number, u1: number) => {
    const lowTop = B.h - B.low, span = u1 - u0;
    member(u0, 0, span, B.top); member(u0, lowTop, span, B.lowT);
    x.strokeStyle = 'rgba(' + O + ',' + B.trussA + ')'; x.lineWidth = 1; x.beginPath();
    const t0 = B.h - B.truss[1], t1 = B.h - B.truss[0];
    for (let i = u0, k = 0; i < u1 - 1; i += B.pitch, k++) {
      const j = Math.min(u1, i + B.pitch);
      // Warren truss: diagonals alternating, a vertical every other bay
      if (k % 2) { x.moveTo(i, t0); x.lineTo(j, t1); } else { x.moveTo(i, t1); x.lineTo(j, t0); }
      if (k % 2 === 0) { x.moveTo(i + 0.5, t0); x.lineTo(i + 0.5, t1); }
    }
    x.stroke();
  };
  /** Where a point on the boom (x, height) is once the outreach is raised. */
  const raised = (px: number, ph: number): [number, number] => {
    if (ang === 0 || (px - hx) * out <= 0) return [px, ph];
    const d = Math.abs(px - hx);
    return [hx + out * d * Math.cos(ang), B.h - (B.h - ph) + d * Math.sin(ang)];
  };
  const top = () => {
    // the A-frame: two painted struts from the leg tops to the apex, its stays down to the boom
    strut(a + 3, g.legH, ap, g.apex.h, 4); strut(b + 3, g.legH, ap, g.apex.h, 4);
    x.strokeStyle = 'rgba(' + PAPER + ',' + g.stayAlpha + ')'; x.lineWidth = 1; x.beginPath();
    for (const [sx, drop] of g.stays) { const [px, ph] = raised(sx, B.stayH); x.moveTo(ap, y(g.apex.h - drop)); x.lineTo(px, y(ph)); }
    x.stroke();
    if (g.apex.cap) member(ap - 6, y(g.apex.h + 6), 12, 6);
  };
  const boom = () => {
    // the backreach (and the whole boom, when down) lies flat; the outreach turns up about the hinge
    const inner: [number, number] = out < 0 ? [hx, B.x1] : [B.x0, hx];
    const outer: [number, number] = out < 0 ? [B.x0, hx] : [hx, B.x1];
    x.save(); x.translate(0, y(B.h)); boomRun(inner[0], inner[1]); x.restore();
    x.save(); x.translate(hx, y(B.h)); x.rotate(out < 0 ? ang : -ang); x.translate(-hx, 0);
    boomRun(outer[0], outer[1]);
    // the boom tip: the sheave head, and its light
    const tipX = out < 0 ? outer[0] : outer[1] - 6;
    member(tipX, -2, 6, B.h - B.low + B.lowT + 4);
    x.restore();
    // the hinge pin
    x.fillStyle = 'rgba(' + PAPER + ',.5)'; x.fillRect(hx - 1, y(B.h - 3), 3, 3);
    const H = g.house;
    member(H.x, y(H.h), H.w, 26); x.fillStyle = HOUSE; x.fillRect(H.x + 2, y(H.h) + 2, H.w - 4, 22);
    x.strokeStyle = edge; x.strokeRect(H.x + 0.5, y(H.h) + 0.5, H.w - 1, 25);
    // its lit window, and the name on its side
    x.fillStyle = 'rgba(255,200,130,.35)'; x.fillRect(H.x + H.w - 16, y(H.h) + 5, 10, 6);
    text(x, g.name, H.x + H.w / 2 - 6, y(H.nameH), 'rgba(' + PAPER + ',' + H.nameA + ')', H.size, '600');
    for (const [lx, lh, s, ph] of g.lights) {
      x.fillStyle = still || Math.sin(t * 0.04 + phase + ph) > 0 ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.25)'; x.fillRect(lx, y(lh), s, s);
    }
    // a red light on the boom's tip, wherever it points
    const [tx, th] = raised(out < 0 ? B.x0 + 2 : B.x1 - 4, B.h + 4);
    x.fillStyle = still || Math.sin(t * 0.04 + phase + 2) > 0 ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.25)'; x.fillRect(Math.round(tx), Math.round(y(th)), 3, 3);
  };
  const legs = () => {
    for (const lx of [a, b]) {
      member(lx, y(g.legH), w, g.legH);
      // a ladder up the inside of the leg
      x.fillStyle = 'rgba(' + PAPER + ',.12)'; for (let h = 40; h < g.legH - 10; h += 6) x.fillRect(lx + 1, y(h), w - 2, 1);
    }
    for (const [h, th] of g.beams) member(a, y(h), b - a + w, th);
    x.strokeStyle = 'rgba(' + O + ',' + g.braceA + ')'; x.lineWidth = 2; x.beginPath();
    x.moveTo(a + w, y(g.brace[0])); x.lineTo(b, y(g.brace[1])); x.moveTo(b, y(g.brace[0])); x.lineTo(a + w, y(g.brace[1])); x.stroke(); x.lineWidth = 1;
    // yellow-and-black hazard bands on the feet, the sill beam, the wheels on the rail
    for (const lx of [a, b]) {
      for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? 'rgba(20,12,6,1)' : 'rgba(' + YELLOW + ',.7)'; x.fillRect(lx, y(30 - k * 6), w, 6); }
      const [wx, ww, wh] = g.wheel;
      x.fillStyle = '#1e1008'; x.fillRect(lx + wx, y(wh), ww, wh);
      x.strokeStyle = edge; x.strokeRect(lx + wx + 0.5, y(wh) + 0.5, ww - 1, wh - 1);
      x.fillStyle = 'rgba(' + PAPER + ',.35)'; for (let k = 3; k < ww - 2; k += 6) x.fillRect(lx + wx + k, y(3), 2, 2);
    }
  };
  if (part === 'front') { legs(); return; }
  top();
  if (part === 'all') { legs(); boom(); return; }
  boom();
  if (g.far) for (const lx of [a + g.far, b + g.far]) { x.fillStyle = shade(paint, 0.45); x.fillRect(lx, y(g.legH), 5, g.legH); x.fillStyle = 'rgba(' + O + ',.3)'; x.fillRect(lx, y(g.legH), 1, g.legH); }
}
