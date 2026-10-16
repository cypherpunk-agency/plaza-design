/** Metro-car layout, interactions and rules. Artwork receives a snapshot of the current ride. */
import { trainComposition,trainGeometry,trainLayout,adaptTrain,type TrainRenderOptions } from './composition';
import type { Composition,Environment } from '../../art/core/composition';

import { TRAIN } from "../../data/index";

import { type SceneDef } from "../kit";

import { TRAIN_RULES } from "./rules";

const L = trainLayout();

const base: Omit<SceneDef,'drawBackdrop'|'drawFront'> = {
  id: 'train',
  name: 'Metro car',
  // facing (light.ts): the windows on your side look east-south-east (the train home runs into the dawn)
  facing: 110,
  width: L.width,
  spawn: L.spawn,
  intro: ['The metro car. It stops everywhere and asks nothing. Getting off at the right stop is up to me.'],
  exits: [
    { id: 'line', x: L.lineMap, to: '', action: 'map', label: '[E] LINE MAP', promptH: 172 },
    { id: 'out', x: L.doors[1], to: '', action: 'out', label: '[E] STEP OUT', promptH: 114 },
    { id: 'out2', x: L.doors[0], to: '', action: 'out', label: '[E] STEP OUT', promptH: 114 },
  ],
  readables: [
    { id: 'staff', x: L.staff, name: 'STAFF DOOR', promptH: 86, pages: ['STAFF ONLY. LOCKED.', 'NO PASSENGER ACCESS.'] },
    { id: 'ad', x: trainGeometry().find(r=>r.instance.id==='ad1')!.placement.x, name: 'NOTICE', promptH: 170, pages: ['CAMERAS OPERATE IN THIS CAR.', 'RECORDINGS ARE KEPT FOR THE DURATION OF THE PASSENGER PLUS 90 DAYS.'] },
    { id: 'gangway', x: L.gangDoor, name: 'TO CAR 2', promptH: 132, pages: ['CAR 2 · LOCKED.', 'INTER-CAR TRAVEL SUSPENDED UNTIL FURTHER NOTICE.'] },
    ...L.people.map((p) => ({ id: p.id, x: p.x, name: p.name, pages: p.pages, label: '[E] TALK', promptH: p.sit ? 56 : 62 })),
  ],
  // TRAIN-0's emergency panel by the brake: P14 (data/train.json, train0.ts)
  data: TRAIN,
  rules: TRAIN_RULES,


};

export function trainScene(doc:Composition=trainComposition,state:Environment['state']={},options:TrainRenderOptions={}):SceneDef{return adaptTrain(base,doc,state,options);}
export const train=trainScene();
