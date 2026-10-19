import {mintFeedback,mintFeedbackCause,type FeedbackReceipt} from './feedback-receipt';
import {readObservation} from './native-observations';
/**
 * A scene's rules, for any scene file: devices made of nouns, nouns with verbs,
 * events on nouns, and cables that say "when this noun does X, that noun does Y".
 *
 * What a scene contains and says lives in its data file (see GAME-DATA.md);
 * the scene's own fiddly rules run as named effects (`SceneRules`, next to its
 * scene). On top, the hacking layer, all switched on from data:
 * - GUARD nouns: logins whose password hides in clue fragments on the keyring;
 * - sealed sectors: nouns that show as `???` until a key, a guard or a seal opens them;
 * - LOG nouns and trace: a meter that fills while you are inside, and kicks you out;
 * - LINK nouns and the net: `scan` shows nodes, `connect` brings them onto the board.
 *
 * It knows nothing about drawing: the scene (canvas) and the schematic (DOM)
 * read it and call `act`, `connect`, `cut`, `guess`, `useItem`.
 * Pure apart from timers: node can run it (see `now`).
 */

import { ENGINE, KEYRING, LOGIC, NET, START_MODULES } from "../data/index";
import type {
  Action, CableData, Case, DeviceData, KeyItem, Kind, LineData, LineRef, LogicData, MachineData, NetData, NetworkData, NounData, ProgramData, SectorData, StatusPart, TimeWindow, Value, WatchdogData, SceneData, SceneSave,
} from '../data/types';
import { ENGINE_EFFECTS, type Vars, type World, type SceneRules } from './rules';
// [the net] networks and what you reach from where you are plugged in (NET.md)
import { machinesOf, reachNets } from './net';
// [engine features: watchdog, clocks] (scene/watchdog.ts, scene/clock.ts)
import { Clocks } from './clock';
import { type DogView, Watchdogs } from './watchdog';
import { SceneTime } from './time';

/**
 * Data kinds, plus two the engine makes: SEAL (the input of a sector sealed
 * with a sequence) and WATCH (the watchdog's noun on each device of its route).
 */
export type NounKind = Kind | 'SEAL' | 'WATCH';

/**
 * The city, as every scene's conditions see it (TIME.md): the game plugs it in (game.ts). `read`:
 * the keys every scene has (`weather`, `hour`, `day`) for a scene id; `when`: is a time window now?
 * Unplugged (the build's check, tests): no city keys, and every window holds.
 */
export const CITY_KEYS = ['weather', 'hour', 'day'] as const;
export const CITY: { read?: (key: string, scene: string) => Value | undefined; when?: (w: TimeWindow) => boolean } = {};
const now = (w: TimeWindow | undefined) => !w || !CITY.when || CITY.when(w);
export type Line = [cmd: string, reply: string, tone?: 'ok' | 'err' | 'dim'];

export interface Noun {
  id: string;
  kind: NounKind;
  /** Its verbs now (a GUARD's grow with the keyring, a LINK's with what it has scanned). */
  readonly verbs: string[];
  /** Events this noun raises; cables start here. */
  events?: string[];
  /** The verb that reflects the current state, highlighted on the schematic. */
  current?: () => string | null;
  /** The sealed sector it sits in (sealed or not: ask `sealed`). */
  sector?: string;
  run: (verb: string, bySignal: boolean) => Line | null;
}

export interface Device {
  id: string;
  name: string;
  look: string;
  crafted?: boolean;
  /** A logic part placed from the board (TIMER, SWITCH). Also `crafted` for now. */
  logic?: boolean;
  /** A computer on the net, connected through a LINK: on the board only. */
  node?: boolean;
  data: DeviceData;
  status: () => string;
  nouns: Noun[];
}

/**
 * A cable: when `from` (device.noun:event) fires, `to` (device.noun) does `verb`.
 * A pre-wired one carries its data id (`wired`), and may be `fixed` (uncuttable).
 */
export interface Link { from: string; to: string; verb: string; fixed?: boolean; wired?: string }

/** Where a verb is running: which device and noun, and whether a cable sent it. */
export interface Ctx { dev: string; noun: string; verb: string; bySignal: boolean }

/** A device standing in the world, from its `layout.spot`: centre x, size, and how high its bottom sits (0: on the street). */
export interface Spot { id: string; x: number; w: number; h: number; y: number }

export interface SceneHooks {
  /** Optional read-only diagnostic events. Exceptions are isolated from engine execution. */
  observe?: (event: Readonly<SceneTrace>) => void;
  /**
   * A line to show. `from`: who said it, when the model knows: the device whose verb ran
   * (or whose effect names itself), or another speaker an effect names ('pixel'). The host
   * puts it as a caption over that thing; without `from` it goes to the terminal only.
   */
  say: (line: Line, from?: string, receipt?:FeedbackReceipt) => void;
  feedbackScope?:string;
  /** Open a panel: `talk` (arg: the dialogue), or one of the scene's own (`camera`). */
  open: (panel: string, arg?: string) => void;
  changed: () => void;
  /** A full trace threw the player out of this device. */
  kick?: (dev: string) => void;
  /** The logic modules the player owns (`timer.so`, …). Default: what a new game starts with. */
  modules?: () => string[];
  /** The player's keyring (item ids), shared by every scene. Default: the model keeps its own. */
  keyring?: () => string[];
  /** Put an item on the keyring (and save). */
  give?: (id: string) => void;
  /** The player now owns this logic module (and save). Default: the model keeps its own list. */
  grant?: (module: string) => void;
  /** Add noodle tokens; returns the new total. Default: the model counts its own. */
  tokens?: (add: number) => number;
  /**
   * What the player carries (the save's `items`, scenes/kit.ts `ITEMS`): add `n` of an item (0 to
   * only ask; negative to take) and return how many are held now. Default: the model keeps its own.
   */
  carry?: (item: string, n: number) => number;
  /** Set a save flag (a story beat a scene's code marks: `p13`). Default: the model keeps its own. */
  flag?: (name: string) => void;
  /** A made fragment was thrown off the keyring (already gone from `keyring()`): write the save. */
  drop?: (id: string) => void;
  /** Sudo mode (`?sudo`): every LINK reaches every node there is (the scene's and net.json's). */
  sudo?: () => boolean;
  /** The programs the player owns (`scan.so`). Default: the model keeps its own list. */
  programs?: () => string[];
  /** The player now owns this program (and save). */
  program?: (id: string, receipt?:FeedbackReceipt) => void;
  /** The nodes the player controls, by Registry label (`0x2F`): access points onto their networks. */
  controlled?: () => string[];
}

export interface SceneTrace { phase: 'trigger' | 'condition' | 'action' | 'result'; context: Ctx; detail: unknown }

const list = <T>(x: T | T[]) => (Array.isArray(x) ? x : [x]);
/** "crane.job.log" → ["crane", "job.log"]: noun ids may contain dots. */
const split = (key: string) => { const i = key.indexOf('.'); return [key.slice(0, i), key.slice(i + 1)]; };
/** Passwords forgive case, spaces, dashes and underscores. */
const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
const clamp = (v: number) => Math.max(0, Math.min(100, v));
const secs = (ms: number) => Math.max(1, Math.ceil(ms / 1000));
/** "a,join(b,c)" → ["a", "join(b,c)"]: commas inside a made fragment's recipe stay with it. */
const splitArgs = (s: string) => {
  const out: string[] = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === ',' && !depth) { out.push(cur); cur = ''; continue; }
    if (ch === '(') depth++; else if (ch === ')') depth--;
    cur += ch;
  }
  out.push(cur);
  return out;
};
/** What a rule chip does to a fragment, and how the new chip is labelled. */
const RULES: Record<string, { fn: (s: string) => string; tag: string }> = {
  reverse: { fn: (s) => s.split('').reverse().join(''), tag: '(reversed)' },
  upper: { fn: (s) => s.toUpperCase(), tag: '(upper)' },
  lower: { fn: (s) => s.toLowerCase(), tag: '(lower)' },
};
/** Made fragments stop growing here: a password, not an essay. */
const MAX_FRAGMENT = 40;

/** Defaults for the hacking layer, when the data leaves them out. */
const GUARD_LOCK_MS = 5000;
const LOG_LOCK_MS = 10000;
const LOG_LINGER_MS = 3000;
/** Trace raised on a device without a log (a wrong guess) drains at this rate, %/s. */
const BARE_FALL = 5;
/** The program that lets a LINK scan, and connect beyond what it knows (NET.md). */
export const SCAN = 'scan.so';
/** The noun the engine puts on every device of a watchdog's route. */
export const WATCH_NOUN = 'watchdog';
/** A pre-wired cable's id: its own, or `from>to`. */
export const wiredId = (c: CableData) => c.id ?? c.from + '>' + c.to;

export class SceneModel {
  /** The scene's state keys. Starting values come from the scene's `state`. */
  state: Record<string, Value> = {};
  /** Numbers effects keep while things are in flight (a slide's start). Not saved; cleared by reset. */
  scratch: Record<string, number> = {};
  links: Link[] = [];
  /** Cables currently carrying a signal, for the glow. */
  live = new Set<Link>();
  goals = new Set<string>();
  devices = new Map<string, Device>();
  /** Sectors opened: `device/sector`. */
  opened = new Set<string>();
  /** Guards whose password was found: `device.noun`. */
  passed = new Set<string>();
  /** Trace per device, 0–100. */
  trace = new Map<string, number>();
  /** Wall-clock lockout deadlines: a device (`dev`) or a guard (`dev.noun`). */
  locks = new Map<string, number>();
  /** Net nodes met: seen on a scan (a silhouette on the board), or connected (a device). */
  net = new Map<string, 'seen' | 'connected'>();
  /** Where each logic part floats in the world in hack vision (x along the scene, h above the ground). */
  logicAt = new Map<string, { x: number; h: number }>();
  /** Devices the player is looking into right now (the host sets it: a device's schematic). */
  viewing = new Set<string>();
  private time = new SceneTime();
  private inspecting=false;
  private recent:Readonly<SceneTrace>[]=[];
  enableInspection(){this.inspecting=true;}
  inspect(){return structuredClone({state:this.state,goals:[...this.goals],links:this.links,live:[...this.live],trace:Object.fromEntries(this.trace),locks:[...this.locks].map(([key])=>({key,remainingMs:this.lockLeft(key)})),time:this.time.inspect(),clocks:[...this.devices.values()].flatMap(d=>d.nouns.filter(n=>n.kind==='CLOCK').map(n=>({key:d.id+'.'+n.id,next:this.clocks.next(d.id+'.'+n.id)}))),watchdog:this.watchdogs(),recent:this.recent,devices:[...this.devices.values()].map(d=>({id:d.id,name:d.name,status:d.status(),nouns:d.nouns.map(n=>({id:n.id,kind:n.kind,verbs:n.verbs,eligibility:Object.fromEntries(n.verbs.map(verb=>[verb,{manual:this.eligibility(d.id,n.id,verb),signal:this.eligibility(d.id,n.id,verb,true)}])),events:n.events??[]}))}))});}

  /** Scene time: held while paused. A focused check can swap it. */
  now: () => number = () => this.time.now();
  /** The wall clock, for lockouts that must run on while the game is closed. A test can swap it. */
  wall: () => number = () => Date.now();
  // [engine features] the watchdog, clocks, cuts of pre-wired cables, lockout lengths, modules and tokens without a save
  readonly dogs: Watchdogs;
  readonly clocks: Clocks;
  private cuts = new Set<string>();
  private spans = new Map<string, number>();
  private ownModules: string[] = [];
  private ownTokens = 0;
  private ownItems: Record<string, number> = {};
  private ownFlags = new Set<string>();
  private ownPrograms: string[] = [];
  /** The net's networks and the programs there are (net.json). */
  readonly nets: NetworkData[];
  private programList: ProgramData[];
  readonly texts: Record<string, string | LineData>;
  /** Per-device state (a SWITCH's on/off), keyed by device id. */
  private local = new Map<string, Record<string, Value>>();
  private placed = new Map<string, number>();
  private touched = new Map<string, number>();
  private fails = new Map<string, number>();
  private seq = new Map<string, { i: number; t: number }>();
  private nodeData = new Map<string, DeviceData>();
  /** Pre-wired cables of the scene and the net; those touching a node wait until it is connected. */
  private prewired: CableData[];
  private ownKeyring: string[] = [];
  /** Every keyring item this scene may meet: the game's, its own, the net's. */
  private keys: Map<string, KeyItem>;
  private sealing = false;
  /** Bumped by reset and restore: timers started before it never fire. */
  private epoch = 0;

  constructor(private hooks: SceneHooks, readonly data: SceneData, readonly rules: SceneRules, readonly logic: LogicData = LOGIC, net: NetData = NET, keyring:ReadonlyMap<string,KeyItem> = KEYRING) {
    this.texts = { ...ENGINE.texts, ...data.texts };
    this.nets = net.networks ?? [];
    this.programList = net.programs ?? [];
    for (const n of [...net.nodes, ...(data.nodes ?? [])]) this.nodeData.set(n.id, n);
    this.prewired = [...data.cables, ...net.cables];
    this.keys = new Map([...keyring, ...[...net.keyring, ...(data.keyring ?? [])].map((k) => [k.id, k] as const)]);
    this.dogs = new Watchdogs([data.watchdog, net.watchdog].filter((w): w is WatchdogData => !!w), () => this.now());
    this.clocks = new Clocks(() => this.now());
    this.init();
  }

  /** Back to how the scene file starts it: its own cables, no parts, no goals, nothing opened. */
  private init() {
    this.epoch++;
    this.reservations=new WeakMap();
    this.recent=[];
    this.time.clear();
    this.clocks.clear(); this.dogs.reset(); this.cuts.clear(); this.spans.clear();
    for (const m of [this.devices, this.local, this.placed, this.touched, this.fails, this.seq, this.trace, this.locks, this.net, this.logicAt]) m.clear();
    for (const s of [this.live, this.goals, this.opened, this.passed, this.viewing]) s.clear();
    this.scratch = {};
    this.state = { ...this.data.state };
    this.data.devices.forEach((d) => this.devices.set(d.id, this.build(d, d.id)));
    this.links = [];
    this.wire();
  }

  /**
   * Lay the pre-wired cables whose both ends exist now: all of them at the
   * start; when a node connects (`node`), only those touching it, so a cable
   * the player has cut elsewhere stays cut.
   */
  private wire(node?: string) {
    const dev = (key: string) => split(key.split(':')[0])[0];
    const here = (key: string) => this.devices.has(dev(key));
    for (const c of this.prewired) {
      if (node && dev(c.from) !== node && dev(c.to) !== node) continue;
      if (!here(c.from) || !here(c.to) || this.links.some((l) => l.from === c.from && l.to === c.to)) continue;
      if (this.cuts.has(wiredId(c)) && !c.fixed) continue;
      this.links.push(this.wiredLink(c));
    }
  }
  private wiredLink(c: CableData): Link {
    const l: Link = { from: c.from, to: c.to, verb: c.verb, wired: wiredId(c) };
    if (c.fixed) l.fixed = true;
    return l;
  }

  /** Hold scene clocks and pending signals/actions together. Lockouts still expire on wall time. */
  setPaused(on: boolean) { this.time.pause(on); }

  /** Delayed scene action: pauses with the scene, cancelled by reset or restore. */
  later(ms: number, fn: () => void, detail?:unknown,canceled?:()=>void) {
    const e = this.epoch;
    return this.time.later(ms, () => { if (e === this.epoch) this.withCue(fn,true); },detail,canceled);
  }

  /** A scene state key (for effects and the scene). */
  get(key: string): Value { return this.state[key]; }
  set(key: string, v: Value) { if(Object.prototype.hasOwnProperty.call(this.data.observations?.aliases??{},key))throw Error('Observation alias is read-only: '+key);this.state[key] = v; }
  /** A state key, a derived value (`gateOpen`) or `signal`, as conditions read them. */
  value(key: string): Value | undefined { return this.read(key, this.ctx('')); }
  noun(key: string) { const [d, n] = split(key); return this.devices.get(d)?.nouns.find((x) => x.id === n); }
  /**
   * Devices standing in the world (their `layout.spot`); logic parts and net nodes live on the board only.
   * A device that moves (the scene's `rules.place`) stands where its code says, or is gone for now (null).
   */
  spots(): Spot[] {
    const out: Spot[] = [];
    for (const d of this.devices.values()) {
      if (d.logic || d.node || !d.data.layout?.spot) continue;
      const home: Spot = { id: d.id, ...d.data.layout.spot, y: d.data.layout.spot.y ?? 0 };
      const s = this.rules.place ? this.rules.place(this, home) : home;
      if (s) out.push(s);
    }
    return out;
  }

  // ---------- doing things ----------

  /** Who is speaking right now: the device whose verb (or guess, or item) is running. */
  private speaker: string | null = null;
  /** Say a line, as the speaker (or as `from`, when an effect names who reacted). */
  private cue:string|undefined;
  private reservations=new WeakMap<Line,FeedbackReceipt>();
  private reserved:Line[]|undefined;
  private withCue<T>(fn:()=>T,fresh=false):T {
    if(this.cue&&!fresh)return fn();
    const before=this.cue,reserved=this.reserved;this.cue=mintFeedbackCause();this.reserved=[];
    try{return fn();}finally{for(const l of this.reserved)this.reservations.delete(l);this.cue=before;this.reserved=reserved;}
  }
  /** Reserve the next delivery of this exact line, allowing a controller cue before its reply. */
  receipt(l:Line,from:string|null=this.speaker):FeedbackReceipt {
    let r=this.reservations.get(l);if(r)return r;
    r=mintFeedback(this.hooks.feedbackScope??this.data.id,from??'system',l[2]==='err'?'error':l[2]==='ok'?'success':'info',this.cue);
    this.reservations.set(l,r);this.reserved?.push(l);return r;
  }
  takeReceipt(l:Line,from:string|null=this.speaker):FeedbackReceipt {const r=this.receipt(l,from);this.reservations.delete(l);return r;}
  private sayLine(l: Line, from: string | null = this.speaker) {const receipt=this.takeReceipt(l,from);this.hooks.say(l, from ?? undefined,receipt);return receipt;}
  /** Run `fn` with `dev` as the speaker: what it says comes from that device. */
  private as<T>(dev: string, fn: () => T): T {
    const before = this.speaker;
    this.speaker = dev;
    try { return this.withCue(fn); } finally { this.speaker = before; }
  }

  private observe(phase: SceneTrace['phase'], context: Ctx, detail: unknown) {
    if (!this.hooks.observe&&!this.inspecting) return;
    try {
      const freeze = (v: unknown): unknown => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
      const event=freeze(JSON.parse(JSON.stringify({phase,context,detail}))) as SceneTrace;if(this.inspecting){this.recent.push(event);if(this.recent.length>128)this.recent.shift();}this.hooks.observe?.(event);
    } catch { /* Diagnostics must never alter gameplay, including observer failures. */ }
  }
  /** Scoped shared operation adapter; absent for unmigrated verbs. */
  gameplay?: (context:Ctx)=>{result:import('./gameplay/types').GameplayResult;line:Line|null}|undefined;
  gameplayEligibility?:(context:Ctx)=>import('./gameplay/types').GameplayResult|undefined;
  gameplayTick?:(dt:number,cause:(run:()=>void)=>void)=>void;
  /** Native committed device replies retain the existing receipt, caption and history owner. */
  reply(line:Line,from:string){return this.sayLine(line,from);}
  /** Pure reach/permission preflight. Signals intentionally bypass manual locks and sectors. */
  eligibility(dev:string,noun:string,verb:string,bySignal=false):import('./gameplay/types').Eligibility{
    const native=this.nativeEligibility(dev,noun,verb,bySignal);if(!native.ok)return native;
    const shared=this.gameplayEligibility?.({dev,noun,verb,bySignal});return shared??native;
  }
  nativeEligibility(dev:string,noun:string,verb:string,bySignal=false):import('./gameplay/types').Eligibility{
    const n=this.noun(dev+'.'+noun);if(!n)return{ok:false,reason:'unknown-noun'};
    if(!n.verbs.includes(verb))return{ok:false,reason:'unknown-verb'};
    if(n.kind!=='WATCH'&&this.frozen(dev))return{ok:false,reason:'watchdog'};
    if(!bySignal&&this.lockLeft(dev))return{ok:false,reason:'lockout'};
    if(!bySignal&&n.sector&&this.sealed(dev,n.sector))return{ok:false,reason:'sealed'};
    return{ok:true};
  }
  wireEligibility(from:string,to:string,verb:string):{ok:true}|{ok:false;reason:string}{
    const i=from.lastIndexOf(':'),n=this.noun(from.slice(0,i)),target=this.noun(to);
    if(i<1||!n?.events?.includes(from.slice(i+1)))return{ok:false,reason:'unknown-event'};
    if(!target?.verbs.includes(verb))return{ok:false,reason:'unknown-verb'};
    if(this.links.some(l=>l.fixed&&l.from===from&&l.to===to))return{ok:false,reason:'fixed'};
    return{ok:true};
  }
  act(dev: string, noun: string, verb: string, bySignal = false) {
    const context = { dev, noun, verb, bySignal };
    this.observe('trigger', context, {});
    this.as(dev, () => this.actAs(dev, noun, verb, bySignal));
    this.observe('result', context, { state: this.state });
  }

  private actAs(dev: string, noun: string, verb: string, bySignal: boolean) {
    const n = this.noun(dev + '.' + noun);
    // [watchdog] a frozen device refuses every verb, and a signal into it is dropped (its own watchdog noun still answers)
    if (n && n.kind !== 'WATCH' && this.frozen(dev)) { this.observe('condition',{dev,noun,verb,bySignal},{condition:'watchdog available',matches:false});this.sayLine(this.frozenLine(dev, noun, verb, bySignal)); this.changed(); return; }
    if (!bySignal) {
      const d = this.devices.get(dev), left = this.lockLeft(dev);
      if (d && left) { this.observe('condition',{dev,noun,verb,bySignal},{condition:'device lock expired',matches:false,remainingMs:left});this.sayLine(this.line('trace.locked', { device: d.name, sec: secs(left) })); this.changed(); return; }
      this.touched.set(dev, this.now());
      if (n?.sector && this.sealed(dev, n.sector)) { this.sayLine(this.trySeal(dev, n.sector)); this.changed(); return; }
    }
    if(!n?.verbs.includes(verb)){this.observe('condition',{dev,noun,verb,bySignal},{condition:'known verb',matches:false});return;}
    const shared=this.gameplay?.({dev,noun,verb,bySignal});
    if(shared)this.observe('action',{dev,noun,verb,bySignal},{shared:true,result:shared.result});
    const line = shared ? shared.line : n.run(verb, bySignal);
    if (line){this.sayLine(line);this.observe('result',{dev,noun,verb,bySignal},{response:line});}
    this.changed();
  }

  /**
   * Use something you carry on a device (its data's `items[i]`: show the pass, pour in soap), from
   * its popup. Only while you hold it; a frozen or locked-out device refuses, as for a verb. Its
   * cases run as that noun's verb would (lines, `emit`); a `take` step uses the item up.
   */
  offer(dev: string, i: number) { this.as(dev, () => this.offerAs(dev, i)); }
  private offerAs(dev: string, i: number) {
    const d = this.devices.get(dev), u = d?.data.items?.[i];
    if (!d || !u || this.carry(u.item) <= 0) return;
    if (this.frozen(dev)) { this.sayLine(this.frozenLine(dev, u.noun, u.label, false)); this.changed(); return; }
    const left = this.lockLeft(dev);
    if (left) { this.sayLine(this.line('trace.locked', { device: d.name, sec: secs(left) })); this.changed(); return; }
    this.touched.set(dev, this.now());
    const line = this.runCases(u.on, { dev, noun: u.noun, verb: u.label, bySignal: false });
    if (line) this.sayLine(line);
    this.changed();
  }

  /** A popup label with `{tokens}` (what you have now) and the state filled in. */
  labelOf(dev: string, text: string) { return this.fmt(text, this.ctx(dev), { tokens: this.hooks.tokens ? this.hooks.tokens(0) : this.ownTokens }); }

  /** Tell the view; open any sector whose `if` seal holds now. */
  changed() { this.checkSeals(); this.hooks.changed(); }

  goal(id: string) { if (this.goals.has(id)) return; this.goals.add(id); this.changed(); }

  /** Does a data condition hold right now (scene state only)? For panels. */
  cond(c: string) { return this.test(c, this.ctx('')); }
  /** Run data actions outside any noun (dialogue choices). */
  apply(actions: Action[],say:(line:Line)=>void=(l)=>this.sayLine(l)) { this.withCue(()=>{actions.forEach((a) => { const l = this.doAction(a, this.ctx('')); if (l) say(l); }); this.changed();}); }
  /** A label from the texts, with `{vars}` filled in. */
  label(key: string, vars?: Vars) { const t = this.texts[key]; return typeof t === 'string' ? this.fmt(t, this.ctx(''), vars) : '[' + key + ']'; }
  /** A terminal line from the texts. */
  line(ref: LineRef, vars?: Vars) { return this.lineIn(ref, this.ctx(''), vars); }

  // ---------- events and cables ----------

  emit(key: string) {
    const out = this.links.filter((l) => l.from === key);
    // [watchdog] nothing leaves a frozen device (but the watchdog's own arrives / leaves do)
    const [dev, ev] = split(key);
    if (out.length && !ev.startsWith(WATCH_NOUN + ':') && this.frozen(dev)) { this.sayLine(this.line('watchdog.mute', { device: this.devices.get(dev)?.name ?? dev, event: ev.replace(':', ' ') }), dev); return; }
    out.forEach((l) => this.live.add(l));
    this.hooks.changed();
    this.later(500, () => { out.forEach((l) => this.live.delete(l)); this.hooks.changed(); });
    out.forEach((l) => this.later(150, () => { const [d, n] = split(l.to); this.act(d, n, l.verb, true); },{kind:'signal',from:key,to:l.to,verb:l.verb}));
  }

  connect(from: string, to: string, verb: string): Line {
    // [fixed cables] a conduit between the same two cannot be replaced
    const fixed = this.links.find((l) => l.fixed && l.from === from && l.to === to);
    if (fixed) return this.line('wire.fixed', { from: fixed.from, to: fixed.to, verb: fixed.verb });
    const eligible=this.wireEligibility(from,to,verb);if(!eligible.ok)return['wire '+from+' '+to,'CONNECTION REFUSED: '+eligible.reason+'.','err'];
    this.links = this.links.filter((l) => !(l.from === from && l.to === to));
    this.links.push({ from, to, verb });
    this.changed();
    return this.line('wire.connect', {
      from, to, verb, verbCmd: verb.replace(/\s/g, ''),
      event: split(from)[1].replace(':', ' '), toNoun: split(to)[1],
    });
  }

  /** Cut a cable, the player's or a pre-wired one. */
  cut(link: Link): Line {
    // [fixed cables] refuse; a pre-wired cable you cut stays cut in the save (by its id)
    if (link.fixed) return this.line('wire.fixed', { from: link.from, to: link.to, verb: link.verb });
    if (link.wired) this.cuts.add(link.wired);
    this.links = this.links.filter((l) => l !== link);
    this.live.delete(link);
    this.changed();
    return this.line('wire.cut', { from: link.from, to: link.to });
  }

  // ---------- logic parts on the board ----------

  /** Modules the player owns. */
  modules(): string[] { return this.hooks.modules?.() ?? [...START_MODULES, ...this.ownModules]; }
  /** The programs the player owns (scan.so). */
  programs(): string[] { return this.hooks.programs?.() ?? this.ownPrograms; }
  /** scan.so: LINKs scan, and connect beyond what they already know. */
  get canScan() { return this.programs().includes(SCAN); }
  /** The module that places a part kind (`timer` → timer.so's entry). */
  module(kind: string) { return this.logic.modules.find((m) => m.part.id === kind); }
  /** Does the player own the module for this part kind? */
  owns(kind: string) { const m = this.module(kind); return !!m && this.modules().includes(m.id); }

  /**
   * Place a logic part from a module the player owns. Returns its id
   * ('timer1', 'switch1', …), or null when the module is unknown or not owned.
   */
  addLogic(kind: string): string | null {
    if (!this.owns(kind)) return null;
    const id = this.place(kind);
    this.changed();
    return id;
  }

  private place(kind: string, want?: string): string {
    const t = this.module(kind)!.part;
    let n = this.placed.get(kind) ?? 0, id: string;
    if (want) { id = want; n = Math.max(n, parseInt(want.slice(kind.length), 10) || 0); }
    else do id = kind + ++n; while (this.devices.has(id));
    this.placed.set(kind, n);
    this.devices.set(id, this.build(t, id, 'logic'));
    return id;
  }

  /** Remove a placed logic part and every cable touching it. The scene's own devices stay. */
  removeDevice(id: string): void {
    if (!this.devices.get(id)?.logic) return;
    this.devices.delete(id); this.local.delete(id); this.logicAt.delete(id); this.clocks.remove(id);
    const on = (key: string) => split(key)[0] === id;
    this.links = this.links.filter((l) => { const hit = on(l.from) || on(l.to); if (hit) this.live.delete(l); return !hit; });
    this.changed();
  }

  // ---------- the keyring ----------

  keyring(): string[] { return this.hooks.keyring?.() ?? this.ownKeyring; }
  /** Keyring items the player holds, as data (unknown ids, from an older save, are skipped). */
  items(): KeyItem[] { return this.keyring().map((id) => this.item(id)).filter((k): k is KeyItem => !!k); }
  fragments() { return this.items().filter((k) => k.kind === 'fragment'); }

  /**
   * A keyring item by id: one from the data, or one made on the keyring,
   * stored as its recipe (`join(sprat,bday)`, `reverse(vrify)`) so a save
   * keeps it without a list of made things.
   */
  item(id: string): KeyItem | undefined {
    const k = this.keys.get(id);
    if (k) return k;
    const m = /^(\w+)\((.*)\)$/.exec(id);
    if (!m) return undefined;
    const args = splitArgs(m[2]).map((a) => this.item(a));
    if (args.some((a) => a?.kind !== 'fragment')) return undefined;
    const [a, b] = args as KeyItem[];
    if (m[1] === 'join' && b) return { id, kind: 'fragment', label: a.label + ' + ' + b.label, text: a.text! + b.text! };
    const op = RULES[m[1]];
    if (op && !b) return { id, kind: 'fragment', label: a.label + ' ' + op.tag, text: op.fn(a.text!) };
    return undefined;
  }

  /**
   * Hand the player something: a keyring item, a logic module (`switch.so`
   * into the save's modules), or `tokens` (`count` of them). Returns the
   * line to say, or null for a keyring item already held.
   */
  give(id: string, count = 1): Line | null {
    // [give] modules and tokens
    if (id === 'tokens') {
      const n = Math.max(0, Math.floor(count));
      const total = this.hooks.tokens ? this.hooks.tokens(n) : (this.ownTokens += n);
      return this.line('give.tokens', { n, total });
    }
    // [the net] a program (scan.so): the player's for good
    const prog = this.programList.find((x) => x.id === id);
    if (prog) {
      const vars = { program: id, name: prog.name, look: prog.look };
      if (this.programs().includes(id)) return this.line('give.program.have', vars);
      const line=this.line('give.program', vars),receipt=this.receipt(line);
      if (this.hooks.program) this.hooks.program(id,receipt); else this.ownPrograms.push(id);
      return line;
    }
    const mod = this.logic.modules.find((x) => x.id === id);
    if (mod) {
      const vars = { module: id, name: mod.part.name };
      if (this.modules().includes(id)) return this.line('give.module.have', vars);
      if (this.hooks.grant) this.hooks.grant(id); else this.ownModules.push(id);
      return this.line('give.module', vars);
    }
    const k = this.item(id);
    if (!k || this.keyring().includes(id)) return null;
    if (this.hooks.give) this.hooks.give(id); else this.ownKeyring.push(id);
    return this.line(k.kind === 'fragment' ? 'keyring.fragment' : 'keyring.' + k.kind, { label: k.label, text: k.text ?? '' });
  }

  /**
   * Spend `n` noodle tokens (a scene effect that sells something: the beach's sunbed meter).
   * True, and taken, if the player has them; false, and nothing taken, if not.
   */
  pay(n: number): boolean {
    const have = this.hooks.tokens ? this.hooks.tokens(0) : this.ownTokens;
    if (have < n) return false;
    if (this.hooks.tokens) this.hooks.tokens(-n); else this.ownTokens -= n;
    return true;
  }

  /**
   * What the player carries (an item of scenes/kit.ts `ITEMS`, not a keyring chip): add `n` (0: just
   * ask; negative: take, never below 0) and return how many are held now. Scene effects use it to hand
   * over things like the maglev pass.
   */
  carry(item: string, n = 0): number {
    if (this.hooks.carry) return this.hooks.carry(item, n);
    this.ownItems[item] = Math.max(0, (this.ownItems[item] ?? 0) + n);
    return this.ownItems[item];
  }

  /** Set a save flag (a story beat only the code sees: a level done). */
  flag(name: string) { if (this.hooks.flag) this.hooks.flag(name); else this.ownFlags.add(name); }

  /** Was this keyring chip made on the keyring (so it may be thrown away)? The data's own are evidence: they stay. */
  isMade(id: string) { return !this.keys.has(id) && !!this.item(id); }

  /**
   * One keyring chip dropped on another: a recipe in the data (a fragment
   * `from` these two), else a fragment on a rule (`reverse`), else two
   * fragments joined, the dragged one first. Says what came of it.
   */
  combine(a: string, b: string) {
    const A = this.item(a), B = this.item(b), ring = this.keyring();
    if (!A || !B || a === b || !ring.includes(a) || !ring.includes(b)) return;
    const recipe = [...this.keys.values()].find((k) => k.from && ((k.from[0] === a && k.from[1] === b) || (k.from[0] === b && k.from[1] === a)));
    let made: string | null = null;
    if (recipe) made = recipe.id;
    else if (A.kind === 'fragment' && B.kind === 'rule') made = B.rule + '(' + a + ')';
    else if (A.kind === 'rule' && B.kind === 'fragment') made = A.rule + '(' + b + ')';
    else if (A.kind === 'fragment' && B.kind === 'fragment') made = 'join(' + a + ',' + b + ')';
    const k = made ? this.item(made) : undefined;
    if (!made || !k || (k.text ?? '').length > MAX_FRAGMENT) this.sayLine(this.line('keyring.nocombine', { a: A.label, b: B.label }));
    else if (ring.includes(made)) this.sayLine(this.line('keyring.have', { label: k.label }));
    else this.sayLine(this.give(made)!);
    this.changed();
  }

  /** Throw away a fragment made on the keyring (the data's own stay: they are evidence). */
  discard(id: string) {
    if (this.keys.has(id) || !this.item(id)) return;
    const ring = this.keyring(), i = ring.indexOf(id);
    if (i >= 0) ring.splice(i, 1);
    this.hooks.drop?.(id);
    this.changed();
  }

  /**
   * A keyring chip dropped on a noun: on a GUARD, try it as the password;
   * on a sealed noun, try it as the sector's key. Says what happened.
   */
  useItem(id: string, key: string) { this.as(split(key)[0], () => this.useItemAs(id, key)); }
  private useItemAs(id: string, key: string) {
    const [dev, nid] = split(key), n = this.noun(key), k = this.item(id);
    if (!n || !k || !this.keyring().includes(id)) return;
    let l: Line | null = null;
    if (n.sector && this.sealed(dev, n.sector)) l = this.trySeal(dev, n.sector, id);
    else if (this.frozen(dev)) l = this.frozenLine(dev, nid, 'login', false);
    else if (n.kind === 'GUARD') {
      this.touched.set(dev, this.now());
      if (this.nounData(dev, nid)?.guard?.toy) l = this.line('toy.hands', { noun: nid, verb: this.toyVerb });
      else if (k.kind === 'fragment') this.check(dev, nid, k.text ?? '');
      else l = this.line('guard.notfragment', { noun: nid, label: k.label });
    }
    if (l) this.sayLine(l);
    this.changed();
  }

  // ---------- guards ----------

  /** The keyboard, last resort: type a guess at a GUARD. */
  guess(dev: string, noun: string, text: string) { this.as(dev, () => this.guessAs(dev, noun, text)); }
  private guessAs(dev: string, noun: string, text: string) {
    if (this.frozen(dev)) { this.sayLine(this.frozenLine(dev, noun, 'login', false)); this.changed(); return; }
    this.touched.set(dev, this.now());
    this.check(dev, noun, text);
    this.changed();
  }

  /** The verb that opens the keyboard on a GUARD (the schematic shows an input instead of running it). */
  get typeVerb() { return this.label('guard.type'); }

  /** Try a password on a guard, and say how it went (then any sector it opens, then any kick its trace causes). */
  private check(dev: string, noun: string, text: string, bySignal = false) {
    const key = dev + '.' + noun, g = this.nounData(dev, noun)?.guard, vars: Vars = { noun, guess: text };
    const say = (k: string, more?: Vars) => this.sayLine(this.line(k, { ...vars, ...more }));
    if (!g) return;
    if (this.passed.has(key)) return say('guard.passed');
    if (bySignal) return say('guard.signal');
    const left = this.lockLeft(key);
    if (left) return say('guard.locked', { sec: secs(left) });
    if (list(g.password ?? []).some((p) => norm(p) === norm(text))) return this.pass(dev, noun);
    this.fail(dev, noun, text);
  }

  /** A guard opens: its line, its steps, its `opened` event, the sectors it seals. */
  private pass(dev: string, noun: string) {
    const key = dev + '.' + noun, g = this.nounData(dev, noun)!.guard!, c = this.ctx(dev, noun);
    this.passed.add(key); this.fails.delete(key);
    this.sayLine(this.lineIn(g.say ?? 'guard.ok', c, { noun }));
    (g.do ?? []).forEach((a) => { const l = this.doAction(a, c); if (l) this.sayLine(l); });
    if (this.nounData(dev, noun)!.events?.includes('opened')) this.emit(key + ':opened');
    (this.devices.get(dev)?.data.sectors ?? []).filter((s) => 'guard' in s.seal && s.seal.guard === noun)
      .forEach((s) => { const l = this.unseal(dev, s.id); if (l) this.sayLine(l); });
  }

  /** A wrong guess (or a wrong answer on a toy): a near-miss line, tries, the lock, trace. */
  private fail(dev: string, noun: string, text: string) {
    const key = dev + '.' + noun, g = this.nounData(dev, noun)!.guard!, vars: Vars = { noun, guess: text };
    const say = (k: string, more?: Vars) => this.sayLine(this.line(k, { ...vars, ...more }));
    const fails = (this.fails.get(key) ?? 0) + 1, tries = g.tries ?? 1, lockMs = g.lockMs ?? GUARD_LOCK_MS;
    this.fails.set(key, fails);
    // a near miss gets its own reply (still a wrong guess)
    const near = Object.entries(g.near ?? {}).find(([k]) => norm(k) === norm(text));
    if (near) this.sayLine(this.lineIn(near[1], this.ctx(dev, noun), vars));
    if (lockMs > 0 && fails >= tries) {
      this.fails.delete(key);
      this.lock(key, lockMs);
      say('guard.lock', { sec: secs(lockMs) });
    } else if (!near) say(lockMs > 0 ? 'guard.wrong' : 'guard.wrong.last', { left: tries - fails });
    if (g.trace) this.addTrace(dev, g.trace);
  }

  /** Milliseconds left on a lockout (a device id, or a guard's `dev.noun`); 0 when free. */
  lockLeft(key: string) { const until = this.locks.get(key); return until ? Math.max(0, until - this.wall()) : 0; }
  /** How long the running lockout lasts in all, ms (for a countdown bar). */
  lockSpan(key: string) { return this.spans.get(key) ?? this.lockLeft(key); }
  private lock(key: string, ms: number) {
    this.locks.set(key, this.wall() + ms); this.spans.set(key, ms);
    this.later(ms + 50, () => this.changed());
  }

  // ---------- lock toys (scene/toys/): a GUARD with `toy` opens with hands, not passwords ----------

  /** The verb that opens a toy guard's panel. */
  get toyVerb() { return this.label('toy.verb'); }
  /** A GUARD's data by `device.noun` (the toy panel reads its parameters). */
  guardOf(key: string) { const [d, n] = split(key); return this.nounData(d, n)?.guard; }
  /** Can the toy be played right now? Null if so, else the line that says why not. */
  toyBlocked(key: string): Line | null {
    const [dev, noun] = split(key), vars = { noun };
    if (this.passed.has(key)) return this.line('guard.passed', vars);
    if (this.frozen(dev)) return this.frozenLine(dev, noun, this.toyVerb, false);
    const left = this.lockLeft(key) || this.lockLeft(dev);
    return left ? this.line('guard.locked', { ...vars, sec: secs(left) }) : null;
  }
  /** The toy was solved: the guard opens, exactly as for a right password. */
  toySolved(key: string) {
    const [dev, noun] = split(key);
    if (!this.guardOf(key)?.toy || this.toyBlocked(key)) return;
    this.touched.set(dev, this.now());
    this.pass(dev, noun);
    this.changed();
  }
  /** A wrong answer on the toy (a cryptex word, a Morse message, a cipher read out at the wrong shift): a wrong guess. */
  toyWrong(key: string, answer: string) {
    const [dev, noun] = split(key);
    if (!this.guardOf(key)?.toy || this.toyBlocked(key)) return;
    this.touched.set(dev, this.now());
    this.fail(dev, noun, answer);
    this.changed();
  }

  // ---------- sealed sectors ----------

  sector(dev: string, id: string): SectorData | undefined { return this.devices.get(dev)?.data.sectors?.find((s) => s.id === id); }
  /** Is this sector of this device still sealed? */
  sealed(dev: string, sector: string) { return !!this.sector(dev, sector) && !this.opened.has(dev + '/' + sector); }

  /** Open a sector. Returns the line to say, or null if it was open already. */
  unseal(dev: string, sector: string): Line | null {
    const s = this.sector(dev, sector);
    if (!s || this.opened.has(dev + '/' + sector)) return null;
    this.opened.add(dev + '/' + sector);
    this.seq.delete(dev + '/' + sector);
    return this.line('seal.open', { sector: s.label ?? s.id });
  }

  /** Tapping a sealed noun, or dropping a key chip on it: what the seal says, and opens it if the key fits. */
  trySeal(dev: string, sector: string, item?: string): Line {
    const s = this.sector(dev, sector)!, name = s.label ?? s.id, seal = s.seal;
    if (!this.sealed(dev, sector)) return this.line('seal.done', { sector: name });
    if ('key' in seal) {
      const use = item ?? (this.keyring().includes(seal.key) ? seal.key : null);
      const label = use ? this.keys.get(use)?.label ?? use : '';
      if (!use) return this.line('seal.key', { sector: name });
      if (use !== seal.key) return this.line('seal.key.wrong', { sector: name, label });
      const ok = this.line('seal.key.ok', { sector: name, label });
      this.opened.add(dev + '/' + sector);
      return ok;
    }
    if ('guard' in seal) return this.line('seal.guard', { sector: name, noun: seal.guard });
    if ('sequence' in seal) return this.line('seal.sequence', { sector: name });
    return this.line('seal.if', { sector: name });
  }

  /** A sector sealed with a sequence: its seal noun heard `verb`. */
  private sealStep(dev: string, s: SectorData, verb: string, bySignal: boolean): Line {
    const seal = s.seal as { sequence: string[]; withinMs?: number; signal?: boolean };
    const key = dev + '/' + s.id, vars: Vars = { sector: s.label ?? s.id, verb, via: bySignal ? 'signal → ' : '' };
    if (this.opened.has(key)) return this.line('seal.done', vars);
    if (seal.signal && !bySignal) return this.line('seal.signal', vars);
    const now = this.now(), p = this.seq.get(key) ?? { i: 0, t: 0 }, want = seal.sequence;
    const inTime = p.i === 0 || !seal.withinMs || now - p.t <= seal.withinMs;
    if (verb === want[p.i] && inTime) {
      const next = { i: p.i + 1, t: now };
      if (next.i === want.length) return this.unseal(dev, s.id)!;
      this.seq.set(key, next);
      return this.line('seal.step', { ...vars, step: next.i, of: want.length });
    }
    this.seq.set(key, verb === want[0] ? { i: 1, t: now } : { i: 0, t: 0 });
    return this.line('seal.wrong', vars);
  }

  /** Sectors sealed with `if` open by themselves once their condition holds. */
  private checkSeals() {
    if (this.sealing) return;
    this.sealing = true;
    for (const d of this.devices.values()) {
      for (const s of d.data.sectors ?? []) {
        if (!('if' in s.seal) || this.opened.has(d.id + '/' + s.id) || !this.test(s.seal.if, this.ctx(d.id))) continue;
        const l = this.unseal(d.id, s.id);
        if (l) this.sayLine(l);
      }
    }
    this.sealing = false;
  }

  // ---------- trace ----------

  /** Trace on a device, 0–100. */
  traceOf(dev: string) { return this.trace.get(dev) ?? 0; }
  /** Does this device keep a log of you (so the schematic shows its meter)? */
  logged(dev: string) { return this.logsOf(dev).length > 0; }
  private logsOf(dev: string) { return (this.devices.get(dev)?.data.nouns ?? []).filter((n) => n.kind === 'LOG' && n.log); }

  /** A log records while its `when` holds and its cable to the archive is still there. */
  recording(dev: string, n: NounData) {
    const log = n.log!;
    if (log.when && !this.test(log.when, this.ctx(dev))) return false;
    return !log.archive || this.links.some((l) => l.from.startsWith(dev + '.' + n.id + ':') && l.to === log.archive);
  }

  /** Inside: the device's schematic is open, or you used one of its verbs a moment ago. */
  inside(dev: string) {
    if (this.viewing.has(dev)) return true;
    const t = this.touched.get(dev), linger = Math.max(0, ...this.logsOf(dev).map((n) => n.log!.linger ?? LOG_LINGER_MS));
    return t !== undefined && this.now() - t < linger;
  }

  /**
   * Advance trace by `dt` ms: logs that record you while you are inside fill
   * the meter; otherwise it drains. `live` (the scene is on screen) also runs
   * the scene's own clock (`SceneRules.tick`). Returns true when a meter or a lock changed
   * (the host redraws the meters, or everything when a lock ended).
   */
  tick(dt: number, live = true): boolean {
    if (live) { this.rules.tick?.(this.world(this.ctx('')), dt);this.gameplayTick?.(dt,run=>this.withCue(run,true));for(const row of this.data.observations?.goals??[])if(this.cond(row.when))this.goal(row.goal); }
    let moved = false;
    for (const d of this.devices.values()) {
      const logs = this.logsOf(d.id), before = this.traceOf(d.id);
      if (!logs.length && !before) continue;
      if (this.lockLeft(d.id)) continue;
      const rec = logs.filter((n) => this.recording(d.id, n));
      let t = before;
      if (rec.length && this.inside(d.id)) t += rec.reduce((s, n) => s + n.log!.rate, 0) * dt / 1000;
      else t -= (logs.length ? Math.max(...logs.map((n) => n.log!.fall ?? n.log!.rate / 2)) : BARE_FALL) * dt / 1000;
      t = clamp(t);
      if (t !== before) { this.trace.set(d.id, t); moved = true; }
      if (t >= 100) this.kick(d.id);
    }
    for (const [k, until] of this.locks) if (until <= this.wall()) { this.locks.delete(k); this.spans.delete(k); moved = true; }
    // [watchdog, clocks] they move on the same tick; while a watchdog walks, its sprite and countdown need redrawing
    if (this.tickEngine()) moved = true;
    return moved || this.dogs.any;
  }

  /** The watchdogs step along their routes (raising arrives / leaves), the clocks beat. True when something happened. */
  private tickEngine(): boolean {
    const steps = this.dogs.tick(), beats = this.clocks.tick();
    for (const s of steps) {
      const dev = s.arrives ?? s.leaves!;
      if (!this.devices.has(dev)) continue;
      // a sequence seal on a device the watchdog reaches forgets what it heard
      if (s.arrives) for (const k of [...this.seq.keys()]) if (k.startsWith(dev + '/')) this.seq.delete(k);
      this.emit(dev + '.' + WATCH_NOUN + ':' + (s.arrives ? 'arrives' : 'leaves'));
    }
    for (const b of beats) {
      if (b.set) this.write(b.set, b.event, b.dev);
      this.emit(b.dev + '.' + b.noun + ':' + b.event);
    }
    if (steps.length || beats.some((b) => b.set)) this.changed();
    return steps.length > 0 || beats.length > 0;
  }

  // ---------- the watchdog (scene/watchdog.ts) ----------

  /** Is the watchdog sitting on this device (so it is frozen)? */
  frozen(dev: string) { return this.dogs.any && this.dogs.on(dev) !== null; }
  /** Where every watchdog is, for the board. */
  watchdogs(): DogView[] { return this.dogs.view((d) => d.name ?? this.label('watchdog.name')); }
  private frozenLine(dev: string, noun: string, verb: string, bySignal: boolean): Line {
    return this.line(bySignal ? 'watchdog.drop' : 'watchdog.frozen', { device: this.devices.get(dev)?.name ?? dev, noun, verb, via: bySignal ? 'signal → ' : '' });
  }
  private runWatch(c: Ctx): Line | null {
    const v = this.watchdogs().find((d) => d.at === c.dev || d.from === c.dev || d.to === c.dev);
    if (!v) return null;
    const vars = { name: v.name, sec: secs(v.left), at: this.devices.get(v.at ?? '')?.name ?? v.at ?? '', to: this.nodeName(v.to) };
    return this.line(v.at === c.dev ? 'watchdog.here' : v.at ? 'watchdog.away' : 'watchdog.walking', vars);
  }

  // ---------- clocks (scene/clock.ts) ----------

  private runClock(n: NounData, c: Ctx): Line | null {
    const key = c.dev + '.' + n.id, via = c.bySignal ? 'signal → ' : '';
    if (c.verb === 'start' || c.verb === 'stop') {
      const changed = this.clocks.run(key, c.verb === 'start');
      return this.line(changed ? 'clock.' + c.verb : 'clock.already', { via, noun: n.id, verb: c.verb });
    }
    return this.perform(n, c);
  }

  /** Raise (or lower) a device's trace; a full one kicks. */
  addTrace(dev: string, by: number) {
    if (!this.devices.has(dev)) return;
    const t = clamp(this.traceOf(dev) + by);
    this.trace.set(dev, t);
    if (t >= 100) this.kick(dev);
  }

  private kick(dev: string) {
    const d = this.devices.get(dev)!;
    const ms = Math.max(0, ...this.logsOf(dev).map((n) => n.log!.lockMs ?? LOG_LOCK_MS)) || LOG_LOCK_MS;
    this.lock(dev, ms);
    this.trace.set(dev, 0);
    this.viewing.delete(dev); this.touched.delete(dev);
    this.sayLine(this.line('trace.kick', { device: d.name, sec: secs(ms) }), dev);
    this.hooks.kick?.(dev);
  }

  // ---------- the net ----------

  nodeName(id: string) { return this.nodeData.get(id)?.name ?? this.devices.get(id)?.name ?? id; }
  /** Nodes seen on a scan but not connected: silhouettes on the board, with the LINK device that reaches them. */
  ghosts(): { id: string; name: string; link: string }[] {
    return [...this.net].filter(([, s]) => s === 'seen').map(([id]) => {
      const link = [...this.devices.values()].find((d) => d.data.nouns.some((n) => n.link && this.reachOf(n, d.id).includes(id)));
      return { id, name: this.nodeName(id), link: link?.name ?? 'the net map (N)' };
    });
  }

  /** The player's controlled nodes (their Registry labels). */
  controlled(): string[] { return this.hooks.controlled?.() ?? []; }
  /** A LINK's port: `scene:device.noun`, as networks name it. */
  private port(dev: string, noun: string) { return this.data.id + ':' + dev + '.' + noun; }
  /** A machine of a network that is a node this scene can bring onto the board (its own, or net.json's). */
  private nodeHere = (m: MachineData) => this.nodeData.has(m.id) && (m.in.includes(this.data.id) || m.in.includes('net'));
  /** A machine standing in this scene (a device in the world): a controlled one here is an access point. */
  private standing = (m: MachineData) => m.in.includes(this.data.id) && this.devices.has(m.id) && !this.nodeData.has(m.id) && !!this.devices.get(m.id)!.data.layout?.spot;

  /**
   * The nodes a LINK reaches: its own `reach` and `known`, and the nodes of the networks its port
   * leads to (net.json `networks`); in sudo mode every node there is (but itself).
   */
  private reachOf(n: NounData, dev: string): string[] {
    if (this.hooks.sudo?.()) return [...this.nodeData.keys()].filter((id) => !this.nodeData.get(id)!.nouns.includes(n));
    const out = new Set([...(n.link!.reach ?? []), ...(n.link!.known ?? [])]);
    const nets = reachNets(this.nets, { ports: [this.port(dev, n.id)], controlled: this.controlled() });
    machinesOf(this.nets, nets).filter(this.nodeHere).forEach((m) => out.add(m.id));
    out.delete(dev);
    return [...out];
  }

  private runLink(n: NounData, c: Ctx): Line | null {
    const reach = this.reachOf(n, c.dev).filter((id) => this.nodeData.has(id)), via = c.bySignal ? 'signal → ' : '';
    const id = c.verb.startsWith('connect ') ? c.verb.slice(8) : '';
    // a link that is down (its `when` does not hold) neither scans nor connects
    if ((c.verb === 'scan' || id) && n.link!.when && !this.test(n.link!.when, c)) {
      return this.line('net.down', { via, verb: c.verb, name: this.devices.get(c.dev)?.name ?? c.dev });
    }
    // [programs] without scan.so a port only connects to the nodes it already knows
    const known = n.link!.known ?? [];
    if ((c.verb === 'scan' || (id && !known.includes(id))) && !this.canScan) {
      return this.line(known.length ? 'net.noscan' : 'net.noscan.none', { via, verb: c.verb });
    }
    if (c.verb === 'scan') {
      const fresh = reach.filter((x) => !this.net.has(x));
      fresh.forEach((x) => this.net.set(x, 'seen'));
      return fresh.length ? this.line('net.scan', { via, names: fresh.map((x) => this.nodeName(x)).join(', ') }) : this.line('net.scan.none', { via });
    }
    if (id && reach.includes(id)) {
      const vars = { via, node: id, name: this.nodeName(id) };
      if (this.net.get(id) === 'connected') return this.line('net.connected', vars);
      this.join(id);
      return this.line('net.connect', vars);
    }
    return this.perform(n, c);
  }

  // [the net, from the scene] what the net map and the deck's `scan` and `connect` see

  /** The LINKs you are plugged in at here: every one on the board that is up (its `when` holds, its sector open). */
  ports(): { dev: string; noun: string; key: string }[] {
    const out: { dev: string; noun: string; key: string }[] = [];
    for (const d of this.devices.values()) for (const n of d.data.nouns) {
      if (n.kind !== 'LINK' || !n.link) continue;
      if (n.sector && this.sealed(d.id, n.sector)) continue;
      if (n.link.when && !this.test(n.link.when, this.ctx(d.id, n.id))) continue;
      out.push({ dev: d.id, noun: n.id, key: this.port(d.id, n.id) });
    }
    return out;
  }

  /** The networks you reach from here: through the ports here, and your controlled nodes standing here. */
  netsHere(): Set<string> {
    return reachNets(this.nets, { ports: this.ports().map((p) => p.key), controlled: this.controlled(), standing: this.standing });
  }

  /** The nodes you can bring onto this board from here: those of the networks you reach, and what the ports here know. */
  nodesHere(): string[] {
    const out = new Set(machinesOf(this.nets, this.netsHere()).filter(this.nodeHere).map((m) => m.id));
    for (const p of this.ports()) {
      const l = this.nounData(p.dev, p.noun)!.link!;
      [...(l.reach ?? []), ...(l.known ?? [])].forEach((id) => { if (this.nodeData.has(id)) out.add(id); });
    }
    return [...out];
  }

  /** The deck's `scan`, or opening the net map: every node you reach from here shows on the board. Needs scan.so. */
  scanHere(): Line {
    if (!this.canScan) return this.line('net.noscan.none', { via: '', verb: 'scan' });
    if (!this.ports().length && !this.netsHere().size) return this.line('net.unplugged');
    const fresh = this.nodesHere().filter((x) => !this.net.has(x));
    fresh.forEach((x) => this.net.set(x, 'seen'));
    this.changed();
    return fresh.length ? this.line('net.scan', { via: '', names: fresh.map((x) => this.nodeName(x)).join(', ') }) : this.line('net.scan.none', { via: '' });
  }

  /**
   * The deck's `connect <node>`, or a machine picked on the net map: a node in reach comes onto the
   * board (as a LINK's connect would). A device standing here is on it already. Needs scan.so,
   * unless a port here knows the node.
   */
  plugIn(id: string, place?: (m: MachineData) => string): Line {
    const vars = { via: '', node: id, name: this.nodeName(id) };
    const known = this.ports().some((p) => (this.nounData(p.dev, p.noun)!.link!.known ?? []).includes(id));
    if (this.devices.has(id) && !this.devices.get(id)!.node) return this.line('net.here', vars);
    if (!known && !this.canScan) return this.line('net.noscan.none', { via: '', verb: 'connect' });
    if (this.nodesHere().includes(id)) {
      if (this.net.get(id) === 'connected') return this.line('net.connected', vars);
      this.join(id);
      this.changed();
      return this.line('net.connect', vars);
    }
    const net = this.nets.find((n) => n.machines.some((m) => m.id === id));
    const m = net?.machines.find((x) => x.id === id);
    if (net && m && this.netsHere().has(net.id) && place) return this.line('net.elsewhere', { ...vars, place: place(m) });
    return this.line('net.unreached', { ...vars, need: net?.need ?? 'somewhere else' });
  }

  /** Bring a node in as a device. Its pre-wired cables come with it (a restore then puts the saved cables over them). */
  private join(id: string) {
    this.net.set(id, 'connected');
    if (this.devices.has(id)) return;
    this.devices.set(id, this.build(this.nodeData.get(id)!, id, 'node'));
    this.wire(id);
  }

  // ---------- saving ----------

  /** The scene's progress for the save, settled: nothing in flight. Trace and lockouts stay (reloading is not a way out). */
  snapshot(): SceneSave {
    const state: Record<string, Value> = {};
    for (const k of Object.keys(this.data.state)) state[k] = this.state[k];
    this.rules.settle?.(state);
    const devs = [...this.devices.values()];
    const logic = devs.filter((d) => d.logic).map((d) => {
      const kind = d.id.replace(/\d+$/, ''), own = this.local.get(d.id), at = this.logicAt.get(d.id);
      return { id: d.id, kind, ...(own ? { state: { ...own } } : {}), ...(at ? { at: { x: at.x, h: at.h } } : {}) };
    });
    const z: SceneSave = { state, goals: [...this.goals], links: this.links.map((l) => ({ from: l.from, to: l.to, verb: l.verb })), logic };
    const local = devs.filter((d) => !d.logic && this.local.has(d.id)).map((d) => [d.id, { ...this.local.get(d.id)! }]);
    if (local.length) z.local = Object.fromEntries(local);
    if (this.opened.size) z.open = [...this.opened];
    if (this.passed.size) z.passed = [...this.passed];
    if (this.net.size) {
      const ids = (s: string) => [...this.net].filter(([, v]) => v === s).map(([id]) => id);
      z.net = { seen: ids('seen'), connected: ids('connected') };
    }
    // [save details] cuts of pre-wired cables, trace, lockouts (wall clock), clocks, the watchdog's place
    if (this.cuts.size) z.cut = [...this.cuts];
    const trace = [...this.trace].filter(([, v]) => v > 0).map(([k, v]) => [k, Math.round(v * 10) / 10] as const);
    if (trace.length) z.trace = Object.fromEntries(trace);
    const locks = [...this.locks].filter(([k]) => this.lockLeft(k) > 0).map(([k, until]) => [k, Math.round(until)] as const);
    if (locks.length) z.locks = Object.fromEntries(locks);
    const clocks = this.clocks.snapshot();
    if (Object.keys(clocks).length) z.clocks = clocks;
    if (this.dogs.any) z.watchdog = this.dogs.snapshot();
    return z;
  }

  /**
   * Back to a saved point. Anything that no longer fits the data (a state key,
   * a part kind, a sector, a cable to a noun that is gone) is dropped, not trusted.
   * Placed parts come back even if their module is no longer owned.
   */
  restore(s: SceneSave) {
    this.init();
    for (const [k, v] of Object.entries(s.state ?? {})) if (k in this.data.state) this.state[k] = v;
    this.rules.settle?.(this.state);
    const goalIds = new Set(this.data.goals.map((g) => g.id));
    (s.goals ?? []).forEach((g) => { if (goalIds.has(g)) this.goals.add(g); });
    (s.net?.seen ?? []).forEach((id) => { if (this.nodeData.has(id)) this.net.set(id, 'seen'); });
    (s.net?.connected ?? []).forEach((id) => { if (this.nodeData.has(id)) this.join(id); });
    for (const [id, st] of Object.entries(s.local ?? {})) {
      const own = this.local.get(id);
      if (own && !this.devices.get(id)?.logic) for (const [k, v] of Object.entries(st ?? {})) if (k in own) own[k] = v;
    }
    for (const p of s.logic ?? []) {
      if (!this.module(p.kind) || !p.id.startsWith(p.kind) || !/^\d+$/.test(p.id.slice(p.kind.length)) || this.devices.has(p.id)) continue;
      this.place(p.kind, p.id);
      const own = this.local.get(p.id);
      if (own && p.state) for (const [k, v] of Object.entries(p.state)) if (k in own) own[k] = v;
      if (p.at && Number.isFinite(p.at.x) && Number.isFinite(p.at.h)) this.logicAt.set(p.id, { x: p.at.x, h: p.at.h });
    }
    (s.open ?? []).forEach((key) => { const [d, sec] = key.split('/'); if (this.sector(d, sec)) this.opened.add(key); });
    (s.passed ?? []).forEach((key) => { const [d, n] = split(key); if (this.nounData(d, n)?.guard) this.passed.add(key); });
    this.links = (s.links ?? []).filter((l) => {
      const [from, ev] = l.from.split(':'), a = this.noun(from), b = this.noun(l.to);
      return !!a && !!b && !!a.events?.includes(ev) && b.verbs.includes(l.verb);
    }).map((l) => ({ from: l.from, to: l.to, verb: l.verb }));
    this.restoreEngine(s);
    this.hooks.changed();
  }

  /**
   * [save details] Pre-wired cables merge by id: one the save has keeps its
   * place (and learns whether it is fixed), one the player cut stays cut, a
   * fixed one always comes back, one new in the data appears. Then trace,
   * lockouts, clocks and the watchdog come back where they were.
   */
  private restoreEngine(s: SceneSave) {
    (s.cut ?? []).forEach((id) => { if (typeof id === 'string') this.cuts.add(id); });
    const here = (key: string) => this.devices.has(split(key.split(':')[0])[0]);
    for (const c of this.prewired) {
      if (!here(c.from) || !here(c.to)) continue;
      const had = this.links.findIndex((l) => l.from === c.from && l.to === c.to);
      if (had >= 0) { this.links[had] = c.fixed ? this.wiredLink(c) : { ...this.links[had], wired: wiredId(c) }; continue; }
      if (c.fixed || !this.cuts.has(wiredId(c))) this.links.push(this.wiredLink(c));
    }
    for (const [dev, v] of Object.entries(s.trace ?? {})) if (this.devices.has(dev) && typeof v === 'number') this.trace.set(dev, clamp(v));
    for (const [key, until] of Object.entries(s.locks ?? {})) {
      const left = typeof until === 'number' ? until - this.wall() : 0;
      const [dev, noun] = split(key);
      if (left > 0 && this.devices.has(key.includes('.') ? dev : key) && (!key.includes('.') || this.nounData(dev, noun)?.guard)) this.lock(key, left);
    }
    this.clocks.restore(s.clocks);
    this.dogs.restore(s.watchdog);
  }

  /** Start the scene over (the terminal's `reset yard`). The keyring is the player's, so it stays. */
  reset() { this.init(); this.hooks.changed(); }

  // ---------- data → live devices ----------

  private nounData(dev: string, noun: string) { return this.devices.get(dev)?.data.nouns.find((n) => n.id === noun); }

  private build(d: DeviceData, id: string, as?: 'logic' | 'node'): Device {
    if (d.state) this.local.set(id, { ...d.state });
    const dev: Device = {
      id, name: d.name, look: d.look, data: d,
      status: () => this.status(d.status, this.ctx(id)),
      nouns: d.nouns.map((n) => this.nounOf(n, id)),
    };
    // a sector sealed with a sequence: its seal is a noun you wire signals into
    for (const s of d.sectors ?? []) {
      if (!('sequence' in s.seal)) continue;
      const verbs = s.seal.sequence.filter((v, i, a) => a.indexOf(v) === i);
      dev.nouns.push({ id: s.id, kind: 'SEAL', verbs, run: (verb, bySignal) => this.sealStep(id, s, verb, bySignal) });
    }
    // [watchdog] a device on a watchdog's route carries its noun: read it, wire from arrives / leaves
    if (this.dogs.routes().has(id)) {
      dev.nouns.push({ id: WATCH_NOUN, kind: 'WATCH', verbs: ['read'], events: ['arrives', 'leaves'], run: (verb, bySignal) => this.runWatch({ dev: id, noun: WATCH_NOUN, verb, bySignal }) });
    }
    // [clocks] its CLOCK nouns start beating
    this.clocks.add(id, d.nouns);
    if (as === 'logic') { dev.crafted = true; dev.logic = true; }
    if (as === 'node') dev.node = true;
    return dev;
  }

  private nounOf(n: NounData, dev: string): Noun {
    const m = this;
    const noun: Noun = {
      id: n.id, kind: n.kind,
      get verbs() { return m.verbsOf(n, dev); },
      run: (verb, bySignal) => {
        const c: Ctx = { dev, noun: n.id, verb, bySignal };
        if (n.kind === 'GUARD' && n.guard) return this.runGuard(n, c);
        if (n.kind === 'LINK' && n.link) return this.runLink(n, c);
        if (n.kind === 'CLOCK' && n.clock) return this.runClock(n, c);
        return this.perform(n, c);
      },
    };
    if (n.events) noun.events = [...n.events];
    if (n.current) noun.current = () => this.currentVerb(n, dev);
    if (n.sector) noun.sector = n.sector;
    return noun;
  }

  /** A GUARD's verbs grow with the keyring (a toy guard's are `probe`); a LINK's with the nodes it has seen; a CLOCK starts and stops. */
  private verbsOf(n: NounData, dev: string): string[] {
    const own = n.verbs ?? [];
    if (n.kind === 'GUARD' && n.guard?.toy) return [this.toyVerb, ...own.filter((v) => v !== this.toyVerb)];
    if (n.kind === 'CLOCK' && n.clock) return ['start', 'stop', ...own.filter((v) => v !== 'start' && v !== 'stop')];
    if (n.kind === 'GUARD' && n.guard) return [...this.fragments().map((f) => 'try ' + f.label), this.typeVerb, ...own];
    if (n.kind === 'LINK' && n.link) {
      // what it knows it connects to straight away (no scan.so needed); what a scan found besides
      const reach = this.reachOf(n, dev), known = (n.link.known ?? []).filter((id) => reach.includes(id) && this.net.get(id) !== 'connected');
      const seen = reach.filter((id) => this.net.get(id) === 'seen' && !known.includes(id));
      return ['scan', ...[...known, ...seen].map((id) => 'connect ' + id), ...own.filter((v) => v !== 'scan')];
    }
    return own;
  }

  private runGuard(n: NounData, c: Ctx): Line | null {
    // [lock toys] probe opens the toy, full screen; signals cannot play it
    if (n.guard!.toy && c.verb === this.toyVerb) {
      const key = c.dev + '.' + n.id;
      if (c.bySignal && !this.passed.has(key)) return this.line('guard.signal', { noun: n.id, via: 'signal → ' });
      const no = this.toyBlocked(key);
      if (no) return no;
      this.hooks.open('toy', key);
      return this.line('toy.open', { noun: n.id, toy: n.guard!.toy });
    }
    if (c.verb === this.typeVerb) return null;
    if (c.verb.startsWith('try ')) {
      const f = this.fragments().find((k) => 'try ' + k.label === c.verb);
      if (f) { this.check(c.dev, n.id, f.text ?? '', c.bySignal); return null; }
      if (!this.fragments().length) return this.line('guard.empty', { noun: n.id });
    }
    return this.perform(n, c);
  }

  /** Run a verb: the first case whose `if` holds does its steps and says its line. */
  private perform(n: NounData, c: Ctx): Line | null { return this.runCases(n.on?.[c.verb] ?? n.on?.['*'], c); }

  /** The first case whose `if` holds (and whose `when` is now): its steps, then its line. */
  private runCases(cases: Case | Case[] | undefined, c: Ctx): Line | null {
    if (!cases) return null;
    for (const k of list<Case>(cases)) {
      const matches = !((k.if && !this.test(k.if, c)) || !now(k.when));
      this.observe('condition', c, { condition: k.if ?? null, matches });
      if (!matches) continue;
      let out: Line | null = null;
      const keep = (l: Line | null) => { if (!l) return; if (out) this.sayLine(out); out = l; };
      (k.do ?? []).forEach((a) => keep(this.doAction(a, c)));
      if (k.say !== undefined) keep(this.lineIn(k.say, c));
      return out;
    }
    return null;
  }

  private doAction(a: Action, c: Ctx): Line | null {
    const result = this.executeAction(a, c);
    this.observe('result', c, { action: a, state: this.state, response: result });
    return result;
  }

  private executeAction(a: Action, c: Ctx): Line | null {
    const matches = !((a.if && !this.test(a.if, c)) || !now(a.when));
    this.observe('action', c, { action: a, matches });
    if (!matches) return null;
    if ('set' in a) this.write(a.set, typeof a.to === 'string' ? this.fmt(a.to, c) : a.to, c.dev);
    else if ('open' in a) this.hooks.open(a.open, a.open === 'talk' ? a.with ?? this.dialogueFor(c.noun) : a.with);
    else if ('emit' in a) this.emit(c.dev + '.' + c.noun + ':' + a.emit);
    else if ('goal' in a) this.goal(a.goal);
    else if ('effect' in a) return (this.rules.effects[a.effect] ?? ENGINE_EFFECTS[a.effect])(this.world(c), c) ?? null;
    else if ('give' in a) return this.give(a.give, a.count);
    else if ('take' in a) this.carry(a.take, -(a.count ?? 1));
    else if ('trace' in a) this.addTrace(c.dev, a.trace);
    else if ('unseal' in a) { const [d, s] = a.unseal.includes('/') ? a.unseal.split('/') : [c.dev, a.unseal]; return this.unseal(d, s); }
    return null;
  }

  /** `{ "open": "talk" }` on a noun: the dialogue named like the noun, else the scene's first. */
  private dialogueFor(noun: string) { return noun in this.data.dialogue ? noun : Object.keys(this.data.dialogue)[0]; }

  private world(c: Ctx): World {
    return {
      m: this, data: this.data,
      line: (key, vars) => this.lineIn(key, c, vars),
      has: (key) => key in this.texts,
      // an effect speaks for its own device, unless it names who reacted (`w.say(line, 'router')`)
      say: (l, from) => this.sayLine(l, from ?? (c.dev || this.speaker)),
      receipt: (l,from)=>this.receipt(l,from??(c.dev||this.speaker)),
      changed: () => this.changed(),
      goal: (g) => this.goal(g),
      tune: (key) => this.data.tuning[key],
      emit: (event) => this.emit(c.dev + '.' + c.noun + ':' + event),
    };
  }

  /** The verb whose `set` put the state where it is now (or the verb equal to it). */
  private currentVerb(n: NounData, dev: string): string | null {
    const c = this.ctx(dev), now = this.read(n.current!, c);
    return this.verbsOf(n, dev).find((v) => {
      const first = list<Case>(n.on?.[v] ?? n.on?.['*'] ?? [])[0];
      const set = first?.do?.find((a) => 'set' in a && a.set === n.current && !a.if);
      if (!set || !('set' in set)) return v === now;
      return (typeof set.to === 'string' ? this.fmt(set.to, { ...c, verb: v }) : set.to) === now;
    }) ?? null;
  }

  private status(s: string | StatusPart[], c: Ctx) {
    return list(s).map((p) => this.fmt(typeof p === 'string' ? p : (this.test(p.if, c) ? p.then : p.else) ?? '', c)).join('');
  }

  // ---------- state, conditions, templates ----------

  private ctx(dev: string, noun = ''): Ctx { return { dev, noun, verb: '', bySignal: false }; }

  private read(key: string, c: Ctx): Value | undefined {
    const own = this.local.get(c.dev);
    if (own && key in own) return own[key];
    if (key === 'signal') return c.bySignal;
    const derived = this.rules.derived?.[key];
    if (derived) return derived(this);
    const observed=Object.prototype.hasOwnProperty.call(this.data.observations?.aliases??{},key)?this.data.observations!.aliases[key]:undefined;
    if(observed)return readObservation(observed,this);
    if (key in this.state) return this.state[key];
    // the city's keys (weather, hour, day): a scene's own state of the same name wins
    if (CITY.read && (CITY_KEYS as readonly string[]).includes(key)) return CITY.read(key, this.data.id);
    return undefined;
  }

  /** Is this time window now (true without one)? For dialogue variants. */
  within(w?: TimeWindow) { return now(w); }

  private write(key: string, v: Value, dev = '') {
    if(Object.prototype.hasOwnProperty.call(this.data.observations?.aliases??{},key))throw Error('Observation alias is read-only: '+key);
    const own = this.local.get(dev);
    if (own && key in own) own[key] = v;
    else this.state[key] = v;
  }

  /** `key`, `!key`, `key=value`. */
  private test(cond: string, c: Ctx) {
    const neg = cond.startsWith('!');
    const [k, want] = cond.slice(neg ? 1 : 0).split('=');
    const v = this.read(k, c);
    const ok = want === undefined ? !!v : String(v) === want;
    return neg ? !ok : ok;
  }

  private fmt(s: string, c: Ctx, vars?: Vars) {
    return s.replace(/\{([\w.-]+)\}/g, (m, k: string) => {
      if (vars && k in vars) return String(vars[k]);
      if (k === 'verb') return c.verb;
      if (k === 'via') return c.bySignal ? 'signal → ' : '';
      const v = this.read(k, c);
      return v === undefined ? m : String(v);
    });
  }

  private lineIn(ref: LineRef, c: Ctx, vars?: Vars): Line {
    const raw = typeof ref === 'string' ? this.texts[ref] : ref;
    if (!Array.isArray(raw)) return ['', '[missing text ' + ref + ']', 'err'];
    const l: Line = [this.fmt(raw[0], c, vars), this.fmt(raw[1], c, vars)];
    if (raw.length > 2) l.push(raw[2]);
    return l;
  }
}
