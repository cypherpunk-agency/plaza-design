/** A sky is one selectable artwork group: atmosphere, sun, moon and clouds. */
import type {AssetDefinition,Value} from '../core/composition';
import {drawSky} from './sky';
import {screenBounds} from '../assemblies/static-bounds';
export interface SkyRegion {from:number;to:number;enter:number;leave:number;town:number}
export function validateSkyRegions(value:Value){if(!Array.isArray(value)||value.length>16||value.some(v=>{const r=v as unknown as SkyRegion;return !r||Object.keys(r).some(k=>!['from','to','enter','leave','town'].includes(k))||!['from','to','enter','leave','town'].every(k=>Number.isFinite(r[k as keyof SkyRegion]))||r.from>=r.to||r.enter<0||r.leave<0||r.town<0||r.town>1;}))throw Error('Invalid sky regions');}
export function skyTown(regions:readonly SkyRegion[],x:number){const smooth=(v:number)=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};return Math.max(0,...regions.map(r=>r.town*(r.enter?smooth((x-r.from)/r.enter):Number(x>=r.from))*(r.leave?smooth((r.to-x)/r.leave):Number(x<=r.to))));}
const number=(label:string):import('../core/composition').Field=>({kind:'number',label,default:0});
export const skyElement:AssetDefinition={type:'environment.sky',version:1,label:'Sky (sun, moon and clouds)',category:'Atmosphere',libraryUse:'reusable',coordinates:'world',framePhase:'sky',parts:['backdrop'],
 fields:{horizon:{kind:'number',label:'Horizon',default:0},style:{kind:'select',label:'Style',default:'city',options:['city','sunset']},town:{kind:'number',label:'City haze',default:0,min:0,max:1},regions:{kind:'json',label:'City haze regions',default:[],validate:validateSkyRegions,editor:{kind:'list',addLabel:'Add region',item:{from:number('From X'),to:{...number('To X'),default:100},enter:number('Fade in distance'),leave:number('Fade out distance'),town:{...number('City haze'),default:1,min:0,max:1}}}}},
 bounds:(_p,_s,c)=>screenBounds(c,{x:0,y:0,w:c?.view.viewW??1280,h:c?.view.viewH??720},{x:0,h:720,w:1280,tall:720}),anchors:()=>({origin:{x:0,h:0,role:'origin'}}),
 draw(ctx,v,p,_s,_pass,at){ctx.save();try{ctx.translate(v.sx(at.x)-v.sx(0),0);drawSky(ctx,v,v.lighting,{horizon:v.y(at.h+Number(p.horizon)),style:p.style as 'city'|'sunset',town:Math.max(Number(p.town),skyTown(p.regions as unknown as SkyRegion[],(v.cameraFrame?.view.cam??v.cam)+(v.cameraFrame?.view.viewW??v.viewW)/2))});}finally{ctx.restore();}}
};
