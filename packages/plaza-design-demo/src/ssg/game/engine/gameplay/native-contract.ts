import type {GameplayDefinition} from './types';
import type {SceneData} from '../../data/types';
import {validateGameplay} from './validation';
import {validateNativeBindings} from './native-bindings';
/** Bounded editing surface; permissions and native ownership cannot be widened by a bundle. */
export function validateNativeContract(value:unknown,baseline:unknown,data?:SceneData){
 const d=validateGameplay(value),source=baseline as GameplayDefinition,same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b),fail=()=>{throw new Error('Native gameplay identity/permission contract is protected');};
 for(const key of ['flags','items','events'] as const)if(!same(d[key],source[key]))fail();
 if(!same(Object.keys(d.commands),Object.keys(source.commands))||!same(Object.keys(d.state??{}),Object.keys(source.state??{})))fail();
 for(const[id,c]of Object.entries(d.commands))if(!same(c.sources,source.commands[id].sources))fail();
 for(const[id,s]of Object.entries(d.state??{})){const{default:_,...shape}=s,{default:__,...original}=source.state![id];if(!same(shape,original))fail();if(source.native?.state[id]&&!same(s,source.state![id]))fail();}
 if(!!d.native!==!!source.native)fail();if(d.native&&source.native){for(const key of ['state','events','goals'] as const)if(!same(d.native[key],source.native[key]))fail();const identity=(b:GameplayDefinition)=>b.native!.verbs.map(r=>[r.device,r.noun,r.verb]);if(!same(identity(d),identity(source)))fail();for(const w of source.native.wires.filter(w=>w.fixed))if(!d.native.wires.some(c=>same(c,w)))fail();}
 if(data)validateNativeBindings(d,data);return d;
}
