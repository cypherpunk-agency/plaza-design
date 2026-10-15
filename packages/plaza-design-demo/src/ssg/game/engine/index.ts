/**
 * The engine: one runtime for every scene on the hacking system.
 * A scene is a data file (game/data/<id>.json) plus a little code next to its
 * scene art: named effects (`SceneRules`) and drawing (`EngineView`), bundled as
 * a `EngineDef`. The game hosts it with `new SceneHost(…, def)`. See GAME-DATA.md.
 */

export { SceneHost, type DrawLayer, type DrawView, type EngineDef, type SceneStore, type SceneTarget, type EngineView } from './host';
export { SceneModel, type Device, type Line, type Link, type Noun, type Spot } from './model';
export type { Effect, World, SceneRules } from './rules';
