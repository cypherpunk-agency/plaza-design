/**
 * Downtown, the first level of ACCESS DENIED: its layout, people, the fixer
 * and his hints, the save, and the deck's terminal. The game engine (game.ts)
 * draws and moves things. Downtown's machines are a scene on the hacking system
 * now (downtown/, data/downtown.json); the terminal stays as the last resort,
 * and its machine commands (ls, cat, login, install) go to that scene (`Shell`).
 *
 * Rule of the game: hints, never answers.
 */

import { fixClock, newClock, type ClockSave } from './clock';
import { contactsOf, messagesOf, readFlag } from './contacts';
import { START_MODULES } from './data';
import type { SceneSave } from './data/types';
import { SPR, type Sprite } from './sprites';

// ---------- save state ----------

export interface Save {
  /** Last scene for Continue; absent in older v3 saves. Validated against SCENES on resume. */
  scene?: string;
  handle: string;
  tokens: number;
  /** legs.so: installed from the junction box. Stays its own flag (older saves have it). */
  jump: boolean;
  /** Logic modules owned, shared by every scene: `timer.so`, `switch.so`. Not legs.so (that is `jump`). */
  modules: string[];
  /** Registry nodes you have taken control of, by label (`0x2F`): access points onto their networks (NET.md). */
  controlled: string[];
  /** Programs you own (NET.md): `scan.so` from the library. uplink.so stays a keyring chip. */
  programs: string[];
  /** Networks you have found (net.json ids): the net map draws them. */
  nets: string[];
  flags: Record<string, boolean>;
  hints: Record<string, number>;
  /** The keyring: clue fragments and key chips (ids in the game data's `keyring`), carried across scenes. */
  keyring: string[];
  /** Each scene's own progress, by scene id: `scenes.yard`. Downtown keeps using the fields above. */
  scenes: Record<string, SceneSave | undefined>;
  /** What the player carries (bought, given), item id → how many: `{ fish: 2, tea: 1 }`. Scene uses read it through `UseCtx`. */
  items: Record<string, number>;
  /** Time played in ms (the pause menu's save slots show it). Older saves: missing, counts from 0. */
  playMs?: number;
  /** The city clock (clock.ts): day, minute of the day, the weather's seed. Older saves: day 1, 09:40, seed 1. */
  clock: ClockSave;
}

/** Isolated milestone-2 prototype; its saves and slots never touch the campaign. */
export const SHIFT_PROTOTYPE = (() => { try { return new URLSearchParams(location.search).get('play') === 'harborShift'; } catch { return false; } })();

/** `?sudo` in the URL: everything unlocked, a LEVELS menu, and its own save (sudo.ts). */
export const SUDO = (() => { try { return new URLSearchParams(location.search).has('sudo'); } catch { return false; } })();

/**
 * v3: the net (NET.md): `controlled` nodes (was `freed`), `programs`, `nets`. Saves from before
 * (v2, v1) are not read: everyone starts fresh (Tommi: no migration).
 */
export const SAVE_KEY = SHIFT_PROTOTYPE ? 'access-denied-harbor-shift-v1' : SUDO ? 'access-denied-save-sudo-v3' : 'access-denied-save-v3';

/** A fresh player save; the title/glide hands it to the train-home opening. */

export function newSave(): Save {
  return { handle: '', tokens: 0, jump: false, modules: [...START_MODULES], keyring: [], items: {}, controlled: [], programs: [], nets: [], flags: {}, hints: {}, scenes: {}, clock: newClock() };
}

/** A stored save, with anything missing filled in from a new game. */
export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s: Save = { ...newSave(), ...JSON.parse(raw) };
      if (!Array.isArray(s.modules)) s.modules = [...START_MODULES];
      if (!s.scenes || typeof s.scenes !== 'object') s.scenes = {};
      if (!Array.isArray(s.keyring)) s.keyring = [];
      for (const k of ['controlled', 'programs', 'nets'] as const) if (!Array.isArray(s[k])) s[k] = [];
      if (!s.items || typeof s.items !== 'object' || Array.isArray(s.items)) s.items = {};
      s.items = Object.fromEntries(Object.entries(s.items).filter(([, n]) => Number.isInteger(n) && n > 0));
      // a save from before the city clock (TIME.md): day 1, 09:40
      s.clock = fixClock(JSON.parse(raw).clock);
      return s;
    }
  } catch { /* private window or blocked storage: start fresh */ }
  return newSave();
}

/** Every module the player owns, legs.so first. */
export const ownedModules = (s: Save) => [...(s.jump ? ['legs.so'] : []), ...s.modules];

export function storeSave(s: Save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* not persisted */ }
}

export const BASE_NODES = 42;
export const nodeCount = (s: Save) => BASE_NODES + s.controlled.length;
export const who = (s: Save) => s.handle || 'ghost';

export type Objective = 'handle' | 'till' | 'box' | 'install' | 'relay' | 'gate' | 'done';

/** Downtown's next step (the scene's goals, downtown/save.ts `reached`, follow the same fields). */
export function objective(s: Save): Objective {
  if (!s.handle) return 'handle';
  if (!s.flags.till) return 'till';
  if (!s.controlled.includes('0x2F')) return 'box';
  if (!s.jump) return 'install';
  if (!s.controlled.includes('0x31')) return 'relay';
  if (!s.flags.end) return 'gate';
  return 'done';
}

// ---------- layout (world units; heights measured up from the street) ----------

export const LEVEL_W = 2000;
export const SPAWN_X = 720;

/** A ground-floor opening on a front: offset from the front's left edge, width, and what it is. */
export type Bay = [dx: number, w: number, kind: 'door' | 'glass' | 'shutter' | 'sealed'];

export interface Front { x: number; w: number; h: number; roof?: boolean; bays?: Bay[] }

/**
 * Building fronts along the street, left to right: the walls of a downtown
 * street, far taller than the player. A 76-unit ground floor (doors, shopfronts,
 * shutters at the player's scale) and 66-unit storeys above, so heights are
 * 208, 274, 340 or 406; most leave the top of the view. `roof` marks the
 * one-storey annex you can climb onto. Small houses only live in the skyline.
 */
export const FRONTS: Front[] = [
  { x: 0, w: 150, h: 340, bays: [[116, 24, 'door']] }, // the Neon Market gate is its ground floor
  { x: 150, w: 120, h: 208, bays: [[10, 56, 'glass'], [80, 24, 'door']] },
  { x: 270, w: 150, h: 406, bays: [[6, 34, 'shutter'], [112, 24, 'door']] }, // junction box between the two
  { x: 420, w: 130, h: 208, bays: [[14, 24, 'door'], [50, 64, 'glass']] },
  { x: 550, w: 170, h: 274, bays: [[8, 54, 'glass'], [70, 26, 'door'], [104, 58, 'glass']] },
  { x: 720, w: 140, h: 340 }, // behind the noodle stall
  { x: 860, w: 90, h: 340, bays: [[24, 50, 'glass']] },
  // 950–1040: the alley to the fixer's back yard, lit from the yard behind it (drawn by the engine);
  // the dumpster stands in its mouth, under the annex's low roof
  { x: 1040, w: 160, h: 62, roof: true, bays: [[16, 52, 'shutter'], [124, 24, 'door']] },
  { x: 1200, w: 60, h: 406, bays: [[18, 24, 'door']] },
  { x: 1260, w: 160, h: 274, bays: [[10, 46, 'glass'], [68, 24, 'sealed'], [104, 46, 'glass']] }, // the penthouse tower
  { x: 1420, w: 100, h: 208, bays: [[10, 44, 'shutter'], [64, 24, 'door']] },
  { x: 1680, w: 160, h: 340, bays: [[8, 64, 'glass']] }, // the identity scan is its entrance
  { x: 1840, w: 160, h: 208, bays: [[104, 44, 'shutter']] }, // past the SPACEPORT sign: the sky-taxi stand in front of it
];

/** Surfaces the player can land on (besides the street). */
export const PLATFORMS: { x: number; w: number; h: number }[] = [
  { x: 1000, w: 40, h: 22 }, // dumpster
  { x: 1040, w: 160, h: 62 }, // low roof
];

export interface Npc { id: string; sprite: Sprite; x: number; flip: boolean }
export const NPCS: Npc[] = [
  { id: 'hood', sprite: SPR.hood, x: 440, flip: true },
  { id: 'umbrella', sprite: SPR.umbrella, x: 600, flip: false },
  // clear of the alley's mouth (950–1040) and of DLV-9 by the dumpster
  { id: 'hat', sprite: SPR.hat, x: 1112, flip: true },
];

export const STALL = { x: 740, w: 140, fixerX: 810 };

// The machines (gate, junction box, VERIFY sign, till, relay, CAM-3, billboard, DLV-9, fence,
// identity scan) are devices in data/downtown.json: where they stand is their `layout.spot`.

export interface Readable { id: string; x: number; h: number; pages: string[] }
export const READABLES: Readable[] = [
  { id: 'plaque', x: 1340, h: 0, pages: ['PENTHOUSE · BY INVITATION', 'The door has no handle. Only a window, very high up.'] },
];

// ---------- people ----------

const NPC_LINES: Record<string, [string[], string[]]> = {
  hood: [['Not authenticated. Not my problem.'], ['A box on this street went dark.', 'Registry is sending a van. Wasn\'t you, right?']],
  umbrella: [['I don\'t see you. That\'s the deal.', 'Unless you\'re selling Registry Premium. Terms: forever. Cancellation: see Terms. I read them twice.'], ['Still nobody. A louder nobody, though.']],
  hat: [['Keep walking, ghost.'], ['Heard the noodle guy talks to ghosts now.', 'Bad for business. His, not mine.']],
};

export function npcTalk(id: string, s: Save): string[] {
  if (id === 'hood' && s.controlled.includes('0x3C')) return ['Billboard\'s showing a pigeon.', 'Best thing it ever ran.'];
  const [before, after] = NPC_LINES[id] ?? [['...'], ['...']];
  return s.controlled.length ? after : before;
}

const HINTS: Record<Objective, string[]> = {
  handle: [],
  till: [],
  box: ['Signs on this street never fully light. Read what the one above the box really says.', 'The box only takes maintenance logins. It says so itself, if you ask it to list its files.'],
  install: ['Found something on that box? Modules don\'t install themselves.', 'Go back to the box. What does it list now that it trusts you?'],
  relay: ['Admins write everything down. Read their notes.', 'Rotation policies are lazy. Same password, different direction.'],
  gate: [
    'The gate wants a scanner signature. Nobody on this street has one. Nobody human.',
    'Robots get their routes from DISPATCH. DISPATCH hides behind shields. Shields come down outside in.',
    'That gate shuts behind everything that goes through. Something tells it to. Read its wiring.',
  ],
  done: [],
};

/** `ask`: after the last page, the deck opens with this already typed (the keyboard is right here). */
export interface Talk { pages: string[]; spend?: boolean; ask?: string }

/** What talking to the fixer costs now: 1 when the next thing he says is a hint for a bowl, else 0 (the prompt shows it). */
export function fixerPrice(s: Save): number {
  if (!s.flags.metFixer || !s.flags.greeted) return 0;
  const goal = objective(s);
  if (goal === 'handle' || goal === 'till') return 0;
  if (s.keyring.includes('glove.left') && s.keyring.includes('glove.right') && !s.flags.gloves) return 0;
  return (s.hints[goal] ?? 0) < HINTS[goal].length ? 1 : 0;
}

/** What the fixer says. Hints cost one noodle token and never give the answer. */
export function fixerTalk(s: Save): Talk {
  const name = who(s);
  if (!s.flags.metFixer) {
    s.flags.metFixer = true;
    return { pages: ['Another ghost. Sit.', 'Noodles are free for the dead.', 'Registry pulled your key? Then nobody on this street sees you.', 'Got a name, ghost? Your deck has a keyboard. Type it.'], ask: 'set handle ' };
  }
  const goal = objective(s);
  if (goal === 'handle') return { pages: ['Name first. Your deck, the keyboard: set handle, then the name.'], ask: 'set handle ' };
  if (!s.flags.greeted) {
    s.flags.greeted = true;
    return { pages: [name + '. Fine name for a nobody.', 'House rule: hints cost a bowl. Answers aren\'t on the menu.', 'You\'re broke, though. And my till still runs on factory settings. Don\'t tell anyone.'] };
  }
  if (goal === 'till') return { pages: ['The till is right there. Factory settings. Every manual prints them.'] };
  // P13's payoff: DLV-9's left glove (P12) and the right one from Moth's jacket (washer 3), once
  if (s.keyring.includes('glove.left') && s.keyring.includes('glove.right') && !s.flags.gloves) {
    s.flags.gloves = true;
    return { pages: ['Two gloves. Left and right. Let me see.', "Moth's gloves. Moth loses one of everything.", 'Keys, gloves, sleep, flats. Never a friend, though. Eat something.'] };
  }

  const used = s.hints[goal] ?? 0, hints = HINTS[goal];
  const remark: Record<Objective, string> = {
    handle: '', till: '',
    box: 'That junction box under the VERIFY sign belongs to the Registry. Older than you.',
    install: 'The box went dark. Half the street noticed. Use what you took.',
    relay: 'Legs. Good. Rooftops are where the Registry forgot to look.',
    gate: 'The Market is west. Their gate wants a scanner signature. That\'s tomorrow\'s problem.',
    done: 'A delivery robot. Of course. Nobody checks the help.',
  };
  if (used >= hints.length) return { pages: [remark[goal], 'That\'s all I know. The rest is yours.'] };
  if (s.tokens <= 0) return { pages: [remark[goal], 'No tokens, no hints. Noodles aren\'t free twice.'] };
  s.tokens -= 1;
  s.hints[goal] = used + 1;
  return { pages: [remark[goal], 'One bowl. Here:', hints[used]], spend: true };
}

// ---------- terminal ----------

/**
 * A scene's machines as the terminal sees them (downtown/shell.ts `sceneShell`):
 * the old commands, now doing what a tap on the schematic would.
 */
export interface Shell {
  ls(dev: string): string;
  readable(dev: string): string[];
  installable(dev: string): string[];
  hasGuard(dev: string): boolean;
  cat(dev: string, file: string): void;
  login(dev: string, user: string, pass: string): void;
  install(dev: string, name: string): void;
  /** Any other line, as a verb on a noun of the machine (`use drawer --open`). False when it means nothing. */
  use(dev: string | null, line: string): boolean;
}

export interface Ctx {
  save: Save;
  /** The machine the deck talks to: the one whose schematic is open, else the one you stand at. Null: your own deck. */
  machine: string | null;
  /** The scene's machines, when you are in one. */
  shell: Shell | null;
  print: (text: string, kind?: 'out' | 'ok' | 'err' | 'dim' | 'head') => void;
  denied: () => void;
  granted: () => void;
  toggleSound: () => boolean;
  clear: () => void;
  leaveMachine: () => void;
  persist: () => void;
  /** Start the back yard over (its part of the save only). */
  resetYard: () => void;
  /** Sudo: start the sandbox (QA bay 3) over (its part of the save only). */
  resetSandbox?: () => void;
  /** Your own deck while you still exist (the opening, opening.ts): its files and what `whoami` says. */
  deck?: { files: Record<string, string>; whoami: string };
  /** The Registry's weather report for where you are (weather.ts `reportLines`). */
  weather?: () => string[];
  /**
   * The net from where you stand (NET.md), once hacking is yours: `scan` (needs scan.so), `connect
   * <machine>` (scan.so, or a machine a port here knows); `names`: machines worth suggesting.
   */
  net?: { scan: () => void; connect: (name: string) => void; names: () => string[] };
}

const MAN: Record<string, string> = {
  help: 'help: lists what you can type right now.',
  ls: 'ls: lists the nouns of the machine you stand at (or your own deck). Sealed ones show as ???.',
  cat: 'cat <noun>: reads it.',
  login: 'login <user> <password>: asks the machine to trust you. Dragging a clue onto its login does the same.',
  install: 'install <module>: adds a module you found to your deck.',
  use: 'use <noun> --<verb>: any verb on the machine, as the schematic prints it. "<verb> <noun>" works too.',
  whoami: 'whoami: who the city thinks you are.',
  set: 'set handle <name>: picks your name. 2 to 16 letters, digits, _ or -.',
  nodes: 'nodes: how many nodes run outside the Registry, and which of them answer to you.',
  scan: 'scan: lists the machines you reach from where you are plugged in. needs scan.so.',
  connect: 'connect <machine>: brings a machine you reach onto your board. the deck talks to it after.',
  map: 'map: what you know of Downtown.',
  sound: 'sound: chiptune on or off. M does the same.',
  exit: 'exit: closes the terminal.',
  clear: 'clear: wipes the screen.',
  reset: 'reset --yes: wipes your progress and starts over. reset yard: only the back yard.',
  contacts: 'contacts: who is on your deck, and whether they have signal.',
  weather: 'weather: the Registry\'s forecast for where you are and the rest of the city, the next 12 hours.',
  msg: 'msg <contact>: reads what they sent you.',
};

/** Your own deck's files, when the terminal talks to no machine. */
const DECK: Record<string, string> = { 'inbox.txt': 'From: the Registry\nSubject: your identity\nStatus: REVOKED\nEffective: immediately\nAppeal: not available.' };

export function commands(c: Ctx): string[] {
  const base = ['help', 'man', 'ls', 'cat', 'whoami', 'set', 'nodes', 'map', 'weather', 'sound', 'clear', 'exit', 'reset'];
  // contacts on your deck (contacts.ts): Moth, after Act I
  if (contactsOf(c.save.flags).length) base.push('contacts', 'msg');
  // the net (NET.md): scan and connect, from where you are plugged in
  if (c.net) base.push('scan', 'connect');
  if (c.machine && c.shell) {
    base.push('use');
    if (c.shell.hasGuard(c.machine)) base.push('login');
    if (c.shell.installable(c.machine).length && !c.save.jump) base.push('install');
  }
  return base;
}

/** Commands that need nothing after them: on the touch deck, one tap runs them. */
export const NO_ARGS = ['help', 'ls', 'whoami', 'nodes', 'map', 'weather', 'sound', 'clear', 'exit', 'contacts', 'scan'];

/** What the deck can read right now: the machine's readable nouns, or your own files. */
const readable = (c: Ctx) => (c.machine && c.shell ? c.shell.readable(c.machine) : Object.keys(c.deck?.files ?? DECK));

/**
 * What the touch deck offers as the next word of `line`. Only what you could
 * already know: commands you have, nouns the machine shows, modules you found.
 * Users and passwords are never suggested, and neither are the hidden commands.
 */
export function suggest(c: Ctx, line: string): string[] {
  const parts = line.trim() ? line.trim().split(/\s+/) : [];
  const fresh = !line.trim() || /\s$/.test(line);
  if (!parts.length) return commands(c);
  const cmd = parts[0].toLowerCase();
  if (parts.length === 1 && !fresh) return commands(c).filter((x) => x.startsWith(cmd) && x !== cmd);
  const arg = fresh ? parts.length - 1 : parts.length - 2;
  const partial = fresh ? '' : parts[parts.length - 1].toLowerCase();
  const pick = (list: string[]) => list.filter((x) => x.toLowerCase().startsWith(partial) && x.toLowerCase() !== partial);
  if (arg !== 0) return [];
  switch (cmd) {
    case 'cat': return pick(readable(c));
    case 'install': return pick(c.machine && c.shell ? c.shell.installable(c.machine) : []);
    case 'man': return pick(commands(c));
    case 'set': return pick(['handle']);
    case 'reset': return pick(['--yes', 'yard']);
    case 'msg': return pick(contactsOf(c.save.flags).map((k) => k.id));
    case 'connect': return pick(c.net?.names() ?? []);
    default: return [];
  }
}

function map(c: Ctx): string {
  const s = c.save, done = (b: boolean) => (b ? '  ' : '??');
  return [
    'DOWNTOWN',
    ' west                                                   east',
    ' [MARKET GATE] ' + (s.flags.end ? 'open   ' : s.controlled.includes('0x31') ? 'scanner' : '???????') + ' · [BOX 0x2F] ' + done(s.controlled.includes('0x2F')) + ' · [STALL] · [ROOF 0x31] ' + done(s.controlled.includes('0x31')) + ' · [ANTENNA] root · [SCAN] 0/3',
  ].join('\n');
}

export function run(c: Ctx, line: string) {
  const s = c.save;
  const [cmd, ...args] = line.split(/\s+/);
  const verb = cmd.toLowerCase();
  const at = c.machine && c.shell ? { dev: c.machine, sh: c.shell } : null;
  switch (verb) {
    case 'help': {
      c.print('you can type: ' + commands(c).join(', '), 'dim');
      if (!c.machine) c.print('stand at a machine and the deck talks to it. E or a tap opens its schematic.', 'dim');
      return;
    }
    case 'man': c.print(MAN[(args[0] || '').toLowerCase()] ?? 'man <command>: explains a command. Try: man login', 'dim'); return;
    case 'ls': c.print(at ? at.sh.ls(at.dev) : Object.keys(c.deck?.files ?? DECK).join('   ')); return;
    case 'cat': {
      if (at) { at.sh.cat(at.dev, args[0] || ''); return; }
      const files = c.deck?.files ?? DECK, name = Object.keys(files).find((k) => k.toLowerCase() === (args[0] || '').toLowerCase());
      c.print(name ? files[name] : 'cat: ' + (args[0] || '<file>') + ': no such file', name ? 'out' : 'err');
      return;
    }
    case 'whoami': {
      if (c.deck) { c.print(c.deck.whoami); return; }
      const mods = ownedModules(s).join(', ') || 'none';
      c.print(who(s) + ' (unauthenticated) · tokens: ' + s.tokens + ' · modules: ' + mods);
      return;
    }
    case 'set': {
      if ((args[0] || '').toLowerCase() !== 'handle' || !args[1]) { c.print('usage: set handle <name>', 'dim'); return; }
      const name = args[1];
      if (!/^[A-Za-z0-9_-]{2,16}$/.test(name)) { c.print('a handle is 2 to 16 letters, digits, _ or -', 'err'); return; }
      const first = !s.handle;
      s.handle = name; c.persist();
      c.print('handle set: ' + name + (first ? '. Go tell the fixer.' : '.'), 'ok');
      return;
    }
    case 'nodes': c.print('NODES: ' + nodeCount(s) + ' ACTIVE · yours: ' + (s.controlled.join(', ') || 'none yet')); return;
    case 'map': c.print(map(c)); return;
    case 'weather': {
      const lines = c.weather?.() ?? [];
      if (!lines.length) { c.print('weather: no signal from the Registry weather service.', 'dim'); return; }
      c.print(lines[0], 'head');
      lines.slice(1, -1).forEach((l) => c.print(l));
      c.print(lines[lines.length - 1], 'dim');
      return;
    }
    case 'sound': c.print('sound ' + (c.toggleSound() ? 'on' : 'off') + '.', 'dim'); return;
    case 'clear': c.clear(); return;
    case 'exit': case 'logout': c.leaveMachine(); return;
    case 'reset':
      if (args[0] === '--yes') { localStorage.removeItem(SAVE_KEY); location.reload(); return; }
      if ((args[0] || '').toLowerCase() === 'yard') {
        if (args[1] === '--yes') { c.resetYard(); c.print('back yard reset: cables, parts, the parcel, HINGE\'s mood. Everything else is kept.', 'ok'); return; }
        c.print('this resets the back yard only (cables, parts, the parcel, its goals). Type: reset yard --yes', 'err'); return;
      }
      if ((args[0] || '').toLowerCase() === 'sandbox' && c.resetSandbox) {
        if (args[1] === '--yes') { c.resetSandbox(); c.print('sandbox reset: QA bay 3 as on the first visit. Everything else is kept.', 'ok'); return; }
        c.print('this resets the sandbox only (QA bay 3: devices, cables, parts, trace). Type: reset sandbox --yes', 'err'); return;
      }
      c.print('this wipes your progress. Type: reset --yes', 'err'); return;
    case 'login':
      if (!at) { c.print('login: you are not at a machine. Walk up to one first.', 'err'); return; }
      at.sh.login(at.dev, args[0] || '', args.slice(1).join(' '));
      return;
    case 'install':
      if (!at) { c.print('install: no such module here.', 'err'); return; }
      at.sh.install(at.dev, args[0] || '');
      return;
    case 'scan':
      if (!c.net) { c.print('scan: command not found.', 'dim'); return; }
      c.net.scan();
      return;
    case 'connect':
      if (!c.net) { c.print('connect: command not found.', 'dim'); return; }
      if (!args[0]) { c.print('usage: connect <machine>. scan first to see what is in reach.', 'dim'); return; }
      c.net.connect(args.join(' '));
      return;
    case 'contacts': {
      const list = contactsOf(s.flags);
      if (!list.length) { c.print('contacts: nobody. it is that kind of week.', 'dim'); return; }
      list.forEach((k) => c.print(k.name + ' · ' + (k.dark && s.flags[k.dark] ? 'no signal' : k.status) + ' · msg ' + k.id));
      return;
    }
    case 'msg': {
      const k = contactsOf(s.flags).find((x) => x.id === (args[0] || '').toLowerCase());
      if (!k) { c.print('usage: msg <contact>. type contacts to see who.', 'dim'); return; }
      const msgs = messagesOf(k, s.flags);
      if (!msgs.length) { c.print(k.name + ': no messages. ' + (k.dark && s.flags[k.dark] ? 'no signal.' : ''), 'dim'); return; }
      msgs.forEach((m) => { m.text.forEach((l) => c.print(l)); s.flags[readFlag(m)] = true; });
      c.persist();
      return;
    }
    case 'sudo': c.denied(); c.print(who(s) + ' is not in the sudoers file. This incident will be reported.', 'err'); return;
    case 'rm': c.print('rm: permission denied.', 'err'); return;
    case 'enter': c.denied(); c.print('enter: ACCESS DENIED. identity: not found.', 'err'); return;
    case 'hack': c.print('hack: command not found.', 'dim'); return;
    default:
      if (c.shell?.use(c.machine, line)) return;
      c.print(verb + ': unknown command. Type help.', 'err');
  }
}
