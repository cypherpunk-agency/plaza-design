import source from './scene.json';
import {manifestGeometry} from '../../engine/gameplay/manifest-geometry';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
/** Moth's scene-state adapter. Its artwork and placement use the shared library renderer. */
import type { EngineDraw } from '../../engine/host';
import type { View } from '../../art/core/view';
import type { Composition,Environment } from '../../art/core/composition';
import { drawMothComposition,mothComposition,mothEnvironment,mothGeometry,mothPlacement,mothWidth,type MothRenderOptions } from './composition';
export const MOTH_W=mothWidth;
export const MOTH_DOOR_X=mothPlacement('door').x;
export const MOTH_SPAWN=manifestGeometry(source as SceneDocument,mothGeometry(),[],{groundSpawn:false}).spawn;
export const MOTH_FACING=Number(mothGeometry().find(row=>row.instance.id==='window')!.props.facing);
export function mothFrameEnvironment(view:View,engine:EngineDraw,doc:Composition=mothComposition):Environment {return mothEnvironment(doc,view,engine.m,engine.hover);}
export function drawMoth(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,doc:Composition=mothComposition,state:Environment['state']={},options:MothRenderOptions={}) {drawMothComposition(ctx,view,engine.m,engine.hover,doc,state,options);}
