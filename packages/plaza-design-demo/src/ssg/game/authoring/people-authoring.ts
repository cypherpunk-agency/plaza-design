import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './app';
import {PEOPLE_VOCABULARY,applyPeople,validatePeople,type PeopleDocument} from '../art/characters/people-source';
import type {CrowdMix} from '../art/characters/crowds';
/**
 * People settings (Library › Characters): the game-wide people defaults (colour style, seated pose) and each district's
 * crowd mix (who walks there, how much of it wears tech, what people do, which robots share the street).
 * Typed edits use ordinary history, bundle and grouped Save; the stage and the People mix view show them live.
 */
export function mountPeopleAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle{
 const api=context.authoring!;let disposed=false;
 const error=document.createElement('p');error.setAttribute('role','alert');
 const form=new TypedForm(e=>{error.textContent=String(e instanceof Error?e.message:e);});
 function edit(label:string,change:(d:PeopleDocument)=>void){const d=validatePeople(api.get('people').value);change(d);const next=validatePeople(d);api.edit('people',label,next);applyPeople(next);error.textContent='';}
 const crowd=(d:PeopleDocument,district:string)=>d.crowds.find(c=>c.district===district)!;
 type Table='people'|'acts'|'bots';
 const TABLES:{key:Table;title:string;add:string;vocabulary:readonly string[]}[]=[
  {key:'people',title:'Named looks',add:'Add named look',vocabulary:PEOPLE_VOCABULARY.people},
  {key:'acts',title:'What people do',add:'Add action',vocabulary:PEOPLE_VOCABULARY.acts},
  {key:'bots',title:'Robots',add:'Add robot',vocabulary:PEOPLE_VOCABULARY.bots},
 ];
 /** One weight per row (0 removes it), then a picker for what is not in the table yet. */
 function weights(parent:HTMLElement,mix:CrowdMix,t:(typeof TABLES)[number]){
  const box=form.section(parent,`${mix.district} · ${t.title}`),rows=Object.entries(mix[t.key] as Record<string,number>).sort((a,b)=>b[1]-a[1]),total=rows.reduce((n,[,w])=>n+w,0);
  for(const[id,w]of rows)form.decimal(box,`${mix.district} ${t.key} ${id} weight (${total?Math.round(w/total*100):0}%)`,w,v=>edit(`Edit ${mix.district} ${t.key} weight`,d=>{const table=crowd(d,mix.district)[t.key] as Record<string,number>;if(v>0)table[id]=v;else delete table[id];}),0,100);
  const missing=t.vocabulary.filter(v=>!(v in mix[t.key]));
  if(missing.length)form.select(box,`${mix.district} ${t.add.toLowerCase()}`,['',...missing],'',v=>{if(v)edit(`${t.add} to ${mix.district}`,d=>{(crowd(d,mix.district)[t.key] as Record<string,number>)[v]=1;});});
 }
 function render(){if(disposed)return;host.replaceChildren(error);
  let d:PeopleDocument;try{d=validatePeople(api.get('people').value);}catch(e){error.textContent=String(e instanceof Error?e.message:e);return;}
  const intro=document.createElement('p');intro.className='muted';
  intro.textContent='Game-wide defaults for people and the crowd mix of each district. A person’s own colour style and sitting pose (Scene inspector › Behaviour) win over the defaults. The People mix view above shows a district’s mix live.';
  host.append(intro);
  const defaults=document.createElement('section');defaults.className='people-defaults';host.append(defaults);
  form.select(defaults,'Default colour style',PEOPLE_VOCABULARY.style,d.style,v=>edit('Edit default colour style',d=>{d.style=v as PeopleDocument['style'];}));
  form.select(defaults,'Default seated pose',PEOPLE_VOCABULARY.seated,d.seated,v=>edit('Edit default seated pose',d=>{d.seated=v as PeopleDocument['seated'];}));
  const hint=document.createElement('p');hint.className='muted';hint.textContent='Mixed: everyone sitting picks front, three-quarter or side on and shifts to another every 12 to 26 seconds.';defaults.append(hint);
  for(const mix of d.crowds){
   const section=form.section(host,'People mix · '+mix.district);
   form.text(section,mix.district+' note',mix.note,v=>edit('Edit crowd note',d=>{crowd(d,mix.district).note=v;}),true);
   form.select(section,mix.district+' colour style',['default','vivid','muted'],mix.style??'default',v=>edit('Edit district colour style',d=>{const c=crowd(d,mix.district);if(v==='default')delete c.style;else c.style=v as CrowdMix['style'];}));
   form.number(section,mix.district+' visible tech %',Math.round(mix.kitted*100),v=>edit('Edit crowd tech share',d=>{crowd(d,mix.district).kitted=Math.min(100,Math.max(0,v))/100;}),0,100);
   form.number(section,mix.district+' robots %',Math.round(mix.robots*100),v=>edit('Edit crowd robot share',d=>{crowd(d,mix.district).robots=Math.min(100,Math.max(0,v))/100;}),0,100);
   for(const t of TABLES)weights(section,mix,t);
   form.button(section,'Remove '+mix.district+' people mix',()=>edit('Remove district people mix',d=>{d.crowds=d.crowds.filter(c=>c.district!==mix.district);}));
  }
  const free=PEOPLE_VOCABULARY.districts.filter(id=>!d.crowds.some(c=>c.district===id));
  if(free.length)form.select(host,'Add district people mix',['',...free],'',v=>{if(v)edit('Add district people mix',d=>{d.crowds.push({district:v,note:'',kitted:.3,robots:.1,people:{commuter:1},acts:{walk:1},bots:{sweeper:1}});});});
 }
 render();const dispose=(()=>{disposed=true;host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=render;return dispose;
}
