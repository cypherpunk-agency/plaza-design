import { art } from '../art';
import { folderSceneDefinition } from '../engine/gameplay/folder-scene';
import { FOLDER_BY_ID, FOLDER_DIRS } from '../scenes/folder-scenes';
import { FOLDER_SCENE_IDS } from '../scenes';
import { validateGameplay } from '../engine/gameplay/validation';
import type { SceneDocument } from '../engine/gameplay/scene-document';
import { deviceSourceIdentity } from './device-document-ids';
import {pendingNativeTargetScene} from './native-target-pending';
import {content as downtownContent} from '../scenes/downtown/scene-document';
import {validateBeachGameplay} from '../scenes/beach/gameplay';
import {content as beachContent} from '../scenes/beach/scene-document';
import {content as yardContent} from '../scenes/yard/scene-document';
import {content as capsuleContent} from '../scenes/capsule/scene-document';
import {content as sandboxContent} from '../scenes/sandbox/scene-document';
/** Canonical scene adapters: the editor supplies documents to shipping SceneDef factories. */
import type { NativeSceneAdapter } from './native-preview';
import { capsuleScene, capsuleFrameEnvironment, validateCapsuleComposition } from '../scenes/capsule';
import { downtownScene } from '../scenes/downtown';
import { validateDowntownComposition } from '../scenes/downtown/composition';
import { sandboxScene, sandboxFrameEnvironment, validateSandboxComposition } from '../scenes/sandbox';
import { beachScene } from '../scenes/beach';
import { validateBeachComposition } from '../scenes/beach/composition';
import { yardScene, yardFrameEnvironment, validateYardComposition } from '../scenes/yard';

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
  capsule: { validate: validateCapsuleComposition, definition: capsuleScene, pendingDefinition:(doc,state,options,documents)=>{return pendingNativeTargetScene('capsule',doc,documents,capsuleContent,(source,gameplay,context)=>capsuleScene(doc,state,options,source,gameplay,context,documents.get('capsule-devices') as import('../data/types').SceneData|undefined));}, environment: (doc, v, e) => capsuleFrameEnvironment(v, e, doc) },
  sandbox: { validate: validateSandboxComposition, definition: sandboxScene, pendingDefinition:(doc,state,options,documents)=>{return pendingNativeTargetScene('sandbox',doc,documents,sandboxContent,(source,gameplay,context)=>sandboxScene(doc,state,options,documents.get('sandbox-behavior') as import('../data/types').SceneData|undefined,source,gameplay,context));}, environment: (doc, v, e) => sandboxFrameEnvironment(v, e, doc) },
  beach: { validate: validateBeachComposition, definition: beachScene, pendingDefinition:(doc,state,options,documents)=>{return pendingNativeTargetScene('beach',doc,documents,{...beachContent,validateGameplay:validateBeachGameplay},(source,gameplay,context)=>beachScene(doc,state,options,gameplay,source,context,documents.get('beach-devices') as import('../data/types').SceneData|undefined));} },
  yard: { validate: validateYardComposition, definition: yardScene, pendingDefinition:(doc,state,options,documents)=>{return pendingNativeTargetScene('yard',doc,documents,yardContent,(source,gameplay,context)=>yardScene(doc,state,options,source,gameplay,context,documents.get('yard-devices') as import('../data/types').SceneData|undefined));}, environment: (doc, v, e) => yardFrameEnvironment(v, e, doc),
  },

  downtown: {
    validate: validateDowntownComposition, definition: downtownScene, pendingDefinition:(doc,_state,options,documents)=>{const gameplay=downtownContent.validateGameplay(documents.get('downtown-gameplay'));return downtownScene(doc,undefined,options,downtownContent.validateScene(documents.get('downtown-scene'),gameplay),gameplay);},
  },
};
