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

import {mobileRouteExtent,placementCoordinates,joined as zoneJoined,residency,seamsOf,placeFrom} from "../world/zone-graph";
import type {CameraState,ScenesState,PresentationState} from './state';

/** SceneLifecycle functions use runtime-owned data; they never start a loop or own a save. */
export interface SceneLifecyclePort{
  camera: CameraState;
  ambientTime?:number;
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
 for(const owner of placed.keys()){
      if(!port.hasScene(owner))continue;const scene=port.sceneDefinition(owner);
      if(scene.sudoOnly&&!sudoOn()&&!EDITOR_PLAY&&!port.scenes.directedZones.has(owner))continue;
      if(!scene.mobileExtent)continue;
      const range=mobileRouteExtent(owner,scene,placed);
      // Residency policy is intentionally wider than the scenery viewport.
      const near=range.to>cam-port.camera.viewW&&range.from<cam+port.camera.viewW*2;
      if(near)owners.push(owner);
 }
 return owners;
}

export function joinLevel(port:SceneLifecyclePort,id: SceneId,cam = port.camera.cam):LevelSource | undefined {
    const s = port.sceneDefinition(id);
    port.scenes.joinedZones = []; port.scenes.zoneTiers = new Map();port.scenes.zoneReasons=new Map();port.scenes.mobileOwners=new Set();
    if (!s.level || !zoneJoined(port.zoneGraph, id)) return s.level;
    // the zones around this one that are resident for this camera (world/zone-graph.ts `residency`): visible or near
    const r = residencyAt(port,id, cam), parts = [];
    port.scenes.zoneReasons=new Map([...r.zones].map(([id,row])=>[id,row.reason]));
    for (const [z, zr] of r.zones) {
      if (zr.tier === 'unloaded' || !zr.at || !port.hasScene(z)) continue;
      const d = port.sceneDefinition(z);
      if(d.level)parts.push({ zone: z, source: d.level, dx: zr.at.dx, dh: zr.at.dh, width: d.width });
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

    level.vehicleZones=placementCoordinates(placeFrom(port.zoneGraph,id,Infinity));
    for(const owner of owners){const model=port.scenes.hosts.get(owner)?.model??port.scenes.mobiles.get(owner)?.model,source=port.sceneDefinition(owner).level;if(model&&source){const offsets=placeFrom(port.zoneGraph,owner,Infinity);model.peopleLevel={...source,vehicleZones:placementCoordinates(offsets),zones:Object.fromEntries([...offsets].filter(([z])=>port.hasScene(z)).map(([z,p])=>[z,{x:p.dx,h:p.dh,w:port.sceneDefinition(z as SceneId).width}]))};}}
    return level;
  }

function residencyAt(port:SceneLifecyclePort,id: SceneId,cam: number) {
    const zones: Record<string, { width: number }> = {};
    for (const z of new Set([id,...port.zoneGraph.seams.flatMap(s=>[s.a.zone,s.b.zone]),...(port.zoneGraph.placements??[]).flatMap(p=>[p.a,p.b])])) if (port.hasScene(z) && (!port.sceneDefinition(z).sudoOnly || sudoOn() || EDITOR_PLAY || port.scenes.directedZones.has(z))) zones[z] = { width: port.sceneDefinition(z).width };
    const hosted = [...port.scenes.hosts].filter(([z]) => zones[z]), held = hosted.filter(([, h]) => h.overlayOpen || h.popupOpen || h.visionOn || h.acknowledgmentPending);
    const r=residency(port.zoneGraph, { active: id, camera: { x: cam, w: port.camera.viewW }, viewW: port.camera.viewW, zones, hosted: hosted.map(([z]) => z), held: held.map(([z]) => z) });
    // A source chunk is resident only for its scenery, never to keep a mobile alive.
    const placed=placeFrom(port.zoneGraph,id,Infinity);
    for(const[owner,at]of placed){
      if(owner===id||!port.hasScene(owner))continue;
      const scene=port.sceneDefinition(owner),model=port.scenes.hosts.get(owner)?.model??port.scenes.mobiles.get(owner)?.model;
      if(scene.sudoOnly&&!sudoOn()&&!EDITOR_PLAY&&!port.scenes.directedZones.has(owner))continue;
      const view={...frameView(port.ambientTime??0),flags:port.save.flags,artworkScope:'static' as const,viewW:port.camera.viewW,viewH:port.camera.viewH,cam:cam-at.dx,gy:port.camera.gy-at.dh,y:(h:number)=>port.camera.gy-at.dh-h,sx:(x:number,p=1)=>x-(cam-at.dx)*p};
      if(scene.artworkVisible?.(view,model)){
        r.zones.set(owner,{tier:'visible',at,gap:0,reason:'visible artwork bounds'});
        r.evict=r.evict.filter(z=>z!==owner);if(!port.scenes.hosts.has(owner)&&!r.load.includes(owner))r.load.push(owner);
      }
    }
    return r;
  }

export function followResidency(port:SceneLifecyclePort) {
    const origin=port.scenes.directedOrigin;
    if(origin&&port.hasScene(origin)&&!placeFrom(port.zoneGraph,port.scenes.here,Infinity).has(origin)){
      // Disconnected interiors and a directing camera have independent references. Camera
      // residency never merges those unrelated floors or rebases the stationary player.
      const r=residencyAt(port,origin,port.camera.cam);
      port.scenes.zoneReasons=new Map([...r.zones].map(([id,row])=>[id,row.reason]));
      port.scenes.zoneTiers=new Map([...r.zones].map(([id,row])=>[id,row.tier==='active'?'visible':row.tier]));
      port.scenes.zoneTiers.set(port.scenes.here,'active');
      const owners=new Set([...mobileOwnersAt(port,origin,port.camera.cam),...mobileOwnersAt(port,port.scenes.here,port.p.x-port.camera.viewW*.45)]);
      port.scenes.mobileOwners=owners;
      for(const [id,row]of r.zones)if(row.tier==='visible'||row.tier==='active')port.hostOf(id as SceneId);
      const next=r.load.find(id=>!port.scenes.hosts.has(id as SceneId)&&port.hasScene(id));if(next)port.hostOf(next as SceneId);
      for(const owner of owners){const model=port.scenes.hosts.get(owner)?.model??port.scenes.mobiles.get(owner)?.model??port.hostOf(owner).model,source=port.sceneDefinition(owner).level;if(source)model.peopleLevel={...source,vehicleZones:placementCoordinates(placeFrom(port.zoneGraph,owner,Infinity))};}
      for(const id of r.evict)if(id!==port.scenes.here)unload(port,id as SceneId);
      showHosts(port);return;
    }
    if (!port.scenes.level?.source.zones) return;
    const r = residencyAt(port,port.scenes.here, port.camera.cam);
    port.scenes.zoneReasons=new Map([...r.zones].map(([id,row])=>[id,row.reason]));
    const want = [...r.zones].filter(([z, zr]) => zr.tier !== 'unloaded' && zr.at && port.hasScene(z) && port.sceneDefinition(z).level).map(([z]) => z).sort();
    const have = Object.keys(port.scenes.level.source.zones).sort();
    for (const [z, zr] of r.zones) if (port.scenes.zoneTiers.has(z)) port.scenes.zoneTiers.set(z, zr.tier);
    // never drop the zone the player stands in (mid-flight a ride can be in the neighbour's floors)
    if (!want.includes(port.scenes.here)) return;
    const floor = port.scenes.level.state.vehicle?levelZone(port.scenes.level):levelFloor(port.scenes.level).zone; if (floor && !want.includes(floor)) return;
    const owners=mobileOwnersAt(port,port.scenes.here,port.camera.cam);
    const sameMobiles=owners.length===port.scenes.mobileOwners.size&&owners.every(id=>port.scenes.mobileOwners.has(id));
    const visual=[...r.zones].filter(([z,zr])=>z!==port.scenes.here&&zr.tier!=='unloaded'&&zr.at&&port.hasScene(z)).map(([z])=>z).sort();
    const sameVisuals=visual.join()===port.scenes.joinedZones.map(z=>z.id).sort().join();
    const source = want.join() === have.join()&&sameMobiles&&sameVisuals ? undefined : joinLevel(port,port.scenes.here);
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
  if(host!==here&&host!==input&&id!==railOwner&&!port.scenes.joinedZones.some(z=>z.id===id)&&!(port.scenes.directedOrigin&&port.scenes.directedZones.has(id)&&port.scenes.zoneTiers.has(id)&&port.scenes.zoneTiers.get(id)!=='unloaded')){unload(port,id);continue;}
  host.show(host===input,host===input||host===here||port.scenes.zoneTiers.get(id)==='visible');
 }
    for(const[id,core]of port.scenes.mobiles)if(!port.scenes.mobileOwners.has(id)){
      const {state,...checkpoint}=core.model.snapshot();port.save.scenes[id]={...checkpoint,...(port.save.scenes[id]?.board?{board:port.save.scenes[id]!.board}:{})};
      core.gameplay?.dispose();core.model.dispose();port.scenes.mobiles.delete(id);port.scenes.gameplaySessions.delete(id);
    }
}

/** Rebuild shared geometry after a coherent membership commit, retaining the existing player state. */
export function refreshWorldMembership(port:SceneLifecyclePort){
 const previous=port.scenes.level,source=joinLevel(port,port.scenes.here);
 if(previous&&source)port.scenes.level=levelRejoin(previous,source,seenRooms(port,source,port.scenes.here)??[],savedForLevel(source,port.scenes.here,port.save.barriers));
 showHosts(port);
}

/** Internal disposal dependencies. Being loaded is deliberately insufficient to block unmounting. */
export function compositionDependencies(port:SceneLifecyclePort){
 const dependencies:{chunk:string;reason:string}[]=[{chunk:port.scenes.here,reason:'player'}];
 const floor=port.scenes.level&&levelFloor(port.scenes.level).zone;if(floor)dependencies.push({chunk:floor,reason:'occupied floor'});
 for(const[chunk,tier]of port.scenes.zoneTiers)if(tier==='visible')dependencies.push({chunk,reason:'camera'});
 for(const[chunk,host]of port.scenes.hosts)if(host.overlayOpen||host.popupOpen||host.visionOn||host.acknowledgmentPending)dependencies.push({chunk,reason:'interaction'});
 for(const owner of port.scenes.mobileOwners){
  const source=port.sceneDefinition(owner);dependencies.push({chunk:owner,reason:'live mobile source'});
  for(const vehicle of source.level?.vehicles??[])for(const leg of vehicle.source.route.legs)dependencies.push({chunk:leg.zone==='here'?owner:leg.zone,reason:'live vehicle route'});
  for(const flow of source.peopleFlows??[])for(const point of [...flow.flow.route,...flow.exit])dependencies.push({chunk:point.zone,reason:'live pedestrian route'});
 }
 return dependencies;
}

/** Read-only diagnostics from the actual mobile models; current zone is derived, never another owner. */
export function inspectMobiles(port:SceneLifecyclePort){return [...port.scenes.mobileOwners].flatMap(owner=>{
 const model=port.scenes.hosts.get(owner)?.model??port.scenes.mobiles.get(owner)?.model;if(!model)return [];
 return [{source:owner,hosted:port.scenes.hosts.has(owner),time:model.now(),vehicles:model.peopleLevel?levelVehicleFrames(model.peopleLevel,model).map(f=>({id:owner+'/'+f.vehicle.id,zone:f.pose.zone==='here'?owner:f.pose.zone,x:f.pose.x,h:f.pose.h})):[],people:Object.entries(model.people.pictures).flatMap(([flow,people])=>people.map(p=>({flow,...p})))}];
});}
