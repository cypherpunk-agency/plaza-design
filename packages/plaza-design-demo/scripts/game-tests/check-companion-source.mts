import {runtimeFixture} from './runtime-fixture.mts';
/** The companion document (engine/gameplay/companion.json): the game loop reads it; the editor edits it; the source store saves it. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {mountRules} from './rules-harness.mts';
import {COMPANION_SOURCE,validateCompanionSource,companionHere,companionFlag,type CompanionSource} from '../../src/ssg/game/engine/gameplay/companion-source';
import {validatePendingCompanion} from '../../src/ssg/game/authoring/pending-rules';
import {COMPANION_GAMEPLAY} from '../../src/ssg/game/engine/gameplay/companion-conversations';
import {mountCompanionSourceAuthoring} from '../../src/ssg/game/authoring/companion-source-authoring';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {DEFAULT_COMPANION_FLAG,DEFAULT_COMPANION_PET} from '../../src/ssg/game/engine/gameplay/scene-companion';
import {Game} from '../../src/ssg/game/runtime/game';
import {SCENES} from '../../src/ssg/game/scenes';
import {newSave} from '../../src/ssg/game/runtime/save';
import {BOT_REACTIONS} from '../../src/ssg/game/engine/gameplay/bot-conversations';

// the shipped document says what the loop used to hard-code
assert.deepEqual({id:COMPANION_SOURCE.id,speaker:COMPANION_SOURCE.speaker,flag:COMPANION_SOURCE.unlockFlag,look:COMPANION_SOURCE.look,modes:COMPANION_SOURCE.modes,popups:COMPANION_SOURCE.avoidPopups,follow:COMPANION_SOURCE.follow},{id:'pixel',speaker:'pixel',flag:'pixel',look:'pixel',modes:['home','along'],popups:true,follow:{distance:28,trail:20,lostAt:300}});
assert.equal(COMPANION_SOURCE.greeting,'Pixel came along. Nobody asked Pixel. Nobody ever does.');
assert.equal(DEFAULT_COMPANION_FLAG,'pixel');assert.equal(DEFAULT_COMPANION_PET.prompt,'[E] PET PIXEL');
assert.deepEqual(DEFAULT_COMPANION_PET.conversations.idle,[0,1,2,3].map(i=>'companion.pet.idle.'+i));

// validation rejects what the loop could not run
const shipped=()=>structuredClone(COMPANION_SOURCE) as any;
for(const [name,mutate] of Object.entries({
 'unknown look':(d:any)=>{d.look='robot-dog';},'extra field':(d:any)=>{d.code='alert(1)';},'missing greeting':(d:any)=>{delete d.greeting;},
 'bad mode':(d:any)=>{d.modes=['home','off'];},'duplicate mode':(d:any)=>{d.modes=['home','home'];},'popup flag not boolean':(d:any)=>{d.avoidPopups='yes';},
 'negative follow':(d:any)=>{d.follow.distance=-1;},'empty flag':(d:any)=>{d.unlockFlag='';},'reserved speaker':(d:any)=>{d.speaker='__proto__';},
 'pet without idle':(d:any)=>{d.pet.conversations.idle=[];},'blank prompt':(d:any)=>{d.pet.prompt='  ';},
})){const bad=shipped();mutate(bad);assert.throws(()=>validateCompanionSource(bad),undefined,name);}
// pet graphs must exist in the pending shared library
const missing=shipped();missing.pet.conversations.sun='companion.pet.nowhere';
assert.throws(()=>validatePendingCompanion(missing,new Map()),/not in the shared companion library/);
validatePendingCompanion(shipped(),new Map([['companion-gameplay',COMPANION_GAMEPLAY]]));

// companionHere equals the loop's old condition: home always; along only once the (scene's or default) flag is set
const old=(s:{pixel?:'home'|'along';companion?:{unlockFlag?:string}},flags:Record<string,boolean>)=>s.pixel==='home'||(!!flags[s.companion?.unlockFlag??'pixel']&&s.pixel==='along');
for(const pixel of [undefined,'home','along'] as const)for(const own of [undefined,'own'])for(const flags of [{},{pixel:true},{own:true},{pixel:true,own:true}]){
 const scene={pixel,...(own?{companion:{unlockFlag:own}}:{})};
 assert.equal(companionHere(scene,flags),old(scene,flags),JSON.stringify({scene,flags}));
}
// a different document changes the answer: no 'along' mode, another flag
const homeOnly={...shipped(),modes:['home'],unlockFlag:'cat:follow'} as CompanionSource;
assert.equal(companionHere({pixel:'along'},{pixel:true,'cat:follow':true},homeOnly),false);assert.equal(companionHere({pixel:'home'},{},homeOnly),true);
assert.equal(companionFlag({},homeOnly),'cat:follow');assert.equal(companionFlag({companion:{unlockFlag:'own'}},homeOnly),'own');

// the game loop reads the document it is given (private Play passes the pending one)
const make=(sources:object,here:string,flags:Record<string,boolean>)=>{const game:any=runtimeFixture(Game),save=newSave();Object.assign(save.flags,flags);Object.assign(game,{save,content:SCENES,sources,botReactions:BOT_REACTIONS,scenes:Object.assign(game.scenes,{here,compiledScenes:new Map(),hosts:new Map(),gameplaySessions:new Map()}),timing:Object.assign(game.timing,{t:0})});return game;};
assert.equal(make({},'downtown',{}).companionPresent,false);
assert.equal(make({},'downtown',{pixel:true}).companionPresent,true);
assert.equal(make({},'capsule',{}).companionPresent,true,'home scenes show it without the flag');
assert.equal(make({companion:homeOnly},'downtown',{pixel:true,'cat:follow':true}).companionPresent,false);
assert.equal(make({companion:homeOnly},'capsule',{}).companionPresent,true);
assert.equal(make({companion:{...shipped(),speaker:'kit',avoidPopups:false}},'capsule',{}).companionDoc.speaker,'kit');
assert.equal(make({},'capsule',{}).companionDoc.id,'pixel');

// editor controls: typed, validated, saved through the document API
const docs=new Map<string,unknown>([['companion',shipped()],['companion-gameplay',structuredClone(COMPANION_GAMEPLAY)]]);
const ui=mountRules(mountCompanionSourceAuthoring,docs),doc=()=>docs.get('companion') as CompanionSource;
ui.change('Companion name','Byte');ui.change('Companion speaker ID','byte');ui.change('Companion unlock flag','byte:follow');ui.change('Companion greeting page','Byte tagged along.');
ui.change('Companion mode along',false);assert.deepEqual(doc().modes,['home']);ui.change('Companion mode along',true);assert.deepEqual([...doc().modes].sort(),['along','home']);
ui.change('Popups keep clear of companion',false);ui.change('Companion follow distance','40');ui.change('Companion follow trail','25');ui.change('Companion follow catch-up distance','500');
ui.change('Companion pet prompt','[E] PET BYTE');ui.change('Companion pet sun','companion.pet.idle.0');ui.click('Add pet idle');
assert.deepEqual({name:doc().name,speaker:doc().speaker,flag:doc().unlockFlag,greeting:doc().greeting,popups:doc().avoidPopups,follow:doc().follow,prompt:doc().pet.prompt,sun:doc().pet.conversations.sun,idle:doc().pet.conversations.idle.length},{name:'Byte',speaker:'byte',flag:'byte:follow',greeting:'Byte tagged along.',popups:false,follow:{distance:40,trail:25,lostAt:500},prompt:'[E] PET BYTE',sun:'companion.pet.idle.0',idle:5});
assert(ui.saved.every(s=>s.id==='companion'));assert.deepEqual(ui.optionValues('Companion look'),['pixel']);
const before=structuredClone(doc());ui.change('Companion unlock flag','');assert.deepEqual(doc(),before,'an invalid edit leaves the document alone');assert(ui.host.children[0].textContent,'and says why');

// it is a registered source document and saves through the protected store (atomic, byte-exact undo)
const entry=sourceDocuments.find(d=>d.id==='companion')!;assert(entry,'registered');assert.equal(entry.kind,'rules');assert.equal(entry.file,'engine/gameplay/companion.json');assert(fs.existsSync(path.join('src/ssg/game',entry.file)));
const evidence=path.resolve('../../.game-test-output/companion-source');fs.mkdirSync(evidence,{recursive:true});const root=fs.mkdtempSync(path.join(evidence,'run-'));
for(const d of sourceDocuments){const to=path.join(root,d.file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),to);}
const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),original=fs.readFileSync(path.join(root,entry.file),'utf8'),revision=()=>store.read('companion').revision;
const saved=store.save([{id:'companion',revision:revision(),value:doc()}]);
assert.equal(JSON.parse(fs.readFileSync(path.join(root,entry.file),'utf8')).speaker,'byte');
assert.equal((new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}).read('companion').value as CompanionSource).unlockFlag,'byte:follow');
const bad=doc();bad.pet.conversations.moving='companion.pet.nowhere';assert.throws(()=>store.save([{id:'companion',revision:revision(),value:bad}]));
assert.equal(JSON.parse(fs.readFileSync(path.join(root,entry.file),'utf8')).speaker,'byte','a failed save changes nothing');
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.equal(fs.readFileSync(path.join(root,entry.file),'utf8'),original,'byte-exact undo');
// game.ts holds no companion literals
const gameSource=fs.readFileSync('src/ssg/game/runtime/game.ts','utf8');assert(!/'pixel'|"pixel"|flags\.pixel|greeting\.pixel|PET_CAT|PET_PIGEON/.test(gameSource),'no companion or critter literals in game.ts');
console.log('Companion source PASS: shipped values, validation, the loop reads the given document, editor controls, protected save and byte-exact undo.');
process.exit(0);
