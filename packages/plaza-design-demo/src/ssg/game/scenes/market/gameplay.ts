import {validateGameplay} from '../../engine/gameplay/validation';
import source from './gameplay.json';
import {validateNativeContract} from '../../engine/gameplay/native-contract';
export const validateMarketGameplay=(value:unknown)=>{const d=validateGameplay(value);if(!d.flags.includes('end'))d.flags.push('end');if(!d.state?.['talk.market.cook.cursor'])throw new Error('Market dialogue schema changed. Reload current sources and reapply older Market gameplay edits; player saves remain compatible.');return validateNativeContract(d,source,undefined,{allowNewContent:true,allowNewVocabulary:true,allowBindingEdits:true});};
export const MARKET_GAMEPLAY=validateMarketGameplay(source);
