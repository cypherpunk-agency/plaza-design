import type {SceneData} from '../data/types';import type {TypedForm} from './typed-form';
import {visualStateTypes,type VisualController} from '../engine/controllers/visual';
/** Registered picture parameters. No state mutations or additional saved values live here. */
export function renderVisualController(host:HTMLElement,form:TypedForm,data:SceneData,edit:(label:string,change:(d:SceneData)=>void)=>void){
 const kind=data.id as 'moth'|'beach';if(!['moth','beach'].includes(kind))return;
 const c=data.controller?.kind===kind?data.controller as VisualController:undefined;
 form.check(host,'Enable visual state bindings',!!c,on=>edit('Edit visual state bindings',d=>{if(!on)delete d.controller;else d.controller=kind==='moth'?{kind,version:1,state:{},values:{wet:'wet',fresh:0}}:{kind,version:1,state:{},values:{billingPaused:'pause',danger:'danger',lampsOn:'on'}};}));
 if(!c)return;
 const change=(label:string,fn:(c:VisualController)=>void)=>edit(label,d=>fn(d.controller as VisualController));
 for(const[role,type]of Object.entries(visualStateTypes[kind])){
  const state=c.state as Record<string,string>;form.select(host,'Visual '+role+' state',['',...Object.keys(data.state).filter(k=>typeof data.state[k]===type)],state[role]??'',ref=>change('Rebind visual '+role,c=>{const state=c.state as Record<string,string>;if(ref)state[role]=ref;else delete state[role];}));
 }
 if(c.kind==='moth'){
  form.text(host,'Visual wet value',c.values.wet,value=>change('Edit visual wet value',c=>{if(c.kind==='moth')c.values.wet=value;}));
  form.decimal(host,'Visual fresh value',c.values.fresh,value=>change('Edit visual fresh value',c=>{if(c.kind==='moth')c.values.fresh=value;}),-Number.MAX_VALUE,Number.MAX_VALUE);
  const clocks=[...data.devices,...data.nodes??[]].flatMap(d=>d.nouns.filter(n=>n.clock).map(n=>({id:d.id+'.'+n.id,device:d.id,noun:n.id})));
  form.select(host,'Visual record clock',['',...clocks.map(c=>c.id)],c.record?c.record.device+'.'+c.record.noun:'',ref=>change('Rebind visual record clock',c=>{if(c.kind==='moth'){const clock=clocks.find(k=>k.id===ref);if(clock)c.record={device:clock.device,noun:clock.noun};else delete c.record;}}));
 }else for(const key of ['billingPaused','danger','lampsOn']as const)form.text(host,'Visual '+key+' value',c.values[key],value=>change('Edit visual '+key+' value',c=>{if(c.kind==='beach')c.values[key]=value;}));
}
