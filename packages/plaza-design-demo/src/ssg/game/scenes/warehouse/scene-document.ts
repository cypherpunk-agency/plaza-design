import {protectActorIdentity} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import scene from './scene.json';
import gameplay from './gameplay.json';
import {validateGameplay} from '../../engine/gameplay/validation';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
export const validateWarehouseGameplay=(value:unknown)=>validateGameplay(value);
export const WAREHOUSE_GAMEPLAY=validateWarehouseGameplay(gameplay);
export const warehouseBindingGroups=['uses','readables','rests','exits'] as const;
export function warehouseSource(value:SceneDocument):SceneDocument{return structuredClone(value);}
export function validateWarehouseScene(value:unknown,g:GameplayDefinition=WAREHOUSE_GAMEPLAY){
 const doc=validateSceneDocument(warehouseSource(value as SceneDocument),g,{actors:true,manifest:true});
 if(doc.id!=='warehouse')throw new Error('Warehouse source identity must remain warehouse');
 protectActorIdentity(doc.actors!,scene.actors,{reorder:true,entities:true});
 if(doc.manifest!.people!==undefined)throw new Error('Warehouse actors use their registered actor source');
 for(const person of doc.people??[])if(!doc.actors!.some(a=>a.target===person.id))throw new Error('Warehouse dialogue requires its actor: '+person.id);
 for(const group of warehouseBindingGroups)if(Object.keys(doc.manifest![group]??{}).sort().join()!==(doc[group]??[]).map(row=>row.id).sort().join())throw new Error('Warehouse manifest must bind every '+group+' entry');
 return doc;
}
export const WAREHOUSE_SCENE=validateWarehouseScene(scene);
