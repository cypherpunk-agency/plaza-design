import {streetSpriteKinds,type StreetSpritePresentation} from '../art/characters/street-sprite';
import {DEPTH_BANDS,DEPTH_ORDER,depthOf,type DepthBand} from '../art/core/depth';
import {KIT_ACTS,kitFamily} from '../runtime/characters';
import {riderKinds,type RiderPresentation} from '../engine/gameplay/actor-presentation';
import type {Composition} from '../art';
import {manifestCompositionRows} from '../engine/gameplay/manifest-geometry';
import {actorBindingController} from '../engine/gameplay/native-actor-bindings';
import {actorRemovalImpact,duplicateSceneActor,removeSceneActor,setActorDialogue,bindSceneActor} from '../engine/gameplay/actor-content';
import {actorAxes,moveSceneActor,type ActorDefinition} from '../engine/gameplay/actors';
import type {Look,BotLook} from '../runtime/characters';
import {DISTRICT_PALETTES} from '../art/characters/people-style';
import type {SceneDocument} from '../engine/gameplay/scene-document';
import {TypedForm} from './typed-form';
/** Body controls write the same scene source consumed by native Game and preview. */
export function renderActor(form:TypedForm,host:HTMLElement,source:SceneDocument,index:number,edit:(label:string,fn:(d:SceneDocument)=>void)=>void,refresh:()=>void,entities?:{composition:Composition;transaction:(label:string,fn:(s:SceneDocument,c:Composition)=>void)=>void}){
 const a=source.actors![index],change=(label:string,fn:(a:ActorDefinition)=>void)=>edit(label,d=>fn(d.actors![index]));
 const note=document.createElement('p');note.className='muted';note.textContent='Artwork: '+a.instance+'; '+a.band+(a.target?'; interaction target: '+a.target:'')+'. Position and drawing order are edited in Layout. Interaction priority follows this actor list. Original IDs retain existing save bindings. Reaction identity: '+(a.reaction??'actor.'+a.id)+'.';host.append(note);
 form.button(host,'Actor earlier',()=>{edit('Move actor earlier',d=>moveSceneActor(d,a.id,-1));refresh();},index===0);form.button(host,'Actor later',()=>{edit('Move actor later',d=>moveSceneActor(d,a.id,1));refresh();},index===source.actors!.length-1);
 form.check(host,'Actor reaction identity override',a.reaction!==undefined,on=>{change('Set actor reaction identity',b=>{if(on)b.reaction='actor.'+b.id;else delete b.reaction;});refresh();});
 if(a.reaction!==undefined)form.text(host,'Actor reaction identity',a.reaction,reaction=>change('Edit actor reaction identity',b=>{b.reaction=reaction;}));
 if(entities){const rows=manifestCompositionRows(entities.composition),row=rows.find(r=>r.instance.id===a.instance)!,controller=actorBindingController(source.id)!;
  let newId=a.id+'-copy';for(let n=1;source.actors!.some(a=>a.id===newId);n++)newId=a.id+'-copy-'+n;
  form.text(host,'Duplicate actor ID',newId,value=>{newId=value;});form.button(host,'Duplicate actor',()=>{entities.transaction('Duplicate actor',(s,c)=>duplicateSceneActor(s,c,a.id,newId));refresh();},source.actors!.length>=128);
  const impact=actorRemovalImpact(source,entities.composition,a.id),removal=document.createElement('p');removal.className='muted';removal.textContent=[impact.content.length?'Also removes: '+impact.content.map(r=>r.group+'/'+r.id).join(', ')+'.':'',impact.attachments.length?'Keeps attached artwork in place: '+impact.attachments.join(', ')+'.':'',impact.followers.length?'Clear followers first: '+impact.followers.join(', ')+'.':'',impact.structural.length?'Rebind first: '+impact.structural.join(', ')+'.':''].filter(Boolean).join(' ');if(removal.textContent)host.append(removal);
  form.button(host,'Remove actor',()=>{entities.transaction('Remove actor',(s,c)=>removeSceneActor(s,c,a.id));refresh();},!!(impact.followers.length||impact.structural.length));
  const hasDialogue=!!source.people?.some(p=>p.id===a.target);form.check(host,'Actor has conversation',hasDialogue,on=>{entities.transaction('Set actor conversation',s=>setActorDialogue(s,a.id,on));refresh();});
  const placement=form.section(host,'Actor placement binding'),parent=row.instance.attach?.instance??'',targets=rows.filter(r=>r.instance.id!==a.instance&&r.instance.type!==controller.element).map(r=>r.instance.id),owner=rows.find(r=>r.instance.id===parent),anchors=owner?Object.keys(owner.element.anchors(owner.props,owner.state)):[];
  form.select(placement,'Actor placement parent',['',...targets],parent,value=>{const owner=rows.find(r=>r.instance.id===value),anchors=owner?Object.keys(owner.element.anchors(owner.props,owner.state)):[];entities.transaction('Bind actor placement',(s,c)=>bindSceneActor(s,c,a.id,value,anchors.includes('origin')?'origin':anchors[0]??'origin'));refresh();});
  if(parent)form.select(placement,'Actor placement anchor',anchors,row.instance.attach!.anchor,value=>{entities.transaction('Bind actor anchor',(s,c)=>bindSceneActor(s,c,a.id,parent,value,row.instance.placement.x,row.instance.placement.h));refresh();});
  for(const axis of ['x','h'] as const)form.decimal(placement,'Actor placement '+axis,row.instance.placement[axis],value=>{entities.transaction('Move actor placement',(s,c)=>bindSceneActor(s,c,a.id,parent,row.instance.attach?.anchor??'origin',axis==='x'?value:row.instance.placement.x,axis==='h'?value:row.instance.placement.h));},-10000,10000);
 }
 if(actorBindingController(source.id)?.element==='actor.prepared')form.select(host,'Actor presentation',['character','rider','streetSprite'],a.presentation?.kind??'character',value=>{change('Change actor presentation',b=>{if(value==='rider'||value==='streetSprite'){for(const key of ['look','seed','act','range','speed','follow','gap','parallax','key'] as const)delete b[key];b.presentation=value==='rider'?{kind:'rider',rider:'phone',phase:0}:{kind:'streetSprite',sprite:'hood'};}else{delete b.presentation;b.look={};}});refresh();});
 if(a.presentation?.kind==='streetSprite'){
  const r=a.presentation;form.select(host,'Street sprite appearance',[...streetSpriteKinds],r.sprite,v=>change('Edit street sprite',b=>{if(b.presentation?.kind==='streetSprite')b.presentation.sprite=v as StreetSpritePresentation['sprite'];}));form.check(host,'Street sprite face left',r.flip??false,on=>change('Edit street sprite facing',b=>{if(b.presentation?.kind==='streetSprite')b.presentation.flip=on;}));form.select(host,'Actor world participation',['world','background'],a.band,v=>change('Edit actor participation',b=>{b.band=v as ActorDefinition['band'];}));
  form.check(host,'Actor dimming override',a.dim!==undefined,on=>{change('Set actor dimming',b=>{if(on)b.dim=0;else delete b.dim;});refresh();});if(a.dim!==undefined)form.decimal(host,'Actor dimming',a.dim,v=>change('Edit actor dimming',b=>{b.dim=v;}),0,1);
  form.select(host,'Actor facing override',['automatic','left','right'],a.facing===-1?'left':a.facing===1?'right':'automatic',v=>change('Edit actor facing',b=>{if(v==='automatic')delete b.facing;else b.facing=v==='left'?-1:1;}));
  form.check(host,'Actor scheduled',!!a.when,on=>{change('Set actor schedule',b=>{if(on)b.when={from:'18:00',to:'06:00'};else delete b.when;});refresh();});if(a.when){form.text(host,'Actor schedule from',a.when.from,v=>change('Edit actor schedule',b=>{b.when!.from=v;}));form.text(host,'Actor schedule to',a.when.to,v=>change('Edit actor schedule',b=>{b.when!.to=v;}));form.text(host,'Actor schedule days',a.when.days?.join(', ')??'',v=>change('Edit actor schedule days',b=>{if(v.trim())b.when!.days=v.split(',').map(s=>{const v=s.trim();return v==='odd'||v==='even'?v:Number(v);});else delete b.when!.days;}));}return;
 }
 if(a.presentation?.kind==='rider'){
  const r=a.presentation,recipe=(label:string,fn:(p:RiderPresentation)=>void)=>change(label,b=>fn(b.presentation as RiderPresentation));
  form.select(host,'Rider appearance',[...riderKinds],r.rider,v=>recipe('Edit rider appearance',p=>{p.rider=v as RiderPresentation['rider'];}));
  form.check(host,'Rider seated',r.sit??false,on=>recipe('Edit rider seat',p=>{p.sit=on;}));form.check(host,'Rider face left',r.flip??false,on=>recipe('Edit rider facing',p=>{p.flip=on;}));form.decimal(host,'Rider clothing and animation phase',r.phase??0,v=>recipe('Edit rider phase',p=>{p.phase=v;}),0,1000000);
  form.check(host,'Named train passenger',r.regular??false,on=>{recipe('Edit rider regular',p=>{if(on){p.regular=true;}else delete p.regular;});refresh();});
  form.select(host,'Actor world participation',['world','background'],a.band,v=>change('Edit actor participation',b=>{b.band=v as ActorDefinition['band'];}));
  for(const [key,label,min,max,defaultValue] of [['ps','Rider pixel size',1,5,3],['dim','Rider dimming',0,1,0]] as const){form.check(host,label+' override',a[key]!==undefined,on=>{change('Set '+label,b=>{if(on)b[key]=defaultValue;else delete b[key];});refresh();});if(a[key]!==undefined)(key==='ps'?form.number.bind(form):form.decimal.bind(form))(host,label,a[key]!,v=>change('Edit '+label,b=>{b[key]=v;}),min,max);}
  form.check(host,'Actor scheduled',!!a.when,on=>{change('Set actor schedule',b=>{if(on)b.when={from:'18:00',to:'06:00'};else delete b.when;});refresh();});if(a.when){form.text(host,'Actor schedule from',a.when.from,v=>change('Edit actor schedule',b=>{b.when!.from=v;}));form.text(host,'Actor schedule to',a.when.to,v=>change('Edit actor schedule',b=>{b.when!.to=v;}));form.text(host,'Actor schedule days',a.when.days?.join(', ')??'',v=>change('Edit actor schedule days',b=>{if(v.trim())b.when!.days=v.split(',').map(s=>{const v=s.trim();return v==='odd'||v==='even'?v:Number(v);});else delete b.when!.days;}));}
  return;
 }
 const optionalNumber=(key:'seed'|'bakeSeed'|'speed'|'ps'|'dim'|'parallax'|'gap',name:string,fallback:number,min:number,max:number,integer=false)=>{form.check(host,'Actor '+name+' override',a[key]!==undefined,on=>{change('Set actor '+name,b=>{if(on)b[key]=fallback;else delete b[key];});refresh();});if(a[key]!==undefined)(integer?form.number.bind(form):form.decimal.bind(form))(host,'Actor '+name,a[key]!,v=>change('Edit actor '+name,b=>{b[key]=v;}),min,max);};
 optionalNumber('bakeSeed','appearance seed',a.seed??73,0,1000000,true);
 optionalNumber('seed','seed',73,0,1000000,true);optionalNumber('speed','speed',.25,0,100);
 // Depth band: one choice instead of pixel size, parallax and dimming; "custom" shows the three numbers.
 const depth=a.depth&&a.ps===undefined&&a.parallax===undefined&&a.dim===undefined?a.depth:depthOf(a);
 form.select(host,'Actor depth',[...DEPTH_ORDER,'custom'],depth,v=>{change('Change actor depth',b=>{const from=b.depth?DEPTH_BANDS[b.depth]:undefined,keep={ps:b.ps??from?.ps,parallax:b.parallax??from?.parallax,dim:b.dim??from?.dim};delete b.ps;delete b.parallax;delete b.dim;delete b.depth;
  if(v==='custom'){b.ps=keep.ps??3;b.parallax=keep.parallax??1;b.dim=keep.dim??0;}else if(v!=='play')b.depth=v as DepthBand;});refresh();});
 if(depth==='custom'){optionalNumber('ps','pixel size',3,1,5,true);optionalNumber('dim','dimming',0,0,1);optionalNumber('parallax','parallax',1,0,4);}
 else{const p=document.createElement('p');p.className='muted';const d=DEPTH_BANDS[depth];p.textContent=d.label+': '+d.note+' (pixel size '+d.ps+', parallax '+d.parallax+', dimming '+d.dim+').';host.append(p);}
 optionalNumber('gap','follow gap',30,0,10000);
 // The kit's real actions for this body first; a value a scene already uses stays selectable.
 const acts=[...new Set([...(KIT_ACTS[kitFamily(a.look)]??actorAxes.act),...(a.act?[a.act]:[])])];
 form.select(host,'Actor action',['',...acts],a.act??'',v=>change('Edit actor action',b=>{if(v)b.act=v as ActorDefinition['act'];else delete b.act;}));
 if(entities)form.select(host,'Actor world participation',['world','background'],a.band,v=>change('Edit actor participation',b=>{b.band=v as ActorDefinition['band'];}));
 form.select(host,'Actor facing',['automatic','left','right'],a.facing===-1?'left':a.facing===1?'right':'automatic',v=>change('Edit actor facing',b=>{if(v==='automatic')delete b.facing;else b.facing=v==='left'?-1:1;}));
 form.select(host,'Actor height',['automatic','artwork'],a.height??'automatic',v=>change('Edit actor height',b=>{if(v==='automatic')delete b.height;else b.height='artwork';}));
 form.select(host,'Actor leader',['',...source.actors!.filter((_,i)=>i!==index).map(a=>a.id)],a.follow??'',v=>change('Edit actor leader',b=>{if(v)b.follow=v;else delete b.follow;}));
 form.select(host,'Actor key emphasis',['automatic','yes','no'],a.key===undefined?'automatic':a.key?'yes':'no',v=>change('Edit actor emphasis',b=>{if(v==='automatic')delete b.key;else b.key=v==='yes';}));
 const mode=a.range===undefined?'none':Array.isArray(a.range)?'endpoints':'extent';
 form.select(host,'Actor travel range',['none','extent','endpoints'],mode,v=>{change('Edit actor range',b=>{if(v==='none')delete b.range;else b.range=v==='extent'?100:[0,100];});refresh();});
 if(typeof a.range==='number')form.decimal(host,'Actor travel extent',a.range,v=>change('Edit actor range',b=>{b.range=v;}),-10000,10000);
 if(Array.isArray(a.range))for(const i of [0,1])form.decimal(host,'Actor travel endpoint '+(i+1),a.range[i],v=>change('Edit actor range',b=>{(b.range as [number,number])[i]=v;}),-10000,10000);
 const family=typeof a.look==='string'?a.look:a.look&&'bot'in a.look?a.look.bot:'human';
 form.select(host,'Actor family',['human',...actorAxes.critter,...actorAxes.bot],family,v=>{change('Edit actor family',b=>{b.look=v==='human'?{}:v as ActorDefinition['look'];});refresh();});
 if(family==='human'){
  const look=(a.look??{}) as Look;
  form.select(host,'Actor colour style',['automatic',...actorAxes.style],look.style??'automatic',v=>change('Edit actor colour style',b=>{b.look??={};const l=b.look as Look;if(v==='automatic')delete l.style;else l.style=v as Look['style'];}));
  form.select(host,'Actor district palette',['',...Object.keys(DISTRICT_PALETTES)],look.district??'',v=>change('Edit actor district',b=>{b.look??={};const l=b.look as Look;if(v)l.district=v;else delete l.district;}));
  form.select(host,'Actor visible tech',['automatic','yes','no'],look.kitted===undefined?'automatic':look.kitted?'yes':'no',v=>change('Edit actor tech',b=>{b.look??={};const l=b.look as Look;if(v==='automatic')delete l.kitted;else l.kitted=v==='yes';}));
  form.check(host,'Actor seated',!!a.seated,on=>{change('Set actor seated',b=>{if(on)b.seated=true;else{delete b.seated;delete b.sitView;}});refresh();});
  if(a.seated)form.select(host,'Actor sitting pose',['mixed',...actorAxes.sitView],a.sitView??'mixed',v=>change('Edit actor sitting pose',b=>{if(v==='mixed')delete b.sitView;else b.sitView=v as ActorDefinition['sitView'];}));
  for(const k of ['archetype','body','hair','garb','facial'] as const)form.select(host,'Actor '+k,['',...actorAxes[k]],look[k]??'',v=>change('Edit actor '+k,b=>{b.look??={};const l=b.look as Look;if(v)l[k]=v as never;else delete l[k];}));
  for(const extra of actorAxes.extras)form.check(host,'Actor extra '+extra,look.extras?.includes(extra)??false,on=>change('Edit actor extras',b=>{b.look??={};const l=b.look as Look;const extras=new Set(l.extras??[]);if(on)extras.add(extra);else extras.delete(extra);if(extras.size)l.extras=[...extras];else delete l.extras;}));
  for(const k of ['skin','hairCol','top','bottom','acc'] as const)form.text(host,'Actor color '+k,look[k]??'',v=>change('Edit actor color',b=>{b.look??={};if(v)(b.look as Look)[k]=v;else delete(b.look as Look)[k];}));
 }else if((actorAxes.bot as readonly string[]).includes(family)){
  const look=typeof a.look==='object'?a.look as BotLook:undefined;
  const robot=(b:ActorDefinition)=>{if(typeof b.look==='string')b.look={bot:b.look as BotLook['bot']};return b.look as BotLook;};
  form.select(host,'Actor robot variant',['','0','1','2'],look?.v===undefined?'':String(look.v),v=>change('Edit robot variant',b=>{const l=robot(b);if(v)l.v=Number(v) as 0|1|2;else delete l.v;}));
  form.select(host,'Actor robot face',['',...actorAxes.face],look?.face??'',v=>change('Edit robot face',b=>{const l=robot(b);if(v)l.face=v as BotLook['face'];else delete l.face;}));
  for(const k of ['paint','trim','screen'] as const)form.text(host,'Actor robot color '+k,look?.[k]??'',v=>change('Edit robot color',b=>{const l=robot(b);if(v)l[k]=v;else delete l[k];}));
  form.check(host,'Actor robot wear override',look?.wear!==undefined,on=>{change('Set robot wear',b=>{const l=robot(b);if(on)l.wear=0;else delete l.wear;});refresh();});
  if(look?.wear!==undefined)form.decimal(host,'Actor robot wear',look.wear,v=>change('Edit robot wear',b=>{robot(b).wear=v;}),0,1);
 }
 form.check(host,'Actor scheduled',!!a.when,on=>{change('Set actor schedule',b=>{if(on)b.when={from:'18:00',to:'06:00'};else delete b.when;});refresh();});
 if(a.when){form.text(host,'Actor schedule from',a.when.from,v=>change('Edit actor schedule',b=>{b.when!.from=v;}));form.text(host,'Actor schedule to',a.when.to,v=>change('Edit actor schedule',b=>{b.when!.to=v;}));form.text(host,'Actor schedule days',a.when.days?.join(', ')??'',v=>change('Edit actor schedule days',b=>{if(v.trim())b.when!.days=v.split(',').map(s=>{const v=s.trim();return v==='odd'||v==='even'?v:Number(v);});else delete b.when!.days;}));}
}
