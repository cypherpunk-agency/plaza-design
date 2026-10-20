import assert from 'node:assert/strict';
import {SCENES} from '../../src/ssg/game/scenes';
import {SceneModel} from '../../src/ssg/game/engine/model';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {attachNativeGameplay,validateNativeBindings} from '../../src/ssg/game/engine/gameplay/native-bindings';
import {nativeSourceLine} from '../../src/ssg/game/engine/gameplay/native-text-source';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import {deviceRules} from '../../src/ssg/game/authoring/device-sources';
import {sceneShell} from '../../src/ssg/game/scenes/downtown/shell';
import {fixtureGameplayPort} from './model-gameplay-fixture.mts';
import {TypedForm} from '../../src/ssg/game/authoring/typed-form';
import {renderResponseConversationsAuthoring} from '../../src/ssg/game/authoring/response-conversations-authoring';
import {DialogueElement,descendants} from './dialogue-authoring-fixture.mts';
const scene=SCENES.downtown,phrases=['Incident reported.','This attempt has been logged.','The Registry has been notified.'];
function setup(initial?:any,definition=scene.gameplay!){
 let state:any=initial??{flags:{},items:{},tokens:5};const lines:any[]=[];
 const m=new SceneModel({say:l=>lines.push(l),open(){},changed(){}},scene.data!,deviceRules(scene));m.setPaused(true);m.frozen=()=>false;
 const s=new GameplaySession(definition,fixtureGameplayPort(definition,{read:()=>state,write:v=>{state=v;}},()=>m));attachNativeGameplay(m,s);
 const shell=sceneShell({model:m,typed:(run:()=>void)=>run()} as any,(text,kind)=>lines.push(['terminal',text,kind]));
 return{m,s,lines,shell,state:()=>structuredClone(state),close(){s.dispose();m.reset();m.setPaused(true);}};
}
const a=setup();try{
 const before=a.state();for(let i=0;i<25;i++)assert.equal(a.m.line('guard.wrong.last',{guess:'bad'})[1],'ACCESS DENIED. '+phrases[0]);assert.deepEqual(a.state(),before,'formatting/preflight does not advance or initialize progress');
 for(let i=0;i<12;i++){
  if(i%2)a.shell.login('till','wrong-user','bad');else a.m.guess('till','login','bad');
  assert.equal(a.lines.at(-1)[1],'ACCESS DENIED. '+phrases[i%3]);
  const after=a.state();for(let j=0;j<5;j++)assert.equal(a.m.line('guard.wrong.last',{guess:'bad'})[1],'ACCESS DENIED. '+phrases[(i+1)%3]);assert.deepEqual(a.state(),after);
 }
 a.m.guess('box','login','verify');assert.match(a.lines.at(-1)[1],/6 characters/);assert.equal(a.state().values['downtown.denial'].cursor,0,'near miss does not consume generic refusal');
 a.m.guess('till','login','bad');const saved=JSON.parse(JSON.stringify(a.state()));const b=setup(saved);try{b.shell.login('till','wrong-user','bad');assert.equal(b.lines.at(-1)[1],'ACCESS DENIED. '+phrases[1]);}finally{b.close();}
 const preview=new ConversationSession(a.s,'downtown.denial',{},'preview'),snapshot=a.state();assert.equal(preview.choose('any').ok,false);assert.equal(preview.submit('any').ok,false);preview.frame();preview.close();assert.deepEqual(a.state(),snapshot);
 a.s.dispose();assert.equal(a.m.gameplayResponse,undefined,'disposed session releases outcome hook');
}finally{a.close();}
const committed=setup();try{assert.equal(nativeSourceLine('login.baduser.till',committed.m,{dev:'till',noun:'login',verb:'login',bySignal:false})[1],'ACCESS DENIED. '+phrases[0]);assert.equal(committed.state().values['downtown.denial'].cursor,1,'shared verb/event source replies use committed conversation delivery');}finally{committed.close();}
for(const mutate of[(d:any)=>d.native.responseConversations['guard.wrong.last'].conversation='missing',(d:any)=>d.conversations['downtown.denial'].nodes['reply-0'].pages.push('second page'),(d:any)=>d.native.responseConversations['guard.wrong.last'].variable='missing']){
 const d=structuredClone(scene.gameplay!);mutate(d);assert.throws(()=>{validateGameplay(d);validateNativeBindings(d,scene.data!,Object.keys(deviceRules(scene).derived??{}),deviceRules(scene).inputs);});
}
const old=globalThis.document;(globalThis as any).document={createElement:()=>new DialogueElement()};try{
 let doc=structuredClone(scene.gameplay!);const host=new DialogueElement(),form=new TypedForm(e=>{throw e;}),draft:Record<string,string>={};
 renderResponseConversationsAuthoring(host as any,doc,{data:scene.data,form,draft,refresh(){},section:(p,t)=>form.section(p,t),edit:(_label,change)=>{const next=structuredClone(doc);change(next);validateGameplay(next);validateNativeBindings(next,scene.data!,Object.keys(deviceRules(scene).derived??{}),deviceRules(scene).inputs);doc=next;}});
 const field=descendants(host).find(e=>e.attributes['aria-label']==='Response guard.wrong.last conversation');assert(field);field.value='downtown.denial';field.onchange!();
 descendants(host).find(e=>e.textContent==='Remove Response guard.wrong.last')!.click();assert(!doc.native!.responseConversations!['guard.wrong.last']);
 const set=(label:string,value:string)=>{const f=descendants(host).find(e=>e.attributes['aria-label']===label)!;assert(f);f.value=value;f.onchange!();};
 set('New response text','guard.wrong.last');set('New response conversation','downtown.denial');set('New response variable','joke');descendants(host).find(e=>e.textContent==='Add response conversation')!.click();assert.equal(doc.native!.responseConversations!['guard.wrong.last'].conversation,'downtown.denial');
}finally{globalThis.document=old;}
console.log('Response conversations PASS: mixed actual password/username outcomes, original text/order, pure previews, near-miss exclusion, saved progress/reload, no preview navigation, disposal, invalid references/shape/slots and typed Add/Remove/rebind.');
