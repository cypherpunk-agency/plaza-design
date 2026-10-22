import {CommunicationLane,type MessageTone} from './communication';
/**
 * Hints: a channel any part of the game can send a short line to (docs/design/DECK-SCREEN-PLAN.md).
 * It does not decide when a player gets help; senders do. One hint shows at a time, in the hint
 * lane under the scene title (game.ts drawHud); the rest wait their turn. Each id shows once per
 * run (`save.seenHints`). Paid Fixer hints use shared gameplay state. A sticky hint (a
 * control you have not used yet) stays until its sender calls `done`. The deck's JOBS tab keeps the
 * latest one, so a missed hint is not lost.
 *
 * Timing is the communication lane's readable time (`notices.time`, passed to `step` by the game loop). It only moves
 * while the lane is readable, so the deck, the map and cutscenes hold the queue. No wall clock.
 */

interface Hint { id: string; text: string; sticky: boolean }

/** How long a hint stays: a base plus a little per character (ms). */
const BASE_MS = 3500, PER_CHAR_MS = 45, FADE_MS = 400;

export class Hints {
  readonly notices = new CommunicationLane();
  private queue: Hint[] = [];
  private cur: (Hint & { from: number; until: number }) | null = null;
  /** The last timed hint shown this session (JOBS). */
  latest: string | null = null;
  /** Readable time of the last frame the lane was stepped. */
  private lastStep:number|null = null;

  constructor(private seen: () => string[]) {}

  /**
   * Send a hint. `sticky`: it stays until `done(id)`. `repeat`: show it even if seen before.
   * `first`: it goes ahead of the queue and of the hint showing now (which comes back after it).
   */
  show(id: string, text: string, opts: { sticky?: boolean; repeat?: boolean; first?: boolean } = {}) {
    if (!opts.repeat && this.seen().includes(id)) return;
    if (this.pending(id)) return;
    const h = { id, text, sticky: !!opts.sticky };
    if (!opts.first) { if(this.queue.length+(this.cur?1:0)<CommunicationLane.capacity)this.queue.push(h); return; }
    if (this.cur) { this.queue.unshift({ id: this.cur.id, text: this.cur.text, sticky: this.cur.sticky }); this.cur = null; }
    this.queue.unshift(h);if(this.queue.length>CommunicationLane.capacity)this.queue.length=CommunicationLane.capacity;
  }

  notify(text:string,tone:MessageTone='info',receipt?:import('../engine/feedback-receipt').FeedbackReceipt){
    return this.notices.offer({id:receipt?.id??'status:'+text,text,tone,source:'system',scope:'scene',priority:tone==='error'?200:100,duration:Math.min(10000,3500+text.length*45)});
  }
  sceneChanged(){this.notices.sceneChanged();this.queue=[];this.cur=null;this.lastStep=null;}
  /** The same saved lesson queue, presented by the board while the world HUD is covered. */
  boardHint(busy=false):string|null {
    if(busy)return null;
    const noun='ctl.noun',wire='ctl.wire';
    const id=!this.has(noun)?noun:!this.has(wire)?wire:null;
    if(!id)return null;
    this.show(id,id===noun?'TAP A NOUN TO OPEN ITS VERBS':'DRAG AN ORANGE EVENT DOT ONTO A NOUN, THEN PICK A VERB',{sticky:true,first:true});
    // The board owns this presenter while open; pending HUD help waits in the same queue.
    if(this.cur?.id!==id){if(this.cur)this.queue.unshift(this.cur);const at=this.queue.findIndex(h=>h.id===id);if(at<0)return null;this.cur={...this.queue.splice(at,1)[0],from:0,until:Infinity};}
    return this.cur.text;
  }
  /** Is this hint showing or waiting? */
  pending(id: string) { return this.cur?.id === id || this.queue.some((q) => q.id === id); }

  /** The player did it, or the sender withdraws it: gone, and seen for good. */
  done(id: string) {
    const seen = this.seen();
    if (seen.includes(id) && !this.pending(id)) return;
    this.queue = this.queue.filter((q) => q.id !== id);
    if (this.cur?.id === id) this.cur = null;
    if (!seen.includes(id)) seen.push(id);
  }

  /** Has this hint been shown (a timed one) or done (a sticky one)? */
  has(id: string) { return this.seen().includes(id); }

  /** The hint to draw now, with its opacity; null for none. Call once per drawn frame with the lane's readable time (`notices.time`). */
  step(now: number, optionalBusy=false): { text: string; alpha: number; tone?:MessageTone } | null {
    const notice=this.notices.step(optionalBusy);
    if(notice||optionalBusy){if(this.cur&&this.lastStep!==null){const gap=now-this.lastStep;this.cur.from+=gap;this.cur.until+=gap;}this.lastStep=now;return notice;}
    // readable time already stands still while the deck is open or a cutscene plays
    this.lastStep = now;
    if (this.cur && !this.cur.sticky && now >= this.cur.until) this.cur = null;
    if(this.cur?.id==='ctl.noun'||this.cur?.id==='ctl.wire'){this.queue.unshift(this.cur);this.cur=null;}
    const next=this.queue.findIndex(h=>h.id!=='ctl.noun'&&h.id!=='ctl.wire');
    if (!this.cur && next>=0) {
      const q = this.queue.splice(next,1)[0];
      this.cur = { ...q, from: now, until: now + BASE_MS + q.text.length * PER_CHAR_MS };
      // JOBS keeps timed hints; sticky ones are controls, and CONTROLS lists those
      if (!q.sticky) { this.latest = q.text; const seen = this.seen(); if (!seen.includes(q.id)) seen.push(q.id); }
    }
    if (!this.cur) return null;
    const left = this.cur.sticky ? FADE_MS : this.cur.until - now;
    return { text: this.cur.text, alpha: Math.max(0, Math.min(1, left / FADE_MS, (now - this.cur.from) / 200)) };
  }
}
