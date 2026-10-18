import {nativeDialogue} from '../../engine/gameplay/native-dialogue';
import source from './scene.json';
import gameplaySource from './gameplay.json';
import {validateGameplay} from '../../engine/gameplay/validation';
import {validateSceneDocument} from '../../engine/gameplay/scene-document';
import type {GameplayDefinition} from '../../engine/gameplay/types';

/** Library's social pilot cannot acquire resource permissions through an authored edit. */
export function validateLibraryGameplay(value:unknown):GameplayDefinition {
  const doc=validateGameplay(value);if(doc.native)throw new Error('Native bindings are not registered for this gameplay document');
  if(JSON.stringify(doc.flags)!==JSON.stringify(['library:renewed'])||doc.items.length||doc.events.length||Object.keys(doc.commands).length||doc.reactions.length||JSON.stringify(Object.keys(doc.conversations))!==JSON.stringify(['catalog'])||doc.state||doc.purchases)throw new Error('Library gameplay catalogs and permissions are protected');
  nativeDialogue(doc,'catalog',{'library:renewed':'renewed'},'say "{line}" > catalog');
  return doc;
}
export const LIBRARY_GAMEPLAY=validateLibraryGameplay(gameplaySource);
const same=(actual:unknown,expected:unknown,label:string)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Library '+label+' IDs/order are protected');};
export function validateLibraryScene(value:unknown,gameplay:GameplayDefinition=LIBRARY_GAMEPLAY){
  const doc=validateSceneDocument(value,validateLibraryGameplay(gameplay));
  if(doc.id!=='library')throw new Error('Library scene identity is protected');
  same(doc.uses.map(row=>row.id),['chair'],'interaction');
  same(doc.readables?.map(row=>row.id),['notice','terminal3','book'],'readable');
  same(doc.people?.map(row=>row.id),['shelfe','librarian','student','kid','sleeper','knitter','paper'],'person');
  same(doc.exits?.map(row=>({id:row.id,to:row.to,at:row.at})),[{id:'downtown',to:'downtown',at:'library'}],'exit');
  if(doc.objectives!==undefined||doc.time!==undefined)throw new Error('Library native goals and city time are retained');
  return doc;
}
export const LIBRARY_SCENE=validateLibraryScene(source);
