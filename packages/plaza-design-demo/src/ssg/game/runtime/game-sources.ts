import type {OpeningStoryModel} from '../story/opening-source';
import type {GameplayDefinition} from '../engine/gameplay/types';
import type {RuntimeSequenceDocuments} from '../story/sequence-documents';
import type {ReviewStationsDocument} from '../demo/review-stations';
import type {CompanionSource} from '../engine/gameplay/companion-source';
import type {CritterReactionDocument} from '../engine/gameplay/critter-reactions';
import type {EngineNetworkContext} from '../engine/network-context';
import type {ContactsModel} from '../story/contacts';
import type {EndCardSource} from '../story/end-card';
/** Private pending documents used by one native Game instance. */
export interface GameRuntimeSources {openingStory?:OpeningStoryModel;sequences?:RuntimeSequenceDocuments;network?:EngineNetworkContext;companionGameplay?:GameplayDefinition;critters?:CritterReactionDocument;companion?:CompanionSource;reviewStations?:ReviewStationsDocument;contacts?:ContactsModel;endCard?:EndCardSource}
