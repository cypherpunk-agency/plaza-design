import {renderSettingsAuthoring} from './render-settings-authoring';
import type {ResolvedRenderSettings} from '../world/render-settings';
import {environmentArtworkOwners,type SceneEnvironment} from '../engine/gameplay/scene-environment';
import type {TypedForm} from './typed-form';
import {BACKDROP_SOURCES} from '../world/backdrops';
/** Registered artwork may derive these values; explicit source overrides are optional. */
export function renderSceneEnvironment(form:TypedForm,host:HTMLElement,value:SceneEnvironment|undefined,edit:(label:string,change:(environment:SceneEnvironment)=>void)=>void,refresh:()=>void,scene?:string,effective?:ResolvedRenderSettings,openSource?:(source:import('../world/render-settings').RenderSource)=>void){
 renderSettingsAuthoring(form,host,value?.rendering,settings=>{edit('Edit chunk rendering',e=>{if(settings)e.rendering=settings;else delete e.rendering;});refresh();},effective,'Chunk rendering',openSource);
 const owners=scene?environmentArtworkOwners[scene]:undefined;for(const [key,owner]of Object.entries(owners??{})){const note=document.createElement('p');note.textContent=key+' follows Layout: '+owner;host.append(note);}
 const env=value??{},change=(fn:(e:SceneEnvironment)=>void)=>edit('Edit scene environment',fn);
 const backdropIds=Object.keys(BACKDROP_SOURCES);
 form.select(host,'World backdrop',['',...backdropIds],env.backdrop?.id??'',id=>{change(e=>{if(id)e.backdrop={id,x:e.backdrop?.x??0,h:e.backdrop?.h??0};else delete e.backdrop;});refresh();});
 if(env.backdrop){for(const key of ['x','h'] as const)form.decimal(host,'Zone origin in backdrop · '+key,env.backdrop[key]??0,v=>change(e=>{e.backdrop![key]=v;}),-1e9,1e9);}
 for(const key of ['facing','horizon'] as const){if((key==='facing'||key==='horizon')&&owners?.[key])continue;form.check(host,'Override '+key,env[key]!==undefined,on=>{change(e=>{if(on)e[key]=key==='facing'?180:0;else delete e[key];});refresh();});if(env[key]!==undefined)form.decimal(host,'Environment '+key,env[key]!,v=>change(e=>{e[key]=v;}),key==='facing'?0:-10000,key==='facing'?360:10000);}
 for(const key of ['outdoor','keepFace'] as const){form.check(host,'Override '+key,env[key]!==undefined,on=>{change(e=>{if(on)e[key]=false;else delete e[key];});refresh();});if(env[key]!==undefined)form.check(host,'Environment '+key,env[key]!,v=>change(e=>{e[key]=v;}));}
 form.check(host,'Override ambient settings',env.ambient!==undefined,on=>{change(e=>{if(on)e.ambient={};else delete e.ambient;});refresh();});
 if(env.ambient){const box=form.section(host,'Ambient settings');for(const key of ['sky','city','street','weather'] as const)form.check(box,'Ambient '+key,env.ambient[key]??false,on=>change(e=>{e.ambient![key]=on;}));
  if(!owners?.covers){(env.ambient.covers??[]).forEach((cover,i)=>{const row=form.section(box,'Weather cover '+(i+1));for(const key of ['from','to','under'] as const)form.decimal(row,'Weather cover '+(i+1)+' '+key,cover[key],v=>change(e=>{e.ambient!.covers![i][key]=v;}),-10000,10000);form.button(row,'Remove weather cover '+(i+1),()=>{change(e=>{e.ambient!.covers!.splice(i,1);});refresh();});});
  form.button(box,'Add weather cover',()=>{change(e=>{(e.ambient!.covers??=[]).push({from:0,to:100,under:80});});refresh();},(env.ambient.covers?.length??0)>=64);}
 }
 if(owners?.shade)return;form.check(host,'Override street shade',env.shade!==undefined,on=>{change(e=>{if(on)e.shade={};else delete e.shade;});refresh();});
 if(env.shade){const box=form.section(host,'Street shade');form.check(box,'Override shade depth',env.shade.depth!==undefined,on=>{change(e=>{if(on)e.shade!.depth=100;else delete e.shade!.depth;});refresh();});if(env.shade.depth!==undefined)form.decimal(box,'Shade depth',env.shade.depth,v=>change(e=>{e.shade!.depth=v;}),0,10000);
  for(const side of ['front','back'] as const){form.check(box,'Shade '+side+' enabled',env.shade[side]!==undefined,on=>{change(e=>{if(on)e.shade![side]={h:100};else delete e.shade![side];});refresh();});const data=env.shade[side];if(!data)continue;const row=form.section(box,'Shade '+side);form.decimal(row,'Shade '+side+' height',data.h,v=>change(e=>{e.shade![side]!.h=v;}),0,10000);
   (data.gaps??[]).forEach((gap,i)=>{const g=form.section(row,'Gap '+(i+1));for(const[n,key]of ['from','to'].entries())form.decimal(g,'Shade '+side+' gap '+(i+1)+' '+key,gap[n],v=>change(e=>{e.shade![side]!.gaps![i][n]=v;}),-10000,10000);form.button(g,'Remove '+side+' gap '+(i+1),()=>{change(e=>{e.shade![side]!.gaps!.splice(i,1);});refresh();});});
   form.button(row,'Add '+side+' gap',()=>{change(e=>{(e.shade![side]!.gaps??=[]).push([0,100]);});refresh();},(data.gaps?.length??0)>=64);
  }
 }
}
