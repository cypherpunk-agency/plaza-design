import {liveSources} from './validation-snapshot';
import {TypedForm} from './typed-form';
import {StoryFields} from './story-fields';
import {pendingRegistry} from './pending-registry';
import {validateOpeningSource} from '../story/opening-source';
import {mountPlayProfileAuthoring} from './play-profile-authoring';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';

const GROUPS={
 Launch:{document:'opening-story',fields:[]},
 Player:{document:'play-profiles',fields:[]},
 'Guidance & time':{document:'opening-story',fields:[['Idle guidance','ATTENTION'],['Clock release','CLOCK'],['Goal hints','GOAL_HINTS']]},
 Contacts:{document:'contacts',fields:[['Inbox presentation','INBOX'],['Contacts and messages','CONTACTS']]},
 Ending:{document:'end-card',fields:[['Ending card','END']]},
}as const;
/** Game defaults and presentation settings. Story commands/rules live in the logic library;
 * chunk behavior belongs to the selected chunk. Every control edits the original source. */
export function mountGameSettingsAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle{
 const api=context.authoring!,error=document.createElement('p'),body=document.createElement('div');error.setAttribute('role','alert');host.replaceChildren(error,body);
 const form=new TypedForm(e=>{error.textContent=String(e);}),profileHost=document.createElement('section');let section:keyof typeof GROUPS='Launch',child:WorkbenchHandle|undefined,profileSection='',disposed=false;
 function render(){
  if(disposed)return;if(profileSection!==section){child?.();child=undefined;profileSection=section;}body.replaceChildren();
  form.select(body,'Settings section',Object.keys(GROUPS),section,value=>{section=value as typeof section;error.textContent='';render();});
  const note=document.createElement('p');note.textContent='Default game configuration. Test overrides and storage isolation live in Developer tools. Chunk-specific story behavior is edited on the chunk; global commands and rules are in Library → Story logic.';body.append(note);
  if(section==='Launch'||section==='Player'||section==='Guidance & time'){body.append(profileHost);if(child)child.refresh?.();else child=mountPlayProfileAuthoring(profileHost,context,section);}
  const documents=liveSources(context),story=validateOpeningSource(api.get('opening-story').value),registry=pendingRegistry(documents);
  const vocab=()=>({scenes:Object.keys(registry),phases:Object.keys(story.PHASES),flags:story.GAMEPLAY.flags,cards:Object.keys(story.CARDS),milestones:Object.keys(story.WORKFLOWS),registry});
  const group=GROUPS[section],doc={value:()=>api.get(group.document).value,edit:(label:string,change:(value:any)=>void)=>{const value=structuredClone(api.get(group.document).value);change(value);api.edit(group.document,label,value);error.textContent='';render();}},fields=new StoryFields(form,doc,vocab,{refresh:render});
  for(const [title,key]of group.fields)fields.walk(form.section(body,title),(api.get(group.document).value as any)[key],[key]);
 }
 render();const dispose=(()=>{disposed=true;child?.();child=undefined;host.replaceChildren();})as WorkbenchHandle;dispose.refresh=render;return dispose;
}
