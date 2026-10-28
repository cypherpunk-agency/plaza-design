/** Reuse pure derivations within one prospective validation pass, never across edits. */
const snapshots = new WeakMap<readonly { id: string; value: unknown }[], ReadonlyMap<string, unknown>>();
const validationOnly = new WeakSet<ReadonlyMap<string, unknown>>();
const contexts = new WeakSet<object>();
export function validationSnapshot(documents: readonly { id: string; value: unknown }[]) {
  let snapshot = snapshots.get(documents);
  if (!snapshot) { snapshot = new Map(documents.map(d => [d.id, d.value])); snapshots.set(documents, snapshot); validationOnly.add(snapshot); }
  return snapshot;
}
export const isValidationSnapshot = (documents: ReadonlyMap<string, unknown>) => validationOnly.has(documents);
export function markValidationContext<T extends object>(context: T): T { contexts.add(context); return context; }
export const isValidationContext = (context: object) => contexts.has(context);
/** Current source documents as one map shared per source version. Pending validators recognise it and reuse their
 * caches; building a map from context.documents or per-document get() copies misses them and rebuilds the world. */
export function liveSources(context: { documents: readonly { id: string; value: unknown }[]; authoring?: { snapshot?(): readonly { id: string; value: unknown }[] } }) {
  return validationSnapshot(context.authoring?.snapshot?.() ?? context.documents);
}
/** Computes a derived value once per shared source map (story models, vocabularies) instead of on every call. */
export function perSources<T>(compute: (sources: ReadonlyMap<string, unknown>) => T) {
  const cache = new WeakMap<ReadonlyMap<string, unknown>, { value: T }>();
  return (sources: ReadonlyMap<string, unknown>) => { let hit = cache.get(sources); if (!hit) { hit = { value: compute(sources) }; cache.set(sources, hit); } return hit.value; };
}
