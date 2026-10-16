import { frameView } from '../../art/core/view';
/** Moth's named visual bindings and stable interaction markers. */
import { art, drawComposition, resolveComposition, type Composition, type Environment, type Properties, type Value } from '../../art';
import { mothVisualFields } from '../../art/assemblies/moth-elements';
import type { View } from '../../art/core/view';
import type { SceneModel } from '../../engine/model';
import type { SceneData } from '../../data/types';
import document from './composition.json';
export const mothArt = art;
export const mothComposition = mothArt.validate(document);
const deviceIds = ['mail','board','turntable','desk','tank','pot','phone'];
const required = ['neighbors','shell','window','door','spawn','exit-door', ...deviceIds, ...deviceIds.map(id => 'device-' + id)];
export function validateMothComposition(input: unknown): Composition {
  const doc = mothArt.validate(input);
  if (doc.scene !== 'moth') throw new Error('Expected moth composition');
  for (const id of required) if (!doc.instances.some(i => i.id === id)) throw new Error('Missing gameplay-bound Moth instance ' + id);
  for (const instance of doc.instances) for (const [key, source] of Object.entries(instance.bindings ?? {})) if (source !== 'moth.' + key || !(key in mothVisualFields)) throw new Error(instance.id + ': unknown Moth binding ' + source);
  return doc;
}
validateMothComposition(mothComposition);
const defaultBindings = (): Record<string, Value> => Object.fromEntries(Object.entries(mothVisualFields).map(([k,f]) => ['moth.' + k, f.default]));
const geometryView: View = {...frameView(0), sx:x=>x, y:h=>-h, gy:0, cam:0, t:0, viewW:640, viewH:360, flags:{} };
export function mothGeometry(doc: Composition = mothComposition) { return resolveComposition(mothArt, doc, { view:geometryView,state:{},reduced:false,bindings:defaultBindings() }); }
export function mothPlacement(id:string, doc:Composition=mothComposition) { const row=mothGeometry(doc).find(row=>row.instance.id===id);if(!row)throw new Error('Unknown Moth instance '+id);return row.placement; }
export const mothWidth=Number(mothGeometry().find(row=>row.instance.id==='shell')!.props.width);
export function mothDeviceData(source:SceneData,doc:Composition=mothComposition):SceneData {
  const result=structuredClone(source),geometry=mothGeometry(doc);
  for(const id of deviceIds){ const p=geometry.find(row=>row.instance.id==='device-'+id)!.placement, spot=result.devices.find(device=>device.id===id)!.layout!.spot!;spot.x=p.x;if(spot.y!==undefined||p.h!==0)spot.y=p.h; }
  return result;
}
export type MothRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export function mothEnvironment(doc:Composition,view:View,model:SceneModel,hover:string|null):Environment {
  const desk=mothGeometry(doc).find(row=>row.instance.id==='desk')!,next=model.clocks.next('turntable.record');
  const values:Properties={hover:hover??'',playing:!!next,nextMs:next?.ms??0,fed:!!model.get('fed'),wet:model.get('fern')==='wet',fresh:model.get('tape')===0,deskHeight:desk.placement.h+Number(desk.props.height)};
  return {view,state:{},reduced:false,bindings:Object.fromEntries(Object.entries(values).map(([k,v])=>['moth.'+k,v]))};
}
export function drawMothComposition(ctx:CanvasRenderingContext2D,view:View,model:SceneModel,hover:string|null,doc:Composition=mothComposition,state:Environment['state']={},options:MothRenderOptions={}) {
  drawComposition(ctx,mothArt,doc,{...mothEnvironment(doc,view,model,hover),state,...options},'backdrop');
}
