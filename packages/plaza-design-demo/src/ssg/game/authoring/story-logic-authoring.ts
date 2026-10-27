import {storyObservationTypes} from '../story/observations';
import {renameSharedFlagDocuments} from './world-flag-references';
import {mountGameplayAuthoring} from './gameplay-authoring';
import {validateGameplay} from '../engine/gameplay/validation';
import {validatePendingNetwork} from './pending-network';
import {registryLabels} from '../engine/gameplay/rewards';
import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
import {validateOpeningSource} from '../story/opening-source';
import {pendingRegistry} from './pending-registry';
import type {GameplayDefinition} from '../engine/gameplay/types';
import {StoryFields,type StoryVocab} from './story-fields';

type DocId='opening-story';
/** Global story rules; chunk phase behavior is edited on the chunk, game defaults in Game settings. */
const GROUPS:Record<string,{doc:DocId;keys:string[]}>={
 Workflows:{doc:'opening-story',keys:['WORKFLOWS','GAMEPLAY']},
 Phases:{doc:'opening-story',keys:['PHASE_RULES','PHASES','OPENING','OPENING_LEVELS']},
 Cards:{doc:'opening-story',keys:['CARDS']},
 Triggers:{doc:'opening-story',keys:['TRIGGERS']},
};
/** Story inputs use the normal typed source/history/Save path, never executable editor code. */
export function mountStoryLogicAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle{
 const api=context.authoring!,error=document.createElement('p'),body=document.createElement('div');error.setAttribute('role','alert');host.replaceChildren(error,body);
 let disposed=false,category='Workflows';
 let workflowEditor:ReturnType<typeof mountGameplayAuthoring>|undefined,refreshMilestones:(()=>void)|undefined;
 const form=new TypedForm(e=>{error.textContent=String(e);});
 let registry:ReturnType<typeof pendingRegistry>={};
 const documents=()=>new Map(context.documents.map(x=>[x.id,api.get(x.id).value]));
 const story=()=>validateOpeningSource(api.get('opening-story').value);
 const vocab=():StoryVocab=>{const s=story();return{scenes:Object.keys(registry),phases:Object.keys(s.PHASES),flags:[...s.GAMEPLAY.flags],cards:Object.keys(s.CARDS),milestones:Object.keys(s.WORKFLOWS),registry};};
 /** A handle on one source document: its value, and an edit that validates, records history and re-renders. */
 const handle=(id:string)=>({value:()=>structuredClone(api.get(id).value) as any,edit:(label:string,change:(d:any)=>void)=>{const d=structuredClone(api.get(id).value) as any;change(d);api.edit(id,label,d);render();}});
 /** Controls that need more than the one document. */
 const special=(docId:DocId)=>(parent:HTMLElement,_value:any,path:(string|number)[])=>{
  if(docId!=='opening-story')return false;
  if(path[0]==='TRIGGERS'&&path.length===1){
   const d=story(),h=handle('opening-story'),fields=new StoryFields(form,h,vocab);
   d.TRIGGERS.forEach((row,i)=>{
    const title='Story trigger '+row.id,box=form.section(parent,title);
    form.text(box,title+' ID',row.id,v=>h.edit('Rename story trigger',x=>{x.TRIGGERS[i].id=v;}));
    form.condition(box,title+' condition',row.when,v=>h.edit('Edit story trigger condition',x=>{x.TRIGGERS[i].when=v;}),d.GAMEPLAY,false,1);
    if(row.start){
     form.text(box,title+' timestamp',row.start,v=>h.edit('Edit story trigger timestamp',x=>{x.TRIGGERS[i].start=v;}));
     form.condition(box,title+' watch',row.watch,v=>h.edit('Edit story trigger watch',x=>{x.TRIGGERS[i].watch=v;}),d.GAMEPLAY,false,1);
     form.button(box,'Remove '+title+' timestamp',()=>h.edit('Remove story trigger timestamp',x=>{delete x.TRIGGERS[i].start;delete x.TRIGGERS[i].watch;}));
    }else form.button(box,'Add '+title+' timestamp',()=>h.edit('Add story trigger timestamp',x=>{x.TRIGGERS[i].start=row.id+'.at';x.TRIGGERS[i].watch=structuredClone(row.when);}));
    fields.walk(box,row.do,['TRIGGERS',i,'do']);
    form.button(box,'Remove '+title,()=>h.edit('Remove story trigger',x=>{x.TRIGGERS.splice(i,1);}));
   });
   form.button(parent,'Add story trigger',()=>h.edit('Add story trigger',x=>{let n=1;while(x.TRIGGERS.some((t:{id:string})=>t.id==='trigger-'+n))n++;x.TRIGGERS.push({id:'trigger-'+n,when:{compare:{left:{literal:0},op:'eq',right:{literal:1}}},do:[]});}),d.TRIGGERS.length>=16);
   return true;
  }
  if(path[0]==='PHASE_RULES'&&path.length===1){
   const d=story(),doc:GameplayDefinition={version:1,flags:[...d.GAMEPLAY.flags],items:[],events:[],commands:{},reactions:[],conversations:{}},phases=Object.keys(d.PHASES),h=handle('opening-story');
   d.PHASE_RULES.forEach((row,i)=>{
    const fallback=row.when===undefined,box=form.section(parent,'Phase rule '+(i+1)+(fallback?' fallback':''));
    form.select(box,'Phase rule '+(i+1)+' phase',phases,row.phase,v=>h.edit('Edit opening phase rule',x=>{x.PHASE_RULES[i].phase=v;}));
    if(!fallback){
     form.condition(box,'Phase rule '+(i+1)+' condition',row.when,v=>h.edit('Edit opening phase rule',x=>{x.PHASE_RULES[i].when=v;}),doc,true,1);
     const move=(offset:number)=>h.edit('Move opening phase rule',x=>{const[r]=x.PHASE_RULES.splice(i,1);x.PHASE_RULES.splice(i+offset,0,r);});
     form.button(box,'Move phase rule '+(i+1)+' up',()=>move(-1),i===0);
     form.button(box,'Move phase rule '+(i+1)+' down',()=>move(1),i>=d.PHASE_RULES.length-2);
     form.button(box,'Remove phase rule '+(i+1),()=>h.edit('Remove opening phase rule',x=>{x.PHASE_RULES.splice(i,1);}));
    }
   });
   form.button(parent,'Add opening phase rule',()=>h.edit('Add opening phase rule',x=>{x.PHASE_RULES.splice(x.PHASE_RULES.length-1,0,{when:{flag:x.OPENING.home},phase:phases[0]});}),d.PHASE_RULES.length>=32);
   return true;
  }
  if(path[0]==='OPENING'&&path.length===1){
   for(const[role,flag]of Object.entries(story().OPENING))form.text(parent,'Opening role '+role+' flag',flag,next=>{const changes=renameSharedFlagDocuments(documents(),flag,next);if(api.editDocuments)api.editDocuments(changes,'Rename opening role '+role);else if(changes.length===1)api.edit(changes[0].id,'Rename opening role '+role,changes[0].value);else throw Error('Grouped source editing is unavailable');render();});
   return true;
  }
  return false;
 };
 function render(){
  if(disposed)return;
  error.textContent='';
  if(category==='Workflows'&&workflowEditor){refreshMilestones?.();workflowEditor.refresh();return;}
  workflowEditor?.dispose();workflowEditor=undefined;body.replaceChildren();
  registry=pendingRegistry(documents());

  form.select(body,'Story logic group',Object.keys(GROUPS),category,v=>{category=v;render();});
  const group=GROUPS[category];
  if(group.doc==='opening-story'&&category==='Workflows'){
   const milestones=form.section(body,'Cinematic milestones');
   refreshMilestones=()=>{milestones.replaceChildren();const current=story(),commands=Object.entries(current.GAMEPLAY.commands).filter(([,c])=>c.sources.length===1&&c.sources[0]==='system').map(([id])=>id),h=handle('opening-story');for(const[role,command]of Object.entries(current.WORKFLOWS)){form.select(milestones,'Opening milestone '+role,commands,command,v=>h.edit('Edit opening WORKFLOWS/'+role,d=>{d.WORKFLOWS[role]=v;}));if(role!=='home')form.button(milestones,'Remove opening milestone '+role,()=>h.edit('Remove opening milestone',d=>{delete d.WORKFLOWS[role];}));}
  // a milestone is a name cues and the loop use for a system command; a second timeline adds its own
  const added={name:'',command:commands[0]??''};form.text(milestones,'New opening milestone name',added.name,v=>{added.name=v;});form.select(milestones,'New opening milestone command',commands,added.command,v=>{added.command=v;});form.button(milestones,'Add opening milestone',()=>h.edit('Add opening milestone',d=>{if(d.WORKFLOWS[added.name])throw new Error('A milestone with that name exists');d.WORKFLOWS[added.name]=added.command;}),!commands.length);};refreshMilestones();
   const hostEl=document.createElement('div');body.append(hostEl);
   workflowEditor=mountGameplayAuthoring(hostEl,{document:()=>story().GAMEPLAY,validate:validateGameplay,onEdit:(value,label)=>handle('opening-story').edit(label,d=>{d.GAMEPLAY=value;}),undo:()=>api.undo(),redo:()=>api.redo(),save:()=>api.save(),reload:()=>api.reload(),dirty:()=>api.dirty('opening-story'),saveLabel:'Save story',nativeReadTypesSource:()=>storyObservationTypes(story(),Object.values(registry).map(s=>s.phases)),keyringIdsSource:()=>[...validatePendingNetwork(documents(),registry).keyring.keys()],registryLabelsSource:()=>registryLabels(validatePendingNetwork(documents(),registry).net)});
   return;
  }
  const docId=group.doc,fields=new StoryFields(form,handle(docId),vocab,{special:special(docId),refresh:render});
  validateOpeningSource(api.get(docId).value);
  for(const key of group.keys){const section=form.section(body,key);fields.walk(section,(api.get(docId).value as any)[key],[key]);}
 }
 render();const dispose=(()=>{disposed=true;workflowEditor?.dispose();workflowEditor=undefined;host.replaceChildren();})as WorkbenchHandle;dispose.refresh=render;return dispose;
}
