/** Shared source assembly for Game, prospective validation and native editor frames. */
import {art} from '../art';
import {resolveComposition,type Environment,type Value} from '../art/core/composition';
import type {SceneDef} from '../scenes/kit';
import {compileWorldGraph,validateWorldCompositions,type WorldCompositionContext} from './compositions';
import {validateZoneGraph} from './zone-graph';
import shippedCompositions from './compositions.json';
import shippedGraph from './zone-graph.json';

export function worldCompositionContext(scenes:Readonly<Record<string,SceneDef>>):WorldCompositionContext {
 return{chunks:scenes,anchor(chunk,instance,anchor){
  const doc=scenes[chunk]?.artwork;if(!doc)return undefined;
  const bindings:Record<string,Value>={};
  const collect=(nodes:typeof doc.instances)=>{for(const n of nodes){for(const [key,value] of Object.entries(n.bindings??{}))bindings[value]=art.get(n.type).visualFields?.[key]?.default??null;collect(n.children??[]);}};collect(doc.instances);
  // Resolve the same attachments/scale/facing as ordinary artwork, selecting only this physical endpoint.
  const row=resolveComposition(art,doc,{state:{},bindings,reduced:true} as Environment,[instance])[0];
  const at=row.element.anchors(row.props,row.state)[anchor];if(!at)return undefined;
  return{x:row.placement.x+at.x*row.placement.scale*row.placement.facing,h:row.placement.h+at.h*row.placement.scale};
 }};
}
export function compileGameWorld(scenes:Readonly<Record<string,SceneDef>>,documents?:ReadonlyMap<string,unknown>){
 return compileWorldGraph(validateWorldCompositions(documents?.get('world-compositions')??shippedCompositions),validateZoneGraph(documents?.get('zone-graph')??shippedGraph),worldCompositionContext(scenes));
}
