import type {Value} from '../../../art/core/composition';
import type {BindingContext} from '../binding-sources';
import {provide} from '../binding-keys';
import {presentationFlag,type ScenePresentationRole} from '../scene-presentation';
/**
 * `flag.<role>`: whether the gameplay flag a scene's presentation names for that visual role is
 * set (scene.json `presentation.flags`); `flag.not.<role>` is the opposite. A role the scene does
 * not name reads as unset.
 */
function flagValues(ctx:BindingContext):Record<string,Value>{
 const out:Record<string,Value>={},p=ctx.source.presentation??null;
 for(const role of Object.keys(p?.flags??{})){const on=presentationFlag(p,ctx.view.flags,role as ScenePresentationRole);out[role]=on;out['not.'+role]=!on;}
 return out;
}
export const flagProvider=provide(['<role>','not.<role>'],flagValues);
