import { stool } from "../assemblies/construction";
import type { Element } from '../core/composition';

/** First adapter retains the existing drawing implementation until the shared-kit migration. */
export const stoolElement: Element = {
  type: 'furniture.stool', version: 1, label: 'Stool', category: 'furniture', parts: ['backdrop'],
  fields: { seed: { kind: 'number', label: 'Variation seed', default: 1, step: 1 } },
  bounds: () => ({ x: -10, h: 13, w: 20, tall: 13 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' }, seat: { x: 0, h: 10, role: 'surface' } }),
  draw: (ctx, view, props) => stool(ctx, view, { x: 0, seed: Number(props.seed) }),
};
