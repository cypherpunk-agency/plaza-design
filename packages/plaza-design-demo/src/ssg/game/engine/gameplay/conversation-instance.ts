import {mergeGameplayLibrary} from './libraries';
import type {GameplayDefinition} from './types';
import {validateGameplay} from './validation';

type SymbolKind='state'|'query'|'command'|'purchase'|'event'|'flag'|'item';
const fields:Record<string,SymbolKind>={state:'state',query:'query',command:'command',onEnter:'command',sayCommand:'command',purchase:'purchase',emit:'event',event:'event',flag:'flag',item:'item'};
/** Compile one reusable graph into an actor's stable namespace. Only typed symbol references
 * change; node IDs, text, literal values, canonical bindings and world references do not.
 * Execution and progress still belong to ordinary GameplaySession/ConversationSession. */
export function instantiateConversation(source:GameplayDefinition,graph:string,target:string,speaker?:{from:string;to:string}):GameplayDefinition{
 const root=source.conversations[graph];if(!root)throw Error('Missing reusable conversation '+graph);
 const used=Object.fromEntries(['state','query','command','purchase','event','flag','item'].map(k=>[k,new Set<string>()])) as Record<SymbolKind,Set<string>>;
 const rename=(id:string)=>id===graph?target:id.startsWith(graph+'.')?target+id.slice(graph.length):id;
 const walk=(value:unknown,reference:(kind:SymbolKind,id:string)=>string,key='',template=false):unknown=>{
  if(typeof value==='string'){const kind=fields[key];if(kind)return reference(kind,value);if(template&&key==='pages')return value.replace(/\{(state|query|item):([^{}]+)\}/g,(_all,kind:SymbolKind,id:string)=>'{'+kind+':'+reference(kind,id)+'}');return value;}
  if(Array.isArray(value))return value.map(v=>walk(v,reference,key,template));
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v,reference,k,(value as {template?:boolean}).template===true)]));
 };
 const queue:{kind:SymbolKind;id:string}[]=[];
 const discover=(kind:SymbolKind,id:string)=>{if(!used[kind].has(id)){used[kind].add(id);queue.push({kind,id});}return id;};
 walk(root,discover);
 const records={state:source.state??{},query:source.queries??{},command:source.commands,purchase:source.purchases??{}};
 const reactions:GameplayDefinition['reactions']=[],handoffs:NonNullable<GameplayDefinition['handoffs']>=[];
 while(queue.length){const {kind,id}=queue.shift()!;
  if(kind in records){const value=records[kind as keyof typeof records][id];if(value!==undefined)walk(value,discover);else if(kind!=='state'||!source.stateReads?.[id])throw Error('Unknown reusable '+kind+' '+id);}
  if(kind==='event'){for(const reaction of source.reactions.filter(r=>r.event===id)){reactions.push(reaction);discover('command',reaction.command);}for(const handoff of source.handoffs?.filter(h=>h.event===id)??[]){handoffs.push(handoff);for(const after of handoff.after??[])discover('command',after.command);}}
 }
 const reference=(kind:SymbolKind,id:string)=>kind==='state'&&source.stateReads?.[id]&&!source.state?.[id]?id:rename(id);
 const rewrite=(value:unknown)=>walk(value,reference);
 const copy=(kind:keyof typeof records)=>Object.fromEntries([...used[kind]].filter(id=>records[kind][id]!==undefined).map(id=>[rename(id),rewrite(records[kind][id])]));
 const conversation=rewrite(root) as typeof root;if(speaker!==undefined)for(const node of Object.values(conversation.nodes))if(node.speaker===speaker.from)node.speaker=speaker.to;
 const state=copy('state') as NonNullable<GameplayDefinition['state']>;
 for(const[id,declaration]of Object.entries(state))if(id.startsWith(target+'.'))declaration.owner=declaration.owner===graph||declaration.owner.startsWith(graph+'.')?rename(declaration.owner):target;
 return validateGameplay({version:1,flags:[...used.flag].map(rename),items:[...used.item].map(rename),events:[...used.event].map(rename),commands:copy('command'),conversations:{[target]:conversation},reactions:rewrite(reactions),state,queries:copy('query'),purchases:copy('purchase'),
  ...(source.sharedState?{sharedState:[...source.sharedState]}:{}),...(Object.keys(source.stateReads??{}).some(id=>used.state.has(id))?{stateReads:Object.fromEntries(Object.entries(source.stateReads!).filter(([id])=>used.state.has(id)).map(([id,type])=>[reference('state',id),type]))}:{}),...(handoffs.length?{handoffs:rewrite(handoffs)}:{}),
 } as GameplayDefinition);
}

/** Install a graph instance, reusing only identical explicitly shared dependencies. */
export function addConversationInstance(target:GameplayDefinition,source:GameplayDefinition,graph:string,id:string,speaker?:{from:string;to:string}):GameplayDefinition{
 const fragment=instantiateConversation(source,graph,id,speaker);
 for(const group of ['state','queries','commands','purchases']as const)for(const key of Object.keys(fragment[group]??{}))if(target[group]?.[key]!==undefined&&JSON.stringify(target[group]![key])===JSON.stringify(fragment[group]![key]))delete fragment[group]![key];
 fragment.reactions=fragment.reactions.filter(row=>!target.reactions.some(existing=>JSON.stringify(existing)===JSON.stringify(row)));
 if(fragment.handoffs)fragment.handoffs=fragment.handoffs.filter(row=>!target.handoffs?.some(existing=>JSON.stringify(existing)===JSON.stringify(row)));
 return mergeGameplayLibrary(target,fragment,'Conversation instance');
}
