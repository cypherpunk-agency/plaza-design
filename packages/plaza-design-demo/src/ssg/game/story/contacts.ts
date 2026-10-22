/**
 * Contacts on your deck: people who reach you through the terminal (data/contacts.json; editor: World › Opening › Contacts).
 * After Act I, Moth is the first (STORY.md, Decided 4: "messages and calls through the terminal; can go dark again for drama").
 *
 * A contact appears once its save flag is set (`when`); each message appears once its own flag is set, and is read with
 * `msg <contact>` in the deck (ui/terminal/commands.ts). The game prints the unread ones as they arrive (game.ts `inbox`, worded by
 * `INBOX`) and marks them read with the flag `read:<message id>`.
 *
 * HOW ACT II EXTENDS IT
 * - A new message: one entry in a contact's `messages`, with the flag that releases it (a fragment found, a place visited).
 *   Scenes set those flags as they already do.
 * - A new contact (Captain Brine, Lux): one entry in `CONTACTS` with its own `when`.
 * - Moth going dark: a `dark` flag on the contact; while it is set the deck shows "no signal" and holds new messages back.
 *
 * Pure: a document, its validation and the queries over a flag set. The model keeps no state; what has been read is the flags.
 */
import baseline from '../data/contacts.json';
import {fail,fields,text,id,list,pages,num} from './story-shapes';

export interface ContactMessage {id:string;/** The save flag that releases it. */when:string;/** Lines, printed one after another. */text:string[]}
export interface Contact {
  id:string;name:string;/** The save flag that puts the contact on your deck. */when:string;
  /** While this flag is set, the contact has no signal (and holds new messages back). */dark?:string;
  /** What the deck says about where they are. */status:string;messages:ContactMessage[];
}
/** What the game says when mail arrives: the deck lines' wording, and the player's thought about the contact. */
export interface ContactsInbox {
  announce:{contact:string;speaker:string;height:number;pages:string[];touchPages:string[]};
  terminal:{prefix:string;separator:string;countSuffix:string;commandPrefix:string};
}
export interface ContactsSource {version:1;INBOX:ContactsInbox;CONTACTS:Contact[]}
type Flags=Readonly<Record<string,boolean>>;

export function validateContacts(value:unknown):ContactsSource{
 const d=fields(value,'root',['version','INBOX','CONTACTS']);if(d.version!==1)fail('version','version 1 required');
 const inbox=fields(d.INBOX,'INBOX',['announce','terminal']),announce=fields(inbox.announce,'INBOX/announce',['contact','speaker','height','pages','touchPages']);
 id(announce.contact,'INBOX/announce/contact');text(announce.speaker,'INBOX/announce/speaker');num(announce.height,'INBOX/announce/height',0,10000);pages(announce.pages,'INBOX/announce/pages');pages(announce.touchPages,'INBOX/announce/touchPages');
 for(const[k,v]of Object.entries(fields(inbox.terminal,'INBOX/terminal',['prefix','separator','countSuffix','commandPrefix'])))text(v,'INBOX/terminal/'+k,true);
 const contacts=list(d.CONTACTS,'CONTACTS',16),ids=new Set<string>(),messageIds=new Set<string>();
 for(const[i,row]of contacts.entries()){
  const a='CONTACTS/'+i,c=fields(row,a,['id','name','when','dark','status','messages'],['id','name','when','status','messages']);
  id(c.id,a+'/id');if(ids.has(c.id))fail(a,'duplicate contact');ids.add(c.id);text(c.name,a+'/name');id(c.when,a+'/when');if(c.dark!==undefined)id(c.dark,a+'/dark');text(c.status,a+'/status');
  for(const[j,m]of list(c.messages,a+'/messages',64).entries()){const b=a+'/messages/'+j,q=fields(m,b,['id','when','text']);id(q.id,b+'/id');if(messageIds.has(q.id))fail(b,'duplicate message');messageIds.add(q.id);id(q.when,b+'/when');pages(q.text,b+'/text');}
 }
 if(!ids.has(announce.contact))fail('INBOX/announce/contact','unknown contact');
 return structuredClone(d) as ContactsSource;
}
export function createContactsModel(value:unknown){
 const source=validateContacts(value),CONTACTS=source.CONTACTS;
 /** The contacts on your deck now. */
 const contactsOf=(f:Flags)=>CONTACTS.filter(c=>f[c.when]);
 /** A contact's messages released so far (none while dark). */
 const messagesOf=(c:Contact,f:Flags)=>(c.dark&&f[c.dark]?[]:c.messages.filter(m=>f[m.when]));
 /** Messages released and not yet read, across contacts. */
 const unread=(f:Flags)=>contactsOf(f).flatMap(c=>messagesOf(c,f).filter(m=>!f['read:'+m.id]).map(m=>({contact:c,message:m})));
 return{source,CONTACTS,INBOX:source.INBOX,contactsOf,messagesOf,unread,readFlag:(m:ContactMessage)=>'read:'+m.id};
}
export type ContactsModel=ReturnType<typeof createContactsModel>;
export const contactsModel=createContactsModel(baseline);
export const {CONTACTS,INBOX,contactsOf,messagesOf,unread,readFlag}=contactsModel;
