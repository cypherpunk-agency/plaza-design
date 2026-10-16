import type { Composition, Environment } from '../../art/core/composition';
import { mothComposition, validateMothComposition, mothGeometry, type MothRenderOptions } from './composition';
/**
 * Moth's place (story Level 3): flat 4C, reached from Downtown's east end
 * with Moth's key chip. What is in it, FRIENDNET and MOTH-PC included, is
 * data/moth.json; the code is two derived values and a few goals (rules.ts)
 * and the drawing (scene.ts). The engine in engine/ runs the rest: the drawer's
 * key seal (P09), the journal's song seal and the Registry's watchdog (P10).
 * The way out is the door, back onto the street.
 */

import { MOTH } from "../../data/index";
import type { SceneDef } from "../kit";
import { mothDeviceData, mothPlacement } from './composition';
import { MOTH_RULES } from './rules';
import { drawMoth, MOTH_FACING, MOTH_DOOR_X, MOTH_SPAWN, MOTH_W } from './scene';

export { MOTH_KEY, UPLINK } from './rules';
export { MOTH_DOOR_X, MOTH_SPAWN, MOTH_W, drawMoth, mothFrameEnvironment } from './scene';
export { mothArt, mothComposition, validateMothComposition } from './composition';

/** The flat, complete: data, rules, drawing, the door. */
const baseMoth: SceneDef = {
  id: 'moth',
  name: "Moth's place",
  // facing (light.ts): the window looks west over the street: the evening sun
  facing: MOTH_FACING,
  width: MOTH_W,
  spawn: MOTH_SPAWN,
  exits: [{ id: 'door', x: mothPlacement('exit-door').x, to: 'downtown', at: 'moth', label: '', engine: true }],
  intro: [
    "Moth's place. Lights on, record playing, nobody home.",
    'Takeaway boxes, a thirsty plant, a fish. Moth left in a hurry. Or Moth always lives like this. Both, probably.',
    "Moth's computer is the way in. It always is.",
  ],
  pixel: 'along',
  data: mothDeviceData(MOTH),
  rules: MOTH_RULES,
  drawBackdrop: drawMoth,
  targets: (m) => [{ id: 'door', x: MOTH_DOOR_X, label: m.label('prompt.out'), promptH: 88 }],
  use: (id, m, say) => {
    if (id !== 'door') return;
    say(m.line('door.out'));
    return 'door';
  },
};

/** Canonical Moth scene for shipping and composer variants; destination/rules stay fixed. */
export function mothScene(document: Composition = mothComposition, state: Environment['state'] = {}, options: MothRenderOptions = {}): SceneDef {
  const doc=validateMothComposition(document),geometry=mothGeometry(doc),byId=(id:string)=>geometry.find(row=>row.instance.id===id)!,door=byId('door').placement;
  return {...baseMoth,width:Number(byId('shell').props.width),facing:Number(byId('window').props.facing),spawn:byId('spawn').placement.x,data:mothDeviceData(MOTH,doc),
    exits:baseMoth.exits.map(exit=>({...exit,x:byId('exit-door').placement.x})),
    targets:model=>[{id:'door',x:door.x,label:model.label('prompt.out'),promptH:88+door.h}],
    drawBackdrop:(ctx,view,engine)=>drawMoth(ctx,view,engine,doc,state,options),
  };
}
export const moth=mothScene();
