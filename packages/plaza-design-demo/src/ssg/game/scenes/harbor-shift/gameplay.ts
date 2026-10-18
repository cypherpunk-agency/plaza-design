import source from './gameplay.json';
import { validateShiftGameplay } from './gameplay-contract';
import { ConversationSession } from '../../engine/gameplay/conversation';
import type { UseCtx } from '../kit';
export const SHIFT_GAMEPLAY = validateShiftGameplay(source);
/** Compatibility adapter: the existing one-press supervisor interaction selects its authored continuation. */
export function shiftConversation(c:UseCtx,id:string,objective:string):string[]{
  const session=c.gameplay;
  if(!session)throw new Error('Harbor shift requires its gameplay session');
  const conversation=new ConversationSession(session,id);
  try{
    const first=conversation.frame();
    if(first.choices?.some(choice=>choice.id==='accept')){
      const result=conversation.choose('accept');
      if(!result.ok)return['The assignment could not be registered. Please try again.'];
    }else if(id==='supervisor'&&!c.has('shift.tag')&&!c.flags['shift:checked']){
      session.dispatch('shift.replace-tag','interaction');
    }
    return conversation.frame().pages.map(page=>page.replace('{objective}',objective));
  }finally{conversation.close();}
}
export function shiftCommand(c:UseCtx,id:string):boolean{
  if(!c.gameplay)throw new Error('Harbor shift requires its gameplay session');
  return c.gameplay.dispatch(id,'interaction').ok;
}
