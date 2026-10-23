import{Skyline,type SkylineSnapshot}from'../../art/environment/skyline';
import{introFrame,introLayout,type IntroOptions}from'../../art/sequences/skyline';
import type{CutView}from'../../art/core/view';
export class IntroPlaybackSession{
 private city=new Skyline();private lastT=0;private layoutKey='';private layout?:{x:CanvasRenderingContext2D;v:CutView;duration:number};
 private key(v:CutView,duration:number){return JSON.stringify([v.viewW,v.viewH,v.barTop,v.barBottom,v.reduced,duration]);}
 /** Called by the playback owner before its tick, including resize. Same viewport never advances. */
 initialize(x:CanvasRenderingContext2D,v:CutView,_time:number,duration:number){const key=this.key(v,duration),changed=key!==this.layoutKey;this.layout={x,v,duration};if(changed){this.layoutKey=key;this.city.reset();this.city.advance(x,introLayout(v),0,v.reduced);}}
 advance(time:number){if(time<this.lastT)this.city.reset();const step=Math.min(3,Math.max(0,(time-this.lastT)*60));this.lastT=time;if(this.layout){const{x,v}=this.layout;this.city.advance(x,introLayout(v),step,v.reduced);}}
 /** User timeline seeks reconstruct separately, then the existing owner adopts that prepared picture. */
 seek(time:number){if(!this.layout)throw Error('Initialize the playback viewport before seeking');const{x,v,duration}=this.layout;this.city=new IntroSeekSession().prepare(x,v,time,duration).city;this.lastT=time;}
 prepare(_x:CanvasRenderingContext2D,v:CutView,_time:number,duration:number):IntroOptions{if(!this.layout||this.key(v,duration)!==this.layoutKey)throw Error('Initialize the playback viewport before painting');return{city:this.city};}
}
/** Controller-owned deterministic seek session, independent from continuous shipping playback. */
export class IntroSeekSession {
  private city = new Skyline();
  private checkpoints = new Map<number, SkylineSnapshot>();
  private key = '';
  prepare(x: CanvasRenderingContext2D, v: CutView, time: number, duration: number, options:Omit<IntroOptions,'city'>={}) {
    if (!Number.isFinite(time) || time < 0) throw new Error('Intro seek time must be finite and nonnegative');
    this.city.prepareLayout(x,introLayout(v));
    const prepared = introFrame(x, v, time, duration, { ...options, city: this.city });
    const key = JSON.stringify([prepared.frame, v.reduced]);
    if (key !== this.key) { this.key = key; this.checkpoints.clear(); this.checkpoints.set(0, this.city.snapshot()); }
    const count = Math.floor(time * 60 + 1e-8), exact = Math.abs(time - count / 60) < 1e-8, before = exact ? count : count + 1;
    const start = Math.max(...[...this.checkpoints.keys()].filter(frame => frame <= before));
    this.city.restore(this.checkpoints.get(start)!);
    for (let frame = start; frame < before; frame++) {
      const step = frame === 0 ? 0 : Math.min(3, Math.max(0, (frame / 60 - (frame - 1) / 60) * 60));
      this.city.advance(x, prepared.frame, step, v.reduced);
      if ((frame + 1) % 60 === 0) this.checkpoints.set(frame + 1, this.city.snapshot());
    }
    const previousTime = before === 0 ? 0 : (before - 1) / 60;
    this.city.advance(x,prepared.frame,Math.min(3,Math.max(0,(time-previousTime)*60)),v.reduced);
    return {...options,city:this.city};
  }
  parts(x:CanvasRenderingContext2D,v:CutView,time:number,duration:number,options:Omit<IntroOptions,'city'>={}){return introFrame(x,v,time,duration,this.prepare(x,v,time,duration,options)).parts;}
}
