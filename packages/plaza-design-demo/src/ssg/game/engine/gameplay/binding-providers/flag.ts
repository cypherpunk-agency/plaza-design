import type {Value} from '../../../art/core/composition';
import type {BindingContext} from '../binding-sources';
import {presentationFlag,type ScenePresentationRole} from '../scene-presentation';
/**
 * `flag.<role>`: whether the gameplay flag a scene's presentation names for that visual role is
 * set (scene.json `presentation.flags`); `flag.not.<role>` is the opposite. A role the scene does
 * not name reads as unset.
 */
export function flagProvider(ctx:BindingContext):Record<string,Value>{
 const out:Record<string,Value>={},p=ctx.source.presentation??null;
 for(const role of Object.keys(p?.flags??{})){const on=presentationFlag(p,ctx.view.flags,role as ScenePresentationRole);out[role]=on;out['not.'+role]=!on;}
 return out;
}
