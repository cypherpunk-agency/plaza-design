import assert from 'node:assert/strict';
import * as fs from 'node:fs';import * as path from 'node:path';
import {SANDBOX} from '../../src/ssg/game/data';
import {behaviorNoun,cloneBehavior,validateSandboxBehavior,preserveSandboxBehavior} from '../../src/ssg/game/authoring/behavior-validation';
import {AuthoringStore,StoreError} from '../../src/ssg/game/authoring/server/store';
import {createBehaviorSandbox} from '../../src/ssg/game/authoring/behavior-sandbox';
const scratch=path.resolve('../../.scene-system/evidence/s13-store');fs.mkdirSync(scratch,{recursive:true});const root=fs.mkdtempSync(path.join(scratch,'run-'));
const doc={id:'sandbox-behavior',kind:'behavior' as const,file:'devices.json',validate:validateSandboxBehavior,validateUpdate:preserveSandboxBehavior};
const err=(code:string)=>(e:unknown)=>e instanceof StoreError&&e.code===code;
try{
 const original=JSON.stringify(SANDBOX,null,2)+'\n';fs.writeFileSync(path.join(root,doc.file),original);
 const store=new AuthoringStore({root,documents:[doc]}),loaded=store.read(doc.id),edited=cloneBehavior(SANDBOX);behaviorNoun(edited,'lamp.lamp').on!.on={do:[{set:'lampOn',to:true},{set:'memo',to:2}],say:['ON','Edited through protected source service','ok']};
 const saved=store.save([{id:doc.id,revision:loaded.revision,value:edited}]);assert.equal(store.read(doc.id).kind,'behavior');assert.deepEqual(store.read(doc.id).value,edited);const reloaded=createBehaviorSandbox(store.read(doc.id).value as typeof SANDBOX);reloaded.trigger('lamp.lamp','on');assert.equal(reloaded.model.state.memo,2);assert.equal(reloaded.lines.at(-1)![1],'Edited through protected source service');reloaded.dispose();
 assert.throws(()=>store.save([{id:doc.id,revision:loaded.revision,value:SANDBOX}]),err('conflict'));
 const undo=store.undo(saved.transaction,{[doc.id]:saved.documents[0].revision});assert.equal(fs.readFileSync(path.join(root,doc.file),'utf8'),original);store.undo(undo.transaction,{[doc.id]:undo.documents[0].revision});assert.deepEqual(store.read(doc.id).value,edited);
 const protectedEdit=cloneBehavior(edited);protectedEdit.state.memo=2;const before=fs.readFileSync(path.join(root,doc.file),'utf8');assert.throws(()=>store.save([{id:doc.id,revision:store.read(doc.id).revision,value:protectedEdit}]),err('invalid'));assert.equal(fs.readFileSync(path.join(root,doc.file),'utf8'),before);
 // Genuine interrupted transaction: startup recovery uses the same strict descriptor and restores exact bytes.
 const tx='12345678-1234-1234-1234-123456789abc';fs.writeFileSync(path.join(root,'.authoring-history',tx+'.json'),JSON.stringify({version:1,transaction:tx,state:'prepared',entries:[{id:doc.id,before:original,after:before}]}));new AuthoringStore({root,documents:[doc]});assert.equal(fs.readFileSync(path.join(root,doc.file),'utf8'),original);
 assert.deepEqual(validateSandboxBehavior(JSON.parse(JSON.stringify(edited))),edited,'export/import round trip');
 console.log('S13 protected Save→reload→native evaluator, conflict, source undo/redo, protected subtree rejection and crash recovery passed');
}finally{const resolved=fs.realpathSync(root);assert.ok(resolved.startsWith(fs.realpathSync(scratch)+path.sep));fs.rmSync(resolved,{recursive:true,force:true});}
import {ComposerModel} from '../../src/ssg/game/authoring/app';
import {art} from '../../src/ssg/game/art';
const model=new ComposerModel(art,{},doc=>{if(doc.kind==='behavior')validateSandboxBehavior(doc.value);});model.load([{id:'sandbox-behavior',kind:'behavior',revision:'fixture',value:cloneBehavior(SANDBOX)}]);model.edit('sandbox-behavior','Valid handler',value=>{const d=value as typeof SANDBOX;behaviorNoun(d,'lamp.lamp').on!.on={do:[{set:'memo',to:2}]};return d;});assert.equal(model.dirty(),true);assert.equal(model.edits().length,1);model.undo();assert.equal(model.dirty(),false);model.redo();assert.equal(model.dirty(),true);const pending=model.get('sandbox-behavior');assert.throws(()=>model.edit('sandbox-behavior','Forbidden reward',value=>{const d=value as typeof SANDBOX;behaviorNoun(d,'lamp.lamp').on!.on={do:[{give:'chip'}]};return d;}));assert.deepEqual(model.get('sandbox-behavior'),pending,'invalid edit is rejected before entering model or history');assert.throws(()=>new ComposerModel(art).load([{id:'sandbox-behavior',kind:'behavior',revision:'fixture',value:SANDBOX}]),/validator/);console.log('S13 actual ComposerModel validated pending edits, undo/redo and invalid-before-history protection passed');
