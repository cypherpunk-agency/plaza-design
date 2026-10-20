import source from './gameplay.json';
import {validateNativeContract} from '../../engine/gameplay/native-contract';
/** Authored references are validated prospectively; original dialogue IDs are not requirements. */
export const validateMarketGameplay=(value:unknown)=>validateNativeContract(value,source,undefined,{allowNewContent:true,allowNewVocabulary:true,allowBindingEdits:true});
export const MARKET_GAMEPLAY=validateMarketGameplay(source);
