import engineSource from '../data/engine.json';
import {lineReferenceQuery,lineValue} from '../engine/gameplay/queries';
import type {GameplayDefinition,NativeSay} from '../engine/gameplay/types';
import type {SceneData} from '../data/types';
import type {TypedForm} from './typed-form';
export function renderNativeCaseSay(parent:HTMLElement,name:string,say:Exclude<NativeSay,null>,template:boolean,doc:GameplayDefinition,data:SceneData,form:TypedForm,edit:(value:Exclude<NativeSay,null>)=>void,setTemplate:(on:boolean)=>void,options:{allowQuery?:boolean}={}){
 const texts={...engineSource.texts,...data.texts},keys=Object.entries(texts).filter(([,value])=>lineValue(value)).map(([id])=>id),queries=options.allowQuery===false?[]:Object.keys(doc.queries??{}).filter(id=>lineReferenceQuery(doc,id));
 const mode=Array.isArray(say)?'inline':typeof say.text==='string'?'text':'query';
 form.select(parent,name+' reply source',['inline',...(keys.length?['text']:[]),...(queries.length?['query']:[])],mode,mode=>edit(mode==='text'?{text:keys[0]}:mode==='query'?{text:{query:queries[0]}}:['action','Action completed.']));
 if(!Array.isArray(say)){if(typeof say.text==='string')form.select(parent,name+' text key',keys,say.text,text=>edit({text}));else form.select(parent,name+' text query',queries,say.text.query,query=>edit({text:{query}}));return;}
 form.check(parent,name+' template',template,setTemplate);
 form.text(parent,name+' input',say[0],value=>edit([value,say[1],...(say[2]?[say[2]]:[])]as typeof say));form.text(parent,name+' response',say[1],value=>edit([say[0],value,...(say[2]?[say[2]]:[])]as typeof say),true);
 form.select(parent,name+' tone',['','ok','err','dim'],say[2]??'',tone=>edit(tone?[say[0],say[1],tone as 'ok'|'err'|'dim']:[say[0],say[1]]));
}
