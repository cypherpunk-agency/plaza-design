/**
 * Downtown, the first level of ACCESS DENIED: its layout, people, the fixer
 * and his hints, the save, and the deck's terminal. The game engine (game.ts)
 * draws and moves things. Downtown's machines are a scene on the hacking system
 * now (downtown/, data/downtown.json); the terminal stays as the last resort,
 * and its machine commands (ls, cat, login, install) go to that scene (`Shell`).
 *
 * Rule of the game: hints, never answers.
 */

import { START_MODULES } from './data';
import type { SceneSave } from './data/types';
import { SPR, type Sprite } from './sprites';

// ---------- save state ----------

export interface Save {
  handle: string;
  tokens: number;
  /** legs.so: installed from the junction box. Stays its own flag (older saves have it). */
  jump: boolean;
  /** Logic modules owned, shared by every scene: `timer.so`, `switch.so`. Not legs.so (that is `jump`). */
  modules: string[];
  freed: string[];
  flags: Record<string, boolean>;
  hints: Record<string, number>;
  /** The keyring: clue fragments and key chips (ids in the game data's `keyring`), carried across scenes. */
  keyring: string[];
  /** Each scene's own progress, by scene id: `scenes.yard`. Downtown keeps using the fields above. */
  scenes: Record<string, SceneSave | undefined>;
  /** Time played in ms (the pause menu's save slots show it). Older saves: missing, counts from 0. */
  playMs?: number;
}

/** `?sudo` in the URL: everything unlocked, a LEVELS menu, and its own save (sudo.ts). */
export const SUDO = (() => { try { return new URLSearchParams(location.search).has('sudo'); } catch { return false; } })();

/** v2: one kind of place (scenes, `scenes.<id>`); saves from before (v1, with `zones`) are not read, everyone starts fresh. */
export const SAVE_KEY = SUDO ? 'access-denied-save-sudo-v2' : 'access-denied-save-v2';

/** Where a new game starts, after the intro cutscene (NEW GAME in the pause menu). A `capsule` scene replaces it later. */

export function newSave(): Save {
  return { handle: '', tokens: 0, jump: false, modules: [...START_MODULES], keyring: [], freed: [], flags: {}, hints: {}, scenes: {} };
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
export const nodeCount = (s: Save) => BASE_NODES + s.freed.length;
export const who = (s: Save) => s.handle || 'ghost';

export type Objective = 'handle' | 'till' | 'box' | 'install' | 'relay' | 'gate' | 'done';

/** Downtown's next step (the scene's goals, downtown/save.ts `reached`, follow the same fields). */
export function objective(s: Save): Objective {
  if (!s.handle) return 'handle';
  if (!s.flags.till) return 'till';
  if (!s.freed.includes('0x2F')) return 'box';
  if (!s.jump) return 'install';
  if (!s.freed.includes('0x31')) return 'relay';
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
  if (id === 'hood' && s.freed.includes('0x3C')) return ['Billboard\'s showing a pigeon.', 'Best thing it ever ran.'];
  const [before, after] = NPC_LINES[id] ?? [['...'], ['...']];
  return s.freed.length ? after : before;
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
  nodes: 'nodes: how many nodes run free of the Registry.',
  map: 'map: what you know of Downtown.',
  sound: 'sound: chiptune on or off. M does the same.',
  exit: 'exit: closes the terminal.',
  clear: 'clear: wipes the screen.',
  reset: 'reset --yes: wipes your progress and starts over. reset yard: only the back yard.',
};

/** Your own deck's files, when the terminal talks to no machine. */
const DECK: Record<string, string> = { 'inbox.txt': 'From: the Registry\nSubject: your identity\nStatus: REVOKED\nEffective: immediately\nAppeal: not available.' };

export function commands(c: Ctx): string[] {
  const base = ['help', 'man', 'ls', 'cat', 'whoami', 'set', 'nodes', 'map', 'sound', 'clear', 'exit', 'reset'];
  if (c.machine && c.shell) {
    base.push('use');
    if (c.shell.hasGuard(c.machine)) base.push('login');
    if (c.shell.installable(c.machine).length && !c.save.jump) base.push('install');
  }
  return base;
}

/** Commands that need nothing after them: on the touch deck, one tap runs them. */
export const NO_ARGS = ['help', 'ls', 'whoami', 'nodes', 'map', 'sound', 'clear', 'exit'];

/** What the deck can read right now: the machine's readable nouns, or your own files. */
const readable = (c: Ctx) => (c.machine && c.shell ? c.shell.readable(c.machine) : Object.keys(DECK));

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
    default: return [];
  }
}

function map(c: Ctx): string {
  const s = c.save, done = (b: boolean) => (b ? '  ' : '??');
  return [
    'DOWNTOWN',
    ' west                                                   east',
    ' [MARKET GATE] ' + (s.flags.end ? 'open   ' : s.freed.includes('0x31') ? 'scanner' : '???????') + ' · [BOX 0x2F] ' + done(s.freed.includes('0x2F')) + ' · [STALL] · [ROOF 0x31] ' + done(s.freed.includes('0x31')) + ' · [ANTENNA] root · [SCAN] 0/3',
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
    case 'ls': c.print(at ? at.sh.ls(at.dev) : Object.keys(DECK).join('   ')); return;
    case 'cat': {
      if (at) { at.sh.cat(at.dev, args[0] || ''); return; }
      const name = Object.keys(DECK).find((k) => k.toLowerCase() === (args[0] || '').toLowerCase());
      c.print(name ? DECK[name] : 'cat: ' + (args[0] || '<file>') + ': no such file', name ? 'out' : 'err');
      return;
    }
    case 'whoami': {
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
    case 'nodes': c.print('NODES: ' + nodeCount(s) + ' ACTIVE · freed by you: ' + (s.freed.join(', ') || 'none yet')); return;
    case 'map': c.print(map(c)); return;
    case 'sound': c.print('sound ' + (c.toggleSound() ? 'on' : 'off') + '.', 'dim'); return;
    case 'clear': c.clear(); return;
    case 'exit': case 'logout': c.leaveMachine(); return;
    case 'reset':
      if (args[0] === '--yes') { localStorage.removeItem(SAVE_KEY); location.reload(); return; }
      if ((args[0] || '').toLowerCase() === 'yard') {
        if (args[1] === '--yes') { c.resetYard(); c.print('back yard reset: cables, parts, the parcel, HINGE\'s mood. Everything else is kept.', 'ok'); return; }
        c.print('this resets the back yard only (cables, parts, the parcel, its goals). Type: reset yard --yes', 'err'); return;
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
    case 'sudo': c.denied(); c.print(who(s) + ' is not in the sudoers file. This incident will be reported.', 'err'); return;
    case 'rm': c.print('rm: permission denied.', 'err'); return;
    case 'enter': c.denied(); c.print('enter: ACCESS DENIED. identity: not found.', 'err'); return;
    case 'hack': c.print('hack: command not found.', 'dim'); return;
    default:
      if (c.shell?.use(c.machine, line)) return;
      c.print(verb + ': unknown command. Type help.', 'err');
  }
}
