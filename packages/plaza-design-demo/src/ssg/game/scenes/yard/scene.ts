/** Yard visual adapter. Painting is pure; callers explicitly prepare their own controller. */
import type {EngineDraw} from '../../engine/host';
import type {View} from '../../art/core/view';
import type {Composition,Environment} from '../../art';
import {createYardPresentationState,drawYardComposition,yardComposition,yardEnvironment,yardPlacement,yardVisualSnapshot,yardWidth,type YardPresentationState,type YardRenderOptions} from './composition';
export const YARD_W=yardWidth(),YARD_SPAWN=yardPlacement('spawn').x,YARD_EXIT_X=yardPlacement('passage').x,TRAY_X=yardPlacement('tray').x;
/** Read-only preview bindings use an isolated initial controller unless one is supplied. */
export function yardFrameEnvironment(view:View,engine:EngineDraw,doc:Composition=yardComposition,controller:Readonly<YardPresentationState>=createYardPresentationState(doc)){return yardEnvironment(view,yardVisualSnapshot(controller,engine,doc));}
export function drawYard(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,doc:Composition=yardComposition,state:Environment['state']={},options:YardRenderOptions={},controller:Readonly<YardPresentationState>=createYardPresentationState(doc)){drawYardComposition(ctx,view,yardVisualSnapshot(controller,engine,doc),doc,state,options);}
