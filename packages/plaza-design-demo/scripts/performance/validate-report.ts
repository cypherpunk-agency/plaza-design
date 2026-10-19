import {SPANS,type PerformanceReport} from '../../src/ssg/game/runtime/diagnostics/performance';
import {workload,repetitions} from './workloads';
/** Raw reports are evidence only after structural, timing and workload checks. */
export function validateReport(value:unknown,source:string){
 const r=value as PerformanceReport;if(!r||r.version!==1||r.source!==source||!Number.isFinite(r.durationMs)||r.durationMs<=0||!Array.isArray(r.samples)||r.samples.length>131072||r.samples.length>r.capacity||r.overflow||r.incomplete||r.invalidEnds)throw new Error('Invalid/incomplete performance report');
 const match=/^([a-z-]+)\/run-([1-3])$/.exec(r.scenario);if(!match||Number(match[2])>repetitions)throw new Error('Invalid scenario/repeat');const w=workload(match[1]),smoke=r.environment.smoke===true;
 const ids=new Set<number>();for(const s of r.samples){if(!SPANS.includes(s.span)||!Number.isInteger(s.id)||ids.has(s.id)||!Number.isInteger(s.parent)||s.parent>=s.id||s.parent< -1||!Number.isFinite(s.start)||s.start<0||s.start>r.durationMs+1||!Number.isFinite(s.duration)||s.duration<0)throw new Error('Invalid raw span');ids.add(s.id);}
 for(const span of SPANS){const values=r.samples.filter(s=>s.span===span).map(s=>s.duration).sort((a,b)=>a-b),summary=r.summary[span];if(!values.length){if(summary)throw new Error('Invented summary');continue;}const q=(p:number)=>values[Math.ceil(values.length*p)-1],expected={count:values.length,p50:q(.5),p95:q(.95),p99:q(.99),total:values.reduce((a,b)=>a+b,0)};for(const[k,v]of Object.entries(expected))if(!summary||!Number.isFinite((summary as any)[k])||Math.abs((summary as any)[k]-v)>1e-6)throw new Error('Summary disagrees with raw samples');}
 const issues:string[]=[];const visibility=r.environment.visibility as {hidden:boolean}[]|undefined;if(!visibility?.length||visibility.some(e=>e.hidden))issues.push('hidden or unrecorded visibility');
 if(w.lane==='live-game'&&!(r.summary['game.render']?.count))issues.push('no native rendered frames');
 if(w.lane==='live-game'&&r.environment.trustedActivation!==true)issues.push('frame lacks trusted interaction');
 if(w.id==='private-play'){const cycles=r.environment.cycles as any[];if(!Array.isArray(cycles)||cycles.length!==(smoke?1:w.operations)||cycles.some(c=>c.remainingFrames!==0||!c.opened.initialStorageEmpty||!c.stopped.private))issues.push('private lifecycle/isolation count');}
 else if(!smoke){if(r.durationMs<w.measureMs-100)issues.push('short measurement');const ops=r.environment.operations as any;
  if(w.id==='demo-fanout'&&(ops.actionCount!==w.operations||!(r.environment.final as any)?.state||((r.environment.final as any)?.state.count!==30)||!(r.environment.final as any)?.state.lampOn||!(r.environment.final as any)?.state.fanOn))issues.push('fanout operation count');
  if(w.id==='board-cycles'&&(ops.boardOpens!==w.operations||ops.boardCloses!==w.operations))issues.push('board operation count');
  if(w.id==='scene-visits'&&JSON.stringify(ops.visits)!==JSON.stringify(Array.from({length:12},(_,i)=>['library','shop','laundromat','market'][i%4])))issues.push('visit operation sequence');
  if(w.lane==='live-game'&&!(r.summary['game.frame']?.count))issues.push('no native frames');
 }
 return{workload:w.id,repeat:Number(match[2]),smoke,status:issues.length?'INVALID':smoke?'SMOKE':'BASELINE',issues};
}
