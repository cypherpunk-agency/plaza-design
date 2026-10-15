/**
 * Downtown, the first street, a scene on the engine: every machine is a device
 * on the board with nouns and verbs, hack vision (H) and the board (B), and
 * the deck's keyboard stays as the last resort. What is on the street is
 * data/downtown.json; its own code is the effects and save bridge (rules.ts,
 * save.ts), CAM-3 (camera.ts), the drawing (scene.ts) and the typed commands
 * (shell.ts). Its doors are exits like any scene's. The street's walls, its
 * people and the fixer stay in game.ts and level.ts.
 */

import { DOORS, drawMetroStairs, drawTaxiPad } from '../city';
import { DOWNTOWN } from '../data';
import { LEVEL_W, PLATFORMS, READABLES, SPAWN_X } from '../level';
import { MOTH_KEY } from '../moth';
import { drawLibraryFront } from '../library';
import type { SceneDef } from '../scenes/kit';
import { cam3Panel } from './camera';
import { downtownRules, dlvX } from './rules';
import { drawDowntown, MAP_KIOSK_X } from './scene';

export { MAP_KIOSK_X } from './scene';
export { reconcile, syncGoals } from './save';
export { sceneShell, type SceneShell } from './shell';
export type { Player } from './rules';

const home = DOWNTOWN.devices.find((d) => d.id === 'dlv9')?.layout?.spot?.x ?? 0;

/** Downtown, complete. Its rules are made for the player's save (`rules(player)`). */
export const downtown: SceneDef = {
  id: 'downtown',
  name: 'Downtown',
  width: LEVEL_W,
  spawn: SPAWN_X,
  // the street's doors, stairs and pad, west to east (the market gate's door only once the gate is open), and the map kiosk
  exits: [
    { id: 'market', x: DOORS.market, to: 'market', at: 'downtown', label: '[E] NEON MARKET', promptH: 120, requires: 'end' },
    { id: 'shop', x: DOORS.shop, to: 'shop', at: 'downtown', label: '[E] CORNER SHOP', promptH: 84 },
    { id: 'library', x: DOORS.library, to: 'library', at: 'downtown', label: '[E] PUBLIC LIBRARY', promptH: 96 },
    { id: 'yard', x: DOORS.yard, to: 'yard', label: '[E] BACK YARD', promptH: 86 },
    { id: 'capsule', x: DOORS.capsule, to: 'capsule', at: 'door', label: '[E] HOME · CAPSULE 7B', promptH: 84 },
    { id: 'metro', x: DOORS.metro, to: 'metro', at: 'downtown', label: '[E] METRO', promptH: 106 },
    // Moth's building: the residents' door reads key chips, and only Moth's opens it
    { id: 'moth', x: DOORS.moth, to: 'moth', at: 'door', label: '[E] FLAT 4C · MOTH', promptH: 102,
      needs: { key: MOTH_KEY, name: 'DOOR', h: 52, pages: ['RESIDENTS ONLY. PRESENT KEY CHIP.', 'FLAT 4C · RESIDENT: MOTH · AUTHORISED VISITORS: 0.'] } },
    { id: 'taxi', x: DOORS.taxi, to: '', action: 'taxi', label: '[E] HAIL TAXI', promptH: 122 },
    { id: 'map', x: MAP_KIOSK_X, to: '', action: 'map', label: '[E] CITY MAP', promptH: 92 },
  ],
  readables: READABLES.map((r) => ({ id: r.id, x: r.x, name: 'SIGN', pages: r.pages, promptH: 160 })),
  ambient: { sky: true, city: true, street: true, weather: true },
  // the street runs north–south; you look east across it, over the towers toward the bay: the sun
  // comes up behind them (the opening's dawn) and the facades stand in their own shade all morning
  facing: 80,
  shade: {
    front: { h: 300, gaps: [[950, 1040], [1040, 1200], [1520, 1680]] },
    back: { h: 220, gaps: [[380, 430], [1090, 1160], [1600, 1660], [2010, 2100]] },
  },
  lights: [
    { x: 766, h: 96, kind: 'lamp', r: 56 }, { x: 854, h: 96, kind: 'lamp', r: 56 },
    { x: 995, h: 70, kind: 'lamp', r: 48, col: '255,180,100' },
    { x: 810, h: 130, kind: 'neon', col: '0,255,255', r: 48 },
    { x: 90, h: 100, kind: 'neon', col: '0,255,255', r: 44 },
    { x: 1770, h: 110, kind: 'neon', r: 44 },
    { x: 905, h: 104, kind: 'neon', r: 40 },
    { x: 640, h: 132, kind: 'neon', col: '255,90,110', r: 64 },
    { x: 1340, h: 220, kind: 'screen', r: 30, a: 0.7 },
    { x: 976, h: 140, kind: 'neon', col: '255,61,242', r: 30 },
  ],
  casters: [{ x: 1020, h: 22, w: 40 }],
  keepFace: true,
  platforms: PLATFORMS,
  pixel: 'along',
  buzz: true,
  data: DOWNTOWN,
  rules: (player) => downtownRules(player),
  panels: { cam3: cam3Panel },
  // once Downtown is cleared the gate stands open: the market's door takes the gate's place
  hideDevice: (id, flags) => id === 'gate' && !!flags.end,
  // the machines, then the metro stairs and the sky-taxi pad in front of the fronts (the street around them is game.ts)
  drawBackdrop: (x, v, e) => {
    drawLibraryFront(x, v, DOORS.library);
    drawDowntown(x, e.m, v, e.hover, dlvX(e.m, home));
    drawMetroStairs(x, v, DOORS.metro);
    drawTaxiPad(x, v, DOORS.taxi);
  },
};
