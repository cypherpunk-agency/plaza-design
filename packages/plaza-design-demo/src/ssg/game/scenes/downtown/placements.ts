import {content,downtownBindingGroups} from './scene-document';
import {manifestGeometry} from '../../engine/gameplay/manifest-geometry';
/** Every gameplay coordinate uses the same registry anchors/transforms as artwork. */
import type { Composition } from '../../art/core/composition';
import { downtownComposition,downtownPositions,downtownGeometry } from './composition';
export { downtownSource } from './source';
export const downtownPlacements=(document:Composition=downtownComposition)=>downtownPositions(document);
const geometry=downtownPlacements();
const ordinary=manifestGeometry(content.scene,downtownGeometry(),downtownBindingGroups,{groundExits:false,transformedExits:true});
export const downtownDoors=Object.fromEntries(Object.entries(ordinary.bindings.exits).filter(([id])=>id!=='map').map(([id,p])=>[id,p.x]));
export const downtownMapKioskX=geometry.get('map').x;
