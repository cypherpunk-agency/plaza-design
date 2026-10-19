import {renderGameplayText,type GameplayTextContext} from './text-template';
import { GameplaySession } from './session';
import type { ConversationNode,ConversationChoice, GameplayResult,GameplayState } from './types';
export interface ConversationFrame extends Omit<ConversationNode,'choices'>{acceptsText?:true;choices?:(ConversationChoice&{echo?:false})[]}
/** Frames/closing are pure. Explicit onEnter runs once per actual entry, atomically with a choice. */
export class ConversationSession {
  private node:string;
  private closed=false;
  private freeMiss=false;
  private definition;
  get sayCommand(){return this.definition.sayCommand;}
  constructor(private gameplay:GameplaySession,id:string,private context:Readonly<GameplayTextContext>={}){
    const conversations=gameplay.definition.conversations;
    if(!Object.prototype.hasOwnProperty.call(conversations,id))throw new Error('Unknown conversation '+id);
    this.definition=conversations[id];this.node=this.resolve(this.definition.entry.find(entry=>gameplay.matches(entry.when))!.node);const entry=this.definition.nodes[this.node];if(entry.onEnter&&!gameplay.dispatch(entry.onEnter,'conversation').ok){if(!entry.onEnterFailure)throw new Error('Conversation entry command refused');this.node=entry.onEnterFailure;}
  }
  private resolve(id:string,state?:GameplayState):string{const seen=new Set<string>();for(let i=0;i<32;i++){if(seen.has(id))throw new Error('Conversation redirect cycle');seen.add(id);const next=this.definition.nodes[id].redirect?.find(r=>state?this.gameplay.matchesState(r.when,state):this.gameplay.matches(r.when));if(!next)return id;id=next.node;}throw new Error('Conversation redirect budget');}
  frame():ConversationFrame{
    if(this.closed)throw new Error('Conversation closed');
    const node=this.definition.nodes[this.node];
    if(this.freeMiss){const free=this.definition.free!;return{speaker:node.speaker,pages:[free.miss],choices:[{id:'free-input-retry',label:free.retry,next:free.retryNext,echo:false}]};}
    return{speaker:node.speaker,pages:node.template?renderGameplayText(node.pages,this.gameplay.state(),this.context,this.gameplay.queryContext()):[...node.pages],...(node.template?{template:true as const}:{}),...(node.completion?{completion:{...node.completion}}:{}),choices:node.choices?.filter(choice=>this.gameplay.matches(choice.when)).map(choice=>({...choice})),...(this.definition.free&&node.choices?{acceptsText:true as const}:{})};
  }
  choose(id:string):GameplayResult{
    if(this.closed)return{ok:false,reason:'disposed'};
    const choice=this.frame().choices?.find(choice=>choice.id===id);
    if(!choice||!this.gameplay.matches(choice.when))return{ok:false,reason:'conditions'};
    return this.transition(choice.next,choice.command);
  }
  submit(text:string):GameplayResult{
    if(this.closed)return{ok:false,reason:'disposed'};
    const free=this.definition.free,line=typeof text==='string'?text.trim():'';
    if(!free||!this.frame().acceptsText||!line||line.length>2000)return{ok:false,reason:'conditions'};
    if(!free.containsAny.some(fragment=>line.toLowerCase().includes(fragment.toLowerCase()))){this.freeMiss=true;return{ok:true,events:Object.freeze([])};}
    return this.transition(free.next);
  }
  private transition(target:string,command?:string):GameplayResult{
    let next=this.node,failure:string|undefined;const result=this.gameplay.dispatchMany(command?[command]:[],'conversation',draft=>{next=this.resolve(target,draft);const entry=this.definition.nodes[next];if(entry.onEnter)failure=entry.onEnterFailure;return entry.onEnter?[entry.onEnter]:[];});
    if(result.ok){this.node=next;this.freeMiss=false;}else if(failure){
      // The choice and its reactions reached the entry stage. The entire refused
      // transaction remains rolled back; only dialogue navigation reaches its sink.
      this.node=failure;this.freeMiss=false;return{ok:true,events:Object.freeze([])};
    }return result;
  }
  close(){this.closed=true;}
}
