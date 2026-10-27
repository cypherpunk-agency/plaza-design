import {validationSnapshot} from './validation-snapshot';
import {authoredSequenceSources} from '../runtime/sequence-commands';
import {registryLabels} from '../engine/gameplay/rewards';
import {pendingNetworkContext} from './pending-network';
import {sceneRuleContract} from '../engine/scene-rule-contract';
import {pendingRegistry} from './pending-registry';
import {nativeGameplayScenes,nativeGameplayScene} from './native-gameplay-scenes';
import {gameplayScenes,gameplayScene} from './gameplay-scenes';
import {mountGameplayAuthoring} from './gameplay-authoring';
import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
/** Every scene edits its shared source and tests it in the real native Play session. */
export function mountRegisteredGameplay(host:HTMLElement,context:WorkbenchContext,selection:{scene?:string;fixed?:boolean}={},publicEditor=false):WorkbenchHandle {
 const form=new TypedForm(e=>{error.textContent=String(e);}),error=document.createElement('p');error.setAttribute('role','alert');
 let current:WorkbenchHandle|undefined;
 function render(){current?.();host.replaceChildren(error);const scene=nativeGameplayScene(selection.scene??'')??gameplayScene(selection.scene??'downtown',context.documents);
  if(!selection.fixed)form.select(host,'Gameplay scene',[...gameplayScenes,...nativeGameplayScenes].map(s=>s.id),scene.id,id=>{selection.scene=id;render();});
  const panel=document.createElement('section');host.append(panel);
  const options=registeredGameplayOptions(context,scene,publicEditor);
  {const note=document.createElement('p');note.textContent='Test these pending commands through the scene in Play. Speaker dialogue and readables are in Scene logic.';panel.append(note);const editor=mountGameplayAuthoring(panel,options);current=(()=>editor.dispose()) as WorkbenchHandle;current.refresh=editor.refresh;}
 }
 render();const dispose=(()=>{current?.();host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=()=>current?.refresh?.();return dispose;
}

/** The registered source context is shared by scene commands and the conversation library. */
export function registeredGameplayOptions(context:WorkbenchContext,scene:ReturnType<typeof gameplayScene>|NonNullable<ReturnType<typeof nativeGameplayScene>>,publicEditor=false):import('./gameplay-authoring').GameplayAuthoring{
 const api=context.authoring!,id=scene.gameplayId,selected=nativeGameplayScene(scene.id)??scene;let pending:ReturnType<typeof pendingRegistry>[string]|undefined;
 return {sequenceIdsSource:()=>{const docs=validationSnapshot(context.documents);return ['intro','act2',...Object.keys(authoredSequenceSources(pendingRegistry(docs)))];},sharedStateSource:()=>context.documents.some(d=>d.id==='state-owners')?api.get('state-owners').value:undefined,nativeDataSource:()=>{pending=context.documents.some(d=>d.id==='authored-scenes')?pendingRegistry(validationSnapshot(context.documents))[scene.id]:undefined;return pending?.data??(selected&&'data'in selected?selected.data:undefined);},nativeDerivedSource:()=>pending?Object.keys(sceneRuleContract(pending).derived??{}):[],nativeReadTypesSource:()=>pending?sceneRuleContract(pending).derivedTypes??{}:{},objectiveIdsSource:()=>pending?.objectives?.map(o=>o.id)??[],keyringIdsSource:()=>[...pendingNetworkContext(validationSnapshot(context.documents)).keyring.keys()],registryLabelsSource:()=>registryLabels(pendingNetworkContext(validationSnapshot(context.documents)).net),nativeData:selected&&'data'in selected?selected.data:undefined,document:()=>api.get(id).value,validate:scene.validateGameplay,onEdit:(value:unknown,label:string)=>api.edit(id,label,value),undo:api.undo,redo:api.redo,save:api.save,reload:api.reload,dirty:()=>api.dirty(id),saveLabel:publicEditor?'Download edits':'Save gameplay to source'};
}
