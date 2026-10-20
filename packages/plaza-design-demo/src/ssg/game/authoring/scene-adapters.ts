import { art } from '../art';
import { folderSceneDefinition } from '../engine/gameplay/folder-scene';
import { FOLDER_BY_ID } from '../scenes/folder-scenes';
import { FOLDER_SCENE_IDS } from '../scenes';
import { validateGameplay } from '../engine/gameplay/validation';
import type { SceneDocument } from '../engine/gameplay/scene-document';
import { deviceSourceIdentity } from './device-document-ids';
import {content as trainContent} from '../scenes/train/scene-document';
import {pendingNativeTargetScene} from './native-target-pending';
import {content as downtownContent} from '../scenes/downtown/scene-document';
import {validateShiftScene} from '../scenes/harbor-shift/scene-document';
import {validateShiftGameplay} from '../scenes/harbor-shift/gameplay-contract';
import {validateMarketScene} from '../scenes/market/scene-document';
import {validateMarketGameplay} from '../scenes/market/gameplay';
import {content as harborContent} from '../scenes/harbor/scene-document';
import {validateMallScene,validateMallGameplay} from '../scenes/mall/scene-document';
import {validateBeachGameplay} from '../scenes/beach/gameplay';
import {content as beachContent} from '../scenes/beach/scene-document';
import {content as mothContent} from '../scenes/moth/scene-document';
import {content as yardContent} from '../scenes/yard/scene-document';
import {content as capsuleContent} from '../scenes/capsule/scene-document';
import {content as sandboxContent} from '../scenes/sandbox/scene-document';
import {validateLaundromatGameplay,validateLaundromatScene} from '../scenes/laundromat/scene-document';
/** Canonical scene adapters: the editor supplies documents to shipping SceneDef factories. */
import type { NativeSceneAdapter } from './native-preview';
import { capsuleScene, capsuleFrameEnvironment, validateCapsuleComposition } from '../scenes/capsule';
import { mothScene, mothFrameEnvironment, validateMothComposition } from '../scenes/moth';
import { laundromatScene, laundromatFrameEnvironment, validateLaundromatComposition } from '../scenes/laundromat';
import { downtownScene } from '../scenes/downtown';
import { validateDowntownComposition } from '../scenes/downtown/composition';
import { galleriaStationScene } from '../scenes/galleriaStation';
import { harborStationScene } from '../scenes/harborStation';
import { galleriaStationAdapter } from '../scenes/galleriaStation/composition';
import { harborStationAdapter } from '../scenes/harborStation/composition';
import { sandboxScene, sandboxFrameEnvironment, validateSandboxComposition } from '../scenes/sandbox';
import { beachScene } from '../scenes/beach';
import { validateBeachComposition } from '../scenes/beach/composition';
import { yardScene, yardFrameEnvironment, validateYardComposition } from '../scenes/yard';
import { harborScene } from '../scenes/harbor';
import { validateHarborComposition } from '../scenes/harbor/composition';
import { harborShiftScene, HARBOR_SHIFT_ACTORS, SHIFT_USES } from '../scenes/harbor-shift';
import { harborShiftEnvironment, validateHarborShiftComposition } from '../scenes/harbor-shift/composition';
import { marketScene, marketFrameEnvironment } from '../scenes/market';
import { validateMarketComposition } from '../scenes/market/composition';
import { mallScene, mallFrameEnvironment } from '../scenes/mall';
import { validateMallComposition } from '../scenes/mall/composition';
import { metroScene } from '../scenes/metro';
import { validateMetroComposition } from '../scenes/metro/composition';
import { trainScene } from '../scenes/train';
import { validateTrainComposition } from '../scenes/train/composition';

/** Folder scenes share one adapter: their documents go straight to the declared path. */
const folderAdapter = (id: string): NativeSceneAdapter => ({
  validate: value => { const doc = art.validate(value); if (doc.scene !== id) throw new Error('Expected ' + id + ' composition'); return doc; },
  definition: (doc, state, options) => folderSceneDefinition(id, FOLDER_BY_ID[id], { composition: doc, state, options }),
  pendingDefinition: (doc, state, options, documents) => {
    const gameplay = validateGameplay(documents.get(id + '-gameplay') ?? FOLDER_BY_ID[id].gameplay);
    return folderSceneDefinition(id, FOLDER_BY_ID[id], { composition: doc, state, options, gameplay, scene: (documents.get(id + '-scene') ?? FOLDER_BY_ID[id].scene) as SceneDocument, devices: documents.get(deviceSourceIdentity(id).devices) ?? FOLDER_BY_ID[id].devices });
  },
});
/** This explicit table grows as each real scene document passes its migration checks. */
export const nativeSceneAdapters: Record<string, NativeSceneAdapter> = {
  ...Object.fromEntries(FOLDER_SCENE_IDS.map(id => [id, folderAdapter(id)])),
  capsule: { validate: validateCapsuleComposition, definition: capsuleScene, pendingDefinition:(doc,state,options,documents)=>{return pendingNativeTargetScene('capsule',doc,documents,capsuleContent,(source,gameplay,context)=>capsuleScene(doc,state,options,source,gameplay,context,documents.get('capsule-devices') as import('../data/types').SceneData|undefined));}, environment: (doc, v, e) => capsuleFrameEnvironment(v, e, doc) },
  moth: { validate: validateMothComposition, definition: mothScene, pendingDefinition:(doc,state,options,documents)=>{return pendingNativeTargetScene('moth',doc,documents,mothContent,(source,gameplay,context)=>mothScene(doc,state,options,source,gameplay,context,documents.get('moth-devices') as import('../data/types').SceneData|undefined));}, environment: (doc, v, e) => mothFrameEnvironment(v, e, doc) },
  laundromat: { validate: validateLaundromatComposition, definition: laundromatScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=validateLaundromatGameplay(documents.get('laundromat-gameplay'));return laundromatScene(doc,state,options,validateLaundromatScene(documents.get('laundromat-scene'),gameplay),gameplay,documents.get('laundromat-devices') as import('../data/types').SceneData|undefined);}, environment: (doc, v, e) => laundromatFrameEnvironment(v, e, doc) },
  galleriaStation: { validate: galleriaStationAdapter.validate, definition: galleriaStationScene, environment: (doc, v) => galleriaStationAdapter.environment(doc, v) },
  harborStation: { validate: harborStationAdapter.validate, definition: harborStationScene, environment: (doc, v) => harborStationAdapter.environment(doc, v) },
  sandbox: { validate: validateSandboxComposition, definition: sandboxScene, pendingDefinition:(doc,state,options,documents)=>{return pendingNativeTargetScene('sandbox',doc,documents,sandboxContent,(source,gameplay,context)=>sandboxScene(doc,state,options,documents.get('sandbox-behavior') as import('../data/types').SceneData|undefined,source,gameplay,context));}, environment: (doc, v, e) => sandboxFrameEnvironment(v, e, doc) },
  beach: { validate: validateBeachComposition, definition: beachScene, pendingDefinition:(doc,state,options,documents)=>{return pendingNativeTargetScene('beach',doc,documents,{...beachContent,validateGameplay:validateBeachGameplay},(source,gameplay,context)=>beachScene(doc,state,options,gameplay,source,context,documents.get('beach-devices') as import('../data/types').SceneData|undefined));} },
  yard: { validate: validateYardComposition, definition: yardScene, pendingDefinition:(doc,state,options,documents)=>{return pendingNativeTargetScene('yard',doc,documents,yardContent,(source,gameplay,context)=>yardScene(doc,state,options,source,gameplay,context,documents.get('yard-devices') as import('../data/types').SceneData|undefined));}, environment: (doc, v, e) => yardFrameEnvironment(v, e, doc),
  },
  harbor: { validate: validateHarborComposition, definition: harborScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=harborContent.validateGameplay(documents.get('harbor-gameplay'));return harborScene(doc,state,options,harborContent.validateScene(documents.get('harbor-scene'),gameplay),gameplay);} },
  harborShift: { validate: validateHarborShiftComposition, definition: harborShiftScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=validateShiftGameplay(documents.get('harbor-shift-gameplay'));return harborShiftScene(doc,state,options,validateShiftScene(documents.get('harbor-shift-scene'),gameplay),gameplay);}, environment: (doc, v) => harborShiftEnvironment(doc, v, HARBOR_SHIFT_ACTORS, SHIFT_USES) },
  market: { validate: validateMarketComposition, definition: marketScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=validateMarketGameplay(documents.get('market-gameplay'));return marketScene(doc,state,options,gameplay,validateMarketScene(documents.get('market-scene'),gameplay));}, environment: (doc, v, e) => marketFrameEnvironment(v, e, doc) },
  mall: { validate: validateMallComposition, definition: mallScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=validateMallGameplay(documents.get('mall-gameplay'));return mallScene(doc,state,options,validateMallScene(documents.get('mall-scene'),gameplay),gameplay);}, environment: (doc, v, e) => mallFrameEnvironment(v, e, doc) },
  metro: { validate: validateMetroComposition, definition: metroScene },
  train: { validate: validateTrainComposition, definition: trainScene,pendingDefinition:(doc,state,options,documents)=>{const gameplay=trainContent.validateGameplay(documents.get('train-gameplay'));return trainScene(doc,state,options,trainContent.validateScene(documents.get('train-scene'),gameplay),gameplay,documents.get('train-devices') as import('../data/types').SceneData|undefined);} },
  downtown: {
    validate: validateDowntownComposition, definition: downtownScene, pendingDefinition:(doc,_state,options,documents)=>{const gameplay=downtownContent.validateGameplay(documents.get('downtown-gameplay'));return downtownScene(doc,undefined,options,downtownContent.validateScene(documents.get('downtown-scene'),gameplay),gameplay);},
  },
};
