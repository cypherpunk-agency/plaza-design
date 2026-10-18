import beachData from '../scenes/beach/devices.json';
import sandboxData from '../scenes/sandbox/devices.json';
import type {SceneData} from '../data/types';
import {validateBeachGameplay} from '../scenes/beach/gameplay';
import {validateMarketGameplay} from '../scenes/market/gameplay';
import {beachScene} from '../scenes/beach';
import {marketScene} from '../scenes/market';
import {validateWorkshopGameplay,workshopScene} from '../demo/workshop';
import type {Composition} from '../art/core/composition';
import type {GameplayDefinition} from '../engine/gameplay/types';
export const nativeGameplayScenes=[
 {id:'market',gameplayId:'market-gameplay',file:'scenes/market/gameplay.json',validateGameplay:validateMarketGameplay,definition:(c:Composition,g:GameplayDefinition)=>marketScene(c,{},{},validateMarketGameplay(g))},
 {id:'beach',data:beachData as unknown as SceneData,gameplayId:'beach-gameplay',file:'scenes/beach/gameplay.json',validateGameplay:validateBeachGameplay,definition:(c:Composition,g:GameplayDefinition)=>beachScene(c,{},{},validateBeachGameplay(g))},
 {id:'demoWorkshop',data:sandboxData as unknown as SceneData,gameplayId:'demo-workshop-gameplay',file:'demo/workshop.json',validateGameplay:validateWorkshopGameplay,definition:(c:Composition,g:GameplayDefinition)=>workshopScene(c,validateWorkshopGameplay(g))},
];
export const nativeGameplayScene=(id:string)=>nativeGameplayScenes.find(s=>s.id===id||s.gameplayId===id);
