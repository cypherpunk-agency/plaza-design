import type {Resolved,Value} from '../../../art/core/composition';
import type {DowntownDeviceState} from '../../../art/electronics/downtown-devices';
import {screenLine,sceneClimate} from '../../../world/weather';
import {downtownVisualSnapshot} from '../../controllers/downtown-visual';
import {downtownController} from '../../controllers/motion';
import {manifestGeometry} from '../manifest-geometry';
import {prepareActor} from '../actor-frame';
import {dlvX} from '../mechanisms/vehicle-run';
import type {BindingContext} from '../binding-sources';
import {provide} from '../binding-keys';
/**
 * `downtown.*`: what Downtown's street paints from the scene as it stands. Nothing here advances the
 * simulation; every value is worked out from the artwork as placed, the view and (when an engine
 * frame is painting) the model.
 *
 * - `downtown.width`: the scene's width. `downtown.weatherText`, `downtown.rain` and `downtown.city`: the ticker's line, the rain and
 *   whether the city is lit (the street moment passes the last two; every other moment paints them dry and lit).
 * - `downtown.stall` (`[x, width]` of the `stall` role) and `downtown.doorOffset` (the `alley` role's door).
 * - `downtown.front.<id>.metrics` / `.visible` and `downtown.window.<id>.enabled`: each building front's size and whether
 *   it is on screen, and whether a window is lit (its front is visible, it is not above the street's view and no
 *   mask covers it).
 * - `downtown.smear.<id>.x` / `.color`: where each neon's reflection lies (the `reflection0..9` roles).
 * - `downtown.pose.<actor>`: each street person's prepared sprite (engine/gameplay/actor-frame.ts), where the actor stands.
 * - `downtown.device.<id>.snapshot` (and `downtown.device.dlv9.position`): the machines on the street as the model leaves them.
 */
/** The neons that cast reflections in the puddles, in the order of the roles `reflection0`..`reflection9`. */
export const SMEAR_ORDER=['device-sign','noodle-stall','billboard-frame','market-neon','spaceport-neon','open-neon','exit-metro','exit-taxi','exit-shop','weather-ticker'] as const;
export const DOWNTOWN_REFLECTION_ROLES=SMEAR_ORDER.map((_,i)=>'reflection'+i);
/** The device pictures the street draws, one snapshot each. */
const DEVICES=['sign','box','till','relay','gate','fence','scan','cam3','billboard','dlv9','map','hover'] as const;
const EMPTY:DowntownDeviceState={controlled:false,gateHeld:false,lock:'shut',scanned:false,feed:'ads',dlvAt:'home',trace:0,signTestMs:3000,signSince:1e9,visible:true,hoverSpot:null};
/** Where each puddle reflection lies and its colour: the neon's own, shifted to where its light shows. */
export function smearList(roles:Readonly<Record<string,Resolved>>):[number,string][]{
 return SMEAR_ORDER.map((id,i)=>{const row=roles['reflection'+i],p=row.props,at=row.placement;let x=at.x,color=String(p.color??p.smearColor??'0,255,255');
  if(id==='noodle-stall')x+=Number(p.width)*at.scale*at.facing/2;if(id==='exit-metro')x+=31*at.scale*at.facing;if(id==='exit-taxi')x-=18*at.scale*at.facing;if(id==='weather-ticker')color='255,210,58';
  return[x,color];});
}
/** What stays the same while the artwork stands where it does: parents, masks, fronts and windows. */
interface Layout{owners:Map<string,string>;masks:number[][];fronts:Resolved[];windows:Resolved[];width:number}
const layouts=new WeakMap<readonly Resolved[],{source:unknown;layout:Layout}>();
function layoutOf(rows:readonly Resolved[],source:Parameters<typeof manifestGeometry>[0]):Layout{
 const known=layouts.get(rows);if(known&&known.source===source)return known.layout;
 const owners=new Map<string,string>();for(const r of rows)for(const c of r.instance.children??[])owners.set(c.id,r.instance.id);
 const masks=rows.filter(row=>Array.isArray(row.props.mask)&&(row.props.mask as Value[]).length===4).map(row=>{const m=row.props.mask as number[],p=row.placement,a=p.x+m[0]*p.scale*p.facing,b=p.x+m[1]*p.scale*p.facing;return[Math.min(a,b),Math.max(a,b),p.h+m[2]*p.scale,p.h+m[3]*p.scale];});
 const layout={owners,masks,fronts:rows.filter(r=>r.instance.type==='downtown.front'),windows:rows.filter(r=>r.instance.type==='downtown.window'),width:manifestGeometry(source,rows,[],{groundSpawn:false}).width};
 layouts.set(rows,{source,layout});return layout;
}
const downtownValues=(ctx:BindingContext):Record<string,Value>=>{
 const {view,rows,roles,source}=ctx,out:Record<string,Value>={},layout=layoutOf(rows,source);
 out.width=layout.width;out.weatherText=screenLine(sceneClimate(source.id));out.rain=0;out.city=true;
 const stall=roles.stall,alley=roles.alley;
 if(stall)out.stall=[stall.placement.x,Number(stall.props.width)];
 if(alley)out.doorOffset=Number(alley.props.doorOffset);
 for(const row of layout.fronts){
  const p=row.placement,w=Number(row.props.width),sx=view.sx(p.x),end=sx+w*p.scale*p.facing,visible=!(Math.max(sx,end)+4*p.scale<0||Math.min(sx,end)-4*p.scale>view.viewW);
  out['front.'+row.instance.id+'.metrics']=[w,Number(row.props.height),!!row.props.roof,visible];out['front.'+row.instance.id+'.visible']=visible;
 }
 for(const row of layout.windows){
  const id=row.instance.id,parent=row.instance.attach?.instance??layout.owners.get(id),p=row.placement,a=p.x,b=a+14*p.scale*p.facing,x0=Math.min(a,b),x1=Math.max(a,b),h0=p.h-28*p.scale;
  out['window.'+id+'.enabled']=!!out['front.'+parent+'.visible']&&h0<=view.gy&&!layout.masks.some(([a,b,c,d])=>x0<b&&x1>a&&h0<d&&p.h>c);
 }
 if(roles.reflection0)smearList(roles).forEach(([x,color],i)=>{out['smear.'+SMEAR_ORDER[i]+'.x']=x;out['smear.'+SMEAR_ORDER[i]+'.color']=color;});
 for(const[id,body]of Object.entries(ctx.actors))out['pose.'+id]=prepareActor(body,view) as unknown as Value;
 const model=ctx.engine?.m,hover=ctx.engine?.hover,dlv=model?dlvX(model):undefined;
 for(const id of DEVICES){
  const snapshot:DowntownDeviceState={...EMPTY};
  if(model){Object.assign(snapshot,downtownVisualSnapshot(model,id));snapshot.dlvAt=String(model.get(downtownController(model.data).state.at));snapshot.visible=dlv!==null;
   if(id==='hover'&&hover){const spot=model.spots().find(p=>p.id===hover);if(spot)snapshot.hoverSpot={x:spot.x,y:spot.y,w:spot.w,h:spot.h};}}
  out['device.'+id+'.snapshot']=snapshot as unknown as Value;
 }
 if(roles.vehicleHome)out['device.dlv9.position']=dlv??roles.vehicleHome.placement.x;
 return out;
};
/** What the provider offers: its exact keys, and fronts, windows and street people by what the composition and scene hold. */
export const DOWNTOWN_KEYS=['width','weatherText','rain','city','stall','doorOffset','front.<instance:downtown.front>.metrics','front.<instance:downtown.front>.visible','window.<instance:downtown.window>.enabled',...SMEAR_ORDER.flatMap(id=>['smear.'+id+'.x','smear.'+id+'.color']),'pose.<actor>',...DEVICES.map(id=>'device.'+id+'.snapshot'),'device.dlv9.position'];
export const downtown=provide(DOWNTOWN_KEYS,downtownValues);
