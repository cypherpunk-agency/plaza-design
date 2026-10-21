import type {Layer,PartFunction,MechanismDevice,MechanismPart} from '../../data/types';
import type {SceneRules} from '../rules';
/**
 * The parts of a registered scene mechanism, from its `rulesShape()` (nothing is listed twice), and the
 * Circuit device a cable sees (pure: no registry, so the build check and the model can import it):
 *  - each derived value it publishes is a `sense` part with a `read` verb and one signal, `changed`;
 *  - its effects are the verbs of one `act` part, `effects`; a cable runs one like an `effect` action;
 *  - its panels are the verbs of one `act` part, `panels` (shown, not wireable: a cable does not open UI);
 *  - its physical milestones (`inputs`) are the signals of one `sense` part, `milestones`.
 * Mechanisms without rules (a painted skyline, a platform) show no parts.
 */
export interface MechanismNoun{id:string;layer:Layer;function:PartFunction;verbs:readonly string[];events:readonly string[];/** The verbs a cable may send to this part (a subset of `verbs`). */wire:readonly string[];/** Scalar type of a derived value, when the rules declare one. */type?:string}
/** The Circuit id of a mechanism's device: the same in the editor's picker, the cables and the model. */
export const mechanismDeviceId=(name:string)=>'mechanism-'+name;
export const MECHANISM_DEVICE_PREFIX='mechanism-';
/** The face's nouns from a rules shape. */
export function nounsOfRules(rules:SceneRules|undefined):MechanismNoun[]{
 if(!rules)return[];
 const out:MechanismNoun[]=[];
 for(const id of Object.keys(rules.derived??{}))out.push({id,layer:'software',function:'sense',verbs:['read'],events:['changed'],wire:[],...(rules.derivedTypes?.[id]?{type:String(rules.derivedTypes[id])}:{})});
 const effects=Object.keys(rules.effects??{});if(effects.length)out.push({id:'effects',layer:'software',function:'act',verbs:effects,events:[],wire:effects});
 if(rules.panels?.length)out.push({id:'panels',layer:'software',function:'act',verbs:[...rules.panels],events:[],wire:[]});
 if(rules.inputs?.length)out.push({id:'milestones',layer:'software',function:'sense',verbs:[],events:[...rules.inputs],wire:[]});
 return out;
}
/** The device a cable sees: only the parts that raise a signal or accept an action. Undefined when none does. */
export function deviceOfNouns(name:string,label:string,nouns:readonly MechanismNoun[]):MechanismDevice|undefined{
 const parts:MechanismPart[]=nouns.filter(n=>n.wire.length||n.events.length).map(n=>({id:n.id,layer:n.layer,function:n.function,verbs:[...n.wire],events:[...n.events]}));
 return parts.length?{id:mechanismDeviceId(name),name,label,parts}:undefined;
}
