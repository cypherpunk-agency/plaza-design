import type {SceneDocument} from '../engine/gameplay/scene-document';
import type {SceneStage} from '../engine/gameplay/scene-stage';
import {scenePresentationRoles} from '../engine/gameplay/scene-presentation';
import {allPictureFields} from '../engine/gameplay/controller-pictures';
import {ROLE_GETS,VALUE_KINDS,type ValueExpr} from '../engine/gameplay/scene-values';
import type {TypedForm} from './typed-form';
type StageEdit=(label:string,change:(s:SceneStage)=>void)=>void;
type Path=(string|number)[];
type Obj=Record<string,unknown>;
const isObject=(v:unknown):v is Obj=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** The editor's name for the kind of a value: a literal, or the discriminating key(s). */
export function valueKindOf(v:ValueExpr):string{
 if(!isObject(v))return 'literal';
 if('if' in v)return 'if';if('role' in v)return 'role';if('rows' in v)return 'rows';
 return Object.keys(v)[0];
}
const KIND_NAMES=['literal',...VALUE_KINDS.slice(0,6),'if','role','rows',...VALUE_KINDS.slice(6)];
const at=(root:unknown,path:Path)=>path.reduce<unknown>((o,k)=>(o as Obj)[k as string],root);
const put=(root:unknown,path:Path,v:unknown)=>{(at(root,path.slice(0,-1)) as Obj)[String(path.at(-1))]=v;};
const literal=(text:string):ValueExpr=>{const t=text.trim();if(t==='true')return true;if(t==='false')return false;if(t==='null')return null;if(t!==''&&Number.isFinite(Number(t)))return Number(t);return text;};
/**
 * Scene › Stage & compile › Values: what the artwork asks for (`scene.<name>` bindings), each declared as data
 * (scene-values.ts) and edited with typed controls: a kind, then the fields of that kind, with nested values
 * for combinations. Also the atrium's roles and the actor rules `held` and `hide`, which use the same values.
 */
export function renderSceneValues(form:TypedForm,host:HTMLElement,d:SceneDocument,stageEdit:StageEdit,types:readonly string[]){
 const stage=d.stage??{},roles=Object.keys(d.manifest?.artwork??{}),none='(none)';
 const flagRoles=[...new Set([...(d.presentation?scenePresentationRoles[d.presentation.kind]:[]) as readonly string[],...Object.keys(d.presentation?.flags??{})])];
 const uses=d.uses.map(u=>u.id),actorRoles=Object.keys(d.presentation?.actors??{});
 const first=(l:readonly string[],fallback='')=>l[0]??fallback;
 const fresh=(kind:string):ValueExpr=>{switch(kind){
  case 'literal':return false;case 'flag':return{flag:first(flagRoles) as never};case 'use':return{use:first(uses)};
  case 'not':return{not:false};case 'all':return{all:[]};case 'any':return{any:[]};case 'sum':return{sum:[]};case 'list':return{list:[]};
  case 'if':return{if:false,then:false,else:false};case 'role':return{role:first(roles),get:'x'};case 'rows':return{rows:first(types),get:'x'};
  case 'visible':return{visible:{role:first(roles)}};case 'actor':return{actor:{role:first(actorRoles) as never,get:'x'}};
  case 'picture':return{picture:first(allPictureFields)};case 'engine':return{engine:'hover'};case 'signal':return{signal:'signal'};
  case 'world':return{world:'ticker'};case 'shared':return{shared:{mechanism:'',field:''}};case 'atrium':return{atrium:true};default:return{live:false};}};
 const set=(label:string,path:Path,v:unknown)=>stageEdit(label,s=>put(s,path,v));
 /** One value and, below it, the values it combines. */
 const node=(box:HTMLElement,v:ValueExpr,path:Path,title:string)=>{
  const row=form.section(box,title+' · '+valueKindOf(v)),kind=valueKindOf(v),o=(isObject(v)?v:{}) as Obj;
  form.select(row,title+' kind',KIND_NAMES,kind,k=>set('Change value kind',path,fresh(k)));
  const child=(sub:Path,value:ValueExpr,name:string)=>node(row,value,[...path,...sub],name);
  const list=(key:'all'|'any'|'sum'|'list')=>{(o[key] as ValueExpr[]).forEach((c,i)=>{child([key,i],c,title+' '+(i+1));form.button(row,'Remove '+title+' '+(i+1),()=>stageEdit('Remove value part',s=>{(at(s,[...path,key]) as unknown[]).splice(i,1);}));});form.button(row,'Add to '+title,()=>stageEdit('Add value part',s=>{(at(s,[...path,key]) as unknown[]).push(false);}),(o[key] as unknown[]).length>=32);};
  const pick=(label:string,list:readonly string[],value:string,sub:Path,wrap:(x:string)=>unknown)=>form.select(row,title+' '+label,list.includes(value)?list:[...list,value],value,x=>set('Edit value',[...path,...sub],wrap(x)));
  if(kind==='literal')form.text(row,title+' literal (true, false, null, a number or text)',v===null?'null':String(v),x=>set('Edit value',path,literal(x)));
  else if(kind==='flag')form.select(row,title+' flag role',flagRoles.includes(String(o.flag))?flagRoles:[...flagRoles,String(o.flag)],String(o.flag),x=>set('Edit value',path,{flag:x}));
  else if(kind==='use')form.select(row,title+' interaction',uses.includes(String(o.use))?uses:[...uses,String(o.use)],String(o.use),x=>set('Edit value',path,{use:x}));
  else if(kind==='not')child(['not'],o.not as ValueExpr,'Not');
  else if(kind==='live')child(['live'],o.live as ValueExpr,'While painting');
  else if(kind==='all'||kind==='any'||kind==='sum'||kind==='list')list(kind);
  else if(kind==='if'){child(['if'],o.if as ValueExpr,'If');child(['then'],o.then as ValueExpr,'Then');child(['else'],o.else as ValueExpr,'Else');}
  else if(kind==='role'){form.select(row,title+' artwork role',roles.includes(String(o.role))?roles:[...roles,String(o.role)],String(o.role),x=>set('Edit value',path,{...o,role:x}));
   const gets=[...ROLE_GETS,'prop:'],g=String(o.get),plain=(ROLE_GETS as readonly string[]).includes(g);
   form.select(row,title+' geometry',gets,plain?g:'prop:',x=>set('Edit value',path,{...o,get:x}));
   if(!plain)form.text(row,title+' property name',g.slice(5),x=>set('Edit value',path,{...o,get:'prop:'+x.trim()}));}
  else if(kind==='rows'){form.select(row,title+' artwork type',types.includes(String(o.rows))?types:[...types,String(o.rows)],String(o.rows),x=>set('Edit value',path,{...o,rows:x}));form.select(row,title+' of each row',['x','h'],String(o.get),x=>set('Edit value',path,{...o,get:x}));}
  else if(kind==='visible'){const a=o.visible as Obj;
   form.select(row,title+' artwork role',roles.includes(String(a.role))?roles:[...roles,String(a.role)],String(a.role),x=>set('Edit value',[...path,'visible'],{...a,role:x}));
   form.decimal(row,title+' margin (px)',Number(a.margin??0),x=>set('Edit value',[...path,'visible'],{...a,margin:x}),-5000,5000);
   form.check(row,title+' looks at a window of its own width',a.width!==undefined,on=>set('Edit value',[...path,'visible'],on?{...a,from:0,width:100}:{role:a.role,...(a.margin!==undefined?{margin:a.margin}:{})}));
   if(a.width!==undefined){form.decimal(row,title+' window starts (px from the artwork)',Number(a.from??0),x=>set('Edit value',[...path,'visible'],{...a,from:x}),-5000,5000);form.decimal(row,title+' window width (px)',Number(a.width),x=>set('Edit value',[...path,'visible'],{...a,width:x}),0,5000);}}
  else if(kind==='actor'){const a=o.actor as Obj;
   form.select(row,title+' actor role',actorRoles.includes(String(a.role))?actorRoles:[...actorRoles,String(a.role)],String(a.role),x=>set('Edit value',[...path,'actor'],{...a,role:x}));
   form.select(row,title+' actor reading',['x','h','bare'],String(a.get),x=>set('Edit value',[...path,'actor'],{...a,get:x}));
   form.decimal(row,title+' reading when the actor has none',Number(a.fallback??0),x=>set('Edit value',[...path,'actor'],{...a,fallback:x}),-100000,100000);}
  else if(kind==='picture')pick('controller picture field',allPictureFields,String(o.picture),['picture'],x=>x);
  else if(kind==='signal')form.text(row,title+' presentation signal',String(o.signal),x=>set('Edit value',path,{signal:x.trim()}));
  else if(kind==='engine')form.select(row,title+' engine reading',['hover'],'hover',()=>undefined);
  else if(kind==='world')form.select(row,title+' world reading',['ticker','nightFall'],String(o.world),x=>set('Edit value',path,{world:x}));
  else if(kind==='shared'){const a=o.shared as Obj;form.select(row,title+' mechanism',[...new Set(['',...(d.stage?.mechanisms??[]),String(a.mechanism)])],String(a.mechanism),x=>set('Edit value',[...path,'shared'],{...a,mechanism:x}));form.text(row,title+' field the mechanism keeps',String(a.field),x=>set('Edit value',[...path,'shared'],{...a,field:x.trim()}));}
 };
 // the values themselves
 const values=form.section(host,'Values (bind scene.<name>)');
 Object.entries(stage.values??{}).forEach(([name,v])=>{
  const box=form.section(values,'Value '+name);
  form.text(box,'Value '+name+' name',name,x=>stageEdit('Rename value',s=>{const n=x.trim();if(!n||n===name)return;if(s.values![n]!==undefined)throw new Error('The scene already declares the value '+n);s.values=Object.fromEntries(Object.entries(s.values!).map(([k,val])=>[k===name?n:k,val]));}));
  node(box,v,['values',name],'Value '+name);
  form.button(box,'Remove value '+name,()=>stageEdit('Remove value',s=>{delete s.values![name];if(!Object.keys(s.values!).length)delete s.values;}));
 });
 form.button(values,'Add value',()=>stageEdit('Add value',s=>{const values=(s.values??={}) as Record<string,ValueExpr>;let i=1;while(('value'+i) in values)i++;values['value'+i]=false;}),Object.keys(stage.values??{}).length>=128);
 // the atrium
 const atrium=form.section(host,'Atrium');
 form.check(atrium,'Scene has an atrium (far, gallery and riders actors stand on it)',stage.atrium!==undefined,on=>stageEdit('Edit atrium',s=>{if(on)s.atrium={room:first(roles),escalator:first(roles)};else delete s.atrium;}));
 if(stage.atrium){
  form.select(atrium,'Atrium room (artwork role)',roles,stage.atrium.room,x=>stageEdit('Edit atrium',s=>{s.atrium!.room=x;}));
  form.select(atrium,'Atrium escalator (artwork role)',roles,stage.atrium.escalator,x=>stageEdit('Edit atrium',s=>{s.atrium!.escalator=x;}));
 }
 // actors painted by the artwork that holds them, and actors hidden while a value holds
 const actors=form.section(host,'Held and hidden actors');
 (stage.actors?.held??[]).forEach((h,i)=>{const row=form.section(actors,'Held by '+(h.type??h.instance));
  form.select(row,'Held by (artwork type, or none)',[none,...types],h.type??none,x=>stageEdit('Edit held actors',s=>{const it=s.actors!.held![i];if(x===none){delete it.type;it.instance??='';}else{it.type=x;delete it.instance;}}));
  form.text(row,'Or by the artwork instance',h.instance??'',x=>stageEdit('Edit held actors',s=>{const it=s.actors!.held![i];if(x.trim()){it.instance=x.trim();delete it.type;}else delete it.instance;}));
  form.text(row,'Only when attached at anchor (blank: any)',h.anchor??'',x=>stageEdit('Edit held actors',s=>{if(x.trim())s.actors!.held![i].anchor=x.trim();else delete s.actors!.held![i].anchor;}));
  form.button(row,'Remove held rule '+(i+1),()=>stageEdit('Remove held actors',s=>{s.actors!.held!.splice(i,1);if(!s.actors!.held!.length)delete s.actors!.held;if(!Object.keys(s.actors!).length)delete s.actors;}));});
 form.button(actors,'Add held rule',()=>stageEdit('Add held actors',s=>{((s.actors??={}).held??=[]).push({type:first(types),anchor:'origin'});}),!types.length);
 (stage.actors?.hide??[]).forEach((h,i)=>{const row=form.section(actors,'Hidden: '+h.actors);
  form.select(row,'Hidden actors (presentation role)',actorRoles.includes(h.actors)?actorRoles:[...actorRoles,h.actors],h.actors,x=>stageEdit('Edit hidden actors',s=>{s.actors!.hide![i].actors=x;}));
  node(row,h.when,['actors','hide',i,'when'],'Hidden while');
  form.button(row,'Remove hide rule '+(i+1)+' (values)',()=>stageEdit('Remove hidden actors',s=>{s.actors!.hide!.splice(i,1);if(!s.actors!.hide!.length)delete s.actors!.hide;if(!Object.keys(s.actors!).length)delete s.actors;}));});
 form.button(actors,'Add hide rule (values)',()=>stageEdit('Add hidden actors',s=>{((s.actors??={}).hide??=[]).push({actors:first(actorRoles),when:true});}),!actorRoles.length);
}
