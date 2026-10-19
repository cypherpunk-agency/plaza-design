import {manifestGeometry} from '../../engine/gameplay/manifest-geometry';
import {compileSceneActors} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import type {Composition} from '../../art/core/composition';
import {content} from './scene-document';
import { beachComposition,beachGeometry,drawBeachComposition } from './composition';
import type { SceneModel } from '../../engine/index';
import type { View as DrawView } from '../../art/core/view';
/**
 * The beach on the canvas: a real beach looking east over the sea (the sun rises out of it;
 * the sky and the light are the city clock's: sets/sky.ts, sets/lighting.ts), along the shore from the harbor. Sand
 * down to the waterline, the open sea with waves rolling in, a wide sky, and
 * the city's towers small and far off along the shore. The city is in the
 * details: a rental kiosk that bills by the minute, a Registry drone checking
 * towels, ads on the lifeguard tower, a notice on Moth's boat.
 *
 * Left to right: the stairs up to the promenade (the way back to the harbor),
 * the boardwalk with the Registry's beach notice and the sunbed kiosk, the
 * sunbeds, SALT (a shack on stilts with string lights; the bar under it, LIME
 * the robot bartender, the jukebox, the mixer), a crab, the lifeguard tower
 * and its drone, the volleyball net, the kids' sandcastle, then the pier out
 * over the water: its lamp controller, the old man fishing, a gull on a post,
 * and Moth's boat at the very end.
 *
 * Bands: far = sky, sun, the city on the shore, the sea with its swimmers and
 * surfers (calm, low contrast); middle = the promenade wall and the shoreline;
 * play = the boardwalk, sand, the bar, the tower, the pier, the people.
 *
 * World units match the street (the player is 42 tall). Device spots are
 * beach.json (`layout.spot`); this draws them there.
 */

import { type Character } from "../../runtime/characters";

/** Where you land coming down the stairs from the harbor (and walking in from its edge). */
const ordinaryGeometry=manifestGeometry(content.scene,beachGeometry(),['exits'],{groundExits:false});
export const BEACH_EDGE_X=ordinaryGeometry.artwork.stairs?.placement.x??ordinaryGeometry.spawn;
export const BEACH_SPAWN=ordinaryGeometry.spawn;

/** Native body identities and animation behavior now compile from editable scene source. */
export function beachActors(document:Composition=beachComposition,source:SceneDocument=content.scene):Record<string,Character>{return compileSceneActors(source,beachGeometry(document));}
export const BEACH_ACTORS=beachActors();
export const PEOPLE:Character[]=content.scene.actors!.filter(a=>a.band==='world').map(a=>BEACH_ACTORS[a.id]);
export const LIME=BEACH_ACTORS['lime-talk'];

/** When the gull on the post was last shooed (game frames), so it can fly off and come back. */
export const GULL = { shooed: -1e9 };

export function drawBeach(x:CanvasRenderingContext2D,m:SceneModel,d:DrawView,hover:string|null){drawBeachComposition(x,d,m,hover,BEACH_ACTORS,GULL,beachComposition);}
