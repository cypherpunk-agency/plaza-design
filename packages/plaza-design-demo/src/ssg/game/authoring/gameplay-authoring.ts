import {renderStateReadsAuthoring} from './state-reads-authoring';
import {renderConversationStructure} from './conversation-structure-authoring';
import {renderGameplayPurchasesAuthoring} from './gameplay-purchases-authoring';
import {domainActionOptions,initialDomainAction,renderDomainAction} from './domain-actions-authoring';
import {GAMEPLAY_ABILITIES} from '../engine/gameplay/rewards';
import {renderCheckpointAuthoring} from './checkpoint-authoring';
import {renderActionValue} from './action-values-authoring';
import cutsceneCatalog from '../data/cutscenes.json';
import type {SceneData} from '../data/types';
import {renderGameplayBindingsAuthoring} from './gameplay-bindings-authoring';
import {TypedForm} from './typed-form';
import type { Condition, ConversationChoice, GameplayAction, GameplayDefinition } from '../engine/gameplay/types';
import {validateGameplay} from '../engine/gameplay/validation';

export interface GameplayAuthoring {
  nativeData?:SceneData;
  nativeDataSource?():SceneData|undefined;
  nativeDerivedSource?():readonly string[];
  objectiveIdsSource?():readonly string[];
  keyringIdsSource?():readonly string[];
  registryLabelsSource?():readonly string[];
  document():unknown;
  validate?(value:unknown):GameplayDefinition;
  onEdit(value:GameplayDefinition,label:string):void;
  undo():void;redo():void;save():Promise<void>;reload():Promise<void>;
  dirty():boolean;saveLabel:string;
}

/** Typed controls for the pilot's registered vocabulary; no executable or raw JSON fields. */
export function mountGameplayAuthoring(host:HTMLElement,options:GameplayAuthoring){
  let conversation='',node='',command='',disposed=false;
  const expanded=new Map<string,boolean>(),bindingDraft:Record<string,string>={};
  const root=document.createElement('section');root.className='gameplay-editor';host.append(root);
  const error=document.createElement('p');error.className='error';error.setAttribute('role','alert');
  function element<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
  function report(e:unknown){error.textContent=e instanceof Error?e.message:String(e);}
  function button(parent:HTMLElement,label:string,run:()=>unknown,disabled=false){const b=element('button',label);b.type='button';b.disabled=disabled;b.onclick=()=>{if(disposed)return;try{Promise.resolve(run()).catch(report);}catch(e){report(e);}};parent.append(b);return b;}
  function field(parent:HTMLElement,name:string,input:HTMLElement){const label=element('label',name+' ');input.setAttribute('aria-label',name);label.append(input);parent.append(label);}
  function text(parent:HTMLElement,name:string,value:string,change:(value:string)=>void,multiline=false){const input=multiline?element('textarea'):element('input');input.value=value;input.onchange=()=>{try{change(input.value);}catch(e){report(e);}};field(parent,name,input);}
  function number(parent:HTMLElement,name:string,value:number,change:(value:number)=>void,min?:number){const input=element('input');input.type='number';input.step='1';if(min!==undefined)input.min=String(min);input.value=String(value);input.onchange=()=>{try{const n=Number(input.value);if(!Number.isSafeInteger(n)||min!==undefined&&n<min)throw new Error('Enter a whole number in range');change(n);}catch(e){report(e);}};field(parent,name,input);}
  function select(parent:HTMLElement,name:string,values:readonly string[],value:string,change:(value:string)=>void){const input=element('select');for(const v of values){const option=element('option',v||'(none)');option.value=v;input.append(option);}input.value=value;input.onchange=()=>{try{change(input.value);}catch(e){report(e);}};field(parent,name,input);}
  function section(parent:HTMLElement,title:string,collapsed=false){const details=element('details'),key=conversation+'/'+node+'/'+command+':'+title;details.open=expanded.get(key)??(!collapsed&&parent===root);// nested rows start collapsed so a node reads as an index
   details.ontoggle=()=>expanded.set(key,details.open);details.append(element('summary',title));const body=element('div');body.className='gameplay-fields';details.append(body);parent.append(details);return body;}
  function edit(label:string,change:(doc:GameplayDefinition)=>void){const doc=(options.validate??validateGameplay)(options.document());change(doc);const valid=(options.validate??validateGameplay)(doc);error.textContent='';options.onEdit(valid,label);}
  function condition(parent:HTMLElement,name:string,value:Condition|undefined,change:(value:Condition|undefined)=>void,doc:GameplayDefinition,depth=0){const form=new TypedForm(report);form.objectiveIds=options.objectiveIdsSource?.()??[];form.condition(parent,name,value,change,doc,false,depth);}
  function refresh(){
    if(disposed)return;
    const doc=(options.validate??validateGameplay)(options.document());
    const nativeData=options.nativeDataSource?options.nativeDataSource():options.nativeData,nativeDerived=options.nativeDerivedSource?.();
    if(!doc.conversations[conversation])conversation=Object.keys(doc.conversations)[0];
    const writableFlags=doc.flags.filter(flag=>!doc.native?.reads?.[flag]);
    const dialogue=doc.conversations[conversation];if(dialogue&&!dialogue.nodes[node])node=Object.keys(dialogue.nodes)[0];
    if(!doc.commands[command])command=Object.keys(doc.commands)[0];
    root.replaceChildren();root.append(element('p','Edits join the editor history; Undo, Redo and Save are in the header.'));
    root.append(error);
    const form=new TypedForm(report);form.objectiveIds=options.objectiveIdsSource?.()??[];
    renderStateReadsAuthoring(root,doc,{form,section,edit,draft:bindingDraft,refresh});
    renderGameplayPurchasesAuthoring(root,doc,{form,section,edit,draft:bindingDraft,refresh});
    renderCheckpointAuthoring(root,doc,{section,edit,report,owner:nativeData?.id});
    renderGameplayBindingsAuthoring(root,doc,{data:nativeData,derived:nativeDerived,edit,section,form,draft:bindingDraft,refresh});
    if(dialogue){const talk=section(root,'Dialogue and choices');
    select(talk,'Conversation',Object.keys(doc.conversations),conversation,id=>{conversation=id;node=Object.keys(doc.conversations[id].nodes)[0];refresh();});
    select(talk,'Dialogue node',Object.keys(dialogue.nodes),node,id=>{node=id;refresh();});
    const selected=dialogue.nodes[node];
    renderConversationStructure(talk,doc,conversation,node,{form,section,edit,draft:bindingDraft,refresh,selectNode:id=>{node=id;}});
    text(talk,'Speaker',selected.speaker,value=>edit('Change dialogue speaker',d=>{d.conversations[conversation].nodes[node].speaker=value;}));
    select(talk,'Node entry command',['',...Object.keys(doc.commands).filter(id=>doc.commands[id].sources.includes('conversation'))],selected.onEnter??'',value=>edit('Edit node entry command',d=>{if(value)d.conversations[conversation].nodes[node].onEnter=value;else{delete d.conversations[conversation].nodes[node].onEnter;delete d.conversations[conversation].nodes[node].onEnterFailure;}}));
    if(selected.onEnter)select(talk,'Node entry failure', ['',...Object.entries(dialogue.nodes).filter(([,n])=>!n.onEnter&&!n.redirect).map(([id])=>id)],selected.onEnterFailure??'',value=>edit('Edit node entry failure',d=>{if(value)d.conversations[conversation].nodes[node].onEnterFailure=value;else delete d.conversations[conversation].nodes[node].onEnterFailure;}));
    form.check(talk,'Expand dialogue text templates',selected.template===true,on=>edit('Edit dialogue templates',d=>{const n=d.conversations[conversation].nodes[node];if(on)n.template=true;else delete n.template;}));
    text(talk,'Terminal prefill after final page',selected.completion?.terminalPrefill??'',value=>edit('Edit dialogue completion',d=>{const n=d.conversations[conversation].nodes[node];if(value)n.completion={terminalPrefill:value};else delete n.completion;}));
    selected.redirect?.forEach((r,i)=>{const row=section(talk,'Conditional redirect '+(i+1));select(row,'Redirect '+(i+1)+' destination',Object.keys(dialogue.nodes),r.node,value=>edit('Edit redirect',d=>{d.conversations[conversation].nodes[node].redirect![i].node=value;}));condition(row,'Redirect '+(i+1)+' condition',r.when,value=>edit('Edit redirect condition',d=>{if(!value)throw new Error('Redirect requires a condition');d.conversations[conversation].nodes[node].redirect![i].when=value;}),doc);});
    text(talk,'Dialogue pages (blank line between pages)',selected.pages.join('\n\n'),value=>edit('Change dialogue pages',d=>{d.conversations[conversation].nodes[node].pages=value.split(/\n\s*\n/).map(page=>page.trim());}),true);
    for(const[ index,choice ]of(selected.choices??[]).entries()){
      const box=section(talk,`Choice ${index+1} · ${choice.id}`);
      const mutate=(label:string,change:(choice:ConversationChoice)=>void)=>edit(label,d=>change(d.conversations[conversation].nodes[node].choices![index]));
      text(box,`Choice ${index+1} label`,choice.label,value=>mutate('Change dialogue choice',c=>{c.label=value;}));
      const allowed=['',...Object.keys(doc.commands).filter(id=>doc.commands[id].sources.includes('conversation'))];
      select(box,`Choice ${index+1} command`,allowed,choice.command??'',value=>mutate('Change choice command',c=>{if(value)c.command=value;else delete c.command;}));
      select(box,`Choice ${index+1} next`,Object.keys(dialogue.nodes),choice.next,value=>mutate('Change choice destination',c=>{c.next=value;}));
      condition(box,`Choice ${index+1} condition`,choice.when,value=>mutate('Change choice condition',c=>{if(value)c.when=value;else delete c.when;}),doc);
      button(box,'Remove choice '+(index+1),()=>edit('Remove dialogue choice',d=>{d.conversations[conversation].nodes[node].choices!.splice(index,1);}));
    }
    button(talk,'Add choice',()=>edit('Add dialogue choice',d=>{const n=d.conversations[conversation].nodes[node];n.choices??=[];let i=1;while(n.choices.some(c=>c.id==='choice-'+i))i++;n.choices.push({id:'choice-'+i,label:'New choice',next:node});}),(selected.choices?.length??0)>=8);
    button(talk,'Add dialogue node',()=>edit('Add dialogue node',d=>{const nodes=d.conversations[conversation].nodes;let i=1;while(nodes['node-'+i])i++;node='node-'+i;nodes[node]={speaker:selected.speaker,pages:['New dialogue.']};}));
    text(talk,'Terminal command template',dialogue.sayCommand??'',value=>edit('Edit conversation command template',d=>{if(value.trim())d.conversations[conversation].sayCommand=value;else delete d.conversations[conversation].sayCommand;}));
    const freeInput=section(talk,'Free-text input',true);
    form.check(freeInput,'Enable free-text input',!!dialogue.free,on=>edit('Edit free-text input',d=>{const c=d.conversations[conversation];if(on)c.free={containsAny:['hello'],next:node,miss:'Not understood.',retry:'Try again.',retryNext:node};else delete c.free;}));
    if(dialogue.free){const free=dialogue.free,change=(fn:(f:NonNullable<typeof free>)=>void)=>edit('Edit free-text rule',d=>fn(d.conversations[conversation].free!));text(freeInput,'Matched fragments (one per line)',free.containsAny.join('\n'),value=>change(f=>{f.containsAny=value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);}),true);select(freeInput,'Matched input destination',Object.keys(dialogue.nodes),free.next,next=>change(f=>{f.next=next;}));text(freeInput,'Unmatched input response',free.miss,miss=>change(f=>{f.miss=miss;}),true);text(freeInput,'Retry label',free.retry,retry=>change(f=>{f.retry=retry;}));select(freeInput,'Retry destination',Object.keys(dialogue.nodes),free.retryNext,retryNext=>change(f=>{f.retryNext=retryNext;}));freeInput.append(element('p','Fragments match anywhere, ignoring case. These are literal text, not regular expressions.'));}
    const routes=section(root,'Conversation entry routes',true);
    dialogue.entry.forEach((route,index)=>{
      const row=section(routes,'Entry '+(index+1));select(row,'Entry '+(index+1)+' node',Object.keys(dialogue.nodes),route.node,value=>edit('Change conversation entry',d=>{d.conversations[conversation].entry[index].node=value;}));
      if(index<dialogue.entry.length-1)condition(row,'Entry '+(index+1)+' condition',route.when,value=>edit('Change entry condition',d=>{const r=d.conversations[conversation].entry[index];if(value)r.when=value;else delete r.when;}),doc);
      else row.append(element('p','Final fallback · always available'));
    });
    }
    if(!command){root.append(element('p','This scene uses dialogue and text without shared resource commands. Edit those in Scene logic.'));return;}
    const commands=section(root,'Commands and actions');select(commands,'Command',Object.keys(doc.commands),command,id=>{command=id;refresh();});
    commands.append(element('p','Invoked by: '+doc.commands[command].sources.join(', ')+' · existing registered permissions are validated by the scene contract.'));
    condition(commands,'Command condition',doc.commands[command].when,value=>edit('Change command condition',d=>{if(value)d.commands[command].when=value;else delete d.commands[command].when;}),doc);
    doc.commands[command].actions.forEach((action,index)=>{
      const box=section(commands,'Action '+(index+1));
      const replace=(next:GameplayAction)=>edit('Change command action',d=>{d.commands[command].actions[index]=next;});
      const keyringIds=options.keyringIdsSource?.()??[],nodeLabels=options.registryLabelsSource?.()??[];
      const domains=domainActionOptions(nativeData);const kind='wire'in action?'wire '+action.wire.op:'trace'in action?'trace':'grant'in action?'keyring'in action.grant?'keyring grant':'ability'in action.grant?'ability grant':'node control':'state'in action?'state':'purchase'in action?'purchase':'flag'in action?'flag':'item'in action?'item':'tokens'in action?'tokens':'emit';
      select(box,'Action '+(index+1)+' kind',[...(nativeData&&domains.events.length&&domains.targets.length?['wire connect','wire cut']:[]),...(domains.devices.length?['trace']:[]),...(Object.keys(doc.state??{}).length?['state']:[]),...(keyringIds.length?['keyring grant']:[]),'ability grant',...(nodeLabels.length?['node control']:[]),...(Object.keys(doc.purchases??{}).length?['purchase']:[]),...(writableFlags.length?['flag']:[]),...(doc.items.length?['item']:[]),'tokens',...(doc.events.length?['emit']:[])],kind,value=>replace(value==='trace'||value==='wire connect'||value==='wire cut'?initialDomainAction(value,nativeData!):value==='ability grant'?{grant:{ability:'jump'}}:value==='node control'?{grant:{controlled:nodeLabels[0]}}:value==='keyring grant'?{grant:{keyring:keyringIds[0]}}:value==='state'?{state:Object.keys(doc.state!)[0],set:doc.state![Object.keys(doc.state!)[0]].default}:value==='purchase'?{purchase:Object.keys(doc.purchases!)[0]}:value==='flag'?{flag:writableFlags[0],value:true}:value==='item'?{item:doc.items[0],add:1}:value==='tokens'?{tokens:1}:{emit:doc.events[0]}));
      button(box,'Remove action '+(index+1),()=>edit('Remove command action',d=>{d.commands[command].actions.splice(index,1);}));
      button(box,'Move action '+(index+1)+' up',()=>edit('Reorder command action',d=>{const a=d.commands[command].actions;[a[index-1],a[index]]=[a[index],a[index-1]];}),index===0);

      if('wire'in action||'trace'in action){if(nativeData)renderDomainAction(box,'Action '+(index+1),action,nativeData,doc,form,replace);return;}
      if('grant'in action){const grant=action.grant;if('keyring'in grant)select(box,'Action '+(index+1)+' keyring',keyringIds,grant.keyring,keyring=>replace({grant:{keyring}}));else if('ability'in grant)select(box,'Action '+(index+1)+' ability',GAMEPLAY_ABILITIES,grant.ability,ability=>replace({grant:{ability:ability as 'jump'}}));else {const name='Action '+(index+1)+' Registry node';renderActionValue(box,name,grant.controlled,doc,form,controlled=>replace({grant:{controlled:controlled as typeof grant.controlled}}),{initial:nodeLabels[0]??'',string:true,literal:(value,edit)=>select(box,name,nodeLabels,String(value),edit)});}box.append(element('p','Grants once, atomically with the other command actions.'));return;}
      if('purchase'in action){select(box,'Action '+(index+1)+' purchase',Object.keys(doc.purchases??{}),action.purchase,purchase=>replace({purchase}));box.append(element('p','Payment and goods are defined together under Purchases.'));return;}
      if('state'in action){const d=doc.state![action.state],prefix='Action '+(index+1);select(box,prefix+' state',Object.keys(doc.state!),action.state,state=>replace({state,set:doc.state![state].default}));select(box,prefix+' state operation',d.type==='number'?['set','add']:['set'],'add'in action?'add':'set',op=>replace(op==='add'?{state:action.state,add:1}:{state:action.state,set:d.default}));if('add'in action){const name=prefix+' increment',field=d.integer===false?form.decimal.bind(form):form.number.bind(form);renderActionValue(box,name,action.add,doc,form,add=>replace({...action,add:add as typeof action.add}),{initial:1,numeric:true,literal:(value,edit)=>field(box,name,Number(value),edit,Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER)});}else{const name=prefix+' state value';renderActionValue(box,name,action.set,doc,form,set=>replace({...action,set}),{initial:d.default,numeric:d.type==='number',literal:(value,edit)=>form.stateValue(box,name,value,d,edit)});}return;}
      if('flag'in action){select(box,'Action '+(index+1)+' flag',writableFlags,action.flag,value=>replace({...action,flag:value}));select(box,'Action '+(index+1)+' value',['true','false'],String(action.value),value=>replace({...action,value:value==='true'}));}
      else if('item'in action){select(box,'Action '+(index+1)+' item',doc.items,action.item,value=>replace({...action,item:value}));const name='Action '+(index+1)+' quantity';renderActionValue(box,name,action.add,doc,form,add=>replace({...action,add:add as typeof action.add}),{initial:1,numeric:true,literal:(value,edit)=>number(box,name,Number(value),edit)});}
      else if('tokens'in action){const name='Action '+(index+1)+' tokens';renderActionValue(box,name,action.tokens,doc,form,tokens=>replace({tokens:tokens as typeof action.tokens}),{initial:1,numeric:true,literal:(value,edit)=>number(box,name,Number(value),edit)});}
      else select(box,'Action '+(index+1)+' event',doc.events,action.emit,value=>replace({emit:value}));

    });
    button(commands,'Add action',()=>edit('Add command action',d=>{d.commands[command].actions.push(doc.events.length?{emit:doc.events[0]}:{tokens:0});}),doc.commands[command].actions.length>=32);
    const reactions=section(root,'Event reactions',true),systemCommands=Object.keys(doc.commands).filter(id=>doc.commands[id].sources.includes('system'));
    const handoffs=section(root,'Event handoffs',true),handoffForm=new TypedForm(report);
    for(const[i,h]of (doc.handoffs??[]).entries()){
     const row=section(handoffs,'Handoff '+(i+1));select(row,'Handoff '+(i+1)+' event',doc.events,h.event,event=>edit('Edit handoff event',d=>{d.handoffs![i].event=event;}));
     select(row,'Handoff '+(i+1)+' cutscene',['none',...Object.keys(cutsceneCatalog)],h.cutscene??'none',value=>edit('Edit handoff cutscene',d=>{if(value==='none')delete d.handoffs![i].cutscene;else{d.handoffs![i].cutscene=value;delete d.handoffs![i].presentation;}}));
     select(row,'Handoff '+(i+1)+' presentation',['none','end'],h.presentation??'none',value=>edit('Edit handoff presentation',d=>{if(value==='none')delete d.handoffs![i].presentation;else{d.handoffs![i].presentation='end';delete d.handoffs![i].cutscene;}}));
     for(const[j,a]of (h.after??[]).entries()){
      handoffForm.number(row,'Handoff '+(i+1)+' delay '+(j+1)+' ms',a.ms,ms=>edit('Edit handoff delay',d=>{d.handoffs![i].after![j].ms=ms;}),1,1000000);
      select(row,'Handoff '+(i+1)+' delayed command '+(j+1),systemCommands,a.command,command=>edit('Edit handoff command',d=>{d.handoffs![i].after![j].command=command;}));
      button(row,'Remove delayed command '+(j+1),()=>edit('Remove delayed command',d=>{const h=d.handoffs![i];h.after!.splice(j,1);if(!h.after!.length)delete h.after;}));
     }
     button(row,'Add delayed command',()=>edit('Add delayed command',d=>{const h=d.handoffs![i];h.after??=[];h.after.push({ms:1500,command:systemCommands[0]});}),!systemCommands.length||(h.after?.length??0)>=16);
     button(row,'Remove handoff '+(i+1),()=>edit('Remove event handoff',d=>{d.handoffs!.splice(i,1);}));
    }
    button(handoffs,'Add event handoff',()=>edit('Add event handoff',d=>{const event=d.events.find(e=>!d.handoffs?.some(h=>h.event===e));if(!event)throw new Error('No unused event');d.handoffs??=[];d.handoffs.push({event,cutscene:Object.keys(cutsceneCatalog)[0]});}),(doc.handoffs?.length??0)>=32||doc.events.every(e=>doc.handoffs?.some(h=>h.event===e)));
    doc.reactions.forEach((reaction,index)=>{
      const row=section(reactions,'Reaction '+(index+1));
      select(row,'Reaction '+(index+1)+' event',doc.events,reaction.event,value=>edit('Change reaction event',d=>{d.reactions[index].event=value;}));
      select(row,'Reaction '+(index+1)+' command',systemCommands,reaction.command,value=>edit('Change reaction command',d=>{d.reactions[index].command=value;}));
      button(row,'Remove reaction '+(index+1),()=>edit('Remove event reaction',d=>{d.reactions.splice(index,1);}));
    });
    button(reactions,'Add reaction',()=>edit('Add event reaction',d=>{const pair=d.events.flatMap(event=>systemCommands.map(command=>({event,command}))).find(pair=>!d.reactions.some(r=>r.event===pair.event&&r.command===pair.command));if(!pair)throw new Error('All event/command pairs already exist');d.reactions.push(pair);}),doc.reactions.length>=128||!doc.events.length||!systemCommands.length);
  }
  refresh();
  return{refresh,dispose(){disposed=true;root.remove();}};
}
