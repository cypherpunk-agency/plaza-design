import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './app';
import {SEAM_KINDS,validateZoneGraph,worldProblems,type Seam,type SeamEnd,type SeamKind,type ZoneGraphSource} from '../world/zone-graph';
import {zoneInfo,zonePieces} from './zone-graph-context';
import {SCENES} from '../scenes';
/**
 * World › Zones: typed controls for world/zone-graph.json (docs/design/SEAMLESS-WORLD.md §6.1). Each edit is one
 * ComposerModel history step of the 'zone-graph' document; the shape is checked on every edit and the seams against
 * the zones (worldProblems) are listed here and checked again on protected Save.
 */
export function mountZoneGraphAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle {
 const api=context.authoring!;let disposed=false,seam='';
 const error=document.createElement('p');error.setAttribute('role','alert');const form=new TypedForm(e=>{error.textContent=e instanceof Error?e.message:String(e);});
 const read=()=>validateZoneGraph(api.get('zone-graph').value);
 // the zones' pending widths and compositions (the context's list is the one at mount; reread the live documents)
 const pending=()=>new Map(context.documents.filter(d=>d.id==='authored-scenes'||d.id in SCENES).map(d=>[d.id,api.get(d.id).value]));
 function edit(label:string,change:(d:ZoneGraphSource)=>void){const d=read();change(d);api.edit('zone-graph',label,validateZoneGraph(d));error.textContent='';}
 function render(){
  if(disposed)return;const d=read(),values=pending(),zones=zoneInfo(values),pieces=zonePieces(values),ids=Object.keys(zones).sort();
  host.replaceChildren(error);
  if(!d.seams.some(s=>s.id===seam))seam=d.seams[0]?.id??'';
  const intro=document.createElement('p');intro.textContent='Seams join two zones (scenes) with no cut: b sits at (dx, dh) in a’s units. A walk seam puts b at a’s edge; stairs and doors name the level piece on both sides.';host.append(intro);
  const problems=worldProblems(d,zones,pieces),checks=document.createElement('ul');checks.setAttribute('role','status');checks.setAttribute('aria-label','Zone graph problems');
  for(const p of problems.length?problems:['No problems: every seam meets its zones.']){const li=document.createElement('li');li.textContent=p;checks.append(li);}
  host.append(checks);
  form.select(host,'Seam',d.seams.map(s=>s.id),seam,id=>{seam=id;render();});
  form.button(host,'Add seam',()=>{
   let n=1;while(d.seams.some(s=>s.id==='seam-'+n))n++;const id='seam-'+n,a=context.scene&&zones[context.scene]?context.scene:ids[0],b=ids.find(z=>z!==a)!;
   edit('Add seam',d=>{d.seams.push({id,kind:'walk',a:{zone:a},b:{zone:b},dx:zones[a].width,dh:0});});seam=id;render();
  },ids.length<2||d.seams.length>=256);
  const s=d.seams.find(s=>s.id===seam);
  if(s){
   const mutate=(label:string,fn:(s:Seam)=>void)=>edit(label,d=>fn(d.seams.find(x=>x.id===seam)!));
   form.text(host,'Seam id',s.id,id=>{mutate('Rename seam',s=>{s.id=id.trim();});seam=id.trim();render();});
   form.select(host,'Seam kind',SEAM_KINDS,s.kind,kind=>mutate('Change seam kind',s=>{s.kind=kind as SeamKind;}));
   for(const side of ['a','b'] as const){
    const e:SeamEnd=s[side],own=pieces[e.zone]??[],choices=['',...own,...(e.piece&&!own.includes(e.piece)?[e.piece]:[])];
    form.select(host,`Zone ${side}`,ids.includes(e.zone)?ids:[...ids,e.zone],e.zone,zone=>mutate(`Change seam zone ${side}`,s=>{s[side]={zone};}));
    form.select(host,`Piece ${side}`,choices,e.piece??'',piece=>mutate(`Change seam piece ${side}`,s=>{s[side]=piece?{zone:s[side].zone,piece}:{zone:s[side].zone};}));
    form.button(host,`Open zone ${side}`,()=>context.openScene(e.zone));
   }
   form.decimal(host,'Offset dx',s.dx,dx=>mutate('Edit seam dx',s=>{s.dx=dx;}),-100000,100000);
   form.decimal(host,'Offset dh',s.dh,dh=>mutate('Edit seam dh',s=>{s.dh=dh;}),-100000,100000);
   // a walk seam's b starts at a's right edge (dx ≥ 0) or ends at a's left edge
   const aligned=s.dx>=0?zones[s.a.zone]?.width:zones[s.b.zone]&&-zones[s.b.zone].width;
   form.button(host,'Align',()=>mutate('Align walk seam',s=>{s.dx=aligned!;}),s.kind!=='walk'||aligned===undefined||aligned===s.dx);
   const mine=problems.filter(p=>p.startsWith(s.id+':'));
   if(mine.length){const p=document.createElement('p');p.textContent='This seam: '+mine.map(p=>p.slice(s.id.length+2)).join('; ');host.append(p);}
   form.button(host,'Remove seam',()=>{edit('Remove seam',d=>{d.seams=d.seams.filter(x=>x.id!==seam);});render();});
  }
 }
 render();const dispose=(()=>{disposed=true;host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=render;return dispose;
}
