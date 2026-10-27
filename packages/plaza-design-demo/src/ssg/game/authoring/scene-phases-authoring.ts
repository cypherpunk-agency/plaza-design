import type {TypedForm} from './typed-form';
import {StoryFields,type StoryDoc,type StoryVocab} from './story-fields';
import type {SceneDef} from '../scenes/kit';

/**
 * What one scene says and does in each phase of the story (scene.json `phases`, `wash`): the goal line, the clock, the arrival words,
 * who answers and what the exits, barriers, devices and targets do. Edit these on the selected chunk under Story phases.
 * Every edit passes the pending-source validation of the whole set (a name must exist in the scene, a phase in the story).
 */
const FIELDS=['time','goal','intro','ping','ride','arrival','lines','exits','barriers','everyday','targets'] as const;
type Field=typeof FIELDS[number];
const LABEL:Record<Field,string>={time:'Clock time',goal:'Goal',intro:'Arrival words',ping:'Attention ping',ride:'Scripted ride',arrival:'First-visit words',lines:'People and things that answer',exits:'Exits that act differently',barriers:'Barriers that act differently',everyday:'Everyday actions',targets:'Story targets'};
const TABLE:readonly Field[]=['lines','exits','barriers','everyday','targets'];
export interface ScenePhasesView {
  form:TypedForm;parent:HTMLElement;doc:StoryDoc;vocab:()=>StoryVocab;scene:string;phase:string;
  /** Called after an edit that rebuilds the view. */
  refresh():void;
}
const initial=(field:Field,def:SceneDef|undefined):unknown=>{
  switch(field){
    case 'time':return '06:00';
    case 'goal':return 'New goal';
    case 'intro':return {pages:['New arrival.'],speaker:'YOU',height:46};
    case 'ping':{const exit=def?.exits[0],device=[...(def?.data?.devices??[])][0];return exit?{exit:exit.id}:device?{device:device.id}:{door:true};}
    case 'ride':return {mover:'train.car',path:'home'};
    case 'arrival':return [{speaker:'YOU',height:46,pages:['New line.']}];
    default:return {};
  }
};
/** Controls for one scene in one phase. */
export function renderScenePhase(view:ScenePhasesView){
  const {form,parent,doc,scene,phase}=view,vocab=view.vocab(),def=vocab.registry[scene];
  const value=doc.value().phases?.[phase] as Record<string,any>|undefined;
  const fields=new StoryFields(form,doc,view.vocab,{scene});
  const base=['phases',phase];
  if(!value){
    form.button(parent,'Add '+phase+' phase to '+scene,()=>doc.edit('Add scene phase',d=>{(d.phases??={})[phase]={};}));
    return;
  }
  for(const field of FIELDS){
    const box=form.section(parent,LABEL[field]);
    if(value[field]===undefined){
      if(TABLE.includes(field)){
        // a table is created by its first row
        const ids=rowIds(field,def,value),choice={id:ids[0]??''};
        if(ids.length||field==='targets'){
          if(field==='targets')form.text(box,'New '+field+' ID',choice.id||'bed',v=>{choice.id=v;});
          else form.select(box,'New '+field+' row',ids,choice.id,v=>{choice.id=v;});
          form.button(box,'Add '+field+' row',()=>doc.edit('Add story '+field+' row',d=>{const table=((d.phases[phase])[field]??={});const id=choice.id||(field==='targets'?'bed':ids[0]);if(id in table)throw new Error('A row already exists for '+id);table[id]=newRow(field,def);}));
        }else{const p=document.createElement('p');p.textContent='This scene has nothing to put here yet.';box.append(p);}
      }else form.button(box,'Add '+LABEL[field],()=>doc.edit('Add scene phase '+field,d=>{d.phases[phase][field]=structuredClone(initial(field,def));}));
      continue;
    }
    fields.walk(box,value[field],[...base,field],scene);
    if(TABLE.includes(field)){
      const ids=rowIds(field,def,value).filter(id=>!(id in value[field]));
      if(ids.length||field==='targets'){
        const choice={id:ids[0]??''};
        if(field==='targets')form.text(box,'New '+field+' ID',choice.id||'bed',v=>{choice.id=v;});
        else form.select(box,'New '+field+' row',ids,choice.id,v=>{choice.id=v;});
        form.button(box,'Add '+field+' row',()=>doc.edit('Add story '+field+' row',d=>{const table=d.phases[phase][field],id=choice.id||(field==='targets'?'bed':ids[0]);if(id in table)throw new Error('A row already exists for '+id);table[id]=newRow(field,def);}));
      }
      for(const id of Object.keys(value[field]))form.button(box,'Remove '+field+' row '+id,()=>doc.edit('Remove story row',d=>{delete d.phases[phase][field][id];}));
    }
    form.button(box,'Remove '+LABEL[field],()=>doc.edit('Remove scene phase '+field,d=>{delete d.phases[phase][field];}));
  }
  form.button(parent,'Remove '+phase+' phase from '+scene,()=>doc.edit('Remove scene phase',d=>{delete d.phases[phase];if(!Object.keys(d.phases).length)delete d.phases;}));
}
/** The wash rules of a scene. */
export function renderSceneWash(form:TypedForm,parent:HTMLElement,doc:StoryDoc,vocab:()=>StoryVocab,scene:string){
  const value=doc.value().wash as unknown[]|undefined,fields=new StoryFields(form,doc,vocab,{scene});
  if(!value){form.button(parent,'Add room light cue to '+scene,()=>doc.edit('Add scene wash',d=>{d.wash=[{tone:'warm'}];}));return;}
  fields.walk(parent,value,['wash'],scene);
  form.button(parent,'Add wash rule',()=>doc.edit('Add wash rule',d=>{d.wash.push({tone:'warm'});}),value.length>=8);
  form.button(parent,'Remove room light cue',()=>doc.edit('Remove scene wash',d=>{delete d.wash;}));
}
function rowIds(field:Field,def:SceneDef|undefined,value:Record<string,any>){
  if(!def)return [];
  const taken=Object.keys(value[field]??{});
  const ids=field==='lines'?[...(def.people??[]).map(p=>p.id),...(def.uses??[]).map(u=>u.id),...(def.readables??[]).map(r=>r.id),...def.exits.map(e=>e.id)]
    :field==='exits'?def.exits.map(e=>e.id)
    :field==='barriers'?(def.level?.barriers??[]).filter(b=>!b.zone).map(b=>b.id)
    :field==='everyday'?[...(def.data?.devices??[]),...(def.data?.nodes??[])].map(d=>d.id)
    :[];
  return ids.filter((id):id is string=>typeof id==='string'&&!taken.includes(id));
}
function newRow(field:Field,def:SceneDef|undefined):unknown{
  switch(field){
    case 'lines':return {pages:['New line.']};
    case 'exits':return {say:{name:'YOU',pages:['Not yet.']}};
    // a barrier's usual phase rule is a checkpoint: verifying, ok, then it opens (story-rules.ts `barrierRuleOpens`)
    case 'barriers':return {gate:{verifying:'TURNSTILE: verifying',ok:'TURNSTILE: verifying… … ok.',verifyFrames:150,okFrames:50,dotEvery:20,then:[{sound:'granted'}]}};
    case 'everyday':return [{label:'look',say:['','New response.']}];
    default:{const anchor=def?.rests?.[0]??def?.uses?.[0];return anchor?{label:'[E] USE',promptH:46,bind:{kind:def?.rests?.[0]?'rest':'use',id:anchor.id,offsetX:0}}:{label:'[E] USE',promptH:46,x:80};}
  }
}
