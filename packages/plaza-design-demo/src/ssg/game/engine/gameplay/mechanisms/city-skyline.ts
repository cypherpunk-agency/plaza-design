import {Skyline,type SkylineSnapshot,type SkyFrame} from '../../../art/environment/skyline';
import {metroSnapshotValue,type MetroCityVisual} from '../../../art/assemblies/metro-elements';
import type {Value} from '../../../art/core/composition';
import type {View} from '../../../art/core/view';
import {light} from '../../../world/light';
import type {SceneMechanism} from '../scene-mechanisms';
/**
 * Mechanism `citySkyline` (scene.json `stage.mechanisms`): the city seen from an elevated platform
 * (Downtown's LINE 0 stop). The skyline is a small animated simulation (traffic packets crossing
 * its bands) that advances once per painted frame and is saved with the scene's presentation
 * state, so it comes back where it was. The scene's `horizon` artwork role is the skyline's
 * horizon line, its width the camera range. The prepared frame is offered to the artwork as
 * `station.city` (binding-providers/station.ts, through the scene's shared frame state).
 */
/** Layout initialization here needs gradients only; the controller never paints a canvas. */
const layoutSink={createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})} as unknown as CanvasRenderingContext2D;
export interface CityState{city:SkylineSnapshot|null;time:number;frame:SkyFrame|null}
export interface SkylineLayout{width:number;horizon:number}
function validateCityState(input:unknown):CityState{
 const value=input as CityState;if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['city','time','frame'].includes(k))||!Number.isFinite(value.time))throw new Error('Invalid Metro presentation state');
 if(value.city===null){if(value.frame!==null||value.time!==-1)throw new Error('Invalid uninitialized Metro presentation state');return value;}
 const c=value.city,f=value.frame;if(!c||typeof c!=='object'||Object.keys(c).some(k=>!['key','random','packets'].includes(k))||typeof c.key!=='string'||!Number.isInteger(c.random)||c.random<0||c.random>=233280||!Array.isArray(c.packets)||c.packets.length!==16||!f||typeof f!=='object'||Object.keys(f).some(k=>!['W','H','top','horizon','sky','sunX','camMax'].includes(k))||![f.W,f.H,f.top,f.horizon,f.sky,f.sunX,f.camMax].every(Number.isFinite)||f.W<=0||f.H<=0||value.time<0)throw new Error('Invalid Metro skyline snapshot');
 for(const p of c.packets)if(!p||typeof p!=='object'||Object.keys(p).some(k=>!['r','out','ph','k','s','v','cyan','sx','wait','dir'].includes(k))||![p.r,p.ph,p.k,p.s,p.v,p.sx,p.wait,p.dir].every(Number.isFinite)||typeof p.out!=='boolean'||typeof p.cyan!=='boolean'||!Number.isInteger(p.ph)||p.ph<0||p.ph>5||!Number.isInteger(p.r)||p.r<0||!Number.isInteger(p.k)||p.k<0||![-1,1].includes(p.dir))throw new Error('Invalid Metro packet snapshot');
 return structuredClone(value);
}
/** A scene host owns this controller; painting and bounds consume one immutable prepared frame. */
export class CitySession{
 private city=new Skyline();private time=-1;private frame:SkyFrame|null=null;
 sample(L:SkylineLayout,view:View):MetroCityVisual{const W=Math.ceil(view.viewW),H=Math.ceil(view.viewH),horizon=view.y(L.horizon),k=this.time<0?0:Math.min(3,Math.max(0,view.t-this.time))*.6,frame={W,H,top:0,horizon,sky:Math.min(horizon,400),sunX:W*.58,camMax:Math.round(L.width*.5)},draw={cam:Math.max(0,Math.round(view.cam*.5)),a:view.t,k,still:false,floor:false,rain:0,over:{stars:light().night}};this.city.parts(layoutSink,frame,draw);const before=this.city.snapshot();this.city.advance(layoutSink,frame,k,false);this.time=view.t;this.frame=frame;return{frame,draw,before};}
 preview(L:SkylineLayout,view:View):MetroCityVisual{const copy=new CitySession();copy.restore(this.snapshot());return copy.sample(L,view);}
 snapshot():CityState{return{city:this.frame?this.city.snapshot():null,time:this.time,frame:this.frame?{...this.frame}:null};}
 restore(input:unknown){const value=validateCityState(input);this.city=new Skyline();if(value.city&&value.frame){this.city.parts(layoutSink,value.frame,{cam:0,a:0,k:0,still:false,floor:false,rain:0});this.city.restore(value.city);}this.time=value.time;this.frame=value.frame;}
}
/** What the mechanism keeps in the scene's shared frame state. */
export interface SkylineHandle{session:CitySession;layout:SkylineLayout;prepared?:MetroCityVisual}
export const SKYLINE_KEY='citySkyline';
/** The skyline for this frame: the one prepared for it, else a preview from the saved state; undefined when the scene has no skyline. */
export function skylineValue(shared:ReadonlyMap<string,unknown>|undefined,view:View):Value|undefined{
 const handle=shared?.get(SKYLINE_KEY) as SkylineHandle|undefined;
 return handle?metroSnapshotValue(handle.prepared??handle.session.preview(handle.layout,view)):undefined;
}
export const citySkyline:SceneMechanism={
 face:{function:'hold'},
 label:'City skyline (animated, saved with the scene)',requires:['horizon'],world:false,
 apply:({roles,width,shared})=>{
  const handle:SkylineHandle={session:new CitySession(),layout:{width,horizon:roles.horizon.placement.h}};shared.set(SKYLINE_KEY,handle);
  return{
   presentationState:{capture:()=>handle.session.snapshot() as unknown as Value,restore(value){handle.session.restore(value);handle.prepared=undefined;}},
   preparePresentation:v=>{handle.prepared=handle.session.sample(handle.layout,v);},
  };
 },
};
