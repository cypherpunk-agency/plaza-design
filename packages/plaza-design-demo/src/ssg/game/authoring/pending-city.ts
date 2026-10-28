import {openingStoryModel,validateOpeningSource} from '../story/opening-source';
import {SCENES} from '../scenes';
import {createCityModel} from '../world/city';
import {validateCitySource} from '../world/city-source';
import {createCityPlan} from '../world/cityplan';
import {sharedWorldFlags} from './world-flag-references';
import {validateMetroSource,validateMetroLocks} from '../world/transport/metro-source';
import {pendingRegistry} from './pending-registry';
import {isValidationSnapshot} from './validation-snapshot';
const cities=new WeakMap<ReadonlyMap<string,unknown>,{source:ReturnType<typeof validateCitySource>;world:ReturnType<typeof createCityModel>}>();
/** Map and runtime validate the same prospective scene registry and arrival anchors. */
function checkedCity(value:unknown,documents?:ReadonlyMap<string,unknown>){
 const immutable=documents&&isValidationSnapshot(documents)&&value===documents.get('city-source');
 const cached=immutable?cities.get(documents):undefined;if(cached)return cached;
 const scenes=documents?pendingRegistry(documents):SCENES,story=documents?validateOpeningSource(documents.get('opening-story')):openingStoryModel.source,source=validateCitySource(value,{scenes,flags:sharedWorldFlags(scenes,story.GAMEPLAY)}),world=createCityModel(source,{scenes});
 if(documents?.has('metro-source'))validateMetroLocks(validateMetroSource(documents.get('metro-source')),source.LOCKS);
 const problems=[...world.cityProblems(),...createCityPlan(world).planProblems()];if(problems.length)throw new Error('Invalid city source: '+problems.join('; '));
 const result={source,world};if(immutable)cities.set(documents,result);return result;
}
export function validatePendingCity(value:unknown,documents?:ReadonlyMap<string,unknown>){return structuredClone(checkedCity(value,documents).source);}
export function createPendingCity(value:unknown,documents:ReadonlyMap<string,unknown>){return checkedCity(value,documents).world;}
