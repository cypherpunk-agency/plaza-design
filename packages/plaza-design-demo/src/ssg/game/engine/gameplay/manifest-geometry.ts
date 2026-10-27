import {resolveArtworkRoles} from './artwork-roles';
import {art,resolveComposition,type ChunkDocument,type Resolved} from '../../art';
import {frameView} from '../../art/core/view';
import type {SceneDocument} from './scene-document';
import {compileLevel} from '../level';
import {manifestGroups,targetInstance,type ManifestTarget,type ManifestGroup,type DeviceManifestTarget} from './manifest-contract';
export interface BoundPoint {row:Resolved;x:number;h:number;promptH?:number;responseH?:number}
/** The same registered anchor math for validated source and live moving attachments. */
export function manifestAnchor(row:Resolved,target:ManifestTarget){const t=typeof target==='string'?{instance:target}:target,p=row.placement,a=t.anchor?row.element.anchors(row.props,row.state)[t.anchor]:{x:0,h:0};if(!a)throw new Error('Missing manifest anchor: '+t.instance+'/'+t.anchor);return{x:p.x+(a.x+(t.x??0))*p.scale*p.facing,h:p.h+(a.h+(t.h??0))*p.scale};}
export function resolveManifestPoint(rows:readonly Resolved[],target:ManifestTarget,width:number,ground=false,transformed=false):BoundPoint{const row=rows.find(r=>r.instance.id===targetInstance(target));if(!row)throw new Error('Missing manifest artwork: '+targetInstance(target));const pRow=row,p=pRow.placement,t=typeof target==='string'?{instance:target}:target;
  const {x,h}=manifestAnchor(row,target);
  if(p.parallax!==1||!transformed&&(p.scale!==1||p.facing!==1))throw new Error('Interactive bindings require unit scale, normal depth and facing');
  if(!Number.isFinite(x)||!Number.isFinite(h)||x<12||x>width-12||h<0||h>10000||ground&&h!==0)throw new Error('Manifest point outside scene bounds: '+t.instance);
  const promptH=t.promptH===undefined||t.promptAboveFloor&&h===0?undefined:h+t.promptH,responseH=t.responseH===undefined||t.responseAboveFloor&&h===0?undefined:h+t.responseH;
  if([promptH,responseH].some(v=>v!==undefined&&(!Number.isFinite(v)||v<0||v>10000)))throw new Error('Manifest text height outside scene bounds');
  return{row,x,h,...(promptH!==undefined?{promptH}:{}),...(responseH!==undefined?{responseH}:{})};
}
/** Device extents and offset properties are finite authored references, never expressions. */
export function resolveDevicePoint(rows:readonly Resolved[],target:DeviceManifestTarget,width:number){
 const ref=typeof target==='string'?{instance:target}:target,row=rows.find(r=>r.instance.id===ref.instance);if(!row)throw Error('Missing device artwork: '+ref.instance);
 const property=(key:'widthProperty'|'heightProperty'|'heightOffsetProperty')=>{const name=typeof target==='string'?undefined:target[key];if(name===undefined)return undefined;const value=row.props[name];if(typeof value!=='number'||!Number.isFinite(value)||key!=='heightOffsetProperty'&&value<=0)throw Error('Device artwork property must be '+(key==='heightOffsetProperty'?'finite':'positive')+': '+name);const scaled=value*row.placement.scale;if(!Number.isFinite(scaled)||Math.abs(scaled)>10000)throw Error('Device artwork property outside bounds: '+name);return scaled;};
 const offset=property('heightOffsetProperty')??0,point=resolveManifestPoint(rows,{...ref,h:(ref.h??0)+offset/row.placement.scale},width,false,true);
 return{...point,width:property('widthProperty'),height:property('heightProperty')};
}
/** Resolve registered anchors and authored offsets; no scripts, property expressions or scene callbacks. */
export function manifestGeometry(scene:SceneDocument,rows:readonly Resolved[],groups:readonly ManifestGroup[]=manifestGroups,options:{groundExits?:boolean;groundSpawn?:boolean;transformedExits?:boolean}={}){
 const manifest=scene.manifest;if(!manifest)throw new Error('Scene requires a manifest');
 const get=(id:string)=>{const row=rows.find(r=>r.instance.id===id);if(!row)throw new Error('Missing manifest artwork: '+id);return row;};
 const width=typeof manifest.width==='number'?manifest.width:get(manifest.width.instance).props[manifest.width.property];
 if(typeof width!=='number'||!Number.isFinite(width)||width<240||width>10000)throw new Error('Manifest width must resolve to a scene width');
 const point=(target:ManifestTarget,ground=false,transformed=false)=>resolveManifestPoint(rows,target,width,ground,transformed);
 const bindings:Partial<Record<ManifestGroup,Record<string,BoundPoint>>>={};
 for(const group of groups){const authored=scene[group]??[],map=manifest[group]??{};
  if(Object.keys(map).sort().join()!==authored.map(r=>r.id).sort().join())throw new Error('Manifest must bind every '+group+' entry exactly once');
  for(const target of Object.values(map))if(typeof target!=='string'&&((group==='people'&&(target.promptH!==undefined||target.responseH!==undefined))||((group==='exits'||group==='rests')&&target.responseH!==undefined)))throw new Error('Unsupported text-height binding for '+group);
  bindings[group]=Object.fromEntries(authored.map(r=>[r.id,point(map[r.id],group==='exits'&&options.groundExits!==false,group==='exits'&&!!options.transformedExits)]));
 }
 for(const target of Object.values(manifest.devices??{}))resolveDevicePoint(rows,target,width);
 if(typeof manifest.spawn!=='string'&&(manifest.spawn.promptH!==undefined||manifest.spawn.responseH!==undefined))throw new Error('Spawn has no text height');
 const exitCheckpoints=Object.fromEntries(Object.entries(manifest.exitCheckpoints??{}).map(([id,target])=>{if(!scene.exits?.some(e=>e.id===id))throw Error('Exit checkpoint refers to absent exit: '+id);return[id,point(target)];}));
  // a ground spawn stands on the street, or on a level floor at its height (the game arrives there: SceneDef.spawnH, levelArrive)
 const spawn=point(manifest.spawn);if(options.groundSpawn!==false&&spawn.h!==0&&!onLevelFloor(rows,spawn.x,spawn.h))throw new Error('Manifest point outside scene bounds: spawn stands at height '+spawn.h+' with no level floor under it ('+targetInstance(manifest.spawn)+')');
 return{exitCheckpoints,artwork:resolveArtworkRoles(scene.id,manifest.artwork,rows,width),width,spawn:spawn.x,bindings:bindings as Record<ManifestGroup,Record<string,BoundPoint>>};
}
/** A level floor (engine/level.ts compileLevel) under this point, within the level's own 2-unit tolerance. */
export function onLevelFloor(rows:readonly Resolved[],x:number,h:number){return!!compileLevel(rows)?.floors.some(f=>Math.abs(f.h-h)<=2&&x>=f.x-0.5&&x<=f.x+f.w+0.5);}
/** Geometry-only preview: registered visual defaults resolve bindings without stepping controllers. */
export function manifestCompositionRows(composition:ChunkDocument){
 const bindings:Record<string,import('../../art').Value>={};
 const visit=(nodes:ChunkDocument['instances'])=>{for(const node of nodes){for(const[field,source]of Object.entries(node.bindings??{})){const definition=art.get(node.type).visualFields?.[field];if(!definition)throw new Error('Unknown manifest visual field: '+node.id+'/'+field);bindings[source]=definition.default;}visit(node.children??[]);}};
 visit(composition.instances);return resolveComposition(art,composition,{view:frameView(0),state:{},bindings,reduced:false});
}
