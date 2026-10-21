import type {BindingProvider} from './index';
import type {Value} from '../../../art/core/composition';
import {YARD_KEY,type YardPresentation} from '../mechanisms/yard-crane';
/**
 * The fixer's back yard: the pictures the model and the claw's hook decide (highlight, pan, gate, hook, parcel,
 * night). Worked out by the `yardCrane` mechanism's hook state; nothing without an engine frame.
 */
export const yard:BindingProvider=ctx=>{
 const p=ctx.shared?.get(YARD_KEY) as YardPresentation|undefined;
 return ctx.engine&&p?p.visual(ctx.engine) as unknown as Record<string,Value>:{};
};
