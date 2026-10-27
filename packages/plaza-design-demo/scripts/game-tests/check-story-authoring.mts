/**
 * Everything the story can say or do is editable in the editor and saves: the typed controls of Game settings and Story logic (the phases,
 * cards, triggers, hints, each scene's part in each phase, contacts, the END card) and of Scene › Story phases. Each edit goes through the
 * pending-source validation of the whole set (a bad name is refused and nothing changes), the edited source drives the compiled scenes
 * and the story model, and a protected save writes it.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {art} from '../../src/ssg/game/art';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {pendingDestinations} from '../../src/ssg/game/authoring/pending-destinations';
import {mountGameSettingsAuthoring} from '../../src/ssg/game/authoring/game-settings-authoring';
import {mountStoryLogicAuthoring} from '../../src/ssg/game/authoring/story-logic-authoring';
import {mountSceneAuthoring} from '../../src/ssg/game/authoring/scene-authoring';
import {pendingOpeningStory} from '../../src/ssg/game/authoring/pending-opening';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {validateContacts} from '../../src/ssg/game/story/contacts';
import {validateEndCard} from '../../src/ssg/game/story/end-card';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';

const root=path.resolve('src/ssg/game'),originals=sourceDocuments.map(d=>({id:d.id,kind:d.kind,revision:'fixture',value:JSON.parse(fs.readFileSync(path.join(root,d.file),'utf8'))}));
const values=(all:{id:string;value:unknown}[])=>new Map(all.map(d=>[d.id,d.value]));
const make=()=>{const m=new ComposerModel(art,createSequenceValidationContext(art,{},pendingDestinations(values(originals))),(d,all)=>{if(d.id==='opening-story')pendingOpeningStory(values(all));else if(d.id==='contacts')validateContacts(d.value);else if(d.id==='end-card')validateEndCard(d.value);},[],all=>pendingDestinations(values(all)));m.load(structuredClone(originals));return m;};
const model=make();
class Element{children:Element[]=[];attributes:Record<string,string>={};value='';checked=false;disabled=false;textContent='';open=false;onchange?:()=>void;onclick?:()=>void;ontoggle?:()=>void;append(...n:Element[]){this.children.push(...n);}appendChild(n:Element){this.children.push(n);return n;}replaceChildren(...n:Element[]){this.children=[...n];}setAttribute(k:string,v:string){this.attributes[k]=v;}remove(){}}
const previous=globalThis.document;(globalThis as any).document={createElement:()=>new Element()};
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
function ui(mount:(host:any,context:any)=>any,extra:(context:any)=>void=()=>{}){
 const host=new Element(),context:any={documents:model.list(),authoring:{get:(id:string)=>model.get(id),edit:(id:string,label:string,value:unknown)=>{model.edit(id,label,()=>value);context.documents=model.list();},undo(){model.undo();},redo(){model.redo();},save:async()=>{},reload:async()=>{},dirty:()=>model.dirty()}};extra(context);
 const mounted=mount(host,context),clear=()=>{for(const e of all(host))if(e.attributes.role==='alert')e.textContent='';},error=()=>all(host).filter(e=>e.attributes.role==='alert').map(e=>e.textContent).filter(Boolean).join('; ');
 const field=(name:string)=>all(host).find(e=>e.attributes['aria-label']===name),has=(name:string)=>!!field(name)||all(host).some(e=>e.textContent===name&&e.onclick);
 const change=(name:string,value:string|boolean,valid=true)=>{clear();const e=field(name);assert(e,'control '+name);if(typeof value==='boolean')e.checked=value;else{if(e.children.length)assert(e.children.some(o=>o.value===value),name+' offers '+value);e.value=value;}e.onchange!();if(valid)assert(!error(),name+': '+error());else assert(error(),name+' must be refused');};
 const click=(name:string,valid=true)=>{clear();const e=all(host).find(e=>e.textContent===name&&e.onclick);assert(e,'button '+name);assert(!e.disabled);e.onclick!();if(valid)assert(!error(),name+': '+error());else assert(error(),name+' must be refused');};
 return{host,context,mounted,change,click,has,field,error};
}
const doc=(id:string)=>model.get(id).value as any;
try{
 let panel=ui(mountStoryLogicAuthoring);
 // every group renders its controls
 for(const group of ['Workflows','Phases','Cards','Triggers']){panel.change('Story logic group',group);assert(!panel.error(),group+': '+panel.error());}
 // ---- milestones are open names for system commands
 panel.change('Story logic group','Workflows');panel.change('New opening milestone name','clockout');panel.click('Add opening milestone');assert.equal(typeof doc('opening-story').WORKFLOWS.clockout,'string');panel.click('Remove opening milestone clockout');assert.equal(doc('opening-story').WORKFLOWS.clockout,undefined);assert(!panel.has('Remove opening milestone home'),'a new game needs its home milestone');
 // ---- the story: cards, triggers, timing
 const settings=ui(mountGameSettingsAuthoring);settings.change('Settings section','Guidance & time');settings.change('ATTENTION after','900');assert.equal(doc('opening-story').ATTENTION.after,900);
 panel.change('Story logic group','Cards');panel.change('CARDS sleep out','60');assert.equal(doc('opening-story').CARDS.sleep.out,60);
 panel.click('Add CARDS sleep end cue');assert.deepEqual(doc('opening-story').CARDS.sleep.end.at(-1),{milestone:'home'},'a new cue starts as the first kind (a milestone)');
 panel.change('New CARDS sleep end cue kind','sound');panel.click('Add CARDS sleep end cue');assert.deepEqual(doc('opening-story').CARDS.sleep.end.at(-1),{sound:'blip'});
 panel.change('CARDS sleep end 3 sound','granted');assert.deepEqual(doc('opening-story').CARDS.sleep.end.at(-1),{sound:'granted'});
 panel.click('Remove CARDS sleep end 4');assert.equal(doc('opening-story').CARDS.sleep.end.length,3);
 panel.change('CARDS sleep label','',false);assert.equal(doc('opening-story').CARDS.sleep.label,'CAPSULE 7B','a refused edit changes nothing');
 panel.change('CARDS sleep end 2 kind','print');assert.deepEqual(doc('opening-story').CARDS.sleep.end.at(-1),{print:{lines:['New line.']}});panel.click('Remove CARDS sleep end 3');assert.equal(doc('opening-story').CARDS.sleep.end.length,2);
 panel.change('Story logic group','Triggers');panel.change('Story trigger morning condition 5 3 right literal','1800');assert.equal(doc('opening-story').TRIGGERS[0].when.all[4].any[2].compare.right.literal,1800);
 panel.change('Story trigger morning condition 4 2 right literal','120');assert.equal(doc('opening-story').TRIGGERS[0].when.all[3].any[1].compare.right.literal,120);
 panel.click('Add Story trigger jack timestamp');assert.equal(doc('opening-story').TRIGGERS[1].start,'jack.at');panel.click('Remove Story trigger jack timestamp');assert.equal(doc('opening-story').TRIGGERS[1].start,undefined);
 panel.click('Add story trigger');assert.equal(doc('opening-story').TRIGGERS.length,3);panel.click('Remove Story trigger trigger-1');assert.equal(doc('opening-story').TRIGGERS.length,2);
 settings.change('GOAL_HINTS 0 line','a new hint');assert.equal(doc('opening-story').GOAL_HINTS[0].line,'a new hint');
 panel.change('Story logic group','Phases');panel.click('Remove PHASES home persona');assert.equal(doc('opening-story').PHASES.home.persona,undefined);
 panel.click('Add PHASES home persona');assert.equal(doc('opening-story').PHASES.home.persona.name,'courier');
 panel.change('PHASES home persona name','runner');assert.equal(doc('opening-story').PHASES.home.persona.name,'runner');

 // ---- a scene's part in each phase (scene.json), edited in the selected chunk
 panel.mounted();panel=ui((host,context)=>mountSceneAuthoring(host,context,{scene:'metro',focus:{only:['phases']}}));
 panel.change('Logic scene','metro');panel.change('Story phase','home');
 panel.change('phases home barriers gate-in gate verifyFrames','90');assert.equal(doc('metro-scene').phases.home.barriers['gate-in'].gate.verifyFrames,90);
 panel.change('phases home barriers gate-in gate verifying','HOLD: checking');assert.equal(doc('metro-scene').phases.home.barriers['gate-in'].gate.verifying,'HOLD: checking');
 panel.click('Add phases home barriers gate-in gate then cue');assert.equal(doc('metro-scene').phases.home.barriers['gate-in'].gate.then.length,3);panel.click('Remove phases home barriers gate-in gate then 3');
 panel.change('phases home goal','go on home');assert.equal(doc('metro-scene').phases.home.goal,'go on home');
 panel.change('phases home time','05:50');assert.equal(doc('metro-scene').phases.home.time,'05:50');panel.change('phases home time','5:50',false);assert.equal(doc('metro-scene').phases.home.time,'05:50');
 panel.change('phases home intro height','52');assert.equal(doc('metro-scene').phases.home.intro.height,52);
 panel.click('Use desktop pages for phases home intro touch');assert.equal(doc('metro-scene').phases.home.intro.touchPages,undefined);panel.click('Add phases home intro touch pages');assert.deepEqual(doc('metro-scene').phases.home.intro.touchPages,doc('metro-scene').phases.home.intro.pages);
 // lines, exits and chips are tables with a row per local id
 assert(panel.has('New lines row'));panel.change('New lines row','board');panel.click('Add lines row');assert.deepEqual(doc('metro-scene').phases.home.lines.board,{pages:['New line.']});panel.click('Remove lines row board');assert.equal(doc('metro-scene').phases.home.lines.board,undefined);

 // a phase can be added to a scene and removed again
 panel.change('Story phase','uplinked');assert(panel.has('Add uplinked phase to metro'));panel.click('Add uplinked phase to metro');assert.deepEqual(doc('metro-scene').phases.uplinked,{});
 panel.click('Add Goal');panel.change('phases uplinked goal','Nothing to do here.');
 assert.equal(pendingRegistry(values(model.list())).metro.phases!.uplinked.goal,'Nothing to do here.','the edited scene source reaches the compiled scene');
 panel.click('Remove uplinked phase from metro');assert.equal(doc('metro-scene').phases.uplinked,undefined);
 // the capsule: wash rules and the bed's card, both typed
 panel.change('Logic scene','capsule');panel.change('Story phase','flat');
 panel.change('wash 0 tone','cold');assert.equal(doc('capsule-scene').wash[0].tone,'cold');panel.change('wash 1 unlessState','doorOpen');
 panel.change('phases flat targets bed card','sleep');panel.change('phases flat targets bed promptH','50');assert.equal(doc('capsule-scene').phases.flat.targets.bed.promptH,50);
 panel.change('phases flat ping target kind','device');assert.equal(typeof doc('capsule-scene').phases.flat.ping.device,'string');
 // a bad free-text name is refused whole
 panel.change('Logic scene','train');panel.change('Story phase','home');
 panel.change('phases home ride mover','bogus',false);assert.deepEqual(doc('train-scene').phases.home.ride,{mover:'train.car',path:'home'});
 panel.change('phases home ride path','nowhere',false);assert.deepEqual(doc('train-scene').phases.home.ride,{mover:'train.car',path:'home'},'the car has no such path');
 panel.change('phases home ride path','home');

 // ---- contacts and the END card
 panel.mounted();panel=settings;panel.change('Settings section','Contacts');
 panel.change('INBOX announce speaker','ME');assert.equal(doc('contacts').INBOX.announce.speaker,'ME');
 panel.click('Add CONTACTS contact');assert.equal(doc('contacts').CONTACTS.length,2);panel.change('CONTACTS 1 name','LUX');
 panel.click('Add CONTACTS 1 messages message');assert.equal(doc('contacts').CONTACTS[1].messages.length,1);
 panel.change('CONTACTS 1 messages 0 text','hello\n\nthere');assert.deepEqual(doc('contacts').CONTACTS[1].messages[0].text,['hello','there']);
 panel.change('INBOX announce contact','nobody',false);
 panel.change('Settings section','Ending');
 panel.change('END title','THE END');panel.change('END lines','Nodes: {controlled}.\n\nBye, {handle}.');assert.deepEqual(doc('end-card').END.lines,['Nodes: {controlled}.','Bye, {handle}.']);
 panel.change('END lines','Nodes: {oops}.',false);assert.deepEqual(doc('end-card').END.lines,['Nodes: {controlled}.','Bye, {handle}.']);

 // ---- Scene › Story phases, the same controls inside the scene editor
 const scenes=ui((host,context)=>mountSceneAuthoring(host,context,{scene:'downtown',fixed:true,focus:{only:['phases']}}));
 scenes.change('Story phase','home');
 scenes.change('phases home exits capsule acknowledge height','70');assert.equal(doc('downtown-scene').phases.home.exits.capsule.acknowledge.height,70);
 scenes.change('Story phase','free');
 scenes.change('phases free arrival 0 speaker','ME');assert.equal(doc('downtown-scene').phases.free.arrival[0].speaker,'ME');
 scenes.change('phases free arrival 0 rain threshold','0.5');assert.equal(doc('downtown-scene').phases.free.arrival[0].rainThreshold,0.5);
 scenes.click('Add phases free arrival 0 pages companion page');assert.equal(doc('downtown-scene').phases.free.arrival[0].pages.at(-1).companion,true);
 scenes.click('Add phases free arrival row');assert.equal(doc('downtown-scene').phases.free.arrival.length,3);

 // ---- history, bundle, protected save, fresh model
 const edited=model.edits();assert(edited.length>=5);const ids=edited.map(e=>e.id).sort();for(const id of ['opening-story','metro-scene','capsule-scene','downtown-scene','contacts','end-card'])assert(ids.includes(id),id+' was edited');
 const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));for(const id of ids)assert.deepEqual(receiver.get(id).value,model.get(id).value,id+' round-trips through a bundle');
 validateSourceDocuments(new Map(model.list().map(d=>[d.id,d.value])));
 const evidence=path.resolve('../../.game-test-output/story-authoring');fs.mkdirSync(evidence,{recursive:true});const dir=fs.mkdtempSync(path.join(evidence,'run-'));for(const d of sourceDocuments){const to=path.join(dir,d.file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(root,d.file),to);}
 const store=new AuthoringStore({root:dir,documents:sourceDocuments,validateAll:validateSourceDocuments}),before=Object.fromEntries(sourceDocuments.map(d=>[d.file,fs.readFileSync(path.join(dir,d.file),'utf8')]));
 const saved=store.save(model.edits().map(e=>({...e,revision:store.read(e.id).revision})));
 const fresh=new AuthoringStore({root:dir,documents:sourceDocuments,validateAll:validateSourceDocuments});
 assert.equal((fresh.read('metro-scene').value as any).phases.home.barriers['gate-in'].gate.verifyFrames,90);assert.equal((fresh.read('opening-story').value as any).ATTENTION.after,900);assert.equal((fresh.read('end-card').value as any).END.title,'THE END');
 const story=pendingOpeningStory(values(fresh.list()));assert.equal(story.ATTENTION.after,900);assert.equal(story.persona({[story.OPENING.home]:true})?.name,'runner');
 const registry=pendingRegistry(values(fresh.list()));assert.equal((registry.metro.phases!.home.barriers!['gate-in'] as any).gate.verifying,'HOLD: checking');assert.equal(registry.capsule.wash![0].tone,'cold');
 fresh.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));for(const d of sourceDocuments)assert.equal(fs.readFileSync(path.join(dir,d.file),'utf8'),before[d.file],d.id+' is restored byte for byte');
 console.log('Story authoring PASS: Game settings, Story logic and chunk Story phases edits its source (cards, triggers, hints, persona, scene phases, wash, contacts, END card), bad names are refused whole, and bundle, protected Save, fresh models and byte-exact Undo carry it.');
}finally{globalThis.document=previous;}
process.exit(0);
