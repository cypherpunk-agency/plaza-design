import type {TimelineSelection} from './timeline-view';
/** Selection reads native bounds and source ownership; it never creates or edits documents. */
import type {PreviewResult} from './contracts';
export function hitTestArtwork(preview:PreviewResult|undefined,point:{x:number;y:number},min:number){
    const grow = (b: PreviewResult['bounds'][number]) => { const w = Math.max(b.width, min), h = Math.max(b.height, min); return { ...b, x: b.x - (w - b.width) / 2, y: b.y - (h - b.height) / 2, width: w, height: h, area: b.width * b.height }; };
    // Smallest box first; on a tie the frontmost wins (bounds arrive in draw order, back to front).
    return (preview?.bounds ?? []).map((b, index) => ({ ...grow(b), index })).filter(b => point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height).sort((a, b) => a.area - b.area || b.index - a.index)[0];
  }

export function sourceSelection(preview:PreviewResult|undefined,id:string,displayDocument:string){
 const source=preview?.sources?.[id];
 return{document:source?.document??(id?displayDocument:''),instance:source?.instance??id};
}

/** One editor selection owner; source identity is independent of the displayed sequence. */
export interface EditorSelection {document:string;instance:string;timeline?:TimelineSelection}
export const createSelection=():EditorSelection=>({document:'',instance:''});
export const selectionKey=(document:string,instance:string)=>JSON.stringify([document,instance]);
