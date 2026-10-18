import type {ConversationSession} from './gameplay/conversation';
/**
 * A scene's full-screen moments: talking to a daemon (the engine's `talk`,
 * any dialogue in the scene file), and whatever panels the scene's view adds
 * (the yard's CAM-1). Each covers the game window until closed.
 * Styles live in render.tsx (`.hack-panel`, `.cam-*`, `.dlg-*`).
 */

import type { DialogueNode } from '../data/types';
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

  constructor(host: HTMLElement, private m: SceneModel, private say: (l: Line) => void, private own: Record<string, PanelFn> = {},private conversation?:(id:string)=>ConversationSession|undefined) {
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
    const render=()=>{const f=session.frame();box.replaceChildren(el('b','dlg-name',f.speaker),el('p','dlg-text',f.pages.join('\n')));const choices=el('div','dlg-choices');box.append(choices);for(const choice of f.choices??[])choices.append(button(choice.label,'dlg-choice',()=>{const result=session.choose(choice.id);if(result.ok)onChoice?.(choice.label);if(result.ok)render();else choices.append(el('p','error','Operation refused: '+result.reason));}));if(!f.choices?.length)choices.append(button(this.m.label('talk.unplug'),'dlg-choice',()=>this.close()));};render();
  }

  // ---------- talking: permission, not answers ----------

  talk(who?: string) {
    const session=who?this.conversation?.(who):undefined;if(session){const template=this.m.data.dialogue[who!]?.sayCmd;this.presentConversation(session,template?label=>this.say([template.replace('{line}',label),'','dim']):undefined);return;}
    const D = this.m.data.dialogue[who ?? Object.keys(this.m.data.dialogue)[0]];
    if (!D) return;
    this.show('dlg');
    const box = el('div', 'dlg-box');
    this.body.appendChild(box);
    const sayLine = (line: string) => this.say([D.sayCmd.replace('{line}', line), '', 'dim']);
    /** A node's first variant whose `if` holds; its steps run as it is shown. */
    const pick = (id: string): DialogueNode => {
      const n = [D.nodes[id]].flat().find((v) => (!v.if || this.m.cond(v.if)) && this.m.within(v.when))!;
      if (n.do) this.m.apply(n.do);
      return n;
    };
    const show = (id: string) => {
      const { text, choices } = pick(id);
      box.textContent = '';
      box.append(el('b', 'dlg-name', D.speaker), el('p', 'dlg-text', text));
      const ch = el('div', 'dlg-choices'); box.appendChild(ch);
      if (!choices) { ch.appendChild(button(this.m.label('talk.unplug'), 'dlg-choice', () => this.close())); return; }
      choices.forEach(([line, next]) => ch.appendChild(button(line, 'dlg-choice', () => { sayLine(line); show(next); })));
      const free = D.free;
      if (!free) return;
      ch.appendChild(button(this.m.label('talk.other'), 'dlg-choice dlg-kb', () => {
        ch.textContent = '';
        const inp = el('input', 'dlg-input'); inp.placeholder = this.m.label('talk.placeholder'); inp.setAttribute('aria-label', this.m.label('talk.aria', { speaker: D.speaker }));
        ch.appendChild(inp); inp.focus();
        inp.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key !== 'Enter' || !inp.value.trim()) return;
          const line = inp.value.trim(); sayLine(line);
          if (new RegExp(free.match, 'i').test(line)) show(free.goto);
          else { box.querySelector('.dlg-text')!.textContent = free.miss; ch.textContent = ''; ch.appendChild(button(free.retry, 'dlg-choice', () => show(free.retryGoto))); }
        });
      }));
    };
    show(D.start);
  }
}
