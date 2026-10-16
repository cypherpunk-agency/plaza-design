import type { Composition,Environment } from '../../art/core/composition';
import { laundromatComposition,laundromatDeviceData,laundromatGeometry,laundromatLayout,validateLaundromatComposition,type LaundromatRenderOptions } from './composition';
/**
 * The laundromat (story Level 5, P13 Washer 3): a narrow shop in the Neon
 * Market, between the stalls, where Moth left a jacket in washer 3 with a
 * maglev pass in its pocket ("nobody searches a wash cycle").
 *
 * Its devices (four washers, the breaker and its conduits, the schedule, SUDS)
 * are data/laundromat.json; the cycles, the trip and the jacket are rules.ts;
 * the drawing is scene.ts. Its life (the people waiting for their wash, FOLD-O
 * at the folding table, the cat on the sill, the soap dispenser, the Registry's
 * notice, the lost-sock board) is `people`, `uses` and `readables`.
 *
 * The way out is the door, back into the market.
 */

import { LAUNDROMAT } from "../../data/index";
import type { SceneDef } from "../kit";
import { LAUNDROMAT_RULES } from './rules';
import { drawLaundromat, L, LAUNDROMAT_W, PEOPLE, laundromatPeople } from './scene';

export { LAUNDROMAT_RULES, MAGLEV_PASS, P13_FLAG, RIGHT_GLOVE } from './rules';

/** The laundromat, complete: data, rules, drawing, its life, the door. */
const baseLaundromat: SceneDef = {
  id: 'laundromat',
  name: 'the laundromat',
  // facing (light.ts): the front window looks south onto the market: sun most of the day
  facing: 180,
  width: LAUNDROMAT_W,
  spawn: L.spawn,
  exits: [{ id: 'market', x: L.door, to: 'market', at: 'laundromat', label: '[E] MARKET', promptH: 82 }],
  intro: [
    'Washer 3. Moth\'s jacket is in there, behind the glass, one cycle from done.',
    'Every machine is waiting for something. So is everyone sitting here.',
  ],
  pixel: 'along',
  data: LAUNDROMAT,
  rules: LAUNDROMAT_RULES,
  drawBackdrop: drawLaundromat,
  people: PEOPLE,
  readables: [
    { id: 'notice', x: L.notice, name: 'REGISTRY NOTICE', promptH: 104, pages: [
      'LAUNDRY LEFT OVER 72 HOURS IS RECORDED AS ABANDONED PROPERTY.',
      'ABANDONED PROPERTY IS SCANNED FOR IDENTITY AND FORWARDED TO THE REGISTRY.',
    ] },
    { id: 'socks', x: L.socks, name: 'LOST SOCKS', promptH: 116, pages: [
      'A board of single socks, pinned up by FOLD-O. Under a grey one, a note: "Owner may claim by describing the other one."',
      'Under it, another hand: "it was grey." Under that, FOLD-O\'s neat print: "nice try."',
    ] },
  ],
  uses: [
    { id: 'soap', x: L.soap, label: '[E] SOAP', price: 1, name: 'SOAP DISPENSER', promptH: 92, h: 76, use: (c) => {
      if (!c.pay(1)) return ['INSERT 1 TOKEN.', 'NO TOKEN DETECTED. NO SOAP DISPENSED. ATTEMPT LOGGED.'];
      c.add('soap');
      return ['1 SACHET DISPENSED. SCENT: STANDARD.', 'PURCHASE LOGGED TO YOUR IDENTITY. IDENTITY NOT FOUND. PURCHASE LOGGED ANYWAY.'];
    } },
  ],
};

export { drawLaundromat,laundromatFrameEnvironment } from './scene';
export { laundromatComposition,laundromatArt,validateLaundromatComposition } from './composition';
export function laundromatScene(document:Composition=laundromatComposition,state:Environment['state']={},options:LaundromatRenderOptions={}):SceneDef{const doc=validateLaundromatComposition(document),L=laundromatLayout(doc),rows=laundromatGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!;return {...baseLaundromat,width:Number(get('room').props.width),facing:Number(get('window').props.facing),spawn:L.spawn,data:laundromatDeviceData(LAUNDROMAT,doc),people:laundromatPeople(doc),exits:baseLaundromat.exits.map(e=>({...e,x:get('exit-market').placement.x})),readables:baseLaundromat.readables!.map(r=>({...r,x:r.id==='notice'?L.notice:L.socks,promptH:(r.promptH??0)+get(r.id).placement.h-(r.id==='notice'?96:0)})),uses:baseLaundromat.uses!.map(u=>({...u,x:L.soap,h:(u.h??0)+get('soap').placement.h,promptH:(u.promptH??0)+get('soap').placement.h})),drawBackdrop:(ctx,v,e)=>drawLaundromat(ctx,v,e,doc,state,options)};}
export const laundromat=laundromatScene();
