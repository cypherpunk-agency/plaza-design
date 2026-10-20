/** Standalone authored actors reuse the game's existing seeded appearance and animation kernels. */
import {drawCharacter,characterHeight,type Character,type Act} from '../../runtime/characters';
import {BOT,CRITTERS} from './appearance';
import {ARCHETYPE_IDS,type ArchetypeId} from './archetypes';
import type {Element,Properties,Point} from '../core/composition';
import {DEPTH_BANDS,DEPTH_ORDER,isDepthBand} from '../core/depth';
import {DISTRICT_PALETTES,SEATED_VIEWS,type SitPose} from './people-style';
import type {Look} from '../../runtime/characters';
const DISTRICTS=Object.keys(DISTRICT_PALETTES).filter(d=>d!=='city');
export const residentKinds=['human',...Object.keys(CRITTERS),...Object.keys(BOT)];
export const residentActs=['stand','talk','sit','lean','smoke','phone','haggle','argue','queue','sleep','dance','vend','read','doze','wait','dig','fly','scan','direct','play','weld','scrub','charge','glitch','blink','slump'];
const cache=new Map<string,Character>();
/** Bounded cache keeps the existing renderer's WeakMap appearance identity stable across frames. */
export function residentCharacter(props:Properties,point:Point):Character{
 const key=JSON.stringify([props,point.x,point.h]);let actor=cache.get(key);if(actor){cache.delete(key);cache.set(key,actor);return actor;}
 const band=DEPTH_BANDS[isDepthBand(props.depth)?props.depth:'play'];
 // a human may wear a named look (archetypes.ts); the seed varies the rest
 // a human may also take a colour style, a district's clothes, visible tech, and sit (mixed: the pose changes now and then)
 const look:Look={...(props.archetype?{archetype:props.archetype as ArchetypeId}:{}),...(props.style==='vivid'||props.style==='muted'?{style:props.style}:{}),...(props.district?{district:String(props.district)}:{}),...(props.tech==='yes'||props.tech==='no'?{kitted:props.tech==='yes'}:{})};
 const sitting=props.kind==='human'&&props.sitting&&props.sitting!=='no'?{seated:true,...(props.sitting!=='mixed'?{sitView:props.sitting as SitPose}:{})}:{};
 const body=props.kind==='human'?(Object.keys(look).length?{look}:{}):{look:props.kind as Character['look']};
 actor={x:point.x,h:point.h,seed:Number(props.seed),act:props.act as Act,ps:band.ps,dim:band.dim,parallax:band.parallax,...body,...sitting};
 cache.set(key,actor);if(cache.size>256)cache.delete(cache.keys().next().value!);return actor;
}
export const residentElement:Element={
 type:'character.resident',version:1,label:'Authored person, animal or robot',category:'characters',coordinates:'world', libraryUse: 'reusable',parts:['people'],
 fields:{kind:{kind:'select',label:'Body kind',options:residentKinds,default:'human'},archetype:{kind:'select',label:'Named look (humans)',options:['',...ARCHETYPE_IDS],default:''},seed:{kind:'number',label:'Appearance seed',default:1,min:0,max:1000000,step:1},act:{kind:'select',label:'Activity',options:residentActs,default:'stand'},style:{kind:'select',label:'Colour style (humans)',options:['automatic','vivid','muted'],default:'automatic'},district:{kind:'select',label:'District clothes (humans)',options:['',...DISTRICTS],default:''},tech:{kind:'select',label:'Visible tech (humans)',options:['automatic','yes','no'],default:'automatic'},sitting:{kind:'select',label:'Sitting (humans)',options:['no',...SEATED_VIEWS],default:'no'},depth:{kind:'select',label:'Depth',options:[...DEPTH_ORDER],default:'play'}},
 bounds:props=>({x:-32,h:characterHeight(residentCharacter(props,{x:0,h:0})),w:64,tall:characterHeight(residentCharacter(props,{x:0,h:0}))}),
 anchors:()=>({origin:{x:0,h:0,role:'origin'}}),
 draw:(ctx,view,props,_state,_pass,placement)=>drawCharacter(ctx,view,residentCharacter(props,placement)),
};
