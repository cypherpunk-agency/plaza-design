import type {Value} from '../../../art/core/composition';
import type {BindingContext} from '../binding-sources';
import {presentationFlag,type ShiftPresentationRole} from '../scene-presentation';
/** Night-shift trolley and case artwork: where the trolley stands (parked at its bay or at rest) and whether the case is on the counter. */
export function shiftProvider(ctx:BindingContext):Record<string,Value>{
 const p=ctx.source.presentation??null,flag=(role:ShiftPresentationRole)=>presentationFlag(p,ctx.view.flags,role);
 return{casePresent:flag('delivered')&&!flag('case'),trolleyX:(flag('parked')?ctx.roles.bay:ctx.roles.trolley)?.placement.x??0,trolleyRestX:ctx.roles.trolley?.placement.x??0};
}
