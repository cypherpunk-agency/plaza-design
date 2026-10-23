/**
 * The shared drawing kernels (ART-GUIDE §12, "Build scenery once, reuse it everywhere"). Every landmark or
 * recurring prop is drawn by one function in this folder, one file each; scenes and cutscenes call
 * it, nobody copies its drawing code. The art registry and composition documents own actual placements;
 * do not maintain a second manual asset catalogue.
 *
 * Conventions: a set draws in its own frame (origin at its foot, x to the right, heights up:
 * y = -h), and the caller places it (`placed` in view.ts: translate, scale). The train car takes
 * the caller's `y` instead, and the containers draw on a scene `View` (`frameView` for a frame).
 */

export { BOX20, BOX40, CH, container, PAL, stack, type Crate } from "./props/containers";
export { boomHinge, drawGantry, GANTRIES, STS2, type Gantry, type GantryLook } from "./machinery/crane";
export { drawSpire, SPIRE_LIGHT } from "./architecture/spire";
export { CAR, drawMetroCar, drawTrainCar, METRO } from "./vehicles/train-car";
export { drawStringLights, SALT, saltBack, saltCounter, saltLights, saltLime, saltShell, saltUnder } from "./assemblies/beach-bar";
export { drawBonfire, drawDjBooth, drawLounger } from "./props/beach-party";
export { drawSea, type SeaLook } from "./environment/sea";
export { drawCar, drawForklift, drawReachStacker, drawStraddle, drawTruck, M, PORT_SCALE, PORT_TRAILER_SCALE, SIZE } from "./vehicles/vehicles";
export { bobAt, drawLivery, laneAt, laneSlots, paintBanded, type Lane, type Livery } from "./vehicles/kit";
export { BOAT_KINDS, drawBoat, type BoatKind } from "./vehicles/boats";
export { drawBogies, drawConsist, drawPlatformTrain, PLATFORM_TRAIN, RAIL_CAR } from "./vehicles/rail";
export { AIR_KINDS, BLIMP_SCALE, CRAFT_LEN, drawAircraft, drawBlimp, drawCab, drawCraft, drawDrone, type AirKind, type CraftKind } from "./vehicles/air-traffic";
export { drawPalm } from "./environment/palm";
export { drawGalleriaDome } from "./architecture/galleria-dome";
export { drawTower, NEON, SIGN_COPY, signGlows, towerRow, type Tower, type TowerSign } from "./architecture/downtown-towers";
export { drawRing, RING, ringTraffic } from "./architecture/ring-highway";
export { drawBore, drawTunnelPortal, drawViaduct, drawWallPortal, LINE0 } from "./architecture/line0";
export { drawCanalGlimpse, drawGroundSection } from "./architecture/cutaway";
export { frameView, placed } from "./core/view";
export { puddles, weatherFront, weatherMid, weatherSky, type PuddleSpec, type WeatherLook } from "./atmosphere/weather";
export { drawPane, drawSky, glass, moonDisc, seaCols, skyCols, skyPos, sunPath, windowShaft, type PaneOpts, type SkyOpts } from "./environment/sky";
export { addLight, castShadow, createLightingFrame, drawCasters, drawGrade, drawLights, drawShade, gradeOf, inShade, prepareShade, type LightingFrame, type ShadeFrame, type Caster, type SceneLight, type Shade, type ShadeSide } from "./atmosphere/lighting";
