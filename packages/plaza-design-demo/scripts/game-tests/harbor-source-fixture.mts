/** Current authored harbor documents; no retained prototype or source snapshot. */
import source from '../../src/ssg/game/scenes/authored.json';
import {SCENES} from '../../src/ssg/game/scenes';
export const harborEntry=(id:string)=>source.scenes.find(s=>s.scene.id===id)!;
export const HARBOR_SHED=harborEntry('harbor-shed');
export const HARBOR_GAMEPLAY=SCENES['harbor-shed'].gameplay!;
