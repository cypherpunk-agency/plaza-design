import {content,transitBindingGroups} from './scene-document';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {galleriaStationAdapter,galleriaStationComposition} from './composition';
import type {Composition,Environment} from '../../art/core/composition';
import type {StationRenderOptions} from '../station-composition';
import type {SceneDef} from '../kit';
/** Ordinary source content and native LINE 0 visual/world controllers share the same snapshot. */
export function galleriaStationScene(document:Composition=galleriaStationComposition,state:Environment['state']={},options:StationRenderOptions={},sceneDocument:SceneDocument=content.scene,gameplay:GameplayDefinition=content.gameplay):SceneDef{
 const authored=content.validateScene(sceneDocument,gameplay),compiled=compileManifestDocument(authored,galleriaStationAdapter.geometry(document),(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:transitBindingGroups,groundExits:false,omitGroundRestHeight:true});
 return {...galleriaStationAdapter.adapt({id:'galleriaStation',name:authored.name,...compiled.content,intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:authored.intro.length?[...authored.intro]:undefined,gameplay:withSceneConversations(gameplay,authored)},document,state,options,authored),bindWorld:({city,metro})=>galleriaStationScene(document,state,{...options,city,metro},authored,gameplay)};
}
export const galleriaStation=galleriaStationScene();
