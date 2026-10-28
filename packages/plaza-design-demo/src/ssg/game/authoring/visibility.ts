/** Editor diagnostics consume native captured geometry; never evaluate gameplay rules here. */
import type {ArtworkInspection,ScreenRect} from '../art/core/presentation';
export function visibilityMessage(a:ArtworkInspection|undefined,missingReason?:string){
 if(!a)return missingReason??'Not submitted to this preview. The source may be unloaded or its drawing phase disabled.';
 if(!a.visible)return a.reason??'Hidden in the current state.';
 if(a.paintOrder<0)return 'Editor helper; this element does not draw artwork.';
 const b=a.drawingBounds??(a.boundsSource==='drawing'?a.bounds:undefined);
 if(b&&(!b.width||!b.height)&&a.drawingWindow){
  const region=framingBounds(a),window=a.drawingWindow.bounds;
  const side=region.x+region.width<=window.x?'west':region.x>=window.x+window.width?'east':undefined;
  if(side){const field=side==='west'?a.drawingWindow.from:a.drawingWindow.to,value=a.properties?.[field]?.value;return 'Outside its permitted drawing area. The entire configured object lies '+side+' of the boundary'+(value===undefined?'':(' at world X '+value))+'.'+(a.placement?.parallax!==undefined&&a.placement.parallax!==1?' At parallax '+a.placement.parallax+', the object and boundary move differently as the camera travels.':'')+' Show the boundary to inspect the permitted area.';}
 }
 if(b&&(!b.width||!b.height))return a.drawingWindow?'No drawing in this view. The drawing-area restriction may exclude the entire object. Show the boundary to inspect it.':a.boundsSource==='region'?'No drawing in this view. The generator may be between emissions, outside the view, or inactive in this state. Its configured area remains editable.':'No drawing in this view. It may be outside the viewport or inactive in the current state.';
 return 'Drawing submitted in this view. Other artwork may cover it.';
}
export function windowEdges(a:ArtworkInspection):{field:string;x:number}[]{const w=a.drawingWindow;return w?[{field:w.from,x:w.bounds.x},{field:w.to,x:w.bounds.x+w.bounds.width}]:[];}
export function framingBounds(a:ArtworkInspection):ScreenRect{return a.bounds.width>0&&a.bounds.height>0?a.bounds:a.framingBounds??a.bounds;}
