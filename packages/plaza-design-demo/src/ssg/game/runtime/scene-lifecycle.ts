import type {PlayerState} from './state';
import type {ZoneGraphSource} from '../world/zone-graph';

import {stepLevelVehicles,saveVehicle} from '../engine/level-vehicles';

import {SceneHost} from "../engine/index";

import {SCENES,type SceneDef,type SceneId} from "../scenes/index";

import { Hints } from "../ui/hints";

import {Companion} from './companion';
import {EDITOR_PLAY} from "./mode";
import {sudoOn} from "./play-profile";
import {type Save} from "./save";
import {levelFloor,levelSeen,levelView,mergeLevels,levelRejoin,seenByZone,splitLevelView,levelZone,savedForLevel,type LevelSource,type Movers} from "../engine/level";

import {joined as zoneJoined,residency,seamsOf,placeFrom} from "../world/zone-graph";
import type {CameraState,ScenesState,PresentationState} from './state';

/** SceneLifecycle functions use runtime-owned data; they never start a loop or own a save. */
export interface SceneLifecyclePort{
  camera: CameraState;
  sceneDefinition: (id: SceneId) => SceneDef;
  scenes: ScenesState;
  zoneGraph: ZoneGraphSource;
  hasScene: (id: string) => id is SceneId;
  hostOf: (id: SceneId) => SceneHost;
  content: Partial<Record<SceneId, SceneDef>>;
  save: Save;
  p: PlayerState;
  movers: Movers;
  interactionHost:SceneHost;
  platformOwner:SceneId|undefined;
  persistSave: () => void;
  zh: SceneHost;
  presentation: PresentationState;
  companionBody: Companion;
  spanW: number;
  markSeen: (id: SceneId) => void;
  canvas: HTMLCanvasElement;
  def: SceneDef;
  syncHud: () => void;
  hints: Hints;
  introduceScene: () => void;
  levelW: number;
}
export function joinLevel(port:SceneLifecyclePort,id: SceneId,cam = port.camera.cam):LevelSource | undefined {
    const s = port.sceneDefinition(id);
    port.scenes.joinedZones = []; port.scenes.zoneTiers = new Map();
    if (!s.level || !zoneJoined(port.zoneGraph, id)) return s.level;
    // the zones around this one that are resident for this camera (world/zone-graph.ts `residency`): visible or near
    const r = residencyAt(port,id, cam), parts = [];
    for (const [z, zr] of r.zones) {
      if (zr.tier === 'unloaded' || !zr.at || !port.hasScene(z)) continue;
      const d = port.sceneDefinition(z); if (!d.level) continue;
      parts.push({ zone: z, source: d.level, dx: zr.at.dx, dh: zr.at.dh, width: d.width });
      port.scenes.zoneTiers.set(z, zr.tier);
      // a visible zone is hosted now (it is drawn); a near one is compiled by `followResidency`, one per frame
      if (z !== id) { port.scenes.joinedZones.push({ id: z, dx: zr.at.dx, dh: zr.at.dh }); if (zr.tier === 'visible') port.hostOf(z); }
    }
    const level=mergeLevels(parts);
    level.vehicleZones=Object.fromEntries([...placeFrom(port.zoneGraph,id,Infinity)].map(([z,p])=>[z,{x:p.dx,h:p.dh}]));
    for(const part of parts){const host=port.scenes.hosts.get(part.zone as SceneId);if(host&&part.source.vehicles?.length)host.model.peopleLevel={...part.source,vehicleZones:Object.fromEntries([...placeFrom(port.zoneGraph,part.zone,Infinity)].map(([z,p])=>[z,{x:p.dx,h:p.dh}]))};}
    return level;
  }

function residencyAt(port:SceneLifecyclePort,id: SceneId,cam: number) {
    const zones: Record<string, { width: number }> = {};
    for (const seam of port.zoneGraph.seams) for (const z of [seam.a.zone, seam.b.zone]) if (port.hasScene(z) && (!port.sceneDefinition(z).sudoOnly || sudoOn() || EDITOR_PLAY)) zones[z] = { width: port.sceneDefinition(z).width };
    const hosted = [...port.scenes.hosts].filter(([z]) => zones[z]), held = hosted.filter(([, h]) => h.overlayOpen || h.popupOpen || h.visionOn || h.acknowledgmentPending);
    const r=residency(port.zoneGraph, { active: id, camera: { x: cam, w: port.camera.viewW }, viewW: port.camera.viewW, zones, hosted: hosted.map(([z]) => z), held: held.map(([z]) => z) });
    // Keep the existing Circuit owner while one of its route zones is active or on screen.
    const placed=placeFrom(port.zoneGraph,id,Infinity);
    const visible=new Set([...r.zones].filter(([,z])=>z.tier==='active'||z.tier==='visible').map(([id])=>id));
    for(const [owner,scene] of Object.entries({...SCENES,...port.content})){
      if(!scene?.level?.vehicles?.some(v=>!v.lift&&v.source.route.legs.some(l=>visible.has(l.zone))&&v.source.route.legs.some(l=>l.zone!==owner&&l.zone!=='here')))continue;
      const at=placed.get(owner);if(!at)continue;
      r.zones.set(owner,{tier:owner===id?'active':'visible',at,gap:0,reason:'active vehicle service'});
      r.evict=r.evict.filter(z=>z!==owner);if(!port.scenes.hosts.has(owner as SceneId)&&!r.load.includes(owner))r.load.push(owner);
    }
    return r;
  }

export function followResidency(port:SceneLifecyclePort) {
    if (!port.scenes.level?.source.zones) return;
    const r = residencyAt(port,port.scenes.here, port.camera.cam);
    const want = [...r.zones].filter(([z, zr]) => zr.tier !== 'unloaded' && zr.at && port.hasScene(z) && port.sceneDefinition(z).level).map(([z]) => z).sort();
    const have = Object.keys(port.scenes.level.source.zones).sort();
    for (const [z, zr] of r.zones) if (port.scenes.zoneTiers.has(z)) port.scenes.zoneTiers.set(z, zr.tier);
    // never drop the zone the player stands in (mid-flight a ride can be in the neighbour's floors)
    if (!want.includes(port.scenes.here)) return;
    const floor = port.scenes.level.state.vehicle?levelZone(port.scenes.level):levelFloor(port.scenes.level).zone; if (floor && !want.includes(floor)) return;
    const source = want.join() === have.join() ? undefined : joinLevel(port,port.scenes.here);
    if (source?.zones) {port.scenes.level = levelRejoin({ source, state: port.scenes.level.state }, source, seenRooms(port,source, port.scenes.here) ?? [], savedForLevel(source, port.scenes.here, port.save.barriers));if(port.scenes.level.state.vehicle)stepLevelVehicles(port.scenes.level,port.p,port.movers);}
    // out of the level now: zones past the eviction distance unload; one zone coming into reach is compiled per frame
    for (const z of r.evict) if (z !== port.scenes.here) unload(port,z as SceneId);
    const next = r.load.find(z => !port.scenes.hosts.has(z as SceneId) && port.hasScene(z)); if (next) port.hostOf(next as SceneId);
    showHosts(port);
  }

export function unload(port:SceneLifecyclePort,id: SceneId) {
    const host = port.scenes.hosts.get(id); if (!host) return;
    host.dispose(); port.scenes.hosts.delete(id);
    if (port.scenes.gameplaySessions.get(id) === host.gameplay) port.scenes.gameplaySessions.delete(id);
  }

export function seenRooms(port:SceneLifecyclePort,source: LevelSource,id: SceneId):string[] | undefined {
    if (!source.zones) return port.save.rooms?.[id];
    return Object.entries(port.save.rooms ?? {}).flatMap(([z, rooms]) => source.zones![z] ? rooms.map(r => z + '/' + r) : []);
  }

export function keepSeenRooms(port:SceneLifecyclePort) {
    const lv = port.scenes.level!, seen = levelSeen(lv);
    const by: Record<string, readonly string[]> = lv.source.zones ? { ...Object.fromEntries(Object.keys(lv.source.zones).map(z => [z, []])), ...seenByZone(seen) } : { [port.scenes.here]: seen };
    let changed = false;
    // a joined level only ever adds rooms (it may not hold every room a zone's save remembers): never shrink a zone's list
    for (const [z, rooms] of Object.entries(by)) if (lv.source.zones ? rooms.length > (port.save.rooms?.[z]?.length ?? 0) : rooms.length !== (port.save.rooms?.[z]?.length ?? 0)) { (port.save.rooms ??= {})[z] = lv.source.zones ? [...new Set([...(port.save.rooms?.[z] ?? []), ...rooms])] : [...rooms]; changed = true; }
    if (changed) port.persistSave();
  }

export function crossInto(port:SceneLifecyclePort,id: SceneId) {
    const to = port.scenes.joinedZones.find(z => z.id === id); if (!to || !port.scenes.level) return;
    const { dx, dh } = to, state = port.scenes.level.state;
    // A vehicle keeps its existing owner while crossing route zones. Its open interaction
    // is still beside the rider; ordinary departures keep the usual close-on-leave behavior.
    const vehicleOwner = saveVehicle(port.scenes.level,port.p,port.scenes.here)?.owner;
    if (vehicleOwner !== port.scenes.here) port.zh.closeAll();
    port.zh.persist(); port.zh.model.player = null;
    port.scenes.here = id;
    if(state.vehicle){state.vehicle.x-=dx;state.vehicle.h-=dh;}
    port.p.x -= dx; port.p.y -= dh; port.camera.cam -= dx; port.camera.camH -= dh; port.camera.gy = port.camera.gyBase + Math.round(port.camera.camH);
    if (port.presentation.bubble) { port.presentation.bubble.x -= dx; port.presentation.bubble.h -= dh; }
    port.companionBody.x -= dx; port.companionBody.h -= dh;
    port.camera.nudge = null; port.camera.easeBack = false;
    const source = joinLevel(port,id)!;
    port.scenes.level = levelRejoin({ source, state }, source, seenRooms(port,source, id) ?? [], savedForLevel(source, id, port.save.barriers));
    if(state.vehicle)stepLevelVehicles(port.scenes.level,port.p,port.movers);
    // the view keeps its scale over a seam (only a cut refits it)
    port.camera.fitW = port.spanW;
    showHosts(port);
    port.markSeen(id);
    port.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + port.def.name);
    port.syncHud();
    port.hints.sceneChanged();
    port.introduceScene();
  }

export function levelViewOf(port:SceneLifecyclePort,id: SceneId) {
    const view = levelView(port.scenes.level!, port.movers, port.p);
    return port.scenes.level!.source.zones ? splitLevelView(view, id) : view;
  }

export function seamAt(port:SceneLifecyclePort,edge: 'left' | 'right') { return !!port.scenes.level && !levelFloor(port.scenes.level).building && seamsOf(port.zoneGraph, port.scenes.here).some(s => s.seam.kind === 'walk' && port.scenes.joinedZones.some(z => z.id === s.other) && (edge === 'right' ? s.dx > 0 : s.dx < 0)); }

export function worldSpan(port:SceneLifecyclePort):[number, number] {
    let lo = 0, hi = port.levelW;
    for (const z of port.scenes.joinedZones) { lo = Math.min(lo, z.dx); hi = Math.max(hi, z.dx + port.sceneDefinition(z.id).width); }
    const vehicle=port.scenes.level?.state.vehicle;
    if(vehicle)for(const floor of port.scenes.level!.source.floors)if(floor.zone===vehicle.id){lo=Math.min(lo,floor.x);hi=Math.max(hi,floor.x+floor.w);}
    return [lo, hi];
  }

/** Apply host visibility and departure disposal under the same lifecycle owner as residency. */
export function showHosts(port:SceneLifecyclePort){
 const here=port.zh,input=port.interactionHost,railOwner=port.platformOwner;
 if(railOwner)port.hostOf(railOwner);
 for(const[id,host]of port.scenes.hosts){
  if(host!==here&&id!==railOwner&&!port.scenes.joinedZones.some(z=>z.id===id)){unload(port,id);continue;}
  host.show(host===input,host===input||host===here||port.scenes.zoneTiers.get(id)==='visible');
 }
}
