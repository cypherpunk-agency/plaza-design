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
