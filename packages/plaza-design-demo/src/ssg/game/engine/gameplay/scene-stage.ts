import type {Resolved} from '../../art/core/composition';
import type {SceneLight,Caster} from '../../art/atmosphere/lighting';
import type {SceneDef} from '../../scenes/kit';
import type {StageActorRules} from './binding-sources';
import {SCENE_MECHANISMS} from './scene-mechanisms';
/**
 * The stage: what a declared scene takes from its own artwork rather than from code
 * (docs/design/CIRCUIT-VOCABULARY.md is for devices; this is for rooms). Each entry names an
 * artwork role (manifest.artwork) or an artwork type, so moving the artwork in the editor moves
 * the light, the shade line or the facing with it.
 */
export interface StageLightSource {
 /** Rows of this artwork type, or rows whose `role` property is this. */
 type?:string;role?:string;
 /** `element`: the row's own light fields (kind, radius, width, height, color, alpha); `lamp`: a lamp as wide as the row, in `color`. */
 style:'element'|'lamp';color?:string;
}
export interface StageCasterSource {type?:string;role?:string;
 /** An artwork role whose `width` (scaled) every caster takes. */
 widthRole?:string}
export interface SceneStage {
 /** The direction the scene's light comes in from: an artwork role's `facing` property. */
 facing?:{role:string;prop?:string;fallback?:number};
 /** The sky's horizon height: an artwork role's `horizon` property (or `prop`). */
 horizon?:{role:string;prop?:string};
 /** Shade lines from walls: the top of a role's artwork (h + height), open before its x. */
 shade?:{front?:{role:string;gapFrom?:number}};
 lights?:StageLightSource[];
 casters?:StageCasterSource[];
 /** Actors seen through a window or culled with a counter (binding-sources.ts). */
 actors?:StageActorRules;
 /** Registered mechanisms the scene uses (scene-mechanisms.ts), by name. */
 mechanisms?:string[];
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const name=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,95}$/.test(v);
export function validateSceneStage(value:unknown):SceneStage{
 const fail=(why:string):never=>{throw new Error('Invalid scene stage: '+why);};
 if(!object(value))fail('expected an object');const s=value as Record<string,unknown>;
 if(Object.keys(s).some(k=>!['facing','horizon','shade','lights','casters','actors','mechanisms'].includes(k)))fail('unknown field');
 if(s.actors!==undefined){const a=s.actors as Record<string,unknown>;if(!object(a)||Object.keys(a).some(k=>k!=='clip'&&k!=='cull'))fail('actors');for(const c of (a.clip??[]) as Record<string,unknown>[])if(!object(c)||Object.keys(c).sort().join()!=='actors,to'||!name(c.actors)||!name(c.to))fail('actors clip');for(const c of (a.cull??[]) as Record<string,unknown>[])if(!object(c)||Object.keys(c).some(k=>!['actor','role','margin'].includes(k))||!name(c.actor)||!name(c.role)||c.margin!==undefined&&typeof c.margin!=='number')fail('actors cull');if(a.clip!==undefined&&!Array.isArray(a.clip)||a.cull!==undefined&&!Array.isArray(a.cull))fail('actors lists');}
 if(s.facing!==undefined){const f=s.facing as Record<string,unknown>;if(!object(f)||!name(f.role)||f.prop!==undefined&&!name(f.prop)||f.fallback!==undefined&&typeof f.fallback!=='number')fail('facing');}
 if(s.horizon!==undefined){const h=s.horizon as Record<string,unknown>;if(!object(h)||Object.keys(h).some(k=>k!=='role'&&k!=='prop')||!name(h.role)||h.prop!==undefined&&!name(h.prop))fail('horizon');}
 if(s.shade!==undefined){const sh=s.shade as Record<string,unknown>;if(!object(sh)||Object.keys(sh).some(k=>k!=='front'))fail('shade');const fr=sh.front as Record<string,unknown>|undefined;if(fr!==undefined&&(!object(fr)||!name(fr.role)||fr.gapFrom!==undefined&&typeof fr.gapFrom!=='number'))fail('shade front');}
 const sources=(list:unknown,what:string,keys:string[])=>{if(list===undefined)return;if(!Array.isArray(list)||list.length>16)fail(what);for(const l of list as unknown[]){const r=l as Record<string,unknown>;if(!object(r)||Object.keys(r).some(k=>!keys.includes(k))||(r.type===undefined)===(r.role===undefined)||r.type!==undefined&&!name(r.type)||r.role!==undefined&&!name(r.role))fail(what);}};
 if(s.mechanisms!==undefined&&(!Array.isArray(s.mechanisms)||new Set(s.mechanisms).size!==s.mechanisms.length||s.mechanisms.some(m=>typeof m!=='string'||!Object.prototype.hasOwnProperty.call(SCENE_MECHANISMS,m))))fail('mechanisms');
 sources(s.lights,'lights',['type','role','style','color']);
 for(const l of (s.lights as StageLightSource[]|undefined)??[])if(l.style!=='element'&&l.style!=='lamp'||l.color!==undefined&&typeof l.color!=='string')fail('light style');
 sources(s.casters,'casters',['type','role','widthRole']);
 return structuredClone(s) as SceneStage;
}
const pick=(rows:readonly Resolved[],src:{type?:string;role?:string})=>rows.filter(r=>src.type?r.instance.type===src.type:r.props.role===src.role);
/** What the stage gives the scene, from the artwork as placed. */
export function stageContent(stage:SceneStage|undefined,rows:readonly Resolved[],roles:Readonly<Record<string,Resolved>>):Pick<SceneDef,'facing'|'horizon'|'shade'|'lights'|'casters'>{
 if(!stage)return{};
 const out:Pick<SceneDef,'facing'|'horizon'|'shade'|'lights'|'casters'>={};
 if(stage.facing){const r=roles[stage.facing.role];out.facing=Number(r?.props[stage.facing.prop??'facing']??stage.facing.fallback??0);}
 if(stage.horizon){const r=roles[stage.horizon.role];if(r)out.horizon=Number(r.props[stage.horizon.prop??'horizon']);}
 const wall=stage.shade?.front?roles[stage.shade.front.role]:undefined;
 if(wall)out.shade={front:{h:wall.placement.h+Number(wall.props.height)*wall.placement.scale,gaps:[[stage.shade!.front!.gapFrom??-400,wall.placement.x]]}};
 if(stage.lights)out.lights=stage.lights.flatMap(src=>pick(rows,src).map((row):SceneLight=>{const p=row.props,at=row.placement;
  return src.style==='lamp'?{x:at.x,h:at.h,kind:'lamp',r:Number(p.width),col:src.color}:{x:at.x,h:at.h,kind:p.kind as SceneLight['kind'],r:Number(p.radius)*at.scale,...(Number(p.width)?{w:Number(p.width)*at.scale}:{}),...(Number(p.height)?{hh:Number(p.height)*at.scale}:{}),...(p.color?{col:String(p.color)}:{}),...(Number(p.alpha)>=0?{a:Number(p.alpha)}:{})};}));
 if(stage.casters)out.casters=stage.casters.flatMap(src=>{const width=src.widthRole?roles[src.widthRole]:undefined;if(src.widthRole&&!width)return[];return pick(rows,src).map((row):Caster=>({x:row.placement.x,h:row.placement.h,w:width?Number(width.props.width)*width.placement.scale:Number(row.props.width)*row.placement.scale}));});
 return out;
}
