import type {ScenesState} from './state';
import type {SceneId} from '../scenes';
export interface ChunkStatus {
 id:string;label:string;mode:'editing'|'runtime';statuses:string[];reasons:string[];
 sceneryLoaded:boolean;modelLoaded:boolean;entities:{id:string;kind:'person'|'vehicle';zone:string}[];
}
/** Read the actual lifecycle records. Inspection never predicts or changes residency. */
export function runtimeChunkStatuses(scenes:ScenesState,label:(id:string)=>string,mobiles:readonly {source:string;vehicles:readonly {id:string;zone:string}[];people:readonly {key:string;zone?:string}[]}[]):ChunkStatus[]{
 const ids=new Set([scenes.here,...scenes.zoneReasons.keys(),...scenes.zoneTiers.keys(),...scenes.hosts.keys(),...scenes.mobiles.keys()]);
 return [...ids].map(id=>{
  const scene=id as SceneId,host=scenes.hosts.get(scene),core=scenes.mobiles.get(scene),tier=scenes.zoneTiers.get(id),statuses:string[]=[],reasons:string[]=[];
  if(id===scenes.here){statuses.push('Player');reasons.push('Contains the player.');}
  if(host&&tier==='visible')statuses.push('Visible');
  if(host&&tier==='near')statuses.push('Nearby');
  if(!host&&!core)statuses.push('Unloaded');
  if(core||host&&(host.overlayOpen||host.popupOpen||host.visionOn||host.acknowledgmentPending)){statuses.push('Retained');}
  if(host&&!statuses.length)statuses.push('Loaded');
  const reason=scenes.zoneReasons.get(id);if(reason)reasons.push(reason);
  if(host&&(host.overlayOpen||host.popupOpen||host.visionOn||host.acknowledgmentPending))reasons.push('An interaction is open.');
  if(core)reasons.push('The scenery host is unloaded; its mobile model continues.');
  if(host&&scenes.mobileOwners.has(scene))reasons.push('Also supplies live mobile entities.');
  const source=mobiles.find(m=>m.source===id),entities:ChunkStatus['entities']=source?[...source.vehicles.map(v=>({id:v.id,kind:'vehicle' as const,zone:v.zone})),...source.people.map(p=>({id:p.key,kind:'person' as const,zone:p.zone??id}))]:[];
  return{id,label:label(id),mode:'runtime',statuses,reasons,sceneryLoaded:!!host,modelLoaded:!!(host||core),entities};
 });
}
export const preparedChunkStatus=(id:string,label:string):ChunkStatus=>({id,label,mode:'editing',statuses:['Prepared for editing'],reasons:['Prepared by the editing preview. This is not gameplay residency. The editor camera does not determine which chunks the game loads.'],sceneryLoaded:false,modelLoaded:false,entities:[]});
