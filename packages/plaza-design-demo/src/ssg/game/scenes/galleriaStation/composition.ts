import document from './composition.json';
import { createStationComposition } from '../station-composition';
export const galleriaStationAdapter=createStationComposition('galleriaStation',document);
export const galleriaStationComposition=galleriaStationAdapter.composition;
export const validateGalleriaStationComposition=galleriaStationAdapter.validate;
export const galleriaStationGeometry=galleriaStationAdapter.geometry;
export const galleriaStationEnvironment=galleriaStationAdapter.environment;
export const drawGalleriaStationComposition=galleriaStationAdapter.draw;
