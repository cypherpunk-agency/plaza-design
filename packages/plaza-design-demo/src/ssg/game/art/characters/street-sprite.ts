/** Native street actor recipes: deterministic drawing without simulation or dialogue state. */
import {drawSprite,SPR} from '../core/sprites';
import type {View} from '../core/view';
import {drawDriven,type Character} from '../../runtime/characters';
import {streetSpriteKinds,type StreetSpritePresentation} from './presentation';
/**
 * Downtown's three street residents are character-kit people (a hood, an umbrella, a brimmed hat), so they
 * share the kit's poses, rim and shadows. The fixer stays his own sprite: he is a one-off with an identity.
 */
const RESIDENTS:Record<Exclude<typeof streetSpriteKinds[number],'fixer'>,Character>={
 hood:{seed:4101,x:0,look:{body:'avg',hair:'hood',garb:'jacket',top:'#3a3346',bottom:'#2e2a36',extras:[]}},
 umbrella:{seed:4102,x:0,look:{body:'avg',hair:'short',garb:'coat',top:'#5a3a24',bottom:'#2a2018',acc:'#7a3a1a',extras:['umbrella']}},
 hat:{seed:4103,x:0,look:{body:'tall',hair:'brim',garb:'coat',top:'#2c3a2c',bottom:'#2a2622',acc:'#2a2622',extras:[]}},
};
export function drawStreetSprite(ctx:CanvasRenderingContext2D,view:View,recipe:StreetSpritePresentation,x:number,h=0){
 if(recipe.sprite==='fixer'){const raised=h===0?view:{...view,gy:view.gy-h,y:(q:number)=>view.y(q+h)};drawSprite(ctx,SPR.fixer,raised.sx(x),raised.y(30)+Math.round(Math.sin(raised.t*.03)),{glow:'rgba(255,170,60,.85)',...(recipe.flip?{flip:true}:{})});}
 else drawDriven(ctx,view,RESIDENTS[recipe.sprite],{x,h,facing:recipe.flip?-1:1,act:'stand'});
}
