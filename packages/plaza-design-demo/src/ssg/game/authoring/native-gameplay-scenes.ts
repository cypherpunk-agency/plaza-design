import {validateWorkshopGameplay,workshopScene,WORKSHOP_DATA} from '../demo/workshop';
import type {Composition} from '../art/core/composition';
import type {GameplayDefinition} from '../engine/gameplay/types';
export const nativeGameplayScenes=[
 {id:'demoWorkshop',data:WORKSHOP_DATA,gameplayId:'demo-workshop-gameplay',file:'demo/workshop.json',validateGameplay:validateWorkshopGameplay,definition:(c:Composition,g:GameplayDefinition)=>workshopScene(c,validateWorkshopGameplay(g))},
];
export const nativeGameplayScene=(id:string)=>nativeGameplayScenes.find(s=>s.id===id||s.gameplayId===id);
