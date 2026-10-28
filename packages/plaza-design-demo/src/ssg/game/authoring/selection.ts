import type {TimelineSelection} from './timeline-view';
/** Selection reads native bounds and source ownership; it never creates or edits documents. */
import type {PreviewResult} from './contracts';
export function hitTestArtwork(preview:PreviewResult|undefined,point:{x:number;y:number},min:number){
 let best:PreviewResult['bounds'][number]|undefined,area=Infinity;
 for(const box of preview?.bounds??[]){
  const clip=box.clip;if(clip&&(point.x<clip.x||point.x>=clip.x+clip.width||point.y<clip.y||point.y>=clip.y+clip.height))continue;
  const width=Math.max(box.width,min),height=Math.max(box.height,min),x=box.x-(width-box.width)/2,y=box.y-(height-box.height)/2;
  if(point.x<x||point.x>x+width||point.y<y||point.y>y+height)continue;
  const next=box.width*box.height;if(next<=area){best=box;area=next;}
 }
 return best;
}

/** Every selectable target under the point, smallest first; equal sizes put the later-painted target first. */
export function hitsAt(preview:PreviewResult|undefined,point:{x:number;y:number},min:number){
 const hits:{box:PreviewResult['bounds'][number];area:number;order:number}[]=[];
 (preview?.bounds??[]).forEach((box,order)=>{
  const clip=box.clip;if(clip&&(point.x<clip.x||point.x>=clip.x+clip.width||point.y<clip.y||point.y>=clip.y+clip.height))return;
  const width=Math.max(box.width,min),height=Math.max(box.height,min),x=box.x-(width-box.width)/2,y=box.y-(height-box.height)/2;
  if(point.x<x||point.x>x+width||point.y<y||point.y>y+height)return;
  hits.push({box,area:box.width*box.height,order});
 });
 return hits.sort((a,b)=>a.area-b.area||b.order-a.order).map(hit=>hit.box);
}

export function sourceSelection(preview:PreviewResult|undefined,id:string,displayDocument:string){
 const source=preview?.sources?.[id];
 return{document:source?.document??(id?displayDocument:''),instance:source?.instance??id};
}

/** One editor selection owner; source identity is independent of the displayed sequence. */
export interface EditorSelection {document:string;instance:string;timeline?:TimelineSelection;chunk?:string;world?:import('./world-members').WorldMemberAddress}
export const createSelection=():EditorSelection=>({document:'',instance:''});
export const selectionKey=(document:string,instance:string)=>JSON.stringify([document,instance]);
