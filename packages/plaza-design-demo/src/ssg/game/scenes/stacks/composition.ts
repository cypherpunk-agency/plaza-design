import {resolveArtworkRoles} from '../../engine/gameplay/artwork-roles';
import {manifestGeometry} from '../../engine/gameplay/manifest-geometry';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {presentationActor} from '../../engine/gameplay/scene-presentation';
import defaultScene from './scene.json';
import {stacksController} from '../../engine/controllers/motion';
import {stacksState} from './rules';
import defaultGameplay from './gameplay.json';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {actorAppearanceSeed,bindActorAppearanceSeed} from '../../engine/gameplay/actor-identity';
import { frameView } from '../../art/core/view';
/** Terminal source geometry and immutable visual/actor bindings. */
import {art,drawComposition,resolveComposition,type Composition,type Environment,type Value} from '../../art';
import {emptyTerminalVisual} from '../../art/assemblies/terminal-elements';
import type {TerminalGeometry,TerminalVisual} from '../../art/assemblies/terminal-state';
import type {TerminalLayout} from '../../art/assemblies/container-terminal';
import type {View} from '../../art/core/view';
import type {EngineDraw} from '../../engine/host';
import {prepareCharacter,type Character,type PreparedCharacter} from '../../runtime/characters';
import {light} from '../../world/light';
import {trolley} from './rules';
import document from './composition.json';
export const stacksArt=art,stacksComposition=art.validate(document);
export function validateStacksComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='stacks')throw new Error('Expected stacks composition');for(const i of flatten(doc.instances))for(const [key,source]of Object.entries(i.bindings??{}))if(i.type==='character.prepared'?source!=='terminal.'+(key==='pose'?'actor.':'clip.')+i.props.actor:source!=='terminal.snapshot')throw new Error(i.id+': unknown Stacks binding '+source);return doc;}
validateStacksComposition(stacksComposition);
function flatten(nodes:Composition['instances']):Composition['instances']{return nodes.flatMap(n=>[n,...flatten(n.children??[])]);}
const defaults=(doc:Composition)=>{const bindings:Record<string,Value>={'terminal.snapshot':emptyTerminalVisual as unknown as Value};for(const i of flatten(doc.instances).filter(i=>i.type==='character.prepared')){bindings['terminal.actor.'+i.props.actor]={visible:false,character:{x:0}};bindings['terminal.clip.'+i.props.actor]=null;}return bindings;};
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
export const stacksGeometry=(doc:Composition=stacksComposition)=>resolveComposition(art,doc,{view:geometryView,state:{},reduced:false,bindings:defaults(doc)});
const sourceScene=defaultScene as unknown as SceneDocument;
function terminalInputs(doc:Composition,source:SceneDocument,rows=stacksGeometry(doc)){const roles=resolveArtworkRoles('stacks',source.manifest?.artwork,rows);for(const role of ['block0','block1','block2','ladder','quay','kiosk','bridge','rest','slot','chassis','gate','hatch','deck'])if(!roles[role])throw Error('Terminal requires artwork role '+role);return roles;}
export function terminalLayout(doc:Composition=stacksComposition,source:SceneDocument=sourceScene,rows=stacksGeometry(doc)):TerminalLayout{const r=terminalInputs(doc,source,rows),p=(id:string)=>r[id].placement;return{blocks:[0,1,2].map(i=>({x:p('block'+i).x})),ladder:p('ladder').x,quay:p('quay').x,kiosk:p('kiosk').x,bridge:{x0:p('bridge').x},boom:206};}
export function terminalRuleGeometry(doc:Composition=stacksComposition,source:SceneDocument=sourceScene,rows=stacksGeometry(doc)):TerminalGeometry{const r=terminalInputs(doc,source,rows),p=(id:string)=>r[id].placement;return{X:{rest:p('rest').x,slot:p('slot').x,chassis:p('chassis').x,gate:p('gate').x,hatch:p('hatch').x,deck:p('deck').x},H:{carry:p('rest').h,chassis:p('chassis').h,slot:p('slot').h,deck:p('deck').h,hold:p('hatch').h}};}
export type StacksRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export function stacksEnvironment(view:View,engine:EngineDraw,actors:Readonly<Record<string,Character>>,doc:Composition=stacksComposition,gameplay:GameplayDefinition=defaultGameplay as unknown as GameplayDefinition,source:SceneDocument=sourceScene):Environment{
 const rows=stacksGeometry(doc),roles=terminalInputs(doc,source,rows),m=engine.m,geometry=terminalRuleGeometry(doc,source,rows),layout=terminalLayout(doc,source,rows),tr=trolley(m,geometry),width=manifestGeometry(source,rows,[],{groundSpawn:false}).width,horizon=Number(roles.horizon?.props.horizon??0),loadVisible=view.sx(tr.x)+90>-4&&view.sx(tr.x)-90<view.viewW+4,deckReefer=stacksState(m,'boxAt')==='ferry'&&!stacksState(m,'departed')&&tr.carry!==2;
 const scratch=Object.fromEntries(['liftT0','retT0','liftKind','cold','warm'].filter(k=>m.scratch[k]!==undefined).map(k=>[k,m.scratch[k]]));
 const alarmTarget=gameplay.native?.presentation?.['stacks.alarm.pulse']?.target,alarmPulse=alarmTarget===undefined?undefined:m.scratch['pulse.'+alarmTarget];if(alarmPulse!==undefined)scratch.alarm=alarmPulse;
 const snapshot:TerminalVisual={width,horizon,layer:engine.layer,hover:engine.hover??'',now:m.now(),departed:!!stacksState(m,'departed'),boxAt:String(stacksState(m,'boxAt')),loaded:Number(stacksState(m,'loaded')??0),scratch,portFrozen:m.frozen(stacksController(m.data).scannerDevice),watchdogs:m.watchdogs().map(d=>({at:d.at??null,from:d.from,to:d.to,progress:d.progress})),trolley:tr,geometry,layout,light:structuredClone(light()),deckReefer,loadVisible,ferryVisible:view.sx(layout.quay)+(view.sx(width)-view.sx(layout.quay))>-4&&view.sx(layout.quay)<view.viewW+4};
 const bindings=defaults(doc);bindings['terminal.snapshot']=snapshot as unknown as Value;
 for(const r of rows.filter(r=>r.instance.type==='character.prepared')){const id=String(r.props.actor),actor=actors[id];if(!actor)throw new Error('Unknown terminal actor '+id);const dx=r.placement.x-actor.x,p={...actor,x:r.placement.x,h:r.placement.h,...(Array.isArray(actor.range)?{range:[actor.range[0]+dx,actor.range[1]+dx] as [number,number]}:{})};if(id===presentationActor(source.presentation,'craneOperator'))p.x=tr.x-35+r.placement.x;
 const bakeSeed=actorAppearanceSeed(actor);if(bakeSeed!==undefined)bindActorAppearanceSeed(p,bakeSeed);
 let pose:PreparedCharacter=prepareCharacter(p,view.t);if(engine.layer==='devices'||id===presentationActor(source.presentation,'rescuedPassenger')&&!deckReefer||id===presentationActor(source.presentation,'craneOperator')&&!loadVisible)pose={visible:false,character:pose.character};bindings['terminal.actor.'+id]=pose as unknown as Value;bindings['terminal.clip.'+id]=id===presentationActor(source.presentation,'craneOperator')?[view.sx(tr.x+r.placement.x)-45,view.y(r.placement.h+30)+4,20,22]:null;
 }
 return{view,state:{},bindings,reduced:false};
}
export function drawStacksComposition(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,actors:Readonly<Record<string,Character>>,doc:Composition=stacksComposition,state:Environment['state']={},options:StacksRenderOptions={},gameplay:GameplayDefinition=defaultGameplay as unknown as GameplayDefinition,source:SceneDocument=sourceScene){drawComposition(ctx,art,doc,{...stacksEnvironment(view,engine,actors,doc,gameplay,source),state,...options},'backdrop');}
export function drawStacksForeground(ctx:CanvasRenderingContext2D,view:View,doc:Composition=stacksComposition,state:Environment['state']={},options:StacksRenderOptions={}){drawComposition(ctx,art,doc,{view,bindings:defaults(doc),state,reduced:false,...options},'foreground');}
