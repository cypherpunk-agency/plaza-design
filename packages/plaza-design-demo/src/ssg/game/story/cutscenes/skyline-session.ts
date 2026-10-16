import{Skyline,type SkylineSnapshot}from'../../art/environment/skyline';
import{introFrame,type IntroOptions}from'../../art/sequences/skyline';
import type{CutView}from'../../art/core/view';
export class IntroPlaybackSession{private city=new Skyline();private lastT=0;prepare(time:number):IntroOptions{const step=Math.min(3,Math.max(0,(time-this.lastT)*60));this.lastT=time;return{city:this.city,step};}}
/** Controller-owned deterministic seek session, independent from continuous shipping playback. */
export class IntroSeekSession {
  private city = new Skyline();
  private checkpoints = new Map<number, SkylineSnapshot>();
  private key = '';
  constructor(private initial?: SkylineSnapshot) {}
  prepare(x: CanvasRenderingContext2D, v: CutView, time: number, duration: number, options:Omit<IntroOptions,'city'|'step'>={}) {
    if (!Number.isFinite(time) || time < 0) throw new Error('Intro seek time must be finite and nonnegative');
    const prepared = introFrame(x, v, time, duration, { ...options, city: this.city, step: 0 });
    const key = JSON.stringify([prepared.frame, v.reduced]);
    if (key !== this.key) { this.key = key; this.checkpoints.clear(); if (this.initial) this.city.restore(this.initial); this.checkpoints.set(0, this.city.snapshot()); }
    const count = Math.floor(time * 60 + 1e-8), exact = Math.abs(time - count / 60) < 1e-8, before = exact ? count : count + 1;
    const start = Math.max(...[...this.checkpoints.keys()].filter(frame => frame <= before));
    this.city.restore(this.checkpoints.get(start)!);
    for (let frame = start; frame < before; frame++) {
      const step = frame === 0 ? 0 : Math.min(3, Math.max(0, (frame / 60 - (frame - 1) / 60) * 60));
      this.city.advance(x, prepared.frame, step, v.reduced);
      if ((frame + 1) % 60 === 0) this.checkpoints.set(frame + 1, this.city.snapshot());
    }
    const previousTime = before === 0 ? 0 : (before - 1) / 60;
    return {...options,city:this.city,step:Math.min(3,Math.max(0,(time-previousTime)*60))};
  }
  parts(x:CanvasRenderingContext2D,v:CutView,time:number,duration:number,options:Omit<IntroOptions,'city'|'step'>={}){return introFrame(x,v,time,duration,this.prepare(x,v,time,duration,options)).parts;}
}
