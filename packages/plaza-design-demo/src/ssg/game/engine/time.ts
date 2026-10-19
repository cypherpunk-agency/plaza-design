import {performanceRecording,perfBegin,perfEnd,perfSample} from '../runtime/diagnostics/performance';
/** Scene time and delayed actions stop together; wall-clock lockouts are separate. */
export class SceneTime {
  private stoppedAt: number | null = null;
  private offset = 0;
  private pending = new Set<{ detail?:unknown; canceled?:()=>void; at: number; run: () => void; timer?: ReturnType<typeof setTimeout> }>();

  now() { return (this.stoppedAt ?? performance.now()) - this.offset; }

  pause(on: boolean) {
    if (on === (this.stoppedAt !== null)) return;
    if (on) {
      this.stoppedAt = performance.now();
      this.pending.forEach((p) => clearTimeout(p.timer));
    } else {
      this.offset += performance.now() - this.stoppedAt!;
      this.stoppedAt = null;
      this.pending.forEach((p) => this.schedule(p));
    }
  }

  later(ms: number, run: () => void, detail?:unknown,canceled?:()=>void) {
    const p = { at: this.now() + ms, run, detail,canceled };
    this.pending.add(p);
    if (this.stoppedAt === null) this.schedule(p);
    return()=>{if(this.pending.delete(p)){clearTimeout((p as {timer?:ReturnType<typeof setTimeout>}).timer);try{p.canceled?.();}catch{/* cancellation observer isolation */}}};
  }

  inspect(){const now=this.now();return {paused:this.stoppedAt!==null,now,pending:[...this.pending].map(p=>({remainingMs:Math.max(0,p.at-now),detail:p.detail??{kind:'callback'}}))};}

  clear() {
    const pending=[...this.pending];this.pending.clear();
    pending.forEach((p) => {clearTimeout(p.timer);try{p.canceled?.();}catch{/* cancellation observer isolation */}});
  }

  private schedule(p: { at: number; run: () => void; timer?: ReturnType<typeof setTimeout> }) {
    p.timer = setTimeout(() => {
      this.pending.delete(p);
      if(!performanceRecording()){p.run();return;}
      perfSample('timer.lateness',Math.max(0,this.now()-p.at));
      const token=perfBegin('timer.callback');try{p.run();}finally{perfEnd(token);}
    }, Math.max(0, p.at - this.now()));
  }
}
