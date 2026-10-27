import {element,button} from './controls';
import type {InspectorTask} from './inspector-task';
import {SEAM_KINDS,validateZoneGraph,type Seam} from '../world/zone-graph';
import {pendingRegistry} from './pending-registry';
import {validationSnapshot} from './validation-snapshot';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
/** External links keep their existing source, edited where their physical chunk is selected. */
export function mountChunkConnections(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle{
 const api=context.authoring!,read=()=>validateZoneGraph(api.get('zone-graph').value),chunk=context.scene!;
 const inspect=(title:string,build:InspectorTask['build'])=>{if(!context.inspect)throw Error('The connection editor requires the workspace inspector.');context.inspect({title,build});};
 function edit(existing?:Seam){
  inspect(existing?'Edit connection · '+existing.id:'Connect chunk',(body,form)=>{
   const source=read(),registry=pendingRegistry(validationSnapshot(context.documents));let draft=existing?structuredClone(existing):undefined;
   const ids=Object.keys(registry),fields=element('div');body.append(element('p','muted','This connection crosses between separately arranged chunks. Offsets place To relative to From. Membership and chunk sources stay unchanged.'),fields);
   if(!draft){const other=ids.find(id=>id!==chunk);if(!other)throw Error('Create another chunk first.');let id='connection',n=2;while(source.seams.some(s=>s.id===id))id='connection-'+n++;draft={id,kind:'walk',a:{zone:chunk},b:{zone:other},dx:registry[chunk].width,dh:0};}
   const connection=draft;
   const render=()=>{fields.replaceChildren();form.text(fields,'Connection ID',connection.id,v=>connection.id=v);form.select(fields,'Traversal',SEAM_KINDS,connection.kind,v=>{connection.kind=v as typeof connection.kind;render();});
    for(const [side,label]of [['a','From'],['b','To']]as const){const end=connection[side];form.select(fields,label+' chunk',ids,end.zone,v=>{connection[side]={zone:v};render();});
     if(connection.kind!=='walk'){const level=registry[end.zone].level,pieces=level?[...level.floors,...level.links,...level.doors,...level.lifts].map(p=>p.id):[];form.select(fields,label+' crossing piece',['',...pieces],end.piece??'',v=>connection[side]={zone:connection[side].zone,...(v?{piece:v}:{})});}
    }
    form.decimal(fields,'Connection X offset',connection.dx,v=>connection.dx=v,-10000000,10000000);form.decimal(fields,'Connection Y offset',connection.dh,v=>connection.dh=v,-10000000,10000000);
    form.button(fields,'Align To at right edge',()=>{connection.dx=registry[connection.a.zone].width;connection.dh=0;render();});form.button(fields,'Align To at left edge',()=>{connection.dx=-registry[connection.b.zone].width;connection.dh=0;render();});
   };render();return()=>{const next=structuredClone(source),index=existing?next.seams.findIndex(s=>s.id===existing.id):-1;if(index<0)next.seams.push(connection);else next.seams[index]=connection;api.edit('zone-graph','Edit chunk connection',validateZoneGraph(next));};
  });
 }
 function render(){host.replaceChildren(element('h3','','Connections beyond this composition'),element('p','muted','These links preserve traversal into other chunk arrangements. Connections within a composition are edited from its member inspector.'));
  const source=read(),connections=source.seams.filter(s=>s.a.zone===chunk||s.b.zone===chunk);
  if(!connections.length)host.append(element('p','muted','No external connections on this chunk.'));
  for(const connection of connections){const row=element('div','row');row.append(button(connection.kind+' · '+connection.a.zone+' → '+connection.b.zone,()=>edit(connection)),button('Disconnect',()=>inspect('Disconnect '+connection.id,body=>{body.append(element('p','','Remove this traversal connection? Both chunk sources remain available.'));return()=>{const next=read();next.seams=next.seams.filter(s=>s.id!==connection.id);api.edit('zone-graph','Disconnect chunks',next);};})));host.append(row);}
  host.append(button('＋ Connect chunk',()=>edit()));
 }
 render();const dispose=(()=>host.replaceChildren())as WorkbenchHandle;dispose.refresh=render;return dispose;
}
