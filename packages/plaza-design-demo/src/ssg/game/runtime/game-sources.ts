import type {OpeningStoryModel} from '../story/opening-source';
import type {GameplayDefinition} from '../engine/gameplay/types';
import type {RuntimeSequenceDocuments} from '../story/sequence-documents';
import type {EngineNetworkContext} from '../engine/network-context';
/** Private pending documents used by one native Game instance. */
export interface GameRuntimeSources {openingStory?:OpeningStoryModel;sequences?:RuntimeSequenceDocuments;network?:EngineNetworkContext;companionGameplay?:GameplayDefinition}
