/** The editor's layer stack for layered compositions: rows per layer and restacking. */
import { LAYERS, PLAYER_ROW, type ChunkDocument, type AssetInstance, type Layer } from '../art/core/composition';

export const VISUAL_LAYERS = LAYERS.filter(layer => layer !== 'logic');
export const LAYER_LABELS: Record<Layer, string> = {
  distance: 'Distance', backdrop: 'Backdrop', set: 'Set', playfield: 'Playfield', foreground: 'Foreground', logic: 'Logic',
};
export const LAYER_HINTS: Record<Layer, string> = {
  distance: 'Sky-side scenery: far skyline and views, usually slow parallax',
  backdrop: 'The shell of the place: facades, walls, windows, ceiling',
  set: 'Props behind the walk line: shelves, machines, signs, background crowds',
  playfield: 'Where people stand: the player row, characters and what they stand at or behind',
  foreground: 'Anything that covers the player: near crowds, posts, pillars; usually fast parallax',
  logic: 'Never drawn: spawn points, exits, markers',
};
const flat = (nodes: readonly AssetInstance[]): AssetInstance[] => nodes.flatMap(n => [n, ...flat(n.children ?? [])]);
export const isPlayerRow = (node: AssetInstance) => node.type === PLAYER_ROW;

/** Rows of one layer, back to front, in the same order the renderer sorts them. */
export function layerRows(doc: Readonly<ChunkDocument>, layer: Layer): AssetInstance[] {
  const nodes = flat(doc.instances);
  return nodes.filter(n => n.layer === layer).sort((a, b) => a.order - b.order || nodes.indexOf(a) - nodes.indexOf(b));
}

/** Move a node into `layer` at back-to-front position `index`, renumbering that layer's (and the old layer's) order keys. */
export function restack(doc: ChunkDocument, id: string, layer: Layer, index: number) {
  const node = flat(doc.instances).find(n => n.id === id);
  if (!node) throw new Error(`Missing instance ${id}`);
  if (isPlayerRow(node) && layer !== 'playfield') throw new Error('The player row stays in the playfield');
  const from = node.layer!;
  const target = layerRows(doc, layer).filter(n => n !== node);
  target.splice(Math.max(0, Math.min(index, target.length)), 0, node);
  node.layer = layer;
  target.forEach((n, i) => { n.order = i; });
  if (from !== layer) layerRows(doc, from).forEach((n, i) => { n.order = i; });
}

/** Next order key at the front of a layer. */
export function frontOrder(doc: Readonly<ChunkDocument>, layer: Layer) {
  const rows = layerRows(doc, layer); return rows.length ? rows[rows.length - 1].order + 1 : 0;
}
