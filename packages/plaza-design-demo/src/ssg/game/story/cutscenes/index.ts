import{IntroPlaybackSession,IntroSeekSession}from'./skyline-session';
import{lightAt,type Light}from'../../world/light';
/**
 * Cutscenes: the registry and the player.
 *
 * A cutscene is a timeline and a composition of registered pieces (cutscenes/*.json),
 * drawn as one frame of the world (runtime/prepare-frame.ts → renderWorldFrame),
 * plus data/cutscenes.json's title. The player adds what every cutscene shares: the
 * letterbox bars (a director overlay of that frame), the cards typed out in the
 * bottom bar and a small "any key to skip" hint.
 *
 * The game plays one with `game.playCutscene(id, then?)`; `?play=<id>` starts
 * the game with one (see index.ts). Adding a cutscene: an entry in
 * cutscenes.json and its composition's sequence controls.
 */

import data from "../../data/cutscenes.json";
import type { CinematicDocuments } from '../../art/sequences/cinematics';
import {renderWorldFrame} from '../../runtime/render-scene';
import type {FrameSource} from '../../runtime/prepare-frame';
import { cinematicDocuments } from './documents';
import type { TimelineProgram } from '../../art/core/timeline';
import type { Composition } from '../../art/core/composition';
import type { Timeline } from "../../ui/transport";
import type { Cutscene, CutView } from './types';

export type { Cutscene, CutsceneData, CutView, TextCard } from './types';

/** A private document set owns its native playback session; shipping remains independent. */
export function createCutscenes(documents:CinematicDocuments=cinematicDocuments){
  const playback=new IntroPlaybackSession();
  const registry=Object.fromEntries((['intro','act2'] as const).map(id=>{
    const meta=data[id],sequence=documents.timeline.sequences.find(s=>s.id===meta.sequence);
    if(!sequence?.handoff)throw new Error(`Cutscene ${id}: missing timeline or handoff`);
    const scene:Cutscene={id,title:meta.title,duration:sequence.duration,next:sequence.handoff.scene,handoff:{...sequence.handoff},ownsFade:true,
      cards:sequence.text.map(card=>({at:card.from,until:card.to,text:card.text,x:card.x,h:card.h})),beats:sequence.beats.map(beat=>({at:beat.time,name:beat.id})),
      ...(id==='intro'?{advance:(time:number)=>playback.advance(time)}:{}),
      ...(id==='intro'?{seek:(time:number)=>playback.seek(time)}:{}),
      ...(id==='intro'?{prepare:(ctx:CanvasRenderingContext2D,view:CutView,time:number)=>{playback.initialize(ctx,view,time,sequence.duration);}}:{}),
      render:(ctx,view,time,scale,director)=>{renderWorldFrame({kind:'sequence',context:ctx,documents,sequenceId:id,scale,width:view.viewW,height:view.viewH,reduced:view.reduced,lighting:view.lighting,time,director,cards:false,...(id==='intro'?{skyline:playback.prepare(ctx,view,time,sequence.duration)}:{})});}};
    return[id,scene];
  })) as Record<CutsceneId,Cutscene>;
  return registry;
}
export type CutsceneId='intro'|'act2';
export const CUTSCENES=createCutscenes();
export const isCutsceneId=(id:string):id is CutsceneId=>Object.prototype.hasOwnProperty.call(CUTSCENES,id);


/** Inputs in the first moments don't skip: the key that started the scene is still being pressed. */
const GRACE = 0.8;
const FADE_IN = 1.4, FADE_OUT = 0.9;
/** Characters typed per second. */
const TYPE = 32;

const PAPER = '255,233,208', ORANGE = '255,136,0';

/** One playing cutscene. The game steps and draws it instead of the scene while it runs. */
export class CutscenePlay {
  t = 0;
  done = false;
  private wrapped: { size: number; maxW: number; lines: string[][]; widths: number[] } | null = null;

  constructor(readonly scene: Cutscene, private opts: { reduced: boolean; touch: boolean }) {scene.advance?.(0);}

  /** Initialize viewport-dependent art inputs before the first animation tick. No animation advances. */
  prepare(x:CanvasRenderingContext2D,W:number,H:number,lighting:Light){const size=Math.max(10,Math.min(18,Math.round(H/26)));this.scene.prepare?.(x,{lighting,viewW:W,viewH:H,barTop:Math.round(Math.max(16,H*.09)),barBottom:Math.round(Math.max(size*3.6,H*.16)),reduced:this.opts.reduced},this.t);}

  /** Advance by `dt` seconds of play. Done once play runs it to its end (a seek never ends it). */
  step(dt: number) {
    if (dt <= 0) return;
    this.t = Math.min(this.scene.duration, this.t + dt);
    this.scene.advance?.(this.t);
    if (this.t >= this.scene.duration) this.done = true;
  }

  /**
   * Sudo's time control (transport.ts): setting time also advances the existing playback
   * owner. Editor inspection reconstructs skyline packets in a separate seek session.
   */
  get timeline(): Timeline {
    return this.tl ??= {
      id: 'cut:' + this.scene.id,
      label: this.scene.id.toUpperCase(),
      duration: this.scene.duration,
      beats: this.scene.beats ?? this.scene.cards.map((c, i) => ({ at: c.at, name: 'CARD ' + (i + 1) })),
      time: () => this.t,
      seek: (s) => { this.t = Math.max(0, Math.min(this.scene.duration, s)); this.scene.seek?.(this.t); },
    };
  }
  private tl: Timeline | null = null;

  /** Any key or tap: jump to the fade out. Returns false while the grace period lasts. */
  skip() {
    if (this.t < GRACE || this.done) return false;
    this.t = Math.max(this.t, this.scene.duration - FADE_OUT * 0.6);
    return true;
  }

  /**
   * Draw a frame at `scale` pixels per world unit: the cutscene's picture through the one frame (renderWorldFrame),
   * directed with the letterbox and fades, then the typed card and the skip hint over it (the cutscene's own UI, like the HUD).
   */
  draw(x: CanvasRenderingContext2D, viewW: number, viewH:number,lighting:Light=lightAt(1,580,90,null),scale=x.getTransform().a) {
    const size = Math.max(10, Math.min(18, Math.round(viewH / 26)));
    const barTop = Math.round(Math.max(16, viewH * 0.09));
    const barBottom = Math.round(Math.max(size * 3.6, viewH * 0.16));
    const view: CutView = {lighting, viewW, viewH, barTop, barBottom, reduced: this.opts.reduced };
    const t = this.t, d = this.scene.duration;

    // Fade from black at the start and back to black at the end (a picture that does not own its fade).
    const fade = Math.max(0, 1 - t / FADE_IN, 1 - (d - t) / FADE_OUT);
    const fades = !this.scene.ownsFade && fade > 0 ? [{ color: 'rgba(0,0,0,' + Math.min(1, fade) + ')', opacity: 1 }] : [];
    this.scene.render(x, view, t, scale, { overlays: { fades, letterbox: { top: barTop, bottom: barBottom } } });

    this.card(x, viewW, viewH, barBottom, size);
    if (t > GRACE) {
      x.save();
      x.font = '600 ' + Math.max(7, Math.round(size * 0.62)) + 'px "IBM Plex Mono", monospace';
      x.textAlign = 'right'; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(' + PAPER + ',' + 0.4 * Math.min(1, (t - GRACE) * 2) + ')';
      x.fillText(this.opts.touch ? 'TAP TO SKIP' : 'ANY KEY TO SKIP', viewW - 10, Math.round(barTop / 2));
      x.restore();
    }
  }

  /** The current card, typed out on the bottom bar behind a prompt mark, with a block cursor. */
  private card(x: CanvasRenderingContext2D, W: number, H: number, bottom: number, size: number) {
    const cards = this.scene.cards, t = this.t;
    let i = -1;
    for (let j = 0; j < cards.length; j++) if (t >= cards[j].at && t < cards[j].until) i = j;
    if (i < 0) return;
    const c = cards[i];
    x.save();
    if (c.x || c.h) x.translate(c.x ?? 0, -(c.h ?? 0));
    x.font = '500 ' + size + 'px "IBM Plex Mono", monospace';
    x.textBaseline = 'middle'; x.textAlign = 'left';
    const lineH = Math.round(size * 1.45), mark = Math.round(size * 1.4);
    const maxW = Math.min(W - 32 - mark, size * 44);
    const { lines: all, widths } = this.lines(x, size, maxW), lines = all[i];
    const left = Math.round((W - widths[i] - mark) / 2), top = Math.round(H - bottom / 2 - ((lines.length - 1) * lineH) / 2);
    const total = c.text.length;
    let n = this.opts.reduced ? total : Math.floor((t - c.at) * TYPE);
    const typing = n < total;
    x.globalAlpha = Math.min(1, (c.until - t) / 0.5);
    x.fillStyle = 'rgba(' + ORANGE + ',.9)';
    x.fillText('>', left, top);
    x.fillStyle = 'rgba(' + PAPER + ',.96)';
    let cx = left + mark, cy = top;
    for (let j = 0; j < lines.length && n > 0; j++) {
      const shown = n >= lines[j].length ? lines[j] : lines[j].slice(0, n);
      n -= lines[j].length + 1;
      x.fillText(shown, left + mark, top + j * lineH);
      cx = left + mark + x.measureText(shown).width; cy = top + j * lineH;
    }
    if (typing || Math.floor(t * 2.2) % 2 === 0) {
      x.fillStyle = 'rgba(' + PAPER + ',.8)';
      x.fillRect(Math.round(cx + 2), Math.round(cy - size * 0.45), Math.max(2, Math.round(size * 0.5)), Math.round(size * 0.9));
    }
    x.restore();
  }

  /** Every card wrapped to the bar's width; redone only when the size changes. */
  private lines(x: CanvasRenderingContext2D, size: number, maxW: number) {
    if (this.wrapped && this.wrapped.size === size && this.wrapped.maxW === maxW) return this.wrapped;
    const lines = this.scene.cards.map((c) => {
      const out: string[] = [];
      let cur = '';
      for (const w of c.text.split(' ')) {
        const next = cur ? cur + ' ' + w : w;
        if (x.measureText(next).width > maxW && cur) { out.push(cur); cur = w; } else cur = next;
      }
      if (cur) out.push(cur);
      return out;
    });
    const widths = lines.map((ls) => Math.max(...ls.map((l) => x.measureText(l).width)));
    return (this.wrapped = { size, maxW, lines, widths });
  }
}

/** Composer and runtime use the same picture, letterbox, wrapping, typing and skip presentation. */
export function renderCutsceneDocument(x: CanvasRenderingContext2D, W: number, H: number, id: 'intro' | 'act2', seconds: number, options:Partial<Pick<FrameSource,'registry'|'frame'|'ambient'|'sequenceId'|'scale'|'capture'>>&{documents?:CinematicDocuments;seek?:IntroSeekSession;reduced:boolean;lighting?:Light; touch?: boolean; timeline?: TimelineProgram; composition?: Composition }) {
  const timeline = options.timeline ?? cinematicDocuments.timeline, sequence = timeline.sequences.find(s => s.id === (options.sequenceId ?? id));
  if (!sequence) throw new Error(`Cutscene ${id}: missing timeline sequence`);
  let prepared:ReturnType<typeof renderWorldFrame>|undefined;
  const scene: Cutscene = { id, title: data[id].title, duration: sequence.duration, next: sequence.handoff?.scene ?? '', ...(sequence.handoff?{handoff:{...sequence.handoff}}:{}), ownsFade: true,
    cards: sequence.text.map(card => ({ at: card.from, until: card.to, text: card.text, x: card.x, h: card.h })), beats: sequence.beats.map(beat => ({ at: beat.time, name: beat.id })),
    render: (ctx, view, time, scale, director) => { prepared=renderWorldFrame({kind:'sequence',context:ctx,capture:options.capture,documents:options.documents??cinematicDocuments,sequenceId:options.sequenceId??id,timeline,...(options.composition?{composition:options.composition}:{}),...(options.registry?{registry:options.registry}:{}),...(options.frame?{frame:options.frame}:{}),...(options.ambient!==undefined?{ambient:options.ambient}:{}),scale,width:view.viewW,height:view.viewH,reduced:view.reduced,lighting:view.lighting,time,director,cards:false,...(id==='intro'?{skyline:(options.seek??new IntroSeekSession()).prepare(ctx,view,time,sequence.duration)}:{})}); },
  };
  const player = new CutscenePlay(scene, { reduced: options.reduced, touch: options.touch ?? false }); player.t = Math.max(0, Math.min(sequence.duration, seconds)); player.draw(x,W,H,options.lighting??lightAt(1,580,90,null),options.scale??x.getTransform().a);return prepared;
}
