import {protectActorIdentity} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {validateGameplay} from '../../engine/gameplay/validation';
import gameplaySource from './gameplay.json';
import sceneSource from './scene.json';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';

const same=(actual:unknown,expected:unknown,label:string)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Laundromat '+label+' are protected');};
/** Ordinary resources, purchases and conversations follow their current shared source references. */
export function validateLaundromatGameplay(value:unknown){return validateGameplay(value);}
export const LAUNDROMAT_GAMEPLAY=validateLaundromatGameplay(gameplaySource);
export const laundromatBindingGroups=['uses','readables','rests','exits'] as const;
export function laundromatSource(value:SceneDocument):SceneDocument{return structuredClone(value);}
/** Current manifest and actor references own ordinary content; physical roles validate at assembly. */
export function validateLaundromatScene(value:unknown,gameplay:GameplayDefinition=LAUNDROMAT_GAMEPLAY){
  const doc=validateSceneDocument(laundromatSource(value as SceneDocument),gameplay,{actors:true,manifest:true});
  same(doc.id,'laundromat','scene ID');
  protectActorIdentity(doc.actors!,sceneSource.actors,{reorder:true,entities:true});
  if(doc.manifest!.people!==undefined)throw new Error('Laundromat actor positions use their registered actor source');
  for(const group of laundromatBindingGroups)if(Object.keys(doc.manifest![group]??{}).sort().join()!==(doc[group]??[]).map(row=>row.id).sort().join())throw new Error('Laundromat manifest must bind every '+group+' entry');
  for(const person of doc.people??[])if(!doc.actors!.some(a=>a.target===person.id))throw new Error('Dialogue requires its actor: '+person.id);
  return doc;
}
export const LAUNDROMAT_SCENE=validateLaundromatScene(sceneSource);
