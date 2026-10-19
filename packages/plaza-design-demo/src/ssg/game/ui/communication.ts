/** Readable time and bounded attention arbitration. Independent of animation/simulation clocks. */
export type MessageTone='info'|'success'|'error';
export interface Notice {id:string;text:string;tone:MessageTone;source:'system'|'goal';scope:'scene'|'session';priority:number;duration:number}
interface Pending extends Notice {remaining:number;elapsed:number}
export class CommunicationLane {
  private queue:Pending[]=[];
  private current:Pending|null=null;
  private last:number|null=null;
  private available=0;
  private activeMs=0;
  get time(){return this.activeMs;}
  static readonly capacity=32;
  /** Call each RAF, including paused frames. A hidden/suspended interval never consumes reading time. */
  frame(now:number,paused=false){const delta=this.last===null?0:Math.max(0,now-this.last);this.last=now;this.available=paused||delta>250?0:delta;this.activeMs+=this.available;}
  offer(notice:Notice){
    if(!notice.id||!notice.text.trim()||!Number.isFinite(notice.duration)||notice.duration<=0)return false;
    // Repeated pulses do not reset the current notice's readable lifetime.
    if(this.current?.id===notice.id||this.queue.some(n=>n.id===notice.id))return false;
    const pending={...notice,remaining:notice.duration,elapsed:0};
    if(this.current&&pending.priority>this.current.priority){this.queue.unshift(this.current);this.current=null;}
    this.queue.push(pending);this.queue.sort((a,b)=>b.priority-a.priority);
    const capacity=CommunicationLane.capacity-(this.current?1:0);if(this.queue.length>capacity)this.queue.length=capacity;
    return this.queue.includes(pending);
  }
  cancel(id:string){this.queue=this.queue.filter(n=>n.id!==id);if(this.current?.id===id)this.current=null;}
  sceneChanged(){this.queue=this.queue.filter(n=>n.scope!=='scene');if(this.current?.scope==='scene')this.current=null;}
  clear(){this.queue=[];this.current=null;this.available=0;}
  get pending(){return this.queue.length+(this.current?1:0);}
  /** Optional messages wait during dialogue; immediate results still occupy the one status lane. */
  step(optionalBusy=false):{text:string;tone:MessageTone;alpha:number}|null{
    if(this.current&&optionalBusy&&this.current.priority<100){this.queue.unshift(this.current);this.current=null;}
    if(!this.current){const index=this.queue.findIndex(n=>!optionalBusy||n.priority>=100);if(index>=0)this.current=this.queue.splice(index,1)[0];}
    const delta=this.available;this.available=0;
    if(!this.current)return null;
    const c=this.current;c.remaining-=delta;c.elapsed+=delta;
    if(c.remaining<=0){this.current=null;return this.step(optionalBusy);}
    return {text:c.text,tone:c.tone,alpha:Math.min(1,c.remaining/400)};
  }
}
