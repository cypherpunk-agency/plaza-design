import type {SceneData} from '../data/types';import type {GameplayDefinition} from '../engine/gameplay/types';import type {TypedForm} from './typed-form';
import {yardController,yardStateTypes,yardPlaceRoles,type YardController} from '../engine/controllers/yard';
export function renderYardController(host:HTMLElement,form:TypedForm,data:SceneData,gameplay:GameplayDefinition,rows:readonly{instance:{id:string;type:string}}[],edit:(label:string,change:(d:SceneData)=>void)=>void){
 const c=yardController(data),change=(label:string,fn:(c:YardController)=>void)=>edit(label,d=>fn(d.controller as YardController));
 form.check(host,'Enable Yard picture controller',!!c,on=>edit('Edit Yard picture controller',d=>{if(!on)delete d.controller;else d.controller={kind:'yard',version:1,state:{},hook:'crane.hook',slots:{home:'slot-home',chute:'slot-chute'},cargoSlots:[],anchors:{crane:'crane',chute:'chute',tray:'tray'},places:{home:'home',hook:'hook',chute:'chute',sliding:'sliding',bounced:'bounced',tray:'tray'}};}));if(!c)return;
 for(const[role,type]of Object.entries(yardStateTypes))form.select(host,'Yard '+role+' state',['',...Object.keys(data.state).filter(k=>typeof data.state[k]===type)],c.state[role as keyof typeof yardStateTypes]??'',ref=>change('Rebind Yard '+role,c=>{if(ref)c.state[role as keyof typeof yardStateTypes]=ref;else delete c.state[role as keyof typeof yardStateTypes];}));
 form.select(host,'Yard gate query',['',...Object.keys(gameplay.queries??{})],c.gateOpen??'',ref=>change('Rebind Yard gate query',c=>{if(ref)c.gateOpen=ref;else delete c.gateOpen;}));
 form.select(host,'Yard slide deadline',['',...Object.entries(gameplay.native?.deadlines??{}).filter(([,d])=>d.startedAt).map(([id])=>id)],c.slideDeadline??'',ref=>change('Rebind Yard slide deadline',c=>{if(ref)c.slideDeadline=ref;else delete c.slideDeadline;}));
 form.select(host,'Yard hook mover',data.devices.flatMap(d=>d.nouns.filter(n=>n.mover).map(n=>d.id+'.'+n.id)),c.hook,ref=>change('Rebind Yard hook mover',c=>{c.hook=ref;}));
 for(const role of ['crane','chute','tray']as const)form.select(host,'Yard '+role+' artwork',rows.filter(r=>r.instance.type==='yard.'+role).map(r=>r.instance.id),c.anchors[role],ref=>change('Rebind Yard '+role+' artwork',c=>{c.anchors[role]=ref;}));
 const section=form.section(host,'Yard slots');
 for(const[id,ref]of Object.entries(c.slots)){
  const row=form.section(section,'Yard slot '+id);
  form.text(row,'Yard slot '+id+' label',id,next=>change('Rename Yard slot',c=>{if(next===id)return;if(Object.prototype.hasOwnProperty.call(c.slots,next))throw Error('Slot label already exists');c.slots[next]=c.slots[id];delete c.slots[id];c.cargoSlots=c.cargoSlots.map(k=>k===id?next:k);for(const role of yardPlaceRoles)if(c.places[role]===id)c.places[role]=next;}));
  form.select(row,'Yard slot '+id+' artwork',rows.map(r=>r.instance.id),ref,ref=>change('Rebind Yard slot artwork',c=>{c.slots[id]=ref;}));
  if(!Object.values(c.places).includes(id))form.check(row,'Yard slot '+id+' holds cargo',c.cargoSlots.includes(id),on=>change('Edit Yard cargo slot',c=>{c.cargoSlots=c.cargoSlots.filter(k=>k!==id);if(on)c.cargoSlots.push(id);}));
  form.button(row,'Remove Yard slot '+id,()=>change('Remove Yard slot',c=>{delete c.slots[id];c.cargoSlots=c.cargoSlots.filter(k=>k!==id);}),id===c.places.home||id===c.places.chute);
 }
 let id='',ref=rows[0]?.instance.id??'';form.text(section,'New Yard slot label','',value=>{id=value;});form.select(section,'New Yard slot artwork',rows.map(r=>r.instance.id),ref,value=>{ref=value;});
 form.button(section,'Add Yard slot',()=>change('Add Yard slot',c=>{if(Object.prototype.hasOwnProperty.call(c.slots,id))throw Error('Slot label already exists');c.slots[id]=ref;}),!rows.length||Object.keys(c.slots).length>=128);
 for(const role of yardPlaceRoles){if(role==='home'||role==='chute')form.select(host,'Yard '+role+' place',Object.keys(c.slots),c.places[role],value=>change('Edit Yard '+role+' place',c=>{c.places[role]=value;}));else form.text(host,'Yard '+role+' place',c.places[role],value=>change('Edit Yard '+role+' place',c=>{c.places[role]=value;}));}
}
