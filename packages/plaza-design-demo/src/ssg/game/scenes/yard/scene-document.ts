import scene from './scene.json';
import gameplay from './gameplay.json';
import {contentContract} from '../../engine/gameplay/content-contract';
import {nativeTargetValidator} from '../../engine/gameplay/native-targets';
import {YARD} from '../../data';
import {YARD_RULES} from './effects';
export const content=contentContract(scene,gameplay,{actors:true,manifest:true,nativeTargets:nativeTargetValidator(YARD,YARD_RULES,['tray'])});
