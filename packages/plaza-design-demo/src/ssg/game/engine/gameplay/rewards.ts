import type {GameplayDefinition} from './types';
import type {ScalarRead} from './queries';
import type {SceneData} from '../../data/types';
export const GAMEPLAY_ABILITIES=['jump'] as const;
export function registryLabels(net:{networks:readonly {machines:readonly {node?:string}[]}[]}){return [...new Set(net.networks.flatMap(n=>n.machines.flatMap(m=>m.node?[m.node]:[])))];}
type RewardDefinition=Pick<GameplayDefinition,'commands'>&Partial<Pick<GameplayDefinition,'queries'|'state'>>;
/** Source-bound finite range inspection, never gameplay evaluation or a retained target registry. */
function finiteTargets(read:ScalarRead,definition:RewardDefinition,texts?:Readonly<SceneData['texts']>,path:readonly string[]=[]):string[]{
 if('literal'in read){if(typeof read.literal==='string')return[read.literal];}
 else if('state'in read){const d=definition.state?.[read.state];if(d?.type==='enum'&&!d.nullable)return d.options??[];}
 else{if(path.includes(read.query)||path.length>=32)throw Error('Cyclic controlled target');const q=definition.queries?.[read.query];if(q?.kind==='label'){const label=texts?.[q.key];if(typeof label==='string')return[label];}else if(q?.kind==='select')return q.cases.flatMap(row=>finiteTargets(row.value,definition,texts,[...path,read.query]));}
 throw Error('Controlled/member target requires finite source-bound strings');
}
/** Cross-document metadata validation uses only the complete prospective scene text and network owners. */
export function validateGameplayRewards(definition:RewardDefinition,vocabulary:{keyring:ReadonlySet<string>;controlled?:ReadonlySet<string>},texts?:Readonly<SceneData['texts']>){
 const check=(value:string|ScalarRead,known:ReadonlySet<string>|undefined,kind:string)=>{if(typeof value!=='string'&&!texts)throw Error('Dynamic member target requires associated scene source');const targets=typeof value==='string'?[value]:finiteTargets(value,definition,texts);if(!targets.length||targets.some(target=>!known?.has(target)))throw Error('Unknown '+kind+' '+targets.join(', '));};
 for(const[id,command]of Object.entries(definition.commands))for(const action of command.actions)if('grant'in action){const grant=action.grant;if('keyring'in grant)check(grant.keyring,vocabulary.keyring,'keyring grant in '+id);if('controlled'in grant)check(grant.controlled,vocabulary.controlled,'controlled node grant in '+id);if('ability'in grant&&!GAMEPLAY_ABILITIES.includes(grant.ability))throw Error('Unknown ability grant in '+id);}
 function walk(value:unknown){if(!value||typeof value!=='object')return;const p=(value as {player?:{collection?:string;contains?:string|ScalarRead}}).player;if(p&&p.contains!==undefined&&typeof p.contains!=='string')check(p.contains,p.collection==='controlled'?vocabulary.controlled:vocabulary.keyring,'player member');for(const child of Object.values(value))walk(child);}
 walk(definition);
}
