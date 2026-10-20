/** Downtown is a folder scene (scenes/downtown/*.json): its documents and the scene built from them, for checks that exercise it. */
import {FOLDER_BY_ID} from '../../src/ssg/game/scenes/folder-scenes';
import {folderSceneDefinition} from '../../src/ssg/game/engine/gameplay/folder-scene';
import {declaredSceneOptions} from '../../src/ssg/game/engine/gameplay/declared-scene';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {validateSceneDocument,type SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../src/ssg/game/engine/gameplay/types';
import type {Composition,Environment} from '../../src/ssg/game/art';
export const DOWNTOWN_SOURCE=FOLDER_BY_ID.downtown;
export const DOWNTOWN_DIALOGUE_GAMEPLAY=validateGameplay(DOWNTOWN_SOURCE.gameplay);
const validateScene=(value:unknown,g:GameplayDefinition=DOWNTOWN_DIALOGUE_GAMEPLAY)=>validateSceneDocument(value,g,declaredSceneOptions(value,undefined,DOWNTOWN_SOURCE.composition));
export const content={scene:DOWNTOWN_SOURCE.scene as SceneDocument,gameplay:DOWNTOWN_DIALOGUE_GAMEPLAY,validateGameplay,validateScene};
/** Downtown as the editor builds it: pending composition, preview state, render options, scene and gameplay documents, devices. */
export const downtownScene=(composition?:Composition,state?:Environment['state'],options?:Partial<Environment>,scene?:SceneDocument,gameplay?:GameplayDefinition,devices?:unknown)=>folderSceneDefinition('downtown',DOWNTOWN_SOURCE,{composition,state,options,scene,gameplay,devices});
