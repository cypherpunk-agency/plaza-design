import { bindLibraryActors, drawLibraryComposition, libraryComposition, libraryEnvironment, libraryLayout, libraryWidth, type LibraryRenderOptions } from './composition';
import type { View } from '../../art/core/view';
import type { EngineDraw } from '../../engine/host';
import type { Composition, Environment } from '../../art/core/composition';
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
const librarian: Character = { id: 'librarian', key: true, seed: 7101, look: { body: 'avg', garb: 'coat', hair: 'bun', extras: ['glasses'], top: '#4e5e3a', hairCol: '#d8d2c6' }, x: L.librarian, act: 'stand', facing: -1, name: 'LIBRARIAN', talk: [
  ['Welcome to the public library. The books are on the cloud. The chairs are here.', 'People come for the chairs. And the radiators. Mostly the radiators.'],
  ['No card? Then you are not in the system, and I cannot lend you anything.', 'I can lend you a chair. Chairs are not in the system. I checked.'],
  ['That printer has been printing the same overdue notice for eleven years.', 'Staff\'s. Nobody can cancel it. The staff left. The notice stayed. Like the rest of us.'],
  ['If something comes back to this library after eleven years, I will not ask where it has been.', 'I will stamp it. I have been waiting to stamp something since 2049.'],
] };
/** Terminal 1: twelve minutes of verified identity left, and a thesis. */
const student: Character = { id: 'student', seed: 7102, look: { body: 'slim', garb: 'jacket', hair: 'long', extras: ['headphones', 'backpack'], top: '#46506e' }, x: L.seats[0], h: 12, act: 'sit', facing: 1, name: 'TERMINAL 1', talk: [
  ['Twelve minutes left. I am writing a thesis on why we need more than thirty minutes.', 'Eleven.'],
  ['Do not stand behind me. I think the timer counts people who stand behind me.', 'I have not checked. No time.'],
] };
/** Terminal 2: three minutes left, level nine. */
const kid: Character = { id: 'kid', seed: 7103, look: { body: 'kid', garb: 'tee', hair: 'cap', extras: [], top: '#a84a3a' }, x: L.seats[1], h: 12, act: 'sit', facing: 1, name: 'TERMINAL 2', talk: [
  ['Three minutes. I am on level nine.', 'If you do not talk to me I can finish level nine.'],
  ['My mum is verified. I am her thirty minutes. She is at work. Do not tell the timer.'],
] };
/** A regular in the first armchair: not asleep. */
const sleeper: Character = { id: 'sleeper', seed: 7104, look: { body: 'old', garb: 'coat', hair: 'brim', extras: ['cane'], top: '#6a4a3a' }, x: L.chairs[0], h: 12, act: 'sit', facing: 1, name: 'REGULAR', talk: [
  ['...not asleep. Reading. With my eyes closed. It saves the eyes.'],
  ['Forty years I came here for the books. Now I come for the chair.', 'The chair is better. The chair never ended badly.'],
] };
/** A regular by the radiator, knitting something long. */
const knitter: Character = { id: 'knitter', seed: 7105, look: { body: 'old', garb: 'dress', hair: 'scarf', extras: ['bag'], top: '#7a4e7a', acc: '#d8b040' }, x: L.chairs[1], h: 12, act: 'sit', facing: 1, name: 'REGULAR', talk: [
  ['I come for the radiator. Do not tell the radiator.'],
  ['It is a scarf. For the radiator. It gets cold in February. Everything does.'],
  ['The heating has been over budget every February since they digitized the books.', 'Nobody turns it down. The committee would never allow it. We are the committee.'],
] };
/** A regular with the last paper newspaper, reading it very slowly. */
const reader: Character = { id: 'paper', seed: 7106, look: { body: 'wide', garb: 'suit', hair: 'bald', extras: ['glasses'] }, x: L.chairs[2], h: 12, act: 'sit', facing: -1, name: 'REGULAR', talk: [
  ['The last paper newspaper. I am reading it slowly.', 'If you only read this one, nothing new has happened since. It is very restful.'],
] };
/** SHELF-E: re-shelves the one book that is left, all day, along the empty shelves. */
const shelfE: Character = { id: 'shelfe', seed: 7107, look: { bot: 'servbot', paint: '#8a7a5a', v: 0 }, x: 690, act: 'roll', range: [640, 930], name: 'SHELF-E', talk: [
  ['Re-shelving. One book. Correct place: everywhere.'],
  ['Shelf 14 is empty. Shelf 15 is empty. I keep them in order.'],
] };
const cat: Character = { look: 'cat', seed: 11, x: L.cat, h: L.radiator.h, act: 'sleep', facing: -1 };

/** Everyone who lives here (the engine makes [E] TALK for those with talk, [E] PET for the cat). */
export const PEOPLE: Character[] = [shelfE, librarian, student, kid, sleeper, knitter, reader, cat];

// ---------- the room ----------

/** The reading room's windows look west (light.ts facing). */
export const LIBRARY_FACING = 270;

const actors = { shelfe: shelfE, librarian, student, kid, sleeper, knitter, paper: reader, cat };
bindLibraryActors(actors);

export function libraryFrameEnvironment(view: View, engine: EngineDraw, document: Composition = libraryComposition): Environment {
  return libraryEnvironment(document, view, engine, actors);
}

export function drawLibrary(ctx: CanvasRenderingContext2D, view: View, engine: EngineDraw, document: Composition = libraryComposition, state: Environment['state'] = {}, options: LibraryRenderOptions = {}) {
  drawLibraryComposition(ctx, view, engine, actors, document, state, options);
}
