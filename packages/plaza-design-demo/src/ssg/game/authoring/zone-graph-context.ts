/** What the zone graph is checked against while editing: each scene's width and its level pieces, from the pending documents. */
import { SCENES } from '../scenes';
import { authoredDocumentId } from '../engine/gameplay/scene-catalogue';
import type { ZoneInfo } from '../world/zone-graph';

type Node = { id?: unknown; type?: unknown; children?: unknown };
type Catalogue = { scenes?: { scene?: { id?: unknown; manifest?: { width?: unknown } }; composition?: { instances?: unknown } }[] };
const levelPieces = (nodes: unknown, out: string[] = []): string[] => {
  for (const n of Array.isArray(nodes) ? nodes as Node[] : []) {
    if (typeof n.id === 'string' && typeof n.type === 'string' && n.type.startsWith('level.')) out.push(n.id);
    levelPieces(n.children, out);
  }
  return out;
};
/** The pending authored scenes (scenes/authored.json), which are zones too. */
const authored = (documents?: ReadonlyMap<string, unknown>) => ((documents?.get('authored-scenes') as Catalogue | undefined)?.scenes ?? []).filter(e => typeof e?.scene?.id === 'string');
/** Every scene is a zone; its width is the scene's (an authored scene's pending manifest width). */
export const zoneInfo = (documents?: ReadonlyMap<string, unknown>): Record<string, ZoneInfo> => ({
  ...Object.fromEntries(Object.entries(SCENES).map(([id, def]) => [id, { width: def.width }])),
  ...Object.fromEntries(authored(documents).flatMap(e => typeof e.scene!.manifest?.width === 'number' ? [[e.scene!.id as string, { width: e.scene!.manifest.width }]] : [])),
});
/** A zone's pending composition: its own document, its projected authored document, or its authored catalogue entry. */
const composition = (documents: ReadonlyMap<string, unknown>, id: string) =>
  (documents.get(id) ?? documents.get(authoredDocumentId(id, 'composition')) ?? authored(documents).find(e => e.scene!.id === id)?.composition) as { instances?: unknown } | undefined;
/** Each scene's level pieces (floors, stairs, doors), read from its pending composition where one is open. */
export const zonePieces = (documents: ReadonlyMap<string, unknown>): Record<string, string[]> =>
  Object.fromEntries(Object.keys(zoneInfo(documents)).flatMap(id => { const doc = composition(documents, id); return doc ? [[id, levelPieces(doc.instances)]] : []; }));
