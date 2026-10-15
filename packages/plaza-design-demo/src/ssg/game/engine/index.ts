/**
 * The engine: one runtime for every scene (the hacking system: devices, nouns,
 * verbs, cables, hack vision, the board). A scene's definition (`SceneDef`,
 * scenes/kit.ts) may bring a data file (game/data/<id>.json) and a little code
 * next to its drawing: named effects (`SceneRules`), panels, extra targets. A
 * scene without a data file has zero devices. The game hosts every scene with
 * `new SceneHost(…, def, rules)`. See GAME-DATA.md.
 */

export { emptyData, NO_RULES, SceneHost, type DrawLayer, type DrawView, type EngineDraw, type SceneStore, type SceneTarget } from './host';
export { SceneModel, type Device, type Line, type Link, type Noun, type Spot } from './model';
export type { Effect, World, SceneRules } from './rules';
