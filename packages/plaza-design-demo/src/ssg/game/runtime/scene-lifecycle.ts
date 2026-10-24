import {levelVehicleFrames} from '../engine/level-vehicles';
import {frameView} from '../art/core/view';
import type {PlayerState} from './state';
import type {ZoneGraphSource} from '../world/zone-graph';

import {stepLevelVehicles,saveVehicle} from '../engine/level-vehicles';

import {SceneHost} from "../engine/index";

import {type SceneDef,type SceneId} from "../scenes/index";

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
/** Relevant mobile sources are selected by route/flow extent, independently of host residency. */
function mobileOwnersAt(port:SceneLifecyclePort,id:SceneId,cam:number){
 const placed=placeFrom(port.zoneGraph,id,Infinity),owners:SceneId[]=[];
 for(const[owner,at]of placed){
      if(!port.hasScene(owner))continue;const scene=port.sceneDefinition(owner);
      if(scene.sudoOnly&&!sudoOn()&&!EDITOR_PLAY)continue;
      if(!scene.mobileExtent)continue;
      const flowExtents=(scene.peopleFlows??[]).flatMap(f=>[...f.flow.route,...f.exit].flatMap(w=>{const p=placed.get(w.zone);return p?[p.dx+w.x]:[];}));
      const extents=[...(scene.mobileExtent?[at.dx+scene.mobileExtent.from,at.dx+scene.mobileExtent.to]:[]),...flowExtents,...(scene.level?.vehicles??[]).filter(v=>!v.lift).flatMap(v=>v.source.route.legs.flatMap(l=>{const p=placed.get(l.zone==='here'?owner:l.zone);return p?[p.dx+l.from.x,p.dx+l.to.x]:[];}))];
      // Flow/character extents include their complete authored path; vehicle services use the route envelope.
      const near=extents.length?Math.max(...extents)>cam-port.camera.viewW&&Math.min(...extents)<cam+port.camera.viewW*2:at.dx+scene.width>cam-port.camera.viewW&&at.dx<cam+port.camera.viewW*2;
      if(near)owners.push(owner);
 }
 return owners;
}

export function joinLevel(port:SceneLifecyclePort,id: SceneId,cam = port.camera.cam):LevelSource | undefined {
    const s = port.sceneDefinition(id);
    port.scenes.joinedZones = []; port.scenes.zoneTiers = new Map();port.scenes.mobileOwners=new Set();
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
    const owners=new Set<SceneId>();
    for(const owner of mobileOwnersAt(port,id,cam)){
      owners.add(owner);if(!port.scenes.hosts.has(owner)&&!port.scenes.mobiles.has(owner))port.hostOf(owner);
    }
    port.scenes.mobileOwners=owners;
    const level=mergeLevels(parts);
    for(const owner of owners)if(!parts.some(p=>p.zone===owner))for(const v of port.sceneDefinition(owner).level?.vehicles??[])if(!v.lift)(level.vehicles??=[]).push({...v,id:owner+'/'+v.id,zone:owner});

    level.vehicleZones=Object.fromEntries([...placeFrom(port.zoneGraph,id,Infinity)].map(([z,p])=>[z,{x:p.dx,h:p.dh}]));
    for(const owner of owners){const model=port.scenes.hosts.get(owner)?.model??port.scenes.mobiles.get(owner)?.model,source=port.sceneDefinition(owner).level;if(model&&source){const offsets=placeFrom(port.zoneGraph,owner,Infinity);model.peopleLevel={...source,vehicleZones:Object.fromEntries([...offsets].map(([z,p])=>[z,{x:p.dx,h:p.dh}])),zones:Object.fromEntries([...offsets].filter(([z])=>port.hasScene(z)).map(([z,p])=>[z,{x:p.dx,h:p.dh,w:port.sceneDefinition(z as SceneId).width}]))};}}
    return level;
  }

function residencyAt(port:SceneLifecyclePort,id: SceneId,cam: number) {
    const zones: Record<string, { width: number }> = {};
    for (const seam of port.zoneGraph.seams) for (const z of [seam.a.zone, seam.b.zone]) if (port.hasScene(z) && (!port.sceneDefinition(z).sudoOnly || sudoOn() || EDITOR_PLAY)) zones[z] = { width: port.sceneDefinition(z).width };
    const hosted = [...port.scenes.hosts].filter(([z]) => zones[z]), held = hosted.filter(([, h]) => h.overlayOpen || h.popupOpen || h.visionOn || h.acknowledgmentPending);
    const r=residency(port.zoneGraph, { active: id, camera: { x: cam, w: port.camera.viewW }, viewW: port.camera.viewW, zones, hosted: hosted.map(([z]) => z), held: held.map(([z]) => z) });
    // A source chunk is resident only for its scenery, never to keep a mobile alive.
    const placed=placeFrom(port.zoneGraph,id,Infinity);
    for(const[owner,at]of placed){
      if(owner===id||!port.hasScene(owner))continue;
      const scene=port.sceneDefinition(owner),model=port.scenes.hosts.get(owner)?.model??port.scenes.mobiles.get(owner)?.model;
      const view={...frameView(0),artworkScope:'static' as const,viewW:port.camera.viewW,viewH:port.camera.viewH,cam:cam-at.dx,gy:port.camera.gy-at.dh,y:(h:number)=>port.camera.gy-at.dh-h,sx:(x:number,p=1)=>x-(cam-at.dx)*p};
      if(scene.artworkVisible?.(view,model)){
        r.zones.set(owner,{tier:'visible',at,gap:0,reason:'visible artwork bounds'});
        r.evict=r.evict.filter(z=>z!==owner);if(!port.scenes.hosts.has(owner)&&!r.load.includes(owner))r.load.push(owner);
      }
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
    const owners=mobileOwnersAt(port,port.scenes.here,port.camera.cam);
    const sameMobiles=owners.length===port.scenes.mobileOwners.size&&owners.every(id=>port.scenes.mobileOwners.has(id));
    const source = want.join() === have.join()&&sameMobiles ? undefined : joinLevel(port,port.scenes.here);
    if (source?.zones) {port.scenes.level = levelRejoin({ source, state: port.scenes.level.state }, source, seenRooms(port,source, port.scenes.here) ?? [], savedForLevel(source, port.scenes.here, port.save.barriers));if(port.scenes.level.state.vehicle)stepLevelVehicles(port.scenes.level,port.p,port.movers);}
    // out of the level now: zones past the eviction distance unload; one zone coming into reach is compiled per frame
    for (const z of r.evict) if (z !== port.scenes.here) unload(port,z as SceneId);
    const next = r.load.find(z => !port.scenes.hosts.has(z as SceneId) && port.hasScene(z)); if (next) port.hostOf(next as SceneId);
    showHosts(port);

  }

export function unload(port:SceneLifecyclePort,id: SceneId) {
    const host = port.scenes.hosts.get(id); if (!host) return;
    const retained=port.scenes.mobileOwners.has(id);
    if(retained)port.scenes.mobiles.set(id,{model:host.model,gameplay:host.gameplay});
    host.model.player=null;host.dispose(retained); port.scenes.hosts.delete(id);
    if (!retained&&port.scenes.gameplaySessions.get(id) === host.gameplay) port.scenes.gameplaySessions.delete(id);
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
  if(host!==here&&host!==input&&id!==railOwner&&!port.scenes.joinedZones.some(z=>z.id===id)){unload(port,id);continue;}
  host.show(host===input,host===input||host===here||port.scenes.zoneTiers.get(id)==='visible');
 }
    for(const[id,core]of port.scenes.mobiles)if(!port.scenes.mobileOwners.has(id)){
      const {state,...checkpoint}=core.model.snapshot();port.save.scenes[id]={...checkpoint,...(port.save.scenes[id]?.board?{board:port.save.scenes[id]!.board}:{})};
      core.gameplay?.dispose();core.model.dispose();port.scenes.mobiles.delete(id);port.scenes.gameplaySessions.delete(id);
    }
}

/** Read-only diagnostics from the actual mobile models; current zone is derived, never another owner. */
export function inspectMobiles(port:SceneLifecyclePort){return [...port.scenes.mobileOwners].flatMap(owner=>{
 const model=port.scenes.hosts.get(owner)?.model??port.scenes.mobiles.get(owner)?.model;if(!model)return [];
 return [{source:owner,hosted:port.scenes.hosts.has(owner),time:model.now(),vehicles:model.peopleLevel?levelVehicleFrames(model.peopleLevel,model).map(f=>({id:owner+'/'+f.vehicle.id,zone:f.pose.zone==='here'?owner:f.pose.zone,x:f.pose.x,h:f.pose.h})):[],people:Object.entries(model.people.pictures).flatMap(([flow,people])=>people.map(p=>({flow,...p})))}];
});}
