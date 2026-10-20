/** Isolated shared-gameplay laboratory. No Game construction, browser storage or global clock changes. */
import { GameplaySession, cloneState } from '../../src/ssg/game/engine/gameplay/session';
import { ConversationSession } from '../../src/ssg/game/engine/gameplay/conversation';
import { DELIVERY_TERMINAL,deliveryTerminalRules } from './shift-delivery-fixture.mts';
import { SceneModel,type Line } from '../../src/ssg/game/engine/model';
import shiftGameplayJson from '../../src/ssg/game/scenes/harbor-shift/gameplay.json';
import { validateGameplay as validateShiftGameplayJson } from '../../src/ssg/game/engine/gameplay/validation';
const SHIFT_GAMEPLAY=validateShiftGameplayJson(shiftGameplayJson);
import type { GameplayState } from '../../src/ssg/game/engine/gameplay/types';
export function createHarborGameplayFixture(initial:GameplayState={flags:{},items:{},tokens:0},definition:unknown=SHIFT_GAMEPLAY){
  const baseline=cloneState(initial);
  let state=cloneState(baseline),time=0,serial=0,disposed=false;
  let pending:{at:number;serial:number;run:()=>void}[]=[];
  const lines:Line[]=[];
  const gameplay=new GameplaySession(definition,{read:()=>state,write:next=>{state=next;}});
  const model=new SceneModel({say:line=>{lines.push(line);if(lines.length>64)lines.shift();},open:()=>{},changed:()=>{}},DELIVERY_TERMINAL,deliveryTerminalRules(gameplay));
  model.now=()=>time;model.wall=()=>time;
  model.later=(ms,run,_detail,canceled)=>{if(disposed)return()=>{};if(pending.length>=256)throw new Error('Pilot callback limit');const task={at:time+ms,serial:serial++,run};pending.push(task);return()=>{const i=pending.indexOf(task);if(i>=0){pending.splice(i,1);canceled?.();}};};
  model.reset();
  function live(){if(disposed)throw new Error('Pilot disposed');}
  return{gameplay,model,lines,get time(){return time;},get pending(){return pending.length;},
    talk(id:'supervisor'|'mara'){live();return new ConversationSession(gameplay,id);},
    advance(ms:number){
      live();if(!Number.isFinite(ms)||ms<0||ms>10000)throw new Error('Advance must be 0..10000 ms');
      const end=time+ms;let work=0;
      try{for(;;){pending.sort((a,b)=>a.at-b.at||a.serial-b.serial);const task=pending[0];if(!task||task.at>end)break;if(++work>256)throw new Error('Pilot callback work limit');pending.shift();time=task.at;task.run();}time=end;}
      catch(error){pending=[];throw error;}
    },
    reset(){live();pending=[];time=0;serial=0;state=cloneState(baseline);lines.length=0;gameplay.clearHistory();model.reset();},
    dispose(){if(disposed)return;pending=[];model.reset();gameplay.dispose();disposed=true;},
  };
}
export type GameplayPilot=ReturnType<typeof createHarborGameplayFixture>;
