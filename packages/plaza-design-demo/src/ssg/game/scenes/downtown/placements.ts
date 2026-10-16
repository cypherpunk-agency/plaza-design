/** Every gameplay coordinate uses the same registry anchors/transforms as artwork. */
import type { Composition } from '../../art/core/composition';
import { downtownComposition,downtownPositions } from './composition';
export { downtownSource } from './source';
export const downtownPlacements=(document:Composition=downtownComposition)=>downtownPositions(document);
const geometry=downtownPlacements();
export const downtownDoors={market:geometry.get('exit-market').x,shop:geometry.get('exit-shop').x,library:geometry.get('exit-library').x,yard:geometry.get('exit-yard').x,capsule:geometry.get('exit-capsule').x,metro:geometry.get('exit-metro').x,moth:geometry.get('exit-moth').x,taxi:geometry.get('exit-taxi').x};
export const downtownMapKioskX=geometry.get('map').x;
