import type {BindingContext} from '../binding-sources';
import {provide,keysOf} from '../binding-keys';
import type {YardVisual} from '../../../art/assemblies/fixer-yard';
import type {Value} from '../../../art/core/composition';
import {YARD_KEY,type YardPresentation} from '../mechanisms/yard-crane';
/**
 * The fixer's back yard: the pictures the model and the claw's hook decide (highlight, pan, gate, hook, parcel,
 * night). Worked out by the `yardCrane` mechanism's hook state; nothing without an engine frame.
 */
const yardValues=(ctx:BindingContext):Record<string,Value>=>{
 const p=ctx.shared?.get(YARD_KEY) as YardPresentation|undefined;
 return ctx.engine&&p?p.visual(ctx.engine) as unknown as Record<string,Value>:{};
};
export const yard=provide(keysOf<YardVisual>()(['layer','highlight','pan','gateOpen','gateAllowed','held','hookVisible','hookX','parcel','night']),yardValues);
