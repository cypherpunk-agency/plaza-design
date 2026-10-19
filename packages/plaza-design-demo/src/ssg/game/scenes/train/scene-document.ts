import scene from './scene.json';
import gameplay from './gameplay.json';
import {contentContract} from '../../engine/gameplay/content-contract';
export const transitBindingGroups=['uses','readables','rests','exits'] as const;
export const content=contentContract(scene,gameplay,{manifest:true,actors:true});
