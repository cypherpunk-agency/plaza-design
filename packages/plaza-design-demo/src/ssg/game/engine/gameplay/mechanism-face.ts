import type {Layer,PartFunction,SceneData} from '../../data/types';
import {SCENE_MECHANISMS} from './scene-mechanisms';
import type {SceneRules} from '../rules';
/**
 * The Circuit face of a registered scene mechanism: how the schematic and inspector show engine code
 * as a device. The nouns come from the mechanism's `rulesShape()` (nothing is listed twice):
 *  - each derived value it publishes is a `sense` noun with a `read` verb;
 *  - its effects are the verbs of one `act` noun, `effects`;
 *  - its panels are the verbs of one `act` noun, `panels`;
 *  - its physical milestones (`inputs`) are the events of one `sense` noun, `milestones`.
 * Mechanisms without rules (a painted skyline, a platform) show no nouns; they are still devices.
 * Display and editing only: a cable cannot start or end on a mechanism noun yet (see the handbook).
 */
export interface MechanismNoun{id:string;layer:Layer;function:PartFunction;verbs:readonly string[];events:readonly string[];/** Scalar type of a derived value, when the rules declare one. */type?:string}
export interface MechanismFace{name:string;label:string;layer:Layer;function:PartFunction;/** `controller.kind` in the scene's device document this mechanism reads. */controller?:string;nouns:readonly MechanismNoun[]}
export interface MechanismNumber{path:readonly (string|number)[];label:string;value:number}
/** The face's nouns from a rules shape. */
export function nounsOfRules(rules:SceneRules|undefined):MechanismNoun[]{
 if(!rules)return[];
 const out:MechanismNoun[]=[];
 for(const id of Object.keys(rules.derived??{}))out.push({id,layer:'software',function:'sense',verbs:['read'],events:[],...(rules.derivedTypes?.[id]?{type:String(rules.derivedTypes[id])}:{})});
 const effects=Object.keys(rules.effects??{});if(effects.length)out.push({id:'effects',layer:'software',function:'act',verbs:effects,events:[]});
 if(rules.panels?.length)out.push({id:'panels',layer:'software',function:'act',verbs:[...rules.panels],events:[]});
 if(rules.inputs?.length)out.push({id:'milestones',layer:'software',function:'sense',verbs:[],events:[...rules.inputs]});
 return out;
}
/** The face of one registered mechanism, or undefined for an unknown name. */
export function mechanismFace(name:string):MechanismFace|undefined{
 const m=SCENE_MECHANISMS[name];if(!m)return undefined;
 return{name,label:m.label,layer:m.face?.layer??'software',function:m.face?.function??'logic',...(m.face?.controller?{controller:m.face.controller}:{}),nouns:nounsOfRules(m.rulesShape?.())};
}
export const mechanismFaces=(names:readonly string[]|undefined):MechanismFace[]=>(names??[]).flatMap(n=>{const f=mechanismFace(n);return f?[f]:[];});
/**
 * The numbers a mechanism reads from the scene's device document: every number in the `controller`
 * block whose kind it names, and every `tuning` value that block points at (`controller.tuning`
 * maps the mechanism's names to tuning keys). Each is editable at its path.
 */
export function mechanismNumbers(face:MechanismFace,data:Pick<SceneData,'tuning'>&{controller?:unknown}):MechanismNumber[]{
 const controller=data.controller as Record<string,unknown>|undefined;
 if(!face.controller||!controller||controller.kind!==face.controller)return[];
 const out:MechanismNumber[]=[],seen=new Set<string>();
 const walk=(value:unknown,path:(string|number)[],depth:number)=>{
  if(depth>8)return;
  if(typeof value==='number'&&Number.isFinite(value)){out.push({path:['controller',...path],label:'controller.'+path.join('.'),value});return;}
  if(Array.isArray(value)){value.forEach((v,i)=>walk(v,[...path,i],depth+1));return;}
  if(value&&typeof value==='object')for(const[k,v]of Object.entries(value))if(!(depth===0&&k==='version'))walk(v,[...path,k],depth+1);
 };
 walk(controller,[],0);
 const tuning=controller.tuning;
 if(tuning&&typeof tuning==='object')for(const key of Object.values(tuning as Record<string,unknown>)){
  const v=typeof key==='string'?(data.tuning as Record<string,unknown>|undefined)?.[key]:undefined;
  if(typeof v==='number'&&!seen.has(key as string)){seen.add(key as string);out.push({path:['tuning',key as string],label:'tuning.'+key,value:v});}
 }
 return out;
}
