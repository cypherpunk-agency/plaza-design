import {resolveArtworkRoles} from '../../engine/gameplay/artwork-roles';
import {mothVisualSnapshot} from '../../engine/controllers/visual';
import {actorPresentationDefaults,actorPresentationBindings,validateActorPresentationNode} from '../../engine/gameplay/actor-presentation';
import {compileSceneActors} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import type {Character} from '../../runtime/characters';
import sceneSource from './scene.json';
import { frameView } from '../../art/core/view';
/** Moth's named visual bindings and stable interaction markers. */
import { art, drawComposition, resolveComposition, type Composition, type Environment, type Instance, type Properties, type Value } from '../../art';
import { mothVisualFields } from '../../art/assemblies/moth-elements';
import type { View } from '../../art/core/view';
import type { SceneModel } from '../../engine/model';
import document from './composition.json';
export const mothArt = art;
export const mothComposition = mothArt.validate(document);
const flatten=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
export function validateMothComposition(input: unknown): Composition {
  const doc = mothArt.validate(input);
  if (doc.scene !== 'moth') throw new Error('Expected moth composition');
  for(const instance of flatten(doc.instances)){if(instance.type==='character.prepared'){validateActorPresentationNode('moth',instance);continue;}for(const [key, source]of Object.entries(instance.bindings??{}))if(source!=='moth.'+key||!(key in mothVisualFields))throw new Error(instance.id+': unknown moth binding '+source);}
  return doc;
}
validateMothComposition(mothComposition);
const defaultBindings=(doc:Composition):Record<string,Value>=>({...Object.fromEntries(Object.entries(mothVisualFields).map(([k,f])=>['moth.'+k,f.default])),...actorPresentationDefaults('moth',doc)});
const geometryView: View = {...frameView(0), sx:x=>x, y:h=>-h, gy:0, cam:0, t:0, viewW:640, viewH:360, flags:{} };
export function mothGeometry(doc: Composition = mothComposition) { return resolveComposition(mothArt, doc, { view:geometryView,state:{},reduced:false,bindings:defaultBindings(doc) }); }
export type MothRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export function mothEnvironment(doc:Composition,view:View,model:SceneModel,hover:string|null,actors:Readonly<Record<string,Character>>=compileSceneActors(sceneSource as unknown as SceneDocument,mothGeometry(doc)),source:SceneDocument=sceneSource as unknown as SceneDocument):Environment {
  const desk=resolveArtworkRoles('moth',source.manifest?.artwork,mothGeometry(doc)).deskSurface;
  const values:Properties={hover:hover??'',...mothVisualSnapshot(model),deskHeight:desk?desk.placement.h+Number(desk.props.height)*desk.placement.scale:0};
  return {view,state:{},reduced:false,bindings:{...Object.fromEntries(Object.entries(values).map(([k,v])=>['moth.'+k,v])),...actorPresentationBindings('moth',actors,view.t)}};
}
export function drawMothComposition(ctx:CanvasRenderingContext2D,view:View,model:SceneModel,hover:string|null,doc:Composition=mothComposition,state:Environment['state']={},options:MothRenderOptions={},actors?:Readonly<Record<string,Character>>,source:SceneDocument=sceneSource as unknown as SceneDocument) {
  drawComposition(ctx,mothArt,doc,{...mothEnvironment(doc,view,model,hover,actors,source),state,...options},'backdrop');
}
