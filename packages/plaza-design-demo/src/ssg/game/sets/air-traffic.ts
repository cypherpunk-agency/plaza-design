/**
 * Set pieces (ART-GUIDE §12): the traffic in the city's sky. An air taxi (a pod on four ducted fans,
 * lit cabin, nav lights, a short warm trail), a camera drone (quad rotors, a blinking light), and
 * the ad blimp (an envelope with fins and a gondola, a lit panel down its side cycling the
 * Registry's dry adverts). Register: sets/index.ts (`air-traffic`).
 *
 * Drawn in its own frame, in the scenes' units: origin at the craft's middle, heights up (y = -h).
 * `t` is the animation clock in frames; `still` holds rotors and lights. `face` 1 flies right.
 */

import { RED } from '../scenes/kit';

const R = Math.round;

/** An air taxi: the pod, its cabin window, ducted fans, nav lights and a trail behind it. */
export function drawAirTaxi(x: CanvasRenderingContext2D, o: { t: number; face?: 1 | -1; paint?: string; still?: boolean }) {
  x.save(); if ((o.face ?? 1) < 0) x.scale(-1, 1);
  const p = o.paint ?? '#e8e0d0', blink = o.still || Math.floor(o.t / 12) % 2 === 0;
  // the trail: warm exhaust fading behind
  const g = x.createLinearGradient(-40, 0, -14, 0); g.addColorStop(0, 'rgba(255,120,170,0)'); g.addColorStop(1, 'rgba(255,120,170,.45)');
  x.fillStyle = g; x.fillRect(-40, 1, 26, 3);
  // the pod: a rounded body, the cabin glass
  x.fillStyle = p; x.beginPath(); x.moveTo(-16, 4); x.lineTo(-18, -2); x.quadraticCurveTo(-8, -12, 8, -10); x.quadraticCurveTo(18, -6, 18, 2); x.lineTo(14, 6); x.lineTo(-14, 6); x.closePath(); x.fill();
  x.fillStyle = 'rgba(126,210,240,.75)'; x.beginPath(); x.moveTo(-2, -9); x.quadraticCurveTo(10, -9, 15, -3); x.lineTo(-2, -3); x.closePath(); x.fill();
  x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(-14, 3, 28, 2);
  // the fans, fore and aft, spinning
  const spin = o.still ? 0 : Math.floor(o.t / 2) % 2;
  for (const fx of [-15, 13]) { x.fillStyle = '#3a3a42'; x.fillRect(fx - 5, 5, 10, 3); x.fillStyle = 'rgba(220,230,255,.45)'; x.fillRect(fx - 6 + spin * 2, 8, 8, 1); }
  // nav lights: white ahead, red behind
  x.fillStyle = '#fff6d0'; x.fillRect(17, -1, 2, 2);
  x.fillStyle = blink ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.3)'; x.fillRect(-19, -2, 2, 2);
  x.restore();
}

/** A drone: four rotors on arms, the body, a blinking light under it. */
export function drawDrone(x: CanvasRenderingContext2D, o: { t: number; still?: boolean; cargo?: boolean }) {
  const s = o.still ? 0 : Math.floor(o.t / 2) % 2;
  x.fillStyle = '#2a2d33'; x.fillRect(-6, -2, 12, 4); x.fillRect(-10, -3, 20, 1);
  x.fillStyle = 'rgba(200,220,255,.5)'; x.fillRect(-13 + s, -5, 6, 1); x.fillRect(7 - s, -5, 6, 1);
  x.fillStyle = '#4a4e56'; x.fillRect(-11, -4, 2, 2); x.fillRect(9, -4, 2, 2);
  x.fillStyle = o.still || Math.floor(o.t / 8) % 2 ? 'rgba(' + RED + ',.95)' : 'rgba(255,190,120,.8)'; x.fillRect(-1, 2, 2, 2);
  if (o.cargo) { x.strokeStyle = 'rgba(255,217,165,.4)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 2); x.lineTo(0, 10); x.stroke(); x.fillStyle = '#a0703c'; x.fillRect(-4, 10, 8, 7); }
}

/** The Registry's dry adverts the blimp cycles through (one message per panel). */
const ADS = ['REGISTRY · VERIFY TODAY', 'SCORE 600+ · PRIORITY LANE', 'UNREGISTERED? REPORT TO SECTOR 4', 'PREMIUM CITIZENSHIP · 12T/MONTH'];

/** The ad blimp: the envelope with fins, the gondola under it, a lit panel down its side. */
export function drawBlimp(x: CanvasRenderingContext2D, o: { t: number; still?: boolean }) {
  const L = 92, Hh = 24;
  x.fillStyle = '#2a1830'; x.beginPath(); x.ellipse(0, 0, L, Hh, 0, 0, Math.PI * 2); x.fill();
  // fins at the tail
  x.beginPath(); x.moveTo(-L + 8, -4); x.lineTo(-L - 10, -Hh - 4); x.lineTo(-L - 4, -2); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(-L + 8, 4); x.lineTo(-L - 10, Hh + 4); x.lineTo(-L - 4, 2); x.closePath(); x.fill();
  // the dawn on its back, a seam along it
  x.strokeStyle = 'rgba(255,170,120,.4)'; x.lineWidth = 1; x.beginPath(); x.ellipse(0, 0, L - 1, Hh - 1, 0, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
  x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(-L + 10, 2, L * 2 - 20, 1);
  // the gondola, lit
  x.fillStyle = '#1a0e20'; x.fillRect(-14, Hh - 2, 28, 9); x.fillStyle = 'rgba(255,210,150,.6)'; for (let i = -11; i < 11; i += 5) x.fillRect(i, Hh + 1, 3, 3);
  // the ad panel: a dark screen on the envelope, a message every few seconds
  const n = o.still ? 0 : Math.floor(o.t / 240) % ADS.length, msg = ADS[n];
  x.fillStyle = '#0c0610'; x.fillRect(-58, -9, 116, 16);
  x.strokeStyle = 'rgba(255,136,0,.45)'; x.strokeRect(-57.5, -8.5, 115, 15);
  x.save(); x.font = '600 7px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = n % 2 ? 'rgba(255,217,165,.9)' : 'rgba(255,150,40,.95)'; x.fillText(msg, 0, -1, 108); x.restore();
  x.fillStyle = o.still || Math.floor(o.t / 20) % 2 ? 'rgba(' + RED + ',1)' : 'rgba(' + RED + ',.3)'; x.fillRect(R(L - 3), -1, 2, 2);
}
