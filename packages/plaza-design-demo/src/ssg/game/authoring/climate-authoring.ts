import {WEATHER_KINDS,type ClimateDef} from '../world/weather-kinds';
import type {TypedForm} from './typed-form';
/** Saved climate data. Temporary preview weather deliberately uses a separate existing control. */
export function climateAuthoring(form:TypedForm,host:HTMLElement,id:string,value:ClimateDef,edit:(change:(value:ClimateDef)=>void)=>void){
 const box=form.section(host,'Climate · '+id);
 const note=document.createElement('p');note.textContent='Saved forecast configuration. Preview weather in the toolbar is temporary and does not change these values.';box.append(note);
 form.text(box,'Climate '+id+' report name',value.name,v=>edit(c=>{c.name=v;}));
 form.number(box,'Climate '+id+' forecast seed salt',value.seed,v=>edit(c=>{c.seed=v;}),1,1000000000);
 form.select(box,'Climate '+id+' fixed weather',['',...WEATHER_KINDS],value.fixed??'',v=>edit(c=>{if(v)c.fixed=v as ClimateDef['fixed'];else delete c.fixed;}));
 for(const kind of WEATHER_KINDS)form.decimal(box,'Climate '+id+' '+kind+' weight',value.weights[kind]??0,v=>edit(c=>{c.weights[kind]=v;}),0,10000);
 for(const key of ['roof','note'] as const)form.text(box,'Climate '+id+' '+(key==='roof'?'roof report':'fixed-weather report'),value[key]??'',v=>edit(c=>{if(v)c[key]=v;else delete c[key];}));
}
