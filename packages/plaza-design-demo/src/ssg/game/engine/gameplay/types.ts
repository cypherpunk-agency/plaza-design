import type {DomainAction} from '../scene-domains';
import type {NativeInput} from './native-inputs';
import type {NativeDeadline} from './native-deadlines';
import type {NativeLiveCondition,NativeWorkflowPhase} from './native-live-conditions';
import type {QueryDefinition,ScalarRead} from './queries';
import type {TimeWindow} from '../../data/types';
import type {WeatherKind} from '../../world/weather';
/** Shared gameplay contracts. Documents describe operations; they never contain executable code. */
export type GameplayPresentation='end';
export type Source = 'interaction' | 'conversation' | 'signal' | 'system';
export type StateValue=boolean|number|string|null;
export type StateValues=Record<string,Record<string,StateValue>>;
export interface StateDeclaration {owner:string;lifetime:'save'|'session'|'interaction';type:'boolean'|'number'|'enum'|'string';maxLength?:number;nullable?:boolean;integer?:boolean;default:StateValue;min?:number;max?:number;options?:string[]}
export interface PurchaseDefinition {service?:true;basePrice:number;when?:Condition;goods?:{item:string;quantity:number}[];rotation?:{state:string;items:string[]};stock?:string;modifiers?:{id:string;when?:Condition;amount:number;scope:'both'|'quote'|'charge'}[]}
export interface GameplayPlayerContext {readonly handle:string;readonly jump:boolean;readonly controlled:readonly string[];readonly keyring:readonly string[]}
export type PlayerCondition={field:'handle';is:string}|{field:'jump';is:boolean}|{collection:'controlled'|'keyring';contains?:string|ScalarRead};
export interface GameplayState { player?:Readonly<GameplayPlayerContext>;objective?:string; world?:Readonly<{day:number;minute:number;weather:WeatherKind}>; values?:StateValues;flags: Record<string, boolean>; items: Record<string, number>; tokens: number }
export type Condition =
  | {compare:{left:ScalarRead;op:'eq'|'ne'|'lt'|'lte'|'gt'|'gte';right:ScalarRead}}
  | {player:PlayerCondition}
  | {objective:string}
  | { time:TimeWindow }
  | { weather:WeatherKind[] }
  | { state:string;is:StateValue }
  | { flag: string; is?: boolean }
  | { item: string; atLeast: number }
  | { tokensAtLeast: number }
  | { all: Condition[] } | { any: Condition[] } | { not: Condition };
export type GameplayAction =
  | DomainAction
  | {grant:{keyring:string}|{ability:'jump'}|{controlled:string|ScalarRead}}
  | {state:string;set:StateValue|ScalarRead}
  | {state:string;add:number|ScalarRead}
  | {purchase:string}
  | { flag: string; value: boolean }
  | { item: string; add: number|ScalarRead }
  | { tokens: number|ScalarRead }
  | { emit: string };
export interface GameplayCommand {
  sources: Source[];
  when?: Condition;
  actions: GameplayAction[];
}
export interface ConversationChoice { id: string; label: string; when?: Condition; command?: string; next: string }
export interface ConversationNode { speaker: string; pages: string[];template?:true;completion?:{terminalPrefill:string}; onEnter?:string;/** Pure sink shown when this node's entry command refuses; no action is committed. */onEnterFailure?:string; redirect?:{when:Condition;node:string}[]; choices?: ConversationChoice[] }
export interface ConversationDefinition {
  sayCommand?:string;
  entry: { when?: Condition; node: string }[];
  nodes: Record<string, ConversationNode>;
  /** Literal case-insensitive fragments, not executable regular expressions. */
  free?:{containsAny:string[];next:string;miss:string;retry:string;retryNext:string};
}
export interface GameplayDefinition {
  version: 1;
  /** Explicit adapter onto existing native nouns, state and delayed cables. */
  native?: NativeBindings;
  /** Committed events request existing cinematics and scene-clock system commands. */
  handoffs?:{event:string;cutscene?:string;presentation?:GameplayPresentation;after?:{ms:number;command:string}[]}[];
  /** Ordered current-save normalization, evaluated on a copy through shared state commands. */
  checkpoint?:{when?:Condition;command:string}[];
  state?:Record<string,StateDeclaration>;
  /** Read-only references to another declaration; no defaults, ownership or stored copies. */
  stateReads?:Record<string,StateDeclaration['type']>;
  /** World-level owners (world/state-owners.json) whose declared keys this definition reads and writes. */
  sharedState?:string[];
  /** Pure reads derived from the current draft and its source; never persisted. */
  queries?:Record<string,QueryDefinition>;
  purchases?:Record<string,PurchaseDefinition>;
  flags: string[];
  items: string[];
  events: string[];
  commands: Record<string, GameplayCommand>;
  /** Authored reactions are privileged; player wires cannot call their commands directly. */
  reactions: { event: string; command: string }[];
  conversations: Record<string, ConversationDefinition>;
}
export interface NativeReplyLine {from:string;say:[string,string,('ok'|'err'|'dim')?]|{text:string};template?:true}
export type NativeReply=NativeReplyLine|{cases:(NativeReplyLine&{when?:Condition})[]};
export type NativeSay=[string,string,('ok'|'err'|'dim')?]|{text:string|{query:string}}|null;
export interface NativeBindings {
  /** One-page shared conversations fill a response slot; previews never enter the graph. */
  responseConversations?:Record<string,{conversation:string;variable:string}>;
  inputs?:Record<string,NativeInput>;
  /** Read-only live truthiness; never persisted as a second flag. */
  reads?:Record<string,string>;
  verbs:{device:string;noun:string;verb:string;denied?:[string,string,('ok'|'err'|'dim')?];cases:{when?:Condition;sources?:('interaction'|'signal')[];command:string;template?:true;say:NativeSay}[]}[];
  events:Record<string,string>;
  goals:Record<string,string>;
  /** Committed cosmetic stamps on the native scene clock; never saved gameplay state. */
  presentation?:Record<string,{kind:'pulse';target:string}>;
  /** Ordinary workflows consume the existing live scene tick, never a second scheduler. */
  triggers?:Record<string,NativeLiveCondition>;
  intervals?:Record<string,{kind:'liveInterval';phase?:NativeWorkflowPhase;elapsed:string;duration:{tuning:string};active:Condition;inactive:'hold'|'reset';resetOn?:string[];due:{when?:Condition;command:string}[]}>;
  /** Named cancelable actions use the existing SceneTime, including pause/reset/restore. */
  deadlines?:Record<string,NativeDeadline>;
  /** Committed outcomes speak through the existing native device caption/history path. */
  replies?:Record<string,NativeReply>;
  wires?:{id?:string;from:string;to:string;verb:string;fixed?:boolean}[];
}
/** A committed resource grant, distinct from authored event vocabulary. */
export type GameplayGrant={command:string;source:Source;cause?:string}&({kind:'keyring'|'controlled';id:string}|{kind:'ability';id:'jump'});
export interface GameplayEvent { id: string; command: string; source: Source; cause?: string }
export type GameplayResult =
  | { ok: true; events: readonly Readonly<GameplayEvent>[] }
  | { ok: false; reason: 'fixed' | 'unknown-event' | 'unknown-command' | 'forbidden' | 'conditions' | 'resources' | 'budget' | 'busy' | 'disposed' | 'commit' | 'lockout' | 'sealed' | 'watchdog' | 'unknown-noun' | 'unknown-verb' };
export type Eligibility={ok:true}|Extract<GameplayResult,{ok:false}>;
/** write must replace the state atomically. Notifications/persistence belong in afterCommit. */
export interface StatePort { read(): GameplayState; write(state: GameplayState,events?:readonly GameplayEvent[]): void }
