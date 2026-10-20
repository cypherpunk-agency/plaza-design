import {registryLabels} from '../engine/gameplay/rewards';
import {pendingNetworkContext} from './pending-network';
import {sceneRuleContract} from '../engine/scene-rule-contract';
import {pendingRegistry} from './pending-registry';
import {nativeGameplayScenes,nativeGameplayScene} from './native-gameplay-scenes';
import {gameplayScenes,gameplayScene} from './gameplay-scenes';
import {mountGameplayAuthoring} from './gameplay-authoring';
import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './app';
/** Every scene edits its shared source and tests it in the real native Play session. */
export function mountRegisteredGameplay(host:HTMLElement,context:WorkbenchContext,selection:{scene?:string;fixed?:boolean}={},publicEditor=false):WorkbenchHandle {
 const api=context.authoring!,form=new TypedForm(e=>{error.textContent=String(e);}),error=document.createElement('p');error.setAttribute('role','alert');
 let current:WorkbenchHandle|undefined;
 function render(){current?.();host.replaceChildren(error);const scene=nativeGameplayScene(selection.scene??'')??gameplayScene(selection.scene??'harborShift',context.documents);
  if(!selection.fixed)form.select(host,'Gameplay scene',[...gameplayScenes,...nativeGameplayScenes].map(s=>s.id),scene.id,id=>{selection.scene=id;render();});
  const panel=document.createElement('section');host.append(panel);const id=scene.gameplayId;
  const selected=nativeGameplayScene(scene.id)??scene;let pending:ReturnType<typeof pendingRegistry>[string]|undefined;const options={nativeDataSource:()=>{pending=context.documents.some(d=>d.id==='authored-scenes')?pendingRegistry(new Map(context.documents.map(d=>[d.id,api.get(d.id).value])))[scene.id]:undefined;return pending?.data??(selected&&'data'in selected?selected.data:undefined);},nativeDerivedSource:()=>pending?Object.keys(sceneRuleContract(pending).derived??{}):[],objectiveIdsSource:()=>pending?.objectives?.map(o=>o.id)??[],keyringIdsSource:()=>[...pendingNetworkContext(new Map(context.documents.map(d=>[d.id,api.get(d.id).value]))).keyring.keys()],registryLabelsSource:()=>registryLabels(pendingNetworkContext(new Map(context.documents.map(d=>[d.id,api.get(d.id).value]))).net),nativeData:selected&&'data'in selected?selected.data:undefined,document:()=>api.get(id).value,validate:scene.validateGameplay,onEdit:(value:unknown,label:string)=>api.edit(id,label,value),undo:api.undo,redo:api.redo,save:api.save,reload:api.reload,dirty:()=>api.dirty(id),saveLabel:publicEditor?'Download edits':'Save gameplay to source'};
  {const note=document.createElement('p');note.textContent='Test these pending commands through the scene in Play. Speaker dialogue and readables are in Scene logic.';panel.append(note);const editor=mountGameplayAuthoring(panel,options);current=(()=>editor.dispose()) as WorkbenchHandle;current.refresh=editor.refresh;}
 }
 render();const dispose=(()=>{current?.();host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=()=>current?.refresh?.();return dispose;
}
