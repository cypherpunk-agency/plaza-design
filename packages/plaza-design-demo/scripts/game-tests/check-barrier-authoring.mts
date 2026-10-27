/**
 * A level barrier's Access tab (authoring/barrier-authoring.ts, docs/design/SEAMLESS-WORLD.md §6.6, §6.8): the rule reads as a
 * sentence; the key, flag and `when` pickers edit the composition through the actual ComposerModel (history, projected
 * authored scene, bundle); Test the rule runs world/access.ts `barrierAccess` over a fixture; a phase override
 * (`phases.<p>.barriers.<id>`, an exit rule) opens or refuses through story-rules.ts and an unknown barrier id is refused;
 * never-passing rules are warned about, not blocked; protected Save round-trips and undoes to the bytes.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Element} from './rules-harness.mts';
import {mountBarrierAuthoring,barrierProblems,barrierRule,barrierSentence,barrierVocabulary,tryBarrier} from '../../src/ssg/game/authoring/barrier-authoring';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {ComposerModel} from '../../src/ssg/game/authoring/composer-model';
import {type EditorDocument} from '../../src/ssg/game/authoring/contracts';
import {createDocumentBundle,readDocumentBundle} from '../../src/ssg/game/authoring/document-bundle';
import {createSequenceValidationContext} from '../../src/ssg/game/art/core/sequence-context';
import {sceneCatalogueProjection} from '../../src/ssg/game/authoring/scene-catalogue-projection';
import {pendingRegistry} from '../../src/ssg/game/authoring/pending-registry';
import {barrierAccess,validateBarrierCondition} from '../../src/ssg/game/world/access';
import {barrierPhaseRule,barrierRuleOpens,gateFrame,type ExitRule} from '../../src/ssg/game/story/story-rules';
import {art,type ChunkDocument} from '../../src/ssg/game/art';
import {SCENES} from '../../src/ssg/game/scenes';

const evidence=path.resolve('../../.game-test-output/barrier-authoring');fs.mkdirSync(evidence,{recursive:true});const root=fs.mkdtempSync(path.join(evidence,'run-'));
for(const d of sourceDocuments){const to=path.join(root,d.file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),to);}
const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),initial=store.list();
const values=(docs:readonly EditorDocument[])=>new Map(docs.map(d=>[d.id,d.value]));
// the source owners only (projected authored.* children are their catalogue's)
const sources=(docs:readonly EditorDocument[])=>new Map(docs.filter(d=>!d.id.startsWith('authored.')).map(d=>[d.id,d.value]));
const context=createSequenceValidationContext(art,{},Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,s.exits.map(e=>e.id)])));
// each edit passes its document's own validator (the authored catalogue's validates the projected composition too)
const own=(d:EditorDocument)=>{sourceDocuments.find(e=>e.id===d.id)?.validate(d.value);};
const model=new ComposerModel(art,context,own,[sceneCatalogueProjection]);model.load(initial);
const DOC='authored.tower-annex',SCENE='tower-annex',ID='turnstile';
let handle:any;
const api={get:(id:string)=>model.get(id),edit:(id:string,label:string,value:unknown)=>{model.edit(id,label,()=>value);handle?.refresh?.();},undo:()=>{model.undo();handle?.refresh?.();}};
const host=new Element();handle=mountBarrierAuthoring(host as any,{documents:model.list(),openScene:()=>{},openInstance:()=>{},scene:SCENE,authoring:api} as any,{scene:SCENE,document:DOC,instance:ID});
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)],rows=()=>all(host);
const field=(name:string)=>{const e=rows().find(e=>e.attributes['aria-label']===name);assert(e,'field '+name);return e;};
const has=(name:string)=>rows().some(e=>e.attributes['aria-label']===name);
const change=(name:string,value:string|boolean)=>{const e=field(name);if(typeof value==='boolean')e.checked=value;else e.value=value;e.onchange!();};
// Test the rule's toggles are buttons: switch one to the wanted state
const toggle=(label:string,on:boolean)=>{const e=rows().find(e=>e.textContent===label&&e.onclick);assert(e,'toggle '+label);if((e.attributes['aria-pressed']==='true')!==on)e.onclick!();assert.equal(rows().find(e=>e.textContent===label)!.attributes['aria-pressed'],String(on));};
const props=()=>((model.get(DOC).value as ChunkDocument).instances.find(n=>n.id===ID)!.props);
const tried=()=>field('Test result').textContent,warnings=()=>field('Barrier warnings').children.map(c=>c.textContent);
const REFUSE='TURNSTILE · NO VALID CHIP. PRESENT UPLINK.';

// the annex turnstile's rule as a sentence; the key comes from the pending keyring
assert.equal(field('Barrier rule').textContent,'Opens when you carry UPLINK.SO · Refuses with: “'+REFUSE+'”');
// the Access header with the rule comes first; the pickers say what the barrier needs
assert.equal(host.children[1].className,'barrier-head');assert.equal(host.children[1].children[0].textContent,'Access · when turnstile opens');
assert(['What it needs','Test the rule','Story phases','Checks'].every(t=>rows().some(e=>e.textContent===t)),'the sections are named in plain words');
assert(field('Needs key chip').children.some(o=>o.value==='uplink'&&o.textContent==='UPLINK.SO · uplink'),'keys are picked from the keyring');
assert(field('Needs flag').children.some(o=>o.value==='opening:street'),'flags are picked from the declared flags');
assert.deepEqual(warnings(),['No warnings: the sources can open it.']);

// Test the rule: pure barrierAccess over a fixture, nothing committed
assert.equal(tried(),'Refuses: “'+REFUSE+'”');
toggle('Carrying UPLINK.SO',true);assert.equal(tried(),'Opens');assert.equal(field('Test result').className,'barrier-result ok');
const undoBefore=model.undoLabel;assert.equal(model.dirty(),false,'Test the rule edits no source');assert.equal(model.undoLabel,undoBefore);

// the flag picker: one history step of the projected composition (its catalogue owner)
change('Needs flag','opening:street');assert.equal(props().flag,'opening:street');assert.equal(model.undoLabel,'Barrier flag opening:street');
assert.deepEqual(model.edits().map(e=>e.id),['authored-scenes'],'the projected composition edits its catalogue owner');
assert.equal(field('Barrier rule').textContent,'Opens when you carry UPLINK.SO and once flag opening:street is set · Refuses with: “'+REFUSE+'”');
assert.equal(tried(),'Refuses: “'+REFUSE+'”','the new flag is not set in the fixture');
toggle('Flag opening:street set',true);assert.equal(tried(),'Opens');

// the shared gameplay condition picker writes `when`
change('Only while type','flag');assert.equal(typeof props().when,'object');
change('Only while flag','opening:uplink');assert.deepEqual(props().when,{flag:'opening:uplink'});
assert.match(field('Barrier rule').textContent,/, once flag opening:street is set and while flag opening:uplink is set · /);
assert.equal(tried(),'Refuses: “'+REFUSE+'”');toggle('Flag opening:uplink set',true);assert.equal(tried(),'Opens');
assert(!field('Only while type').children.some(o=>o.value==='objective'),'a barrier condition reads no objective');
// the only saved state it offers is the world-level shared state (world/state-owners.json), never a scene's own
change('Only while type','state');assert(Object.keys(props().when as object).includes('state'));
assert.deepEqual(field('Only while state').children.map(o=>o.value).filter(v=>!v.startsWith('shift.')),[],'only shared shift.* keys are offered');
assert.doesNotThrow(()=>validateBarrierCondition(props().when));
change('Only while type','flag');change('Only while flag','opening:uplink');
// an invalid condition is refused atomically by the composition's own validation
{const before=structuredClone(model.get(DOC).value),label=model.undoLabel;
 const bad=structuredClone(before) as ChunkDocument;bad.instances.find(n=>n.id===ID)!.props.when=[1,2] as never;
 assert.throws(()=>api.edit(DOC,'probe',bad));assert.deepEqual(model.get(DOC).value,before);assert.equal(model.undoLabel,label);}
assert.throws(()=>validateBarrierCondition({state:'x',is:true}),/barrier condition/);
assert.throws(()=>validateBarrierCondition({all:[]}),/empty condition/);
assert.deepEqual(validateBarrierCondition({any:[{flag:'a'},{item:'b',atLeast:1}]}),{any:[{flag:'a'},{item:'b',atLeast:1}]});
// the runtime's own call: `when` needs the gameplay state
const rule=barrierRule(props());
assert.equal(barrierAccess(rule,{'opening:street':true},['uplink']).ok,false,'without a state a when refuses');
assert.equal(barrierAccess(rule,{'opening:street':true},['uplink'],{flags:{'opening:uplink':true},items:{},tokens:0}).ok,true);
// undo / redo through the model
change('Only while type','always');assert.equal(props().when,null);model.undo();assert.deepEqual(props().when,{flag:'opening:uplink'});
change('Refuses with','STAFF ONLY.');assert.equal(props().refuse,'STAFF ONLY.');

// §6.8: warnings listed, not blocking
const vocab=barrierVocabulary(values(model.list()));
assert.deepEqual(barrierProblems({key:'nope',flag:'nobody:declares',refuse:'x'},vocab),['Never opens: no keyring chip “nope” exists.','Never opens: no gameplay source declares flag “nobody:declares”.']);
const unset=[...vocab.flags].find(f=>!vocab.setFlags.has(f));
if(unset)assert.deepEqual(barrierProblems({flag:unset,refuse:'x'},vocab),['May never open: nothing in the sources sets flag “'+unset+'” (code may).']);
assert.deepEqual(barrierProblems({when:{any:[{flag:'ghost'},{item:'ghost-item',atLeast:1}]},refuse:'x'},vocab),['Its condition names flag “ghost”, which no gameplay source declares.','Its condition names item “ghost-item”, which no gameplay source declares.']);
assert.deepEqual(barrierProblems(rule,vocab),[],'opening:street and opening:uplink are set by the opening');
assert.equal(barrierSentence({refuse:'x'}),'Opens for anyone: it has no rule.');

// phase overrides: phases.<p>.barriers.<id>, the exits' ExitRule shape, applied by story-rules.ts
const GATE:ExitRule={gate:{verifying:'TURNSTILE: verifying',ok:'TURNSTILE: verifying… … ok.',verifyFrames:150,okFrames:50,dotEvery:20,begin:[{sound:'blip'}],then:[{sound:'granted'},{milestone:'street'}]}};
const SAY:ExitRule={say:{name:'YOU',pages:['Not this way.']}};
const withPhases=(barriers:Record<string,ExitRule>)=>{const c=structuredClone(model.get('authored-scenes').value) as any;c.scenes.find((e:any)=>e.scene.id===SCENE).scene.phases={home:{barriers}};return c;};
// an unknown barrier id is refused by the pending source graph (and by protected Save, below)
assert.throws(()=>validateSourceDocuments(new Map([...sources(model.list())].map(([k,v])=>[k,k==='authored-scenes'?withPhases({nope:SAY}):v]))),/barriers\/nope: unknown barrier/);
api.edit('authored-scenes','Add barrier phase rule',withPhases({[ID]:GATE,}));
validateSourceDocuments(sources(model.list()));
assert.equal(field('Phase rule home').textContent,'In phase home: verify 150 frames, ok 50, milestone street, then it opens.');
toggle('Carrying UPLINK.SO',false);assert.match(tried(),/^Refuses/);assert.equal(field('Test result').className,'barrier-result error');
change('During story phase','home');assert.equal(tried(),'In phase home: verify 150 frames, ok 50, milestone street, then it opens.','the phase rule replaces the barrier\'s own');
assert.deepEqual(tryBarrier(rule,{keys:[],flags:{}},{id:'home',rule:SAY}),{opens:false,text:'In phase home: YOU says “Not this way.”; it stays shut.'});
// what the game loop asks (runtime/game.ts passBarrier → storyExit): the pending registry's compiled level and phases
const def=pendingRegistry(values(model.list()))[SCENE]!,barriers=def.level!.barriers!;
const asked=barrierPhaseRule('barrier:'+ID,barriers,[],()=>def.phases?.home);
assert.deepEqual(asked?.rule,GATE,'in phase home E at the turnstile runs its gate');assert.equal(asked!.x,600);
assert.ok(barrierRuleOpens(asked!.rule)&&gateFrame(GATE.gate,0).done===false&&gateFrame(GATE.gate,200).done,'verifies for its beat, then opens');
assert.equal(barrierRuleOpens(SAY),false,'a say only speaks: it stays shut');
assert.equal(barrierPhaseRule('barrier:'+ID,barriers,[],()=>def.phases?.flat),undefined,'another phase: the barrier\'s own rule');
assert.equal(barrierPhaseRule('barrier:'+ID,barriers,[ID],()=>def.phases?.home),undefined,'an opened barrier stays open');
assert.equal(barrierPhaseRule('lift:x',barriers,[],()=>def.phases?.home),undefined);
assert.deepEqual(barrierPhaseRule('barrier:annex/'+ID,[{id:'annex/'+ID,x:5,h:0,zone:'annex'}],[],z=>z==='annex'?def.phases?.home:undefined)?.rule,GATE,'a joined zone\'s barrier asks its own zone\'s phases');

// history and the bundle carry the same documents
const pending=values(model.list());
const receiver=new ComposerModel(art,context,own,[sceneCatalogueProjection]);receiver.load(initial);receiver.importDocuments(readDocumentBundle(createDocumentBundle(model.edits(),model.list()),receiver.list()));
assert.deepEqual(receiver.get(DOC).value,pending.get(DOC));assert.deepEqual(receiver.get('authored-scenes').value,pending.get('authored-scenes'));

// protected Save: refuses an unknown phase barrier before writing; round-trips; undoes to the bytes
const entry=sourceDocuments.find(d=>d.id==='authored-scenes')!,file=path.join(root,entry.file),bytes=fs.readFileSync(file,'utf8'),doc=store.read('authored-scenes');
assert.throws(()=>store.save([{id:'authored-scenes',revision:doc.revision,value:withPhases({nope:SAY})}]),/unknown barrier/);assert.equal(fs.readFileSync(file,'utf8'),bytes);
const saved=store.save(model.edits().map(e=>({id:e.id,revision:e.revision,value:e.value})));model.confirmSaved(saved.documents);assert.equal(model.dirty(),false);
const reread=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}).read('authored-scenes').value as any,annex=reread.scenes.find((e:any)=>e.scene.id===SCENE);
assert.deepEqual(annex.composition.instances.find((n:any)=>n.id===ID).props,{style:'turnstile',width:24,key:'uplink',flag:'opening:street',refuse:'STAFF ONLY.',when:{flag:'opening:uplink'}});
assert.deepEqual(annex.scene.phases,{home:{barriers:{[ID]:GATE}}});
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.equal(fs.readFileSync(file,'utf8'),bytes);
console.log('Barrier authoring PASS: readable rule, keyring/flag/condition pickers through the model/history/bundle, Test the rule over barrierAccess, phase overrides open and refuse through story-rules and unknown ids are refused, §6.8 warnings listed, protected Save round-trip and byte undo. Evidence: '+root);
process.exit(0);
