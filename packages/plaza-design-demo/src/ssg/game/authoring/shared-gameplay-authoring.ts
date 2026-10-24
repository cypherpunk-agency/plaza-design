import {mountGameplayAuthoring} from './gameplay-authoring';
import type {GameplayDefinition} from '../engine/gameplay/types';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
/** Shared graph libraries use the same typed command/conversation editor as scene gameplay. */
export function mountSharedGameplay(host:HTMLElement,context:WorkbenchContext,id:string,validate:(value:unknown)=>GameplayDefinition,publicEditor=false):WorkbenchHandle{
 const api=context.authoring!;
 const editor=mountGameplayAuthoring(host,{document:()=>api.get(id).value,validate,onEdit:(value,label)=>api.edit(id,label,value),undo:()=>api.undo(),redo:()=>api.redo(),save:()=>api.save(),reload:()=>api.reload(),dirty:()=>api.dirty(id),saveLabel:publicEditor?'Download edits':'Save gameplay to source'});
 const dispose=(()=>editor.dispose()) as WorkbenchHandle;dispose.refresh=()=>editor.refresh();return dispose;
}
