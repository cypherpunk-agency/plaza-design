import type {Effect,SceneRules} from '../../rules';
import type {Ctx,SceneModel} from '../../model';
import type {SceneMechanism} from '../scene-mechanisms';
/**
 * Mechanism `devicePulse`: a thing reacted (a horn buzzed, a bell rang). The `sbx.pulse` effect
 * (a device or cable names it as its `effect`) stamps the device and the noun with the scene clock;
 * a picture controller reads the stamps and flashes the thing for its own pulse duration. Nothing
 * is saved.
 */
const mark=(m:SceneModel,c:Ctx)=>{m.scratch['pulse.'+c.dev]=m.scratch['pulse.'+c.dev+'.'+c.noun]=m.now();};
export const PULSE_EFFECTS:Record<string,Effect>={'sbx.pulse':(w,c)=>{mark(w.m,c);w.changed();}};
const rules:SceneRules={effects:PULSE_EFFECTS,needs:{devices:[],state:[]}};
export const devicePulse:SceneMechanism={
 label:'Device pulse (sbx.pulse flashes the device that reacted)',requires:[],world:false,
 apply:()=>({rules}),rulesShape:()=>rules,
};
