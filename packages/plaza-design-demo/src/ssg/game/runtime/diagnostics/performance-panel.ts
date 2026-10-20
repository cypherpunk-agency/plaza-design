import {startPerformance,stopPerformance,calibratePerformance,type PerformanceReport} from './performance';
/** Explicit local opt-in; no telemetry endpoint and no player-save fixture changes. */
export function mountPerformancePanel(host:HTMLElement,snapshot:()=>Record<string,unknown>=()=>({}),enabled=new URLSearchParams(location.search).has('perf')){
  if(!enabled)return ()=>{};
  const root=document.createElement('details');root.style.cssText='position:absolute;right:8px;bottom:50px;z-index:80;background:#111e;color:#eee;padding:8px;font:12px monospace;max-width:min(700px,90%);max-height:40%;overflow:auto;overflow-wrap:anywhere';
  const summary=document.createElement('summary');summary.textContent='Performance · local CPU recording';root.append(summary);
  const status=document.createElement('p');status.textContent='Use a disposable demo/editor session. Export stays local.';root.append(status);
  const scenario=document.createElement('input');scenario.setAttribute('aria-label','Recording name');scenario.maxLength=128;scenario.value=location.search||'local-workload';root.append(scenario);
  let recording=false,report:PerformanceReport|undefined,calibration:ReturnType<typeof calibratePerformance>|undefined;
  const button=(label:string,run:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.onclick=run;root.append(b);};
  const visibility:{at:number;hidden:boolean}[]=[];
  const changed=()=>{if(recording&&visibility.length<256)visibility.push({at:performance.now(),hidden:document.hidden});};
  document.addEventListener('visibilitychange',changed);
  button('Measure recorder overhead',()=>{if(recording)return;calibration=calibratePerformance();status.textContent=JSON.stringify(calibration);});
  button('Start',()=>{if(recording)return;visibility.length=0;visibility.push({at:performance.now(),hidden:document.hidden});startPerformance({source:document.querySelector<HTMLMetaElement>('meta[name="game-source"]')?.content??'unavailable',scenario:scenario.value.trim()||'local-workload',environment:{...snapshot(),backingCanvas:[host.querySelector('canvas')?.width??null,host.querySelector('canvas')?.height??null],cpu:'unavailable',gpu:'unavailable',refreshRate:'unavailable',calibration:calibration??null,userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,visibility}});recording=true;report=undefined;status.textContent='Recording bounded CPU spans. Stop before exporting.';});
  button('Stop',()=>{if(!recording)return;report=stopPerformance();recording=false;if(report)status.textContent=JSON.stringify({source:report.source,environment:report.environment,summary:report.summary,overflow:report.overflow,incomplete:report.incomplete,invalidEnds:report.invalidEnds});});
  button('Download JSON',()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='game-performance.json';a.click();URL.revokeObjectURL(url);});
  host.append(root);return ()=>{if(recording)stopPerformance();document.removeEventListener('visibilitychange',changed);root.remove();};
}
