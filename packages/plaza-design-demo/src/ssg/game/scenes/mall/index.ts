import {MALL_SCENE,MALL_GAMEPLAY,validateMallScene,validateMallGameplay,mallBindingGroups} from './scene-document';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {compileSceneActors} from '../../engine/gameplay/actors';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import type {Composition,Environment} from '../../art';
import type {EngineDraw} from '../../engine/host';
import type {Character} from '../../runtime/characters';
import type {SceneDef,View} from '../kit';
import {drawMallComposition,drawMallForeground,mallComposition,mallEnvironment,mallGeometry,validateMallComposition,type MallRenderOptions} from './composition';
export {mallArt,mallComposition,validateMallComposition} from './composition';

/** Bodies and ordinary interactions are authored source; the atrium controller owns only adaptive storeys and escalator motion. */
export function mallActors(document:Composition=mallComposition,source:SceneDocument=MALL_SCENE):Record<string,Character>{return compileSceneActors(source,mallGeometry(document));}
const defaultActors=new WeakMap<Composition,Record<string,Character>>();
function frameActors(doc:Composition){let actors=defaultActors.get(doc);if(!actors){actors=mallActors(doc);defaultActors.set(doc,actors);}return actors;}
export function mallFrameEnvironment(view:View,_engine:EngineDraw,doc:Composition=mallComposition):Environment{return mallEnvironment(view,frameActors(doc),doc);}
export function drawMall(ctx:CanvasRenderingContext2D,view:View,_engine:EngineDraw,doc:Composition=mallComposition,state:Environment['state']={},options:MallRenderOptions={}){drawMallComposition(ctx,view,frameActors(doc),doc,state,options);}
export function drawMallFront(ctx:CanvasRenderingContext2D,view:View,doc:Composition=mallComposition,state:Environment['state']={},options:MallRenderOptions={}){drawMallForeground(ctx,view,frameActors(doc),doc,state,options);}
export function mallScene(document:Composition=mallComposition,state:Environment['state']={},options:MallRenderOptions={},sceneDocument:SceneDocument=MALL_SCENE,gameplay:GameplayDefinition=MALL_GAMEPLAY):SceneDef{
 const doc=validateMallComposition(document),content=validateMallScene(sceneDocument,validateMallGameplay(gameplay)),rows=mallGeometry(doc),actors=mallActors(doc,content);
 const compiled=compileManifestDocument(content,rows,(_context,id)=>({name:'',pages:[],conversation:id}),{groups:mallBindingGroups,groundExits:false});
 return {id:'mall',name:content.name,...compiled.content,
  intro:content.introTouch?(touch:boolean)=>[...(touch?content.introTouch!:content.intro)]:content.intro.length?[...content.intro]:undefined,
  gameplay:withSceneConversations(gameplay,content),people:content.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),
  drawBackdrop:(x,v)=>drawMallComposition(x,v,actors,doc,state,options),drawFront:(x,v)=>drawMallForeground(x,v,actors,doc,state,options),visualEnvironment:v=>mallEnvironment(v,actors,doc)};
}
export const mall=mallScene();
