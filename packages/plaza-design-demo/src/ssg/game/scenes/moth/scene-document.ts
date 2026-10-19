import scene from './scene.json';
import gameplay from './gameplay.json';
import {contentContract} from '../../engine/gameplay/content-contract';
import {nativeTargetValidator} from '../../engine/gameplay/native-targets';
import {MOTH} from '../../data';
import {MOTH_RULES} from './rules';
export const content=contentContract(scene,gameplay,{actors:true,manifest:true,nativeTargets:nativeTargetValidator(MOTH,MOTH_RULES,['door'])});
