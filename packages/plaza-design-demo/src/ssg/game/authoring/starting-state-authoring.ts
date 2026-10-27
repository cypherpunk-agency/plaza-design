import {TypedForm} from './typed-form';
import {renderStartingStateControls} from './starting-state-controls';
import type {PlayFixtures} from '../world/checkpoints';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
/** Edit the selected world checkpoint through the same form and document used by private Play. */
export function mountStartingStateAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle{
 const api=context.authoring!,error=document.createElement('p');error.setAttribute('role','alert');let disposed=false;
 const form=new TypedForm(e=>{error.textContent=String(e);});
 function render(){if(disposed)return;host.replaceChildren(error);const source=api.get('play-fixtures').value as PlayFixtures,row=source.fixtures.find(f=>f.id===context.checkpoint);
  if(!row){const note=document.createElement('p');note.textContent='Choose a checkpoint in the header to edit its starting state.';host.append(note);return;}
  const title=document.createElement('h3');title.textContent=row.name;host.append(title);
  renderStartingStateControls(host,context,row,form,(label,change)=>{const next=structuredClone(api.get('play-fixtures').value)as PlayFixtures,f=next.fixtures.find(f=>f.id===row.id)!;change(f);api.edit('play-fixtures',label,next);error.textContent='';if(f.scene!==row.scene)context.openCheckpoint?.(f.id);else render();},e=>{error.textContent=String(e);});
 }
 render();const dispose=(()=>{disposed=true;host.replaceChildren();})as WorkbenchHandle;dispose.refresh=render;return dispose;
}
