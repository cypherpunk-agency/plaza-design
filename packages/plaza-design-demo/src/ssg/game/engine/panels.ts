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

/** What a scene's own panel gets: the body to fill, the model, and a frame loop that stops when the panel closes. */
export interface PanelKit {
  body: HTMLDivElement;
  m: SceneModel;
  say: (l: Line) => void;
  close: () => void;
  /** requestAnimationFrame, cancelled on close. Return false to stop. */
  frame: (fn: (t: number) => boolean | void) => void;
}

/** A scene's own panel (`camera`), opened by `{ "open": "camera" }`. `arg` is the step's `with`. */
export type PanelFn = (kit: PanelKit, arg?: string) => void;

export class Panels {
  private root: HTMLDivElement;
  private body: HTMLDivElement;
  private raf = 0;
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
  close() { if (this.root.hidden) return; this.root.hidden = true;this.talking?.close();this.talking=undefined; cancelAnimationFrame(this.raf); this.body.textContent = ''; this.onClose(); }
  private show(cls: string) { cancelAnimationFrame(this.raf); this.body.textContent = ''; this.body.className = 'hack-panel-body ' + cls; this.root.hidden = false; }

  /** Open a panel by name: `talk` (arg: the dialogue), or one of the scene's own. */
  open(name: string, arg?: string) {
    if (name === 'talk') { this.talk(arg); return; }
    const fn = this.own[name];
    if (!fn) return;
    this.show(name);
    const loop = (fn: (t: number) => boolean | void) => {
      const step = (t: number) => { if (this.root.hidden || fn(t) === false) return; this.raf = requestAnimationFrame(step); };
      this.raf = requestAnimationFrame(step);
    };
    fn({ body: this.body, m: this.m, say: this.say, close: () => this.close(), frame: loop }, arg);
  }

  /** Branching and simple dialogue use the same runner; this adapter only paints panel controls. */
  presentConversation(session:ConversationSession,onChoice?:(label:string)=>void){
    this.talking?.close();this.show('dlg');this.talking=session;const box=el('div','dlg-box');this.body.append(box);
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
    const target=who??Object.keys(this.m.data.dialogue)[0];const session=target?this.conversation?.(target):undefined;if(session){const template=session.sayCommand;this.presentConversation(session,template?label=>this.say([template.replace('{line}',label),'','dim']):undefined);return;}
    if(target&&this.m.data.dialogue[target])throw new Error('Conversation not registered: '+target);
  }
}
