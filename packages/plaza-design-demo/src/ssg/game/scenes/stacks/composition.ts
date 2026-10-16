/** Terminal source geometry and immutable visual/actor bindings. */
import {art,drawComposition,resolveComposition,type Composition,type Environment,type Value} from '../../art';
import {emptyTerminalVisual} from '../../art/assemblies/terminal-elements';
import type {TerminalGeometry,TerminalVisual} from '../../art/assemblies/terminal-state';
import type {TerminalLayout} from '../../art/assemblies/container-terminal';
import type {View} from '../../art/core/view';
import type {EngineDraw} from '../../engine/host';
import type {SceneData} from '../../data/types';
import {prepareCharacter,type Character,type PreparedCharacter} from '../../runtime/characters';
import {light} from '../../world/light';
import {trolley} from './rules';
import document from './composition.json';
export const stacksArt=art,stacksComposition=art.validate(document);
const deviceIds=['sts2','port','ferry','reefer'];
const required=['scene','spawn','exit-harbor','exit-warehouse','booth','board','lane','gate','deck-reefer','ferry-kiosk','bridge','ferry-hatch','ladder-panel','gantry-back','gantry-front','urn','operator','moth',...deviceIds.map(id=>'device-'+id),...[0,1,2].map(i=>'block-'+i),...['rest','slot','chassis','hatch','deck'].map(k=>'rule-'+k)];
export function validateStacksComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='stacks')throw new Error('Expected stacks composition');for(const id of required)if(!doc.instances.some(i=>i.id===id))throw new Error('Missing gameplay-bound Stacks instance '+id);for(const i of doc.instances)for(const [key,source]of Object.entries(i.bindings??{}))if(i.type==='character.prepared'?source!=='terminal.'+(key==='pose'?'actor.':'clip.')+i.props.actor:source!=='terminal.snapshot')throw new Error(i.id+': unknown Stacks binding '+source);return doc;}
validateStacksComposition(stacksComposition);
const defaults=(doc:Composition)=>{const bindings:Record<string,Value>={'terminal.snapshot':emptyTerminalVisual as unknown as Value};for(const i of doc.instances.filter(i=>i.type==='character.prepared')){bindings['terminal.actor.'+i.props.actor]={visible:false,character:{x:0}};bindings['terminal.clip.'+i.props.actor]=null;}return bindings;};
const geometryView:View={sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
export const stacksGeometry=(doc:Composition=stacksComposition)=>resolveComposition(art,doc,{view:geometryView,state:{},reduced:false,bindings:defaults(doc)});
export function stacksPlacement(id:string,doc:Composition=stacksComposition){const row=stacksGeometry(doc).find(r=>r.instance.id===id);if(!row)throw new Error('Unknown Stacks instance '+id);return row.placement;}
export function terminalLayout(doc:Composition=stacksComposition):TerminalLayout{const rows=stacksGeometry(doc),row=(id:string)=>rows.find(r=>r.instance.id===id)!,p=(id:string)=>row(id).placement;return{booth:{x:p('booth').x,w:Number(row('booth').props.width),h:70},gate:p('exit-harbor').x,spawn:p('spawn').x,gatekeeper:p('person-0').x,notice:p('board').x,lane:p('lane').x,blocks:[0,1,2].map(i=>({x:p('block-'+i).x,tiers:Number(row('block-'+i).props.tiers)})),legs:[p('gantry-front').x,p('gantry-front').x+256],ladder:p('ladder-panel').x,signaller:p('person-2').x,inspector:p('person-1').x,quay:p('quay-floor').x,kiosk:p('ferry-kiosk').x,hatch:{x0:p('ferry-hatch').x,x1:p('ferry-hatch').x+Number(row('ferry-hatch').props.width)},lasher:p('person-3').x,bridge:{x0:p('bridge').x,x1:p('bridge').x+Number(row('bridge').props.width)},boom:206};}
export function terminalRuleGeometry(doc:Composition=stacksComposition):TerminalGeometry{const p=(id:string)=>stacksPlacement('rule-'+id,doc);return{X:{rest:p('rest').x,slot:p('slot').x,chassis:p('chassis').x,gate:stacksPlacement('gate',doc).x,hatch:p('hatch').x,deck:p('deck').x},H:{carry:p('rest').h,chassis:p('chassis').h,slot:p('slot').h,deck:p('deck').h,hold:p('hatch').h}};}
export function stacksDeviceData(source:SceneData,doc:Composition=stacksComposition):SceneData{const result=structuredClone(source);for(const id of deviceIds){const p=stacksPlacement('device-'+id,doc),spot=result.devices.find(d=>d.id===id)!.layout!.spot!;spot.x=p.x;if(spot.y!==undefined||p.h!==0)spot.y=p.h;}return result;}
export type StacksRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export function stacksEnvironment(view:View,engine:EngineDraw,actors:Readonly<Record<string,Character>>,doc:Composition=stacksComposition):Environment{
 const rows=stacksGeometry(doc),row=(id:string)=>rows.find(r=>r.instance.id===id)!,m=engine.m,geometry=terminalRuleGeometry(doc),layout=terminalLayout(doc),tr=trolley(m,geometry),width=Number(row('scene').props.width),horizon=Number(row('scene').props.horizon),loadVisible=view.sx(tr.x)+90>-4&&view.sx(tr.x)-90<view.viewW+4,deckReefer=m.get('boxAt')==='ferry'&&!m.get('departed')&&tr.carry!==2;
 const scratch=Object.fromEntries(['liftT0','retT0','liftKind','alarm','cold','warm'].filter(k=>m.scratch[k]!==undefined).map(k=>[k,m.scratch[k]]));
 const snapshot:TerminalVisual={width,horizon,layer:engine.layer,hover:engine.hover??'',now:m.now(),departed:!!m.get('departed'),boxAt:String(m.get('boxAt')),loaded:Number(m.get('loaded')??0),scratch,portFrozen:m.frozen('port'),watchdogs:m.watchdogs().map(d=>({at:d.at??null,from:d.from,to:d.to,progress:d.progress})),trolley:tr,geometry,layout,light:structuredClone(light()),deckReefer,loadVisible,ferryVisible:view.sx(layout.quay)+(view.sx(width)-view.sx(layout.quay))>-4&&view.sx(layout.quay)<view.viewW+4};
 const bindings=defaults(doc);bindings['terminal.snapshot']=snapshot as unknown as Value;
 for(const r of rows.filter(r=>r.instance.type==='character.prepared')){const id=String(r.props.actor),source=actors[id];if(!source)throw new Error('Unknown terminal actor '+id);const dx=r.placement.x-source.x,p={...source,x:r.placement.x,h:r.placement.h,...(Array.isArray(source.range)?{range:[source.range[0]+dx,source.range[1]+dx] as [number,number]}:{})};if(id==='operator')p.x=tr.x-35+r.placement.x;
 let pose:PreparedCharacter=prepareCharacter(p,view.t);if(engine.layer==='devices'||id==='moth'&&!deckReefer||id==='operator'&&!loadVisible)pose={visible:false,character:pose.character};bindings['terminal.actor.'+id]=pose as unknown as Value;bindings['terminal.clip.'+id]=id==='operator'?[view.sx(tr.x)-45,view.y(196)+4,20,22]:null;
 }
 return{view,state:{},bindings,reduced:false};
}
export function drawStacksComposition(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,actors:Readonly<Record<string,Character>>,doc:Composition=stacksComposition,state:Environment['state']={},options:StacksRenderOptions={}){drawComposition(ctx,art,doc,{...stacksEnvironment(view,engine,actors,doc),state,...options},'backdrop');}
export function drawStacksForeground(ctx:CanvasRenderingContext2D,view:View,doc:Composition=stacksComposition,state:Environment['state']={},options:StacksRenderOptions={}){drawComposition(ctx,art,doc,{view,bindings:defaults(doc),state,reduced:false,...options},'foreground');}
