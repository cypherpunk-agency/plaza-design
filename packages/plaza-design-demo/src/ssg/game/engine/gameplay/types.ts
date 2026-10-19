import type {TimeWindow} from '../../data/types';
import type {WeatherKind} from '../../world/weather';
/** Shared gameplay contracts. Documents describe operations; they never contain executable code. */
export type Source = 'interaction' | 'conversation' | 'signal' | 'system';
export type StateValue=boolean|number|string;
export interface StateDeclaration {owner:string;lifetime:'save'|'session'|'interaction';type:'boolean'|'number'|'enum'|'string';maxLength?:number;default:StateValue;min?:number;max?:number;options?:string[]}
export interface PurchaseDefinition {service?:true;basePrice:number;when?:Condition;goods?:{item:string;quantity:number}[];rotation?:{state:string;items:string[]};stock?:string;modifiers?:{id:string;when?:Condition;amount:number;scope:'both'|'quote'|'charge'}[]}
export interface GameplayPlayerContext {readonly handle:string;readonly jump:boolean;readonly controlled:readonly string[];readonly keyring:readonly string[]}
export type PlayerCondition={field:'handle';is:string}|{field:'jump';is:boolean}|{collection:'controlled'|'keyring';contains?:string};
export interface GameplayState { player?:Readonly<GameplayPlayerContext>;objective?:string; world?:Readonly<{day:number;minute:number;weather:WeatherKind}>; values?:Record<string,StateValue>;flags: Record<string, boolean>; items: Record<string, number>; tokens: number }
export type Condition =
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
  | {state:string;set:StateValue}
  | {state:string;add:number}
  | {purchase:string}
  | { flag: string; value: boolean }
  | { item: string; add: number }
  | { tokens: number }
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
  handoffs?:{event:string;cutscene?:string;after?:{ms:number;command:string}[]}[];
  state?:Record<string,StateDeclaration>;
  purchases?:Record<string,PurchaseDefinition>;
  flags: string[];
  items: string[];
  events: string[];
  commands: Record<string, GameplayCommand>;
  /** Authored reactions are privileged; player wires cannot call their commands directly. */
  reactions: { event: string; command: string }[];
  conversations: Record<string, ConversationDefinition>;
}
export interface NativeBindings {
  /** Read-only live truthiness; never persisted as a second flag. */
  reads?:Record<string,string>;
  state:Record<string,string>;
  verbs:{device:string;noun:string;verb:string;denied?:[string,string,('ok'|'err'|'dim')?];cases:{when?:Condition;sources?:('interaction'|'signal')[];command:string;template?:true;say:[string,string,('ok'|'err'|'dim')?]|null}[]}[];
  events:Record<string,string>;
  goals:Record<string,string>;
  /** Committed cosmetic stamps on the native scene clock; never saved gameplay state. */
  presentation?:Record<string,{kind:'pulse';target:string}>;
  /** Ordinary workflows consume the existing live scene tick, never a second scheduler. */
  intervals?:Record<string,{kind:'liveInterval';elapsed:string;duration:{tuning:string};active:Condition;inactive:'hold'|'reset';resetOn?:string[];due:{when?:Condition;command:string}[]}>;
  /** Committed outcomes speak through the existing native device caption/history path. */
  replies?:Record<string,{from:string;say:[string,string,('ok'|'err'|'dim')?];template?:true}>;
  wires?:{id?:string;from:string;to:string;verb:string;fixed?:boolean}[];
}
export interface GameplayEvent { id: string; command: string; source: Source; cause?: string }
export type GameplayResult =
  | { ok: true; events: readonly Readonly<GameplayEvent>[] }
  | { ok: false; reason: 'unknown-command' | 'forbidden' | 'conditions' | 'resources' | 'budget' | 'busy' | 'disposed' | 'commit' | 'lockout' | 'sealed' | 'watchdog' | 'unknown-noun' | 'unknown-verb' };
export type Eligibility={ok:true}|Extract<GameplayResult,{ok:false}>;
/** write must replace the state atomically. Notifications/persistence belong in afterCommit. */
export interface StatePort { read(): GameplayState; write(state: GameplayState,events?:readonly GameplayEvent[]): void }
