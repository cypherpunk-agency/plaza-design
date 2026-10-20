import type { Element } from '../core/composition';
/** A named parent can group arbitrary children without introducing hidden artwork. */
export const groupElement: Element = {
  type: 'assembly.group', version: 1, label: 'Assembly', category: 'assemblies', parts: [], role: 'group', fields: {},
  bounds: () => ({ x: 0, h: 0, w: 0, tall: 0 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw() {},
};
