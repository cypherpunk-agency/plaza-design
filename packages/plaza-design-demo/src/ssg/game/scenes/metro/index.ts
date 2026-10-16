import { metroComposition,metroGeometry,metroLayout,adaptMetro,MetroCitySession,type MetroRenderOptions } from './composition';
import type { Composition,Environment } from '../../art/core/composition';
/**
 * Downtown station: an elevated platform on a viaduct, open to the city. A
 * train pulls in, opens its doors and leaves, on a loop. Bands: far = the
 * city clock's sky (sets/sky.ts: the platform looks west, so the slatted sun sets
 * here) behind the skyline (../skyline.ts, the intro's city, dimmed: the antenna, rooftop cables with packets, beacons, the
 * star mesh, ships); middle = the viaduct's far railing, the canopy roof on its
 * pillars, the girder and piers under the deck; play = the track and the train,
 * the platform, the departure board, signs, benches, the stairs.
 */


import { type SceneDef } from "../kit";

/** Layout: positions in world units, heights up from the platform. */
const L = metroLayout();
const point=(id:string)=>metroGeometry().find(r=>r.instance.id===id)!.placement;


/** The city drifts at this fraction of the camera (its own bands drift slower still), and how much it is dimmed: far band, calm. */



/** The frame the city was last drawn at, to step its packets by real frames (slower than the cutscene's). */


/** The city behind the station: the shared skyline, its horizon just over the deck, dimmed under a wash. */


/** Street lights far below the viaduct, seen between the piers: [x, depth]. */


/** The viaduct's far edge behind the track: a girder lip and a waist-high railing, against the city. */


/** The canopy over the platform: a truss on top, the fascia with the line's stripe, lamps underneath. */


/** A pillar holding the roof, with its braces; the first carries a camera. */


/** The station's name on a plate hung from the roof. */


/**
 * The city map: a backlit board on two legs, lit from inside and throwing its
 * light on the slab. The districts as dim blocks, LINE 0 across them with its
 * three stops, YOU ARE HERE blinking at Downtown; a cyan edge and LED: usable.
 */


/** The stairs down to the street at the platform's end: a lit stairwell, its railing, a cyan plate on a post. */


/**
 * The exit turnstile by the stairs (IDENTITY CHECK AT ALL EXITS): a waist-high post with a key
 * reader and a flap, standing on the slab. It lets you through; on the opening's dawn it takes
 * a beat too long (game.ts draws its "verifying").
 */


/** The near floor strip: the platform's slab, then the viaduct's girder and piers with the street glowing far below. */



const base: Omit<SceneDef,'drawBackdrop'> = {
  id: 'metro',
  name: 'Downtown metro',
  // facing (light.ts): the elevated platform looks west over the city: the sunset
  facing: 270,
  width: L.width,
  spawn: L.spawn,
  ambient: { sky: true, weather: true, covers: [{ from: -60, to: L.width + 60, under: L.canopy.under }] },
  horizon: L.horizon,
  // the benches: sit and let the trains go by (TIME.md, waiting)
  intro: ['The metro. One line, three stops, round and round. Getting off at the right one is my problem.'],
  exits: [
    { id: 'downtown', x: point('downtown').x, to: 'downtown', at: 'metro', label: '[E] STAIRS DOWN · DOWNTOWN', promptH: 82 },
    { id: 'train', x: L.boardAt, to: '', action: 'board', label: '[E] BOARD', promptH: 84 },
    { id: 'citymap', x: L.cityMap, to: '', action: 'map', label: '[E] CITY MAP', promptH: 90 },
  ],
  readables: [
    { id: 'board', x: L.board, name: 'DEPARTURES', promptH: 120, pages: ['LINE 0 · A TRAIN EVERY 25 SECONDS.', 'DOORS OPEN FOR A LIMITED TIME. DO NOT HOLD THE DOORS.'] },
    { id: 'map', x: point('map').x, name: 'LINE MAP', promptH: 92, pages: ['LINE 0: DOWNTOWN · GALLERIA · HARBOR.', 'LOOP SERVICE. TRAINS STOP AT EVERY STATION.'] },
    { id: 'screen', x: L.screen, name: 'REGISTRY SCREEN', promptH: 170, pages: ['COMPLIANCE IS COMFORT.', 'THIS MESSAGE IS BROUGHT TO YOU BY THE REGISTRY.'] },
    { id: 'regular', x: point('regular').x, name: 'MAN WITH A PAPER', label: '[E] TALK', promptH: 54, pages: ['The paper says the metro runs on time.', "It's yesterday's paper. It ran on time yesterday too. Allegedly."] },
    { id: 'poster', x: point('poster').x, name: 'POSTER', promptH: 92, pages: ['REGISTRY PREMIUM.', 'PRIORITY IDENTITY CHECKS AT ALL EXITS.'] },
  ],


};

export function metroScene(doc:Composition=metroComposition,state:Environment['state']={},options:MetroRenderOptions={},session=new MetroCitySession()):SceneDef{return adaptMetro(base,doc,state,options,session);}
export const metro=metroScene();
