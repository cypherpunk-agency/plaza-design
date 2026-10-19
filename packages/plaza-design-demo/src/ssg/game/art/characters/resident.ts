/** Standalone authored actors reuse the game's existing seeded appearance and animation kernels. */
import {drawCharacter,characterHeight,type Character,type Act} from '../../runtime/characters';
import {BOT} from './appearance';
import type {Element,Properties,Point} from '../core/composition';
import {DEPTH_BANDS,DEPTH_ORDER,isDepthBand} from '../core/depth';
export const residentKinds=['human','cat','pigeon','gull','cleaner','drone','courier',...Object.keys(BOT)];
export const residentActs=['stand','talk','sit','lean','smoke','phone','haggle','argue','queue','sleep','dance','vend','scan','direct','play','weld','scrub','charge','glitch','blink','slump'];
const cache=new Map<string,Character>();
/** Bounded cache keeps the existing renderer's WeakMap appearance identity stable across frames. */
export function residentCharacter(props:Properties,point:Point):Character{
 const key=JSON.stringify([props,point.x,point.h]);let actor=cache.get(key);if(actor){cache.delete(key);cache.set(key,actor);return actor;}
 const band=DEPTH_BANDS[isDepthBand(props.depth)?props.depth:'play'];
 actor={x:point.x,h:point.h,seed:Number(props.seed),act:props.act as Act,ps:band.ps,dim:band.dim,parallax:band.parallax,...(props.kind==='human'?{}:{look:props.kind as Character['look']})};
 cache.set(key,actor);if(cache.size>256)cache.delete(cache.keys().next().value!);return actor;
}
export const residentElement:Element={
 type:'character.resident',version:1,label:'Authored person, animal or robot',category:'characters',coordinates:'world',parts:['people'],
 fields:{kind:{kind:'select',label:'Body kind',options:residentKinds,default:'human'},seed:{kind:'number',label:'Appearance seed',default:1,min:0,max:1000000,step:1},act:{kind:'select',label:'Activity',options:residentActs,default:'stand'},depth:{kind:'select',label:'Depth',options:[...DEPTH_ORDER],default:'play'}},
 bounds:props=>({x:-32,h:characterHeight(residentCharacter(props,{x:0,h:0})),w:64,tall:characterHeight(residentCharacter(props,{x:0,h:0}))}),
 anchors:()=>({origin:{x:0,h:0,role:'origin'}}),
 draw:(ctx,view,props,_state,_pass,placement)=>drawCharacter(ctx,view,residentCharacter(props,placement)),
};
