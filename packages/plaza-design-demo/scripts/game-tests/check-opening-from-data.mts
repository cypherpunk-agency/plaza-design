/**
 * The opening plays from story data alone. The game loop (runtime/game.ts) holds no opening controller: it applies story-rules.ts
 * primitives to source data (opening.json, the scenes' `phases`). This check
 *  - reads the shipped sources and proves the old controller fields are gone and each scene carries its own phases;
 *  - runs the REAL loop methods (storyExit, updateStory, startCard, runCues) on a second timeline authored only as data
 *    (shift -> commute -> rest), which needs no loop code;
 *  - proves the source set rejects names a scene or the story does not have, atomically.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Game} from '../../src/ssg/game/runtime/game';
import {newSave} from '../../src/ssg/game/runtime/save';
import {createOpeningModel,openingStoryModel} from '../../src/ssg/game/story/opening-source';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';

const root=path.resolve('src/ssg/game'),read=(f:string)=>fs.readFileSync(path.join(root,f),'utf8'),json=(f:string)=>JSON.parse(read(f));

// ---- the shipped sources: the controller's fields are gone, each scene carries its own phases
{const opening=json('story/opening.json');
 assert.deepEqual(Object.keys(opening),['version','OPENING','OPENING_LEVELS','PHASES','PHASE_RULES','START','ATTENTION','CLOCK','CARDS','TRIGGERS','GOAL_HINTS','GAMEPLAY','WORKFLOWS']);
 for(const gone of ['OPENING_TIME','OPENING_GOAL','OPENING_INTRO','OPENING_LINES','OPENING_EVERYDAY','OPENING_EXITS','OPENING_TARGETS','OPENING_PINGS','IDLE_PING','HOME_RUN','TURNSTILE','SLEEP','MORNING','WAKE_LINES','MOTH_MESSAGE','UPLINK_LINES','DECK_BEFORE','CONTROLLER'])assert(!(gone in opening),gone+' moved into data the loop reads through story-rules');
 assert(!/homeRun|HOME_RUN/.test(JSON.stringify(opening)),'the home run is the Train mover\'s home path');
 const withPhases=fs.readdirSync(path.join(root,'scenes')).filter(d=>fs.existsSync(path.join(root,'scenes',d,'scene.json'))&&json('scenes/'+d+'/scene.json').phases).sort();
 assert.deepEqual(withPhases,['capsule','downtown','metro','train']);
 for(const id of withPhases)for(const phase of Object.keys(json('scenes/'+id+'/scene.json').phases))assert(phase in opening.PHASES,id+' names the story phase '+phase);
 const train=json('scenes/train/scene.json').phases.home.ride;assert.deepEqual(train,{mover:'train.car',path:'home'});
 const cars=json('scenes/train/devices.json').devices.find((d:any)=>d.id==='train').nouns.find((n:any)=>n.id==='car');assert(cars.mover.paths.home,'the scripted ride is a path of the Train mover');
 assert(sourceDocuments.some(d=>d.id==='contacts'&&d.file==='data/contacts.json'));assert(sourceDocuments.some(d=>d.id==='end-card'&&d.file==='story/end-card.json'));
 assert(!fs.existsSync(path.join(root,'story/contacts.ts'))||!/export const CONTACTS: Contact\[\] = \[/.test(read('story/contacts.ts')),'contacts are a document, not a TypeScript list');}

// ---- the loop holds no opening controller
{const game=read('runtime/game.ts');
 for(const token of ['OPENING_TIME','OPENING_GOAL','OPENING_INTRO','OPENING_LINES','OPENING_EVERYDAY','OPENING_EXITS','OPENING_TARGETS','OPENING_PINGS','CONTROLLER','HOME_RUN','homeRun','TURNSTILE','mothWrites','morningFlat','wakeUp','rideHome','sleepNow','pick(this.openingStory','isBefore','DECK_BEFORE','IDLE_PING','WAKE_LINES','UPLINK_LINES','MOTH_MESSAGE','capsuleController','CONCIERGE','concierge','turnstile'])assert(!game.includes(token),'runtime/game.ts must not contain '+token);
 assert(!/this\.story\s*===\s*'/.test(game)&&!/st\s*===\s*'/.test(game),'the loop never compares a story phase name');
 assert(!/this\.morning\b/.test(game),'the morning is counters the source names');
 assert.equal((game.match(/this\.sleep\s*=\s*\{/g)??[]).length,1,'one place starts a card transition (the sleep and a wait are the same card)');
 assert.equal((game.match(/this\.beat\s*=\s*\{/g)??[]).length,1,'one place starts a checkpoint gate');
 for(const word of ['setTimeout','setInterval'])assert(!new RegExp('\\b'+word+'\\(').test(read('story/story-rules.ts')),'story-rules.ts schedules nothing');
 assert(!/class\s+\w+/.test(read('story/story-rules.ts'))&&!/class\s+\w+/.test(read('story/story-shapes.ts')),'story primitives are functions, not controller classes');}

// ---- a second timeline, authored as data, driven by the real loop methods
{const flagOf=(m:string)=>({clockout:'opening:street',arrive:'opening:flat',slept:'opening:slept'}as Record<string,string>)[m]??'opening:'+m;
 const source=structuredClone(json('story/opening.json'));
 source.PHASES={shift:{hackLocked:true,pinned:true,resume:[{destination:{scene:'yard'}}]},commute:{hackLocked:true,pinned:true,resume:[{destination:{scene:'train'}}]},rested:{hackLocked:true,pinned:false,resume:[{destination:{scene:'home'}}]},ending:{hackLocked:false,pinned:false,resume:[]}};
 source.PHASE_RULES=[{when:{flag:'opening:slept'},phase:'ending'},{when:{flag:'opening:flat'},phase:'rested'},{when:{flag:'opening:street'},phase:'commute'},{phase:'shift'}];
 source.WORKFLOWS={...source.WORKFLOWS,clockout:'opening.street',arrive:'opening.flat'};
 source.CARDS={rest:{out:10,card:20,in:10,from:'23:00',to:'06:00',label:'HOME',mid:[{milestone:'slept'},{stage:{scene:'home',reset:true,face:-1}},{counter:{prefix:'night',reset:true}},{counter:{id:'night.at',stamp:true}}],end:[{say:{speaker:'YOU',pages:['Another day.'],height:40}}]}};
 source.TRIGGERS=[{id:'ride',phase:'commute',scene:'train',start:'ride.at',once:'ride.done',when:[{counter:'ride.stops',atLeast:2},{elapsed:'ride.at',frames:100}],do:[{counter:{id:'ride.done'}},{milestone:'arrive'},{print:{lines:['arrived'],prefix:'> '}},{say:{speaker:'TRAIN',pages:['Last stop.'],height:50}},{say:{speaker:'YOU',pages:['Finally.'],touchPages:['Finally, tap.'],height:40}}]}];
 source.GOAL_HINTS=[];source.CLOCK={release:{phase:'rested',scene:'home'}};source.OPENING_LEVELS=[];
 const model=createOpeningModel(source);
 const calls:string[]=[],printed:string[]=[],travels:any[]=[],resets:string[]=[],entered:string[]=[];
 const g:any=Object.create(Game.prototype);
 Object.assign(g,{sources:{openingStory:model},save:newSave(),here:'yard',clock:0,counters:{},bubble:null,beat:null,sleep:null,touch:false,keys:new Set(['ArrowRight']),p:{x:50,y:0,vy:0,onGround:true,face:1},
  term:{print:(t:string)=>printed.push(t)},persistSave(){},syncHud(){},hasScene:()=>true,travel:(...a:any[])=>{travels.push(a);g.here=a[0];},
  runOpeningWorkflow:(m:string)=>{calls.push(m);g.save.flags[flagOf(m)]=true;return true;},
  enter:(id:string)=>{entered.push(id);g.here=id;},hostOf:(id:string)=>({reset:()=>resets.push(id)}),sceneDefinition:()=>({spawn:42}),companionBody:{place(){}}});
 Object.defineProperty(g,'zh',{value:{popupOpen:false,viewing:null,closeAll(){},model:{}},configurable:true});
 Object.defineProperty(g,'def',{get:()=>({phases:{},perch:undefined}),configurable:true});
 const gate={gate:{verifying:'CLOCK OUT: checking',ok:'CLOCK OUT: ok.',verifyFrames:30,okFrames:10,dotEvery:10,begin:[{sound:'blip'}],then:[{sound:'granted'},{milestone:'clockout'}]}};
 assert.equal(g.story,'shift');
 // the gate: the player is held, the beat is timed in frames, then the milestone runs and the way opens
 assert.equal(g.storyExit(gate,120,{to:'train'},undefined,'exit:gate'),true);assert.equal(g.keys.size,0,'a checkpoint stops the player');assert.equal(g.beat.start,0);
 for(let f=1;f<=39;f++){g.clock=f;g.updateStory();assert(g.beat,'still verifying at frame '+f);assert.equal(travels.length,0);}
 g.clock=40;g.updateStory();assert.equal(g.beat,null);assert.deepEqual(calls,['clockout']);assert.deepEqual(travels,[['train',undefined]]);assert.equal(g.story,'commute');
 // the trigger: stamped the first frame it is watched, fires after the elapsed frames, once, and speaks in chain
 assert.equal(g.here,'train');assert.equal(g.counters['ride.at'],40,'stamped the frame the player arrives and the trigger starts watching');assert.deepEqual(calls,['clockout']);
 g.clock=50;g.updateStory();assert.equal(g.counters['ride.at'],40,'the stamp is kept');
 g.clock=140;g.updateStory();assert.deepEqual(calls,['clockout'],'exactly the elapsed frames is not more');
 g.clock=141;g.updateStory();assert.deepEqual(calls,['clockout','arrive']);assert.equal(g.counters['ride.done'],1);assert(printed.includes('> arrived'),'the deck line');assert.equal(printed.at(-1),'TRAIN: Last stop.');assert.equal(g.bubble.name,'TRAIN');assert.deepEqual(g.bubble.pages,['Last stop.']);
 assert.equal(typeof g.bubble.then,'function');g.bubble.then();assert.equal(g.bubble.name,'YOU');assert.deepEqual(g.bubble.pages,['Finally.']);g.bubble=null;
 g.clock=142;g.updateStory();assert.deepEqual(calls,['clockout','arrive'],'fires once');assert.equal(g.story,'rested');
 // the touch variant of a say is chosen when the loop speaks it
 g.touch=true;g.sayChain([{speaker:'YOU',pages:['Desktop.'],touchPages:['Touch.'],height:1}]);assert.deepEqual(g.bubble.pages,['Touch.']);g.touch=false;g.bubble=null;
 // the card: dark, the middle runs its cues once, light again runs the end; a counter reset clears the group
 g.counters={'night.x':3,'keep':1};g.clock=200;g.startCard(model.CARDS.rest,true);assert.equal(g.sleep.start,200);
 for(let f=201;f<=204;f++){g.clock=f;g.updateStory();}assert.deepEqual(calls,['clockout','arrive'],'the middle has not come');
 g.clock=219;g.updateStory();assert.deepEqual(calls,['clockout','arrive'],'one frame before the middle');g.clock=220;g.updateStory();assert.deepEqual(calls,['clockout','arrive','slept'],'at the middle of the card');assert.deepEqual(entered,['home'],'the player is brought to the scene');assert.deepEqual(resets,['home']);assert.deepEqual(g.p,{x:42,y:0,vy:0,onGround:true,face:-1});assert.deepEqual(g.counters,{'keep':1,'night.at':220});assert.equal(g.story,'ending');
 g.clock=221;g.updateStory();assert.deepEqual(resets,['home'],'the middle runs once');assert.equal(g.bubble,null);
 g.clock=240;g.updateStory();assert.equal(g.sleep,null);assert.deepEqual(g.bubble.pages,['Another day.']);
 // a stage cue for another scene enters it first
 g.runCues([{stage:{scene:'yard'}}]);assert.deepEqual(entered,['home','yard']);
 // a refused milestone ends the list and nothing after it speaks
 g.runOpeningWorkflow=()=>false;g.bubble=null;assert.equal(g.runCues([{milestone:'clockout'},{say:{speaker:'A',pages:['no'],height:1}}]),false);assert.equal(g.bubble,null);}

// ---- the source set rejects names a scene or the story does not have, atomically
{const docs=()=>new Map(sourceDocuments.map(d=>[d.id,structuredClone(json(d.file))]));
 validateSourceDocuments(docs());
 const rejects=(label:string,mutate:(d:Map<string,any>)=>void,message:RegExp)=>{const d=docs();mutate(d);assert.throws(()=>validateSourceDocuments(d),message,label);};
 rejects('ping to an exit the scene lacks',d=>{d.get('capsule-scene').phases.flat.ping={exit:'nowhere'};},/unknown exit/);
 rejects('a target card the story lacks',d=>{d.get('capsule-scene').phases.flat.targets.bed.card='nap';},/unknown card/);
 rejects('a phase the story lacks',d=>{d.get('metro-scene').phases.nonsense=d.get('metro-scene').phases.home;},/unknown phase/);
 rejects('a ride path the mover lacks',d=>{d.get('train-scene').phases.home.ride.path='nowhere';},/unknown mover path/);
 rejects('a trigger device the scene lacks',d=>{d.get('opening-story').TRIGGERS[1].viewing='nowhere';},/unknown device/);
 rejects('a milestone the story lacks',d=>{d.get('opening-story').CARDS.sleep.mid[0].milestone='nowhere';},/unknown milestone/);
 rejects('a stage scene the registry lacks',d=>{d.get('opening-story').CARDS.sleep.mid[1].stage.scene='nowhere';},/unknown scene/);
 rejects('an exit rule for an exit the scene lacks',d=>{d.get('downtown-scene').phases.home.exits.nowhere={say:{name:'A',pages:['x']}};},/unknown exit/);
 rejects('a chip for a device the scene lacks',d=>{d.get('capsule-scene').phases.flat.everyday.nowhere=[{label:'look',say:['','x']}];},/unknown device or node/);
 rejects('a wash for a state the scene lacks',d=>{d.get('capsule-scene').wash[1].unlessState='nowhere';},/unknown state/);
 rejects('an unknown story hint program',d=>{d.get('opening-story').GOAL_HINTS[0].program='nowhere.so';},/unknown program/);
 rejects('a level card the story lacks',d=>{d.get('opening-story').OPENING_LEVELS[1].end='nowhere';},/unknown card/);
 rejects('a contact the inbox lacks',d=>{d.get('contacts').INBOX.announce.contact='nobody';},/unknown contact/);
 // a phase can be added to a scene by data alone, and removed again
 const d=docs();d.get('shop-scene').phases={free:{goal:'Buy a noodle bowl.'}};validateSourceDocuments(d);}
console.log('Opening from data PASS: no controller in the loop, a second timeline (gate, trigger, card, counters) runs through the real loop methods, and the source set rejects unknown names.');
process.exit(0);
