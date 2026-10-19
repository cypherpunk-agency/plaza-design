import source from './gameplay.json';
import {validateNativeContract} from '../../engine/gameplay/native-contract';
import type {GameplayDefinition} from '../../engine/gameplay/types';
/** Downtown uses ordinary shared state/actions; there is no scene-specific runtime port. */
export function validateDowntownGameplay(value:unknown):GameplayDefinition{
 const definition=validateNativeContract(value,source,undefined,{allowNewContent:true,allowNewVocabulary:true,allowBindingEdits:true});
 for(const id of ['fixer','hood','umbrella','hat','unknown'])if(!definition.conversations['talk.downtown.'+id])throw new Error('Missing registered Downtown conversation '+id);
 for(const id of ['controlled2F','controlled31','controlledTV','downtown.dlv.passage']){const q=definition.queries?.[id];if(q?.kind!=='select'||q.cases.some(row=>!('literal'in row.value)||typeof row.value.literal!=='boolean'))throw Error('Downtown presentation requires boolean select query '+id);}
 const destination=definition.queries?.['downtown.dlv.destination'];if(destination?.kind!=='select'||destination.cases.some(row=>!('literal'in row.value)||!['market','gate'].includes(String(row.value.literal))))throw Error('DLV-9 destination requires market/gate select output');
 return definition;
}
export const DOWNTOWN_DIALOGUE_GAMEPLAY=validateDowntownGameplay(source);
