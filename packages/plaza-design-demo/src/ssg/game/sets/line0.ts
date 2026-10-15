/**
 * Set pieces (ART-GUIDE §12): LINE 0's own way through the city, so the train never shares the
 * street (Tommi, 2026-10-15: rail and road apart; a train comes from somewhere):
 *
 * - `drawViaduct`: the elevated track: a girder on columns with flared heads, the rails and sleepers,
 *   a walkway railing, signal lamps; its height can change along it (the ramp down into the cutting).
 * - `drawWallPortal`: where the line runs out of a building: a lit opening in a tower's wall at track
 *   height, its concrete frame, a LINE 0 plate and a signal.
 * - `drawTunnelPortal`: the headwall where the line dives under Downtown: the black arch, the plate.
 * - `drawBore`: the tunnel in section (the cutaway at the glide's end): the concrete ring, the lit
 *   inside, lamps along the wall, cable trays, the track.
 *
 * TRUE TO THE PLAYER'S SCALE (vehicles.ts `M`; the cars are train-car.ts `METRO`, 20 m): the viaduct's
 * rails 4.5 m up (`LINE0.deck`). Each draws in its own frame: x along the line in scene units, heights
 * up from the ground (y = -h); the viaduct and the bore take the stretch the caller sees. Register:
 * sets/index.ts (`line0`).
 */

import { O, RED, text } from '../scenes/kit';

export const LINE0 = { deck: 120, girder: 46, pitch: 420, bore: 170 };

export interface ViaductLook {
  t: number;
  still?: boolean;
  fill?: string;
  /** The rail's height at frame x (default `LINE0.deck`): the ramp. Where it is under 30 the columns stop. */
  height?: (fx: number) => number;
}

/** The viaduct from frame x `a` to `b`. */
export function drawViaduct(x: CanvasRenderingContext2D, a: number, b: number, o: ViaductLook) {
  const y = (h: number) => -h, fill = o.fill ?? '#1c1418', H = o.height ?? (() => LINE0.deck), G = LINE0.girder;
  // the columns at every pitch where the deck is up
  for (let k = Math.floor(a / LINE0.pitch) * LINE0.pitch; k <= b + LINE0.pitch; k += LINE0.pitch) {
    if (k < a - 60 || k > b + 60) continue;
    const h = H(k) - G; if (h < 20) continue;
    x.fillStyle = fill; x.fillRect(k - 14, y(h), 28, h);
    x.beginPath(); x.moveTo(k - 14, y(h - 20)); x.lineTo(k - 34, y(h)); x.lineTo(k + 34, y(h)); x.lineTo(k + 14, y(h - 20)); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,150,90,.14)'; x.fillRect(k - 14, y(h), 2, h);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(k + 8, y(h), 6, h);
  }
  // the girder: sampled along the line so a ramp bends it
  const step = 20;
  x.fillStyle = fill; x.beginPath();
  x.moveTo(a, y(H(a))); for (let k = a; k <= b; k += step) x.lineTo(k, y(H(k))); x.lineTo(b, y(H(b)));
  x.lineTo(b, y(H(b) - G)); for (let k = b; k >= a; k -= step) x.lineTo(k, y(H(k) - G)); x.closePath(); x.fill();
  // its lit top edge, the walkway railing, sleepers, the rail
  x.strokeStyle = 'rgba(' + O + ',.45)'; x.lineWidth = 2; x.beginPath(); x.moveTo(a, y(H(a))); for (let k = a; k <= b; k += step) x.lineTo(k, y(H(k))); x.stroke();
  x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 3; x.beginPath(); x.moveTo(a, y(H(a) - G + 6)); for (let k = a; k <= b; k += step) x.lineTo(k, y(H(k) - G + 6)); x.stroke();
  x.fillStyle = 'rgba(90,58,36,.9)'; for (let k = Math.ceil(a / 24) * 24; k < b; k += 24) x.fillRect(k, y(H(k) + 4), 14, 4);
  x.strokeStyle = 'rgba(190,140,100,.85)'; x.lineWidth = 3; x.beginPath(); x.moveTo(a, y(H(a) + 6)); for (let k = a; k <= b; k += step) x.lineTo(k, y(H(k) + 6)); x.stroke();
  x.strokeStyle = 'rgba(80,60,64,.9)'; x.lineWidth = 2; x.beginPath();
  for (let k = Math.ceil(a / 60) * 60; k < b; k += 60) { x.moveTo(k, y(H(k))); x.lineTo(k, y(H(k) + 30)); }
  x.moveTo(a, y(H(a) + 30)); for (let k = a; k <= b; k += step) x.lineTo(k, y(H(k) + 30));
  x.stroke();
  // the signals on short masts: green for the train coming, red behind it
  for (let k = Math.floor(a / 1600) * 1600 + 700; k < b; k += 1600) {
    const h = H(k); x.fillStyle = '#100c0e'; x.fillRect(k, y(h + 90), 6, 90); x.fillRect(k - 6, y(h + 104), 18, 18);
    x.fillStyle = 'rgba(60,230,140,.95)'; x.fillRect(k - 2, y(h + 100), 10, 6);
  }
}

/** A lit opening in a building's wall, the track running out of it: `w` wide, its sill at the rail. */
export function drawWallPortal(x: CanvasRenderingContext2D, w: number, o: { t: number; still?: boolean }) {
  const y = (h: number) => -h, d = LINE0.deck, top = d + 150;
  x.fillStyle = '#0a0608'; x.fillRect(0, y(top), w, top - d + LINE0.girder);
  // the inside: a lit tube going back, the rails catching it
  const g = x.createLinearGradient(0, y(top), 0, y(d)); g.addColorStop(0, 'rgba(255,214,150,.5)'); g.addColorStop(1, 'rgba(255,170,90,.18)');
  x.fillStyle = g; x.fillRect(10, y(top - 10), w - 20, top - d - 10);
  x.fillStyle = 'rgba(255,240,210,.8)'; for (let k = 16; k < w - 16; k += 40) x.fillRect(k, y(top - 14), 22, 4);
  x.fillStyle = 'rgba(20,10,14,.6)'; x.fillRect(10, y(d + 14), w - 20, 14);
  // the frame and its hazard band, the plate
  x.strokeStyle = 'rgba(' + O + ',.7)'; x.lineWidth = 4; x.strokeRect(2, y(top) + 2, w - 4, top - d);
  for (let k = 4; k < w - 4; k += 24) { x.fillStyle = (k / 24) % 2 < 1 ? 'rgba(255,200,40,.75)' : 'rgba(20,14,10,.9)'; x.fillRect(k, y(top + 14), 12, 10); }
  x.fillStyle = '#050302'; x.fillRect(w / 2 - 60, y(top + 52), 120, 32);
  x.strokeStyle = 'rgba(' + O + ',.7)'; x.lineWidth = 2; x.strokeRect(w / 2 - 59, y(top + 51), 118, 30);
  text(x, 'LINE 0', w / 2, y(top + 36), 'rgba(' + O + ',.95)', 20, '600');
  const on = o.still || Math.floor(o.t / 50) % 2 === 0;
  x.fillStyle = on ? 'rgba(60,230,140,.95)' : 'rgba(60,230,140,.3)'; x.fillRect(w - 26, y(top - 24), 12, 12);
}

/** The headwall where the line goes under: the face, the black arch (its floor at the rail), the plate, a red light over it. */
export function drawTunnelPortal(x: CanvasRenderingContext2D, o: { t: number; still?: boolean; floor?: number }) {
  const y = (h: number) => -h, f = o.floor ?? 0, archTop = f + 150;
  x.fillStyle = '#1e1418'; x.fillRect(-150, y(archTop + 70), 190, archTop + 70 - f + 60);
  x.strokeStyle = 'rgba(' + O + ',.55)'; x.lineWidth = 3; x.strokeRect(-148, y(archTop + 68), 186, archTop + 68 - f);
  x.fillStyle = '#000'; x.beginPath(); x.moveTo(-120, y(f)); x.lineTo(-120, y(archTop - 50)); x.quadraticCurveTo(-120, y(archTop), -60, y(archTop)); x.lineTo(14, y(archTop)); x.lineTo(14, y(f)); x.closePath(); x.fill();
  x.fillStyle = '#0d0705'; x.fillRect(-130, y(archTop + 62), 150, 40); x.strokeStyle = 'rgba(' + O + ',.7)'; x.lineWidth = 2; x.strokeRect(-129, y(archTop + 61), 148, 38);
  x.save(); x.font = '600 26px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(' + O + ',.95)'; if (!o.still) { x.shadowColor = 'rgba(' + O + ',.8)'; x.shadowBlur = 8; } x.fillText('LINE 0', -55, y(archTop + 42)); x.restore();
  const on = o.still || Math.floor(o.t / 40) % 2 === 0;
  x.fillStyle = on ? 'rgba(' + RED + ',.95)' : 'rgba(' + RED + ',.3)'; x.fillRect(4, y(archTop + 14), 10, 10);
}

/** The bore in section from frame x `a` to `b`: the ring of concrete, the lit inside, lamps and cables, the track. Its floor at 0, `LINE0.bore` tall. */
export function drawBore(x: CanvasRenderingContext2D, a: number, b: number, o: { t: number; still?: boolean; light?: number }) {
  const y = (h: number) => -h, H = LINE0.bore, lt = o.light ?? 1;
  x.fillStyle = '#3a3036'; x.fillRect(a, y(H + 18), b - a, H + 36);
  const g = x.createLinearGradient(0, y(H), 0, y(0)); g.addColorStop(0, 'rgba(255,214,150,' + 0.55 * lt + ')'); g.addColorStop(0.6, 'rgba(160,110,80,' + 0.45 * lt + ')'); g.addColorStop(1, 'rgba(60,40,36,' + 0.8 * lt + ')');
  x.fillStyle = '#120c0e'; x.fillRect(a, y(H), b - a, H);
  x.fillStyle = g; x.fillRect(a, y(H), b - a, H);
  // the rings' joints, the cable trays, lamps along the wall
  x.fillStyle = 'rgba(0,0,0,.3)'; for (let k = Math.ceil(a / 60) * 60; k < b; k += 60) x.fillRect(k, y(H), 2, H);
  x.fillStyle = 'rgba(30,24,28,.9)'; x.fillRect(a, y(H - 30), b - a, 6); x.fillRect(a, y(H - 44), b - a, 4);
  for (let k = Math.ceil(a / 180) * 180; k < b; k += 180) {
    x.fillStyle = 'rgba(255,240,210,' + 0.95 * lt + ')'; x.fillRect(k, y(H - 12), 26, 5);
    const lg = x.createRadialGradient(k + 13, y(H - 12), 2, k + 13, y(H - 12), 90); lg.addColorStop(0, 'rgba(255,220,170,' + 0.3 * lt + ')'); lg.addColorStop(1, 'rgba(255,220,170,0)');
    x.fillStyle = lg; x.fillRect(k - 80, y(H + 70), 190, 180);
  }
  // the walkway and the track
  x.fillStyle = 'rgba(40,30,32,1)'; x.fillRect(a, y(14), b - a, 14);
  x.fillStyle = 'rgba(90,58,36,.9)'; for (let k = Math.ceil(a / 24) * 24; k < b; k += 24) x.fillRect(k, y(4), 14, 4);
  x.fillStyle = 'rgba(190,140,100,.85)'; x.fillRect(a, y(8), b - a, 3);
  // the concrete ring's edges in section
  x.fillStyle = 'rgba(255,190,140,.25)'; x.fillRect(a, y(H + 18), b - a, 2); x.fillRect(a, y(-16), b - a, 2);
}
