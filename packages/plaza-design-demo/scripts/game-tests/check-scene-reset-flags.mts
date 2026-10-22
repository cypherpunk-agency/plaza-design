/** Scene stage flags (scene.json `stage.resettable` / `stage.sudoOnly`): the deck's `reset <scene>` and sudo-only resume are data, not scene ids in the loop. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Element} from './rules-harness.mts';
import {validateSceneStage,type SceneStage} from '../../src/ssg/game/engine/gameplay/scene-stage';
import {renderSceneStage} from '../../src/ssg/game/authoring/scene-stage-authoring';
import {TypedForm} from '../../src/ssg/game/authoring/typed-form';
import {validateSceneDocument,type SceneDocument} from '../../src/ssg/game/engine/gameplay/scene-document';
import {run,suggest,commands,type Ctx} from '../../src/ssg/game/ui/terminal/commands';
import {SCENES} from '../../src/ssg/game/scenes';
import {FOLDER_SOURCES} from '../../src/ssg/game/scenes/folder-scenes';
import {Game} from '../../src/ssg/game/runtime/game';
import {newSave} from '../../src/ssg/game/runtime/save';
import {BOT_REACTIONS} from '../../src/ssg/game/engine/gameplay/bot-conversations';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';

// the scene documents carry the flags the loop used to hard-code by scene id
const flags=Object.entries(SCENES).filter(([,s])=>s.resettable||s.sudoOnly).map(([id,s])=>[id,s.resettable?.label,!!s.sudoOnly]);
assert.deepEqual(flags,[['sandbox','the sandbox',true],['yard','the back yard',false]].sort((a,b)=>Object.keys(SCENES).indexOf(String(a[0]))-Object.keys(SCENES).indexOf(String(b[0]))));
assert.equal(SCENES.yard.resettable!.done,"back yard reset: cables, parts, the parcel, HINGE's mood. Everything else is kept.");
assert.equal(SCENES.yard.resettable!.confirm,'this resets the back yard only (cables, parts, the parcel, its goals).');
assert.equal(SCENES.sandbox.resettable!.done,'sandbox reset: QA bay 3 as on the first visit. Everything else is kept.');
assert.equal(SCENES.sandbox.resettable!.confirm,'this resets the sandbox only (QA bay 3: devices, cables, parts, trace).');

// stage validation
const good:SceneStage={resettable:{label:'x',confirm:'y',done:'z'},sudoOnly:true};assert.deepEqual(validateSceneStage(good),good);
for(const bad of [{resettable:{label:'x',confirm:'y'}},{resettable:{label:'x',confirm:'y',done:' '}},{resettable:{label:'x',confirm:'y',done:'z',more:1}},{resettable:'yes'},{sudoOnly:false},{sudoOnly:'yes'}])assert.throws(()=>validateSceneStage(bad),/Invalid scene stage/);

// the game: which scenes the deck resets and which saves resume (no sudo in this process)
const make=(content:any,here='downtown')=>{const game:any=Object.create(Game.prototype),resets:string[]=[];Object.assign(game,{save:newSave(),here,content,sources:{},botReactions:BOT_REACTIONS,compiledScenes:new Map(),hosts:new Map(),gameplaySessions:new Map(),t:0,hostOf:(id:string)=>({reset:()=>resets.push(id)})});return{game,resets};};
{const {game}=make(SCENES);assert.deepEqual(game.resettableScenes().map(([id]:[string])=>id),['yard'],'the sandbox is sudo only');
 assert.equal(game.resumable('yard'),true);assert.equal(game.resumable('sandbox'),false,'a save in the sandbox does not resume without sudo');assert.equal(game.resumable('downtown'),true);assert.equal(game.resumable('nowhere'),false);}
{const lab:any={...SCENES.downtown,id:'lab',resettable:{label:'the lab',confirm:'this resets the lab only.',done:'lab reset.'}},{game}=make({...SCENES,lab});assert.deepEqual(game.resettableScenes().map(([id]:[string])=>id),['yard','lab'],'any scene that declares it');}

// the deck: `reset <scene>`, generic
const printed:[string,string|undefined][]=[],resets:string[]=[];
const ctx=(resettable:Ctx['resettable'])=>({save:newSave(),machine:null,shell:null,scanProgram:null,print:(t:string,k?:string)=>printed.push([t,k]),resettable,denied(){},granted(){},toggleSound:()=>true,clear(){},leaveMachine(){},persist(){}}) as unknown as Ctx;
const list:Ctx['resettable']=[{id:'yard',label:'the back yard',confirm:SCENES.yard.resettable!.confirm,done:SCENES.yard.resettable!.done,reset:()=>resets.push('yard')},{id:'lab',label:'the lab',confirm:'this resets the lab only.',done:'lab reset.',reset:()=>resets.push('lab')}];
run(ctx(list),'reset yard');assert.deepEqual(printed.pop(),['this resets the back yard only (cables, parts, the parcel, its goals). Type: reset yard --yes','err']);assert.deepEqual(resets,[]);
run(ctx(list),'reset yard --yes');assert.deepEqual(resets,['yard']);assert.deepEqual(printed.pop(),[SCENES.yard.resettable!.done,'ok']);
run(ctx(list),'RESET Lab --yes');assert.deepEqual(resets,['yard','lab'],'any declared scene, any case');assert.deepEqual(printed.pop(),['lab reset.','ok']);
run(ctx([list[0]]),'reset lab');assert.deepEqual(printed.pop(),['this wipes your progress. Type: reset --yes','err']);assert.deepEqual(resets,['yard','lab'],'an undeclared scene resets nothing');
run(ctx([]),'reset yard --yes');assert.deepEqual(resets,['yard','lab'],'no scene declares it, no scene resets');
run(ctx([list[0]]),'man reset');assert.deepEqual(printed.pop(),['reset --yes: wipes your progress and starts over. reset yard: only the back yard.','dim'],'the manual text the deck always had');
run(ctx(list),'man reset');assert.equal(printed.pop()![0],'reset --yes: wipes your progress and starts over. reset yard: only the back yard. reset lab: only the lab.');
assert.deepEqual(suggest(ctx(list),'reset '),['--yes','yard','lab']);assert.deepEqual(suggest(ctx(list),'reset y'),['yard']);assert(commands(ctx(list)).includes('reset'));

// the editor control
const doc=structuredClone(FOLDER_SOURCES.yard.scene) as SceneDocument;let current=structuredClone(doc),host:Element;const errors:unknown[]=[];
const refresh=()=>{host=new Element();renderSceneStage(new TypedForm(e=>errors.push(e)),host as unknown as HTMLElement,current,(label,change)=>{const next=structuredClone(current);change(next);validateSceneStage(next.stage??{});current=next;refresh();},['cable']);};
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)],field=(n:string)=>{const e=all(host).find(e=>e.attributes['aria-label']===n);assert(e,'field '+n);return e;},change=(n:string,v:string|boolean)=>{const e=field(n);if(typeof v==='boolean')e.checked=v;else e.value=v;e.onchange!();};
refresh();assert.equal(field('Deck can reset this scene').checked,true);
change('Reset label','the old yard');change('Reset confirm','this resets the old yard.');change('Reset done','old yard reset.');
assert.deepEqual(current.stage!.resettable,{label:'the old yard',confirm:'this resets the old yard.',done:'old yard reset.'});
change('Only under sudo (no resume, no reset)',true);assert.equal(current.stage!.sudoOnly,true);change('Only under sudo (no resume, no reset)',false);assert.equal(current.stage!.sudoOnly,undefined);
change('Deck can reset this scene',false);assert.equal(current.stage!.resettable,undefined);change('Deck can reset this scene',true);assert.equal(current.stage!.resettable!.label,'this scene');
change('Reset label','the old yard');change('Reset done','old yard reset.');assert.equal(errors.length,0);
// scene documents validate the stage; the pending registry compiles it into the scene the loop reads
assert.throws(()=>validateSceneDocument({...structuredClone(doc),stage:{...doc.stage,resettable:{label:'x'}}} as never,{version:1,flags:[],items:[],events:[],commands:{},reactions:[],conversations:{}} as never),/Invalid scene stage|fields|reference|Invalid/);
const entry=sourceDocuments.find(d=>d.id==='yard-scene')!;assert(entry);
const evidence=path.resolve('../../.game-test-output/scene-reset-flags');fs.mkdirSync(evidence,{recursive:true});const root=fs.mkdtempSync(path.join(evidence,'run-'));
for(const d of sourceDocuments){const to=path.join(root,d.file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),to);}
const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),original=fs.readFileSync(path.join(root,entry.file),'utf8');
const saved=store.save([{id:'yard-scene',revision:store.read('yard-scene').revision,value:current}]);
const registry=pendingRegistry(new Map(new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}).list().map(d=>[d.id,d.value])));
assert.equal(registry.yard.resettable!.done,'old yard reset.');assert.equal(registry.yard.sudoOnly,undefined);
const bad=structuredClone(current);bad.stage!.resettable={label:'x',confirm:'y'} as never;assert.throws(()=>store.save([{id:'yard-scene',revision:store.read('yard-scene').revision,value:bad}]));
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.equal(fs.readFileSync(path.join(root,entry.file),'utf8'),original);
// no scene ids for reset or resume in the loop or the deck
const code=fs.readFileSync('src/ssg/game/runtime/game.ts','utf8')+fs.readFileSync('src/ssg/game/ui/terminal/commands.ts','utf8');
assert(!/resetYard|resetSandbox|!== 'sandbox'|=== 'yard'|hostOf\('yard'\)|hostOf\('sandbox'\)/.test(code),'no yard or sandbox ids for reset/resume');
console.log('Scene reset flags PASS: stage fields validate, compile, drive `reset <scene>` and sudo-only resume, editor controls, protected save and undo.');
process.exit(0);
