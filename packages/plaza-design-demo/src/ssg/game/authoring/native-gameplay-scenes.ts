import {validateWorkshopGameplay,workshopScene,WORKSHOP_DATA} from '../demo/workshop';
import type {SceneBuildRequest} from './gameplay-scenes';
export const nativeGameplayScenes=[
 {id:'demoWorkshop',data:WORKSHOP_DATA,gameplayId:'demo-workshop-gameplay',file:'demo/workshop.json',validateGameplay:validateWorkshopGameplay,build:(input:SceneBuildRequest)=>workshopScene(input.composition,validateWorkshopGameplay(input.gameplay))},
];
export const nativeGameplayScene=(id:string)=>nativeGameplayScenes.find(s=>s.id===id||s.gameplayId===id);
