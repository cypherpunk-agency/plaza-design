import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './contracts';
import type {CitySource,District} from '../world/city';
import {validatePendingCity} from './pending-city';
type DistrictId=District['id'];
/**
 * World › Districts: create, rename, re-stratum, place on the map and remove districts in the city source.
 * A district is removable only while no place, link or planned line refers to it. People in a new district use the
 * city palette until one is made for it (art/characters/people-style.ts).
 */
export function mountDistrictAuthoring(host:HTMLElement,context:WorkbenchContext):WorkbenchHandle{
 const api=context.authoring!;let disposed=false;
 const error=document.createElement('p');error.setAttribute('role','alert');
 const form=new TypedForm(e=>{error.textContent=String(e);});
 const read=()=>validatePendingCity(api.get('city-source').value,new Map(context.documents.map(d=>[d.id,d.value])));
 function edit(label:string,change:(source:CitySource)=>void){const d=read();change(d);api.edit('city-source',label,d);}
 /** What still refers to a district, which is why it cannot be removed yet. */
 const usersOf=(d:CitySource,id:string)=>[...d.PLACES.filter(p=>p.district===id).map(p=>'place '+p.name),...d.LINKS.filter(l=>l.from===id||l.to===id).map(l=>'link '+l.name),...d.LINES_PLANNED.filter(l=>l.stops.some(s=>s.district===id)).map(l=>'planned '+l.name)];
 const strata=['street','overworld','underworld'];
 function render(){if(disposed)return;const d=read();host.replaceChildren(error);
  const note=document.createElement('p');note.textContent='The city’s districts: their names on the map, their stratum (street, the Spire above, the Undercity below) and where they sit on the city map. Places are assigned to a district in City & travel.';host.append(note);
  const add=form.section(host,'New district');let id='',name='New district',short='NEW',stratum='street';
  form.text(add,'New district ID',id,v=>{id=v.trim();});form.text(add,'New district name',name,v=>{name=v;});form.text(add,'New district short name',short,v=>{short=v;});form.select(add,'New district stratum',strata,stratum,v=>{stratum=v;});
  form.button(add,'Add district',()=>{
   if(!/^[a-z][a-z0-9-]{1,31}$/.test(id))throw new Error('District ID: 2–32 lowercase letters, digits or dashes, starting with a letter');if(d.DISTRICTS.some(v=>v.id===id))throw new Error('A district with this ID already exists');
   // A new district starts without ground of its own: the street plan gives land to the nearest district centre, so a
   // centre would take land (and places) from its neighbours. Give it streets below once its position is chosen.
   edit('Add district '+id,d=>{const key=id as DistrictId,x=Math.round(d.MAP_W/2),y=Math.round(d.MAP_H/2);
    d.DISTRICTS.push({id:key,name,short,stratum:stratum as District['stratum']});
    d.DISTRICT_MAP[key]={centre:null,sep:0,dens:.5,col:'120,160,200',frame:[x-80,y-60,160,120],label:[x,y],note:''};d.DISTRICT_REVEAL[key]={near:[]};});
  },d.DISTRICTS.length>=32);
  for(const district of d.DISTRICTS){const plan=d.DISTRICT_MAP[district.id],section=form.section(host,district.name+' · '+district.id),key=district.id;
   form.text(section,'District '+key+' name',district.name,v=>edit('Rename district',d=>{d.DISTRICTS.find(x=>x.id===key)!.name=v;}));
   form.text(section,'District '+key+' short name',district.short,v=>edit('Edit district short name',d=>{d.DISTRICTS.find(x=>x.id===key)!.short=v;}));
   form.select(section,'District '+key+' stratum',strata,district.stratum,v=>edit('Edit district stratum',d=>{d.DISTRICTS.find(x=>x.id===key)!.stratum=v as District['stratum'];}));
   form.check(section,'District '+key+' has streets on the map',!!plan.centre,on=>edit(on?'Give district streets on the map':'Remove district streets from the map',d=>{const p=d.DISTRICT_MAP[key];if(on){p.centre=[Math.round(p.label[0]),Math.round(p.label[1])];p.sep=Math.max(p.sep,24);}else{p.centre=null;p.sep=0;}}));
   if(!plan.centre){const hint=document.createElement('p');hint.className='muted';hint.textContent='No streets of its own yet. Land on the map goes to the nearest district with streets, so choose its spot (the label position) before turning this on; places that would fall inside it are named if they belong elsewhere.';section.append(hint);}
   if(plan.centre){const[cx,cy]=plan.centre;
    form.number(section,'District '+key+' map centre x',cx,v=>edit('Move district on the map',d=>{d.DISTRICT_MAP[key].centre=[v,d.DISTRICT_MAP[key].centre![1]];}),0,d.MAP_W);
    form.number(section,'District '+key+' map centre y',cy,v=>edit('Move district on the map',d=>{d.DISTRICT_MAP[key].centre=[d.DISTRICT_MAP[key].centre![0],v];}),0,d.MAP_H);}
   const[lx,ly]=plan.label;
   form.number(section,'District '+key+' label x',Math.round(lx),v=>edit('Move district label',d=>{d.DISTRICT_MAP[key].label=[v,d.DISTRICT_MAP[key].label[1]];}),0,d.MAP_W);
   form.number(section,'District '+key+' label y',Math.round(ly),v=>edit('Move district label',d=>{d.DISTRICT_MAP[key].label=[d.DISTRICT_MAP[key].label[0],v];}),0,d.MAP_H);
   form.text(section,'District '+key+' map note',plan.note,v=>edit('Edit district map note',d=>{d.DISTRICT_MAP[key].note=v;}));
   const users=usersOf(d,key),why=document.createElement('p');why.className='muted';why.textContent=users.length?'Used by '+users.join(', ')+'. Move those to another district before removing it.':d.DISTRICTS.length===1?'The city needs at least one district.':'Nothing refers to this district.';section.append(why);
   form.button(section,'Remove district '+key,()=>edit('Remove district '+key,d=>{d.DISTRICTS=d.DISTRICTS.filter(v=>v.id!==key);delete d.DISTRICT_MAP[key];delete d.DISTRICT_REVEAL[key];for(const reveal of Object.values(d.DISTRICT_REVEAL))reveal.near=reveal.near.filter(id=>id!==key);}),users.length>0||d.DISTRICTS.length===1);
  }
 }
 render();const dispose=(()=>{disposed=true;host.replaceChildren();}) as WorkbenchHandle;dispose.refresh=render;return dispose;
}
