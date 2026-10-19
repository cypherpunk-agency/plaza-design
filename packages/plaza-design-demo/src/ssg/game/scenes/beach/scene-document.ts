import scene from './scene.json';
import {BEACH_GAMEPLAY,validateBeachGameplay} from './gameplay';
import {contentContract} from '../../engine/gameplay/content-contract';
import {nativeTargetValidator} from '../../engine/gameplay/native-targets';
import {BEACH} from '../../data';
import {BEACH_RULES} from './rules';
const contract=contentContract(scene,BEACH_GAMEPLAY,{actors:true,manifest:true,nativeTargets:nativeTargetValidator(BEACH,BEACH_RULES,['stairs-exit']),presentationTargets:['gullShooed']});
export const validateBeachScene=(value:unknown,gameplay=BEACH_GAMEPLAY)=>contract.validateScene(value,validateBeachGameplay(gameplay));
export const content={...contract,validateScene:validateBeachScene};
