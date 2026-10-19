import scene from './scene.json';import gameplay from './gameplay.json';
import {validateDowntownGameplay} from './dialogue-state';
import {contentContract} from '../../engine/gameplay/content-contract';
export const downtownBindingGroups=['uses','readables','rests','exits'] as const;
const contract=contentContract(scene,gameplay,{manifest:true,actors:true});
export const content={...contract,gameplay:validateDowntownGameplay(gameplay),validateGameplay:validateDowntownGameplay,validateScene:(value:unknown,g=contract.gameplay)=>contract.validateScene(value&&typeof value==='object'&&!('actors'in value)?{...value,actors:scene.actors}:value,validateDowntownGameplay(g))};
export const validateDowntownScene=content.validateScene;
