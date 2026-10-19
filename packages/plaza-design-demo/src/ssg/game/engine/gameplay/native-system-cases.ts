import type {Condition,GameplayDefinition} from './types';
export interface SystemCase {when?:Condition;command:string}
/** Shared ordered system-command selection for deadlines and native inputs. */
export function validateSystemCases(value:unknown,d:GameplayDefinition,condition:(v:unknown)=>void){
 const fail=(s:string):never=>{throw Error('Invalid system cases: '+s);};
 if(!Array.isArray(value)||!value.length||value.length>32)fail('bounded cases');
 for(const[i,raw]of (value as unknown[]).entries()){if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype||Object.keys(raw).some(k=>!['when','command'].includes(k))||!Object.prototype.hasOwnProperty.call(raw,'command'))fail('case fields');const row=raw as SystemCase;if(i===(value as unknown[]).length-1?row.when!==undefined:row.when===undefined)fail('ordered fallback');if(row.when!==undefined)condition(row.when);const command=d.commands[row.command];if(!command||command.sources.length!==1||command.sources[0]!=='system')fail('system-only command');}
}
