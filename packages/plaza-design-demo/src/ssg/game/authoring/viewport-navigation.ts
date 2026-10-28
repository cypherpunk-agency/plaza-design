/** Stateless workspace navigation. The composer owns the navigation state and pointer lifecycle. */
export interface WorkspaceNavigation {x:number;y:number;zoom:number}
/** Wide configured generators must fit without changing their authored route. */
export const workspaceZoom=(value:number)=>Math.max(.01,Math.min(8,value));
export function zoomWorkspace(view:WorkspaceNavigation,next:number,offset:{x:number;y:number},unitsPerPixel:number):WorkspaceNavigation{
 const zoom=workspaceZoom(next),shift=unitsPerPixel*(1-view.zoom/zoom);
 return{x:view.x+offset.x*shift,y:view.y-offset.y*shift,zoom};
}
export function panWorkspace(view:WorkspaceNavigation,delta:{x:number;y:number},unitsPerPixel:number):WorkspaceNavigation{
 return{...view,x:view.x-delta.x*unitsPerPixel,y:view.y+delta.y*unitsPerPixel};
}
/** Panels reveal/hide canvas area without moving the world already visible at its top-left. */
export function resizeWorkspace(view:WorkspaceNavigation,from:{width:number;height:number},to:{width:number;height:number},scale:number):WorkspaceNavigation{
 return panWorkspace(view,{x:(from.width-to.width)/2,y:(from.height-to.height)/2},1/scale);
}
