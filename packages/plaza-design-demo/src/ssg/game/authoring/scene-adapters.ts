/** Canonical scene adapters: the editor supplies documents to shipping SceneDef factories. */
import type { NativeSceneAdapter } from './native-preview';
import { libraryScene, libraryFrameEnvironment, validateLibraryComposition } from '../scenes/library';
import { capsuleScene, capsuleFrameEnvironment, validateCapsuleComposition } from '../scenes/capsule';
import { mothScene, mothFrameEnvironment, validateMothComposition } from '../scenes/moth';
import { laundromatScene, laundromatFrameEnvironment, validateLaundromatComposition } from '../scenes/laundromat';
import { downtownScene } from '../scenes/downtown';
import { downtownEnvironment, downtownReflections, renderDowntownCity, renderDowntownStreet, renderDowntownPeople, validateDowntownComposition } from '../scenes/downtown/composition';
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
  library: { validate: validateLibraryComposition, definition: libraryScene, environment: (doc, v, e) => libraryFrameEnvironment(v, e, doc) },
  capsule: { validate: validateCapsuleComposition, definition: capsuleScene, environment: (doc, v, e) => capsuleFrameEnvironment(v, e, doc) },
  moth: { validate: validateMothComposition, definition: mothScene, environment: (doc, v, e) => mothFrameEnvironment(v, e, doc) },
  laundromat: { validate: validateLaundromatComposition, definition: laundromatScene, environment: (doc, v, e) => laundromatFrameEnvironment(v, e, doc) },
  galleriaStation: { validate: galleriaStationAdapter.validate, definition: galleriaStationScene, environment: (doc, v) => galleriaStationAdapter.environment(doc, v) },
  harborStation: { validate: harborStationAdapter.validate, definition: harborStationScene, environment: (doc, v) => harborStationAdapter.environment(doc, v) },
  sandbox: { validate: validateSandboxComposition, definition: sandboxScene, environment: (doc, v, e) => sandboxFrameEnvironment(v, e, doc) },
  beach: { validate: validateBeachComposition, definition: beachScene, environment: (doc, v, e) => beachEnvironment(doc, v, e.m, e.hover, BEACH_ACTORS, GULL) },
  warehouse: { validate: validateWarehouseComposition, definition: warehouseScene, environment: (doc, v, e) => warehouseFrameEnvironment(v, e, doc) },
  yard: { validate: validateYardComposition, definition: yardScene, environment: (doc, v, e) => yardFrameEnvironment(v, e, doc),
    frame: () => ({ street: (ctx, view, rain, lit) => renderDowntownStreet(ctx, view, rain, lit) }),
  },
  stacks: { validate: validateStacksComposition, definition: stacksScene, environment: (doc, v, e) => stacksFrameEnvironment(v, e, doc) },
  harbor: { validate: validateHarborComposition, definition: harborScene, environment: (doc, v) => harborEnvironment(doc, v, HARBOR_ACTORS, harborCraneCall()) },
  harborShift: { validate: validateHarborShiftComposition, definition: harborShiftScene, environment: (doc, v) => harborShiftEnvironment(doc, v, HARBOR_SHIFT_ACTORS, SHIFT_USES) },
  market: { validate: validateMarketComposition, definition: marketScene, environment: (doc, v, e) => marketFrameEnvironment(v, e, doc) },
  shop: { validate: validateShopComposition, definition: shopScene, environment: (doc, v, e) => shopFrameEnvironment(v, e, doc) },
  mall: { validate: validateMallComposition, definition: mallScene, environment: (doc, v, e) => mallFrameEnvironment(v, e, doc) },
  metro: { validate: validateMetroComposition, definition: metroScene },
  train: { validate: validateTrainComposition, definition: trainScene },
  downtown: {
    validate: validateDowntownComposition, definition: downtownScene,
    environment: (doc, v, e) => downtownEnvironment(doc, v, { model: e.m, hover: e.hover }),
    frame: (doc, state, options) => ({ reflections: downtownReflections(doc),
      city: (x, v) => renderDowntownCity(x, v, doc, state, options),
      street: (x, v, rain, lit) => renderDowntownStreet(x, v, rain, lit, doc, state, options),
      actors: (x, v) => renderDowntownPeople(x, v, doc, state, options),
    }),
  },
};
