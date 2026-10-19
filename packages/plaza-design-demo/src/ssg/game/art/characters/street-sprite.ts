/** Native street sprite recipes: deterministic drawing without simulation or dialogue state. */
import {drawSprite,SPR,GLOW_THEM} from '../core/sprites';
import {castShadow} from '../atmosphere/lighting';
import type {View} from '../core/view';
export const streetSpriteKinds=['fixer','hood','umbrella','hat'] as const;
export interface StreetSpritePresentation {kind:'streetSprite';sprite:typeof streetSpriteKinds[number];flip?:boolean}
/** Caption avoidance intentionally preserves the original street actor head markers. */
export const streetSpriteHeadHeight=(recipe:StreetSpritePresentation)=>recipe.sprite==='fixer'?74:46;
export function drawStreetSprite(ctx:CanvasRenderingContext2D,view:View,recipe:StreetSpritePresentation,x:number,h=0){
 const raised=h===0?view:{...view,gy:view.gy-h,y:(q:number)=>view.y(q+h)};
 if(recipe.sprite==='fixer')drawSprite(ctx,SPR.fixer,raised.sx(x),raised.y(30)+Math.round(Math.sin(raised.t*.03)),{glow:'rgba(255,170,60,.85)',...(recipe.flip?{flip:true}:{})});
 else{castShadow(ctx,raised,x,40,12);drawSprite(ctx,SPR[recipe.sprite],raised.sx(x),raised.gy,{glow:GLOW_THEM,flip:!!recipe.flip});}
}
