import type{Light}from'../../../world/light';
import type{OpeningActors}from'./poses';
/**
 * Since 2026-10-22 (Tommi: the beach in the west, the harbor in the east) the title looks at the
 * beach mirrored west of Downtown (path.ts `WEST`), and the glide runs east from it, as the sun sets,
 * to the raised Harbor Station (finale.ts); camera, clock and train are timeline tracks
 * (story/title/timeline.json). The light comes from the frame's `Light`. The description below is
 * the original westward layout, which the near coast still uses for its own positions.
 *
 * The opening's picture (ROADMAP "The opening", storyboard frames 1–5): one shot from the title to
 * the tunnel, no cut. The title is the bar at the edge of the sea: a dawn over a glassy sea (the
 * mirror and the pixel swell, sets/sea.ts), SALT with its string lights, the DJ bot and people
 * dancing, a bonfire, parasols and loungers, palms of every height. NEW GAME: the camera glides west
 * along ONE continuous coast, slowly (second pass, Tommi 2026-10-15: more space, calmer, "easy, but
 * also kind of stressful"):
 *
 * the beach and its pier → rocks, the INLET with its footbridge and the breakwater's light → the
 * port's fenced BUFFER and its staff gate → the harbor (cranes well apart, STS-2 working, the ship
 * behind the quay, the logistics hub and its drone stream) → the truck gate, where the road begins
 * → the BAY BRIDGE, quiet, the camera easing off for the Spire across the water with its shuttles,
 * its patrol and its halo → the Galleria → Downtown under THE RING, LINE 0 on its viaduct, the
 * skyline thickening behind → the train out of its tower, down its ramp, under the street; the
 * camera drops after it into the ground (a cutaway: the pipes, the lit bore, the train), down to a
 * glimpse of the Undercity's canal; the dark; the handover (title/index.ts).
 *
 * Where everything is and how the camera moves: path.ts. The coast to the plaza: coast.ts. Downtown:
 * town.ts. The road's traffic: traffic.ts. The sky's: air.ts. LINE 0 and the cutaway: finale.ts.
 * Every recurring thing is a set piece (sets/).
 *
 * Geometry: the picture is drawn in view units `D` (about 195 tall), snapped so a unit is a whole
 * number of device pixels. The camera's distance west is `g`; a thing at depth `p` (1: the near
 * coast) and position `X` (west of the start) is at screen x = W/2 + p·(g − X). The near coast draws
 * the scenes' sets at a third of their size (`S`): the player is 16 view units there, and everything
 * is true to that one scale. The drop at the end lifts each depth by `p · drop`.
 */

import { drawSea } from "../../environment/sea";
import { drawSpire } from "../../architecture/spire";
import { placed } from "../../core/view";
import { drawAir, drawAirNear } from "./air";
import { type CoastView, drawBreakwater, coastPieces, coastFrontPieces, coastMiddlePieces, drawForeground, lines } from "./coast";
import { drawLine0, drawUnder } from "./finale";
import { DROP1, DROP2, GLIDE, GLIDE_BEATS, glideDist, PLACES, SPIRE_P, SPIRE_X, WEST } from "./path";
import { drawRingOver, drawSkyline, drawStreetGround, townPieces, townLampPieces, townPeoplePieces } from "./town";
import { drawTraffic } from "./traffic";
import { readableMirror } from "./mirror";
import type { PieceInputs } from './piece-inputs';

export { GLIDE, GLIDE_BEATS, glideDist };

/** Seconds of the title's settle before the menu (story/title/timeline.json owns the real duration). */
export const RISE = 7;

const PAPER = '255,217,165', RED = '255,42,68';
const smooth = (a: number, b: number, v: number) => { const f = Math.max(0, Math.min(1, (v - a) / (b - a))); return f * f * (3 - 2 * f); };
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const rng = (seed: number) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
/** Two #rrggbb colours mixed, as #rrggbb (so a mix can be mixed again). */
const mixHex = (a: string, b: string, f: number) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], f)).toString(16).padStart(2, '0')).join(''); };

/**
 * The sun and the sky follow the frame's Light (the city clock's `lightAt`; the timeline drives the
 * clock, story/title/timeline.json): `depth` is where the sun's middle sits below the horizon, in sun
 * radii (negative: above it), from its height `el`; it is half up at the horizon (el 0) and gone a
 * little after sunset.
 */
const sunDepth = (el: number) => el >= 0 ? 0.1 - el * 5.2 : 0.1 - el * 12;
/** The sky's mood from the light: `low` the golden hour, `lit` 1 while there is daylight in the sky, 0 at night. */
const skyMood = (l: Light) => ({ low: l.sun.el > 0 ? l.low : 1, lit: smooth(-0.18, -0.01, l.sun.el) });

/**
 * Downtown, by where the camera is (the glide runs east from the west beach): the sky turns the
 * city's over the street and back as the bay opens past the Galleria; the rain falls on the street.
 */
const cityAt = (g: number) => smooth(WEST.junction + 120, WEST.junction - 320, g) * (1 - smooth(3400, 2820, g));
const rainAt = (g: number) => smooth(WEST.junction - 80, WEST.junction - 480, g) * (1 - smooth(3800, 3300, g));

// ---------- the far layers (laid out once) ----------

/** Boats far out on the sea: X (at depth 0.2), length, a mast or a stack. Never off the harbor (`boats` keeps them clear of the quay). */
const BOATS: [number, number, number][] = [[-160, 22, 0], [-40, 12, 1], [300, 14, 1], [700, 34, 0], [1000, 18, 1], [2650, 26, 0], [3050, 16, 1]];
/** The far shore across the bay: low city along the horizon (X at depth 0.12, height, width), taller toward Downtown. */
const FAR = (() => { const r = rng(17), out: [number, number, number, number][] = []; for (let X = 1850; X < 6200; X += 40 + r() * 90) out.push([X, 3 + r() * 7 + Math.max(0, X - 2900) * 0.005, 4 + r() * 12, r()]); return out; })();
const CLOUDS = (() => { const r = rng(5); return Array.from({ length: 9 }, () => [r() * 2, 0.12 + r() * 0.4, 30 + r() * 70]); })();
const STARS = (() => { const r = rng(11); return Array.from({ length: 60 }, () => [r(), r() * 0.45, 0.25 + r() * 0.5, r() * 6]); })();
const DROPS = (() => { const r = rng(23); return Array.from({ length: 240 }, () => [r(), r(), 0.5 + r() * 0.5]); })();

export interface GlideView { W: number; H: number; reduced:boolean;lighting:Light }

/**
 * Draw the shot. `t`: seconds since the title came up (the sun rises until RISE, the water moves);
 * `tau`: seconds into the glide, or null on the title (the camera idles). A pure function of the
 * two: any (t, tau) draws the same frame (sudo's time control seeks on it).
 */
/** `train`: where LINE 0's eastbound train's nose is (X), arriving at the Harbor Station; none if absent or negative. */
export interface OpeningCamera { x?: number; h?: number; dark?: number; train?: number; pieces?:PieceInputs;actors?:OpeningActors }
export interface OpeningPiece { id: string; space: 'base' | 'near'; draw(): void }

/** Build exact native drawing jobs without painting or advancing gameplay. */
export function openingFrame(x: CanvasRenderingContext2D, v: GlideView, t: number, tau: number | null, camera: OpeningCamera = {}) {
  const k = Math.abs(x.getTransform().a) || 1, raw = Math.min(v.H / 195, v.W / 420);
  const scale = Math.max(1, Math.round(raw * k)) / k;
  return { ...frame(x, v.W / scale, v.H / scale, v.reduced, t, tau, camera,v.lighting), scale };
}

/** Keep one native context across consecutive near-coast pieces. */
export function paintOpeningPieces(x: CanvasRenderingContext2D, parts: OpeningPiece[], drop: number) {
  let near = false;
  for (const part of parts) {
    if ((part.space === 'near') !== near) { if (near) x.restore(); else { x.save(); x.translate(0, Math.round(-drop)); } near = part.space === 'near'; }
    part.draw();
  }
  if (near) x.restore();
}

export function drawGlide(x: CanvasRenderingContext2D, v: GlideView, t: number, tau:number|null,actors:OpeningActors) {
  const f=openingFrame(x,v,t,tau,{actors});
  x.save(); x.scale(f.scale, f.scale); paintOpeningPieces(x, f.parts, f.drop); x.restore();
}

function frame(x: CanvasRenderingContext2D, W: number, H: number, still: boolean, t: number, tau: number | null, options: OpeningCamera,lighting:Light) {
  const parts: OpeningPiece[] = [];
  let space: 'base' | 'near' = 'base';
  const paint = (id: string, draw: () => void) => parts.push({ id, space, draw });
  const gt = tau ?? 0, f = still ? 0 : t * 60;
  // the camera: a gentle idle on the title, fading out as the glide takes over (no jump)
  const idle = still ? 0 : Math.sin(t * 0.25) * 5 * (1 - smooth(0, 3, gt));
  const g = (options.x ?? glideDist(gt)) - idle;
  const hz = Math.round(H * 0.56), GY = Math.round(H * 0.82);
  const city = cityAt(g), under = smooth(DROP1[0], DROP1[1], gt);
  const rain = rainAt(g) * (1 - under);
  const mood = skyMood(lighting), el = lighting.sun.el, depth = sunDepth(el);
  // the coast's warmth (its tints): full while the sun is up or just down, cooling into the dusk
  const warm = lerp(0.35, 1, smooth(-0.17, 0, el)), up = smooth(-0.12, 0.02, el);
  const sx = (X: number, p: number) => W / 2 + p * (g - X);
  // the far city (the skyline rows, the far shore) stands only behind the city: none behind the west beach
  // (cut where Downtown's westmost street tower ends, so a near tower hides the edge)
  const behindCity = (draw: () => void) => { const edge = W / 2 + g - (WEST.junction - 60); if (edge < -40) { draw(); return; } if (edge > W) return; x.save(); x.beginPath(); x.rect(edge, -4000, W - edge + 400, H + 8000); x.clip(); draw(); x.restore(); };
  // the drop after the train: first to LINE 0's bore, then on down to the canal (finale.ts's section, in view units under the street's edge)
  const cv0: CoastView = {lighting,actors:options.actors??{}, W, H, GY, hz, g, f, t, gt, still, warm, city, rain, sx: (X) => sx(X, 1), sunX: 0, ...(options.train !== undefined && options.train >= 0 ? { train: options.train } : {}) };
  const L = lines(cv0), top0 = L.ROAD1 + Math.round(5 * L.k);
  // the bore's middle 112 view units under the street's edge, the canal's waterline 310
  const drop1 = Math.max(0, top0 + 112 - H * 0.42), drop2 = Math.max(drop1, top0 + 310 - H * 0.62);
  const drop = options.h ?? (drop1 * smooth(DROP1[0], DROP1[1], gt) + (drop2 - drop1) * smooth(DROP2[0], DROP2[1], gt));
  const lift = (p: number) => -drop * p;

  // the sun stands over the west sea: it drifts a little as the camera runs east, and stays in view
  const R = Math.round(H * 0.15), sunX = W / 2 + 18 + 0.03 * (g - WEST.beach) + idle * 0.03, sunY = hz + lift(0.02) + R * depth;
  const spX = sx(SPIRE_X, SPIRE_P), spBase = hz + 2 + lift(SPIRE_P), spS = (H * 0.62) / 300;
  const seaTop = hz + lift(0.1), seaBot = GY + lift(1);
  const cv: CoastView = { ...cv0, sunX };
  const skyTop = hz + lift(0.1);
  paint('sky', () => {
  // ---------- sky, stars, clouds ----------
  // each stop: the late afternoon's, the golden hour's (low sun), the night's, Downtown's; mixed by the light
  const sk = x.createLinearGradient(0, 0, 0, Math.max(1, skyTop));
  const stop = (at: number, night: string, gold: string, town: string, day: string) => sk.addColorStop(at, mixHex(mixHex(night, mixHex(day, gold, mood.low), mood.lit), town, city));
  stop(0, '#05040e', '#140a2a', '#120a20', '#161a40');
  stop(0.38, '#0b0820', '#3a1250', '#2c1240', '#2c2c66');
  stop(0.68, '#1a0f34', '#a3266a', '#7a2a50', '#5c4a88');
  stop(0.9, '#3a1846', '#ff7a3c', '#c8583c', '#b87a98');
  stop(1, '#5a2240', '#ffb04a', '#e08a48', '#e8aa88');
  x.fillStyle = sk; x.fillRect(0, 0, W, skyTop + 1);
  const starK = 1.9 * lighting.night * (1 - city * 0.7);
  for (const [sxr, syr, a, ph] of STARS) {
    const tw = still ? 1 : 0.6 + 0.4 * Math.sin(t * 1.3 + ph);
    x.fillStyle = 'rgba(' + PAPER + ',' + Math.min(1, a * tw * starK * (1 - syr * 1.6)).toFixed(2) + ')'; x.fillRect(Math.round(sxr * W), Math.round(syr * hz), 1, 1);
  }
  for (const [cx, cy, cw] of CLOUDS) {
    const px = ((cx * W * 1.4 + 0.03 * g + (still ? 0 : t * 1.2)) % (W * 1.6)) - W * 0.3, py = Math.round(hz * cy);
    x.fillStyle = 'rgba(255,150,120,' + ((0.18 + (cy * 0.4)) * lerp(0.25, 1, warm) * (1 - city * 0.3)).toFixed(3) + ')'; x.fillRect(Math.round(px), py, Math.round(cw), 1);
    x.fillStyle = 'rgba(40,10,50,.35)'; x.fillRect(Math.round(px + 6), py + 1, Math.round(cw * 0.7), 1);
  }

  });
  paint('sun', () => {
  // ---------- the sun, low and slatted, and its glow ----------
  const glow = x.createRadialGradient(sunX, sunY, R * 0.5, sunX, sunY, R * 3.3);
  glow.addColorStop(0, 'rgba(255,170,90,' + (0.4 * (1 - city * 0.5) * lerp(0.15, 1, up)).toFixed(3) + ')'); glow.addColorStop(1, 'rgba(255,120,80,0)');
  x.fillStyle = glow; x.fillRect(0, 0, W, Math.max(0, skyTop));
  x.save();
  x.beginPath(); x.rect(0, 0, W, Math.max(0, skyTop)); x.clip();
  x.beginPath();
  x.rect(sunX - R, sunY - R, R * 2, R * 0.55);
  for (let i = 0, yy = sunY - R * 0.45; yy < sunY + R; i++) { const bar = Math.max(1.5, R * (0.14 - i * 0.016)); x.rect(sunX - R, yy, R * 2, bar); yy += bar + Math.max(1, R * 0.035 + i * R * 0.014); }
  x.clip();
  const sg = x.createLinearGradient(0, sunY - R, 0, sunY + R * 0.2);
  sg.addColorStop(0, '#ffe36a'); sg.addColorStop(0.55, '#ffa23a'); sg.addColorStop(1, '#ff5a7a');
  x.fillStyle = sg; x.beginPath(); x.arc(sunX, sunY, R, 0, Math.PI * 2); x.fill();
  x.restore();

  });
  paint('far-shore', () => behindCity(() => {
  // ---------- the far shore, the Spire in the bay ----------
  for (const [X, h, w, r] of FAR) {
    const s = sx(X, 0.12), base = hz + lift(0.12);
    if (s + w < 0 || s > W) continue;
    x.fillStyle = mixHex('#140a1e', '#3a1640', warm * (1 - city * 0.4)); x.fillRect(Math.round(s - w), Math.round(base - h), Math.round(w), Math.round(h) + 1);
    if (r > 0.55) { x.fillStyle = 'rgba(255,160,90,.4)'; x.fillRect(Math.round(s - w + 2), Math.round(base - h + 2), 1, 1); }
  }
  }));
  paint('spire', () => {
  // the Spire: the monolith in the bay, nameless, bigger than before and given room: its decks, the
  // shuttles docking and leaving, the Registry's patrol on its loop, the halo, one red light (sets/spire.ts)
  if (spX > -90 && spX < W + 90) placed(x, Math.round(spX), Math.round(spBase), spS, () => drawSpire(x, { t: f, fill: mixHex('#08040c', '#1a0c26', warm), edge: 0.22, windows: 1, still, glow: true, traffic: true, scale: spS }));

  });
  paint('sea', () => {
  // ---------- the sea ----------
  const refl = smooth(0, 0.45, 1 - depth) * (1 - city * 0.8);
  drawSea(x, { W, top: seaTop, bottom: Math.max(seaTop + 4, seaBot + 2), sunX, sunR: R, refl, t: f, still, warm, haze: city * 0.6, shift: -g * 0.4 });
  // the Spire's light and its dark shape lying on the water
  if (spX > -60 && spX < W + 60) {
    x.fillStyle = 'rgba(8,3,14,.35)'; x.fillRect(Math.round(spX - 16 * spS * 2), seaTop + 1, Math.round(64 * spS * 2), Math.round((seaBot - seaTop) * 0.45));
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(' + RED + ',' + (0.12 * (1 - i / 6)).toFixed(3) + ')'; x.fillRect(Math.round(spX - 2 + (still ? 0 : Math.sin(t * 2 + i) * 1.5)), seaTop + 2 + i * 3, 3, 1); }
  }
  });
  // boats far out, kept clear of the harbor: none of them ever sits in front of a crane or the quay
  const boats = (gg: number) => {
  const sxg = (X: number, p: number) => W / 2 + p * (gg - X);
  const qa = sxg(PLACES.quay[1] + 80, 1), qb = sxg(PLACES.quay[0] - 40, 1);
  for (const [X, len, mast] of BOATS) {
    const s = sxg(X, 0.2), by = seaTop + 3;
    if (s < -len || s > W + len) continue;
    const clear = Math.min(1, Math.max(0, (qa - (s + len)) / 30, (s - qb) / 30));
    if (clear <= 0) continue;
    const bob = still ? 0 : Math.round(Math.sin(t * 1.4 + X) * 0.6);
    x.save(); x.globalAlpha = clear;
    x.fillStyle = '#12061a'; x.fillRect(Math.round(s), by + bob, len, 2); x.fillRect(Math.round(s) + 2, by + 2 + bob, len - 4, 1);
    if (mast) { x.fillRect(Math.round(s + len / 2), by - 12 + bob, 1, 12); x.beginPath(); x.moveTo(s + len / 2 + 1, by - 11 + bob); x.lineTo(s + len / 2 + 7, by - 1 + bob); x.lineTo(s + len / 2 + 1, by - 1 + bob); x.fill(); }
    else { x.fillRect(Math.round(s + 3), by - 3 + bob, 6, 3); x.fillStyle = 'rgba(255,217,165,.5)'; x.fillRect(Math.round(s + 4), by - 2 + bob, 1, 1); }
    x.restore();
  }
  };
  // ---------- the west beach: the native beach, mirrored, west of Downtown (path.ts WEST) ----------
  // Its pieces are the same pieces drawn a second time with the camera mirrored (g' = beach − g) and
  // the canvas flipped about the view's middle, so a beach point Xb stands at WEST.beach − Xb; text is
  // turned back so signs still read. The city's pieces keep east of the junction, the beach's west.
  const gw = WEST.beach - g, xj = W / 2 + g - WEST.junction;
  const westOn = xj > -60, cityAll = xj < -60;
  const xm = readableMirror(x);
  const cvw: CoastView = { ...cv, g: gw, sx: (X) => W / 2 + (gw - X), sunX: W - sunX };
  const mirrored = (draw: () => void, clip = true) => { if (!westOn) return; x.save(); if (clip) { x.beginPath(); x.rect(-400, -4000, xj + 400, H + 8000); x.clip(); } x.translate(W, 0); x.scale(-1, 1); draw(); x.restore(); };
  const east = (draw: () => void) => { if (cityAll) { draw(); return; } if (xj > W + 400) return; x.save(); x.beginPath(); x.rect(xj, -4000, W - xj + 400, H + 8000); x.clip(); draw(); x.restore(); };
  paint('boats', () => { boats(g); mirrored(() => boats(gw), false); });
  // ---------- the near coast, from the beach to the tunnel ----------
  paint('breakwater', () => { drawBreakwater(x, cv, seaTop, seaBot); mirrored(() => drawBreakwater(xm, cvw, seaTop, seaBot), false); });
  // Downtown's skyline rows behind the street (thicker toward the end), the sky's traffic in front of them
  paint('skyline', () => behindCity(() => drawSkyline(x, cv, lift)));
  paint('air', () => drawAir(x, cv, lift));
  space = 'near';
  // a coast piece draws twice: in the city (east of the junction) and on the west beach (mirrored)
  const both = (prefix: string, city: { id: string; draw(): void }[], west: { id: string; draw(): void }[]) => {
    const w = new Map(west.map(p => [p.id, p]));
    for (const part of city) paint(prefix + part.id, () => { east(part.draw); const m = w.get(part.id); if (m) mirrored(m.draw); });
  };
  const cityOnly = (id: string, draw: () => void) => paint(id, () => east(draw));
  both('coast.', coastPieces(x, cv, (Lc) => drawStreetGround(x, cv, Lc), options.pieces), coastPieces(xm, cvw, undefined, options.pieces));
  for (const part of townPieces(x, cv, L, options.pieces)) cityOnly('town.' + part.id, part.draw);
  cityOnly('air-canyon', () => drawAirNear(x, cv, (p) => -drop * p + drop, 'canyon'));
  cityOnly('ring', () => drawRingOver(x, cv, L));
  cityOnly('air-over', () => drawAirNear(x, cv, (p) => -drop * p + drop, 'over'));
  cityOnly('line0', () => drawLine0(x, cv, L));
  for (const part of townLampPieces(x, cv, L, options.pieces)) cityOnly('lamps.' + part.id, part.draw);
  both('coast-mid.', coastMiddlePieces(x, cv, options.pieces), coastMiddlePieces(xm, cvw, options.pieces));
  for (const part of townPeoplePieces(x, cv, L, options.pieces)) cityOnly('people.' + part.id, part.draw);
  cityOnly('traffic', () => drawTraffic(x, cv, L));
  both('coast-front.', coastFrontPieces(x, cv, options.pieces), coastFrontPieces(xm, cvw, options.pieces));
  paint('under', () => drawUnder(x, cv, L, drop));
  paint('foreground', () => { drawForeground(x, cv); mirrored(() => drawForeground(xm, cvw), false); });
  space = 'base';

  paint('rain', () => {
  // ---------- rain (not under the ground), and the dark of the tunnel ----------
  if (rain > 0) {
    x.strokeStyle = 'rgba(190,200,255,' + (0.24 * rain).toFixed(2) + ')'; x.lineWidth = 0.6; x.beginPath();
    const n = Math.round(DROPS.length * rain);
    for (let i = 0; i < n; i++) {
      const [rx, ry, dd] = DROPS[i], fall = still ? 0 : t * 150 * dd;
      const px = ((rx * (W + 40) - fall * 0.25) % (W + 40) + W + 40) % (W + 40) - 10, py = ((ry * H + fall) % H);
      x.moveTo(px, py); x.lineTo(px - 1.2 * dd, py + 5 * dd);
    }
    x.stroke();
  }
  });
  const dark = options.dark ?? smooth(GLIDE - 1.6, GLIDE - 0.4, gt);
  paint('tunnel-fade', () => { if (dark > 0) { x.fillStyle = 'rgba(0,0,0,' + dark + ')'; x.fillRect(0, 0, W, H); } });
  return { parts, drop, W, H, coast: cv, geometry: { hz, GY, sunX, sunY, R, spX, spBase, spS, seaTop, seaBot, skyTop } };
}
