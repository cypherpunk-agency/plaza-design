/**
 * The back yard's rules: devices made of nouns, nouns with verbs, events on
 * nouns, and cables that say "when this noun does X, that noun does Y".
 *
 * This is the new hacking system's core. It knows nothing about drawing: the
 * scene (canvas) and the schematic (DOM) read it and call `act`, `propose`,
 * `choose` and `cut`.
 */

export type Kind = 'SENSE' | 'ACT' | 'STORE' | 'DAEMON';
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
  status: () => string;
  nouns: Noun[];
}

/** A cable: when `from` (device.noun:event) fires, `to` (device.noun) does `verb`. */
export interface Link { from: string; to: string; verb: string }

export type ParcelAt = 'A-3' | 'B-5' | 'C-7' | 'hook' | 'chute' | 'sliding' | 'bounced' | 'tray' | 'taken';
export type Goal = 'find' | 'chute' | 'talk' | 'gate' | 'take';

export interface YardHooks {
  say: (line: Line) => void;
  openCamera: () => void;
  openTalk: () => void;
  openBench: () => void;
  changed: () => void;
  goal: (g: Goal) => void;
}

export const SLIDE_MS = 2500;
export const GATE_OPEN_MS = 1000;

export class YardModel {
  found = false;
  armAt = 'home';
  held: string | null = null;
  parcel: 'C-7' = 'C-7';
  parcelAt: ParcelAt = 'C-7';
  slideStart = 0;
  gateAllowed = false;
  gateOpenUntil = 0;
  pan = 0;
  links: Link[] = [];
  /** Cables currently carrying a signal, for the glow. */
  live = new Set<Link>();
  goals = new Set<Goal>();
  devices = new Map<string, Device>();
  private made = 0;

  constructor(private hooks: YardHooks) {
    const add = (d: Device) => this.devices.set(d.id, d);
    add({
      id: 'cam', name: 'CAM-1', look: 'A camera on a pole. It has seen things. Mostly crates.',
      status: () => (this.found ? 'tagged: ' + this.parcel : 'watching the yard'),
      nouns: [
        { id: 'lens', kind: 'SENSE', verbs: ['view'], run: () => { this.hooks.openCamera(); return ['cat lens', 'feed open.']; } },
        { id: 'motor', kind: 'ACT', verbs: ['left', 'centre', 'right'], current: () => ['left', 'centre', 'right'][this.pan + 1],
          run: (v) => { this.pan = v === 'left' ? -1 : v === 'right' ? 1 : 0; return ['use motor --' + v, 'motor whirrs. pointed ' + v + '.']; } },
        { id: 'footage', kind: 'STORE', verbs: ['read', 'copy'],
          run: (v) => v === 'read' ? ['cat footage', 'three hours of crates. one is addressed to someone you know.'] : ['cp footage ~/deck', 'copied. riveting.'] },
      ],
    });
    add({
      id: 'crane', name: 'CRANE', look: 'A yard crane. Does exactly what it is told, in order, with a sigh.',
      status: () => 'arm: ' + this.armAt + (this.held ? ' · holding ' + this.held : ''),
      nouns: [
        { id: 'arm', kind: 'ACT', verbs: ['A-3', 'B-5', 'C-7', 'chute'], current: () => this.armAt,
          run: (v) => { this.armAt = v; if (this.held) this.parcelAt = 'hook'; return ['use arm --' + v, 'arm swings to ' + v + '.']; } },
        { id: 'claw', kind: 'ACT', verbs: ['grab', 'drop'], events: ['dropped'], run: (v) => this.claw(v) },
        { id: 'job.log', kind: 'STORE', verbs: ['read'], run: () => ['cat job.log', 'job.log: "parcel for you, slot ?-? (smudged by a thumb)."'] },
      ],
    });
    add({
      id: 'gate', name: 'HATCH · HINGE', look: 'A hatch in the fence, with a face. It is judging you.',
      status: () => (this.gateOpen() ? 'OPEN' : 'closed') + (this.gateAllowed ? ' · takes signals' : ' · ignores signals'),
      nouns: [
        { id: 'lock', kind: 'ACT', verbs: ['open'], run: (_v, sig) => this.lock(sig) },
        { id: 'log', kind: 'STORE', verbs: ['read'], run: () => ['cat log', 'log: opened 0 times today. proud of it.'] },
        { id: 'hinge', kind: 'DAEMON', verbs: ['talk'], run: () => { this.hooks.openTalk(); return null; } },
      ],
    });
    add({
      id: 'bench', name: 'WORKBENCH', look: 'A workbench. Two sockets, one press, many burn marks.',
      status: () => (this.made ? 'crafted: ' + this.made : 'two sockets, one press'),
      nouns: [
        { id: 'blueprints', kind: 'STORE', verbs: ['read'], run: () => ['cat blueprints', 'blueprints: "a relay passes a signal on. a timer waits. some parts like each other."'] },
        { id: 'press', kind: 'ACT', verbs: ['craft'], run: () => { this.hooks.openBench(); return ['use press', 'two sockets. what goes in?']; } },
      ],
    });
  }

  gateOpen() { return performance.now() < this.gateOpenUntil; }
  noun(key: string) { const [d, n] = key.split('.'); return this.devices.get(d)?.nouns.find((x) => x.id === n); }

  // ---------- doing things ----------

  act(dev: string, noun: string, verb: string, bySignal = false) {
    const line = this.noun(dev + '.' + noun)?.run(verb, bySignal);
    if (line) this.hooks.say(line);
    this.hooks.changed();
  }

  private claw(v: string): Line {
    if (v === 'grab') {
      if (this.held) return ['use claw --grab', 'already holding ' + this.held + '.'];
      if (this.armAt === 'home' || this.armAt === 'chute') return ['use claw --grab', 'the claw grabs air.'];
      if (this.armAt !== this.parcelAt) return ['use claw --grab', this.armAt === 'A-3' ? 'a crate of raisins. the claw puts it back, disappointed.' : 'a crate marked "not yours. really." the claw respects that.'];
      this.held = 'parcel'; this.parcelAt = 'hook';
      return ['use claw --grab', 'got it. a parcel, slightly squashed.', 'ok'];
    }
    if (!this.held) return ['use claw --drop', 'the claw drops nothing, with conviction.'];
    this.held = null;
    if (this.armAt !== 'chute') { this.parcelAt = this.armAt as ParcelAt; return ['use claw --drop', 'dropped at ' + this.armAt + '. thud.']; }
    this.dropIntoChute();
    return ['use claw --drop', 'into the chute. the claw says: dropped.'];
  }

  private lock(bySignal: boolean): Line {
    if (!bySignal) return ['use lock --open', 'HINGE: "hands off the lock. ask me like a person."', 'err'];
    if (!this.gateAllowed) return ['signal → lock --open', 'HINGE ignores the signal. it wants to be asked first.', 'err'];
    this.gateOpenUntil = performance.now() + GATE_OPEN_MS;
    setTimeout(() => this.hooks.changed(), GATE_OPEN_MS + 50);
    return ['signal → lock --open', 'HINGE: "opening. one second. I am busy."'];
  }

  allowSignals() { this.gateAllowed = true; this.hooks.goal('talk'); this.hooks.changed(); }
  markFound() { if (!this.found) { this.found = true; this.hooks.goal('find'); this.hooks.changed(); } }

  // ---------- events and cables ----------

  emit(key: string) {
    const out = this.links.filter((l) => l.from === key);
    out.forEach((l) => this.live.add(l));
    this.hooks.changed();
    setTimeout(() => { out.forEach((l) => this.live.delete(l)); this.hooks.changed(); }, 500);
    out.forEach((l) => setTimeout(() => { const [d, n] = l.to.split('.'); this.act(d, n, l.verb, true); }, 150));
  }

  connect(from: string, to: string, verb: string): Line {
    this.links = this.links.filter((l) => !(l.from === from && l.to === to));
    this.links.push({ from, to, verb });
    this.hooks.changed();
    const ev = from.split('.')[1].replace(':', ' ');
    return ['on ' + from + ' do ' + to + ' ' + verb.replace(/\s/g, ''), 'wired: when ' + ev + ', ' + to.split('.')[1] + ' will ' + verb + '.', 'ok'];
  }

  cut(link: Link): Line {
    this.links = this.links.filter((l) => l !== link);
    this.hooks.changed();
    return ['unwire ' + link.from + ' ' + link.to, 'cable cut. snip.', 'dim'];
  }

  // ---------- the parcel ----------

  private dropIntoChute() {
    this.parcelAt = 'chute'; this.hooks.goal('chute');
    setTimeout(() => { this.parcelAt = 'sliding'; this.slideStart = performance.now(); this.hooks.changed(); setTimeout(() => this.arrive(), SLIDE_MS); }, 400);
    this.emit('crane.claw:dropped');
  }

  private arrive() {
    if (this.gateOpen()) {
      this.parcelAt = 'tray'; this.hooks.goal('gate');
      this.hooks.say(['', 'the parcel slides through the hatch and into the pickup tray.', 'ok']);
    } else {
      this.parcelAt = 'bounced';
      this.hooks.say(['', 'bonk. the parcel hits a closed hatch. the crane fishes it back, sighing.', 'err']);
      setTimeout(() => { this.parcelAt = 'hook'; this.held = 'parcel'; this.armAt = 'chute'; this.hooks.changed(); }, 700);
    }
    this.hooks.changed();
  }

  take(): Line | null {
    if (this.parcelAt !== 'tray') return null;
    this.parcelAt = 'taken'; this.hooks.goal('take'); this.hooks.changed();
    return ['take parcel', 'a parcel, slightly squashed. inside: a note. "nice wiring. —the fixer"', 'ok'];
  }

  // ---------- crafting ----------

  craft(a: string, b: string): Line {
    const key = [a, b].sort().join('+');
    const kind = ({ 'relay+timer': 'DELAY', 'lamp+relay': 'BLINKER', 'speaker+timer': 'ALARM', 'lamp+timer': 'NIGHTLIGHT', 'relay+speaker': 'DOORBELL', 'lamp+speaker': 'DISCO' } as Record<string, string>)[key];
    this.made++;
    const id = kind.toLowerCase() + this.made;
    if (kind === 'DELAY') {
      this.devices.set(id, {
        id, name: 'DELAY', crafted: true, look: 'Your own box. A timer and a relay, taped together with confidence.',
        status: () => 'a timer that says done',
        nouns: [
          { id: 'timer', kind: 'ACT', verbs: ['wait 1 s', 'wait 2 s', 'wait 3 s'], events: ['done'], run: (v, sig) => {
            const sec = parseInt(v.split(' ')[1], 10);
            setTimeout(() => this.emit(id + '.timer:done'), sec * 1000);
            return [(sig ? 'signal → ' : '') + 'use timer --wait ' + sec + 's', 'timer: waiting ' + sec + ' s…', 'dim'];
          } },
          { id: 'spec', kind: 'STORE', verbs: ['read'], run: () => ['cat spec', 'spec: "told to wait, it waits. then it says done. that is the whole personality."'] },
        ],
      });
      this.hooks.changed();
      return ['craft relay timer', 'crafted: DELAY. its timer waits, then says done.', 'ok'];
    }
    const verb = ({ BLINKER: 'blink', ALARM: 'beep', NIGHTLIGHT: 'glow', DOORBELL: 'ring', DISCO: 'party' } as Record<string, string>)[kind];
    const quip = ({ BLINKER: 'it blinks. purely decorative.', ALARM: 'it beeps. you are now punctual.', NIGHTLIGHT: 'it glows softly. the yard feels safer. it is not.', DOORBELL: 'it rings. HINGE finds this tacky.', DISCO: 'it is a disco. nobody asked.' } as Record<string, string>)[kind];
    this.devices.set(id, {
      id, name: kind, crafted: true, look: 'Something you made. Mostly for fun.', status: () => 'crafted toy',
      nouns: [{ id: 'body', kind: 'ACT', verbs: [verb], run: () => ['use body --' + verb, quip] }],
    });
    this.hooks.changed();
    return ['craft ' + key.replace('+', ' '), 'crafted: ' + kind + '. ' + quip];
  }
}
