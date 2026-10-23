import {nativeGameplayPort} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {mergeValues} from '../../src/ssg/game/engine/gameplay/state';
import type {GameplayDefinition,StatePort} from '../../src/ssg/game/engine/gameplay/types';
import type {SceneModel} from '../../src/ssg/game/engine/model';
import type {SceneDef} from '../../src/ssg/game/scenes/kit';
import type {PlayerState} from '../../src/ssg/game/runtime/player';

/** Resolve composed scene rules through the same PlayerServices boundary as Game.hostOf. */
export function fixtureSceneRules(scene:Pick<SceneDef,'rules'>,state:PlayerState={handle:'',tokens:0,jump:false,controlled:[],flags:{}}){
 return typeof scene.rules==='function'?scene.rules({save:()=>state,persist(){},nodes:()=>42,granted(){},end(){}}):scene.rules;
}

/** Standalone-model test setup: adopt its state block into the fixture's common root once.
 * Production supplies that same block at model construction. No alias mapping or value projection
 * occurs on reads/commits. The explicit initial write is fixture initialization, not a command.
 */
export function fixtureGameplayPort(definition:GameplayDefinition,port:StatePort,model:()=>SceneModel):StatePort {
 const m=model(),initial=port.read();initial.values??={};Object.assign(m.state,initial.values[m.data.id]??{});initial.values[m.data.id]=m.state;port.write(initial);
 return nativeGameplayPort(definition,{
  read:()=>port.read(),
  write:(next,events)=>{next.values=mergeValues(port.read().values??={},next.values??{});port.write(next,events);},
 },model);
}
