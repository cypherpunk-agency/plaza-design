import type {Value} from '../../../art/core/composition';
import type {BindingContext} from '../binding-sources';
import {provide} from '../binding-keys';
import {presentationFlag,type ShiftPresentationRole} from '../scene-presentation';
/** Night-shift trolley and case artwork: where the trolley stands (parked at its bay or at rest) and whether the case is on the counter. */
function shiftValues(ctx:BindingContext):Record<string,Value>{
 const p=ctx.source.presentation??null,flag=(role:ShiftPresentationRole)=>presentationFlag(p,ctx.view.flags,role);
 return{casePresent:flag('delivered')&&!flag('case'),trolleyX:(flag('parked')?ctx.roles.bay:ctx.roles.trolley)?.placement.x??0,trolleyRestX:ctx.roles.trolley?.placement.x??0};
}
export const shiftProvider=provide(['casePresent','trolleyX','trolleyRestX'],shiftValues);
