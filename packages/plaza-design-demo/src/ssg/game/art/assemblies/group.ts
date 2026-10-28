import {fixedGeometry} from '../core/spatial';
import type { AssetDefinition } from '../core/composition';
const fixedNativeGeometry=fixedGeometry("This group moves its independently sized children together. Edit child dimensions rather than resizing the heterogeneous group as one shape.");
/** A named parent can group arbitrary children without introducing hidden artwork. */
export const groupElement: AssetDefinition = {spatial:fixedNativeGeometry,
  libraryUse:'reusable',
  type: 'assembly.group', version: 1, label: 'Assembly', category: 'assemblies', parts: [], role: 'group', fields: {},
  bounds: () => ({ x: 0, h: 0, w: 0, tall: 0 }),
  anchors: () => ({ origin: { x: 0, h: 0, role: 'origin' } }),
  draw() {},
};
