import sourceDevices from './devices.json';
import {sandboxModelSnapshot,sandboxController,type SandboxController} from '../../engine/controllers/sandbox';
import {sandboxPieceDefinitions} from '../../art/assemblies/sandbox-elements';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {mutableActorArtwork} from '../../engine/gameplay/native-actor-bindings';
import { frameView } from '../../art/core/view';
/** Scene-bound QA snapshots and geometry. Rules remain in rules.ts; artwork has no simulation API. */
import { art,drawComposition,resolveComposition,type Composition,type Environment,type Value } from '../../art';
import { emptySandboxSnapshot,type SandboxSnapshot } from '../../art/assemblies/sandbox-state';
import type { Station } from '../../art/assemblies/sandbox';
import type { View } from '../../art/core/view';
import { onScreen } from '../../art/core/primitives';
import { prepareCharacter,type Character,type PreparedCharacter } from '../../runtime/characters';
import { city,hm } from '../../world/clock';
import { sceneClimate,screenLine,weatherNow } from '../../world/weather';
import type { EngineDraw } from '../../engine/host';
import type { SceneData } from '../../data/types';
import document from './composition.json';
export const sandboxArt=art;
export const sandboxComposition=art.validate(document);
const flatten=(rows:Composition['instances']):Composition['instances']=>rows.flatMap(r=>[r,...flatten(r.children??[])]);
export function validateSandboxComposition(input:unknown):Composition{const doc=art.validate(input);if(doc.scene!=='sandbox')throw new Error('Expected Sandbox composition');const allowed=new Set(['sandbox.visual','window.clip']);for(const i of flatten(doc.instances)){for(const [field,source]of Object.entries(i.bindings??{}))if(!(i.type==='character.prepared'&&field==='pose'&&mutableActorArtwork('sandbox',i))&&!allowed.has(source))throw new Error(i.id+': unknown Sandbox visual binding '+source);if(i.type==='character.prepared'&&!mutableActorArtwork('sandbox',i))throw new Error(i.id+': invalid Sandbox actor binding');}return doc;}
validateSandboxComposition(sandboxComposition);
function defaults(doc:Composition):Record<string,Value>{const bindings:Record<string,Value>={};for(const i of flatten(doc.instances))for(const[field,source]of Object.entries(i.bindings??{}))bindings[source]=art.get(i.type).visualFields![field].default;return bindings;}
const geometryView:View={...frameView(0),sx:x=>x,y:h=>-h,gy:0,cam:0,t:0,viewW:640,viewH:360,flags:{}};
export function sandboxGeometry(doc:Composition=sandboxComposition){return resolveComposition(art,doc,{view:geometryView,state:{},bindings:defaults(doc),reduced:false});}
const defaultPicture=sourceDevices.controller as SandboxController;
export function validateSandboxGeometry(data:SceneData,doc:Composition){const c=sandboxController(data);if(!c)return;const rows=sandboxGeometry(doc),get=(id:string)=>{const row=rows.find(r=>r.instance.id===id);if(!row)throw Error('Sandbox artwork reference '+id);return row;};for(const[role,ref]of Object.entries(c.geometry)){const r=get(ref);if(role==='window'&&(!(Number(r.props.width)>0)||!(Number(r.props.height)>0)))throw Error('Sandbox window requires rectangle dimensions');}for(const station of c.stations){if(!(Number(get(station.zone).props.width)>0))throw Error('Sandbox station zone requires width');const sign=get(station.sign);if(typeof sign.props.title!=='string'||typeof sign.props.subtitle!=='string')throw Error('Sandbox station sign requires title and subtitle');if(station.card)get(station.card);}}
export function sandboxStations(doc:Composition=sandboxComposition,c:SandboxController|null=defaultPicture):Station[]{const rows=sandboxGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!;return(c?.stations??[]).map((r,i)=>{const z=get(r.zone),sign=get(r.sign),card=r.card?get(r.card):undefined;return{n:i+1,x0:z.placement.x,x1:z.placement.x+Number(z.props.width),...(card?{sign:card.placement.x}:{}),title:String(sign.props.title),sub:String(sign.props.subtitle)};});}
export function sandboxDeviceData(source:SceneData,doc:Composition=sandboxComposition,scene?:Pick<SceneDocument,'manifest'>):SceneData{const result=structuredClone(source),rows=sandboxGeometry(doc);for(const device of result.devices){if(scene?.manifest?.devices?.[device.id]||!device.layout?.spot)continue;const row=rows.find(r=>r.instance.id===device.id);if(!row)continue;const spot=device.layout.spot;spot.x=row.placement.x;if(spot.y!==undefined||row.placement.h!==0)spot.y=row.placement.h;if(typeof row.props.width==='number')spot.w=row.props.width*row.placement.scale;if(typeof row.props.height==='number')spot.h=row.props.height*row.placement.scale;}return result;}
function daylight(minute:number){const h=minute/60;if(h<5||h>=20)return 0;if(h<8)return(h-5)/3;if(h<17)return 1;return 1-(h-17)/3;}
export type SandboxRenderOptions=Partial<Pick<Environment,'visibility'|'opacity'|'clips'|'sequenceTime'|'reduced'>>;
export function sandboxEnvironment(doc:Composition,view:View,engine:EngineDraw,actors:Readonly<Record<string,Character>>):Environment{
 const rows=sandboxGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!,m=engine.m,wx=weatherNow(sceneClimate('sandbox')),c=sandboxController(m.data),w=c?.geometry.window?get(c.geometry.window):undefined;
 const snapshot:SandboxSnapshot={...structuredClone(emptySandboxSnapshot),...sandboxModelSnapshot(m)};
 for(const row of rows){const piece=sandboxPieceDefinitions.find(piece=>piece.device&&row.instance.type==='sandbox.'+piece.id);if(piece?.device)snapshot.spots[piece.device]={x:row.placement.x,y:row.placement.h,w:Number(row.props.width),h:Number(row.props.height)};}
 snapshot.minute=city.min;snapshot.daylight=daylight(city.min);snapshot.forecast=screenLine(sceneClimate('sandbox'));snapshot.hourLabel=hm(city.min);
 snapshot.weather={cloud:wx.cloud,smog:wx.smog,rain:wx.rain,storm:wx.storm,fog:wx.fog,heat:wx.heat,wind:wx.wind};
 for(const st of sandboxStations(doc,c??null))snapshot.stationCenters[String(st.n)]=(st.x0+st.x1)/2;
 snapshot.windowVisible=!!w&&onScreen(view,view.sx(w.placement.x)-20,Number(w.props.width)+40);
 const hovered=engine.hover?m.spots().find(spot=>spot.id===engine.hover):undefined;if(hovered)snapshot.hoverSpot={x:hovered.x,y:hovered.y,w:hovered.w,h:hovered.h};
 const bindings=defaults(doc);bindings['sandbox.visual']=snapshot as unknown as Value;bindings['window.clip']=w?[view.sx(w.placement.x),view.y(w.placement.h+Number(w.props.height)),Number(w.props.width),Number(w.props.height)]:null;
 for(const row of rows.filter(r=>r.instance.type==='character.prepared')){const actor=actors[String(row.props.actor)];let pose:PreparedCharacter=prepareCharacter(actor,view.t);if(pose.visible){const dh=row.placement.h-(actor.h??0);pose={...pose,character:{...pose.character,x:row.placement.x,h:row.placement.h},frame:{...pose.frame,x:pose.frame.x+row.placement.x-actor.x},height:pose.height+dh};}bindings['actor.'+row.props.actor+'.pose']=pose as unknown as Value;}
 return{view,state:{},bindings,reduced:false};
}
export function drawSandboxComposition(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,actors:Readonly<Record<string,Character>>,doc:Composition=sandboxComposition,state:Environment['state']={},options:SandboxRenderOptions={}){drawComposition(ctx,art,doc,{...sandboxEnvironment(doc,view,engine,actors),state,...options},'backdrop');}
