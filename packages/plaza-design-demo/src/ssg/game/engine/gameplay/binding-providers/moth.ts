import type {BindingContext} from '../binding-sources';
import {provide,keysOf} from '../binding-keys';
import type {Value} from '../../../art/core/composition';
import {mothVisualSnapshot} from '../../controllers/visual';
/**
 * Moth's flat: the pictures the model decides (record playing and when its next beat lands, the fish fed,
 * the fern wet, the tape fresh) and the height of the desk surface, read from the artwork role.
 */
const mothValues=(ctx:BindingContext):Record<string,Value>=>{
 const desk=ctx.roles.deskSurface,model=ctx.engine?.m;
 return{hover:ctx.engine?.hover??'',...(model?mothVisualSnapshot(model):{}),deskHeight:desk?desk.placement.h+Number(desk.props.height)*desk.placement.scale:0};
};
export const moth=provide(['hover','deskHeight',...keysOf<ReturnType<typeof mothVisualSnapshot>>()(['playing','nextMs','fed','wet','fresh'])],mothValues);
