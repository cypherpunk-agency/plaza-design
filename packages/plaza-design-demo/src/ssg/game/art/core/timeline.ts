/** Data-only authored sequences. Evaluation is pure and never commits gameplay handoffs. */
import { ArtRegistry, type Composition, type Instance, type Field, type Value, type Properties } from './composition';

export type Ease = 'linear' | 'hold' | 'smooth' | 'in' | 'out';
export interface Keyframe { time: number; value: Value; ease?: Ease }
export type Target = { kind: 'camera'; property: 'x' | 'h' | 'zoom' }
  | { kind: 'instance'; instance: string; property: 'x' | 'h' | 'scale' | 'facing' | 'parallax' | 'visible' | 'opacity' }
  | { kind: 'property' | 'state'; instance: string; property: string }
  | { kind: 'clip'; instance: string; property: string };
export interface Track { id: string; target: Target; keys: Keyframe[]; reduced?: 'freeze' | 'normal'; motion?: { type: string; props: Properties } }
export interface Shot { id: string; from: number; to: number; camera: { x: number; h: number; zoom: number } }
export interface TextCard { id: string; from: number; to: number; text: string; x: number; h: number }
export interface Fade { id: string; from: number; to: number; color: string; start: number; end: number }
export interface Beat { id: string; time: number }
export interface Handoff { scene: string; entrance?: string }
export interface SequenceCommand {id:string;scene:string;command:string}
export interface SequenceCommandMarker extends SequenceCommand {time:number;skip:'run'|'omit'}
export interface Sequence {
  id: string; duration: number; composition: string; shots: Shot[]; tracks: Track[];
  text: TextCard[]; fades: Fade[]; beats: Beat[]; handoff?: Handoff;
  commands?:SequenceCommandMarker[];
  onComplete?:SequenceCommand[];
  onCancel?:SequenceCommand[];
}
export interface TimelineProgram { version: 1; sequences: Sequence[] }
export interface MotionTrack {
  /** Existing exact motion formulas register here; documents contain only typed parameters. */
  validate(props: Properties): void;
  evaluate(time: number, props: Readonly<Properties>): Value;
}
export interface TimelineContext {
  registry: ArtRegistry; compositions: Readonly<Record<string, Composition>>;
  destinations?: Readonly<Record<string, readonly string[]>>;
  /** Present during linked source validation; pure timeline inspection can validate shape alone. */
  commandTargets?:Readonly<Record<string,readonly string[]>>;
  motionTracks?: Readonly<Record<string, MotionTrack>>;
  clips?: Readonly<Record<string, readonly string[]>>;
}
const own = (v: object, k: string) => Object.prototype.hasOwnProperty.call(v, k);
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const eases: Ease[] = ['linear', 'hold', 'smooth', 'in', 'out'];
function json(v: unknown, seen = new Set<object>()): void {
  if (v === null || typeof v === 'string' || typeof v === 'boolean' || num(v)) return;
  if (typeof v !== 'object' || seen.has(v!)) throw new Error('Timeline must contain finite JSON data only');
  if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) throw new Error('Timeline must contain plain objects');
  seen.add(v!); for (const [k, x] of Object.entries(v!)) { if (['__proto__', 'prototype', 'constructor'].includes(k)) throw new Error('Reserved timeline key'); json(x, seen); } seen.delete(v!);
}
function nodes(doc: Composition) { const m = new Map<string, Instance>(); const walk = (xs: Instance[]) => xs.forEach(n => { m.set(n.id, n); walk(n.children ?? []); }); walk(doc.instances); return m; }
function validField(f: Field, v: Value) {
  const valid = f.kind === 'json' ? true : f.kind === 'number' ? num(v) && (f.min === undefined || v >= f.min) && (f.max === undefined || v <= f.max)
    : f.kind === 'boolean' ? typeof v === 'boolean' : f.kind === 'select' ? !!f.options?.includes(v as string | number)
    : typeof v === 'string' && (f.kind !== 'color' || /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(v));
  if (!valid) return false;
  try { f.validate?.(structuredClone(v)); return true; } catch { return false; }
}
function targetValidator(t: Target, all: Map<string, Instance>, ctx: TimelineContext): (v: Value) => boolean {
  if (!obj(t) || typeof t.property !== 'string') throw new Error('Invalid timeline target');
  if (t.kind === 'camera') {
    if (!['x', 'h', 'zoom'].includes(t.property)) throw new Error('Unknown camera property');
    return v => num(v) && (t.property !== 'zoom' || v > 0);
  }
  if (!['instance', 'property', 'state', 'clip'].includes(t.kind) || !all.has(t.instance)) throw new Error(`Unknown timeline instance: ${t.instance}`);
  const node = all.get(t.instance)!, element = ctx.registry.get(node.type);
  if (t.kind === 'instance') {
    if (!['x', 'h', 'scale', 'facing', 'parallax', 'visible', 'opacity'].includes(t.property)) throw new Error('Unknown instance property');
    return v => t.property === 'visible' ? typeof v === 'boolean' : num(v) && (t.property === 'facing' ? v === -1 || v === 1 : t.property === 'scale' ? v > 0 : t.property === 'opacity' ? v >= 0 && v <= 1 : t.property === 'parallax' ? v >= 0 : true);
  }
  if (t.kind === 'clip') {
    if (!own(element.visualFields ?? {}, t.property)) throw new Error(`Unknown clip channel ${node.type}.${t.property}`);
    const clips = own(ctx.clips ?? {}, node.type) ? ctx.clips![node.type] : undefined;
    if (!clips) throw new Error(`No registered clips for ${node.type}`);
    return v => typeof v === 'string' && clips.includes(v);
  }
  const fields = t.kind === 'property' ? element.fields : element.visualFields ?? {};
  if (!own(fields, t.property)) throw new Error(`Unknown ${t.kind} field ${node.type}.${t.property}`);
  const field = fields[t.property];
  if (!field.animatable) throw new Error(`Field is not animatable: ${node.type}.${t.property}`);
  return v => validField(field, v);
}
export function validateTimeline(input: unknown, ctx: TimelineContext): TimelineProgram {
  json(input);
  if (!obj(input) || input.version !== 1 || !Array.isArray(input.sequences)) throw new Error('Invalid timeline version/header');
  const seqIds = new Set<string>();
  for (const raw of input.sequences) {
    if (!obj(raw) || typeof raw.id !== 'string' || !raw.id || seqIds.has(raw.id) || !num(raw.duration) || raw.duration <= 0 || typeof raw.composition !== 'string' || !own(ctx.compositions, raw.composition)) throw new Error('Invalid sequence id, duration or composition');
    seqIds.add(raw.id); const seq = raw as unknown as Sequence, all = nodes(ctx.registry.validate(ctx.compositions[seq.composition]));
    const ids = new Set<string>(); const id = (x: { id: string }) => { if (typeof x.id !== 'string' || !x.id || ids.has(x.id)) throw new Error(`${seq.id}: duplicate/missing item id`); ids.add(x.id); };
    const span = (x: { from: number; to: number }) => { if (!num(x.from) || !num(x.to) || x.from < 0 || x.to <= x.from || x.to > seq.duration) throw new Error(`${seq.id}: invalid time span`); };
    if (![seq.shots, seq.tracks, seq.text, seq.fades, seq.beats].every(Array.isArray)) throw new Error(`${seq.id}: missing timeline arrays`);
    let end = -1;
    for (const shot of seq.shots) { id(shot); span(shot); if (shot.from < end || !obj(shot.camera) || !num(shot.camera.x) || !num(shot.camera.h) || !num(shot.camera.zoom) || shot.camera.zoom <= 0) throw new Error('Invalid or overlapping shot'); end = shot.to; }
    const targets = new Set<string>();
    for (const track of seq.tracks) {
      id(track); const valid = targetValidator(track.target, all, ctx), target = track.target;
      const key = [target.kind, target.kind === 'camera' ? '' : target.instance, target.property].join('/');
      const element = target.kind === 'camera' ? undefined : ctx.registry.get(all.get(target.instance)!.type);
      const continuous = target.kind === 'camera' || target.kind === 'instance' && !['visible', 'facing'].includes(target.property)
        || target.kind === 'property' && element!.fields[target.property].kind === 'number'
        || target.kind === 'state' && element!.visualFields![target.property].kind === 'number';
      if (targets.has(key)) throw new Error('Multiple tracks write the same target'); targets.add(key);
      if (track.reduced !== undefined && !['freeze', 'normal'].includes(track.reduced)) throw new Error('Invalid reduced motion policy');
      if (!Array.isArray(track.keys) || !track.keys.length) throw new Error('A track needs keys');
      let prev = -1;
      for (const k of track.keys) {
        if (!num(k.time) || k.time < 0 || k.time <= prev || k.time > seq.duration || !valid(k.value) || k.ease !== undefined && !eases.includes(k.ease)) throw new Error(`${track.id}: invalid keyframe`);
        if (prev >= 0 && !continuous && track.keys.find(x => x.time === prev)?.ease !== 'hold') throw new Error(`${track.id}: discrete tracks require hold easing`);
        prev = k.time;
      }
      if (track.motion) {
        if (!obj(track.motion) || typeof track.motion.type !== 'string' || !obj(track.motion.props) || !own(ctx.motionTracks ?? {}, track.motion.type)) throw new Error('Unknown motion track');
        ctx.motionTracks![track.motion.type].validate(structuredClone(track.motion.props));
      }
    }
    for (const card of seq.text) { id(card); span(card); if (typeof card.text !== 'string' || !num(card.x) || !num(card.h)) throw new Error('Invalid text card'); }
    for (const fade of seq.fades) { id(fade); span(fade); if (!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(fade.color) || !num(fade.start) || !num(fade.end) || Math.min(fade.start, fade.end) < 0 || Math.max(fade.start, fade.end) > 1) throw new Error('Invalid fade'); }
    for (const beat of seq.beats) { id(beat); if (!num(beat.time) || beat.time < 0 || beat.time > seq.duration) throw new Error('Invalid beat'); }
    for(const kind of ['commands','onComplete','onCancel'] as const){const rows=seq[kind];if(rows===undefined)continue;if(!Array.isArray(rows)||rows.length>64)throw Error('Sequence command list exceeds its bound');let previous=-1;
      for(const row of rows){if(!obj(row)||Object.keys(row).some(k=>!(kind==='commands'?['id','scene','command','time','skip']:['id','scene','command']).includes(k)))throw Error('Invalid sequence command fields');id(row as unknown as SequenceCommand);
        if(typeof row.scene!=='string'||!row.scene||typeof row.command!=='string'||!row.command)throw Error('Sequence command requires scene and command');
        if(ctx.commandTargets&&!ctx.commandTargets[row.scene]?.includes(row.command))throw Error('Sequence command must reference a declared system command: '+row.scene+'/'+row.command);
        if(kind==='commands'){if(!num(row.time)||row.time<0||row.time>seq.duration||row.time<previous||!['run','omit'].includes(String(row.skip)))throw Error('Invalid sequence command time/order/skip policy');previous=row.time;}
      }
    }
    if (seq.handoff) { if (!obj(seq.handoff) || typeof seq.handoff.scene !== 'string' || !own(ctx.destinations ?? {}, seq.handoff.scene) || seq.handoff.entrance !== undefined && !ctx.destinations![seq.handoff.scene].includes(seq.handoff.entrance)) throw new Error('Invalid handoff destination'); }
  }
  return structuredClone(input) as unknown as TimelineProgram;
}
function sample(keys: Keyframe[], time: number): Value {
  if (time <= keys[0].time) return keys[0].value;
  for (let i = 1; i < keys.length; i++) if (time < keys[i].time) {
    const a = keys[i - 1], b = keys[i]; if (a.ease === 'hold' || typeof a.value !== 'number' || typeof b.value !== 'number') return a.value;
    let f = (time - a.time) / (b.time - a.time); if (a.ease === 'smooth') f = f * f * (3 - 2 * f); else if (a.ease === 'in') f *= f; else if (a.ease === 'out') f = 1 - (1 - f) ** 2;
    return a.value + (b.value - a.value) * f;
  }
  return keys[keys.length - 1].value;
}
export interface TimelineFrame {
  time: number; composition: Composition; camera: { x: number; h: number; zoom: number };
  visibility: Record<string, boolean>; opacity: Record<string, number>; state: Record<string, Properties>; clips: Record<string, Record<string, string>>;
  text: TextCard[]; fades: { id: string; color: string; opacity: number }[]; beats: Beat[];
}
/** Input must have passed validateTimeline. Absolute seek never runs a controller or handoff. */
export function evaluateTimeline(doc: TimelineProgram, sequenceId: string, time: number, ctx: TimelineContext, options: { reduced?: boolean } = {}): TimelineFrame {
  if (!num(time)) throw new Error('Seek time must be finite');
  const seq = doc.sequences.find(s => s.id === sequenceId); if (!seq) throw new Error(`Unknown sequence: ${sequenceId}`);
  time = Math.max(0, Math.min(seq.duration, time)); const composition = structuredClone(ctx.compositions[seq.composition]), all = nodes(composition);
  const shot = seq.shots.find(s => time >= s.from && time < s.to) ?? (time === seq.duration ? seq.shots.find(s => s.to === time) : undefined);
  const frame: TimelineFrame = { time, composition, camera: { ...(shot?.camera ?? { x: 0, h: 0, zoom: 1 }) }, visibility: {}, opacity: {}, state: {}, clips: {}, text: seq.text.filter(s => time >= s.from && time < s.to).map(s => ({ ...s })), fades: [], beats: seq.beats.filter(b => b.time <= time).map(b => ({ ...b })) };
  for (const track of seq.tracks) {
    const t = options.reduced && track.reduced === 'freeze' ? 0 : time;
    const value = track.motion ? ctx.motionTracks![track.motion.type].evaluate(t, structuredClone(track.motion.props)) : sample(track.keys, t);
    if (!targetValidator(track.target, all, ctx)(value)) throw new Error(`${track.id}: motion output violates target schema`);
    const target = track.target;
    if (target.kind === 'camera') frame.camera[target.property] = value as number;
    else if (target.kind === 'property') all.get(target.instance)!.props[target.property] = structuredClone(value);
    else if (target.kind === 'state') (frame.state[target.instance] ??= {})[target.property] = structuredClone(value);
    else if (target.kind === 'clip') (frame.clips[target.instance] ??= {})[target.property] = value as string;
    else if (target.property === 'visible') frame.visibility[target.instance] = value as boolean;
    else if (target.property === 'opacity') frame.opacity[target.instance] = value as number;
    else (all.get(target.instance)!.placement as unknown as Record<string, Value>)[target.property] = value;
  }
  frame.fades = seq.fades.filter(f => time >= f.from && time <= f.to).map(f => ({ id: f.id, color: f.color, opacity: f.start + (f.end - f.start) * ((time - f.from) / (f.to - f.from)) }));
  return frame;
}
/** Runtime controller owns this latch. Scrubbing/evaluating cannot fire it. */
export class SequenceHandoff {
  private committed = false;
  complete(sequence: Sequence, commit: (destination: Handoff) => void) { if (this.committed) return false; this.committed = true; if (sequence.handoff) commit({ ...sequence.handoff }); return true; }
}
