import {build} from 'esbuild';import vm from 'node:vm';
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';import {ComposerModel} from '../../src/ssg/game/authoring/app';import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';import {createSequenceValidationContext} from '../../src/ssg/game/authoring/sequence-preview';import {pendingDestinations} from '../../src/ssg/game/authoring/pending-destinations';import {art} from '../../src/ssg/game/art';
import {TypedForm} from '../../src/ssg/game/authoring/typed-form';import {mountPlayProfileAuthoring} from '../../src/ssg/game/authoring/play-profile-authoring';
import {validatePlayProfiles,type PlayProfiles} from '../../src/ssg/game/runtime/play-profiles';
import {SHIPPED_PROFILES,chooseProfile,installPlayProfiles,playProfile,can} from '../../src/ssg/game/runtime/play-profile';
import {validatePendingPlayProfiles} from '../../src/ssg/game/authoring/play-profile-source';
import {Game} from '../../src/ssg/game/runtime/game';

// ---- 1. The shipped document: three profiles, each with the capabilities and start the game relied on ----
assert.deepEqual(SHIPPED_PROFILES.profiles.map(p=>p.id).sort(),['demo','full','harborShift','harborZones']);
const by=(id:string)=>SHIPPED_PROFILES.profiles.find(p=>p.id===id)!;
const expected:Record<string,{abilities:string[];routes:string;start?:string;avatar:string;name?:string;clock:string;guidance:string;world:string}>={
 full:{abilities:['map','mapKey','deck','jump','hack','sudo'],routes:'world',avatar:'hacker',clock:'opening',guidance:'none',world:'campaign'},
 harborShift:{abilities:['mapKey'],routes:'start',start:'harborShift',avatar:'person',name:'worker',clock:'scene',guidance:'shift',world:'campaign'},
 harborZones:{abilities:['mapKey'],routes:'start',start:'harbor-station',avatar:'person',name:'worker',clock:'scene',guidance:'shift',world:'campaign'},
 demo:{abilities:['map','deck','jump','hack','sudo','review'],routes:'content',start:'shop',avatar:'hacker',clock:'opening',guidance:'shift',world:'testDistrict'},
};
for(const[id,e]of Object.entries(expected)){const p=by(id);assert.deepEqual(Object.entries(p.abilities).filter(([,on])=>on).map(([a])=>a).sort(),[...e.abilities].sort(),id+' abilities');assert.equal(p.routes,e.routes);assert.equal(p.start.scene,e.start);assert.equal(p.player.avatar,e.avatar);assert.equal(p.player.name,e.name);assert.equal(p.clock.rule,e.clock);assert.equal(p.guidance.style,e.guidance);assert.equal(p.world,e.world);assert.equal(p.home,'downtown');}
assert.deepEqual(by('demo').seed,{scene:'shop',handle:'TESTER',tokens:8,modules:['switch.so'],flags:['arrived','schematics']});
assert.equal(by('demo').chrome.minimalHud,true);assert.equal(by('harborShift').chrome.pageClass,'shift-prototype');assert.equal(by('demo').guidance.controlHints,false);

// ---- 2. Selection from the URL and the editor frames stays as it was ----
const pick=(search:string,editor=false,frame?:string,restricted=false)=>chooseProfile(SHIPPED_PROFILES,{search,frame,restricted},editor).id;
assert.equal(pick(''),'full');assert.equal(pick('?play'),'full');assert.equal(pick('?play=yard'),'full');assert.equal(pick('?sudo'),'full');
assert.equal(pick('?play=harborShift'),'harborShift');assert.equal(pick('?demo'),'demo');assert.equal(pick('?demo&play=harborShift'),'demo','demo wins over the harbor shift as before');
assert.equal(pick('',true,'access-denied-editor-play'),'harborShift');assert.equal(pick('',true,'access-denied-editor-play:normal'),'full');assert.equal(pick('?demo',true,'access-denied-editor-play:normal'),'full','the editor ignores the URL');assert.equal(pick('',true,'access-denied-editor-play:normal',true),'demo');

// ---- 3. The real modules under each URL: keys, new save, abilities, reopening query ----
async function under(search:string,document?:string){
 const plugins=document===undefined?[]:[{name:'saved-profiles',setup(b:any){b.onLoad({filter:/runtime[\\/]play-profiles\.json$/},()=>({contents:document,loader:'json'}));}}];
 const bundled=await build({stdin:{contents:`import {playProfile,can,saveKey,resumeKey,slotPrefix,profileQuery,reservedScene,urlAsksForPlay,sudoOn} from './src/ssg/game/runtime/play-profile';import {newSave} from './src/ssg/game/runtime/save';import {slotKey} from './src/ssg/game/runtime/slots';
const abilities=Object.fromEntries(['map','mapKey','deck','jump','hack','sudo','review'].map(a=>[a,can(a)]));globalThis.result={id:playProfile().id,abilities,sudo:sudoOn(),save:saveKey(),resume:resumeKey(),slot:slotKey(2),prefix:slotPrefix(),reopen:profileQuery('yard'),reopenHome:profileQuery('downtown'),reopenStart:profileQuery(playProfile().start.scene||'downtown'),reserved:reservedScene('harborShift'),shop:reservedScene('shop'),asks:urlAsksForPlay(location.search),fresh:newSave()};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife',plugins});
 const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>memory.delete(k)};
 const win:any={name:'',addEventListener:()=>{}};win.parent=win;const context:any={window:win,location:{search,reload:()=>{}},localStorage:storage,sessionStorage:storage,console,Date,performance,URLSearchParams,structuredClone};
 vm.runInNewContext('globalThis.structuredClone=v=>JSON.parse(JSON.stringify(v));'+bundled.outputFiles[0].text,context);return JSON.parse(JSON.stringify(context.result));
}
const full=await under(''),sudo=await under('?sudo'),harbor=await under('?play=harborShift'),demo=await under('?demo'),demoSudo=await under('?demo&sudo'),harborSudo=await under('?play=harborShift&sudo');
assert.equal(full.id,'full');assert.equal(full.save,'access-denied-save-v3');assert.equal(full.resume,'access-denied-resume-v3');assert.equal(full.slot,'access-denied-v3-slot-2');assert.equal(full.sudo,false);assert.equal(full.reopen,'?play=yard');assert.equal(full.reopenHome,'?play');
assert.equal(sudo.save,'access-denied-save-sudo-v3');assert.equal(sudo.slot,'access-denied-v3-sudo-slot-2');assert.equal(sudo.sudo,true);assert.equal(sudo.reopen,'?play=yard&sudo');assert.equal(sudo.resume,'access-denied-resume-v3');
assert.equal(harbor.id,'harborShift');assert.equal(harbor.save,'access-denied-harbor-shift-v1');assert.equal(harbor.resume,'access-denied-harbor-shift-resume-v1');assert.equal(harbor.slot,'access-denied-v3-harbor-shift-slot-2');assert.equal(harbor.reopenStart,'?play=harborShift');assert.equal(harbor.reserved,false);assert.equal(full.reserved,true);assert.equal(harbor.shop,false);assert.equal(harbor.sudo,false,'the harbor shift has no sudo');assert.equal(harborSudo.save,'access-denied-harbor-shift-v1');assert.equal(harborSudo.slot,harbor.slot);assert.equal(harborSudo.abilities.hack,false);assert.equal(harborSudo.reopenStart,'?play=harborShift&sudo');
assert.equal(demo.id,'demo');assert.equal(demo.save,'access-denied-demo-v1');assert.equal(demo.resume,'access-denied-demo-resume-v1');assert.equal(demo.slot,'access-denied-v3-demo-slot-2');assert.equal(demo.reopen,'?demo');assert.equal(demoSudo.save,'access-denied-demo-v1','sudo never moves the demo save');assert.equal(demoSudo.slot,demo.slot);assert.equal(demoSudo.sudo,true);
assert.equal(new Set([full.save,sudo.save,harbor.save,demo.save,full.resume,harbor.resume,demo.resume]).size,7,'profiles never share storage');
for(const[r,id]of[[full,'full'],[harbor,'harborShift'],[demo,'demo']]as const)assert.deepEqual(Object.entries(r.abilities).filter(([,on])=>on).map(([a])=>a).sort(),[...expected[id].abilities].sort(),id+' capability checks in the real module');
assert.deepEqual([full.fresh.handle,full.fresh.tokens,full.fresh.scene,full.fresh.flags,full.fresh.modules.includes('switch.so')],['',0,undefined,{},false]);
assert.deepEqual([demo.fresh.handle,demo.fresh.tokens,demo.fresh.scene,demo.fresh.flags,demo.fresh.modules.includes('switch.so')],['TESTER',8,'shop',{arrived:true,schematics:true},true]);
assert.deepEqual([harbor.fresh.handle,harbor.fresh.tokens,harbor.fresh.scene,harbor.fresh.flags],['',0,undefined,{}]);

// ---- 4. The game loop reads the profile: capability checks on the real Game methods ----
installPlayProfiles(SHIPPED_PROFILES,false);assert.equal(playProfile().id,'full');
const story=(locked:boolean)=>({openingStory:{hackLocked:()=>locked},save:{flags:{}}});
const hackLocked=(g:object)=>(Game.prototype as any).hackLocked.call(g) as boolean;
assert.equal(hackLocked(story(false)),false);assert.equal(hackLocked(story(true)),true,'the full game: the story still locks hack');
installPlayProfiles(SHIPPED_PROFILES,true);assert.equal(playProfile().id,'demo');assert.equal(can('hack'),true);assert.equal(hackLocked(story(false)),false);assert.equal(hackLocked(story(true)),true);
const noHack=structuredClone(SHIPPED_PROFILES);noHack.profiles.find(p=>p.id==='demo')!.abilities.hack=false;installPlayProfiles(validatePlayProfiles(noHack),true);assert.equal(hackLocked(story(false)),true,'a profile without hack locks it whatever the story says');
const clock=Object.getOwnPropertyDescriptor(Game.prototype,'clockText')!.get!;assert.equal(clock.call({}),'','minimal HUD: no clock text');
installPlayProfiles(SHIPPED_PROFILES,false);assert.notEqual(clock.call({}),'');
const me=Object.getOwnPropertyDescriptor(Game.prototype,'me')!.get!;assert.equal(me.call({openingStory:{persona:()=>undefined},save:{flags:{},handle:'neo'}}),'neo');

// ---- 5. Validation refuses incoherent profiles ----
const bad=(change:(d:PlayProfiles)=>void,pattern:RegExp)=>{const d=structuredClone(SHIPPED_PROFILES);change(d);assert.throws(()=>validatePlayProfiles(d),pattern);};
bad(d=>{d.profiles[0].namespace.save=d.profiles[1].namespace.save;},/share the storage key/);
bad(d=>{(d.profiles.find(p=>p.id==='full')!.start as any).title='yes';},/title screen/);
bad(d=>{delete (d.profiles.find(p=>p.id==='harborShift')!.start as any).scene;},/needs a start scene/);
bad(d=>{d.profiles.find(p=>p.id==='full')!.start.entrance='door';},/needs a start scene/);
bad(d=>{d.profiles.find(p=>p.id==='demo')!.select=undefined;},/exactly one profile is the default/);
bad(d=>{d.profiles.find(p=>p.id==='harborShift')!.player.avatar='pilot' as any;},/avatar/);
bad(d=>{(d.profiles[0] as any).extra=1;},/unknown field/);

// ---- 6. The editor control edits the document, round-trips history/bundle/Save/fresh import, and Play consumes the saved source ----
class Element{children:Element[]=[];attributes:Record<string,string>={};value='';checked=false;textContent='';onchange?:()=>void;onclick?:()=>void;append(...n:Element[]){this.children.push(...n);}replaceChildren(...n:Element[]){this.children=[...n];}setAttribute(k:string,v:string){this.attributes[k]=v;}}
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>new Element()}});
const evidence=path.resolve('../../.game-test-output/play-profiles-save');fs.mkdirSync(evidence,{recursive:true});const root=fs.mkdtempSync(path.join(evidence,'run-'));for(const d of sourceDocuments){const to=path.join(root,d.file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),to);}
const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),initial=store.list(),descriptor=sourceDocuments.find(d=>d.id==='play-profiles')!;assert(descriptor,'play-profiles is a registered source document');assert.equal(descriptor.kind,'profiles');
const validate=(d:any,all:any[])=>{if(d.id==='authored-scenes')validateSourceDocuments(new Map(all.map(d=>[d.id,d.value])));if(d.id==='play-profiles')validatePendingPlayProfiles(d.value,new Map(all.map(d=>[d.id,d.value])));},make=()=>{const m=new ComposerModel(art,createSequenceValidationContext(art,{},pendingDestinations(new Map(initial.map(d=>[d.id,d.value])))),validate,[],all=>pendingDestinations(new Map(all.map(d=>[d.id,d.value]))));m.load(initial);return m;};
const m=make(),errors:unknown[]=[];let host:Element;
const context:any={get documents(){return m.list();},authoring:{get:(id:string)=>m.get(id),edit:(id:string,label:string,value:unknown)=>m.edit(id,label,()=>value)}};
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)],field=(n:string)=>{const e=all(host).find(e=>e.attributes['aria-label']===n);assert(e,'control '+n);return e;},change=(n:string,v:string|boolean)=>{const e=field(n);if(typeof v==='boolean')e.checked=v;else e.value=v;e.onchange!();};
host=new Element();const handle=mountPlayProfileAuthoring(host as unknown as HTMLElement,context);const errorLine=()=>all(host).find(e=>e.attributes.role==='alert')!.textContent;
const doc=()=>m.get('play-profiles').value as PlayProfiles;
change('Play profile','harborShift');change('Ability Jump',true);change('Fixed player name (empty: story name, then handle)','deckhand');change('Start entrance (exit id; empty: the scene spawn)','');change('Clock rule','opening');change('Guidance style','none');change('Controls taught in the hint lane',false);change('Save key','access-denied-harbor-shift-v2');
change('Play profile','demo');change('New save tokens','21');change('New save flags (space separated)','arrived schematics tutorial');change('Ability Hack vision, board and devices\' schematics',false);change('Home scene','shop');
handle.refresh!();assert.equal(errorLine(),'','valid edits report nothing');
const edited=doc(),h=edited.profiles.find(p=>p.id==='harborShift')!,d=edited.profiles.find(p=>p.id==='demo')!;
assert.equal(h.abilities.jump,true);assert.equal(h.player.name,'deckhand');assert.equal(h.clock.rule,'opening');assert.equal(h.guidance.style,'none');assert.equal(h.guidance.controlHints,false);assert.equal(h.namespace.save,'access-denied-harbor-shift-v2');assert.equal(d.seed.tokens,21);assert.deepEqual(d.seed.flags,['arrived','schematics','tutorial']);assert.equal(d.abilities.hack,false);assert.equal(d.home,'shop');
// invalid edits are refused atomically and shown, not stored
const before=structuredClone(doc());change('Save key','access-denied-harbor-shift-v2');assert.match(errorLine(),/share the storage key|Play profiles/);assert.deepEqual(doc(),before,'a clashing storage key is rejected whole');
change('Start scene','nowhere');assert.deepEqual(doc(),before);
change('Start scene','library');change('Start entrance (exit id; empty: the scene spawn)','nowhere');assert.match(errorLine(),/no exit called/);assert.equal(doc().profiles.find(p=>p.id==='demo')!.start.entrance,undefined);
// history and bundle
const valueAfter=structuredClone(doc());m.undo();m.redo();assert.deepEqual(doc(),valueAfter);
const receiver=make();receiver.importDocuments(readDocumentBundle(createDocumentBundle(m.edits(),m.list()),receiver.list()));assert.deepEqual(receiver.get('play-profiles').value,valueAfter,'bundle round trip');
// protected Save, fresh reload, exact-byte undo
const originalFile=fs.readFileSync(path.join(root,descriptor.file),'utf8');
const saved=store.save(m.edits().map(e=>({...e,revision:store.read(e.id).revision}))),fresh=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments});
assert.deepEqual(fresh.read('play-profiles').value,valueAfter);
const savedText=fs.readFileSync(path.join(root,descriptor.file),'utf8');
// Play consumes the saved source: the real modules, rebuilt from the saved JSON, play by the edited profile
const harborAfter=await under('?play=harborShift',savedText);
assert.equal(harborAfter.save,'access-denied-harbor-shift-v2');assert.equal(harborAfter.abilities.jump,true);assert.equal(harborAfter.id,'harborShift');
const demoAfter=await under('?demo',savedText);assert.equal(demoAfter.fresh.tokens,21);assert.deepEqual(demoAfter.fresh.flags,{arrived:true,schematics:true,tutorial:true});assert.equal(demoAfter.abilities.hack,false);
// private Play applies the pending document before it builds the game
installPlayProfiles(validatePlayProfiles(valueAfter),true);assert.equal(playProfile().id,'demo');assert.equal(can('hack'),false,'private Play runs the pending profile');assert.equal(playProfile().seed.tokens,21);
installPlayProfiles(SHIPPED_PROFILES,false);
const undone=fresh.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.equal(fs.readFileSync(path.join(root,descriptor.file),'utf8'),originalFile,'byte-exact undo');fresh.undo(undone.transaction,Object.fromEntries(undone.documents.map(d=>[d.id,d.revision])));assert.deepEqual(fresh.read('play-profiles').value,valueAfter);
handle();
console.log('Play profiles PASS: three shipped profiles keep their capabilities/start/storage, URL and editor-frame selection unchanged, real save/slot/resume/new-save modules per URL, Game capability checks, incoherent profiles refused, and the typed editor control round-trips history/bundle/protected Save/fresh import into Play. Evidence: '+root);
