/** Opt-in local CPU recorder. No storage, timers, observers or allocations per sample. */
export const SPANS=['game.frame','game.update','game.render','render.total','render.prepare','render.world','render.actors','render.finish','host.tick','save.total','save.stringify','save.write','raf.gap','workload.action','play.start','play.stop','timer.callback','timer.lateness','editor.command','editor.action','editor.documents','editor.validate','editor.header','editor.options','editor.outline','editor.inspector','editor.timeline'] as const;
export type Span=typeof SPANS[number];
export interface PerformanceOptions {source:string;scenario:string;capacity?:number;environment?:Record<string,unknown>}
export interface PerformanceReport {
  version:1;source:string;scenario:string;environment:Record<string,unknown>;started:number;durationMs:number;
  capacity:number;overflow:number;incomplete:number;invalidEnds:number;
  samples:{id:number;span:Span;start:number;duration:number;parent:number;owner:string|null}[];
  summary:Partial<Record<Span,{count:number;p50:number;p95:number;p99:number;total:number}>>;
  limitations:string[];
}
export class PerformanceRecorder {
  private startTimes:Float64Array;private durations:Float64Array;private parents:Int32Array;private kinds:Uint8Array;
  private owners:string[]=[];private ownerIds=new Map<string,number>();private ownerTags:Int16Array;
  private stack=new Int32Array(64);private depth=0;private count=0;private overflow=0;private invalidEnds=0;
  private started:number;private ended?:number;
  readonly capacity:number;
  constructor(readonly options:PerformanceOptions,private now:()=>number=()=>performance.now()){
    const capacity=options.capacity??32768;if(!Number.isInteger(capacity)||capacity<16||capacity>1000000)throw new Error('Performance capacity must be 16..1000000');
    if(!options.source.trim()||!options.scenario.trim())throw new Error('Performance source/scenario required');
    this.capacity=capacity;this.ownerTags=new Int16Array(capacity);this.ownerTags.fill(-1);this.startTimes=new Float64Array(capacity);this.durations=new Float64Array(capacity);this.durations.fill(-1);this.parents=new Int32Array(capacity);this.kinds=new Uint8Array(capacity);this.started=now();
  }
  begin(span:Span,owner?:string){
    if(this.ended!==undefined)return -1;
    if(this.count===this.capacity||this.depth===this.stack.length){this.overflow++;return -1;}
    let ownerId=-1;if(owner!==undefined){ownerId=this.ownerIds.get(owner)??-1;if(ownerId<0&&this.owners.length<128){ownerId=this.owners.length;this.owners.push(owner);this.ownerIds.set(owner,ownerId);}}
    const token=this.count++;this.ownerTags[token]=ownerId;this.kinds[token]=SPANS.indexOf(span);this.startTimes[token]=this.now()-this.started;this.parents[token]=this.depth?this.stack[this.depth-1]:-1;this.stack[this.depth++]=token;return token;
  }
  end(token:number){
    if(token<0)return;
    if(this.ended!==undefined||!this.depth||this.stack[this.depth-1]!==token){this.invalidEnds++;return;}
    this.depth--;this.durations[token]=Math.max(0,this.now()-this.started-this.startTimes[token]);
  }
  sample(span:Span,duration:number){const token=this.begin(span);if(token>=0){this.depth--;this.durations[token]=Number.isFinite(duration)?Math.max(0,duration):0;}}
  stop(){this.ended??=this.now();return this.report();}
  report():PerformanceReport{
    const samples:PerformanceReport['samples']=[],summary:PerformanceReport['summary']={};let incomplete=0;
    for(let i=0;i<this.count;i++){if(this.durations[i]<0){incomplete++;continue;}samples.push({id:i,span:SPANS[this.kinds[i]],start:this.startTimes[i],duration:this.durations[i],parent:this.parents[i],owner:this.owners[this.ownerTags[i]]??null});}
    for(const span of SPANS){const values=samples.filter(s=>s.span===span).map(s=>s.duration).sort((a,b)=>a-b);if(values.length){const q=(p:number)=>values[Math.max(0,Math.ceil(values.length*p)-1)];summary[span]={count:values.length,p50:q(.5),p95:q(.95),p99:q(.99),total:values.reduce((a,b)=>a+b,0)};}}
    return {version:1,source:this.options.source,scenario:this.options.scenario,environment:structuredClone(this.options.environment??{}),started:this.started,durationMs:(this.ended??this.now())-this.started,capacity:this.capacity,overflow:this.overflow,incomplete,invalidEnds:this.invalidEnds,samples,summary,limitations:['CPU submission durations, not raster/GPU completion or presented frames.','Nested span totals overlap; do not sum inclusive totals. Async host/save samples outside RAF retain parent -1.','RAF gaps include stalls; visibility and environment must be considered before interpreting tails.','No mobile, optimization, recorder-overhead or frame-budget claim follows from a single recording.']};
  }
}
let active:PerformanceRecorder|undefined;
export const performanceRecording=()=>active!==undefined;
export function startPerformance(options:PerformanceOptions){if(active)throw new Error('Performance recording already active');return active=new PerformanceRecorder(options);}
export function stopPerformance(){const recorder=active;active=undefined;return recorder?.stop();}
export function perfBegin(span:Span,owner?:string){return active?.begin(span,owner)??-1;}
export function perfEnd(token:number){active?.end(token);}
export function perfSample(span:Span,duration:number){active?.sample(span,duration);}
export function perfMeasure<T>(span:Span, work:()=>T):T { const token=perfBegin(span);try{return work();}finally{perfEnd(token);} }

/** Bounded synthetic probe in the current JS environment, not a game-speed or GPU benchmark. */
export function calibratePerformance(){
  if(active)throw new Error('Stop the current recording before measuring recorder overhead');
  const iterations=10000,rounds:{disabledMs:number;enabledMs:number;extraMicrosecondsPerSpan:number}[]=[];
  let checksum=0;
  const run=(enabled:boolean)=>{if(enabled)startPerformance({source:'recorder-calibration',scenario:'synthetic-span',capacity:iterations+16});const start=performance.now();for(let i=0;i<iterations;i++){const token=perfBegin('game.update');checksum=(checksum+i)%997;perfEnd(token);}const elapsed=performance.now()-start;if(enabled)stopPerformance();return elapsed;};
  run(false);run(true);
  for(let i=0;i<5;i++){let disabledMs:number,enabledMs:number;if(i%2){enabledMs=run(true);disabledMs=run(false);}else{disabledMs=run(false);enabledMs=run(true);}rounds.push({disabledMs,enabledMs,extraMicrosecondsPerSpan:(enabledMs-disabledMs)*1000/iterations});}
  const sorted=rounds.map(r=>r.extraMicrosecondsPerSpan).sort((a,b)=>a-b);
  return {iterations,rounds,medianExtraMicrosecondsPerSpan:sorted[2],checksum,interpretation:'Synthetic recorder-on/off CPU overhead only. Repeat on the target browser; do not subtract blindly from game measurements.'};
}
