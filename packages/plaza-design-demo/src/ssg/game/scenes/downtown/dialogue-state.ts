import source from './gameplay.json';
import {validateNativeContract} from '../../engine/gameplay/native-contract';
import type {GameplayDefinition} from '../../engine/gameplay/types';
/** Downtown uses ordinary shared state/actions; there is no scene-specific runtime port. */
export function validateDowntownGameplay(value:unknown):GameplayDefinition{
 const definition=validateNativeContract(value,source,undefined,{allowNewContent:true,allowNewVocabulary:true,allowBindingEdits:true});
 for(const id of ['fixer','hood','umbrella','hat','unknown'])if(!definition.conversations['talk.downtown.'+id])throw new Error('Missing registered Downtown conversation '+id);
 return definition;
}
export const DOWNTOWN_DIALOGUE_GAMEPLAY=validateDowntownGameplay(source);
