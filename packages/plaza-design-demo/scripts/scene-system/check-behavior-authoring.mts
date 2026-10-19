import assert from 'node:assert/strict';
import {SANDBOX} from '../../src/ssg/game/data';
import {validateSandboxBehavior,behaviorNoun,cloneBehavior} from './legacy-s13/behavior-validation';
import {createBehaviorSandbox} from './legacy-s13/behavior-sandbox';
const data=validateSandboxBehavior(SANDBOX);
const session=createBehaviorSandbox(data);
session.trigger('sensor.eye','wave');assert.equal(session.model.state.lampOn,false);session.advance(149);assert.equal(session.model.state.lampOn,false);session.advance(1);assert.equal(session.model.state.lampOn,true);assert.equal(session.model.scratch['pulse.sensor'],0);assert.equal(session.model.scratch['pulse.sensor.eye'],0);
session.reset();session.trigger('sensor.eye','wave');session.reset();session.advance(1000);assert.equal(session.model.state.lampOn,false);
session.trigger('memo.memo','write');session.trigger('memo.memo','write');session.trigger('memo.memo','write');assert.equal(session.model.state.memo,0);
const edited=cloneBehavior(data);behaviorNoun(edited,'lamp.lamp').on!.on=[{if:'lampOn',do:[{set:'memo',to:2}]},{do:[{set:'lampOn',to:true},{if:'lampOn',set:'memo',to:1}]}];const e=createBehaviorSandbox(edited);e.trigger('lamp.lamp','on');assert.equal(e.model.state.memo,1);e.trigger('lamp.lamp','on');assert.equal(e.model.state.memo,2);
assert.deepEqual(e.trace.map(t=>t.phase).slice(0,8),['trigger','condition','condition','action','result','action','result','result']);
const save=e.snapshot();e.trigger('lamp.lamp','off');e.restore(save);assert.equal(e.model.state.lampOn,true);assert.equal(e.pending,0);e.reset();assert.equal(e.model.state.lampOn,false);
for(const mutate of [(d:typeof data)=>{d.state.lampOn=true;},(d:typeof data)=>{behaviorNoun(d,'lamp.lamp').on!.on={do:[{effect:'sbx.reset'}]};},(d:typeof data)=>{behaviorNoun(d,'lamp.lamp').on!.on={if:'weather=rain'};},(d:typeof data)=>{d.cables![0].to='missing.noun';},(d:typeof data)=>{behaviorNoun(d,'memo.memo').on!.write={do:[{set:'memo',to:1.5}]};}]){const bad=cloneBehavior(data);mutate(bad);assert.throws(()=>validateSandboxBehavior(bad));}
const cycle=cloneBehavior(data);cycle.cables!.find(c=>c.id==='sbx.motion')!.to='sensor.eye';cycle.cables!.find(c=>c.id==='sbx.motion')!.verb='wave';assert.throws(()=>validateSandboxBehavior(cycle),/cycle/);
const observed=createBehaviorSandbox(data,()=>{throw new Error('diagnostic failure');});observed.trigger('lamp.lamp','on');assert.equal(observed.model.state.lampOn,true);
for(const s of [session,e,observed])s.dispose();
console.log('S13 native timing, first match, sequential actions, protected edits, cycles, persistence and observer isolation passed');
import {SceneModel} from '../../src/ssg/game/engine/model';
import {SANDBOX_RULES} from '../../src/ssg/game/scenes/sandbox/rules';
// The trace observer has no effect on native rules, lines, links or timers.
for(const observer of [undefined,()=>{},()=>{throw new Error('ignored');}]){
 const lines:unknown[]=[],m=new SceneModel({say:l=>lines.push(l),open:()=>{},changed:()=>{},observe:observer},cloneBehavior(data),SANDBOX_RULES);let clock=0;const callbacks:{at:number,fn:()=>void}[]=[];m.now=()=>clock;m.wall=()=>clock;m.later=(ms,fn)=>callbacks.push({at:clock+ms,fn});m.act('sensor','eye','wave');m.act('hatch','hatch','open');m.act('hatch','hatch','open');assert.equal(callbacks.filter(c=>c.at===150).length,2,'already-open branch does not reemit');clock=150;callbacks.filter(c=>c.at===150).forEach(c=>c.fn());assert.equal(m.state.lampOn,true);assert.equal(m.state.fanOn,true);assert.equal(lines.length,5);m.reset();
}
const wiring=createBehaviorSandbox(data);wiring.model.connect('sensor.eye:motion','lamp.lamp','off');const prior=wiring.snapshot();const defaults=cloneBehavior(data);defaults.cables!.find(c=>c.id==='sbx.motion')!.verb='on';const resumed=createBehaviorSandbox(defaults);resumed.restore(prior);assert.equal(resumed.model.links.find(l=>l.from==='sensor.eye:motion'&&l.to==='lamp.lamp')!.verb,'off','saved verb overrides matching source default');resumed.reset();assert.equal(resumed.model.links.find(l=>l.from==='sensor.eye:motion')!.verb,'on');
wiring.reset();wiring.model.cut(wiring.model.links.find(l=>l.wired==='sbx.motion')!);const cut=wiring.snapshot();resumed.restore(cut);assert.equal(resumed.model.links.some(l=>l.wired==='sbx.motion'),false);resumed.reset();assert.equal(resumed.model.links.some(l=>l.wired==='sbx.motion'),true);
const changedEndpoint=cloneBehavior(defaults);changedEndpoint.cables!.find(c=>c.id==='sbx.motion')!.to='fan.fan';changedEndpoint.cables!.find(c=>c.id==='sbx.motion')!.verb='spin';const moved=createBehaviorSandbox(changedEndpoint);moved.restore(prior);assert.ok(moved.model.links.some(l=>l.from==='sensor.eye:motion'&&l.to==='lamp.lamp'));assert.ok(moved.model.links.some(l=>l.from==='sensor.eye:motion'&&l.to==='fan.fan'),'native restore adds new default beside old saved endpoint');
resumed.trigger('sensor.eye','wave');const pendingSave=resumed.snapshot();resumed.restore(pendingSave);resumed.advance(500);assert.equal(resumed.model.state.lampOn,false,'restore cancels in-flight signals');for(const s of[wiring,resumed,moved])s.dispose();
console.log('S13 absent/throwing observer native equivalence, hatch repeat suppression, old saved wiring/cuts/new endpoints, restore cancellation passed');
import {runBehaviorParity,runBehaviorRestoreSafety} from './behavior-authoring-fixture';
const result=runBehaviorParity();assert.equal(result.count,17);assert.deepEqual(result.failed,[]);console.log('S13 all 17 browser-ready workbench/direct-native operation sequences match');

// Closed typed boundary rejection matrix (edits never reach the source store).
const unsupported:[string,(d:typeof data)=>void][]=[
 ['case window',d=>{behaviorNoun(d,'lamp.lamp').on!.on={when:{from:1,to:2} as never};}],
 ['wildcard handler',d=>{behaviorNoun(d,'lamp.lamp').on!['*']={};}],
 ['new verb',d=>{behaviorNoun(d,'lamp.lamp').verbs!.push('explode');}],
 ['unknown event',d=>{behaviorNoun(d,'sensor.eye').on!.wave={do:[{emit:'unknown'},{effect:'sbx.pulse'}]};}],
 ['effect removal',d=>{behaviorNoun(d,'sensor.eye').on!.wave={};}],
 ['effect duplicate',d=>{behaviorNoun(d,'sensor.eye').on!.wave={do:[{effect:'sbx.pulse'},{effect:'sbx.pulse'}]};}],
 ['reward',d=>{behaviorNoun(d,'lamp.lamp').on!.on={do:[{give:'chip'}]};}],
 ['panel',d=>{behaviorNoun(d,'lamp.lamp').on!.on={do:[{open:'talk'}]};}],
 ['condition type',d=>{behaviorNoun(d,'lamp.lamp').on!.on={if:'lampOn=1'};}],
 ['condition expression',d=>{behaviorNoun(d,'lamp.lamp').on!.on={if:'lampOn&&fanOn'};}],
 ['memo range',d=>{behaviorNoun(d,'memo.memo').on!.write={do:[{set:'memo',to:3}]};}],
 ['boolean literal',d=>{behaviorNoun(d,'lamp.lamp').on!.on={do:[{set:'lampOn',to:1}]};}],
 ['unbounded cases',d=>{behaviorNoun(d,'lamp.lamp').on!.on=Array.from({length:9},()=>({}));}],
 ['unbounded actions',d=>{behaviorNoun(d,'lamp.lamp').on!.on={do:Array.from({length:9},()=>({set:'lampOn',to:true}))};}],
 ['long response',d=>{behaviorNoun(d,'lamp.lamp').on!.on={say:['x'.repeat(501),'reply']};}],
 ['response template',d=>{behaviorNoun(d,'lamp.lamp').on!.on={say:['{weather}','reply']};}],
 ['protected cable',d=>{d.cables!.find(c=>c.id!=='sbx.motion'&&c.id!=='sbx.hatch.fan')!.verb='off';}],
 ['invalid cable verb',d=>{d.cables!.find(c=>c.id==='sbx.motion')!.verb='spin';}],
 ['protected tuning',d=>{d.tuning.extra=1;}],
 ['nonfinite',d=>{behaviorNoun(d,'memo.memo').on!.write={do:[{set:'memo',to:NaN}]};}],
];
for(const[name,change]of unsupported){const bad=cloneBehavior(data);try{change(bad);}catch(e){throw new Error('Bad test fixture '+name+': '+e);}assert.throws(()=>validateSandboxBehavior(bad),undefined,name);}
console.log(`S13 ${unsupported.length} unsupported-edit rejection cases passed`);

// Two separately valid source topologies may become cyclic after native old-save/default merging.
const oldTopology=cloneBehavior(data);oldTopology.cables!.find(c=>c.id==='sbx.motion')!.to='hatch.hatch';oldTopology.cables!.find(c=>c.id==='sbx.motion')!.verb='open';behaviorNoun(oldTopology,'hatch.hatch').on!.open={do:[{set:'hatchOpen',to:true},{emit:'opened'}]};const oldLab=createBehaviorSandbox(oldTopology),oldSave=oldLab.snapshot();
const newTopology=cloneBehavior(oldTopology);newTopology.cables!.find(c=>c.id==='sbx.motion')!.to='lamp.lamp';newTopology.cables!.find(c=>c.id==='sbx.motion')!.verb='on';newTopology.cables!.find(c=>c.id==='sbx.hatch.fan')!.to='sensor.eye';newTopology.cables!.find(c=>c.id==='sbx.hatch.fan')!.verb='wave';validateSandboxBehavior(newTopology);const newLab=createBehaviorSandbox(newTopology);newLab.trigger('sensor.eye','wave');assert.ok(newLab.pending>0);assert.throws(()=>newLab.restore(oldSave),/Unsafe.*restored Sandbox preview.*cycle/);assert.equal(newLab.pending,0);assert.equal(newLab.time,0);assert.equal(newLab.model.state.hatchOpen,false);assert.equal(newLab.model.links.filter(l=>l.from==='sensor.eye:motion').length,1);newLab.advance(1000);assert.equal(newLab.model.state.hatchOpen,false);newLab.trigger('sensor.eye','wave');newLab.advance(150);assert.equal(newLab.model.state.lampOn,true,'laboratory recovers to valid current defaults after refusing old merged cycle');oldLab.dispose();newLab.dispose();console.log('S13 unsafe restored old-save/default merged cycle rejected, pending signals canceled, current defaults restored and lab reusable');

assert.equal(runBehaviorRestoreSafety().equal,true,'browser-ready unsafe restore proof');
