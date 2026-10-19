import {dockworkerCarry} from '../../engine/gameplay/scene-presentation';
import {currentObjective,objectiveAttention} from '../../engine/gameplay/objectives';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {compileSceneActors} from '../../engine/gameplay/actors';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import {type SceneDocument} from '../../engine/gameplay/scene-document';
import {SHIFT_SCENE,validateShiftScene} from './scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import { harborShiftComposition,harborShiftGeometry,validateHarborShiftComposition,harborShiftEnvironment,drawHarborShiftComposition,harborShiftLights,type HarborShiftRenderOptions } from './composition';
import type { Composition,Environment } from '../../art/core/composition';
import { SHIFT_GAMEPLAY } from './gameplay';
/** Milestone 2: ordinary work, isolated from the campaign by ?play=harborShift. */
import type { Character } from "../../runtime/characters";
import { type SceneDef, type SceneUse } from "../kit";


type Flags = Readonly<Record<string, boolean>>;
export function shiftCarry(f:Flags,source:SceneDocument=SHIFT_SCENE){return dockworkerCarry(source.presentation,f);}

/** Source owns physical bindings and dialogue routing; the shared Game presenter executes its authored graph. */
const compile=(source:ReturnType<typeof validateShiftScene>,doc:Composition)=>compileManifestDocument(source,harborShiftGeometry(doc),(_c,id)=>({name:'',pages:[],conversation:id}),{groups:['uses','readables','rests','exits'],groundExits:false,omitGroundRestHeight:true});
export function harborShiftActors(doc:Composition=harborShiftComposition,source:SceneDocument=SHIFT_SCENE):Record<string,Character>{return compileSceneActors(source,harborShiftGeometry(doc));}
export const HARBOR_SHIFT_ACTORS=harborShiftActors();
const defaults=compile(SHIFT_SCENE,harborShiftComposition).content;
export const SHIFT_USES=defaults.uses!;
export const shiftGoal=defaults.objective!;
export const shiftMinute=defaults.storyMinute!;
export function shiftAttention(f:Flags,uses?:SceneUse[]){return uses?objectiveAttention(currentObjective(SHIFT_SCENE.objectives??[],{flags:{...f},items:{},tokens:0})!,Object.fromEntries(uses.map(use=>[use.id,use.x]))):defaults.attention?.(f)??null;}

export function harborShiftScene(document:Composition=harborShiftComposition,state:Environment['state']={},options:HarborShiftRenderOptions={},content:SceneDocument=SHIFT_SCENE,gameplay:GameplayDefinition=SHIFT_GAMEPLAY):SceneDef{
 const doc=validateHarborShiftComposition(document),source=validateShiftScene(content,gameplay),compiled=compile(source,doc),actors=harborShiftActors(doc,source),rows=harborShiftGeometry(doc);
 return{dockworkerCarry:flags=>shiftCarry(flags,source),id:'harborShift',name:source.name,intro:source.introTouch?(touch:boolean)=>[...(touch?source.introTouch!:source.intro)]:[...source.intro],horizon:rows.find(r=>r.instance.id==='horizon')!.placement.h,...compiled.content,
 gameplay:withSceneConversations(gameplay,source),...(source.actors!.some(a=>a.band==='world')?{people:source.actors!.filter(a=>a.band==='world').map(a=>actors[a.id])}:{}),lights:harborShiftLights(doc),
 drawBackdrop:(ctx,v)=>drawHarborShiftComposition(ctx,v,actors,compiled.content.uses??[],doc,state,options,source.presentation??null),
 visualEnvironment:(v)=>harborShiftEnvironment(doc,v,actors,compiled.content.uses??[],source.presentation??null),
 };
}
export const harborShift=harborShiftScene();
