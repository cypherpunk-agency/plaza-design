import gameplaySource from './gameplay.json';
import sceneSource from './scene.json';
import {validateGameplay} from '../../engine/gameplay/validation';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';

const same=(actual:unknown,expected:unknown,label:string)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Laundromat '+label+' are protected');};
/** Keep existing inventory and command entry points stable for player saves and authored routes. */
export function validateLaundromatGameplay(value:unknown){
  const doc=validateGameplay(value);if(doc.native)throw new Error('Native bindings are not registered for this gameplay document');
  same(doc.flags,[],'flags');same(doc.items,['soap'],'items');same(doc.events,[],'events');
  same(Object.keys(doc.commands),['laundromat.buy-soap'],'command IDs');
  same(doc.commands['laundromat.buy-soap'].sources,['interaction'],'command permissions');
  same(Object.keys(doc.conversations),[],'conversation IDs');
  same(Object.keys(doc.purchases??{}),['laundromat.soap'],'purchase IDs (legacy edits require migration)');const actions=doc.commands['laundromat.buy-soap'].actions;if(actions.length!==1||!('purchase'in actions[0])||actions[0].purchase!=='laundromat.soap')throw new Error('Soap charge and goods belong to its purchase definition');
  return doc;
}
export const LAUNDROMAT_GAMEPLAY=validateLaundromatGameplay(gameplaySource);
/** Narrative content stays editable while existing physical interaction identities remain stable. */
export function validateLaundromatScene(value:unknown,gameplay:GameplayDefinition=LAUNDROMAT_GAMEPLAY){
  const doc=validateSceneDocument(value,gameplay);
  same(doc.id,'laundromat','scene ID');
  same(doc.uses.map(u=>u.id),['soap'],'interaction IDs/order');if(doc.uses[0].purchase!=='laundromat.soap')throw new Error('Laundromat purchase binding protected; legacy scene edits require migration');
  same(doc.readables?.map(r=>r.id),['notice','socks'],'readable IDs/order');
  same(doc.people?.map(p=>p.id),['blue','folder','gran','sleeper'],'person IDs/order');
  same(doc.exits?.map(({id,to,at})=>({id,to,at})),[{id:'market',to:'market',at:'laundromat'}],'exit destinations/order');
  if(doc.objectives!==undefined||doc.time!==undefined)throw new Error('Laundromat retains native device goals and running city time');
  return doc;
}
export const LAUNDROMAT_SCENE=validateLaundromatScene(sceneSource);
