import assert from 'node:assert/strict';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {Game} from '../../src/ssg/game/runtime/game';
import {newSave} from '../../src/ssg/game/runtime/save';
import {SCENES} from '../../src/ssg/game/scenes';
import {runtimeFixture} from './runtime-fixture.mts';
import {placeFrom} from '../../src/ssg/game/world/zone-graph';
const definition={version:1,flags:['changed'],items:[],events:[],commands:{remove:{sources:['system'],actions:[{flag:'changed',value:true},{world:{composition:'boundary-example',remove:['street','display'],add:[]}}]},invalid:{sources:['system'],actions:[{tokens:10},{world:{composition:'absent',remove:[],add:[]}}]}},reactions:[],conversations:{}};
function make(save=newSave()){
 let persisted=0;const game=runtimeFixture(Game,{save,persistSave(){persisted++;},scenes:{here:'boundary-west'}});
 const lifecycle:any={scenes:game.scenes,save,camera:game.camera,p:{x:0,y:0},content:{},hasScene:(id:string)=>!!SCENES[id],sceneDefinition:(id:string)=>SCENES[id],zh:{},interactionHost:{},hostOf(){throw Error('No host needed by this composition operation');}};
 Object.defineProperty(lifecycle,'zoneGraph',{get:()=>game.zoneGraph});Object.defineProperty(game,'sceneLifecyclePort',{value:lifecycle});
 return{game,persisted:()=>persisted};
}
const first=make(),game=first.game,session=new GameplaySession(definition,game.gameplayStatePort());
assert(session.eligibility('remove','system').ok);assert.equal(game.save.worldEdit,undefined,'eligibility never requests an edit');
assert.equal(session.dispatch('invalid','system').ok,false);assert.equal(game.save.tokens,newSave().tokens,'invalid graph leaves scalar actions untouched');
assert(session.dispatch('remove','system').ok);assert(game.save.flags.changed);assert.equal(game.save.worldEdit.length,1);assert.equal(game.save.worldMembership,undefined,'desired edit is pending while the player occupies the group');
const before=game.zoneGraph;game.reconcileWorldEdits();assert.equal(game.zoneGraph,before);assert.equal(first.persisted(),0);assert(game.save.worldEdit);
const resumed=make(JSON.parse(JSON.stringify(game.save)));assert(placeFrom(resumed.game.zoneGraph,'boundary-west',Infinity).has('boundary-east'),'reload retains applied geometry while an edit is deferred');
resumed.game.reconcileWorldEdits();assert(resumed.game.save.worldEdit,'loading does not delete the occupied chunk or replay the command');
resumed.game.scenes.here='capsule';resumed.game.reconcileWorldEdits();assert.equal(resumed.game.save.worldEdit,undefined);assert.deepEqual(resumed.game.save.worldMembership['boundary-example'],[]);assert(!placeFrom(resumed.game.zoneGraph,'boundary-west',Infinity).has('boundary-east'));
assert.equal(resumed.persisted(),1);resumed.game.reconcileWorldEdits();assert.equal(resumed.persisted(),1,'a committed edit is not executed again');
session.dispose();console.log('World edit commands: prospective transaction, pure eligibility, internal deferral, safe reload and one coherent lifecycle commit PASS');
