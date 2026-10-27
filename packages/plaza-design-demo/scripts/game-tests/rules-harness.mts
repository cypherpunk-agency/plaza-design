/** A tiny DOM and a fake authoring API for driving typed editor controls in checks (the same approach as check-companion-forms). */
import assert from 'node:assert/strict';
export class Element {
 children:Element[]=[];attributes:Record<string,string>={};value='';checked=false;textContent='';disabled=false;className='';type='';min='';max='';step='';open=false;style:Record<string,string>={};
 dataset:Record<string,string>={};hidden=false;parentElement?:Element;onclose?:()=>void;
 closest(){return undefined;}
 showModal(){this.open=true;}
 close(){this.open=false;this.onclose?.();}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(e=>e!==this);}
 onchange?:()=>void;onclick?:()=>void;ontoggle?:()=>void;onerror?:()=>void;
 append(...n:Element[]){for(const child of n)child.parentElement=this;this.children.push(...n);}
 replaceChildren(...n:Element[]){this.children=[];this.append(...n);}
 setAttribute(k:string,v:string){this.attributes[k]=v;}
}
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>new Element()}});
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
/** Mount an editor workbench over a map of document values; `edit` validates nothing itself (the editor's own validator runs inside). */
export function mountRules(mount:(host:any,context:any)=>any,documents:Map<string,unknown>,extra:Record<string,unknown>={}){
 const host=new Element(),saved:{id:string;label:string}[]=[];let handle:any;
 const api={get:(id:string)=>{if(!documents.has(id))throw new Error('no document '+id);return{id,value:structuredClone(documents.get(id))};},edit:(id:string,label:string,value:unknown)=>{saved.push({id,label});documents.set(id,structuredClone(value));handle?.refresh?.();}};
 const context={authoring:api,get documents(){return[...documents].map(([id,value])=>({id,value}));},...extra};
 handle=mount(host,context);
 const rows=()=>all(host);
 return{
  host,saved,handle,documents,
  has:(name:string)=>rows().some(e=>e.attributes['aria-label']===name||e.textContent===name&&e.onclick),
  field(name:string){const e=rows().find(e=>e.attributes['aria-label']===name);assert(e,'field '+name);return e;},
  /** Set a field (text, number, select value or checkbox) the way a person would, firing its change handler. */
  change(name:string,value:string|boolean){const e=this.field(name);if(typeof value==='boolean')e.checked=value;else e.value=value;e.onchange!();},
  click(label:string){const e=rows().find(e=>e.textContent===label&&e.onclick);assert(e,'button '+label);assert(!e.disabled,'button '+label+' is disabled');e.onclick!();},
  optionValues(name:string){return this.field(name).children.map(o=>o.value);},
 };
}
