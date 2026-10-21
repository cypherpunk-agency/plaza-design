import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './app';
import {validateReviewStations,type ReviewStationsDocument,type ReviewStationSource,type ReviewActionSource,type ReviewWhen} from '../demo/review-stations';
/** Typed controls for demo/review-stations.json: the review navigator's bookmarks, buttons and remote-device example. */
export function mountReviewStationsAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle {
 const api=context.authoring!;let disposed=false,station='',action='';
 const error=document.createElement('p');error.setAttribute('role','alert');const form=new TypedForm(e=>{error.textContent=String(e);});
 const read=()=>validateReviewStations(api.get('review-stations').value);
 function edit(label:string,change:(d:ReviewStationsDocument)=>void){const d=read();change(d);api.edit('review-stations',label,validateReviewStations(d));}
 /** One condition (none, has a conversation, lacks one, or a station resolves here) as a kind and an id. */
 const whenControls=(box:HTMLElement,prefix:string,when:ReviewWhen|undefined,stationIds:readonly string[]|null,set:(w:ReviewWhen|undefined)=>void)=>{
  const kinds=['always','conversation','withoutConversation',...(stationIds?['station']:[])] as const,kind=when?(Object.keys(when)[0] as typeof kinds[number]):'always';
  form.select(box,prefix+' condition',kinds,kind,k=>set(k==='always'?undefined:{[k]:k==='station'?stationIds![0]:'conversation.id'} as ReviewWhen));
  if(when&&kind==='station')form.select(box,prefix+' condition station',stationIds!,when.station!,id=>set({station:id}));
  else if(when)form.text(box,prefix+' condition conversation',(when.conversation??when.withoutConversation)!,id=>set(kind==='conversation'?{conversation:id}:{withoutConversation:id}));
 };
 function render(){
  if(disposed)return;const d=read();host.replaceChildren(error);
  if(!d.stations.some(s=>s.id===station))station=d.stations[0]?.id??'';if(!d.actions.some(a=>a.id===action))action=d.actions[0]?.id??'';
  form.text(host,'Review hint',d.hint,hint=>edit('Edit review hint',d=>{d.hint=hint;}),true);
  const stations=form.section(host,'Stations');
  form.select(stations,'Review station',d.stations.map(s=>s.id),station,id=>{station=id;render();});
  form.button(stations,'Add review station',()=>{let n=1;while(d.stations.some(s=>s.id==='station-'+n))n++;const id='station-'+n;edit('Add review station',d=>{d.stations.push({id,label:'New station',at:{firstUse:true},prompt:'Describe what to try here.'});});station=id;render();},d.stations.length>=64);
  const s=d.stations.find(s=>s.id===station);
  if(s){
   const mutate=(label:string,fn:(s:ReviewStationSource)=>void)=>edit(label,d=>fn(d.stations.find(x=>x.id===station)!));
   form.text(stations,'Station label',s.label??'',label=>mutate('Edit station label',s=>{if(label.trim())s.label=label;else delete s.label;}));
   form.text(stations,'Station scene (blank: any scene)',s.scene??'',scene=>mutate('Edit station scene',s=>{if(scene.trim())s.scene=scene.trim();else delete s.scene;}));
   form.text(stations,'Station prompt',s.prompt,prompt=>mutate('Edit station prompt',s=>{s.prompt=prompt;}),true);
   const kind=(['use','device','person','firstUse'] as const).find(k=>s.at[k]!==undefined)!;
   form.select(stations,'Station anchor kind',['use','device','person','firstUse'],kind,k=>mutate('Change station anchor',s=>{s.at=k==='firstUse'?{firstUse:true}:{[k]:'id'};}));
   if(kind!=='firstUse')form.text(stations,'Station anchor id',String(s.at[kind]),id=>mutate('Edit station anchor',s=>{s.at[kind]=id as never;}));
   if(kind==='person')form.check(stations,'Station person must have a conversation',!!s.at.talking,on=>mutate('Toggle station talking',s=>{if(on)s.at.talking=true;else delete s.at.talking;}));
   form.check(stations,'Station falls back to the spawn point',s.at.fallback==='spawn',on=>mutate('Toggle station fallback',s=>{if(on)s.at.fallback='spawn';else delete s.at.fallback;}));
   whenControls(stations,'Station',s.when,null,w=>mutate('Edit station condition',s=>{if(w)s.when=w;else delete s.when;}));
   form.button(stations,'Remove review station',()=>{edit('Remove review station',d=>{if(d.communication.remote.station===station)throw Error('The remote-device example jumps to this station');if(d.actions.some(a=>a.when?.station===station))throw Error('A button depends on this station');d.stations=d.stations.filter(x=>x.id!==station);});render();});
  }
  const actions=form.section(host,'Buttons');
  form.select(actions,'Review button',d.actions.map(a=>a.id),action,id=>{action=id;render();});
  form.button(actions,'Add review button',()=>{let n=1;while(d.actions.some(a=>a.id==='button-'+n))n++;const id='button-'+n;edit('Add review button',d=>{d.actions.push({id,label:'New button',run:{talk:'conversation.id'}});});action=id;render();},d.actions.length>=64);
  const a=d.actions.find(a=>a.id===action);
  if(a){
   const mutate=(label:string,fn:(a:ReviewActionSource)=>void)=>edit(label,d=>fn(d.actions.find(x=>x.id===action)!));
   form.text(actions,'Button label',a.label,label=>mutate('Edit button label',a=>{a.label=label;}));
   form.text(actions,'Button scene (blank: any scene)',a.scene??'',scene=>mutate('Edit button scene',a=>{if(scene.trim())a.scene=scene.trim();else delete a.scene;}));
   const run=(['use','talk','actor'] as const).find(k=>a.run[k]!==undefined)!;
   form.select(actions,'Button runs',['use','talk','actor'],run,k=>mutate('Change button action',a=>{a.run={[k]:'id'};}));
   form.text(actions,'Button target id',String(a.run[run]),id=>mutate('Edit button target',a=>{a.run={[run]:id};}));
   whenControls(actions,'Button',a.when,d.stations.map(s=>s.id),w=>mutate('Edit button condition',a=>{if(w)a.when=w;else delete a.when;}));
   form.button(actions,'Remove review button',()=>{edit('Remove review button',d=>{d.actions=d.actions.filter(x=>x.id!==action);});render();});
  }
  const remote=form.section(host,'Remote-device example');
  form.select(remote,'Remote example station',d.stations.map(s=>s.id),d.communication.remote.station,id=>edit('Edit remote example station',d=>{d.communication.remote.station=id;}));
  form.text(remote,'Remote example device',d.communication.remote.device,device=>edit('Edit remote example device',d=>{d.communication.remote.device=device;}));
 }
 render();const dispose=(()=>{disposed=true;host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=render;return dispose;
}
