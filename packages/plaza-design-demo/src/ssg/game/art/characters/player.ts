/** Player appearance, shadow and attached deck cable; gameplay chooses the pose. */
import type { View } from '../core/view';
import { drawSprite, GLOW_YOU, type Sprite } from '../core/sprites';
import { castShadow } from '../atmosphere/lighting';
export interface PlayerAppearance { x:number; y:number; face:number }
export interface JackAppearance { x:number; y:number; h:number }
export function drawPlayer(x: CanvasRenderingContext2D, v: View, sprite: Sprite, p: PlayerAppearance, jack: JackAppearance | undefined, shadowGround: number | null) {
    if (shadowGround !== null) castShadow(x, v, p.x, 42, 12, shadowGround);
    const box = drawSprite(x, sprite, v.sx(p.x), v.y(p.y), { glow: GLOW_YOU, flip: p.face < 0 });
    if (jack) {
      const tx = v.sx(jack.x), ty = v.y(jack.y + jack.h / 2), from = p.face > 0 ? box.x0 + box.w : box.x0;
      x.strokeStyle = 'rgba(0,255,255,.85)'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(from, box.y0 + 16); x.quadraticCurveTo((from + tx) / 2, box.y0 + 30, tx - 8 * p.face, ty); x.stroke(); x.lineWidth = 1;
    }
}
