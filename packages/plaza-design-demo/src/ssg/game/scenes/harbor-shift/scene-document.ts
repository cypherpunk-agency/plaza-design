import source from './scene.json';
import {validateSceneDocument,type SceneDocument} from '../../engine/gameplay/scene-document';
import {SHIFT_GAMEPLAY} from './gameplay';
import type {GameplayDefinition} from '../../engine/gameplay/types';
const ids=['boss','parcel','mara','case','rack','trolley','clamp','checkout','statement'];
export function validateShiftScene(value:unknown,gameplay:GameplayDefinition=SHIFT_GAMEPLAY){const doc=validateSceneDocument(value,gameplay);if(!doc.objectives||!doc.time||doc.readables||doc.people||doc.exits||doc.uses.some(u=>u.cycle||u.price!==undefined||u.act!==undefined))throw new Error('Harbor scene retains required objectives/time and original interaction presentation');if(doc.id!=='harborShift'||JSON.stringify(doc.uses.map(u=>u.id))!==JSON.stringify(ids))throw new Error('Harbor scene identity/interaction IDs and order are protected');return doc as SceneDocument & Required<Pick<SceneDocument,'objectives'|'time'>>;}
export const SHIFT_SCENE=validateShiftScene(source);
