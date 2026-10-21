import {performanceRecording,perfBegin,perfEnd,perfSample} from '../runtime/diagnostics/performance';
/**
 * Scene time and delayed actions stop together; wall-clock lockouts are separate. Scene time is not a
 * clock of its own: it moves only when the one runtime's frame moves it (`advance`, through the scene
 * model's tick), and what falls due runs then, in order. No browser timers.
 */
type Pending = { detail?:unknown; canceled?:()=>void; at: number; run: () => void };
export class SceneTime {
  private t = 0;
  private stopped = false;
  private pending = new Set<Pending>();

  now() { return this.t; }

  pause(on: boolean) { this.stopped = on; }

  /** The frame moves scene time on by `ms`; every delayed action that falls due runs at its own time, earliest first. */
  advance(ms: number) {
    if (this.stopped || !(ms > 0)) return;
    const end = this.t + ms;
    for (;;) {
      let next: Pending | undefined;
      for (const p of this.pending) if (p.at <= end && (!next || p.at < next.at)) next = p;
      if (!next) break;
      this.pending.delete(next);
      this.t = Math.max(this.t, next.at);
      if(!performanceRecording()){next.run();continue;}
      perfSample('timer.lateness',0);
      const token=perfBegin('timer.callback');try{next.run();}finally{perfEnd(token);}
    }
    this.t = end;
  }

  later(ms: number, run: () => void, detail?:unknown,canceled?:()=>void) {
    const p: Pending = { at: this.now() + Math.max(0, ms), run, detail,canceled };
    this.pending.add(p);
    return()=>{if(this.pending.delete(p)){try{p.canceled?.();}catch{/* cancellation observer isolation */}}};
  }

  inspect(){const now=this.now();return {paused:this.stopped,now,pending:[...this.pending].map(p=>({remainingMs:Math.max(0,p.at-now),detail:p.detail??{kind:'callback'}}))};}

  clear() {
    const pending=[...this.pending];this.pending.clear();
    pending.forEach((p) => {try{p.canceled?.();}catch{/* cancellation observer isolation */}});
  }
}
