import {compileSceneCompanion} from './scene-companion';
import {sceneEnvironment,type SceneEnvironment} from './scene-environment';
import type {Resolved} from '../../art';
import type {SceneDef,UseCtx,SceneSaid} from '../../scenes/kit';
import {compileSceneDocument,type SceneDocument} from './scene-document';
import {manifestGeometry,type BoundPoint} from './manifest-geometry';
import type {ManifestGroup} from './manifest-contract';
/** Shared content projection; registered controllers still own actors and specialized simulation. */
export function compileManifestDocument(source:SceneDocument,rows:readonly Resolved[],talk:(c:UseCtx,id:string,goal:string)=>SceneSaid,options:{groups?:readonly ManifestGroup[];groundExits?:boolean;groundSpawn?:boolean;transformedExits?:boolean;elevatedResponses?:boolean;omitGroundRestHeight?:boolean}={}){
 const geometry=manifestGeometry(source,rows,options.groups,options),positions=Object.fromEntries(Object.entries(geometry.bindings.uses).map(([id,p])=>[id,p.x])),compiled=compileSceneDocument(source,positions,talk);
 const heights=(row:{promptH?:number;h?:number},point:BoundPoint,defaultHeight:number)=>{
  const promptH=row.promptH??point.promptH,h=row.h??point.responseH??(options.elevatedResponses&&point.h?point.h+defaultHeight:undefined);
  return{...(promptH!==undefined?{promptH}:{}),...(h!==undefined?{h}:{})};
 };
 const content:Pick<SceneDef,'width'|'spawn'|'uses'|'readables'|'rests'|'exits'|'objective'|'objectives'|'attention'|'storyMinute'|'storyDay'|'pixel'|'perch'|'companion'|keyof SceneEnvironment>={
  ...sceneEnvironment(source.environment),...compileSceneCompanion(source.companion,rows,geometry.width),width:geometry.width,spawn:geometry.spawn,uses:compiled.uses.map(u=>({...u,...heights(u,geometry.bindings.uses[u.id],60)})),
  readables:source.readables?.map(r=>({...r,x:geometry.bindings.readables[r.id].x,...heights(r,geometry.bindings.readables[r.id],70)})),
  rests:source.rests?.map(r=>{const h=geometry.bindings.rests[r.id].h+(r.h??0);return{...r,x:geometry.bindings.rests[r.id].x,...(!options.omitGroundRestHeight||h!==0||r.h!==undefined?{h}:{}),...(r.promptH!==undefined?{promptH:r.promptH}:geometry.bindings.rests[r.id].promptH!==undefined?{promptH:geometry.bindings.rests[r.id].promptH}:{})};}),
  exits:(source.exits??[]).map(e=>({...e,x:geometry.bindings.exits[e.id].x,...heights(e,geometry.bindings.exits[e.id],0),...(geometry.exitCheckpoints[e.id]?{checkpoint:{x:geometry.exitCheckpoints[e.id].x,h:geometry.exitCheckpoints[e.id].h}}:{})})),
  objectives:compiled.objectives,objective:compiled.objective,attention:compiled.attention?((flags,state)=>compiled.attention!(flags,undefined,state)):undefined,storyMinute:compiled.minute,storyDay:compiled.day,
 };
 return{geometry,content};
}
