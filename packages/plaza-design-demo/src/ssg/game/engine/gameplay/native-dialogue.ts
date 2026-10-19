import type {GameplayDefinition,ConversationNode,Condition} from './types';
import type {Action,DialogueData,DialogueNode} from '../../data/types';
/** Read-only projection for native validation/inspection; actual presentation uses ConversationSession. */
export function nativeDialogue(def:GameplayDefinition,id:string,bindings:Record<string,string>={},sayCmd?:string,options:{entryActions?:boolean}={}):DialogueData {
 const c=def.conversations[id];if(!c)throw new Error('Missing native conversation '+id);
 bindings={...def.native?.reads,...bindings};
 const hidden=new Set(Object.values(c.nodes).flatMap(n=>n.redirect?.map(r=>r.node)??[]));
 const condition=(v:Condition):string=>{if('flag'in v&&bindings[v.flag])return(v.is===false?'!':'')+bindings[v.flag];if('state'in v&&def.native?.state[v.state]){const key=def.native.state[v.state];return typeof v.is==='boolean'?(v.is?'':'!')+key:key+'='+v.is;}if('not'in v){const inner=condition(v.not);return inner.startsWith('!')?inner.slice(1):'!'+inner;}throw new Error('Native dialogue projection requires a declared native predicate');};
 const entryActions=(n:ConversationNode):Action[]|undefined=>{if(!n.onEnter)return undefined;const command=def.commands[n.onEnter];if(command.when)throw new Error('Conditional command cannot be projected as native dialogue metadata');return command.actions.map(a=>{if('state'in a&&'set'in a&&def.native?.state[a.state])return{set:def.native.state[a.state],to:a.set};if('emit'in a&&def.native?.goals[a.emit])return{goal:def.native.goals[a.emit]};throw new Error('Dialogue entry command requires a declared native metadata projection');});};
 const convert=(n:ConversationNode):DialogueNode=>({text:n.pages.join('\n'),...(n.onEnter&&options.entryActions!==false?{do:entryActions(n)}:{}),...(n.choices?{choices:n.choices.map(c=>[c.label,c.next] as [string,string])}:{})});
 const choices=new Set(Object.values(c.nodes).flatMap(n=>n.choices?.map(choice=>choice.next)??[]));
 const nodes:DialogueData['nodes']={};for(const[id,n]of Object.entries(c.nodes)){if(hidden.has(id)&&!choices.has(id))continue;const variants=(n.redirect??[]).map(r=>({...convert(c.nodes[r.node]),if:condition(r.when)}));nodes[id]=variants.length?[...variants,convert(n)]:convert(n);}
 const free=c.free;return{speaker:c.nodes[c.entry[0].node].speaker,start:c.entry[0].node,sayCmd:c.sayCommand??sayCmd??'',nodes,...(free?{free:{match:free.containsAny.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),goto:free.next,miss:free.miss,retry:free.retry,retryGoto:free.retryNext}}:{})};
}
