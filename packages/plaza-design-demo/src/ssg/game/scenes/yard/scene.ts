import source from './scene.json';
import {manifestGeometry} from '../../engine/gameplay/manifest-geometry';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
/** Yard visual adapter. Painting is pure; callers explicitly prepare their own controller. */
import type {EngineDraw} from '../../engine/host';
import type {View} from '../../art/core/view';
import type {Composition,Environment} from '../../art';
import {createYardPresentationState,drawYardComposition,yardComposition,yardEnvironment,yardGeometry,yardVisualSnapshot,yardWidth,type YardPresentationState,type YardRenderOptions} from './composition';
export const YARD_W=yardWidth(),YARD_SPAWN=manifestGeometry(source as SceneDocument,yardGeometry(),[],{groundSpawn:false}).spawn;
/** Read-only preview bindings use an isolated initial controller unless one is supplied. */
export function yardFrameEnvironment(view:View,engine:EngineDraw,doc:Composition=yardComposition,controller:Readonly<YardPresentationState>=createYardPresentationState(doc)){return yardEnvironment(view,yardVisualSnapshot(controller,engine,doc),doc);}
export function drawYard(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,doc:Composition=yardComposition,state:Environment['state']={},options:YardRenderOptions={},controller:Readonly<YardPresentationState>=createYardPresentationState(doc)){drawYardComposition(ctx,view,yardVisualSnapshot(controller,engine,doc),doc,state,options);}
