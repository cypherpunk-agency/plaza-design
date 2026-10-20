import assert from 'node:assert/strict';
import {CommunicationLane,type Notice} from '../../src/ssg/game/ui/communication';
import {Hints} from '../../src/ssg/game/ui/hints';
const note=(id:string,priority=100):Notice=>({id,text:id,tone:'info',source:'system',scope:'scene',duration:1000,priority});
const lane=new CommunicationLane();lane.frame(0);lane.offer(note('reward'));assert.equal(lane.step()?.text,'reward');
assert.equal(lane.offer(note('reward')),false);
lane.frame(100);lane.step();lane.frame(200,true);lane.step();lane.frame(10000);lane.step();
assert.equal(lane.pending,1,'paused and hidden gaps never expire readable feedback');
for(let t=10100;t<=11000;t+=100){lane.frame(t);lane.step();}assert.equal(lane.pending,0,'active time expires without an animation clock');
lane.offer(note('hint',0));lane.step();lane.offer(note('denied',200));assert.equal(lane.step(true)?.text,'denied');
lane.cancel('denied');assert.equal(lane.step(true),null);assert.equal(lane.step(false)?.text,'hint');
lane.sceneChanged();assert.equal(lane.pending,0);
for(let i=0;i<100;i++)lane.offer(note('pulse'+i));assert.ok(lane.pending<=CommunicationLane.capacity);
lane.clear();assert.equal(lane.pending,0);
const seen:string[]=[],hints=new Hints(()=>seen);hints.show('walk','Walk',{sticky:true});assert.equal(hints.step(0)?.text,'Walk');
hints.notify('Purchased','success');assert.equal(hints.step(100)?.text,'Purchased');
hints.notices.frame(0);for(let t=100;t<=5000;t+=100){hints.notices.frame(t);hints.step(t);}
assert.equal(hints.step(5100)?.text,'Walk','status preemption retains unfinished control hint');
hints.done('walk');assert.ok(seen.includes('walk'));assert.equal(hints.step(5200),null);
hints.show('scene-goal','Go there');hints.sceneChanged();assert.equal(hints.step(5300),null);
console.log('Communication PASS: reduced-motion-independent expiry, pause/suspension, priority, dialogue deferral, duplicate collapse, bounds, scene cancellation and hint resumption.');

const completed=['repeat'],repeatHints=new Hints(()=>completed);repeatHints.show('busy','Busy',{sticky:true});repeatHints.step(0);repeatHints.show('repeat','Stale repeated help',{repeat:true});assert(repeatHints.pending('repeat'));repeatHints.done('repeat');assert.equal(repeatHints.pending('repeat'),false,'completed queued help is canceled even if previously seen');
