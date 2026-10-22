import type {TypedForm} from './typed-form';
import type {SceneData} from '../data/types';
import {MOVER_EASES,moverLegs} from '../engine/movers';
/**
 * Typed controls for the Circuit's movers and zones in the device document (engine/movers.ts,
 * engine/zones.ts): each stop's place (a number, a named place of the artwork, a device's spot, a point on
 * both axes), the optional mover settings (speed, ms, ease, moving, follow, wired, paths), a path's legs and
 * choices, and the milestones a part reports. The generic field renderer draws the rest; every edit passes
 * the document's validation like any other.
 */
export interface MoverAuthoringContext {
  form: TypedForm;
  raw(): SceneData;
  edit(label: string, change: (d: SceneData) => void): void;
  change(path: (string | number)[], value: unknown): void;
  /** State keys the scene declares (what a mover may `set` or `follow`). */
  stateKeys(): string[];
  /** The physical milestones of the scene's code (`SceneRules.inputs`), and its named places (undefined: the code names none to pick from). */
  inputs(): string[];
  places(): string[] | undefined;
}
type Path = (string | number)[];
const at = (d: unknown, path: Path) => path.reduce((v: any, k) => v[k], d);
const NUMBER_REFS = ['speed', 'ms', 'minMs', 'plus'];
const LEG_OPTIONS: Record<string, unknown> = { ms: 500, share: 1, speed: 100, minMs: 0, ease: 'linear', load: 'load' };
const MOVER_OPTIONS: Record<string, unknown> = { speed: 100, ms: 500, ease: 'linear', moving: 'moving', wired: false };

/** A mover's events are `started`, `arrived` and its legs' own: after a leg or a path goes, the events nothing raises go with it. */
const pruneEvents = (noun: any) => {
  const used = new Set<string>(['started', 'arrived']);
  for (const steps of Object.values(noun.mover?.paths ?? {})) for (const leg of moverLegs(steps as never)) if (leg.event) used.add(leg.event);
  if (noun.events) noun.events = noun.events.filter((e: string) => used.has(e));
};
const coordKind = (v: unknown) => typeof v === 'number' ? 'number' : v && typeof v === 'object' && 'place' in v ? 'place' : v && typeof v === 'object' && 'spot' in v ? 'spot' : 'point';

/** Draws the controls for the mover/zone/milestone value at `path` (relative: the part's `nouns` entry is `nouns`, i). True when it drew the value completely, false to let the generic renderer draw it. */
export function renderMoverField(c: MoverAuthoringContext, parent: HTMLElement, value: unknown, path: Path): boolean {
  const ni = path.indexOf('nouns');
  if (ni < 0) return false;
  const rest = path.slice(ni + 2), head = rest[0], key = String(path.at(-1)), name = path.join(' · ');
  if (head !== 'mover' && head !== 'zone' && head !== 'milestone') return false;
  const { form } = c, d = c.raw(), part = path.slice(0, ni + 2), noun = at(d, part), partName = String(noun.id);
  const tuning = Object.keys(d.tuning ?? {}), spots = d.devices.filter((x) => x.layout?.spot).map((x) => x.id);
  const mover = head === 'mover' ? at(d, [...part, 'mover']) : undefined;
  const stopNames = (m: any) => Object.keys(m?.stops ?? {});

  // --- the milestones a part reports: event → the code's physical input
  if (head === 'milestone') {
    if (rest.length === 2 && typeof value === 'string') {
      form.select(parent, name, c.inputs(), value, (v) => c.change(path, v));
      form.button(parent, 'Stop reporting ' + key + ' of ' + partName, () => c.edit('Remove milestone', (x) => { const n = at(x, part); delete n.milestone[key]; if (!Object.keys(n.milestone).length) delete n.milestone; }));
      return true;
    }
    if (rest.length === 1) {
      const free = (noun.events ?? []).filter((e: string) => !(e in (noun.milestone ?? {})));
      if (free.length) form.button(parent, 'Report ' + free[0] + ' of ' + partName + ' as a milestone', () => c.edit('Add milestone', (x) => { at(x, part).milestone[free[0]] = c.inputs()[0]; }), !c.inputs().length);
    }
    return false;
  }

  const inMilestoneHost = () => {
    if (!('milestone' in noun) && c.inputs().length && (noun.events ?? []).length) form.button(parent, 'Report the events of ' + partName + ' as milestones', () => c.edit('Add milestone', (x) => { const n = at(x, part); n.milestone = { [(n.events ?? [])[0]]: c.inputs()[0] }; }));
  };

  const pointCoord = head === 'mover' && rest[1] === 'stops' && rest.length === 4 && (key === 'x' || key === 'h');
  const coordKindSelect = (v: unknown) => form.select(parent, name + ' kind', ['number', 'place', 'spot'], coordKind(v), (k) => c.edit('Change point coordinate kind', (x) => { at(x, path.slice(0, -1))[key] = k === 'number' ? (typeof v === 'number' ? v : 0) : k === 'place' ? { place: c.places()?.[0] ?? '' } : { spot: d.devices.find((y) => y.layout?.spot)?.id ?? '' }; }));

  // --- strings and numbers anywhere inside a mover or zone
  if (typeof value === 'string' || typeof value === 'number') {
    if (pointCoord && typeof value === 'number') { coordKindSelect(value); return false; }
    if (key === 'place' && typeof value === 'string') { const names = c.places(); if (names) { form.select(parent, name, names.includes(value) ? names : [value, ...names], value, (v) => c.change(path, v)); return true; } return false; }
    if (key === 'spot' && typeof value === 'string') { form.select(parent, name, spots.includes(value) ? spots : [value, ...spots], value, (v) => c.change(path, v)); return true; }
    if (key === 'edge' && typeof value === 'string') { form.select(parent, name, ['left', 'center', 'right'], value, (v) => c.change(path, v)); return true; }
    if (head === 'mover' && key === 'follow' && typeof value === 'string') {
      form.select(parent, name, c.stateKeys(), value, (v) => c.change(path, v));
      form.button(parent, 'Stop following ' + value, () => c.edit('Remove follow', (x) => { delete at(x, path.slice(0, -1)).follow; }));
      return true;
    }
    if (head === 'mover' && key === 'to' && typeof value === 'string' && rest.includes('paths')) {
      form.select(parent, name, stopNames(mover), value, (v) => c.change(path, v));
      form.button(parent, 'Make ' + name + ' a leg that stays', () => c.edit('Leg stays', (x) => { delete at(x, path.slice(0, -1)).to; }));
      return true;
    }
    if (head === 'mover' && key === 'ease' && typeof value === 'string') {
      form.select(parent, name, [...MOVER_EASES, 'timing table'], value, (v) => c.change(path, v === 'timing table' ? [[0.5, 0.5]] : v));
      return true;
    }
    // (a stop or a path may carry any name: only a setting of the mover, a leg or a coordinate is a number reference)
    const named = rest[1] === 'stops' && rest.length === 3 || rest[1] === 'paths' && rest.length === 3;
    if (NUMBER_REFS.includes(key) && (head === 'mover' || head === 'zone') && !named) {
      if (typeof value === 'string') {
        form.select(parent, name, tuning.includes(value) ? tuning : [value, ...tuning], value, (v) => c.change(path, v));
        form.button(parent, 'Use a number for ' + name, () => c.change(path, Number(d.tuning?.[value]) || 0));
      } else {
        form.decimal(parent, name, value, (v) => c.change(path, v), key === 'plus' ? -1000000 : key === 'ms' || key === 'minMs' ? 0 : .000001, 10000000);
        form.button(parent, 'Use a tuning value for ' + name, () => c.change(path, tuning[0]), !tuning.length);
      }
      return true;
    }
    return false;
  }

  // --- arrays: an ease table, a path (or a choice's branch) of steps
  if (Array.isArray(value)) {
    if (key === 'ease') {
      value.forEach((_, i) => form.button(parent, 'Remove point ' + (i + 1) + ' of ' + name, () => c.edit('Remove ease point', (x) => { at(x, path).splice(i, 1); }), value.length <= 1));
      form.button(parent, 'Add point to ' + name, () => c.edit('Add ease point', (x) => { const t = at(x, path); t.push([Math.min(0.9, Math.max(0.1, ...t.map((p: number[]) => p[0] + 0.1))), 0.5]); }), value.length >= 32);
      form.button(parent, 'Use a named curve for ' + name, () => c.change(path, 'smooth'));
      return false;
    }
    const steps = (rest[1] === 'paths' && rest.length === 3) || key === 'then' || key === 'else';
    if (head === 'mover' && steps) {
      value.forEach((_, i) => {
        form.button(parent, 'Remove step ' + (i + 1) + ' of ' + name, () => c.edit('Remove path step', (x) => { at(x, path).splice(i, 1); pruneEvents(at(x, part)); }), value.length <= 1 && key !== 'else');
        for (const [dir, step] of [['up', -1], ['down', 1]] as const) form.button(parent, 'Move step ' + (i + 1) + ' of ' + name + ' ' + dir, () => c.edit('Reorder path steps', (x) => { const r = at(x, path); [r[i], r[i + step]] = [r[i + step], r[i]]; }), i + step < 0 || i + step >= value.length);
      });
      form.button(parent, 'Add leg to ' + name, () => c.edit('Add path leg', (x) => { const m = at(x, [...part, 'mover']); at(x, path).push({ to: stopNames(m)[0], ...(m.speed === undefined && m.ms === undefined ? { ms: 500 } : {}) }); }), value.length >= 32);
      form.button(parent, 'Add choice to ' + name, () => c.edit('Add path choice', (x) => { const m = at(x, [...part, 'mover']); const s = stopNames(m)[0]; at(x, path).push({ if: c.stateKeys()[0] ?? 'signal', then: [{ to: s, ...(m.speed === undefined && m.ms === undefined ? { ms: 500 } : {}) }] }); }), value.length >= 32);
    }
    return false;
  }

  // --- objects
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, any>;
  if (head === 'mover' && rest.length === 1) {
    for (const [opt, def] of Object.entries(MOVER_OPTIONS)) {
      if (opt in obj) { if (opt !== 'wired') form.button(parent, 'Remove ' + opt + ' of ' + name, () => c.edit('Remove mover setting', (x) => { delete at(x, path)[opt]; })); else form.button(parent, 'Remove wired of ' + name, () => c.edit('Remove mover setting', (x) => { delete at(x, path).wired; })); }
      else form.button(parent, 'Set ' + opt + ' of ' + name, () => c.edit('Add mover setting', (x) => { at(x, path)[opt] = def; }));
    }
    if (!('follow' in obj)) form.button(parent, 'Follow a state key with ' + name, () => c.edit('Add follow', (x) => { const k = c.stateKeys()[0]; if (!k) throw Error('Declare a native state first'); at(x, path).follow = k; }));
    if (!('paths' in obj)) form.button(parent, 'Add paths to ' + name, () => c.edit('Add mover paths', (x) => { at(x, path).paths = {}; }));
    inMilestoneHost();
    return false;
  }
  if (head === 'mover' && rest[1] === 'stops' && rest.length === 2) {
    const names = Object.keys(obj);
    for (const stop of names) form.select(parent, 'Stop ' + stop + ' kind', ['number', 'place', 'spot', 'point'], coordKind(obj[stop]), (k) => c.edit('Change stop kind', (x) => {
      const s = at(x, path), v = s[stop], num = typeof v === 'number' ? v : 0, sp = d.devices.find((y) => y.layout?.spot)?.id ?? '';
      s[stop] = k === 'number' ? num : k === 'place' ? { place: c.places()?.[0] ?? String(stop) } : k === 'spot' ? { spot: sp } : { x: num, h: 0 };
    }));
    return false;
  }
  if (pointCoord) coordKindSelect(obj);
  // a place or a spot may be moved on, and a spot taken from an edge
  if ('place' in obj || 'spot' in obj) {
    if (!('plus' in obj)) form.button(parent, 'Set plus of ' + name, () => c.edit('Move place on', (x) => { at(x, path).plus = 0; }));
    else form.button(parent, 'Remove plus of ' + name, () => c.edit('Remove place offset', (x) => { delete at(x, path).plus; }));
    if ('spot' in obj) {
      if (!('edge' in obj)) form.button(parent, 'Set edge of ' + name, () => c.edit('Take spot edge', (x) => { at(x, path).edge = 'center'; }));
      else form.button(parent, 'Remove edge of ' + name, () => c.edit('Remove spot edge', (x) => { delete at(x, path).edge; }));
    }
    return false;
  }
  if (pointCoord) return false;
  if (head === 'mover' && rest[1] === 'paths' && rest.length === 2) {
    form.button(parent, 'Add path to ' + path.slice(0, -1).join(' · '), () => c.edit('Add mover path', (x) => { const p = at(x, path), m = at(x, [...part, 'mover']); let i = 1; while (('path' + i) in p) i++; p['path' + i] = [{ to: stopNames(m)[0], ...(m.speed === undefined && m.ms === undefined ? { ms: 500 } : {}) }]; }), Object.keys(obj).length >= 16);
    for (const p of Object.keys(obj)) {
      form.text(parent, 'Rename path ' + p, p, (v) => { const next = v.trim(); if (!next || next === p) return; c.edit('Rename mover path', (x) => { const paths = at(x, path); if (next in paths) throw Error('Choose an unused path name'); at(x, path.slice(0, -1)).paths = Object.fromEntries(Object.entries(paths).map(([k, s]) => [k === p ? next : k, s])); }); });
      form.button(parent, 'Remove path ' + p, () => c.edit('Remove mover path', (x) => { delete at(x, path)[p]; pruneEvents(at(x, part)); }));
    }
    return false;
  }
  if (head === 'mover' && rest.includes('paths') && rest.length >= 4 && typeof path.at(-1) === 'number') {
    // a leg, or a choice, in a path
    if ('if' in obj) {
      if (!('else' in obj)) form.button(parent, 'Add else to ' + name, () => c.edit('Add choice else', (x) => { const m = at(x, [...part, 'mover']); at(x, path).else = [{ to: stopNames(m)[0], ...(m.speed === undefined && m.ms === undefined ? { ms: 500 } : {}) }]; }));
      else form.button(parent, 'Remove else of ' + name, () => c.edit('Remove choice else', (x) => { delete at(x, path).else; }));
      return false;
    }
    for (const [opt, def] of Object.entries(LEG_OPTIONS)) {
      if (opt in obj) form.button(parent, 'Remove ' + opt + ' of ' + name, () => c.edit('Remove leg setting', (x) => { delete at(x, path)[opt]; }));
      else form.button(parent, 'Set ' + opt + ' of ' + name, () => c.edit('Add leg setting', (x) => { at(x, path)[opt] = def; }));
    }
    if (!('event' in obj)) form.button(parent, 'Raise an event at the end of ' + name, () => c.edit('Add leg event', (x) => { const n = at(x, part); n.events ??= []; let i = 1; while (n.events.includes('leg-' + i)) i++; n.events.push('leg-' + i); at(x, path).event = 'leg-' + i; }));
    else form.button(parent, 'Remove event of ' + name, () => c.edit('Remove leg event', (x) => { delete at(x, path).event; pruneEvents(at(x, part)); }));
    if (!('to' in obj)) form.button(parent, 'Make ' + name + ' travel to a stop', () => c.edit('Leg travels', (x) => { at(x, path).to = stopNames(at(x, [...part, 'mover']))[0]; }));
    return false;
  }
  if (head === 'zone' && rest.length === 1) {
    for (const edge of ['from', 'to'] as const) form.select(parent, name + ' ' + edge + ' kind', ['number', 'place', 'spot'], coordKind(obj[edge]), (k) => c.edit('Change zone edge kind', (x) => { const z = at(x, path), v = z[edge]; z[edge] = k === 'number' ? (typeof v === 'number' ? v : 0) : k === 'place' ? { place: c.places()?.[0] ?? '' } : { spot: d.devices.find((y) => y.layout?.spot)?.id ?? '' }; }));
    inMilestoneHost();
    return false;
  }
  if (head === 'zone' && rest.length === 2 && (key === 'from' || key === 'to')) return false;
  return false;
}
