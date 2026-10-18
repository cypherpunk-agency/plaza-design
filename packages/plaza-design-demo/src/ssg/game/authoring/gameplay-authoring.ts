import type {SceneData} from '../data/types';
import {nativeVocabulary} from '../engine/gameplay/native-bindings';
import {TypedForm} from './typed-form';
import type { Condition, ConversationChoice, GameplayAction, GameplayDefinition } from '../engine/gameplay/types';
import { validateShiftGameplay } from '../scenes/harbor-shift/gameplay-contract';

export interface GameplayAuthoring {
  nativeData?:SceneData;
  document():unknown;
  validate?(value:unknown):GameplayDefinition;
  onEdit(value:GameplayDefinition,label:string):void;
  undo():void;redo():void;save():Promise<void>;reload():Promise<void>;
  dirty():boolean;saveLabel:string;
}

/** Typed controls for the pilot's registered vocabulary; no executable or raw JSON fields. */
export function mountGameplayAuthoring(host:HTMLElement,options:GameplayAuthoring){
  let conversation='supervisor',node='offer',command='shift.accept',disposed=false;
  const expanded=new Map<string,boolean>();
  const root=document.createElement('section');root.className='gameplay-editor';host.append(root);
  const error=document.createElement('p');error.className='error';error.setAttribute('role','alert');
  function element<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
  function report(e:unknown){error.textContent=e instanceof Error?e.message:String(e);}
  function button(parent:HTMLElement,label:string,run:()=>unknown,disabled=false){const b=element('button',label);b.type='button';b.disabled=disabled;b.onclick=()=>{if(disposed)return;try{Promise.resolve(run()).catch(report);}catch(e){report(e);}};parent.append(b);return b;}
  function field(parent:HTMLElement,name:string,input:HTMLElement){const label=element('label',name+' ');input.setAttribute('aria-label',name);label.append(input);parent.append(label);}
  function text(parent:HTMLElement,name:string,value:string,change:(value:string)=>void,multiline=false){const input=multiline?element('textarea'):element('input');input.value=value;input.onchange=()=>{try{change(input.value);}catch(e){report(e);}};field(parent,name,input);}
  function number(parent:HTMLElement,name:string,value:number,change:(value:number)=>void,min?:number){const input=element('input');input.type='number';input.step='1';if(min!==undefined)input.min=String(min);input.value=String(value);input.onchange=()=>{try{const n=Number(input.value);if(!Number.isSafeInteger(n)||min!==undefined&&n<min)throw new Error('Enter a whole number in range');change(n);}catch(e){report(e);}};field(parent,name,input);}
  function select(parent:HTMLElement,name:string,values:readonly string[],value:string,change:(value:string)=>void){const input=element('select');for(const v of values){const option=element('option',v||'(none)');option.value=v;input.append(option);}input.value=value;input.onchange=()=>{try{change(input.value);}catch(e){report(e);}};field(parent,name,input);}
  function section(parent:HTMLElement,title:string,collapsed=false){const details=element('details'),key=conversation+'/'+node+'/'+command+':'+title;details.open=expanded.get(key)??!collapsed;details.ontoggle=()=>expanded.set(key,details.open);details.append(element('summary',title));const body=element('div');body.className='gameplay-fields';details.append(body);parent.append(details);return body;}
  function edit(label:string,change:(doc:GameplayDefinition)=>void){const doc=(options.validate??validateShiftGameplay)(options.document());change(doc);const valid=(options.validate??validateShiftGameplay)(doc);error.textContent='';options.onEdit(valid,label);}
  function condition(parent:HTMLElement,name:string,value:Condition|undefined,change:(value:Condition|undefined)=>void,doc:GameplayDefinition,depth=0){new TypedForm(report).condition(parent,name,value,change,doc,false,depth);}
  function nativeControls(doc:GameplayDefinition){
    if(!doc.native||!options.nativeData)return;
    const form=new TypedForm(report),box=section(root,'Native device bindings'),vocabulary=nativeVocabulary(options.nativeData),events=vocabulary.flatMap(n=>n.events.map(e=>n.key+':'+e)),targets=vocabulary.filter(n=>n.verbs.length);
    box.append(element('p','Native state ownership, endpoint IDs and command permissions are protected. Player rewires stay in the play save; these are authored starting cables.'));
    for(const[r,route]of doc.native.verbs.entries()){
      const row=section(box,route.device+'.'+route.noun+' / '+route.verb,true);
      route.cases.forEach((c,i)=>{const prefix=route.device+'.'+route.noun+' '+route.verb+' case '+(i+1);form.select(row,prefix+' command',Object.keys(doc.commands),c.command,command=>edit('Edit device command',d=>{d.native!.verbs[r].cases[i].command=command;}));if(i<route.cases.length-1)form.condition(row,prefix+' condition',c.when,when=>edit('Edit device condition',d=>{if(!when)throw new Error('Ordered case requires a condition');d.native!.verbs[r].cases[i].when=when;}),doc);form.text(row,prefix+' response',c.say[1],value=>edit('Edit device response',d=>{d.native!.verbs[r].cases[i].say[1]=value;}));});
    }
    const wires=section(root,'Native wiring');
    for(const[w,wire]of doc.native.wires.entries()){
      const row=section(wires,'Wire '+wire.id,true),prefix='Wire '+wire.id;
      if(wire.fixed){row.append(element('p','Fixed conduit: '+wire.from+' -> '+wire.to+' / '+wire.verb));continue;}
      form.select(row,prefix+' source',events,wire.from,from=>edit('Edit wire source',d=>{d.native!.wires[w].from=from;}));
      form.select(row,prefix+' target',targets.map(n=>n.key),wire.to,to=>edit('Edit wire target',d=>{const wire=d.native!.wires[w];wire.to=to;wire.verb=targets.find(n=>n.key===to)!.verbs[0];}));
      form.select(row,prefix+' verb',targets.find(n=>n.key===wire.to)!.verbs,wire.verb,verb=>edit('Edit wire verb',d=>{d.native!.wires[w].verb=verb;}));
      form.button(row,'Remove '+prefix,()=>edit('Remove wire',d=>{d.native!.wires.splice(w,1);}));
    }
    form.button(wires,'Add native wire',()=>edit('Add wire',d=>{const b=d.native!;let i=1;while(b.wires.some(w=>w.id==='wire-'+i))i++;const pair=events.flatMap(from=>targets.map(to=>({from,to:to.key,verb:to.verbs[0]}))).find(p=>!b.wires.some(w=>w.from===p.from&&w.to===p.to));if(!pair)throw new Error('No unused endpoint pair');b.wires.push({id:'wire-'+i,...pair});}),doc.native.wires.length>=128);
  }
  function refresh(){
    if(disposed)return;
    const doc=(options.validate??validateShiftGameplay)(options.document());
    if(!doc.conversations[conversation])conversation=Object.keys(doc.conversations)[0];
    const dialogue=doc.conversations[conversation];if(dialogue&&!dialogue.nodes[node])node=Object.keys(dialogue.nodes)[0];
    if(!doc.commands[command])command=Object.keys(doc.commands)[0];
    root.replaceChildren();root.append(element('p','Edits join the editor history; Undo, Redo and Save are in the header.'));
    root.append(error);
    const form=new TypedForm(report);
    for(const[id,d]of Object.entries(doc.state??{})){const box=section(root,'State '+id,true);box.append(element('p',d.owner+' / '+d.lifetime+' / '+d.type));if(d.type==='number')form.number(box,'State '+id+' default',Number(d.default),value=>edit('Edit state default',g=>{g.state![id].default=value;}),d.min??-1000000,d.max??1000000);else if(d.type==='boolean')form.check(box,'State '+id+' default',Boolean(d.default),value=>edit('Edit state default',g=>{g.state![id].default=value;}));else form.select(box,'State '+id+' default',d.options!,String(d.default),value=>edit('Edit state default',g=>{g.state![id].default=value;}));}
    for(const[id,p]of Object.entries(doc.purchases??{})){const box=section(root,'Purchase '+id);form.number(box,'Purchase '+id+' base price',p.basePrice,value=>edit('Edit purchase price',d=>{d.purchases![id].basePrice=value;}));box.append(element('p','Quote and charge share this base. Explicit modifiers may change either. Goods: '+(p.rotation?.items??p.goods?.map(g=>g.item+' x'+g.quantity)??[]).join(', ')));
     p.goods?.forEach((goods,i)=>{form.select(box,'Purchase '+id+' goods '+(i+1),doc.items,goods.item,item=>edit('Edit purchase goods',d=>{d.purchases![id].goods![i].item=item;}));form.number(box,'Purchase '+id+' quantity '+(i+1),goods.quantity,quantity=>edit('Edit purchase quantity',d=>{d.purchases![id].goods![i].quantity=quantity;}),1);});
     const stocks=Object.entries(doc.state??{}).filter(([key,d])=>d.type==='number'&&(d.min??-1000000)>=0&&key!==p.rotation?.state).map(([id])=>id);form.select(box,'Purchase '+id+' stock',['',...stocks],p.stock??'',stock=>edit('Edit purchase stock',d=>{if(stock)d.purchases![id].stock=stock;else delete d.purchases![id].stock;}));
     p.rotation?.items.forEach((item,i)=>form.select(box,'Purchase '+id+' rotation '+(i+1),doc.items,item,item=>edit('Edit purchase rotation',d=>{d.purchases![id].rotation!.items[i]=item;})));
     p.modifiers?.forEach((m,i)=>{const row=section(box,'Modifier '+m.id);form.number(row,'Modifier '+m.id+' amount',m.amount,value=>edit('Edit price modifier',d=>{d.purchases![id].modifiers![i].amount=value;}),-1000000);form.select(row,'Modifier '+m.id+' scope',['both','quote','charge'],m.scope,value=>edit('Edit modifier scope',d=>{d.purchases![id].modifiers![i].scope=value as typeof m.scope;}));form.condition(row,'Modifier '+m.id+' condition',m.when,value=>edit('Edit modifier condition',d=>{if(value)d.purchases![id].modifiers![i].when=value;else delete d.purchases![id].modifiers![i].when;}),doc);form.button(row,'Remove modifier '+m.id,()=>edit('Remove price modifier',d=>{d.purchases![id].modifiers!.splice(i,1);}));});
     form.button(box,'Add modifier to '+id,()=>edit('Add price modifier',d=>{const p=d.purchases![id];p.modifiers??=[];let n=1;while(p.modifiers.some(m=>m.id==='modifier-'+n))n++;p.modifiers.push({id:'modifier-'+n,amount:0,scope:'both'});}),(p.modifiers?.length??0)>=32);
    }
    nativeControls(doc);
    if(dialogue){const talk=section(root,'Dialogue and choices');
    select(talk,'Conversation',Object.keys(doc.conversations),conversation,id=>{conversation=id;node=Object.keys(doc.conversations[id].nodes)[0];refresh();});
    select(talk,'Dialogue node',Object.keys(dialogue.nodes),node,id=>{node=id;refresh();});
    const selected=dialogue.nodes[node];
    text(talk,'Speaker',selected.speaker,value=>edit('Change dialogue speaker',d=>{d.conversations[conversation].nodes[node].speaker=value;}));
    select(talk,'Node entry command',['',...Object.keys(doc.commands).filter(id=>doc.commands[id].sources.includes('conversation'))],selected.onEnter??'',value=>edit('Edit node entry command',d=>{if(value)d.conversations[conversation].nodes[node].onEnter=value;else delete d.conversations[conversation].nodes[node].onEnter;}));
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
      const protectedChoice=conversation==='supervisor'&&['offer','trolley-offer'].includes(node)&&choice.id==='accept';
      button(box,'Remove choice '+(index+1),()=>edit('Remove dialogue choice',d=>{d.conversations[conversation].nodes[node].choices!.splice(index,1);}),protectedChoice);
    }
    button(talk,'Add choice',()=>edit('Add dialogue choice',d=>{const n=d.conversations[conversation].nodes[node];n.choices??=[];let i=1;while(n.choices.some(c=>c.id==='choice-'+i))i++;n.choices.push({id:'choice-'+i,label:'New choice',next:node});}),(selected.choices?.length??0)>=8);
    button(talk,'Add dialogue node',()=>edit('Add dialogue node',d=>{const nodes=d.conversations[conversation].nodes;let i=1;while(nodes['node-'+i])i++;node='node-'+i;nodes[node]={speaker:selected.speaker,pages:['New dialogue.']};}));
    const routes=section(root,'Conversation entry routes',true);
    dialogue.entry.forEach((route,index)=>{
      const row=section(routes,'Entry '+(index+1));select(row,'Entry '+(index+1)+' node',Object.keys(dialogue.nodes),route.node,value=>edit('Change conversation entry',d=>{d.conversations[conversation].entry[index].node=value;}));
      if(index<dialogue.entry.length-1)condition(row,'Entry '+(index+1)+' condition',route.when,value=>edit('Change entry condition',d=>{const r=d.conversations[conversation].entry[index];if(value)r.when=value;else delete r.when;}),doc);
      else row.append(element('p','Final fallback · always available'));
    });
    }
    if(!command){root.append(element('p','This scene uses dialogue and text without shared resource commands. Edit those in Scene logic.'));return;}
    const commands=section(root,'Commands and actions');select(commands,'Command',Object.keys(doc.commands),command,id=>{command=id;refresh();});
    commands.append(element('p','Invoked by: '+doc.commands[command].sources.join(', ')+' · permissions and IDs are fixed for this pilot.'));
    condition(commands,'Command condition',doc.commands[command].when,value=>edit('Change command condition',d=>{if(value)d.commands[command].when=value;else delete d.commands[command].when;}),doc);
    doc.commands[command].actions.forEach((action,index)=>{
      const box=section(commands,'Action '+(index+1));
      const replace=(next:GameplayAction)=>edit('Change command action',d=>{d.commands[command].actions[index]=next;});
      if('purchase'in action){select(box,'Action '+(index+1)+' purchase',Object.keys(doc.purchases??{}),action.purchase,purchase=>replace({purchase}));box.append(element('p','Payment and goods are defined together under Purchases.'));return;}
      if('state'in action){const d=doc.state![action.state];select(box,'Action '+(index+1)+' state',Object.keys(doc.state!),action.state,state=>replace({state,set:doc.state![state].default}));if('add'in action)number(box,'Action '+(index+1)+' increment',action.add,add=>replace({...action,add}));else if(d.type==='number')number(box,'Action '+(index+1)+' state value',Number(action.set),set=>replace({...action,set}),d.min);else if(d.type==='boolean')select(box,'Action '+(index+1)+' state value',['true','false'],String(action.set),set=>replace({...action,set:set==='true'}));else select(box,'Action '+(index+1)+' state value',d.options!,String(action.set),set=>replace({...action,set}));return;}
      const kind='flag'in action?'flag':'item'in action?'item':'tokens'in action?'tokens':'emit';
      select(box,'Action '+(index+1)+' kind',[...(doc.flags.length?['flag']:[]),...(doc.items.length?['item']:[]),'tokens',...(doc.events.length?['emit']:[])],kind,value=>replace(value==='flag'?{flag:doc.flags[0],value:true}:value==='item'?{item:doc.items[0],add:1}:value==='tokens'?{tokens:1}:{emit:doc.events[0]}));
      if('flag'in action){select(box,'Action '+(index+1)+' flag',doc.flags,action.flag,value=>replace({...action,flag:value}));select(box,'Action '+(index+1)+' value',['true','false'],String(action.value),value=>replace({...action,value:value==='true'}));}
      else if('item'in action){select(box,'Action '+(index+1)+' item',doc.items,action.item,value=>replace({...action,item:value}));number(box,'Action '+(index+1)+' quantity',action.add,value=>replace({...action,add:value}));}
      else if('tokens'in action)number(box,'Action '+(index+1)+' tokens',action.tokens,value=>replace({tokens:value}));
      else select(box,'Action '+(index+1)+' event',doc.events,action.emit,value=>replace({emit:value}));
      button(box,'Remove action '+(index+1),()=>edit('Remove command action',d=>{d.commands[command].actions.splice(index,1);}));
      button(box,'Move action '+(index+1)+' up',()=>edit('Reorder command action',d=>{const a=d.commands[command].actions;[a[index-1],a[index]]=[a[index],a[index-1]];}),index===0);
    });
    button(commands,'Add action',()=>edit('Add command action',d=>{d.commands[command].actions.push(doc.events.length?{emit:doc.events[0]}:{tokens:0});}),doc.commands[command].actions.length>=32);
    const reactions=section(root,'Event reactions',true),systemCommands=Object.keys(doc.commands).filter(id=>doc.commands[id].sources.includes('system'));
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
