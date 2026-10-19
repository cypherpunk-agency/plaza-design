import type {FeedbackReceipt} from '../engine/feedback-receipt';
/**
 * Chiptune blips made with WebAudio, no sound files. Off until the visitor
 * presses M (browsers only allow audio after an interaction anyway).
 */

let ctx: AudioContext | null = null;
let on = false;
const pending=new Map<ReturnType<typeof setTimeout>,{scope:string;cueId?:string}>();
const cues=new Map<string,FeedbackReceipt['tone']>();
function later(ms:number,run:()=>void,scope='scene',cueId?:string){
  if(!on||!ctx)return;
  const timer=setTimeout(()=>{pending.delete(timer);if(on)run();},ms);pending.set(timer,{scope,cueId});
}
function cancel(scope?:string,cueId?:string){for(const [timer,owner]of pending)if((!scope||scope===owner.scope)&&(!cueId||cueId===owner.cueId)){clearTimeout(timer);pending.delete(timer);}}
function denied(scope?:string,cueId?:string){if(!on||!ctx)return;tone(140,.18,'sawtooth',.05);later(120,()=>tone(110,.22,'sawtooth',.05),scope,cueId);}
function granted(scope?:string,cueId?:string){if(!on||!ctx)return;[523,659,784].forEach((f,i)=>later(i*90,()=>tone(f,.12,'square',.04),scope,cueId));}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.04, slide = 0) {
  if (!on || !ctx) return;
  const t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sound = {
  get enabled() { return on; },
  toggle(): boolean {
    on = !on;
    if(!on)cancel();
    if (on && !ctx) {
      try { ctx = new AudioContext(); } catch { on = false; }
    }
    if (on) ctx?.resume();
    if (on) tone(660, 0.08, 'square', 0.04);
    return on;
  },
  /** One letter of a speech bubble or terminal line. */
  blip() { tone(520 + Math.random() * 120, 0.03, 'square', 0.015); },
  denied, granted,
  /** Deliveries remain distinct; only the explicit causal cue is shared. Errors win immediately. */
  feedback(receipt:FeedbackReceipt){
    if(receipt.tone!=='error'&&receipt.tone!=='success')return;
    const id=receipt.cueId,previous=cues.get(id);
    if(previous==='error'||previous===receipt.tone)return;
    cues.set(id,receipt.tone);if(cues.size>512)cues.delete(cues.keys().next().value!);
    if(receipt.tone==='error'){cancel(undefined,id);denied(receipt.scope,id);}
    else granted(receipt.scope,id);
  },
  cancelFeedback(scope?:string){cancel(scope);},
  jump() { tone(300, 0.12, 'square', 0.03, 260); },
  open() { tone(880, 0.05, 'triangle', 0.04); },
  /** The pause menu: the selection moves. */
  tick() { tone(1320, 0.025, 'square', 0.02); },
  close() { tone(440, 0.05, 'triangle', 0.03); },
};
