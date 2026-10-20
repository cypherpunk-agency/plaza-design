import {openingStoryModel,validateOpeningSource} from '../story/opening-source';
import {SCENES} from '../scenes';
import {createCityModel} from '../world/city';
import {validateCitySource} from '../world/city-source';
import {createCityPlan} from '../world/cityplan';
import {sharedWorldFlags} from './world-flag-references';
import {pendingRegistry} from './pending-registry';
/** Map and runtime validate the same prospective scene registry and arrival anchors. */
function checkedCity(value:unknown,documents?:ReadonlyMap<string,unknown>){
 const scenes=documents?pendingRegistry(documents):SCENES,story=documents?validateOpeningSource(documents.get('opening-story')):openingStoryModel.source,source=validateCitySource(value,{scenes,flags:sharedWorldFlags(scenes,story.GAMEPLAY)}),world=createCityModel(source,{scenes});
 const problems=[...world.cityProblems(),...createCityPlan(world).planProblems()];if(problems.length)throw new Error('Invalid city source: '+problems.join('; '));
 return{source,world};
}
export function validatePendingCity(value:unknown,documents?:ReadonlyMap<string,unknown>){return checkedCity(value,documents).source;}
export function createPendingCity(value:unknown,documents:ReadonlyMap<string,unknown>){return checkedCity(value,documents).world;}
