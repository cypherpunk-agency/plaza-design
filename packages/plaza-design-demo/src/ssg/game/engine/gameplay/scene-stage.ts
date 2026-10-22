import type {Resolved} from '../../art/core/composition';
import type {SceneLight,Caster} from '../../art/atmosphere/lighting';
import type {SceneDef} from '../../scenes/kit';
import type {StageActorRules} from './binding-sources';
import {SCENE_MECHANISMS} from './scene-mechanisms';
import {validateSceneValues,validateValue,type ValueExpr} from './scene-values';
import type {SceneAtrium} from './scene-atrium';
/**
 * The stage: what a declared scene takes from its own artwork rather than from code
 * (docs/design/CIRCUIT-VOCABULARY.md is for devices; this is for rooms). Each entry names an
 * artwork role (manifest.artwork) or an artwork type, so moving the artwork in the editor moves
 * the light, the shade line or the facing with it.
 */
export interface StageLightSource {
 /** Rows of this artwork type, or rows whose `role` property is this. */
 type?:string;role?:string;
 /** `element`: the row's own light fields (kind, radius, width, height or lightHeight, color, alpha; an alpha of 1 is left out); `lamp`: a lamp as wide as the row, in `color`; `marker`: a marker row's `kind`, `r`, `color` and, for a window, `width` and `lightHeight`. */
 style:'element'|'lamp'|'marker';color?:string;
 /** Lamp only: the lamp hangs over the middle of the row (its `width`) instead of at its start. */
 centre?:boolean;
 /** Lamp only: the lamp's height above the row's base, and its radius (default: the row's `width`). */
 lift?:number;radius?:number;
 /** Lamp only: the row's property `prop` picks the colour from `tints` (else `color`); rows whose property is `without` give no light. */
 tint?:{prop:string;without?:string;tints?:Record<string,string>};
}
export interface StageCasterSource {type?:string;role?:string;
 /** An artwork role whose `width` (scaled) every caster takes. */
 widthRole?:string}
export interface SceneStage {
 /** The direction the scene's light comes in from: an artwork role's `facing` property. */
 facing?:{role:string;prop?:string;fallback?:number};
 /** The horizon line: an artwork role's height, or its property `prop` (e.g. `horizon`) when named. */
 horizon?:{role:string;prop?:string};
 /** Shade lines from walls: the top of a role's artwork (h + height), open before its x. */
 shade?:{front?:{role:string;gapFrom?:number};back?:{role:string;gaps:string}};
 lights?:StageLightSource[];
 casters?:StageCasterSource[];
 /** Actors seen through a window or culled with a counter (binding-sources.ts). */
 actors?:StageActorRules;
 /** Registered mechanisms the scene uses (scene-mechanisms.ts), by name. */
 mechanisms?:string[];
 /** Artwork roles an engine target (scene.nativeTargets) may anchor to; each is bound where its artwork stands. */
 targetAnchors?:string[];
 /** What the artwork asks for, as data: composition bindings `scene.<name>` (scene-values.ts). */
 values?:Record<string,ValueExpr>;
 /** The deck's `reset <this scene> --yes` starts the scene over (its part of the save only): `label` names it ("the back yard"), `confirm` is what the deck says before `--yes`, `done` what it says after. */
 resettable?:{label:string;confirm:string;done:string};
 /** The scene exists only under sudo: it is never resumed otherwise and its reset is not offered. */
 sudoOnly?:boolean;
 /** The atrium's two artwork roles: the storeys, gallery slab and escalator its `far`, `gallery` and `riders` actors stand on (scene-atrium.ts). */
 atrium?:SceneAtrium;
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const name=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,95}$/.test(v);
export function validateSceneStage(value:unknown):SceneStage{
 const fail=(why:string):never=>{throw new Error('Invalid scene stage: '+why);};
 if(!object(value))fail('expected an object');const s=value as Record<string,unknown>;
 if(Object.keys(s).some(k=>!['facing','horizon','shade','lights','casters','actors','mechanisms','targetAnchors','values','atrium','resettable','sudoOnly'].includes(k)))fail('unknown field');
 if(s.actors!==undefined){const a=s.actors as Record<string,unknown>;if(!object(a)||Object.keys(a).some(k=>!['clip','cull','held','hide'].includes(k)))fail('actors');for(const h of (a.held??[]) as Record<string,unknown>[])if(!object(h)||Object.keys(h).some(k=>!['type','instance','anchor'].includes(k))||(h.type===undefined)===(h.instance===undefined)||h.type!==undefined&&!name(h.type)||h.instance!==undefined&&!name(h.instance)||h.anchor!==undefined&&!name(h.anchor))fail('actors held');for(const h of (a.hide??[]) as Record<string,unknown>[]){if(!object(h)||Object.keys(h).sort().join()!=='actors,when'||!name(h.actors))fail('actors hide');validateValue(h.when,fail);}if(a.held!==undefined&&!Array.isArray(a.held)||a.hide!==undefined&&!Array.isArray(a.hide))fail('actors lists');for(const c of (a.clip??[]) as Record<string,unknown>[])if(!object(c)||Object.keys(c).sort().join()!=='actors,to'||!name(c.actors)||!name(c.to))fail('actors clip');for(const c of (a.cull??[]) as Record<string,unknown>[])if(!object(c)||Object.keys(c).some(k=>!['actor','role','margin'].includes(k))||!name(c.actor)||!name(c.role)||c.margin!==undefined&&typeof c.margin!=='number')fail('actors cull');if(a.clip!==undefined&&!Array.isArray(a.clip)||a.cull!==undefined&&!Array.isArray(a.cull))fail('actors lists');}
 if(s.facing!==undefined){const f=s.facing as Record<string,unknown>;if(!object(f)||!name(f.role)||f.prop!==undefined&&!name(f.prop)||f.fallback!==undefined&&typeof f.fallback!=='number')fail('facing');}
 if(s.horizon!==undefined){const h=s.horizon as Record<string,unknown>;if(!object(h)||Object.keys(h).some(k=>k!=='role'&&k!=='prop')||!name(h.role)||h.prop!==undefined&&!name(h.prop))fail('horizon');}
 if(s.shade!==undefined){const sh=s.shade as Record<string,unknown>;if(!object(sh)||Object.keys(sh).some(k=>k!=='front'&&k!=='back'))fail('shade');const bk=sh.back as Record<string,unknown>|undefined;if(bk!==undefined&&(!object(bk)||Object.keys(bk).sort().join()!=='gaps,role'||!name(bk.role)||!name(bk.gaps)))fail('shade back');const fr=sh.front as Record<string,unknown>|undefined;if(fr!==undefined&&(!object(fr)||!name(fr.role)||fr.gapFrom!==undefined&&typeof fr.gapFrom!=='number'))fail('shade front');}
 if(s.values!==undefined)validateSceneValues(s.values,fail);
 if(s.sudoOnly!==undefined&&s.sudoOnly!==true)fail('sudoOnly is true when present');
 if(s.resettable!==undefined){const r=s.resettable as Record<string,unknown>;if(!object(r)||Object.keys(r).sort().join()!=='confirm,done,label'||['label','confirm','done'].some(k=>typeof r[k]!=='string'||!(r[k] as string).trim()||(r[k] as string).length>400))fail('resettable needs label, confirm and done text');}
 if(s.atrium!==undefined){const a=s.atrium as Record<string,unknown>;if(!object(a)||Object.keys(a).sort().join()!=='escalator,room'||!name(a.room)||!name(a.escalator))fail('atrium');}
 if(s.targetAnchors!==undefined&&(!Array.isArray(s.targetAnchors)||s.targetAnchors.length>16||s.targetAnchors.some(a=>!name(a))||new Set(s.targetAnchors).size!==s.targetAnchors.length))fail('targetAnchors');
 const sources=(list:unknown,what:string,keys:string[])=>{if(list===undefined)return;if(!Array.isArray(list)||list.length>16)fail(what);for(const l of list as unknown[]){const r=l as Record<string,unknown>;if(!object(r)||Object.keys(r).some(k=>!keys.includes(k))||(r.type===undefined)===(r.role===undefined)||r.type!==undefined&&!name(r.type)||r.role!==undefined&&!name(r.role))fail(what);}};
 if(s.mechanisms!==undefined&&(!Array.isArray(s.mechanisms)||new Set(s.mechanisms).size!==s.mechanisms.length||s.mechanisms.some(m=>typeof m!=='string'||!Object.prototype.hasOwnProperty.call(SCENE_MECHANISMS,m))))fail('mechanisms');
 sources(s.lights,'lights',['type','role','style','color','centre','lift','radius','tint']);
 for(const l of (s.lights as StageLightSource[]|undefined)??[]){if(!['element','lamp','marker'].includes(l.style)||l.color!==undefined&&typeof l.color!=='string')fail('light style');
  if(l.centre!==undefined&&typeof l.centre!=='boolean'||[l.lift,l.radius].some(n=>n!==undefined&&(typeof n!=='number'||!Number.isFinite(n)))||l.radius!==undefined&&l.radius<0)fail('light placement');
  if((l.centre!==undefined||l.lift!==undefined||l.radius!==undefined||l.tint!==undefined)&&l.style!=='lamp')fail('light fields need the lamp style');
  if(l.tint!==undefined){const t=l.tint as unknown as Record<string,unknown>;if(!object(t)||Object.keys(t).some(k=>!['prop','without','tints'].includes(k))||!name(t.prop)||t.without!==undefined&&typeof t.without!=='string'||t.tints!==undefined&&(!object(t.tints)||Object.values(t.tints).some(v=>typeof v!=='string')))fail('light tint');}}
 sources(s.casters,'casters',['type','role','widthRole']);
 return structuredClone(s) as SceneStage;
}
const pick=(rows:readonly Resolved[],src:{type?:string;role?:string})=>rows.filter(r=>src.type?r.instance.type===src.type:r.props.role===src.role);
/** What the stage gives the scene, from the artwork as placed. */
export function stageContent(stage:SceneStage|undefined,rows:readonly Resolved[],roles:Readonly<Record<string,Resolved>>):Pick<SceneDef,'facing'|'horizon'|'shade'|'lights'|'casters'|'resettable'|'sudoOnly'>{
 if(!stage)return{};
 const out:Pick<SceneDef,'facing'|'horizon'|'shade'|'lights'|'casters'|'resettable'|'sudoOnly'>={};
 if(stage.resettable)out.resettable={...stage.resettable};
 if(stage.sudoOnly)out.sudoOnly=true;
 if(stage.facing){const r=roles[stage.facing.role];out.facing=Number(r?.props[stage.facing.prop??'facing']??stage.facing.fallback??0);}
 if(stage.horizon){const r=roles[stage.horizon.role];if(r)out.horizon=stage.horizon.prop?Number(r.props[stage.horizon.prop]):r.placement.h;}
 const wall=stage.shade?.front?roles[stage.shade.front.role]:undefined;
 if(wall)out.shade={front:{h:wall.placement.h+Number(wall.props.height)*wall.placement.scale,gaps:[[stage.shade!.front!.gapFrom??-400,wall.placement.x]]}};
 const back=stage.shade?.back?roles[stage.shade.back.role]:undefined;
 if(back)out.shade={...out.shade,back:{h:back.placement.h,gaps:rows.filter(r=>r.props.role===stage.shade!.back!.gaps).map(r=>[r.placement.x,r.placement.x+Number(r.props.width)] as [number,number])}};
 if(stage.lights)out.lights=stage.lights.flatMap(src=>pick(rows,src).filter(row=>src.tint?.without===undefined||String(row.props[src.tint.prop])!==src.tint.without).map((row):SceneLight=>{const p=row.props,at=row.placement;
  if(src.style==='marker')return{x:at.x,h:at.h,kind:p.kind as SceneLight['kind'],r:Number(p.r),...(p.color?{col:String(p.color)}:{}),...(Number(p.width)?{w:Number(p.width),hh:Number(p.lightHeight)}:{})};
  return src.style==='lamp'?{x:at.x+(src.centre?Number(p.width)*at.scale/2:0),h:at.h+(src.lift??0),kind:'lamp',r:src.radius??Number(p.width),col:src.tint?.tints?.[String(p[src.tint.prop])]??src.color}:{x:at.x,h:at.h,kind:p.kind as SceneLight['kind'],r:Number(p.radius)*at.scale,...(Number(p.width)?{w:Number(p.width)*at.scale}:{}),...(Number(p.height??p.lightHeight)?{hh:Number(p.height??p.lightHeight)*at.scale}:{}),...(p.color?{col:String(p.color)}:{}),...(Number(p.alpha)>=0&&Number(p.alpha)!==1?{a:Number(p.alpha)}:{})};}));
 if(stage.casters)out.casters=stage.casters.flatMap(src=>{const width=src.widthRole?roles[src.widthRole]:undefined;if(src.widthRole&&!width)return[];return pick(rows,src).map((row):Caster=>({x:row.placement.x,h:row.placement.h,w:width?Number(width.props.width)*width.placement.scale:Number(row.props.width)*row.placement.scale}));});
 return out;
}
