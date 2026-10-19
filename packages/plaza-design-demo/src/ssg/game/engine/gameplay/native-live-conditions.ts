import type {Condition,GameplayDefinition} from './types';
import type {SceneModel} from '../model';
import type {GameplaySession} from './session';
/** Ordered level conditions on the existing live scene tick; commands own all writes. */
export interface NativeLiveCondition {when:Condition;command:string}
export function validateNativeLiveConditionsShape(definition:GameplayDefinition,condition:(value:unknown)=>void){
 const rows=definition.native?.triggers;if(rows===undefined)return;
 const fail=(message:string):never=>{throw Error('Invalid native live condition: '+message);};
 if(!rows||typeof rows!=='object'||Array.isArray(rows)||Object.getPrototypeOf(rows)!==Object.prototype||Object.keys(rows).length>64)fail('bounded plain binding map');
 for(const[id,row]of Object.entries(rows)){
  if(!/^[-a-zA-Z0-9_.]{1,128}$/.test(id)||['__proto__','constructor','prototype'].includes(id))fail('binding name');
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.getPrototypeOf(row)!==Object.prototype||Object.keys(row).some(k=>!['when','command'].includes(k))||!Object.prototype.hasOwnProperty.call(row,'when')||!Object.prototype.hasOwnProperty.call(row,'command'))fail('condition/command fields');
  condition(row.when);const command=definition.commands[row.command];if(!command||command.sources.length!==1||command.sources[0]!=='system')fail('command must be system-only');
 }
}
/** Evaluate once per existing live tick, in authored order, against each committed result. */
export function nativeLiveConditionsTick(model:SceneModel,session:GameplaySession,cause:(run:()=>void)=>void){
 for(const row of Object.values(session.definition.native?.triggers??{}))if(session.matches(row.when))cause(()=>{if(session.dispatch(row.command,'system').ok)model.changed();});
}
