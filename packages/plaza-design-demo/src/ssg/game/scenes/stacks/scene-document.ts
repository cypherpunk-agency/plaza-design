import scene from './scene.json';
import gameplay from './gameplay.json';
import {contentContract} from '../../engine/gameplay/content-contract';
const shared=contentContract(scene,gameplay,{actors:true,manifest:true});

/** Finite physical trajectory input: policy/conditions remain wholly authored. */
function validateGameplay(value:unknown){
 const d=shared.validateGameplay(value),kind=d.queries?.['stacks.liftKind'];
 if(kind?.kind!=='select'||kind.cases.some(row=>!('literal'in row.value)||![1,2].includes(row.value.literal as number)))throw new Error('STS-2 liftKind requires select outputs 1 or 2');
 return d;
}
export const content={...shared,gameplay:validateGameplay(gameplay),validateGameplay,validateScene:(value:unknown,g=shared.gameplay)=>shared.validateScene(value,validateGameplay(g))};
