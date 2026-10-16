import type { Composition, Environment } from '../../art/core/composition';
import { capsuleComposition, validateCapsuleComposition, capsuleGeometry, type CapsuleRenderOptions } from './composition';
/**
 * Capsule 7B: your flat, where the game starts. What is in it is
 * data/capsule.json; what is left here is its own code: the flat's clock,
 * the router and Pixel (rules.ts) and the drawing (scene.ts). The engine in
 * engine/ runs the rest. The way out is the door, once CONCIERGE unlocks it.
 */

import { CAPSULE } from "../../data/index";
import type { SceneDef } from "../kit";
import { capsuleDeviceData, capsulePlacement } from './composition';
import { CAPSULE_RULES } from './rules';
import { CAPSULE_FACING, CAPSULE_SPAWN, CAPSULE_W, capsulePerch, DOOR_X, drawCapsule } from './scene';

export { CAPSULE_SPAWN, CAPSULE_W, capsulePerch, DOOR_X, drawCapsule, capsuleFrameEnvironment } from './scene';
export { capsuleArt, capsuleComposition, validateCapsuleComposition } from './composition';

/** The flat, complete: data, rules, drawing, the door. */
const baseCapsule: SceneDef = {
  id: 'capsule',
  name: 'Capsule 7B',
  // facing (light.ts): its window looks east, between two towers: the morning sun gets in
  facing: CAPSULE_FACING,
  width: CAPSULE_W,
  // by the bed; coming in from Downtown you land just inside the door
  spawn: CAPSULE_SPAWN,
  exits: [{ id: 'door', x: capsulePlacement('exit-door').x, to: 'downtown', at: 'capsule', label: '', engine: true, sets: 'pixel' }],
  intro: (touch) => [
    'Capsule 7B. Home: four walls, one window, rent "pending".',
    "Door's locked, the router's dark, and Pixel is asleep on the bed, as is tradition.",
    touch
      ? 'Tap a thing to use it. HACK, top right: hack vision. BOARD: wire things up.'
      : 'Tap a thing to use it. H: hack vision. B: the board, to wire things up.',
  ],
  pixel: 'home',
  // your bed (the opening's sleep is its own: opening.ts OPENING_TARGETS); x as the bed in scene.ts (462–512)
  rests: [{ id: 'bed', x: capsulePlacement('rest-bed').x, kind: 'bed', promptH: 46 }],
  perch: capsulePerch,
  data: capsuleDeviceData(CAPSULE),
  rules: CAPSULE_RULES,
  drawBackdrop: drawCapsule,
  // the door: locked until CONCIERGE says otherwise, then the way to Downtown
  targets: (m) => [{ id: 'door', x: DOOR_X, label: m.label(m.get('doorOpen') ? 'prompt.out' : 'prompt.door'), promptH: 66 }],
  use: (id, m, say) => {
    if (id !== 'door') return;
    if (!m.get('doorOpen')) { say(m.line('door.locked')); return; }
    m.goal('out');
    return 'door';
  },
};

/** Canonical source-derived flat, including Pixel perches and physical device markers. */
export function capsuleScene(document: Composition = capsuleComposition, state: Environment['state'] = {}, options: CapsuleRenderOptions = {}): SceneDef {
  const doc=validateCapsuleComposition(document),geometry=capsuleGeometry(doc),byId=(id:string)=>geometry.find(row=>row.instance.id===id)!,door=byId('door').placement;
  const perches={bed:{...byId('pixel-bed').placement,rest:'sleep' as const},router:{...byId('pixel-router').placement,rest:'sleep' as const},sun:{...byId('pixel-sun').placement,rest:'sun' as const}};
  return {...baseCapsule,width:Number(byId('shell').props.width),facing:Number(byId('blinds').props.facing),spawn:byId('spawn').placement.x,data:capsuleDeviceData(CAPSULE,doc),
    exits:baseCapsule.exits.map(exit=>({...exit,x:byId('exit-door').placement.x})),
    rests:baseCapsule.rests!.map(rest=>({...rest,x:byId('rest-bed').placement.x,promptH:(rest.promptH??0)+byId('rest-bed').placement.h})),
    perch:model=>perches[model.get('pixelAt') as keyof typeof perches]??perches.bed,
    targets:model=>[{id:'door',x:door.x,label:model.label(model.get('doorOpen')?'prompt.out':'prompt.door'),promptH:66+door.h}],
    drawBackdrop:(ctx,view,engine)=>drawCapsule(ctx,view,engine,doc,state,options),
  };
}
export const capsule=capsuleScene();
