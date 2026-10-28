import {element,button} from './controls';
import {TypedForm} from './typed-form';
/** Contextual drafts live beside the viewport. Apply is one validated edit; Cancel edits nothing. */
export interface InspectorTask {
 title:string;
 build(body:HTMLElement,form:TypedForm):()=>void|Promise<void>;
 action?:string;
 id?:string;
 highlightChunks?:readonly string[];
}
export type OpenInspector=(task:InspectorTask)=>void;
export function inspectorTask(task:InspectorTask,close:()=>void){
 const host=element('section','inspector-task'),body=element('div','gameplay-fields'),error=element('p','inspector-error');error.setAttribute('role','alert');
 const report=(e:unknown)=>{error.textContent='No changes applied. Correct the draft and Apply again, or Cancel to return to the selection.\n\n'+(e instanceof Error?e.message:String(e));};
 const form=new TypedForm(report),actions=element('div','inspector-task-actions');
 host.append(element('h2','',task.title),body,error,actions);
 try{const commit=task.build(body,form),apply=button(task.action??'Apply',()=>form.run(()=>{
  error.textContent='';const result=commit();if(result instanceof Promise){apply.disabled=true;void result.then(close,e=>{apply.disabled=false;report(e);});}else close();
 }));apply.className='primary';actions.append(element('span','draft-label','Draft · not applied'),button('Cancel',close),apply);}catch(e){report(e);actions.append(button('Back to selection',close));}
 return host;
}
