import type {Resolved,Value} from '../../art/core/composition';
import type {View} from '../../art/core/view';
import type {SceneModel} from '../model';
import type {SceneData} from '../../data/types';
import type {Station} from '../../art/assemblies/sandbox';
import {emptySandboxSnapshot,type SandboxSnapshot} from '../../art/assemblies/sandbox-state';
import {sandboxPieceDefinitions} from '../../art/assemblies/sandbox-elements';
import {onScreen} from '../../art/core/primitives';
import {sandboxController,sandboxModelSnapshot,type SandboxController} from './sandbox';
import {city,hm} from '../../world/clock';
import {sceneClimate,screenLine,weatherNow} from '../../world/weather';
/**
 * The QA bay's pictures: what the registered sandbox artwork shows of the model (device values, pulses,
 * frozen and opened sectors, the net, the city's time and weather through the window) and the screen
 * rectangle the window clips the people outside to. The scene's values pick `visual` and `windowClip`
 * (controller-pictures.ts); the bay's devices.json controller names the artwork each picture reads
 * (controller.geometry, controller.stations).
 */
const rowOf=(rows:readonly Resolved[],id:string)=>rows.find(r=>r.instance.id===id);
/** The test stations in order, from the artwork the controller names (zone, sign, test card). */
export function sandboxStations(rows:readonly Resolved[],controller:SandboxController|null):Station[]{
 const get=(id:string)=>rowOf(rows,id)!;
 return(controller?.stations??[]).map((r,i)=>{const z=get(r.zone),sign=get(r.sign),card=r.card?get(r.card):undefined;return{n:i+1,x0:z.placement.x,x1:z.placement.x+Number(z.props.width),...(card?{sign:card.placement.x}:{}),title:String(sign.props.title),sub:String(sign.props.subtitle)};});
}
/** Every artwork reference the controller makes must resolve to artwork of the right shape; throws on the first that does not. */
export function validateSandboxGeometry(data:Pick<SceneData,'controller'>,rows:readonly Resolved[]){
 const c=sandboxController(data);if(!c)return;
 const get=(id:string)=>{const row=rowOf(rows,id);if(!row)throw Error('Sandbox artwork reference '+id);return row;};
 for(const[role,ref]of Object.entries(c.geometry)){const r=get(ref);if(role==='window'&&(!(Number(r.props.width)>0)||!(Number(r.props.height)>0)))throw Error('Sandbox window requires rectangle dimensions');}
 for(const station of c.stations){if(!(Number(get(station.zone).props.width)>0))throw Error('Sandbox station zone requires width');const sign=get(station.sign);if(typeof sign.props.title!=='string'||typeof sign.props.subtitle!=='string')throw Error('Sandbox station sign requires title and subtitle');if(station.card)get(station.card);}
}
function daylight(minute:number){const h=minute/60;if(h<5||h>=20)return 0;if(h<8)return(h-5)/3;if(h<17)return 1;return 1-(h-17)/3;}
export function sandboxPicture(m:SceneModel,hover:string|null,view:View,rows:readonly Resolved[],sceneId:string):Record<string,Value>{
 const wx=weatherNow(sceneClimate(sceneId)),c=sandboxController(m.data),w=c?.geometry.window?rowOf(rows,c.geometry.window):undefined;
 const snapshot:SandboxSnapshot={...structuredClone(emptySandboxSnapshot),...sandboxModelSnapshot(m)};
 for(const row of rows){const piece=sandboxPieceDefinitions.find(piece=>piece.device&&row.instance.type==='sandbox.'+piece.id);if(piece?.device)snapshot.spots[piece.device]={x:row.placement.x,y:row.placement.h,w:Number(row.props.width),h:Number(row.props.height)};}
 snapshot.minute=city.min;snapshot.daylight=daylight(city.min);snapshot.forecast=screenLine(sceneClimate(sceneId));snapshot.hourLabel=hm(city.min);
 snapshot.weather={cloud:wx.cloud,smog:wx.smog,rain:wx.rain,storm:wx.storm,fog:wx.fog,heat:wx.heat,wind:wx.wind};
 for(const st of sandboxStations(rows,c??null))snapshot.stationCenters[String(st.n)]=(st.x0+st.x1)/2;
 snapshot.windowVisible=!!w&&onScreen(view,view.sx(w.placement.x)-20,Number(w.props.width)+40);
 const hovered=hover?m.spots().find(spot=>spot.id===hover):undefined;if(hovered)snapshot.hoverSpot={x:hovered.x,y:hovered.y,w:hovered.w,h:hovered.h};
 return{visual:snapshot as unknown as Value,windowClip:w?[view.sx(w.placement.x),view.y(w.placement.h+Number(w.props.height)),Number(w.props.width),Number(w.props.height)]:null};
}
