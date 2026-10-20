import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {sourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {build} from 'esbuild';
import {SCENES} from '../../src/ssg/game/scenes';
import {Game} from '../../src/ssg/game/runtime/game';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {attachNativeGameplay} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {fixtureGameplayPort} from './model-gameplay-fixture.mts';
import {nativeLiveConditionsTick,validateNativeLiveConditionsShape} from '../../src/ssg/game/engine/gameplay/native-live-conditions';
import {gameSourceIdentity} from '../scene-system/source-identity.mts';
const source=SCENES.downtown;
function make(bits:number,definition=source.gameplay!){
 const save={handle:bits&1?'Ada':'',flags:{till:!!(bits&2),end:!!(bits&32)},controlled:[...(bits&4?['0x2F']:[]),...(bits&16?['0x31']:[])],jump:!!(bits&8)};
 const model=new SceneModel({say(){},open(){},changed(){}},source.data!,typeof source.rules==='function'?source.rules({save:()=>save,persist(){},nodes:()=>42,granted(){},end(){}} as any):source.rules!);model.setPaused(true);
 let state:any={flags:{...save.flags},items:{},tokens:0,player:{handle:save.handle,jump:save.jump,controlled:save.controlled,keyring:[]}};
 const session=new GameplaySession(definition,fixtureGameplayPort(definition,{read:()=>state,write:v=>{state=v;}},()=>model));attachNativeGameplay(model,session);
 let saved=0,hud=0;const game:any=Object.create(Game.prototype);game.content={downtown:{...source,gameplay:definition}};game.sceneDefinition=(id:string)=>id==='downtown'?game.content.downtown:{gameplay:undefined};game.hostOf=()=>({model});game.gameplayFor=()=>session;game.persistSave=()=>saved++;game.syncHud=()=>hud++;
 return{save,model,session,game,counts:()=>({saved,hud}),close:()=>{session.dispose();model.reset();model.setPaused(true);}};
}
for(let bits=0;bits<64;bits++){
 const f=make(bits);try{
  const expected=(['handle','till','box','install','relay','gate'] as const).filter((id,index)=>(bits&(1<<index))!==0);
  nativeLiveConditionsTick(f.model,f.session,run=>run(),'beforeNative');nativeLiveConditionsTick(f.model,f.session,run=>run(),'afterNative');assert.equal(f.model.goals.size,0,'save conditions never run on live ticks');
  f.game.persist();assert.deepEqual([...f.model.goals],expected,'current immediate goal contract bits='+bits);assert.deepEqual(f.counts(),{saved:1,hud:1});const events=f.session.events().length;
  f.game.persist();assert.deepEqual([...f.model.goals],expected);assert.equal(f.session.events().length,events,'repeat persistence is idempotent');
 }finally{f.close();}
}
const pending=structuredClone(source.gameplay!);pending.native!.triggers!['downtown.progress.handle'].when={tokensAtLeast:3};const f=make(1,pending);try{f.game.persist();assert(!f.model.goals.has('handle'),'pending condition replaces original handle predicate');}finally{f.close();}
const removed=structuredClone(source.gameplay!);delete removed.native!.triggers!['downtown.progress.handle'];const r=make(1,removed);try{r.game.persist();assert(!r.model.goals.has('handle'),'removed source trigger has no hidden fallback');}finally{r.close();}
// Exercise protected source Save and a fresh shipping module, not just an in-memory graph.
const disk=fs.mkdtempSync(path.resolve('../../.game-test-output/persist-source-save-')),root=path.resolve('src/ssg/game');
for(const doc of sourceDocuments){const target=path.join(disk,doc.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,doc.file),target);}
const store=new AuthoringStore({root:disk,documents:sourceDocuments}),descriptor=sourceDocuments.find(d=>d.id==='downtown-gameplay')!,prior=fs.readFileSync(path.join(disk,descriptor.file),'utf8'),read=store.read(descriptor.id),changed=structuredClone(read.value) as any;
changed.native.triggers['downtown.progress.handle'].when={tokensAtLeast:3};
const saved=store.save([{id:descriptor.id,revision:read.revision,value:changed}]);
const output=path.join(disk,'saved.mjs');await build({stdin:{contents:`export {downtown as scene} from ${JSON.stringify(path.join(root,'scenes/downtown/index.ts'))}`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:output,logLevel:'silent',plugins:[{name:'saved-progress-source',setup(b){b.onLoad({filter:/[\\/]scenes[\\/]downtown[\\/]gameplay\.json$/},()=>({contents:fs.readFileSync(path.join(disk,descriptor.file),'utf8'),loader:'json'}));}}]});
const fresh=await import(pathToFileURL(output).href),restored=make(1,fresh.scene.gameplay);try{restored.game.persist();assert(!restored.model.goals.has('handle'),'fresh saved shipping graph changes real persistence');}finally{restored.close();}
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.equal(fs.readFileSync(path.join(disk,descriptor.file),'utf8'),prior,'exact-byte protected Undo');
const dir=fs.mkdtempSync(path.resolve('../../.game-test-output/persist-source-'));fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify({status:'PASS',source:gameSourceIdentity(path.resolve('src/ssg/game')),cases:64,checks:['actual Game.persist immediate timing','six-goal expected predicates/order','no tick dispatch','repeat idempotence','pending condition replacement','source removal without fallback','protected Save/fresh shipping graph/byte Undo'],sourceSave:disk,limits:['Source persistence workflows; campaign playthrough excluded']},null,2));
console.log('Source persistence triggers PASS: 64 current progress combinations, actual Game.persist, no tick delivery, repeat idempotence, pending condition and removal. '+dir);
