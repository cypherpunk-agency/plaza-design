import {content,transitBindingGroups} from './scene-document';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {metroComposition,metroGeometry,adaptMetro,MetroCitySession,type MetroRenderOptions} from './composition';
import type {Composition,Environment} from '../../art/core/composition';
import type {SceneDef} from '../kit';
/** Elevated Downtown platform. Source ordinary content shares native skyline/LINE 0 controllers. */
export function metroScene(doc:Composition=metroComposition,state:Environment['state']={},options:MetroRenderOptions={},session=new MetroCitySession(),sceneDocument:SceneDocument=content.scene,gameplay:GameplayDefinition=content.gameplay):SceneDef{
 const authored=content.validateScene(sceneDocument,gameplay),compiled=compileManifestDocument(authored,metroGeometry(doc),(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:transitBindingGroups,groundExits:false,omitGroundRestHeight:true});
 return {...adaptMetro({id:'metro',name:authored.name,...compiled.content,intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:authored.intro.length?[...authored.intro]:undefined,gameplay:withSceneConversations(gameplay,authored)},doc,state,options,session,authored),bindWorld:({metro})=>metroScene(doc,state,{...options,metro},new MetroCitySession(),authored,gameplay)};
}
export const metro=metroScene();
