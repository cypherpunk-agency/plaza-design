import type {Value} from '../../../art/core/composition';
import type {BindingContext} from '../binding-sources';
/** `cue.<use id>`: whether that use is available now (a prompt or marker shows only while it is). */
export function cueProvider(ctx:BindingContext):Record<string,Value>{
 const out:Record<string,Value>={};
 for(const use of ctx.uses??[])out[use.id]=!use.available||use.available(ctx.view.flags);
 return out;
}
