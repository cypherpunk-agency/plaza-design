import {stateRequirementProblems,type StateRequirement} from './state-requirements';
import {cameraBindingProblems} from '../engine/controllers/camera-bindings';
import {controllerProblems} from '../engine/controllers';
import {observationProblems,observationAliases} from '../engine/native-observations';
/**
 * The build-time check for the game's data. The type-check (data/index.ts)
 * only sees the shape; this sees the meaning: does every cable reach a real
 * noun, does every effect exist in code, does every dialogue choice lead
 * somewhere, does every seal have a way to open.
 *
 * Runs in scripts/generate-demos.tsx before bundling; any problem fails the
 * build with a list like
 *   yard.json › devices[gate] › nouns[lock] › on.open[2] › do[0]: unknown effect "hatch.opne"
 *
 * Pure: no DOM, no timers, so node can run it.
 */

import type {
  Action, CableData, Case, Cond, DeviceData, DialogueNode, EngineData, GuardData, KeyItem, LineData, PartFunction, LineRef, LogicData, NetData, NetworkData, NounData, SealData, StatusPart, ToyKind, WatchdogData, SceneData, MechanismDevice,
} from './types';
import { BEHAVIOUR_FUNCTION, LAYERS, PART_FUNCTIONS } from './types';
import { MOVER_CUES, MOVER_EASES, moverRuns, moverVerbs, splitDrive } from '../engine/movers';
import { ZONE_VERBS } from '../engine/zones';
import { windowProblem } from "../world/clock";
import { ITEMS } from '../scenes/kit';

/** What the code side of a scene provides and expects (see scene/rules.ts `contractOf`). */
export interface CodeContract {
  /** Current registered primitive roles; ordinary source endpoints are not historical requirements. */
  devices?:readonly {id:string;spot?:true;nouns?:readonly {id:string;function?:PartFunction;events?:readonly string[]}[]}[];
  /** Verbs implemented by validated shared native routes, rather than legacy on steps. */
  nativeVerbs?: string[];
  /** The scene's registered mechanisms as cable endpoints (engine/gameplay/mechanism-parts.ts). */
  mechanisms?: MechanismDevice[];
  /** Named effects implemented in code. */
  effects: string[];
  /** Panels the data may open. */
  panels: string[];
  /** State keys the code relies on: the scene's `state` must give each a starting value. */
  state: readonly StateRequirement[];
  /** The physical milestones the code reports (`SceneRules.inputs`): what a noun's `milestone` may name. */
  inputs?: readonly string[];
  /** The named places the code measured from the scene's artwork: what a stop or zone edge may call a `place` (absent: the code takes its names from the scene's own data, and a stop names it or fails when the scene is built). */
  places?: readonly string[];
  /** Read-only values the code computes, usable in conditions and templates. */
  derived: string[];
  /** Goal ids the code ticks itself. */
  goals: string[];
  /** Text keys the code asks for: a terminal line, or a plain label. */
  texts: Record<string, 'line' | 'label'>;
}

/** One scene to check: its file, what its code provides, and checks only its code knows. */
export interface SceneCheck { data: SceneData; code: CodeContract; extra?: (z: SceneData) => string[] }

/** Settings blocks whose verbs the engine supplies, so their parts may list none. */
const ENGINE_VERBS = ['guard', 'link', 'clock', 'mover', 'zone'] as const;
const TOYS = ['rings', 'cipher', 'cryptex', 'morse'] as const;
/** The noun the engine puts on each device of a watchdog's route (scene/model.ts WATCH_NOUN). */
const WATCH_NOUN = 'watchdog';
const WATCH_EVENTS = ['arrives', 'leaves'];
const TONES = ['ok', 'err', 'dim'];
/** The city's condition keys every scene has, and the weather's states (engine/model.ts CITY_KEYS, weather.ts WEATHER_KINDS). */
const CITY_KEYS = ['weather', 'hour', 'day'];
const WEATHER = ['clear', 'cloudy', 'rain', 'storm', 'fog', 'smog', 'heat'];
const DIRS = ['up', 'down', 'left', 'right'];
const ACTION_KEYS = ['command', 'input', 'set', 'open', 'emit', 'goal', 'effect', 'give', 'take', 'trace', 'unseal'];
/** What the player can carry (scenes/kit.ts ITEMS): `take` steps and a device's `items` name these. */
const ITEM_IDS = Object.keys(ITEMS);
const SEAL_KEYS = ['key', 'guard', 'sequence', 'if'];
const KEYS: Record<string, string[]> = {
  scene: ['id', 'name', 'state', 'tuning', 'devices', 'nodes', 'cables', 'keyring', 'bench', 'camera', 'dialogue', 'goals', 'texts', 'watchdog', 'observations','controller'],
  logic: ['modules'],
  net: ['nodes', 'cables', 'keyring', 'watchdog', 'networks', 'programs', 'scanProgram'],
  network: ['id', 'name', 'note', 'from', 'need', 'machines'],
  machine: ['id', 'in', 'node'],
  program: ['id', 'name', 'look', 'foundIn'],
  module: ['id', 'start', 'foundIn', 'part'],
  device: ['targetQuery', 'id', 'name', 'look', 'status', 'state', 'nouns', 'sectors', 'layout', 'everyday', 'items', 'deck', 'affects'],
  everyday: ['noun', 'verb', 'label'],
  itemUse: ['item', 'noun', 'label', 'on'],
  noun: ['id', 'layer', 'function', 'verbs', 'events', 'current', 'sector', 'guard', 'log', 'link', 'clock', 'mover', 'zone', 'milestone', 'relay', 'on'],
  guard: ['password', 'say', 'near', 'tries', 'lockMs', 'trace', 'do', 'toy', ...TOYS],
  rings: ['rings', 'tolerance'],
  ring: ['speed', 'gap', 'start'],
  cipher: ['text', 'shift'],
  cryptex: ['word', 'rings'],
  morse: ['message', 'unitMs'],
  clock: ['every', 'first', 'set', 'start', 'once'],
  mover: ['stops', 'axis', 'speed', 'ms', 'ease', 'start', 'across', 'set', 'moving', 'follow', 'paths', 'wired', 'ring', 'auto', 'brake'],
  moverBrake: ['decel', 'snap', 'then', 'load', 'event'],
  brakeSnap: ['stop', 'window', 'minAhead'],
  run: ['run'],
  moverFrom: ['from'],
  leg: ['to', 'ms', 'share', 'speed', 'minMs', 'ease', 'load', 'event', 'ahead', 'drives', 'cue'],
  choice: ['if', 'then', 'else'],
  zone: ['from', 'to', 'watch', 'axis', 'within', 'building', 'set', 'armed', 'track'],
  watchdog: ['id', 'name', 'route', 'dwellMs', 'moveMs'],
  log: ['rate', 'fall', 'when', 'archive', 'linger', 'lockMs'],
  link: ['reach', 'known', 'when'],
  sector: ['id', 'label', 'seal'],
  seal: [...SEAL_KEYS, 'withinMs', 'signal'],
  layout: ['spot', 'board', 'dir', 'vision', 'row'],
  spot: ['x', 'w', 'h', 'y', 'presence'],
  pt: ['x', 'y'],
  item: ['id', 'kind', 'label', 'text', 'rule', 'from', 'card'],
  case: ['if', 'when', 'do', 'say'],
  action: ['if', 'when', 'to', 'with', 'count', ...ACTION_KEYS],
  node: ['if', 'when', 'text', 'do', 'choices'],
  dialogue: ['speaker', 'start', 'sayCmd', 'nodes', 'free'],
  goal: ['id', 'text'],
  cable: ['id', 'from', 'to', 'verb', 'fixed'],
  crate: ['id', 'x', 'y', 'w', 'h', 'label'],
  recipe: ['parts', 'makes', 'say'],
};

const list = <T>(x: T | T[]) => (Array.isArray(x) ? x : [x]);
const num = (v: unknown) => typeof v === 'number' && isFinite(v);
/** "crane.job.log" → ["crane", "job.log"]: noun ids may contain dots. */
const split = (key: string) => { const i = key.indexOf('.'); return i < 0 ? [key, ''] : [key.slice(0, i), key.slice(i + 1)]; };
const isLine = (v: unknown) => Array.isArray(v) && v.length >= 2 && v.length <= 3 && typeof v[0] === 'string' && typeof v[1] === 'string' && (v[2] === undefined || TONES.includes(v[2] as string));

/** Where a device is checked: which keys it may read and write, and what the code around it provides. */
interface Env {
  known: Set<string>;
  writable: Set<string>;
  code: CodeContract;
  goals: Set<string>;
  dialogues: string[];
  texts: Record<string, string | LineData>;
  /** Devices and nodes on a watchdog's route here: they carry the engine's `watchdog` noun. */
  routes: Set<string>;
  /** The scene's tuning values: what a mover's or zone's numbers may name. */
  tuning?: Record<string, number>;
}

/** Everything the checks look things up in: every keyring item, every device and node, by id. */
interface World {
  keyring: Map<string, { item: KeyItem; file: string }>;
  netNodes: Map<string, DeviceData>;
  logic: LogicData;
  /** Modules (and programs) handed out by a `give` step: id → files that do. */
  gives: Map<string, Set<string>>;
  /** The net's networks (net.json), and the programs there are. */
  nets: NetworkData[];
  programs: Set<string>;
}

/**
 * Check the whole game's data: every scene (with its code), the shared logic
 * modules (as they run in each scene, reported as logic.json), the shared net
 * (net.json) and the keyring, whose ids must be unique across every file.
 */
export function checkGame(scenes: SceneCheck[], logic: LogicData, net: NetData, engine: EngineData): string[] {
  const errs: string[] = [];
  const keyring = new Map<string, { item: KeyItem; file: string }>();
  const items = (file: string, list: KeyItem[] | undefined) => (list ?? []).forEach((k, i) => {
    const w = `${file} › keyring[${k.id ?? i}]`, e = (m: string) => errs.push(w + ': ' + m);
    for (const f of Object.keys(k)) if (!KEYS.item.includes(f)) e(`unknown field "${f}" (a typo?)`);
    if (typeof k.id !== 'string' || !k.id) { e('needs an id'); return; }
    const had = keyring.get(k.id);
    if (had) e(`id "${k.id}" is also in ${had.file} (keyring ids are global: the keyring travels between scenes)`);
    if (!/^[\w.-]+$/.test(k.id)) e('an id is letters, digits, ".", "-" or "_" (made fragments are stored as join(a,b))');
    if (!['fragment', 'key', 'rule', 'card'].includes(k.kind)) e(`kind "${k.kind}" is not fragment / key / rule / card`);
    if (k.kind === 'card' && !['slow', 'ping'].includes(k.card as string)) e('a card needs "card": slow / ping (what it does in the shield rings)');
    if (k.kind !== 'card' && k.card !== undefined) e('"card" only goes on a card');
    if (k.id === 'tokens' || /\.so$/.test(k.id)) e(`id "${k.id}" would be read as ${k.id === 'tokens' ? 'tokens' : 'a module'} by a give step: pick another`);
    if (k.kind === 'rule' && !['reverse', 'upper', 'lower'].includes(k.rule as string)) e('a rule needs "rule": reverse / upper / lower');
    if (k.kind !== 'rule' && k.rule !== undefined) e('"rule" only goes on a rule');
    if (k.from !== undefined && (k.kind !== 'fragment' || !Array.isArray(k.from) || k.from.length !== 2)) e('"from" is two keyring ids, on a fragment (the recipe that makes it)');
    if (typeof k.label !== 'string' || !k.label) e('needs a label (shown on its chip)');
    if (k.kind === 'fragment' && (typeof k.text !== 'string' || !k.text)) e('a fragment needs its text (what it types into a login)');
    if (k.kind === 'key' && k.text !== undefined) e('a key chip has no text (only fragments do)');
    if (!had) keyring.set(k.id, { item: k, file });
  });
  items('net.json', net.keyring);
  scenes.forEach((z) => items(z.data.id + '.json', z.data.keyring));
  for (const { item, file } of keyring.values()) (item.from ?? []).forEach((id) => {
    const k = keyring.get(id);
    if (!k) errs.push(`${file} › keyring[${item.id}] › from: no keyring item "${id}"`);
    else if (k.item.kind === 'key') errs.push(`${file} › keyring[${item.id}] › from: "${id}" is a key chip (only fragments and rules combine)`);
  });

  const netNodes = new Map(net.nodes.map((n) => [n.id, n]));
  const world: World = { keyring, netNodes, logic, gives: new Map(), nets: net.networks ?? [], programs: new Set((net.programs ?? []).map((p) => p.id)) };

  // the shared net: nodes any scene may reach, so they may use only the engine and their own state
  for (const k of Object.keys(net)) if (!KEYS.net.includes(k)) errs.push(`net.json: unknown field "${k}" (a typo?)`);
  const bare: CodeContract = { effects: [], panels: [], state: [], derived: [], goals: [], texts: {} };
  const netRoute = new Set(Array.isArray(net.watchdog?.route) ? net.watchdog!.route : []);
  const netEnv: Env = { known: new Set(['signal']), writable: new Set(), code: bare, goals: new Set(), dialogues: [], texts: engine.texts, routes: netRoute };
  const nc = checker('net.json', errs, netEnv, world, netNodes);
  if (net.watchdog) nc.watchdog(net.watchdog, 'watchdog', netNodes);
  net.nodes.forEach((n) => nc.nodeIds.add(n.id));
  nc.dupes(net.nodes.map((d) => d.id), 'nodes', 'id');
  net.nodes.forEach((d) => {
    nc.device(d, `nodes[${d.id}]`);
    if (d.layout?.spot) nc.err(`nodes[${d.id}] › layout`, 'a node is not in the world: no spot (it lives on the board)');
  });
  nc.cables(net.cables, 'cables', net.nodes);

  for (const z of scenes) {
    errs.push(...checkScene(z.data, z.code, world, engine, net));
    if (z.extra) errs.push(...z.extra(z.data).map((m) => z.data.id + '.json › ' + m));
  }
  errs.push(...checkNetworks(net, scenes.map((z) => z.data), world));

  // modules: where each is found (foundIn) must be a file that hands it out, and one handed out must say where
  const files = new Set(['net', ...scenes.map((z) => z.data.id)]);
  logic.modules.forEach((m) => {
    const w = `logic.json › modules[${m.id}]`, by = [...(world.gives.get(m.id) ?? [])];
    if (typeof m.foundIn === 'string') {
      if (!files.has(m.foundIn)) errs.push(`${w} › foundIn: "${m.foundIn}" is not a scene id (or "net")`);
      else if (!by.includes(m.foundIn)) errs.push(`${w} › foundIn: ${m.foundIn === 'net' ? 'net.json' : m.foundIn + '.json'} has no { "give": "${m.id}" } step`);
    } else if (by.length && !m.start) errs.push(`${w}: ${by.map((f) => (f === 'net' ? 'net.json' : f + '.json')).join(', ')} hands it out; say so in "foundIn"`);
  });
  if (net.scanProgram !== null && (typeof net.scanProgram !== 'string' || !world.programs.has(net.scanProgram))) errs.push('net.json › scanProgram: must name a registered program or be null');
  // programs: like modules, where each is found must hand it out
  (net.programs ?? []).forEach((p, i) => {
    const w = `net.json › programs[${p.id ?? i}]`, by = [...(world.gives.get(p.id) ?? [])];
    for (const k of Object.keys(p)) if (!KEYS.program.includes(k)) errs.push(`${w}: unknown field "${k}" (a typo?)`);
    if (!/^[\w-]+\.so$/.test(p.id ?? '')) errs.push(`${w}: a program id is a file name ending in .so`);
    if (logic.modules.some((m) => m.id === p.id)) errs.push(`${w}: logic.json has a module "${p.id}" too: one or the other`);
    if (typeof p.name !== 'string' || !p.name || typeof p.look !== 'string' || !p.look) errs.push(`${w}: needs a name and a look`);
    if (!files.has(p.foundIn)) errs.push(`${w} › foundIn: "${p.foundIn}" is not a scene id (or "net")`);
    else if (!by.includes(p.foundIn)) errs.push(`${w} › foundIn: ${p.foundIn}.json has no { "give": "${p.id}" } step`);
  });
  return errs;
}

/**
 * The networks (net.json `networks`, NET.md): ids once each; every rule names a network, a LINK
 * port (`scene:device.noun`) or a controlled node's label that some machine carries; every
 * machine is a device or node of the scene files it names.
 */
function checkNetworks(net: NetData, scenes: SceneData[], world: World): string[] {
  const errs: string[] = [], nets = net.networks ?? [], ids = new Set<string>();
  const byId = new Map(scenes.map((z) => [z.id, z] as const));
  const thing = (scene: string, id: string): DeviceData | undefined => {
    if (scene === 'net') return world.netNodes.get(id);
    const z = byId.get(scene);
    return z?.devices.find((d) => d.id === id) ?? z?.nodes?.find((d) => d.id === id);
  };
  const labels = new Set(nets.flatMap((n) => (n.machines ?? []).map((m) => m.node).filter((x): x is string => !!x)));
  nets.forEach((n, i) => {
    const w = `net.json › networks[${n.id ?? i}]`, e = (m: string) => errs.push(w + ': ' + m);
    for (const k of Object.keys(n)) if (!KEYS.network.includes(k)) e(`unknown field "${k}" (a typo?)`);
    if (typeof n.id !== 'string' || !/^[\w-]+$/.test(n.id)) e('needs an id (letters, digits, "-" or "_")');
    else if (ids.has(n.id)) e(`id "${n.id}" appears twice`);
    ids.add(n.id);
    for (const f of ['name', 'note', 'need'] as const) if (typeof n[f] !== 'string' || !n[f]) e(`needs "${f}"`);
    if (!Array.isArray(n.from) || !n.from.length) e('"from" lists how it is reached (port, net or controlled)');
    (n.from ?? []).forEach((r, j) => {
      const wr = `from[${j}]`, keys = Object.keys(r);
      if (keys.length !== 1 || !['port', 'net', 'controlled'].includes(keys[0])) { e(`${wr}: one of { "port" }, { "net" }, { "controlled" }`); return; }
      if ('net' in r && !nets.some((o) => o.id === r.net)) e(`${wr}: no network "${r.net}"`);
      if ('net' in r && r.net === n.id) e(`${wr}: a network is not reached from itself`);
      if ('controlled' in r && !labels.has(r.controlled)) e(`${wr}: no machine carries the node label "${r.controlled}"`);
      if ('port' in r) {
        const m = /^([\w-]+):([\w-]+)\.(.+)$/.exec(r.port);
        if (!m) { e(`${wr}: a port is "scene:device.noun"`); return; }
        const d = thing(m[1], m[2]), noun = d?.nouns.find((x) => x.id === m[3]);
        if (!d) e(`${wr}: "${m[1]}" has no device or node "${m[2]}"`);
        else if (!noun || !noun.link) e(`${wr}: ${m[2]}.${m[3]} is not a port (a part with a link)`);
      }
    });
    if (!Array.isArray(n.machines) || !n.machines.length) e('"machines": what is on it');
    (n.machines ?? []).forEach((m, j) => {
      const wm = `machines[${m.id ?? j}]`;
      for (const k of Object.keys(m)) if (!KEYS.machine.includes(k)) e(`${wm}: unknown field "${k}" (a typo?)`);
      if (!Array.isArray(m.in) || !m.in.length) { e(`${wm}: "in" lists the scene files that have it ("net" for net.json)`); return; }
      m.in.forEach((s) => { if (s !== 'net' && !byId.has(s)) e(`${wm}: no scene "${s}"`); else if (!thing(s, m.id)) e(`${wm}: ${s === 'net' ? 'net.json' : s + '.json'} has no device or node "${m.id}"`); });
      if (m.node !== undefined && (typeof m.node !== 'string' || !m.node)) e(`${wm}: "node" is its Registry label (0x2F)`);
    });
  });
  // every LINK is a port of some network, or reaches nodes of its own
  for (const z of [...scenes.map((s) => ({ id: s.id, devs: [...s.devices, ...(s.nodes ?? [])] })), { id: 'net', devs: net.nodes }]) {
    for (const d of z.devs) for (const n of d.nouns) {
      if (!n.link) continue;
      const port = z.id + ':' + d.id + '.' + n.id;
      const used = nets.some((x) => x.from.some((r) => 'port' in r && r.port === port));
      if (!used && !n.link.reach?.length && !n.link.known?.length) errs.push(`${z.id === 'net' ? 'net.json' : z.id + '.json'} › ${d.id} › ${n.id} › link: reaches nothing: no network names the port "${port}", and it has no "reach" or "known"`);
    }
  }
  return errs;
}

/** The checks shared by devices, nouns, actions and dialogue, writing into `errs` as `file › where: message`. */
function checker(file: string, errs: string[], env: Env, world: World, all: Map<string, DeviceData>) {
  const err = (where: string, msg: string) => errs.push(file + (where ? ' › ' + where : '') + ': ' + msg);
  const keys = (o: object, kind: string, where: string) => {
    if (!o || typeof o !== 'object') { err(where, `should be an object`); return; }
    for (const k of Object.keys(o)) if (!KEYS[kind].includes(k)) err(where, `unknown field "${k}" (a typo?)`);
  };
  const dupes = (ids: string[], where: string, what: string) => {
    const seen = new Set<string>();
    ids.forEach((id) => { if (seen.has(id)) err(where, `${what} "${id}" appears twice`); seen.add(id); });
  };
  const line = (ref: LineRef, where: string) => {
    if (typeof ref === 'string') {
      if (!(ref in env.texts)) err(where, `no text "${ref}" in texts`);
      else if (!isLine(env.texts[ref])) err(where, `text "${ref}" is a label, not a line`);
    } else if (!isLine(ref)) err(where, 'not a valid line: ["command", "reply", "ok"|"err"|"dim"?]');
  };
  const cond = (c: Cond | undefined, known: Set<string>, where: string) => {
    if (c === undefined) return;
    if (typeof c !== 'string' || !c) { err(where, 'a condition is a string: key, !key or key=value'); return; }
    const [key, want] = c.replace(/^!/, '').split('=');
    if (!known.has(key)) err(where, `condition "${c}": unknown key "${key}"`);
    // the city's weather (TIME.md): only its states (unless the scene has its own `weather` state)
    else if (key === 'weather' && !env.writable.has(key) && want !== undefined && !WEATHER.includes(want)) err(where, `condition "${c}": the weather is one of ${WEATHER.join(', ')}`);
  };
  /** A time window on the city clock (TIME.md): `when`. */
  const when = (w: unknown, where: string) => {
    if (w === undefined) return;
    const p = windowProblem(w);
    if (p) err(where + ' › when', p);
  };
  const sectorOf = (ref: string, dev: DeviceData | null) => {
    const [d, s] = ref.includes('/') ? ref.split('/') : [dev?.id ?? '', ref];
    return all.get(d)?.sectors?.find((x) => x.id === s);
  };

  /** One step. `noun` is null outside a noun (a dialogue), where emit and trace make no sense. */
  const action = (a: Action, where: string, known: Set<string>, writable: Set<string>, dev: DeviceData | null, noun: NounData | null,guard=false,commandCase=false) => {
    keys(a, 'action', where);
    const which = ACTION_KEYS.filter((k) => k in a);
    if (which.length !== 1) { err(where, `needs exactly one of ${ACTION_KEYS.join(' / ')}`); return; }
    cond(a.if, known, where);
    when(a.when, where);
    if ('set' in a) { if (!writable.has(a.set)) err(where, `cannot set "${a.set}": not a state key`); if (!('to' in a)) err(where, 'set needs "to"'); else if(a.to!==null&&!['string','boolean'].includes(typeof a.to)&&!(typeof a.to==='number'&&Number.isFinite(a.to)))err(where,'set value must be a finite scalar'); }
    else if ('to' in a) err(where, '"to" only goes with "set"');
    if ('with' in a && !('open' in a)) err(where, '"with" only goes with "open"');
    if ('open' in a) {
      if (!env.code.panels.includes(a.open)) err(where, `unknown panel "${a.open}" (${env.code.panels.join(', ') || 'none here'})`);
      if (a.open === 'talk') {
        if (typeof a.with !== 'string' || !env.dialogues.includes(a.with)) err(where, `talk requires an explicit existing dialogue: "${a.with}"`);
      }
    }
    if('command'in a&&(!commandCase||Object.keys(a).length!==1||typeof a.command!=='string'||!/^[-a-zA-Z0-9_.:]{1,128}$/.test(a.command)))err(where,'command requires a sole noun.on case step and a bounded ID');
    if('input'in a&&(!guard||typeof a.input!=='string'||!/^[-a-zA-Z0-9_.]{1,128}$/.test(a.input)))err(where,'input requires guard.do and a bounded ID');
    if ('effect' in a && !env.code.effects.includes(a.effect)) err(where, `unknown effect "${a.effect}" (code has: ${env.code.effects.join(', ') || 'none here'})`);
    if ('goal' in a && !env.goals.has(a.goal)) err(where, `unknown goal "${a.goal}"`);
    if ('emit' in a) {
      if (!noun) err(where, 'emit only works on a noun');
      else if (!(noun.events ?? []).includes(a.emit)) err(where, `this noun has no event "${a.emit}" (add it to "events")`);
    }
    if ('give' in a) {
      // a keyring item, a module from logic.json, or tokens (with a count)
      const mod = world.logic.modules.some((m) => m.id === a.give) || world.programs.has(a.give);
      if (a.give === 'tokens') { if (!(Number.isInteger(a.count) && a.count! >= 1)) err(where, 'give "tokens" needs "count": how many, a whole number from 1'); }
      else if (a.count !== undefined) err(where, '"count" only goes with give "tokens"');
      if (mod) { const f = file === 'net.json' ? 'net' : file.replace(/\.json$/, ''); world.gives.set(a.give, new Set([...(world.gives.get(a.give) ?? []), f])); }
      else if (a.give !== 'tokens' && !world.keyring.has(a.give)) {
        err(where, /\.so$/.test(a.give) ? `give "${a.give}": no module with that id in logic.json (or program in net.json)` : `give "${a.give}": no keyring item with that id (scene or net.json "keyring")`);
      }
    } else if ('take' in a) {
      // an item the player carries, used up (soap into a washer)
      if (!ITEM_IDS.includes(a.take)) err(where, `take "${a.take}": not an item you can carry (scenes/kit.ts ITEMS: ${ITEM_IDS.join(', ')})`);
      if (a.count !== undefined && !(Number.isInteger(a.count) && a.count >= 1)) err(where, '"count" is how many to take, a whole number from 1');
    } else if ('count' in a) err(where, '"count" only goes with give "tokens" or take');
    if ('trace' in a) {
      if (!noun) err(where, 'trace only works on a noun (it is the device you are in)');
      if (!num(a.trace)) err(where, 'trace is a number (%; negative lowers it)');
    }
    if ('unseal' in a) {
      if (!dev && !a.unseal.includes('/')) err(where, `unseal "${a.unseal}": outside a device, name it as device/sector`);
      else if (!sectorOf(a.unseal, dev)) err(where, `unseal "${a.unseal}": no such sector`);
    }
  };

  const cases = (n: NounData, w: string, known: Set<string>, writable: Set<string>, d: DeviceData) => {
    for (const [v, cs] of Object.entries(n.on ?? {})) {
      list<Case>(cs).forEach((c, i) => {
        const wc = `${w} › on.${v}` + (Array.isArray(cs) ? `[${i}]` : '');
        keys(c, 'case', wc);
        cond(c.if, known, wc);
        when(c.when, wc);
        (c.do ?? []).forEach((a, j) => action(a, `${wc} › do[${j}]`, known, writable, d, n,false,c.do?.length===1));
        if (c.say !== undefined) line(c.say, `${wc} › say`);
      });
      if (Array.isArray(cs) && cs.slice(0, -1).some((c) => c.if === undefined && c.when === undefined)) err(`${w} › on.${v}`, 'only the last case may have no "if" or "when" (the ones after it never run)');
    }
  };

  const seal = (s: SealData, w: string, d: DeviceData, sector: string, known: Set<string>) => {
    keys(s, 'seal', w);
    const which = SEAL_KEYS.filter((k) => k in s);
    if (which.length !== 1) { err(w, `needs exactly one of ${SEAL_KEYS.join(' / ')}`); return; }
    if (('withinMs' in s || 'signal' in s) && !('sequence' in s)) err(w, 'withinMs and signal only go with sequence');
    if ('key' in s) {
      const k = world.keyring.get(s.key);
      if (!k) err(w, `key "${s.key}": no keyring item with that id`);
      else if (k.item.kind !== 'key') err(w, `key "${s.key}" is a ${k.item.kind}, not a key chip`);
    }
    if ('guard' in s) {
      const g = d.nouns.find((n) => n.id === s.guard);
      if (!g || !g.guard) err(w, `guard "${s.guard}": not a login (a part with a guard) of this device`);
      else if (g.sector === sector) err(w, `guard "${s.guard}" sits inside the sector it opens (it could never be reached)`);
    }
    if ('sequence' in s) {
      if (!Array.isArray(s.sequence) || !s.sequence.length || s.sequence.some((v) => typeof v !== 'string' || !v)) err(w, 'sequence is a list of verbs, in order');
      if (s.withinMs !== undefined && !(num(s.withinMs) && s.withinMs > 0)) err(w, 'withinMs is a time in ms');
      if (s.signal !== undefined && typeof s.signal !== 'boolean') err(w, 'signal is true or false');
      if (d.nouns.some((n) => n.id === sector)) err(w, `the seal is a noun called "${sector}", and the device already has one`);
    }
    if ('if' in s) cond(s.if, known, w);
  };

  /** A lock toy on a guard: one of four, with its parameters under the same name, and no password. */
  const toy = (g: GuardData, wg: string, n: NounData) => {
    const t = g.toy as string;
    if (!(TOYS as readonly string[]).includes(t)) { err(wg, `toy "${t}" is not one of ${TOYS.join(' / ')}`); return; }
    if (g.password !== undefined) err(wg, 'a toy guard has no password: the toy is the lock');
    if ((n.verbs ?? []).includes('probe')) err(`${wg.replace(/ › guard$/, '')}`, '"probe" is the engine\'s verb on a toy guard: leave it out of verbs');
    const w = `${wg} › ${t}`, p = g[t as ToyKind] as Record<string, unknown> | undefined;
    if (!p || typeof p !== 'object') { err(wg, `a ${t} toy needs "${t}": its parameters`); return; }
    keys(p, t, w);
    if (t === 'rings') {
      const r = g.rings!, rings = Array.isArray(r.rings) ? r.rings : [];
      if (!rings.length || rings.length > 5) err(w, 'rings is a list of 1 to 5 rings, outermost first');
      rings.forEach((x, i) => {
        const wr = `${w} › rings[${i}]`;
        keys(x, 'ring', wr);
        if (!num(x.speed) || x.speed === 0 || Math.abs(x.speed) > 360) err(wr, 'speed is degrees per second, not 0, at most 360 either way');
        if (!num(x.gap) || x.gap < 10 || x.gap > 180) err(wr, 'gap is degrees, 10 to 180');
        if (x.start !== undefined && !num(x.start)) err(wr, 'start is degrees (0 = the gap starts at the port)');
      });
      if (r.tolerance !== undefined && !(num(r.tolerance) && r.tolerance > 0 && r.tolerance <= 90)) err(w, 'tolerance is degrees, above 0, at most 90');
    }
    if (t === 'cipher') {
      const c = g.cipher!;
      if (typeof c.text !== 'string' || !/[a-z]/i.test(c.text)) err(w, 'text is the line as shown, enciphered (it needs letters)');
      if (!(Number.isInteger(c.shift) && c.shift >= 1 && c.shift <= 25)) err(w, 'shift is a whole number, 1 to 25');
    }
    if (t === 'cryptex') {
      const c = g.cryptex!, word = typeof c.word === 'string' ? c.word.toUpperCase() : '';
      if (!/^[A-Z0-9]{2,8}$/.test(word)) err(w, 'word is 2 to 8 letters or digits');
      if (c.rings !== undefined) {
        if (!Array.isArray(c.rings) || c.rings.length !== word.length) err(w, `rings: one string of letters per letter of the word (${word.length})`);
        else c.rings.forEach((r, i) => {
          if (typeof r !== 'string' || r.length < 2 || new Set(r.toUpperCase()).size !== r.length) err(`${w} › rings[${i}]`, 'a ring is 2 or more different letters');
          else if (!r.toUpperCase().includes(word[i])) err(`${w} › rings[${i}]`, `has no "${word[i]}": the word could never be set`);
        });
      }
    }
    if (t === 'morse') {
      const mo = g.morse!;
      if (typeof mo.message !== 'string' || !/^[A-Za-z0-9 ]+$/.test(mo.message) || !mo.message.trim()) err(w, 'message is letters, digits and spaces (what the lamp blinks)');
      if (mo.unitMs !== undefined && !(num(mo.unitMs) && mo.unitMs >= 80 && mo.unitMs <= 1000)) err(w, 'unitMs is one Morse unit in ms, 80 to 1000');
    }
  };

  /** A watchdog: a route of devices and nodes that exist (in `here`), and its rhythm. */
  const watchdog = (wd: WatchdogData, where: string, here: Map<string, DeviceData>) => {
    keys(wd, 'watchdog', where);
    if (wd.id !== undefined && (typeof wd.id !== 'string' || !/^[\w-]+$/.test(wd.id))) err(where, 'id is letters, digits, "-" or "_"');
    if (wd.name !== undefined && (typeof wd.name !== 'string' || !wd.name)) err(where, 'name is text (what the board calls it)');
    if (!Array.isArray(wd.route) || !wd.route.length) err(where, 'route lists the device and node ids it walks, in order');
    else {
      wd.route.forEach((id, i) => { if (!here.has(id)) err(`${where} › route[${i}]`, `"${id}" is no device or node here`); });
      dupes(wd.route, where + ' › route', 'stop');
    }
    if (!(num(wd.dwellMs) && wd.dwellMs > 0)) err(where, 'dwellMs is how long it sits on each, ms (above 0)');
    if (!(num(wd.moveMs) && wd.moveMs >= 0)) err(where, 'moveMs is how long it walks to the next, ms (0 or more)');
  };

  const device = (d: DeviceData, where: string) => {
    keys(d, 'device', where);
    if(d.targetQuery!==undefined&&(typeof d.targetQuery!=='string'||!env.code.derived.includes(d.targetQuery)))err(where,'targetQuery must name a declared shared query');
    const local = Object.keys(d.state ?? {});
    const known = new Set([...env.known, ...local]);
    const writable = new Set([...env.writable, ...local]);
    const status: StatusPart[] = typeof d.status === 'string' ? [d.status] : d.status;
    status.forEach((p, i) => { if (typeof p !== 'string') cond(p.if, known, `${where} › status[${i}]`); });
    dupes(d.nouns.map((n) => n.id), where, 'noun');
    const sectors = d.sectors ?? [];
    dupes(sectors.map((s) => s.id), where, 'sector');
    sectors.forEach((s, i) => {
      const w = `${where} › sectors[${s.id ?? i}]`;
      keys(s, 'sector', w);
      seal(s.seal, `${w} › seal`, d, s.id, known);
      if (!d.nouns.some((n) => n.sector === s.id)) err(w, 'no noun sits in this sector (give some nouns "sector": "' + s.id + '")');
    });
    for (const n of d.nouns) {
      const w = `${where} › nouns[${n.id}]`;
      keys(n, 'noun', w);
      if (!LAYERS.includes(n.layer)) err(w, `layer "${n.layer}" is not one of ${LAYERS.join(' / ')}`);
      if (!PART_FUNCTIONS.includes(n.function)) err(w, `function "${n.function}" is not one of ${PART_FUNCTIONS.join(' / ')}`);
      const verbs = n.verbs ?? [];
      if (!verbs.length && !ENGINE_VERBS.some((f) => n[f])) err(w, 'has no verbs');
      dupes(verbs, w, 'verb');
      if (verbs.length && !n.on && verbs.some(v=>!env.code.nativeVerbs?.includes(d.id+'.'+n.id+':'+v))) err(w, 'has verbs but no "on" (what they do)');
      if (n.current !== undefined && !known.has(n.current)) err(w, `current: unknown key "${n.current}"`);
      for (const v of Object.keys(n.on ?? {})) if (v !== '*' && !verbs.includes(v)) err(`${w} › on`, `"${v}" is not one of its verbs`);
      for (const v of verbs) if (!(v in (n.on ?? {})) && !('*' in (n.on ?? {})) && !env.code.nativeVerbs?.includes(d.id+'.'+n.id+':'+v)) err(`${w} › on`, `verb "${v}" does nothing (add it, or a "*" entry)`);
      if (n.sector !== undefined && !sectors.some((s) => s.id === n.sector)) err(w, `sector "${n.sector}" is not one of this device's sectors`);
      if (n.id === WATCH_NOUN && env.routes.has(d.id)) err(w, `"${WATCH_NOUN}" is the engine's noun on a device the watchdog visits: rename this one`);
      for (const [f, fn] of Object.entries(BEHAVIOUR_FUNCTION) as [keyof typeof BEHAVIOUR_FUNCTION, PartFunction][])
        if (n[f] && n.function !== fn) err(w, `"${f}" only goes on a ${fn} part (this one is ${n.function})`);
      if (n.guard) {
        const g = n.guard, wg = `${w} › guard`;
        keys(g, 'guard', wg);
        if (g.toy !== undefined) toy(g, wg, n);
        else if (g.password === undefined || !list(g.password).length || list(g.password).some((p) => typeof p !== 'string' || !p.trim())) err(wg, 'needs a password (or a list of them), or a "toy"');
        for (const t of TOYS) if (g[t] !== undefined && g.toy !== t) err(wg, `"${t}" holds a ${t} toy's parameters: it needs "toy": "${t}"`);
        if (g.say !== undefined) line(g.say, `${wg} › say`);
        for (const [k, v] of Object.entries(g.near ?? {})) line(v, `${wg} › near.${k}`);
        if (g.tries !== undefined && !(Number.isInteger(g.tries) && g.tries >= 1)) err(wg, 'tries is a whole number, 1 or more');
        if (g.lockMs !== undefined && !(num(g.lockMs) && g.lockMs >= 0)) err(wg, 'lockMs is a time in ms (0: never locks)');
        if (g.trace !== undefined && !num(g.trace)) err(wg, 'trace is a number (%)');
        (g.do ?? []).forEach((a, j) => action(a, `${wg} › do[${j}]`, known, writable, d, n,true));
        if (n.on && ('*' in n.on)) err(`${w} › on`, 'a GUARD cannot have "*": its try and type verbs are the engine\'s');
      }
      if (n.log) {
        const l = n.log, wl = `${w} › log`;
        keys(l, 'log', wl);
        if (!(num(l.rate) && l.rate > 0)) err(wl, 'rate is trace % per second, above 0');
        for (const f of ['fall', 'linger', 'lockMs'] as const) if (l[f] !== undefined && !(num(l[f]) && l[f]! >= 0)) err(wl, `${f} is a number, 0 or more`);
        cond(l.when, known, wl + ' › when');
        if (l.archive !== undefined) {
          const [ad, an] = split(l.archive);
          if (!all.get(ad)?.nouns.some((x) => x.id === an)) err(wl, `archive "${l.archive}": no such device.noun`);
          if (!(n.events ?? []).length) err(wl, 'a log with an archive needs an event, for the cable to the archive to start at');
        }
      }
      if (n.link) {
        const wl = `${w} › link`;
        keys(n.link, 'link', wl);
        for (const f of ['reach', 'known'] as const) {
          const ids = n.link[f];
          if (ids === undefined) continue;
          if (!Array.isArray(ids) || !ids.length) { err(wl, `${f} lists node ids (or leave it out)`); continue; }
          ids.forEach((id) => {
            if (!all.has(id) || !(world.netNodes.has(id) || isNode(id))) err(wl, `${f} "${id}": no node with that id (scene "nodes" or net.json)`);
            if (id === d.id) err(wl, 'a node cannot reach itself');
          });
        }
        cond(n.link.when, known, wl + ' › when');
      }
      if (n.clock) {
        const c = n.clock, wc = `${w} › clock`;
        keys(c, 'clock', wc);
        if (!(num(c.every) && c.every >= 100)) err(wc, 'every is the beat in ms, 100 or more');
        if (c.first !== undefined && !(num(c.first) && c.first >= 0)) err(wc, 'first is ms before the first beat, 0 or more');
        if (c.start !== undefined && typeof c.start !== 'boolean') err(wc, 'start is true or false (running when the scene starts)');
        if (c.once !== undefined && typeof c.once !== 'boolean') err(wc, 'once is true or false (one event, then it stops)');
        if (c.set !== undefined && !writable.has(c.set)) err(wc, `set "${c.set}": not a state key (it holds the last event)`);
        if (!(n.events ?? []).length) err(w, 'a CLOCK needs events: what it raises, in turn (["tick"], or ["night", "day"])');
        for (const v of ['start', 'stop']) if ((n.verbs ?? []).includes(v)) err(w, `"${v}" is the engine's verb on a CLOCK: leave it out of verbs`);
      }
      if (n.mover) {
        const mv = n.mover, wm = `${w} › mover`, stops = Object.entries(mv.stops ?? {});
        keys(mv, 'mover', wm);
        // a number, or the name of a tuning value that holds one (more than `min`)
        const numRef = (v: unknown, min: number, strict: boolean) => (num(v) && (strict ? (v as number) > min : (v as number) >= min)) || (typeof v === 'string' && num((env.tuning ?? {})[v]) && (strict ? (env.tuning ?? {})[v] > min : (env.tuning ?? {})[v] >= min));
        const coordOk = (c: unknown, wc: string): boolean => {
          if (num(c)) return true;
          if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
          const o = c as Record<string, unknown>;
          if (o.plus !== undefined && !numRef(o.plus, -Infinity, true)) { err(wc, 'plus is a number or a tuning name'); return true; }
          if ('place' in o) { if (Object.keys(o).some((k) => k !== 'place' && k !== 'plus')) err(wc, 'a place takes only plus'); else if (typeof o.place !== 'string' || (env.code.places && !env.code.places.includes(o.place))) err(wc, `place "${String(o.place)}": the scene's code names ${(env.code.places ?? []).join(', ') || 'none'}`); return true; }
          if ('spot' in o) { if (Object.keys(o).some((k) => !['spot', 'edge', 'plus'].includes(k))) err(wc, 'a spot takes edge and plus'); else if (typeof o.spot !== 'string' || !all.get(String(o.spot))?.layout?.spot) err(wc, `spot "${String(o.spot)}": no device with a spot by that id`); if (o.edge !== undefined && !['left', 'center', 'right'].includes(String(o.edge))) err(wc, 'edge is left, center or right'); return true; }
          return false;
        };
        const stopOk = (s: unknown, wc: string) => {
          if (coordOk(s, wc)) return true;
          if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
          const o = s as Record<string, unknown>, ks = Object.keys(o);
          if (!ks.length || ks.some((k) => k !== 'x' && k !== 'h')) return false;
          return ks.every((k) => coordOk(o[k], wc + '.' + k));
        };
        const easeOk = (e: unknown) => e === undefined || MOVER_EASES.includes(e as never) || (Array.isArray(e) && e.length > 0 && e.every((p) => Array.isArray(p) && p.length === 2 && num(p[0]) && num(p[1]) && p[0] > 0 && p[0] < 1));
        if (!stops.length || stops.some(([k]) => !k.trim())) err(wm, 'stops is { name: place } with at least one stop');
        for (const [k, v] of stops) if (!stopOk(v, `${wm} › stops.${k}`)) err(wm, `stop "${k}" is a place along the axis (a number, a { place }, a { spot }) or a point { x, h }`);
        if (mv.speed !== undefined && !numRef(mv.speed, 0, true)) err(wm, 'speed is world units per second (a number or a tuning name), more than 0');
        if (mv.ms !== undefined && !numRef(mv.ms, 0, false)) err(wm, 'ms is how long every plain trip takes (a number or a tuning name), 0 or more');
        if (!easeOk(mv.ease)) err(wm, `ease is ${MOVER_EASES.join(', ')} or a timing table [[time, progress], ...] (times between 0 and 1)`);
        if (mv.wired !== undefined && typeof mv.wired !== 'boolean') err(wm, 'wired is true or false (the engine gives it go/return verbs)');
        if (mv.wired !== false && mv.speed === undefined && mv.ms === undefined) err(wm, 'a wired mover needs a speed (or ms) for its go verbs');
        if (mv.axis !== undefined && mv.axis !== 'x' && mv.axis !== 'h') err(wm, 'axis is "x" (across) or "h" (up)');
        if (mv.across !== undefined && !num(mv.across)) err(wm, 'across is where it runs on the other axis (world units)');
        if (mv.start !== undefined && !(mv.start in (mv.stops ?? {}))) err(wm, `start "${mv.start}" is not one of its stops`);
        if (mv.set !== undefined && !writable.has(mv.set)) err(wm, `set "${mv.set}": not a state key (it holds the stop, or "moving")`);
        if (mv.moving !== undefined && (typeof mv.moving !== 'string' || !mv.moving.trim() || mv.moving in (mv.stops ?? {}))) err(wm, 'moving is what set holds while it travels: text that is not one of its stops');
        if (mv.moving !== undefined && mv.set === undefined) err(wm, 'moving is what set holds: give it a set key');
        if (mv.follow !== undefined && !known.has(mv.follow)) err(wm, `follow "${mv.follow}": not a state key (it names the stop to be at)`);
        if (mv.ring !== undefined && !numRef(mv.ring, 0, true)) err(wm, 'ring is the length of the loop (a number or a tuning name), more than 0');
        if (mv.auto !== undefined && !(typeof mv.auto === 'string' && mv.auto in (mv.paths ?? {}))) err(wm, `auto "${String(mv.auto)}" is not one of its paths`);
        const eventsUsed = new Set<string>(['started', 'arrived']);
        if (mv.brake !== undefined) {
          const br = mv.brake as unknown as Record<string, unknown>, wb = `${wm} › brake`;
          if (!br || typeof br !== 'object' || Array.isArray(br)) err(wb, 'brake is { decel, then, snap? }');
          else {
            keys(br, 'moverBrake', wb);
            if (!numRef(br.decel, 0, true)) err(wb, 'decel is the braking rate, world units per second squared (a number or a tuning name), more than 0');
            const then = br.then as Record<string, unknown> | undefined;
            if (!then || typeof then !== 'object' || Array.isArray(then) || !('track' in then)) err(wb, 'then is { track: path, <snap stop>: path }: the path to run where it stopped (track: anywhere)');
            else for (const [where, p] of Object.entries(then)) {
              if (where !== 'track' && !(Array.isArray(br.snap) && (br.snap as { stop?: unknown }[]).some((x) => x?.stop === where))) err(wb, `then "${where}": not "track" or one of the snap stops`);
              if (typeof p !== 'string' || !(p in (mv.paths ?? {}))) err(wb, `then ${where}: "${String(p)}" is not one of its paths`);
            }
            if (br.snap !== undefined) {
              if (!Array.isArray(br.snap)) err(wb, 'snap is a list of { stop, window }');
              else (br.snap as Record<string, unknown>[]).forEach((x, i) => {
                const wsn = `${wb} › snap[${i}]`;
                if (!x || typeof x !== 'object' || Array.isArray(x)) { err(wsn, 'a snap is { stop, window }'); return; }
                keys(x, 'brakeSnap', wsn);
                if (typeof x.stop !== 'string' || !(x.stop in (mv.stops ?? {}))) err(wsn, `stop "${String(x.stop)}" is not one of its stops`);
                if (!numRef(x.window, 0, false)) err(wsn, 'window is how close to the stop its stopping point must come, world units (a number or a tuning name)');
                if (x.minAhead !== undefined && !numRef(x.minAhead, 0, false)) err(wsn, 'minAhead is how far ahead the stop must be, world units (a number or a tuning name)');
              });
            }
            if (br.load !== undefined && (typeof br.load !== 'string' || !br.load.trim())) err(wb, 'load is a label (text)');
            if (br.event !== undefined) { if (typeof br.event !== 'string' || !br.event.trim() || br.event === 'started' || br.event === 'arrived') err(wb, 'event is a name other than started and arrived'); else { eventsUsed.add(br.event); if (!(n.events ?? []).includes(br.event)) err(wb, `event "${br.event}" is not in this part's events`); } }
          }
        }
        // a path that runs another must find it (and the loop must take time, which the engine guards at run time)
        for (const [name, steps] of Object.entries(mv.paths ?? {})) if (Array.isArray(steps)) for (const r of moverRuns(steps)) if (!(r in (mv.paths ?? {}))) err(wm, `path "${name}": run "${r}" is not one of its paths`);
        const stepCheck = (steps: unknown, wp: string, depth: number) => {
          if (!Array.isArray(steps) || !steps.length || depth > 6) { err(wp, 'a path is a list of legs (and choices), at least one'); return; }
          steps.forEach((s: Record<string, unknown>, i) => {
            const ws = `${wp}[${i}]`;
            if (!s || typeof s !== 'object' || Array.isArray(s)) { err(ws, 'a leg or a choice is an object'); return; }
            if ('if' in s) {
              keys(s, 'choice', ws);
              if (typeof s.if === 'string') cond(s.if, known, ws + ' › if'); else err(ws, 'if is a condition (lock=open)');
              stepCheck(s.then, ws + ' › then', depth + 1);
              if (s.else !== undefined) stepCheck(s.else, ws + ' › else', depth + 1);
              return;
            }
            if ('from' in s) {
              keys(s, 'moverFrom', ws);
              if (typeof s.from !== 'string' || !(s.from in (mv.stops ?? {}))) err(ws, `from "${String(s.from)}" is not one of its stops`);
              if (i !== 0 || depth > 0) err(ws, 'from is the first step of a path: the trip begins from that stop');
              return;
            }
            if ('run' in s) {
              keys(s, 'run', ws);
              if (typeof s.run !== 'string' || !(s.run in (mv.paths ?? {}))) err(ws, `run "${String(s.run)}" is not one of its paths`);
              if (i !== steps.length - 1) err(ws, 'run is the last step of a path (or of a branch of a choice): nothing after it would run');
              return;
            }
            keys(s, 'leg', ws);
            if (typeof s.to === 'string' && s.to.startsWith('@')) { if (!known.has(s.to.slice(1))) err(ws, `to "${s.to}": not a state key or computed value (it names the stop)`); }
            else if (s.to !== undefined && (typeof s.to !== 'string' || !(s.to in (mv.stops ?? {})))) err(ws, `to "${String(s.to)}" is not one of its stops (or @key for a state key that holds one)`);
            if (s.ahead !== undefined && !numRef(s.ahead, 0, false)) err(ws, 'ahead is ms the leg is already in when the trip starts (a number or a tuning name), 0 or more');
            if (s.cue !== undefined && !MOVER_CUES.includes(s.cue as never)) err(ws, `cue is ${MOVER_CUES.join(' or ')}`);
            if (s.drives !== undefined) {
              if (typeof s.drives !== 'string' || !/^[^:]+:[^:]+$/.test(s.drives)) err(ws, 'drives is "noun:path": another mover of this device and one of its paths');
              else {
                const [dn, dp] = splitDrive(s.drives), other = d.nouns.find((x) => x.id === dn)?.mover;
                if (!other) err(ws, `drives "${s.drives}": no mover part "${dn}" on this device`);
                else if (dn === n.id) err(ws, 'a mover cannot drive itself');
                else if (!other.paths?.[dp]) err(ws, `drives "${s.drives}": that mover has no path "${dp}"`);
              }
            }
            if (s.ms !== undefined && !numRef(s.ms, 0, false)) err(ws, 'ms is a time in ms (a number or a tuning name), 0 or more');
            if (s.share !== undefined && !(num(s.share) && (s.share as number) > 0)) err(ws, 'share is the part of ms this leg takes, more than 0');
            if (s.speed !== undefined && !numRef(s.speed, 0, true)) err(ws, 'speed is world units per second (a number or a tuning name), more than 0');
            if (s.minMs !== undefined && !numRef(s.minMs, 0, false)) err(ws, 'minMs is how long the leg lasts at least, ms (a number or a tuning name), 0 or more');
            if (!easeOk(s.ease)) err(ws, 'ease is a curve name or a timing table');
            if (s.load !== undefined && (typeof s.load !== 'string' || !s.load.trim())) err(ws, 'load is a label (text)');
            if (s.event !== undefined) { if (typeof s.event !== 'string' || !s.event.trim() || s.event === 'started' || s.event === 'arrived') err(ws, 'event is a name other than started and arrived'); else { eventsUsed.add(s.event); if (!(n.events ?? []).includes(s.event)) err(ws, `event "${s.event}" is not in this part's events`); } }
            if (s.to !== undefined && s.ms === undefined && s.speed === undefined && mv.speed === undefined && mv.ms === undefined) err(ws, 'a leg that moves needs ms or speed (or the mover one)');
          });
        };
        for (const [name, steps] of Object.entries(mv.paths ?? {})) { if (!name.trim()) err(wm, 'a path needs a name'); stepCheck(steps, `${wm} › paths.${name}`, 0); }
        for (const v of [...moverVerbs(mv), 'return']) if ((n.verbs ?? []).includes(v)) err(w, `"${v}" is the engine's verb on a mover: leave it out of verbs`);
        for (const e of n.events ?? []) if (!eventsUsed.has(e)) err(w, `a mover raises "started", "arrived" and the events of its paths' legs, not "${e}"`);
      }
      if (n.zone) {
        const zn = n.zone, wz = `${w} › zone`;
        keys(zn, 'zone', wz);
        const edge = (c: unknown, which: string) => {
          if (num(c)) return;
          const o = c as Record<string, unknown> | null;
          if (o && typeof o === 'object' && !Array.isArray(o) && 'place' in o && Object.keys(o).every((k) => k === 'place' || k === 'plus')) { if (typeof o.place !== 'string' || (env.code.places && !env.code.places.includes(o.place))) err(wz, `${which} place "${String(o.place)}": the scene's code names ${(env.code.places ?? []).join(', ') || 'none'}`); if (o.plus !== undefined && !(num(o.plus) || (typeof o.plus === 'string' && num((env.tuning ?? {})[o.plus])))) err(wz, `${which} plus is a number or a tuning name`); return; }
          if (o && typeof o === 'object' && !Array.isArray(o) && 'spot' in o && Object.keys(o).every((k) => ['spot', 'edge', 'plus'].includes(k))) { if (typeof o.spot !== 'string' || !all.get(String(o.spot))?.layout?.spot) err(wz, `${which} spot "${String(o.spot)}": no device with a spot by that id`); if (o.edge !== undefined && !['left', 'center', 'right'].includes(String(o.edge))) err(wz, `${which} edge is left, center or right`); if (o.plus !== undefined && !(num(o.plus) || (typeof o.plus === 'string' && num((env.tuning ?? {})[o.plus])))) err(wz, `${which} plus is a number or a tuning name`); return; }
          err(wz, `${which} is a position (a number, a { place }, a { spot })`);
        };
        edge(zn.from, 'from'); edge(zn.to, 'to');
        if (num(zn.from) && num(zn.to) && zn.from === zn.to) err(wz, 'from and to are two different positions (world units)');
        if (typeof zn.watch !== 'string' || !(zn.watch === 'player' || /^[\w-]+\.[\w.-]+$/.test(zn.watch))) err(wz, 'watch is "player" or a mover as "device.noun"');
        if (zn.axis !== undefined && zn.axis !== 'x' && zn.axis !== 'h') err(wz, 'axis is "x" (across) or "h" (up)');
        if (zn.within !== undefined && !(Array.isArray(zn.within) && zn.within.length === 2 && zn.within.every(num))) err(wz, 'within is [low, high] on the other axis (world units)');
        if (zn.armed !== undefined && typeof zn.armed !== 'boolean') err(wz, 'armed is true or false (raising events when the scene starts)');
        if (zn.building !== undefined && (typeof zn.building !== 'string' || zn.watch !== 'player')) err(wz, 'building names the floors a watched player must stand on ("" the street)');
        if (zn.set !== undefined && !writable.has(zn.set)) err(wz, `set "${zn.set}": not a state key (it holds whether something is inside)`);
        for (const v of ZONE_VERBS) if ((n.verbs ?? []).includes(v)) err(w, `"${v}" is the engine's verb on a zone: leave it out of verbs`);
        for (const e of n.events ?? []) if (e !== 'enters' && e !== 'leaves') err(w, `a zone raises "enters" and "leaves", not "${e}"`);
        if (zn.track !== undefined && zn.track !== 'stop') err(wz, 'track is "stop" (watch where the mover would come to rest if it braked now)');
        if (zn.track !== undefined && zn.watch === 'player') err(wz, 'track belongs to a zone that watches a mover');
      }
      if (n.relay !== undefined) {
        const wr = `${w} › relay`;
        if (!n.relay || typeof n.relay !== 'object' || Array.isArray(n.relay)) err(wr, 'relay is { event: "noun:event" }');
        else for (const [event, to] of Object.entries(n.relay)) {
          if (!(n.events ?? []).includes(event)) err(wr, `"${event}" is not one of this part's events`);
          const i = typeof to === 'string' ? to.indexOf(':') : -1, target = i > 0 ? d.nouns.find((x) => x.id === to.slice(0, i)) : undefined;
          if (!target || !(target.events ?? []).includes((to as string).slice(i + 1))) err(wr, `${event} → "${String(to)}": not an event of another part of this device (noun:event)`);
          else if (target.id === n.id) err(wr, `${event} → "${String(to)}": relay it to another part`);
        }
      }
      if (n.milestone !== undefined) {
        const wm = `${w} › milestone`;
        if (!n.mover && !n.zone) err(w, 'milestone belongs to a mover or a zone (it reports their events)');
        if (!n.milestone || typeof n.milestone !== 'object' || Array.isArray(n.milestone)) err(wm, 'milestone is { event: input id }');
        else for (const [event, input] of Object.entries(n.milestone)) {
          if (!(n.events ?? []).includes(event)) err(wm, `"${event}" is not one of this part's events`);
          if (typeof input !== 'string' || !(env.code.inputs ?? []).includes(input)) err(wm, `"${String(input)}" is no physical milestone of the scene's code (it reports ${(env.code.inputs ?? []).join(', ') || 'none'})`);
        }
      }
      cases(n, w, known, writable, d);
    }
    if (d.layout) {
      const wl = `${where} › layout`, l = d.layout;
      keys(l, 'layout', wl);
      if (l.spot) { keys(l.spot, 'spot', wl + ' › spot'); if(l.spot.presence!==undefined&&(typeof l.spot.presence!=='string'||!env.code.derived.includes(l.spot.presence)))err(wl+' › spot','presence must name a declared shared query'); if (![l.spot.x, l.spot.w, l.spot.h].every(num)) err(wl + ' › spot', 'x, w and h are numbers (world units)'); if (l.spot.y !== undefined && !(num(l.spot.y) && l.spot.y >= 0)) err(wl + ' › spot', 'y is a height above the street, 0 or more'); }
      if (l.board) { keys(l.board, 'pt', wl + ' › board'); if (![l.board.x, l.board.y].every((v) => num(v) && v >= 0 && v <= 1)) err(wl + ' › board', 'x and y are fractions of the board, 0 to 1'); }
      const ids = new Set([...d.nouns.map((n) => n.id), ...sectors.filter((s) => 'sequence' in s.seal).map((s) => s.id)]);
      for (const f of ['dir', 'vision'] as const) for (const [nid, dir] of Object.entries(l[f] ?? {})) {
        if (!ids.has(nid)) err(`${wl} › ${f}`, `"${nid}" is not one of its nouns`);
        if (!DIRS.includes(dir)) err(`${wl} › ${f}.${nid}`, `"${dir}" is not one of ${DIRS.join(' / ')}`);
      }
      if (l.row !== undefined) {
        if (!Array.isArray(l.row)) err(`${wl} › row`, 'a list of noun ids, left to right');
        else l.row.forEach((nid, i) => {
          if (!ids.has(nid)) err(`${wl} › row[${i}]`, `"${nid}" is not one of its nouns`);
          else if (l.row!.indexOf(nid) !== i) err(`${wl} › row[${i}]`, `"${nid}" is listed twice`);
        });
      }
    }
  };
  /** Nodes from the scene (not net.json) are in `all` too; a node is anything in reach that is not a world device. */
  const nodeIds = new Set<string>();
  const isNode = (id: string) => nodeIds.has(id);

  /**
   * Pre-wired cables, between devices and nodes that exist in the data. `owners`:
   * the devices whose logs must find their archive cable in this list.
   */
  const cables = (cbs: CableData[], field: string, owners: DeviceData[]) => {
    const nounAt = (key: string): NounData | undefined => {
      const [d, n] = split(key);
      // the engine's watchdog noun, on a device the watchdog visits: it raises arrives / leaves and takes no orders
      if (n === WATCH_NOUN && env.routes.has(d) && all.has(d)) return { id: WATCH_NOUN, layer: 'software', function: 'record', watch: true, events: WATCH_EVENTS, verbs: [] } as NounData & { watch: true };
      // a registered mechanism's part: the signals it raises and the actions a cable may send it
      const mech = env.code.mechanisms?.find((m) => m.id === d)?.parts.find((p) => p.id === n);
      if (mech) return { id: mech.id, layer: mech.layer, function: mech.function, verbs: [...mech.verbs], events: [...mech.events] } as NounData;
      return all.get(d)?.nouns.find((x) => x.id === n);
    };
    const sealAt = (key: string) => { const [d, n] = split(key); const s = all.get(d)?.sectors?.find((x) => x.id === n); return s && 'sequence' in s.seal ? s.seal : undefined; };
    cbs.forEach((cb, i) => {
      const w = `${field}[${cb.id ?? i}]`;
      keys(cb, 'cable', w);
      if (cb.id !== undefined && (typeof cb.id !== 'string' || !/^[\w.-]+$/.test(cb.id))) err(w, 'id is letters, digits, ".", "-" or "_" (saves keep cuts by it)');
      if (cb.fixed !== undefined && typeof cb.fixed !== 'boolean') err(w, 'fixed is true or false (true: it cannot be cut)');
      const [fromKey, ev] = cb.from.split(':');
      const from = nounAt(fromKey);
      if (!from) err(w, `from "${cb.from}": no such device.noun`);
      else if (!(from.events ?? []).includes(ev)) err(w, `from "${cb.from}": ${fromKey} has no event "${ev}"`);
      const to = nounAt(cb.to), sq = sealAt(cb.to);
      if (sq) { if (!sq.sequence.includes(cb.verb)) err(w, `verb "${cb.verb}" is not in the seal's sequence`); return; }
      if (!to) { err(w, `to "${cb.to}": no such device.noun`); return; }
      if (to.guard) { err(w, `to "${cb.to}": a login wants a person at the keyboard, not a cable`); return; }
      if ('watch' in to) { err(w, `to "${cb.to}": the watchdog takes no orders (wire from its arrives / leaves)`); return; }
      const verbs = [...(to.verbs ?? []), ...(to.link ? ['scan', ...[...(to.link.reach ?? []), ...(to.link.known ?? [])].map((id) => 'connect ' + id)] : []), ...(to.clock ? ['start', 'stop'] : []), ...(to.mover ? moverVerbs(to.mover) : []), ...(to.zone ? ZONE_VERBS : [])];
      if (!verbs.includes(cb.verb)) err(w, `verb "${cb.verb}" is not one of ${cb.to}'s verbs`);
    });
    dupes(cbs.map((cb) => cb.from + ' → ' + cb.to), field, 'cable');
    dupes(cbs.map((cb) => cb.id ?? cb.from + '>' + cb.to), field, 'cable id');
    // a log only records while its cable to the archive is there: one must exist at the start
    for (const d of owners) for (const n of d.nouns) {
      if (n.log?.archive && !cbs.some((cb) => cb.from.startsWith(d.id + '.' + n.id + ':') && cb.to === n.log!.archive)) {
        err(`${d.id} › nouns[${n.id}] › log`, `no pre-wired cable from it to its archive "${n.log.archive}" in ${field}: it would never record`);
      }
    }
  };

  return { err, keys, dupes, line, cond, when, action, device, cables, nodeIds, watchdog };
}

/**
 * Check a scene file, its nodes, and the shared logic modules as they run in
 * that scene (their effects and conditions must make sense there). Problems in
 * the modules are reported against `logic.json`.
 */
/** Validate world-target operations with exactly the same grammar and references as device cases. */
export function checkSceneInteractionRows(z:SceneData,code:CodeContract,source:{engine:EngineData;logic:LogicData;net:NetData;keyring:ReadonlyMap<string,KeyItem>},rows:Case[]):string[]{
  const errors:string[]=[],world:World={keyring:new Map([...source.keyring].map(([id,item])=>[id,{item,file:'world'}])),netNodes:new Map(source.net.nodes.map(n=>[n.id,n])),logic:source.logic,gives:new Map(),nets:source.net.networks??[],programs:new Set((source.net.programs??[]).map(p=>p.id))};
  const env:Env={known:new Set([...Object.keys(z.state),...code.derived,...observationAliases(z),...CITY_KEYS,'signal']),writable:new Set(Object.keys(z.state)),code,goals:new Set(z.goals.map(g=>g.id)),dialogues:Object.keys(z.dialogue),texts:{...source.engine.texts,...z.texts},routes:new Set()};
  const c=checker(z.id+' scene targets',errors,env,world,new Map([...world.netNodes,...(z.nodes??[]).map(n=>[n.id,n] as const),...z.devices.map(d=>[d.id,d] as const)]));
  rows.forEach((r,i)=>{const at='operation '+i;c.cond(r.if,env.known,at);c.when(r.when,at);r.do?.forEach((a,j)=>c.action(a,at+' action '+j,env.known,env.writable,null,null));if(r.say!==undefined)c.line(r.say,at);});
  return errors;
}
export function checkScene(z: SceneData, code: CodeContract, world: World, engine: EngineData, net?: NetData): string[] {
  const errs: string[] = [];
  const file = z.id + '.json';
  const texts = { ...engine.texts, ...z.texts };
  const env: Env = {
    // the city's keys (weather, hour, day: engine/model.ts CITY_KEYS) are in every scene
    known: new Set([...Object.keys(z.state), ...code.derived, ...observationAliases(z), 'signal', ...CITY_KEYS]),
    writable: new Set(Object.keys(z.state)),
    code, goals: new Set(z.goals.map((g) => g.id)), dialogues: Object.keys(z.dialogue), texts,
    routes: new Set([...(Array.isArray(z.watchdog?.route) ? z.watchdog!.route : []), ...(Array.isArray(net?.watchdog?.route) ? net!.watchdog!.route : [])]),
    tuning: z.tuning,
  };
  const nodes = z.nodes ?? [];
  const all = new Map<string, DeviceData>([...world.netNodes, ...nodes.map((n) => [n.id, n] as const), ...z.devices.map((d) => [d.id, d] as const)]);
  const c = checker(file, errs, env, world, all);
  nodes.forEach((n) => c.nodeIds.add(n.id));
  const { err, keys, dupes, line } = c;

  errs.push(...controllerProblems(z,world.netNodes,code.derived));
  const observationErrors=observationProblems(z,code.derived,{nodes:world.netNodes,keys:new Set(world.keyring.keys())});
  errs.push(...observationErrors);

  // ---------- the watchdog ----------
  if (z.watchdog) {
    c.watchdog(z.watchdog, 'watchdog', all);
    const id = z.watchdog.id ?? 'watchdog', other = net?.watchdog;
    if (other && (other.id ?? 'watchdog') === id) err('watchdog', `net.json's watchdog has the id "${id}" too: give one of them another id`);
    (z.watchdog.route ?? []).forEach((d) => { if (other?.route?.includes(d)) err('watchdog › route', `"${d}" is on net.json's watchdog route too: one watchdog per device`); });
  }

  keys(z, 'scene', '');

  // ---------- state ----------
  for(const role of code.devices??[]){const d=[...z.devices,...(z.nodes??[])].find(d=>d.id===role.id);if(!d){err('devices',`missing primitive device "${role.id}"`);continue;}if(role.spot&&!d.layout?.spot)err('devices',`primitive device "${role.id}" needs world spot geometry`);for(const requirement of role.nouns??[]){const noun=d.nouns.find(n=>n.id===requirement.id);if(!noun||requirement.function&&noun.function!==requirement.function)err('devices',`missing/changed primitive noun "${role.id}.${requirement.id}"`);for(const event of requirement.events??[])if(!noun?.events?.includes(event))err('devices',`missing primitive event "${role.id}.${requirement.id}:${event}"`);}}
  for(const problem of stateRequirementProblems(code.state,z.state,z.id))err('state',problem);
  for (const k of code.derived) if (k in z.state) err('state', `"${k}" is computed by the code; it cannot be a state key too`);

  // ---------- texts (the engine's, overridable, and the scene's own) ----------
  for (const [k, want] of Object.entries(code.texts)) {
    const v = texts[k];
    if (v === undefined) err('texts', `missing "${k}" (the code asks for it)`);
    else if (want === 'line' && !isLine(v)) err(`texts.${k}`, 'should be a line: ["command", "reply", "ok"|"err"|"dim"?]' + (k in engine.texts ? ' (as in engine.json)' : ''));
    else if (want === 'label' && typeof v !== 'string') err(`texts.${k}`, 'should be a plain string' + (k in engine.texts ? ' (as in engine.json)' : ''));
  }
  for (const [k, v] of Object.entries(z.texts)) if (Array.isArray(v) && !isLine(v)) err(`texts.${k}`, 'not a valid line: ["command", "reply", "ok"|"err"|"dim"?]');

  /**
   * A device's everyday actions (its popup in the world): each a noun's own verb. Hacking verbs
   * are not everyday: no logins, ports, recorders or clocks (parts with a guard, link, log or clock), nothing in a sealed sector.
   */
  const hacking = (n: NounData) => !!(n.guard || n.link || n.log || n.clock);
  const MAX_EVERYDAY = 3;
  const everyday = (d: DeviceData, where: string) => {
    if (d.deck !== undefined && typeof d.deck !== 'boolean') err(where + ' › deck', 'true or false: a computer you can jack into');
    if (d.affects !== undefined) {
      if (!Array.isArray(d.affects)) err(where + ' › affects', 'a list of device ids (what it changes that no cable shows)');
      else d.affects.forEach((id, i) => { if (!z.devices.some((x) => x.id === id) || id === d.id) err(`${where} › affects[${i}]`, `"${id}" is not another device in this scene`); });
    }
    if (d.everyday === undefined) return;
    if (!Array.isArray(d.everyday)) { err(where + ' › everyday', 'a list of { noun, verb, label? }'); return; }
    // the popup: at most three everyday rows, then jack in and hack it (five rows, phone-sized)
    if (d.everyday.length > MAX_EVERYDAY) err(where + ' › everyday', `${d.everyday.length} actions: at most ${MAX_EVERYDAY} fit the popup (keep the everyday ones; the rest live in hack view)`);
    d.everyday.forEach((e, i) => {
      const w = `${where} › everyday[${i}]`;
      c.keys(e, 'everyday', w);
      const n = d.nouns.find((x) => x.id === e.noun);
      if (!n) { err(w, `"${e.noun}" is not one of its nouns`); return; }
      if (hacking(n)) err(w, `${n.id} is a ${n.function} part with engine behaviour: hacking, not everyday (it stays in hack view)`);
      if (n.sector) err(w, `${n.id} sits in sector "${n.sector}": sealed things are not everyday`);
      if (!(n.verbs ?? []).includes(e.verb)) err(w, `"${e.verb}" is not one of ${n.id}'s verbs (${(n.verbs ?? []).join(', ') || 'none'})`);
      if (e.label !== undefined && (typeof e.label !== 'string' || !e.label.trim())) err(w, 'label is the words on the popup (a string)');
    });
    dupes(d.everyday.map((e) => e.noun + ' ' + e.verb), where + ' › everyday', 'action');
  };

  /**
   * What a device takes from what you carry (`items`): an ITEMS id, a noun that is everyday (not
   * hacking, not sealed), the popup's words, and cases as a verb's. They show only while held, first;
   * the popup keeps to three at runtime, so there is no count limit here.
   */
  const itemUses = (d: DeviceData, where: string) => {
    if (d.items === undefined) return;
    if (!Array.isArray(d.items)) { err(where + ' › items', 'a list of { item, noun, label, on }'); return; }
    const local = Object.keys(d.state ?? {});
    const known = new Set([...env.known, ...local]), writable = new Set([...env.writable, ...local]);
    d.items.forEach((u, i) => {
      const w = `${where} › items[${u.item ?? i}]`;
      keys(u, 'itemUse', w);
      if (!ITEM_IDS.includes(u.item)) err(w, `"${u.item}" is not an item you can carry (scenes/kit.ts ITEMS: ${ITEM_IDS.join(', ')})`);
      if (typeof u.label !== 'string' || !u.label.trim()) err(w, 'label is the words on the popup ("pour in soap")');
      const n = d.nouns.find((x) => x.id === u.noun);
      if (!n) { err(w, `noun "${u.noun}" is not one of its nouns`); return; }
      if (hacking(n)) err(w, `${n.id} is a ${n.function} part with engine behaviour: hacking, not everyday`);
      if (n.sector) err(w, `${n.id} sits in sector "${n.sector}": sealed things are not everyday`);
      if (u.on === undefined) { err(w, 'needs "on": what happens (a case, or a list of them)'); return; }
      list<Case>(u.on).forEach((k, j) => {
        const wc = `${w} › on` + (Array.isArray(u.on) ? `[${j}]` : '');
        keys(k, 'case', wc);
        c.cond(k.if, known, wc);
        c.when(k.when, wc);
        (k.do ?? []).forEach((a, x) => c.action(a, `${wc} › do[${x}]`, known, writable, d, n));
        if (k.say !== undefined) line(k.say, `${wc} › say`);
      });
    });
    dupes(d.items.map((u) => u.item + ' ' + u.label), where + ' › items', 'item action');
  };

  // ---------- devices and nodes ----------
  dupes([...z.devices, ...nodes].map((d) => d.id), 'devices', 'device or node id');
  nodes.forEach((n) => { if (world.netNodes.has(n.id)) err(`nodes[${n.id}]`, 'net.json has a node with this id too'); });
  z.devices.forEach((d) => {
    c.device(d, `devices[${d.id}]`);
    if (!d.layout?.spot) err(`devices[${d.id}]`, 'needs layout.spot: where it stands in the world (computers on the net go in "nodes")');
    everyday(d, `devices[${d.id}]`);
    itemUses(d, `devices[${d.id}]`);
  });
  nodes.forEach((d) => {
    c.device(d, `nodes[${d.id}]`);
    if (d.everyday || d.items || d.deck !== undefined || d.affects) err(`nodes[${d.id}]`, 'a node is not in the world: no everyday actions, items, deck or affects (you reach it through a LINK)');
    if (d.layout?.spot) err(`nodes[${d.id}] › layout`, 'a node is not in the world: no spot (it lives on the board)');
  });

  // ---------- logic modules (shared; checked as they run in this scene) ----------
  const lc = checker('logic.json', errs, env, world, all);
  const logic = world.logic;
  lc.keys(logic, 'logic', '');
  lc.dupes(logic.modules.map((m) => m.id), 'modules', 'module');
  lc.dupes(logic.modules.map((m) => m.part.id), 'modules', 'part id');
  logic.modules.forEach((m, i) => {
    const w = `modules[${m.id ?? i}]`;
    lc.keys(m, 'module', w);
    if (!/^[\w-]+\.so$/.test(m.id)) lc.err(w, 'a module id is a file name ending in .so');
    if (m.id === 'legs.so') lc.err(w, "legs.so is Downtown's own module (the save keeps it as `jump`)");
    if (m.start !== undefined && typeof m.start !== 'boolean') lc.err(w, 'start is true or false');
    if (m.foundIn !== undefined && m.foundIn !== null && typeof m.foundIn !== 'string') lc.err(w, 'foundIn is a scene id or null');
    if (all.has(m.part.id)) lc.err(w, `part id "${m.part.id}" is also a device or node in ${file}`);
    if (/\d$/.test(m.part.id)) lc.err(w, `part id "${m.part.id}" must not end in a digit (placed copies add a counter)`);
    if (m.part.sectors || m.part.layout) lc.err(w + ' › part', 'a logic part has no sectors or layout');
    lc.device(m.part, `${w} › part`);
  });

  // ---------- cables (pre-wired) ----------
  c.cables(z.cables, 'cables', [...z.devices, ...nodes]);
  // a zone watches the player or a mover of this scene, on the mover's axis
  for (const d of [...z.devices, ...nodes]) for (const n of d.nouns) {
    const watch = n.zone?.watch;
    if (!watch || watch === 'player') continue;
    const [md, mn] = split(watch), mover = all.get(md)?.nouns.find((x) => x.id === mn)?.mover;
    if (!mover) err(`devices[${d.id}] › nouns[${n.id}] › zone`, `watch "${watch}": no mover there`);
    else if (n.zone?.track === 'stop' && !mover.brake) err(`devices[${d.id}] › nouns[${n.id}] › zone`, `track "stop": ${watch} has no brake to stop with`);
  }

  // ---------- bench (crafting, later) ----------
  if (z.bench) {
    dupes(z.bench.parts, 'bench.parts', 'part');
    z.bench.recipes.forEach((r, i) => {
      const w = `bench.recipes[${i}]`;
      keys(r, 'recipe', w);
      if (r.parts.length !== 2) err(w, 'a recipe takes exactly two parts');
      r.parts.forEach((p) => { if (!z.bench!.parts.includes(p)) err(w, `part "${p}" is not in bench.parts`); });
      if (!logic.modules.some((m) => m.part.id === r.makes)) err(w, `makes "${r.makes}": not a logic part in logic.json`);
      line(r.say, `${w} › say`);
    });
    dupes(z.bench.recipes.map((r) => [...r.parts].sort().join('+')), 'bench.recipes', 'recipe');
  }

  // ---------- camera (the yard's CAM-1) ----------
  if (z.camera) {
    if(Object.keys(z.camera).some(k=>!['crates','actions','bindings'].includes(k)))err('camera','unknown field');
    for(const problem of cameraBindingProblems(z))err('camera',problem);
    if(z.camera.actions!==undefined){const actions=z.camera.actions;if(!actions||typeof actions!=='object'||Array.isArray(actions)||Object.keys(actions).some(k=>!['inspectOwned','tagOwned'].includes(k))||Object.values(actions).some(v=>typeof v!=='string'||!v||v.length>128||['__proto__','constructor','prototype'].includes(v)))err('camera.actions','registered camera action names and command IDs required');}
    z.camera.crates.forEach((cr, i) => keys(cr, 'crate', `camera.crates[${i}]`));
    dupes(z.camera.crates.map((cr) => cr.id), 'camera.crates', 'crate');
  }

  // ---------- dialogue ----------
  for (const [id, dl] of Object.entries(z.dialogue)) {
    const w = `dialogue.${id}`;
    keys(dl, 'dialogue', w);
    const nodesOf = dl.nodes;
    const exists = (n: string) => n in nodesOf;
    if (!exists(dl.start)) err(w, `start "${dl.start}" is not a node`);
    for (const [nid, variants] of Object.entries(nodesOf)) {
      list<DialogueNode>(variants).forEach((n, i) => {
        const wn = `${w} › nodes.${nid}` + (Array.isArray(variants) ? `[${i}]` : '');
        keys(n, 'node', wn);
        c.cond(n.if, env.known, wn);
        c.when(n.when, wn);
        (n.do ?? []).forEach((a, j) => c.action(a, `${wn} › do[${j}]`, env.known, env.writable, null, null));
        (n.choices ?? []).forEach(([, next], j) => { if (!exists(next)) err(`${wn} › choices[${j}]`, `leads to "${next}", which is not a node`); });
      });
      if (Array.isArray(variants) && variants.slice(0, -1).some((n) => n.if === undefined && n.when === undefined)) err(`${w} › nodes.${nid}`, 'only the last variant may have no "if" or "when"');
    }
    if (dl.free) {
      try { new RegExp(dl.free.match, 'i'); } catch { err(`${w} › free.match`, 'not a valid regular expression'); }
      if (!exists(dl.free.goto)) err(`${w} › free.goto`, `"${dl.free.goto}" is not a node`);
      if (!exists(dl.free.retryGoto)) err(`${w} › free.retryGoto`, `"${dl.free.retryGoto}" is not a node`);
    }
  }

  // ---------- goals ----------
  z.goals.forEach((g, i) => keys(g, 'goal', `goals[${i}]`));
  dupes(z.goals.map((g) => g.id), 'goals', 'goal');
  for (const g of code.goals) if (!env.goals.has(g)) err('goals', `missing goal "${g}" (the code ticks it)`);

  return errs;
}
