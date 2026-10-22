/** What the zone graph is checked against while editing: each scene's width and its level pieces, from the pending documents. */
import { SCENES } from '../scenes';
import type { ZoneInfo } from '../world/zone-graph';

type Node = { id?: unknown; type?: unknown; children?: unknown };
const levelPieces = (nodes: unknown, out: string[] = []): string[] => {
  for (const n of Array.isArray(nodes) ? nodes as Node[] : []) {
    if (typeof n.id === 'string' && typeof n.type === 'string' && n.type.startsWith('level.')) out.push(n.id);
    levelPieces(n.children, out);
  }
  return out;
};
/** Every scene is a zone; its width is the scene's. */
export const zoneInfo = (_documents?: ReadonlyMap<string, unknown>): Record<string, ZoneInfo> =>
  Object.fromEntries(Object.entries(SCENES).map(([id, def]) => [id, { width: def.width }]));
/** Each scene's level pieces (floors, stairs, doors), read from its pending composition where one is open. */
export const zonePieces = (documents: ReadonlyMap<string, unknown>): Record<string, string[]> =>
  Object.fromEntries(Object.keys(SCENES).flatMap(id => { const doc = documents.get(id) as { instances?: unknown } | undefined; return doc ? [[id, levelPieces(doc.instances)]] : []; }));
