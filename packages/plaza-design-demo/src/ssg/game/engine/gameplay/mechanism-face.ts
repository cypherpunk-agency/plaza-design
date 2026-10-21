import type {Layer,PartFunction,SceneData,MechanismDevice} from '../../data/types';
import {SCENE_MECHANISMS} from './scene-mechanisms';
import {nounsOfRules,deviceOfNouns,mechanismDeviceId,type MechanismNoun} from './mechanism-parts';
export {nounsOfRules,mechanismDeviceId,type MechanismNoun};
/**
 * The Circuit face of a registered scene mechanism: how the schematic and inspector show engine code
 * as a device. The nouns come from the mechanism's `rulesShape()` (mechanism-parts.ts):
 *  - each derived value it publishes is a `sense` noun with a `read` verb and a `changed` signal;
 *  - its effects are the verbs of one `act` noun, `effects`;
 *  - its panels are the verbs of one `act` noun, `panels`;
 *  - its physical milestones (`inputs`) are the events of one `sense` noun, `milestones`.
 * Mechanisms without rules (a painted skyline, a platform) show no nouns; they are still devices.
 * Cables start at a signal and end at an effect (`mechanismDevice`); the model runs them (SceneModel
 * `mechanisms`): the mechanism is a device of the Circuit, not of the world, so it has no hack-vision node.
 */
export interface MechanismFace{name:string;label:string;layer:Layer;function:PartFunction;/** `controller.kind` in the scene's device document this mechanism reads. */controller?:string;nouns:readonly MechanismNoun[]}
export interface MechanismNumber{path:readonly (string|number)[];label:string;value:number}
/** The face of one registered mechanism, or undefined for an unknown name. */
export function mechanismFace(name:string):MechanismFace|undefined{
 const m=SCENE_MECHANISMS[name];if(!m)return undefined;
 return{name,label:m.label,layer:m.face?.layer??'software',function:m.face?.function??'logic',...(m.face?.controller?{controller:m.face.controller}:{}),nouns:nounsOfRules(m.rulesShape?.())};
}
export const mechanismFaces=(names:readonly string[]|undefined):MechanismFace[]=>(names??[]).flatMap(n=>{const f=mechanismFace(n);return f?[f]:[];});
/** The device a cable sees for this mechanism (its signals and the actions it accepts), or undefined when it has none. */
export const mechanismDevice=(face:MechanismFace):MechanismDevice|undefined=>deviceOfNouns(face.name,face.label,face.nouns);
/** The Circuit devices of a scene's named mechanisms. */
export const mechanismDevices=(names:readonly string[]|undefined):MechanismDevice[]=>mechanismFaces(names).flatMap(f=>{const d=mechanismDevice(f);return d?[d]:[];});
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
