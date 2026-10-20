import { art } from '../art';
import { folderSceneDefinition } from '../engine/gameplay/folder-scene';
import { FOLDER_BY_ID, FOLDER_DIRS } from '../scenes/folder-scenes';
import { FOLDER_SCENE_IDS } from '../scenes';
import { validateGameplay } from '../engine/gameplay/validation';
import type { SceneDocument } from '../engine/gameplay/scene-document';
import { deviceSourceIdentity } from './device-document-ids';
import {content as trainContent} from '../scenes/train/scene-document';
import {pendingNativeTargetScene} from './native-target-pending';
import {content as downtownContent} from '../scenes/downtown/scene-document';
import {validateBeachGameplay} from '../scenes/beach/gameplay';
import {content as beachContent} from '../scenes/beach/scene-document';
/** Canonical scene adapters: the editor supplies documents to shipping SceneDef factories. */
import type { NativeSceneAdapter } from './native-preview';
import { downtownScene } from '../scenes/downtown';
import { validateDowntownComposition } from '../scenes/downtown/composition';
import { beachScene } from '../scenes/beach';
import { validateBeachComposition } from '../scenes/beach/composition';
import { metroScene } from '../scenes/metro';
import { validateMetroComposition } from '../scenes/metro/composition';
import { trainScene } from '../scenes/train';
import { validateTrainComposition } from '../scenes/train/composition';

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
  beach: { validate: validateBeachComposition, definition: beachScene, pendingDefinition:(doc,state,options,documents)=>{return pendingNativeTargetScene('beach',doc,documents,{...beachContent,validateGameplay:validateBeachGameplay},(source,gameplay,context)=>beachScene(doc,state,options,gameplay,source,context,documents.get('beach-devices') as import('../data/types').SceneData|undefined));} },

  metro: { validate: validateMetroComposition, definition: metroScene },
  train: { validate: validateTrainComposition, definition: trainScene,pendingDefinition:(doc,state,options,documents)=>{const gameplay=trainContent.validateGameplay(documents.get('train-gameplay'));return trainScene(doc,state,options,trainContent.validateScene(documents.get('train-scene'),gameplay),gameplay,documents.get('train-devices') as import('../data/types').SceneData|undefined);} },
  downtown: {
    validate: validateDowntownComposition, definition: downtownScene, pendingDefinition:(doc,_state,options,documents)=>{const gameplay=downtownContent.validateGameplay(documents.get('downtown-gameplay'));return downtownScene(doc,undefined,options,downtownContent.validateScene(documents.get('downtown-scene'),gameplay),gameplay);},
  },
};
