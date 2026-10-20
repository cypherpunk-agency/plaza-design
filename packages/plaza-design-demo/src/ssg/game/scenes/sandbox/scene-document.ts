import scene from './scene.json';
import gameplay from './gameplay.json';
import {contentContract} from '../../engine/gameplay/content-contract';
import {nativeTargetValidator} from '../../engine/gameplay/native-targets';
import {SANDBOX} from '../../data';
import {SANDBOX_RULES} from './rules';
export const content=contentContract(scene,gameplay,{actors:true,manifest:true,nativeTargets:nativeTargetValidator(SANDBOX,SANDBOX_RULES,['reset'],{reset:true})});
