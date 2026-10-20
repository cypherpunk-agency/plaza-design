import {content,harborBindingGroups} from './scene-document';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {compileSceneActors} from '../../engine/gameplay/actors';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {PresentationSignals} from '../../engine/gameplay/presentation-signals';
import {harborComposition,harborGeometry,harborEnvironment,adaptHarbor,type HarborRenderOptions} from './composition';
import type {Composition,Environment} from '../../art/core/composition';
import type {Character} from '../../runtime/characters';
import type {SceneDef} from '../kit';
export {CH,container,type Crate} from '../../art/props/containers';

/** Source bodies share native animation, dialogue targeting and editor-owned placement. */
export function harborActors(document:Composition=harborComposition,source:SceneDocument=content.scene):Record<string,Character>{return compileSceneActors(source,harborGeometry(document));}
export const HARBOR_ACTORS=harborActors();
export function harborScene(doc:Composition=harborComposition,state:Environment['state']={},options:HarborRenderOptions={},sceneDocument:SceneDocument=content.scene,gameplay:GameplayDefinition=content.gameplay):SceneDef{
 const authored=content.validateScene(sceneDocument,gameplay),signals=new PresentationSignals(authored.cues??[],{craneCall:-1e9}),actors=harborActors(doc,authored);
 const compiled=compileManifestDocument(authored,harborGeometry(doc),(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:harborBindingGroups,groundExits:false});
 const native=adaptHarbor({id:'harbor',name:authored.name,
  intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:authored.intro.length?[...authored.intro]:undefined,
  ...compiled.content,gameplay:withSceneConversations(gameplay,authored),people:authored.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),
 },actors,()=>signals.read('craneCall'),doc,state,options,authored);
 return {presentationTargets:content.presentationTargets,...native,gameplayEvent:signals.event,presentationState:signals,visualEnvironment:view=>harborEnvironment(doc,view,actors,signals.read('craneCall'),authored)};
}
export const harbor=harborScene();
