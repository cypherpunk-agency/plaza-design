import type {Resolved,Value} from '../../art/core/composition';
import type {View} from '../../art/core/view';
import type {Character} from '../../runtime/characters';
import {screenLine} from '../../world/weather';
import {TICKER} from '../../art/signage/screens';
import type {EngineDraw} from '../host';
import type {SceneUse} from '../../scenes/kit';
import {presentationActor,presentationFlag,type ScenePresentation,type ScenePresentationActorRole,type ScenePresentationRole} from './scene-presentation';
import type {PresentationSignals} from './presentation-signals';
import type {GameplayDefinition,GameplayState,StateValues} from './types';
import {controllerPicture} from './controller-pictures';
import {atriumSnapshot} from './scene-atrium';
import {resolveValues,stateValue} from './state';
import type {SceneDocument} from './scene-document';
/**
 * Scene values (scene.json `stage.values`): the numbers, flags and small structures a scene's artwork
 * asks for, each declared as data and worked out once per frame. A composition binds `scene.<name>`;
 * nothing in the scene's code computes it. A value is a literal or an object that says where it comes from:
 *
 * - `{flag}` / `{use}`: a presentation flag role is set / an interaction is available now.
 * - `{not}`, `{all}`, `{any}`, `{sum}`, `{list}` and `{if, then, else}`: combine other values.
 * - `{state}`: a saved gameplay value the scene's gameplay declares (its own, or a world-level owner's it opts
 *   into, such as the shift's `shift.*`): the save's value, or its declared default.
 * - `{role, get}`: a geometry of an artwork role (manifest.artwork): `x`, `h`, `width` (scaled), `height`
 *   (scaled), `top` (h + height), `right` (x + width), or `prop:<name>`. A role the scene does not place reads 0.
 * - `{instance, get}`: the same geometry of one artwork instance of the composition, by its id (for scenes with no
 *   registered artwork roles: move the artwork and the value follows).
 * - `{rows, get}`: `x` or `h` of every row of an artwork type, in order.
 * - `{visible: {role, margin, from?, width?}}`: whether that role's artwork is on screen (within `margin` px).
 * - `{actor: {role|id, get, fallback?}}`: `x`, `h` or `bare` (the actor has no look of its own) of a presentation actor.
 * - `{picture}`: a field of the picture the scene's controller prepares (controller-pictures.ts); only while an engine frame paints.
 * - `{engine: 'hover'}`, `{signal}` (a presentation cue stamp), `{world}` (`nightFall`, `ticker`), `{shared: {mechanism, field}}`
 *   (a picture a mechanism keeps), `{atrium: true}` (the stage's atrium layout), and `{live: value}`
 *   (only while an engine frame paints; otherwise the artwork's own default stands).
 */
export type RoleGet='x'|'h'|'width'|'height'|'top'|'right'|`prop:${string}`;
export type ValueExpr=null|boolean|number|string
 |{flag:ScenePresentationRole}|{use:string}|{state:string}
 |{not:ValueExpr}|{all:ValueExpr[]}|{any:ValueExpr[]}|{if:ValueExpr;then:ValueExpr;else:ValueExpr}|{sum:ValueExpr[]}|{list:ValueExpr[]}
 |{role:string;get:RoleGet}|{instance:string;get:RoleGet}|{rows:string;get:'x'|'h'}
 |{visible:{role:string;margin?:number;from?:number;width?:number}}
 |{actor:{role?:ScenePresentationActorRole;id?:string;get:'x'|'h'|'bare';fallback?:number}}
 |{picture:string}|{engine:'hover'}|{signal:string}|{world:'nightFall'|'ticker'}|{shared:{mechanism:string;field:string}}|{atrium:true}|{live:ValueExpr};
export type SceneValues=Readonly<Record<string,ValueExpr>>;
/** What a value can read. The binding context of a frame is one; a flag-only caller (the carried item) passes just the flags. */
export interface ValueEnv {
 presentation?:ScenePresentation|null;flags:Readonly<Record<string,boolean>>;
 /** The save's gameplay values (Save.gameplay); absent (the editor), declared defaults stand. */
 values?:Readonly<StateValues>;
 uses?:readonly SceneUse[];roles?:Readonly<Record<string,Resolved>>;rows?:readonly Resolved[];view?:View;
 actors?:Readonly<Record<string,Character>>;engine?:EngineDraw;gameplay?:GameplayDefinition;signals?:PresentationSignals;
 shared?:ReadonlyMap<string,unknown>;source?:SceneDocument;
 /** Work done once per frame and kept for the rest of it (the controller's picture). */
 memo?:Map<string,unknown>;
}
export const VALUE_KINDS=['flag','use','not','all','any','sum','list','visible','actor','picture','engine','signal','world','shared','atrium','live','state'] as const;
export const ROLE_GETS=['x','h','width','height','top','right'] as const;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
export const valueName=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,95}$/.test(v);
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
/** Checks one value as written in scene.json; `fail` throws with the reason. */
export function validateValue(v:unknown,fail:(why:string)=>never,depth=0):void{
 if(depth>8)return fail('values nest at most 8 deep');
 if(v===null||typeof v==='boolean'||finite(v))return;
 if(typeof v==='string'){if(v.length>200)fail('text is at most 200 characters');return;}
 if(!object(v))return fail('a value is a literal or an object');
 const keys=Object.keys(v).sort().join(),sub=(c:unknown)=>validateValue(c,fail,depth+1);
 if(keys==='get,role'){if(!valueName(v.role)||!((ROLE_GETS as readonly string[]).includes(String(v.get))||/^prop:[a-zA-Z0-9_.-]{1,64}$/.test(String(v.get))))fail('role takes a role name and get '+ROLE_GETS.join(', ')+' or prop:<name>');return;}
 if(keys==='get,instance'){if(!valueName(v.instance)||!((ROLE_GETS as readonly string[]).includes(String(v.get))||/^prop:[a-zA-Z0-9_.-]{1,64}$/.test(String(v.get))))fail('instance takes an artwork instance id and get '+ROLE_GETS.join(', ')+' or prop:<name>');return;}
 if(keys==='get,rows'){if(!valueName(v.rows)||v.get!=='x'&&v.get!=='h')fail('rows takes an artwork type and get x or h');return;}
 if(keys==='else,if,then'){sub(v.if);sub(v.then);sub(v.else);return;}
 if(Object.keys(v).length!==1||!(VALUE_KINDS as readonly string[]).includes(Object.keys(v)[0]))return fail('a value object is one of '+VALUE_KINDS.join(', ')+', role+get, instance+get, rows+get or if+then+else');
 const kind=Object.keys(v)[0] as typeof VALUE_KINDS[number],a=v[kind];
 const fields=(allowed:string[],required:string[])=>{if(!object(a)||Object.keys(a).some(k=>!allowed.includes(k))||required.some(k=>!(k in a)))fail(kind+' fields');return a as Record<string,unknown>;};
 switch(kind){
  case 'flag':case 'use':case 'picture':case 'signal':case 'state':if(!valueName(a))fail(kind+' takes a name');break;
  case 'not':case 'live':sub(a);break;
  case 'all':case 'any':case 'sum':case 'list':if(!Array.isArray(a)||a.length>32)fail(kind+' takes a list of at most 32');else a.forEach(sub);break;
  case 'visible':{const o=fields(['role','margin','from','width'],['role']);if(!valueName(o.role)||[o.margin,o.from,o.width].some(n=>n!==undefined&&!finite(n)))fail('visible');break;}
  case 'actor':{const o=fields(['role','id','get','fallback'],['get']);if((o.role===undefined)===(o.id===undefined)||o.role!==undefined&&!valueName(o.role)||o.id!==undefined&&!valueName(o.id)||!['x','h','bare'].includes(String(o.get))||o.fallback!==undefined&&!finite(o.fallback))fail('actor takes role or id, and get x, h or bare');break;}
  case 'engine':if(a!=='hover')fail('engine takes hover');break;
  case 'world':if(a!=='nightFall'&&a!=='ticker')fail('world takes nightFall or ticker');break;
  case 'shared':{const o=fields(['mechanism','field'],['mechanism','field']);if(!valueName(o.mechanism)||!valueName(o.field))fail('shared');break;}
  case 'atrium':if(a!==true)fail('atrium takes true');break;
 }
}
export function validateSceneValues(values:unknown,fail:(why:string)=>never):void{
 if(!object(values)||Object.keys(values).length>128)return fail('values are an object of at most 128 entries');
 for(const[name,v]of Object.entries(values)){if(!valueName(name))fail('value name '+name);validateValue(v,fail);}
}
/** Every name the values refer to, for checks against the scene (flag roles, uses, artwork roles, actor roles, picture fields, signals). */
export interface ValueReferences {flags:string[];uses:string[];roles:string[];instances:string[];states:string[];rowTypes:string[];actorRoles:string[];pictures:string[];signals:string[];shared:{mechanism:string;field:string}[];atrium:boolean}
export function valueReferences(values:SceneValues|undefined):ValueReferences{
 const out:ValueReferences={flags:[],uses:[],roles:[],instances:[],states:[],rowTypes:[],actorRoles:[],pictures:[],signals:[],shared:[],atrium:false};
 const walk=(v:ValueExpr):void=>{
  if(!object(v))return;
  if('if' in v){walk(v.if);walk(v.then);walk(v.else);return;}
  if('role' in v&&'get' in v){out.roles.push(v.role);return;}
  if('instance' in v&&'get' in v){out.instances.push(v.instance);return;}
  if('rows' in v&&'get' in v){out.rowTypes.push(v.rows);return;}
  if('flag' in v)out.flags.push(v.flag);else if('use' in v)out.uses.push(v.use);else if('state' in v)out.states.push(v.state);
  else if('not' in v)walk(v.not);else if('live' in v)walk(v.live);
  else if('all' in v)v.all.forEach(walk);else if('any' in v)v.any.forEach(walk);else if('sum' in v)v.sum.forEach(walk);else if('list' in v)v.list.forEach(walk);
  else if('visible' in v)out.roles.push(v.visible.role);
  else if('actor' in v){if(v.actor.role)out.actorRoles.push(v.actor.role);}
  else if('picture' in v)out.pictures.push(v.picture);
  else if('signal' in v)out.signals.push(v.signal);
  else if('shared' in v)out.shared.push(v.shared);
  else if('atrium' in v)out.atrium=true;
 };
 for(const v of Object.values(values??{}))walk(v);
 return out;
}
/** The presentation signals (name, starting stamp) the scene's values read: the targets its cues may name. */
export const valueSignals=(values:SceneValues|undefined)=>Object.fromEntries([...new Set(valueReferences(values).signals)].map(s=>[s,-1e9])) as Record<string,number>;
const SKIP=Symbol('skip');
/** What availability and `state` values read: the save's flags and values with the declarations' defaults, worked out once per frame. */
function gameplayState(env:ValueEnv):GameplayState{
 const memo=env.memo??(env.memo=new Map<string,unknown>());
 if(!memo.has('gameplay:state')){const state:GameplayState={flags:env.flags as Record<string,boolean>,items:{},tokens:0,values:env.values as StateValues|undefined};memo.set('gameplay:state',env.gameplay?{...state,values:resolveValues(env.gameplay,state)}:state);}
 return memo.get('gameplay:state') as GameplayState;
}
function roleGet(row:Resolved|undefined,get:string):number{
 if(!row)return 0;
 const p=row.placement;
 if(get==='x')return p.x;if(get==='h')return p.h;
 if(get==='width')return Number(row.props.width)*p.scale;if(get==='height')return Number(row.props.height)*p.scale;
 if(get==='top')return p.h+Number(row.props.height)*p.scale;if(get==='right')return p.x+Number(row.props.width)*p.scale*p.facing;
 return Number(row.props[get.slice(5)]);
}
/** The camera as the pixel grid sees it: whole pixels, as the beach always measured what is in view. */
const snapped=(view:View)=>{const cam=-view.sx(0);return(wx:number,par=1)=>Math.round(wx-cam*par);};
/**
 * One value for this frame, or `undefined` when the artwork's own default should stand (a live value with no
 * engine frame, a picture field the controller does not prepare).
 */
export function evaluateValue(v:ValueExpr,env:ValueEnv):Value|undefined{
 const r=evaluate(v,env);return r===SKIP?undefined:r;
}
function evaluate(v:ValueExpr,env:ValueEnv):Value|undefined|typeof SKIP{
 if(!object(v))return v as Value;
 const ev=(c:ValueExpr)=>{const r=evaluate(c,env);return r===SKIP?undefined:r;};
 if('if' in v)return ev(v.if)?ev(v.then):ev(v.else);
 if('role' in v&&'get' in v)return roleGet(env.roles?.[v.role],v.get);
 if('instance' in v&&'get' in v)return roleGet(env.rows?.find(r=>r.instance.id===v.instance),v.get);
 if('rows' in v&&'get' in v){const g=v.get;return(env.rows??[]).filter(r=>r.instance.type===v.rows).map(r=>g==='x'?r.placement.x:r.placement.h);}
 if('flag' in v)return presentationFlag(env.presentation,env.flags,v.flag);
 if('use' in v){const use=env.uses?.find(u=>u.id===v.use);return use?!use.available||use.available(env.flags,gameplayState(env)):SKIP;}
 if('state' in v)return stateValue(gameplayState(env).values,v.state,env.gameplay)??null;
 if('not' in v)return !ev(v.not);
 if('all' in v)return v.all.every(c=>!!ev(c));
 if('any' in v)return v.any.some(c=>!!ev(c));
 if('sum' in v)return v.sum.reduce<number>((s,c)=>s+Number(ev(c)),0);
 if('list' in v)return v.list.map(c=>ev(c) as Value);
 if('visible' in v){
  const o=v.visible,row=env.roles?.[o.role],view=env.view;if(!row||!view)return false;
  const sx=snapped(view),p=row.placement,m=o.margin??0;
  // the artwork's own extent (its scaled width), or a window of `width` starting `from` px from its origin
  const left=sx(p.x)+(o.from??0),right=o.width===undefined?sx(p.x+Number(row.props.width)*p.scale):left+o.width;
  return !(right<-m||left>view.viewW+m);
 }
 if('actor' in v){
  const o=v.actor,id=o.id??presentationActor(env.presentation,o.role!),actor=id?env.actors?.[id]:undefined;
  if(o.get==='bare')return !!actor&&actor.look===undefined;
  if(o.get==='x')return actor?.x??o.fallback??0;
  return actor?(actor.h??o.fallback??0):0;
 }
 if('picture' in v){const f=controllerPicture(env)?.[v.picture];return f===undefined?SKIP:f;}
 if('engine' in v)return env.engine?.hover??'';
 if('signal' in v)return env.signals?env.signals.read(v.signal):-1e9;
 if('world' in v){
  if(v.world==='ticker')return TICKER.map(l=>l==='WEATHER'?screenLine(undefined,env.view?.weatherSource):l).join('   ·   ');
  const l=env.view?.lighting;if(!l)return SKIP;return Math.min(1,l.night*.9+(1-l.daylight)*.1);
 }
 if('shared' in v){
  const o=v.shared,source=env.shared?.get(o.mechanism) as {visual?:(engine:EngineDraw,view:View)=>Record<string,Value>}|undefined;
  if(!env.engine||!env.view||!source?.visual)return SKIP;
  const memo=env.memo??(env.memo=new Map<string,unknown>()),key='shared:'+o.mechanism;
  if(!memo.has(key))memo.set(key,source.visual(env.engine,env.view));
  const r=(memo.get(key) as Record<string,Value>)[o.field];return r===undefined?SKIP:r;
 }
 if('atrium' in v){const a=env.source?.stage?.atrium;return a&&env.view&&env.roles?atriumSnapshot(env.view,env.roles,env.rows??[],env.source!,a):SKIP;}
 if('live' in v)return env.engine?evaluate(v.live,env):SKIP;
 return SKIP;
}
