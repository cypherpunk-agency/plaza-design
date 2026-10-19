import type {GameplayDefinition} from './types';
import type {SceneData} from '../../data/types';
import {validateGameplay} from './validation';
import {validateNativeBindings} from './native-bindings';
/** Keep required scalar identities and existing invocation permissions. Editable refs are validated prospectively. */
export function validateNativeContract(value:unknown,baseline:unknown,data?:SceneData,options:{allowNewContent?:boolean;allowNewVocabulary?:boolean;nativeDerived?:readonly string[];allowBindingEdits?:boolean}={}){
 const d=validateGameplay(value),source=baseline as GameplayDefinition,same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b),fail=()=>{throw new Error('Native gameplay identity/permission contract is protected');};
 // Full authoring validates current references at assembly; shipping history is not a permission schema.
 if(options.allowNewContent&&options.allowBindingEdits&&options.allowNewVocabulary)return d;
 for(const key of ['flags','items','events'] as const)if(options.allowNewVocabulary?source[key].some(id=>!d[key].includes(id)):!same(d[key],source[key]))fail();
 if(options.allowNewContent){
  const missingFixedCommand=!options.allowBindingEdits&&Object.keys(source.commands).some(id=>!Object.prototype.hasOwnProperty.call(d.commands,id));
  const missingNativeState=Object.keys(source.state??{}).some(id=>!Object.prototype.hasOwnProperty.call(d.state??{},id));
  if(missingFixedCommand||missingNativeState)fail();
 }else if(!same(Object.keys(d.commands),Object.keys(source.commands))||!same(Object.keys(d.state??{}),Object.keys(source.state??{})))fail();
 for(const[id,c]of Object.entries(source.commands))if(d.commands[id]&&!same(d.commands[id].sources,c.sources))fail();
 for(const[id,baselineState]of Object.entries(source.state??{})){const s=d.state![id],{default:_,...shape}=s,{default:__,...original}=baselineState;if(options.allowBindingEdits){if(s.type!==baselineState.type||s.owner!==baselineState.owner||s.lifetime!==baselineState.lifetime)fail();}else{if(!same(shape,original))fail();}}
 if(!options.allowBindingEdits&&!!d.native!==!!source.native)fail();if(d.native&&source.native&&!options.allowBindingEdits){for(const key of ['events','goals','reads','presentation','intervals','replies','triggers','deadlines','inputs'] as const)if(!same(d.native[key],source.native[key]))fail();const identity=(b:GameplayDefinition)=>b.native!.verbs.map(r=>[r.device,r.noun,r.verb]);if(!same(identity(d),identity(source)))fail();if((d.native.wires===undefined)!==(source.native.wires===undefined))fail();for(const w of (source.native.wires??[]).filter(w=>w.fixed))if(!d.native.wires?.some(c=>same(c,w)))fail();}
 if(options.allowBindingEdits)for(const w of(source.native?.wires??[]).filter(w=>w.fixed))if(!d.native?.wires?.some(c=>same(c,w)))fail();
 if(data&&!options.allowBindingEdits)validateNativeBindings(d,data,options.nativeDerived);return d;
}
