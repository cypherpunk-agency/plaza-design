import type {SceneData} from '../../data/types';
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
import type {GameplayDefinition} from './types';

export function validateDeclaredScene(scene:SceneDocument,composition:unknown,gameplay:GameplayDefinition){
 const d=validateSceneDocument(scene,gameplay,{manifest:true}),doc=art.validate(composition);
 if(!d.manifest)throw new Error('Declared scene requires manifest bindings');
 if(d.exits?.some(e=>e.engine||e.action))throw new Error('Transport and engine exits require their registered controller');
 if(d.exits?.some(e=>e.sets&&!gameplay.flags.includes(e.sets)))throw new Error('Exit sets an undeclared gameplay flag');
 const walk=(nodes:Composition['instances']):void=>{for(const n of nodes){if(n.bindings&&Object.keys(n.bindings).length)throw new Error('Scene-specific visual bindings need a declared adapter');walk(n.children??[]);}};walk(doc.instances);
 const rows=resolveComposition(art,doc,{view:frameView(0),state:{},bindings:{},reduced:false});
 const geometry=manifestGeometry(d,rows),bindings=geometry.bindings;
 const people=(d.people??[]).map(p=>{const point=bindings.people[p.id],r=point.row;if(r.element.type!=='character.resident'||r.instance.pass!=='people')throw new Error('Person requires visible character.resident artwork in the people pass: '+p.id);return {...residentCharacter(r.props,point),...p,...(p.conversation!==undefined?{talk:[]}:{}),conversation:p.conversation??actorConversationId(d.id,p.id)};});
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
export function declaredScene(scene:SceneDocument,composition:unknown,gameplay:GameplayDefinition,options:Partial<Environment>={},devices?:SceneData):SceneDef{
 const validated=validateDeclaredScene(scene,composition,gameplay),d=validated.scene;
 const data=nativeDeviceData(projectDeviceBindings(d,validated.rows,devices??emptyData(d.id,d.name),validated.width),gameplay);
 const compiled=compileManifestDocument(d,validated.rows,(_c,id)=>({name:d.name,pages:[],conversation:id}),{elevatedResponses:true});
 const draw=(ctx:CanvasRenderingContext2D,view:import('../../art/core/view').View,front=false)=>{const env={...options,view,state:options.state??{},bindings:{},reduced:options.reduced??false};if(!front){drawReviewRoom(ctx,view);for(const pass of ['backdrop','devices','people'] as const)drawComposition(ctx,art,validated.composition,env,pass);}else drawComposition(ctx,art,validated.composition,env,'foreground');};
 return {id:d.id,name:d.name,data,intro:d.introTouch?(touch:boolean)=>[...(touch?d.introTouch!:d.intro)]:d.intro.length?[...d.intro]:undefined,outdoor:false,ambient:{},...compiled.content,people:validated.people,gameplay:withSceneConversations(gameplay,d),visualEnvironment:view=>({...options,view,state:options.state??{},bindings:{},reduced:options.reduced??false}),drawBackdrop:(ctx,v)=>draw(ctx,v),drawFront:(ctx,v)=>draw(ctx,v,true)};
}
