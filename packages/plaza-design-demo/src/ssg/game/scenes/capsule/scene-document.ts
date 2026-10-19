import scene from './scene.json';
import gameplay from './gameplay.json';
import {nativeContentContract} from '../../engine/gameplay/content-contract';
import {nativeTargetValidator} from '../../engine/gameplay/native-targets';
import {CAPSULE} from '../../data';
import {CAPSULE_RULES} from './rules';
const contract=nativeContentContract(scene,gameplay,CAPSULE,['concierge'],{actors:true,manifest:true,nativeTargets:nativeTargetValidator(CAPSULE,CAPSULE_RULES,['door'])});

/** Older Capsule source omitted its code-owned bed; the manifest migration lifts it once. */
export const content={...contract,validateScene(value:unknown,gameplay=contract.gameplay){
 if(value&&typeof value==='object'&&!Array.isArray(value)){const source=value as Record<string,unknown>;if(source.manifest===undefined&&source.rests===undefined)value={...source,rests:contract.scene.rests};}
 return contract.validateScene(value,gameplay);
}};
