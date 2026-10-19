import source from './scene.json';
import {MARKET_GAMEPLAY,validateMarketGameplay} from './gameplay';
import {contentContract} from '../../engine/gameplay/content-contract';
export const marketBindingGroups=['uses','readables','rests','exits'] as const;
const contract=contentContract(source,MARKET_GAMEPLAY,{actors:true,manifest:true});
export const MARKET_SCENE=contract.scene;
export const validateMarketScene=(value:unknown,gameplay=MARKET_GAMEPLAY)=>contract.validateScene(value,validateMarketGameplay(gameplay));
