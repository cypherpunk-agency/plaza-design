import type {SceneMechanism} from '../scene-mechanisms';
/** Mechanism `targetReset`: the scene's engine targets (scene.json nativeTargets) may use the `reset` step, which puts the scene back to its first state. */
export const targetReset:SceneMechanism={
 label:'Reset step for engine targets (puts the scene back to its start)',requires:[],world:false,targetReset:true,
 apply:()=>({}),
};
