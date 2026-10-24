import type {PlayerState} from './state';
import {projection} from './camera';
import {canvasPoint} from '../art/core/geometry';
import {TAPPED,TAP_REACH} from './tuning';

import {type InteractionTarget as Target} from './interaction-targets';

import {SceneHost} from "../engine/index";

import {type SceneId} from "../scenes/index";

import {Menu} from "../ui/menu";

import {Terminal} from "../ui/terminal";

import {Transport} from "../ui/transport";

import {can} from "./play-profile";

import {levelClimbing,levelDown,levelRiding,levelUp} from "../engine/level";

import type {CameraState,InputState,ScenesState,PresentationState} from './state';

/** InputRouting functions use runtime-owned data; they never start a loop or own a save. */
export interface InputRoutingPort{
  presentation: PresentationState;
  openingDone: () => void;
  term: Terminal;
  transport: Transport | null;
  menu: Menu;
  skipRise: () => void;
  netKeyDown: (e: KeyboardEvent) => void;
  mapKey: (e: KeyboardEvent) => void;
  interactionHost: SceneHost;
  interact: () => void;
  openMenu: () => void;
  openDeck: () => void;
  showMap: () => void;
  netOk: boolean;
  showNet: () => void;
  resetVision: () => void;
  scenes: ScenesState;
  levelLocked: () => boolean;
  p: PlayerState;
  input: InputState;
  jump: () => void;
  netPointerAt: (e: PointerEvent, press: boolean) => void;
  mapPointer: (e: PointerEvent, press: boolean) => void;
  visionPointer: (e: PointerEvent, press: boolean) => boolean;
  canvas: HTMLCanvasElement;
  camera: CameraState;
  deviceAt: (x: number, h: number) => { host: SceneHost; id: string; } | null;
  hackLocked: () => boolean;
  zh: SceneHost;
  targets: () => Target[];
  useLife: (target: string, owner?: SceneId) => void;
}
export function onKeyDown(port:InputRoutingPort,e: KeyboardEvent) {
    if (port.presentation.opening?.gliding && e.key === 'Escape') {
      e.preventDefault();
      if (!e.repeat) { port.presentation.opening.skip(); port.openingDone(); }
      return;
    }
    // sudo's time control takes its keys first (Space stays the title menu's while it is up)
    if ((port.presentation.opening || port.presentation.cut) && !port.term.focused && port.transport?.key(e, !!port.presentation.opening && port.menu.open)) return;
    // The title takes menu keys; a key during sunrise reveals the menu. Escape skips an active glide above.
    if (port.presentation.opening) {
      if (port.menu.open && !port.term.focused) port.menu.key(e);
      else { e.preventDefault(); if (!e.repeat && !['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) port.skipRise(); }
      return;
    }
    if (port.presentation.cut) { e.preventDefault(); if (!e.repeat) port.presentation.cut.skip(); return; }
    if (port.menu.open) { if (!port.term.focused) port.menu.key(e); return; }
    if (port.term.focused) return;
    if (port.presentation.flight || port.presentation.hop) { e.preventDefault(); return; }
    if (port.presentation.netView) { port.netKeyDown(e); return; }
    if (port.presentation.mapView) { port.mapKey(e); return; }
    let zh = port.interactionHost;
    if (zh && zh.overlayOpen) {
      if (e.key === 'Escape') { e.preventDefault(); zh.closeOverlay(); }
      else if (e.key === 'b' || e.key === 'B') zh.toggleBoard();
      else if ((e.key === 'h' || e.key === 'H') && !e.repeat) zh.toggleVision();
      return;
    }
    if(zh?.acknowledgmentPending&&['e','E','Enter',' '].includes(e.key)){e.preventDefault();if(!e.repeat)port.interact();return;}
    // a thing's popup takes arrows, Enter / E and Esc; any other key closes it and goes on as usual
    if (zh && zh.popupOpen && zh.popupKey(e)) return;
    // An unconsumed key closes that popup; normal world shortcuts belong here again.
    zh = port.interactionHost;
    const k = e.key;
    // the car's list was closed (Esc): the panel's own keys bring it back
    if (port.presentation.carListOff && ['e', 'E', 'ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'].includes(k)) port.presentation.carListOff = false;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
    if (e.repeat && !['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(k)) return;
    if (port.presentation.showEnd) {
      if (k === 'Escape') { port.presentation.showEnd = false; port.openMenu(); }
      else if (k === 'Enter' || k === 'e' || k === 'E') port.presentation.showEnd = false;
      return;
    }
    if (k === 'Escape') {
      if (port.presentation.bubble) { port.presentation.bubble = null; return; }
      if(zh?.acknowledgmentPending){zh.cancelAcknowledgment('dismissed');return;}
      if (zh && zh.visionOn) { zh.toggleVision(); return; }
      // Nothing left to close: the deck, on its last tab (SYSTEM: QUIT TO HOMEPAGE leaves the game).
      port.openMenu();
      return;
    }
    // while someone is talking, Enter and Space go on with the talk (as E does); otherwise Enter opens the deck (the terminal)
    if ((k === 'Enter' || k === ' ') && port.presentation.bubble) { e.preventDefault(); port.interact(); return; }
    if (k === 'Enter') { e.preventDefault(); port.openDeck(); return; }
    // the deck's map app: the city as far as you know it
    if (k === 'Tab' || k === 'm' || k === 'M') { e.preventDefault(); if (can('mapKey')) port.showMap(); return; }
    // B and H mean something only where there is something to hack (a scene with devices)
    if (zh.hackable && (k === 'b' || k === 'B')) { zh.toggleBoard(); return; }
    if (zh.hackable && (k === 'h' || k === 'H')) { zh.toggleVision(); return; }
    // hack vision's own keys: L the logic drawer, U every circuit unfolded, 0 the normal view
    if (zh.visionOn && (k === 'l' || k === 'L')) { zh.toggleLogic(); return; }
    if (zh.visionOn && (k === 'u' || k === 'U')) { zh.toggleUnfold(); return; }
    // N: the net map, once scan.so is yours
    if ((k === 'n' || k === 'N') && port.netOk) { port.showNet(); return; }
    if (zh.visionOn && k === '0') { port.resetVision(); return; }
    if (k === 'e' || k === 'E') { port.interact(); return; }
    // in a level, ↑ and ↓ first mean a door, a flight, an escalator or the lift car; otherwise ↑ jumps
    if ((k === 'ArrowUp' || k === 'w' || k === 'W') && !port.presentation.bubble && port.scenes.level && !port.levelLocked() && levelUp(port.scenes.level, port.p)) { port.input.keys.clear(); if (levelClimbing(port.scenes.level) || levelRiding(port.scenes.level)) port.input.keys.add('ArrowUp'); return; }
    if ((k === 'ArrowDown' || k === 's' || k === 'S') && !port.presentation.bubble && port.scenes.level && !port.levelLocked() && levelDown(port.scenes.level, port.p)) { port.input.keys.clear(); if (levelClimbing(port.scenes.level) || levelRiding(port.scenes.level)) port.input.keys.add('ArrowDown'); return; }
    if ((k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') && !port.presentation.bubble && !(port.scenes.level && levelRiding(port.scenes.level))) port.jump();
    port.input.keys.add(k.length === 1 ? k.toLowerCase() : k);
  }

export function onKeyUp(port:InputRoutingPort,e: KeyboardEvent) {
    const k = e.key;
    port.input.keys.delete(k.length === 1 ? k.toLowerCase() : k);
    if (k === 'Shift') port.input.keys.delete('Shift');
  }

export function onCanvasPointer(port:InputRoutingPort,e: PointerEvent,press: boolean) {
    if (port.presentation.opening) return;
    if (port.presentation.cut) { if (press) { e.preventDefault(); port.presentation.cut.skip(); } return; }
    // a click or tap moves a speech bubble on, the same as E
    if (press && port.presentation.bubble) { e.preventDefault(); port.interact(); return; }
    if (port.presentation.netView) { port.netPointerAt(e, press); return; }
    if (port.presentation.mapView) { port.mapPointer(e, press); return; }
    const zh = port.interactionHost;
    if (port.interactionHost.overlayOpen || port.presentation.flight) return;
    if (zh.visionOn && port.visionPointer(e, press)) return;
    const r = port.canvas.getBoundingClientRect();
    const camera=projection(port.camera),point=canvasPoint(e,r,port.canvas.width,port.canvas.height);
    const wx=point.x/camera.k+camera.cam,h=camera.gy-point.y/camera.k;
    const hit=port.deviceAt(wx,h),picked=hit?.host??zh,id=hit?.id??null;
    for(const host of port.scenes.hosts.values())if(host!==picked)host.hover=null;
    // (pink is the hacking layer's colour: no pink bracket on hover until hacking is yours)
    picked.hover = port.hackLocked() ? null : id;
    port.canvas.style.cursor = id ? 'pointer' : '';
    if (press && zh.visionOn) { zh.poke(id); return; }
    // a thing's popup: its everyday actions, then jack in (computers) and hack it
    if (press && id) { e.preventDefault(); picked.pick(id); return; }
    // a tap on someone or something within reach is E on them
    if (press) tapLife(port,e);
  }

function tapLife(port:InputRoutingPort,e: PointerEvent) {
    const r = port.canvas.getBoundingClientRect(), wx = ((e.clientX - r.left) * (port.canvas.width / r.width)) / port.camera.k + port.camera.cam;
    const doors = !port.zh.model.devices.size;
    const t = port.targets().find((z) => (z.kind === 'life' || (doors && z.kind === 'exit')) && Math.abs(z.x - wx) < TAPPED && Math.abs(z.x - port.p.x) < TAP_REACH);
    if (t) { e.preventDefault(); port.useLife(t.id, t.owner); }
  }
