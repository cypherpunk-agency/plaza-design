import assert from 'node:assert/strict';
import {Game} from '../../src/ssg/game/runtime/game';
import {Panels} from '../../src/ssg/game/engine/panels';
import {GameplaySession} from '../../src/ssg/game/engine/gameplay/session';
import {ConversationSession} from '../../src/ssg/game/engine/gameplay/conversation';
import {mountGameplayAuthoring} from '../../src/ssg/game/authoring/gameplay-authoring';
import {validateGameplay} from '../../src/ssg/game/engine/gameplay/validation';
import type {GameplayDefinition,GameplayState} from '../../src/ssg/game/engine/gameplay/types';

class Element {
 children:Element[]=[];hidden=false;className='';value='';checked=false;open=false;type='';attrs=new Map<string,string>();listeners=new Map<string,(e:any)=>void>();onclick?:()=>void;onchange?:()=>void;private text='';
 constructor(public tag:string){}
 set textContent(value:string){this.text=value;this.children=[];}get textContent(){return this.text;}
 setAttribute(key:string,value:string){this.attrs.set(key,value);}
 append(...nodes:Element[]){this.children.push(...nodes);}appendChild(node:Element){this.append(node);return node;}
 replaceChildren(...nodes:Element[]){this.text='';this.children=[...nodes];}
 addEventListener(type:string,fn:(e:any)=>void){this.listeners.set(type,fn);}focus(){}remove(){}
 walk():Element[]{return[this,...this.children.flatMap(n=>n.walk())];}
 click(){this.listeners.get('click')?.({stopPropagation(){}});this.onclick?.();}
}
const originalDocument=globalThis.document,originalCancel=globalThis.cancelAnimationFrame;
Object.assign(globalThis,{document:{createElement:(tag:string)=>new Element(tag)},cancelAnimationFrame:()=>{}});
try{
 const methods=Game.prototype as any,prefills:string[]=[],fake:any={here:'downtown',term:{prefill:(text:string)=>prefills.push(text),print:()=>{}},hints:{done:()=>{}},completeConversation:methods.completeConversation};
 methods.say.call(fake,'FIXER',['one','two'],100,30);methods.dialogueCompletion.call(fake,{terminalPrefill:'call me '});
 methods.interact.call(fake);assert.equal(fake.bubble.chars,3);assert.deepEqual(prefills,[],'revealing text is not completion');
 methods.interact.call(fake);assert.equal(fake.bubble.page,1);assert.deepEqual(prefills,[],'advancing an intermediate page is not completion');
 methods.interact.call(fake);methods.interact.call(fake);assert.equal(fake.bubble,null);assert.deepEqual(prefills,['call me ']);
 methods.say.call(fake,'FIXER',['cancelled'],100,30);methods.dialogueCompletion.call(fake,{terminalPrefill:'cancelled'});methods.say.call(fake,'OTHER',['replacement'],100,30);methods.interact.call(fake);methods.interact.call(fake);assert.deepEqual(prefills,['call me '],'replacement cancels prior completion');
 methods.say.call(fake,'FIXER',['stale'],100,30);methods.dialogueCompletion.call(fake,{terminalPrefill:'wrong scene'});const stale=fake.bubble.then;fake.here='yard';stale();assert.deepEqual(prefills,['call me '],'scene changes cannot prefill a stale dialogue');

 const definition:GameplayDefinition={version:1,flags:[],items:[],events:[],commands:{},reactions:[],state:{'test.handle':{owner:'test',lifetime:'save',type:'string',maxLength:40,default:'Ghost'}},conversations:{welcome:{entry:[{node:'hello'}],nodes:{hello:{speaker:'FIXER',pages:['Hello {state:test.handle}'],template:true,completion:{terminalPrefill:'call me '}}}}}};
 let state:GameplayState={flags:{},items:{},tokens:0};const gameplay=new GameplaySession(definition,{read:()=>state,write:s=>{state=s;}}),host=new Element('host'),completed:string[]=[],panels=new Panels(host as never,{label:(key:string)=>key} as never,()=>{}, {},undefined,undefined,cue=>completed.push(cue.terminalPrefill));
 const open=()=>panels.presentConversation(new ConversationSession(gameplay,'welcome'));
 const button=(name:string)=>{const node=host.walk().find(n=>n.tag==='button'&&n.textContent===name);assert(node,name);return node;};
 open();assert.equal(panels.conversationFrame!.pages[0],'Hello Ghost');panels.close();assert.deepEqual(completed,[],'close is cancellation');
 open();const finish=button('talk.unplug');finish.click();finish.click();assert.deepEqual(completed,['call me '],'explicit finish fires once');
 open();finish.click();assert(panels.isOpen,'stale finish cannot close a replacement conversation');assert.deepEqual(completed,['call me ']);panels.close();

 let authored=structuredClone(definition);const editorHost=new Element('editor');const editor=mountGameplayAuthoring(editorHost as never,{document:()=>authored,validate:validateGameplay,onEdit:value=>{authored=value;},undo(){},redo(){},async save(){},async reload(){},dirty:()=>false,saveLabel:'Save'});
 const field=(name:string)=>{const node=editorHost.walk().find(n=>n.attrs.get('aria-label')===name);assert(node,name);return node;};
 const handle=field('State test.handle default');assert.equal(handle.tag,'input');handle.value='Moth';handle.onchange!();assert.equal(authored.state!['test.handle'].default,'Moth');
 const completion=field('Terminal prefill after final page');completion.value='say hello';completion.onchange!();assert.equal(authored.conversations.welcome.nodes.hello.completion!.terminalPrefill,'say hello');
 const template=field('Expand dialogue text templates');template.checked=false;template.onchange!();assert.equal(authored.conversations.welcome.nodes.hello.template,undefined);
 handle.value='x'.repeat(41);handle.onchange!();assert.equal(authored.state!['test.handle'].default,'Moth','invalid string edits retain prior source');editor.dispose();
 console.log('Conversation completion PASS: real bubble final-page/cancel/scene guards; panel completion/cancel/stale guards; string/template/completion typed editor controls and atomic invalid edit.');
}finally{Object.assign(globalThis,{document:originalDocument,cancelAnimationFrame:originalCancel});}
