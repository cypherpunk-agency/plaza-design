import type {ConversationSession,ConversationFrame} from './gameplay/conversation';
/**
 * A scene's full-screen moments: talking to a daemon (the engine's `talk`,
 * any dialogue in the scene file), and whatever panels the scene's view adds
 * (the yard's CAM-1). Each covers the game window until closed.
 * Styles live in render.tsx (`.hack-panel`, `.cam-*`, `.dlg-*`).
 */

import type { Line, SceneModel } from './model';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e;
}
export function button(text: string, cls: string, fn: () => void) {
  const b = el('button', cls, text); b.type = 'button';
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  return b;
}

/** One 60 Hz frame in ms: the unit of per-frame easing rates (they scale by dt, not by frame count). */
export const FRAME_MS = 1000 / 60;

/** What a scene's own panel gets: the body to fill, the model, and a frame loop that stops when the panel closes. */
export interface PanelKit {
  body: HTMLDivElement;
  m: SceneModel;
  say: (l: Line) => void;
  close: () => void;
  /**
   * The panel's per-frame step, called from the game loop's tick (`Panels.step`): `dt` ms of scene time since the
   * last call, `t` ms since the panel opened. Dropped on close. Return false to stop.
   */
  frame: (fn: (dt: number, t: number) => boolean | void) => void;
  /** A delayed action on scene time (the model's `later`): held while the game is paused, cancelled when the panel closes. Returns its cancel. */
  later: (ms: number, fn: () => void) => () => void;
  /** Owned resources are released on close or replacement; return unregisters cleanup. */
  cleanup: (release:()=>void)=>()=>void;
}

/** A scene's own panel (`camera`), opened by `{ "open": "camera" }`. `arg` is the step's `with`. */
export type PanelFn = (kit: PanelKit, arg?: string) => void;

export class Panels {
  private root: HTMLDivElement;
  private body: HTMLDivElement;
  private frames: ((dt: number, t: number) => boolean | void)[] = [];
  private age = 0;
  private generation=0;
  private cleanups=new Set<()=>void>();
  private talking?:ConversationSession;
  onClose: () => void = () => {};

  constructor(host: HTMLElement, private m: SceneModel, private say: (l: Line) => void, private own: Record<string, PanelFn> = {},private conversation?:(id:string)=>ConversationSession|undefined,private history?:(speaker:string,pages:readonly string[])=>void,private completed?:(cue:NonNullable<ConversationFrame['completion']>)=>void) {
    this.root = el('div', 'hack-panel'); this.root.hidden = true;
    this.body = el('div', 'hack-panel-body');
    this.root.append(button(m.label('ui.close'), 'hack-btn hack-panel-close', () => this.close()), this.body);
    host.appendChild(this.root);
  }

  get conversationFrame(){return this.talking?.frame()??null;}
  get isOpen() { return !this.root.hidden; }
  private release(){this.generation++;this.frames=[];this.age=0;this.talking?.close();this.talking=undefined;const cleanups=[...this.cleanups];this.cleanups.clear();for(const release of cleanups)try{release();}catch{/* release remaining owned resources */}}
  close() { if (this.root.hidden) return; this.root.hidden = true;this.release();this.body.textContent = ''; this.onClose(); }
  private show(cls: string) { this.release();this.body.textContent = ''; this.body.className = 'hack-panel-body ' + cls; this.root.hidden = false; }

  /** The game loop's frame (SceneHost.tick): the open panel's frame functions step on by `ms` of scene time. */
  step(ms: number) {
    if (this.root.hidden || !this.frames.length || !(ms > 0)) return;
    this.age += ms;
    const generation = this.generation;
    for (const fn of [...this.frames]) {
      if (generation !== this.generation) return;
      if (fn(ms, this.age) === false) this.frames = this.frames.filter((f) => f !== fn);
    }
  }

  /** Open a panel by name: `talk` (arg: the dialogue), or one of the scene's own. */
  open(name: string, arg?: string) {
    if (name === 'talk') { this.talk(arg); return; }
    const fn = this.own[name];
    if (!fn) return;
    this.show(name);
    const generation=this.generation,live=()=>!this.root.hidden&&generation===this.generation;
    const loop = (fn: (dt: number, t: number) => boolean | void) => { if (live()) this.frames.push(fn); };
    const later = (ms: number, fn: () => void) => {
      if (!live()) return () => {};
      let cancel = () => {};
      const release = () => { cancel(); };
      cancel = this.m.later(ms, () => { this.cleanups.delete(release); if (live()) fn(); });
      this.cleanups.add(release);
      return () => { this.cleanups.delete(release); cancel(); };
    };
    try{fn({ body:this.body,m:this.m,say:l=>{if(live())this.say(l);},close:()=>{if(live())this.close();},frame:loop,later,
      cleanup:release=>{if(!live()){release();return()=>{};}this.cleanups.add(release);return()=>{this.cleanups.delete(release);};},
    },arg);}catch(error){this.close();throw error;}
  }

  /** Branching and simple dialogue use the same runner; this adapter only paints panel controls. */
  presentConversation(session:ConversationSession,onChoice?:(label:string)=>void){
    this.show('dlg');this.talking=session;const box=el('div','dlg-box');this.body.append(box);
    const render=()=>{
      const f=session.frame();this.history?.(f.speaker,f.pages);box.replaceChildren(el('b','dlg-name',f.speaker),el('p','dlg-text',f.pages.join('\n')));const choices=el('div','dlg-choices');box.append(choices);
      for(const choice of f.choices??[])choices.append(button(choice.label,'dlg-choice',()=>{const result=session.choose(choice.id);if(result.ok&&choice.echo!==false)onChoice?.(choice.label);if(result.ok)render();else choices.append(el('p','error','Operation refused: '+result.reason));}));
      if(f.acceptsText)choices.append(button(this.m.label('talk.other'),'dlg-choice dlg-kb',()=>{
        const input=el('input','dlg-input');input.maxLength=2000;input.placeholder=this.m.label('talk.placeholder');input.setAttribute('aria-label',this.m.label('talk.aria',{speaker:f.speaker}));choices.replaceChildren(input);input.focus();
        input.addEventListener('keydown',event=>{event.stopPropagation();if(event.key!=='Enter'||!input.value.trim())return;const text=input.value.trim(),result=session.submit(text);if(result.ok){onChoice?.(text);render();}else choices.append(el('p','error','Operation refused: '+result.reason));});
      }));
      if(!f.choices?.length&&!f.acceptsText)choices.append(button(this.m.label('talk.unplug'),'dlg-choice',()=>{if(this.talking!==session||this.root.hidden)return;const cue=f.completion;this.close();if(cue)this.completed?.(cue);}));
    };render();
  }

  // ---------- talking: permission, not answers ----------

  talk(who?: string) {
    const target=who;const session=target?this.conversation?.(target):undefined;if(session){const template=session.sayCommand;this.presentConversation(session,template?label=>this.say([template.replace('{line}',label),'','dim']):undefined);return;}
    if(target&&this.m.data.dialogue[target])throw new Error('Conversation not registered: '+target);
  }
}
