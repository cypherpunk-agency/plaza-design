import scene from './scene.json';
import gameplay from './gameplay.json';
import {contentContract} from '../../engine/gameplay/content-contract';
import {nativeTargetValidator} from '../../engine/gameplay/native-targets';
import {CAPSULE} from '../../data';
import {CAPSULE_RULES} from './rules';
const contract=contentContract(scene,gameplay,{actors:true,manifest:true,nativeTargets:nativeTargetValidator(CAPSULE,CAPSULE_RULES,['door'])});

export const content=contract;
