import {renderPolicy} from '../world/render-policy';
import type {CitySource} from '../world/city';
import {renderSettingsAuthoring} from './render-settings-authoring';
import {resolveRenderSettings} from '../world/render-settings';
import type {OpenInspector} from './inspector-task';
import {element,button,select} from './controls';
import {TypedForm} from './typed-form';
import type {ArtRegistry,ChunkDocument,AssetInstance} from '../art/core/composition';
import type {EditorDocument,PreviewResult} from './contracts';
import {validateWorldCompositions,compileWorldComposition,worldEndpointPosition,type WorldComposition,type WorldCompositions,type WorldConnection,type WorldEndpoint,type WorldPosition} from '../world/compositions';
import {SEAM_KINDS} from '../world/zone-graph';
import {worldCompositionContext} from '../world/compiled-world';
import {pendingRegistry} from './pending-registry';
import {validationSnapshot} from './validation-snapshot';
import {worldMemberRows,worldMemberAt,moveWorldMember,unmountWorldMember,mountWorldMember,linkedWorldMembers,alignWorldConnection,type WorldMemberAddress} from './world-members';

export interface WorldWorkspaceControls {
 openRenderingSource?(source:import('../world/render-settings').RenderSource):void;
 inspect:OpenInspector;activeInspector?():string|undefined;
 registry:ArtRegistry;documents():readonly EditorDocument[];composition():string;
 select(address:WorldMemberAddress):void;selection():WorldMemberAddress|undefined;
 apply(label:string,source:WorldCompositions):void;openChunk(chunk:string):void;
 changed():void;
}
export const workspaceSource=(documents:readonly EditorDocument[])=>validateWorldCompositions(documents.find(d=>d.id==='world-compositions')!.value);
const same=(a:WorldMemberAddress|undefined,b:WorldMemberAddress)=>a?.composition===b.composition&&a.member===b.member&&a.child===b.child;

const inspect=(port:WorldWorkspaceControls,title:string,build:(body:HTMLElement,form:TypedForm)=>()=>void)=>port.inspect({title,build:(body,form)=>{const commit=build(body,form);return()=>{commit();port.changed();};}});
export function openMountPicker(port:WorldWorkspaceControls,create=false,groupAddress?:WorldMemberAddress){
 inspect(port,create?'New composition':'Mount chunk or group',(body,form)=>{
  const source=workspaceSource(port.documents()),registry=pendingRegistry(validationSnapshot(port.documents())),mounted=new Set(Object.values(source.compositions).flatMap(c=>c.members.flatMap(m=>m.chunk?[m.chunk]:source.groups[m.group!].members.map(child=>child.chunk!)))),chunks=port.documents().filter(d=>d.kind==='composition'&&(d.value as ChunkDocument).scene in registry&&!mounted.has((d.value as ChunkDocument).scene));
  let name='New composition',id='new-world',kind='chunk',picked='',wrap=false,groupId='new-group',groupName='New group',at:WorldPosition={x:0,h:0};
  if(create){form.text(body,'Composition name',name,v=>name=v);form.text(body,'Composition ID',id,v=>id=v);}
  body.append(element('p','muted','Choose a source first. Sources already mounted elsewhere are excluded: one live chunk has one placement. Unmounting keeps its source available. X/Y are relative to this composition.'));
  const choices=element('div');
  const render=()=>{choices.replaceChildren();const options=kind==='chunk'?chunks.map(d=>({value:(d.value as ChunkDocument).scene,label:(d.value as ChunkDocument).scene})):Object.entries(source.groups).filter(([,g])=>g.members.every(m=>!mounted.has(m.chunk!))).map(([value,g])=>({value,label:g.name+' · '+g.members.length+' chunks'}));
   picked=options.some(o=>o.value===picked)?picked:options[0]?.value??'';const picker=select(options,picked,v=>picked=v);picker.setAttribute('aria-label','Mount source');choices.append(picker);};
  form.select(body,'Source type',groupAddress?['chunk']:['chunk','group'],kind,v=>{kind=v;render();});body.append(choices);render();
  if(!groupAddress){const groupFields=element('div');groupFields.hidden=true;form.check(body,'Wrap chunk in a reusable group',false,v=>{wrap=v;groupFields.hidden=!v;});form.text(groupFields,'New group ID',groupId,v=>groupId=v);form.text(groupFields,'New group name',groupName,v=>groupName=v);body.append(groupFields);}
  form.decimal(body,'Mount X',at.x,x=>at.x=x,-10000000,10000000);form.decimal(body,'Mount Y',at.h,h=>at.h=h,-10000000,10000000);
  return()=>{if(!picked)throw Error('Choose a source to mount.');const candidate=structuredClone(source),key=create?id:port.composition();
   if(create){if(Object.prototype.hasOwnProperty.call(candidate.compositions,id))throw Error('Composition ID already exists.');candidate.compositions[id]={name,members:[],connections:[]};}
   if(groupAddress){const parent=candidate.compositions[groupAddress.composition].members.find(m=>m.id===groupAddress.member)!,group=candidate.groups[parent.group!];const base=picked.toLowerCase().replace(/[^a-z0-9-]+/g,'-');let id=base,n=2;while(group.members.some(m=>m.id===id))id=base+'-'+n++;group.members.push({id,chunk:picked,placement:at});port.apply('Mount chunk in group',validateWorldCompositions(candidate));port.select({...groupAddress,child:id});}
   else{if(wrap&&kind==='chunk'){if(candidate.groups[groupId])throw Error('Group ID already exists.');candidate.groups[groupId]={name:groupName,members:[{id:picked.toLowerCase().replace(/[^a-z0-9-]+/g,'-'),chunk:picked,placement:{x:0,h:0}}],connections:[],exports:{}};}const result=mountWorldMember(candidate,key,wrap&&kind==='chunk'?{group:groupId}:kind==='chunk'?{chunk:picked}:{group:picked},at);port.apply(create?'Create composition':'Mount world member',result.source);port.select(result.address);}
  };
 });
}
export function openCompositionRendering(port:WorldWorkspaceControls){
 const source=workspaceSource(port.documents());
 inspect(port,'Composition rendering',(body,form)=>{const draft=structuredClone(source),def=draft.compositions[port.composition()];
  const render=()=>{body.replaceChildren();body.append(element('p','muted','These overrides apply across the composition. Select a chunk to inspect its resolved values.'));renderSettingsAuthoring(form,body,def.rendering,value=>{if(value)def.rendering=value;else delete def.rendering;render();});};
  render();return()=>port.apply('Edit composition rendering',draft);
 });
}
export function renderWorldMembers(host:HTMLElement,port:WorldWorkspaceControls){
 if(!port.composition())return;const source=workspaceSource(port.documents()),outer=host;host=element('div','world-members structure');outer.append(host);host.append(element('h3','','Chunks and groups'),element('p','muted','Select a member to move or unmount it. Drag its label in the viewport.'));
 host.append(button('Composition rendering',()=>openCompositionRendering(port)));
 const rows=worldMemberRows(source,port.composition());
 for(const row of rows){
  const pick=(address:WorldMemberAddress,text:string)=>{const b=button(text,()=>port.select(address));b.setAttribute('aria-pressed',String(same(port.selection(),address)));b.dataset.worldMember=address.member;if(address.child)b.dataset.worldChild=address.child;return b;};
  if(row.children.length||row.member.group){const group=element('details','world-member-group');group.append(element('summary','',source.groups[row.member.group!].name),pick(row.address,'Select group · '+row.member.id));for(const child of row.children)group.append(pick(child.address,child.member.chunk!));host.append(group);}
  else host.append(pick(row.address,row.member.chunk!));
 }
 host.append(button('＋ Mount chunk / group',()=>openMountPicker(port)));
}

/** Anchors come from the same registered asset definitions used by world compilation. */
function anchorOptions(port:WorldWorkspaceControls,chunk:string){
 const doc=port.documents().find(d=>d.kind==='composition'&&(d.value as ChunkDocument).scene===chunk)?.value as ChunkDocument|undefined;
 const result:{instance:string;anchor:string}[]=[];const visit=(nodes:AssetInstance[])=>{for(const n of nodes){const definition=port.registry.get(n.type);for(const anchor of Object.keys(definition.anchors(port.registry.properties(n.type,n.props),{})))result.push({instance:n.id,anchor});visit(n.children??[]);}};visit(doc?.instances??[]);return result;
}
function endpointOptions(port:WorldWorkspaceControls,source:WorldCompositions,definition:WorldComposition,memberId:string):WorldEndpoint[]{
 const m=definition.members.find(m=>m.id===memberId)!;return m.group?Object.keys(source.groups[m.group].exports).map(name=>({member:memberId,export:name})):anchorOptions(port,m.chunk!).map(end=>({member:memberId,...end}));
}
function endpointFields(body:HTMLElement,form:TypedForm,port:WorldWorkspaceControls,source:WorldCompositions,definition:WorldComposition,label:string,get:()=>WorldEndpoint,set:(e:WorldEndpoint)=>void,render:()=>void){
 const end=get(),key=(e:WorldEndpoint)=>e.export??e.instance+'.'+e.anchor;
 form.select(body,label+' member',definition.members.map(m=>m.id),end.member,v=>{const next=endpointOptions(port,source,definition,v)[0];if(!next)throw Error('This member has no exported anchors.');set(next);render();});
 const options=endpointOptions(port,source,definition,end.member),picker=select(options.map(e=>({value:key(e),label:key(e)})),key(end),v=>{set(options.find(e=>key(e)===v)!);render();});form.field(body,label+' endpoint',picker);
 for(const axis of ['x','h']as const)form.decimal(body,label+' offset '+(axis==='x'?'X':'Y'),end.offset?.[axis]??0,value=>{const e=get();set({...e,offset:{x:e.offset?.x??0,h:e.offset?.h??0,[axis]:value}});},-10000000,10000000);
}
function editGroupExport(port:WorldWorkspaceControls,address:WorldMemberAddress,name?:string){
 inspect(port,name?'Edit group endpoint':'Add group endpoint',(body,form)=>{
  const source=workspaceSource(port.documents()),parent=source.compositions[address.composition].members.find(m=>m.id===address.member)!,group=source.groups[parent.group!];
  let key=name??'endpoint',end=name?structuredClone(group.exports[name]):group.members.flatMap(m=>endpointOptions(port,source,group,m.id))[0];if(!end)throw Error('Mount a chunk with anchors first.');
  form.text(body,'Endpoint name',key,v=>key=v);const fields=element('div');body.append(fields);const render=()=>{fields.replaceChildren();endpointFields(fields,form,port,source,group,'Group',()=>end,e=>end=e,render);};render();
  return()=>{const candidate=structuredClone(source),target=candidate.groups[parent.group!];if(name&&key!==name)delete target.exports[name];if(key!==name&&target.exports[key])throw Error('Endpoint name already exists.');target.exports[key]=end;port.apply('Edit group endpoint',validateWorldCompositions(candidate));};
 });
}
export function editMemberConnection(port:WorldWorkspaceControls,address:WorldMemberAddress,existing?:WorldConnection){
 port.select(address);
 const initial=workspaceSource(port.documents()),location=worldMemberAt(initial,address);
 const members=existing?[existing.a.member,existing.b.member]:[location.member.id];
 const highlightChunks=location.definition.members.filter(m=>members.includes(m.id)).flatMap(m=>m.chunk?[m.chunk]:initial.groups[m.group!].members.map(c=>c.chunk!));
 port.inspect({title:existing?'Connection · '+existing.id:'Connect members',id:existing?'world-connection:'+address.member+':'+(address.child?'group:':'')+existing.id:undefined,highlightChunks,build:(body,form)=>{
  const source=workspaceSource(port.documents()),{definition,member}=worldMemberAt(source,address);let draft=existing?structuredClone(existing):undefined;
  const fields=element('div');body.append(element('p','muted',existing?`A ${existing.kind} traversal connects ${existing.a.member} to ${existing.b.member}. The endpoint anchors must meet; this rule allows crossing between chunks. It is not separate walkway artwork.`:'Choose the two endpoints to connect.'),element('p','muted','Connections require matching endpoints. Apply validates both placements and anchors; nothing is stored until the complete connection is valid.'),fields);
  const endOptions=(memberId:string)=>endpointOptions(port,source,definition,memberId);
  if(!draft){const a=endOptions(member.id)[0],b=definition.members.filter(m=>m.id!==member.id).flatMap(m=>endOptions(m.id))[0];if(!a||!b)throw Error('Two members with registered anchors are required.');let id='connection',n=2;while(definition.connections.some(c=>c.id===id))id='connection-'+n++;draft={id,kind:'walk',a,b};}
  const connection=draft;let align=!existing;form.check(body,'Align To member with From endpoint',align,v=>align=v);
  const render=()=>{fields.replaceChildren();if(connection.kind==='walk')fields.append(element('p','muted','Walk crossings join chunk edges at the same height. Use matching edge anchors and zero offsets; alignment does not permit a gap or overlap. Other crossings use the door/stairs traversal rules.'));form.text(fields,'Connection ID',connection.id,id=>connection.id=id);form.select(fields,'Traversal',SEAM_KINDS,connection.kind,v=>{connection.kind=v as typeof connection.kind;render();});
   for(const side of ['a','b']as const)endpointFields(fields,form,port,source,definition,side==='a'?'From':'To',()=>connection[side],e=>connection[side]=e,render);
  };render();if(existing)body.append(button('Remove connection',()=>inspect(port,'Remove connection · '+existing.id,(body)=>{body.append(element('p','','This removes the traversal rule. Both chunk sources remain available.'));return()=>{const candidate=workspaceSource(port.documents()),target=worldMemberAt(candidate,address).definition;target.connections=target.connections.filter(c=>c.id!==existing.id);port.apply('Disconnect world members',candidate);};})));return()=>{const candidate=structuredClone(source),target=worldMemberAt(candidate,address).definition;
   const index=existing?target.connections.findIndex(c=>c.id===existing.id):-1;
   // Realign the two sides using the other links, not the connection being edited.
   if(index>=0)target.connections.splice(index,1);
   if(align)alignWorldConnection(candidate,target,connection,worldCompositionContext(pendingRegistry(validationSnapshot(port.documents()))));
   target.connections.splice(index<0?target.connections.length:index,0,connection);try{port.apply('Edit world connection',validateWorldCompositions(candidate));}catch(e){const reason=e instanceof Error?e.message:String(e);if(connection.kind==='walk'&&(reason.includes('anchors do not meet')||reason.includes('walk seam')))throw Error('A walk connection must join chunk edges at the same height. Restore matching edge anchors with zero offsets. To move them without changing the crossing, Cancel and Shift-drag the connected chunks together.\n\n'+reason);if(reason.includes('anchors do not meet'))throw Error('The From and To anchors do not meet. Enable Align To member with From endpoint, or adjust the endpoint offsets until they coincide.\n\n'+reason);throw e;}port.changed();};
 }});
}
export function renderWorldMemberInspector(host:HTMLElement,port:WorldWorkspaceControls,address:WorldMemberAddress){
 const source=workspaceSource(port.documents());let location:ReturnType<typeof worldMemberAt>;try{location=worldMemberAt(source,address);}catch{host.append(element('p','muted','This member is no longer mounted. Undo to restore it.'));return;}
 const {definition,member,group}=location,form=new TypedForm(e=>{error.textContent=e instanceof Error?e.message:String(e);}),error=element('p','error');error.setAttribute('role','alert');
 const linked=linkedWorldMembers(definition,member.id),connections=definition.connections.filter(c=>c.a.member===member.id||c.b.member===member.id);
 host.append(element('h2','',member.group?'Group · '+source.groups[member.group].name:'Chunk · '+member.chunk),element('p','muted',member.id),error);
 if(group)host.append(element('p','muted','Editing the shared group '+group+'. All compositions using it receive this change.'));
 let moveLinked=false;form.check(host,'Move connected members together',false,value=>moveLinked=value);
 if(linked.length>1)host.append(element('p','muted','Connected placement: '+linked.join(', ')+'. Moving only this member must keep its connection endpoints aligned.'));
 const move=(at:WorldPosition)=>{port.apply('Move world member',moveWorldMember(source,address,at,moveLinked));port.changed();};
 form.decimal(host,'Member X',member.placement.x,x=>move({...member.placement,x}),-10000000,10000000);
 form.decimal(host,'Member Y',member.placement.h,h=>move({...member.placement,h}),-10000000,10000000);
 renderSettingsAuthoring(form,host,member.rendering,value=>{if(value)member.rendering=value;else delete member.rendering;port.apply('Edit member rendering',source);port.changed();},member.chunk?renderPolicy(pendingRegistry(validationSnapshot(port.documents()))[member.chunk],port.documents().find(d=>d.id==='city-source')!.value as CitySource,source,undefined,address.composition):resolveRenderSettings([{source:{kind:'composition',id:address.composition},settings:source.compositions[address.composition].rendering},{source:{kind:'member',composition:address.composition,member:address.member,child:address.child},settings:member.rendering}]),'Member rendering',port.openRenderingSource);
 if(member.chunk)host.append(button('Open chunk source',()=>port.openChunk(member.chunk!)));
 if(member.group){
  const groupSource=source.groups[member.group];host.append(element('h3','','Shared group · '+member.group));
  renderSettingsAuthoring(form,host,groupSource.rendering,value=>{if(value)groupSource.rendering=value;else delete groupSource.rendering;port.apply('Edit group rendering',source);port.changed();},undefined,'Shared group rendering');
  form.text(host,'Group name',groupSource.name,name=>{groupSource.name=name;port.apply('Rename group',source);port.changed();});
  host.append(element('p','muted','This definition is reused wherever the group is mounted.'));
  for(const child of groupSource.members)host.append(button(child.chunk!,()=>port.select({...address,child:child.id})));
  host.append(button('＋ Mount chunk in group',()=>openMountPicker(port,false,address)));
  host.append(element('h3','','Group endpoints'));for(const name of Object.keys(groupSource.exports)){
   form.button(host,'Endpoint · '+name,()=>editGroupExport(port,address,name));form.button(host,'Remove endpoint '+name,()=>{delete groupSource.exports[name];port.apply('Remove group endpoint',source);port.changed();});
  }
  form.button(host,'＋ Add group endpoint',()=>editGroupExport(port,address));
 }

 host.append(element('h3','','Connections'));
 if(!connections.length)host.append(element('p','muted','No connections on this member.'));
 for(const c of connections){host.append(button(c.kind+' · '+c.a.member+' → '+c.b.member,()=>editMemberConnection(port,address,c)));form.button(host,'Disconnect '+c.id,()=>{definition.connections=definition.connections.filter(row=>row.id!==c.id);port.apply('Disconnect world members',source);port.changed();});}
 if(definition.members.length>1)form.button(host,'＋ Connect member',()=>editMemberConnection(port,address));
 form.button(host,'Unmount '+(member.group?'group':'chunk'),()=>inspect(port,'Unmount '+member.id,(body,controls)=>{
  body.append(element('p','','The source remains available. This removes only its membership'+(connections.length?' and these connections: '+connections.map(c=>c.id).join(', '):'')+'. Story commands or checkpoints referring to this membership must still be valid.'));
  let disconnect=!connections.length;if(connections.length)controls.check(body,'Also disconnect these connections',false,v=>disconnect=v);
  return()=>port.apply('Unmount world member',unmountWorldMember(source,address,disconnect));
 }));
}

type ConnectionGuide={address:WorldMemberAddress;connection:WorldConnection;from:{chunk:string;x:number;h:number};to:{chunk:string;x:number;h:number}};
const guideCache=new WeakMap<readonly EditorDocument[],Map<string,ConnectionGuide[]>>();
/** Guides use compiled endpoint positions and the native preview's captured projection. */
export function renderWorldConnections(host:HTMLElement,port:WorldWorkspaceControls,preview:PreviewResult,offset:{x:number;y:number;scale:number}){
 if(!port.composition()||!preview.projectChunk)return;
 const documents=port.documents();let cache=guideCache.get(documents);if(!cache){cache=new Map();guideCache.set(documents,cache);}let guides=cache.get(port.composition());
 if(!guides){const source=workspaceSource(documents),definition=source.compositions[port.composition()],context=worldCompositionContext(pendingRegistry(validationSnapshot(documents))),compiled=compileWorldComposition(source,port.composition(),context);guides=[];
  const collect=(def:typeof definition,address:WorldMemberAddress,prefix='')=>{for(const connection of def.connections){
   const endpoint=(end:WorldEndpoint)=>{const at=worldEndpointPosition(source,def,end,context),chunk=compiled.chunks.find(c=>c.path===prefix+at.path)!,parent=prefix?definition.members.find(m=>prefix===m.id+'/')!.placement:{x:0,h:0};return{chunk:at.chunk,x:at.anchor.x+parent.x-chunk.x,h:at.anchor.h+parent.h-chunk.h};};
   guides!.push({address,connection,from:endpoint(connection.a),to:endpoint(connection.b)});
  }};
  collect(definition,{composition:port.composition(),member:definition.members[0]?.id??''});for(const m of definition.members)if(m.group&&source.groups[m.group].members.length)collect(source.groups[m.group],{composition:port.composition(),member:m.id,child:source.groups[m.group].members[0].id},m.id+'/');cache.set(port.composition(),guides);
 }
 for(const guide of guides){const a=preview.projectChunk(guide.from.chunk,guide.from.x,guide.from.h),b=preview.projectChunk(guide.to.chunk,guide.to.x,guide.to.h);if(!a||!b)continue;
  const x=offset.x+(a.x+b.x)*offset.scale/2,y=offset.y+(a.y+b.y)*offset.scale/2,pick=button(guide.connection.kind+' · '+guide.connection.id,()=>editMemberConnection(port,guide.address,guide.connection),'Edit traversal and endpoints');pick.className='world-connection-guide';pick.setAttribute('aria-pressed',String(port.activeInspector?.()==='world-connection:'+guide.address.member+':'+(guide.address.child?'group:':'')+guide.connection.id));Object.assign(pick.style,{position:'absolute',left:x+'px',top:y+'px',pointerEvents:'auto'});host.append(pick);
 }
}
