import {compileSceneActors} from '../../engine/gameplay/actors';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import {content} from './scene-document';
import { drawSandboxComposition,sandboxComposition,sandboxEnvironment,sandboxGeometry,sandboxLayout,sandboxStations,sandboxWidth,type SandboxRenderOptions } from './composition';
import type { Composition,Environment } from '../../art/core/composition';
import type { View } from '../../art/core/view';
import type { EngineDraw } from '../../engine/host';
/**
 * The sandbox on the canvas: REGISTRY QA BAY 3, a long test hall where every
 * engine feature has its own bench, left to right, each under a plate that
 * names it (BAY 3·01 NOUN KINDS … BAY 3·10 TIME AND WEATHER).
 *
 * Play band (brightest): the devices under test on benches, posts and the
 * wall, each where sandbox.json's `layout.spot` puts it, drawn so their state
 * shows (a lamp lit, a fan turning, a drawer open, a belt stopped while the
 * watchdog checks it); the reset console; the people (the QA lead, the night
 * tech, TEST UNIT 0 carrying parts, the cat on the radiator). Middle band
 * (dim): the hall's panelled wall, the station plates, the tube lights, the
 * conduit in the wall. Far band: the city through the big window at the east
 * end (the city clock's sky, the district's weather) and, on tall screens, the
 * ducts over the ceiling.
 *
 * World units match the street (the player is 42 tall).
 */

import { type Character } from "../../runtime/characters";

export const SANDBOX_W = sandboxWidth;

/** Where things are that are not devices (world x). The devices stand at their `layout.spot` in sandbox.json. */
export const SB = sandboxLayout();

/** The stations, left to right: their span, title and what they test (the plate on the wall says both). */
export const STATIONS = sandboxStations();

/** Source bodies and artwork compile to the same native objects used for drawing and interaction. */
export function sandboxActors(doc:Composition=sandboxComposition,source:SceneDocument=content.scene):Record<string,Character>{return compileSceneActors(source,sandboxGeometry(doc));}
const actors=sandboxActors();
export const PEOPLE:Character[]=content.scene.actors!.filter(a=>a.band==='world').map(a=>actors[a.id]);
export function sandboxFrameEnvironment(view:View,engine:EngineDraw,doc:Composition=sandboxComposition,renderActors:Readonly<Record<string,Character>>=actors):Environment{return sandboxEnvironment(doc,view,engine,renderActors);}
export function drawSandbox(ctx:CanvasRenderingContext2D,view:View,engine:EngineDraw,doc:Composition=sandboxComposition,state:Environment['state']={},options:SandboxRenderOptions={},renderActors:Readonly<Record<string,Character>>=actors){drawSandboxComposition(ctx,view,engine,renderActors,doc,state,options);}
