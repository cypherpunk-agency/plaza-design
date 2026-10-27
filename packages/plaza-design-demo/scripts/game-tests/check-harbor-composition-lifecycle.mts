import assert from 'node:assert/strict';
import {runtimeFixture} from './runtime-fixture.mts';
import {Game} from '../../src/ssg/game/runtime/game';
import {newSave} from '../../src/ssg/game/runtime/save';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {NO_RULES} from '../../src/ssg/game/engine/host';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {openingDocuments} from '../../src/ssg/game/story/title/documents';
import {placeFrom} from '../../src/ssg/game/world/zone-graph';

// Real commands, mover transaction, saved membership and Game reconciliation; no alternate executor.
for(const mode of ['complete','skip'] as const){
 const game=runtimeFixture(Game,{save:newSave(),persistSave(){},scenes:{here:'harbor-station'},camera:{cam:-400,viewW:1280,viewH:720,gy:590,camH:0}});
 const def=SCENES['harbor-station'],model=new SceneModel({say(){},open(){},changed(){}},def.data!,NO_RULES,undefined,undefined,undefined,undefined,def.gameplay);
 const session=new GameplaySession(def.gameplay!,game.gameplayStatePort());session.domain=()=>({...model.beginDomainTransaction(),notify(){},refresh(){}});
 Object.defineProperty(game,'gameplayFor',{value:()=>session});
 Object.defineProperty(game,'sequenceDocuments',{value:{opening:openingDocuments,cinematics:{timeline:{sequences:[]}}}});
 Object.defineProperty(game,'worldSequences',{value:{}});
 let disposed=0;const dispose=model.dispose.bind(model);model.dispose=()=>{disposed++;dispose();};const retained={model,show(){},persist(){},dispose(){model.dispose();}};game.scenes.hosts.set('harbor-station',retained);
 const lifecycle:any={scenes:game.scenes,save:game.save,camera:game.camera,p:{x:200,y:0},content:{},hasScene:(id:string)=>!!SCENES[id],sceneDefinition:(id:string)=>SCENES[id],zh:retained,interactionHost:retained,hostOf(){return retained;}};
 Object.defineProperty(lifecycle,'zoneGraph',{get:()=>game.zoneGraph});Object.defineProperty(game,'sceneLifecyclePort',{value:lifecycle});
 game.beginSequenceActions('glide');assert(game.sequenceActions(0));game.reconcileWorldEdits();
 assert(!placeFrom(game.zoneGraph,'harbor-station',Infinity).has('harbor-shed'),'work is unmounted during the opening');
 const coastInteraction={overlayOpen:true,model:new SceneModel({say(){},open(){},changed(){}},def.data!,NO_RULES),show(){},persist(){},dispose(){this.model.dispose();}};game.scenes.hosts.set('glide-spire-bay',coastInteraction);lifecycle.interactionHost=coastInteraction;
 assert(game.sequenceActions(68,mode));game.reconcileWorldEdits();
 assert(placeFrom(game.zoneGraph,'harbor-station',Infinity).has('harbor-shed'),'work mounts even while coast retirement is deferred');
 assert(game.save.worldEdit?.some((edit:any)=>edit.remove.includes('coast')));
 assert(game.save.sequenceActions.finished);assert.equal(game.save.sequenceActions.receipts.filter((id:string)=>id==='release-service').length,1);
 const saved=JSON.parse(JSON.stringify(game.save));assert(game.sequenceActions(68,mode));assert.deepEqual(game.save,saved,'completion receipts cannot replay commands');
 coastInteraction.overlayOpen=false;lifecycle.interactionHost=retained;game.scenes.zoneTiers.clear();game.scenes.mobileOwners.clear();game.reconcileWorldEdits();assert.equal(game.save.worldEdit,undefined);
 assert(!placeFrom(game.zoneGraph,'harbor-station',Infinity).has('glide-beach'));
 assert(placeFrom(game.zoneGraph,'harbor-station',Infinity).has('harbor-shed'));
 assert.equal(disposed,0);assert.equal(game.scenes.hosts.get('harbor-station').model,model,'the actual lifecycle retains the same Harbor model');
 session.dispose();model.dispose();
}
console.log('Harbor lifecycle: real complete/skip commands, early work mount, deferred coast retirement, retained model, saved receipts');
