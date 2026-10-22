import type {Value} from '../../../art/core/composition';
import type {BindingContext} from '../binding-sources';
import {provide} from '../binding-keys';
import {evaluateValue,type ValueEnv} from '../scene-values';
/**
 * `scene.<name>`: the values a scene declares as data (scene.json `stage.values`, scene-values.ts):
 * flags and interactions mapped to booleans, artwork geometry, the pictures its controller and mechanisms
 * prepare, the light, the weather. The provider has no knowledge of any scene; the composition binds a name
 * the scene declares and the declaration says where it comes from.
 */
function sceneValues(ctx:BindingContext):Record<string,Value>{
 const values=ctx.source.stage?.values??{},env:ValueEnv={...ctx,presentation:ctx.source.presentation,flags:ctx.view.flags,values:ctx.view.values},out:Record<string,Value>={};
 for(const name of ctx.wanted??Object.keys(values)){
  if(!Object.prototype.hasOwnProperty.call(values,name))continue;
  const v=evaluateValue(values[name],env);if(v!==undefined)out[name]=v;
 }
 return out;
}
export const sceneProvider=provide(['<value>'],sceneValues);
