/** Portable pending edits. Pure envelope validation; the ComposerModel validates the complete prospective document set atomically. */
import type { EditorDocument } from './app';
export const DOCUMENT_BUNDLE_FORMAT = 'access-denied-editor-edits' as const;
export const DOCUMENT_BUNDLE_VERSION = 1 as const;
export const DOCUMENT_BUNDLE_MAX_BYTES = 2 * 1024 * 1024;
export interface DocumentBundleEdit { id: string; value: unknown }
export interface DocumentBundle {
  format: typeof DOCUMENT_BUNDLE_FORMAT;
  version: typeof DOCUMENT_BUNDLE_VERSION;
  documents: { id: string; kind: Exclude<EditorDocument['kind'], 'world'>; value: unknown }[];
}
function fail(message: string): never { throw new Error('Invalid editor edits: ' + message); }
function object(value: unknown): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail('expected a plain JSON object');
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, names: string[]) {
  if (Object.keys(value).length !== names.length || names.some(name => !Object.prototype.hasOwnProperty.call(value, name))) fail('unexpected or missing fields');
}
function json(value: unknown, seen = new Set<object>(), depth = 0): void {
  if (depth > 64) fail('JSON nesting limit exceeded');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || seen.has(value)) fail('only finite plain JSON values are supported');
  if (!Array.isArray(value)) object(value);
  seen.add(value);
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) fail('sparse or decorated arrays are unsupported');
    for (let index = 0; index < value.length; index++) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) fail('sparse arrays are unsupported');
      json(value[index], seen, depth + 1);
    }
  } else for (const [key, child] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) fail('reserved JSON property');
    json(child, seen, depth + 1);
  }
  seen.delete(value);
}
function bounded(text: string) {
  if (new TextEncoder().encode(text).byteLength > DOCUMENT_BUNDLE_MAX_BYTES) fail('bundle exceeds 2 MiB');
}
function known(documents: readonly EditorDocument[]) {
  const result = new Map<string, EditorDocument>();
  for (const doc of documents) {
    if (!doc.id || result.has(doc.id) || !['composition', 'timeline', 'world', 'behavior', 'gameplay', 'scene', 'fixtures'].includes(doc.kind)) fail('invalid document allowlist');
    result.set(doc.id, doc);
  }
  return result;
}
/** Reading does not validate artwork or run behavior; pass all returned edits to one atomic model import. */
export function readDocumentBundle(value: unknown, documents: readonly EditorDocument[]): DocumentBundleEdit[] {
  if (typeof value === 'string') {
    bounded(value);
    try { value = JSON.parse(value); } catch { fail('malformed JSON'); }
  }
  json(value);
  const envelope = object(value);
  exactKeys(envelope, ['format', 'version', 'documents']);
  if (envelope.format !== DOCUMENT_BUNDLE_FORMAT || envelope.version !== DOCUMENT_BUNDLE_VERSION || !Array.isArray(envelope.documents)) fail('unsupported bundle format or version');
  bounded(JSON.stringify(value));
  const allowlist = known(documents), seen = new Set<string>(), edits: DocumentBundleEdit[] = [];
  if (envelope.documents.length > allowlist.size) fail('too many documents');
  for (const raw of envelope.documents) {
    const row = object(raw); exactKeys(row, ['id', 'kind', 'value']);
    if (typeof row.id !== 'string' || seen.has(row.id)) fail('duplicate or invalid document id');
    const expected = allowlist.get(row.id);
    if (!expected || expected.kind === 'world' || row.kind !== expected.kind) fail('unknown, read-only or mismatched document: ' + row.id);
    seen.add(row.id);
    edits.push({ id: row.id, value: JSON.parse(JSON.stringify(row.value)) });
  }
  return edits;
}
/** Exported revisions are deliberately omitted; importing preserves the receiving session's saved-source baseline. */
export function createDocumentBundle(edits: readonly DocumentBundleEdit[], documents: readonly EditorDocument[]): DocumentBundle {
  const allowlist = known(documents);
  const bundle = { format: DOCUMENT_BUNDLE_FORMAT, version: DOCUMENT_BUNDLE_VERSION, documents: edits.map(edit => ({ id: edit.id, kind: allowlist.get(edit.id)?.kind, value: edit.value })) };
  const detached = readDocumentBundle(bundle, documents);
  return { format: DOCUMENT_BUNDLE_FORMAT, version: DOCUMENT_BUNDLE_VERSION, documents: detached.map(edit => ({ id: edit.id, kind: allowlist.get(edit.id)!.kind as DocumentBundle['documents'][number]['kind'], value: edit.value })) };
}
