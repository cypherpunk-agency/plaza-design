import {content,transitBindingGroups} from './scene-document';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {trainComposition,trainGeometry,adaptTrain,type TrainRenderOptions} from './composition';
import type {Composition,Environment} from '../../art/core/composition';
import {TRAIN} from '../../data';
import type {SceneDef} from '../kit';
import {TRAIN_RULES,createTrainRules} from './rules';
/** The same native car and brake controller, with ordinary content compiled from source. */
export function trainScene(doc:Composition=trainComposition,state:Environment['state']={},options:TrainRenderOptions={},sceneDocument:SceneDocument=content.scene,gameplay:GameplayDefinition=content.gameplay):SceneDef{
 const authored=content.validateScene(sceneDocument,gameplay),compiled=compileManifestDocument(authored,trainGeometry(doc),(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:transitBindingGroups,groundExits:false});
 return {...adaptTrain({id:'train',name:authored.name,...compiled.content,intro:authored.introTouch?(touch:boolean)=>[...(touch?authored.introTouch!:authored.intro)]:authored.intro.length?[...authored.intro]:undefined,gameplay:withSceneConversations(gameplay,authored),data:TRAIN,rules:TRAIN_RULES},doc,state,options,authored),bindWorld:({city,metro})=>({...trainScene(doc,state,{...options,metro,city},authored,gameplay),rules:createTrainRules(metro,city)})};
}
export const train=trainScene();
