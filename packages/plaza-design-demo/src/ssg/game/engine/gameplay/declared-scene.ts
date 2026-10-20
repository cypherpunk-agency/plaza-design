import {projectSceneState,type SceneDeviceSource} from './scene-state';
import {emptyData} from '../empty-data';
import {nativeDeviceData} from './native-bindings';
import {projectDeviceBindings} from './device-bindings';
import {compileManifestDocument} from './manifest-content-compiler';
import {art,resolveComposition,drawComposition,type Composition,type Environment} from '../../art';
import {frameView} from '../../art/core/view';
import {drawReviewRoom} from '../../art/assemblies/review-room';
import {residentCharacter} from '../../art/characters/resident';
import {manifestGeometry} from './manifest-geometry';
import {withSceneConversations,actorConversationId} from './scene-conversations';
import type {SceneDef} from '../../scenes/kit';
import {validateSceneDocument,type SceneDocument} from './scene-document';
import {compileLevel,levelOpacity,restingLevelView} from '../level';
import type {GameplayDefinition} from './types';

export function validateDeclaredScene(scene:SceneDocument,composition:unknown,gameplay:GameplayDefinition){
 const d=validateSceneDocument(scene,gameplay,{manifest:true}),doc=art.validate(composition);
 if(!d.manifest)throw new Error('Declared scene requires manifest bindings');
 if(d.exits?.some(e=>e.engine||e.action))throw new Error('Transport and engine exits require their registered controller');
 if(d.exits?.some(e=>e.sets&&!gameplay.flags.includes(e.sets)))throw new Error('Exit sets an undeclared gameplay flag');
 const walk=(nodes:Composition['instances']):void=>{for(const n of nodes){if(n.bindings&&Object.keys(n.bindings).length)throw new Error('Scene-specific visual bindings need a declared adapter');walk(n.children??[]);}};walk(doc.instances);
 const rows=resolveComposition(art,doc,{view:frameView(0),state:{},bindings:{},reduced:false});
 const compile=d.manifest.compile,geometry=compile?manifestGeometry(d,rows,compile.groups,compile):manifestGeometry(d,rows),bindings=geometry.bindings;
 const people=(d.people??[]).filter(p=>bindings.people?.[p.id]).map(p=>{const point=bindings.people[p.id],r=point.row;if(r.element.type!=='character.resident'||r.instance.layer!=='playfield')throw new Error('Person requires visible character.resident artwork in the playfield layer: '+p.id);return {...residentCharacter(r.props,point),...p,...(p.conversation!==undefined?{talk:[]}:{}),conversation:p.conversation??actorConversationId(d.id,p.id)};});
 const positions=Object.fromEntries(Object.entries(bindings.uses).map(([id,r])=>[id,r.x]));
 return {scene:d,composition:doc,positions,people,rows,...geometry};
}
/** Validate against the prospective registry; the same rule supports existing and newly authored scenes. */
export function validateDeclaredDestinations(scene:SceneDocument,destinations:Readonly<Record<string,readonly string[]>>){
 for(const exit of scene.exits??[]){const arrivals=exit.to===scene.id?(scene.exits??[]).map(e=>e.id):destinations[exit.to];
  if(!arrivals||exit.at&&!arrivals.includes(exit.at))throw new Error('Unknown declared exit destination/arrival: '+exit.to+(exit.at?'/'+exit.at:''));
 }
}
/** The same factory handles every instance; source contains no executable scripts or renderer selection. */
export function declaredScene(scene:SceneDocument,composition:unknown,gameplay:GameplayDefinition,options:Partial<Environment>={},devices?:SceneDeviceSource):SceneDef{
 const validated=validateDeclaredScene(scene,composition,gameplay),d=validated.scene;
 const data=nativeDeviceData(projectDeviceBindings(d,validated.rows,projectSceneState(devices??emptyData(d.id,d.name),gameplay),validated.width),gameplay);
 const compiled=compileManifestDocument(d,validated.rows,(_c,id)=>({name:d.name,pages:[],conversation:id}),d.manifest!.compile??{elevatedResponses:true});
 // a level (floors, stairs, lifts, buildings): its lifts and building reveal come from the frame's View.level
 const level=compileLevel(validated.rows),manifest=d.manifest!;
 // the grey review room stands in for a room until the composition paints its own backdrop
 const ownRoom=validated.rows.some(r=>r.instance.layer==='backdrop'||r.instance.layer==='distance');
 const instanceOf=(t:unknown)=>typeof t==='string'?t:(t as {instance:string}).instance,heightOf=(t:unknown)=>validated.rows.find(r=>r.instance.id===instanceOf(t))?.placement.h??0;
 const environment=(view:import('../../art/core/view').View)=>{const live=level?view.level??restingLevelView(level,false):undefined;
  return {...options,view,state:{...(options.state??{}),...(live?Object.fromEntries(Object.entries(live.lifts).map(([id,c])=>[id,{car:c.car,doors:c.doors}])):{})},...(level&&live?{opacity:{...(options.opacity??{}),...levelOpacity(level,live)}}:{}),bindings:{},reduced:options.reduced??false};};
 const draw=(ctx:CanvasRenderingContext2D,view:import('../../art/core/view').View,front=false)=>{const env=environment(view);if(!front){if(!level&&!ownRoom)drawReviewRoom(ctx,view);for(const pass of ['backdrop','devices','people'] as const)drawComposition(ctx,art,validated.composition,env,pass);}else drawComposition(ctx,art,validated.composition,env,'foreground');};
 const exits=level?compiled.content.exits.map(e=>({...e,arriveH:heightOf(manifest.exits?.[e.id])})):compiled.content.exits;
 return {id:d.id,name:d.name,data,intro:d.introTouch?(touch:boolean)=>[...(touch?d.introTouch!:d.intro)]:d.intro.length?[...d.intro]:undefined,outdoor:false,ambient:{},...compiled.content,exits,people:validated.people,gameplay:withSceneConversations(gameplay,d),...(level?{level,spawnH:heightOf(manifest.spawn)}:{}),visualEnvironment:view=>environment(view),drawBackdrop:(ctx,v)=>draw(ctx,v),drawFront:(ctx,v)=>draw(ctx,v,true)};
}
