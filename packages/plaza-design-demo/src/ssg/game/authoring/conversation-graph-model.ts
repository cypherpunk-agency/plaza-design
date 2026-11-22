/**
 * Pure projection of one named conversation graph into cards and links for the Logic
 * workspace's conversation graph. Layout is computed (columns by distance from the entry);
 * dragged positions are per-browser view preferences, never saved into the graph source.
 */
import type { Condition, ConversationDefinition, ConversationNode } from '../engine/gameplay/types';

export type CardKind = 'entry' | 'page' | 'choice' | 'input' | 'exit' | 'fallback';
export interface GraphCard {
  id: string;
  kind: CardKind;
  node?: ConversationNode;
  /** Ports in display order; each link leaves from one. */
  ports: GraphPort[];
  column: number;
  row: number;
  reachable: boolean;
}
export interface GraphPort {
  id: string;
  label: string;
  /** Condition shown as a chip on the port. */
  when?: Condition;
  command?: string;
  to?: string;
  kind: 'entry' | 'choice' | 'redirect' | 'failure' | 'free' | 'retry' | 'next';
}
export interface GraphLink {
  from: string;
  port: string;
  to: string;
  kind: GraphPort['kind'];
}
export interface ConversationGraph {
  cards: GraphCard[];
  links: GraphLink[];
  /** Nodes no entry, choice or redirect reaches. */
  unreachable: string[];
}
export const ENTRY = '@entry';

export function cardKind(def: ConversationDefinition, id: string): CardKind {
  const n = def.nodes[id];
  if (n.choices?.length) return def.free ? 'input' : 'choice';
  if (Object.values(def.nodes).some((m) => m.onEnterFailure === id)) return 'fallback';
  if (n.redirect?.length) return 'page';
  return 'exit';
}
function nodePorts(def: ConversationDefinition, id: string): GraphPort[] {
  const n = def.nodes[id],
    ports: GraphPort[] = [];
  n.redirect?.forEach((r, i) =>
    ports.push({ id: 'redirect:' + i, label: 'jump', when: r.when, to: r.node, kind: 'redirect' }),
  );
  n.choices?.forEach((c) =>
    ports.push({
      id: 'choice:' + c.id,
      label: c.label,
      ...(c.when ? { when: c.when } : {}),
      ...(c.command ? { command: c.command } : {}),
      to: c.next,
      kind: 'choice',
    }),
  );
  if (n.choices?.length && def.free) {
    ports.push({
      id: 'free',
      label: 'typed: ' + def.free.containsAny.join(', '),
      to: def.free.next,
      kind: 'free',
    });
    ports.push({ id: 'retry', label: def.free.retry, to: def.free.retryNext, kind: 'retry' });
  }
  if (n.onEnter && n.onEnterFailure)
    ports.push({
      id: 'failure',
      label: 'if ' + n.onEnter + ' refuses',
      to: n.onEnterFailure,
      kind: 'failure',
    });
  return ports;
}

export function conversationGraph(def: ConversationDefinition): ConversationGraph {
  const entryPorts: GraphPort[] = def.entry.map((e, i) => ({
    id: 'entry:' + i,
    label:
      def.entry.length === 1
        ? 'start'
        : i === def.entry.length - 1
          ? 'otherwise'
          : 'start ' + (i + 1),
    ...(e.when ? { when: e.when } : {}),
    to: e.node,
    kind: 'entry',
  }));
  const ports = new Map<string, GraphPort[]>([[ENTRY, entryPorts]]);
  for (const id of Object.keys(def.nodes)) ports.set(id, nodePorts(def, id));
  // Columns: shortest distance from the entry card, discovered breadth first in authored order.
  const column = new Map<string, number>([[ENTRY, 0]]),
    order: string[] = [ENTRY];
  for (let i = 0; i < order.length; i++) {
    const from = order[i];
    for (const port of ports.get(from) ?? [])
      if (port.to && def.nodes[port.to] && !column.has(port.to)) {
        column.set(port.to, column.get(from)! + 1);
        order.push(port.to);
      }
  }
  const unreachable = Object.keys(def.nodes).filter((id) => !column.has(id));
  const last = Math.max(0, ...column.values()) + 1;
  for (const id of unreachable) {
    column.set(id, last);
    order.push(id);
  }
  const rows = new Map<number, number>();
  const cards: GraphCard[] = order.map((id) => {
    const c = column.get(id)!,
      row = rows.get(c) ?? 0;
    rows.set(c, row + 1);
    return {
      id,
      kind: id === ENTRY ? 'entry' : cardKind(def, id),
      ...(id === ENTRY ? {} : { node: def.nodes[id] }),
      ports: ports.get(id) ?? [],
      column: c,
      row,
      reachable: id === ENTRY || !unreachable.includes(id),
    };
  });
  const links: GraphLink[] = [];
  for (const card of cards)
    for (const port of card.ports)
      if (port.to) links.push({ from: card.id, port: port.id, to: port.to, kind: port.kind });
  return { cards, links, unreachable };
}

/** Card height estimate shared by layout and drawing so links meet their ports. */
export const CARD_WIDTH = 240;
export const PORT_HEIGHT = 24;
export function cardHeight(card: GraphCard) {
  const pageLines = card.node ? Math.min(4, Math.ceil((card.node.pages[0]?.length ?? 0) / 34)) : 0;
  return (
    40 +
    pageLines * 16 +
    (card.node && card.node.pages.length > 1 ? 16 : 0) +
    card.ports.length * PORT_HEIGHT +
    8
  );
}
/** Computed position for a card; `saved` holds per-browser dragged positions. */
export function layoutCards(
  graph: ConversationGraph,
  saved: Readonly<Record<string, { x: number; y: number }>> = {},
) {
  const positions = new Map<string, { x: number; y: number; height: number }>();
  const columnY = new Map<number, number>();
  for (const card of graph.cards) {
    const height = cardHeight(card),
      y = columnY.get(card.column) ?? 0;
    columnY.set(card.column, y + height + 28);
    const pos = saved[card.id] ?? { x: card.column * (CARD_WIDTH + 80), y };
    positions.set(card.id, { ...pos, height });
  }
  return positions;
}
/** Port anchor offset from the card top, matching the drawn port rows. */
export function portOffset(card: GraphCard, port: string) {
  const index = card.ports.findIndex((p) => p.id === port);
  return cardHeight(card) - 8 - (card.ports.length - index) * PORT_HEIGHT + PORT_HEIGHT / 2;
}

/** A node id not yet used in this graph: `base`, `base-2`, … */
export function freshNodeId(def: ConversationDefinition, base = 'page') {
  if (!def.nodes[base]) return base;
  let i = 2;
  while (def.nodes[base + '-' + i]) i++;
  return base + '-' + i;
}
export function freshChoiceId(node: ConversationNode) {
  let i = 1;
  while (node.choices?.some((c) => c.id === 'choice-' + i)) i++;
  return 'choice-' + i;
}
/** Nodes and entry rows that point at `id`; deletion is allowed only when this is empty. */
export function nodeReferences(def: ConversationDefinition, id: string) {
  const refs: string[] = [];
  def.entry.forEach((e, i) => e.node === id && refs.push('entry ' + (i + 1)));
  for (const [from, n] of Object.entries(def.nodes)) {
    if (from === id) continue;
    n.redirect?.forEach((r) => r.node === id && refs.push(from + ' jump'));
    n.choices?.forEach((c) => c.next === id && refs.push(from + ' · ' + c.label));
    if (n.onEnterFailure === id) refs.push(from + ' failure');
  }
  if (def.free?.next === id || def.free?.retryNext === id) refs.push('typed input');
  return refs;
}
