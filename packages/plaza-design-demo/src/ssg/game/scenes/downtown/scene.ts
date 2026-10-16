/** Stable scene-facing adapter; the document owns each device and street-service placement. */
import type { SceneModel } from '../../engine/model';
import type { View } from '../../art/core/view';
import { renderDowntownDevices } from './composition';
export { downtownMapKioskX as MAP_KIOSK_X } from './placements';
export function drawDowntown(x:CanvasRenderingContext2D,m:SceneModel,v:View,hover:string|null,dlv:number|null){renderDowntownDevices(x,v,m,hover,dlv);}
