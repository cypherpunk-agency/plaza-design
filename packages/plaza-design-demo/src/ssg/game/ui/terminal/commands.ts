import { gameStorage, reloadRuntime } from '../../runtime/storage';
/** Extracted commands responsibilities; function bodies and stored identifiers are preserved. */
import { type Save, ownedModules, who, nodeCount } from '../../runtime/save';
import { contactsOf, messagesOf, readFlag } from "../../story/contacts";
import { saveKey } from '../../runtime/play-profile';


// ---------- terminal ----------

/**
 * A scene's machines as the terminal sees them (engine/shell.ts `sceneShell`):
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
  /** The network source binding, including when hacking is currently locked. */
  scanProgram:string|null;
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
  /** The scenes `reset <scene id> --yes` can start over (their part of the save only): scene.json `stage.resettable`. */
  resettable: { id: string; label: string; confirm: string; done: string; reset: () => void }[];
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
  scan: 'scan: lists the machines you reach from where you are plugged in. needs {scanProgram}.',
  connect: 'connect <machine>: brings a machine you reach onto your board. the deck talks to it after.',
  map: 'map: what you know of Downtown.',
  sound: 'sound: chiptune on or off. M does the same.',
  exit: 'exit: closes the terminal.',
  clear: 'clear: wipes the screen.',
  contacts: 'contacts: who is on your deck, and whether they have signal.',
  weather: 'weather: the Registry\'s forecast for where you are and the rest of the city, the next 12 hours.',
  msg: 'msg <contact>: reads what they sent you.',
};


/** `man reset`: the full wipe, and every scene the deck can start over. */
const manReset = (c: Ctx) => 'reset --yes: wipes your progress and starts over.' + c.resettable.map((r) => ' reset ' + r.id + ': only ' + r.label + '.').join('');

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
    case 'reset': return pick(['--yes', ...c.resettable.map((r) => r.id)]);
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
    case 'man': c.print(((MAN[(args[0] || '').toLowerCase()] ?? ((args[0] || '').toLowerCase() === 'reset' ? manReset(c) : undefined)) ?? 'man <command>: explains a command. Try: man login').replace('{scanProgram}',c.scanProgram??'an installed scanner program'), 'dim'); return;
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
      if (args[0] === '--yes') { gameStorage.removeItem(saveKey()); reloadRuntime(); return; }
      const scene = c.resettable.find((r) => r.id.toLowerCase() === (args[0] || '').toLowerCase());
      if (scene) {
        if (args[1] === '--yes') { scene.reset(); c.print(scene.done, 'ok'); return; }
        c.print(scene.confirm + ' Type: reset ' + scene.id + ' --yes', 'err'); return;
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
