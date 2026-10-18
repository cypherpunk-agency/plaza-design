import {nativeGameplayScenes,nativeGameplayScene} from './native-gameplay-scenes';
import {gameplayScenes,gameplayScene} from './gameplay-scenes';
import {mountGameplayWorkbench} from './gameplay-workbench';
import {mountGameplayAuthoring} from './gameplay-authoring';
import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './app';
/** The Harbor circuit laboratory remains specific; other scenes use their native Play session. */
export function mountRegisteredGameplay(host:HTMLElement,context:WorkbenchContext,selection:{scene?:string;fixed?:boolean}={},publicEditor=false):WorkbenchHandle {
 const api=context.authoring!,form=new TypedForm(e=>{error.textContent=String(e);}),error=document.createElement('p');error.setAttribute('role','alert');
 let current:WorkbenchHandle|undefined;
 function render(){current?.();host.replaceChildren(error);const scene=nativeGameplayScene(selection.scene??'')??gameplayScene(selection.scene??'harborShift');
  if(!selection.fixed)form.select(host,'Gameplay scene',[...gameplayScenes,...nativeGameplayScenes].map(s=>s.id),scene.id,id=>{selection.scene=id;render();});
  const panel=document.createElement('section');host.append(panel);const id=scene.gameplayId;
  const selected=nativeGameplayScene(scene.id);const options={nativeData:selected&&'data'in selected?selected.data:undefined,document:()=>api.get(id).value,validate:scene.validateGameplay,onEdit:(value:unknown,label:string)=>api.edit(id,label,value),undo:api.undo,redo:api.redo,save:api.save,reload:api.reload,dirty:()=>api.dirty(id),saveLabel:publicEditor?'Download edits':'Save gameplay to source'};
  if(scene.id==='harborShift')current=mountGameplayWorkbench(panel,options);
  else{const note=document.createElement('p');note.textContent='Test these pending commands through the scene in Play. Speaker dialogue and readables are in Scene logic.';panel.append(note);const editor=mountGameplayAuthoring(panel,options);current=(()=>editor.dispose()) as WorkbenchHandle;current.refresh=editor.refresh;}
 }
 render();const dispose=(()=>{current?.();host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=()=>current?.refresh?.();return dispose;
}
