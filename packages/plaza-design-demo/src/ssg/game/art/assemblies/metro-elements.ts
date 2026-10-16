/** Elevated-platform pieces. Transport and skyline evolution arrive as explicit snapshots. */
import type { Element,Field,Properties,Value } from '../core/composition';
import type { View } from '../core/view';
import { createDowntownPlatformArtwork,type MetroLayout } from './downtown-platform';
import { Skyline,skylinePartIds,type SkyFrame,type SkyDraw,type SkylineSnapshot } from '../environment/skyline';
import { notice } from '../core/primitives';
export interface MetroCityVisual{frame:SkyFrame;draw:SkyDraw;before:SkylineSnapshot}
const num=(label:string,value=0):Field=>({kind:'number',label,default:value,min:-1e5,max:1e5,step:1});
const n=(p:Properties,k:string)=>Number(p[k]);
const origin={x:0,h:0,role:'origin' as const};
const raised=(v:View,h:number):View=>h===0?v:{...v,gy:v.gy-h,y:q=>v.y(q+h)};
const blank:MetroLayout={width:0,spawn:0,canopy:{under:0,fascia:0,truss:0},deck:0,horizon:0,signs:[],cityMap:0,pillars:[],lamps:[],board:0,benches:[],pierStep:1,boardAt:0,screen:0,waiting:[]};
const kernels=(p:Properties,s:Properties)=>createDowntownPlatformArtwork({L:{...blank,width:Number(p.width??s.width??0),deck:Number(p.deck??0),canopy:{under:Number(p.under??s.roof??0),fascia:Number(p.fascia??0),truss:Number(p.truss??0)}}});
const city:Field={kind:'json',label:'Prepared skyline frame',default:null,validate:value=>{if(value===null)return;const c=value as unknown as MetroCityVisual;if(!c||typeof c!=='object'||!c.frame||!c.draw||!c.before||![c.frame.W,c.frame.H,c.frame.horizon,c.draw.cam,c.draw.a,c.draw.k,c.before.random].every(Number.isFinite)||typeof c.before.key!=='string'||!Array.isArray(c.before.packets))throw new Error('Invalid metro city snapshot');}};
const painter=new Skyline();
type Draw=(x:CanvasRenderingContext2D,v:View,p:Properties,s:Properties,at:{x:number;h:number})=>void;
function E(type:string,label:string,fields:Record<string,Field>,draw:Draw,visualFields:Record<string,Field>={}):Element{return{type:'metro.'+type,version:1,label,category:'elevated metro',coordinates:'world',fields,visualFields,parts:['backdrop'],bounds:p=>({x:-Number(p.width??120)/2,h:Number(p.height??180),w:Number(p.width??120),tall:Number(p.height??180)}),anchors:()=>({origin}),draw(ctx,v,p,s,_pass,at){draw(ctx,raised(v,at.h),p,s,at);}};}
export const metroElements:Element[]=[
 E('marker','Metro gameplay marker',{role:{kind:'string',label:'Role',default:''},width:num('Width'),height:num('Height')},()=>{}),
 E('skyline-part','City skyline band',{part:{kind:'select',label:'Band',default:'far',options:[...skylinePartIds]}},(ctx,v,p,s,at)=>{if(s.city===null)return;const c=s.city as unknown as MetroCityVisual,dx=v.sx(at.x)-v.sx(0),dh=at.h;if(dx||dh){ctx.save();ctx.translate(dx,-dh);}try{const parts=painter.parts(ctx,c.frame,c.draw);painter.restore(c.before);parts.find(part=>part.id===p.part)!.draw();}finally{if(dx||dh)ctx.restore();}},{city}),
 E('city-wash','City daylight wash',{roofOnly:{kind:'boolean',label:'Above canopy only',default:false}},(ctx,v,p,s)=>{ctx.fillStyle='rgba(2,1,0,'+(p.roofOnly?.3*(1-.7*n(s,'daylight')):.55*(1-.75*n(s,'daylight'))).toFixed(3)+')';ctx.fillRect(0,0,v.viewW,p.roofOnly?Math.max(0,v.y(n(s,'truss'))):v.viewH);},{daylight:num('Daylight'),truss:num('Truss height')}),
 E('far-rail','Viaduct far rail',{deck:num('Deck height')},(ctx,v,p,s)=>kernels(p,s).drawFarRail(ctx,v)),
 E('track-base','Track ballast and rails',{deck:num('Deck height')},(ctx,v,p,s)=>kernels(p,s).drawTrackBase(ctx,v)),
 E('track-edge','Track yellow edge',{},(ctx,v,p,s)=>kernels(p,s).drawTrackEdge(ctx,v)),
 E('canopy','Canopy truss and fascia',{width:num('Width'),under:num('Underside'),fascia:num('Fascia'),truss:num('Truss')},(ctx,v,p,s,at)=>kernels(p,s).drawCanopy(ctx,at.x===0?v:{...v,sx:(wx,par=1)=>v.sx(wx+at.x,par)})),
 E('lamp','Canopy strip lamp and light cone',{},(ctx,v,p,s,at)=>kernels(p,s).drawLamp(ctx,v,at.x),{roof:num('Canopy underside')}),
 E('pillar','Braced canopy pillar',{camera:{kind:'boolean',label:'CCTV',default:false}},(ctx,v,p,s,at)=>kernels(p,s).drawPillar(ctx,v,{x:at.x,...(p.camera?{cam:true}:{})}),{roof:num('Canopy underside')}),
 E('sign','Downtown station name',{},(ctx,v,p,s,at)=>kernels(p,s).drawSign(ctx,v,at.x),{roof:num('Canopy underside')}),
 E('notice','Line map or advertising notice',{first:{kind:'string',label:'First line',default:''},second:{kind:'string',label:'Second line',default:''},phase:num('Phase')},(ctx,v,p,_s,at)=>notice(ctx,v.t,v.sx(at.x),v.y(0),44,30,p.second?[String(p.first),String(p.second)]:[String(p.first)],n(p,'phase'))),
 E('below','Street glow far below the viaduct',{},(ctx,v,p,s)=>kernels(p,s).drawBelow(ctx,v)),
 E('pier','Viaduct support pier',{},(ctx,v,p,s,at)=>kernels(p,s).drawPier(ctx,v,at.x)),
 E('girder','Riveted deck girder',{width:num('Width')},(ctx,v,p,s)=>kernels(p,s).drawGirder(ctx,v)),
 E('slab','Platform slab and gap warnings',{width:num('Width')},(ctx,v,p,s)=>kernels(p,s).drawSlab(ctx,v)),
 E('city-map','Backlit city map',{},(ctx,v,p,s,at)=>kernels(p,s).drawCityMap(ctx,v,at.x)),
 E('stairs','Stairs to Downtown',{},(ctx,v,p,s,at)=>kernels(p,s).drawStairs(ctx,v,at.x)),
 E('turnstile','Exit identity reader and flap',{},(ctx,v,p,s,at)=>kernels(p,s).drawTurnstile(ctx,v,at.x)),
];
export const metroSnapshotValue=(v:MetroCityVisual):Value=>v as unknown as Value;
