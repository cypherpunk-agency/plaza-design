import {FOV,type Body} from '../../world/light';
import type {View} from '../core/view';
const PAR=0.02;
/** A body's screen position: x from its azimuth relative to the view, y from its height over `horizon` (screen y). */
export function skyPos(v: View, b: Body, relDeg: number, horizon: number, top = 0):{x:number;y:number;in:boolean} {
  if(v.cameraFrame){const f=v.cameraFrame,p=skyPos(f.view,b,relDeg,horizon-f.y,top);return{...p,x:p.x+f.x,y:p.y+f.y};}
  const span = Math.max(40, horizon - top);
  return { x: v.viewW / 2 + (relDeg / FOV) * (v.viewW / 2) - v.cam * PAR, y: horizon - b.el * span * 0.86, in: Math.abs(relDeg) < FOV + 12 };
}

export interface SkyOpts {
  /** The horizon's screen y (the sky is drawn above it; the sun sets behind it). */
  horizon: number;
  /** Where the sky's top is (screen y; default 0). */
  top?: number;
  /** Stars (default true). */
  stars?: boolean;
  /** Fill below the horizon with the horizon's colour down to here (screen y; default: the view's bottom). */
  fillTo?: number;
  /**
   * `sunset`: the coast's sky (the title glide's, Tommi's reviewed look): a sunset gradient mixed from the light
   * (night, the golden hour, day), a big slatted sun sinking into the sea with its glow, twinkling stars, thin
   * clouds. Opt-in (scene `skyStyle`); the default is the city sky below.
   */
  style?: 'city' | 'sunset';
  /** Sunset style: how much of the sky is the city's (0 the open coast .. 1 over Downtown: redder, hazier, fewer stars). */
  town?: number;
}
