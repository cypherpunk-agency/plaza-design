/** Capsule-specific companion perches and visual-state adapter. Artwork and placement are shared with authoring. */
import type { SceneModel } from '../../engine/model';
import type { EngineDraw } from '../../engine/host';
import type { Perch } from '../../runtime/companion';
import type { PixelAt } from './rules';
import type { View } from '../../art/core/view';
import type { Composition, Environment } from '../../art/core/composition';
import { capsuleComposition, capsuleEnvironment, capsuleGeometry, capsulePlacement, capsuleWidth, drawCapsuleComposition, type CapsuleRenderOptions } from './composition';

export const CAPSULE_W = capsuleWidth;
export const CAPSULE_SPAWN = capsulePlacement('spawn').x;
export const DOOR_X = capsulePlacement('door').x;
const perch = (id: string, rest: Perch['rest']): Perch => { const p = capsulePlacement('pixel-' + id); return { x: p.x, h: p.h, rest }; };
export const PERCHES: Record<PixelAt, Perch> = { bed: perch('bed', 'sleep'), router: perch('router', 'sleep'), sun: perch('sun', 'sun') };
export const capsulePerch = (m: SceneModel): Perch => PERCHES[m.get('pixelAt') as PixelAt] ?? PERCHES.bed;
export const CAPSULE_FACING = Number(capsuleGeometry().find(row => row.instance.id === 'blinds')!.props.facing);
export function capsuleFrameEnvironment(view: View, engine: EngineDraw, doc: Composition = capsuleComposition): Environment {
  return capsuleEnvironment(doc, view, engine.m, engine.hover);
}
export function drawCapsule(ctx: CanvasRenderingContext2D, view: View, engine: EngineDraw, doc: Composition = capsuleComposition, state: Environment['state'] = {}, options: CapsuleRenderOptions = {}) {
  drawCapsuleComposition(ctx, view, engine.m, engine.hover, doc, state, options);
}
