import scene from './scene.json';
import gameplay from './gameplay.json';
import {nativeContentContract} from '../../engine/gameplay/content-contract';
import {STACKS} from '../../data';
const shared=nativeContentContract(scene,gameplay,STACKS,['moth'],{actors:true,manifest:true},{derived:['spratFed'],textOnlyDialogues:['moth']});

/** Finite physical trajectory input: policy/conditions remain wholly authored. */
function validateGameplay(value:unknown){
 const d=shared.validateGameplay(value),kind=d.queries?.['stacks.liftKind'];
 if(kind?.kind!=='select'||kind.cases.some(row=>!('literal'in row.value)||![1,2].includes(row.value.literal as number)))throw new Error('STS-2 liftKind requires select outputs 1 or 2');
 return d;
}
export const content={...shared,gameplay:validateGameplay(gameplay),validateGameplay,validateScene:(value:unknown,g=shared.gameplay)=>shared.validateScene(value,validateGameplay(g))};
