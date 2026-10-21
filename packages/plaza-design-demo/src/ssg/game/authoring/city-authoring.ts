import {validateOpeningSource} from '../story/opening-source';
import {pendingRegistry} from './pending-registry';
import {sharedWorldFlags,renameWorldFlagDocuments} from './world-flag-references';
import {SCENES} from '../scenes';
import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './app';
import type {CitySource} from '../world/city';
import {validatePendingCity} from './pending-city';
import {validateMetroSource,type MetroSource} from '../world/transport/metro-source';
/** Typed edits use ordinary history, bundle and protected grouped source Save. */
export function mountCityAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle{
 const api=context.authoring!;let disposed=false,flagDraft='',stationDraftSource='';
 let stationDraft:Pick<CitySource,'STATIONS'|'STATION_MAP'>|undefined;
 const error=document.createElement('p');error.setAttribute('role','alert');
 const form=new TypedForm(e=>{error.textContent=String(e);});
 function edit(label:string,change:(source:CitySource)=>void){const d=validatePendingCity(api.get('city-source').value,new Map(context.documents.map(d=>[d.id,d.value])));change(d);api.edit('city-source',label,d);}
 function editMetro(label:string,change:(source:MetroSource)=>void){const d=validateMetroSource(api.get('metro-source').value);change(d);api.edit('metro-source',label,validateMetroSource(d));}
 const get=(d:any,path:(string|number)[])=>path.reduce((v,k)=>v[k],d);
 const change=(path:(string|number)[],value:unknown)=>edit('Edit city '+path.join('.'),d=>{get(d,path.slice(0,-1))[path.at(-1)!]=value;});
 function prospective(){const catalogue=context.documents.find(d=>d.id==='authored-scenes')?.value as {scenes?:{scene:{id:string;exits?:{id:string}[]}}[]}|undefined;return Object.fromEntries([...Object.entries(SCENES).map(([id,s])=>{const source=context.documents.find(d=>d.id===id+'-scene')?.value as {exits?:{id:string}[]}|undefined;return[id,{exits:source?.exits??s.exits}]as const;}),...(catalogue?.scenes??[]).map(s=>[s.scene.id,{exits:s.scene.exits??[]}]as const)]);}
 function checklist(parent:HTMLElement,name:string,values:readonly string[],selected:readonly string[],write:(v:string[])=>void){for(const id of values)form.check(parent,name+' '+id,selected.includes(id),on=>write(on?[...selected,id]:selected.filter(v=>v!==id)));}
 /** Primitive and structural controls for the existing bounded map source; never raw JSON. */
 function topology(parent:HTMLElement,value:any,path:(string|number)[],d:CitySource){const name='City '+path.join(' '),key=String(path.at(-1)),scenes=Object.keys(prospective()),districts=d.DISTRICTS.map(v=>v.id);
  if(value===null){form.check(parent,name+' configured',false,on=>{if(on)edit('Enable district centre',d=>{get(d,path.slice(0,-1))[path.at(-1)!]=[0,0];if(path[0]==='DISTRICT_MAP')get(d,path.slice(0,-1)).sep=Math.max(.1,get(d,path.slice(0,-1)).sep);});});return;}
  if(typeof value==='boolean'){form.check(parent,name,value,v=>change(path,v));return;}
  if(typeof value==='number'){form.decimal(parent,name,value,v=>change(path,v),-1000000,1000000);return;}
  if(typeof value==='string'){
   const options=key==='access'?Object.keys(d.ACCESS):key==='stratum'?['overworld','street','underworld']:key==='kind'?['walk','road','elevator','taxi','bridge','drain','tunnel','canal','lift']:key==='state'?['open','gate','planned']:['district','from','to'].includes(key)&&path[0]!=='TRANSPORT'?districts:['scene','up'].includes(key)?scenes:undefined;
   if(key==='id'){const text=document.createElement('p');text.textContent=name+': '+value;parent.append(text);}else if(options)form.select(parent,name,options,value,v=>change(path,v));else form.text(parent,name,value,v=>change(path,v),value.length>100);return;
  }
  if(Array.isArray(value)){
   if(key==='near'||path[0]==='PLACE_IN_VIEW'||key==='at'){checklist(parent,name,key==='near'?districts:scenes,value,v=>change(path,v));return;}
   value.forEach((item:any,i:number)=>{const row=typeof item==='object'?form.section(parent,name+' '+i):parent;topology(row,item,[...path,i],d);if(['path','LOOP_MAP','stops','dash','LINKS','LINES_PLANNED'].includes(key))form.button(row,'Remove '+name+' '+i,()=>edit('Remove city list member',d=>{get(d,path).splice(i,1);}),['path','LOOP_MAP'].includes(key)&&value.length<=2);});
   const add=key==='path'||key==='LOOP_MAP'?()=>[...(value.at(-1)??[0,0])]:key==='stops'?()=>({name:'New stop',pt:[0,0],district:districts[0]}):key==='dash'?()=>4:key==='LINKS'?()=>({kind:'walk',name:'New link',from:districts[0],to:districts[1]??districts[0],path:[[0,0],[40,0]],state:'planned'}):key==='LINES_PLANNED'?()=>({id:(()=>{let i=1;while(value.some((v:any)=>v.id==='planned-'+i))i++;return 'planned-'+i;})(),name:'New planned line',short:'PLANNED',col:'0,255,255',width:2,path:[[0,0],[40,0]],stops:[]}):undefined;
   if(add)form.button(parent,'Add '+name,()=>edit('Add city list member',d=>{get(d,path).push(add());}));return;
  }
  if(!value||typeof value!=='object')return;
  if(path[0]==='DISTRICT_MAP'&&path.length===2&&value.centre!==null)form.check(parent,name+' centre configured',true,on=>{if(!on)change([...path,'centre'],null);});
  if(path[0]==='DISTRICT_REVEAL'&&path.length===2&&value.landmark===undefined)form.check(parent,name+' landmark',false,on=>{if(on)change([...path,'landmark'],true);});
  if(path[0]==='LINES_PLANNED'&&path.length===2&&!value.dash)form.button(parent,'Add '+name+' dash',()=>change([...path,'dash'],[4,4]));
  if(path[0]==='LINKS'&&path.length===2){form.select(parent,name+' access policy',['',...Object.keys(d.ACCESS)],value.access??'',v=>edit('Bind map link access',d=>{const link=get(d,path);if(v)link.access=v;else delete link.access;}));}
  if(path[0]==='LINKS'&&path.length===2&&!value.at)form.button(parent,'Add '+name+' scene visibility',()=>change([...path,'at'],[]));
  for(const[k,v]of Object.entries(value)){if(k==='access'&&path[0]==='LINKS')continue;const row=typeof v==='object'&&v!==null?form.section(parent,name+' '+k):parent;topology(row,v,[...path,k],d);}
 }
 function render(){if(disposed)return;const d=validatePendingCity(api.get('city-source').value,new Map(context.documents.map(d=>[d.id,d.value])));host.replaceChildren(error);
  const travel=form.section(host,'Travel');
  form.number(travel,'Taxi fare',d.FARE,fare=>edit('Edit taxi fare',d=>{d.FARE=fare;}));
  form.number(travel,'Quick travel duration (frames)',d.HOP,frames=>edit('Edit quick travel duration',d=>{d.HOP=frames;}),1);
  form.select(travel,'Starting scene',d.PLACES.flatMap(p=>p.scenes),d.START_SCENE,scene=>edit('Edit starting scene',d=>{d.START_SCENE=scene as CitySource['START_SCENE'];}));
  for(const place of d.PLACES){const section=form.section(host,'Place · '+place.id);
   form.select(section,'Place '+place.id+' access policy',['',...Object.keys(d.ACCESS)],place.access??'',v=>edit('Bind place access',d=>{const p=d.PLACES.find(p=>p.id===place.id)!;if(v)p.access=v;else delete p.access;}));
   form.text(section,'Place '+place.id+' name',place.name,name=>edit('Edit place name',d=>{d.PLACES.find(p=>p.id===place.id)!.name=name;}));
   form.select(section,'Place '+place.id+' entrance',place.scenes,place.entrance,scene=>edit('Edit place entrance',d=>{const p=d.PLACES.find(p=>p.id===place.id)!;p.entrance=scene as typeof p.entrance;delete p.at;}));
   form.select(section,'Place '+place.id+' arrival exit',['',...prospective()[place.entrance].exits.map(e=>e.id)],place.at??'',at=>edit('Edit place arrival',d=>{const p=d.PLACES.find(p=>p.id===place.id)!;if(at)p.at=at;else delete p.at;}));
  }
  for(const id of d.STAND_IDS){const section=form.section(host,'Taxi · '+id);form.text(section,'Taxi '+id+' name',d.STANDS[id].name,name=>edit('Edit taxi stand name',d=>{d.STANDS[id].name=name;}));}
  const refs=prospective(),sceneIds=Object.keys(refs),districtIds=d.DISTRICTS.map(v=>v.id);
  const policies=form.section(host,'Access policies');
  for(const[id,policy]of Object.entries(d.ACCESS)){
   const section=form.section(policies,'Access '+id);
   form.select(section,'Access '+id+' scene',sceneIds,policy.exit.scene,v=>edit('Rebind access owner scene',d=>{const exits=refs[v].exits;if(!exits.length)throw Error('Access owner must have an exit');d.ACCESS[id].exit={scene:v,id:exits[0].id};}));
   form.select(section,'Access '+id+' exit',refs[policy.exit.scene].exits.map(e=>e.id),policy.exit.id,v=>edit('Rebind access owner exit',d=>{d.ACCESS[id].exit.id=v;}));
   form.text(section,'Access '+id+' refusal',policy.reason,v=>edit('Edit access refusal',d=>{d.ACCESS[id].reason=v;}));
   form.button(section,'Remove access '+id,()=>edit('Remove unused access policy',d=>{delete d.ACCESS[id];}),d.PLACES.some(p=>p.access===id)||d.LINKS.some(l=>l.access===id));
  }
  const locks=form.section(host,'Destination locks');
  for(const[id,lock]of Object.entries(d.LOCKS)){
   const section=form.section(locks,'Lock '+id);
   form.text(section,'Lock '+id+' refusal',lock.reason,v=>edit('Edit lock refusal',d=>{d.LOCKS[id].reason=v;}));
   for(const destination of [...new Set([...districtIds,...d.LINE,...d.STAND_IDS])])form.check(section,'Lock '+id+' holds '+destination,lock.destinations.includes(destination),on=>edit(on?'Lock a destination':'Unlock a destination',d=>{const list=new Set(d.LOCKS[id].destinations);if(on)list.add(destination);else list.delete(destination);if(!list.size)throw Error('A lock holds at least one destination');d.LOCKS[id].destinations=[...list];}));
   form.button(section,'Remove lock '+id,()=>edit('Remove destination lock',d=>{if(Object.values(validateMetroSource(api.get('metro-source').value).locked).includes(id))throw Error('A metro station still names this lock');delete d.LOCKS[id];}));
  }
  let lockId='';form.text(locks,'New lock ID','',v=>{lockId=v;});
  form.button(locks,'Add destination lock',()=>edit('Create destination lock',d=>{if(Object.prototype.hasOwnProperty.call(d.LOCKS,lockId))throw Error('Lock already exists');d.LOCKS[lockId]={unlockedBy:'HARBOR_FLAG',destinations:[districtIds[0]],reason:'ACCESS DENIED'};}));
  let policyId='';form.text(policies,'New access policy ID','',v=>{policyId=v;});
  form.button(policies,'Add access policy',()=>edit('Create exit access policy',d=>{if(Object.prototype.hasOwnProperty.call(d.ACCESS,policyId))throw Error('Access policy already exists');const scene=sceneIds.find(id=>refs[id].exits.length);if(!scene)throw Error('No exit access owners');d.ACCESS[policyId]={exit:{scene,id:refs[scene].exits[0].id},reason:'ACCESS DENIED'};}));
  const flagDocuments=()=>new Map(context.documents.map(d=>[d.id,api.get(d.id).value]));
  form.select(travel,'Harbor access flag',[...sharedWorldFlags(pendingRegistry(flagDocuments()),validateOpeningSource(flagDocuments().get('opening-story')).GAMEPLAY)],d.HARBOR_FLAG,v=>edit('Rebind harbor access flag',d=>{d.HARBOR_FLAG=v;}));
  form.text(travel,'Rename harbor access flag to',flagDraft,v=>{flagDraft=v;});
  form.button(travel,'Rename harbor access flag across sources',()=>{if(!api.editDocuments)throw Error('Grouped source editing is unavailable');api.editDocuments(renameWorldFlagDocuments(flagDocuments(),d.HARBOR_FLAG,flagDraft),'Rename shared harbor access flag');},!api.editDocuments);

  for(const kind of ['boarding','siding']as const){const target=d.TRANSPORT[kind],section=form.section(travel,'Transport '+kind);form.select(section,'Transport '+kind+' scene',sceneIds,target.scene,v=>edit('Rebind transport scene',d=>{d.TRANSPORT[kind].scene=v as typeof target.scene;delete d.TRANSPORT[kind].entrance;}));form.select(section,'Transport '+kind+' entrance',['',...refs[target.scene].exits.map(e=>e.id)],target.entrance??'',v=>edit('Rebind transport entrance',d=>{if(v)d.TRANSPORT[kind].entrance=v;else delete d.TRANSPORT[kind].entrance;}));}
  for(const key of ['SIDING_OUT','DRIVER_HARBOR','DRIVER_BROKE']as const){const section=form.section(travel,key);d[key].forEach((page,i)=>{form.text(section,key+' page '+i,page,v=>edit('Edit transport dialogue',d=>{d[key][i]=v;}),true);form.button(section,'Remove '+key+' page '+i,()=>edit('Remove transport dialogue',d=>{d[key].splice(i,1);}),d[key].length===1);});form.button(section,'Add '+key+' page',()=>edit('Add transport dialogue',d=>{d[key].push('New transport line.');}));}
  for(const place of d.PLACES){const section=form.section(host,'Place membership '+place.id);form.select(section,'Place '+place.id+' district',['',...districtIds],place.district??'',v=>edit('Reassign place district',d=>{d.PLACES.find(x=>x.id===place.id)!.district=(v||null)as typeof place.district;}));
   for(const scene of sceneIds){const owner=d.PLACES.find(p=>p.scenes.includes(scene as typeof p.scenes[number]));if(owner?.id===place.id)continue;form.button(section,'Move '+scene+' into '+place.id,()=>edit('Move scene between places',d=>{const old=d.PLACES.find(p=>p.scenes.includes(scene as typeof p.scenes[number]));if(old){if(old.scenes.length===1)throw Error('Merge the owning place instead of leaving it empty');old.scenes=old.scenes.filter(s=>s!==scene);if(old.entrance===scene){old.entrance=old.scenes[0];delete old.at;}}d.PLACES.find(p=>p.id===place.id)!.scenes.push(scene as typeof place.scenes[number]);}),owner?.scenes.length===1);}
   form.check(section,'Place '+place.id+' map point',!!d.PLACE_MAP[place.id],on=>edit('Set place map marker',d=>{if(on)d.PLACE_MAP[place.id]=[...(Object.entries(d.PLACE_MAP).find(([id,p])=>p&&d.PLACES.find(v=>v.id===id)?.district===place.district)?.[1]??(place.district?d.DISTRICT_MAP[place.district].centre:null)??Object.values(d.PLACE_MAP).find((p):p is [number,number]=>!!p)??d.STATION_MAP[d.LINE[0]])];else delete d.PLACE_MAP[place.id];}));form.check(section,'Place '+place.id+' reveal rule',!!d.PLACE_IN_VIEW[place.id],on=>edit('Set place reveal rule',d=>{if(on)d.PLACE_IN_VIEW[place.id]=[];else delete d.PLACE_IN_VIEW[place.id];}));
  }
  // A route and its geographic point may need to change together. Keep typed drafts until
  // one atomic commit, so exchanging occupied platforms needs no invalid intermediate source.
  const stationSource=JSON.stringify([d.STATIONS,d.STATION_MAP]);
  if(!stationDraft||stationSource!==stationDraftSource){stationDraft=structuredClone({STATIONS:d.STATIONS,STATION_MAP:d.STATION_MAP});stationDraftSource=stationSource;}
  const routes=form.section(host,'Station routes');
  const note=document.createElement('p');note.textContent='Stage platform, surface, arrival and map-point changes, then apply all station routes together.';routes.append(note);
  for(const id of d.LINE){const section=form.section(routes,'Station routing '+id),station=stationDraft.STATIONS[id];
   form.select(section,'Station '+id+' scene',sceneIds,station.scene,v=>{stationDraft!.STATIONS[id].scene=v as typeof station.scene;delete stationDraft!.STATIONS[id].at;render();});
   form.select(section,'Station '+id+' up',sceneIds,station.up,v=>{stationDraft!.STATIONS[id].up=v as typeof station.up;});
   form.select(section,'Station '+id+' arrival',['',...refs[station.scene].exits.map(e=>e.id)],station.at??'',v=>{if(v)stationDraft!.STATIONS[id].at=v;else delete stationDraft!.STATIONS[id].at;});
   for(const[axis,index]of [['x',0],['y',1]]as const)form.decimal(section,'Station '+id+' map '+axis,stationDraft.STATION_MAP[id][index],v=>{stationDraft!.STATION_MAP[id][index]=v;},-1000000,1000000);
  }
  form.button(routes,'Apply station routes',()=>{const draft=structuredClone(stationDraft!);edit('Apply station routes',d=>{d.STATIONS=draft.STATIONS;d.STATION_MAP=draft.STATION_MAP;});error.textContent='';render();});
  form.button(routes,'Discard station route changes',()=>{stationDraft=undefined;error.textContent='';render();});
  for(const id of d.STAND_IDS){const section=form.section(host,'Taxi routing '+id),stand=d.STANDS[id];form.select(section,'Taxi '+id+' scene',sceneIds,stand.scene,v=>edit('Rebind taxi scene',d=>{d.STANDS[id].scene=v as typeof stand.scene;delete d.STANDS[id].at;}));form.select(section,'Taxi '+id+' arrival',['',...refs[stand.scene].exits.map(e=>e.id)],stand.at??'',v=>edit('Rebind taxi arrival',d=>{if(v)d.STANDS[id].at=v;else delete d.STANDS[id].at;}));}
  // Districts are created, renamed, placed and removed in World › Districts (district-authoring.ts).
  const registries=form.section(host,'Place registries');
  let newPlace='',newPlaceScene=sceneIds.find(scene=>{const p=d.PLACES.find(p=>p.scenes.includes(scene as typeof p.scenes[number]));return!p||p.scenes.length>1;})??sceneIds[0];form.text(registries,'New place ID','',v=>{newPlace=v;});form.select(registries,'New place scene',sceneIds,newPlaceScene,v=>{newPlaceScene=v;});form.button(registries,'Add place',()=>edit('Split scene into new place',d=>{const owner=d.PLACES.find(p=>p.scenes.includes(newPlaceScene as typeof p.scenes[number]));if(owner){if(owner.scenes.length===1)throw Error('Choose a scene from a place with multiple scenes');owner.scenes=owner.scenes.filter(s=>s!==newPlaceScene);if(owner.entrance===newPlaceScene){owner.entrance=owner.scenes[0];delete owner.at;}}d.PLACES.push({id:newPlace as typeof d.PLACES[number]['id'],name:'New place',district:null,entrance:newPlaceScene as typeof d.START_SCENE,scenes:[newPlaceScene as typeof d.START_SCENE]});}));
  for(const place of d.PLACES){const choices=d.PLACES.filter(p=>p.id!==place.id).map(p=>p.id);let merge=choices[0];form.select(registries,'Merge '+place.id+' into',choices,merge,v=>{merge=v as typeof merge;});form.button(registries,'Merge place '+place.id,()=>edit('Merge place memberships',d=>{const owner=d.PLACES.find(p=>p.id===place.id)!,target=d.PLACES.find(p=>p.id===merge)!;target.scenes.push(...owner.scenes);d.PLACES=d.PLACES.filter(p=>p.id!==place.id);delete d.PLACE_MAP[place.id];delete d.PLACE_IN_VIEW[place.id];}),!choices.length);}
  const map=form.section(host,'Map and topology');for(const key of ['MAP_W','MAP_H','DISTRICT_MAP','PLACE_MAP','STATION_MAP','PAD_MAP','LOOP_MAP','LINES_PLANNED','LINKS','DISTRICT_REVEAL','PLACE_IN_VIEW']as const)topology(form.section(map,key),d[key],[key],d);
  const order=form.section(host,'Transport route order');for(const key of ['LINE','STAND_IDS']as const)d[key].forEach((id,i)=>form.button(order,key+' move '+id+' earlier',()=>edit('Reorder registered transport stops',d=>{[d[key][i-1],d[key][i]]=[d[key][i],d[key][i-1]];}),i===0));
  const metro=validateMetroSource(api.get('metro-source').value),platform=form.section(host,'Metro platforms');
  for(const key of ['loop','arrive','dwell','leave'] as const)form.number(platform,'Platform '+key+' frames',metro.timetable[key],n=>editMetro('Edit metro platform timing',d=>{d.timetable[key]=n;}),key==='dwell'?80:1);
  for(const id of d.LINE){form.text(platform,'Station '+id+' name',d.STATIONS[id].name,name=>edit('Edit station name',d=>{d.STATIONS[id].name=name;}));form.number(platform,'Station '+id+' phase offset',metro.offset[id],n=>editMetro('Edit station phase',d=>{d.offset[id]=n;}),0,metro.timetable.loop-1);form.select(platform,'Station '+id+' lock',['',...Object.keys(d.LOCKS)],metro.locked[id]??'',lock=>editMetro('Bind station lock',m=>{if(lock)m.locked[id]=lock;else delete m.locked[id];}));}
  const train=form.section(host,'Metro ride');
  for(const key of ['dwell','close','run','open'] as const)form.number(train,'Ride '+key+' frames',metro[key],n=>editMetro('Edit metro ride timing',d=>{d[key]=n;}),1);
  form.decimal(train,'Closed-station run multiplier',metro.longRun,n=>editMetro('Edit closed-station run timing',d=>{d.longRun=n;}),1,10);
  const brake=form.section(host,'Emergency brake');
  for(const key of ['decel','window','accel','lead'] as const)form.decimal(brake,'Brake '+key,metro.brake[key],n=>editMetro('Edit metro brake',d=>{d.brake[key]=n;}),key==='decel'||key==='accel'?.000001:0,key==='decel'||key==='accel'?100:3000);
  for(const key of ['track','siding','open'] as const)form.number(brake,'Halt '+key+' frames',metro.halt[key],n=>editMetro('Edit metro halt timing',d=>{d.halt[key]=n;}),1);
 }
 render();const dispose=(()=>{disposed=true;host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=render;return dispose;
}
