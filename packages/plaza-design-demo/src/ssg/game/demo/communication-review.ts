import type {MessageTone} from '../ui/communication';
/** Review fixtures exercise the shipping presenters. They never grant resources or alter campaign state. */
export const communicationReviews=[
 ['reward','Reward message'],['refusal','Refusal message'],['remote','Remote device reply'],
 ['deferred','Dialogue with waiting hint'],['repeat','Repeated signal'],['motion','Toggle reduced motion & expiry'],
] as const;
export type CommunicationReview=typeof communicationReviews[number][0];
export interface CommunicationReviewPort {
 status(text:string,tone:MessageTone):void;remote():void;dialogue():void;repeat():void;motion():boolean;
}
export function runCommunicationReview(id:CommunicationReview,port:CommunicationReviewPort){
 if(id==='reward')port.status('REWARD EXAMPLE · +1 token','success');
 else if(id==='refusal')port.status('ACCESS DENIED · permission required.','error');
 else if(id==='remote')port.remote();
 else if(id==='deferred')port.dialogue();
 else if(id==='repeat')port.repeat();
 else if(id==='motion')port.status(port.motion()?'REDUCED MOTION · this message still expires.':'NORMAL MOTION · this message still expires.','info');
}
