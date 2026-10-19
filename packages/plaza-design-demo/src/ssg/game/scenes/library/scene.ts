import {compileSceneActors} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import { libraryGeometry, drawLibraryComposition, libraryComposition, libraryEnvironment, type LibraryRenderOptions } from './composition';
import type { View } from '../../art/core/view';
import type { EngineDraw } from '../../engine/host';
import type { Composition, Environment } from '../../art/core/composition';
import {LIBRARY_SCENE} from './scene-document';
/**
 * The public library on the canvas (P16 Long overdue): Downtown's branch, a tall old reading room
 * on the street west of the noodle stall. The books were digitized years ago; the shelves stayed
 * for the acoustics and the building for the chairs, and the chairs for the radiators.
 *
 * Play band (brightest): the door, the notice board, the CARD READER on its post, three public
 * terminals with the SESSION TIMER over them (two in use, one free), the librarian's desk with the
 * PRINTER on its end, a paper book chained to a stand, three armchairs and the radiator under the
 * windows (the regulars, and the cat on the radiator), SHELF-E rolling along the empty shelves.
 * Middle band (dim): the empty shelves to the ceiling, the gallery rail, the clock, the Registry's
 * strip and its camera. Far band (dimmest): Downtown's towers through the tall windows, in the rain.
 *
 * World units match the street (the player is 42 tall). Where the devices stand for tapping, E
 * and hack vision is library.json (`layout.spot`); this draws them there.
 */

import { type Character } from "../../runtime/characters";

/** Scene source bodies feed native runtime preparation; composition remains the placement owner. */
export function libraryActors(document:Composition=libraryComposition,content:SceneDocument=LIBRARY_SCENE):Record<string,Character>{
 return compileSceneActors(content,libraryGeometry(document));
}
const actors=libraryActors();
export const PEOPLE=LIBRARY_SCENE.actors!.map(a=>actors[a.id]);
/** The reading room windows face west. */
export const LIBRARY_FACING=270;

export function libraryFrameEnvironment(view: View, engine: EngineDraw, document: Composition = libraryComposition, renderActors:Readonly<Record<string,Character>>=actors): Environment {
  return libraryEnvironment(document, view, engine, renderActors);
}

export function drawLibrary(ctx: CanvasRenderingContext2D, view: View, engine: EngineDraw, document: Composition = libraryComposition, state: Environment['state'] = {}, options: LibraryRenderOptions = {}, renderActors:Readonly<Record<string,Character>>=actors) {
  drawLibraryComposition(ctx, view, engine, renderActors, document, state, options);
}
