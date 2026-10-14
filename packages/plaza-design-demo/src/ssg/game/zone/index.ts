/**
 * The zone engine: one runtime for every zone on the hacking system.
 * A zone is a data file (game/data/<id>.json) plus a little code next to its
 * scene art: named effects (`ZoneRules`) and drawing (`ZoneView`), bundled as
 * a `ZoneDef`. The game hosts it with `new ZoneHost(…, def)`. See GAME-DATA.md.
 */

export { ZoneHost, type DrawLayer, type DrawView, type ZoneDef, type ZoneStore, type ZoneTarget, type ZoneView } from './host';
export { ZoneModel, type Device, type Line, type Link, type Noun, type Spot } from './model';
export type { Effect, World, ZoneRules } from './rules';
