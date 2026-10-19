import type {SceneData,Case} from '../../data/types';
import type {GameplayDefinition} from './types';
/** Ordinary noun steps retain their caller's permissions; guards keep their separate privileged input contract. */
export function validateNativeCommandSteps(definition:GameplayDefinition,data:SceneData){
 const allowed=new Set<object>(),fail=(message:string):never=>{throw Error('Invalid ordinary command step: '+message);};
 for(const dev of [...data.devices,...data.nodes??[]])for(const noun of dev.nouns)for(const cs of Object.values(noun.on??{}))for(const row of(Array.isArray(cs)?cs:[cs])as Case[])for(const action of row.do??[])if('command'in action){
  if(row.do?.length!==1||Object.keys(action).join()!=='command')fail('must be the exclusive noun.on action');const command=definition.commands[action.command];if(!command||!command.sources.includes('interaction')||!command.sources.includes('signal')||command.sources.some(source=>source!=='interaction'&&source!=='signal'))fail('requires interaction and signal permissions only');allowed.add(action);
 }
 function walk(value:unknown){if(!value||typeof value!=='object')return;if('command'in value&&!allowed.has(value))fail('only noun.on permits ordinary commands');for(const child of Object.values(value))walk(child);}
 walk(data);
}
