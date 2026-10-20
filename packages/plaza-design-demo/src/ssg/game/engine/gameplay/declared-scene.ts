import {projectSceneState,type SceneDeviceSource} from './scene-state';
import {emptyData} from '../empty-data';
import {nativeDeviceData} from './native-bindings';
import {projectDeviceBindings} from './device-bindings';
import {compileManifestDocument} from './manifest-content-compiler';
import {art,resolveComposition,drawComposition,type Environment} from '../../art';
import {frameView} from '../../art/core/view';
import {drawReviewRoom} from '../../art/assemblies/review-room';
import {residentCharacter} from '../../art/characters/resident';
import {manifestGeometry} from './manifest-geometry';
import {withSceneConversations,actorConversationId} from './scene-conversations';
import type {SceneDef} from '../../scenes/kit';
import {validateSceneDocument,type SceneDocument} from './scene-document';
import {compileLevel,levelOpacity,restingLevelView} from '../level';
import type {GameplayDefinition} from './types';
import type {View} from '../../art/core/view';
import type {EngineDraw} from '../host';
import {compileSceneActors} from './actors';
import {bindingDefaults,bindingValues,unknownBindingSources} from './binding-sources';
import {stageContent} from './scene-stage';
import {dockworkerCarry} from './scene-presentation';
import {SCENE_MECHANISMS} from './scene-mechanisms';
import type {CityModel} from '../../world/city';
import type {LineSystem} from '../../world/transport/line';

export function validateDeclaredScene(scene:SceneDocument,composition:unknown,gameplay:GameplayDefinition){
 const withActors=Array.isArray((scene as {actors?:unknown}).actors);
 const d=validateSceneDocument(scene,gameplay,{manifest:true,actors:withActors}),doc=art.validate(composition);
 if(!d.manifest)throw new Error('Declared scene requires manifest bindings');
 if(d.exits?.some(e=>e.engine))throw new Error('Engine exits require their registered controller');
 if(d.exits?.some(e=>e.sets&&!gameplay.flags.includes(e.sets)))throw new Error('Exit sets an undeclared gameplay flag');
 // artwork binds only to sources the engine works out (binding-sources.ts)
 if(!withActors&&JSON.stringify(doc.instances).match(/"actor\.[^"]+\.pose"/))throw new Error('Actor artwork requires scene.actors source definitions');
 const unknown=unknownBindingSources(doc);if(unknown.length)throw new Error('Unknown binding sources: '+unknown.join(', '));
 const rows=resolveComposition(art,doc,{view:frameView(0),state:{},bindings:bindingDefaults(doc),reduced:false});
 const compile=d.manifest.compile,geometry=compile?manifestGeometry(d,rows,compile.groups,compile):manifestGeometry(d,rows),bindings=geometry.bindings;
 // a scene's people are either its actors (scene.actors, with their artwork) or residents placed by the manifest
 const actors=withActors?compileSceneActors(d,rows):{};
 const people=withActors?d.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]):(d.people??[]).filter(p=>bindings.people?.[p.id]).map(p=>{const point=bindings.people[p.id],r=point.row;if(r.element.type!=='character.resident'||r.instance.layer!=='playfield')throw new Error('Person requires visible character.resident artwork in the playfield layer: '+p.id);return {...residentCharacter(r.props,point),...p,...(p.conversation!==undefined?{talk:[]}:{}),conversation:p.conversation??actorConversationId(d.id,p.id)};});
 for(const name of d.stage?.mechanisms??[])for(const role of SCENE_MECHANISMS[name].requires)if(!geometry.artwork[role])throw new Error('Scene mechanism '+name+' requires artwork role '+role);
 const positions=Object.fromEntries(Object.entries(bindings.uses).map(([id,r])=>[id,r.x]));
 return {scene:d,composition:doc,positions,people,actors,rows,...geometry};
}
/** Validate against the prospective registry; the same rule supports existing and newly authored scenes. */
export function validateDeclaredDestinations(scene:SceneDocument,destinations:Readonly<Record<string,readonly string[]>>){
 for(const exit of scene.exits??[]){const arrivals=exit.to===scene.id?(scene.exits??[]).map(e=>e.id):destinations[exit.to];
  if(!arrivals||exit.at&&!arrivals.includes(exit.at))throw new Error('Unknown declared exit destination/arrival: '+exit.to+(exit.at?'/'+exit.at:''));
 }
}
/** The same factory handles every instance; source contains no executable scripts or renderer selection. */
export function declaredScene(scene:SceneDocument,composition:unknown,gameplay:GameplayDefinition,options:Partial<Environment>={},devices?:SceneDeviceSource,world?:{city:CityModel;metro:LineSystem}):SceneDef{
 const validated=validateDeclaredScene(scene,composition,gameplay),d=validated.scene,rows=validated.rows;
 const data=nativeDeviceData(projectDeviceBindings(d,rows,projectSceneState(devices??emptyData(d.id,d.name),gameplay),validated.width),gameplay);
 const compiled=compileManifestDocument(d,rows,(_c,id)=>({name:d.name,pages:[],conversation:id}),d.manifest!.compile??{elevatedResponses:true}),roles=compiled.geometry.artwork;
 // a level (floors, stairs, lifts, buildings): its lifts and building reveal come from the frame's View.level
 const level=compileLevel(rows),manifest=d.manifest!;
 // the grey review room stands in for a room until the composition paints its own backdrop
 const mechanisms=(d.stage?.mechanisms??[]).map(name=>SCENE_MECHANISMS[name]);
 const ownRoom=rows.some(r=>r.instance.layer==='backdrop'||r.instance.layer==='distance')||mechanisms.some(m=>m.ownsRoom),front=rows.some(r=>r.instance.layer==='foreground');
 const instanceOf=(t:unknown)=>typeof t==='string'?t:(t as {instance:string}).instance,heightOf=(t:unknown)=>rows.find(r=>r.instance.id===instanceOf(t))?.placement.h??0;
 const environment=(view:View,engine?:EngineDraw):Environment=>{const live=level?view.level??restingLevelView(level,false):undefined;
  return {...options,view,state:{...(options.state??{}),...(live?Object.fromEntries(Object.entries(live.lifts).map(([id,c])=>[id,{car:c.car,doors:c.doors}])):{})},...(level&&live?{opacity:{...(options.opacity??{}),...levelOpacity(level,live)}}:{}),
   bindings:bindingValues(validated.composition,{view,rows,roles,actors:validated.actors,source:d,gameplay,uses:compiled.content.uses,engine,world},d.stage?.actors),reduced:options.reduced??false};};
 const draw=(ctx:CanvasRenderingContext2D,view:View,engine?:EngineDraw,inFront=false)=>{const env=environment(view,engine);if(!inFront){if(!level&&!ownRoom)drawReviewRoom(ctx,view);for(const pass of ['backdrop','devices','people'] as const)drawComposition(ctx,art,validated.composition,env,pass);}else drawComposition(ctx,art,validated.composition,env,'foreground');};
 const exits=level?compiled.content.exits.map(e=>({...e,arriveH:heightOf(manifest.exits?.[e.id])})):compiled.content.exits;
 const base:SceneDef={id:d.id,name:d.name,data,intro:d.introTouch?(touch:boolean)=>[...(touch?d.introTouch!:d.intro)]:d.intro.length?[...d.intro]:undefined,...(d.environment?{}:{outdoor:false,ambient:{}}),...compiled.content,exits,...(validated.people.length||!Array.isArray((d as {actors?:unknown}).actors)?{people:validated.people}:{}),gameplay:withSceneConversations(gameplay,d),...stageContent(d.stage,rows,roles),...(level?{level,spawnH:heightOf(manifest.spawn)}:{}),
  ...(d.presentation?.kind==='harborShift'?{dockworkerCarry:(flags:Readonly<Record<string,boolean>>)=>dockworkerCarry(d.presentation,flags)}:{}),
  visualEnvironment:(view,engine)=>environment(view,engine),drawBackdrop:(ctx,v,engine)=>draw(ctx,v,engine),...(front||!ownRoom?{drawFront:(ctx:CanvasRenderingContext2D,v:View)=>draw(ctx,v,undefined,true)}:{})};
 // registered mechanisms (scene-mechanisms.ts) add what they own; a world-bound scene is rebuilt with the city and line system
 const built=mechanisms.reduce<SceneDef>((acc,m)=>({...acc,...m.apply({scene:d,rows,roles,width:validated.width,content:acc})}),base);
 return mechanisms.some(m=>m.world)?{...built,bindWorld:services=>declaredScene(scene,composition,gameplay,options,devices,services)}:built;
}
