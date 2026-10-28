import {fixedGeometry} from '../core/spatial';
import {generationSeed} from '../core/fields';
import { stool } from "../assemblies/construction";
import type { AssetDefinition } from '../core/composition';
const fixedNativeGeometry=fixedGeometry("The stool has fixed kit proportions. Edit its style and Transform; no independent body dimensions are authored.");

/** Catalog metadata around the shared construction kernel; one drawing implementation. */
export const stoolElement: AssetDefinition = {spatial:fixedNativeGeometry,
  type: 'furniture.stool', libraryUse: 'reusable', version: 1, label: 'Stool', category: 'furniture', parts: ['backdrop'],
  fields: { seed: generationSeed({ kind: 'number', label: 'Variation seed', default: 1, step: 1 }) },
  bounds: () => ({ x: -10, h: 13, w: 20, tall: 13 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' }, seat: { x: 0, h: 10, role: 'surface' } }),
  draw: (ctx, view, props) => stool(ctx, view, { x: 0, seed: Number(props.seed) }),
};
