import {platformFrame} from './metro/platform-frame';
import {resolveArtworkRoles} from '../engine/gameplay/artwork-roles';
import {transitActors,transitActorBindings,validateTransitActorNode,validateTransitBenchNodes} from './metro/transit-actors';
import type {Character} from '../runtime/characters';
import type {SceneDocument} from '../engine/gameplay/scene-document';
import {manifestGeometry} from '../engine/gameplay/manifest-geometry';
import { frameView } from '../art/core/view';
/** Station-specific composition/state adapter, shared by the two LINE 0 platforms. */
import { art } from '../art';
import { drawComposition,resolveComposition,type Composition,type Environment,type Instance,type Value } from '../art/core/composition';
import type { View } from '../art/core/view';
import type { SceneDef } from './kit';
import * as defaultMetro from '../world/transport/line';
import type {LineSystem} from '../world/transport/line';
import type {CityModel} from '../world/city';
export type StationRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>> & {metro?:LineSystem;city?:CityModel};
export const stationMarkerPolicy={exitAxes:['x'] as const,platformStopAxes:['x'] as const,platformTrainGeometry:'Horizontal stop position drives artwork, boarding doors and train arrival; height, scale, mirror and parallax remain fixed'} as const;
const all=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...all(n.children??[])]);
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,t:0,cam:0,gy:0,viewW:1200,viewH:360,flags:{}};
export function createStationComposition(id:'galleriaStation'|'harborStation',source:unknown,canonical:SceneDocument){
 const station=id==='galleriaStation'?'galleria':'harbor';
 const original=art.validate(source);
 function defaults(doc:Composition){const result:Record<string,Value>={};for(const node of all(doc.instances))for(const[field,name]of Object.entries(node.bindings??{}))result[name]=art.get(node.type).visualFields![field].default;return result;}
 function geometry(doc:Composition=composition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
 function validate(input:unknown):Composition{
  const doc=art.validate(input);if(doc.scene!==id)throw new Error('Expected '+id+' composition');
  const nodes=all(doc.instances);validateTransitBenchNodes(nodes);
  for(const node of nodes){if(validateTransitActorNode(id,node))continue;for(const name of Object.values(node.bindings??{}))if(!['architecture.roof','transit.train','transit.departure','transit.closed'].includes(name)&&!/^actor\.[-a-zA-Z0-9_.]+\.pose\.embedded$/.test(name))throw new Error(node.id+': unknown station binding '+name);}
  for(const stop of geometry(doc).filter(r=>r.instance.type==='station.train').map(r=>r.placement))if(stop.h!==0||stop.scale!==1||stop.facing!==1||stop.parallax!==1)throw new Error('Transport supports horizontal stop edits only');
  return doc;
 }
 const composition=validate(original);
 function artwork(doc:Composition,sceneDocument:SceneDocument,g=geometry(doc)){const roles=resolveArtworkRoles(id,sceneDocument.manifest?.artwork,g);for(const role of ['roof','stop',...(station==='harbor'?['water']:[])])if(!roles[role])throw Error(id+' requires artwork role '+role);return roles;}
 function environment(doc:Composition,view:View,state:Environment['state']={},options:StationRenderOptions={},sceneDocument:SceneDocument=canonical,actors?:Readonly<Record<string,Character>>):Environment{
  const {metro=defaultMetro,city,...renderOptions}=options;
  const bindings=defaults(doc),g=geometry(doc),roles=artwork(doc,sceneDocument,g),roof=roles.roof;bindings['architecture.roof']=roof.placement.h+Number(roof.props.under);
  Object.assign(bindings,platformFrame(id,roles.stop.placement.x,view,metro,city));
  Object.assign(bindings,transitActorBindings(sceneDocument,g,view,{metro,city},actors));
  return{view,bindings,state,reduced:false,...renderOptions};
 }
 function layout(doc:Composition=composition,sceneDocument:SceneDocument=canonical){const rows=geometry(doc),ordinary=manifestGeometry(sceneDocument,rows,[],{groundSpawn:false}),roles=artwork(doc,sceneDocument,rows),roof=roles.roof;return{width:ordinary.width,horizon:Number(roles.water?.props.horizon??0),canopy:{under:Number(roof.props.under)+roof.placement.h,fascia:Number(roof.props.top)+roof.placement.h}};}
 function draw(ctx:CanvasRenderingContext2D,view:View,doc:Composition=composition,state:Environment['state']={},options:StationRenderOptions={},sceneDocument:SceneDocument=canonical,actors?:Readonly<Record<string,Character>>){drawComposition(ctx,art,doc,environment(doc,view,state,options,sceneDocument,actors),'backdrop');}
 function adapt(scene:Omit<SceneDef,'drawBackdrop'>,document:Composition=composition,state:Environment['state']={},options:StationRenderOptions={},sceneDocument:SceneDocument=canonical):SceneDef{
  const doc=validate(document),g=geometry(doc),roles=artwork(doc,sceneDocument,g),l=layout(doc,sceneDocument),actors=transitActors(sceneDocument,g);
  return{...scene,people:(sceneDocument.actors??[]).filter(a=>a.band==='world').map(a=>actors[a.id]),platformStop:roles.stop.placement.x,
   ...(station==='harbor'?{horizon:l.horizon,ambient:{...scene.ambient,covers:[{from:-60,to:l.width+60,under:l.canopy.under}]}}:{}),
   visualEnvironment:view=>environment(doc,view,state,options,sceneDocument,actors),
   drawBackdrop:(ctx,view)=>draw(ctx,view,doc,state,options,sceneDocument,actors),
  };
 }
 return{composition,validate,geometry,environment,layout,draw,adapt};
}
