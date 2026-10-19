import {content as downtownContent} from '../scenes/downtown/scene-document';
import {validateShiftScene} from '../scenes/harbor-shift/scene-document';
import {validateShiftGameplay} from '../scenes/harbor-shift/gameplay-contract';
import {validateMarketScene} from '../scenes/market/scene-document';
import {validateMarketGameplay} from '../scenes/market/gameplay';
import {content as harborContent} from '../scenes/harbor/scene-document';
import {validateMallScene,validateMallGameplay} from '../scenes/mall/scene-document';
import {validateBeachGameplay} from '../scenes/beach/gameplay';
import {content as beachContent} from '../scenes/beach/scene-document';
import {content as stacksContent} from '../scenes/stacks/scene-document';
import {content as mothContent} from '../scenes/moth/scene-document';
import {content as yardContent} from '../scenes/yard/scene-document';
import {content as capsuleContent} from '../scenes/capsule/scene-document';
import {content as sandboxContent} from '../scenes/sandbox/scene-document';
import {validateWarehouseGameplay,validateWarehouseScene} from '../scenes/warehouse/scene-document';
import {validateLaundromatGameplay,validateLaundromatScene} from '../scenes/laundromat/scene-document';
import {validateLibraryGameplay,validateLibraryScene} from '../scenes/library/scene-document';
import {validateShopScene,validateShopGameplay} from '../scenes/shop/scene-document';
/** Canonical scene adapters: the editor supplies documents to shipping SceneDef factories. */
import type { NativeSceneAdapter } from './native-preview';
import { libraryScene, libraryFrameEnvironment, validateLibraryComposition } from '../scenes/library';
import { capsuleScene, capsuleFrameEnvironment, validateCapsuleComposition } from '../scenes/capsule';
import { mothScene, mothFrameEnvironment, validateMothComposition } from '../scenes/moth';
import { laundromatScene, laundromatFrameEnvironment, validateLaundromatComposition } from '../scenes/laundromat';
import { downtownScene } from '../scenes/downtown';
import { downtownEnvironment, downtownReflections, renderDowntownCity, renderDowntownStreet, validateDowntownComposition } from '../scenes/downtown/composition';
import { galleriaStationScene } from '../scenes/galleriaStation';
import { harborStationScene } from '../scenes/harborStation';
import { galleriaStationAdapter } from '../scenes/galleriaStation/composition';
import { harborStationAdapter } from '../scenes/harborStation/composition';
import { sandboxScene, sandboxFrameEnvironment, validateSandboxComposition } from '../scenes/sandbox';
import { beachScene } from '../scenes/beach';
import { beachEnvironment, validateBeachComposition } from '../scenes/beach/composition';
import { BEACH_ACTORS, GULL } from '../scenes/beach/scene';
import { warehouseScene, warehouseFrameEnvironment, validateWarehouseComposition } from '../scenes/warehouse';
import { yardScene, yardFrameEnvironment, validateYardComposition } from '../scenes/yard';
import { stacksScene, stacksFrameEnvironment, validateStacksComposition } from '../scenes/stacks';
import { harborScene, HARBOR_ACTORS, harborCraneCall } from '../scenes/harbor';
import { harborEnvironment, validateHarborComposition } from '../scenes/harbor/composition';
import { harborShiftScene, HARBOR_SHIFT_ACTORS, SHIFT_USES } from '../scenes/harbor-shift';
import { harborShiftEnvironment, validateHarborShiftComposition } from '../scenes/harbor-shift/composition';
import { marketScene, marketFrameEnvironment } from '../scenes/market';
import { validateMarketComposition } from '../scenes/market/composition';
import { shopScene, shopFrameEnvironment } from '../scenes/shop';
import { validateShopComposition } from '../scenes/shop/composition';
import { mallScene, mallFrameEnvironment } from '../scenes/mall';
import { validateMallComposition } from '../scenes/mall/composition';
import { metroScene } from '../scenes/metro';
import { validateMetroComposition } from '../scenes/metro/composition';
import { trainScene } from '../scenes/train';
import { validateTrainComposition } from '../scenes/train/composition';

/** This explicit table grows as each real scene document passes its migration checks. */
export const nativeSceneAdapters: Record<string, NativeSceneAdapter> = {
  library: { validate: validateLibraryComposition, definition: libraryScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=validateLibraryGameplay(documents.get('library-gameplay'));return libraryScene(doc,state,options,validateLibraryScene(documents.get('library-scene'),gameplay),gameplay);}, environment: (doc, v, e) => libraryFrameEnvironment(v, e, doc) },
  capsule: { validate: validateCapsuleComposition, definition: capsuleScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=capsuleContent.validateGameplay(documents.get('capsule-gameplay'));return capsuleScene(doc,state,options,capsuleContent.validateScene(documents.get('capsule-scene'),gameplay),gameplay);}, environment: (doc, v, e) => capsuleFrameEnvironment(v, e, doc) },
  moth: { validate: validateMothComposition, definition: mothScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=mothContent.validateGameplay(documents.get('moth-gameplay'));return mothScene(doc,state,options,mothContent.validateScene(documents.get('moth-scene'),gameplay),gameplay);}, environment: (doc, v, e) => mothFrameEnvironment(v, e, doc) },
  laundromat: { validate: validateLaundromatComposition, definition: laundromatScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=validateLaundromatGameplay(documents.get('laundromat-gameplay'));return laundromatScene(doc,state,options,validateLaundromatScene(documents.get('laundromat-scene'),gameplay),gameplay);}, environment: (doc, v, e) => laundromatFrameEnvironment(v, e, doc) },
  galleriaStation: { validate: galleriaStationAdapter.validate, definition: galleriaStationScene, environment: (doc, v) => galleriaStationAdapter.environment(doc, v) },
  harborStation: { validate: harborStationAdapter.validate, definition: harborStationScene, environment: (doc, v) => harborStationAdapter.environment(doc, v) },
  sandbox: { validate: validateSandboxComposition, definition: sandboxScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=sandboxContent.validateGameplay(documents.get('sandbox-gameplay'));return sandboxScene(doc,state,options,undefined,sandboxContent.validateScene(documents.get('sandbox-scene'),gameplay),gameplay);}, environment: (doc, v, e) => sandboxFrameEnvironment(v, e, doc) },
  beach: { validate: validateBeachComposition, definition: beachScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=validateBeachGameplay(documents.get('beach-gameplay'));return beachScene(doc,state,options,gameplay,beachContent.validateScene(documents.get('beach-scene'),gameplay));}, environment: (doc, v, e) => beachEnvironment(doc, v, e.m, e.hover, BEACH_ACTORS, GULL) },
  warehouse: { validate: validateWarehouseComposition, definition: warehouseScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=validateWarehouseGameplay(documents.get('warehouse-gameplay'));return warehouseScene(doc,state,options,validateWarehouseScene(documents.get('warehouse-scene'),gameplay),gameplay);}, environment: (doc, v, e) => warehouseFrameEnvironment(v, e, doc) },
  yard: { validate: validateYardComposition, definition: yardScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=yardContent.validateGameplay(documents.get('yard-gameplay'));return yardScene(doc,state,options,yardContent.validateScene(documents.get('yard-scene'),gameplay),gameplay);}, environment: (doc, v, e) => yardFrameEnvironment(v, e, doc),
    frame: () => ({ street: (ctx, view, rain, lit) => renderDowntownStreet(ctx, view, rain, lit) }),
  },
  stacks: { validate: validateStacksComposition, definition: stacksScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=stacksContent.validateGameplay(documents.get('stacks-gameplay'));return stacksScene(doc,state,options,stacksContent.validateScene(documents.get('stacks-scene'),gameplay),gameplay);}, environment: (doc, v, e) => stacksFrameEnvironment(v, e, doc) },
  harbor: { validate: validateHarborComposition, definition: harborScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=harborContent.validateGameplay(documents.get('harbor-gameplay'));return harborScene(doc,state,options,harborContent.validateScene(documents.get('harbor-scene'),gameplay),gameplay);}, environment: (doc, v) => harborEnvironment(doc, v, HARBOR_ACTORS, harborCraneCall()) },
  harborShift: { validate: validateHarborShiftComposition, definition: harborShiftScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=validateShiftGameplay(documents.get('harbor-shift-gameplay'));return harborShiftScene(doc,state,options,validateShiftScene(documents.get('harbor-shift-scene'),gameplay),gameplay);}, environment: (doc, v) => harborShiftEnvironment(doc, v, HARBOR_SHIFT_ACTORS, SHIFT_USES) },
  market: { validate: validateMarketComposition, definition: marketScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=validateMarketGameplay(documents.get('market-gameplay'));return marketScene(doc,state,options,gameplay,validateMarketScene(documents.get('market-scene'),gameplay));}, environment: (doc, v, e) => marketFrameEnvironment(v, e, doc) },
  shop: { validate: validateShopComposition, definition: shopScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=validateShopGameplay(documents.get('shop-gameplay'));return shopScene(doc,state,options,validateShopScene(documents.get('shop-scene'),gameplay),gameplay);}, environment: (doc, v, e) => shopFrameEnvironment(v, e, doc) },
  mall: { validate: validateMallComposition, definition: mallScene, pendingDefinition:(doc,state,options,documents)=>{const gameplay=validateMallGameplay(documents.get('mall-gameplay'));return mallScene(doc,state,options,validateMallScene(documents.get('mall-scene'),gameplay),gameplay);}, environment: (doc, v, e) => mallFrameEnvironment(v, e, doc) },
  metro: { validate: validateMetroComposition, definition: metroScene },
  train: { validate: validateTrainComposition, definition: trainScene },
  downtown: {
    validate: validateDowntownComposition, definition: downtownScene, pendingDefinition:(doc,_state,options,documents)=>{const gameplay=downtownContent.validateGameplay(documents.get('downtown-gameplay'));return downtownScene(doc,undefined,options,downtownContent.validateScene(documents.get('downtown-scene'),gameplay),gameplay);},
    environment: (doc, v, e) => downtownEnvironment(doc, v, { model: e.m, hover: e.hover }),
    frame: (doc, state, options) => ({ reflections: downtownReflections(doc),
      city: (x, v) => renderDowntownCity(x, v, doc, state, options),
      street: (x, v, rain, lit) => renderDowntownStreet(x, v, rain, lit, doc, state, options),
    }),
  },
};
