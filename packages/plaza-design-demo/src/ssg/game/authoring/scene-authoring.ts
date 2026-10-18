import {gameplayScenes,gameplayScene} from './gameplay-scenes';
import {TypedForm} from './typed-form';
import type {WorkbenchContext,WorkbenchHandle} from './app';
import type {SceneDocument,InteractionRoute} from '../engine/gameplay/scene-document';

interface Entry {key:string;group:string;label:string;detail?:string;prefix?:string|RegExp;render(host:HTMLElement):void}
/** One part of the scene document at a time: a grouped list on the left, its fields on the right. */
export function mountSceneAuthoring(host:HTMLElement,context:WorkbenchContext,selection:{scene?:string;use?:string;item?:string;fixed?:boolean}={}):WorkbenchHandle {
 const api=context.authoring!,error=document.createElement('p'),body=document.createElement('section');error.setAttribute('role','alert');error.className='error';host.replaceChildren(error,body);let use=selection.use??'boss';
 const form=new TypedForm(e=>error.textContent=e instanceof Error?e.message:String(e));
 const selected=()=>gameplayScene(selection.scene??'harborShift');
 const gameplay=()=>selected().validateGameplay(api.get(selected().gameplayId).value);
 const doc=()=>selected().validateScene(api.get(selected().prefix+'-scene').value,gameplay());
 const edit=(label:string,fn:(d:SceneDocument)=>void)=>{const d=doc();fn(d);selected().validateScene(d,gameplay());error.textContent='';api.edit(selected().prefix+'-scene',label,d);};
 const note=(parent:HTMLElement,text:string)=>{const p=document.createElement('p');p.className='muted';p.textContent=text;parent.append(p);};
 const pages=(v:string)=>v.split(/\n\s*\n/).filter(Boolean);
 function refresh(){body.replaceChildren();if(!selection.fixed)form.select(body,'Logic scene',gameplayScenes.map(s=>s.id),selected().id,id=>{selection.scene=id;selection.use=undefined;selection.item=undefined;use='';refresh();});const d=doc(),g=gameplay();if(!d.uses.some(u=>u.id===use))use=d.uses[0]?.id??'';selection.use=use;
  const entries:Entry[]=[];
  entries.push({key:'arrival',group:'Scene',label:'Arrival',detail:d.name,render:h=>{form.text(h,'Scene name',d.name,name=>edit('Rename scene',d=>{d.name=name;}));form.text(h,'Arrival pages',d.intro.join('\n\n'),v=>edit('Edit scene arrival',d=>{d.intro=pages(v);}),true);note(h,'Separate pages with a blank line.');}});
  if(d.time?.length)entries.push({key:'time',group:'Scene',label:'Story clock',detail:d.time.length+' milestones',render:h=>{d.time!.forEach((t,i)=>{form.number(h,'Time '+(i+1)+' minute',t.minute,minute=>edit('Edit story time',d=>{d.time![i].minute=minute;}),0,1439);if(i<d.time!.length-1)form.condition(h,'Time '+(i+1)+' condition',t.when,when=>edit('Edit story time condition',d=>{if(when)d.time![i].when=when;else delete d.time![i].when;}),g,true);});}});
  d.objectives?.forEach((goal,i)=>{const name='Objective '+(i+1);entries.push({key:'objective:'+i,group:'Objectives',label:(i+1)+'. '+goal.text,prefix:name+' ',render:h=>{
   form.text(h,name+' text',goal.text,text=>edit('Edit objective',d=>{d.objectives![i].text=text;}),true);
   form.select(h,name+' target',['',...d.uses.map(u=>u.id)],goal.target??'',target=>edit('Edit guidance',d=>{if(target)d.objectives![i].target=target;else delete d.objectives![i].target;}));
   form.check(h,name+' gentle',!!goal.gentle,gentle=>edit('Edit guidance urgency',d=>{d.objectives![i].gentle=gentle;}));
   if(i<d.objectives!.length-1)form.condition(h,name+' condition',goal.when,when=>edit('Edit objective condition',d=>{if(when)d.objectives![i].when=when;else delete d.objectives![i].when;}),g,true);else note(h,'The last objective applies once the earlier ones are complete.');}});});
  for(const u of d.uses)entries.push({key:'use:'+u.id,group:'Interactions',label:u.name||u.id,detail:u.id,prefix:/^(Interaction |Use route \d+ |Item \d+ route \d+ |Carried item \d+ )/,render:h=>{use=u.id;selection.use=u.id;
   if(u.purchase)note(h,'Price and goods: '+u.purchase+' (edit its shared definition in Commands & dialogue).');
   if(u.price!==undefined){form.number(h,'Displayed price',u.price,price=>edit('Edit interaction price',d=>{d.uses.find(u=>u.id===use)!.price=price;}));note(h,'Displayed price labels the prompt. Set the actual charge in Commands & dialogue.');}
   if(u.cycle)note(h,'Rotating outcomes advance after successful actions. This shop position is saved across sessions.');
   form.text(h,'Interaction name',u.name,name=>edit('Edit interaction speaker',d=>{d.uses.find(u=>u.id===use)!.name=name;}));form.text(h,'Interaction prompt',u.label,label=>edit('Edit interaction prompt',d=>{d.uses.find(u=>u.id===use)!.label=label;}));form.condition(h,'Interaction availability',u.when,when=>edit('Edit interaction availability',d=>{const u=d.uses.find(u=>u.id===use)!;if(when)u.when=when;else delete u.when;}),g,true);
   const routes=(parent:HTMLElement,name:string,rows:InteractionRoute[],get:(d:SceneDocument)=>InteractionRoute[])=>{rows.forEach((r,i)=>{const row=form.section(parent,(name==='Use'?'Outcome ':name+' outcome ')+(i+1)+(r.conversation?' · '+r.conversation:r.command?' · '+r.command:'')),change=(fn:(r:InteractionRoute)=>void)=>edit('Edit interaction route',d=>fn(get(d)[i]));if(!u.cycle&&i<rows.length-1)form.condition(row,name+' route '+(i+1)+' condition',r.when,when=>change(r=>{if(when)r.when=when;else delete r.when;}),g);
    form.select(row,name+' route '+(i+1)+' conversation',['',...Object.keys(g.conversations)],r.conversation??'',conversation=>change(r=>{if(conversation){r.conversation=conversation;delete r.command;delete r.pages;delete r.failure;}else{delete r.conversation;r.pages=['Nothing happens.'];}}));
    if(!r.conversation){form.select(row,name+' route '+(i+1)+' command',['',...Object.entries(g.commands).filter(([,c])=>c.sources.includes('interaction')).map(([id])=>id)],r.command??'',command=>change(r=>{if(command)r.command=command;else{delete r.command;delete r.failure;}}));form.text(row,name+' route '+(i+1)+' pages',(r.pages??[]).join('\n\n'),v=>change(r=>{r.pages=pages(v);}),true);if(r.command)form.text(row,name+' route '+(i+1)+' failure',(r.failure??[]).join('\n\n'),v=>change(r=>{if(v.trim())r.failure=pages(v);else delete r.failure;}),true);}
   });};
   const heading=document.createElement('h3');heading.textContent=u.cycle?'Outcomes, in rotation':'Outcomes, first match wins';h.append(heading);
   routes(h,'Use',u.routes,d=>d.uses.find(u=>u.id===use)!.routes);
   u.items?.forEach((item,i)=>{const row=form.section(h,'With carried item '+item.item);form.select(row,'Carried item '+(i+1)+' ID',g.items,item.item,id=>edit('Edit carried-item interaction',d=>{d.uses.find(u=>u.id===use)!.items![i].item=id;}));form.text(row,'Carried item '+(i+1)+' label',item.label,label=>edit('Edit carried-item label',d=>{d.uses.find(u=>u.id===use)!.items![i].label=label;}));routes(row,'Item '+(i+1),item.routes,d=>d.uses.find(u=>u.id===use)!.items![i].routes);});
  }});
  d.people?.forEach((p,i)=>entries.push({key:'person:'+p.id,group:'People',label:p.name||p.id,detail:p.talk.length+' conversations',prefix:'Person '+p.id+' ',render:h=>{form.text(h,'Person '+p.id+' name',p.name,name=>edit('Edit person name',d=>{d.people![i].name=name;}));form.select(h,'Person '+p.id+' repetition',['last','cycle'],p.repeat??'last',repeat=>edit('Edit conversation repetition',d=>{d.people![i].repeat=repeat as 'last'|'cycle';}));note(h,'“last” repeats the final conversation; “cycle” starts again from the first.');p.talk.forEach((talk,j)=>form.text(h,'Person '+p.id+' dialogue '+(j+1),talk.join('\n\n'),v=>edit('Edit person dialogue',d=>{d.people![i].talk[j]=pages(v);}),true));}}));
  d.readables?.forEach((r,i)=>entries.push({key:'readable:'+r.id,group:'Readables',label:r.name||r.id,detail:r.id,prefix:'Readable '+r.id+' ',render:h=>{form.text(h,'Readable '+r.id+' name',r.name,name=>edit('Edit readable speaker',d=>{d.readables![i].name=name;}));form.text(h,'Readable '+r.id+' pages',r.pages.join('\n\n'),v=>edit('Edit readable pages',d=>{d.readables![i].pages=pages(v);}),true);}}));
  d.exits?.forEach((e,i)=>entries.push({key:'exit:'+e.id,group:'Exits',label:e.label||e.id,detail:'→ '+e.to,prefix:'Exit '+e.id+' ',render:h=>{form.text(h,'Exit '+e.id+' prompt',e.label,label=>edit('Edit exit prompt',d=>{d.exits![i].label=label;}));note(h,'Destination: '+e.to+(e.at?' / '+e.at:'')+' (protected)');}}));
  if(!entries.some(e=>e.key===selection.item))selection.item=entries.find(e=>e.key==='use:'+selection.use)?.key??entries[0].key;
  const layout=document.createElement('div'),nav=document.createElement('nav'),detail=document.createElement('section');layout.className='logic-layout';nav.className='logic-nav';nav.setAttribute('aria-label','Scene logic parts');detail.className='logic-detail';layout.append(nav,detail);body.append(layout);
  for(const group of [...new Set(entries.map(e=>e.group))]){const title=document.createElement('h3'),members=entries.filter(e=>e.group===group);title.textContent=group+' · '+members.length;nav.append(title);
   for(const entry of members){const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(entry.key===selection.item));const label=document.createElement('span');label.textContent=entry.label;b.append(label);if(entry.detail){const small=document.createElement('small');small.textContent=entry.detail;b.append(small);}b.onclick=()=>{selection.item=entry.key;error.textContent='';refresh();};nav.append(b);}}
  const entry=entries.find(e=>e.key===selection.item)!,title=document.createElement('h2');title.textContent=entry.group+' · '+entry.label;detail.append(title);
  form.prefix=entry.prefix;try{entry.render(detail);}finally{form.prefix=undefined;}
 }
 refresh();const dispose=(()=>host.replaceChildren()) as WorkbenchHandle;dispose.refresh=refresh;return dispose;
}
