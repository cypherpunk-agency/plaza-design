import source from './scene.json';
import gameplay from './gameplay.json';
import {validateGameplay} from '../../engine/gameplay/validation';
import {validateSceneDocument,type SceneDocument} from '../../engine/gameplay/scene-document';
import {protectActorIdentity} from '../../engine/gameplay/actors';
import type {GameplayDefinition} from '../../engine/gameplay/types';
export const validateMallGameplay=(value:unknown)=>validateGameplay(value);
export const MALL_GAMEPLAY=validateMallGameplay(gameplay);
export const mallBindingGroups=['uses','readables','rests','exits'] as const;
export const mallSource=(value:SceneDocument)=>structuredClone(value);
export function validateMallScene(value:unknown,g:GameplayDefinition=MALL_GAMEPLAY){
 const doc=validateSceneDocument(mallSource(value as SceneDocument),g,{actors:true,manifest:true});
 if(doc.id!=='mall')throw new Error('Mall source identity must remain mall');
 protectActorIdentity(doc.actors!,source.actors,{reorder:true,entities:true});
 if(doc.manifest!.people!==undefined)throw new Error('Mall dialogue uses its registered actor source');
 for(const person of doc.people??[])if(!doc.actors!.some(a=>a.target===person.id))throw new Error('Mall dialogue requires its actor: '+person.id);
 for(const group of mallBindingGroups)if(Object.keys(doc.manifest![group]??{}).sort().join()!==(doc[group]??[]).map(row=>row.id).sort().join())throw new Error('Mall manifest must bind every '+group+' entry');
 return doc;
}
export const MALL_SCENE=validateMallScene(source);
