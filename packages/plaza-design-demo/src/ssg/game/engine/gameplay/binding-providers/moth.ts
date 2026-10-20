import type {BindingProvider} from './index';
import {mothVisualSnapshot} from '../../controllers/visual';
/**
 * Moth's flat: the pictures the model decides (record playing and when its next beat lands, the fish fed,
 * the fern wet, the tape fresh) and the height of the desk surface, read from the artwork role.
 */
export const moth:BindingProvider=ctx=>{
 const desk=ctx.roles.deskSurface,model=ctx.engine?.m;
 return{hover:ctx.engine?.hover??'',...(model?mothVisualSnapshot(model):{}),deskHeight:desk?desk.placement.h+Number(desk.props.height)*desk.placement.scale:0};
};
