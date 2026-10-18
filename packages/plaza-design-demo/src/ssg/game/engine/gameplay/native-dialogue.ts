import type {GameplayDefinition,ConversationNode} from './types';
import type {DialogueData,DialogueNode} from '../../data/types';
/** Read-only projection for native validation/inspection; actual presentation uses ConversationSession. */
export function nativeDialogue(def:GameplayDefinition,id:string,bindings:Record<string,string>,sayCmd:string):DialogueData {
 const c=def.conversations[id],hidden=new Set(Object.values(c.nodes).flatMap(n=>n.redirect?.map(r=>r.node)??[]));
 const convert=(n:ConversationNode):DialogueNode=>({text:n.pages.join('\n'),...(n.choices?{choices:n.choices.map(c=>[c.label,c.next] as [string,string])}:{})});
 const choices=new Set(Object.values(c.nodes).flatMap(n=>n.choices?.map(choice=>choice.next)??[]));
 const nodes:DialogueData['nodes']={};for(const[id,n]of Object.entries(c.nodes)){if(hidden.has(id)&&!choices.has(id))continue;const variants=(n.redirect??[]).map(r=>{if(!('flag'in r.when)||!bindings[r.when.flag])throw new Error('Native dialogue projection requires declared flag binding');return {...convert(c.nodes[r.node]),if:(r.when.is===false?'!':'')+bindings[r.when.flag]};});nodes[id]=variants.length?[...variants,convert(n)]:convert(n);}
 return{speaker:c.nodes[c.entry[0].node].speaker,start:c.entry[0].node,sayCmd,nodes};
}
