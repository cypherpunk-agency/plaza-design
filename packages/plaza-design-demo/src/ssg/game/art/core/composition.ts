/** Serializable artwork contracts. Controllers supply visual state; drawing never owns saves. */
import type { View } from './view';
import type { Light } from "../../world/light";
import type { Weather } from "../../world/weather";

export type Value = null | boolean | number | string | Value[] | { [key: string]: Value };
export type Properties = Record<string, Value>;
export interface Point { x: number; h: number }
export interface Bounds extends Point { w: number; tall: number }
export interface BoundsContext { view: View; placement: Readonly<Required<Placement>> }
export interface Anchor extends Point { role: 'surface' | 'mount' | 'handle' | 'entrance' | 'origin'; facing?: 1 | -1 }
export type Pass = 'backdrop' | 'devices' | 'people' | 'foreground';
/** Designer-facing scene layers, back to front. `logic` holds things that never draw (markers, exits). */
export type Layer = 'distance' | 'backdrop' | 'set' | 'playfield' | 'foreground' | 'logic';
export const LAYERS: readonly Layer[] = ['distance', 'backdrop', 'set', 'playfield', 'foreground', 'logic'];
/** Where the frame draws layered scene content relative to the player and the engine's own layers. */
export type LayerSlot = 'behind-player' | 'over-player' | 'foreground';
/** The single playfield row the player (and engine-drawn walkers) occupies in a layered composition. */
export const PLAYER_ROW = 'scene.player';
export interface Field {
  kind: 'number' | 'string' | 'boolean' | 'color' | 'select' | 'json';
  label: string;
  default: Value;
  min?: number; max?: number; step?: number; unit?: string;
  options?: (string | number)[];
  animatable?: boolean;
  /** Required for structured JSON fields; reject malformed nested data with a concrete error. */
  validate?: (value: Value) => void;
}
export interface Placement extends Point { scale?: number; facing?: 1 | -1; parallax?: number }
export interface Instance {
  id: string; type: string; props: Properties; placement: Placement;
  /** Draw order within the pass or layer. Layered compositions keep it as a hidden sort key. */
  order: number;
  /** Older per-scene drawing passes; a composition uses either `pass` or `layer` on every instance. */
  pass?: Pass;
  layer?: Layer;
  attach?: { instance: string; anchor: string };
  children?: Instance[];
  bindings?: Record<string, string>;
}
export interface Composition { version: 1; scene: string; instances: Instance[] }
export interface Environment {
  view: View;
  /** Named runtime state, resolved by a scene adapter before rendering. */
  state: Readonly<Record<string, Properties>>;
  /** Scene adapters resolve these named, typed sources; documents store only their stable names. */
  bindings?: Readonly<Record<string, Value>>;
  visibility?: Readonly<Record<string, boolean>>;
  opacity?: Readonly<Record<string, number>>;
  clips?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Timeline seconds. Ordinary scene frame clocks remain in View.t (60Hz units). */
  sequenceTime?: number;
  reduced: boolean;
  /** Supplied by the runtime/preview controller; kernels use only their relevant inputs. */
  lighting?: Light;
  weather?: Weather;
  day?: number;
  minute?: number;
  facing?: number;
  covers?: { from: number; to: number; under: number }[];
}
export interface AnimationClip {
  duration: number;
  loop: boolean;
  sample(seconds: number, props: Readonly<Properties>, state: Readonly<Properties>, channel: string): Value;
}
export interface Element {
  type: string; version: 1; label: string; category: string;
  fields: Record<string, Field>;
  visualFields?: Record<string, Field>;
  /** Presentation bindings carry no instance-owned simulation state. Native validators still protect required artwork. */
  bindingIdentity?: 'fixed' | 'presentation';
  /** Finite registered presentation inputs offered by the inspector; no expressions or scripts. */
  bindingChoices?: (composition:Readonly<Composition>)=>Readonly<Record<string,readonly string[]>>;
  validateVisual?: (state: Properties) => void;
  /** World kernels use explicit placement and retain the native viewport and canvas state. */
  coordinates?: 'local' | 'world';
  animationClips?: Record<string, AnimationClip>;
  parts: Pass[];
  /** Non-drawing elements that still belong in a visual layer: named groups and the player row. */
  role?: 'group' | 'player';
  bounds(props: Properties, state: Properties, context?: BoundsContext): Bounds;
  anchors(props: Properties, state: Properties): Record<string, Anchor>;
  draw(ctx: CanvasRenderingContext2D, view: View, props: Properties, state: Properties, pass: Pass, placement: Readonly<Required<Placement>>): void;
}

const passes: Pass[] = ['backdrop', 'devices', 'people', 'foreground'];
const flat = (nodes: readonly Instance[]): Instance[] => nodes.flatMap(n => [n, ...flat(n.children ?? [])]);
/** A composition is layered when its instances carry `layer`; validation rejects mixtures. */
export const isLayered = (doc: Readonly<Composition>) => flat(doc.instances).some(n => n.layer !== undefined);
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const owns = (v: object, key: string) => Object.prototype.hasOwnProperty.call(v, key);
function serializable(value: unknown, path = 'composition', stack = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || finite(value)) return;
  if (typeof value !== 'object' || stack.has(value!)) throw new Error(`${path}: non-serializable value/cycle`);
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error(`${path}: expected plain JSON data`);
  stack.add(value!);
  for (const [key, child] of Object.entries(value!)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error(`${path}: reserved key ${key}`);
    serializable(child, path + '.' + key, stack);
  }
  stack.delete(value!);
}
export class ArtRegistry {
  private elements = new Map<string, Element>();
  register(element: Element) {
    if (this.elements.has(element.type)) throw new Error(`Duplicate artwork type: ${element.type}`);
    for (const field of Object.values({ ...element.fields, ...element.visualFields })) if (field.kind === 'json' && !field.validate) throw new Error(`${element.type}: structured JSON fields require validation`);
    for (const [name, clip] of Object.entries(element.animationClips ?? {})) if (!name || !finite(clip.duration) || clip.duration <= 0 || typeof clip.loop !== 'boolean' || typeof clip.sample !== 'function') throw new Error(`${element.type}.${name}: invalid animation clip`);
    this.elements.set(element.type, element); return this;
  }
  get(type: string) { const e = this.elements.get(type); if (!e) throw new Error(`Unknown artwork type: ${type}`); return e; }
  catalog() { return [...this.elements.values()]; }
  properties(type: string, props: Properties): Properties {
    return this.fields(type, props, this.get(type).fields);
  }
  visualProperties(type: string, state: Properties): Properties {
    const e = this.get(type), result = this.fields(type, state, e.visualFields ?? {});
    e.validateVisual?.(result); return result;
  }
  private fields(type: string, props: Properties, fields: Record<string, Field>): Properties {
    const result: Properties = {};
    for (const key of Object.keys(props)) if (!owns(fields, key)) throw new Error(`${type}.${key}: unknown property`);
    for (const [key, field] of Object.entries(fields)) {
      const v = owns(props, key) ? props[key] : field.default;
      const valid = field.kind === 'json' ? true : field.kind === 'number' ? finite(v) && (field.min === undefined || v >= field.min) && (field.max === undefined || v <= field.max)
        : field.kind === 'boolean' ? typeof v === 'boolean' : field.kind === 'select' ? field.options?.includes(v as string | number)
        : typeof v === 'string' && (field.kind !== 'color' || /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(v));
      if (!valid) throw new Error(`${type}.${key}: invalid ${field.kind} value`);
      if (field.kind === 'json') serializable(v, `${type}.${key}`);
      field.validate?.(v);
      result[key] = structuredClone(v);
    }
    return result;
  }
  validate(input: unknown): Composition {
    serializable(input);
    if (!object(input) || input.version !== 1 || typeof input.scene !== 'string' || !Array.isArray(input.instances)) throw new Error('Invalid composition header/version');
    const all = new Map<string, Instance>(), parents = new Map<string, string>();
    const visit = (nodes: unknown[], parent?: string) => {
      for (const raw of nodes) {
        if (!object(raw) || typeof raw.id !== 'string' || !raw.id || all.has(raw.id)) throw new Error('Missing or duplicate instance id');
        if (typeof raw.type !== 'string' || !object(raw.props)) throw new Error(`${raw.id}: missing type/properties`);
        this.properties(raw.type, raw.props as Properties);
        const p = raw.placement;
        if (!object(p) || !finite(p.x) || !finite(p.h) || p.scale !== undefined && (!finite(p.scale) || p.scale <= 0) || p.facing !== undefined && p.facing !== 1 && p.facing !== -1 || p.parallax !== undefined && (!finite(p.parallax) || p.parallax < 0)) throw new Error(`${raw.id}: invalid placement`);
        if (!finite(raw.order) || (raw.layer === undefined ? !passes.includes(raw.pass as Pass) : !LAYERS.includes(raw.layer as Layer) || raw.pass !== undefined)) throw new Error(`${raw.id}: invalid drawing order/pass`);
        if (raw.bindings !== undefined && (!object(raw.bindings) || Object.values(raw.bindings).some(v => typeof v !== 'string'))) throw new Error(`${raw.id}: invalid bindings`);
        for (const key of Object.keys(raw.bindings ?? {})) if (!owns(this.get(raw.type).visualFields ?? {}, key)) throw new Error(`${raw.id}.${key}: unknown visual binding`);
        const node = raw as unknown as Instance; all.set(node.id, node); if (parent) parents.set(node.id, parent);
        if (node.attach && (!object(node.attach) || typeof node.attach.instance !== 'string' || typeof node.attach.anchor !== 'string')) throw new Error(`${raw.id}: invalid attachment`);
        if (node.children !== undefined) { if (!Array.isArray(node.children)) throw new Error(`${raw.id}: invalid children`); visit(node.children, node.id); }
      }
    };
    visit(input.instances);
    const nodes = [...all.values()];
    if (nodes.some(n => n.layer !== undefined)) {
      let players = 0;
      for (const n of nodes) {
        if (n.layer === undefined) throw new Error(`${n.id}: a layered composition needs a layer on every instance`);
        const e = this.get(n.type);
        if (e.role === 'player') { players++; if (n.layer !== 'playfield') throw new Error(`${n.id}: the player row belongs in the playfield`); continue; }
        if (e.role === 'group') continue;
        if (e.parts.length > 1) throw new Error(`${n.id}: multi-part artwork ${n.type} cannot be layered yet`);
        if ((e.parts.length === 0) !== (n.layer === 'logic')) throw new Error(`${n.id}: ${e.parts.length ? 'drawn artwork needs a visual layer' : 'non-drawing items belong in the logic layer'}`);
      }
      if (players !== 1) throw new Error('A layered composition needs exactly one player row');
    } else if (nodes.some(n => this.get(n.type).role === 'player')) throw new Error('The player row requires a layered composition');
    const visiting = new Set<string>(), done = new Set<string>();
    const check = (id: string) => {
      if (visiting.has(id)) throw new Error(`${id}: attachment/parent cycle`);
      if (done.has(id)) return; visiting.add(id);
      const node = all.get(id)!;
      const target = node.attach?.instance ?? parents.get(id);
      if (target) {
        const owner = all.get(target); if (!owner) throw new Error(`${id}: missing attachment ${target}`);
        if (node.attach && !(node.attach.anchor in this.get(owner.type).anchors(this.properties(owner.type, owner.props), {}))) throw new Error(`${id}: missing anchor ${node.attach.anchor}`);
        check(target);
      }
      visiting.delete(id); done.add(id);
    };
    for (const id of all.keys()) check(id);
    return structuredClone(input) as unknown as Composition;
  }
}

export interface Resolved { instance: Instance; placement: Required<Placement>; props: Properties; state: Properties; element: Element }
export function resolveComposition(registry: ArtRegistry, doc: Composition, env: Environment): Resolved[] {
  const all = new Map<string, Instance>(), parents = new Map<string, string>();
  const collect = (nodes: Instance[], parent?: string) => nodes.forEach(n => { all.set(n.id, n); if (parent) parents.set(n.id, parent); collect(n.children ?? [], n.id); });
  collect(doc.instances);
  const resolved = new Map<string, Resolved>();
  const resolve = (id: string): Resolved => {
    const had = resolved.get(id); if (had) return had;
    const n = all.get(id)!, p = n.placement, e = registry.get(n.type), props = registry.properties(n.type, n.props);
    const bound: Properties = {};
    for (const [key, source] of Object.entries(n.bindings ?? {})) {
      if (!env.bindings || !owns(env.bindings, source)) throw new Error(`${id}.${key}: unresolved visual binding ${source}`);
      bound[key] = env.bindings[source];
    }
    let state = registry.visualProperties(n.type, { ...bound, ...(env.state[n.id] ?? {}) });
    for (const [channel, name] of Object.entries(env.clips?.[n.id] ?? {})) {
      if (!owns(e.visualFields ?? {}, channel)) throw new Error(`${id}.${channel}: unknown animation channel`);
      const clip = e.animationClips?.[name];
      if (!clip) throw new Error(`${id}: unknown registered animation clip ${name}`);
      const time = env.sequenceTime ?? env.view.t / 60;
      if (!finite(time)) throw new Error(`${id}: invalid animation time`);
      const phase = clip.loop ? ((time % clip.duration) + clip.duration) % clip.duration : Math.max(0, Math.min(clip.duration, time));
      state = registry.visualProperties(n.type, { ...state, [channel]: clip.sample(phase, props, state, channel) });
    }
    let placement = { x: p.x, h: p.h, scale: p.scale ?? 1, facing: p.facing ?? 1, parallax: p.parallax ?? 1 };
    const target = n.attach?.instance ?? parents.get(id);
    if (target) {
      const owner = resolve(target), o = owner.placement;
      const a = n.attach ? owner.element.anchors(owner.props, owner.state)[n.attach.anchor] : { x: 0, h: 0 };
      if (!a) throw new Error(`${id}: unavailable anchor ${n.attach?.anchor}`);
      placement = { x: o.x + (a.x + p.x) * o.scale * o.facing, h: o.h + (a.h + p.h) * o.scale,
        scale: o.scale * placement.scale, facing: o.facing * placement.facing as 1 | -1, parallax: p.parallax ?? o.parallax };
    }
    const r = { instance: n, placement, props, state, element: e }; resolved.set(id, r); return r;
  };
  const rank = (n: Instance) => n.layer === undefined ? 0 : LAYERS.indexOf(n.layer);
  return [...all.keys()].map(resolve).sort((a, b) => rank(a.instance) - rank(b.instance) || a.instance.order - b.instance.order);
}

/** Group/attachment appearance follows the same parent relation as placement. */
export function compositionAppearance(doc: Composition, env: Pick<Environment, 'visibility' | 'opacity'>) {
  const nodes = new Map<string, Instance>(), parents = new Map<string, string>();
  const collect = (items: Instance[], parent?: string) => items.forEach(node => { nodes.set(node.id, node); if (parent) parents.set(node.id, parent); collect(node.children ?? [], node.id); });
  collect(doc.instances);
  const result = new Map<string, { visible: boolean; opacity: number }>(), visiting = new Set<string>();
  const resolve = (id: string): { visible: boolean; opacity: number } => {
    const cached = result.get(id); if (cached) return cached;
    const node = nodes.get(id); if (!node || visiting.has(id)) throw new Error(`${id}: invalid appearance attachment`);
    visiting.add(id);
    const alpha = env.opacity?.[id] ?? 1;
    if (!finite(alpha) || alpha < 0 || alpha > 1) throw new Error(`${id}: invalid animation opacity`);
    const target = node.attach?.instance ?? parents.get(id), parent = target ? resolve(target) : { visible: true, opacity: 1 };
    const value = { visible: parent.visible && env.visibility?.[id] !== false, opacity: parent.opacity * alpha };
    result.set(id, value); visiting.delete(id); return value;
  };
  nodes.forEach((_node, id) => resolve(id)); return result;
}

/** The identity transform leaves the original draw operations and fractional coordinates intact. */
export function drawComposition(ctx: CanvasRenderingContext2D, registry: ArtRegistry, doc: Composition, env: Environment, pass: Pass) {
  if (isLayered(doc)) { if (pass === 'backdrop' || pass === 'foreground') drawCompositionSlot(ctx, registry, doc, env, pass === 'backdrop' ? 'behind-player' : 'foreground'); return; }
  paint(ctx, doc, env, resolveComposition(registry, doc, env).filter(r => r.element.parts.length && (r.element.parts.length === 1 ? r.instance.pass === pass : r.element.parts.includes(pass))), () => pass);
}
/** Layered scenes: distance, backdrop, set and the playfield up to the player row; then the rest of the playfield; then the foreground. */
export function drawCompositionSlot(ctx: CanvasRenderingContext2D, registry: ArtRegistry, doc: Composition, env: Environment, slot: LayerSlot) {
  const rows = resolveComposition(registry, doc, env), player = rows.findIndex(r => r.element.role === 'player');
  const inSlot = (r: Resolved, index: number) => slot === 'foreground' ? r.instance.layer === 'foreground'
    : r.instance.layer === 'playfield' ? (slot === 'behind-player') === (index < player)
    : slot === 'behind-player' && r.instance.layer !== 'foreground' && r.instance.layer !== 'logic';
  paint(ctx, doc, env, rows.filter((r, index) => r.element.parts.length === 1 && inSlot(r, index)), r => r.element.parts[0]);
}
/** Cheap check from the document alone, so scenes can skip preparing an environment for an empty slot. */
export function slotHasContent(doc: Readonly<Composition>, slot: LayerSlot): boolean {
  const nodes = flat(doc.instances);
  if (slot === 'foreground') return nodes.some(n => n.layer === 'foreground');
  const player = nodes.find(n => n.layer === 'playfield' && n.type === PLAYER_ROW);
  if (!player) return slot === 'behind-player';
  const at = nodes.indexOf(player), after = (n: Instance) => n.order > player.order || n.order === player.order && nodes.indexOf(n) > at;
  return nodes.some(n => n.layer === 'playfield' && n !== player && (slot === 'over-player') === after(n));
}
function paint(ctx: CanvasRenderingContext2D, doc: Composition, env: Environment, rows: Resolved[], passOf: (r: Resolved) => Pass) {
  const appearance = compositionAppearance(doc, env);
  for (const r of rows) {
    const { visible, opacity } = appearance.get(r.instance.id)!;
    if (!visible) continue;
    if (opacity === 0) continue;
    const pass = passOf(r), p = r.placement, v = env.view;
    if (r.element.coordinates === 'world') {
      const transformed = p.scale !== 1 || p.facing !== 1 || opacity !== 1;
      if (transformed) {
        const ax = v.sx(p.x, p.parallax), ay = v.y(p.h);
        ctx.save(); ctx.translate(ax, ay); ctx.scale(p.scale * p.facing, p.scale); ctx.translate(-ax, -ay); ctx.globalAlpha *= opacity;
      }
      const world = p.parallax === 1 ? v : { ...v, sx: (wx: number, depth = p.parallax) => v.sx(wx, depth) };
      try { r.element.draw(ctx, world, r.props, r.state, pass, p); }
      finally { if (transformed) ctx.restore(); }
      continue;
    }
    ctx.save();
    ctx.globalAlpha *= opacity;
    const ox = v.sx(p.x, p.parallax), oy = v.y(p.h);
    ctx.translate(ox, oy); ctx.scale(p.scale * p.facing, p.scale);
    const local: View = { ...v, sx: (wx, depth = p.parallax) => (v.sx(p.x + wx * p.scale * p.facing, depth) - ox) / (p.scale * p.facing),
      y: h => (v.y(p.h + h * p.scale) - oy) / p.scale, gy: 0 };
    try { r.element.draw(ctx, local, r.props, r.state, pass, p); }
    finally { ctx.restore(); }
  }
}
