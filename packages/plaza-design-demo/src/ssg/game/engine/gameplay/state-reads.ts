import type {GameplayDefinition,StateDeclaration} from './types';
/** Link references against the prospective registry, never against an old shipping declaration. */
export function validateStateReadReferences(definitions:readonly GameplayDefinition[]){
 const declarations=new Map<string,StateDeclaration>();
 const bindings=new Map<string,string>();
 for(const d of definitions)for(const[id,row]of Object.entries(d.state??{})){
  const previous=declarations.get(id);if(previous&&JSON.stringify(previous)!==JSON.stringify(row))throw Error('Conflicting state declaration: '+id);
  declarations.set(id,row);
  const canonical=row.binding??id,signature=JSON.stringify(Object.fromEntries(Object.entries(row).filter(([key])=>key!=='owner'&&key!=='binding').sort(([a],[b])=>a.localeCompare(b))));
  if(bindings.has(canonical)&&bindings.get(canonical)!==signature)throw Error('Conflicting world-state binding: '+canonical);
  bindings.set(canonical,signature);
 }
 for(const[id,row]of declarations)if(row.binding&&declarations.get(row.binding)?.binding&&declarations.get(row.binding)!.binding!==row.binding)throw Error('State binding must name a canonical storage key, not another binding: '+id);
 for(const d of definitions)for(const[id,type]of Object.entries(d.stateReads??{})){
  const owner=declarations.get(id);if(!owner)throw Error('Unknown read-only state reference: '+id);
  if(owner.binding&&owner.binding!==id)throw Error('Read the canonical world-state key rather than a chunk-local binding: '+id+' -> '+owner.binding);
  if(owner.type!==type)throw Error('Read-only state type mismatch: '+id+' requires '+type+', owner declares '+owner.type);
 }
}
