import type {Value} from '../../../art/core/composition';
import type {BindingContext} from '../binding-sources';
import {presentationFlag,type ScenePresentation} from '../scene-presentation';
/**
 * `flag.<name>`: whether the scene's presentation flag `<name>` (scene.json `presentation.flags`)
 * is set in the game right now. Artwork asks for `flag.exitOpen`; the scene document says which
 * gameplay flag that is.
 */
export const flagBindings=(ctx:BindingContext):Record<string,Value>=>{
 const presentation=ctx.source.presentation as ScenePresentation|undefined,out:Record<string,Value>={};
 for(const name of Object.keys(presentation?.flags??{}))out[name]=presentationFlag(presentation,ctx.view.flags,name as never);
 return out;
};
