import * as InteractionRouting from '../../src/ssg/game/runtime/interaction-routing';
import {runtimeFixture} from './runtime-fixture.mts';
/** Critter reactions (engine/gameplay/critter-reactions.json): what a cat to pet or a pigeon to shoo answers, as a document the loop reads. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {mountRules} from './rules-harness.mts';
import {CRITTER_REACTIONS,validateCritterReactions,critterReaction,critterReply,type CritterReactionDocument} from '../../src/ssg/game/engine/gameplay/critter-reactions';
import {mountCritterReactionAuthoring} from '../../src/ssg/game/authoring/critter-reaction-authoring';
import {sourceDocuments,validateSourceDocuments} from '../../src/ssg/game/authoring/source-documents';
import {AuthoringStore} from '../../src/ssg/game/authoring/server/store';
import {Game} from '../../src/ssg/game/runtime/game';
import {newSave} from '../../src/ssg/game/runtime/save';
import {BOT_REACTIONS} from '../../src/ssg/game/engine/gameplay/bot-conversations';

// the shipped document is exactly what game.ts used to carry
const cat=[['The cat allows it. Then it decides it did not, and leaves.'],['The cat purrs, which is a lot of commitment from a street cat.'],['The cat sniffs your hand, finds no fish, and looks betrayed.']];
const pigeon=[['The pigeon takes one step to the side. Exactly one.'],['The pigeon flaps, lands a metre away, and looks at you like you started it.']];
assert.deepEqual(CRITTER_REACTIONS.critters.map(c=>[c.look,c.name,c.prompt]),[['cat','CAT','[E] PET'],['pigeon','PIGEON','[E] SHOO']]);
assert.deepEqual(CRITTER_REACTIONS.critters[0].talk,cat);assert.deepEqual(CRITTER_REACTIONS.critters[1].talk,pigeon);
// replies cycle by the n-th time, like the old `lines[n % lines.length]`
for(let n=0;n<7;n++){assert.deepEqual(critterReply(critterReaction({look:'cat'})!,n),cat[n%3]);assert.deepEqual(critterReply(critterReaction({look:'pigeon'})!,n),pigeon[n%2]);}
assert.equal(critterReaction({look:'gull'}),undefined,'only listed looks react');assert.equal(critterReaction({look:{bot:'loader'}} as never),undefined);assert.equal(critterReaction({}),undefined);

// validation
const shipped=()=>structuredClone(CRITTER_REACTIONS) as any;
for(const [name,mutate] of Object.entries({
 'unknown look':(d:any)=>{d.critters[0].look='dragon';},'duplicate look':(d:any)=>{d.critters[1].look='cat';},'duplicate id':(d:any)=>{d.critters[1].id='cat';},
 'extra field':(d:any)=>{d.critters[0].mood='sad';},'empty talk':(d:any)=>{d.critters[0].talk=[];},'empty reply':(d:any)=>{d.critters[0].talk[0]=[];},
 'blank page':(d:any)=>{d.critters[0].talk[0][0]=' ';},'blank prompt':(d:any)=>{d.critters[0].prompt='';},'wrong version':(d:any)=>{d.version=2;},
})){const bad=shipped();mutate(bad);assert.throws(()=>validateCritterReactions(bad),undefined,name);}

// the game loop offers the prompt and says the reply from the document it is given
const scene:any={id:'critter-test',name:'Critters',width:400,spawn:10,exits:[],people:[{look:'cat',x:10},{look:'pigeon',x:60},{look:'gull',x:110},{look:'cat',x:160,talk:[['Meow, said the talking cat.']]}]};
const make=(sources:object)=>{const game:any=runtimeFixture(Game),said:any[]=[];Object.assign(game,{save:newSave(),content:{'critter-test':scene},sources,botReactions:BOT_REACTIONS,say:(...a:any[])=>said.push(a),dialogueCompletion(){},scenes:Object.assign(game.scenes,{here:'critter-test',compiledScenes:new Map(),hosts:new Map([['critter-test',{model:{attachmentOffsets:()=>undefined}}]]),gameplaySessions:new Map()}),timing:Object.assign(game.timing,{t:0}),presentation:Object.assign(game.presentation,{petCount:0})});return{game,said};};
{const {game,said}=make({}),targets=game.lifeTargets(scene).filter((t:any)=>t.id.startsWith('pet:'));
 assert.deepEqual(targets.map((t:any)=>[t.id,t.label]),[['pet:0','[E] PET'],['pet:1','[E] SHOO']],'the gull has no reaction; the talking cat talks instead');
 for(let n=0;n<4;n++)InteractionRouting.useLife(game.interactionRoutingPort,'pet:0');InteractionRouting.useLife(game.interactionRoutingPort,'pet:1');
 assert.deepEqual(said.map(a=>[a[0],a[1]]),[['CAT',cat[0]],['CAT',cat[1]],['CAT',cat[2]],['CAT',cat[0]],['PIGEON',pigeon[0]]],'one shared counter, as before (the fifth reply overall is the first pigeon one)');}
{const custom=shipped() as CritterReactionDocument;custom.critters[0].prompt='[E] STROKE';custom.critters[0].name='MOGGY';custom.critters[0].talk=[['Purr.']];custom.critters.push({id:'gull',look:'gull',name:'GULL',prompt:'[E] WAVE',talk:[['Squawk.']]});
 const {game,said}=make({critters:validateCritterReactions(custom)}),targets=game.lifeTargets(scene).filter((t:any)=>t.id.startsWith('pet:'));
 assert.deepEqual(targets.map((t:any)=>[t.id,t.label]),[['pet:0','[E] STROKE'],['pet:1','[E] SHOO'],['pet:2','[E] WAVE']]);InteractionRouting.useLife(game.interactionRoutingPort,'pet:0');InteractionRouting.useLife(game.interactionRoutingPort,'pet:2');assert.deepEqual(said.map(a=>[a[0],a[1]]),[['MOGGY',['Purr.']],['GULL',['Squawk.']]]);}

// editor controls
const docs=new Map<string,unknown>([['critter-reactions',shipped()]]),ui=mountRules(mountCritterReactionAuthoring,docs),doc=()=>docs.get('critter-reactions') as CritterReactionDocument;
ui.change('Critter speaker name','KITTY');ui.change('Critter interaction prompt','[E] STROKE');ui.change('Critter reply 1 page 1','Edited.');ui.click('Add critter reply');ui.click('Add page to critter reply 1');
assert.deepEqual([doc().critters[0].name,doc().critters[0].prompt,doc().critters[0].talk[0],doc().critters[0].talk.length],['KITTY','[E] STROKE',['Edited.','New page'],4]);
ui.click('Remove critter reply 4');assert.equal(doc().critters[0].talk.length,3);
ui.click('Add critter reaction');assert.equal(doc().critters.length,3);assert.equal(doc().critters[2].look,'gull');
ui.click('Remove critter reaction');assert.equal(doc().critters.length,2);
const before=structuredClone(doc());ui.change('Critter interaction prompt','');assert.deepEqual(doc(),before,'invalid edits are refused');assert(ui.host.children[0].textContent);
assert(ui.saved.every(s=>s.id==='critter-reactions'));

// registered source document, protected save
const entry=sourceDocuments.find(d=>d.id==='critter-reactions')!;assert(entry);assert.equal(entry.kind,'rules');assert(fs.existsSync(path.join('src/ssg/game',entry.file)));
const evidence=path.resolve('../../.game-test-output/critter-reactions');fs.mkdirSync(evidence,{recursive:true});const root=fs.mkdtempSync(path.join(evidence,'run-'));
for(const d of sourceDocuments){const to=path.join(root,d.file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join('src/ssg/game',d.file),to);}
const store=new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}),original=fs.readFileSync(path.join(root,entry.file),'utf8');
const saved=store.save([{id:'critter-reactions',revision:store.read('critter-reactions').revision,value:doc()}]);
assert.equal((new AuthoringStore({root,documents:sourceDocuments,validateAll:validateSourceDocuments}).read('critter-reactions').value as CritterReactionDocument).critters[0].name,'KITTY');
const bad=doc();bad.critters[0].look='dragon';assert.throws(()=>store.save([{id:'critter-reactions',revision:store.read('critter-reactions').revision,value:bad}]));
store.undo(saved.transaction,Object.fromEntries(saved.documents.map(d=>[d.id,d.revision])));assert.equal(fs.readFileSync(path.join(root,entry.file),'utf8'),original);
console.log('Critter reactions PASS: shipped lines equal the old constants, cycling counter, the loop reads the given document, editor controls, protected save and undo.');
process.exit(0);
