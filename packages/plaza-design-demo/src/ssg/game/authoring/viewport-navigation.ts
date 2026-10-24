/** Stateless workspace navigation. The composer owns the navigation state and pointer lifecycle. */
export interface WorkspaceNavigation {x:number;y:number;zoom:number}
export function zoomWorkspace(view:WorkspaceNavigation,next:number,offset:{x:number;y:number},unitsPerPixel:number):WorkspaceNavigation{
 const zoom=Math.max(.05,Math.min(8,next)),shift=unitsPerPixel*(1-view.zoom/zoom);
 return{x:view.x+offset.x*shift,y:view.y-offset.y*shift,zoom};
}
export function panWorkspace(view:WorkspaceNavigation,delta:{x:number;y:number},unitsPerPixel:number):WorkspaceNavigation{
 return{...view,x:view.x-delta.x*unitsPerPixel,y:view.y+delta.y*unitsPerPixel};
}
