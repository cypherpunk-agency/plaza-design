import type {GameplayDefinition} from './types';
export const actorConversationId=(scene:string,person:string)=>'talk.'+scene+'.'+person;
/** New speaking actors receive an ordinary graph. Existing identities retain edited content
 * and progress; callers persist this definition alongside the actor in one source transaction. */
export function ensureActorConversation(definition:GameplayDefinition|undefined,scene:string,person:string,speaker='RESIDENT'):string{
 if(!definition)throw Error('Speaking actors require a gameplay document in the same transaction');
 const id=actorConversationId(scene,person);if(definition.conversations[id])return id;
 const cursor=id+'.cursor',advance=id+'.advance-0';if(definition.state?.[cursor]||definition.commands[advance])throw Error('Conversation identity already has declarations: '+id);
 (definition.state??={})[cursor]={owner:id,lifetime:'save',type:'number',default:0,min:0,max:0};
 definition.commands[advance]={sources:['conversation'],actions:[{state:cursor,set:0}]};
 definition.conversations[id]={entry:[{node:'visit-0'}],nodes:{'visit-0':{speaker,pages:['Hello.'],onEnter:advance}}};return id;
}
