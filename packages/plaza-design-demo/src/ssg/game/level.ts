/**
 * Downtown, the first level of ACCESS DENIED: its layout, people, machines,
 * dialogue and hints. The game engine (game.ts) draws and moves things; this
 * file decides what everything says and what each hack unlocks.
 *
 * Rule of the game: hints, never answers.
 */

import { START_MODULES } from './data';
import type { ZoneSave } from './data/types';
import { SPR, type Sprite } from './sprites';

// ---------- save state ----------

export interface Save {
  handle: string;
  tokens: number;
  /** legs.so: installed from the junction box. Stays its own flag (older saves have it). */
  jump: boolean;
  /** Logic modules owned, shared by every zone: `timer.so`, `switch.so`. Not legs.so (that is `jump`). */
  modules: string[];
  freed: string[];
  flags: Record<string, boolean>;
  hints: Record<string, number>;
  /** The keyring: clue fragments and key chips (ids in the game data's `keyring`), carried across zones. */
  keyring: string[];
  /** Each zone's own progress, by zone id: `zones.yard`. Downtown keeps using the fields above. */
  zones: Record<string, ZoneSave | undefined>;
  /** Time played in ms (the pause menu's save slots show it). Older saves: missing, counts from 0. */
  playMs?: number;
}

export const SAVE_KEY = 'access-denied-save-v1';

/** Where a new game starts, after the intro cutscene (NEW GAME in the pause menu). A `capsule` zone replaces it later. */
export const START_ZONE = 'downtown';

export function newSave(): Save {
  return { handle: '', tokens: 0, jump: false, modules: [...START_MODULES], keyring: [], freed: [], flags: {}, hints: {}, zones: {} };
}

/** Saves from before modules, zones and the keyring get what a new game starts with; nothing else changes. */
export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s: Save = { ...newSave(), ...JSON.parse(raw) };
      if (!Array.isArray(s.modules)) s.modules = [...START_MODULES];
      if (!s.zones || typeof s.zones !== 'object') s.zones = {};
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

export type Objective = 'handle' | 'till' | 'box' | 'install' | 'relay' | 'gate';

export function objective(s: Save): Objective {
  if (!s.handle) return 'handle';
  if (!s.flags.till) return 'till';
  if (!s.freed.includes('0x2F')) return 'box';
  if (!s.jump) return 'install';
  if (!s.freed.includes('0x31')) return 'relay';
  return 'gate';
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
  { id: 'hat', sprite: SPR.hat, x: 930, flip: true },
];

export const STALL = { x: 740, w: 140, fixerX: 810 };

export interface Machine { id: string; x: number; h: number; name: string; onRoof?: boolean }
export const MACHINES: Machine[] = [
  { id: 'gate', x: 70, h: 0, name: 'NEON MARKET GATE' },
  { id: 'box', x: 330, h: 40, name: 'JUNCTION BOX 0x2F' },
  { id: 'till', x: 860, h: 30, name: 'NOODLE TILL' },
  { id: 'relay', x: 1150, h: 62, name: 'ROOFTOP RELAY 0x31', onRoof: true },
  { id: 'fence', x: 1590, h: 0, name: 'REGISTRY PROPERTY' },
  { id: 'scan', x: 1790, h: 0, name: 'IDENTITY SCAN' },
];

export interface Readable { id: string; x: number; h: number; pages: string[] }
export const READABLES: Readable[] = [
  { id: 'billboard', x: 640, h: 0, pages: ['REGISTRY PREMIUM. Be seen everywhere.', 'Terms: forever. Cancellation: see Terms.'] },
  { id: 'plaque', x: 1340, h: 0, pages: ['PENTHOUSE · BY INVITATION', 'The door has no handle. Only a window, very high up.'] },
];

// ---------- people ----------

const NPC_LINES: Record<string, [string[], string[]]> = {
  hood: [['Not authenticated. Not my problem.'], ['A box on this street went dark.', 'Registry is sending a van. Wasn\'t you, right?']],
  umbrella: [['I don\'t see you. That\'s the deal.'], ['Still nobody. A louder nobody, though.']],
  hat: [['Keep walking, ghost.'], ['Heard the noodle guy talks to ghosts now.', 'Bad for business. His, not mine.']],
};

export function npcTalk(id: string, s: Save): string[] {
  const [before, after] = NPC_LINES[id] ?? [['...'], ['...']];
  return s.freed.length ? after : before;
}

const HINTS: Record<Objective, string[]> = {
  handle: [],
  till: [],
  box: ['Signs on this street never fully light. Read what the one above the box really says.', 'The box only takes maintenance logins. It says so itself, if you ask it to list its files.'],
  install: ['Found something on that box? Modules don\'t install themselves.', 'Go back to the box. What does it list now that it trusts you?'],
  relay: ['Admins write everything down. Read their notes.', 'Rotation policies are lazy. Same password, different direction.'],
  gate: ['The Market gate wants a scanner signature. Nobody on this street has one.', 'Nothing more to crack here. Not yet.'],
};

export interface Talk { pages: string[]; spend?: boolean }

/** What the fixer says. Hints cost one noodle token and never give the answer. */
export function fixerTalk(s: Save): Talk {
  const name = who(s);
  if (!s.flags.metFixer) {
    s.flags.metFixer = true;
    return { pages: ['Another ghost. Sit.', 'Noodles are free for the dead.', 'Registry pulled your key? Then nobody on this street sees you.', 'Got a name, ghost? Open your deck with / and type: set handle <name>'] };
  }
  const goal = objective(s);
  if (goal === 'handle') return { pages: ['Name first. Press / and type: set handle <name>'] };
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
  };
  if (used >= hints.length) return { pages: [remark[goal], 'That\'s all I know. The rest is yours.'] };
  if (s.tokens <= 0) return { pages: [remark[goal], 'No tokens, no hints. Noodles aren\'t free twice.'] };
  s.tokens -= 1;
  s.hints[goal] = used + 1;
  return { pages: [remark[goal], 'One bowl. Here:', hints[used]], spend: true };
}

// ---------- terminal ----------

export interface Ctx {
  save: Save;
  machine: string | null;
  print: (text: string, kind?: 'out' | 'ok' | 'err' | 'dim' | 'head') => void;
  denied: () => void;
  granted: () => void;
  toggleSound: () => boolean;
  clear: () => void;
  leaveMachine: () => void;
  persist: () => void;
  complete: () => void;
  /** Start the back yard over (its part of the save only). */
  resetYard: () => void;
}

const MAN: Record<string, string> = {
  help: 'help: lists what you can type right now.',
  ls: 'ls: lists the files on the machine you are jacked into (or your own deck).',
  cat: 'cat <file>: prints a file.',
  login: 'login <user> <password>: asks the machine to trust you.',
  install: 'install <module>: adds a module you found to your deck.',
  whoami: 'whoami: who the city thinks you are.',
  set: 'set handle <name>: picks your name. 2 to 16 letters, digits, _ or -.',
  nodes: 'nodes: how many nodes run free of the Registry.',
  map: 'map: what you know of Downtown.',
  sound: 'sound: chiptune on or off. M does the same.',
  exit: 'exit: unplug from a machine, or close the terminal.',
  clear: 'clear: wipes the screen.',
  reset: 'reset --yes: wipes your progress and starts over. reset yard: only the back yard.',
};

const DENIED_JOKES = ['Incident reported to /dev/null.', 'This attempt has been logged. Nobody reads the log.', 'The Registry thanks you for your interest.'];
let jokeIndex = 0;
const joke = () => DENIED_JOKES[jokeIndex++ % DENIED_JOKES.length];

export function banner(id: string, s: Save): string {
  switch (id) {
    case 'till': return '[NOODLE TILL v1.0] firmware: factory\nlogin required. ls and cat work without one.';
    case 'box': return '[JUNCTION BOX 0x2F] REGISTRY UTILITIES · AUTHORISED STAFF ONLY' + (s.freed.includes('0x2F') ? '\nsession: maint' : '');
    case 'relay': return '[ROOFTOP RELAY 0x31] REGISTRY UTILITIES' + (s.freed.includes('0x31') ? '\nsession: maint' : '');
    case 'gate': return '[NEON MARKET GATE] scanner signature required';
    case 'fence': return '[REGISTRY PROPERTY] antenna access: root only';
    case 'scan': return '[IDENTITY SCAN] subject: ' + who(s) + ' · signatures: 0/3';
    default: return '';
  }
}

export function files(c: Ctx): Record<string, string> {
  const s = c.save;
  switch (c.machine) {
    case null: return { 'inbox.txt': 'From: the Registry\nSubject: your identity\nBody: revoked. Have a nice day.' };
    case 'till': return { 'receipts.log': '#0412 ramen, extra egg ...... 1 token\n#0413 ramen, no logs ........ 1 token\n#0414 ramen, for a ghost .... on the house' };
    case 'box': return s.freed.includes('0x2F')
      ? { 'README': 'Registry Utilities. Maintenance login only.\nPassword set per sign policy 7.', 'legs.so': '[binary module] install to use.' }
      : { 'README': 'Registry Utilities. Maintenance login only.\nPassword set per sign policy 7.' };
    case 'relay': return s.freed.includes('0x31')
      ? { 'notes.txt': 'maint: password rotated per policy 7.\nnew password = old password, reversed. -J', 'gate.memo': 'NEON MARKET GATE: scanner signature required.\nScanner modules are sold in the Market. Irony noted.', 'root.frag': 'root fragment 1/7\n9f2c 41ab e07d 3c55 · keep it.' }
      : { 'notes.txt': 'maint: password rotated per policy 7.\nnew password = old password, reversed. -J' };
    default: return {};
  }
}

export function commands(c: Ctx): string[] {
  const base = ['help', 'man', 'ls', 'cat', 'whoami', 'set', 'nodes', 'map', 'sound', 'clear', 'exit', 'reset'];
  if (c.machine && ['till', 'box', 'relay', 'gate'].includes(c.machine)) base.push('login');
  if (c.machine === 'box' && c.save.freed.includes('0x2F') && !c.save.jump) base.push('install');
  return base;
}

/** Commands that need nothing after them: on the touch deck, one tap runs them. */
export const NO_ARGS = ['help', 'ls', 'whoami', 'nodes', 'map', 'sound', 'clear', 'exit'];

/**
 * What the touch deck offers as the next word of `line`. Only what you could
 * already know: commands you have, files a machine lists, modules you found.
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
    case 'cat': return pick(Object.keys(files(c)));
    case 'install': return pick(Object.keys(files(c)).filter((f) => f.endsWith('.so')));
    case 'man': return pick(commands(c));
    case 'set': return pick(['handle']);
    case 'reset': return pick(['--yes', 'yard']);
    default: return [];
  }
}

function login(c: Ctx, user: string, pass: string) {
  const s = c.save, u = user.toLowerCase(), p = pass.toLowerCase();
  if (!user || !pass) { c.print('usage: login <user> <password>', 'dim'); return; }
  switch (c.machine) {
    case 'till':
      if (s.flags.till) { c.print('already logged in. The till likes you now.', 'dim'); return; }
      if (u === 'admin' && p === 'admin') {
        s.flags.till = true; s.tokens += 3; c.granted();
        c.print('ACCESS GRANTED. Hello, admin.', 'ok');
        c.print('3 noodle tokens credited to ' + who(s) + '. Spend them on hints at the stall.', 'ok');
        c.persist(); return;
      }
      break;
    case 'box':
      if (s.freed.includes('0x2F')) { c.print('already logged in as maint.', 'dim'); return; }
      if (u !== 'maint') { c.denied(); c.print('ACCESS DENIED. Maintenance login only.', 'err'); return; }
      if (p === 'vrify') {
        s.freed.push('0x2F'); c.granted();
        c.print('ACCESS GRANTED. Welcome back, maintenance.', 'ok');
        c.print('node 0x2F released from REGISTRY · NODES: ' + nodeCount(s) + ' ACTIVE', 'ok');
        c.print('new file: legs.so', 'ok');
        c.persist(); return;
      }
      if (p === 'verify') { c.denied(); c.print('ACCESS DENIED. Close. Count the letters again.', 'err'); return; }
      break;
    case 'relay':
      if (s.freed.includes('0x31')) { c.print('already logged in as maint.', 'dim'); return; }
      if (u !== 'maint') { c.denied(); c.print('ACCESS DENIED. Maintenance login only.', 'err'); return; }
      if (p === 'yfirv') {
        s.freed.push('0x31'); c.granted();
        c.print('ACCESS GRANTED. Rotation is not security. Noted.', 'ok');
        c.print('node 0x31 released from REGISTRY · NODES: ' + nodeCount(s) + ' ACTIVE', 'ok');
        c.print('new files: gate.memo, root.frag', 'ok');
        c.persist(); return;
      }
      if (p === 'vrify') { c.denied(); c.print('ACCESS DENIED. That was the old one. Policy 7 says rotate.', 'err'); return; }
      break;
    case 'gate':
      c.denied(); c.print('ACCESS DENIED. Scanner signature required. Passwords are so last decade.', 'err');
      if (s.freed.includes('0x31') && !s.flags.end) { s.flags.end = true; c.persist(); c.complete(); }
      return;
  }
  c.denied(); c.print('ACCESS DENIED. ' + joke(), 'err');
}

function map(c: Ctx): string {
  const s = c.save, done = (b: boolean) => (b ? '  ' : '??');
  return [
    'DOWNTOWN',
    ' west                                                   east',
    ' [MARKET GATE] ' + (s.freed.includes('0x31') ? 'scanner' : '???????') + ' · [BOX 0x2F] ' + done(s.freed.includes('0x2F')) + ' · [STALL] · [ROOF 0x31] ' + done(s.freed.includes('0x31')) + ' · [ANTENNA] root · [SCAN] 0/3',
  ].join('\n');
}

export function run(c: Ctx, line: string) {
  const s = c.save;
  const [cmd, ...args] = line.split(/\s+/);
  const verb = cmd.toLowerCase();
  switch (verb) {
    case 'help': {
      c.print('you can type: ' + commands(c).join(', '), 'dim');
      if (!c.machine) c.print('walk up to a machine and press E to jack in.', 'dim');
      return;
    }
    case 'man': c.print(MAN[(args[0] || '').toLowerCase()] ?? 'man <command>: explains a command. Try: man login', 'dim'); return;
    case 'ls': c.print(Object.keys(files(c)).join('   ') || '(nothing)'); return;
    case 'cat': {
      const f = files(c), name = Object.keys(f).find((k) => k.toLowerCase() === (args[0] || '').toLowerCase());
      c.print(name ? f[name] : 'cat: ' + (args[0] || '<file>') + ': no such file', name ? 'out' : 'err');
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
      if (!c.machine) { c.print('login: you are not jacked into anything. Walk up to a machine, press E.', 'err'); return; }
      login(c, args[0] || '', args.slice(1).join(' '));
      return;
    case 'install': {
      if (c.machine !== 'box' || !s.freed.includes('0x2F')) { c.print('install: no such module here.', 'err'); return; }
      if ((args[0] || '').toLowerCase() !== 'legs.so') { c.print('install: no module named ' + (args[0] || '?'), 'err'); return; }
      if (s.jump) { c.print('legs.so is already installed. You have legs.', 'dim'); return; }
      s.jump = true; c.granted(); c.persist();
      c.print('installed legs.so. SPACE to jump.', 'ok');
      return;
    }
    case 'sudo': c.denied(); c.print(who(s) + ' is not in the sudoers file. This incident will be reported to /dev/null.', 'err'); return;
    case 'rm': c.print('PERMISSION DENIED (but we like your style).', 'err'); return;
    case 'enter': c.denied(); c.print('nice try.', 'err'); return;
    case 'hack': c.print('hacking is not a command. It is a lifestyle.', 'dim'); return;
    default: c.print(verb + ': unknown command. Type help.', 'err');
  }
}
