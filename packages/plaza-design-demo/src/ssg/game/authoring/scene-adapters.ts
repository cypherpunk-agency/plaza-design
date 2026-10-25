import {pendingNetworkContext} from './pending-network';
import { art } from '../art';
import { sceneSourceDefinition } from '../engine/gameplay/folder-scene';
import { FOLDER_BY_ID } from '../scenes/folder-scenes';
import { FOLDER_SCENE_IDS } from '../scenes';
import { validateGameplay } from '../engine/gameplay/validation';
import type {SceneCatalogue} from '../engine/gameplay/scene-catalogue';
import type { SceneDocument } from '../engine/gameplay/scene-document';
import { deviceSourceIdentity } from './device-document-ids';
/** Canonical scene adapters: the editor supplies documents to shipping SceneDef factories. */
import type { NativeSceneAdapter } from './native-preview';
/** Authored scenes expand the same pending shared declarations as folder scenes and native Play. */
export function authoredSceneAdapter(id:string,documents:ReadonlyMap<string,unknown>|undefined):NativeSceneAdapter|undefined{
 const entry=(documents?.get('authored-scenes') as SceneCatalogue|undefined)?.scenes.find(s=>s.scene.id===id);if(!entry)return;
 return{validate:value=>{const c=art.validate(value);if(c.scene!==id)throw Error('Authored composition identity');return c;},
  definition:(composition,state,options)=>sceneSourceDefinition(id,entry,{composition,state,options,sharedState:documents?.get('state-owners'),network:documents?pendingNetworkContext(documents):undefined})};
}

/** Folder scenes share one adapter: their documents go straight to the declared path. */
const folderAdapter = (id: string): NativeSceneAdapter => ({
  validate: value => { const doc = art.validate(value); if (doc.scene !== id) throw new Error('Expected ' + id + ' composition'); return doc; },
  definition: (doc, state, options) => sceneSourceDefinition(id, FOLDER_BY_ID[id], { composition: doc, state, options }),
  pendingDefinition: (doc, state, options, documents) => {
    const source=deviceSourceIdentity(id),sharedState=documents.get('state-owners'),gameplay=validateGameplay(documents.get(source.gameplay)??FOLDER_BY_ID[id].gameplay,sharedState);
    return sceneSourceDefinition(id, FOLDER_BY_ID[id], { composition: doc, state, options, gameplay, sharedState,network:pendingNetworkContext(documents),scene: (documents.get(source.scene) ?? FOLDER_BY_ID[id].scene) as SceneDocument, devices: documents.get(source.devices) ?? FOLDER_BY_ID[id].devices });
  },
});
/** All shipping folder sources use the same native assembly contract. */
export const nativeSceneAdapters:Record<string,NativeSceneAdapter>=Object.fromEntries(FOLDER_SCENE_IDS.map(id=>[id,folderAdapter(id)]));
