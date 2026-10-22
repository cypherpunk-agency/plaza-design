import source from './review-stations.json';
import type {SceneDef} from '../scenes/kit';

/**
 * Review bookmarks (demo/review-stations.json): where the review navigator can jump, and which buttons it offers
 * in which scene. The document names scenes, uses, devices, people and conversations; positions resolve from the
 * native source placements (including pending editor compositions). The game loop and the navigator hold no
 * scene or conversation ids of their own.
 */
export interface ReviewAnchor {use?:string;device?:string;person?:string;talking?:boolean;firstUse?:boolean;fallback?:'spawn'}
export interface ReviewWhen {conversation?:string;withoutConversation?:string;station?:string}
export interface ReviewStationSource {id:string;label?:string;scene?:string;at:ReviewAnchor;when?:ReviewWhen;prompt:string}
export interface ReviewActionSource {id:string;label:string;scene?:string;when?:ReviewWhen;run:{use?:string;talk?:string;actor?:string}}
export interface ReviewStationsDocument {
 version:1;hint:string;stations:ReviewStationSource[];actions:ReviewActionSource[];
 /** The remote-device communication example: jump to a station, then make a device on it reply. */
 communication:{remote:{station:string;device:string}};
}
export interface ReviewStation {id:string;label:string;scene:string;x:number;prompt:string}

const fail=(why:string):never=>{throw new Error('Invalid review stations: '+why);};
const object=(v:unknown,keys:readonly string[],required:readonly string[],at:string)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k))||required.some(k=>!Object.prototype.hasOwnProperty.call(v,k)))fail(at+' fields');return v as Record<string,unknown>;};
const ident=(v:unknown,at:string)=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_.:]{1,96}$/.test(v)||['__proto__','constructor','prototype'].includes(v))fail(at+' needs a plain identifier');};
const text=(v:unknown,at:string)=>{if(typeof v!=='string'||!v.trim()||v.length>2000)fail(at+' needs bounded text');};
function checkWhen(v:unknown,at:string,stations:ReadonlySet<string>|null){
 if(v===undefined)return;const w=object(v,['conversation','withoutConversation','station'],[],at+'/when');
 if(Object.keys(w).length!==1)fail(at+'/when takes exactly one condition');
 for(const k of ['conversation','withoutConversation'])if(w[k]!==undefined)ident(w[k],at+'/when/'+k);
 if(w.station!==undefined){if(!stations)fail(at+'/when: only actions may depend on a station');ident(w.station,at+'/when/station');if(!stations!.has(String(w.station)))fail(at+'/when names unknown station '+String(w.station));}
}
export function validateReviewStations(value:unknown):ReviewStationsDocument{
 const d=object(value,['version','hint','stations','actions','communication'],['version','hint','stations','actions','communication'],'document');
 if(d.version!==1)fail('version');text(d.hint,'hint');
 if(!Array.isArray(d.stations)||d.stations.length>64||!Array.isArray(d.actions)||d.actions.length>64)fail('bounded station and action lists');
 const ids=new Set<string>(),stationRows=d.stations as unknown[],actionRows=d.actions as unknown[];
 for(const raw of stationRows){
  const s=object(raw,['id','label','scene','at','when','prompt'],['id','at','prompt'],'station');ident(s.id,'station id');if(ids.has(String(s.id)))fail('duplicate station '+String(s.id));ids.add(String(s.id));
  if(s.label!==undefined)text(s.label,'station label');if(s.scene!==undefined)ident(s.scene,'station scene');text(s.prompt,'station prompt');
  const a=object(s.at,['use','device','person','talking','firstUse','fallback'],[],'station '+String(s.id)+'/at'),kinds=['use','device','person','firstUse'].filter(k=>a[k]!==undefined);
  if(kinds.length!==1)fail('station '+String(s.id)+' needs exactly one of use, device, person, firstUse');
  for(const k of ['use','device','person'])if(a[k]!==undefined)ident(a[k],'station anchor');
  if(a.firstUse!==undefined&&a.firstUse!==true)fail('firstUse is true');if(a.talking!==undefined&&(a.talking!==true||a.person===undefined))fail('talking applies to a person anchor');
  if(a.fallback!==undefined&&a.fallback!=='spawn')fail('fallback is spawn');
  if(s.label===undefined&&a.person===undefined)fail('station '+String(s.id)+' needs a label (only person anchors take the person\'s name)');
 }
 (stationRows as ReviewStationSource[]).forEach(s=>checkWhen(s.when,'station '+s.id,null));
 const actionIds=new Set<string>();
 for(const raw of actionRows){
  const a=object(raw,['id','label','scene','when','run'],['id','label','run'],'action');ident(a.id,'action id');if(actionIds.has(String(a.id)))fail('duplicate action '+String(a.id));actionIds.add(String(a.id));
  text(a.label,'action label');if(a.scene!==undefined)ident(a.scene,'action scene');checkWhen(a.when,'action '+String(a.id),ids);
  const r=object(a.run,['use','talk','actor'],[],'action '+String(a.id)+'/run'),kinds=Object.keys(r);if(kinds.length!==1)fail('action '+String(a.id)+' runs exactly one of use, talk, actor');ident(r[kinds[0]],'action run');
 }
 const c=object(d.communication,['remote'],['remote'],'communication'),r=object(c.remote,['station','device'],['station','device'],'communication/remote');
 ident(r.station,'remote station');ident(r.device,'remote device');if(!ids.has(String(r.station)))fail('remote station '+String(r.station)+' is not a station');
 return structuredClone(d) as unknown as ReviewStationsDocument;
}
export const REVIEW_STATIONS=validateReviewStations(source);

const NONE:ReadonlySet<string>=new Set();
/** Does a scene meet a station's or action's condition? `stationsHere` are the station ids that resolve in this scene. */
function met(scene:SceneDef,when:ReviewWhen|undefined,stationsHere:ReadonlySet<string>){
 if(!when)return true;const conversations=scene.gameplay?.conversations;
 if(when.conversation!==undefined)return !!conversations?.[when.conversation];
 if(when.withoutConversation!==undefined)return !conversations?.[when.withoutConversation];
 return stationsHere.has(String(when.station));
}
function anchorX(scene:SceneDef,a:ReviewAnchor):number|undefined{
 const at=a.use!==undefined?scene.uses?.find(u=>u.id===a.use)?.x
  :a.device!==undefined?scene.data?.devices.find(d=>d.id===a.device)?.layout?.spot?.x
  :a.person!==undefined?scene.people?.find(p=>p.id===a.person&&(!a.talking||p.conversation))?.x
  :scene.uses?.[0]?.x;
 return at??(a.fallback==='spawn'?scene.spawn:undefined);
}
/** Review bookmarks of the content, in the document's order (equal stations: content order). */
export function reviewStations(content:Readonly<Record<string,SceneDef|undefined>>,doc:ReviewStationsDocument=REVIEW_STATIONS):ReviewStation[]{
 const rows:ReviewStation[]=[];
 for(const[scene,s]of Object.entries(content)){if(!s)continue;
  for(const st of doc.stations){if(st.scene!==undefined&&st.scene!==scene)continue;if(!met(s,st.when,NONE))continue;
   const x=anchorX(s,st.at);if(x===undefined)continue;
   const person=st.at.person!==undefined?s.people?.find(p=>p.id===st.at.person):undefined;
   rows.push({scene,id:st.id,label:st.label??person?.name??st.at.person!,x,prompt:st.prompt});}
 }
 const order=doc.stations.map(s=>s.id);return rows.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
}
/** The review buttons this scene offers now. */
export function reviewActions(scene:SceneDef,sceneId:string,stations:readonly ReviewStation[],doc:ReviewStationsDocument=REVIEW_STATIONS):ReviewActionSource[]{
 const here=new Set(stations.filter(s=>s.scene===sceneId).map(s=>s.id));
 return doc.actions.filter(a=>(a.scene===undefined||a.scene===sceneId)&&met(scene,a.when,here));
}
