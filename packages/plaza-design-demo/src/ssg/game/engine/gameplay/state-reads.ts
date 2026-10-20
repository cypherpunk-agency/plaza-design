import type {GameplayDefinition,StateDeclaration} from './types';
/** Link references against the prospective registry, never against an old shipping declaration. */
export function validateStateReadReferences(definitions:readonly GameplayDefinition[]){
 const declarations=new Map<string,StateDeclaration>();
 for(const d of definitions)for(const[id,row]of Object.entries(d.state??{})){
  const previous=declarations.get(id);if(previous&&JSON.stringify(previous)!==JSON.stringify(row))throw Error('Conflicting state declaration: '+id);
  declarations.set(id,row);
 }
 for(const d of definitions)for(const[id,type]of Object.entries(d.stateReads??{})){
  const owner=declarations.get(id);if(!owner)throw Error('Unknown read-only state reference: '+id);
  if(owner.type!==type)throw Error('Read-only state type mismatch: '+id+' requires '+type+', owner declares '+owner.type);
 }
}
