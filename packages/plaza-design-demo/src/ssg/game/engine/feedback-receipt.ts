import type {MessageTone} from '../ui/communication';
/** One causal feedback delivery. History, status and sound forward this identity unchanged. */
export interface FeedbackReceipt {readonly id:string;readonly cueId:string;readonly scope:string;readonly tone:MessageTone;readonly source:string}
let next=0;
export function mintFeedbackCause(){return 'cue:'+ ++next;}
const delivered=new WeakMap<object,Set<string>>();
export function mintFeedback(scope:string,source:string,tone:MessageTone,cueId=mintFeedbackCause()):FeedbackReceipt{return Object.freeze({id:'feedback:'+ ++next,cueId,scope,source,tone});}
export function acceptFeedback(owner:object,receipt:FeedbackReceipt){let ids=delivered.get(owner);if(!ids){ids=new Set();delivered.set(owner,ids);}if(ids.has(receipt.id))return false;ids.add(receipt.id);if(ids.size>512)ids.delete(ids.values().next().value!);return true;}
