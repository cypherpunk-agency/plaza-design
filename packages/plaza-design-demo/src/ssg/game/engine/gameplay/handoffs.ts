import type {GameplayPresentation} from './types';
import type {GameplaySession} from './session';
/** Post-commit delivery on the existing scene clock; it never evaluates gameplay actions. */
export interface HandoffHost {
 schedule(ms:number,run:()=>void,canceled:()=>void,detail:unknown):()=>void;
 cutscene(id:string):void;
 presentation?:(operation:GameplayPresentation)=>void;
}
export function attachGameplayHandoffs(session:GameplaySession,host:HandoffHost){
 if(session.definition.handoffs?.some(h=>h.presentation)&&!host.presentation)throw Error('Presentation handoff host is unavailable');
 const pending=new Set<()=>void>();let disposed=false;
 const unsubscribe=session.observe(event=>{
  const handoff=session.definition.handoffs?.find(h=>h.event===event.id);if(!handoff||disposed)return;
  // No partial fanout when an authored chain exhausts its pending-work budget.
  if(pending.size+(handoff.after?.length??0)>64)return;
  if(handoff.presentation){host.presentation!(handoff.presentation);if(disposed)return;}
  if(handoff.cutscene){host.cutscene(handoff.cutscene);if(disposed)return;}
  for(const action of handoff.after??[]){let cancel:()=>void=()=>{};
   cancel=host.schedule(action.ms,()=>{pending.delete(cancel);if(!disposed)session.dispatch(action.command,'system');},()=>{pending.delete(cancel);},{kind:'gameplay-handoff',event:event.id,command:action.command});if(disposed){cancel();return;}pending.add(cancel);
  }
 });
 const dispose=()=>{if(disposed)return;disposed=true;unsubscribe();for(const cancel of [...pending])cancel();pending.clear();release();};
 let release:()=>void=()=>{};release=session.onDispose(()=>dispose());
 return dispose;
}
