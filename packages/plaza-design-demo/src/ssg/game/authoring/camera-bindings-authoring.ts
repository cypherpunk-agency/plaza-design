import type {SceneData} from '../data/types';
import type {TypedForm} from './typed-form';
import {cameraBindingRoles} from '../engine/controllers/camera-bindings';
/** Finite inputs to native camera panels, using the current scene's materialized state. */
export function renderCameraBindings(host:HTMLElement,form:TypedForm,data:SceneData,edit:(label:string,change:(d:SceneData)=>void)=>void){
 const roles=cameraBindingRoles(data.id);if(!roles.length)return;
 const b=data.camera?.bindings??{},keys=(type:string)=>Object.keys(data.state).filter(k=>typeof data.state[k]===type),strings=keys('string'),numbers=keys('number');
 const change=(label:string,run:(b:NonNullable<NonNullable<SceneData['camera']>['bindings']>)=>void)=>edit(label,d=>{d.camera!.bindings??={};run(d.camera!.bindings);});
 if(roles.includes('pan'))form.select(host,'Camera pan state',['',...numbers],b.pan?.state??'',state=>change('Rebind camera pan',b=>{if(state)b.pan={state,scale:b.pan?.scale??40};else delete b.pan;}));
 if(b.pan)form.decimal(host,'Camera pan scale',b.pan.scale,scale=>change('Edit camera pan scale',b=>{b.pan!.scale=scale;}),-1000000,1000000);
 if(roles.includes('parcel'))form.select(host,'Camera parcel state',['',...strings],b.parcel??'',state=>change('Rebind camera parcel',b=>{if(state)b.parcel=state;else delete b.parcel;}));
 if(roles.includes('feed'))form.select(host,'Camera feed state',['',...strings],b.feed?.state??'',state=>change('Rebind camera feed',b=>{if(state)b.feed={state,equals:b.feed?.equals??''};else delete b.feed;}));
 if(b.feed)form.text(host,'Camera feed equals',b.feed.equals,equals=>change('Edit camera feed comparison',b=>{b.feed!.equals=equals;}));
 const endpoints=[...data.devices,...data.nodes??[]].flatMap(d=>d.nouns.filter(n=>n.verbs?.length).map(n=>({key:d.id+'.'+n.id,device:d.id,noun:n.id,verbs:n.verbs!}))),current=b.loop?b.loop.device+'.'+b.loop.noun:'';
 if(roles.includes('loop'))form.select(host,'Camera loop endpoint',['',...endpoints.map(e=>e.key)],current,key=>change('Rebind camera loop endpoint',b=>{const e=endpoints.find(e=>e.key===key);if(e)b.loop={device:e.device,noun:e.noun,verb:e.verbs[0]};else delete b.loop;}));
 if(b.loop)form.select(host,'Camera loop verb',endpoints.find(e=>e.key===current)?.verbs??[],b.loop.verb,verb=>change('Rebind camera loop verb',b=>{b.loop!.verb=verb;}));
 if(roles.includes('reefers')){const reefers=new Set(b.reefers??[]);for(const crate of data.camera?.crates??[])form.check(host,'Camera reefer '+crate.id,reefers.has(crate.id),on=>change(on?'Mark camera reefer':'Unmark camera reefer',b=>{const next=(data.camera?.crates??[]).map(c=>c.id).filter(id=>id===crate.id?on:(b.reefers??[]).includes(id));if(next.length)b.reefers=next;else delete b.reefers;}));}
 form.button(host,'Remove camera bindings',()=>edit('Remove camera bindings',d=>{delete d.camera!.bindings;}),data.camera?.bindings===undefined);
}
