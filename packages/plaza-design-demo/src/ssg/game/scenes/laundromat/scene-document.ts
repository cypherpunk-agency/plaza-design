import {protectActorIdentity} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {validateNativeContract} from '../../engine/gameplay/native-contract';
import {nativeDialogue} from '../../engine/gameplay/native-dialogue';
import {LAUNDROMAT} from '../../data';
import gameplaySource from './gameplay.json';
import sceneSource from './scene.json';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';

const same=(actual:unknown,expected:unknown,label:string)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Laundromat '+label+' are protected');};
/** Keep existing inventory and command entry points stable for player saves and authored routes. */
export function validateLaundromatGameplay(value:unknown){
  const doc=validateNativeContract(value,gameplaySource,LAUNDROMAT,{allowNewContent:true,allowNewVocabulary:true,allowBindingEdits:true});nativeDialogue(doc,'suds');
  if(!doc.purchases?.['laundromat.soap'])throw new Error('Original soap purchase must remain registered');const actions=doc.commands['laundromat.buy-soap'].actions;if(actions.length!==1||!('purchase'in actions[0])||actions[0].purchase!=='laundromat.soap')throw new Error('Soap charge and goods belong to its purchase definition');
  return doc;
}
export const LAUNDROMAT_GAMEPLAY=validateLaundromatGameplay(gameplaySource);
export const laundromatBindingGroups=['uses','readables','rests','exits'] as const;
export function laundromatSource(value:SceneDocument):SceneDocument{return structuredClone(value);}
/** Ordinary content is source owned; native actor identities and original purchase ownership remain stable. */
export function validateLaundromatScene(value:unknown,gameplay:GameplayDefinition=LAUNDROMAT_GAMEPLAY){
  const doc=validateSceneDocument(laundromatSource(value as SceneDocument),gameplay,{actors:true,manifest:true});
  same(doc.id,'laundromat','scene ID');
  protectActorIdentity(doc.actors!,sceneSource.actors,{reorder:true,entities:true});
  if(doc.manifest!.people!==undefined)throw new Error('Laundromat actor positions use their registered actor source');
  for(const group of laundromatBindingGroups)if(Object.keys(doc.manifest![group]??{}).sort().join()!==(doc[group]??[]).map(row=>row.id).sort().join())throw new Error('Laundromat manifest must bind every '+group+' entry');
  const soap=doc.uses.find(u=>u.id==='soap');if(soap&&soap.purchase!=='laundromat.soap')throw new Error('Laundromat purchase binding protected; legacy scene edits require migration');
  for(const person of doc.people??[])if(!doc.actors!.some(a=>a.target===person.id))throw new Error('Dialogue requires its actor: '+person.id);
  return doc;
}
export const LAUNDROMAT_SCENE=validateLaundromatScene(sceneSource);
