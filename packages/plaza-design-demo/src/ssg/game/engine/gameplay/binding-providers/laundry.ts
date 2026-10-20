import type {Value} from '../../../art/core/composition';
import {laundryController,laundryVisualSnapshot} from '../../controllers/laundromat';
import type {BindingProvider} from './index';
/**
 * The laundromat's picture: hover, the breaker, the four washers (status and cycle progress),
 * the schedule clock and the cable targets and the window the people outside are seen through (`clip`, the screen rectangle), worked out from the scene model and the controller
 * its devices name (engine/controllers/laundromat.ts). The artwork binds `laundry.<key>`.
 */
export const laundry:BindingProvider=ctx=>{
 const m=ctx.engine?.m;if(!m||!ctx.gameplay)return {};
 const c=laundryController(m.data),get=(id:string)=>{const row=ctx.rows.find(r=>r.instance.id===id);if(!row)throw new Error('Laundromat artwork reference '+id);return row;};
 const win=c?get(c.geometry.window):undefined;
 return {hover:ctx.engine!.hover??'',...laundryVisualSnapshot(m,ctx.gameplay),
  breakerX:c?get(c.geometry.breaker).placement.x:0,
  clip:win?[ctx.view.sx(win.placement.x),ctx.view.y(win.placement.h+Number(win.props.height)),Number(win.props.width),Number(win.props.height)]:null,
  washerXs:[1,2,3,4].map(i=>c?get(c.geometry[('w'+i) as 'w1']).placement.x:0)} as Record<string,Value>;
};
