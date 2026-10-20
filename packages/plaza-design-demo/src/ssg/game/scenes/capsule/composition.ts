import {resolveArtworkRoles} from '../../engine/gameplay/artwork-roles';
import {actorPresentationDefaults,actorPresentationBindings,validateActorPresentationNode} from '../../engine/gameplay/actor-presentation';
import {compileSceneActors} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import type {Character} from '../../runtime/characters';
import sceneSource from './scene.json';
import { frameView } from '../../art/core/view';
/** Capsule art bindings and interaction geometry. No drawing algorithms or simulation effects live here. */
import { drawComposition, resolveComposition, type Composition, type Environment, type Instance, type Properties, type Value } from '../../art/core/composition';
import { capsuleVisualFields } from '../../art/assemblies/capsule-elements';
import type { View } from '../../art/core/view';
import type { SceneModel } from '../../engine/model';
import { routerUp,capsuleState } from './rules';
import document from './composition.json';
import { art } from '../../art';
export const capsuleArt = art;
export const capsuleComposition = capsuleArt.validate(document);
const flatten=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
export function validateCapsuleComposition(input: unknown): Composition {
  const doc = capsuleArt.validate(input);
  if (doc.scene !== 'capsule') throw new Error('Expected capsule composition');
  for(const instance of flatten(doc.instances)){if(instance.type==='character.prepared'){validateActorPresentationNode('capsule',instance);continue;}for(const [key, source]of Object.entries(instance.bindings??{}))if(source!=='capsule.'+key||!(key in capsuleVisualFields))throw new Error(instance.id+': unknown capsule binding '+source);}
  return doc;
}
validateCapsuleComposition(capsuleComposition);
const defaultBindings=(doc:Composition):Record<string,Value>=>({...Object.fromEntries(Object.entries(capsuleVisualFields).map(([k,f])=>['capsule.'+k,f.default])),...actorPresentationDefaults('capsule',doc)});
const geometryView: View = {...frameView(0), sx: x => x, y: h => -h, gy: 0, cam: 0, t: 0, viewW: 640, viewH: 360, flags: {} };
export function capsuleGeometry(doc: Composition = capsuleComposition) { return resolveComposition(capsuleArt, doc, { view: geometryView, state: {}, reduced: false, bindings: defaultBindings(doc) }); }
export function capsulePlacement(id: string, doc: Composition = capsuleComposition) { const row = capsuleGeometry(doc).find(row => row.instance.id === id); if (!row) throw new Error('Unknown capsule instance ' + id); return row.placement; }
export type CapsuleRenderOptions = Partial<Pick<Environment, 'visibility' | 'opacity' | 'clips' | 'sequenceTime' | 'reduced'>>;
export function capsuleEnvironment(doc: Composition, view: View, model: SceneModel, hover: string | null,actors:Readonly<Record<string,Character>>=compileSceneActors(sceneSource as unknown as SceneDocument,capsuleGeometry(doc)),source:SceneDocument=sceneSource as unknown as SceneDocument): Environment {
  const geometry = capsuleGeometry(doc),roles=resolveArtworkRoles('capsule',source.manifest?.artwork,geometry),desk=roles.deskSurface,patch=roles.sunPatch,router=roles.router;
  const values: Properties = { hover: hover ?? '', plugOn: !!capsuleState(model,'plugOn'), up: routerUp(model), sun: !!capsuleState(model,'sun'), open: !!capsuleState(model,'doorOpen'), hot: !!model.value('hot'), temp: Number(model.value('temp') ?? 22), steam: model.now() < (model.scratch.steamUntil ?? 0), pixelAt: String(capsuleState(model,'pixelAt') ?? ''), routerX: router?.placement.x??0, deskRight: desk?desk.placement.x + Number(desk.props.width)*desk.placement.scale*desk.placement.facing:0, deskHeight: desk?desk.placement.h + Number(desk.props.height)*desk.placement.scale:0, sunFrom: patch?.placement.x??0, sunTo: patch?patch.placement.x + Number(patch.props.width)*patch.placement.scale*patch.placement.facing:0 };
  return { view, state: {}, reduced: false, bindings: {...Object.fromEntries(Object.entries(values).map(([k,v])=>['capsule.'+k,v])),...actorPresentationBindings('capsule',actors,view.t)} };
}
export function drawCapsuleComposition(ctx: CanvasRenderingContext2D, view: View, model: SceneModel, hover: string | null, doc: Composition = capsuleComposition, state: Environment['state'] = {}, options: CapsuleRenderOptions = {},actors?:Readonly<Record<string,Character>>,source:SceneDocument=sceneSource as unknown as SceneDocument) {
  drawComposition(ctx, capsuleArt, doc, { ...capsuleEnvironment(doc, view, model, hover,actors,source), state, ...options }, 'backdrop');
}
