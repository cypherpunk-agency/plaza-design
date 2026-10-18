import { createGameplayPilot } from './gameplay-pilot-session';
import type { ConversationSession } from '../engine/gameplay/conversation';
import type { GameplayResult } from '../engine/gameplay/types';
import { shiftGoal } from '../scenes/harbor-shift';
import { mountGameplayAuthoring,type GameplayAuthoring } from './gameplay-authoring';
/** Pending gameplay authoring and its isolated native laboratory share the same document. */
export function mountGameplayWorkbench(host:HTMLElement,options?:GameplayAuthoring){
  let pilot=createGameplayPilot(undefined,options?.document()),conversation:ConversationSession|undefined,disposed=false;
  const root=document.createElement('section');root.className='gameplay-workbench';
  const title=document.createElement('h2');title.textContent='Connected gameplay · delivery pilot';
  const description=document.createElement('p');description.textContent='Edit dialogue, conditions, actions and event reactions, then test the pending definition. The laboratory has its own state and clock. Player saves remain untouched.';
  const tools=document.createElement('div'),dialogue=document.createElement('section'),operations=document.createElement('section'),circuits=document.createElement('section'),status=document.createElement('p'),state=document.createElement('pre'),events=document.createElement('pre');
  state.setAttribute('aria-label','Pilot state');events.setAttribute('aria-label','Committed gameplay events');status.setAttribute('role','status');
  const layout=document.createElement('div');layout.className='gameplay-layout';
  const editorHost=document.createElement('section'),labHost=document.createElement('section');labHost.className='gameplay-lab';
  layout.append(editorHost,labHost);root.append(title,description,layout);const debug=document.createElement('details'),debugTitle=document.createElement('summary');debugTitle.textContent='Debug · laboratory state and committed events (JSON)';debug.className='debug-drawer';debug.append(debugTitle,state,events);
  labHost.append(tools,dialogue,operations,circuits,status,debug);host.replaceChildren(root);
  const editor=options?mountGameplayAuthoring(editorHost,options):undefined;
  editorHost.hidden=!options;
  function button(parent:HTMLElement,label:string,run:()=>void){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{if(disposed)return;try{run();}catch(error){status.textContent=error instanceof Error?error.message:String(error);}render();};parent.append(b);return b;}
  function report(result:GameplayResult){status.textContent=result.ok?'Operation committed.':`Operation refused: ${result.reason}. No state changed.`;}
  function heading(parent:HTMLElement,text:string){const h=document.createElement('h3');h.textContent=text;parent.append(h);}
  button(tools,'Reset pilot',()=>{conversation?.close();conversation=undefined;pilot.reset();status.textContent='Pilot reset.';});
  // The mounted instance owns all handlers and its model; closing the workbench disposes it.
  button(tools,'Talk to supervisor',()=>{conversation?.close();conversation=pilot.talk('supervisor');status.textContent='Conversation opened. No reward is granted until its choice is selected.';});
  button(tools,'Talk to Mara',()=>{conversation?.close();conversation=pilot.talk('mara');});
  heading(operations,'Ordinary interactions');
  button(operations,'Pick up blue parcel',()=>report(pilot.gameplay.dispatch('shift.collect','interaction')));
  button(operations,'Give parcel to Mara',()=>report(pilot.gameplay.dispatch('shift.deliver','interaction')));
  heading(circuits,'Native hacking circuit');
  const explanation=document.createElement('p');explanation.textContent='scanner.parcel:detected → terminal.delivery --deliver. Delivery still requires an assignment and a carried parcel. Native cable delivery takes 150 ms.';circuits.append(explanation);
  button(circuits,'Scan parcel',()=>pilot.model.act('scanner','parcel','scan'));
  button(circuits,'Use terminal directly',()=>pilot.model.act('terminal','delivery','deliver'));
  button(circuits,'Connect cable',()=>{pilot.model.connect('scanner.parcel:detected','terminal.delivery','deliver');});
  button(circuits,'Cut cable',()=>{const cable=pilot.model.links.find(l=>l.from==='scanner.parcel:detected'&&l.to==='terminal.delivery');if(cable)pilot.model.cut(cable);});
  button(circuits,'Advance 150 ms',()=>pilot.advance(150));
  button(circuits,'Advance 500 ms',()=>pilot.advance(500));
  button(circuits,'Try direct signal to wage reward',()=>report(pilot.gameplay.dispatch('shift.credit-wages','signal')));
  function render(){
    if(disposed)return;
    dialogue.replaceChildren();heading(dialogue,'Conversation');
    if(conversation){const frame=conversation.frame();const speaker=document.createElement('b');speaker.textContent=frame.speaker;dialogue.append(speaker);for(const page of frame.pages){const p=document.createElement('p');p.textContent=page.replace('{objective}',shiftGoal(pilot.gameplay.state().flags));dialogue.append(p);}for(const choice of frame.choices??[])button(dialogue,choice.label,()=>report(conversation!.choose(choice.id)));button(dialogue,'Close conversation',()=>{conversation?.close();conversation=undefined;});}
    else{const p=document.createElement('p');p.textContent='Choose a speaker above.';dialogue.append(p);}
    const snapshot=pilot.gameplay.state();
    state.textContent=JSON.stringify({objective:shiftGoal(snapshot.flags),...snapshot,sceneTimeMs:pilot.time,pendingCallbacks:pilot.pending,cables:pilot.model.links.map(l=>({from:l.from,to:l.to,verb:l.verb})),terminalReplies:pilot.lines.map(l=>l[1])},null,2);
    events.textContent='Committed events (latest 128)\n'+pilot.gameplay.events().map(e=>`${e.source}: ${e.command} → ${e.id}${e.cause?' (caused by '+e.cause+')':''}`).join('\n');
  }
  render();
  const dispose=()=>{disposed=true;conversation?.close();pilot.dispose();editor?.dispose();root.remove();};
  dispose.refresh=()=>{
    if(disposed)return;
    conversation?.close();conversation=undefined;pilot.dispose();pilot=createGameplayPilot(undefined,options?.document());
    editor?.refresh();status.textContent='Pending definition applied. Laboratory reset; reopen the conversation to test it.';render();
  };
  return dispose;
}
