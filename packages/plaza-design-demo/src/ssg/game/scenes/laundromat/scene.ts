import {compileSceneActors} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import { drawLaundromatComposition,laundromatComposition,laundromatEnvironment,laundromatGeometry,type LaundromatRenderOptions } from './composition';
import type { Composition,Environment } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import type { EngineDraw } from '../../engine/host';
import {LAUNDROMAT_SCENE} from './scene-document';
/**
 * The laundromat on the canvas: a narrow shop between the market's stalls,
 * open late, lit like an operating theatre, four washers along the wall and
 * a breaker that does not want four.
 *
 * Play band (brightest): the door back out to the market, the Registry's
 * notice, the soap dispenser, the schedule box, the four washers (their drums
 * turn while they wash), the breaker with its conduits running in the wall to
 * every washer (P13's fixed cables, drawn where they are), SUDS on its post, the
 * folding table and FOLD-O, the bench with the people waiting, the lost-sock
 * board. Middle band (dim): the back wall, a row of dead dryers over the
 * washers, the TV, the ceiling and, on tall screens, the flats upstairs. Far
 * band (dimmest): the market through the front window, stalls and people
 * passing in the rain.
 *
 * World units match the street (the player is 42 tall). Where the devices
 * stand for tapping, E and hack vision is laundromat.json (`layout.spot`);
 * this draws them there.
 */

import { type Character } from "../../runtime/characters";

/** Bodies, dialogue and placement share the source used by native Game and preview. */
export function laundromatActors(doc:Composition=laundromatComposition,source:SceneDocument=LAUNDROMAT_SCENE):Record<string,Character>{
 return compileSceneActors(source,laundromatGeometry(doc));
}
const actors=laundromatActors();
export const PEOPLE=LAUNDROMAT_SCENE.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]);
export function laundromatPeople(doc:Composition=laundromatComposition){const actors=laundromatActors(doc);return LAUNDROMAT_SCENE.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]);}
export function laundromatFrameEnvironment(view:View,engine:EngineDraw,doc:Composition=laundromatComposition,renderActors:Readonly<Record<string,Character>>=actors):Environment{return laundromatEnvironment(doc,view,engine,renderActors);}
export function drawLaundromat(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,doc:Composition=laundromatComposition,state:Environment['state']={},options:LaundromatRenderOptions={},renderActors:Readonly<Record<string,Character>>=actors){drawLaundromatComposition(ctx,view,engine,renderActors,doc,state,options);}
