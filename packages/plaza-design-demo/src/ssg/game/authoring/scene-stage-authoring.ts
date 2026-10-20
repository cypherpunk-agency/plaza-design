import type {SceneDocument} from '../engine/gameplay/scene-document';
import type {SceneStage,StageLightSource,StageCasterSource} from '../engine/gameplay/scene-stage';
import {manifestGroups,MANIFEST_COMPILE_FLAGS,type ManifestGroup} from '../engine/gameplay/manifest-contract';
import {SCENE_MECHANISMS} from '../engine/gameplay/scene-mechanisms';
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
 // registered mechanisms (scene-mechanisms.ts): a mechanism needs its artwork roles named under Content & bindings
 const mechanisms=form.section(host,'Mechanisms');
 for(const[name,mechanism]of Object.entries(SCENE_MECHANISMS))form.check(mechanisms,mechanism.label+(mechanism.requires.length?' (needs '+mechanism.requires.join(', ')+')':''),(stage.mechanisms??[]).includes(name),on=>stageEdit('Edit scene mechanism',s=>{const list=new Set(s.mechanisms??[]);if(on)list.add(name);else list.delete(name);if(list.size)s.mechanisms=Object.keys(SCENE_MECHANISMS).filter(k=>list.has(k));else delete s.mechanisms;}));
 // facing and shade from roles
 const room=form.section(host,'From artwork');
 form.select(room,'Facing from role',[none,...roles],stage.facing?.role??none,v=>stageEdit('Edit facing role',s=>{if(v===none)delete s.facing;else s.facing={...(s.facing??{}),role:v};}));
 if(stage.facing){form.text(room,'Facing property',stage.facing.prop??'facing',v=>stageEdit('Edit facing property',s=>{if(v.trim()&&v!=='facing')s.facing!.prop=v.trim();else delete s.facing!.prop;}));form.decimal(room,'Facing when the role is missing',stage.facing.fallback??0,v=>stageEdit('Edit facing fallback',s=>{s.facing!.fallback=v;}),0,360);}
 form.select(room,'Horizon from role',[none,...roles],stage.horizon?.role??none,v=>stageEdit('Edit horizon role',s=>{if(v===none)delete s.horizon;else s.horizon={role:v};}));
 form.select(room,'Front shade from role',[none,...roles],stage.shade?.front?.role??none,v=>stageEdit('Edit front shade',s=>{if(v===none)delete s.shade;else s.shade={front:{...(s.shade?.front??{}),role:v}};}));
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
  form.select(row,'Light style',['element','lamp'],item.style,v=>stageEdit('Edit light',s=>{const l=s.lights![i];l.style=v as 'element'|'lamp';if(v==='element'){delete l.centre;delete l.lift;delete l.radius;delete l.tint;}}));
  if(item.style==='lamp'){
   form.text(row,'Lamp colour (r,g,b)',item.color??'',v=>stageEdit('Edit light',s=>{if(v.trim())s.lights![i].color=v.trim();else delete s.lights![i].color;}));
   form.check(row,'Lamp hangs over the middle of the row',!!item.centre,on=>stageEdit('Edit light',s=>{if(on)s.lights![i].centre=true;else delete s.lights![i].centre;}));
   form.decimal(row,'Lamp height above the row',item.lift??0,v=>stageEdit('Edit light',s=>{if(v)s.lights![i].lift=v;else delete s.lights![i].lift;}),-1000,1000);
   form.decimal(row,'Lamp radius (0 = the row width)',item.radius??0,v=>stageEdit('Edit light',s=>{if(v>0)s.lights![i].radius=v;else delete s.lights![i].radius;}),0,2000);
   form.text(row,'Colour by row property',item.tint?.prop??'',v=>stageEdit('Edit light',s=>{const l=s.lights![i];if(v.trim())l.tint={...(l.tint??{}),prop:v.trim()};else delete l.tint;}));
   if(item.tint){
    form.text(row,'No light when the property is',item.tint.without??'',v=>stageEdit('Edit light',s=>{const t=s.lights![i].tint!;if(v.trim())t.without=v.trim();else delete t.without;}));
    form.text(row,'Colours by value (value=r,g,b; …)',Object.entries(item.tint.tints??{}).map(([k,c])=>k+'='+c).join('; '),v=>stageEdit('Edit light',s=>{const t=s.lights![i].tint!,pairs=v.split(';').map(p=>p.trim()).filter(Boolean).map(p=>[p.slice(0,p.indexOf('=')).trim(),p.slice(p.indexOf('=')+1).trim()] as const).filter(([k,c])=>k&&c);if(pairs.length)t.tints=Object.fromEntries(pairs);else delete t.tints;}));
   }
  }
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
