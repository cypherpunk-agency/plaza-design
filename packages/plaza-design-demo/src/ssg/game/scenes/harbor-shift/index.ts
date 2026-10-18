import {compileSceneDocument,type SceneDocument} from '../../engine/gameplay/scene-document';
import {SHIFT_SCENE,validateShiftScene} from './scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import { harborShiftComposition,harborShiftGeometry,harborShiftLayout,adaptHarborShift,type HarborShiftRenderOptions } from './composition';
import type { Composition,Environment } from '../../art/core/composition';
import { SHIFT_GAMEPLAY,shiftConversation } from './gameplay';
/** Milestone 2: ordinary work, isolated from the campaign by ?play=harborShift. */
import type { Character } from "../../runtime/characters";
import { type SceneDef, type SceneUse } from "../kit";


type Flags = Readonly<Record<string, boolean>>;
export const SHIFT = {
  assigned: 'shift:assigned', parcel: 'shift:parcel', delivered: 'shift:delivered',
  case: 'shift:case', returned: 'shift:returned', trolley: 'shift:trolley',
  inspected: 'shift:inspected', released: 'shift:released', parked: 'shift:parked',
  checked: 'shift:checked', done: 'shift:done',
} as const;
const L = harborShiftLayout();

const boss: Character = { seed: 7301, x: L.boss, look: { body: 'wide', garb: 'jacket', hair: 'cap', top: '#827144', extras: ['phone'] }, act: 'stand', facing: 1 };
const mara: Character = { seed: 7302, x: L.coworker, look: { body: 'tall', garb: 'hivis', hair: 'bun', top: '#b5903a' }, act: 'vend', facing: -1 };


export function shiftCarry(f: Flags): 'parcel' | 'case' | null { return (f[SHIFT.parcel] && !f[SHIFT.delivered]) || (f[SHIFT.case] && !f[SHIFT.returned]) ? f[SHIFT.delivered] ? 'case' : 'parcel' : null; }

const positions=(doc:Composition)=>Object.fromEntries(harborShiftGeometry(doc).filter(row=>row.instance.id.startsWith('use-')).map(row=>[row.instance.id.slice(4),row.placement.x]));
const compile=(doc:ReturnType<typeof validateShiftScene>,composition:Composition)=>compileSceneDocument(doc,positions(composition),(c,id,goal)=>shiftConversation(c,id,goal));
const defaults=compile(SHIFT_SCENE,harborShiftComposition);
export const SHIFT_USES=defaults.uses;
export const shiftGoal=defaults.objective;
export const shiftMinute=defaults.minute;
export function shiftAttention(f:Flags,uses?:SceneUse[]){return defaults.attention(f,uses?Object.fromEntries(uses.map(use=>[use.id,use.x])):undefined);}

const base: Omit<SceneDef,'drawBackdrop'> = {
  id: 'harborShift', name: SHIFT_SCENE.name, width: Number(harborShiftGeometry().find(r=>r.instance.id==='scene')!.props.width), spawn: harborShiftGeometry().find(r=>r.instance.id==='spawn')!.placement.x, exits: [],
  ambient: { sky: true }, facing: 90, horizon: 84,
  intro: SHIFT_SCENE.intro,
  objective: shiftGoal, uses: SHIFT_USES, gameplay:SHIFT_GAMEPLAY,
};

export const HARBOR_SHIFT_ACTORS={boss,mara};
export function harborShiftScene(doc:Composition=harborShiftComposition,state:Environment['state']={},options:HarborShiftRenderOptions={},content:SceneDocument=SHIFT_SCENE,gameplay:GameplayDefinition=SHIFT_GAMEPLAY):SceneDef{const source=validateShiftScene(content,gameplay),compiled=compile(source,doc);return {...adaptHarborShift({...base,name:source.name,intro:source.intro,uses:compiled.uses,objective:compiled.objective,gameplay},HARBOR_SHIFT_ACTORS,doc,state,options),attention:compiled.attention,storyMinute:compiled.minute};}
export const harborShift=harborShiftScene();
