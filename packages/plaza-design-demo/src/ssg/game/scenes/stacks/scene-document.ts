import scene from './scene.json';
import gameplay from './gameplay.json';
import {nativeContentContract} from '../../engine/gameplay/content-contract';
import {STACKS} from '../../data';
export const content=nativeContentContract(scene,gameplay,STACKS,['moth'],{actors:true,manifest:true},{derived:['spratFed'],textOnlyDialogues:['moth']});
