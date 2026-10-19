import assert from 'node:assert/strict';
import {Feedback,readMs,type Locate} from '../../src/ssg/game/engine/feedback';
import {CommunicationLane,type Notice} from '../../src/ssg/game/ui/communication';
import {Hints} from '../../src/ssg/game/ui/hints';
/** Minimal layout fixture for the actual feedback presenter; no copied queue/timer logic. */
class Element {
 children:Element[]=[];parent:Element|null=null;className='';textContent='';style:Record<string,string>={};clientWidth=960;clientHeight=540;offsetHeight=24;attributes=new Map<string,string>();
 get offsetWidth(){return Math.min(300,Math.max(80,this.textContent.length*6));}get firstElementChild(){return this.children[0]??null;}
 classList={add:(name:string)=>{this.className+=' '+name;}};
 appendChild(child:Element){child.remove();this.children.push(child);child.parent=this;return child;}append(...children:Element[]){children.forEach(c=>this.appendChild(c));}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}
 setAttribute(k:string,v:string){this.attributes.set(k,v);}toggleAttribute(k:string,on:boolean){if(on)this.attributes.set(k,'');else this.attributes.delete(k);}getBoundingClientRect(){return{left:0,top:0,width:960,height:540};}
}
const originalDocument=globalThis.document;globalThis.document={createElement:()=>new Element(),createElementNS:()=>new Element(),getElementById:()=>null} as any;
try{
 const host=new Element(),clock=new CommunicationLane();clock.frame(0);const feedback=new Feedback(host as any,()=>clock.time),locate:Locate=from=>from==='missing'?null:{x:from==='off'?-40:300,y:300,w:32,h:32,off:from==='off'?-1:0};
 const rings=()=>host.children[0].children.filter(e=>e.className.startsWith('fx-ping'));
 feedback.caption('router','Online.','ok',locate);assert.deepEqual(feedback.pending.shown,['Online.']);assert.equal(rings().length,1);
 for(let i=1;i<=100;i++){clock.frame(i*100,true);feedback.caption('router','Online.','ok',locate);feedback.update(locate);}assert.deepEqual(feedback.pending.shown,['Online.']);assert.equal(rings().length,1,'repeats collapse into one ping while paused');assert.equal(clock.time,0);
 // Active readable time expires the original caption even if identical signals keep arriving.
 let wall=10000;while(clock.time<readMs('Online.')+400){wall+=100;clock.frame(wall);if(clock.time<readMs('Online.'))feedback.caption('router','Online.','ok',locate);feedback.update(locate);}assert.deepEqual(feedback.pending.shown,[]);assert.equal(rings().length,0);
 feedback.caption('router','Online.','ok',locate);assert.deepEqual(feedback.pending.shown,['Online.'],'a later independent result can appear again');
 feedback.caption('router','Booting.','dim',locate);feedback.caption('router','Online again.','ok',locate);wall+=200;clock.frame(wall);feedback.update(locate);assert.deepEqual(feedback.pending.shown,['Online again.'],'latest replacement wins during a swap');
 feedback.clear();feedback.caption('off','Remote reply.','err',locate);assert.equal(rings().length,1,'offscreen admission does not duplicate its arrow');assert.ok(rings()[0].className.includes('edge'));feedback.clearPing('off');assert.equal(rings().length,0);
 feedback.clear();let off:-1|0|1=0;const moving:Locate=()=>({x:off<0?-40:off>0?1000:300,y:300,w:32,h:32,off});feedback.ping('moving','look',moving);const element=rings()[0];assert(!element.className.includes('edge'));off=-1;feedback.update(moving);assert(element.className.includes('edge left'));assert.equal(element.textContent,'◀');off=1;feedback.update(moving);assert(element.className.includes('edge right'));assert.equal(element.textContent,'▶');off=0;feedback.update(moving);assert.equal(element.className,'fx-ping look');assert.equal(element.textContent,'');assert.equal(rings().length,1,'crossing edges keeps one live ping');
 feedback.clear();for(let i=0;i<100;i++)feedback.ping('pulse'+i,'look',locate);assert.equal(rings().length,16);feedback.ping('danger','err',locate);for(let i=0;i<100;i++)feedback.ping('noise'+i,'look',locate);assert.equal(rings().length,16);assert.ok(rings().some(e=>e.className==='fx-ping err'),'optional pings cannot evict an alert');
 for(let i=0;i<50;i++)feedback.caption('device'+i,'Reply '+i,'dim',locate);assert.ok(feedback.pending.shown.length<=2);assert.ok(feedback.pending.waiting.length<=8);feedback.caption('urgent','Denied.','err',locate);assert.equal(feedback.pending.waiting[0],'Denied.');feedback.clear();assert.deepEqual(feedback.pending,{shown:[],waiting:[]});assert.equal(rings().length,0);
 feedback.caption('fresh','New scene.','ok',locate);assert.deepEqual(feedback.pending.shown,['New scene.'],'clear resets admission pacing');feedback.clear();feedback.caption('missing','Not anchored.','err',locate);assert.deepEqual(feedback.pending,{shown:[],waiting:[]});
 const lane=new CommunicationLane(),note=(id:string):Notice=>({id,text:id,tone:'info',source:'system',scope:'scene',priority:100,duration:1000});lane.offer(note('current'));lane.step();for(let i=0;i<100;i++)lane.offer(note('waiting'+i));assert.equal(lane.pending,CommunicationLane.capacity,'capacity includes the current notice');
 const hints=new Hints(()=>[]);for(let i=0;i<100;i++)hints.show('hint'+i,'Hint '+i);assert.equal(Array.from({length:100},(_,i)=>hints.pending('hint'+i)).filter(Boolean).length,CommunicationLane.capacity);
 console.log('Device feedback timing PASS: actual presenter pause/readable expiry, repeated caption/ping collapse, latest swaps, offscreen arrows, 16-ping/8-caption-wait bounds, alert priority, scene clear/new admission, missing anchors and exact status/help capacities.');
}finally{globalThis.document=originalDocument;}
