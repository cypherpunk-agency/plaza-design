import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PerformanceRecorder} from '../../src/ssg/game/runtime/diagnostics/performance';
import {validateReport} from '../performance/validate-report';
const source='sha256:'+'a'.repeat(64);
function report(activePlayMs:number,cpu:number){let now=0;const rec=new PerformanceRecorder({source,scenario:'downtown-quiet/run-1',capacity:32,environment:{smoke:false,activation:{owner:'parent',parentTrusted:true,childTrusted:false},visibility:[{at:0,hidden:false}],initial:{playMs:100},final:{playMs:100+activePlayMs}}},()=>now);const f=rec.begin('game.frame'),r=rec.begin('game.render');now=cpu;rec.end(r);rec.end(f);now=30000;return rec.stop();}
const normal=validateReport(report(29900,1000),source);assert.equal(normal.status,'BASELINE');assert.equal(normal.structuralValid,true);assert.equal(normal.baselineEligible,true);
assert.equal(validateReport(report(6000,15000),source).status,'BASELINE','CPU-heavy slow work remains measurable');
assert.equal(validateReport(report(15000,1000),source).status,'BASELINE','50% active-play boundary is eligible');
assert.equal(validateReport(report(1000,7500),source).status,'BASELINE','25% CPU boundary is eligible');
const sparse=validateReport(report(1500,435),source);assert.equal(sparse.status,'INELIGIBLE');assert.equal(sparse.structuralValid,true);assert.equal(sparse.baselineEligible,false);assert.deepEqual(sparse.issues,[]);assert.match(sparse.baselineIssues[0],/unresolved frame scheduling/);assert.equal(sparse.scheduling!.activePlayRatio,.05);assert.equal(sparse.scheduling!.unadvancedWallMs,28500);
for(const clock of [undefined,NaN,-1,'100']){const r=report(29900,1000);(r.environment.initial as any).playMs=clock;assert.equal(validateReport(r,source).status,'INVALID');}
const backward=report(29900,1000);(backward.environment.final as any).playMs=99;assert.equal(validateReport(backward,source).status,'INVALID');
const runner=fs.readFileSync(new URL('../performance/runner.ts',import.meta.url),'utf8');assert.match(runner,/row.textContent.*saved.quality.status/);assert.match(runner,/Diagnostic archived, baseline ineligible/);assert.match(runner,/activePlayRatio.toFixed/);
console.log('Performance quality PASS: normal/CPU-heavy accepted; sparse scheduling structurally valid but baseline-ineligible; malformed/missing clocks invalid; UI exposes ratios.');
