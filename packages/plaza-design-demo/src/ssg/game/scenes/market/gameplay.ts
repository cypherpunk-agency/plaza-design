import source from './gameplay.json';
import {validateNativeContract} from '../../engine/gameplay/native-contract';
export const validateMarketGameplay=(value:unknown)=>validateNativeContract(value,source);
export const MARKET_GAMEPLAY=validateMarketGameplay(source);
