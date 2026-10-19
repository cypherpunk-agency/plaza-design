import {sandboxPieceDefinitions} from '../../art/assemblies/sandbox-elements';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {mutableActorArtwork} from '../../engine/gameplay/native-actor-bindings';
import { frameView } from '../../art/core/view';
/** Scene-bound QA snapshots and geometry. Rules remain in rules.ts; artwork has no simulation API. */
import { art,drawComposition,resolveComposition,type Composition,type Environment,type Value } from '../../art';
import { emptySandboxSnapshot,type SandboxSnapshot } from '../../art/assemblies/sandbox-state';
import type { SandboxLayout,Station } from '../../art/assemblies/sandbox';
import type { View } from '../../art/core/view';
import { onScreen } from '../../art/core/primitives';
import { prepareCharacter,type Character,type PreparedCharacter } from '../../runtime/characters';
import { city,hm } from '../../world/clock';
import { sceneClimate,screenLine,weatherNow } from '../../world/weather';
import type { EngineDraw } from '../../engine/host';
import type { SceneData } from '../../data/types';
import { pulse } from './rules';
import document from './composition.json';
export const sandboxArt=art;
export const sandboxComposition=art.validate(document);
const required=['reset','window',...Array.from({length:10},(_,i)=>'zone-'+(i+1)),...Array.from({length:10},(_,i)=>'station-sign-'+(i+1))];
export function validateSandboxComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='sandbox')throw new Error('Expected Sandbox composition');for(const id of required)if(!doc.instances.some(i=>i.id===id))throw new Error('Missing gameplay-bound Sandbox instance '+id);const allowed=new Set(['sandbox.visual','window.clip']);for(const i of doc.instances){for(const [field,source]of Object.entries(i.bindings??{}))if(!(i.type==='character.prepared'&&field==='pose'&&mutableActorArtwork('sandbox',i))&&!allowed.has(source))throw new Error(i.id+': unknown Sandbox visual binding '+source);if(i.type==='character.prepared'&&!mutableActorArtwork('sandbox',i))throw new Error(i.id+': invalid Sandbox actor binding');}return doc;}
validateSandboxComposition(sandboxComposition);
function defaults(doc:Composition):Record<string,Value>{const bindings:Record<string,Value>={};for(const i of doc.instances)for(const[field,source]of Object.entries(i.bindings??{}))bindings[source]=art.get(i.type).visualFields![field].default;return bindings;}
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
export function sandboxGeometry(doc:Composition=sandboxComposition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
export function sandboxStations(doc:Composition=sandboxComposition):Station[]{const rows=sandboxGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!;return Array.from({length:10},(_,i)=>{const n=i+1,z=get('zone-'+n),sign=get('station-sign-'+n);return{n,x0:z.placement.x,x1:z.placement.x+Number(z.props.width),...(rows.find(r=>r.instance.id==='card'+n)?{sign:get('card'+n).placement.x}:{}),title:String(sign.props.title),sub:String(sign.props.subtitle)};});}
export function sandboxLayout(doc:Composition=sandboxComposition):SandboxLayout{const rows=sandboxGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,x=(id:string)=>get(id).placement.x,w=get('window');return{door:x('door'),spawn:x('spawn'),plan:x('plan'),reset:x('reset'),dispenser:x('chip-dispenser'),radiator:x('radiator'),bench:x('wait-bench'),window:{x0:w.placement.x,x1:w.placement.x+Number(w.props.width),h0:w.placement.h,h1:w.placement.h+Number(w.props.height)},end:x('end-wall')};}
export const sandboxWidth=Number(sandboxGeometry().find(r=>r.instance.id==='hall')!.props.width);
export function sandboxDeviceData(source:SceneData,doc:Composition=sandboxComposition,scene?:Pick<SceneDocument,'manifest'>):SceneData{const result=structuredClone(source),rows=sandboxGeometry(doc);for(const device of result.devices){if(scene?.manifest?.devices?.[device.id]||!device.layout?.spot)continue;const row=rows.find(r=>r.instance.id===device.id);if(!row)continue;const spot=device.layout.spot;spot.x=row.placement.x;if(spot.y!==undefined||row.placement.h!==0)spot.y=row.placement.h;if(typeof row.props.width==='number')spot.w=row.props.width*row.placement.scale;if(typeof row.props.height==='number')spot.h=row.props.height*row.placement.scale;}return result;}
const valueKeys=["lampOn","memo","phase","recOn","beaconOn","count","hatchOpen","fanOn","loginOk","ringsOpen","cipherOpen","cryptexOpen","morseOpen","mains","auditOn","stamped","belt","cups","paid","nightLight","ventOpen"];
const pulseKeys=["sensor","button","horn","counter","plate","cutter","bell","printer","stamp","siren","coffee.cup","reader","till","rgb.red","rgb.green","rgb.blue"];
function daylight(minute:number){const h=minute/60;if(h<5||h>=20)return 0;if(h<8)return(h-5)/3;if(h<17)return 1;return 1-(h-17)/3;}
export type SandboxRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export function sandboxEnvironment(doc:Composition,view:View,engine:EngineDraw,actors:Readonly<Record<string,Character>>):Environment{
 const rows=sandboxGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,m=engine.m,wx=weatherNow(sceneClimate('sandbox')),w=get('window'),next=m.clocks.next('metronome.beat');
 const snapshot:SandboxSnapshot=structuredClone(emptySandboxSnapshot);
 for(const key of valueKeys){const value=m.get(key);if(value!==undefined)snapshot.values[key]=value as Value;}
 const night=m.value('night');if(night!==undefined)snapshot.derived.night=night as Value;
 const net=m.net.get('qasrv');if(net!==undefined)snapshot.net.qasrv=net;
 snapshot.clocks['metronome.beat']=next?{ms:next.ms}:null;
 for(const key of pulseKeys)snapshot.pulses[key]=pulse(m,key);
 snapshot.frozen=m.data.devices.filter(d=>m.frozen(d.id)).map(d=>d.id);snapshot.opened=[...m.opened];snapshot.links=m.links.map(link=>({from:link.from}));snapshot.traces.audit=m.traceOf('audit');snapshot.lockouts.audit=m.lockLeft('audit');snapshot.lockouts['login.login']=m.lockLeft('login.login');
 for(const row of rows){const piece=sandboxPieceDefinitions.find(piece=>piece.device&&row.instance.type==='sandbox.'+piece.id);if(piece?.device)snapshot.spots[piece.device]={x:row.placement.x,y:row.placement.h,w:Number(row.props.width),h:Number(row.props.height)};}
 snapshot.minute=city.min;snapshot.daylight=daylight(city.min);snapshot.forecast=screenLine(sceneClimate('sandbox'));snapshot.hourLabel=hm(city.min);
 snapshot.weather={cloud:wx.cloud,smog:wx.smog,rain:wx.rain,storm:wx.storm,fog:wx.fog,heat:wx.heat,wind:wx.wind};
 for(const st of sandboxStations(doc))snapshot.stationCenters[String(st.n)]=(st.x0+st.x1)/2;
 snapshot.windowVisible=onScreen(view,view.sx(w.placement.x)-20,Number(w.props.width)+40);
 const hovered=engine.hover?m.spots().find(spot=>spot.id===engine.hover):undefined;if(hovered)snapshot.hoverSpot={x:hovered.x,y:hovered.y,w:hovered.w,h:hovered.h};
 const bindings=defaults(doc);bindings['sandbox.visual']=snapshot as unknown as Value;bindings['window.clip']=[view.sx(w.placement.x),view.y(w.placement.h+Number(w.props.height)),Number(w.props.width),Number(w.props.height)];
 for(const row of rows.filter(r=>r.instance.type==='character.prepared')){const actor=actors[String(row.props.actor)];let pose:PreparedCharacter=prepareCharacter(actor,view.t);if(pose.visible){const dh=row.placement.h-(actor.h??0);pose={...pose,character:{...pose.character,x:row.placement.x,h:row.placement.h},frame:{...pose.frame,x:pose.frame.x+row.placement.x-actor.x},height:pose.height+dh};}bindings['actor.'+row.props.actor+'.pose']=pose as unknown as Value;}
 return{view,state:{},bindings,reduced:false};
}
export function drawSandboxComposition(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,actors:Readonly<Record<string,Character>>,doc:Composition=sandboxComposition,state:Environment['state']={},options:SandboxRenderOptions={}){drawComposition(ctx,art,doc,{...sandboxEnvironment(doc,view,engine,actors),state,...options},'backdrop');}
