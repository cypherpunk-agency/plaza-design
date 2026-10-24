import {ConversationSession} from './conversation';

import type {GameplaySession} from './session';
import type {SceneModel} from '../model';



export function attachResponseConversations(model:SceneModel,session:GameplaySession){
 const response:NonNullable<SceneModel['gameplayResponse']>=(ref,commit)=>{
  const binding=session.definition.native?.responseConversations?.[ref];if(!binding)return;
  const conversation=new ConversationSession(session,binding.conversation,{},commit?'enter':'preview');
  try{return{[binding.variable]:conversation.frame().pages[0]};}finally{conversation.close();}
 };
 model.gameplayResponse=response;
 session.onDispose(()=>{if(model.gameplayResponse===response)model.gameplayResponse=undefined;});
}
