import { bindLibraryActors, drawLibraryComposition, libraryComposition, libraryEnvironment, libraryLayout, libraryWidth, type LibraryRenderOptions } from './composition';
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

/** The reading room: 960 wide, 176 high inside. */
export const LIBRARY_W = libraryWidth;

/** Where things are (world x; heights above the floor). Devices stand at their `layout.spot` in library.json; these agree. */
export const L = libraryLayout(libraryComposition);

// ---------- people ----------

/** The librarian: keeps the place open for the chairs, and knows exactly what the printer is doing. */
const librarian: Character = { id: 'librarian', key: true, seed: 7101, look: { body: 'avg', garb: 'coat', hair: 'bun', extras: ['glasses'], top: '#4e5e3a', hairCol: '#d8d2c6' }, x: L.librarian, act: 'stand', facing: -1, name: 'LIBRARIAN' };
/** Terminal 1: twelve minutes of verified identity left, and a thesis. */
const student: Character = { id: 'student', seed: 7102, look: { body: 'slim', garb: 'jacket', hair: 'long', extras: ['headphones', 'backpack'], top: '#46506e' }, x: L.seats[0], h: 12, act: 'sit', facing: 1, name: 'TERMINAL 1' };
/** Terminal 2: three minutes left, level nine. */
const kid: Character = { id: 'kid', seed: 7103, look: { body: 'kid', garb: 'tee', hair: 'cap', extras: [], top: '#a84a3a' }, x: L.seats[1], h: 12, act: 'sit', facing: 1, name: 'TERMINAL 2' };
/** A regular in the first armchair: not asleep. */
const sleeper: Character = { id: 'sleeper', seed: 7104, look: { body: 'old', garb: 'coat', hair: 'brim', extras: ['cane'], top: '#6a4a3a' }, x: L.chairs[0], h: 12, act: 'sit', facing: 1, name: 'REGULAR' };
/** A regular by the radiator, knitting something long. */
const knitter: Character = { id: 'knitter', seed: 7105, look: { body: 'old', garb: 'dress', hair: 'scarf', extras: ['bag'], top: '#7a4e7a', acc: '#d8b040' }, x: L.chairs[1], h: 12, act: 'sit', facing: 1, name: 'REGULAR' };
/** A regular with the last paper newspaper, reading it very slowly. */
const reader: Character = { id: 'paper', seed: 7106, look: { body: 'wide', garb: 'suit', hair: 'bald', extras: ['glasses'] }, x: L.chairs[2], h: 12, act: 'sit', facing: -1, name: 'REGULAR' };
/** SHELF-E: re-shelves the one book that is left, all day, along the empty shelves. */
const shelfE: Character = { id: 'shelfe', seed: 7107, look: { bot: 'servbot', paint: '#8a7a5a', v: 0 }, x: 690, act: 'roll', range: [640, 930], name: 'SHELF-E' };
const cat: Character = { look: 'cat', seed: 11, x: L.cat, h: L.radiator.h, act: 'sleep', facing: -1 };

/** Actor appearance/order; libraryScene binds the authored dialogue before making E targets. */
export const PEOPLE: Character[] = [shelfE, librarian, student, kid, sleeper, knitter, reader, cat];
// The prepared drawing path also uses talkability for the librarian's faint hint mark.
for(const row of LIBRARY_SCENE.people!)Object.assign(PEOPLE.find(person=>person.id===row.id)!,{name:row.name,talk:structuredClone(row.talk)});

// ---------- the room ----------

/** The reading room's windows look west (light.ts facing). */
export const LIBRARY_FACING = 270;

const actors = { shelfe: shelfE, librarian, student, kid, sleeper, knitter, paper: reader, cat };
bindLibraryActors(actors);

export function libraryFrameEnvironment(view: View, engine: EngineDraw, document: Composition = libraryComposition, renderActors:Readonly<Record<string,Character>>=actors): Environment {
  return libraryEnvironment(document, view, engine, renderActors);
}

export function drawLibrary(ctx: CanvasRenderingContext2D, view: View, engine: EngineDraw, document: Composition = libraryComposition, state: Environment['state'] = {}, options: LibraryRenderOptions = {}, renderActors:Readonly<Record<string,Character>>=actors) {
  drawLibraryComposition(ctx, view, engine, renderActors, document, state, options);
}
