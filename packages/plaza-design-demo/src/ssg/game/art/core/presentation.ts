/** Pure presentation facts shared by painting, picking and scene visibility. No simulation state. */
import type {ChunkDocument,Environment,Resolved,Placement,LayerSlot,Value} from './composition';
import {projectedBounds,artworkClip,dragProjection,type DragProjection} from './geometry';
export interface ScreenRect {x:number;y:number;width:number;height:number}
export interface ArtworkPresentation {
 drag:DragProjection;row:Resolved; document:ChunkDocument; view:Environment['view']; mobile:boolean;
 visible:boolean; pickable:boolean; reason?:string; pickReason?:string; opacity:number; bounds:ScreenRect; clip?:ScreenRect; clipSource:string;
}
export interface CapturedArtwork extends ArtworkPresentation {repaint?:(ctx:CanvasRenderingContext2D)=>void;slot:LayerSlot;paintOrder:number;canvasTransform:Pick<DOMMatrix,'a'|'b'|'c'|'d'|'e'|'f'>}
export interface ArtworkInspection {
 source:string;type:string;authored:Placement;placement:Required<Placement>;
 layer:string;order:number;paintOrder:number;mobile:boolean;visible:boolean;reason?:string;
 opacity:number;bounds:ScreenRect;clip?:ScreenRect;clipSource:string;
 bindings:Record<string,string>;properties:Record<string,{label:string;value:Value}>;
}
export function intersectRects(a:ScreenRect,b:ScreenRect):ScreenRect {
 const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y);
 return {x,y,width:Math.max(0,Math.min(a.x+a.width,b.x+b.width)-x),height:Math.max(0,Math.min(a.y+a.height,b.y+b.height)-y)};
}
export function prepareArtwork(row:Resolved,document:ChunkDocument,env:Environment,appearance:{visible:boolean;opacity:number},mobile=false,parent?:Resolved['placement']):ArtworkPresentation {
 const {view}=env,p=row.placement,context={view,placement:p};
 const local=row.element.bounds(row.props,row.state,context),rawBounds=projectedBounds(view,p,local);
 const sourceClip=artworkClip(row.instance,{...view,artworkScope:view.sharedLayers||view.artworkScope?(mobile?'mobile':'static'):undefined});
 const mask=row.element.mask?.(row.props,row.state,context),nativeClip=mask?projectedBounds(view,p,mask):undefined;
 const bounds=nativeClip?intersectRects(rawBounds,nativeClip):rawBounds;
 const clip=sourceClip&&nativeClip?intersectRects(sourceClip,nativeClip):sourceClip??nativeClip;
 const reason=!appearance.visible?'Hidden by object or parent visibility':appearance.opacity===0?'Object or parent opacity is zero':row.element.hiddenReason?.(row.props,row.state,context);
 // A conservative selection rectangle is not permission to suppress native painting.
 const pickReason=reason??(row.element.parts.length&&(local.w<=0||local.tall<=0)?'No selection geometry':clip&&(intersectRects(bounds,clip).width<=0||intersectRects(bounds,clip).height<=0)?'Outside clipping mask':undefined);
 return {drag:dragProjection(view,p,parent),row,document,view,mobile,visible:!reason,pickable:!pickReason,reason,pickReason,opacity:appearance.opacity,bounds,clip,clipSource:[sourceClip?(row.instance.clip==='chunk'||row.instance.clip===undefined?'Chunk window':'Authored mask'):'',nativeClip?'Native window mask':''].filter(Boolean).join(' + ')||'None'};
}
export function inspectArtwork(a:CapturedArtwork):ArtworkInspection {
 const {row:r}=a;
 return {source:a.document.scene,type:r.instance.type,authored:r.instance.placement,placement:r.placement,layer:r.instance.layer,order:r.instance.order,paintOrder:a.paintOrder,mobile:a.mobile,visible:a.visible,reason:a.reason,opacity:a.opacity,bounds:a.bounds,clip:a.clip,clipSource:a.clipSource,bindings:r.instance.bindings??{},properties:Object.fromEntries(Object.entries(r.props).map(([key,value])=>[key,{label:r.element.fields[key]?.label??key,value}]))};
}
