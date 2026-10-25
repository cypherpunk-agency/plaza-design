/** Serializable artwork contracts. Controllers supply visual state; drawing never owns saves. */
import type { View } from './view';
import type { Light } from "../../world/light";
import type { Weather } from "../../world/weather";
import {mobileInstances} from './mobility';
import {withCanvasTransform} from './geometry';

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
  /** How the inspector edits a structured JSON field instead of a text box (the stored value is unchanged). */
  editor?: FieldEditor;
  /** Shown in the inspector only when this holds for the instance's current props. */
  showIf?: (props: Properties) => boolean;
}
/**
 * Inspector controls for structured JSON values. `list`: rows of small fields (an array of objects), with
 * add and remove. `set`: checkboxes over `options` (an array of strings). With `auto`, the value can also be
 * the string "auto", shown as a checkbox with that label.
 */
export type FieldEditor =
  | { kind: 'list'; item: Record<string, Field>; auto?: string; addLabel?: string; next?: (rows: Properties[]) => Properties }
  | { kind: 'set'; options: readonly string[]; auto?: string }
  /** An optional colour: "" (shown as a checkbox labelled `empty`) or a #rrggbb colour. */
  | { kind: 'colour'; empty: string };
export interface Placement extends Point { scale?: number; facing?: 1 | -1; parallax?: number }
export interface Instance {
  id: string; type: string; props: Properties; placement: Placement;
  /** Draw order within the layer: a hidden sort key behind the editor's layer stack. */
  order: number;
  /** Where the instance draws (LAYERS). */
  layer: Layer;
  attach?: { instance: string; anchor: string };
  children?: Instance[];
  bindings?: Record<string, string>;
  /** Joined background layers default to the chunk window; isolated rooms and objects remain uncut. */
  clip?: 'none'|'chunk'|Bounds;
}
/** Clip coordinates belong to the source chunk, independently of an object's transform. */
export function artworkClip(instance:Instance,view:View):{x:number;y:number;width:number;height:number}|undefined{
 const policy=instance.clip??(view.artworkScope==='static'&&['distance','backdrop'].includes(instance.layer)?'chunk':'none');
 if(typeof policy==='object')return{x:view.sx(policy.x),y:view.y(policy.h),width:view.sx(policy.x+policy.w)-view.sx(policy.x),height:view.y(policy.h-policy.tall)-view.y(policy.h)};
 const window=policy==='chunk'&&view.zoneWindow;return window?{x:window.left,y:0,width:window.right-window.left,height:view.viewH}:undefined;
}
export interface Composition { version: 1; scene: string; instances: Instance[]; sequence?:import('./sequence').SequenceSettings }
export interface Environment {
  view: View;
  /** Source-derived travelling actors, combined with registered primitive mobility. */
  mobileArtwork?: ReadonlySet<string>;
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
  /** Registered artwork in the shared frame's sky pass; ordinary composition rows use world. */
  framePhase?:'sky';
  fields: Record<string, Field>;
  visualFields?: Record<string, Field>;
  /** Whether this primitive travels independently of its source chunk. Attachment children follow it. */
  mobility?:(props:Readonly<Properties>)=>boolean;
  /** Presentation bindings carry no instance-owned simulation state. Native validators still protect required artwork. */
  bindingIdentity?: 'fixed' | 'presentation';
  /** Finite registered presentation inputs offered by the inspector; no expressions or scripts. */
  bindingChoices?: (composition:Readonly<Composition>)=>Readonly<Record<string,readonly string[]>>;
  validateVisual?: (state: Properties) => void;
  /** World kernels use explicit placement and retain the native viewport and canvas state. */
  coordinates?: 'local' | 'world';
  /** Independently placeable using authored properties and shared environment inputs. No source scene or controller bindings required. Omitted entries require source context. */
  libraryUse?: 'reusable';
  animationClips?: Record<string, AnimationClip>;
  parts: Pass[];
  /** Non-drawing elements that still belong in a visual layer: named groups and the player row. */
  role?: 'group' | 'player';
  bounds(props: Properties, state: Properties, context?: BoundsContext): Bounds;
  /** Entire source-camera travel envelope relative to placement (including depth), for lifetime; bounds is the live hit rectangle. */
  travelBounds?: Element['bounds'];
  /** Native drawing mask, expressed as local bounds, also limiting enlarged editor hit areas. */
  pickClip?:(props:Properties,state:Properties,context:BoundsContext)=>Bounds|undefined;
  anchors(props: Properties, state: Properties): Record<string, Anchor>;
  draw(ctx: CanvasRenderingContext2D, view: View, props: Properties, state: Properties, pass: Pass, placement: Readonly<Required<Placement>>): void;
  /**
   * A piece the player passes through or behind (a walk-in building's wall edge, a stair's near handrail). While its
   * visual state `near` is set (engine/level.ts `levelNear`: the player is passing it), `draw` leaves its near part out
   * and this paints only that part, in the over-player slot, so the player is drawn between the two. At rest (`near` 0)
   * `draw` paints the whole piece as ever and this is not called.
   */
  drawNear?(ctx: CanvasRenderingContext2D, view: View, props: Properties, state: Properties, placement: Readonly<Required<Placement>>): void;
}
/** Is a resolved piece passing in front of the player this frame (its near part drawn over them)? */
export const nearPart = (r: Resolved) => !!r.element.drawNear && Number(r.state.near ?? 0) > 0;

const flat = (nodes: readonly Instance[]): Instance[] => nodes.flatMap(n => [n, ...flat(n.children ?? [])]);
/** A composition is layered when its instances carry `layer`; validation rejects mixtures. */
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
      // primitives are their own copy; only structured values need the isolating clone
      result[key] = v !== null && typeof v === 'object' ? structuredClone(v) : v;
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
        if (!finite(raw.order)) throw new Error(`${raw.id}: invalid drawing order`);
        if(raw.clip!==undefined&&raw.clip!=='none'&&raw.clip!=='chunk'&&(!object(raw.clip)||Object.keys(raw.clip).sort().join()!=='h,tall,w,x'||!['x','h','w','tall'].every(k=>finite((raw.clip as Record<string,unknown>)[k]))||Number(raw.clip.w)<=0||Number(raw.clip.tall)<=0))throw new Error(`${raw.id}: invalid artwork clip`);
        if (!LAYERS.includes(raw.layer as Layer)) throw new Error(`${raw.id}: ${raw.layer === undefined ? 'missing layer' : `unknown layer ${String(raw.layer)}`} (${LAYERS.join(', ')})`);
        if (raw.bindings !== undefined && (!object(raw.bindings) || Object.values(raw.bindings).some(v => typeof v !== 'string'))) throw new Error(`${raw.id}: invalid bindings`);
        for (const key of Object.keys(raw.bindings ?? {})) if (!owns(this.get(raw.type).visualFields ?? {}, key)) throw new Error(`${raw.id}.${key}: unknown visual binding`);
        const node = raw as unknown as Instance; all.set(node.id, node); if (parent) parents.set(node.id, parent);
        if (node.attach && (!object(node.attach) || typeof node.attach.instance !== 'string' || typeof node.attach.anchor !== 'string')) throw new Error(`${raw.id}: invalid attachment`);
        if (node.children !== undefined) { if (!Array.isArray(node.children)) throw new Error(`${raw.id}: invalid children`); visit(node.children, node.id); }
      }
    };
    visit(input.instances);
    const nodes = [...all.values()];
    {
      let players = 0;
      for (const n of nodes) {
        const e = this.get(n.type);
        if(e.framePhase==='sky'&&n.layer!=='distance')throw new Error(`${n.id}: sky artwork belongs in the distance layer`);
        if (e.role === 'player') { players++; if (n.layer !== 'playfield') throw new Error(`${n.id}: the player row belongs in the playfield`); continue; }
        if (e.role === 'group') continue;
        if (e.parts.length > 1) throw new Error(`${n.id}: multi-part artwork ${n.type} cannot be layered yet`);
        if ((e.parts.length === 0) !== (n.layer === 'logic')) throw new Error(`${n.id}: ${e.parts.length ? 'drawn artwork needs a visual layer' : 'non-drawing items belong in the logic layer'}`);
      }
      // A scene has at most one player row (a playable scene's spawn: its manifest names it); sequences (cutscenes, the
      // title) are watched, not played. Without a player row the whole playfield draws behind the player.
      if (input.scene.startsWith('sequence-') ? players !== 0 : players > 1) throw new Error(input.scene.startsWith('sequence-') ? 'A sequence has no player row' : 'A composition has at most one player row');
    }
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
/** An optional selection resolves only those rows and their attachment ancestors. */
export function resolveComposition(registry: ArtRegistry, doc: Composition, env: Environment, selection?:readonly string[]): Resolved[] {
  const all = new Map<string, Instance>(), parents = new Map<string, string>();
  const collect = (nodes: Instance[], parent?: string) => nodes.forEach(n => { all.set(n.id, n); if (parent) parents.set(n.id, parent); collect(n.children ?? [], n.id); });
  collect(doc.instances);
  const resolved = new Map<string, Resolved>();
  const resolve = (id: string): Resolved => {
    const had = resolved.get(id); if (had) return had;
    const n = all.get(id);if(!n)throw new Error('Missing composition instance: '+id);
    const p = n.placement, e = registry.get(n.type), props = registry.properties(n.type, n.props);
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
      const a = n.attach ? owner.element.anchors(owner.props, owner.state)[n.attach.anchor] : owner.element.role==='group' ? owner.element.anchors(owner.props,owner.state).origin??{x:0,h:0} : { x: 0, h: 0 };
      if (!a) throw new Error(`${id}: unavailable anchor ${n.attach?.anchor}`);
      placement = { x: o.x + (a.x + p.x) * o.scale * o.facing, h: o.h + (a.h + p.h) * o.scale,
        scale: o.scale * placement.scale, facing: o.facing * placement.facing as 1 | -1, parallax: p.parallax ?? o.parallax };
    }
    const r = { instance: n, placement, props, state, element: e }; resolved.set(id, r); return r;
  };
  const rank = (n: Instance) => n.layer === undefined ? 0 : LAYERS.indexOf(n.layer);
  return [...(selection??all.keys())].map(resolve).sort((a, b) => rank(a.instance) - rank(b.instance) || a.instance.order - b.instance.order);
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

/** The identity transform leaves the original draw operations and fractional coordinates intact.
 * `backdrop` draws everything behind the player and queues the rows over the player and the foreground for the
 * shared frame to draw at their own moments (see beginLayeredFrame / flushLayeredSlot); `foreground` draws the
 * foreground layer now. The engine's own passes (devices, people) have no composition rows. */
export function drawComposition(ctx: CanvasRenderingContext2D, registry: ArtRegistry, doc: Composition, env: Environment, pass: Pass) {
  if (pass === 'backdrop') { drawCompositionSlot(ctx, registry, doc, env, 'behind-player'); queueLayeredSlots(ctx, registry, doc, env); }
  else if (pass === 'foreground') { pending.foreground.delete(slotKey(doc,env)); drawCompositionSlot(ctx, registry, doc, env, 'foreground'); }
}
/** Layered scenes: distance, backdrop, set and the playfield up to the player row; then the rest of the playfield; then the foreground.
 * `only` limits the slot to some layers, for scenes that draw layers into different engine moments. */
export function drawCompositionSlot(ctx: CanvasRenderingContext2D, registry: ArtRegistry, doc: Composition, env: Environment, slot: LayerSlot, only?: readonly Layer[] | ((row: Resolved) => boolean),phase:'world'|'sky'='world') {
  const mobile=env.view.artworkScope?(env.mobileArtwork??mobileInstances(doc,registry)):undefined;
  const filter = typeof only === 'function' ? only : (r: Resolved) => !only || only.includes(r.instance.layer),keep=(r:Resolved)=>(r.element.framePhase??'world')===phase&&filter(r)&&(!mobile||(env.view.artworkScope==='mobile')===mobile.has(r.instance.id));
  const rows = resolveComposition(registry, doc, env), found = rows.findIndex(r => r.element.role === 'player'), player = found < 0 ? rows.length : found;
  const inSlot = (r: Resolved, index: number, s: LayerSlot) => s === 'foreground' ? r.instance.layer === 'foreground'
    : r.instance.layer === 'playfield' ? (s === 'behind-player') === (index < player)
    : s === 'behind-player' && r.instance.layer !== 'foreground' && r.instance.layer !== 'logic';
  const painting=phase==='sky'&&env.view.sharedLayers?{...env,view:{...env.view,sharedLayers:false}}:env;
  // over the player, first the near parts of the pieces behind them that they are passing (Element.drawNear), then the rows in front
  if (slot === 'over-player') paintSlot(ctx, doc, painting, slot, rows.filter((r, index) => r.element.parts.length === 1 && keep(r) && nearPart(r) && inSlot(r, index, 'behind-player')), r => r.element.parts[0], true);
  paintSlot(ctx, doc, painting, slot, rows.filter((r, index) => r.element.parts.length === 1 && keep(r) && inSlot(r, index, slot)), r => r.element.parts[0]);
}
/** Rows over the player and the foreground, waiting for their moment in the current frame (keyed by document, latest wins). */
const scopedKeys=new WeakMap<Composition,Partial<Record<'static'|'mobile',object>>>();
function slotKey(doc:Composition,env:Environment):object{const scope=env.view.artworkScope;if(!scope)return doc;let keys=scopedKeys.get(doc);if(!keys){keys={};scopedKeys.set(doc,keys);}return keys[scope]??= {};}
const pending = { 'over-player': new Map<object, () => void>(), foreground: new Map<object, () => void>() };
export function queueLayeredSlots(ctx: CanvasRenderingContext2D, registry: ArtRegistry, doc: Composition, env: Environment) {
  for (const slot of ['over-player', 'foreground'] as const)
    if (slotHasContent(doc, slot) || slot === 'over-player' && nearState(env)) pending[slot].set(slotKey(doc,env), () => drawCompositionSlot(ctx, registry, doc, env, slot)); else pending[slot].delete(slotKey(doc,env));
}
/** Drawing commands live only for this frame; they carry no simulation or saved state. */
const ordered:Record<LayerSlot,Map<Instance,{doc:Composition;draw:()=>void}>>={'behind-player':new Map(),'over-player':new Map(),foreground:new Map()};
function paintSlot(ctx:CanvasRenderingContext2D,doc:Composition,env:Environment,slot:LayerSlot,rows:Resolved[],passOf:(r:Resolved)=>Pass,near=false){
 if(!env.view.sharedLayers){paint(ctx,doc,env,rows,passOf,near);return;}
 const transform=ctx.getTransform(),appearance=compositionAppearance(doc,env);
 for(const row of rows)ordered[slot].set(row.instance,{doc,draw:()=>withCanvasTransform(ctx,transform,()=>paint(ctx,doc,env,[row],passOf,near,appearance))});
}
export function beginLayeredFrame(){pending['over-player'].clear();pending.foreground.clear();for(const rows of Object.values(ordered))rows.clear();}
export function flushLayeredSlot(slot:LayerSlot){
 if(slot!=='behind-player'){const draws=[...pending[slot].values()];pending[slot].clear();for(const draw of draws)draw();}
 const rows=[...ordered[slot]];ordered[slot].clear();
 rows.sort(([a,x],[b,y])=>LAYERS.indexOf(a.layer)-LAYERS.indexOf(b.layer)||a.order-b.order||x.doc.scene.localeCompare(y.doc.scene)||a.id.localeCompare(b.id));
 for(const[,row]of rows)row.draw();
}
/** Does the environment set any piece's `near` (its near part waits for the over-player slot)? */
const nearState = (env: Environment) => Object.values(env.state).some(s => Number(s.near ?? 0) > 0);
/** Cheap check from the document alone, so scenes can skip preparing an environment for an empty slot. */
export function slotHasContent(doc: Readonly<Composition>, slot: LayerSlot): boolean {
  const nodes = flat(doc.instances);
  if (slot === 'foreground') return nodes.some(n => n.layer === 'foreground');
  const player = nodes.find(n => n.layer === 'playfield' && n.type === PLAYER_ROW);
  if (!player) return slot === 'behind-player';
  const at = nodes.indexOf(player), after = (n: Instance) => n.order > player.order || n.order === player.order && nodes.indexOf(n) > at;
  return nodes.some(n => n.layer === 'playfield' && n !== player && (slot === 'over-player') === after(n));
}
function paint(ctx: CanvasRenderingContext2D, doc: Composition, env: Environment, rows: Resolved[], passOf: (r: Resolved) => Pass, near = false, appearance = compositionAppearance(doc, env)) {
  for (const r of rows) {
    const { visible, opacity } = appearance.get(r.instance.id)!;
    if (!visible) continue;
    if (opacity === 0) continue;
    const pass = passOf(r), p = r.placement, v = env.view;
    const clip=artworkClip(r.instance,v);
    if (clip) { ctx.save(); ctx.beginPath(); ctx.rect(clip.x,clip.y,clip.width,clip.height); ctx.clip(); }
    try {
    if (r.element.coordinates === 'world') {
      const transformed = p.scale !== 1 || p.facing !== 1 || opacity !== 1;
      if (transformed) {
        const ax = v.sx(p.x, p.parallax), ay = v.y(p.h);
        ctx.save(); ctx.translate(ax, ay); ctx.scale(p.scale * p.facing, p.scale); ctx.translate(-ax, -ay); ctx.globalAlpha *= opacity;
      }
      const world = p.parallax === 1 ? v : { ...v, sx: (wx: number, depth = p.parallax) => v.sx(wx, depth) };
      try { if (near) r.element.drawNear!(ctx, world, r.props, r.state, p); else r.element.draw(ctx, world, r.props, r.state, pass, p); }
      finally { if (transformed) ctx.restore(); }
      continue;
    }
    ctx.save();
    ctx.globalAlpha *= opacity;
    const ox = v.sx(p.x, p.parallax), oy = v.y(p.h);
    ctx.translate(ox, oy); ctx.scale(p.scale * p.facing, p.scale);
    const local: View = { ...v, sx: (wx, depth = p.parallax) => (v.sx(p.x + wx * p.scale * p.facing, depth) - ox) / (p.scale * p.facing),
      y: h => (v.y(p.h + h * p.scale) - oy) / p.scale, gy: 0 };
    try { if (near) r.element.drawNear!(ctx, local, r.props, r.state, p); else r.element.draw(ctx, local, r.props, r.state, pass, p); }
    finally { ctx.restore(); }
    } finally { if (clip) ctx.restore(); }
  }
}
