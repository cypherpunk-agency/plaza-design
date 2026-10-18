/** Shared gameplay contracts. Documents describe operations; they never contain executable code. */
export type Source = 'interaction' | 'conversation' | 'signal' | 'system';
export type StateValue=boolean|number|string;
export interface StateDeclaration {owner:string;lifetime:'save'|'session'|'interaction';type:'boolean'|'number'|'enum';default:StateValue;min?:number;max?:number;options?:string[]}
export interface PurchaseDefinition {basePrice:number;when?:Condition;goods?:{item:string;quantity:number}[];rotation?:{state:string;items:string[]};stock?:string;modifiers?:{id:string;when?:Condition;amount:number;scope:'both'|'quote'|'charge'}[]}
export interface GameplayState { values?:Record<string,StateValue>;flags: Record<string, boolean>; items: Record<string, number>; tokens: number }
export type Condition =
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
export interface ConversationNode { speaker: string; pages: string[]; onEnter?:string; redirect?:{when:Condition;node:string}[]; choices?: ConversationChoice[] }
export interface ConversationDefinition {
  entry: { when?: Condition; node: string }[];
  nodes: Record<string, ConversationNode>;
}
export interface GameplayDefinition {
  version: 1;
  /** Explicit adapter onto existing native nouns, state and delayed cables. */
  native?: NativeBindings;
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
  state:Record<string,string>;
  verbs:{device:string;noun:string;verb:string;denied?:[string,string,('ok'|'err'|'dim')?];cases:{when?:Condition;command:string;say:[string,string,('ok'|'err'|'dim')?]}[]}[];
  events:Record<string,string>;
  goals:Record<string,string>;
  wires:{id:string;from:string;to:string;verb:string;fixed?:boolean}[];
}
export interface GameplayEvent { id: string; command: string; source: Source; cause?: string }
export type GameplayResult =
  | { ok: true; events: readonly Readonly<GameplayEvent>[] }
  | { ok: false; reason: 'unknown-command' | 'forbidden' | 'conditions' | 'resources' | 'budget' | 'busy' | 'disposed' | 'commit' | 'lockout' | 'sealed' | 'watchdog' | 'unknown-noun' | 'unknown-verb' };
export type Eligibility={ok:true}|Extract<GameplayResult,{ok:false}>;
/** write must replace the state atomically. Notifications/persistence belong in afterCommit. */
export interface StatePort { read(): GameplayState; write(state: GameplayState,events?:readonly GameplayEvent[]): void }
