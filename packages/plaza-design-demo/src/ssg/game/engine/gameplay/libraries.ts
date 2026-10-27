import {validateGameplay} from './validation';
import {sourceGameplay} from './shared-state';
import type {GameplayDefinition} from './types';

/** Link ordinary authored gameplay into its consuming scope. Execution still belongs to
 * GameplaySession/ConversationSession; libraries never introduce a runner or state store. */
export function mergeGameplayLibrary(local:GameplayDefinition,library:GameplayDefinition,label='Shared gameplay'):GameplayDefinition{
 if(library.native||library.checkpoint)throw Error(label+' cannot supply scene-specific native bindings or checkpoint policies');
 const base=sourceGameplay(local),shared=sourceGameplay(library);
 for(const group of ['state','queries','commands','conversations','purchases']as const)for(const id of Object.keys(shared[group]??{}))if(Object.prototype.hasOwnProperty.call(base[group]??{},id))throw Error(label+' identity collision '+id);
 for(const[id,type]of Object.entries(shared.stateReads??{}))if(base.stateReads?.[id]!==undefined&&base.stateReads[id]!==type)throw Error(label+' state read type collision '+id);
 const union=(a:readonly string[]|undefined,b:readonly string[]|undefined)=>[...new Set([...(a??[]),...(b??[])])];
 return validateGameplay({...base,
  flags:union(base.flags,shared.flags),items:union(base.items,shared.items),events:union(base.events,shared.events),
  state:{...shared.state,...base.state},commands:{...shared.commands,...base.commands},conversations:{...shared.conversations,...base.conversations},purchases:{...shared.purchases,...base.purchases},
  ...(base.queries||shared.queries?{queries:{...shared.queries,...base.queries}}:{}),
  ...(base.stateReads||shared.stateReads?{stateReads:{...shared.stateReads,...base.stateReads}}:{}),
  ...(base.sharedState||shared.sharedState?{sharedState:union(base.sharedState,shared.sharedState)}:{}),
  reactions:[...shared.reactions,...base.reactions],...(base.handoffs||shared.handoffs?{handoffs:[...(shared.handoffs??[]),...(base.handoffs??[])]}:{}),
 });
}
