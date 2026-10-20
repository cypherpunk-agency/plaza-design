import source from './scene.json';
import {contentContract} from '../../engine/gameplay/content-contract';
import {SHIFT_GAMEPLAY} from './gameplay';
import {validateShiftGameplay} from './gameplay-contract';
import type {GameplayDefinition} from '../../engine/gameplay/types';
const contract=contentContract(source,SHIFT_GAMEPLAY,{actors:true,manifest:true});
/** References resolve against the current authored graph; removed content stays absent. */
export function validateShiftScene(value:unknown,gameplay:GameplayDefinition=SHIFT_GAMEPLAY){return contract.validateScene(value,validateShiftGameplay(gameplay));}
export const SHIFT_SCENE=validateShiftScene(source);
