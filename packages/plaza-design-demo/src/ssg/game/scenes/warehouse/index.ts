/**
 * Warehouse 4, from outside: down the lane behind the stacks (Harbor & Shore).
 * Twenty years the Tide's bonded store, now the Registry's evidence custody:
 * what the Registry seizes from people it counts out is kept here "pending
 * review". Its evidence locker is Act II (root fragment 3); for now the place is
 * its forecourt and a door that does not open, for a reason it states.
 *
 * Play band: the lane back to the stacks, a Tide hand mending a net on the
 * loading dock, the dock's roller doors sealed with Registry tape, the
 * personnel door with its warrant reader, the plaque, the Registry's notice
 * screen, a security mech on its round, the evidence van, a single shoe with an
 * evidence tag on the dock's edge. Middle band: the warehouse's corrugated wall,
 * high and windowless but for one lit office. Far band: the sky over the stacks,
 * the cranes, the Spire's antenna.
 *
 * No devices: nothing here to hack yet. Dry signs; the people have the jokes.
 */

import type { Character } from "../../runtime/characters";
import type { SceneDef } from "../kit";
import {drawWarehouseComposition,warehouseComposition,warehouseLayout,warehousePosition,warehouseLights,warehouseCasters,warehouseEnvironment,validateWarehouseComposition,type WarehouseRenderOptions} from './composition';
import type {Composition,Environment} from '../../art';
import type {View} from '../../art/core/view';
import type {EngineDraw} from '../../engine/host';

const L=warehouseLayout();

const mender: Character = { id: 'mender', key: true, seed: 7401, look: { body: 'old', garb: 'coat', hair: 'beanie', top: '#8a7a2a', acc: '#8a7a2a', extras: [] }, x: L.mender, h: 10, act: 'sit', facing: 1, name: 'TIDE HAND', talk: [
  ['Twenty years this was the Tide\'s. Fish in, fish out, the odd crate nobody asked about.', 'Then the Registry bought the building, the lock and the silence. Now it\'s evidence.'],
  ['Evidence of what? They don\'t say. Things people had when they got counted out. Phones. Keys. Shoes, for some reason.', 'If the Registry ever took something of yours, it\'s behind that door. Pending review.'],
  ['I mend nets out here because they let me. Nobody seizes a net. Too many holes to file.'],
] };
const PEOPLE: Character[] = [
  mender,
  { id: 'gull', look: 'gull', seed: 8, x: 736, act: 'walk', range: 30, name: 'GULL', talk: [['(The gull is standing guard over a chip packet that belongs to nobody. It looks at you like you are the review.)'], ['(It takes one step towards you. Pending.)']] },
  { look: 'pigeon', seed: 9, x: 360, h: L.dock.h, act: 'walk', range: 40 },
  { look: { bot: 'mech', paint: '#6a6e78' }, x: 560, act: 'patrol', range: [560, 820] },
];

export const WAREHOUSE_ACTORS:Record<string,Character>={mender,gull:PEOPLE[1],pigeon:PEOPLE[2],mech:PEOPLE[3]};

/** The warehouse door's answer: locked, and why. */
const DOOR = ['EVIDENCE CUSTODY · ACCESS BY REGISTRY WARRANT CARD.', 'READER: PRESENT YOUR CARD. YOUR IDENTITY: NOT FOUND. A PERSON WHO IS NOT FOUND CANNOT HOLD A WARRANT. DOOR REMAINS LOCKED.'];





const baseWarehouse: SceneDef = {
  id: 'warehouse',
  name: 'Warehouse 4',
  // facing (light.ts): the warehouse stands west of you, inland: the sun sets over its roof
  facing: 270,
  width: L.width,
  spawn: L.spawn,
  ambient: { sky: true, weather: true },
  // the warehouse wall stands west of you: in the afternoon it shades the yard in front of it
  shade: { front: { h: 240, gaps: [[-400, 160]] } },
  lights: [
    { x: 735, h: 140, kind: 'window', w: 30, hh: 22, r: 28 },
    { x: 486, h: 62, kind: 'lamp', r: 40, col: '255,60,60', a: 0.7 },
    { x: 600, h: 110, kind: 'lamp', r: 46 },
  ],
  casters: [{ x: L.van.x + L.van.w / 2, h: 46, w: L.van.w }],
  exits: [{ id: 'stacks', x: L.back, to: 'stacks', at: 'warehouse', label: '[E] STACKS', promptH: 82 }],
  intro: ['Warehouse 4. The Registry keeps what it takes in here.', 'The door has a reader. The reader has an opinion about me.'],
  pixel: 'along',
  people: PEOPLE,
  readables: [
    { id: 'plaque', x: L.plaque, name: 'PLAQUE', promptH: 80, pages: ['BONDED WAREHOUSE 4 · REGISTRY EVIDENCE CUSTODY.', 'SEIZED PROPERTY IS HELD PENDING REVIEW. OWNERS WILL BE CONTACTED AT THEIR REGISTERED ADDRESS.'] },
    { id: 'shoe', x: L.shoe, name: 'EVIDENCE TAG', promptH: 30, pages: ['ITEM 44-0812 · 1 SHOE (LEFT) · OWNER: COUNTED OUT · STATUS: PENDING REVIEW.'] },
  ],
  uses: [
    { id: 'door', x: L.door, label: '[E] THE DOOR', name: 'WARRANT READER', promptH: 74, use: () => DOOR },
  ],
  drawBackdrop: (x, v) => drawWarehouseComposition(x,v,WAREHOUSE_ACTORS),
};

export {warehouseComposition,validateWarehouseComposition} from './composition';
export function warehouseFrameEnvironment(view:View,_engine:EngineDraw,document:Composition=warehouseComposition){return warehouseEnvironment(document,view,WAREHOUSE_ACTORS);}
export function warehouseScene(document:Composition=warehouseComposition,state:Environment['state']={},options:WarehouseRenderOptions={}):SceneDef{
 const doc=validateWarehouseComposition(document),L=warehouseLayout(doc),get=(id:string)=>warehousePosition(id,doc),people=Object.entries(WAREHOUSE_ACTORS).map(([id,actor])=>{const p=get(id).placement,copy=structuredClone(actor),dx=p.x-actor.x;if(Array.isArray(copy.range))copy.range=[copy.range[0]+dx,copy.range[1]+dx];copy.x=p.x;if(copy.h!==undefined||p.h!==0)copy.h=p.h;return copy;});
 return{...baseWarehouse,width:L.width,spawn:L.spawn,facing:Number(get('scene').props.facing),people,
  shade:{front:{h:L.wall.h,gaps:[[-400,L.wall.x0]]}},lights:warehouseLights(doc),casters:warehouseCasters(doc),
  exits:baseWarehouse.exits.map(exit=>({...exit,x:get('exit-stacks').placement.x})),
  readables:baseWarehouse.readables!.map(r=>({...r,x:get(r.id).placement.x,promptH:(r.promptH??0)+get(r.id).placement.h})),
  uses:baseWarehouse.uses!.map(use=>({...use,x:get(use.id).placement.x,promptH:(use.promptH??0)+get(use.id).placement.h,...(get(use.id).placement.h!==0?{h:get(use.id).placement.h}:{})})),
  drawBackdrop:(ctx,view)=>drawWarehouseComposition(ctx,view,WAREHOUSE_ACTORS,doc,state,options),
 };
}
export const warehouse=warehouseScene();
