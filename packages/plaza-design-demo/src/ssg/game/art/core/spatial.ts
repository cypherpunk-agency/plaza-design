/** Pure shared source edits for spatial controls. Rendering and pointer ownership stay elsewhere. */
import type {AssetInstance,Field,Point,Properties,BoundsContext} from './composition';
export interface SpatialEdit {props:Properties;offset?:Point}
export interface SpatialHandle {id:string;label:string;point:Point;fields:readonly string[];cursor:string;space?:'chunk'|'screen';edit(delta:Point):SpatialEdit}
export interface SpatialContext extends BoundsContext {state?:Readonly<Properties>}
export interface SpatialContract {
 fields:readonly string[];
 /** Explain why an asset has no source resize handles; never substitute guessed bounds. */
 reason?:string;
 validate?:(props:Readonly<Properties>)=>void;
 handles(props:Readonly<Properties>,context?:SpatialContext):readonly SpatialHandle[];
}
export function fixedGeometry(reason:string):SpatialContract{return{fields:[],reason,handles:()=>[]};}
export interface DerivedProperty {label:string;value:number|string|boolean;unit?:string}
export function conditionalControls(contract:SpatialContract,enabled:(props:Readonly<Properties>,field:string)=>boolean):SpatialContract{
 return{fields:contract.fields,validate:contract.validate,handles:(p,c)=>contract.handles(p,c).filter(h=>h.fields.every(key=>enabled(p,key)))};
}
export function validateSpatialContract(contract:SpatialContract|undefined,fields:Record<string,Field>,type:string){
 if(!contract)return;
 if(contract.reason!==undefined&&!contract.reason.trim()||!contract.fields.length&&!contract.reason)throw Error(type+': fixed geometry requires a concrete explanation');
 for(const key of contract.fields)if(!fields[key]||fields[key].kind!=='number')throw Error(type+'.'+key+': spatial controls require a declared numeric field');
 const props=Object.freeze(Object.fromEntries(Object.entries(fields).map(([key,f])=>[key,structuredClone(f.default)]))),handles=contract.handles(props),ids=new Set<string>();
 contract.validate?.(props);
 for(const h of handles){
  if(!h.id||ids.has(h.id)||!h.fields.length||h.fields.some(k=>!contract.fields.includes(k))||![h.point.x,h.point.h].every(Number.isFinite)||h.space!==undefined&&h.space!=='chunk'&&h.space!=='screen')throw Error(type+': invalid spatial handle '+h.id);ids.add(h.id);
  const zero=h.edit({x:0,h:0});
  if(Object.entries(zero.props).some(([key,value])=>!h.fields.includes(key)||value!==props[key])||zero.offset&&(!Number.isFinite(zero.offset.x)||!Number.isFinite(zero.offset.h)||zero.offset.x!==0||zero.offset.h!==0))throw Error(type+'.'+h.id+': a zero drag must preserve source values and write only its declared fields');
 }
}
/** Width/height are source dimensions, never measured silhouettes. Origin fractions locate the
 * source origin within the rectangle: 0 left/bottom, .5 centred. */
export function rectangleControls(options:{width?:string;height?:string;originX?:number;originY?:number;offsetX?:number|string|((p:Readonly<Properties>)=>number);baseline?:number|string|((p:Readonly<Properties>)=>number);signedWidth?:boolean;signedHeight?:boolean}):SpatialContract{
 const{width,height,originX=0,originY=0,offsetX=0,baseline=0}=options;
 return{fields:[width,height].filter((k):k is string=>!!k),validate(p){for(const[key,signed]of [[width,options.signedWidth],[height,options.signedHeight]]as const)if(key&&!signed&&Number(p[key])<0)throw Error(key+': dimension must not be negative');},handles(p){
  const w=width?Number(p[width]):0,h=height?Number(p[height]):0,left=(typeof offsetX==='function'?offsetX(p):typeof offsetX==='string'?Number(p[offsetX]):offsetX)-originX*w,bottom=(typeof baseline==='function'?baseline(p):typeof baseline==='string'?Number(p[baseline]):baseline)-originY*h;
  const handles:SpatialHandle[]=[];
  const edge=(id:string,label:string,key:string,point:Point,axis:'x'|'h',sign:number,origin:number)=>({id,label,fields:[key],point,cursor:axis==='x'?'ew-resize':'ns-resize',edit(delta:Point):SpatialEdit{
   const change=delta[axis],size=Number(p[key])+sign*change;
   const offset=axis==='x'?{x:(sign>0?origin:1-origin)*change,h:0}:{x:0,h:(sign>0?origin:1-origin)*change};
   return{props:{[key]:size},offset};
  }});
  if(width){handles.push(edge('left','Width · left edge',width,{x:left,h:bottom+h/2},'x',-1,originX),edge('right','Width · right edge',width,{x:left+w,h:bottom+h/2},'x',1,originX));}
  if(height){handles.push(edge('bottom','Height · bottom edge',height,{x:left+w/2,h:bottom},'h',-1,originY),edge('top','Height · top edge',height,{x:left+w/2,h:bottom+h},'h',1,originY));}
  if(width&&height)for(const sx of [-1,1])for(const sy of [-1,1])handles.push({id:(sx<0?'left':'right')+'-'+(sy<0?'bottom':'top'),label:'Width and height',fields:[width,height],point:{x:left+(sx>0?w:0),h:bottom+(sy>0?h:0)},cursor:sx===sy?'nesw-resize':'nwse-resize',edit:d=>({props:{[width]:w+sx*d.x,[height]:h+sy*d.h},offset:{x:(sx>0?originX:1-originX)*d.x,h:(sy>0?originY:1-originY)*d.h}})});
  return handles;
 }};
}
export function combineControls(...contracts:SpatialContract[]):SpatialContract{
 return{fields:[...new Set(contracts.flatMap(c=>c.fields))],validate:p=>contracts.forEach(c=>c.validate?.(p)),handles:(p,context)=>contracts.flatMap((c,i)=>c.handles(p,context).map(h=>({...h,id:i+':'+h.id})))};
}
/** A fixed count of repeated cells: dragging the arrangement's edge changes cell width,
 * keeping count and seed unchanged. The authored width remains the native cell dimension. */
export function repeatedWidthControls(width:string,count:string,height?:string,baseline:number|string|((p:Readonly<Properties>)=>number)=0,gap:number|string=0):SpatialContract{
 const rectangle=rectangleControls({width,height,baseline});
 return{fields:rectangle.fields,validate:rectangle.validate,handles(p){const n=Number(p[count]);if(!(n>0))return[];const extent=Number(p[width])*n+Math.max(0,n-1)*(typeof gap==='string'?Number(p[gap]):gap),area={...p,[width]:extent};return rectangle.handles(area).map(h=>({...h,edit(delta:Point){const edit=h.edit(delta);if(width in edit.props)edit.props[width]=Number(p[width])+(Number(edit.props[width])-extent)/n;return edit;}}));}};
}
/** Window X values are source-chunk coordinates, not distances from the asset origin. */
export function drawingWindowControls(from:string,to:string,atHeight:string):SpatialContract{
 return{fields:[from,to],handles:p=>[
  {id:'window-left',label:'Drawing window · west boundary',fields:[from],point:{x:Number(p[from]),h:Number(p[atHeight])},space:'chunk',cursor:'ew-resize',edit:d=>({props:{[from]:Number(p[from])+d.x}})},
  {id:'window-right',label:'Drawing window · east boundary',fields:[to],point:{x:Number(p[to]),h:Number(p[atHeight])},space:'chunk',cursor:'ew-resize',edit:d=>({props:{[to]:Number(p[to])+d.x}})},
 ]};
}
export function applySpatialEdit(instance:AssetInstance,edit:SpatialEdit):void{
 instance.props={...instance.props,...edit.props};
 if(edit.offset){instance.placement.x+=edit.offset.x*(instance.placement.scale??1)*(instance.placement.facing??1);instance.placement.h+=edit.offset.h*(instance.placement.scale??1);}
}
/** Explicit horizontal endpoints at an authored altitude. No silhouette-derived rectangle. */
export function routeControls(start:string,end:string,altitude:string):SpatialContract{
 return{fields:[start,end,altitude],handles(p){const a=Number(p[start]),b=Number(p[end]),h=Number(p[altitude]);return[
  {id:'start',label:'Route start',point:{x:a,h},fields:[start],cursor:'ew-resize',edit:d=>({props:{[start]:a+d.x}})},
  {id:'end',label:'Route end',point:{x:b,h},fields:[end],cursor:'ew-resize',edit:d=>({props:{[end]:b+d.x}})},
  {id:'altitude',label:'Altitude',point:{x:(a+b)/2,h},fields:[altitude],cursor:'ns-resize',edit:d=>({props:{[altitude]:h+d.h}})},
 ];}};
}
/** A signed displacement from the placement, e.g. the upper landing of a stair. */
export function endpointControls(horizontal:string,vertical:string,heightOffset=0,label='Upper endpoint'):SpatialContract{
 return{fields:[horizontal,vertical],handles:p=>[
  {id:'endpoint',label,fields:[horizontal,vertical],point:{x:Number(p[horizontal]),h:Number(p[vertical])+heightOffset},cursor:'move',edit:d=>({props:{[horizontal]:Number(p[horizontal])+d.x,[vertical]:Number(p[vertical])+d.h}})},
 ]};
}
/** Independent source limits, at their actual authored cross-section. */
export function rangeControls(start:string,end:string,height:number|string|((p:Readonly<Properties>)=>number)=0):SpatialContract{
 return{fields:[start,end],handles:p=>{const h=typeof height==='function'?height(p):typeof height==='string'?Number(p[height]):height;return[
  {id:'start',label:'Range · start',fields:[start],point:{x:Number(p[start]),h},cursor:'ew-resize',edit:d=>({props:{[start]:Number(p[start])+d.x}})},
  {id:'end',label:'Range · end',fields:[end],point:{x:Number(p[end]),h},cursor:'ew-resize',edit:d=>({props:{[end]:Number(p[end])+d.x}})},
 ];}};
}
/** Two authored elevations, rather than a size accidentally interpreted as an elevation. */
export function verticalRangeControls(bottom:string,top:string,x=0):SpatialContract{
 return{fields:[bottom,top],validate(p){if(Number(p[top])<Number(p[bottom]))throw Error('Top must not be below bottom');},handles:p=>[
  {id:'bottom',label:'Bottom elevation',fields:[bottom],point:{x,h:Number(p[bottom])},cursor:'ns-resize',edit:d=>({props:{[bottom]:Number(p[bottom])+d.h}})},
  {id:'top',label:'Top elevation',fields:[top],point:{x,h:Number(p[top])},cursor:'ns-resize',edit:d=>({props:{[top]:Number(p[top])+d.h}})},
 ]};
}
/** A finite generated area with ordered X limits and a centre +/- vertical variation. */
export function bandControls(minX:string,maxX:string,centerY:string,halfHeight:string):SpatialContract{
 return{fields:[minX,maxX,centerY,halfHeight],handles(p){const a=Number(p[minX]),b=Number(p[maxX]),h=Number(p[centerY]),r=Number(p[halfHeight]);return[
  {id:'left',label:'Area · left edge',fields:[minX],point:{x:a,h},cursor:'ew-resize',edit:d=>({props:{[minX]:a+d.x}})},
  {id:'right',label:'Area · right edge',fields:[maxX],point:{x:b,h},cursor:'ew-resize',edit:d=>({props:{[maxX]:b+d.x}})},
  {id:'top',label:'Altitude band · top edge',fields:[centerY,halfHeight],point:{x:(a+b)/2,h:h+r},cursor:'ns-resize',edit:d=>({props:{[centerY]:h+d.h/2,[halfHeight]:r+d.h/2}})},
  {id:'bottom',label:'Altitude band · bottom edge',fields:[centerY,halfHeight],point:{x:(a+b)/2,h:h-r},cursor:'ns-resize',edit:d=>({props:{[centerY]:h+d.h/2,[halfHeight]:r-d.h/2}})},
 ];}};
}

/** One real source endpoint/elevation with its other coordinate fixed by the asset design. */
export function axisControl(field:string,axis:'x'|'h',cross:number|string|((p:Readonly<Properties>)=>number)=0,label='Endpoint',options:{offset?:number|((p:Readonly<Properties>)=>number);direction?:1|-1}={}):SpatialContract{
 return{fields:[field],handles(p){const other=typeof cross==='function'?cross(p):typeof cross==='string'?Number(p[cross]):cross,value=Number(p[field]),offset=typeof options.offset==='function'?options.offset(p):options.offset??0,direction=options.direction??1;return[{id:'endpoint',label,fields:[field],point:axis==='x'?{x:direction*value+offset,h:other}:{x:other,h:direction*value+offset},cursor:axis==='x'?'ew-resize':'ns-resize',edit:d=>({props:{[field]:value+direction*d[axis]}})}];}};
}

/** Native viewport-wide surfaces have authored elevations but no local horizontal edge.
 * Position a vertical control in their captured viewport, using the same y projection as paint.
 * The screen-space contract still uses the captured canvas transform and placement scale. */
export function viewportElevationControls(...fields:string[]):SpatialContract{
 return{fields,handles:(p,c)=>fields.map(field=>{const value=Number(p[field]),at=c?.placement??{x:0,h:0};
  return{id:field,label:field+' elevation',fields:[field],cursor:'ns-resize',
   point:c?{x:c.view.viewW/2-at.x,h:-c.view.y(at.h+value)-at.h}:{x:0,h:value},
   ...(c?{space:'screen' as const}:{}),edit:(d:Point)=>({props:{[field]:value+d.h}})};
 })};
}

/** A repetition limit in chunk coordinates. The native surface fills the viewport; this
 * endpoint changes only its repeated details, never pretends to resize that surface. */
export function repetitionExtentControl(field:string,height=0,extension=0):SpatialContract{
 return{fields:[field],handles:(p,c)=>[{id:'repeat-end',label:'Repetition extent',fields:[field],space:'chunk',
  point:{x:Number(p[field])+extension,h:(c?.placement.h??0)+height},cursor:'ew-resize',
  edit:d=>({props:{[field]:Number(p[field])+d.x}})}]};
}

/** Native top-inset artwork anchors to a screen Y field instead of the placement's ground Y.
 * Translate vertical origin corrections back into that field so opposite edges really stay put. */
export function screenBaselineControls(contract:SpatialContract,baseline:string):SpatialContract{
 return{fields:[...new Set([...contract.fields,baseline])],validate:contract.validate,handles:(p,c)=>contract.handles(p,c).map(handle=>({
  ...handle,fields:[...new Set([...handle.fields,baseline])],space:'screen',
  point:{x:(c?c.view.sx(c.placement.x)-c.placement.x:0)+handle.point.x,h:handle.point.h-Number(p[baseline])-(c?.placement.h??0)},
  edit(d){const patch=handle.edit(d),vertical=patch.offset?.h??0;return{props:{...patch.props,...(vertical?{[baseline]:Number(p[baseline])-vertical}:{})},...(patch.offset?.x?{offset:{x:patch.offset.x,h:0}}:{})};}
 }))};
}
/** A real native screen-top inset. Downward dragging increases the stored inset. */
export function screenInsetControl(field:string,x:number|((p:Readonly<Properties>)=>number)=0,offset=0):SpatialContract{
 return{fields:[field],handles:(p,c)=>[{id:field,label:'Screen top inset',fields:[field],space:'screen',
  point:{x:(c?c.view.sx(c.placement.x)-c.placement.x:0)+(typeof x==='function'?x(p):x),h:-Number(p[field])-offset-(c?.placement.h??0)},cursor:'ns-resize',
  edit:d=>({props:{[field]:Number(p[field])-d.h}})}]};
}

/** A radial source extent, edited directly from its centre (not an imaginary box width). */
export function radiusControl(radius:string):SpatialContract{
 return{fields:[radius],validate:p=>{if(Number(p[radius])<0)throw Error(radius+': radius must not be negative');},handles:p=>[{id:'radius',label:'Radius / reach',fields:[radius],point:{x:Number(p[radius]),h:0},cursor:'ew-resize',edit:d=>({props:{[radius]:Number(p[radius])+d.x}})}]};
}

/** A generated circle whose source origin is its lower-left corner. The border stays fixed;
 * each edge keeps its opposite edge and perpendicular centre fixed while regenerating radius. */
export function circleControls(radius:string,border=0):SpatialContract{
 return{fields:[radius],handles(p){const r=Number(p[radius]),c=r+border;
  return(['left','right','bottom','top']as const).map(id=>{const horizontal=id==='left'||id==='right',negative=id==='left'||id==='bottom';return{
   id,label:'Radius · '+id+' edge',fields:[radius],point:{x:horizontal?(negative?0:c*2):c,h:horizontal?c:negative?0:c*2},cursor:horizontal?'ew-resize':'ns-resize',
   edit(d:Point){const shift=horizontal?d.x:d.h,dr=(negative?-shift:shift)/2;return{props:{[radius]:r+dr},offset:horizontal?{x:negative?shift:0,h:-dr}:{x:-dr,h:negative?shift:0}};}
  };});
 }};
}
/** An authored absolute world elevation; unlike a local height it does not add placement Y. */
export function worldElevationControl(field:string):SpatialContract{
 return{fields:[field],handles:(p,c)=>[{id:field,label:'World elevation',fields:[field],point:c?{x:c.view.sx(c.placement.x,c.placement.parallax)-c.placement.x,h:-c.view.y(Number(p[field]))-c.placement.h}:{x:0,h:Number(p[field])},...(c?{space:'screen' as const}:{}),cursor:'ns-resize',edit:d=>({props:{[field]:Number(p[field])+d.h}})}]};
}

/** Depth below a fixed baseline. Moving its lower edge never moves the authored top/origin. */
export function depthControl(field:string,baseline=0,x:number|((p:Readonly<Properties>)=>number)=0):SpatialContract{
 return{fields:[field],validate:p=>{if(Number(p[field])<0)throw Error(field+': depth must not be negative');},handles:p=>[{id:'depth',label:'Depth · lower edge',fields:[field],point:{x:typeof x==='function'?x(p):x,h:baseline-Number(p[field])},cursor:'ns-resize',edit:d=>({props:{[field]:Number(p[field])-d.h}})}]};
}

/** Native kit artwork can use a fixed or authored internal depth independently of its host
 * placement. Project its local controls through the captured View exactly as that kernel does.
 * Pixel-sized fittings add dimensions after projecting their anchor; world spans project both
 * endpoints. No camera reconstruction and no separate pointer/projection owner. */
export function atDepthControls(contract:SpatialContract,depth:number|string,coordinates:'pixels'|'world'='pixels'):SpatialContract{
 return{...contract,handles(p,c){const handles=contract.handles(p,c);if(!c)return handles;
  const {view,placement:at}=c,par=typeof depth==='string'?Number(p[depth]):depth;
  return handles.map(handle=>{if(handle.space)throw Error('Depth controls require local source geometry');return{...handle,space:'screen' as const,
   point:{x:(coordinates==='world'?view.sx(at.x+handle.point.x,par):view.sx(at.x,par)+handle.point.x)-at.x,h:-view.y(at.h+handle.point.h)-at.h}};});
 }};
}

/** Prepared artwork offsets are read from the same captured row as painting, never copied
 * into source properties. Used for travelling assemblies and other offset native artwork. */
export function translatedControls(contract:SpatialContract,offset:(p:Readonly<Properties>,c?:SpatialContext)=>Point):SpatialContract{
 return{...contract,handles(p,c){const d=offset(p,c);return contract.handles(p,c).map(h=>{if(h.space)throw Error('Translated controls require local source geometry');return{...h,point:{x:h.point.x+d.x,h:h.point.h+d.h}};});}};
}
