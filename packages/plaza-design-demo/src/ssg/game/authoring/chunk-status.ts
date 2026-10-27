import type {ChunkStatus} from '../runtime/chunk-status';
import {element,button} from './controls';
export function chunkStatusBadge(row:ChunkStatus,pick:()=>void){
 const badge=button(row.statuses.join(' + '),pick,row.reasons.join(' '));
 badge.addEventListener('click',event=>{event.stopPropagation();event.preventDefault();});
 badge.className='chunk-status-badge';badge.dataset.mode=row.mode;
 badge.setAttribute('aria-label','Inspect chunk status: '+row.label);return badge;
}
/** Read-only details in the existing inspector, not another source document. */
export function renderChunkStatus(host:HTMLElement,row:ChunkStatus,close:()=>void,open?:()=>void){
 host.replaceChildren(element('h2','',row.label),element('p','muted',row.id),element('h3','','Chunk status'),element('p','chunk-status-value',row.statuses.join(' + ')));
 if(row.mode==='runtime')host.append(element('p','',`Scenery: ${row.sceneryLoaded?'loaded':'unloaded'} · Model: ${row.modelLoaded?'loaded':'unloaded'}`));
 const reasons=element('ul');for(const reason of row.reasons)reasons.append(element('li','',reason));host.append(reasons);
 if(row.mode==='runtime'){
  host.append(element('h3','','Mobile entities from this chunk'));
  if(!row.entities.length)host.append(element('p','muted','None currently retained.'));
  for(const entity of row.entities)host.append(element('p','',`${entity.kind}: ${entity.id} · currently in ${entity.zone}`));
 }
 const actions=element('div','row');if(open)actions.append(button('Open source chunk',open));actions.append(button('Close chunk status',close));host.append(actions);
}
/** Used inside the existing outline while native Play owns the viewport. */
export function renderRuntimeChunks(host:HTMLElement,rows:readonly ChunkStatus[],pick:(id:string)=>void){
 const open=new Set([...host.querySelectorAll<HTMLDetailsElement>('details[open]')].map(row=>row.dataset.chunk));
 host.replaceChildren(element('h3','','Live chunks'),element('p','muted','Actual game residency. The editing camera has no effect.'));
 for(const row of rows){
  const group=element('details','runtime-chunk'),summary=element('summary','',row.label+' ');group.dataset.chunk=row.id;group.open=open.has(row.id);
  summary.append(chunkStatusBadge(row,()=>pick(row.id)));group.append(summary);
  const reasons=element('ul');for(const reason of row.reasons)reasons.append(element('li','',reason));
  for(const entity of row.entities)reasons.append(element('li','',`${entity.kind}: ${entity.id} → ${entity.zone}`));group.append(reasons);host.append(group);
 }
}
