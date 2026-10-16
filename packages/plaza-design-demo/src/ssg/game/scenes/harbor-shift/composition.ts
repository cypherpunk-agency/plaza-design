/** Authored night-shift layout and snapshots shared by shipping and the composer. */
import { art } from '../../art';
import { drawComposition,resolveComposition,type Composition,type Environment,type Value } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import { prepareCharacter,type Character } from '../../runtime/characters';
import type { SceneDef,SceneUse } from '../kit';
import { PAPER } from '../../art/core/primitives';
import source from './composition.json';
export type HarborShiftRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
const geometryView:View={sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:960,viewH:360,flags:{}};
const required=new Map(source.instances.map(n=>[n.id,n.type]));
const allowed=new Set(['actor.boss.pose','actor.mara.pose','shift.parcelPresent','shift.returned','shift.delivered','shift.casePresent','shift.trolleyX','shift.trolleyRestX','shift.released','shift.checked','shift.done',...['boss','parcel','mara','case','rack','trolley','clamp','checkout','statement'].map(id=>'cue.'+id)]);
export function validateHarborShiftComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='harborShift')throw new Error('Expected harborShift composition');for(const[id,type]of required)if(doc.instances.find(n=>n.id===id)?.type!==type)throw new Error('harborShift: missing/changed instance '+id);for(const n of doc.instances)for(const value of Object.values(n.bindings??{}))if(!allowed.has(value))throw new Error(n.id+': unknown shift binding '+value);return doc;}
export const harborShiftComposition=validateHarborShiftComposition(source);
function defaults(doc:Composition){const out:Record<string,Value>={};for(const n of doc.instances)for(const[k,binding]of Object.entries(n.bindings??{}))out[binding]=art.get(n.type).visualFields![k].default;return out;}
export function harborShiftGeometry(doc:Composition=harborShiftComposition){return resolveComposition(art,doc,{view:geometryView,bindings:defaults(doc),state:{},reduced:false});}
export function harborShiftLayout(doc:Composition=harborShiftComposition){const rows=harborShiftGeometry(doc),x=(id:string)=>rows.find(r=>r.instance.id===id)!.placement.x;return{boss:x('use-boss'),parcel:x('use-parcel'),rack:x('use-rack'),coworker:x('use-mara'),trolley:x('use-trolley'),bay:x('bay'),checkout:x('use-checkout')};}
export function harborShiftUses(uses:SceneUse[],doc:Composition=harborShiftComposition):SceneUse[]{const rows=harborShiftGeometry(doc);return uses.map(u=>{const at=rows.find(r=>r.instance.id==='use-'+u.id)!.placement;return{...u,x:at.x,...(at.h!==0?{h:(u.h??0)+at.h,promptH:(u.promptH??0)+at.h}:{})};});}
export function harborShiftEnvironment(doc:Composition,view:View,actors:Readonly<Record<string,Character>>,uses:SceneUse[]):Environment{
 const rows=harborShiftGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,f=view.flags,bindings=defaults(doc),flag=(id:string)=>!!f['shift:'+id];
 const values:Record<string,Value>={parcelPresent:!flag('parcel'),returned:flag('returned'),delivered:flag('delivered'),casePresent:flag('delivered')&&!flag('case'),trolleyX:get(flag('parked')?'bay':'trolley').placement.x,trolleyRestX:get('trolley').placement.x,released:flag('released'),checked:flag('checked'),done:flag('done')};
 for(const[k,value]of Object.entries(values))bindings['shift.'+k]=value;
 for(const use of uses)bindings['cue.'+use.id]=!use.available||use.available(f);
 for(const id of ['boss','mara']){const actor=actors[id],at=get(id).placement,pose=prepareCharacter(actor,view.t);if(pose.visible){const dx=at.x-actor.x,dh=at.h-(actor.h??0);bindings['actor.'+id+'.pose']={...pose,character:{...pose.character,x:at.x,h:at.h},frame:{...pose.frame,x:pose.frame.x+dx},height:pose.height+dh} as unknown as Value;}else bindings['actor.'+id+'.pose']=pose as unknown as Value;}
 return{view,state:{},bindings,reduced:false};
}
export function drawHarborShiftComposition(ctx:CanvasRenderingContext2D,view:View,actors:Readonly<Record<string,Character>>,uses:SceneUse[],doc=harborShiftComposition,state:Environment['state']={},options:HarborShiftRenderOptions={}){drawComposition(ctx,art,doc,{...harborShiftEnvironment(doc,view,actors,uses),state,...options},'backdrop');}
export function adaptHarborShift(scene:Omit<SceneDef,'drawBackdrop'>,actors:Readonly<Record<string,Character>>,document=harborShiftComposition,state:Environment['state']={},options:HarborShiftRenderOptions={}):SceneDef{const doc=validateHarborShiftComposition(document),rows=harborShiftGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,uses=harborShiftUses(scene.uses??[],doc);return{...scene,width:Number(get('scene').props.width),spawn:get('spawn').placement.x,horizon:get('horizon').placement.h,uses,lights:rows.filter(r=>r.props.role==='light').map(r=>({x:r.placement.x,h:r.placement.h,kind:'lamp',r:Number(r.props.width),col:PAPER})),drawBackdrop:(ctx,v)=>drawHarborShiftComposition(ctx,v,actors,uses,doc,state,options)};}
