import { frameView } from '../../art/core/view';
/** Capsule art bindings and interaction geometry. No drawing algorithms or simulation effects live here. */
import { drawComposition, resolveComposition, type Composition, type Environment, type Properties, type Value } from '../../art/core/composition';
import { capsuleVisualFields } from '../../art/assemblies/capsule-elements';
import type { View } from '../../art/core/view';
import type { SceneModel } from '../../engine/model';
import type { SceneData } from '../../data/types';
import { routerUp } from './rules';
import document from './composition.json';
import { art } from '../../art';
export const capsuleArt = art;
export const capsuleComposition = capsuleArt.validate(document);
const deviceIds = ['lock','fridge','kettle','blinds','pc','plug','router'];
const required = ['neighbors','shell','door','bed','desk','counter','spawn','exit-door','rest-bed','pixel-bed','pixel-router','pixel-sun','sun-patch', ...deviceIds, ...deviceIds.map(id => 'device-' + id)];
export function validateCapsuleComposition(input: unknown): Composition {
  const doc = capsuleArt.validate(input);
  if (doc.scene !== 'capsule') throw new Error('Expected capsule composition');
  for (const id of required) if (!doc.instances.some(i => i.id === id)) throw new Error('Missing gameplay-bound capsule instance ' + id);
  for (const instance of doc.instances) for (const [key, source] of Object.entries(instance.bindings ?? {})) if (source !== 'capsule.' + key || !(key in capsuleVisualFields)) throw new Error(instance.id + ': unknown capsule binding ' + source);
  return doc;
}
validateCapsuleComposition(capsuleComposition);
const defaultBindings = (): Record<string, Value> => Object.fromEntries(Object.entries(capsuleVisualFields).map(([k, f]) => ['capsule.' + k, f.default]));
const geometryView: View = {...frameView(0), sx: x => x, y: h => -h, gy: 0, cam: 0, t: 0, viewW: 640, viewH: 360, flags: {} };
export function capsuleGeometry(doc: Composition = capsuleComposition) { return resolveComposition(capsuleArt, doc, { view: geometryView, state: {}, reduced: false, bindings: defaultBindings() }); }
export function capsulePlacement(id: string, doc: Composition = capsuleComposition) { const row = capsuleGeometry(doc).find(row => row.instance.id === id); if (!row) throw new Error('Unknown capsule instance ' + id); return row.placement; }
export const capsuleWidth = Number(capsuleGeometry().find(row => row.instance.id === 'shell')!.props.width);
export function capsuleDeviceData(source: SceneData, doc: Composition = capsuleComposition): SceneData {
  const result = structuredClone(source), geometry = capsuleGeometry(doc);
  for (const id of deviceIds) {
    const placement = geometry.find(row => row.instance.id === 'device-' + id)!.placement;
    const spot = result.devices.find(device => device.id === id)!.layout!.spot!;
    spot.x = placement.x;
    if (spot.y !== undefined || placement.h !== 0) spot.y = placement.h;
  }
  return result;
}
export type CapsuleRenderOptions = Partial<Pick<Environment, 'visibility' | 'opacity' | 'clips' | 'sequenceTime' | 'reduced'>>;
export function capsuleEnvironment(doc: Composition, view: View, model: SceneModel, hover: string | null): Environment {
  const geometry = capsuleGeometry(doc), row = (id: string) => geometry.find(row => row.instance.id === id)!;
  const desk = row('desk'), patch = row('sun-patch');
  const values: Properties = { hover: hover ?? '', plugOn: !!model.get('plugOn'), up: routerUp(model), sun: !!model.get('sun'), open: !!model.get('doorOpen'), hot: !!model.value('hot'), temp: Number(model.value('temp') ?? 22), steam: model.now() < (model.scratch.steamUntil ?? 0), pixelAt: String(model.get('pixelAt') ?? ''), routerX: row('router').placement.x, deskRight: desk.placement.x + Number(desk.props.width), deskHeight: desk.placement.h + Number(desk.props.height), sunFrom: patch.placement.x, sunTo: patch.placement.x + Number(patch.props.width) };
  return { view, state: {}, reduced: false, bindings: Object.fromEntries(Object.entries(values).map(([k, v]) => ['capsule.' + k, v])) };
}
export function drawCapsuleComposition(ctx: CanvasRenderingContext2D, view: View, model: SceneModel, hover: string | null, doc: Composition = capsuleComposition, state: Environment['state'] = {}, options: CapsuleRenderOptions = {}) {
  drawComposition(ctx, capsuleArt, doc, { ...capsuleEnvironment(doc, view, model, hover), state, ...options }, 'backdrop');
}
