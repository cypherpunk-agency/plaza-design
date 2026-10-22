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
 const activation=r.environment.activation as {owner?:string;parentTrusted?:boolean;childTrusted?:boolean}|undefined;
 if(w.lane==='live-game'&&(!activation||activation.owner!=='parent'||activation.parentTrusted!==true||activation.childTrusted!==false))issues.push('workload lacks trusted parent activation provenance');
 if(w.id==='private-play'){const cycles=r.environment.cycles as any[];if(!Array.isArray(cycles)||cycles.length!==(smoke?1:w.operations)||cycles.some(c=>c.remainingFrames!==0||!c.opened.initialStorageEmpty||!c.stopped.private))issues.push('private lifecycle/isolation count');}
 else if(!smoke){if(r.durationMs<w.measureMs-100)issues.push('short measurement');const ops=r.environment.operations as any;
  if(w.id==='demo-fanout'&&(ops.actionCount!==w.operations||!(r.environment.final as any)?.state||((r.environment.final as any)?.state.count!==30)||!(r.environment.final as any)?.state.lampOn||!(r.environment.final as any)?.state.fanOn))issues.push('fanout operation count');
  if(w.id==='title-glide'&&(ops.actionCount!==1||Math.abs((r.environment.final as any)?.playMs-w.measureMs)>1))issues.push('glide did not run to its end');
  if(w.id==='board-cycles'&&(ops.boardOpens!==w.operations||ops.boardCloses!==w.operations))issues.push('board operation count');
  if(w.id==='scene-visits'&&JSON.stringify(ops.visits)!==JSON.stringify(Array.from({length:12},(_,i)=>['library','shop','laundromat','market'][i%4])))issues.push('visit operation sequence');
  if(w.lane==='live-game'&&!(r.summary['game.frame']?.count))issues.push('no native frames');
 }
 let scheduling:undefined|{activePlayMs:number;wallMs:number;activePlayRatio:number;frameCpuMs:number;frameCpuRatio:number;unadvancedWallMs:number;clampedRafMs:number};
 const baselineIssues:string[]=[];
 if(!smoke&&w.lane==='live-game'){
  const initial=(r.environment.initial as any)?.playMs,final=(r.environment.final as any)?.playMs;
  if(typeof initial!=='number'||!Number.isFinite(initial)||initial<0||typeof final!=='number'||!Number.isFinite(final)||final<initial)issues.push('missing or malformed active-play clock');
  else{
   const activePlayMs=final-initial,frameCpuMs=r.summary['game.frame']?.total??0;
   scheduling={activePlayMs,wallMs:r.durationMs,activePlayRatio:activePlayMs/r.durationMs,frameCpuMs,frameCpuRatio:frameCpuMs/r.durationMs,unadvancedWallMs:Math.max(0,r.durationMs-activePlayMs),clampedRafMs:r.samples.filter(s=>s.span==='raf.gap').reduce((sum,s)=>sum+Math.max(0,s.duration-3*16.67),0)};
   // Finite measurement-quality guard, not a frame-rate SLA or a cause/GPU diagnosis.
   // CPU-heavy slow workloads remain measurable; low progress with little measured
   // frame CPU cannot establish a representative active-play baseline.
   if(scheduling.activePlayRatio<.5&&scheduling.frameCpuRatio<.25)baselineIssues.push('unresolved frame scheduling / unmeasured presentation wait');
  }
 }
 const structuralValid=issues.length===0,baselineEligible=structuralValid&&!smoke&&baselineIssues.length===0;
 return{workload:w.id,repeat:Number(match[2]),smoke,structuralValid,baselineEligible,status:!structuralValid?'INVALID':smoke?'SMOKE':baselineEligible?'BASELINE':'INELIGIBLE',issues,baselineIssues,scheduling};
}
