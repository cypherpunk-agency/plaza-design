/**
 * The build-time check for a zone file. The type-check (data/index.ts) only
 * sees the shape; this sees the meaning: does every cable reach a real noun,
 * does every effect exist in code, does every dialogue choice lead somewhere.
 *
 * Runs in scripts/generate-demos.tsx before bundling; any problem fails the
 * build with a list like
 *   yard.json › devices[gate] › nouns[lock] › on.open[2] › do[0]: unknown effect "hatch.opne"
 *
 * Pure: no DOM, no timers, so node can run it.
 */

import type { Action, Case, Cond, DeviceData, DialogueNode, LineRef, LogicData, StatusPart, ZoneData } from './types';

/** What the code side of a zone provides and expects. */
export interface CodeContract {
  /** Named effects implemented in code. */
  effects: string[];
  /** Panels the data may open. */
  panels: string[];
  /** State keys the code owns: the zone's `state` must list exactly these. */
  state: string[];
  /** Read-only values the code computes, usable in conditions and templates. */
  derived: string[];
  /** Goal ids the code ticks itself. */
  goals: string[];
  /** Text keys the code asks for: a terminal line, or a plain label. */
  texts: Record<string, 'line' | 'label'>;
}

const KINDS = ['SENSE', 'ACT', 'STORE', 'DAEMON'];
const TONES = ['ok', 'err', 'dim'];
const ACTION_KEYS = ['set', 'open', 'emit', 'goal', 'effect'];
const KEYS: Record<string, string[]> = {
  zone: ['id', 'name', 'state', 'tuning', 'devices', 'cables', 'bench', 'camera', 'dialogue', 'goals', 'texts'],
  logic: ['modules'],
  module: ['id', 'start', 'foundIn', 'part'],
  device: ['id', 'name', 'look', 'status', 'state', 'nouns'],
  noun: ['id', 'kind', 'verbs', 'events', 'current', 'on'],
  case: ['if', 'do', 'say'],
  action: ['if', 'to', ...ACTION_KEYS],
  node: ['if', 'text', 'do', 'choices'],
  dialogue: ['speaker', 'start', 'sayCmd', 'nodes', 'free'],
  goal: ['id', 'text'],
  cable: ['from', 'to', 'verb'],
  crate: ['id', 'x', 'y', 'w', 'h', 'label'],
  recipe: ['parts', 'makes', 'say'],
};

const list = <T>(x: T | T[]) => (Array.isArray(x) ? x : [x]);

/**
 * Check a zone file, and the shared logic modules as they run in that zone
 * (their effects and conditions must make sense there). Problems in the
 * modules are reported against `logic.json`.
 */
export function checkZone(z: ZoneData, code: CodeContract, logic: LogicData = { modules: [] }, file = z.id + '.json', logicFile = 'logic.json'): string[] {
  const errs: string[] = [];
  let at = file;
  const err = (where: string, msg: string) => errs.push(at + (where ? ' › ' + where : '') + ': ' + msg);
  const keys = (o: object, kind: string, where: string) => {
    for (const k of Object.keys(o)) if (!KEYS[kind].includes(k)) err(where, `unknown field "${k}" (a typo?)`);
  };
  const dupes = (ids: string[], where: string, what: string) => {
    const seen = new Set<string>();
    ids.forEach((id) => { if (seen.has(id)) err(where, `${what} "${id}" appears twice`); seen.add(id); });
  };

  keys(z, 'zone', '');
  const goalIds = new Set(z.goals.map((g) => g.id));

  // ---------- state ----------
  for (const k of code.state) if (!(k in z.state)) err('state', `missing "${k}" (the code needs a starting value)`);
  for (const k of Object.keys(z.state)) if (!code.state.includes(k)) err('state', `"${k}" is not a state key the code knows (${code.state.join(', ')})`);

  // ---------- texts ----------
  const isLine = (v: unknown) => Array.isArray(v) && v.length >= 2 && v.length <= 3 && typeof v[0] === 'string' && typeof v[1] === 'string' && (v[2] === undefined || TONES.includes(v[2] as string));
  for (const [k, want] of Object.entries(code.texts)) {
    const v = z.texts[k];
    if (v === undefined) err('texts', `missing "${k}" (the code asks for it)`);
    else if (want === 'line' && !isLine(v)) err(`texts.${k}`, 'should be a line: ["command", "reply", "ok"|"err"|"dim"?]');
    else if (want === 'label' && typeof v !== 'string') err(`texts.${k}`, 'should be a plain string');
  }
  for (const [k, v] of Object.entries(z.texts)) if (Array.isArray(v) && !isLine(v)) err(`texts.${k}`, 'not a valid line: ["command", "reply", "ok"|"err"|"dim"?]');
  const line = (ref: LineRef, where: string) => {
    if (typeof ref === 'string') {
      if (!(ref in z.texts)) err(where, `no text "${ref}" in texts`);
      else if (!isLine(z.texts[ref])) err(where, `text "${ref}" is a label, not a line`);
    } else if (!isLine(ref)) err(where, 'not a valid line: ["command", "reply", "ok"|"err"|"dim"?]');
  };

  // ---------- conditions and actions ----------
  const cond = (c: Cond | undefined, known: Set<string>, where: string) => {
    if (c === undefined) return;
    const key = c.replace(/^!/, '').split('=')[0];
    if (!known.has(key)) err(where, `condition "${c}": unknown key "${key}"`);
  };
  const action = (a: Action, where: string, known: Set<string>, writable: Set<string>, events: string[] | null) => {
    keys(a, 'action', where);
    const which = ACTION_KEYS.filter((k) => k in a);
    if (which.length !== 1) { err(where, `needs exactly one of ${ACTION_KEYS.join(' / ')}`); return; }
    cond(a.if, known, where);
    if ('set' in a) { if (!writable.has(a.set)) err(where, `cannot set "${a.set}": not a state key`); if (!('to' in a)) err(where, 'set needs "to"'); }
    else if ('to' in a) err(where, '"to" only goes with "set"');
    if ('open' in a && !code.panels.includes(a.open)) err(where, `unknown panel "${a.open}" (${code.panels.join(', ')})`);
    if ('effect' in a && !code.effects.includes(a.effect)) err(where, `unknown effect "${a.effect}" (code has: ${code.effects.join(', ')})`);
    if ('goal' in a && !goalIds.has(a.goal)) err(where, `unknown goal "${a.goal}"`);
    if ('emit' in a) {
      if (!events) err(where, 'emit only works on a noun');
      else if (!events.includes(a.emit)) err(where, `this noun has no event "${a.emit}" (add it to "events")`);
    }
  };

  const zoneKnown = new Set([...Object.keys(z.state), ...code.derived, 'signal']);
  const zoneWritable = new Set(Object.keys(z.state));

  // ---------- devices ----------
  const nounsOf = new Map<string, Map<string, { verbs: string[]; events: string[] }>>();
  const device = (d: DeviceData, where: string) => {
    keys(d, 'device', where);
    const local = Object.keys(d.state ?? {});
    const known = new Set([...zoneKnown, ...local]);
    const writable = new Set([...zoneWritable, ...local]);
    const status: StatusPart[] = typeof d.status === 'string' ? [d.status] : d.status;
    status.forEach((p, i) => { if (typeof p !== 'string') cond(p.if, known, `${where} › status[${i}]`); });
    dupes(d.nouns.map((n) => n.id), where, 'noun');
    const nouns = new Map<string, { verbs: string[]; events: string[] }>();
    for (const n of d.nouns) {
      const w = `${where} › nouns[${n.id}]`;
      keys(n, 'noun', w);
      if (!KINDS.includes(n.kind)) err(w, `kind "${n.kind}" is not one of ${KINDS.join(' / ')}`);
      if (!n.verbs.length) err(w, 'has no verbs');
      dupes(n.verbs, w, 'verb');
      if (n.current !== undefined && !known.has(n.current)) err(w, `current: unknown key "${n.current}"`);
      for (const v of Object.keys(n.on)) if (v !== '*' && !n.verbs.includes(v)) err(`${w} › on`, `"${v}" is not one of its verbs`);
      for (const v of n.verbs) if (!(v in n.on) && !('*' in n.on)) err(`${w} › on`, `verb "${v}" does nothing (add it, or a "*" entry)`);
      for (const [v, cases] of Object.entries(n.on)) {
        list<Case>(cases).forEach((c, i) => {
          const wc = `${w} › on.${v}` + (Array.isArray(cases) ? `[${i}]` : '');
          keys(c, 'case', wc);
          cond(c.if, known, wc);
          (c.do ?? []).forEach((a, j) => action(a, `${wc} › do[${j}]`, known, writable, n.events ?? []));
          if (c.say !== undefined) line(c.say, `${wc} › say`);
        });
        if (Array.isArray(cases) && cases.slice(0, -1).some((c) => c.if === undefined)) err(`${w} › on.${v}`, 'only the last case may have no "if" (the ones after it never run)');
      }
      nouns.set(n.id, { verbs: n.verbs, events: n.events ?? [] });
    }
    nounsOf.set(d.id, nouns);
  };
  dupes(z.devices.map((d) => d.id), 'devices', 'device id');
  z.devices.forEach((d) => device(d, `devices[${d.id}]`));

  // ---------- logic modules (shared; checked as they run in this zone) ----------
  at = logicFile;
  keys(logic, 'logic', '');
  dupes(logic.modules.map((m) => m.id), 'modules', 'module');
  dupes(logic.modules.map((m) => m.part.id), 'modules', 'part id');
  logic.modules.forEach((m, i) => {
    const w = `modules[${m.id ?? i}]`;
    keys(m, 'module', w);
    if (!/^[\w-]+\.so$/.test(m.id)) err(w, 'a module id is a file name ending in .so');
    if (m.id === 'legs.so') err(w, "legs.so is Downtown's own module (the save keeps it as `jump`)");
    if (m.start !== undefined && typeof m.start !== 'boolean') err(w, 'start is true or false');
    if (m.foundIn !== undefined && m.foundIn !== null && typeof m.foundIn !== 'string') err(w, 'foundIn is a zone id or null');
    if (z.devices.some((d) => d.id === m.part.id)) err(w, `part id "${m.part.id}" is also a device in ${file}`);
    if (/\d$/.test(m.part.id)) err(w, `part id "${m.part.id}" must not end in a digit (placed copies add a counter)`);
    device(m.part, `${w} › part`);
  });
  at = file;

  // ---------- cables (only between devices that exist from the start) ----------
  z.cables.forEach((c, i) => {
    const w = `cables[${i}]`;
    keys(c, 'cable', w);
    const [fd, fn, ev] = c.from.split(/[.:]/);
    const from = nounsOf.get(fd)?.get(fn);
    if (!z.devices.some((d) => d.id === fd) || !from) err(w, `from "${c.from}": no such device.noun`);
    else if (!from.events.includes(ev)) err(w, `from "${c.from}": ${fd}.${fn} has no event "${ev}"`);
    const [td, tn] = c.to.split('.');
    const to = nounsOf.get(td)?.get(tn);
    if (!z.devices.some((d) => d.id === td) || !to) err(w, `to "${c.to}": no such device.noun`);
    else if (!to.verbs.includes(c.verb)) err(w, `verb "${c.verb}" is not one of ${c.to}'s verbs`);
  });

  // ---------- bench (crafting, later) ----------
  if (z.bench) {
    dupes(z.bench.parts, 'bench.parts', 'part');
    z.bench.recipes.forEach((r, i) => {
      const w = `bench.recipes[${i}]`;
      keys(r, 'recipe', w);
      if (r.parts.length !== 2) err(w, 'a recipe takes exactly two parts');
      r.parts.forEach((p) => { if (!z.bench!.parts.includes(p)) err(w, `part "${p}" is not in bench.parts`); });
      if (!logic.modules.some((m) => m.part.id === r.makes)) err(w, `makes "${r.makes}": not a logic part in ${logicFile}`);
      line(r.say, `${w} › say`);
    });
    dupes(z.bench.recipes.map((r) => [...r.parts].sort().join('+')), 'bench.recipes', 'recipe');
  }

  // ---------- camera ----------
  z.camera.crates.forEach((c, i) => keys(c, 'crate', `camera.crates[${i}]`));
  dupes(z.camera.crates.map((c) => c.id), 'camera.crates', 'crate');
  if ('parcel' in z.state && !z.camera.crates.some((c) => c.id === z.state.parcel)) err('state.parcel', `"${z.state.parcel}" is not a crate`);

  // ---------- dialogue ----------
  for (const [id, dl] of Object.entries(z.dialogue)) {
    const w = `dialogue.${id}`;
    keys(dl, 'dialogue', w);
    const nodes = dl.nodes;
    const exists = (n: string) => n in nodes;
    if (!exists(dl.start)) err(w, `start "${dl.start}" is not a node`);
    for (const [nid, variants] of Object.entries(nodes)) {
      list<DialogueNode>(variants).forEach((n, i) => {
        const wn = `${w} › nodes.${nid}` + (Array.isArray(variants) ? `[${i}]` : '');
        keys(n, 'node', wn);
        cond(n.if, zoneKnown, wn);
        (n.do ?? []).forEach((a, j) => action(a, `${wn} › do[${j}]`, zoneKnown, zoneWritable, null));
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
  for (const g of code.goals) if (!goalIds.has(g)) err('goals', `missing goal "${g}" (the code ticks it)`);

  return errs;
}
