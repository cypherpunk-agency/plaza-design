/** World artwork documents. A zone's x/h is its origin in this backdrop's coordinates. */
import glide from './glide-coast.composition.json';
import {art,type Composition} from '../../art';
export const BACKDROP_SOURCES = {'glide-coast':{file:'world/backdrops/glide-coast.composition.json',composition:glide as unknown as Composition}};
export const backdropDocumentId = (id:string) => 'backdrop-'+id;
export interface SkyRegion {from:number;to:number;enter:number;leave:number;town:number}
export interface BackdropDocument extends Composition {width?:number;sky?:{horizon:number;style:'city'|'sunset';regions?:SkyRegion[]}}
export function validateBackdrop(value:unknown,id:string):BackdropDocument {
  const doc=art.validate(value);
  if(Object.keys(doc).some(k=>!['version','scene','instances','sky','width'].includes(k)))throw new Error('Unknown world backdrop field');
  if(doc.scene!==backdropDocumentId(id))throw new Error('Backdrop identity must be '+backdropDocumentId(id));
  const visit=(nodes:Composition['instances'])=>nodes.forEach(n=>{if(n.layer!=='distance'||Object.keys(n.bindings??{}).length)throw new Error('A world backdrop contains unbound distance artwork only');visit(n.children??[]);});visit(doc.instances);
  const width=(value as BackdropDocument).width;if(width!==undefined&&(!Number.isFinite(width)||width<=0||width>1e7))throw Error('Invalid backdrop width');
  const sky=(value as BackdropDocument).sky;
  if(sky!==undefined && (!sky||typeof sky!=='object'||Array.isArray(sky)||Object.keys(sky).some(k=>!['horizon','style','regions'].includes(k))||!Number.isFinite(sky.horizon)||!['city','sunset'].includes(sky.style)))throw new Error('Invalid backdrop sky');
  if(sky?.regions!==undefined&&(!Array.isArray(sky.regions)||sky.regions.length>16||sky.regions.some(r=>!r||Object.keys(r).some(k=>!['from','to','enter','leave','town'].includes(k))||!['from','to','enter','leave','town'].every(k=>Number.isFinite(r[k as keyof SkyRegion]))||r.from>=r.to||r.enter<0||r.leave<0||r.town<0||r.town>1)))throw new Error('Invalid backdrop sky regions');
  return doc as BackdropDocument;
}
/** Atmospheric regions are sampled in backdrop-world coordinates, so crossing a zone never changes them. */
export function backdropTown(doc:BackdropDocument|undefined,x:number){
  const smooth=(v:number)=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  return Math.max(0,...(doc?.sky?.regions??[]).map(r=>r.town*(r.enter?smooth((x-r.from)/r.enter):Number(x>=r.from))*(r.leave?smooth((r.to-x)/r.leave):Number(x<=r.to))));
}
export function backdropDocuments(pending?:ReadonlyMap<string,unknown>):ReadonlyMap<string,BackdropDocument>{
  return new Map(Object.entries(BACKDROP_SOURCES).map(([id,source])=>[id,(pending?.get(backdropDocumentId(id))??source.composition) as BackdropDocument]));
}
