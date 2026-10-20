import {dockworkerCarry as carry} from '../scene-presentation';
import type {SceneMechanism} from '../scene-mechanisms';
/** The dockworker carries the case while the scene's presentation flags say it is in transit (scene.json `presentation`). */
export const dockworkerCarry:SceneMechanism={
 label:'Dockworker carries the case',requires:[],world:false,
 apply:({scene})=>({dockworkerCarry:(flags:Readonly<Record<string,boolean>>)=>carry(scene.presentation,flags)}),
};
