/** Pure preparation/dependency checks. Game owns the saved membership; lifecycle owns disposal. */
import {compileWorldComposition,type WorldCompositions,type WorldCompositionContext} from '../world/compositions';
export function changedWorldChunks(before:WorldCompositions,after:WorldCompositions,context:WorldCompositionContext){
 const collect=(s:WorldCompositions)=>new Map(Object.keys(s.compositions).flatMap(key=>compileWorldComposition(s,key,context).chunks.map(c=>[c.chunk,{...c,composition:key}] as const)));
 const a=collect(before),b=collect(after),changed=new Set<string>();
 for(const[id,old]of a){const next=b.get(id);if(!next||next.x!==old.x||next.h!==old.h||next.composition!==old.composition)changed.add(id);}
 return changed;
}
/** Only resource/physical dependencies block an edit. Loading alone is not a blocker. */
export function worldEditBlockers(changed:ReadonlySet<string>,dependencies:Iterable<{chunk:string;reason:string}>){
 return [...dependencies].filter(d=>changed.has(d.chunk));
}
