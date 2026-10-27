import {skyTown,type SkyRegion} from '../../art/environment/sky-element';
export type {SkyRegion} from '../../art/environment/sky-element';
/** World artwork documents. A zone's x/h is its origin in this backdrop's coordinates. */
import glide from './glide-coast.composition.json';
import {art,type ChunkDocument} from '../../art';
export const BACKDROP_SOURCES = {'glide-coast':{file:'world/backdrops/glide-coast.composition.json',composition:glide as unknown as ChunkDocument}};
export const backdropDocumentId = (id:string) => 'backdrop-'+id;
export interface BackdropDocument extends ChunkDocument {width?:number}
export function validateBackdrop(value:unknown,id:string):BackdropDocument {
  const doc=art.validate(value);
  if(Object.keys(doc).some(k=>!['version','scene','instances','width'].includes(k)))throw new Error('Unknown world backdrop field');
  if(doc.scene!==backdropDocumentId(id))throw new Error('Backdrop identity must be '+backdropDocumentId(id));
  const visit=(nodes:ChunkDocument['instances'])=>nodes.forEach(n=>{if(n.layer!=='distance'||Object.keys(n.bindings??{}).length)throw new Error('A world backdrop contains unbound distance artwork only');visit(n.children??[]);});visit(doc.instances);
  const width=(value as BackdropDocument).width;if(width!==undefined&&(!Number.isFinite(width)||width<=0||width>1e7))throw Error('Invalid backdrop width');
  return doc as BackdropDocument;
}
/** Atmospheric regions are sampled in backdrop-world coordinates, so crossing a zone never changes them. */
export function backdropTown(doc:BackdropDocument|undefined,x:number){
  return skyTown((doc?.instances.find(n=>n.type==='environment.sky')?.props.regions??[]) as unknown as SkyRegion[],x);
}
export function backdropDocuments(pending?:ReadonlyMap<string,unknown>):ReadonlyMap<string,BackdropDocument>{
  return new Map(Object.entries(BACKDROP_SOURCES).map(([id,source])=>[id,(pending?.get(backdropDocumentId(id))??source.composition) as BackdropDocument]));
}
