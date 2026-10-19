import {MARKET_SCENE,validateMarketScene,marketBindingGroups} from './scene-document';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {compileManifestDocument} from '../../engine/gameplay/manifest-content-compiler';
import {compileSceneActors} from '../../engine/gameplay/actors';
import {withSceneConversations} from '../../engine/gameplay/scene-conversations';
import {MARKET_GAMEPLAY,validateMarketGameplay} from './gameplay';
import type {Composition,Environment} from '../../art';
import type {View} from '../../art/core/view';
import type {EngineDraw} from '../../engine/host';
import type {Character} from '../../runtime/characters';
import type {SceneDef} from '../kit';
import {drawMarketComposition,drawMarketForeground,marketComposition,marketEnvironment,marketGeometry,marketStalls,validateMarketComposition,type MarketRenderOptions} from './composition';
export {marketArt,marketComposition,validateMarketComposition} from './composition';

/** Actor bodies, dialogue references and ordinary interactions share editable source; stall kernels own their paint order. */
export function marketActors(document:Composition=marketComposition,source:SceneDocument=MARKET_SCENE):Record<string,Character>{return compileSceneActors(source,marketGeometry(document));}
const defaultActors=new WeakMap<Composition,Record<string,Character>>();
function frameActors(doc:Composition){let actors=defaultActors.get(doc);if(!actors){actors=marketActors(doc);defaultActors.set(doc,actors);}return actors;}
export function marketFrameEnvironment(view:View,_engine:EngineDraw,doc:Composition=marketComposition):Environment{return marketEnvironment(view,frameActors(doc),doc);}
export function drawMarket(ctx:CanvasRenderingContext2D,view:View,_engine:EngineDraw,doc:Composition=marketComposition,state:Environment['state']={},options:MarketRenderOptions={}){drawMarketComposition(ctx,view,frameActors(doc),doc,state,options);}
export function drawMarketFront(ctx:CanvasRenderingContext2D,view:View,doc:Composition=marketComposition,state:Environment['state']={},options:MarketRenderOptions={}){drawMarketForeground(ctx,view,frameActors(doc),doc,state,options);}
export function marketScene(document:Composition=marketComposition,state:Environment['state']={},options:MarketRenderOptions={},gameplay=MARKET_GAMEPLAY,sceneDocument:SceneDocument=MARKET_SCENE):SceneDef{
 const doc=validateMarketComposition(document),content=validateMarketScene(sceneDocument,validateMarketGameplay(gameplay)),rows=marketGeometry(doc),actors=marketActors(doc,content);
 const compiled=compileManifestDocument(content,rows,(_ctx,id)=>({name:'',pages:[],conversation:id}),{groups:marketBindingGroups,groundExits:false,omitGroundRestHeight:true});
 return {id:'market',name:content.name,...compiled.content,

  intro:content.introTouch?(touch:boolean)=>[...(touch?content.introTouch!:content.intro)]:content.intro.length?[...content.intro]:undefined,
  gameplay:withSceneConversations(gameplay,content),people:content.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]),
  lights:marketStalls(doc).filter(s=>s.light&&s.light!=='none').map(s=>({x:s.x+s.w/2,h:s.elevation+64,kind:'lamp' as const,r:54,col:s.light==='tube'?'235,240,255':'255,200,120'})),
  drawBackdrop:(x,v)=>drawMarketComposition(x,v,actors,doc,state,options),drawFront:(x,v)=>drawMarketForeground(x,v,actors,doc,state,options),visualEnvironment:v=>marketEnvironment(v,actors,doc)};
}
export const market=marketScene();
