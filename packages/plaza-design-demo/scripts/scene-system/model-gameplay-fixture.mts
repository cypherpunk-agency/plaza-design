import {nativeGameplayPort} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {mergeValues} from '../../src/ssg/game/engine/gameplay/state';
import type {GameplayDefinition,StatePort} from '../../src/ssg/game/engine/gameplay/types';
import type {SceneModel} from '../../src/ssg/game/engine/model';

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
