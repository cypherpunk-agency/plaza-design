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
  Action, CableData, Case, Cond, DeviceData, DialogueNode, EngineData, KeyItem, LineData, LineRef, LogicData, NetData, NounData, SealData, StatusPart, ZoneData,
} from './types';

/** What the code side of a zone provides and expects (see zone/rules.ts `contractOf`). */
export interface CodeContract {
  /** Named effects implemented in code. */
  effects: string[];
  /** Panels the data may open. */
  panels: string[];
  /** State keys the code relies on: the zone's `state` must give each a starting value. */
  state: string[];
  /** Read-only values the code computes, usable in conditions and templates. */
  derived: string[];
  /** Goal ids the code ticks itself. */
  goals: string[];
  /** Text keys the code asks for: a terminal line, or a plain label. */
  texts: Record<string, 'line' | 'label'>;
}

/** One zone to check: its file, what its code provides, and checks only its code knows. */
export interface ZoneCheck { data: ZoneData; code: CodeContract; extra?: (z: ZoneData) => string[] }

const KINDS = ['SENSE', 'ACT', 'STORE', 'DAEMON', 'GUARD', 'LOG', 'LINK'];
/** Kinds whose verbs the engine supplies, so they may list none. */
const ENGINE_VERBS = ['GUARD', 'LINK'];
const TONES = ['ok', 'err', 'dim'];
const DIRS = ['up', 'down', 'left', 'right'];
const ACTION_KEYS = ['set', 'open', 'emit', 'goal', 'effect', 'give', 'trace', 'unseal'];
const SEAL_KEYS = ['key', 'guard', 'sequence', 'if'];
const KEYS: Record<string, string[]> = {
  zone: ['id', 'name', 'state', 'tuning', 'devices', 'nodes', 'cables', 'keyring', 'bench', 'camera', 'dialogue', 'goals', 'texts'],
  logic: ['modules'],
  net: ['nodes', 'cables', 'keyring'],
  module: ['id', 'start', 'foundIn', 'part'],
  device: ['id', 'name', 'look', 'status', 'state', 'nouns', 'sectors', 'layout'],
  noun: ['id', 'kind', 'verbs', 'events', 'current', 'sector', 'guard', 'log', 'link', 'on'],
  guard: ['password', 'near', 'tries', 'lockMs', 'trace', 'do'],
  log: ['rate', 'fall', 'when', 'archive', 'linger', 'lockMs'],
  link: ['reach'],
  sector: ['id', 'label', 'seal'],
  seal: [...SEAL_KEYS, 'withinMs', 'signal'],
  layout: ['spot', 'board', 'dir', 'vision'],
  spot: ['x', 'w', 'h'],
  pt: ['x', 'y'],
  item: ['id', 'kind', 'label', 'text', 'rule', 'from'],
  case: ['if', 'do', 'say'],
  action: ['if', 'to', 'with', ...ACTION_KEYS],
  node: ['if', 'text', 'do', 'choices'],
  dialogue: ['speaker', 'start', 'sayCmd', 'nodes', 'free'],
  goal: ['id', 'text'],
  cable: ['from', 'to', 'verb'],
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
}

/** Everything the checks look things up in: every keyring item, every device and node, by id. */
interface World {
  keyring: Map<string, { item: KeyItem; file: string }>;
  netNodes: Map<string, DeviceData>;
  logic: LogicData;
}

/**
 * Check the whole game's data: every zone (with its code), the shared logic
 * modules (as they run in each zone, reported as logic.json), the shared net
 * (net.json) and the keyring, whose ids must be unique across every file.
 */
export function checkGame(zones: ZoneCheck[], logic: LogicData, net: NetData, engine: EngineData): string[] {
  const errs: string[] = [];
  const keyring = new Map<string, { item: KeyItem; file: string }>();
  const items = (file: string, list: KeyItem[] | undefined) => (list ?? []).forEach((k, i) => {
    const w = `${file} › keyring[${k.id ?? i}]`, e = (m: string) => errs.push(w + ': ' + m);
    for (const f of Object.keys(k)) if (!KEYS.item.includes(f)) e(`unknown field "${f}" (a typo?)`);
    if (typeof k.id !== 'string' || !k.id) { e('needs an id'); return; }
    const had = keyring.get(k.id);
    if (had) e(`id "${k.id}" is also in ${had.file} (keyring ids are global: the keyring travels between zones)`);
    if (!/^[\w.-]+$/.test(k.id)) e('an id is letters, digits, ".", "-" or "_" (made fragments are stored as join(a,b))');
    if (!['fragment', 'key', 'rule'].includes(k.kind)) e(`kind "${k.kind}" is not fragment / key / rule`);
    if (k.kind === 'rule' && !['reverse', 'upper', 'lower'].includes(k.rule as string)) e('a rule needs "rule": reverse / upper / lower');
    if (k.kind !== 'rule' && k.rule !== undefined) e('"rule" only goes on a rule');
    if (k.from !== undefined && (k.kind !== 'fragment' || !Array.isArray(k.from) || k.from.length !== 2)) e('"from" is two keyring ids, on a fragment (the recipe that makes it)');
    if (typeof k.label !== 'string' || !k.label) e('needs a label (shown on its chip)');
    if (k.kind === 'fragment' && (typeof k.text !== 'string' || !k.text)) e('a fragment needs its text (what it types into a login)');
    if (k.kind === 'key' && k.text !== undefined) e('a key chip has no text (only fragments do)');
    if (!had) keyring.set(k.id, { item: k, file });
  });
  items('net.json', net.keyring);
  zones.forEach((z) => items(z.data.id + '.json', z.data.keyring));
  for (const { item, file } of keyring.values()) (item.from ?? []).forEach((id) => {
    const k = keyring.get(id);
    if (!k) errs.push(`${file} › keyring[${item.id}] › from: no keyring item "${id}"`);
    else if (k.item.kind === 'key') errs.push(`${file} › keyring[${item.id}] › from: "${id}" is a key chip (only fragments and rules combine)`);
  });

  const netNodes = new Map(net.nodes.map((n) => [n.id, n]));
  const world: World = { keyring, netNodes, logic };

  // the shared net: nodes any zone may reach, so they may use only the engine and their own state
  for (const k of Object.keys(net)) if (!KEYS.net.includes(k)) errs.push(`net.json: unknown field "${k}" (a typo?)`);
  const bare: CodeContract = { effects: [], panels: [], state: [], derived: [], goals: [], texts: {} };
  const netEnv: Env = { known: new Set(['signal']), writable: new Set(), code: bare, goals: new Set(), dialogues: [], texts: engine.texts };
  const nc = checker('net.json', errs, netEnv, world, netNodes);
  net.nodes.forEach((n) => nc.nodeIds.add(n.id));
  nc.dupes(net.nodes.map((d) => d.id), 'nodes', 'id');
  net.nodes.forEach((d) => {
    nc.device(d, `nodes[${d.id}]`);
    if (d.layout?.spot) nc.err(`nodes[${d.id}] › layout`, 'a node is not in the world: no spot (it lives on the board)');
  });
  nc.cables(net.cables, 'cables', net.nodes);

  for (const z of zones) {
    errs.push(...checkZone(z.data, z.code, world, engine));
    if (z.extra) errs.push(...z.extra(z.data).map((m) => z.data.id + '.json › ' + m));
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
    const key = c.replace(/^!/, '').split('=')[0];
    if (!known.has(key)) err(where, `condition "${c}": unknown key "${key}"`);
  };
  const sectorOf = (ref: string, dev: DeviceData | null) => {
    const [d, s] = ref.includes('/') ? ref.split('/') : [dev?.id ?? '', ref];
    return all.get(d)?.sectors?.find((x) => x.id === s);
  };

  /** One step. `noun` is null outside a noun (a dialogue), where emit and trace make no sense. */
  const action = (a: Action, where: string, known: Set<string>, writable: Set<string>, dev: DeviceData | null, noun: NounData | null) => {
    keys(a, 'action', where);
    const which = ACTION_KEYS.filter((k) => k in a);
    if (which.length !== 1) { err(where, `needs exactly one of ${ACTION_KEYS.join(' / ')}`); return; }
    cond(a.if, known, where);
    if ('set' in a) { if (!writable.has(a.set)) err(where, `cannot set "${a.set}": not a state key`); if (!('to' in a)) err(where, 'set needs "to"'); }
    else if ('to' in a) err(where, '"to" only goes with "set"');
    if ('with' in a && !('open' in a)) err(where, '"with" only goes with "open"');
    if ('open' in a) {
      if (!env.code.panels.includes(a.open)) err(where, `unknown panel "${a.open}" (${env.code.panels.join(', ') || 'none here'})`);
      if (a.open === 'talk') {
        if (a.with !== undefined && !env.dialogues.includes(a.with)) err(where, `talk with "${a.with}": no such dialogue`);
        else if (a.with === undefined && !env.dialogues.length) err(where, 'talk: this zone has no dialogue');
      }
    }
    if ('effect' in a && !env.code.effects.includes(a.effect)) err(where, `unknown effect "${a.effect}" (code has: ${env.code.effects.join(', ') || 'none here'})`);
    if ('goal' in a && !env.goals.has(a.goal)) err(where, `unknown goal "${a.goal}"`);
    if ('emit' in a) {
      if (!noun) err(where, 'emit only works on a noun');
      else if (!(noun.events ?? []).includes(a.emit)) err(where, `this noun has no event "${a.emit}" (add it to "events")`);
    }
    if ('give' in a && !world.keyring.has(a.give)) err(where, `give "${a.give}": no keyring item with that id (zone or net.json "keyring")`);
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
        (c.do ?? []).forEach((a, j) => action(a, `${wc} › do[${j}]`, known, writable, d, n));
        if (c.say !== undefined) line(c.say, `${wc} › say`);
      });
      if (Array.isArray(cs) && cs.slice(0, -1).some((c) => c.if === undefined)) err(`${w} › on.${v}`, 'only the last case may have no "if" (the ones after it never run)');
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
      if (!g || g.kind !== 'GUARD') err(w, `guard "${s.guard}": not a GUARD noun of this device`);
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

  const device = (d: DeviceData, where: string) => {
    keys(d, 'device', where);
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
      if (!KINDS.includes(n.kind)) err(w, `kind "${n.kind}" is not one of ${KINDS.join(' / ')}`);
      const verbs = n.verbs ?? [];
      if (!verbs.length && !ENGINE_VERBS.includes(n.kind)) err(w, 'has no verbs');
      dupes(verbs, w, 'verb');
      if (verbs.length && !n.on) err(w, 'has verbs but no "on" (what they do)');
      if (n.current !== undefined && !known.has(n.current)) err(w, `current: unknown key "${n.current}"`);
      for (const v of Object.keys(n.on ?? {})) if (v !== '*' && !verbs.includes(v)) err(`${w} › on`, `"${v}" is not one of its verbs`);
      for (const v of verbs) if (!(v in (n.on ?? {})) && !('*' in (n.on ?? {}))) err(`${w} › on`, `verb "${v}" does nothing (add it, or a "*" entry)`);
      if (n.sector !== undefined && !sectors.some((s) => s.id === n.sector)) err(w, `sector "${n.sector}" is not one of this device's sectors`);
      for (const [f, kind] of [['guard', 'GUARD'], ['log', 'LOG'], ['link', 'LINK']] as const) {
        if (n.kind === kind && !n[f]) err(w, `a ${kind} noun needs "${f}"`);
        if (n[f] && n.kind !== kind) err(w, `"${f}" only goes on a ${kind} noun`);
      }
      if (n.guard) {
        const g = n.guard, wg = `${w} › guard`;
        keys(g, 'guard', wg);
        if (!list(g.password).length || list(g.password).some((p) => typeof p !== 'string' || !p.trim())) err(wg, 'needs a password (or a list of them)');
        for (const [k, v] of Object.entries(g.near ?? {})) line(v, `${wg} › near.${k}`);
        if (g.tries !== undefined && !(Number.isInteger(g.tries) && g.tries >= 1)) err(wg, 'tries is a whole number, 1 or more');
        if (g.lockMs !== undefined && !(num(g.lockMs) && g.lockMs >= 0)) err(wg, 'lockMs is a time in ms (0: never locks)');
        if (g.trace !== undefined && !num(g.trace)) err(wg, 'trace is a number (%)');
        (g.do ?? []).forEach((a, j) => action(a, `${wg} › do[${j}]`, known, writable, d, n));
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
        if (!Array.isArray(n.link.reach) || !n.link.reach.length) err(wl, 'reach lists the node ids it can scan');
        else n.link.reach.forEach((id) => {
          if (!all.has(id) || !(world.netNodes.has(id) || isNode(id))) err(wl, `reach "${id}": no node with that id (zone "nodes" or net.json)`);
          if (id === d.id) err(wl, 'a node cannot reach itself');
        });
      }
      cases(n, w, known, writable, d);
    }
    if (d.layout) {
      const wl = `${where} › layout`, l = d.layout;
      keys(l, 'layout', wl);
      if (l.spot) { keys(l.spot, 'spot', wl + ' › spot'); if (![l.spot.x, l.spot.w, l.spot.h].every(num)) err(wl + ' › spot', 'x, w and h are numbers (world units)'); }
      if (l.board) { keys(l.board, 'pt', wl + ' › board'); if (![l.board.x, l.board.y].every((v) => num(v) && v >= 0 && v <= 1)) err(wl + ' › board', 'x and y are fractions of the board, 0 to 1'); }
      const ids = new Set([...d.nouns.map((n) => n.id), ...sectors.filter((s) => 'sequence' in s.seal).map((s) => s.id)]);
      for (const f of ['dir', 'vision'] as const) for (const [nid, dir] of Object.entries(l[f] ?? {})) {
        if (!ids.has(nid)) err(`${wl} › ${f}`, `"${nid}" is not one of its nouns`);
        if (!DIRS.includes(dir)) err(`${wl} › ${f}.${nid}`, `"${dir}" is not one of ${DIRS.join(' / ')}`);
      }
    }
  };
  /** Nodes from the zone (not net.json) are in `all` too; a node is anything in reach that is not a world device. */
  const nodeIds = new Set<string>();
  const isNode = (id: string) => nodeIds.has(id);

  /**
   * Pre-wired cables, between devices and nodes that exist in the data. `owners`:
   * the devices whose logs must find their archive cable in this list.
   */
  const cables = (cbs: CableData[], field: string, owners: DeviceData[]) => {
    const nounAt = (key: string) => { const [d, n] = split(key); return all.get(d)?.nouns.find((x) => x.id === n); };
    const sealAt = (key: string) => { const [d, n] = split(key); const s = all.get(d)?.sectors?.find((x) => x.id === n); return s && 'sequence' in s.seal ? s.seal : undefined; };
    cbs.forEach((cb, i) => {
      const w = `${field}[${i}]`;
      keys(cb, 'cable', w);
      const [fromKey, ev] = cb.from.split(':');
      const from = nounAt(fromKey);
      if (!from) err(w, `from "${cb.from}": no such device.noun`);
      else if (!(from.events ?? []).includes(ev)) err(w, `from "${cb.from}": ${fromKey} has no event "${ev}"`);
      const to = nounAt(cb.to), sq = sealAt(cb.to);
      if (sq) { if (!sq.sequence.includes(cb.verb)) err(w, `verb "${cb.verb}" is not in the seal's sequence`); return; }
      if (!to) { err(w, `to "${cb.to}": no such device.noun`); return; }
      if (to.kind === 'GUARD') { err(w, `to "${cb.to}": a GUARD wants a person at the keyboard, not a cable`); return; }
      const verbs = [...(to.verbs ?? []), ...(to.link ? ['scan', ...to.link.reach.map((id) => 'connect ' + id)] : [])];
      if (!verbs.includes(cb.verb)) err(w, `verb "${cb.verb}" is not one of ${cb.to}'s verbs`);
    });
    dupes(cbs.map((cb) => cb.from + ' → ' + cb.to), field, 'cable');
    // a log only records while its cable to the archive is there: one must exist at the start
    for (const d of owners) for (const n of d.nouns) {
      if (n.log?.archive && !cbs.some((cb) => cb.from.startsWith(d.id + '.' + n.id + ':') && cb.to === n.log!.archive)) {
        err(`${d.id} › nouns[${n.id}] › log`, `no pre-wired cable from it to its archive "${n.log.archive}" in ${field}: it would never record`);
      }
    }
  };

  return { err, keys, dupes, line, cond, action, device, cables, nodeIds };
}

/**
 * Check a zone file, its nodes, and the shared logic modules as they run in
 * that zone (their effects and conditions must make sense there). Problems in
 * the modules are reported against `logic.json`.
 */
export function checkZone(z: ZoneData, code: CodeContract, world: World, engine: EngineData): string[] {
  const errs: string[] = [];
  const file = z.id + '.json';
  const texts = { ...engine.texts, ...z.texts };
  const env: Env = {
    known: new Set([...Object.keys(z.state), ...code.derived, 'signal']),
    writable: new Set(Object.keys(z.state)),
    code, goals: new Set(z.goals.map((g) => g.id)), dialogues: Object.keys(z.dialogue), texts,
  };
  const nodes = z.nodes ?? [];
  const all = new Map<string, DeviceData>([...world.netNodes, ...nodes.map((n) => [n.id, n] as const), ...z.devices.map((d) => [d.id, d] as const)]);
  const c = checker(file, errs, env, world, all);
  nodes.forEach((n) => c.nodeIds.add(n.id));
  const { err, keys, dupes, line } = c;

  keys(z, 'zone', '');

  // ---------- state ----------
  for (const k of code.state) if (!(k in z.state)) err('state', `missing "${k}" (the code needs a starting value)`);
  for (const k of code.derived) if (k in z.state) err('state', `"${k}" is computed by the code; it cannot be a state key too`);

  // ---------- texts (the engine's, overridable, and the zone's own) ----------
  for (const [k, want] of Object.entries(code.texts)) {
    const v = texts[k];
    if (v === undefined) err('texts', `missing "${k}" (the code asks for it)`);
    else if (want === 'line' && !isLine(v)) err(`texts.${k}`, 'should be a line: ["command", "reply", "ok"|"err"|"dim"?]' + (k in engine.texts ? ' (as in engine.json)' : ''));
    else if (want === 'label' && typeof v !== 'string') err(`texts.${k}`, 'should be a plain string' + (k in engine.texts ? ' (as in engine.json)' : ''));
  }
  for (const [k, v] of Object.entries(z.texts)) if (Array.isArray(v) && !isLine(v)) err(`texts.${k}`, 'not a valid line: ["command", "reply", "ok"|"err"|"dim"?]');

  // ---------- devices and nodes ----------
  dupes([...z.devices, ...nodes].map((d) => d.id), 'devices', 'device or node id');
  nodes.forEach((n) => { if (world.netNodes.has(n.id)) err(`nodes[${n.id}]`, 'net.json has a node with this id too'); });
  z.devices.forEach((d) => {
    c.device(d, `devices[${d.id}]`);
    if (!d.layout?.spot) err(`devices[${d.id}]`, 'needs layout.spot: where it stands in the world (computers on the net go in "nodes")');
  });
  nodes.forEach((d) => {
    c.device(d, `nodes[${d.id}]`);
    if (d.layout?.spot) err(`nodes[${d.id}] › layout`, 'a node is not in the world: no spot (it lives on the board)');
  });

  // ---------- logic modules (shared; checked as they run in this zone) ----------
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
    if (m.foundIn !== undefined && m.foundIn !== null && typeof m.foundIn !== 'string') lc.err(w, 'foundIn is a zone id or null');
    if (all.has(m.part.id)) lc.err(w, `part id "${m.part.id}" is also a device or node in ${file}`);
    if (/\d$/.test(m.part.id)) lc.err(w, `part id "${m.part.id}" must not end in a digit (placed copies add a counter)`);
    if (m.part.sectors || m.part.layout) lc.err(w + ' › part', 'a logic part has no sectors or layout');
    lc.device(m.part, `${w} › part`);
  });

  // ---------- cables (pre-wired) ----------
  c.cables(z.cables, 'cables', [...z.devices, ...nodes]);

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
        (n.do ?? []).forEach((a, j) => c.action(a, `${wn} › do[${j}]`, env.known, env.writable, null, null));
        (n.choices ?? []).forEach(([, next], j) => { if (!exists(next)) err(`${wn} › choices[${j}]`, `leads to "${next}", which is not a node`); });
      });
      if (Array.isArray(variants) && variants.slice(0, -1).some((n) => n.if === undefined)) err(`${w} › nodes.${nid}`, 'only the last variant may have no "if"');
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
