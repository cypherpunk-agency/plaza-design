import type {SceneMechanism} from '../scene-mechanisms';
import {validateSandboxGeometry} from '../binding-providers/sandbox';
/** Mechanism `sandboxBay`: the QA bay's controller (devices.json) must name artwork that exists in the composition and has the shape its picture needs. */
export const sandboxBay:SceneMechanism={
 label:'Sandbox bay (checks the picture controller against the artwork)',requires:[],world:false,
 apply:({rows,content})=>{validateSandboxGeometry(content.data??{},rows);return{};},
};
