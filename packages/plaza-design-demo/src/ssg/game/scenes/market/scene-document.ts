import source from './scene.json';
import {MARKET_GAMEPLAY,validateMarketGameplay} from './gameplay';
import {contentContract} from '../../engine/gameplay/content-contract';
export const marketBindingGroups=['uses','readables','rests','exits'] as const;
/** Pre-manifest source bundles omitted these formerly inline bindings. New source documents own their removal explicitly. */
function legacySource(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))return value;
 const old=value as Partial<import('../../engine/gameplay/scene-document').SceneDocument>;
 if(old.actors!==undefined||old.manifest!==undefined)return value;
 const doc=structuredClone(old);doc.people??=[];
 for(const person of source.people.filter(p=>'conversation' in p))if(!doc.people.some(p=>p.id===person.id))doc.people.push(structuredClone(person) as import('../../engine/gameplay/scene-document').ScenePerson);
 doc.rests??=structuredClone(source.rests) as import('../../engine/gameplay/scene-document').SceneDocument['rests'];
 const exit=doc.exits?.find(e=>e.id==='downtown');if(exit&&exit.requires===undefined)exit.requires='end';
 return doc;
}
const contract=contentContract(source,MARKET_GAMEPLAY,{actors:true,manifest:true});
export const MARKET_SCENE=contract.scene;
export const validateMarketScene=(value:unknown,gameplay=MARKET_GAMEPLAY)=>contract.validateScene(legacySource(value),validateMarketGameplay(gameplay));
