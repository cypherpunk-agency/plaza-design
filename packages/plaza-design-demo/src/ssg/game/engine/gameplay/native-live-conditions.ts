import type {Condition,GameplayDefinition} from './types';
import type {SceneModel} from '../model';
import type {GameplaySession} from './session';
/** Ordered level conditions on the existing live scene tick; commands own all writes. */
export type NativeWorkflowPhase='beforeNative'|'afterNative';
export interface NativeLiveCondition {when:Condition;command:string;edge?:'rising';phase?:NativeWorkflowPhase}
export function validateNativeLiveConditionsShape(definition:GameplayDefinition,condition:(value:unknown)=>void){
 const rows=definition.native?.triggers;if(rows===undefined)return;
 const fail=(message:string):never=>{throw Error('Invalid native live condition: '+message);};
 if(!rows||typeof rows!=='object'||Array.isArray(rows)||Object.getPrototypeOf(rows)!==Object.prototype||Object.keys(rows).length>64)fail('bounded plain binding map');
 for(const[id,row]of Object.entries(rows)){
  if(!/^[-a-zA-Z0-9_.]{1,128}$/.test(id)||['__proto__','constructor','prototype'].includes(id))fail('binding name');
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.getPrototypeOf(row)!==Object.prototype||Object.keys(row).some(k=>!['when','command','edge','phase'].includes(k))||!Object.prototype.hasOwnProperty.call(row,'when')||!Object.prototype.hasOwnProperty.call(row,'command'))fail('condition/command fields');
  if(row.phase!==undefined&&!['beforeNative','afterNative'].includes(row.phase))fail('phase');
  if(row.edge!==undefined&&row.edge!=='rising')fail('edge mode');if(row.edge&&Object.values(definition.native?.intervals??{}).some(interval=>interval.elapsed===edgeKey(id)))fail('edge observation scratch collision');
  condition(row.when);const command=definition.commands[row.command];if(!command||command.sources.length!==1||command.sources[0]!=='system')fail('command must be system-only');
 }
}
const edgePrefix='native.edge.';const edgeKey=(id:string)=>edgePrefix+id;
/** Edge observations are transient, cleared with native reset/restore and owning session disposal. */
export function clearNativeLiveConditions(model:SceneModel){for(const key of Object.keys(model.scratch))if(key.startsWith(edgePrefix))delete model.scratch[key];}
/** Evaluate once per existing live tick, in authored order, against each committed result. */
export function nativeLiveConditionsTick(model:SceneModel,session:GameplaySession,cause:(run:()=>void)=>void,phase:NativeWorkflowPhase='afterNative'){
 for(const[id,row]of Object.entries(session.definition.native?.triggers??{})){if((row.phase??'afterNative')!==phase)continue;const active=session.matches(row.when);if(row.edge==='rising'){const key=edgeKey(id),previous=model.scratch[key];model.scratch[key]=active?1:0;if(previous===undefined||previous!==0||!active)continue;}else if(!active)continue;cause(()=>{if(session.dispatch(row.command,'system').ok)model.changed();});}
}
