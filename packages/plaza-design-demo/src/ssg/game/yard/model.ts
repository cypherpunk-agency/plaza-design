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

import { YARD } from '../data';
import type { Action, Case, DeviceData, Kind, LineRef, NounData, StatusPart, Value, ZoneData } from '../data/types';
import { type Vars, type World, YARD_EFFECTS } from './effects';

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

  constructor(private hooks: YardHooks, zone: ZoneData = YARD) {
    this.zone = zone;
    for (const [k, v] of Object.entries(zone.state)) this.write(k, v);
    zone.devices.forEach((d) => this.devices.set(d.id, this.build(d, d.id)));
    this.links = zone.cables.map((c) => ({ ...c }));
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
    setTimeout(() => { out.forEach((l) => this.live.delete(l)); this.hooks.changed(); }, 500);
    out.forEach((l) => setTimeout(() => { const [d, n] = split(l.to); this.act(d, n, l.verb, true); }, 150));
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

  /** Place a logic part from the zone's catalogue. Returns its id: 'timer1', 'switch1', … */
  addLogic(kind: 'timer' | 'switch'): string {
    const t = this.zone.catalogue.find((d) => d.id === kind);
    if (!t) throw new Error('no logic part "' + kind + '" in the catalogue');
    let n = this.placed.get(kind) ?? 0, id: string;
    do id = kind + ++n; while (this.devices.has(id));
    this.placed.set(kind, n);
    this.devices.set(id, this.build(t, id, true));
    this.hooks.changed();
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
