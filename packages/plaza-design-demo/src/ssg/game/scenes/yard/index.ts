/**
 * The back yard: the first scene on the hacking system (devices → nouns →
 * verbs, cables between nouns). What is in it is data/yard.json; what is
 * left here is its own code: the crane and the parcel (effects.ts), CAM-1
 * (camera.ts) and the drawing (scene.ts). The engine in engine/ runs the rest.
 */

import { YARD } from "../../data/index";
import type { SceneDef } from "../kit";
import { cameraPanel } from './camera';
import { YARD_RULES } from './effects';
import { TRAY_X, YARD_SPAWN, YARD_W } from './scene';
import {createYardPresentationState,drawYardComposition,prepareYardFrame,validateYardComposition,yardComposition,yardDeviceData,yardPlacement,yardWidth,yardVisualSnapshot,yardEnvironment,type YardRenderOptions} from './composition';
import type {YardVisual} from '../../art/assemblies/fixer-yard';
import type {Composition,Environment} from '../../art';
export {drawYard,yardFrameEnvironment} from './scene';
export {yardArt,yardComposition,validateYardComposition,createYardPresentationState,prepareYardFrame} from './composition';

export { YARD_SPAWN, YARD_W } from './scene';

/** What the fixer's parcel holds: Moth's key chip (flat 4C, MOTH-PC's drawer) and uplink.so (your deck past your building). */
export const PARCEL = ['moth.key', 'uplink'];

/** The yard, complete: data, rules, drawing, the way out. */
const base: SceneDef = {
  id: 'yard',
  name: 'the back yard',
  // facing (light.ts): through the alley, east of the street: the strip of sky over the roofs sees the dawn
  facing: 90,
  width: YARD_W,
  spawn: YARD_SPAWN,
  // the way out is the open passage at the left edge: walk into it, no E
  exits: [{ id: 'downtown', x: YARD_SPAWN, to: 'downtown', at: 'yard', label: '< DOWNTOWN', edge: 'left' }],
  intro: (touch) => [
    "The fixer's back yard. My parcel is in here somewhere.",
    'Tap a thing to use it.',
    touch
      ? 'HACK, top right: hack vision, every device and its guts at once. BOARD: wire them up, add timers and switches.'
      : 'H: hack vision, every device and its guts at once. B: the board, to wire them up and add timers and switches.',
  ],
  // boxed in by the backs of houses: no city behind the yard, the street's floor and the rain
  ambient: { sky: true, street: true, weather: true },
  keepFace: true,
  pixel: 'along',
  data: YARD,
  rules: YARD_RULES,
  panels: { camera: cameraPanel },
  layers: true,
  /** The yard is walled in, so it draws its own backdrop (after the ground) instead of the open city. */
  drawBackdrop: () => {},
  targets: (m) => (m.get('parcelAt') === 'tray' ? [{ id: 'tray', x: TRAY_X, label: m.label('prompt.take'), promptH: 26 }] : []),
  use: (id, m, say) => {
    if (id === 'tray' && m.get('parcelAt') === 'tray') {
      m.set('parcelAt', 'taken'); m.goal('take');
      say(m.line('parcel.take'));
      // what was in it (LEVELS L2): Moth's key chip and uplink.so, onto the keyring
      for (const k of PARCEL) { const l = m.give(k); if (l) say(l); }
    }
  },
};

/** The frame controller owns pose history; painting and bounds consume its immutable snapshot. */
export function yardScene(document:Composition=yardComposition,state:Environment['state']={},options:YardRenderOptions={}):SceneDef{
 const doc=validateYardComposition(document),controller=createYardPresentationState(doc),spawn=yardPlacement('spawn',doc).x,tray=yardPlacement('tray',doc).x;
 let prepared:YardVisual|undefined;
 return{...base,width:yardWidth(doc),spawn,data:yardDeviceData(YARD,doc),exits:base.exits.map(exit=>({...exit,x:yardPlacement('exit-downtown',doc).x})),
  presentationState:{capture:()=>({...controller}),restore(value){
   if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['hookX','hookVisible'].includes(k))||typeof value.hookX!=='number'||!Number.isFinite(value.hookX)||typeof value.hookVisible!=='boolean')throw new Error('Invalid Yard presentation state');
   controller.hookX=value.hookX;controller.hookVisible=value.hookVisible;prepared=undefined;
  }},
  preparePresentation:(_view,engine)=>{prepared=prepareYardFrame(controller,engine,doc);},
  visualEnvironment:(view,engine)=>yardEnvironment(view,{...(prepared??yardVisualSnapshot(controller,engine,doc)),layer:engine.layer}),
  drawBackdrop:(x,v,e)=>drawYardComposition(x,v,{...(prepared??yardVisualSnapshot(controller,e,doc)),layer:e.layer},doc,state,options),
  targets:m=>m.get('parcelAt')==='tray'?[{id:'tray',x:tray,label:m.label('prompt.take'),promptH:26}]:[],
 };
}
export const yard=yardScene();
