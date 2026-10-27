import type {SceneData} from '../../data/types';
import {stateAddress} from './state';
import type {GameplayDefinition,ConversationNode,Condition} from './types';
import type {DialogueData,DialogueNode} from '../../data/types';
/** Read-only projection for native validation/inspection; actual presentation uses ConversationSession. */
function nativeDialogue(def:GameplayDefinition,id:string,data:SceneData):DialogueData {
 const c=def.conversations[id];if(!c)throw new Error('Missing native conversation '+id);
 const bindings=def.native?.reads??{};
 const hidden=new Set(Object.values(c.nodes).flatMap(n=>n.redirect?.map(r=>r.node)??[]));
 const condition=(v:Condition):string|undefined=>{if('flag'in v&&bindings[v.flag])return(v.is===false?'!':'')+bindings[v.flag];if('state'in v&&def.state?.[v.state]?.owner===data.id){const [,key]=stateAddress(v.state);return typeof v.is==='boolean'?(v.is?'':'!')+key:key+'='+v.is;}if('not'in v){const inner=condition(v.not);if(inner!==undefined)return inner.startsWith('!')?inner.slice(1):'!'+inner;}return undefined;};
 const convert=(n:ConversationNode):DialogueNode=>({text:n.pages.join('\n'),...(n.choices?{choices:n.choices.map(c=>[c.label,c.next] as [string,string])}:{})});
 const choices=new Set(Object.values(c.nodes).flatMap(n=>n.choices?.map(choice=>choice.next)??[]));
 const nodes:DialogueData['nodes']={};for(const[id,n]of Object.entries(c.nodes)){if(hidden.has(id)&&!choices.has(id))continue;const variants=(n.redirect??[]).flatMap(r=>{const when=condition(r.when);return when===undefined?[]:[{...convert(c.nodes[r.node]),if:when}];});nodes[id]=variants.length?[...variants,convert(n)]:convert(n);}
 const free=c.free;return{speaker:c.nodes[c.entry[0].node].speaker,start:c.entry[0].node,sayCmd:c.sayCommand??'',nodes,...(free?{free:{match:free.containsAny.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),goto:free.next,miss:free.miss,retry:free.retry,retryGoto:free.retryNext}}:{})};
}

/** Static representable metadata for current shared graphs. Panels always runs the complete source graph. */
export function nativeDeviceDialogues(def:GameplayDefinition,data:SceneData):SceneData['dialogue']{
 const graphs=Object.keys(def.conversations);
 const walk=(value:unknown):void=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(walk);return;}const row=value as Record<string,unknown>;if(row.open==='talk'){if(typeof row.with!=='string'||!Object.prototype.hasOwnProperty.call(def.conversations,row.with))throw Error('Missing native conversation '+String(row.with));}for(const child of Object.values(row))walk(child);};
 for(const device of [...data.devices,...data.nodes??[]])walk(device);
 return Object.fromEntries(graphs.map(id=>[id,nativeDialogue(def,id,data)]));
}
