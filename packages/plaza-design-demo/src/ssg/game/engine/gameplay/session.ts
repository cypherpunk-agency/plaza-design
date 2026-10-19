import type {GameplayDomainTransaction,DomainNotice} from '../scene-domains';
import {readQuery,scalarRead,type GameplayReadContext} from './queries';
import {currentObjective,type ObjectiveDefinition} from './objectives';
import {resolveValues,validValue,validStateNumber,stateValue,setStateValue,cloneValues} from './state';
import {applyPurchase,purchaseQuote} from './commerce';
import type { Condition, GameplayDefinition, GameplayGrant, GameplayEvent, GameplayResult, GameplayState, Source, StatePort } from './types';
import { matches, validateGameplay } from './validation';
export function cloneState(state: GameplayState): GameplayState { return { ...(state.player?{player:{...state.player,controlled:Array.isArray(state.player.controlled)?[...state.player.controlled]:state.player.controlled,keyring:Array.isArray(state.player.keyring)?[...state.player.keyring]:state.player.keyring}}:{}),...(state.objective!==undefined?{objective:state.objective}:{}),...(state.world?{world:{...state.world}}:{}),flags:{...state.flags},items:{...state.items},tokens:state.tokens,...(state.values?{values:cloneValues(state.values)}:{}) }; }
function freeze<T>(value:T):Readonly<T>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
/** One command and its authored reactions either all commit or change nothing. No timers/storage/DOM. */
export class GameplaySession {
  /** Installed once the actual local model exists; disposal removes that same capability. */
  domain?:()=>GameplayDomainTransaction;
  readContext?:()=>Omit<GameplayReadContext,'definition'|'queryPath'>;
  private transactionContext?:GameplayReadContext;
  queryContext():GameplayReadContext{return this.transactionContext??{...this.readContext?.(),definition:this.definition};}
  query(id:string,state=this.state()){return readQuery(id,state,this.queryContext());}
  matchesState(condition:Condition|undefined,state:GameplayState){return matches(condition,state,this.queryContext());}
  /** Source metadata lookup only; never performs the grant. */
  keyringKnown?:(id:string)=>boolean;
  controlledKnown?:(id:string)=>boolean;
  private grantListeners=new Set<(grant:Readonly<GameplayGrant>)=>void>();
  observeGrants(listener:(grant:Readonly<GameplayGrant>)=>void){if(this.disposed)throw new Error('Gameplay session disposed');this.grantListeners.add(listener);return()=>{this.grantListeners.delete(listener);};}
  authorize?:(id:string,source:Source,domain?:GameplayDomainTransaction)=>import('./types').Eligibility;
  readonly definition: Readonly<GameplayDefinition>;
  private active=false;
  private disposed=false;
  private cleanup=new Set<()=>void>();
  private listeners=new Set<(event:Readonly<GameplayEvent>)=>void>();
  private history:Readonly<GameplayEvent>[]=[];
  constructor(definition:unknown,private port:StatePort,private afterCommit:()=>void=()=>{},private objectives:readonly ObjectiveDefinition[]=[],vocabulary?:{keyring?:ReadonlySet<string>;controlled?:ReadonlySet<string>}){this.definition=freeze(validateGameplay(definition));if(vocabulary?.keyring)this.keyringKnown=id=>vocabulary.keyring!.has(id);if(vocabulary?.controlled)this.controlledKnown=id=>vocabulary.controlled!.has(id);const session=Object.entries(this.definition.state??{}).filter(([,d])=>d.lifetime==='session');if(session.length){const initial=cloneState(this.port.read());initial.values??={};for(const[id,d]of session)setStateValue(initial.values,id,d.default);this.port.write(initial);}}
  private refreshObjective(state:GameplayState){if(this.objectives.length){delete state.objective;const next=currentObjective(this.objectives,state,this.queryContext());if(next)state.objective=next.id;}return state;}
  state(){const state=cloneState(this.port.read());if(this.definition.state)state.values=resolveValues(this.definition,state);return this.refreshObjective(state);}
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
      this.transactionContext={...this.readContext?.(),definition:this.definition};
      const draft=this.state(),events:GameplayEvent[]=[],notifications:({event:GameplayEvent}|{grant:GameplayGrant}|{domain:DomainNotice})[]=[],queue:{id:string;source:Source;cause?:string}[]=ids.map(id=>({id,source}));
      let commands=0,actions=0,continued=false,domain:GameplayDomainTransaction|undefined;
      for(let i=0;i<queue.length||(continuation&&!continued);i++){
        if(i===queue.length){this.refreshObjective(draft);continued=true;let next:string[];try{next=continuation!(cloneState(draft));}catch{return{ok:false,reason:'budget'};}if(next.length>64)return{ok:false,reason:'budget'};queue.push(...next.map(id=>({id,source})));if(i===queue.length)break;}
        if(++commands>64)return{ok:false,reason:'budget'};
        this.refreshObjective(draft);
        const task=queue[i],command=Object.prototype.hasOwnProperty.call(this.definition.commands,task.id)?this.definition.commands[task.id]:undefined;
        if(!command)return{ok:false,reason:'unknown-command'};
        if(!command.sources.includes(task.source))return{ok:false,reason:'forbidden'};
        const allowed=this.authorize?.(task.id,task.source,domain);if(allowed&&!allowed.ok)return allowed;
        if(!this.matchesState(command.when,draft))return{ok:false,reason:'conditions'};
        const emitted:string[]=[];
        for(const action of command.actions){
          this.refreshObjective(draft);
          if(++actions>512)return{ok:false,reason:'budget'};
          if('wire'in action||'trace'in action){
            if(!domain){if(!this.domain)return{ok:false,reason:'resources'};domain=this.domain();}
            const delta='trace'in action?(typeof action.trace.add==='number'?action.trace.add:scalarRead(action.trace.add,draft,this.queryContext())):undefined;
            if('trace'in action&&(typeof delta!=='number'||!Number.isFinite(delta)))return{ok:false,reason:'resources'};
            const outcome=domain.reduce(action,delta as number|undefined);if(!outcome.ok)return outcome;
            Object.assign(this.transactionContext!,domain.context());notifications.push(...domain.takeNotices().map(notice=>({domain:notice})));
          }
          else if('grant'in action){const grant=action.grant,player=draft.player;if(!player)return{ok:false,reason:'resources'};const origin={command:task.id,source:task.source,...(task.cause?{cause:task.cause}:{})};
            if('keyring'in grant){const id=grant.keyring;if(!Array.isArray(player.keyring)||!this.keyringKnown?.(id))return{ok:false,reason:'resources'};if(!player.keyring.includes(id)){draft.player={...player,keyring:[...player.keyring,id]};notifications.push({grant:{kind:'keyring',id,...origin}});}}
            else if('ability'in grant){if(typeof player.jump!=='boolean')return{ok:false,reason:'resources'};if(!player.jump){draft.player={...player,jump:true};notifications.push({grant:{kind:'ability',id:'jump',...origin}});}}
            else{const id=typeof grant.controlled==='string'?grant.controlled:scalarRead(grant.controlled,draft,this.queryContext());if(typeof id!=='string'||!Array.isArray(player.controlled)||!this.controlledKnown?.(id))return{ok:false,reason:'resources'};if(!player.controlled.includes(id)){draft.player={...player,controlled:[...player.controlled,id]};notifications.push({grant:{kind:'controlled',id,...origin}});}}
          }
          else if('state'in action){const d=this.definition.state![action.state],current=stateValue(draft.values,action.state),raw='set'in action?action.set:action.add,value=raw!==null&&typeof raw==='object'?scalarRead(raw,draft,this.queryContext()):raw;if('add'in action&&(typeof current!=='number'||!validStateNumber(d,value)))return{ok:false,reason:'resources'};const next='set'in action?value:(current as number)+(value as number);if(!validValue(d,next))return{ok:false,reason:'resources'};setStateValue(draft.values!,action.state,next);}
          else if('purchase'in action){if(!applyPurchase(this.definition,action.purchase,draft,this.queryContext()))return{ok:false,reason:'resources'};}
          else if('flag'in action)draft.flags[action.flag]=action.value;
          else if('item'in action){const amount=typeof action.add==='object'?scalarRead(action.add,draft,this.queryContext()):action.add;if(typeof amount!=='number'||!Number.isSafeInteger(amount)||Math.abs(amount)>1_000_000)return{ok:false,reason:'resources'};const n=(draft.items[action.item]??0)+amount;if(!Number.isSafeInteger(n)||n<0||n>1_000_000)return{ok:false,reason:'resources'};if(n)draft.items[action.item]=n;else delete draft.items[action.item];}
          else if('tokens'in action){const amount=typeof action.tokens==='object'?scalarRead(action.tokens,draft,this.queryContext()):action.tokens;if(typeof amount!=='number'||!Number.isSafeInteger(amount)||Math.abs(amount)>1_000_000)return{ok:false,reason:'resources'};draft.tokens+=amount;if(!Number.isSafeInteger(draft.tokens)||draft.tokens<0||draft.tokens>1_000_000)return{ok:false,reason:'resources'};}
          else{if(events.length>=128)return{ok:false,reason:'budget'};const event={id:action.emit,command:task.id,source:task.source,...(task.cause?{cause:task.cause}:{})};events.push(event);notifications.push({event});emitted.push(action.emit);}
        }
        for(const event of emitted)for(const reaction of this.definition.reactions)if(reaction.event===event){if(queue.length>=256)return{ok:false,reason:'budget'};queue.push({id:reaction.command,source:'system',cause:event});}
      }
      this.refreshObjective(draft);
      for(const[id,d]of Object.entries(this.definition.state??{}))if(!validValue(d,stateValue(draft.values,id)))return{ok:false,reason:'resources'};
      if(preview)return{ok:true,events:Object.freeze(events.map(event=>freeze(event)))};
      if(commands===0)return{ok:true,events:Object.freeze([])};
      const persisted=cloneState(draft);
      try{this.port.write(persisted,events);}catch{return{ok:false,reason:'commit'};}
      // Prepared canonical assignments contain no callbacks or failure points.
      domain?.commit();
      const published=events.map(event=>freeze(event));
      if(!this.disposed){this.history.push(...published);this.history=this.history.slice(-128);}
      // Notifications see committed state. Diagnostic failures and reentrant dispatch cannot affect it.
      if(!this.disposed)try{this.afterCommit();}catch{/* Presentation/persistence failures are separate from committed state. */}
      for(const notification of notifications){
        if(this.disposed)break;
        if('event'in notification){
          for(const listener of [...this.listeners]){if(this.disposed)break;if(!this.listeners.has(listener))continue;try{listener(freeze(notification.event));}catch{/* observer isolation */}}
        }else if('grant'in notification){
          for(const listener of [...this.grantListeners]){if(this.disposed)break;if(!this.grantListeners.has(listener))continue;try{listener(freeze(notification.grant));}catch{/* observer isolation */}}
        }else try{domain!.notify(notification.domain);}catch{/* committed mechanical/presentation notification isolation */}
      }
      if(domain&&!this.disposed)try{domain.refresh();}catch{/* committed refresh isolation */}
      return{ok:true,events:Object.freeze(published)};
    }finally{this.transactionContext=undefined;this.active=false;}
  }
  onDispose(cleanup:()=>void){if(this.disposed){cleanup();return()=>{};}this.cleanup.add(cleanup);return()=>{this.cleanup.delete(cleanup);};}
  dispose(){if(this.disposed)return;this.disposed=true;for(const cleanup of [...this.cleanup])try{cleanup();}catch{/* owned cleanup isolation */}this.cleanup.clear();this.listeners.clear();this.grantListeners.clear();this.history=[];}
}
