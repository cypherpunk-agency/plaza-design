/** Pure manifest attachment projection; the Circuit owns motion and composition owns every anchor. */
import {art,resolveComposition,type Composition,type Resolved} from '../../art';
import {frameView} from '../../art/core/view';
import type {LevelSource} from '../level';
import {levelVehicleVisuals} from '../level-vehicles';
import type {SceneRules} from '../rules';
import type {SceneDocument} from './scene-document';
import {bindingDefaults} from './binding-sources';
import {manifestAnchor} from './manifest-geometry';
import {consistLevel} from '../../world/vehicles';
export const movingManifestGroups=['devices','uses','readables','rests','exits'] as const;
export type MovingManifestGroup=typeof movingManifestGroups[number];
type AttachmentOffset={dx:number;dh:number;floorH?:number};
export type AttachmentOffsets=Partial<Record<MovingManifestGroup,Readonly<Record<string,AttachmentOffset>>>>;
export function movingManifestGeometry(source:SceneDocument,composition:Composition,rows:readonly Resolved[],level:LevelSource|undefined):SceneRules['attachmentOffsets']{
 if(!level?.vehicles?.length)return;
 const byId=new Map(rows.map(r=>[r.instance.id,r])),parents=new Map(rows.flatMap(r=>(r.instance.children??[]).map(c=>[c.id,r.instance.id] as const)));
 const moving=(id:string):string|undefined=>{let at:string|undefined=id;for(let depth=0;at&&depth<64;depth++){const row=byId.get(at);if(!row)return;if(row.element.type==='vehicle.frame')return at;at=row.instance.attach?.instance??parents.get(at);}};
 const targets=movingManifestGroups.flatMap(group=>Object.entries(source.manifest?.[group]??{}).flatMap(([id,target])=>{const vehicle=moving(typeof target==='string'?target:target.instance);return vehicle?[{group,id,target,vehicle}]:[];}));
 if(!targets.length)return;
 const selected=[...new Set(targets.map(({target})=>typeof target==='string'?target:target.instance))];
 const decks=new Map(level.vehicles.map(v=>[v.id,consistLevel(v.source).floors]));
 const original=new Map(targets.map(({group,id,target,vehicle})=>{
  const point=manifestAnchor(byId.get(typeof target==='string'?target:target.instance)!,target),root=byId.get(vehicle)!.placement;
  const under=decks.get(vehicle)?.filter(f=>point.x>=root.x+f.x-.5&&point.x<=root.x+f.x+f.w+.5&&f.h+root.h<=point.h+2).map(f=>f.h+root.h)??[];
  return[group+':'+id,{...point,...(under.length?{floorH:Math.max(...under)}:{})}] as const;
 })),bindings=bindingDefaults(composition),view=frameView(0);
 return model=>{
  const current=new Map(resolveComposition(art,composition,{view,bindings,state:levelVehicleVisuals(model.peopleLevel??level,model),reduced:false},selected).map(r=>[r.instance.id,r]));
  const result:Partial<Record<MovingManifestGroup,Record<string,AttachmentOffset>>>={};
  for(const{group,id,target}of targets){const row=current.get(typeof target==='string'?target:target.instance)!,point=manifestAnchor(row,target),home=original.get(group+':'+id)!,dh=point.h-home.h;(result[group]??={})[id]={dx:point.x-home.x,dh,...(home.floorH!==undefined?{floorH:home.floorH+dh}:{})};}
  return result;
 };
}
