import {type FieldSemantics,validateFieldSemantics,fieldValueValid} from './fields';
/** Serializable artwork contracts. Controllers supply visual state; drawing never owns saves. */
import type { View } from './view';
import type { Light } from "../../world/light";
import type { Weather } from "../../world/weather";
import {mobileInstances} from './mobility';
import {withCanvasTransform,transformRect,copyTransform,projectedBounds} from './geometry';
import {prepareArtwork,type CapturedArtwork,type ArtworkPresentation} from './presentation';
import {measureArtwork} from './measure';
import {validateSpatialContract,type SpatialContract,type DerivedProperty} from './spatial';

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
export interface ArtworkPropertySource {scene:string;instance:string;property:string}
export interface Field {
  semantics?:FieldSemantics;
  /** Prepared dimensions/elevations replace a local fallback. Zero is absent unless explicitly admitted (e.g. an elevation with a -1 unset sentinel). Source bindings remain authoritative. */
  stateOverride?:{state:string;space:'local'|'world';allowZero?:boolean};
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
  | {kind:'contextual';section:string;label:string}
  | { kind:'tuple';items:Field[];empty?:string;auto?:string }
  | { kind:'array';item:Field;auto?:string;addLabel?:string;maxItems?:number;minItems?:number }
  | { kind: 'list'; item: Record<string, Field>; auto?: string; addLabel?: string; next?: (rows: Properties[]) => Properties }
  | { kind: 'set'; options: readonly string[]; auto?: string }
  /** An optional colour: "" (shown as a checkbox labelled `empty`) or a #rrggbb colour. */
  | { kind: 'colour'; empty: string };
export interface Placement extends Point { scale?: number; facing?: 1 | -1; parallax?: number }
export interface AssetInstance {
  id: string; type: string; props: Properties; placement: Placement;
  /** Draw order within the layer: a hidden sort key behind the editor's layer stack. */
  order: number;
  /** Where the instance draws (LAYERS). */
  layer: Layer;
  attach?: { instance: string; anchor: string };
  children?: AssetInstance[];
  bindings?: Record<string, string>;
  /** Joined background layers default to the chunk window; isolated rooms and objects remain uncut. */
  clip?: 'none'|'chunk'|Bounds;
}
export {artworkClip} from './geometry';
/** Chunk-local visual source. Composition (world/compositions.ts) arranges chunks, not these assets.
 * The persisted scene/instances fields retain source identity; no wrapper document is required. */
export interface ChunkDocument { version: 1; scene: string; instances: AssetInstance[]; sequence?:import('./sequence').SequenceSettings }
export interface Environment {
  view: View;
  /** Source-derived travelling actors, combined with registered primitive mobility. */
  mobileArtwork?: ReadonlySet<string>;
  /** Named runtime state, resolved by a scene adapter before rendering. */
  state: Readonly<Record<string, Properties>>;
  /** Scene adapters resolve these named, typed sources; documents store only their stable names. */
  bindings?: Readonly<Record<string, Value>>;
  /** Direct authored-property provenance from the existing binding compiler; never saved values. */
  bindingSources?:Readonly<Record<string,ArtworkPropertySource>>;
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
export interface AssetDefinition {
  spatial?:SpatialContract;
  /** Pure diagnostics derived from authored inputs; never another saved property copy. */
  derived?:(props:Readonly<Properties>)=>Readonly<Record<string,DerivedProperty>>;
  type: string; version: 1; label: string; category: string;
  /** Initial authoring layer; instances retain their editable authored layer. */
  defaultLayer?:Layer;
  /** Registered artwork in the shared frame's sky pass; ordinary composition rows use world. */
  framePhase?:'sky';
  fields: Record<string, Field>;
  validateProperties?:(props:Readonly<Properties>)=>void;
  visualFields?: Record<string, Field>;
  /** Whether this primitive travels independently of its source chunk. Attachment children follow it. */
  mobility?:(props:Readonly<Properties>)=>boolean;
  /** Presentation bindings carry no instance-owned simulation state. Native validators still protect required artwork. */
  bindingIdentity?: 'fixed' | 'presentation';
  /** Finite registered presentation inputs offered by the inspector; no expressions or scripts. */
  bindingChoices?: (composition:Readonly<ChunkDocument>)=>Readonly<Record<string,readonly string[]>>;
  validateVisual?: (state: Properties) => void;
  /** World kernels use explicit placement and retain the native viewport and canvas state. */
  coordinates?: 'local' | 'world';
  /** Independently placeable using authored properties and shared environment inputs. No source scene or controller bindings required. Omitted entries require source context. */
  libraryUse?: 'reusable';
  animationClips?: Record<string, AnimationClip>;
  parts: Pass[];
  /** Non-drawing elements that still belong in a visual layer: named groups and the player row. */
  role?: 'group' | 'player';
  /** One reason a piece is not drawn or picked this frame; absent means eligible. */
  hiddenReason?:(props:Properties,state:Properties,context:BoundsContext)=>string|undefined;
  /** Generators select their configured region, independent of current particles or viewport culling. */
  selection?: 'region';
  /** Explain authored drawing restrictions without hiding the generator's editable region. */
  drawingNote?:(props:Properties,state:Properties)=>string|undefined;
  /** Authored drawing window for editor explanation/handles; does not replace selection geometry. */
  drawingWindow?:(props:Properties,state:Properties,context:BoundsContext)=>{bounds:Bounds;from:string;to:string};
  bounds(props: Properties, state: Properties, context?: BoundsContext): Bounds;
  /** Entire source-camera travel envelope relative to placement (including depth), for lifetime; bounds is the live hit rectangle. */
  travelBounds?: AssetDefinition['bounds'];
  /** Native mask, applied once by the common painter and also limiting editor hit areas. */
  mask?:(props:Properties,state:Properties,context:BoundsContext)=>Bounds|undefined;
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

const flat = (nodes: readonly AssetInstance[]): AssetInstance[] => nodes.flatMap(n => [n, ...flat(n.children ?? [])]);
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
  private elements = new Map<string, AssetDefinition>();
  constructor(private readonly options:{requireSemantics?:boolean}={}){}
  register(element: AssetDefinition) {
    if (this.elements.has(element.type)) throw new Error(`Duplicate artwork type: ${element.type}`);
    for(const[key,field]of Object.entries(element.fields))validateFieldSemantics(field,element.type+'.'+key,this.options.requireSemantics);
    for(const[key,field]of Object.entries(element.fields))if(field.stateOverride){const input=element.visualFields?.[field.stateOverride.state];
      if(field.kind!=='number'||!['length','position'].includes(field.semantics?.quantity??'')||field.semantics?.unit!=='world units'||field.semantics?.space!=='local'||input?.kind!=='number'||!['local','world'].includes(field.stateOverride.space)||field.stateOverride.allowZero!==undefined&&typeof field.stateOverride.allowZero!=='boolean')throw Error(element.type+'.'+key+': a spatial override requires a numeric local length/position and declared numeric visual input');
    }
    validateSpatialContract(element.spatial,element.fields,element.type);
    if(this.options.requireSemantics){const defaults=this.fields(element.type,{},element.fields);element.validateProperties?.(defaults);
      const children=(field:Field,path:string)=>{const editor=field.editor,fields=editor?.kind==='list'?editor.item:editor?.kind==='array'?{item:editor.item}:editor?.kind==='tuple'?Object.fromEntries(editor.items.map((f,i)=>[String(i),f])):{};this.fields(path,{},fields);for(const[key,child]of Object.entries(fields))children(child,path+'.'+key);};
      for(const[key,field]of Object.entries(element.fields))children(field,element.type+'.'+key);
      if(!element.spatial)throw Error(element.type+': declare supported spatial controls or an explicit fixed-geometry reason');
    }
    for (const field of Object.values({ ...element.fields, ...element.visualFields })) if (field.kind === 'json' && !field.validate) throw new Error(`${element.type}: structured JSON fields require validation`);
    for (const [name, clip] of Object.entries(element.animationClips ?? {})) if (!name || !finite(clip.duration) || clip.duration <= 0 || typeof clip.loop !== 'boolean' || typeof clip.sample !== 'function') throw new Error(`${element.type}.${name}: invalid animation clip`);
    // Scalar inputs on standalone artwork are presentation properties. Explicit opt-outs
    // and structured/configuration fields remain non-animatable.
    if(element.libraryUse==='reusable'&&element.parts.length)element={...element,fields:Object.fromEntries(Object.entries(element.fields).map(([key,field])=>[key,{...field,animatable:field.animatable??(field.kind!=='json'&&!field.editor)}]))};
    this.elements.set(element.type, element); return this;
  }
  get(type: string) { const e = this.elements.get(type); if (!e) throw new Error(`Unknown artwork type: ${type}`); return e; }
  catalog() { return [...this.elements.values()]; }
  properties(type: string, props: Properties): Properties {
    const e=this.get(type),result=this.fields(type,props,e.fields);e.validateProperties?.(result);e.spatial?.validate?.(result);return result;
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
      const valid = fieldValueValid(field,v);
      if (!valid) throw new Error(`${type}.${key}: invalid ${field.kind} value${field.kind==='number'&&field.semantics?.unit==='integer'&&!Number.isInteger(v)?' (expected a whole number)':''}`);
      if (field.kind === 'json') serializable(v, `${type}.${key}`);
      field.validate?.(v);
      // Typed nested controls describe supplied values too, not just the add-row defaults.
      // Missing optional components retain the native kernel's own default; never materialize
      // another copy of those defaults into an authored JSON array/object.
      const editor=field.editor;
      if(Array.isArray(v)&&editor?.kind==='list')for(const [i,row]of v.entries()){
        if(!object(row))throw Error(`${type}.${key}[${i}]: expected an object row`);
        for(const [name,child]of Object.entries(editor.item))if(owns(row,name))this.fields(`${type}.${key}[${i}]`,{[name]:row[name]},{[name]:child});
      }
      if(Array.isArray(v)&&editor?.kind==='array')for(const [i,value]of v.entries())this.fields(`${type}.${key}[${i}]`,{item:value},{item:editor.item});
      if(Array.isArray(v)&&editor?.kind==='tuple')for(const [i,value]of v.entries()){const child=editor.items[i];if(!child)throw Error(`${type}.${key}: unexpected tuple component`);this.fields(`${type}.${key}[${i}]`,{item:value},{item:child});}
      // primitives are their own copy; only structured values need the isolating clone
      result[key] = v !== null && typeof v === 'object' ? structuredClone(v) : v;
    }
    return result;
  }
  validate(input: unknown): ChunkDocument {
    serializable(input);
    if (!object(input) || input.version !== 1 || typeof input.scene !== 'string' || !Array.isArray(input.instances)) throw new Error('Invalid composition header/version');
    const all = new Map<string, AssetInstance>(), parents = new Map<string, string>();
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
        const node = raw as unknown as AssetInstance; all.set(node.id, node); if (parent) parents.set(node.id, parent);
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
    return structuredClone(input) as unknown as ChunkDocument;
  }
}

export interface PropertyOverride {state:string;binding?:string;source?:ArtworkPropertySource}
export interface Resolved { propertyOverrides?:Readonly<Record<string,PropertyOverride>>; instance: AssetInstance; placement: Required<Placement>; props: Properties; state: Properties; element: AssetDefinition }
/** An optional selection resolves only those rows and their attachment ancestors. */
export function resolveComposition(registry: ArtRegistry, doc: ChunkDocument, env: Environment, selection?:readonly string[]): Resolved[] {
  const all = new Map<string, AssetInstance>(), parents = new Map<string, string>();
  const collect = (nodes: AssetInstance[], parent?: string) => nodes.forEach(n => { all.set(n.id, n); if (parent) parents.set(n.id, parent); collect(n.children ?? [], n.id); });
  collect(doc.instances);
  const resolved = new Map<string, Resolved>();
  const resolve = (id: string): Resolved => {
    const had = resolved.get(id); if (had) return had;
    const n = all.get(id);if(!n)throw new Error('Missing composition instance: '+id);
    const p = n.placement, e = registry.get(n.type), authoredProps = registry.properties(n.type, n.props);
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
      state = registry.visualProperties(n.type, { ...state, [channel]: clip.sample(phase, authoredProps, state, channel) });
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
    let props=authoredProps;const propertyOverrides:Record<string,PropertyOverride>={};
    for(const[key,field]of Object.entries(e.fields)){const link=field.stateOverride,value=link&&state[link.state];if(!link||typeof value!=='number'||!(value>0||link.allowZero&&value===0))continue;
      const explicit=owns(env.state[n.id]??{},link.state)||owns(env.clips?.[n.id]??{},link.state),binding=explicit?undefined:n.bindings?.[link.state],source=binding?env.bindingSources?.[binding]:undefined;
      if(props===authoredProps)props={...authoredProps};props[key]=value/(link.space==='world'?placement.scale:1);propertyOverrides[key]={state:link.state,...(binding?{binding}:{}),...(source?{source}:{})};
    }
    const r:Resolved = { instance: n, placement, props, state, element: e,...(Object.keys(propertyOverrides).length?{propertyOverrides}:{}) }; resolved.set(id, r); return r;
  };
  const rank = (n: AssetInstance) => n.layer === undefined ? 0 : LAYERS.indexOf(n.layer);
  return [...(selection??all.keys())].map(resolve).sort((a, b) => rank(a.instance) - rank(b.instance) || a.instance.order - b.instance.order);
}

/** Group/attachment appearance follows the same parent relation as placement. */
export function compositionAppearance(doc: ChunkDocument, env: Pick<Environment, 'visibility' | 'opacity'>) {
  const nodes = new Map<string, AssetInstance>(), parents = new Map<string, string>();
  const collect = (items: AssetInstance[], parent?: string) => items.forEach(node => { nodes.set(node.id, node); if (parent) parents.set(node.id, parent); collect(node.children ?? [], node.id); });
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
export function drawComposition(ctx: CanvasRenderingContext2D, registry: ArtRegistry, doc: ChunkDocument, env: Environment, pass: 'backdrop'|'foreground') {
  if (pass === 'backdrop') { drawCompositionSlot(ctx, registry, doc, env, 'behind-player'); queueLayeredSlots(ctx, registry, doc, env); }
  else if (pass === 'foreground') { drawCompositionSlot(ctx, registry, doc, env, 'foreground'); }
}
/** Immutable, frame-local source snapshot. Reused across its slots; never saved or stepped. */
interface PresentationSnapshot {registry:ArtRegistry;environment:Environment;rows:Resolved[];appearance:ReturnType<typeof compositionAppearance>;facts:Map<AssetInstance,ArtworkPresentation>}
let collectingFrame=false;
let presentationSnapshots=new WeakMap<Environment,Map<ChunkDocument,PresentationSnapshot>>();
function presentationSnapshot(registry:ArtRegistry,doc:ChunkDocument,env:Environment){
 let sources=presentationSnapshots.get(env);if(!sources){sources=new Map();presentationSnapshots.set(env,sources);}
 const found=collectingFrame?sources.get(doc):undefined;if(found?.registry===registry)return found;
 const environment={...env,mobileArtwork:env.mobileArtwork??mobileInstances(doc,registry)},rows=resolveComposition(registry,doc,environment),appearance=compositionAppearance(doc,environment);
 const parents=new Map(rows.flatMap(r=>(r.instance.children??[]).map(child=>[child.id,r.placement] as const))),byId=new Map(rows.map(r=>[r.instance.id,r]));
 const facts=new Map(rows.map(row=>[row.instance,prepareArtwork(row,doc,environment,appearance.get(row.instance.id)!,environment.mobileArtwork.has(row.instance.id),row.instance.attach?byId.get(row.instance.attach.instance)?.placement:parents.get(row.instance.id))]));
 const snapshot={registry,environment,rows,appearance,facts};if(collectingFrame){sources.set(doc,snapshot);presentationSnapshots.set(environment,new Map([[doc,snapshot]]));}return snapshot;
}
/** Layered scenes: distance, backdrop, set and the playfield up to the player row; then the rest of the playfield; then the foreground.
 * `only` limits the slot to some layers, for scenes that draw layers into different engine moments. */
export function drawCompositionSlot(ctx: CanvasRenderingContext2D, registry: ArtRegistry, doc: ChunkDocument, env: Environment, slot: LayerSlot, only?: readonly Layer[] | ((row: Resolved) => boolean),phase:'world'|'sky'='world',defer=false) {
  const directed=env.view.sequence?.artwork?.[doc.scene];if(directed){doc=directed.composition;const state={...env.state};for(const[id,values]of Object.entries(directed.state))state[id]={...state[id],...values};const clips={...env.clips};for(const[id,values]of Object.entries(directed.clips))clips[id]={...clips[id],...values};env={...env,state,visibility:{...env.visibility,...directed.visibility},opacity:{...env.opacity,...directed.opacity},clips};}
  const snapshot=presentationSnapshot(registry,doc,env);env=snapshot.environment;
  const mobile=env.view.artworkScope?env.mobileArtwork:undefined;
  const filter = typeof only === 'function' ? only : (r: Resolved) => !only || only.includes(r.instance.layer),keep=(r:Resolved)=>(r.element.framePhase??'world')===phase&&filter(r)&&(!mobile||(env.view.artworkScope==='mobile')===mobile.has(r.instance.id));
  const rows = snapshot.rows, found = rows.findIndex(r => r.element.role === 'player'), player = found < 0 ? rows.length : found;
  const inSlot = (r: Resolved, index: number, s: LayerSlot) => s === 'foreground' ? r.instance.layer === 'foreground'
    : r.instance.layer === 'playfield' ? (s === 'behind-player') === (index < player)
    : s === 'behind-player' && r.instance.layer !== 'foreground' && r.instance.layer !== 'logic';
  if(phase==='world'&&slot==='behind-player'&&captureHelper)for(const fact of snapshot.facts.values())if(!fact.row.element.parts.length)captureHelper(captureRecord(ctx,fact,slot,-1));
  const painting=phase==='sky'&&env.view.sharedLayers?presentationSnapshot(registry,doc,{...env,view:{...env.view,sharedLayers:false}}):snapshot;
  // over the player, first the near parts of the pieces behind them that they are passing (Element.drawNear), then the rows in front
  if (slot === 'over-player') paintSlot(ctx, doc, painting, slot, rows.filter((r, index) => r.element.parts.length === 1 && keep(r) && nearPart(r) && inSlot(r, index, 'behind-player')), r => r.element.parts[0], true,defer);
  paintSlot(ctx, doc, painting, slot, rows.filter((r, index) => r.element.parts.length === 1 && keep(r) && inSlot(r, index, slot)), r => r.element.parts[0],false,defer);
}
/** Collect prepared commands now; flushing never resolves a document or adds another queue. */
export function queueLayeredSlots(ctx:CanvasRenderingContext2D,registry:ArtRegistry,doc:ChunkDocument,env:Environment){
 for(const slot of ['over-player','foreground'] as const){
  for(const [id,command]of commands[slot])if(command.doc===doc&&command.scope===env.view.artworkScope)commands[slot].delete(id);
  drawCompositionSlot(ctx,registry,doc,env,slot,undefined,'world',true);
 }
}
const authoredOrder=new WeakMap<ChunkDocument,Map<AssetInstance,number>>();
function sourceOrder(doc:ChunkDocument,instance:AssetInstance){
 let indices=authoredOrder.get(doc);if(!indices){indices=new Map(flat(doc.instances).map((n,i)=>[n,i]));authoredOrder.set(doc,indices);}return indices.get(instance)!;
}
interface PaintCommand {doc:ChunkDocument;scope:View['artworkScope'];shared:boolean;draw:()=>void}
const commands:Record<LayerSlot,Map<AssetInstance,PaintCommand>>={'behind-player':new Map(),'over-player':new Map(),foreground:new Map()};
function paintSlot(ctx:CanvasRenderingContext2D,doc:ChunkDocument,snapshot:PresentationSnapshot,slot:LayerSlot,rows:Resolved[],passOf:(r:Resolved)=>Pass,near=false,defer=false){
 if(rows.length&&(closedSlots.has(slot)||flushingSlot===slot))throw new Error('Artwork submitted after slot flush or during painting: '+doc.scene+'/'+slot);
 const env=snapshot.environment,facts=rows.map(r=>snapshot.facts.get(r.instance)!);
 if(!env.view.sharedLayers&&!defer){for(const r of rows)commands[slot].delete(r.instance);paint(ctx,env,facts,passOf,near,slot);return;}
 const transform=copyTransform(ctx.getTransform());
 for(const fact of facts)commands[slot].set(fact.row.instance,{doc,scope:env.view.artworkScope,shared:!!env.view.sharedLayers,draw:()=>withCanvasTransform(ctx,transform,()=>paint(ctx,env,[fact],passOf,near,slot))});
}
let captureArtwork:((a:CapturedArtwork)=>void)|undefined,captureHelper:typeof captureArtwork;
let paintOrdinal=0,flushingSlot:LayerSlot|undefined;
const closedSlots=new Set<LayerSlot>();
function captureRecord(ctx:CanvasRenderingContext2D,prepared:ArtworkPresentation,slot:LayerSlot,paintOrder:number):CapturedArtwork{
 const matrix=copyTransform(ctx.getTransform()),r=prepared.row,window=r.element.drawingWindow?.(r.props,r.state,{view:prepared.view,placement:r.placement});return {...prepared,framingBounds:transformRect(prepared.bounds,matrix),drawingWindow:window?{...window,bounds:transformRect(projectedBounds(prepared.view,r.placement,window.bounds),matrix)}:undefined,bounds:transformRect(prepared.bounds,matrix),clip:prepared.clip?transformRect(prepared.clip,matrix):undefined,slot,canvasTransform:matrix,paintOrder};
}
export function endLayeredFrame(){captureArtwork=undefined;captureHelper=undefined;flushingSlot=undefined;closedSlots.clear();collectingFrame=false;presentationSnapshots=new WeakMap();for(const rows of Object.values(commands))rows.clear();}
export function beginLayeredFrame(capture?:typeof captureArtwork,helpers?:typeof captureHelper){endLayeredFrame();captureArtwork=capture;captureHelper=helpers;collectingFrame=true;paintOrdinal=0;}
export function flushLayeredSlot(slot:LayerSlot){
 const rows=[...commands[slot]];commands[slot].clear();
 if(rows.some(([,c])=>c.shared))rows.sort(([a,x],[b,y])=>LAYERS.indexOf(a.layer)-LAYERS.indexOf(b.layer)||a.order-b.order||x.doc.scene.localeCompare(y.doc.scene)||(x.doc===y.doc?sourceOrder(x.doc,a)-sourceOrder(y.doc,b):0));
 flushingSlot=slot;try{for(const[,row]of rows)row.draw();}finally{flushingSlot=undefined;closedSlots.add(slot);}
}
/** Cheap check from the document alone, so scenes can skip preparing an environment for an empty slot. */
export function slotHasContent(doc: Readonly<ChunkDocument>, slot: LayerSlot): boolean {
  const nodes = flat(doc.instances);
  if (slot === 'foreground') return nodes.some(n => n.layer === 'foreground');
  const player = nodes.find(n => n.layer === 'playfield' && n.type === PLAYER_ROW);
  if (!player) return slot === 'behind-player';
  const at = nodes.indexOf(player), after = (n: AssetInstance) => n.order > player.order || n.order === player.order && nodes.indexOf(n) > at;
  return nodes.some(n => n.layer === 'playfield' && n !== player && (slot === 'over-player') === after(n));
}
function paint(ctx:CanvasRenderingContext2D,env:Environment,rows:ArtworkPresentation[],passOf:(r:Resolved)=>Pass,near:boolean,slot:LayerSlot,capture=true){
  for(const prepared of rows){
    const r=prepared.row,opacity=prepared.opacity;
    if(capture&&captureArtwork){
      const record=captureRecord(ctx,prepared,slot,paintOrdinal++);
      if(r.element.selection==='region'){
        record.drawingBounds=measureArtwork(target=>paint(target,env,[prepared],passOf,near,slot,false),ctx);
        record.boundsSource='region';
      }else{
        record.bounds=measureArtwork(target=>paint(target,env,[prepared],passOf,near,slot,false),ctx);
        record.boundsSource='drawing';
      }
      record.pickable=record.visible&&record.bounds.width>0&&record.bounds.height>0;
      record.pickReason=record.pickable?undefined:record.reason??'No visible drawing';
      captureArtwork(record);continue;
    }
    if(!prepared.visible)continue;
    const pass = passOf(r), p = r.placement, v = env.view;
    const clip=prepared.clip;
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

export function propertyIsLinked(row:Resolved,key:string){return !!row.propertyOverrides?.[key];}
