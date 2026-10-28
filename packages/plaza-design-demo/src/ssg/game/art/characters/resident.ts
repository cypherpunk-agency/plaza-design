import {fixedGeometry} from '../core/spatial';
import {appearanceChoice,appearanceStructure,generationSeed,semantic,shapeLength,velocity} from '../core/fields';
import {screenBounds} from '../assemblies/static-bounds';
/** Standalone authored actors reuse the game's existing seeded appearance and animation kernels. */
import {drawCharacter,characterHeight,characterX,KIT_ACTS,type Character,type Act} from '../../runtime/characters';
import {BODY_KINDS,HAIR_KINDS,GARB_KINDS,EXTRA_KINDS,FACIAL_KINDS} from './parts';
import type {BotLook,Face} from './appearance';
import {BOT,CRITTERS} from './appearance';
import {ARCHETYPE_IDS,type ArchetypeId} from './archetypes';
import type {AssetDefinition,Field,Properties,Point,Value} from '../core/composition';
import {DEPTH_BANDS,DEPTH_ORDER,isDepthBand} from '../core/depth';
import {DISTRICT_PALETTES,SEATED_VIEWS,type SitPose} from './people-style';
import type {Look} from '../../runtime/characters';
const DISTRICTS=Object.keys(DISTRICT_PALETTES).filter(d=>d!=='city');
export const residentKinds=['human',...Object.keys(CRITTERS),...Object.keys(BOT)];
/** Every action some kit body animates (runtime/characters.ts KIT_ACTS); a body without it stands. Movers use the travel range. */
export const residentActs=[...new Set(Object.values(KIT_ACTS).flat())];
const FACES:Face[]=['eyes','happy','blink','sad','dots','off','crack'];
const isBot=(p:Properties)=>String(p.kind) in BOT,human=(p:Properties)=>p.kind==='human';
/** Sitting (act sit, or any act done seated) or lying on the back: the seat or bed height applies. */
const seatedOrLying=(p:Properties)=>human(p)&&(p.act==='sit'||p.act==='lie'||!!p.sitting&&p.sitting!=='no'),lying=(p:Properties)=>human(p)&&p.act==='lie';
const sel=(label:string,options:readonly (string|number)[],showIf:(p:Properties)=>boolean):Field=>({kind:'select',label,options:[...options],default:options[0],showIf});
/** An optional colour: empty keeps the seeded one. */
const colour=(label:string,showIf:(p:Properties)=>boolean,empty='Seeded'):Field=>({kind:'json',label,default:'',showIf,editor:{kind:'colour',empty},validate:(v:Value)=>{if(v!==''&&!(typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)))throw new Error(label+': expected a #rrggbb colour or empty');}});
const cache=new Map<string,Character>();
/** Bounded cache keeps the existing renderer's WeakMap appearance identity stable across frames. */
export function residentCharacter(props:Properties,point:Point):Character{
 const key=JSON.stringify([props,point.x,point.h]);let actor=cache.get(key);if(actor){cache.delete(key);cache.set(key,actor);return actor;}
 const band=DEPTH_BANDS[isDepthBand(props.depthBand)?props.depthBand:'play'];
 // a human may wear a named look (archetypes.ts); the seed varies the rest
 // a human may also take a colour style, a district's clothes, visible tech, and sit (mixed: the pose changes now and then)
 const own=(k:string)=>typeof props[k]==='string'&&props[k]!==''&&props[k]!=='seeded'?String(props[k]):undefined;
 const parts={...(own('body')?{body:own('body')}:{}),...(own('hair')?{hair:own('hair')}:{}),...(own('garb')?{garb:own('garb')}:{}),...(own('facial')?{facial:own('facial')}:{}),...(Array.isArray(props.extras)?{extras:props.extras as string[]}:{}),
  ...(own('skin')?{skin:own('skin')}:{}),...(own('hairColour')?{hairCol:own('hairColour')}:{}),...(own('top')?{top:own('top')}:{}),...(own('bottom')?{bottom:own('bottom')}:{}),...(own('accent')?{acc:own('accent')}:{})} as Partial<Look>;
 const robot:BotLook|undefined=isBot(props)?{bot:props.kind as BotLook['bot'],...(own('paint')?{paint:own('paint')}:{}),...(own('trim')?{trim:own('trim')}:{}),...(own('screen')?{screen:own('screen')}:{}),...(own('face')?{face:own('face') as Face}:{}),...(own('variant')?{v:Number(own('variant')) as 0|1|2}:{})}:undefined;
 const look:Look={...parts,...(props.archetype?{archetype:props.archetype as ArchetypeId}:{}),...(props.style==='vivid'||props.style==='muted'?{style:props.style}:{}),...(props.district?{district:String(props.district)}:{}),...(props.tech==='yes'||props.tech==='no'?{kitted:props.tech==='yes'}:{})};
 const sitting=props.kind==='human'&&props.sitting&&props.sitting!=='no'?{seated:true,...(props.sitting!=='mixed'?{sitView:props.sitting as SitPose}:{})}:{};
 const body=props.kind==='human'?(Object.keys(look).length?{look}:{}):{look:robot&&Object.keys(robot).length>1?robot:props.kind as Character['look']};
 // movers go between here and `range` units away (negative: to the left); speed 0 is the body's usual pace
 const range=Number(props.range??0),speed=Number(props.speed??0)/60;
 // a seat or bed height (0: the kit's own, as before); lying: asleep, a blanket
 const seat=Number(props.seat??0),rest=props.kind==='human'?{...(seat>0?{seat}:{}),...(props.act==='lie'&&props.lying==='asleep'?{asleep:true}:{}),...(props.act==='lie'&&typeof props.cover==='string'&&props.cover!==''?{cover:props.cover}:{})}:{};
 actor={x:point.x,h:point.h,seed:Number(props.seed),act:props.act as Act,ps:band.ps,dim:Number(props.dim??-1)>=0?Number(props.dim):band.dim,parallax:band.parallax,...(props.facing==='left'?{facing:-1 as const}:props.facing==='right'?{facing:1 as const}:{}),...body,...sitting,...rest,...(range?{range}:{}),...(speed>0?{speed}:{})};
 cache.set(key,actor);if(cache.size>256)cache.delete(cache.keys().next().value!);return actor;
}
export const residentElement:AssetDefinition={
 spatial:fixedGeometry('The character body uses its kit proportions and depth band. Travel range and seat height configure motion and pose; they do not resize the body. Use placement or the supported pose controls.'),
 type:'character.resident',mobility:p=>Number(p.range)!==0,version:1,label:'Authored person, animal or robot',category:'characters',coordinates:'world', libraryUse: 'reusable',parts:['people'],
 fields:{
  kind:appearanceChoice({kind:'select',label:'Body kind',options:residentKinds,default:'human'}),
  archetype:appearanceChoice({kind:'select',label:'Named look',options:['',...ARCHETYPE_IDS],default:'',showIf:human}),
  seed:generationSeed({kind:'number',label:'Appearance seed',default:1,min:0,max:1000000,step:1}),
  act:appearanceChoice({kind:'select',label:'Activity',options:residentActs,default:'stand'}),
  range:shapeLength({kind:'number',label:'Travel range (movers; negative: to the left)',default:0,min:-4000,max:4000,step:1,unit:'units'}),
  speed:velocity('Speed (0: usual pace)',0,{min:0,max:600,step:3}),
  depthBand:semantic({kind:'select',label:'Depth',options:[...DEPTH_ORDER],default:'play'},{"group":"Depth","quantity":"choice","unit":"choice"}),
  // a silhouette against the light (the pier at sunset): darker than its depth band makes it; -1 keeps the band's
  dim:semantic({kind:'number',label:'Dimming (-1: the depth band’s)',default:-1,min:-1,max:1,step:0.01},{"group":"Depth","quantity":"factor","unit":"factor"}),
  facing:semantic({kind:'select',label:'Faces (standing; walkers face where they go)',options:['auto','right','left'],default:'auto'},{"group":"Transform","quantity":"choice","unit":"choice"}),
  style:appearanceChoice({kind:'select',label:'Colour style',options:['automatic','vivid','muted'],default:'automatic',showIf:human}),
  district:appearanceChoice({kind:'select',label:'District clothes',options:['',...DISTRICTS],default:'',showIf:human}),
  tech:semantic({kind:'select',label:'Visible tech',options:['automatic','yes','no'],default:'automatic',showIf:human},{"group":"Visibility & Drawing","quantity":"choice","unit":"choice"}),
  sitting:appearanceChoice({kind:'select',label:'Sitting',options:['no',...SEATED_VIEWS],default:'no',showIf:human}),
  // h is the floor; the seat (a sitter's lap) or the bed (someone lying) is this far above it. Furniture's `seat` anchors give the number.
  seat:shapeLength({kind:'number',label:'Seat or bed height over the floor (0: the kit’s own)',default:0,min:0,max:120,step:1,unit:'units',showIf:seatedOrLying}),
  lying:appearanceChoice({kind:'select',label:'Lying',options:['awake','asleep'],default:'awake',showIf:lying}),
  cover:appearanceStructure(colour('Blanket (lying)',lying,'No blanket')),
  body:appearanceChoice(sel('Build',['seeded',...BODY_KINDS],human)),hair:appearanceChoice(sel('Hair or headwear',['seeded',...HAIR_KINDS],human)),garb:appearanceChoice(sel('Clothes',['seeded',...GARB_KINDS],human)),facial:appearanceChoice(sel('Facial hair',['seeded',...FACIAL_KINDS],human)),
  extras:appearanceStructure({kind:'json',label:'Extras',default:'auto',showIf:human,editor:{kind:'set',options:EXTRA_KINDS,auto:'Seeded extras'},validate:(v:Value)=>{if(v!=='auto'&&!(Array.isArray(v)&&v.every(e=>(EXTRA_KINDS as readonly string[]).includes(e as string))))throw new Error('Extras: expected "auto" or a list of '+EXTRA_KINDS.join(', '));}}),
  skin:appearanceStructure(colour('Skin',human)),hairColour:appearanceStructure(colour('Hair colour',human)),top:appearanceStructure(colour('Top',human)),bottom:appearanceStructure(colour('Trousers or skirt',human)),accent:appearanceStructure(colour('Accent (hat, bag, umbrella)',human)),
  variant:appearanceChoice(sel('Robot variant',['seeded','0','1','2'],isBot)),face:appearanceChoice(sel('Robot face',['seeded',...FACES],isBot)),
  paint:appearanceStructure(colour('Robot paint',isBot)),trim:appearanceStructure(colour('Robot trim',isBot)),screen:appearanceStructure(colour('Robot screen',isBot)),
 },
 bounds:(props,_state,context)=>{
  const at=context?.placement??{x:0,h:0},body=residentCharacter(props,at),height=characterHeight(body),x=characterX(body,context?.view.t??0);
  const fallback={x:x-at.x-32,h:height-at.h,w:64,tall:height-at.h};
  return context?screenBounds(context,{x:context.view.sx(x,body.parallax??1)-32,y:context.view.y(height),w:64,h:height-at.h},fallback):fallback;
 },
 anchors:()=>({origin:{x:0,h:0,role:'origin'}}),
 draw:(ctx,view,props,_state,_pass,placement)=>drawCharacter(ctx,view,residentCharacter(props,placement)),
};
