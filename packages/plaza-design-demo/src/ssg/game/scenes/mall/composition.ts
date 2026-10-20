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
export function validateMallComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='mall')throw Error('Expected mall composition');for(const i of flatten(doc.instances))for(const[k,s]of Object.entries(i.bindings??{})){const expected=k==='snapshot'?'mall.snapshot':k==='vendorPose'?'mall.vendor.'+(i.id==='deck-booth'?'deckTech':'teen'):k==='pose'?'mall.actor.'+i.props.actor:'mall.clip.'+i.props.actor;if(s!==expected)throw Error(i.id+': unknown Mall binding '+s);}return doc;}
validateMallComposition(mallComposition);
const defaults=(doc:Composition)=>{const b:Record<string,Value>={'mall.snapshot':emptyMallVisual as unknown as Value};for(const i of flatten(doc.instances)){if(i.type==='character.prepared'){b['mall.actor.'+i.props.actor]={visible:false,character:{x:0}};b['mall.clip.'+i.props.actor]=null;}if(i.id==='deck-booth'||i.id==='cases-booth')b['mall.vendor.'+(i.id==='deck-booth'?'deckTech':'teen')]={visible:false,character:{x:0}};}return b;};
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
export const mallGeometry=(doc:Composition=mallComposition)=>resolveComposition(art,doc,{view:geometryView,state:{},reduced:false,bindings:defaults(doc)});
export function mallPlacement(id:string,doc:Composition=mallComposition){const r=mallGeometry(doc).find(r=>r.instance.id===id);if(!r)throw Error('Unknown Mall instance '+id);return r.placement;}
export function mallLayout(doc:Composition=mallComposition,source:SceneDocument=sceneSource as unknown as SceneDocument):MallLayout{const rows=mallGeometry(doc),geometry=manifestGeometry(source,rows,[],{groundExits:false}),room=geometry.artwork.room,escalator=geometry.artwork.escalator;if(!room||!escalator)throw Error('Mall atrium requires room and escalator artwork roles');const s=room.props;return{width:geometry.width,ceil:Number(s.ceil),fascia:Number(s.fascia),slab:Number(s.slab),rail:Number(s.rail),far0:Number(s.far0),step:Number(s.step),storey:Number(s.storey),escalator:{x:escalator.placement.x,h:escalator.placement.h,w:Number(escalator.props.width)*escalator.placement.scale*escalator.placement.facing}};}
export function mallLevels(view:View,layout:MallLayout){const count=Math.max(2,Math.floor((view.gy-layout.far0-30)/layout.step));return Array.from({length:count},(_,i)=>layout.far0+i*layout.step);}
export type MallRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
/** Booth-local source bodies are painted once, between the booth back wall and counter. Rebinding detaches them into ordinary actor artwork. */
function boothActor(doc:Composition,id:string){const booth=id==='deckTech'?'deck-booth':id==='teen'?'cases-booth':undefined;return !!booth&&flatten(doc.instances).some(n=>n.type==='character.prepared'&&n.props.actor===id&&n.attach?.instance===booth);}
const farActors=new Set(Array.from({length:30},(_,i)=>'far-'+i)),galleryActors=new Set(Array.from({length:10},(_,i)=>'gallery-'+i)),riderActors=new Set(['rider-0','rider-1','rider-2']);
export function mallEnvironment(view:View,actors:Readonly<Record<string,Character>>,doc:Composition=mallComposition,source:SceneDocument=sceneSource as unknown as SceneDocument):Environment{const rows=mallGeometry(doc),layout=mallLayout(doc,source),levels=mallLevels(view,layout),snapshot:MallVisual={layout,levels,light:structuredClone(light())},bindings=defaults(doc);bindings['mall.snapshot']=snapshot as unknown as Value;
for(const r of rows.filter(r=>r.instance.type==='character.prepared')){const id=String(r.props.actor),p=actors[id];if(!p)throw Error('Unknown Mall actor '+id);let x=r.placement.x,h=r.placement.h;
if(farActors.has(id))h+=levels[Number(id.slice(4))%levels.length]+8;
if(galleryActors.has(id))h+=layout.slab-144;
if(riderActors.has(id)){const f=(view.t*.0012+Number(id.slice(6))/3)%1;x+=layout.escalator.x+8+f*(layout.escalator.w-16);h+=layout.escalator.h+f*(layout.slab-4);}
let pose:PreparedCharacter=prepareCharacter(p,view.t);if(pose.visible){pose={...pose,character:{...pose.character,x,...(p.h!==undefined||h!==0?{h}:{})},frame:{...pose.frame,x:pose.frame.x+x-p.x},height:pose.height+h-(p.h??0)};}
if(riderActors.has(id)&&(view.sx(layout.escalator.x+layout.escalator.w)<-20||view.sx(layout.escalator.x)>view.viewW+20))pose={visible:false,character:pose.character};bindings['mall.actor.'+id]=(boothActor(doc,id)?{visible:false,character:pose.character}:pose) as unknown as Value;
}
for(const[id]of [['deckTech','deck-booth'],['teen','cases-booth']]){const p=actors[id];if(p&&boothActor(doc,id))bindings['mall.vendor.'+id]=prepareCharacter(p,view.t,{x:p.x,h:p.h??0}) as unknown as Value;}
return{view,state:{},bindings,reduced:false};}
export function drawMallComposition(ctx:CanvasRenderingContext2D,view:View,actors:Readonly<Record<string,Character>>,doc:Composition=mallComposition,state:Environment['state']={},options:MallRenderOptions={},source:SceneDocument=sceneSource as unknown as SceneDocument){drawComposition(ctx,art,doc,{...mallEnvironment(view,actors,doc,source),state,...options},'backdrop');}
export function drawMallForeground(ctx:CanvasRenderingContext2D,view:View,actors:Readonly<Record<string,Character>>,doc:Composition=mallComposition,state:Environment['state']={},options:MallRenderOptions={},source:SceneDocument=sceneSource as unknown as SceneDocument){drawComposition(ctx,art,doc,{...mallEnvironment(view,actors,doc,source),state,...options},'foreground');}
