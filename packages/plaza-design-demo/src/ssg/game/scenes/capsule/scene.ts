import {compileSceneCompanion} from '../../engine/gameplay/scene-companion';
import {resolveManifestPoint} from '../../engine/gameplay/manifest-geometry';
import source from './scene.json';
import {manifestGeometry} from '../../engine/gameplay/manifest-geometry';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
/** Capsule-specific companion perches and visual-state adapter. Artwork and placement are shared with authoring. */
import type { SceneModel } from '../../engine/model';
import type { EngineDraw } from '../../engine/host';
import type { Perch } from '../../runtime/companion';
import type { PixelAt } from './rules';
import type { View } from '../../art/core/view';
import type { Composition, Environment } from '../../art/core/composition';
import { capsuleComposition, capsuleEnvironment, capsuleGeometry, capsulePlacement, capsuleWidth, drawCapsuleComposition, type CapsuleRenderOptions } from './composition';

export const CAPSULE_W = capsuleWidth;
export const CAPSULE_SPAWN = manifestGeometry(source as SceneDocument,capsuleGeometry(),[],{groundSpawn:false}).spawn;
export const DOOR_X = capsulePlacement('door').x;
export const PERCHES=Object.fromEntries((source.companion?.home?.perches??[]).map(p=>{const at=resolveManifestPoint(capsuleGeometry(),p.point,CAPSULE_W,false,true);return[p.id,{x:at.x,h:at.h,rest:p.rest}];})) as Record<PixelAt,Perch>;
export const capsulePerch=(m:SceneModel):Perch|undefined=>compileSceneCompanion(source.companion as SceneDocument['companion'],capsuleGeometry(),CAPSULE_W).perch?.(m);
export const CAPSULE_FACING = Number(capsuleGeometry().find(row => row.instance.id === 'blinds')!.props.facing);
export function capsuleFrameEnvironment(view: View, engine: EngineDraw, doc: Composition = capsuleComposition): Environment {
  return capsuleEnvironment(doc, view, engine.m, engine.hover);
}
export function drawCapsule(ctx: CanvasRenderingContext2D, view: View, engine: EngineDraw, doc: Composition = capsuleComposition, state: Environment['state'] = {}, options: CapsuleRenderOptions = {}) {
  drawCapsuleComposition(ctx, view, engine.m, engine.hover, doc, state, options);
}
