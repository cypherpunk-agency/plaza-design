import {mutableActorArtwork} from '../../engine/gameplay/native-actor-bindings';
import { frameView } from '../../art/core/view';
/** Library-specific binding adapter. Compositions own placement; this module owns named runtime bindings. */
import { drawComposition, resolveComposition, type Composition, type Environment, type Properties, type Value } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import { prepareCharacter, type Character, type PreparedCharacter } from '../../runtime/characters';
import type { EngineDraw } from '../../engine/host';
import type { SceneData } from '../../data/types';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import document from './composition.json';

import { art } from '../../art';
export const libraryArt = art;
export const libraryComposition = libraryArt.validate(document);
const deviceIds = ['reader', 'session', 'printer'];
const sources = new Set(['architecture.windows', 'catalog.connected', ...deviceIds.map(id => 'device.' + id + '.hover')]);

/** Refuse unresolved game bindings even if the artwork document is structurally valid. */
export function validateLibraryComposition(input: unknown): Composition {
  const doc = libraryArt.validate(input);
  if (doc.scene !== 'library') throw new Error('Expected library composition');
  for (const instance of doc.instances) {
    for (const [field,source] of Object.entries(instance.bindings ?? {})) if (!(instance.type==='library.person'&&field==='pose'&&mutableActorArtwork('library',instance))&&!sources.has(source)) throw new Error(instance.id + ': unknown library binding ' + source);
    if (instance.type === 'library.person' && !mutableActorArtwork('library',instance)) throw new Error(instance.id + ': missing actor pose binding');
  }
  for (const id of ['room']) if (!doc.instances.some(i => i.id === id)) throw new Error('Missing gameplay-bound library instance: ' + id);
  return doc;
}
validateLibraryComposition(libraryComposition);
const geometryView: View = {...frameView(0), sx: x => x, y: h => -h, gy: 0, t: 0, cam: 0, viewW: 960, viewH: 360, flags: {} };
function defaults(doc: Composition): Record<string, Value> {
  const result: Record<string, Value> = {};
  for (const instance of doc.instances) for (const [field, source] of Object.entries(instance.bindings ?? {})) result[source] = libraryArt.get(instance.type).visualFields![field].default;
  return result;
}
export function libraryGeometry(doc: Composition = libraryComposition) {
  return resolveComposition(libraryArt, doc, { view: geometryView, state: {}, bindings: defaults(doc), reduced: false });
}
/** Unbound original devices retain their art positions; explicit manifest bindings own replacement geometry. */
export function libraryDeviceData(source:SceneData,doc:Composition=libraryComposition,scene?:Pick<SceneDocument,'manifest'>):SceneData{
 const result=structuredClone(source),geometry=libraryGeometry(doc);
 for(const id of deviceIds){
  if(scene?.manifest?.devices?.[id])continue;
  const position=geometry.find(row=>row.instance.id===id)?.placement,spot=result.devices.find(device=>device.id===id)?.layout?.spot;
  if(!position||!spot)continue;
  spot.x=position.x;const h=id==='printer'?position.h-2:position.h;if(spot.y!==undefined||h!==0)spot.y=h;
 }
 return result;
}
const value = (input: unknown): Value => input as Value;
/** Build explicit preview/runtime snapshots. Seeking or drawing never changes gameplay. */
export function libraryEnvironment(doc: Composition, view: View, engine: EngineDraw, actors: Readonly<Record<string, Character>>): Environment {
  const bindings = defaults(doc);
  for (const id of deviceIds) bindings['device.' + id + '.hover'] = engine.hover === id;
  bindings['catalog.connected'] = engine.m.net.get('catalog') === 'connected';
  const geometry = resolveComposition(libraryArt, doc, { view, state: {}, bindings, reduced: false });
  bindings['architecture.windows'] = geometry.filter(row => row.instance.type === 'library.window').map(row => [row.placement.x, row.placement.x + Number(row.props.width)]);
  for (const row of geometry.filter(row => row.instance.type === 'library.person')) {
    const id = String(row.props.actor), actor = actors[id];
    if (!actor) throw new Error('Unknown library actor: ' + id);
    let pose: PreparedCharacter = prepareCharacter(actor, view.t);
    if (pose.visible) {
      const dx = row.placement.x - actor.x, dh = row.placement.h - (actor.h ?? 0);
      pose = { ...pose, character: { ...pose.character, x: row.placement.x, h: row.placement.h }, frame: { ...pose.frame, x: pose.frame.x + dx }, height: pose.height + dh };
    }
    bindings['actor.' + id + '.pose'] = value(pose);
  }
  return { view, state: {} as Record<string, Properties>, bindings, reduced: false };
}
export type LibraryRenderOptions = Partial<Pick<Environment, 'visibility' | 'opacity' | 'clips' | 'sequenceTime' | 'reduced'>>;
export function drawLibraryComposition(ctx: CanvasRenderingContext2D, view: View, engine: EngineDraw, actors: Readonly<Record<string, Character>>, doc = libraryComposition, state: Environment['state'] = {}, options: LibraryRenderOptions = {}) {
  const env = libraryEnvironment(doc, view, engine, actors);
  drawComposition(ctx, libraryArt, doc, { ...env, state, ...options }, 'backdrop');
}
