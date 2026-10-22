import {createOpeningModel} from '../story/opening-source';
import {registryLabels} from '../engine/gameplay/rewards';
import {pendingRegistry} from './pending-registry';
import {validatePendingNetwork} from './pending-network';
import type {SceneDef} from '../scenes';
/** References resolve against the same pending native registry and catalogs used by Play. */
export function pendingOpeningStory(documents:ReadonlyMap<string,unknown>,registry:Record<string,SceneDef>=pendingRegistry(documents)){
 const network=validatePendingNetwork(documents,registry);
 return createOpeningModel(documents.get('opening-story'),{scenes:registry,keyring:[...network.keyring.keys()],controlled:registryLabels(network.net),programs:network.net.programs.map(p=>p.id)});
}
