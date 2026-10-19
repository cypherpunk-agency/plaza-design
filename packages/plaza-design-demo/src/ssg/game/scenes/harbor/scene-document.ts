import scene from './scene.json';
import gameplay from './gameplay.json';
import {contentContract} from '../../engine/gameplay/content-contract';
export const harborBindingGroups=['uses','readables','rests','exits'] as const;
export const content=contentContract(scene,gameplay,{actors:true,manifest:true,presentationTargets:['craneCall']});
