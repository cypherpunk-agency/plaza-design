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
import {applyScenePresentation,compileSceneDocument} from '../../engine/gameplay/scene-document';
import type {SceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';
import {LAUNDROMAT_GAMEPLAY,LAUNDROMAT_SCENE,validateLaundromatGameplay,validateLaundromatScene} from './scene-document';
export {LAUNDROMAT_GAMEPLAY,LAUNDROMAT_SCENE,validateLaundromatGameplay,validateLaundromatScene} from './scene-document';
import { LAUNDROMAT_RULES } from './rules';
import { drawLaundromat, L, LAUNDROMAT_W, PEOPLE, laundromatPeople,laundromatRenderActors,laundromatFrameEnvironment } from './scene';

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
  intro: LAUNDROMAT_SCENE.intro,
  pixel: 'along',
  data: LAUNDROMAT,
  rules: LAUNDROMAT_RULES,
  drawBackdrop: drawLaundromat,
  people: PEOPLE,
  readables: [
    {id:'notice',x:L.notice,name:'REGISTRY NOTICE',promptH:104,pages:[]},
    {id:'socks',x:L.socks,name:'LOST SOCKS',promptH:116,pages:[]},
  ],
  uses: [{id:'soap',x:L.soap,label:'[E] SOAP',name:'SOAP DISPENSER',promptH:92,h:76,use:()=>{throw new Error('Laundromat soap requires its authored gameplay route');}}],
};

export { drawLaundromat,laundromatFrameEnvironment } from './scene';
export { laundromatComposition,laundromatArt,validateLaundromatComposition } from './composition';
export function laundromatScene(document:Composition=laundromatComposition,state:Environment['state']={},options:LaundromatRenderOptions={},sceneDocument:SceneDocument=LAUNDROMAT_SCENE,gameplay:GameplayDefinition=LAUNDROMAT_GAMEPLAY):SceneDef{
  const doc=validateLaundromatComposition(document),L=laundromatLayout(doc),rows=laundromatGeometry(doc),get=(id:string)=>rows.find(r=>r.instance.id===id)!;
  const logic=validateLaundromatScene(sceneDocument,validateLaundromatGameplay(gameplay));
  const compiled=compileSceneDocument(logic,{soap:L.soap},()=>{throw new Error('Unexpected laundromat conversation');});
  const scene:SceneDef={...baseLaundromat,gameplay,width:Number(get('room').props.width),facing:Number(get('window').props.facing),spawn:L.spawn,data:laundromatDeviceData(LAUNDROMAT,doc),people:laundromatPeople(doc),exits:baseLaundromat.exits.map(e=>({...e,x:get('exit-market').placement.x})),readables:baseLaundromat.readables!.map(r=>({...r,x:r.id==='notice'?L.notice:L.socks,promptH:(r.promptH??0)+get(r.id).placement.h-(r.id==='notice'?96:0)})),uses:compiled.uses.map(u=>({...u,h:76+get('soap').placement.h,promptH:92+get('soap').placement.h})),drawBackdrop:(ctx,v,e)=>drawLaundromat(ctx,v,e,doc,state,options)};
  const authored=applyScenePresentation(scene,logic),renderActors=laundromatRenderActors(authored.people!);
  return {...authored,drawBackdrop:(ctx,v,e)=>drawLaundromat(ctx,v,e,doc,state,options,renderActors),visualEnvironment:(v,e)=>laundromatFrameEnvironment(v,e,doc,renderActors)};
}
export const laundromat=laundromatScene();
