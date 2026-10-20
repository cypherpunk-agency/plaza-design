import {presentationActor,presentationActorSlots} from '../../engine/gameplay/scene-presentation';
import {manifestGeometry} from '../../engine/gameplay/manifest-geometry';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import sceneSource from './scene.json';
import { frameView } from '../../art/core/view';
/** Canonical Mall source geometry and prepared character bindings. */
import {art,drawComposition,resolveComposition,type Composition,type Environment,type Instance,type Value}from '../../art';
import {emptyMallVisual,type MallVisual}from '../../art/assemblies/mall-state';
import type {MallLayout}from '../../art/assemblies/mall-details';
import type {View}from '../../art/core/view';
import {prepareCharacter,type Character,type PreparedCharacter}from '../../runtime/characters';
import {light}from '../../world/light';
import document from './composition.json';
export const mallArt=art,mallComposition=art.validate(document);
const flatten=(nodes:Instance[]):Instance[]=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
export function validateMallComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='mall')throw Error('Expected mall composition');for(const i of flatten(doc.instances))for(const[k,s]of Object.entries(i.bindings??{})){const expected=k==='snapshot'?'mall.snapshot':k==='vendorPose'?(['mall.vendor.deckVendor','mall.vendor.caseVendor'].includes(s)?s:''):k==='pose'?'mall.actor.'+i.props.actor:'mall.clip.'+i.props.actor;if(s!==expected)throw Error(i.id+': unknown Mall binding '+s);}return doc;}
validateMallComposition(mallComposition);
const defaults=(doc:Composition)=>{const b:Record<string,Value>={'mall.snapshot':emptyMallVisual as unknown as Value};for(const i of flatten(doc.instances))for(const[field,source]of Object.entries(i.bindings??{}))b[source]=art.get(i.type).visualFields![field].default;return b;};
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
export const mallGeometry=(doc:Composition=mallComposition)=>resolveComposition(art,doc,{view:geometryView,state:{},reduced:false,bindings:defaults(doc)});
export function mallPlacement(id:string,doc:Composition=mallComposition){const r=mallGeometry(doc).find(r=>r.instance.id===id);if(!r)throw Error('Unknown Mall instance '+id);return r.placement;}
export function mallLayout(doc:Composition=mallComposition,source:SceneDocument=sceneSource as unknown as SceneDocument):MallLayout{const rows=mallGeometry(doc),geometry=manifestGeometry(source,rows,[],{groundExits:false}),room=geometry.artwork.room,escalator=geometry.artwork.escalator;if(!room||!escalator)throw Error('Mall atrium requires room and escalator artwork roles');const s=room.props;return{width:geometry.width,ceil:Number(s.ceil),fascia:Number(s.fascia),slab:Number(s.slab),rail:Number(s.rail),far0:Number(s.far0),step:Number(s.step),storey:Number(s.storey),escalator:{x:escalator.placement.x,h:escalator.placement.h,w:Number(escalator.props.width)*escalator.placement.scale*escalator.placement.facing}};}
export function mallLevels(view:View,layout:MallLayout){const count=Math.max(2,Math.floor((view.gy-layout.far0-30)/layout.step));return Array.from({length:count},(_,i)=>layout.far0+i*layout.step);}
export type MallRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
/** Booth-local source bodies are painted once, between the booth back wall and counter. Rebinding detaches them into ordinary actor artwork. */
function boothActor(doc:Composition,source:SceneDocument,id:string){const rows=flatten(doc.instances),actor=rows.find(n=>n.type==='character.prepared'&&n.props.actor===id),owner=rows.find(n=>n.id===actor?.attach?.instance),binding=owner?.bindings?.vendorPose;return ['deckVendor','caseVendor'].some(role=>binding==='mall.vendor.'+role&&presentationActor(source.presentation,role as 'deckVendor'|'caseVendor')===id);}
export function mallEnvironment(view:View,actors:Readonly<Record<string,Character>>,doc:Composition=mallComposition,source:SceneDocument=sceneSource as unknown as SceneDocument):Environment{const rows=mallGeometry(doc),layout=mallLayout(doc,source),levels=mallLevels(view,layout),snapshot:MallVisual={layout,levels,light:structuredClone(light())},bindings=defaults(doc);bindings['mall.snapshot']=snapshot as unknown as Value;const far=presentationActorSlots(source.presentation,'far'),gallery=presentationActorSlots(source.presentation,'gallery'),riders=presentationActorSlots(source.presentation,'riders'),owns=(map:Readonly<Record<string,number>>,id:string)=>Object.prototype.hasOwnProperty.call(map,id);
for(const r of rows.filter(r=>r.instance.type==='character.prepared')){const id=String(r.props.actor),p=actors[id];if(!p)throw Error('Unknown Mall actor '+id);let x=r.placement.x,h=r.placement.h;
if(owns(far,id))h+=levels[far[id]%levels.length]+8;
if(owns(gallery,id))h+=layout.slab-gallery[id];
if(owns(riders,id)){const f=(view.t*.0012+riders[id])%1;x+=layout.escalator.x+8+f*(layout.escalator.w-16);h+=layout.escalator.h+f*(layout.slab-4);}
let pose:PreparedCharacter=prepareCharacter(p,view.t);if(pose.visible){pose={...pose,character:{...pose.character,x,...(p.h!==undefined||h!==0?{h}:{})},frame:{...pose.frame,x:pose.frame.x+x-p.x},height:pose.height+h-(p.h??0)};}
if(owns(riders,id)&&(view.sx(layout.escalator.x+layout.escalator.w)<-20||view.sx(layout.escalator.x)>view.viewW+20))pose={visible:false,character:pose.character};bindings['mall.actor.'+id]=(boothActor(doc,source,id)?{visible:false,character:pose.character}:pose) as unknown as Value;
}
for(const role of ['deckVendor','caseVendor'] as const){const id=presentationActor(source.presentation,role),p=id?actors[id]:undefined;if(p&&id&&boothActor(doc,source,id))bindings['mall.vendor.'+role]=prepareCharacter(p,view.t,{x:p.x,h:p.h??0}) as unknown as Value;}
return{view,state:{},bindings,reduced:false};}
export function drawMallComposition(ctx:CanvasRenderingContext2D,view:View,actors:Readonly<Record<string,Character>>,doc:Composition=mallComposition,state:Environment['state']={},options:MallRenderOptions={},source:SceneDocument=sceneSource as unknown as SceneDocument){drawComposition(ctx,art,doc,{...mallEnvironment(view,actors,doc,source),state,...options},'backdrop');}
export function drawMallForeground(ctx:CanvasRenderingContext2D,view:View,actors:Readonly<Record<string,Character>>,doc:Composition=mallComposition,state:Environment['state']={},options:MallRenderOptions={},source:SceneDocument=sceneSource as unknown as SceneDocument){drawComposition(ctx,art,doc,{...mallEnvironment(view,actors,doc,source),state,...options},'foreground');}
