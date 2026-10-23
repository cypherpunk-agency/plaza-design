/** Extracted artwork. Scene-owned layout, actors and visual inputs are supplied explicitly. */

import { type View } from "../../scenes/kit";
import { drawTaxiPad } from './taxi-pad';

import { drawDriven, type Character } from "../../runtime/characters";
import { drawFlock, type FlockOptions } from "../characters/flock";
import { box,C,drawTowers,exitDoor,GREEN,notice,O,onScreen,PAPER,RED,rng,sign,tell,text,towers } from "../core/primitives";
import { placed } from "../core/view";
import { drawBoat } from "../vehicles/boats";
import { drawForklift, drawTruck, PORT_TRAILER_SCALE } from "../vehicles/vehicles";
import { bobAt, laneAt, type Lane } from "../vehicles/kit";
import { drawHorizon,drawSkyDepth,drawWater,HZ } from "../environment/harbor-distance";
import { drawGantry,GANTRIES } from "../machinery/crane";
import { CH,container,PAL,type Crate } from "../props/containers";
import { camera,menuBoard,ticker,YELLOW } from "../signage/screens";
import { clutter,stall,type StallSpec } from "./construction";
import type { PreparedCharacter } from '../../runtime/characters';
export interface CraneVisual {twx:number;hang:number;carry:boolean;u:number}
export interface ForkliftVisual {x:number;dir:1|-1}
export interface HarborVisual {cranes:CraneVisual[];forklift:ForkliftVisual;bribed:boolean;weatherLine:string}
export interface HarborLayout {width:number;hut:{x:number;w:number;h:number};notice:number;arch:{x0:number;x1:number;h:number};podium:number;manifest:number;callBox:number;cranes:{x:number;id:keyof typeof GANTRIES;phase:number}[];fish:{x:number;w:number};drinks:{x:number;w:number};den:number;fence:{x0:number;x1:number;gate:number};ghost:number;berth:number;rails:number;beacon:number;metro:number;terminal:number;taxi:number;ferry:number;}
export interface ArtworkInputs{L:HarborLayout;visual:HarborVisual;fishPose:PreparedCharacter;teaPose:PreparedCharacter;loads:Crate[];}
const SKYLINE = towers(41, 1700, [16, 40], [18, 70], 0.08);

/** Gulls in flight over the harbour, drifting east (the kit's flock, with the harbour's own seeded birds). */
export const HARBOR_FLOCK: FlockOptions = { kind: 'gull', appearance: 'grey silhouette', span: 2800, margin: 200, birds: (() => { const r = rng(91); return Array.from({ length: 7 }, () => ({ x: r() * 2600, h: 130 + r() * 150, speed: 0.25 + r() * 0.35, parallax: 0.7 + r() * 0.3, phase: r() * 100 })); })() };
/** The Registry's robot gull: a kit robogull on its figure-of-eight route, scanning the pier now and then. */
const DRONE_GULL: Character = { seed: 3, look: 'robogull', x: 0, ps: 1, parallax: 0.95, rim: false, shadow: false };
export function droneGullAt(t: number) { const u = t * 0.006; return { x: 1460 + Math.sin(u) * 240, h: 128 + Math.sin(u * 2) * 22, face: (Math.cos(u) > 0 ? 1 : -1) as 1 | -1, scanning: Math.sin(u * 3) > 0.55 }; }


export function createHarborPierArtwork(inputs:ArtworkInputs){const {L}=inputs;
const GHOST: Crate = { w: 128, p: 5, seed: 11, code: 'PLZU 610 0002' };

/** The container on the customs chassis, sliding through the arch's scan. */


const HANGING=inputs.loads[0];

const HANGING3=inputs.loads[1];


const y0=(v:View,h:number)=>v.y(h);
/** The harbor's boats and machines draw through the vehicle kit (boats.ts, vehicles.ts); routes and timing stay the harbor's. */
const PATROL_LANE: Lane = { mode: 'run', dir: 1, speed: 3600 / 1700, length: 3600, dwell: 900 };
const FERRY_LANE: Lane = { mode: 'loop', dir: 1, speed: 0.16, length: 2600 };
/** The forklift a little over the port scale, so it still reads beside the harbor's people. */
const FORKLIFT_SCALE = 0.55;
function drawLampBoat(x:CanvasRenderingContext2D,v:View){
  const s = v.sx(1650, 0.3), wl = y0(v, 56);
  if (!onScreen(v, s - 30, 60)) return;
  placed(x, s, wl, 1, () => drawBoat(x, 'lamp', { t: v.t, heave: -bobAt(v.t, 1), lamp: 'signal' }));
}
function drawPatrol(x:CanvasRenderingContext2D,v:View){
  const at = laneAt(PATROL_LANE, v.t);
  if (!at.visible) return;
  const s = v.sx(-500 + at.offset, 0.5), wl = v.y(46);
  if (!onScreen(v, s - 140, 280)) return;
  placed(x, s, wl, 1, () => drawBoat(x, 'patrol', { t: v.t, heave: -bobAt(v.t, 1, 0.05), searchlight: true, wake: true }));
}
function drawFerry(x:CanvasRenderingContext2D,v:View){
  const f = v.sx(laneAt(FERRY_LANE, v.t).offset - 400, 0.45), wl = v.y(34);
  if (!onScreen(v, f - 100, 200)) return;
  placed(x, f, wl, 1, () => drawBoat(x, 'ferry', { t: v.t, reflection: true }));
}
function archChassis(x:CanvasRenderingContext2D,v:View){
  const { sx, y } = v, A = L.arch, a0 = sx(A.x0), a1 = sx(A.x1);
  if (!onScreen(v, a0 - 20, a1 - a0 + 60)) return;
  // the customs chassis (a trailer without its tractor), its container inching through
  placed(x, sx(A.x0 + 11) + 64, y(0), PORT_TRAILER_SCALE, () => drawTruck(x, { t: v.t, paint: '#2a2622', box: null, tractor: false }));
}
function archScan(x:CanvasRenderingContext2D,v:View){
  const { sx, y, t } = v, A = L.arch, a0 = sx(A.x0), a1 = sx(A.x1);
  if (!onScreen(v, a0 - 20, a1 - a0 + 60)) return;
const cw=sx(A.x0+11);
  // the scan: a sheet of red light running down the box, green when it clears
  const u = t % 420, clear = u > 330, sy = y(14 + CH) + Math.min(1, u / 330) * CH;
  if (!clear) {
    x.fillStyle = 'rgba(' + RED + ',.1)'; x.fillRect(cw, y(14 + CH), 128, sy - y(14 + CH));
    x.fillStyle = 'rgba(' + RED + ',.85)'; x.fillRect(cw - 2, Math.round(sy), 132, 2);
  } else { x.fillStyle = 'rgba(' + GREEN + ',.08)'; x.fillRect(cw, y(14 + CH), 128, CH); }

}
function archPortal(x:CanvasRenderingContext2D,v:View){
  const { sx, y, t } = v, A = L.arch, a0 = sx(A.x0), a1 = sx(A.x1);
  if (!onScreen(v, a0 - 20, a1 - a0 + 60)) return;
const u=t%420,clear=u>330;
  // the portal
  const steel = '#2a2622', edge = 'rgba(220,200,160,.6)';
  box(x, a0 - 6, y(A.h + 18), 10, A.h + 18, steel, edge); box(x, a1 - 4, y(A.h + 18), 10, A.h + 18, steel, edge);
  box(x, a0 - 10, y(A.h + 26), a1 - a0 + 20, 12, steel, edge);
  for (let k = 0; k < a1 - a0 + 16; k += 10) { x.fillStyle = k % 20 ? 'rgba(20,12,6,1)' : 'rgba(' + YELLOW + ',.55)'; x.fillRect(a0 - 8 + k, y(A.h + 16), 10, 3); }
  // emitter heads along the beam's underside
  for (let k = 8; k < a1 - a0; k += 22) { x.fillStyle = clear ? 'rgba(' + GREEN + ',.7)' : 'rgba(' + RED + ',' + (0.4 + 0.4 * Math.sin(t * 0.2 + k)) + ')'; x.fillRect(a0 + k, y(A.h + 13), 6, 2); }
  // the plate bolted to the beam: printed, not neon
  const mx = (a0 + a1) / 2;
  box(x, mx - 64, y(A.h + 44), 128, 18, '#e0d4b8', 'rgba(40,30,20,.9)');
  text(x, 'CUSTOMS INSPECTION', mx, y(A.h + 39), 'rgba(30,18,8,.95)', 8, '700');
  text(x, 'ALL CONTAINERS', mx, y(A.h + 31), 'rgba(110,20,20,.95)', 7, '700');
  x.fillStyle = 'rgba(160,120,90,.8)'; x.fillRect(mx - 62, y(A.h + 42), 1, 1); x.fillRect(mx + 61, y(A.h + 42), 1, 1);
  // a status screen on the right post and a lamp on top
  const st = a1 + 6;
  x.fillStyle = '#2a2622'; x.fillRect(st - 2, y(92), 4, 3);
  box(x, st, y(100), 30, 18, '#050303', 'rgba(' + O + ',.55)');
  text(x, clear ? 'CLEAR' : 'SCAN', st + 15, y(95), clear ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + RED + ',.95)', 7, '600');
  text(x, Math.min(100, Math.floor(u / 3.3)) + '%', st + 15, y(87), 'rgba(' + PAPER + ',.7)', 7, '600');
  x.fillStyle = clear ? 'rgba(' + GREEN + ',.95)' : 'rgba(' + RED + ',' + (Math.floor(t / 20) % 2 ? 0.95 : 0.3) + ')'; x.fillRect(a0 - 3, y(A.h + 32), 4, 4);

}

function drawTerminalGate(x:CanvasRenderingContext2D,v:View){
  const { sx, y, t } = v, g = sx(L.terminal);
  if (!onScreen(v, g - 30, 60)) return;
  x.fillStyle = '#050302'; x.fillRect(g - 16, y(74), 32, 74);
  x.fillStyle = 'rgba(255,217,165,' + (0.2 + 0.08 * Math.sin(t * 0.03)) + ')'; x.fillRect(g - 1, y(60), 3, 3);
  x.fillStyle = 'rgba(' + O + ',.12)'; for (let k = 0; k < 4; k++) x.fillRect(g - 12 + k * 2, y(40 - k * 8), 24 - k * 4, 1);
  box(x, g - 19, y(82), 3, 82, '#2a2622', 'rgba(220,200,160,.5)'); box(x, g + 16, y(82), 3, 82, '#2a2622', 'rgba(220,200,160,.5)');
  box(x, g - 30, y(100), 60, 16, '#e0d4b8', 'rgba(40,30,20,.9)');
  text(x, 'TERMINAL 2', g, y(95), 'rgba(30,18,8,.95)', 7, '700');
  text(x, 'BERTH 4 · STACKS', g, y(88), 'rgba(110,20,20,.95)', 7, '700');

}
function craneFrame(x:CanvasRenderingContext2D,v:View,ci:number){const c=L.cranes[ci],cx=c.x,phase=c.phase,{sx,y,t}=v;if(!onScreen(v,sx(cx-230),460))return;const edge='rgba('+O+',.8)',{twx,hang,carry,u}=inputs.visual.cranes[ci],tx=sx(twx),cabL=tx-44,cabT=y(188);void carry;void u;void phase;void t;void y;void hang;void edge;void cabL;void cabT;void tx;  placed(x, sx(cx), y(0), 1, () => drawGantry(x, GANTRIES[c.id], t, 'all', phase));

}
function craneCabBack(x:CanvasRenderingContext2D,v:View,ci:number){const c=L.cranes[ci],cx=c.x,phase=c.phase,{sx,y,t}=v;if(!onScreen(v,sx(cx-230),460))return;const edge='rgba('+O+',.8)',{twx,hang,carry,u}=inputs.visual.cranes[ci],tx=sx(twx),cabL=tx-44,cabT=y(188);void carry;void u;void phase;void t;void y;void hang;void edge;void cabL;void cabT;void tx;  box(x, tx - 10, y(194) + 3, 20, 6, '#2a160a', edge);
  // the operator's cab under the trolley: lit, with the operator in it

  box(x, cabL, cabT, 26, 30, '#140b06', edge);
  x.fillStyle = 'rgba(255,200,130,.28)'; x.fillRect(cabL + 3, cabT + 4, 20, 16);

}
function craneCabFront(x:CanvasRenderingContext2D,v:View,ci:number){const c=L.cranes[ci],cx=c.x,phase=c.phase,{sx,y,t}=v;if(!onScreen(v,sx(cx-230),460))return;const edge='rgba('+O+',.8)',{twx,hang,carry,u}=inputs.visual.cranes[ci],tx=sx(twx),cabL=tx-44,cabT=y(188);void carry;void u;void phase;void t;void y;void hang;void edge;void cabL;void cabT;void tx;  x.fillStyle = 'rgba(255,240,215,.12)'; x.fillRect(cabL + 3, cabT + 4, 7, 16);
  x.fillStyle = 'rgba(' + O + ',.8)'; x.fillRect(cabL + 3, cabT + 20, 20, 1);
  const glow = x.createRadialGradient(cabL + 13, cabT + 14, 2, cabL + 13, cabT + 14, 34);
  glow.addColorStop(0, 'rgba(255,200,130,.1)'); glow.addColorStop(1, 'rgba(255,200,130,0)');
  x.fillStyle = glow; x.fillRect(cabL - 22, cabT - 20, 70, 70);

}
function craneCables(x:CanvasRenderingContext2D,v:View,ci:number){const c=L.cranes[ci],cx=c.x,phase=c.phase,{sx,y,t}=v;if(!onScreen(v,sx(cx-230),460))return;const edge='rgba('+O+',.8)',{twx,hang,carry,u}=inputs.visual.cranes[ci],tx=sx(twx),cabL=tx-44,cabT=y(188);void carry;void u;void phase;void t;void y;void hang;void edge;void cabL;void cabT;void tx;  x.strokeStyle = 'rgba(' + PAPER + ',.45)'; x.beginPath(); x.moveTo(tx - 4.5, y(188)); x.lineTo(tx - 4.5, y(hang + 4)); x.moveTo(tx + 4.5, y(188)); x.lineTo(tx + 4.5, y(hang + 4)); x.stroke();
  box(x, tx - 66, y(hang + 4), 132, 4, '#2a160a', edge);
  for (const k of [-66, 60]) { x.fillStyle = 'rgba(' + YELLOW + ',.6)'; x.fillRect(tx + k, y(hang + 4), 6, 4); }

}
function craneLoad(x:CanvasRenderingContext2D,v:View,ci:number){const c=L.cranes[ci],cx=c.x,phase=c.phase,{sx,y,t}=v;if(!onScreen(v,sx(cx-230),460))return;const edge='rgba('+O+',.8)',{twx,hang,carry,u}=inputs.visual.cranes[ci],tx=sx(twx),cabL=tx-44,cabT=y(188);void carry;void u;void phase;void t;void y;void hang;void edge;void cabL;void cabT;void tx;  if (carry) container(x, v, twx - 64, hang - CH, ci === 0 ? HANGING : HANGING3);
  else if (u > 360 && u < 600) { box(x, tx - 3, y(hang + 10), 6, 6, '#e8dcc0'); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(tx - 1, y(hang + 14), 1, 3); }

}
function craneLight(x:CanvasRenderingContext2D,v:View,ci:number){const c=L.cranes[ci],cx=c.x,phase=c.phase,{sx,y,t}=v;if(!onScreen(v,sx(cx-230),460))return;const edge='rgba('+O+',.8)',{twx,hang,carry,u}=inputs.visual.cranes[ci],tx=sx(twx),cabL=tx-44,cabT=y(188);void carry;void u;void phase;void t;void y;void hang;void edge;void cabL;void cabT;void tx;  const fx = sx(cx);
  const g = x.createLinearGradient(0, y(166), 0, y(0));
  g.addColorStop(0, 'rgba(255,217,165,.16)'); g.addColorStop(1, 'rgba(255,217,165,.03)');
  x.fillStyle = g; x.beginPath(); x.moveTo(fx - 4, y(166)); x.lineTo(fx - 70, y(0)); x.lineTo(fx + 70, y(0)); x.lineTo(fx + 4, y(166)); x.closePath(); x.fill();
  box(x, fx - 6, y(170) + 8, 12, 4, '#ffd9a5');

}
function denInside(x:CanvasRenderingContext2D,v:View){const {sx,y,t}=v,s0=sx(L.den),w=128,top=y(CH+2);if(!onScreen(v,s0-60,w+120))return;void t;void y;void top;  // its light spills out onto the pier
  const g = x.createRadialGradient(s0 + w / 2, y(30), 4, s0 + w / 2, y(20), 120);
  g.addColorStop(0, 'rgba(255,180,100,.2)'); g.addColorStop(1, 'rgba(255,180,100,0)');
  x.fillStyle = g; x.fillRect(s0 - 70, y(110), w + 140, 110);
  box(x, s0, top, w, CH + 2, '#1c120a', 'rgba(255,136,0,.8)');
  // the inside: warm, a rug, a calendar, shelves of jars
  x.fillStyle = '#2a1a0c'; x.fillRect(s0 + 4, top + 4, w - 8, CH - 6);
  x.fillStyle = 'rgba(255,190,110,.12)'; x.fillRect(s0 + 4, top + 4, w - 8, CH - 6);
  x.fillStyle = '#5a2a1a'; x.fillRect(s0 + 18, y(4), w - 36, 3);
  box(x, s0 + 10, top + 10, 14, 18, '#d8ccb0'); x.fillStyle = 'rgba(160,30,30,.8)'; x.fillRect(s0 + 12, top + 12, 10, 3);
  for (let k = 0; k < 3; k++) { x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(s0 + 92, top + 14 + k * 9, 28, 1); for (let j = 0; j < 4; j++) { x.fillStyle = ['#c86a2a', '#8a7a2a', '#d8ccb0', '#5a8a3a'][(j + k) % 4]; x.fillRect(s0 + 94 + j * 7, top + 9 + k * 9, 4, 5); } }
  // the bulb on its flex
  const sway = Math.sin(t * 0.03) * 2;
  x.strokeStyle = 'rgba(' + PAPER + ',.4)'; x.beginPath(); x.moveTo(s0 + w / 2, top + 4); x.lineTo(s0 + w / 2 + sway, top + 16); x.stroke();
  x.fillStyle = 'rgba(255,230,180,.95)'; x.fillRect(s0 + w / 2 - 2 + sway, top + 16, 4, 4);

}
function denTable(x:CanvasRenderingContext2D,v:View){const {sx,y,t}=v,s0=sx(L.den),w=128,top=y(CH+2);if(!onScreen(v,s0-60,w+120))return;void t;void y;void top;  box(x, s0 + 52, y(20), 26, 20, '#5a3a1e', 'rgba(255,190,110,.5)');
  x.fillStyle = '#e8e0d0'; x.fillRect(s0 + 55, y(21), 4, 2); x.fillRect(s0 + 62, y(21), 4, 2); x.fillStyle = '#c83a2a'; x.fillRect(s0 + 70, y(21), 3, 2);
  x.fillStyle = 'rgba(' + YELLOW + ',.8)'; x.fillRect(s0 + 64, y(23), 3, 2);

}
function denDoors(x:CanvasRenderingContext2D,v:View){const {sx,y,t}=v,s0=sx(L.den),w=128,top=y(CH+2);if(!onScreen(v,s0-60,w+120))return;void t;void y;void top;  // the doors, folded back flat against the box's ends
  box(x, s0 - 10, top + 2, 10, CH - 2, PAL[4][0], PAL[4][1]); box(x, s0 + w, top + 2, 10, CH - 2, PAL[4][0], PAL[4][1]);
  x.fillStyle = 'rgba(255,217,165,.25)'; x.fillRect(s0 - 6, top + 6, 1, CH - 10); x.fillRect(s0 + w + 5, top + 6, 1, CH - 10);
  text(x, 'TDLU 771 0063', s0 + 34, top - 6, 'rgba(' + PAPER + ',.5)', 7, '600');

}
function denLamp(x:CanvasRenderingContext2D,v:View){const {sx,y,t}=v,s0=sx(L.den),w=128,top=y(CH+2);if(!onScreen(v,s0-60,w+120))return;void t;void y;void top;  // the Tide's signal lamp on a pole beside it, hooded, blinking slow
  const lx = s0 + w + 22;
  box(x, lx - 1, y(78), 3, 78, '#2a160a', 'rgba(' + O + ',.5)');
  box(x, lx - 6, y(86), 12, 9, '#3a3020', 'rgba(255,217,165,.6)');
  const on = Math.floor(t / 90) % 3 !== 0;
  x.fillStyle = on ? 'rgba(255,230,170,.9)' : 'rgba(255,230,170,.2)'; x.fillRect(lx + 4, y(83), 3, 4);

}
function bondedContainers(x:CanvasRenderingContext2D,v:View){const {sx,y,t}=v,F=L.fence,f0=sx(F.x0),f1=sx(F.x1);if(!onScreen(v,f0-20,f1-f0+40))return;void t;void y;  container(x, v, L.ghost, 0, GHOST);
  container(x, v, L.ghost + 10, CH, { w: 66, p: 3, seed: 15, code: 'TDLU 112', dx: 2 });

}
function ghostMark(x:CanvasRenderingContext2D,v:View){const {sx,y,t}=v,F=L.fence,f0=sx(F.x0),f1=sx(F.x1);if(!onScreen(v,f0-20,f1-f0+40))return;void t;void y;  // the Ghosts' mark: a lantern in whitewash, painted over the logo, dripping
  const gx = sx(L.ghost + 70), gy = y(CH - 4), k = 1.5;
  x.strokeStyle = 'rgba(240,236,224,.9)'; x.lineWidth = 3; x.beginPath();
  x.moveTo(gx - 6 * k, gy + 6 * k); x.lineTo(gx + 6 * k, gy + 6 * k); x.moveTo(gx - 9 * k, gy + 10 * k); x.lineTo(gx - 9 * k, gy + 30 * k); x.lineTo(gx + 9 * k, gy + 30 * k); x.lineTo(gx + 9 * k, gy + 10 * k); x.closePath();
  x.moveTo(gx, gy); x.lineTo(gx, gy + 6 * k); x.moveTo(gx - 5 * k, gy + 33 * k); x.lineTo(gx + 5 * k, gy + 33 * k); x.stroke(); x.lineWidth = 1;
  x.fillStyle = 'rgba(255,220,150,.75)'; x.fillRect(gx - 3, gy + 17 * k, 6, 11 * k);
  x.fillStyle = 'rgba(240,236,224,.7)';
  for (const [dx, len] of [[-9, 7], [9, 4], [-2, 9], [4, 5]]) x.fillRect(gx + dx * k - 1, gy + 31 * k, 2, len);
  // red customs seals on the doors
  for (const k of [10, 18]) { x.fillStyle = 'rgba(' + RED + ',.8)'; x.fillRect(sx(L.ghost) + k, y(CH / 2) - 2, 3, 6); }

}
function bondedFence(x:CanvasRenderingContext2D,v:View){const {sx,y,t}=v,F=L.fence,f0=sx(F.x0),f1=sx(F.x1);if(!onScreen(v,f0-20,f1-f0+40))return;void t;void y;  // the fence, posts and mesh
  x.strokeStyle = 'rgba(200,190,170,.1)'; x.beginPath();
  for (let k = 0; k < f1 - f0; k += 9) { x.moveTo(f0 + k, y(4)); x.lineTo(f0 + k + 30, y(70)); x.moveTo(f0 + k + 30, y(4)); x.lineTo(f0 + k, y(70)); }
  x.stroke();
  x.fillStyle = '#0a0705'; x.fillRect(f1, y(72), 40, 72);
  for (let k = 0; k <= f1 - f0; k += 44) box(x, f0 + k - 1, y(74), 3, 74, '#2a2622', 'rgba(220,200,160,.5)');
  box(x, f0, y(72), f1 - f0, 2, '#2a2622', 'rgba(220,200,160,.5)');
  x.strokeStyle = 'rgba(200,190,170,.35)'; x.beginPath(); for (let k = 0; k < f1 - f0; k += 6) { x.moveTo(f0 + k, y(74)); x.lineTo(f0 + k + 3, y(80)); x.lineTo(f0 + k + 6, y(74)); } x.stroke();
  // the gate stands ajar once the guard is admiring the sea
  const gt = sx(F.gate), open = inputs.visual.bribed;
  box(x, gt + (open ? 30 : 0), y(66), open ? 10 : 40, 62, 'rgba(0,0,0,0)', 'rgba(220,200,160,.55)');
  x.fillStyle = '#2a2622'; x.fillRect(gt + 2, y(92), 2, 20); x.fillRect(gt + 74, y(92), 2, 20);
  box(x, gt - 4, y(104), 86, 18, '#e0d4b8', 'rgba(40,30,20,.9)');
  text(x, 'BONDED STORE', gt + 39, y(99), 'rgba(30,18,8,.95)', 7, '700');
  text(x, 'AUTHORISED PERSONNEL', gt + 39, y(91), 'rgba(110,20,20,.95)', 7, '700');
  camera(x, v, { x: F.x1 - 4, h: 86, facing: -1, phase: 33 });
  void t;void y;

}
/** The forklift in two parts so the composition layers its driver between them; its pose (x, direction) comes from the scene. */
function forklift(x:CanvasRenderingContext2D,v:View,part:'body'|'roof'){const {x:fwx,dir}=inputs.visual.forklift,s=v.sx(fwx);if(!onScreen(v,s-50,100))return;
  placed(x, s + dir * 5, v.y(0), FORKLIFT_SCALE, () => drawForklift(x, { t: v.t, face: dir, part, load: true, lift: 0.08 + 0.05 * Math.sin(v.t * 0.01), paint: '#c89a1c' }));
}
function forkliftBody(x:CanvasRenderingContext2D,v:View){forklift(x,v,'body');}
function forkliftRoof(x:CanvasRenderingContext2D,v:View){forklift(x,v,'roof');}
function hutBack(x:CanvasRenderingContext2D,v:View){const {sx,y,t}=v,hx=sx(L.hut.x);if(!onScreen(v,hx,L.hut.w))return;void t;void y;  box(x, hx, y(L.hut.h), L.hut.w, L.hut.h, '#140b06', 'rgba(' + O + ',.8)');
  box(x, hx + 40, y(60), 28, 24, '#2a1a0c', 'rgba(' + O + ',.6)');
  x.save(); x.beginPath(); x.rect(hx + 41, y(60) + 1, 26, 22); x.clip();
  x.fillStyle = 'rgba(255,217,165,.18)'; x.fillRect(hx + 41, y(60), 26, 24);
x.restore();
}
function hutFront(x:CanvasRenderingContext2D,v:View){const {sx,y,t}=v,hx=sx(L.hut.x);if(!onScreen(v,hx,L.hut.w))return;void t;void y;  x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(hx + 42, y(59), 6, 20);
  box(x, hx - 4, y(L.hut.h + 4), L.hut.w + 8, 5, '#1c0f07', 'rgba(' + O + ',.8)');
  // a mug on the sill
  box(x, hx + 60, y(38), 5, 4, '#c8b8a0'); void t;void y;

}
const FISH_STALL: StallSpec = { x: L.fish.x, w: L.fish.w, seed: 31, sign: 'FISH', col: PAPER, goods: 'fish', awning: 'tarp', light: 'bulb',  note: ['CASH', 'ONLY'] };

const TEA_STALL: StallSpec = { x: L.drinks.x, w: L.drinks.w, seed: 34, sign: 'HOT DRINKS', col: O, goods: 'noodles', awning: 'tin', light: 'tube',
  back: (x, v, p) => menuBoard(x, v, { x: p.x + p.w * 0.5, h: p.h0 + 10, w: 60, tall: 36, title: 'NIGHT SHIFT', items: [['TEA', '1T'], ['COFFEE', '1T'], ['BROTH', '1T']], phase: 50 }) };


function fishStall(x:CanvasRenderingContext2D,v:View){stall(x,v,FISH_STALL,{vendorPose:inputs.fishPose});
}
function teaStall(x:CanvasRenderingContext2D,v:View){stall(x,v,TEA_STALL,{vendorPose:inputs.teaPose});
}
function farSky(x:CanvasRenderingContext2D,v:View){const{y}=v;    const glow = x.createLinearGradient(0, y(HZ + 70), 0, y(HZ));
    glow.addColorStop(0, 'rgba(194,65,12,0)'); glow.addColorStop(1, 'rgba(194,65,12,.12)');
    x.fillStyle = glow; x.fillRect(0, y(HZ + 70), v.viewW, 70);
    drawSkyDepth(x, v);
    drawTowers(x, v, SKYLINE, 0.12, y(HZ), 0.12, '#030100', 1);

}
function horizon(x:CanvasRenderingContext2D,v:View){drawHorizon(x,v);
}
function water(x:CanvasRenderingContext2D,v:View){drawWater(x,v);
}
function flyingGulls(x:CanvasRenderingContext2D,v:View){drawFlock(x, v, HARBOR_FLOCK);
}
function pierSlab(x:CanvasRenderingContext2D,v:View){const{y}=v;    x.fillStyle = '#0e0905'; x.fillRect(0, y(6), v.viewW, 6);
    x.fillStyle = 'rgba(' + O + ',.6)'; x.fillRect(0, y(6), v.viewW, 1);
    // the crane rail along the pier
    x.fillStyle = 'rgba(200,190,170,.25)'; x.fillRect(0, y(2), v.viewW, 1);


}
function metroDoor(x:CanvasRenderingContext2D,v:View){exitDoor(x,v,L.metro,'#0a0603','< METRO');
}
function noticePost(x:CanvasRenderingContext2D,v:View){const{sx,y,t}=v;    const nx = sx(L.notice);
    if (onScreen(v, nx - 30, 60)) { box(x, nx - 1, y(44), 3, 44, '#2a160a'); notice(x, t, nx, y(72), 52, 30, ['PORT', 'AUTHORITY']); }


}
function podium(x:CanvasRenderingContext2D,v:View){const{sx,y,t}=v;    const px = sx(L.podium);
    if (onScreen(v, px - 20, 40)) {
      box(x, px - 2, y(30), 4, 30, '#2a2622', 'rgba(220,200,160,.5)');
      box(x, px - 11, y(44), 22, 15, '#050303', 'rgba(' + O + ',.55)');
      x.fillStyle = 'rgba(' + PAPER + ',.5)'; for (let r = 0; r < 3; r++) x.fillRect(px - 8, y(41) + r * 4, 10 + ((r * 5 + Math.floor(t / 60)) % 6), 1);
      x.fillStyle = Math.floor(t / 30) % 2 ? 'rgba(' + RED + ',.9)' : 'rgba(' + RED + ',.3)'; x.fillRect(px + 7, y(42), 2, 2);
    }

}
function manifest(x:CanvasRenderingContext2D,v:View){const{sx,y,t}=v;    const mx = sx(L.manifest);
    if (onScreen(v, mx - 20, 40)) notice(x, t, mx, y(46), 30, 26, ['MANI', 'FEST'], 1);

}
function callBox(x:CanvasRenderingContext2D,v:View){const{sx,y,t}=v;    const cb = sx(L.callBox);
    if (onScreen(v, cb - 20, 40)) {
      box(x, cb - 1, y(36), 3, 36, '#2a2622');
      box(x, cb - 8, y(52), 16, 18, '#0d1416', 'rgba(' + C + ',.7)');
      x.fillStyle = 'rgba(' + C + ',.4)'; for (let r = 0; r < 3; r++) x.fillRect(cb - 5, y(48) + r * 3, 10, 1);
      tell(x, t, cb + 4, y(38), 2);
      text(x, 'STS-1', cb, y(58), 'rgba(' + PAPER + ',.7)', 7, '600');
    }


}
function crates(x:CanvasRenderingContext2D,v:View){clutter(x,v,{x:1112,seed:41,n:2,kinds:['crate','crate']});
}
function bollard(x:CanvasRenderingContext2D,v:View,wx:number){const b=v.sx(wx),y=v.y;if(!onScreen(v,b-8,16))return;      box(x, b - 5, y(10), 10, 10, '#1a0f08', 'rgba(' + O + ',.7)'); box(x, b - 7, y(12), 14, 3, '#24140a', 'rgba(' + O + ',.7)');

}
function rod(x:CanvasRenderingContext2D,v:View,rx:number,rh:number,reach:number){const{sx,y,t,gy}=v;      const s = sx(rx);
      if (!onScreen(v, s - 10, reach + 20)) return;
      x.strokeStyle = 'rgba(150,110,70,.85)'; x.beginPath(); x.moveTo(s, y(rh)); x.lineTo(s + reach, y(rh + 34)); x.stroke();
      const dip = Math.sin(t * 0.03 + rx) * 3;
      x.strokeStyle = 'rgba(220,220,220,.25)'; x.beginPath(); x.moveTo(s + reach, y(rh + 34)); x.lineTo(s + reach + 6, gy + 30 + dip); x.stroke();
      x.fillStyle = 'rgba(' + RED + ',.8)'; x.fillRect(s + reach + 5, gy + 30 + dip, 2, 2);

}
function fishingBox(x:CanvasRenderingContext2D,v:View){box(x,v.sx(2112),v.y(8),12,8,'#3a3a2a','rgba(220,200,160,.4)');
}
function berthSign(x:CanvasRenderingContext2D,v:View){const{sx,y,t}=v;    box(x, sx(L.berth) - 1, y(88), 3, 88, '#2a160a');
    sign(x, t, 'BERTH 9', sx(L.berth), y(96), O, { size: 8, phase: 30 });

}
function taxi(x:CanvasRenderingContext2D,v:View){drawTaxiPad(x,v,L.taxi);
}
function ferryNotice(x:CanvasRenderingContext2D,v:View){const{sx,y,t}=v;    const fx = sx(L.ferry);
    if (onScreen(v, fx - 30, 60)) { box(x, fx - 1, y(44), 3, 44, '#2a160a'); notice(x, t, fx, y(74), 58, 32, ['FERRY', 'TIMES'], 2); }
    ticker(x, v, { x: L.ferry + 2, h: 84, w: 74, tall: 10, mount: 'pole', text: 'NIGHT FERRY 7 · BOARDING SUSPENDED · AWAITING CARGO CLEARANCE   ·   ' + inputs.visual.weatherLine, col: YELLOW, speed: 0.35 });


}
function rails(x:CanvasRenderingContext2D,v:View){const{sx,y}=v;    const ex = sx(L.rails);
    if (onScreen(v, ex - 10, 100)) {
      x.strokeStyle = 'rgba(' + O + ',.6)'; x.beginPath(); x.moveTo(ex, y(24) + 0.5); x.lineTo(ex + 76, y(24) + 0.5); x.moveTo(ex, y(14) + 0.5); x.lineTo(ex + 76, y(14) + 0.5); x.stroke();
      for (let i = 0; i <= 76; i += 19) { x.beginPath(); x.moveTo(ex + i + 0.5, y(0)); x.lineTo(ex + i + 0.5, y(24)); x.stroke(); }
      const LOCKS = ['#c83a2a', '#d8b040', '#8e949e', '#5a8a3a', '#e8e0d0', '#8a3a8a', '#d86a2a', '#c86a5a', '#8e949e'];
      LOCKS.forEach((col, i) => { const lx = ex + 6 + i * 7 + (i > 4 ? 6 : 0); x.fillStyle = col; x.fillRect(lx, y(23) + 2, 4, 4); x.strokeStyle = col; x.beginPath(); x.arc(lx + 2, y(23) + 2, 1.5, Math.PI, 0); x.stroke(); });
      x.fillStyle = 'rgba(200,60,60,.8)'; x.fillRect(ex + 41, y(23) + 6, 1, 6); x.fillRect(ex + 43, y(23) + 6, 1, 5);

    }
}
function beacon(x:CanvasRenderingContext2D,v:View){const{sx,y,t}=v;const ex=sx(L.rails);if(!onScreen(v,ex-10,100))return;
      const bx = sx(L.beacon);
      box(x, bx - 1, y(110), 3, 110, '#2a160a', 'rgba(' + O + ',.6)');
      x.fillStyle = Math.sin(t * 0.03) > 0.6 ? 'rgba(255,217,165,.2)' : 'rgba(255,217,165,.9)'; x.fillRect(bx - 3, y(116), 7, 6);
}

function portCamera(x:CanvasRenderingContext2D,v:View){camera(x,v,{x:156,h:136,facing:1,phase:11});
}
function droneGull(x:CanvasRenderingContext2D,v:View){const g = droneGullAt(v.t);
    if (onScreen(v, v.sx(g.x, 0.95) - 30, 60)) drawDriven(x, v, DRONE_GULL, { x: g.x, air: g.h - 2, facing: g.face, moving: true, act: g.scanning ? 'scan' : 'fly', beam: { alpha: 0.07, spread: 18, sweep: 0 } });
}
function nearWater(x:CanvasRenderingContext2D,v:View){const{sx,t,gy}=v;    x.fillStyle = '#0c0805'; x.fillRect(0, gy, v.viewW, 12);
    x.fillStyle = 'rgba(' + O + ',.55)'; x.fillRect(0, gy, v.viewW, 1);
    x.fillStyle = '#01030a'; x.fillRect(0, gy + 12, v.viewW, v.viewH - gy - 12);
    for (let wx = 60; wx < L.width; wx += 180) {
      const s = sx(wx);
      if (!onScreen(v, s - 8, 16)) continue;
      x.strokeStyle = 'rgba(40,30,25,1)'; x.lineWidth = 3; x.beginPath(); x.arc(s, gy + 9, 5, 0, 7); x.stroke(); x.lineWidth = 1;
    }
    for (let k = 0; k < 7; k++) {
      const wy = gy + 16 + k * 6, sp = 0.2 + k * 0.08, a = 0.09 - k * 0.009;
      for (let wx = -60; wx < v.viewW + 60; wx += 46 + k * 9) {
        const px2 = ((wx - v.cam * (1 + k * 0.04) + t * sp) % (v.viewW + 120) + v.viewW + 120) % (v.viewW + 120) - 60;
        x.fillStyle = 'rgba(170,210,255,' + a + ')'; x.fillRect(Math.round(px2), Math.round(wy + Math.sin(t * 0.04 + wx) * 1.5), 14 + k * 2, 1);
      }
    }
    for (const c of L.cranes) {
      const s = sx(c.x);
      for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(255,217,165,' + 0.08 * (1 - i / 8) + ')'; x.fillRect(s - 8 + Math.sin(t * 0.05 + i) * 2, gy + 16 + i * 4, 16, 2); }
    }
    for (const lx of [L.den + 64, L.fish.x + 56, L.drinks.x + 48]) {
      const s = sx(lx);
      for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,190,110,' + 0.07 * (1 - i / 6) + ')'; x.fillRect(s - 10 + Math.sin(t * 0.05 + i + lx) * 2, gy + 16 + i * 5, 20, 2); }
    }

}
function frontBollard(x:CanvasRenderingContext2D,v:View,fx:number){
    // near bollards with their ropes, passing at the bottom of the view; a gull on one

      const s = v.sx(fx, 1.3), base = v.gy + 46;
      if (!onScreen(v, s - 20, 140)) return;
      box(x, s - 10, base - 18, 20, 18, '#020100', 'rgba(' + O + ',.3)'); box(x, s - 14, base - 22, 28, 5, '#020100', 'rgba(' + O + ',.3)');
      x.strokeStyle = 'rgba(120,90,60,.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(s + 10, base - 14); x.quadraticCurveTo(s + 60, base - 2, s + 120, base - 30); x.stroke(); x.lineWidth = 1;
}
return{drawLampBoat,drawPatrol,drawFerry,archChassis,archScan,archPortal,drawTerminalGate,craneFrame,craneCabBack,craneCabFront,craneCables,craneLoad,craneLight,denInside,denTable,denDoors,denLamp,bondedContainers,ghostMark,bondedFence,forkliftBody,forkliftRoof,hutBack,hutFront,fishStall,teaStall,farSky,horizon,water,flyingGulls,pierSlab,metroDoor,noticePost,podium,manifest,callBox,crates,bollard,rod,fishingBox,berthSign,taxi,ferryNotice,rails,beacon,portCamera,droneGull,nearWater,frontBollard};
}
