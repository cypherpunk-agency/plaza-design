import {checkpointControls} from './checkpoint-controls';
import {pendingRegistry} from './pending-registry';
import {concreteStateValue} from '../engine/gameplay/state';
import {fixtureStateDeclarations,fixtureFlags,fixtureModules,fixturePrograms,fixtureKeys,type PlayFixture} from '../world/checkpoints';
import {createPendingCity} from './pending-city';
import {pendingFixtureVocabulary} from './pending-fixtures';
import {metroStartingState,metroStartingStates,type MetroStartingState} from './metro-starting-state';
import type {Station} from '../world/city';
import {validateMetroSource} from '../world/transport/metro-source';
import {validateMetroStart} from '../world/transport/metro-start';
import {ITEMS} from '../scenes/kit';
import {WEATHER_KINDS} from '../world/weather';
import type {TypedForm} from './typed-form';
import type {WorkbenchContext} from './contracts';
/** One form for world-inspector checkpoints and private Play starting inputs. */
export function renderStartingStateControls(details:HTMLElement,context:WorkbenchContext,f:PlayFixture,form:TypedForm,edit:(label:string,change:(f:PlayFixture)=>void)=>void,report:(error:unknown)=>void){
 const api=context.authoring!,currentDocuments=()=>new Map(context.documents.filter(d=>!d.id.startsWith('authored.')).map(d=>[d.id,api.get(d.id).value]));
  form.text(details,'Checkpoint name',f.name,name=>edit('Rename fixture',f=>{f.name=name;}));
  form.check(details,'Override run handle',f.handle!==undefined,on=>edit('Set checkpoint handle override',f=>{if(on)f.handle='';else delete f.handle;}));
  if(f.handle!==undefined)form.text(details,'Starting handle',f.handle,value=>edit('Edit checkpoint handle',f=>{f.handle=value;}));
  const fixtureDocuments=currentDocuments(),registry=pendingRegistry(fixtureDocuments);
  checkpointControls(details,f,fixtureDocuments,registry,edit,report);
  form.select(details,'Starting entrance',['',...(registry[f.scene]?.exits??[]).map(e=>e.id)],f.entrance??'',value=>edit('Edit checkpoint entrance',f=>{if(value)f.entrance=value;else delete f.entrance;}));
  form.number(details,'Starting tokens',f.tokens,tokens=>edit('Edit fixture tokens',f=>{f.tokens=tokens;}));
  const clockNote=document.createElement('p');clockNote.textContent='Story follows authored milestones; fixed and running use the starting city time below.';details.append(clockNote);
  form.select(details,'City clock',['story','fixed','running'],f.clock,clock=>edit('Edit fixture clock',f=>{f.clock=clock as PlayFixture['clock'];}));
  for(const [key,name,min,max] of [['day','City day',1,10000],['minute','City minute',0,1439],['seed','Weather seed',0,2147483647]] as const)form.number(details,name,f[key],value=>edit('Edit fixture '+key,f=>{f[key]=value;}),min,max);
  form.select(details,'Weather',['forecast',...WEATHER_KINDS],f.weather,weather=>edit('Edit fixture weather',f=>{f.weather=weather as PlayFixture['weather'];}));
  form.check(details,'Override spawn',f.spawn!==null,on=>edit('Edit fixture spawn',f=>{f.spawn=on?80:null;}));if(f.spawn!==null)form.number(details,'Starting X',f.spawn,spawn=>edit('Edit fixture spawn',f=>{f.spawn=spawn;}),12,100000);
  const city=createPendingCity(api.get('city-source').value,currentDocuments());
  const metroSource=validateMetroSource(api.get('metro-source').value),metroPanel=form.section(details,'Metro starting state');
  form.check(metroPanel,'Override metro state',!!f.metro,on=>edit('Edit fixture metro override',f=>{if(on)f.metro=metroStartingState('at-station',city.stationAt(f.scene)??'galleria',city,metroSource);else delete f.metro;}));
  if(f.metro){const start=validateMetroStart(f.metro,city.LINE);
   const change=(label:string,apply:(s:NonNullable<PlayFixture['metro']>)=>void)=>edit(label,f=>{apply(f.metro!);f.metro=validateMetroStart(f.metro,city.LINE);});
   form.select(metroPanel,'Metro start',[...metroStartingStates],start.start,kind=>change('Apply metro starting state',s=>{s.start=kind as MetroStartingState;}));
   form.select(metroPanel,'Metro from station',city.LINE,start.station,station=>change('Edit starting metro station',s=>{s.station=station as Station;}));
   for(const station of city.LINE)if(!metroSource.locked[station])form.check(metroPanel,'Metro stop '+station,start.lineOpen[station],value=>change('Edit starting metro access',s=>{s.lineOpen[station]=value;}));
  }
  const vocabulary=['network','opening-story','city-source'].every(id=>fixtureDocuments.has(id))?pendingFixtureVocabulary(fixtureDocuments,registry):undefined;
  const flags=form.section(details,'Flags');for(const id of vocabulary?[...vocabulary.flags]:fixtureFlags)form.check(flags,id,!!f.flags[id],value=>edit('Edit fixture flag',f=>{f.flags[id]=value;}));
  const items=form.section(details,'Inventory');for(const id of Object.keys(ITEMS))form.number(items,id,f.items[id]??0,value=>edit('Edit fixture inventory',f=>{if(value)f.items[id]=value;else delete f.items[id];}));
  for(const [key,ids]of [['modules',fixtureModules],['programs',vocabulary?[...vocabulary.programs]:fixturePrograms],['keyring',vocabulary?[...vocabulary.keyring]:fixtureKeys]] as const){const section=form.section(details,key);for(const id of ids)form.check(section,id,f[key].includes(id),value=>edit('Edit fixture '+key,f=>{f[key]=value?[...f[key],id]:f[key].filter(v=>v!==id);}));}
  const declarations=fixtureStateDeclarations(f.scene,vocabulary);if(Object.keys(declarations).length){const section=form.section(details,'Scene state');for(const[key,d]of Object.entries(declarations)){const value=Object.prototype.hasOwnProperty.call(f.state,key)?f.state[key]:d.default;const set=(value:import('../engine/gameplay/types').StateValue)=>edit('Edit fixture scene state',f=>{f.state[key]=value;});if(d.nullable)form.check(section,'State '+key+' is null',value===null,on=>set(on?null:concreteStateValue(d)));if(value===null)continue;if(d.type==='boolean')form.check(section,'State '+key,value as boolean,set);else if(d.type==='number'){const control=d.integer===false?form.decimal.bind(form):form.number.bind(form);control(section,'State '+key,value as number,set,d.min??-1000000,d.max??1000000);}else if(d.type==='enum')form.select(section,'State '+key,d.options!,String(value),set);else form.text(section,'State '+key,String(value),set);}}
}
