import {demoCounterScene,demoDeskScene,validateDemoGameplay,validateDemoScene} from '../demo';
/** Explicit migrated-scene registry shared by authoring, protected saves and isolated Play. */
import {validateShiftScene} from '../scenes/harbor-shift/scene-document';
import {validateShiftGameplay} from '../scenes/harbor-shift/gameplay-contract';
import {harborShiftScene} from '../scenes/harbor-shift';
import {shopScene} from '../scenes/shop';
import {validateShopScene,validateShopGameplay} from '../scenes/shop/scene-document';
import {libraryScene} from '../scenes/library';
import {validateLibraryScene,validateLibraryGameplay} from '../scenes/library/scene-document';
import {laundromatScene} from '../scenes/laundromat';
import {validateLaundromatScene,validateLaundromatGameplay} from '../scenes/laundromat/scene-document';
const definitions=[
 {id:'harborShift',prefix:'harbor-shift',validateScene:validateShiftScene,validateGameplay:validateShiftGameplay,definition:harborShiftScene},
 {id:'shop',prefix:'shop',validateScene:validateShopScene,validateGameplay:validateShopGameplay,definition:shopScene},
 {id:'library',prefix:'library',validateScene:validateLibraryScene,validateGameplay:validateLibraryGameplay,definition:libraryScene},
 {id:'laundromat',prefix:'laundromat',validateScene:validateLaundromatScene,validateGameplay:validateLaundromatGameplay,definition:laundromatScene},
 {id:'demoCounter',prefix:'demo-counter',validateScene:(v:unknown,g?:import('../engine/gameplay/types').GameplayDefinition)=>{const d=validateDemoScene(v,g);if(d.id!=='shop')throw new Error('Demo counter identity');return d;},validateGameplay:validateDemoGameplay,definition:demoCounterScene},
 {id:'demoDesk',prefix:'demo-desk',gameplayId:'demo-counter-gameplay',validateScene:(v:unknown,g?:import('../engine/gameplay/types').GameplayDefinition)=>{const d=validateDemoScene(v,g);if(d.id!=='library')throw new Error('Demo desk identity');return d;},validateGameplay:validateDemoGameplay,definition:demoDeskScene},
] as const;
export const gameplayScenes=definitions.map(s=>({...s,gameplayId:'gameplayId'in s?s.gameplayId:s.prefix+'-gameplay'}));
export const authoredDocumentIds=gameplayScenes.flatMap(s=>[s.prefix+'-scene',s.gameplayId]);
export const gameplayScene=(id:string)=>{const scene=gameplayScenes.find(s=>s.id===id||s.prefix===id||s.prefix+'-scene'===id||s.prefix+'-gameplay'===id);if(!scene)throw new Error('Unsupported authored scene: '+id);return scene;};
