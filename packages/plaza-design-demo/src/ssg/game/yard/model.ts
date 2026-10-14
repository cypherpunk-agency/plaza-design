/**
 * The back yard's rules: devices made of nouns, nouns with verbs, events on
 * nouns, and cables that say "when this noun does X, that noun does Y".
 *
 * What the yard contains and says lives in data/yard.json (see GAME-DATA.md).
 * This class turns that data into live devices: each verb runs the cases the
 * data gives it, and the fiddly rules run as named effects (effects.ts).
 *
 * It knows nothing about drawing: the scene (canvas) and the schematic (DOM)
 * read it and call `act`, `connect` and `cut`.
 */

import { LOGIC, START_MODULES, YARD } from '../data';
import type { Action, Case, DeviceData, Kind, LineRef, LogicData, NounData, StatusPart, Value, ZoneData, ZoneSave } from '../data/types';
import { settleYard, type Vars, type World, YARD_EFFECTS } from './effects';

export type { Kind };
export type Line = [cmd: string, reply: string, tone?: 'ok' | 'err' | 'dim'];

export interface Noun {
  id: string;
  kind: Kind;
  verbs: string[];
  /** Events this noun raises; cables start here. */
  events?: string[];
  /** The verb that reflects the current state, highlighted on the schematic. */
  current?: () => string | null;
  run: (verb: string, bySignal: boolean) => Line | null;
}

export interface Device {
  id: string;
  name: string;
  look: string;
  crafted?: boolean;
  /** A logic part placed from the board (TIMER, SWITCH). Also `crafted` for now. */
  logic?: boolean;
  status: () => string;
  nouns: Noun[];
}

/** A cable: when `from` (device.noun:event) fires, `to` (device.noun) does `verb`. */
export interface Link { from: string; to: string; verb: string }

export type ParcelAt = 'A-3' | 'B-5' | 'C-7' | 'hook' | 'chute' | 'sliding' | 'bounced' | 'tray' | 'taken';
export type Goal = 'find' | 'chute' | 'talk' | 'gate' | 'take';

/** Where a verb is running: which device and noun, and whether a cable sent it. */
export interface Ctx { dev: string; noun: string; verb: string; bySignal: boolean }

export interface YardHooks {
  say: (line: Line) => void;
  openCamera: () => void;
  openTalk: () => void;
  /** @deprecated the workbench is gone; ignored. */
  openBench?: () => void;
  changed: () => void;
  goal: (g: Goal) => void;
  /** The logic modules the player owns (`timer.so`, …). Default: what a new game starts with. */
  modules?: () => string[];
}

export const SLIDE_MS = YARD.tuning.slideMs;
export const GATE_OPEN_MS = YARD.tuning.gateOpenMs;

const list = <T>(x: T | T[]) => (Array.isArray(x) ? x : [x]);
/** "crane.job.log" → ["crane", "job.log"]: noun ids may contain dots. */
const split = (key: string) => { const i = key.indexOf('.'); return [key.slice(0, i), key.slice(i + 1)]; };

export class YardModel {
  // State. Starting values come from the zone's `state`.
  found!: boolean;
  armAt!: string;
  held!: string | null;
  parcel!: 'C-7';
  parcelAt!: ParcelAt;
  gateAllowed!: boolean;
  pan!: number;

  slideStart = 0;
  gateOpenUntil = 0;
  links: Link[] = [];
  /** Cables currently carrying a signal, for the glow. */
  live = new Set<Link>();
  goals = new Set<Goal>();
  devices = new Map<string, Device>();
  readonly zone: ZoneData;
  /** Per-device state (a SWITCH's on/off), keyed by device id. */
  private local = new Map<string, Record<string, Value>>();
  private placed = new Map<string, number>();
  /** Bumped by reset and restore: timers started before it never fire. */
  private epoch = 0;

  constructor(private hooks: YardHooks, zone: ZoneData = YARD, readonly logic: LogicData = LOGIC) {
    this.zone = zone;
    this.init();
  }

  /** Back to how the zone file starts it: no parts, its own cables, no goals. */
  private init() {
    this.epoch++;
    this.devices.clear(); this.local.clear(); this.placed.clear(); this.live.clear(); this.goals.clear();
    for (const [k, v] of Object.entries(this.zone.state)) this.write(k, v);
    this.slideStart = 0; this.gateOpenUntil = 0;
    this.zone.devices.forEach((d) => this.devices.set(d.id, this.build(d, d.id)));
    this.links = this.zone.cables.map((c) => ({ ...c }));
  }

  /** setTimeout that a reset or restore cancels (a timer counting, a parcel sliding). */
  later(ms: number, fn: () => void) {
    const e = this.epoch;
    setTimeout(() => { if (e === this.epoch) fn(); }, ms);
  }

  gateOpen() { return performance.now() < this.gateOpenUntil; }
  noun(key: string) { const [d, n] = split(key); return this.devices.get(d)?.nouns.find((x) => x.id === n); }

  // ---------- doing things ----------

  act(dev: string, noun: string, verb: string, bySignal = false) {
    const line = this.noun(dev + '.' + noun)?.run(verb, bySignal);
    if (line) this.hooks.say(line);
    this.hooks.changed();
  }

  allowSignals() { this.gateAllowed = true; this.hooks.goal('talk'); this.hooks.changed(); }
  markFound() { if (!this.found) { this.found = true; this.hooks.goal('find'); this.hooks.changed(); } }

  /** Does a data condition hold right now (zone state only)? For panels. */
  cond(c: string) { return this.test(c, this.ctx('')); }
  /** Run data actions outside any noun (dialogue choices). */
  apply(actions: Action[]) { actions.forEach((a) => this.doAction(a, this.ctx(''))); this.hooks.changed(); }
  /** A label from the zone's texts, with `{vars}` filled in. */
  label(key: string, vars?: Vars) { const t = this.zone.texts[key]; return typeof t === 'string' ? this.fmt(t, this.ctx(''), vars) : '[' + key + ']'; }
  /** A terminal line from the zone's texts. */
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
    this.hooks.changed();
    return this.line('wire.connect', {
      from, to, verb, verbCmd: verb.replace(/\s/g, ''),
      event: split(from)[1].replace(':', ' '), toNoun: split(to)[1],
    });
  }

  cut(link: Link): Line {
    this.links = this.links.filter((l) => l !== link);
    this.hooks.changed();
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
    this.hooks.changed();
    return id;
  }

  private place(kind: string, want?: string): string {
    const t = this.module(kind)!.part;
    let n = this.placed.get(kind) ?? 0, id: string;
    if (want) { id = want; n = Math.max(n, parseInt(want.slice(kind.length), 10) || 0); }
    else do id = kind + ++n; while (this.devices.has(id));
    this.placed.set(kind, n);
    this.devices.set(id, this.build(t, id, true));
    return id;
  }

  /** Remove a placed logic part and every cable touching it. The yard's own devices stay. */
  removeDevice(id: string): void {
    if (!this.devices.get(id)?.logic) return;
    this.devices.delete(id); this.local.delete(id);
    const on = (key: string) => split(key)[0] === id;
    this.links = this.links.filter((l) => { const hit = on(l.from) || on(l.to); if (hit) this.live.delete(l); return !hit; });
    this.hooks.changed();
  }

  // ---------- saving ----------

  private zoneState() {
    const st: Record<string, Value> = {};
    for (const k of Object.keys(this.zone.state)) st[k] = (this as unknown as Record<string, Value>)[k];
    return st;
  }

  /** The zone's progress for the save, settled: no parcel mid-slide, no timer counting. */
  snapshot(): ZoneSave {
    const state = this.zoneState();
    settleYard(state);
    const logic = [...this.devices.values()].filter((d) => d.logic).map((d) => {
      const kind = d.id.replace(/\d+$/, ''), own = this.local.get(d.id);
      return own ? { id: d.id, kind, state: { ...own } } : { id: d.id, kind };
    });
    return { state, goals: [...this.goals], links: this.links.map((l) => ({ from: l.from, to: l.to, verb: l.verb })), logic };
  }

  /**
   * Back to a saved point. Anything that no longer fits the data (a state key,
   * a part kind, a cable to a noun that is gone) is dropped, not trusted.
   * Placed parts come back even if their module is no longer owned.
   */
  restore(s: ZoneSave) {
    this.init();
    for (const [k, v] of Object.entries(s.state ?? {})) if (k in this.zone.state) this.write(k, v);
    const st = this.zoneState();
    settleYard(st);
    for (const [k, v] of Object.entries(st)) this.write(k, v);
    const goalIds = new Set(this.zone.goals.map((g) => g.id));
    (s.goals ?? []).forEach((g) => { if (goalIds.has(g)) this.goals.add(g as Goal); });
    for (const p of s.logic ?? []) {
      if (!this.module(p.kind) || !p.id.startsWith(p.kind) || !/^\d+$/.test(p.id.slice(p.kind.length)) || this.devices.has(p.id)) continue;
      this.place(p.kind, p.id);
      const own = this.local.get(p.id);
      if (own && p.state) for (const [k, v] of Object.entries(p.state)) if (k in own) own[k] = v;
    }
    this.links = (s.links ?? []).filter((l) => {
      const [from, ev] = l.from.split(':'), a = this.noun(from), b = this.noun(l.to);
      return !!a && !!b && !!a.events?.includes(ev) && b.verbs.includes(l.verb);
    }).map((l) => ({ from: l.from, to: l.to, verb: l.verb }));
    this.hooks.changed();
  }

  /** Start the zone over (the terminal's `reset yard`). */
  reset() { this.init(); this.hooks.changed(); }

  // ---------- the parcel ----------

  take(): Line | null {
    if (this.parcelAt !== 'tray') return null;
    this.parcelAt = 'taken'; this.hooks.goal('take'); this.hooks.changed();
    return this.line('parcel.take');
  }

  // ---------- data → live devices ----------

  private build(d: DeviceData, id: string, logic = false): Device {
    if (d.state) this.local.set(id, { ...d.state });
    const dev: Device = {
      id, name: d.name, look: d.look,
      status: () => this.status(d.status, this.ctx(id)),
      nouns: d.nouns.map((n) => this.nounOf(n, id)),
    };
    if (logic) { dev.crafted = true; dev.logic = true; }
    return dev;
  }

  private nounOf(n: NounData, dev: string): Noun {
    const noun: Noun = { id: n.id, kind: n.kind, verbs: [...n.verbs], run: (verb, bySignal) => this.perform(n, { dev, noun: n.id, verb, bySignal }) };
    if (n.events) noun.events = [...n.events];
    if (n.current) noun.current = () => this.currentVerb(n, dev);
    return noun;
  }

  /** Run a verb: the first case whose `if` holds does its steps and says its line. */
  private perform(n: NounData, c: Ctx): Line | null {
    const cases = n.on[c.verb] ?? n.on['*'];
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
    else if ('open' in a) { if (a.open === 'camera') this.hooks.openCamera(); else this.hooks.openTalk(); }
    else if ('emit' in a) this.emit(c.dev + '.' + c.noun + ':' + a.emit);
    else if ('goal' in a) this.hooks.goal(a.goal as Goal);
    else if ('effect' in a) return YARD_EFFECTS[a.effect](this.world(c), c) ?? null;
    return null;
  }

  private world(c: Ctx): World {
    return {
      m: this, zone: this.zone,
      line: (key, vars) => this.lineIn(key, c, vars),
      has: (key) => key in this.zone.texts,
      say: (l) => this.hooks.say(l),
      changed: () => this.hooks.changed(),
      goal: (g) => this.hooks.goal(g),
      tune: (key) => this.zone.tuning[key],
      emit: (event) => this.emit(c.dev + '.' + c.noun + ':' + event),
    };
  }

  /** The verb whose `set` put the state where it is now (or the verb equal to it). */
  private currentVerb(n: NounData, dev: string): string | null {
    const c = this.ctx(dev), now = this.read(n.current!, c);
    return n.verbs.find((v) => {
      const first = list<Case>(n.on[v] ?? n.on['*'])[0];
      const set = first?.do?.find((a) => 'set' in a && a.set === n.current && !a.if);
      if (!set || !('set' in set)) return v === now;
      return (typeof set.to === 'string' ? this.fmt(set.to, { ...c, verb: v }) : set.to) === now;
    }) ?? null;
  }

  private status(s: string | StatusPart[], c: Ctx) {
    return list(s).map((p) => this.fmt(typeof p === 'string' ? p : (this.test(p.if, c) ? p.then : p.else) ?? '', c)).join('');
  }

  // ---------- state, conditions, templates ----------

  private ctx(dev: string): Ctx { return { dev, noun: '', verb: '', bySignal: false }; }

  private read(key: string, c: Ctx): Value | undefined {
    const own = this.local.get(c.dev);
    if (own && key in own) return own[key];
    if (key === 'signal') return c.bySignal;
    if (key === 'gateOpen') return this.gateOpen();
    if (key in this.zone.state) return (this as unknown as Record<string, Value>)[key];
    return undefined;
  }

  private write(key: string, v: Value, dev = '') {
    const own = this.local.get(dev);
    if (own && key in own) own[key] = v;
    else (this as unknown as Record<string, Value>)[key] = v;
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
    const raw = typeof ref === 'string' ? this.zone.texts[ref] : ref;
    if (!Array.isArray(raw)) return ['', '[missing text ' + ref + ']', 'err'];
    const l: Line = [this.fmt(raw[0], c, vars), this.fmt(raw[1], c, vars)];
    if (raw.length > 2) l.push(raw[2]);
    return l;
  }
}
