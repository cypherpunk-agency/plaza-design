import type {SceneDocument} from '../engine/gameplay/scene-document';
import type {SceneStage,StageLightSource,StageCasterSource} from '../engine/gameplay/scene-stage';
import {manifestGroups,MANIFEST_COMPILE_FLAGS,type ManifestGroup} from '../engine/gameplay/manifest-contract';
import type {TypedForm} from './typed-form';
type Edit=(label:string,change:(d:SceneDocument)=>void)=>void;
const LABELS:Record<string,string>={groundExits:'Exits stand on the ground',groundSpawn:'Spawn stands on the ground',transformedExits:'Exits follow transformed artwork',elevatedResponses:'Responses rise above their artwork',omitGroundRestHeight:'Rests on the ground keep no height'};
/**
 * Scene › Stage & compile: what the scene takes from its artwork (scene-stage.ts) and how its
 * bindings compile (manifest.compile). Roles are the scene's artwork roles (Content & bindings).
 */
export function renderSceneStage(form:TypedForm,host:HTMLElement,d:SceneDocument,edit:Edit,types:readonly string[]){
 const roles=Object.keys(d.manifest?.artwork??{}),stage=d.stage??{},none='(none)';
 const stageEdit=(label:string,change:(s:SceneStage)=>void)=>edit(label,doc=>{doc.stage??={};change(doc.stage);if(!Object.keys(doc.stage).length)delete doc.stage;});
 // compile options
 const compile=form.section(host,'Compile');
 for(const flag of MANIFEST_COMPILE_FLAGS){const value=d.manifest?.compile?.[flag];form.select(compile,LABELS[flag],['default','yes','no'],value===undefined?'default':value?'yes':'no',v=>edit('Edit compile option',doc=>{const c=(doc.manifest!.compile??={});if(v==='default')delete c[flag];else c[flag]=v==='yes';if(!Object.keys(c).length)delete doc.manifest!.compile;}));}
 for(const group of manifestGroups)form.check(compile,'Binds '+group,(d.manifest?.compile?.groups??manifestGroups).includes(group),on=>edit('Edit compile groups',doc=>{const c=(doc.manifest!.compile??={}),list=new Set<ManifestGroup>(c.groups??manifestGroups);if(on)list.add(group);else list.delete(group);c.groups=manifestGroups.filter(g=>list.has(g));}));
 // facing and shade from roles
 const room=form.section(host,'From artwork');
 form.select(room,'Facing from role',[none,...roles],stage.facing?.role??none,v=>stageEdit('Edit facing role',s=>{if(v===none)delete s.facing;else s.facing={...(s.facing??{}),role:v};}));
 if(stage.facing){form.text(room,'Facing property',stage.facing.prop??'facing',v=>stageEdit('Edit facing property',s=>{if(v.trim()&&v!=='facing')s.facing!.prop=v.trim();else delete s.facing!.prop;}));form.decimal(room,'Facing when the role is missing',stage.facing.fallback??0,v=>stageEdit('Edit facing fallback',s=>{s.facing!.fallback=v;}),0,360);}
 form.select(room,'Horizon height from role',[none,...roles],stage.horizon?.role??none,v=>stageEdit('Edit horizon role',s=>{if(v===none)delete s.horizon;else s.horizon={role:v};}));
 form.select(room,'Front shade from role',[none,...roles],stage.shade?.front?.role??none,v=>stageEdit('Edit front shade',s=>{if(v===none){delete s.shade?.front;}else (s.shade??={}).front={...(s.shade.front??{}),role:v};if(s.shade&&!Object.keys(s.shade).length)delete s.shade;}));
 form.select(room,'Back shade from role',[none,...roles],stage.shade?.back?.role??none,v=>stageEdit('Edit back shade',s=>{if(v===none){delete s.shade?.back;}else (s.shade??={}).back={gaps:s.shade.back?.gaps??'shade-gap',role:v};if(s.shade&&!Object.keys(s.shade).length)delete s.shade;}));
 if(stage.shade?.back)form.text(room,'Back shade gaps (rows whose role is)',stage.shade.back.gaps,v=>stageEdit('Edit back shade gaps',s=>{if(v.trim())s.shade!.back!.gaps=v.trim();}));
 // lights and casters
 const sourceRows=<T extends {type?:string;role?:string}>(box:HTMLElement,key:'lights'|'casters',list:readonly T[],extra:(row:HTMLElement,item:T,i:number)=>void,fresh:()=>T)=>{
  list.forEach((item,i)=>{const row=form.section(box,key.slice(0,-1)+' '+(i+1));
   form.select(row,'From artwork type',[none,...types],item.type??none,v=>stageEdit('Edit '+key,s=>{const it=(s[key] as unknown as T[])[i];if(v===none)delete it.type;else{it.type=v;delete it.role;}}));
   form.text(row,'Or from rows whose role is',item.role??'',v=>stageEdit('Edit '+key,s=>{const it=(s[key] as unknown as T[])[i];if(v.trim()){it.role=v.trim();delete it.type;}else delete it.role;}));
   extra(row,item,i);
   form.button(row,'Remove '+key.slice(0,-1)+' '+(i+1),()=>stageEdit('Remove '+key,s=>{(s[key] as unknown as T[]).splice(i,1);if(!(s[key] as unknown as T[]).length)delete s[key];}));});
  form.button(box,'Add '+key.slice(0,-1),()=>stageEdit('Add '+key,s=>{((s[key]??=[]) as unknown as T[]).push(fresh());}),list.length>=16);
 };
 sourceRows<StageLightSource>(form.section(host,'Lights'),'lights',stage.lights??[],(row,item,i)=>{
  form.select(row,'Light style',['element','lamp','marker'],item.style,v=>stageEdit('Edit light',s=>{s.lights![i].style=v as StageLightSource['style'];}));
  if(item.style==='lamp')form.text(row,'Lamp colour (r,g,b)',item.color??'',v=>stageEdit('Edit light',s=>{if(v.trim())s.lights![i].color=v.trim();else delete s.lights![i].color;}));
 },()=>({type:types[0],style:'element'}));
 sourceRows<StageCasterSource>(form.section(host,'Shadow casters'),'casters',stage.casters??[],(row,item,i)=>{
  form.select(row,'Width from role',[none,...roles],item.widthRole??none,v=>stageEdit('Edit caster',s=>{if(v===none)delete s.casters![i].widthRole;else s.casters![i].widthRole=v;}));
 },()=>({type:types[0]}));
 // actors seen through a window, or culled with a counter
 const actors=form.section(host,'Actor visibility'),presentationRoles=Object.keys(d.presentation?.actors??{});
 (stage.actors?.clip??[]).forEach((c,i)=>{const row=form.section(actors,'Seen through '+c.to);
  form.select(row,'Actors (presentation role)',presentationRoles,c.actors,v=>stageEdit('Edit actor clip',s=>{s.actors!.clip![i].actors=v;}));
  form.select(row,'Window (artwork role)',roles,c.to,v=>stageEdit('Edit actor clip',s=>{s.actors!.clip![i].to=v;}));
  form.button(row,'Remove window rule '+(i+1),()=>stageEdit('Remove actor clip',s=>{s.actors!.clip!.splice(i,1);if(!s.actors!.clip!.length)delete s.actors!.clip;if(!Object.keys(s.actors!).length)delete s.actors;}));});
 form.button(actors,'Add window rule',()=>stageEdit('Add actor clip',s=>{((s.actors??={}).clip??=[]).push({actors:presentationRoles[0],to:roles[0]});}),!presentationRoles.length||!roles.length);
 (stage.actors?.cull??[]).forEach((c,i)=>{const row=form.section(actors,'Hidden with '+c.role);
  form.select(row,'Actor (presentation role)',presentationRoles,c.actor,v=>stageEdit('Edit actor cull',s=>{s.actors!.cull![i].actor=v;}));
  form.select(row,'When off screen (artwork role)',roles,c.role,v=>stageEdit('Edit actor cull',s=>{s.actors!.cull![i].role=v;}));
  form.decimal(row,'Margin (px)',c.margin??0,v=>stageEdit('Edit actor cull',s=>{s.actors!.cull![i].margin=v;}),0,2000);
  form.button(row,'Remove hide rule '+(i+1),()=>stageEdit('Remove actor cull',s=>{s.actors!.cull!.splice(i,1);if(!s.actors!.cull!.length)delete s.actors!.cull;if(!Object.keys(s.actors!).length)delete s.actors;}));});
 form.button(actors,'Add hide rule',()=>stageEdit('Add actor cull',s=>{((s.actors??={}).cull??=[]).push({actor:presentationRoles[0],role:roles[0]});}),!presentationRoles.length||!roles.length);
}
