import source from './scene.json';
import {contentContract} from '../../engine/gameplay/content-contract';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {SHIFT_GAMEPLAY} from './gameplay';
import {validateShiftGameplay} from './gameplay-contract';
import type {GameplayDefinition} from '../../engine/gameplay/types';
const contract=contentContract(source,SHIFT_GAMEPLAY,{actors:true,manifest:true});
/** Existing objectives and time remain required; ordinary content and source actors are editable. */
export function validateShiftScene(value:unknown,gameplay:GameplayDefinition=SHIFT_GAMEPLAY){const doc=contract.validateScene(value,validateShiftGameplay(gameplay));if(!doc.objectives||!doc.time)throw new Error('Harbor scene retains required objectives/time');return doc as SceneDocument & Required<Pick<SceneDocument,'objectives'|'time'>>;}
export const SHIFT_SCENE=validateShiftScene(source);
