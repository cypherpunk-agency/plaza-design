import type {Value} from '../../../art/core/composition';
import type {BindingContext} from '../binding-sources';
import {capsuleState,routerUp} from '../mechanisms/thermal';
/**
 * Capsule 7B's pictures the model decides: the plug and router (`plugOn`, `up`, `hot`, `temp`), the blinds and
 * door (`sun`, `open`), the kettle's steam, Pixel's perch, and the cable artwork's geometry read from the artwork
 * roles (router, desk surface, sun patch). Without a running model the artwork's defaults stand.
 */
export const capsule=(ctx:BindingContext):Record<string,Value>=>{
 const model=ctx.engine?.m;if(!model)return{};
 const {deskSurface:desk,sunPatch:patch,router}=ctx.roles;
 return{hover:ctx.engine!.hover??'',plugOn:!!capsuleState(model,'plugOn'),up:routerUp(model),sun:!!capsuleState(model,'sun'),open:!!capsuleState(model,'doorOpen'),hot:!!model.value('hot'),temp:Number(model.value('temp')??22),steam:model.now()<(model.scratch.steamUntil??0),pixelAt:String(capsuleState(model,'pixelAt')??''),
  routerX:router?.placement.x??0,deskRight:desk?desk.placement.x+Number(desk.props.width)*desk.placement.scale*desk.placement.facing:0,deskHeight:desk?desk.placement.h+Number(desk.props.height)*desk.placement.scale:0,
  sunFrom:patch?.placement.x??0,sunTo:patch?patch.placement.x+Number(patch.props.width)*patch.placement.scale*patch.placement.facing:0};
};
