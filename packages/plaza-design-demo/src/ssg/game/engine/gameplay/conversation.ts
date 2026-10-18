import { GameplaySession } from './session';
import {matches} from './validation';
import type { ConversationNode, GameplayResult,GameplayState } from './types';
/** Frames/closing are pure. Explicit onEnter runs once per actual entry, atomically with a choice. */
export class ConversationSession {
  private node:string;
  private closed=false;
  private definition;
  constructor(private gameplay:GameplaySession,id:string){
    const conversations=gameplay.definition.conversations;
    if(!Object.prototype.hasOwnProperty.call(conversations,id))throw new Error('Unknown conversation '+id);
    this.definition=conversations[id];this.node=this.resolve(this.definition.entry.find(entry=>gameplay.matches(entry.when))!.node);const command=this.definition.nodes[this.node].onEnter;if(command&&!gameplay.dispatch(command,'conversation').ok)throw new Error('Conversation entry command refused');
  }
  private resolve(id:string,state?:GameplayState):string{const seen=new Set<string>();for(let i=0;i<32;i++){if(seen.has(id))throw new Error('Conversation redirect cycle');seen.add(id);const next=this.definition.nodes[id].redirect?.find(r=>state?matches(r.when,state):this.gameplay.matches(r.when));if(!next)return id;id=next.node;}throw new Error('Conversation redirect budget');}
  frame():ConversationNode{
    if(this.closed)throw new Error('Conversation closed');
    const node=this.definition.nodes[this.node];
    return{speaker:node.speaker,pages:[...node.pages],choices:node.choices?.filter(choice=>this.gameplay.matches(choice.when)).map(choice=>({...choice}))};
  }
  choose(id:string):GameplayResult{
    if(this.closed)return{ok:false,reason:'disposed'};
    const choice=this.definition.nodes[this.node].choices?.find(choice=>choice.id===id);
    if(!choice||!this.gameplay.matches(choice.when))return{ok:false,reason:'conditions'};
    let next=this.node;
    const result=this.gameplay.dispatchMany(choice.command?[choice.command]:[],'conversation',draft=>{next=this.resolve(choice.next,draft);const command=this.definition.nodes[next].onEnter;return command?[command]:[];});
    if(result.ok)this.node=next;
    return result;
  }
  close(){this.closed=true;}
}
