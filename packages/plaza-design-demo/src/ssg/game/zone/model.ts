/**
 * A zone's rules, for any zone file: devices made of nouns, nouns with verbs,
 * events on nouns, and cables that say "when this noun does X, that noun does Y".
 *
 * What a zone contains and says lives in its data file (see GAME-DATA.md);
 * the zone's own fiddly rules run as named effects (`ZoneRules`, next to its
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

import { ENGINE, KEYRING, LOGIC, NET, START_MODULES } from '../data';
import type {
  Action, CableData, Case, DeviceData, KeyItem, Kind, LineData, LineRef, LogicData, NetData, NounData, SectorData, StatusPart, Value, ZoneData, ZoneSave,
} from '../data/types';
import { ENGINE_EFFECTS, type Vars, type World, type ZoneRules } from './rules';

/** Data kinds, plus SEAL: the input of a sector sealed with a sequence (made by the engine). */
export type NounKind = Kind | 'SEAL';
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

/** A cable: when `from` (device.noun:event) fires, `to` (device.noun) does `verb`. */
export interface Link { from: string; to: string; verb: string }

/** Where a verb is running: which device and noun, and whether a cable sent it. */
export interface Ctx { dev: string; noun: string; verb: string; bySignal: boolean }

/** A device standing in the world, from its `layout.spot`. */
export interface Spot { id: string; x: number; w: number; h: number }

export interface ZoneHooks {
  say: (line: Line) => void;
  /** Open a panel: `talk` (arg: the dialogue), or one of the zone's own (`camera`). */
  open: (panel: string, arg?: string) => void;
  changed: () => void;
  /** A full trace threw the player out of this device. */
  kick?: (dev: string) => void;
  /** The logic modules the player owns (`timer.so`, …). Default: what a new game starts with. */
  modules?: () => string[];
  /** The player's keyring (item ids), shared by every zone. Default: the model keeps its own. */
  keyring?: () => string[];
  /** Put an item on the keyring (and save). */
  give?: (id: string) => void;
}

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

export class ZoneModel {
  /** The zone's state keys. Starting values come from the zone's `state`. */
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
  /** Lockouts until a time: a device (`dev`, after a full trace) or a guard (`dev.noun`, after wrong guesses). */
  locks = new Map<string, number>();
  /** Net nodes met: seen on a scan (a silhouette on the board), or connected (a device). */
  net = new Map<string, 'seen' | 'connected'>();
  /** Where each logic part floats in the world in hack vision (x along the zone, h above the ground). */
  logicAt = new Map<string, { x: number; h: number }>();
  /** Devices the player is looking into right now (the host sets it: a device's schematic). */
  viewing = new Set<string>();
  /** The clock. A test can swap it. */
  now: () => number = () => performance.now();
  readonly texts: Record<string, string | LineData>;
  /** Per-device state (a SWITCH's on/off), keyed by device id. */
  private local = new Map<string, Record<string, Value>>();
  private placed = new Map<string, number>();
  private touched = new Map<string, number>();
  private fails = new Map<string, number>();
  private seq = new Map<string, { i: number; t: number }>();
  private nodeData = new Map<string, DeviceData>();
  /** Pre-wired cables of the zone and the net; those touching a node wait until it is connected. */
  private prewired: CableData[];
  private ownKeyring: string[] = [];
  /** Every keyring item this zone may meet: the game's, its own, the net's. */
  private keys: Map<string, KeyItem>;
  private sealing = false;
  /** Bumped by reset and restore: timers started before it never fire. */
  private epoch = 0;

  constructor(private hooks: ZoneHooks, readonly zone: ZoneData, readonly rules: ZoneRules, readonly logic: LogicData = LOGIC, net: NetData = NET) {
    this.texts = { ...ENGINE.texts, ...zone.texts };
    for (const n of [...net.nodes, ...(zone.nodes ?? [])]) this.nodeData.set(n.id, n);
    this.prewired = [...zone.cables, ...net.cables];
    this.keys = new Map([...KEYRING, ...[...net.keyring, ...(zone.keyring ?? [])].map((k) => [k.id, k] as const)]);
    this.init();
  }

  /** Back to how the zone file starts it: its own cables, no parts, no goals, nothing opened. */
  private init() {
    this.epoch++;
    for (const m of [this.devices, this.local, this.placed, this.touched, this.fails, this.seq, this.trace, this.locks, this.net, this.logicAt]) m.clear();
    for (const s of [this.live, this.goals, this.opened, this.passed, this.viewing]) s.clear();
    this.scratch = {};
    this.state = { ...this.zone.state };
    this.zone.devices.forEach((d) => this.devices.set(d.id, this.build(d, d.id)));
    this.links = [];
    this.wire();
  }

  /** Lay the pre-wired cables whose both ends exist now (at the start, and as nodes connect). */
  private wire() {
    const here = (key: string) => this.devices.has(split(key.split(':')[0])[0]);
    for (const c of this.prewired) {
      if (!here(c.from) || !here(c.to) || this.links.some((l) => l.from === c.from && l.to === c.to)) continue;
      this.links.push({ from: c.from, to: c.to, verb: c.verb });
    }
  }

  /** setTimeout that a reset or restore cancels (a timer counting, a parcel sliding). */
  later(ms: number, fn: () => void) {
    const e = this.epoch;
    setTimeout(() => { if (e === this.epoch) fn(); }, ms);
  }

  /** A zone state key (for effects and the scene). */
  get(key: string): Value { return this.state[key]; }
  set(key: string, v: Value) { this.state[key] = v; }
  /** A state key, a derived value (`gateOpen`) or `signal`, as conditions read them. */
  value(key: string): Value | undefined { return this.read(key, this.ctx('')); }
  noun(key: string) { const [d, n] = split(key); return this.devices.get(d)?.nouns.find((x) => x.id === n); }
  /** Devices standing in the world (their `layout.spot`); logic parts and net nodes live on the board only. */
  spots(): Spot[] {
    return [...this.devices.values()].filter((d) => !d.logic && !d.node && d.data.layout?.spot).map((d) => ({ id: d.id, ...d.data.layout!.spot! }));
  }

  // ---------- doing things ----------

  act(dev: string, noun: string, verb: string, bySignal = false) {
    const n = this.noun(dev + '.' + noun);
    if (!bySignal) {
      const d = this.devices.get(dev), left = this.lockLeft(dev);
      if (d && left) { this.hooks.say(this.line('trace.locked', { device: d.name, sec: secs(left) })); this.changed(); return; }
      this.touched.set(dev, this.now());
      if (n?.sector && this.sealed(dev, n.sector)) { this.hooks.say(this.trySeal(dev, n.sector)); this.changed(); return; }
    }
    const line = n?.run(verb, bySignal);
    if (line) this.hooks.say(line);
    this.changed();
  }

  /** Tell the view; open any sector whose `if` seal holds now. */
  changed() { this.checkSeals(); this.hooks.changed(); }

  goal(id: string) { if (this.goals.has(id)) return; this.goals.add(id); this.changed(); }

  /** Does a data condition hold right now (zone state only)? For panels. */
  cond(c: string) { return this.test(c, this.ctx('')); }
  /** Run data actions outside any noun (dialogue choices). */
  apply(actions: Action[]) { actions.forEach((a) => { const l = this.doAction(a, this.ctx('')); if (l) this.hooks.say(l); }); this.changed(); }
  /** A label from the texts, with `{vars}` filled in. */
  label(key: string, vars?: Vars) { const t = this.texts[key]; return typeof t === 'string' ? this.fmt(t, this.ctx(''), vars) : '[' + key + ']'; }
  /** A terminal line from the texts. */
  line(ref: LineRef, vars?: Vars) { return this.lineIn(ref, this.ctx(''), vars); }

  // ---------- events and cables ----------

  emit(key: string) {
    const out = this.links.filter((l) => l.from === key);
    out.forEach((l) => this.live.add(l));
    this.hooks.changed();
    this.later(500, () => { out.forEach((l) => this.live.delete(l)); this.hooks.changed(); });
    out.forEach((l) => this.later(150, () => { const [d, n] = split(l.to); this.act(d, n, l.verb, true); }));
  }

  connect(from: string, to: string, verb: string): Line {
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
    this.links = this.links.filter((l) => l !== link);
    this.live.delete(link);
    this.changed();
    return this.line('wire.cut', { from: link.from, to: link.to });
  }

  // ---------- logic parts on the board ----------

  /** Modules the player owns. */
  modules(): string[] { return this.hooks.modules?.() ?? START_MODULES; }
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

  /** Remove a placed logic part and every cable touching it. The zone's own devices stay. */
  removeDevice(id: string): void {
    if (!this.devices.get(id)?.logic) return;
    this.devices.delete(id); this.local.delete(id); this.logicAt.delete(id);
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

  /** Put an item on the keyring. Returns the line to say, or null if it was there already. */
  give(id: string): Line | null {
    const k = this.item(id);
    if (!k || this.keyring().includes(id)) return null;
    if (this.hooks.give) this.hooks.give(id); else this.ownKeyring.push(id);
    return this.line(k.kind === 'key' ? 'keyring.key' : k.kind === 'rule' ? 'keyring.rule' : 'keyring.fragment', { label: k.label, text: k.text ?? '' });
  }

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
    if (!made || !k || (k.text ?? '').length > MAX_FRAGMENT) this.hooks.say(this.line('keyring.nocombine', { a: A.label, b: B.label }));
    else if (ring.includes(made)) this.hooks.say(this.line('keyring.have', { label: k.label }));
    else this.hooks.say(this.give(made)!);
    this.changed();
  }

  /** Throw away a fragment made on the keyring (the data's own stay: they are evidence). */
  discard(id: string) {
    if (this.keys.has(id) || !this.item(id)) return;
    const ring = this.keyring(), i = ring.indexOf(id);
    if (i >= 0) ring.splice(i, 1);
    this.changed();
  }

  /**
   * A keyring chip dropped on a noun: on a GUARD, try it as the password;
   * on a sealed noun, try it as the sector's key. Says what happened.
   */
  useItem(id: string, key: string) {
    const [dev, nid] = split(key), n = this.noun(key), k = this.item(id);
    if (!n || !k || !this.keyring().includes(id)) return;
    let l: Line | null = null;
    if (n.sector && this.sealed(dev, n.sector)) l = this.trySeal(dev, n.sector, id);
    else if (n.kind === 'GUARD') {
      this.touched.set(dev, this.now());
      if (k.kind === 'fragment') this.check(dev, nid, k.text ?? '');
      else l = this.line('guard.notfragment', { noun: nid, label: k.label });
    }
    if (l) this.hooks.say(l);
    this.changed();
  }

  // ---------- guards ----------

  /** The keyboard, last resort: type a guess at a GUARD. */
  guess(dev: string, noun: string, text: string) {
    this.touched.set(dev, this.now());
    this.check(dev, noun, text);
    this.changed();
  }

  /** The verb that opens the keyboard on a GUARD (the schematic shows an input instead of running it). */
  get typeVerb() { return this.label('guard.type'); }

  /** Try a password on a guard, and say how it went (then any sector it opens, then any kick its trace causes). */
  private check(dev: string, noun: string, text: string, bySignal = false) {
    const key = dev + '.' + noun, g = this.nounData(dev, noun)?.guard, vars: Vars = { noun, guess: text };
    const say = (k: string, more?: Vars) => this.hooks.say(this.line(k, { ...vars, ...more }));
    if (!g) return;
    if (this.passed.has(key)) return say('guard.passed');
    if (bySignal) return say('guard.signal');
    const left = this.lockLeft(key);
    if (left) return say('guard.locked', { sec: secs(left) });
    if (list(g.password).some((p) => norm(p) === norm(text))) {
      this.passed.add(key); this.fails.delete(key);
      say('guard.ok');
      const c = this.ctx(dev, noun);
      (g.do ?? []).forEach((a) => { const l = this.doAction(a, c); if (l) this.hooks.say(l); });
      if (this.nounData(dev, noun)!.events?.includes('opened')) this.emit(key + ':opened');
      (this.devices.get(dev)?.data.sectors ?? []).filter((s) => 'guard' in s.seal && s.seal.guard === noun)
        .forEach((s) => { const l = this.unseal(dev, s.id); if (l) this.hooks.say(l); });
      return;
    }
    const fails = (this.fails.get(key) ?? 0) + 1, tries = g.tries ?? 1, lockMs = g.lockMs ?? GUARD_LOCK_MS;
    this.fails.set(key, fails);
    // a near miss gets its own reply (still a wrong guess)
    const near = Object.entries(g.near ?? {}).find(([k]) => norm(k) === norm(text));
    if (near) this.hooks.say(this.lineIn(near[1], this.ctx(dev, noun), vars));
    if (lockMs > 0 && fails >= tries) {
      this.fails.delete(key);
      this.locks.set(key, this.now() + lockMs);
      this.later(lockMs + 50, () => this.changed());
      say('guard.lock', { sec: secs(lockMs) });
    } else if (!near) say(lockMs > 0 ? 'guard.wrong' : 'guard.wrong.last', { left: tries - fails });
    if (g.trace) this.addTrace(dev, g.trace);
  }

  /** Milliseconds left on a lockout (a device id, or a guard's `dev.noun`); 0 when free. */
  lockLeft(key: string) { const until = this.locks.get(key); return until && until > this.now() ? until - this.now() : 0; }

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
        if (l) this.hooks.say(l);
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
   * the meter; otherwise it drains. Returns true when a meter or a lock changed
   * (the host redraws the meters, or everything when a lock ended).
   */
  tick(dt: number): boolean {
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
    for (const [k, until] of this.locks) if (until <= this.now()) { this.locks.delete(k); moved = true; }
    return moved;
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
    this.locks.set(dev, this.now() + ms);
    this.trace.set(dev, 0);
    this.viewing.delete(dev); this.touched.delete(dev);
    this.hooks.say(this.line('trace.kick', { device: d.name, sec: secs(ms) }));
    this.hooks.kick?.(dev);
    this.later(ms + 50, () => this.changed());
  }

  // ---------- the net ----------

  nodeName(id: string) { return this.nodeData.get(id)?.name ?? id; }
  /** Nodes seen on a scan but not connected: silhouettes on the board, with the LINK device that reaches them. */
  ghosts(): { id: string; name: string; link: string }[] {
    return [...this.net].filter(([, s]) => s === 'seen').map(([id]) => {
      const link = [...this.devices.values()].find((d) => d.data.nouns.some((n) => n.link?.reach.includes(id)));
      return { id, name: this.nodeName(id), link: link?.name ?? '?' };
    });
  }

  private runLink(n: NounData, c: Ctx): Line | null {
    const reach = n.link!.reach.filter((id) => this.nodeData.has(id)), via = c.bySignal ? 'signal → ' : '';
    if (c.verb === 'scan') {
      const fresh = reach.filter((id) => !this.net.has(id));
      fresh.forEach((id) => this.net.set(id, 'seen'));
      return fresh.length ? this.line('net.scan', { via, names: fresh.map((id) => this.nodeName(id)).join(', ') }) : this.line('net.scan.none', { via });
    }
    const id = c.verb.startsWith('connect ') ? c.verb.slice(8) : '';
    if (id && reach.includes(id)) {
      const vars = { via, node: id, name: this.nodeName(id) };
      if (this.net.get(id) === 'connected') return this.line('net.connected', vars);
      this.join(id);
      return this.line('net.connect', vars);
    }
    return this.perform(n, c);
  }

  /** Bring a node in as a device. Its pre-wired cables come with it (a restore then puts the saved cables over them). */
  private join(id: string) {
    this.net.set(id, 'connected');
    if (this.devices.has(id)) return;
    this.devices.set(id, this.build(this.nodeData.get(id)!, id, 'node'));
    this.wire();
  }

  // ---------- saving ----------

  /** The zone's progress for the save, settled: nothing in flight, no trace, no lockouts. */
  snapshot(): ZoneSave {
    const state: Record<string, Value> = {};
    for (const k of Object.keys(this.zone.state)) state[k] = this.state[k];
    this.rules.settle?.(state);
    const devs = [...this.devices.values()];
    const logic = devs.filter((d) => d.logic).map((d) => {
      const kind = d.id.replace(/\d+$/, ''), own = this.local.get(d.id), at = this.logicAt.get(d.id);
      return { id: d.id, kind, ...(own ? { state: { ...own } } : {}), ...(at ? { at: { x: at.x, h: at.h } } : {}) };
    });
    const z: ZoneSave = { state, goals: [...this.goals], links: this.links.map((l) => ({ from: l.from, to: l.to, verb: l.verb })), logic };
    const local = devs.filter((d) => !d.logic && this.local.has(d.id)).map((d) => [d.id, { ...this.local.get(d.id)! }]);
    if (local.length) z.local = Object.fromEntries(local);
    if (this.opened.size) z.open = [...this.opened];
    if (this.passed.size) z.passed = [...this.passed];
    if (this.net.size) {
      const ids = (s: string) => [...this.net].filter(([, v]) => v === s).map(([id]) => id);
      z.net = { seen: ids('seen'), connected: ids('connected') };
    }
    return z;
  }

  /**
   * Back to a saved point. Anything that no longer fits the data (a state key,
   * a part kind, a sector, a cable to a noun that is gone) is dropped, not trusted.
   * Placed parts come back even if their module is no longer owned.
   */
  restore(s: ZoneSave) {
    this.init();
    for (const [k, v] of Object.entries(s.state ?? {})) if (k in this.zone.state) this.state[k] = v;
    this.rules.settle?.(this.state);
    const goalIds = new Set(this.zone.goals.map((g) => g.id));
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
    this.hooks.changed();
  }

  /** Start the zone over (the terminal's `reset yard`). The keyring is the player's, so it stays. */
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
    if (as === 'logic') { dev.crafted = true; dev.logic = true; }
    if (as === 'node') dev.node = true;
    return dev;
  }

  private nounOf(n: NounData, dev: string): Noun {
    const m = this;
    const noun: Noun = {
      id: n.id, kind: n.kind,
      get verbs() { return m.verbsOf(n); },
      run: (verb, bySignal) => {
        const c: Ctx = { dev, noun: n.id, verb, bySignal };
        if (n.kind === 'GUARD' && n.guard) return this.runGuard(n, c);
        if (n.kind === 'LINK' && n.link) return this.runLink(n, c);
        return this.perform(n, c);
      },
    };
    if (n.events) noun.events = [...n.events];
    if (n.current) noun.current = () => this.currentVerb(n, dev);
    if (n.sector) noun.sector = n.sector;
    return noun;
  }

  /** A GUARD's verbs grow with the keyring; a LINK's with the nodes it has seen. */
  private verbsOf(n: NounData): string[] {
    const own = n.verbs ?? [];
    if (n.kind === 'GUARD' && n.guard) return [...this.fragments().map((f) => 'try ' + f.label), this.typeVerb, ...own];
    if (n.kind === 'LINK' && n.link) {
      const seen = n.link.reach.filter((id) => this.net.get(id) === 'seen');
      return ['scan', ...seen.map((id) => 'connect ' + id), ...own.filter((v) => v !== 'scan')];
    }
    return own;
  }

  private runGuard(n: NounData, c: Ctx): Line | null {
    if (c.verb === this.typeVerb) return null;
    if (c.verb.startsWith('try ')) {
      const f = this.fragments().find((k) => 'try ' + k.label === c.verb);
      if (f) { this.check(c.dev, n.id, f.text ?? '', c.bySignal); return null; }
      if (!this.fragments().length) return this.line('guard.empty', { noun: n.id });
    }
    return this.perform(n, c);
  }

  /** Run a verb: the first case whose `if` holds does its steps and says its line. */
  private perform(n: NounData, c: Ctx): Line | null {
    const cases = n.on?.[c.verb] ?? n.on?.['*'];
    if (!cases) return null;
    for (const k of list<Case>(cases)) {
      if (k.if && !this.test(k.if, c)) continue;
      let out: Line | null = null;
      const keep = (l: Line | null) => { if (!l) return; if (out) this.hooks.say(out); out = l; };
      (k.do ?? []).forEach((a) => keep(this.doAction(a, c)));
      if (k.say !== undefined) keep(this.lineIn(k.say, c));
      return out;
    }
    return null;
  }

  private doAction(a: Action, c: Ctx): Line | null {
    if (a.if && !this.test(a.if, c)) return null;
    if ('set' in a) this.write(a.set, typeof a.to === 'string' ? this.fmt(a.to, c) : a.to, c.dev);
    else if ('open' in a) this.hooks.open(a.open, a.open === 'talk' ? a.with ?? this.dialogueFor(c.noun) : a.with);
    else if ('emit' in a) this.emit(c.dev + '.' + c.noun + ':' + a.emit);
    else if ('goal' in a) this.goal(a.goal);
    else if ('effect' in a) return (this.rules.effects[a.effect] ?? ENGINE_EFFECTS[a.effect])(this.world(c), c) ?? null;
    else if ('give' in a) return this.give(a.give);
    else if ('trace' in a) this.addTrace(c.dev, a.trace);
    else if ('unseal' in a) { const [d, s] = a.unseal.includes('/') ? a.unseal.split('/') : [c.dev, a.unseal]; return this.unseal(d, s); }
    return null;
  }

  /** `{ "open": "talk" }` on a noun: the dialogue named like the noun, else the zone's first. */
  private dialogueFor(noun: string) { return noun in this.zone.dialogue ? noun : Object.keys(this.zone.dialogue)[0]; }

  private world(c: Ctx): World {
    return {
      m: this, zone: this.zone,
      line: (key, vars) => this.lineIn(key, c, vars),
      has: (key) => key in this.texts,
      say: (l) => this.hooks.say(l),
      changed: () => this.changed(),
      goal: (g) => this.goal(g),
      tune: (key) => this.zone.tuning[key],
      emit: (event) => this.emit(c.dev + '.' + c.noun + ':' + event),
    };
  }

  /** The verb whose `set` put the state where it is now (or the verb equal to it). */
  private currentVerb(n: NounData, dev: string): string | null {
    const c = this.ctx(dev), now = this.read(n.current!, c);
    return this.verbsOf(n).find((v) => {
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
    if (key in this.state) return this.state[key];
    return undefined;
  }

  private write(key: string, v: Value, dev = '') {
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
