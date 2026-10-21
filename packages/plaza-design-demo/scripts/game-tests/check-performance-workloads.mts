import assert from 'node:assert/strict';
import {PerformanceRecorder,startPerformance,stopPerformance,performanceRecording} from '../../src/ssg/game/runtime/diagnostics/performance';
import {SceneTime} from '../../src/ssg/game/engine/time';
import {validateReport} from '../performance/validate-report';
import {workloads} from '../performance/workloads';
let now=0;const source='sha256:'+'a'.repeat(64);
const recorder=new PerformanceRecorder({source,scenario:'downtown-quiet/run-1',capacity:16,environment:{smoke:true,activation:{owner:'parent',parentTrusted:true,childTrusted:false},visibility:[{at:0,hidden:false}]}},()=>now);
const token=recorder.begin('game.render');now=2;recorder.end(token);now=10;const report=recorder.stop();assert.equal(validateReport(report,source).status,'SMOKE');
for(const change of [(r:any)=>r.source='other',(r:any)=>r.summary['game.render'].p95=99,(r:any)=>delete r.summary['game.render'].p95,(r:any)=>r.samples[0].duration=NaN,(r:any)=>r.overflow=1,(r:any)=>r.incomplete=1,(r:any)=>r.samples[0].parent=0,(r:any)=>r.scenario='unknown/run-1']){const bad=structuredClone(report);change(bad);assert.throws(()=>validateReport(bad,source));}
const hidden=structuredClone(report);(hidden.environment.visibility as any[])[0].hidden=true;assert.equal(validateReport(hidden,source).status,'INVALID');
for(const activation of [{owner:'child',parentTrusted:true,childTrusted:false},{owner:'parent',parentTrusted:true,childTrusted:true},undefined]){const bad=structuredClone(report);bad.environment.activation=activation;assert.equal(validateReport(bad,source).status,'INVALID');}
const noFrames=structuredClone(report);noFrames.samples=[];noFrames.summary={};assert.equal(validateReport(noFrames,source).status,'INVALID');
const unfocused=structuredClone(report);(unfocused.environment.activation as any).parentTrusted=false;assert.equal(validateReport(unfocused,source).status,'INVALID');
assert.equal(workloads.length,6);assert.equal(new Set(workloads.map(w=>w.id)).size,6);
assert(!performanceRecording());const time=new SceneTime();let ran=0;
time.later(0,()=>{ran++;});time.advance(1);assert.equal(stopPerformance(),undefined);
startPerformance({source,scenario:'timer-callback',capacity:32});time.later(5,()=>{ran++;});time.advance(5);
const measured=stopPerformance()!;assert.equal(ran,2);assert.equal(measured.summary['timer.callback']!.count,1);assert.equal(measured.summary['timer.lateness']!.count,1);assert.equal(measured.samples.find(s=>s.span==='timer.callback')!.parent,-1);assert.equal(measured.incomplete,0);assert.equal(measured.invalidEnds,0);
time.clear();assert(!performanceRecording());
console.log('Performance workloads PASS: six finite manifests, raw/summary/source integrity, overflow/incomplete rejection, visibility/render/activation diagnostics, opt-in actual SceneTime callback CPU/lateness and unchanged disabled execution.');
