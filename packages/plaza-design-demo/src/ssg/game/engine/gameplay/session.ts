import {readQuery,type GameplayReadContext} from './queries';
import {currentObjective,type ObjectiveDefinition} from './objectives';
import {resolveValues,validValue,stateValue,setStateValue,cloneValues} from './state';
import {applyPurchase,purchaseQuote} from './commerce';
import type { Condition, GameplayDefinition, GameplayEvent, GameplayResult, GameplayState, Source, StatePort } from './types';
import { matches, validateGameplay } from './validation';
export function cloneState(state: GameplayState): GameplayState { return { ...(state.player?{player:{...state.player,controlled:[...state.player.controlled],keyring:[...state.player.keyring]}}:{}),...(state.objective!==undefined?{objective:state.objective}:{}),...(state.world?{world:{...state.world}}:{}),flags:{...state.flags},items:{...state.items},tokens:state.tokens,...(state.values?{values:cloneValues(state.values)}:{}) }; }
function freeze<T>(value:T):Readonly<T>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
/** One command and its authored reactions either all commit or change nothing. No timers/storage/DOM. */
export class GameplaySession {
  readContext?:()=>Omit<GameplayReadContext,'definition'|'queryPath'>;
  queryContext():GameplayReadContext{return {...this.readContext?.(),definition:this.definition};}
  query(id:string,state=this.state()){return readQuery(id,state,this.queryContext());}
  matchesState(condition:Condition|undefined,state:GameplayState){return matches(condition,state,this.queryContext());}
  authorize?:(id:string,source:Source)=>import('./types').Eligibility;
  readonly definition: Readonly<GameplayDefinition>;
  private initialized=false;
  private active=false;
  private disposed=false;
  private cleanup=new Set<()=>void>();
  private listeners=new Set<(event:Readonly<GameplayEvent>)=>void>();
  private history:Readonly<GameplayEvent>[]=[];
  constructor(definition:unknown,private port:StatePort,private afterCommit:()=>void=()=>{},private objectives:readonly ObjectiveDefinition[]=[]){this.definition=freeze(validateGameplay(definition));}
  private refreshObjective(state:GameplayState){if(this.objectives.length){delete state.objective;const next=currentObjective(this.objectives,state,this.queryContext());if(next)state.objective=next.id;}return state;}
  state(){let state=cloneState(this.port.read());if(!this.initialized){const session=Object.entries(this.definition.state??{}).filter(([,d])=>d.lifetime==='session');if(session.length){state.values??={};for(const[id,d]of session)setStateValue(state.values,id,d.default);this.port.write(state);}this.initialized=true;}if(this.definition.state)state.values=resolveValues(this.definition,state);return this.refreshObjective(state);}
  quote(id:string){return purchaseQuote(this.definition,id,this.state(),this.queryContext());}
  matches(condition?:Condition){return this.matchesState(condition,this.state());}
  events(){return [...this.history];}
  clearHistory(){this.history=[];}
  observe(listener:(event:Readonly<GameplayEvent>)=>void){if(this.disposed)throw new Error('Gameplay session disposed');this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
  eligibility(id:string,source:Source):GameplayResult{return this.dispatchMany([id],source,undefined,true);}
  dispatch(id:string,source:Source):GameplayResult{return this.dispatchMany([id],source);}
  /** One transition may combine its choice and explicit node-entry commands atomically. */
  dispatchMany(ids:readonly string[],source:Source,continuation?:(state:GameplayState)=>string[],preview=false):GameplayResult{
    if((!ids.length&&!continuation)||ids.length>64)return{ok:false,reason:'budget'};
    if(this.disposed)return{ok:false,reason:'disposed'};
    if(this.active)return{ok:false,reason:'busy'};
    this.active=true;
    try{
      const draft=this.state(),events:GameplayEvent[]=[],queue:{id:string;source:Source;cause?:string}[]=ids.map(id=>({id,source}));
      let commands=0,actions=0,continued=false;
      for(let i=0;i<queue.length||(continuation&&!continued);i++){
        if(i===queue.length){this.refreshObjective(draft);continued=true;let next:string[];try{next=continuation!(cloneState(draft));}catch{return{ok:false,reason:'budget'};}if(next.length>64)return{ok:false,reason:'budget'};queue.push(...next.map(id=>({id,source})));if(i===queue.length)break;}
        if(++commands>64)return{ok:false,reason:'budget'};
        this.refreshObjective(draft);
        const task=queue[i],command=Object.prototype.hasOwnProperty.call(this.definition.commands,task.id)?this.definition.commands[task.id]:undefined;
        if(!command)return{ok:false,reason:'unknown-command'};
        if(!command.sources.includes(task.source))return{ok:false,reason:'forbidden'};
        const allowed=this.authorize?.(task.id,task.source);if(allowed&&!allowed.ok)return allowed;
        if(!this.matchesState(command.when,draft))return{ok:false,reason:'conditions'};
        const emitted:string[]=[];
        for(const action of command.actions){
          this.refreshObjective(draft);
          if(++actions>512)return{ok:false,reason:'budget'};
          if('state'in action){const d=this.definition.state![action.state],current=stateValue(draft.values,action.state);if('add'in action&&typeof current!=='number')return{ok:false,reason:'resources'};const next='set'in action?action.set:(current as number)+action.add;if(!validValue(d,next))return{ok:false,reason:'resources'};setStateValue(draft.values!,action.state,next);}
          else if('purchase'in action){if(!applyPurchase(this.definition,action.purchase,draft,this.queryContext()))return{ok:false,reason:'resources'};}
          else if('flag'in action)draft.flags[action.flag]=action.value;
          else if('item'in action){const n=(draft.items[action.item]??0)+action.add;if(!Number.isSafeInteger(n)||n<0||n>1_000_000)return{ok:false,reason:'resources'};if(n)draft.items[action.item]=n;else delete draft.items[action.item];}
          else if('tokens'in action){draft.tokens+=action.tokens;if(!Number.isSafeInteger(draft.tokens)||draft.tokens<0||draft.tokens>1_000_000)return{ok:false,reason:'resources'};}
          else{if(events.length>=128)return{ok:false,reason:'budget'};events.push({id:action.emit,command:task.id,source:task.source,...(task.cause?{cause:task.cause}:{})});emitted.push(action.emit);}
        }
        for(const event of emitted)for(const reaction of this.definition.reactions)if(reaction.event===event){if(queue.length>=256)return{ok:false,reason:'budget'};queue.push({id:reaction.command,source:'system',cause:event});}
      }
      this.refreshObjective(draft);
      for(const[id,d]of Object.entries(this.definition.state??{}))if(!validValue(d,stateValue(draft.values,id)))return{ok:false,reason:'resources'};
      if(preview)return{ok:true,events:Object.freeze(events.map(event=>freeze(event)))};
      if(commands===0)return{ok:true,events:Object.freeze([])};
      const persisted=cloneState(draft);
      try{this.port.write(persisted,events);}catch{return{ok:false,reason:'commit'};}
      const published=events.map(event=>freeze(event));
      this.history.push(...published);this.history=this.history.slice(-128);
      // Notifications see committed state. Diagnostic failures and reentrant dispatch cannot affect it.
      try{this.afterCommit();}catch{/* Presentation/persistence failures are separate from committed state. */}
      for(const event of published)for(const listener of [...this.listeners])try{listener(event);}catch{/* observer isolation */}
      return{ok:true,events:Object.freeze(published)};
    }finally{this.active=false;}
  }
  onDispose(cleanup:()=>void){if(this.disposed){cleanup();return()=>{};}this.cleanup.add(cleanup);return()=>{this.cleanup.delete(cleanup);};}
  dispose(){if(this.disposed)return;this.disposed=true;for(const cleanup of [...this.cleanup])try{cleanup();}catch{/* owned cleanup isolation */}this.cleanup.clear();this.listeners.clear();this.history=[];}
}
