/** Canonical Mall source geometry and prepared character bindings. */
import {art,drawComposition,resolveComposition,type Composition,type Environment,type Value}from '../../art';
import {emptyMallVisual,type MallVisual}from '../../art/assemblies/mall-state';
import type {MallLayout}from '../../art/assemblies/mall-details';
import type {View}from '../../art/core/view';
import {prepareCharacter,type Character,type PreparedCharacter}from '../../runtime/characters';
import {light}from '../../world/light';
import document from './composition.json';
export const mallArt=art,mallComposition=art.validate(document);
const required=['scene','spawn','metro','roof','service','directory','fountain','registry','escalator','escalator-front','escalator-sign','deck-booth','cases-booth',...['implants','pawn','florist','keys','noodles','burger','dumplings'],...['metro','taxi','market'].map(k=>'exit-'+k),...['kiosk','fountain','escalator'].map(k=>'read-'+k),...['implants','kiosk','pawn','deck','florist','keys','order'].map(k=>'use-'+k)];
export function validateMallComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='mall')throw Error('Expected mall composition');for(const id of required)if(!doc.instances.some(i=>i.id===id))throw Error('Missing gameplay-bound Mall instance '+id);for(const i of doc.instances)for(const[k,s]of Object.entries(i.bindings??{})){const expected=k==='snapshot'?'mall.snapshot':k==='vendorPose'?'mall.vendor.'+(i.id==='deck-booth'?'deckTech':'teen'):k==='pose'?'mall.actor.'+i.props.actor:'mall.clip.'+i.props.actor;if(s!==expected)throw Error(i.id+': unknown Mall binding '+s);}return doc;}
validateMallComposition(mallComposition);
const defaults=(doc:Composition)=>{const b:Record<string,Value>={'mall.snapshot':emptyMallVisual as unknown as Value};for(const i of doc.instances){if(i.type==='character.prepared'){b['mall.actor.'+i.props.actor]={visible:false,character:{x:0}};b['mall.clip.'+i.props.actor]=null;}if(i.id==='deck-booth'||i.id==='cases-booth')b['mall.vendor.'+(i.id==='deck-booth'?'deckTech':'teen')]={visible:false,character:{x:0}};}return b;};
const geometryView:View={sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
export const mallGeometry=(doc:Composition=mallComposition)=>resolveComposition(art,doc,{view:geometryView,state:{},reduced:false,bindings:defaults(doc)});
export function mallPlacement(id:string,doc:Composition=mallComposition){const r=mallGeometry(doc).find(r=>r.instance.id===id);if(!r)throw Error('Unknown Mall instance '+id);return r.placement;}
export function mallLayout(doc:Composition=mallComposition):MallLayout{const rows=mallGeometry(doc),r=(id:string)=>rows.find(r=>r.instance.id===id)!,p=(id:string)=>r(id).placement,s=r('scene').props;return{width:Number(s.width),spawn:p('spawn').x,ceil:Number(s.ceil),fascia:Number(s.fascia),slab:Number(s.slab),rail:Number(s.rail),far0:Number(s.far0),step:Number(s.step),storey:Number(s.storey),kiosk:p('directory').x,registry:p('registry').x,escalator:{x:p('escalator').x,w:Number(r('escalator').props.width)},escSign:p('escalator-sign').x,fountain:{x:p('fountain').x,w:Number(r('fountain').props.width)},pillars:[0,1,2].map(i=>p('pillar-'+i).x),metro:p('metro').x,roof:p('roof').x,service:p('service').x};}
export function mallLevels(view:View,layout:MallLayout){const count=Math.max(2,Math.floor((view.gy-layout.far0-30)/layout.step));return Array.from({length:count},(_,i)=>layout.far0+i*layout.step);}
export type MallRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export function mallEnvironment(view:View,actors:Readonly<Record<string,Character>>,doc:Composition=mallComposition):Environment{const rows=mallGeometry(doc),layout=mallLayout(doc),levels=mallLevels(view,layout),snapshot:MallVisual={layout,levels,light:structuredClone(light())},bindings=defaults(doc);bindings['mall.snapshot']=snapshot as unknown as Value;
for(const r of rows.filter(r=>r.instance.type==='character.prepared')){const id=String(r.props.actor),p=actors[id];if(!p)throw Error('Unknown Mall actor '+id);let x=r.placement.x,h=r.placement.h;
if(id.startsWith('far-'))h+=levels[Number(id.slice(4))%levels.length]+8;
if(id.startsWith('gallery-'))h+=layout.slab-144;
if(id.startsWith('rider-')){const f=(view.t*.0012+Number(id.slice(6))/3)%1;x+=layout.escalator.x+8+f*(layout.escalator.w-16);h+=f*(layout.slab-4);}
let pose:PreparedCharacter=prepareCharacter(p,view.t);if(pose.visible){pose={...pose,character:{...pose.character,x,...(p.h!==undefined||h!==0?{h}:{})},frame:{...pose.frame,x:pose.frame.x+x-p.x},height:pose.height+h-(p.h??0)};}
if(id.startsWith('rider-')&&(view.sx(layout.escalator.x+layout.escalator.w)<-20||view.sx(layout.escalator.x)>view.viewW+20))pose={visible:false,character:pose.character};bindings['mall.actor.'+id]=pose as unknown as Value;
}
for(const[id,instance]of [['deckTech','deck-booth'],['teen','cases-booth']]){const p=actors[id],at=rows.find(r=>r.instance.id===instance)!.placement,original=id==='deckTech'?1080:1434;bindings['mall.vendor.'+id]=prepareCharacter(p,view.t,{x:p.x+at.x-original,h:(p.h??0)+at.h}) as unknown as Value;}
return{view,state:{},bindings,reduced:false};}
export function mallPeople(actors:Readonly<Record<string,Character>>,doc:Composition=mallComposition){const rows=mallGeometry(doc);return ['teen','kid','diner','securityPerson','dancer','pigeon'].map(id=>{const p=structuredClone(actors[id]),row=rows.find(r=>r.props.actor===id);if(row){p.x=row.placement.x;if(p.h!==undefined||row.placement.h!==0)p.h=row.placement.h;}else if(id==='teen')p.x+=mallPlacement('cases-booth',doc).x-1434;return p;});}
export function drawMallComposition(ctx:CanvasRenderingContext2D,view:View,actors:Readonly<Record<string,Character>>,doc:Composition=mallComposition,state:Environment['state']={},options:MallRenderOptions={}){drawComposition(ctx,art,doc,{...mallEnvironment(view,actors,doc),state,...options},'backdrop');}
export function drawMallForeground(ctx:CanvasRenderingContext2D,view:View,actors:Readonly<Record<string,Character>>,doc:Composition=mallComposition,state:Environment['state']={},options:MallRenderOptions={}){drawComposition(ctx,art,doc,{...mallEnvironment(view,actors,doc),state,...options},'foreground');}
