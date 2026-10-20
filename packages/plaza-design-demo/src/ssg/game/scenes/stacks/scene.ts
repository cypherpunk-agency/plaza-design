import type {GameplayDefinition} from '../../engine/gameplay/types';
/** Source-owned terminal actors; terminal-specific animation stays in the visual controller. */
import {content} from './scene-document';
import {compileSceneActors} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {drawStacksComposition,drawStacksForeground,stacksComposition,stacksEnvironment,stacksGeometry,type StacksRenderOptions} from './composition';
import type {Composition,Environment} from '../../art';
import type {EngineDraw} from '../../engine/host';
import type {View} from '../../art/core/view';
export function stacksActors(doc:Composition=stacksComposition,source:SceneDocument=content.scene){return compileSceneActors(source,stacksGeometry(doc));}
export const STACKS_ACTORS=stacksActors();
export const PEOPLE=content.scene.actors!.filter(a=>a.band==='world').map(a=>STACKS_ACTORS[a.id]);
export function stacksPeople(doc:Composition=stacksComposition,source:SceneDocument=content.scene){const actors=stacksActors(doc,source);return source.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]);}
export function stacksFrameEnvironment(view:View,engine:EngineDraw,doc:Composition=stacksComposition,actors=STACKS_ACTORS,gameplay:GameplayDefinition=content.gameplay,source:SceneDocument=content.scene):Environment{return stacksEnvironment(view,engine,actors,doc,gameplay,source);}
export function drawStacks(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,doc:Composition=stacksComposition,state:Environment['state']={},options:StacksRenderOptions={},actors=STACKS_ACTORS,gameplay:GameplayDefinition=content.gameplay,source:SceneDocument=content.scene){drawStacksComposition(ctx,view,engine,actors,doc,state,options,gameplay,source);}
export function drawStacksFront(ctx:CanvasRenderingContext2D,view:View,doc:Composition=stacksComposition,state:Environment['state']={},options:StacksRenderOptions={}){drawStacksForeground(ctx,view,doc,state,options);}
