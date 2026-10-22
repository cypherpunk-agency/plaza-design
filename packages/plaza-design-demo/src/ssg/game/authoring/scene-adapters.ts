import { art } from '../art';
import { folderSceneDefinition } from '../engine/gameplay/folder-scene';
import { FOLDER_BY_ID, FOLDER_DIRS } from '../scenes/folder-scenes';
import { FOLDER_SCENE_IDS } from '../scenes';
import { validateGameplay } from '../engine/gameplay/validation';
import {withSharedState} from '../engine/gameplay/shared-state';
import {declaredScene} from '../engine/gameplay/declared-scene';
import type {SceneCatalogue} from '../engine/gameplay/scene-catalogue';
import type { SceneDocument } from '../engine/gameplay/scene-document';
import { deviceSourceIdentity } from './device-document-ids';
/** Canonical scene adapters: the editor supplies documents to shipping SceneDef factories. */
import type { NativeSceneAdapter } from './native-preview';
/** Authored scenes expand the same pending shared declarations as folder scenes and native Play. */
export function authoredSceneAdapter(id:string,documents:ReadonlyMap<string,unknown>|undefined):NativeSceneAdapter|undefined{
 const entry=(documents?.get('authored-scenes') as SceneCatalogue|undefined)?.scenes.find(s=>s.scene.id===id);if(!entry)return;
 return{validate:value=>{const c=art.validate(value);if(c.scene!==id)throw Error('Authored composition identity');return c;},
  definition:(composition,state,options)=>withSharedState(documents?.get('state-owners'),()=>declaredScene(entry.scene,composition,validateGameplay(entry.gameplay),{...options,state},entry.devices))};
}

/** Folder scenes share one adapter: their documents go straight to the declared path. */
const folderAdapter = (id: string): NativeSceneAdapter => ({
  validate: value => { const doc = art.validate(value); if (doc.scene !== id) throw new Error('Expected ' + id + ' composition'); return doc; },
  definition: (doc, state, options) => folderSceneDefinition(id, FOLDER_BY_ID[id], { composition: doc, state, options }),
  pendingDefinition: (doc, state, options, documents) => {
    const dir = FOLDER_DIRS[id] ?? id, gameplay = validateGameplay(documents.get(dir + '-gameplay') ?? FOLDER_BY_ID[id].gameplay);
    return folderSceneDefinition(id, FOLDER_BY_ID[id], { composition: doc, state, options, gameplay, scene: (documents.get(dir + '-scene') ?? FOLDER_BY_ID[id].scene) as SceneDocument, devices: documents.get(deviceSourceIdentity(id).devices) ?? FOLDER_BY_ID[id].devices });
  },
});
/** This explicit table grows as each real scene document passes its migration checks. */
export const nativeSceneAdapters: Record<string, NativeSceneAdapter> = {
  ...Object.fromEntries(FOLDER_SCENE_IDS.map(id => [id, folderAdapter(id)])),

};
