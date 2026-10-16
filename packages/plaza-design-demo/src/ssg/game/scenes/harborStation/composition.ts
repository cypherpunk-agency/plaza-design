import document from './composition.json';
import { createStationComposition } from '../station-composition';
export const harborStationAdapter=createStationComposition('harborStation',document);
export const harborStationComposition=harborStationAdapter.composition;
export const validateHarborStationComposition=harborStationAdapter.validate;
export const harborStationGeometry=harborStationAdapter.geometry;
export const harborStationEnvironment=harborStationAdapter.environment;
export const drawHarborStationComposition=harborStationAdapter.draw;
