/**
 * The story's generic primitives (story/story-rules.ts, story-shapes.ts): pure rules and the shapes that feed them. The checks run the
 * rules against the SHIPPED data (opening.json, the scenes' `phases` and `wash`, contacts.json, end-card.json), so the opening is
 * exercised as data, and against small variations that a second timeline would author.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {applyCounter,arrivalFor,attentionAim,attentionDue,cardFrame,clockPin,gateFrame,goalHint,triggerFires,triggerStarts,washTone,type Trigger} from '../../src/ssg/game/story/story-rules';
import {validateCue,validateCues,validateExitRule,validateScenePhases,validateWash,validatePhase} from '../../src/ssg/game/story/story-shapes';
import {openingStoryModel} from '../../src/ssg/game/story/opening-source';
import {createContactsModel,validateContacts} from '../../src/ssg/game/story/contacts';
import {validateEndCard,endCardText,END_CARD} from '../../src/ssg/game/story/end-card';

const root=path.resolve('src/ssg/game'),json=(f:string)=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const scene=(id:string)=>json('scenes/'+id+'/scene.json');
const story=openingStoryModel;

// ---- the gate: a timed checkpoint (dots cycle, ok, done)
{const gate=scene('metro').phases.home.barriers['gate-in'].gate;
 assert.equal(gate.verifyFrames,150);assert.equal(gate.okFrames,50);
 let f=gateFrame(gate,0);assert.equal(f.ok,false);assert.equal(f.done,false);assert.equal(f.bare,'TURNSTILE: verifying');assert.equal(f.text,'TURNSTILE: verifying.  ');
 assert.equal(gateFrame(gate,20).text,'TURNSTILE: verifying.. ');assert.equal(gateFrame(gate,40).text,'TURNSTILE: verifying...');assert.equal(gateFrame(gate,60).text,'TURNSTILE: verifying.  ');
 f=gateFrame(gate,149);assert.equal(f.ok,false);f=gateFrame(gate,150);assert.equal(f.ok,true);assert.equal(f.text,gate.ok);assert.equal(f.done,false);assert.equal(gateFrame(gate,199).done,false);assert.equal(gateFrame(gate,200).done,true);
 // a second checkpoint with other words and other times uses the same rule
 const other={verifying:'CLOCK OUT: checking',ok:'CLOCK OUT: ok.',verifyFrames:30,okFrames:10,dotEvery:10};
 assert.equal(gateFrame(other,10).text,'CLOCK OUT: checking.. ');assert.equal(gateFrame(other,30).text,'CLOCK OUT: ok.');assert.equal(gateFrame(other,40).done,true);}

// ---- the card: fade out, the card with two readings, fade in; the sleep and a wait are the same card
{const card=story.CARDS.sleep;assert.deepEqual([card.out,card.card,card.in],[50,110,50]);
 let f=cardFrame(card,0);assert.equal(f.dark,0);assert.equal(f.showing,false);assert.equal(f.stage,'out');assert.equal(f.mid,false);
 assert.equal(cardFrame(card,25).dark,.5);
 f=cardFrame(card,50);assert.equal(f.dark,1);assert.equal(f.showing,true);assert.equal(f.fade,0);assert.equal(f.reading,'from');assert.equal(f.stage,'card');
 assert.equal(cardFrame(card,104).mid,false);f=cardFrame(card,105);assert.equal(f.mid,true);assert.equal(f.reading,'to');assert.equal(f.fade,1);
 assert.equal(cardFrame(card,80).fade,1,'the reading is fully lit through the middle of its half');
 assert.equal(cardFrame(card,160).showing,true,'the card is still up on its last frame');f=cardFrame(card,161);assert.equal(f.stage,'in');assert.equal(f.showing,false);assert.equal(cardFrame(card,185).dark,.5);
 assert.equal(cardFrame(card,209).done,false);assert.equal(cardFrame(card,210).done,true);
 // the wait card has no cues of its own: the loop builds {advance} for it
 assert.deepEqual(card.mid!.map(c=>Object.keys(c)[0]),['milestone','stage','counter','counter']);assert.deepEqual(card.end!.map(c=>Object.keys(c)[0]),['counter','say']);}

// ---- counters and triggers
{const morning=story.TRIGGERS.find(t=>t.id==='morning')!,jack=story.TRIGGERS.find(t=>t.id==='jack')!;
 const at={phase:'deleted',scene:'capsule',clock:5000,counters:{} as Record<string,number>,bubble:false,popup:false,viewing:null as string|null};
 assert.deepEqual(triggerStarts(story.TRIGGERS,'deleted','capsule',{}),['morning.at'],'the morning starts counting the first frame it is watched');
 assert.deepEqual(triggerStarts(story.TRIGGERS,'deleted','capsule',{'morning.at':10}),[]);assert.deepEqual(triggerStarts(story.TRIGGERS,'flat','capsule',{}),[]);assert.deepEqual(triggerStarts(story.TRIGGERS,'deleted','downtown',{}),[]);
 assert.equal(triggerFires(morning,at),false,'nothing has happened yet');
 const tried={...at,counters:{'morning.at':4900,'morning.tries':1}};assert.equal(triggerFires(morning,tried),false,'one failed try is not enough');
 const twice={...at,counters:{'morning.at':4900,'morning.tries':2}};assert.equal(triggerFires(morning,twice),true,'two failed tries');
 assert.equal(triggerFires(morning,{...twice,bubble:true}),false,'waits for the talk to end');assert.equal(triggerFires(morning,{...twice,popup:true}),false,'waits for the popup to close');
 assert.equal(triggerFires(morning,{...twice,counters:{...twice.counters,'morning.last':4950}}),false,'waits out the quiet after the last try');
 assert.equal(triggerFires(morning,{...twice,counters:{...twice.counters,'morning.last':4899}}),true,'strictly more than the quiet frames');assert.equal(triggerFires(morning,{...twice,counters:{...twice.counters,'morning.last':4900}}),false);
 assert.equal(triggerFires(morning,{...at,counters:{'morning.due':1}}),true,'mail read');
 assert.equal(triggerFires(morning,{...at,clock:1500,counters:{'morning.at':0}}),false);assert.equal(triggerFires(morning,{...at,clock:1501,counters:{'morning.at':0}}),true,'waiting long enough');
 assert.equal(triggerFires(morning,{...twice,counters:{...twice.counters,'morning.sent':1}}),false,'fires once');
 assert.equal(triggerFires(morning,{...twice,phase:'uplinked'}),false);assert.equal(triggerFires(morning,{...twice,scene:'downtown'}),false);
 assert.equal(triggerFires(jack,{...at,phase:'uplinked'}),false,'jacking in needs the schematic open');assert.equal(triggerFires(jack,{...at,phase:'uplinked',viewing:'router'}),false);assert.equal(triggerFires(jack,{...at,phase:'uplinked',viewing:'pc'}),true);
 // a trigger with no tests fires whenever the rest holds
 const plain:Trigger={id:'x',phase:'p',scene:'s',do:[]};assert.equal(triggerFires(plain,{...at,phase:'p',scene:'s'}),true);
 // counters
 const c:Record<string,number>={};applyCounter(c,{id:'a.n'},7);applyCounter(c,{id:'a.n',add:2},7);assert.equal(c['a.n'],3);applyCounter(c,{id:'a.at',stamp:true},42);assert.equal(c['a.at'],42);applyCounter(c,{id:'b.n'},7);
 applyCounter(c,{prefix:'a',reset:true},7);assert.deepEqual(c,{'b.n':1},'a prefix reset clears the group and nothing else');}

// ---- the clock pin: what the story holds the clock at, and what it lets go to
{assert.deepEqual(clockPin({pinned:true,minute:341,wasPinned:false,releaseMinute:582}),{kind:'hold',minute:341});
 assert.deepEqual(clockPin({pinned:true,minute:null,wasPinned:true,releaseMinute:582}),{kind:'hold',minute:null},'pinned in a scene that names no time: keep the minute it is');
 assert.deepEqual(clockPin({pinned:false,minute:null,wasPinned:true,releaseMinute:582}),{kind:'release',minute:582});
 assert.deepEqual(clockPin({pinned:false,minute:null,wasPinned:false,releaseMinute:582}),{kind:'free'});
 const times=Object.fromEntries(['train','metro','downtown','capsule'].map(id=>[id,Object.fromEntries(Object.entries(scene(id).phases).map(([p,v]:[string,any])=>[p,v.time]))]));
 assert.equal(times.train.home,'05:41');assert.equal(times.metro.home,'06:12');assert.equal(times.downtown.home,'06:14');assert.equal(times.capsule.flat,'06:20');assert.equal(times.capsule.deleted,'09:40');assert.equal(times.capsule.uplinked,'09:42');
 const release=story.CLOCK.release;assert.equal(times[release.scene][release.phase],'09:42','the clock is let go to the time the release scene names');
 assert.equal(story.isPinned({[story.OPENING.home]:true}),true);assert.equal(story.isPinned({[story.OPENING.home]:true,[story.OPENING.uplink]:true}),false,'pinned only until the uplink');}

// ---- attention
{assert.equal(story.ATTENTION.after,1200);assert.equal(attentionDue(1300,100,1200),false);assert.equal(attentionDue(1301,100,1200),true);
 const def={exits:[{id:'c',x:500}]};
 assert.deepEqual(attentionAim({door:true},def,850,()=>undefined,[100,900]),{x:900},'the nearest train door');assert.deepEqual(attentionAim({door:true},def,150,()=>undefined,[100,900]),{x:100});
 assert.deepEqual(attentionAim({exit:'c'},def,0,()=>undefined),{x:500});assert.equal(attentionAim({exit:'zzz'},def,0,()=>undefined),null);
 assert.deepEqual(attentionAim({device:'pc'},def,0,()=>undefined),{device:'pc'});
 assert.deepEqual(attentionAim({target:'bed'},def,0,id=>id==='bed'?64:undefined),{x:64});assert.equal(attentionAim({target:'bed'},def,0,()=>undefined),null);
 const capsule=scene('capsule').phases;assert.deepEqual(capsule.flat.ping,{target:'bed'});assert.deepEqual(capsule.deleted.ping,{device:'pc'});assert.deepEqual(scene('train').phases.home.ping,{door:true});}

// ---- the stage light cue
{const wash=scene('capsule').wash,door=(open:boolean)=>(key:string)=>key==='doorOpen'?open:undefined;
 assert.equal(washTone(wash,{phase:'flat',flags:{},state:door(false)}),'warm');
 assert.equal(washTone(wash,{phase:'deleted',flags:{[story.OPENING.slept]:true},state:door(false)}),'cold');assert.equal(washTone(wash,{phase:'free',flags:{[story.OPENING.slept]:true},state:door(false)}),'cold','after jacking in the room stays cold while the door is shut');
 assert.equal(washTone(wash,{phase:'free',flags:{[story.OPENING.slept]:true},state:door(true)}),null,'the door is yours again: no wash');assert.equal(washTone(wash,{phase:'home',flags:{},state:door(false)}),null);
 assert.equal(washTone(undefined,{phase:'flat',flags:{},state:door(false)}),null,'a scene without rules has no wash');}

// ---- arrival
{const rows=scene('downtown').phases.free.arrival,base={flags:{} as Record<string,boolean>,touch:false,rain:0,companion:null as string|null};
 const first=arrivalFor(rows,base)!;assert.deepEqual(first.set,['arrived','schematics']);assert.equal(first.speaker,'YOU');assert.equal(first.pages[0],'Downtown. Neon, wet streets, and nobody who sees me.');assert.equal(first.pages[1],'The noodle stall is still lit. Worth a try.');assert.equal(first.pages.length,3);
 assert.equal(arrivalFor(rows,{...base,rain:.25})!.pages[0],'Downtown. Rain, neon, and nobody who sees me.');assert.equal(arrivalFor(rows,{...base,rain:.2})!.pages[0],'Downtown. Neon, wet streets, and nobody who sees me.','the threshold is strictly more');
 assert.deepEqual(arrivalFor(rows,{...base,companion:'Pixel comes along.'})!.pages.slice(0,3),['Downtown. Neon, wet streets, and nobody who sees me.','Pixel comes along.','The noodle stall is still lit. Worth a try.'],'the companion greets after the weather');
 assert.notDeepEqual(arrivalFor(rows,{...base,touch:true})!.pages.at(-1),first.pages.at(-1),'touch has its own how-to');
 const again=arrivalFor(rows,{...base,flags:{arrived:true}})!;assert.deepEqual(again.set,['schematics']);assert.equal(again.pages[0],'My deck sees this street differently now.');
 assert.equal(arrivalFor(rows,{...base,flags:{arrived:true,schematics:true}}),null);assert.equal(arrivalFor(undefined,base),null);}

// ---- goal hints
{const rules=story.GOAL_HINTS,hint=rules[0],done=(goals:string[])=>(s:string)=>s===hint.afterScene?new Set(goals):new Set<string>();
 const at=(over:Partial<Parameters<typeof goalHint>[1]>)=>({hackLocked:false,scene:'downtown',programs:[] as string[],goalsDone:done([hint.afterGoal]),goalsLeft:()=>false,...over});
 assert.equal(goalHint(rules,at({})),hint.line);assert.equal(goalHint(rules,at({hackLocked:true})),null);assert.equal(goalHint(rules,at({programs:[hint.program]})),null,'once you own the program');
 assert.equal(goalHint(rules,at({scene:hint.exceptScene})),null,'not in the scene it points to');assert.equal(goalHint(rules,at({goalsDone:done([])})),null,'until the earlier goal is done');
 assert.equal(goalHint(rules,at({scene:hint.afterScene,goalsLeft:()=>true})),null,'not while that scene still has goals open');assert.equal(goalHint(rules,at({scene:hint.afterScene,goalsLeft:()=>false})),hint.line);}

// ---- persona: who you are while the phase has one
{const home={[story.OPENING.home]:true},free={...home,[story.OPENING.jacked]:true};
 assert.equal(story.persona(home)?.name,'courier');assert.equal(story.persona(home)?.calmWeather,true);assert.equal(Object.keys(story.persona(home)!.deck.files).length>0,true);assert.equal(story.persona(free),undefined);}

// ---- shapes: what a source may say
{const bad=(f:()=>void,m:RegExp)=>assert.throws(f,m);
 validateCue({milestone:'flat'},'c');validateCue({sound:'granted'},'c');validateCue({advance:30},'c');validateCue({stage:{scene:'capsule',reset:true,face:-1}},'c');validateCue({counter:{id:'a.b',stamp:true}},'c');validateCue({counter:{prefix:'a',reset:true}},'c');
 bad(()=>validateCue({milestone:'x',sound:'granted'},'c'),/exactly one cue kind/);bad(()=>validateCue({teleport:1},'c'),/unknown cue kind/);bad(()=>validateCue({sound:'boom'},'c'),/registered sound/);bad(()=>validateCue({stage:{scene:'x',face:0}},'c'),/face/);bad(()=>validateCue({counter:{id:'a',stamp:true,add:1}},'c'),/stamp or add/);bad(()=>validateCue({say:{speaker:'A',pages:[],height:1}},'c'),/page/);
 bad(()=>validateCues(new Array(30).fill({sound:'blip'}),'c'),/bounded array/);
 validateExitRule({say:{name:'A',pages:['x']}},'e');validateExitRule({react:'dev',line:['','x','err'],cues:[{counter:{id:'a.b'}}]},'e');
 bad(()=>validateExitRule({say:{name:'A',pages:['x']},react:'d',line:['','x']},'e'),/one registered exit handler/);bad(()=>validateExitRule({gate:{verifying:'a',ok:'b',verifyFrames:1,okFrames:1,dotEvery:1}},'e'),/unknown or missing/);bad(()=>validateExitRule({gate:{verifying:'a',ok:'b',verifyFrames:0,okFrames:1,dotEvery:1,then:[]}},'e'),/bounded finite/);
 validateExitRule({acknowledge:{speaker:'A',pages:['x'],height:10,then:[{milestone:'m'}]}},'e');
 validatePhase({time:'06:00',goal:'g',ping:{door:true},ride:{mover:'train.car',path:'home'}},'p');bad(()=>validatePhase({time:'6:00'},'p'),/HH:MM/);bad(()=>validatePhase({ping:{door:true,exit:'x'}},'p'),/one registered ping/);bad(()=>validatePhase({unknown:1},'p'),/unknown or missing/);bad(()=>validatePhase({ride:{mover:'train',path:'home'}},'p'),/device.noun/);
 bad(()=>validatePhase({targets:{bed:{label:'x',promptH:1}}},'p'),/exactly one point or scene binding/);validatePhase({targets:{bed:{label:'x',promptH:1,x:5,card:'sleep'}}},'p');
 validatePhase({arrival:[{unless:'a',speaker:'Y',height:1,pages:['x',{text:'t',rain:true},{companion:true}]},{speaker:'Y',height:1,pages:['x']}]},'p');bad(()=>validatePhase({arrival:[{speaker:'Y',height:1,pages:['x']},{speaker:'Y',height:1,pages:['x']}]},'p'),/must be last/);
 bad(()=>validateScenePhases({},'phases'),/one to sixteen/);bad(()=>validateScenePhases({'bad phase':{}},'phases'),/phase identifier/);validateScenePhases({anything:{}},'phases');
 validateWash([{phase:'flat',tone:'warm'},{flag:'f',unlessState:'s',tone:'cold'}]);bad(()=>validateWash([{tone:'green'}]),/tone/);bad(()=>validateWash([]),/at least one/);}

// ---- the documents the shipped game reads
{const contacts=createContactsModel(json('data/contacts.json'));
 assert.deepEqual(contacts.contactsOf({}).map(c=>c.id),[]);const flags={'contact:moth':true,'act1:done':true};assert.deepEqual(contacts.contactsOf(flags).map(c=>c.id),['moth']);
 const moth=contacts.contactsOf(flags)[0];assert.equal(contacts.messagesOf(moth,flags).length,1);assert.equal(contacts.messagesOf(moth,{...flags,'moth:dark':true}).length,0,'no signal holds new messages back');
 assert.equal(contacts.unread(flags).length,1);assert.equal(contacts.unread({...flags,[contacts.readFlag(moth.messages[0])]:true}).length,0,'read is a flag');
 assert.equal(contacts.INBOX.announce.contact,'moth');assert.throws(()=>validateContacts({...json('data/contacts.json'),INBOX:{...json('data/contacts.json').INBOX,announce:{...json('data/contacts.json').INBOX.announce,contact:'nobody'}}}),/unknown contact/);
 assert.throws(()=>validateContacts({...json('data/contacts.json'),CONTACTS:[...json('data/contacts.json').CONTACTS,json('data/contacts.json').CONTACTS[0]]}),/duplicate contact/);
 const card=endCardText(END_CARD,{controlled:7,handle:'neo'});assert.equal(card.title,'END OF TRANSMISSION');assert.equal(card.lines[0],'Downtown cleared. Nodes that answer to you: 7. You are still a ghost, neo.');assert.equal(card.lines.length,2);assert.equal(card.prompt,'ENTER keep exploring · ESC menu');
 assert.throws(()=>validateEndCard({version:1,END:{title:'t',lines:['{nope}'],prompt:'p'}}),/unknown token/);assert.throws(()=>validateEndCard({version:1,END:{title:'t',lines:[],prompt:'p'}}),/at least one line/);}
console.log('Story rules PASS: checkpoint gate, card, counters and triggers, clock pin, attention, stage light, arrival, goal hints, persona, shapes, contacts and the END card, all against the shipped opening data.');
process.exit(0);
