import {paintOpeningActor}from'../sequences/opening/poses';
import type{Light}from'../../world/light';
/**
 * Set pieces (ART-GUIDE §12): the city cut open. When a picture goes under the street (the opening
 * glide follows LINE 0 down), the ground is drawn as a section:
 *
 * - `drawGroundSection`: the asphalt and its sub-base, layers of fill and old rubble (a city built on a
 *   city), a water main and cable ducts in cross-section, a steam pipe run with its valve, the sewer's
 *   egg, foundation piles going down from the towers; darker with depth.
 * - `drawCanalGlimpse`: below all that, a glimpse of the Undercity (CITY.md: canals, sewers and flooded
 *   basements, where the deleted live): a brick vault over dark water, a narrow boat moored at a ledge
 *   with a lantern on a pole and someone sitting in it, the lantern's light on the water, one more
 *   light far off. A glimpse, not an explanation.
 *
 * Units: scene units (vehicles.ts `M`). The section draws in its own frame with depth DOWN (y = +d),
 * from frame x `a` to `b`; the canal draws with its origin at the waterline, x across, heights up
 * (y = -h). Register: sets/index.ts (`cutaway`).
 */

import type { PreparedCharacter, Character } from "../../runtime/characters";
import { frameView } from "../core/view";

const hash = (a: number, b: number) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export interface SectionLook {
  seed: number;
  /** How deep (frame units, downward). */
  depth: number;
  /** Frame x of foundation piles (the towers above). */
  piles?: number[];
  /** Depth bands left clear (the bore, the canal): drawn over by the caller, so skip the pipes there. */
  clear?: [number, number][];
}

/** The ground in section from frame x `a` to `b`, depth 0 (the street's surface) down to `depth`. */
export function drawGroundSection(x: CanvasRenderingContext2D, a: number, b: number, o: SectionLook) {
  const D = o.depth, w = b - a;
  const g = x.createLinearGradient(0, 0, 0, D); g.addColorStop(0, '#2a1e22'); g.addColorStop(0.25, '#1e1418'); g.addColorStop(0.7, '#140c10'); g.addColorStop(1, '#0a0608');
  x.fillStyle = g; x.fillRect(a, 0, w, D);
  // the asphalt, its lit edge, the sub-base's gravel
  x.fillStyle = '#0e0a0c'; x.fillRect(a, 0, w, 14);
  x.fillStyle = 'rgba(255,170,110,.45)'; x.fillRect(a, 0, w, 2);
  for (let k = Math.floor(a / 9) * 9; k < b; k += 9) { const v = hash(o.seed, k); x.fillStyle = 'rgba(120,96,100,' + (0.15 + v * 0.2).toFixed(2) + ')'; x.fillRect(k, 18 + Math.round(v * 40), 3, 2); }
  // strata lines, wavering; a band of old rubble (brick ends, a buried kerb)
  for (const [d0, col] of [[64, 'rgba(0,0,0,.35)'], [150, 'rgba(60,30,30,.4)'], [300, 'rgba(0,0,0,.3)'], [420, 'rgba(40,20,24,.35)']] as const) {
    if (d0 > D) continue;
    x.strokeStyle = col; x.lineWidth = 2; x.beginPath();
    for (let k = Math.floor(a / 40) * 40; k <= b + 40; k += 40) x.lineTo(k, d0 + Math.sin(k * 0.01 + o.seed) * 6);
    x.stroke();
  }
  for (let k = Math.floor(a / 23) * 23; k < b; k += 23) { const v = hash(k, o.seed + 1); if (v > 0.55) continue; x.fillStyle = v < 0.2 ? 'rgba(120,50,40,.45)' : 'rgba(90,70,70,.35)'; x.fillRect(k, 160 + Math.round(v * 110), 10 + Math.round(v * 12), 6); }
  const clear = (d: number, r: number) => (o.clear ?? []).some(([c0, c1]) => d + r > c0 && d - r < c1);
  // the piles going down from the towers above
  for (const px of o.piles ?? []) {
    if (px < a - 60 || px > b + 60) continue;
    x.fillStyle = '#2e2428'; x.fillRect(px - 26, 14, 52, D);
    x.fillStyle = 'rgba(255,190,140,.12)'; x.fillRect(px - 26, 14, 2, D);
    x.fillStyle = 'rgba(0,0,0,.3)'; for (let d = 60; d < D; d += 60) x.fillRect(px - 26, d, 52, 2);
  }
  // pipes and ducts in cross-section, at seeded places along the street
  for (let k = Math.floor(a / 260) * 260; k < b + 260; k += 260) {
    const v = hash(o.seed + 3, k), px = k + v * 160, d = 70 + Math.round(hash(k, 9) * 50);
    if (clear(d, 40)) continue;
    if (v < 0.35) { x.fillStyle = '#3a2a24'; x.beginPath(); x.arc(px, d, 26, 0, 7); x.fill(); x.fillStyle = '#0a0606'; x.beginPath(); x.arc(px, d, 19, 0, 7); x.fill(); x.fillStyle = 'rgba(90,140,170,.35)'; x.fillRect(px - 19, d + 6, 38, 12); }
    else if (v < 0.7) { for (let i = 0; i < 6; i++) { x.fillStyle = ['#2a2a30', '#3a2a20', '#202a30'][i % 3]; x.beginPath(); x.arc(px + (i % 3) * 16, d + Math.floor(i / 3) * 16, 7, 0, 7); x.fill(); x.fillStyle = 'rgba(255,190,60,.4)'; x.fillRect(px + (i % 3) * 16 - 1, d + Math.floor(i / 3) * 16 - 1, 2, 2); } }
  }
  // a steam pipe run with its insulation bands and a valve; the sewer's egg further down
  const sd = 112;
  if (!clear(sd, 20)) {
    x.fillStyle = '#4a3a34'; x.fillRect(a, sd - 10, w, 20);
    x.fillStyle = 'rgba(255,217,165,.18)'; x.fillRect(a, sd - 10, w, 2);
    x.fillStyle = 'rgba(0,0,0,.35)'; for (let k = Math.ceil(a / 50) * 50; k < b; k += 50) x.fillRect(k, sd - 10, 4, 20);
    for (let k = Math.floor(a / 900) * 900 + 300; k < b; k += 900) { x.fillStyle = '#6a2a1a'; x.fillRect(k - 8, sd - 30, 16, 20); x.fillRect(k - 18, sd - 34, 36, 6); }
  }
  for (let k = Math.floor(a / 1100) * 1100 + 600; k < b + 80; k += 1100) {
    const d = 495; if (clear(d, 50)) continue;
    x.fillStyle = '#3a2a2a'; x.beginPath(); x.ellipse(k, d, 56, 70, 0, 0, 7); x.fill();
    x.fillStyle = '#060404'; x.beginPath(); x.ellipse(k, d + 4, 44, 58, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(60,90,80,.45)'; x.fillRect(k - 40, d + 34, 80, 20);
  }
}

/** Who is down there (characters.ts, at the player's scale): someone sitting in the boat, hood up. */
export const BOATER: Character = { seed: 7701, look: { body: 'slim', garb: 'coat', hair: 'hood', extras: [] }, x: 0, act: 'sit', facing: -1, h: 14 };

/**
 * The Undercity's canal, `w` wide: a brick vault on piers, dark water, a narrow boat at a ledge with
 * its lantern and someone in it. Origin at the waterline, left edge; `t` frames (the lantern
 * flickers, the water laps), `still` holds it.
 */
export function drawCanalGlimpse(x: CanvasRenderingContext2D, w: number, o: { t: number; still?: boolean; boatX?: number;boatPose:PreparedCharacter;lighting:Light }) {
  const y = (h: number) => -h, t = o.still ? 0 : o.t, vault = 300, bx = o.boatX ?? w * 0.42;
  // the vault: brick arches on piers, wet, dark
  x.fillStyle = '#1a1012'; x.fillRect(0, y(vault + 60), w, vault + 60);
  for (let k = 0; k < w; k += 420) {
    x.fillStyle = '#0c0608'; x.beginPath(); x.moveTo(k + 40, y(0)); x.lineTo(k + 40, y(vault - 120)); x.quadraticCurveTo(k + 210, y(vault + 30), k + 380, y(vault - 120)); x.lineTo(k + 380, y(0)); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(150,80,60,.35)'; x.lineWidth = 6; x.beginPath(); x.moveTo(k + 40, y(vault - 120)); x.quadraticCurveTo(k + 210, y(vault + 30), k + 380, y(vault - 120)); x.stroke();
    x.fillStyle = 'rgba(120,60,50,.22)'; for (let r = 30; r < vault - 120; r += 22) for (let c = (r / 22) % 2 ? 0 : 10; c < 40; c += 20) { x.fillRect(k + c, y(r), 16, 8); x.fillRect(k + 380 + c, y(r), 16, 8); }
  }
  // the ledge on the left, a ladder up, a drip from the vault
  x.fillStyle = '#2a1e1e'; x.fillRect(0, y(30), w * 0.25, 30); x.fillStyle = 'rgba(255,190,140,.18)'; x.fillRect(0, y(30), w * 0.25, 2);
  x.fillStyle = '#3a2a24'; x.fillRect(w * 0.08, y(240), 4, 210); x.fillRect(w * 0.08 + 26, y(240), 4, 210); for (let r = 40; r < 240; r += 22) x.fillRect(w * 0.08, y(r), 30, 3);
  const drip = (t * 1.5) % 200;
  x.fillStyle = 'rgba(170,200,210,.5)'; x.fillRect(w * 0.7, y(vault - 120 - drip), 2, 6);
  // the water: dark, a slow lap of light lines
  const wg = x.createLinearGradient(0, y(0), 0, y(-160)); wg.addColorStop(0, '#0e1418'); wg.addColorStop(1, '#040608');
  x.fillStyle = wg; x.fillRect(0, y(0), w, 160); x.fillStyle = '#040608'; x.fillRect(0, y(-160), w, 900);
  for (let i = 0; i < 18; i++) { const px = ((i * 137 + t * 0.4) % (w + 60)) - 30, py = 8 + (i * 29) % 140; x.fillStyle = 'rgba(120,150,160,' + (0.06 + (i % 3) * 0.03).toFixed(2) + ')'; x.fillRect(Math.round(px), Math.round(py), 20 + (i % 4) * 8, 2); }
  // the boat: a low narrow hull, a pole with the lantern, the one aboard
  const bob = Math.sin(t * 0.04) * 2;
  x.save(); x.translate(bx, bob);
  x.fillStyle = '#2a1a14'; x.beginPath(); x.moveTo(-150, y(18)); x.lineTo(150, y(18)); x.lineTo(130, y(-6)); x.lineTo(-136, y(-6)); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,190,120,.3)'; x.fillRect(-150, y(18), 300, 2);
  x.fillStyle = '#1a100c'; x.fillRect(96, y(150), 4, 136);
  placed1(x, -40, y(4), () => paintOpeningActor(x,frameView(o.t,o.lighting),o.boatPose,'canal'));
  const fl = o.still ? 1 : 0.85 + 0.15 * Math.sin(t * 0.3) * Math.sin(t * 0.13);
  const lg = x.createRadialGradient(98, y(140), 2, 98, y(140), 220); lg.addColorStop(0, 'rgba(255,190,100,' + (0.45 * fl).toFixed(3) + ')'); lg.addColorStop(1, 'rgba(255,190,100,0)');
  x.fillStyle = lg; x.fillRect(-140, y(360), 480, 440);
  x.fillStyle = '#1a100c'; x.fillRect(88, y(156), 20, 4);
  x.fillStyle = 'rgba(255,214,140,' + (0.95 * fl).toFixed(3) + ')'; x.fillRect(92, y(150), 12, 14);
  // the lantern on the water, broken up
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,190,100,' + (0.3 - i * 0.04).toFixed(2) + ')'; x.fillRect(84 + Math.round(Math.sin(t * 0.05 + i) * 6), y(-14 - i * 14), 26 - i * 2, 3); }
  x.restore();
  // one more light, far off down the canal
  x.fillStyle = 'rgba(255,200,130,.6)'; x.fillRect(w * 0.88, y(60), 4, 4);
  x.fillStyle = 'rgba(255,200,130,.18)'; x.fillRect(w * 0.88 - 2, y(-10), 8, 2); x.fillRect(w * 0.88, y(-24), 4, 2);
}

function placed1(x: CanvasRenderingContext2D, px: number, py: number, draw: () => void) { x.save(); x.translate(px, py); draw(); x.restore(); }
