import type {SceneDef} from '../scenes/kit';import type {SceneRules} from './rules';
export const NO_RULES:SceneRules={effects:{}};
/** Resolve registered rule vocabulary without creating a model, timers or player storage. */
export function sceneRuleContract(scene:SceneDef):SceneRules{return typeof scene.rules==='function'?scene.rules({save:()=>({handle:'',tokens:0,jump:false,controlled:[],flags:{}}),persist:()=>{},nodes:()=>0,granted:()=>{},end:()=>{}}):scene.rules??NO_RULES;}
