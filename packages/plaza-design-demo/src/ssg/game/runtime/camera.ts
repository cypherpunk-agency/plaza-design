import type {PlayerState,ScenePlacement} from './state';
import {cameraProjection,canvasPoint} from '../art/core/geometry';
import {levelFloor} from '../engine/level';
import type {Terminal} from '../ui/terminal';
import {NUDGE_EASE} from './tuning';
import {VISION_ZOOM_MIN} from './tuning';

import {SceneHost} from "../engine/index";



import {Menu} from "../ui/menu";

import type {CameraState,InputState,PresentationState,TimingState,ScenesState} from './state';

/** Camera functions use runtime-owned data; they never start a loop or own a save. */
export interface CameraPort{
  timing:TimingState;scenes:ScenesState;term:Terminal;
  camera: CameraState;
  levelW: number;
  interactionHost: SceneHost;
  zh: SceneHost;
  worldSpan: () => [number, number];
  presentation: PresentationState;
  input: InputState;
  p: PlayerState;
  canvas: HTMLCanvasElement;
  hostPlacement: (host: SceneHost) => ScenePlacement | undefined;
  menu: Menu;
}
export function projection(camera:Readonly<CameraState>){
 return cameraProjection(camera,camera.wasVision?{zoom:camera.vz,x:camera.vcam}:undefined);
}

function clampZ(port:CameraPort,z: number) {
    const fit = port.camera.viewW / (port.levelW + 24);
    return Math.max(Math.max(0.1, Math.min(fit, VISION_ZOOM_MIN)), Math.min(1, z));
  }

function clampV(port:CameraPort) {
    const w = port.camera.viewW / port.camera.vz;
    const [lo,hi]=port.interactionHost===port.zh?[0,port.levelW]:port.worldSpan();
    port.camera.vcam = hi-lo <= w ? lo+(hi-lo-w)/2 : Math.max(lo, Math.min(hi-w, port.camera.vcam));
  }

export function visionCamera(port:CameraPort) {
    const on = port.interactionHost.visionOn && !port.presentation.mapView && !port.presentation.cut;
    if (on && !port.camera.wasVision) { port.camera.vz = 1; port.camera.vcam = port.camera.cam; port.camera.panned = false; port.input.vptr.clear(); port.input.vgest = null; }
    if (!on && port.camera.wasVision) {
      // back to you: the usual camera eases there from the middle of what you were looking at
      const w = port.camera.viewW / port.camera.vz;
      { const [lo, hi] = port.worldSpan(); port.camera.cam = Math.max(lo, Math.min(hi - port.camera.viewW, port.camera.vcam + (w - port.camera.viewW) / 2)); }
      port.camera.vz = 1; port.camera.panned = false; port.input.vptr.clear(); port.input.vgest = null;
      port.interactionHost.viewMoved(false);
    }
    port.camera.wasVision = on;
    if (!on) return;
    // walking (on a keyboard) brings the view back onto you
    if (port.p.moving && !port.input.vgest) port.camera.panned = false;
    if (!port.camera.panned) {
      const w = port.camera.viewW / port.camera.vz;
      port.camera.vcam += (port.p.x - w * 0.45 - port.camera.vcam) * 0.12;
    }
    clampV(port);
    port.interactionHost.viewMoved(port.camera.panned || port.camera.vz < 0.999);
  }

export function resetVision(port:CameraPort) {
    port.camera.vz = 1; port.camera.panned = false;
    port.interactionHost.viewMoved(false);
  }

export function visionPointer(port:CameraPort,e: PointerEvent,press: boolean):boolean {
    if (press) {
      if (e.button > 0) return true;
      e.preventDefault();
      try { port.canvas.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer */ }
      port.input.vptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...port.input.vptr.values()];
      if (pts.length === 1) port.input.vgest = { kind: 'tap', sx: e.clientX, sy: e.clientY, cam: port.camera.vcam, z: port.camera.vz, d: 0, mid: e.clientX };
      else if (pts.length === 2) port.input.vgest = { kind: 'pinch', sx: 0, sy: 0, cam: port.camera.vcam, z: port.camera.vz, d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, mid: (pts[0].x + pts[1].x) / 2 };
      return true;
    }
    // (the mouse just moving over the canvas: hover, as usual)
    if (!port.input.vptr.has(e.pointerId)) return false;
    port.input.vptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = port.input.vgest;
    if (!g) return true;
    const r = port.canvas.getBoundingClientRect(), px = port.canvas.width / (r.width || 1);
    if (g.kind === 'pinch') {
      const pts = [...port.input.vptr.values()];
      if (pts.length < 2) return true;
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, mid = (pts[0].x + pts[1].x) / 2;
      // the world under the fingers stays under them
      const wx = g.cam + ((g.mid - r.left) * px) / (port.camera.k * g.z);
      port.camera.vz = clampZ(port,(g.z * d) / g.d);
      port.camera.vcam = wx - ((mid - r.left) * px) / (port.camera.k * port.camera.vz);
      port.camera.panned = true; clampV(port);
      return true;
    }
    if (g.kind === 'tap' && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 8) g.kind = 'pan';
    if (g.kind === 'pan') { port.camera.vcam = g.cam - ((e.clientX - g.sx) * px) / (port.camera.k * port.camera.vz); port.camera.panned = true; clampV(port); }
    return true;
  }

export function visionLift(port:CameraPort,e: PointerEvent) {
    if (!port.input.vptr.delete(e.pointerId)) return;
    const g = port.input.vgest;
    // one finger of a pinch still down: it pans on from here
    if (port.input.vptr.size === 1 && g?.kind === 'pinch') { const [q] = [...port.input.vptr.values()]; port.input.vgest = { kind: 'pan', sx: q.x, sy: q.y, cam: port.camera.vcam, z: port.camera.vz, d: 0, mid: q.x }; return; }
    if (port.input.vptr.size) return;
    port.input.vgest = null;
    if (g?.kind !== 'tap' || e.type === 'pointercancel' || !port.interactionHost.visionOn) return;
    const r = port.canvas.getBoundingClientRect();
    const camera=projection(port.camera),point=canvasPoint(e,r,port.canvas.width,port.canvas.height);
    const wx=point.x/camera.k+camera.cam,h=camera.gy-point.y/camera.k;
    const zh = port.interactionHost, at = port.hostPlacement(zh), id = at ? zh.spotAt(wx-at.dx, h-at.dh) : null, now = performance.now();
    if (!id && now - port.input.lastTap < 320) { port.input.lastTap = 0; resetVision(port); return; }
    port.input.lastTap = id ? 0 : now;
    zh.poke(id);
  }

export function visionWheel(port:CameraPort,e: WheelEvent) {
    if (!port.camera.wasVision || port.menu.open) return;
    e.preventDefault();
    const r = port.canvas.getBoundingClientRect(), px = port.canvas.width / (r.width || 1);
    const wx = port.camera.vcam + ((e.clientX - r.left) * px) / (port.camera.k * port.camera.vz);
    port.camera.vz = clampZ(port,port.camera.vz * Math.exp(-e.deltaY * 0.0015));
    port.camera.vcam = wx - ((e.clientX - r.left) * px) / (port.camera.k * port.camera.vz);
    port.camera.panned = true; clampV(port);
  }

export function camFollow(port:CameraPort,x: number) {
    const [lo, hi] = port.worldSpan();
    return hi - lo < port.camera.viewW ? lo + (hi - lo - port.camera.viewW) / 2 : Math.max(lo, Math.min(hi - port.camera.viewW, x - port.camera.viewW * 0.45));
  }

export function stepFollowCamera(port:CameraPort,dt:number,riding:boolean){
 const p=port.p;
    // Camera follows, eased, clamped to the level. A nudge leans it towards something that reacted
    // off the view for a moment (walking, talking or the deck cancel it), then it eases back.
    if (port.zh.visionOn) port.camera.nudge = null;
    const n = port.camera.nudge;
    if (n && (p.moving || !p.onGround || port.presentation.bubble || port.term.focused || port.zh.overlayOpen || Math.abs(p.x - n.px) > 2)) { port.camera.nudge = null; port.camera.easeBack = !p.moving; }
    const follow = camFollow(port,p.x);
    const nudging = !!port.camera.nudge && port.timing.clock < port.camera.nudge!.until;
    if (port.camera.nudge && !nudging) { port.camera.nudge = null; port.camera.easeBack = true; }
    const goal = nudging ? port.camera.nudge!.goal : follow;
    // gentle while leaning out and coming back; the usual follow otherwise (a step turns it off)
    if (p.moving || Math.abs(goal - port.camera.cam) < 0.5) port.camera.easeBack = false;
    port.camera.cam += (goal - port.camera.cam) * Math.min(1, (nudging || port.camera.easeBack ? NUDGE_EASE : 0.12) * dt);
    { const [lo, hi] = port.worldSpan(); if (hi - lo < port.camera.viewW) port.camera.cam = lo + (hi - lo - port.camera.viewW) / 2; }
    // a level's camera also follows the height of the floor (or the ride), within its lowest and highest floor
    if (port.scenes.level) {
      const goalH = Math.max(port.scenes.level.source.low, Math.min(port.scenes.level.source.high, p.onGround || riding ? p.y : levelFloor(port.scenes.level).h));
      port.camera.camH += (goalH - port.camera.camH) * Math.min(1, 0.1 * dt); port.camera.gy = port.camera.gyBase + Math.round(port.camera.camH);
    }
}
