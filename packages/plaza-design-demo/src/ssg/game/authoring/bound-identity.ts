import {mutableActorArtwork,mutableActorConsumer} from '../engine/gameplay/native-actor-bindings';
/** Retained runtime bindings keep their identity; registered presentation-only consumers may be removed. */
import type { ArtRegistry, Composition, Instance } from '../art/core/composition';
const flatten = (nodes: Instance[]): Instance[] => nodes.flatMap(node => [node, ...flatten(node.children ?? [])]);
export function preserveBoundIdentity(before: unknown, after: unknown, registry?:Pick<ArtRegistry,'get'>): void {
  const previous = before as Composition, next = after as Composition;
  const replacements = new Map(flatten(next.instances).map(node => [node.id, node]));
  for (const node of flatten(previous.instances)) {
    const bindings = Object.entries(node.bindings ?? {});
    if (!bindings.length) continue;
    const replacement = replacements.get(node.id), sources = replacement?.bindings ?? {};
    if(mutableActorArtwork(previous.scene,node)&&(!replacement||mutableActorArtwork(next.scene,replacement)))continue;
    if(mutableActorConsumer(previous.scene,node)&&replacement&&mutableActorConsumer(next.scene,replacement))continue;
    if(!replacement&&registry?.get(node.type).bindingIdentity==='presentation')continue;
    if (!replacement || replacement.type !== node.type || Object.keys(sources).length !== bindings.length || bindings.some(([field, source]) => sources[field] !== source)) {
      throw new Error(`${node.id}: preserve gameplay identity and bindings; only its local placement and appearance are editable`);
    }
  }
}
