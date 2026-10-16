/** Independently placed beach artwork; controllers supply named visual snapshots. */
import type { Element,Field,Properties,Placement } from '../core/composition';
import { placed,type View } from '../core/view';
import { menuBoard } from '../signage/screens';
import { createBeachArtwork,type BeachLayout,type BeachVisualState } from './beach';
import { saltUnder,saltBack,saltShell,saltCounter,saltLights } from './beach-bar';
const num=(label:string,value=0):Field=>({kind:'number',label,default:value,min:-1e12,max:1e12,step:1});
const str=(label:string,value=''):Field=>({kind:'string',label,default:value});
const bool=(label:string,value=false):Field=>({kind:'boolean',label,default:value});
const n=(p:Properties,k:string)=>Number(p[k]);
export const beachVisualFields:Record<string,Field>={palette:num('Daylight palette'),horizon:num('Horizon height'),waterline:num('Waterline height'),rented:bool('Bed rented'),billingPaused:bool('Billing paused'),billed:num('Bill'),freeDrink:bool('Drink poured'),danger:bool('Danger flag'),lamps:bool('Pier lights'),gullShooed:num('Gull last shooed',-1e9),hover:str('Hovered device'),barVisible:bool('Bar in view',true),barWidth:num('Bar width'),towerVisible:bool('Tower in view',true),pierVisible:bool('Pier in view',true),boardwalkVisible:bool('Boardwalk in view',true),drinkX:num('Drink position'),drinkH:num('Drink height'),shore:num('Shore edge'),lampPositions:{kind:'json',label:'Reflection lamp positions',default:[],validate:v=>{if(!Array.isArray(v)||v.some(q=>typeof q!=='number'||!Number.isFinite(q)))throw new Error('Expected finite lamp positions');}}};
const common=Object.keys(beachVisualFields);
type Draw=(x:CanvasRenderingContext2D,v:View,p:Properties,s:Properties,at:Required<Placement>)=>void;
const origin={x:0,h:0,role:'origin' as const};
function element(type:string,label:string,fields:Record<string,Field>,draw:Draw,keys:string[]=common):Element{return{type:'beach.'+type,version:1,label,category:type==='marker'?'markers':'beach',coordinates:'world',fields,visualFields:Object.fromEntries(keys.map(k=>[k,beachVisualFields[k]])),parts:['backdrop'],bounds:p=>({x:-80,h:Number(p.height??150),w:Number(p.width??160),tall:Number(p.height??150)}),anchors:()=>({origin}),draw(x,v,p,s,_pass,at){draw(x,v,p,s,at);}};}
const blank:BeachLayout={stairs:0,board:0,boardwalk:0,kiosk:0,sunbeds:[],mine:0,shack:{x0:0,x1:0},jukebox:0,lime:0,order:0,mixer:0,crab:0,tower:0,drone:0,net:0,castle:0,surfer:0,shore:0,pier0:0,pierLights:0,fisher:0,gull:0,boat:0};
const kernel=(s:Properties,L:Partial<BeachLayout>={},width=0)=>createBeachArtwork({HORIZON:n(s,'horizon'),WATERLINE:n(s,'waterline'),L:{...blank,...L},BEACH_W:width});
const state=(s:Properties):BeachVisualState=>({rented:!!s.rented,billingPaused:!!s.billingPaused,billed:n(s,'billed'),freeDrink:!!s.freeDrink,danger:!!s.danger,lamps:!!s.lamps,gullShooed:n(s,'gullShooed')});
const raised=(v:View,h:number):View=>h===0?v:{...v,gy:v.gy-h,y:q=>v.y(q+h)};
const bar=(fn:(x:CanvasRenderingContext2D,w:number,p:number,t:number)=>void):Draw=>(x,v,_p,s,at)=>{if(s.barVisible)placed(x,v.sx(at.x),v.y(at.h),1,()=>fn(x,n(s,'barWidth'),n(s,'palette'),v.t));};
const ordinary=(method:'kiosk'|'lime'|'crab'|'volleyball'|'castle'|'board'|'rod'|'boat'|'postGull'|'publicNotice'|'jukebox'|'tower'|'drone'|'pierController',field:keyof BeachLayout):Draw=>(x,v,_p,s,at)=>{
 if(['lime','jukebox'].includes(method)&&!s.barVisible||method==='drone'&&!s.towerVisible||method==='publicNotice'&&!s.boardwalkVisible||method==='pierController'&&!s.pierVisible)return;
 const k=kernel(s,{[field]:at.x-(method==='board'?12:0)}),V=raised(v,at.h),st=state(s),hover=String(s.hover)||null,p=n(s,'palette');
 switch(method){case'kiosk':k.kiosk(x,V,st,hover);break;case'lime':k.lime(x,V);break;case'crab':k.crab(x,V);break;case'volleyball':k.volleyball(x,V);break;case'castle':k.castle(x,V,p);break;case'board':k.board(x,V);break;case'rod':k.rod(x,V);break;case'boat':k.boat(x,V,hover,p);break;case'postGull':k.postGull(x,V,st);break;case'publicNotice':k.publicNotice(x,V);break;case'jukebox':k.jukebox(x,V,hover);break;case'tower':k.tower(x,V,st);break;case'drone':k.drone(x,V,st,hover);break;case'pierController':k.pierController(x,V,st,hover);}
};
export const beachElements:Element[]=[
 element('marker','Beach gameplay marker',{role:str('Role'),width:num('Width'),height:num('Height')},()=>{},[]),
 element('light','Scene light source',{kind:{kind:'select',label:'Kind',default:'lamp',options:['lamp','neon','window']},radius:num('Radius'),color:str('RGB color'),width:num('Window width'),lightHeight:num('Window height'),alpha:num('Alpha',1)},()=>{},[]),
 element('sky','Sun, sky and clouds',{},(x,v,_p,s,at)=>kernel(s).sky(x,raised(v,at.h),n(s,'palette'))),
 element('city','Distant city skyline',{},(x,v,_p,s,at)=>kernel(s).city(x,raised(v,at.h),n(s,'palette'))),
 element('sea','Waves and sea',{},(x,v,_p,s,at)=>kernel(s).seaBase(x,raised(v,at.h),n(s,'palette'))),
 element('buoy','Swim-zone buoy',{},(x,v,_p,s,at)=>kernel(s).buoy(x,v,at.x,at.h)),
 element('surfing','Surfer on a swell',{},(x,v,_p,s,at)=>kernel(s).surfing(x,raised(v,at.h),at.x)),
 element('swimmer','Swimmer in the water',{depth:num('Water depth'),phase:num('Stroke phase')},(x,v,p,s,at)=>{if(!s.danger)kernel(s).swimmer(x,raised(v,at.h),n(p,'phase'),{x:at.x,d:n(p,'depth')});}),
 element('shore','Sand and wash',{},(x,v,_p,s,at)=>kernel(s).shore(x,raised(v,at.h),n(s,'palette'))),
 element('gulls','Wheeling sea gulls',{},(x,v,_p,s,at)=>kernel(s).gulls(x,raised(v,at.h))),
 element('stairs','Promenade wall and harbor stairs',{},(x,v,_p,s,at)=>{const V=raised(v,at.h);kernel(s).stairs(x,{...V,sx:(wx,par=1)=>V.sx(wx+at.x,par)},n(s,'palette'));}),
 element('boardwalk','Boardwalk planks',{width:num('Width')},(x,v,p,s,at)=>kernel(s,{boardwalk:at.x+n(p,'width')}).boardwalk(x,raised(v,at.h),n(s,'palette'),at.x)),
 element('public-notice','Registry beach notice',{},ordinary('publicNotice','board')),
 element('sunbed','Sunbed and parasol',{index:num('Bed number index'),color:{kind:'color',label:'Fabric',default:'#c83a2a'},rentable:bool('Rental bed')},(x,v,p,s,at)=>kernel(s).sunbed(x,raised(v,at.h),at.x,n(p,'index'),String(p.color),!!p.rentable,state(s),n(s,'palette'))),
 element('kiosk','Sunbed rental kiosk',{},ordinary('kiosk','kiosk')),
 element('bar-under','SALT stilts and warm light',{width:num('Width')},bar((x,w)=>saltUnder(x,w))),
 element('bar-back','SALT back shelves',{},bar((x,w)=>saltBack(x,w))),
 element('bar-photo','Moth photo behind the gin',{},(x,v,_p,s,at)=>{if(s.barVisible)kernel(s).barPhoto(x,raised(v,at.h),at.x);}),
 element('lime','LIME robot bartender',{},ordinary('lime','lime')),
 element('bar-shell','SALT shack, ladder and neon',{},bar(saltShell)),
 element('bar-counter','SALT counter',{},bar((x,w)=>saltCounter(x,w))),
 element('menu','SALT menu board',{},(x,v,_p,s,at)=>{if(s.barVisible)menuBoard(x,raised(v,at.h),{x:at.x,h:36,w:66,tall:22,mount:'hang',to:64,items:[['HOUSE','2T'],['WATER','2T']],phase:70});}),
 element('bar-stool','SALT stool',{},(x,v,_p,s,at)=>{if(s.barVisible)kernel(s).barStool(x,raised(v,at.h),at.x);}),
 element('bar-lights','SALT string lights',{},bar((x,w,_p,t)=>saltLights(x,w,t))),
 element('jukebox','SALT jukebox',{},ordinary('jukebox','jukebox')),
 element('mixer','SALT drink mixer',{},(x,v,_p,s,at)=>{if(s.barVisible)kernel(s,{mixer:at.x}).mixer(x,raised(v,at.h),state(s),String(s.hover)||null,n(s,'drinkX'),n(s,'drinkH')-at.h);}),
 element('crab','Crab on the sand',{},ordinary('crab','crab')),
 element('tower','Lifeguard tower and flag',{},ordinary('tower','tower')),
 element('drone','Registry rescue drone',{},ordinary('drone','drone')),
 element('volleyball','Volleyball net',{},ordinary('volleyball','net')),
 element('castle','Registry sandcastle',{},ordinary('castle','castle')),
 element('board','Surfer board',{},ordinary('board','surfer')),
 element('boat','Moth boat and harbor notice',{},ordinary('boat','boat')),
 element('pier-deck','Pier piles, planks and railing',{width:num('Width'),railingLength:num('Railing length')},(x,v,p,s,at)=>kernel(s,{pier0:at.x},at.x+n(p,'width')-20).pierDeck(x,raised(v,at.h),n(s,'palette'),at.x+n(p,'railingLength'))),
 element('pier-lamp','Pier lamp and light cone',{},(x,v,_p,s,at)=>{if(s.pierVisible)kernel(s).pierLamp(x,raised(v,at.h),at.x,!!s.lamps);}),
 element('pier-controller','Pier lamp schedule controller',{},ordinary('pierController','pierLights')),
 element('berth-sign','Harbor berth permit sign',{},(x,v,_p,s,at)=>{if(s.pierVisible)kernel(s).berthSign(x,raised(v,at.h),at.x);}),
 element('rod','Fishing rod and line',{},ordinary('rod','fisher')),
 element('post-gull','Gull on its pier post',{},ordinary('postGull','gull')),
 element('foreground','Near sand, water and lamp reflections',{},(x,v,_p,s,at)=>kernel(s,{shore:n(s,'shore')}).foreground(x,raised(v,at.h),state(s),n(s,'palette'),s.lampPositions as number[])),
];
