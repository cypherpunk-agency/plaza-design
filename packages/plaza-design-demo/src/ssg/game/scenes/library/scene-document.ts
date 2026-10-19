import {protectActorIdentity} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {validateNativeContract} from '../../engine/gameplay/native-contract';
import {LIBRARY} from '../../data';
import source from './scene.json';
import gameplaySource from './gameplay.json';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';

/** Preserve registered native ownership while ordinary shared gameplay remains authorable. */
export function validateLibraryGameplay(value:unknown):GameplayDefinition {
  const doc=validateNativeContract(value,gameplaySource,LIBRARY,{allowNewContent:true,allowNewVocabulary:true,allowBindingEdits:true});
  return doc;
}
export const LIBRARY_GAMEPLAY=validateLibraryGameplay(gameplaySource);
export const libraryBindingGroups=['uses','readables','rests','exits'] as const;
/** Source documents own every binding; incomplete documents reject rather than restoring defaults. */
export function librarySource(value:SceneDocument):SceneDocument {return structuredClone(value);}
export function validateLibraryScene(value:unknown,gameplay:GameplayDefinition=LIBRARY_GAMEPLAY){
  const doc=validateSceneDocument(librarySource(value as SceneDocument),validateLibraryGameplay(gameplay),{actors:true,manifest:true});
  protectActorIdentity(doc.actors!,source.actors,{reorder:true,entities:true});
  if(doc.id!=='library')throw new Error('Library scene identity is protected');
  if(doc.manifest!.people!==undefined)throw new Error('Library actor positions use their registered actor source');
  for(const group of libraryBindingGroups)if(Object.keys(doc.manifest![group]??{}).sort().join()!==(doc[group]??[]).map(row=>row.id).sort().join())throw new Error('Library manifest must bind every '+group+' entry');
  for(const person of doc.people??[])if(!doc.actors!.some(a=>a.target===person.id))throw new Error('Dialogue requires its actor: '+person.id);
  return doc;
}
export const LIBRARY_SCENE=validateLibraryScene(source);
