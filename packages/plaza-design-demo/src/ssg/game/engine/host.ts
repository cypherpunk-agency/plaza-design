import {NO_RULES} from './scene-rule-contract';
export {NO_RULES} from './scene-rule-contract';
import {emptyData} from './empty-data';
export {emptyData} from './empty-data';
import {DeviceAcknowledgment,type DeviceAcknowledgmentRequest,type AcknowledgmentCancel} from './device-acknowledgment';
import {defaultNetworkContext,type EngineNetworkContext} from './network-context';
import {mintFeedback,acceptFeedback,type FeedbackReceipt} from './feedback-receipt';
import type {Hints} from '../ui/hints';
import {attachGameplayHandoffs} from './gameplay/handoffs';
import {perfBegin,perfEnd} from '../runtime/diagnostics/performance';
import {attachNativeGameplay} from './gameplay/native-bindings';
import type {GameplaySession} from './gameplay/session';
import type {ConversationSession,ConversationFrame} from './gameplay/conversation';
/**
 * A scene on screen: its model, the schematic overlay, hack vision, its panels,
 * the HACK and BOARD buttons, and its part of the save. One class for every
 * scene; what differs is the scene's data (none: zero devices), its rules
 * (effects) and its definition (drawing, extra panels, extra things to press E
 * on): a `SceneDef` (scenes/kit.ts).
 *
 * Tap a thing in the world (or stand next to it and press E) and its schematic
 * opens. B opens the board with every device you have opened or seen, for
 * wiring, and the logic parts (timer, switch). H is hack vision: the world is
 * muted (the game draws it dimmed, then the devices and the player on top),
 * every device on screen gets a frame and a name plate, a plate unfolds into
 * its circuit, and you wire right there; logic parts float in the world next
 * to you. It is meant to grow into the board's replacement. Every action also
 * prints its shell line in the deck's terminal.
 *
 * Progress (state, goals, cables, placed parts, sectors, the net, the board's
 * layout) goes into the game's save as one `SceneSave` (`save.scenes.<id>`), a
 * moment after things settle, and on `persist()` (leaving, stopping the game).
 * The keyring and the modules are the player's, across scenes.
 */

import type { MachineData, SceneSave } from '../data/types';
import type { SceneDef, View } from '../scenes/kit';
import type { LineKind } from "../ui/terminal";
import { type Line, type Spot, SceneModel } from './model';
import { Panels } from './panels';
import type { SceneRules } from './rules';
import { type Box, Feedback, type PingKind, type Spot2D } from './feedback';
import { Popup, type PopupAnchor, type PopupItem, type PopupRoom, type PopupOpts } from './popup';
import { type Anchor, Schematic } from './schematic';
import { ENGINE_PANEL_FNS } from "./toys/index";

/**
 * Something to stand next to and press E on. `promptH`: how high its prompt hangs above the street;
 * `y`: how high the thing itself sits (a box on a roof), so the game can tell where you stand to reach it.
 */
export interface SceneTarget { id: string; x: number; label: string; promptH: number; y?: number }

/** How the game's canvas maps world units for a scene's drawing. */
export interface DrawView { sx: (wx: number) => number; y: (h: number) => number; t: number; viewW: number; viewH: number }

/**
 * What to draw: 'all', or for hack vision 'world' (everything but the devices: the game mutes
 * it) and then 'devices' (only the scene's devices, drawn bright over the muted world).
 */
export type DrawLayer = 'all' | 'world' | 'devices';

/** What a scene's drawing gets from the engine besides the view: its model, the device under the pointer, the layer. */
export interface EngineDraw { m: SceneModel; hover: string | null; layer: DrawLayer }

/** A scene without code of its own on the engine. */


/** How a scene reaches the game's save. */
export interface SceneStore {
  notice?:(text:string,tone?:import('../ui/communication').MessageTone,receipt?:FeedbackReceipt)=>void;
  feedbackCue?:(receipt:FeedbackReceipt)=>void;
  /** A mover's leg ended with a sound (a train's doors): played while this scene is the one on screen. */
  cue?:(cue:import('../data/types').MoverCue)=>void;
  hints?:Hints;
  hintBusy?:()=>boolean;
  feedbackTime?:()=>number;
  cutscene?:(id:string)=>void;
  presentation?:(operation:import('./gameplay/types').GameplayPresentation)=>void;
  gameplay?:(model?:SceneModel)=>GameplaySession|undefined;
  /** Direct common owner block. The model never replaces it. */
  state?:()=>Record<string,import('../data/types').Value>;
  conversation?:(id:string)=>ConversationSession|undefined;
  conversationCompleted?:(cue:NonNullable<ConversationFrame['completion']>)=>void;
  /** Logic modules the player owns. */
  modules: () => string[];
  /** Keyring item ids the player holds. */
  keyring: () => string[];
  /** Put an item on the keyring (and write the save). */
  give: (id: string) => void;
  /** The player now owns this logic module (and write the save). */
  grant?: (module: string) => void;
  /** Add noodle tokens, return the new total (and write the save). */
  tokens?: (add: number) => number;
  /** Add n of an item the player carries (0: ask; negative: take), return how many now (and write the save). */
  carry?: (item: string, n: number) => number;
  /** Set a save flag (and write the save). */
  flag?: (name: string) => void;
  /** A made fragment left the keyring (it is already gone from `keyring()`): write the save. */
  drop?: (id: string) => void;
  /** Sudo mode: every LINK reaches every node. */
  sudo?: boolean;
  /** The programs the player owns (scan.so), and one more (and write the save). */
  programs?: () => string[];
  program?: (id: string,receipt?:FeedbackReceipt) => void;
  /** The nodes the player controls, by Registry label (0x2F). */
  controlled?: () => string[];
  /** This scene's saved progress, if any. */
  load: () => SceneSave | undefined;
  /** Keep this as the scene's progress (and write the save). */
  store: (z: SceneSave) => void;
}

/** How long things must be quiet before the scene writes the save. */
const SAVE_AFTER_MS = 800;
/** While trace or a lockout moves, the save hears of it this often at most. */
const HEAT_SAVE_MS = 2000;
/** World (x along the scene, h above the ground) to CSS px inside the canvas. */
export type Project = (wx: number, h: number) => { x: number; y: number };
/** At most this many everyday actions in a popup (data/check.ts says the same of `everyday`); what you carry comes first. */
export const MAX_EVERYDAY = 3;
/** Walk this far (world units) from where a thing's popup opened, and it closes. */
const POPUP_WALK = 36;
/** A logic part's body floating in hack vision, in world units. */
const PART = { w: 26, h: 16 };
/** Where a new part floats: this high, beside the player, and parts keep this far apart (world units). */
const PART_H = 64, PART_GAP = 34;

export class SceneHost {
  readonly model: SceneModel;
  private schem: Schematic;
  private vision: Schematic;
  private panels: Panels;
  /** A thing's popup in the world: its everyday actions, jack in, hack it. */
  private popup: Popup;
  /** Where the player stood when the popup opened: walking off closes it. */
  private popupAt = 0;
  /** Where each device stood on screen in the last frame (for the popup). */
  private seen = new Map<string, Anchor>();
  /** Captions over the thing that reacted, and pings (scene/feedback.ts). */
  private fx: Feedback;
  private deviceAcknowledgment?:DeviceAcknowledgment;
  /** Speakers that are not devices or targets (the game's: the companion's speaker), as world points; null when not here. */
  where: (from: string) => { x: number; h: number } | null = () => null;
  /** Things the game keeps the popup away from besides the player (Pixel), as world points. */
  extras: () => { x: number; h: number }[] = () => [];
  /** Something of this scene reacted and said so (`from`, its line, its tone): the game may draw the eye there (the camera nudge). */
  onReact: (from: string, text: string, tone?: string) => void = () => {};
  /** Where something of this scene is in the world (a device's spot, or one of the scene's own targets), or null. */
  worldOf(from: string): { x: number; h: number } | null {
    const s = this.model.spots().find((z) => z.id === from);
    if (s) return { x: s.x, h: s.y + s.h / 2 };
    const t = this.def.targets?.(this.model).find((z) => z.id === from);
    return t ? { x: t.x, h: 20 } : null;
  }
  /** Boxes captions never cover besides the player (the player's speech bubble), CSS px of the game view. The game sets it. */
  shield: () => Box[] = () => [];
  /** People on screen (their heads), CSS px: captions keep their lane above them. The game sets it. */
  crowd: () => Box[] = () => [];
  /** The top of the free view, under the HUD and the buttons (CSS px of the game view). The game sets it. */
  uiTop = 0;
  /**
   * The story can step in (the opening, opening.ts); the game sets both. `hackLock`: hacking is not
   * yours yet (no HACK/BOARD, no H/B, no pink row in the popup, no jacking in). `story`: a device's
   * everyday actions in this state, instead of its data's (null: the data's).
   */
  hackLock: () => boolean = () => false;
  story: (dev: string) => PopupItem[] | null = () => null;
  private btns: HTMLDivElement;
  private hackBtn: HTMLButtonElement;
  private boardBtn: HTMLButtonElement;
  /** Hack vision's own buttons (desktop key bar): the LOGIC drawer, and every circuit unfolded at once. */
  private logicBtn: HTMLButtonElement;
  private unfoldBtn: HTMLButtonElement;
  /** NET (N): the net map. Only once you own scan.so (`netOk`); it pings the first time it shows (`netNew`). The game sets them. */
  private netBtn: HTMLButtonElement;
  netOk: () => boolean = () => false;
  netNew: () => boolean = () => false;
  /** NET was pressed: the game opens the net map. */
  onNet: () => void = () => {};
  /** Hack vision: the reset button (⊙) or a double-tap asked for the normal view. The game sets it. */
  onResetView: () => void = () => {};
  /** Hack vision's LOGIC drawer or UNFOLD changed: the game updates its bars. */
  onVisionUi: () => void = () => {};
  hover: string | null = null;
  onClose: () => void = () => {};
  private saveTimer = 0;
  private saved = '';
  /** The last frame's mapping and the player's spot, for placing and dragging logic parts in hack vision. */
  private project: Project | null = null;
  private width = 0;
  private player = { x: 0, h: 0 };
  /** While a typed command runs (`typed`), the deck already shows it: don't print the shell line again. */
  private echo = true;

  constructor(host: HTMLElement, private print: (text: string, kind?: LineKind, from?:string,receipt?:FeedbackReceipt) => void, private store: SceneStore | undefined, readonly def: SceneDef, rules: SceneRules = NO_RULES, network:EngineNetworkContext = defaultNetworkContext) {
    this.model = new SceneModel({
      say: (l, from,receipt) => this.say(l, from,receipt),
      feedbackScope:def.id,
      cue: store?.cue ? (cue) => { if (this.active) store.cue!(cue); } : undefined,
      open: (panel, arg) => this.panels.open(panel, arg),
      changed: () => { this.schem?.render(); this.vision?.render(); this.dirty(); },
      kick: (dev) => { if (this.schem.viewing === dev) this.schem.close(); },
      modules: store ? () => store.modules() : undefined,
      keyring: store ? () => store.keyring() : undefined,
      give: store ? (id) => store.give(id) : undefined,
      grant: store?.grant,
      tokens: store?.tokens,
      carry: store?.carry,
      flag: store?.flag,
      drop: store?.drop,
      sudo: store?.sudo ? () => true : undefined,
      programs: store?.programs,
      program: store?.program,
      controlled: store?.controlled,
    }, def.data ?? emptyData(def.id, def.name), rules,undefined,network.net,network.keyring,store?.state?.(),def.gameplay);
    const shared=store?.gameplay?.(this.model);if(shared){attachNativeGameplay(this.model,shared);this.gameplay=shared;}
    if(shared?.definition.handoffs?.length)attachGameplayHandoffs(shared,{schedule:(ms,run,canceled,detail)=>this.model.later(ms,run,detail,canceled),cutscene:id=>store?.cutscene?.(id),...(store?.presentation?{presentation:operation=>store.presentation!(operation)}:{})});
    const known = new Set<string>();
    this.schem = new Schematic(host, this.model, (l) => this.say(l), { known, hints:store?.hints, hintBusy:()=>!!store?.hintBusy?.()||!!this.popup?.isOpen||!!this.panels?.isOpen });
    this.vision = new Schematic(host, this.model, (l) => this.say(l), { known, vision: true, hints:store?.hints, hintBusy:()=>!!store?.hintBusy?.()||!!this.popup?.isOpen||!!this.panels?.isOpen||this.schem.isOpen });
    // the engine's own panels (the lock toys) under the scene's
    this.popup = new Popup(host);
    this.fx = new Feedback(host,store?.feedbackTime);
    this.popup.onClose = () => { this.chosen = null; this.onClose(); };
    this.panels = new Panels(host, this.model, (l) => this.say(l), { ...ENGINE_PANEL_FNS, ...def.panels },store?.conversation,(speaker,pages)=>this.print(speaker+': '+pages.join('\n'),'out','dialogue'),store?.conversationCompleted);
    this.schem.onLayout = () => this.dirty();
    this.vision.onLayout = () => this.dirty();
    this.vision.onPlace = (id) => { this.place(id); this.refollow(); this.dirty(); };
    this.vision.onMovePart = (id, at) => this.movePart(id, at);
    this.schem.onClose = () => this.onClose();
    this.vision.onClose = () => { this.sync(); this.onClose(); };
    // you keep walking in hack vision: a tapped verb must not keep the keys (Enter would press it again)
    this.vision.root.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('.sch-guess')) this.onClose(); }, true);
    this.panels.onClose = () => { if (!this.schem.isOpen) this.onClose(); };

    // HACK and BOARD over the canvas, so nobody has to guess the keys
    this.btns = document.createElement('div'); this.btns.id = 'scene-btns'; this.btns.hidden = true;
    const button = (text: string, fn: () => void) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'hack-btn'; b.textContent = text;
      // hand the keys back to the canvas, or Space and Enter would press the button again
      b.addEventListener('click', () => { fn(); this.onClose(); });
      this.btns.appendChild(b); return b;
    };
    this.hackBtn = button('HACK · H', () => this.toggleVision());
    this.hackBtn.title = 'hack vision: see every device here and wire them in place (H)';
    this.boardBtn = button('BOARD · B', () => this.toggleBoard());
    this.logicBtn = button('LOGIC · L', () => this.toggleLogic());
    this.logicBtn.dataset.logic = '';
    this.logicBtn.title = 'the logic drawer: timers and switches to drag into the scene (L)';
    this.netBtn = button('NET · N', () => this.onNet());
    this.netBtn.title = 'the net map: the networks you have found, and what you reach from here (N)';
    this.unfoldBtn = button('UNFOLD · U', () => this.toggleUnfold());
    this.unfoldBtn.title = 'unfold every circuit at once, to compare them (U)';
    this.logicBtn.hidden = this.unfoldBtn.hidden = this.netBtn.hidden = true;
    this.vision.onReset = () => this.onResetView();
    this.vision.onDrawer = () => { this.sync(); this.onVisionUi(); };
    host.appendChild(this.btns);
    this.vision.bar = this.btns;
    const saved = store?.load();
    if (saved) this.restore(saved);
    this.saved = JSON.stringify({...this.snapshot(),state:this.model.state});
    this.sync();
    this.lastHeat = this.heat();
    window.addEventListener('pagehide', this.onPageHide);
  }
  private onPageHide = () => this.persist();
  /** The scene's gameplay session, bound to this host's model (engine/gameplay/native-bindings.ts). */
  gameplay?: GameplaySession;
  private disposed = false;
  get isDisposed() { return this.disposed; }

  /**
   * The zone is unloaded (SEAMLESS-WORLD.md §3 "Unloaded zones are reloaded"): the save is written, then everything
   * this host owns goes: its popup, panels, schematics and captions (their nodes and window listeners), its HACK/BOARD
   * strip, a pending acknowledgment, the save timer, the session bound to its model and the model's delayed actions
   * (dropped, as on a page reload). The save is all that is left; hosting the scene again rebuilds it from there, as
   * Continue does. Idempotent.
   */
  dispose() {
    if (this.disposed) return;
    this.persist();
    this.disposed = true;
    this.cancelAcknowledgment('disposed');
    this.closeAll();
    clearTimeout(this.saveTimer);
    window.removeEventListener('pagehide', this.onPageHide);
    this.gameplay?.dispose();
    this.model.dispose();
    this.popup.dispose(); this.panels.dispose(); this.schem.dispose(); this.vision.dispose(); this.fx.dispose();
    this.btns.remove();
    this.active = false; this.project = null; this.seen.clear();
    this.onClose = this.onReact = () => {};
  }

  /** Trace (whole %) and running lockouts, as a string: when it changes, the save should hear of it. */
  private heat() {
    const m = this.model;
    return [...m.trace].map(([k, v]) => k + Math.round(v)).join() + '|' + [...m.locks.keys()].filter((k) => m.lockLeft(k) > 0).join();
  }

  get id() { return this.def.id; }

  // ---------- the save ----------

  /** Everything the save keeps about the scene. */
  snapshot(): SceneSave {
    const board = this.schem.layout(), pieces = this.vision.pieces();
    // hack vision: plates and circuits moved off their default spot (world units from it)
    const vision = Object.keys(pieces).length ? { vision: pieces } : {};
    const {state:scalarState,...engine}=this.model.snapshot();
    return { ...engine, board: { known: [...this.schem.known], pos: board.pos, offsets: board.offsets, ...vision } };
  }

  private restore(z: SceneSave) {
    this.model.restore({...z,state:{...this.model.state}});
    this.schem.known.clear();
    (z.board?.known ?? []).forEach((id) => { if (this.model.devices.has(id)) this.schem.known.add(id); });
    this.schem.restoreLayout({ pos: z.board?.pos, offsets: z.board?.offsets });
    this.vision.restorePieces(z.board?.vision, (id) => this.model.devices.has(id));
  }

  /** Something changed: write the save once things have been quiet for a moment. */
  private dirty() {
    if (!this.store || this.disposed) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.persist(), SAVE_AFTER_MS);
  }

  /** Write the scene's progress now, if it changed since the last write. */
  persist() {
    clearTimeout(this.saveTimer);
    // a disposed host never writes again: a fresh host for the scene owns its save block now
    if (!this.store || this.disposed) return;
    const z = this.snapshot(), json = JSON.stringify({...z,state:this.model.state});
    if (json === this.saved) return;
    this.saved = json;
    this.store.store(z);
  }

  /** `reset <scene>`: the scene as on the first visit; the rest of the save (keyring included) is untouched. */
  reset() {
    this.cancelAcknowledgment('reset');
    this.closeAll();
    this.model.reset();
    this.schem.known.clear();
    this.schem.resetLayout(); this.vision.resetLayout();
    this.saved = '';
    this.persist();
    this.sync();
  }

  /**
   * A line: to the terminal (the history), the open schematic's status, and, when it is known
   * who said it, as a caption over that thing in the world (with a ping).
   */
  private say(l: Line, from?: string,receipt?:FeedbackReceipt) {
    const tone=l[2]==='err'?'error':l[2]==='ok'?'success':'info';
    receipt??=this.model?.takeReceipt?.(l,from)??mintFeedback(this.def?.id??'scene',from??'system',tone);
    if(!acceptFeedback(this,receipt))return receipt;
    if (l[0] && this.echo) this.print('> ' + l[0], 'in');
    if (l[1]) this.print(l[1], l[2] === 'ok' ? 'ok' : l[2] === 'err' ? 'err' : l[2] === 'dim' ? 'dim' : 'out', from,receipt);
    this.schem.note(l); this.vision.note(l);
    if(l[1]&&(l[2]==='err'||l[2]==='ok'))this.store?.feedbackCue?.(receipt);
    if (from && l[1]) {
      if(this.active&&this.locate(from)){this.fx.caption(from,l[1],l[2],this.locate);this.onReact(from,l[1],l[2]);}
      // A remote result or an absent anchor cannot own a world caption. The sourced
      // history write above suppresses terminal forwarding; offer its one visible result here.
      else if(l[2]!=='dim')this.store?.notice?.(l[1],l[2]==='err'?'error':l[2]==='ok'?'success':'info',receipt);
    }else if(!from&&l[1]&&l[2]==='err')this.store?.notice?.(l[1],'error',receipt);
    return receipt;
  }

  /** Something of this scene says a line, as if it had reacted (a caption over it, the history): the story's lines. */
  react(from: string, l: Line,receipt?:FeedbackReceipt) { return this.say(l, from,receipt); }

  get acknowledgmentPending(){return !!this.deviceAcknowledgment?.pending;}
  get acknowledgmentId(){return this.deviceAcknowledgment?.pending?this.deviceAcknowledgment.request.id:undefined;}
  /** What the pending acknowledgment says now (the probe reads it). */
  get acknowledgmentText(){return this.deviceAcknowledgment?.pending?this.deviceAcknowledgment.text:undefined;}
  advanceAcknowledgment(){return this.deviceAcknowledgment?.advance()??false;}
  cancelAcknowledgment(reason:AcknowledgmentCancel='dismissed'){return this.deviceAcknowledgment?.cancel(reason)??false;}
  acknowledgeDevice(request:DeviceAcknowledgmentRequest,complete:()=>void,canceled?:(reason:AcknowledgmentCancel)=>void):DeviceAcknowledgment{
    if(this.deviceAcknowledgment?.pending&&this.deviceAcknowledgment.request.id===request.id)return this.deviceAcknowledgment;
    const logged=new Set<number>();let delivery:DeviceAcknowledgment;
    const changed=()=>{if(!delivery.pending){this.fx.releaseAcknowledgment(delivery);if(this.deviceAcknowledgment===delivery)this.deviceAcknowledgment=undefined;return;}
      if(!logged.has(delivery.page)){logged.add(delivery.page);const tone=request.tone==='ok'?'success':request.tone==='err'?'error':'info',receipt=mintFeedback(this.def.id,request.from,tone);this.print(request.speaker+': '+delivery.text,request.tone==='ok'?'ok':request.tone==='err'?'err':request.tone==='dim'?'dim':'out',request.from,receipt);}
      this.fx.acknowledge(delivery,this.locate,from=>this.locate(from,request.height));
    };
    delivery=new DeviceAcknowledgment(request,complete,canceled,changed,()=>this.active&&!this.paused&&!this.overlayOpen);this.cancelAcknowledgment('replaced');this.deviceAcknowledgment=delivery;changed();return delivery;
  }

  /** A ping where something of this scene is (a device, one of its targets, or what `where` knows); an edge arrow when it is off the view. */
  clearPing(from: string) { this.fx.clearPing(from); }
  ping(from: string, kind: PingKind = 'look') { if (this.active) this.fx.ping(from, kind, this.locate); }

  /**
   * Where a speaker is on screen now: a device (its spot), one of the scene's own targets
   * (the pickup tray), or what the game knows (Pixel). `off`: it is off to that side of the view.
   */
  private locate = (from: string,anchorHeight?:number): Spot2D | null => {
    const p = this.project;
    if (!p) return null;
    const s = this.model.spots().find((x) => x.id === from);
    let x: number, base: number, w: number, h: number;
    if (s) { x = s.x; base = s.y; w = s.w; h = s.h; }
    else {
      const t = this.def.targets?.(this.model).find((z) => z.id === from), q = t ? { x: t.x, h: 0 } : this.where(from);
      if (!q) return null;
      x = q.x; base = q.h; w = t ? 24 : 18; h = t ? Math.max(16, t.promptH - 14) : 16;
    }
    if(anchorHeight!==undefined){base+=anchorHeight;w=18;h=16;}
    const c = p(x, base + h / 2), e = p(x + w / 2, base + h), sw = (e.x - c.x) * 2, sh = (c.y - e.y) * 2;
    const off = c.x + sw / 2 < 0 ? -1 : c.x - sw / 2 > this.width ? 1 : 0;
    return { x: c.x, y: c.y, w: sw, h: sh, off };
  };

  /** What the popup keeps clear of and away from: the player, the buttons, what the device is cabled to or affects, Pixel. */
  private room(id: string): PopupRoom {
    const p = this.project!, m = this.model, d = m.devices.get(id);
    const me = p(this.player.x, this.player.h + 21), head = p(this.player.x + 9, this.player.h + 44);
    const player: PopupAnchor = { x: me.x, y: me.y, w: (head.x - me.x) * 2, h: (me.y - head.y) * 2 };
    const partners = new Set<string>(d?.data.affects ?? []);
    m.links.forEach((l) => {
      const a = l.from.split('.')[0], b = l.to.split('.')[0];
      if (a === id && b !== id) partners.add(b);
      if (b === id && a !== id) partners.add(a);
    });
    const avoid = [...partners].map((x) => this.locate(x)).filter((q): q is Spot2D => !!q && !q.off).map((q) => ({ x: q.x, y: q.y }));
    avoid.push({ x: player.x, y: player.y });
    this.extras().forEach((q) => { const c = p(q.x, q.h + 8); avoid.push(c); });
    const keepClear = [player];
    const row = this.btns.parentElement?.classList.contains('kb-actions') ? this.btns.parentElement : this.btns;
    const top = this.fx.origin();
    if (row && !this.btns.hidden && row.offsetParent) {
      const r = row.getBoundingClientRect();
      keepClear.push({ x: r.left - top.left + r.width / 2, y: r.top - top.top + r.height / 2, w: r.width, h: r.height });
    }
    return { avoid, keepClear, top: this.uiTop, lane: this.fx.laneBottom() };
  }

  /** BOARD is off until something is on it; HACK lights up while hack vision is on. */
  private sync() {
    // HACK and BOARD only where there is something to hack, and only once hacking is yours
    const hide = !this.active || !this.hackable;
    if (this.btns.hidden !== hide) this.btns.hidden = hide;
    const none = !this.schem.known.size, on = this.vision.isOpen;
    if (this.boardBtn.disabled !== none) {
      this.boardBtn.disabled = none;
      this.boardBtn.title = none ? 'nothing on the board yet' : 'the board: everything you have opened or seen, plus timers and switches (B)';
    }
    if (this.hackBtn.classList.contains('on') !== on) {
      this.hackBtn.classList.toggle('on', on); this.hackBtn.setAttribute('aria-pressed', String(on));
      // in hack vision the bar is hack vision's: EXIT, BOARD, LOGIC, NET, UNFOLD
      this.hackBtn.textContent = on ? 'EXIT · H' : 'HACK · H';
      this.logicBtn.hidden = this.unfoldBtn.hidden = !on;
    }
    // NET once you own scan.so; it pings until the net map has been opened once
    const net = !on || !this.netOk();
    if (this.netBtn.hidden !== net) this.netBtn.hidden = net;
    const ping = !net && this.netNew();
    if (this.netBtn.classList.contains('ping') !== ping) this.netBtn.classList.toggle('ping', ping);
    const lo = on && this.vision.drawerOpen, un = this.vision.allUnfolded;
    if (this.logicBtn.classList.contains('on') !== lo) this.logicBtn.classList.toggle('on', lo);
    if (this.unfoldBtn.classList.contains('on') !== un) { this.unfoldBtn.classList.toggle('on', un); this.unfoldBtn.textContent = un ? 'FOLD · U' : 'UNFOLD · U'; }
  }

  /**
   * A machine picked on the net map (or the deck's `connect`): onto the board, as a LINK's connect
   * would bring it, and the board opens on it. `place`: where a machine of another scene lives.
   * False when it could not come (out of reach, no scan.so).
   */
  plugIn(id: string, place?: (m: MachineData) => string): boolean {
    const l = this.model.plugIn(id, place), d = this.model.devices.get(id);
    this.say(l, d && !d.node ? id : undefined);
    if (d && l[2] !== 'err' && !this.hackLock()) {
      this.schem.known.add(id);
      this.popup.close(); this.panels.close(); this.vision.close();
      this.schem.openDevice(id);
      this.sync();
    }
    return l[2] !== 'err';
  }

  /** The deck's `scan` (and opening the net map): every node in reach from here shows on the board. */
  scanHere() { const l = this.model.scanHere(); this.say(l); return l; }

  /** L in hack vision: the LOGIC drawer open or shut. */
  toggleLogic() { if (this.vision.isOpen) this.vision.setDrawer(!this.vision.drawerOpen); }
  /** U in hack vision: every circuit unfolded at once, or back to each by hand. */
  toggleUnfold() { if (this.vision.isOpen) { this.vision.toggleUnfoldAll(); this.sync(); this.onVisionUi(); } }
  get logicOpen() { return this.vision.isOpen && this.vision.drawerOpen; }
  get unfoldAll() { return this.vision.allUnfolded; }
  /** Hack vision: what you own, for the LOGIC drawer (the HUD keeps only the goal there). The game sets it. */
  set drawerInfo(fn: () => string) { this.vision.drawerInfo = fn; }
  /** Hack vision: the view is panned or zoomed (the reset button shows). */
  viewMoved(on: boolean) { this.vision.showReset(on); }

  /**
   * Run something the player typed in the deck (the terminal, last resort): the engine's lines
   * print as usual, minus the shell command the player just typed themselves.
   */
  typed(fn: () => void) {
    this.echo = false;
    try { fn(); } finally { this.echo = true; }
  }

  /** The device whose schematic is open (not the board, not hack vision), if any. */
  get viewing() { return this.schem.viewing; }

  get overlayOpen() { return this.schem.isOpen || this.panels.isOpen; }
  /** A full-screen panel is up: talking to a daemon, or a lock toy (the city clock stops; the board does not stop it). */
  presentConversation(session:ConversationSession){this.popup.close();this.panels.presentConversation(session);}
  get conversationFrame(){return this.panels.conversationFrame;}
  get panelOpen() { return this.panels.isOpen; }
  closeOverlay() { if (this.panels.isOpen) this.panels.close(); else this.schem.close(); }
  closeAll() { this.popup.close(); this.fx.clear(true); this.panels.close(); this.schem.close(); this.vision.close(); }
  /** This scene is the one on screen: its clock runs and its captions show. */
  private active = false;
  private paused = false;
  /** The game's pause state; scene time and delayed actions share it. */
  setPaused(on: boolean) { this.paused = on; this.model.setPaused(on); }
  private lastHeat = '';
  private heatWritten = 0;
  /**
   * The game loop's frame for this scene (every hosted scene, on screen or not): `ms` of scene time pass.
   * Trace fills while you look into a logged device and drains when you leave; watchdogs walk, clocks
   * beat, movers move, zones notice and delayed signals arrive on this one tick.
   */
  tick(ms: number) {
    if (this.paused || this.disposed) return;
    const perf=perfBegin('host.tick',this.id);try{
    this.model.viewing = new Set(this.schem.viewing ? [this.schem.viewing] : []);
    if (this.model.tick(ms, this.active)) { this.schem.meters(); this.vision.meters(); }
    this.panels.step(ms);
    // trace and lockouts are saved: write them as they move (at most every HEAT_SAVE_MS), so a reload is no way out
    const h = this.heat(), now = this.model.now();
    if (h !== this.lastHeat && now - this.heatWritten > HEAT_SAVE_MS) { this.lastHeat = h; this.heatWritten = now; this.persist(); }
    }finally{perfEnd(perf);}
  }
  /**
   * The scene is on screen (or not). Its HACK and BOARD buttons show only here, and only when it
   * has devices: in a scene with nothing to hack they stay away (and H and B do nothing).
   */
  show(on: boolean) { if(!on)this.cancelAcknowledgment('scene-hidden');this.active = on; this.btns.hidden = !on || !this.hackable; }
  /** The scene has devices, and hacking is yours: hack vision and the board mean something here. */
  get hackable() { return this.model.devices.size > 0 && !this.hackLock(); }

  get visionOn() { return this.vision.isOpen; }
  /** H: hack vision on or off. From an open schematic or panel it goes straight to the world, in vision. */
  toggleVision() {
    this.popup.close();
    if (this.hackLock()) return;
    if (this.vision.isOpen && !this.overlayOpen) { this.vision.setDrawer(false); this.vision.close(); }
    else { this.panels.close(); this.schem.close(); this.vision.openVision(); }
    this.sync();
  }
  /** A tap on the canvas in hack vision: on a device, all its verbs; on nothing, drop the cable in hand. */
  poke(id: string | null) { this.vision.poke(id); }

  /**
   * Every frame: where each device stands on screen, so hack vision follows the camera,
   * and where the player is (logic parts placed in hack vision float next to them).
   */
  follow(project: Project, width: number, player?: { x: number; h: number }) {
    this.project = project; this.width = width;
    this.vision.unit = (project(100, 0).x - project(0, 0).x) / 100 || 1;
    if (player) this.player = { x: player.x, h: player.h };
    const m = this.model, seen = new Map<string, Anchor>();
    const add = (id: string, x: number, base: number, w: number, h: number) => {
      const c = project(x, base + h / 2), e = project(x + w / 2, base + h);
      const sw = (e.x - c.x) * 2, sh = (c.y - e.y) * 2;
      if (c.x + sw / 2 < 0 || c.x - sw / 2 > width) return;
      seen.set(id, { x: c.x, y: c.y, w: sw, h: sh });
    };
    m.spots().forEach((s) => add(s.id, s.x, s.y, s.w, s.h));
    // a thing of the game's that has a popup open (a bench's "wait until…": `choose`)
    if (this.chosen) add(this.chosen.id, this.chosen.x, this.chosen.y, this.chosen.w, this.chosen.h);
    this.seen = new Map(seen);
    if (this.popup.isOpen) {
      const at = this.popup.dev ? seen.get(this.popup.dev) : undefined;
      // walked off, or the thing left the view: the popup goes
      if (!at || Math.abs(this.player.x - this.popupAt) > POPUP_WALK) this.popup.close(); else this.popup.place(at);
    }
    this.fx.top = this.uiTop;
    this.vision.top = this.uiTop;
    // captions keep off the player and what the game shields (a speech bubble), and keep their lane over
    // the devices and the people
    const me = project(this.player.x, this.player.h + 23), head = project(this.player.x + 10, this.player.h + 48);
    const hard: Box[] = [{ l: me.x - (head.x - me.x), t: head.y, r: head.x, b: me.y + (me.y - head.y) }, ...this.shield()];
    const soft: Box[] = [...seen.values()].map((a) => ({ l: a.x - a.w / 2, t: a.y - a.h / 2, r: a.x + a.w / 2, b: a.y + a.h / 2 }));
    this.extras().forEach((q) => { const c = project(q.x, q.h + 8), e = project(q.x + 9, q.h + 16); soft.push({ l: c.x - (e.x - c.x), t: e.y, r: e.x, b: c.y + (c.y - e.y) }); });
    soft.push(...this.crowd());
    // an open popup wins the caption lane: captions step aside for it (engine/popup.ts)
    this.fx.update(this.locate, hard, soft, this.popup.boxes);
    if (this.vision.isOpen) {
      // a part placed on the board has no spot in the world yet: it turns up next to you
      [...m.devices.values()].filter((d) => d.logic && !m.logicAt.has(d.id)).forEach((d) => { this.place(d.id); this.dirty(); });
      m.logicAt.forEach((at, id) => add(id, at.x, at.h, PART.w, PART.h));
    }
    const hintBusy=!!this.store?.hintBusy?.()||this.popup.isOpen||this.panels.isOpen;
    this.schem.presentHint(hintBusy||!this.active);
    this.vision.presentHint(hintBusy||!this.active||this.schem.isOpen);
    this.vision.see(seen);
    this.sync();
  }
  /** Follow again now (a part was placed or moved), with the last frame's mapping. */
  private refollow() { if (this.project) this.follow(this.project, this.width); }

  /** A spot in the world for a logic part: beside the player, clear of the devices and the parts already there. */
  private place(id: string) {
    const m = this.model, near = (a: number, b: number, d: number) => Math.abs(a - b) < d;
    const free = (x: number, h: number) =>
      !m.spots().some((s) => near(x, s.x, s.w / 2 + PART.w / 2 + 6) && h < s.h + 6)
      && ![...m.logicAt.values()].some((p) => near(p.x, x, PART.w + 8) && near(p.h, h, PART.h + 8));
    // right of the player first, then left, a little further each time; then a row higher
    let at = { x: this.player.x + PART_GAP, h: PART_H };
    search: for (let row = 0; row < 4; row++) {
      for (let i = 1; i <= 8; i++) {
        const x = this.player.x + PART_GAP * Math.ceil(i / 2) * (i % 2 ? 1 : -1), h = PART_H + row * (PART.h + 12);
        if (x > PART.w && free(x, h)) { at = { x, h }; break search; }
      }
    }
    m.logicAt.set(id, at);
  }

  /** A part dragged in hack vision: its centre to `at` (stage px), back into the world. */
  private movePart(id: string, at: { x: number; y: number }) {
    const p = this.project;
    if (!p) return;
    // the mapping is linear: two points give it, and its inverse
    const o = p(0, 0), u = p(100, 100), kx = (u.x - o.x) / 100, ky = (u.y - o.y) / 100;
    if (!kx || !ky) return;
    const wx = (at.x - o.x) / kx, h = (at.y - o.y) / ky - PART.h / 2;
    this.model.logicAt.set(id, { x: Math.round(wx), h: Math.round(Math.max(0, Math.min(220, h))) });
    this.refollow();
    this.dirty();
  }

  // ---------- a thing's popup: everyday actions, jack in, hack it ----------

  get popupOpen() { return this.popup.isOpen; }
  /** A key while the popup is open: true when it used the key. */
  popupKey(e: KeyboardEvent) { return this.popup.key(e); }

  /**
   * A click or E on a device in the world: its popup, right next to it. Its everyday
   * actions (data: `everyday`), `⌁ jack in` for a computer (`deck`), then `⌁ hack it`.
   */
  pick(id: string) {
    const d = this.model.devices.get(id);
    if (!d) return;
    const items = this.popupItems(id);
    // nothing to do with it yet (hacking locked, no everyday actions): it only shows how it looks
    if (!items.length) { this.say(['', d.look, 'dim'], id); return; }
    this.popupAt = this.player.x;
    this.popup.open(id, d.name, this.model.label('menu.aria', { device: d.name }), items, this.seen.get(id), this.project ? this.room(id) : undefined);
  }

  /** What `choose` opened the popup for (not a device), while it is open. */
  private chosen: { id: string; x: number; y: number; w: number; h: number } | null = null;

  /**
   * The popup for something that is not a device (the game's: a bench's "wait until…"): `name` on
   * the plate, these actions, over the box at world `x` (centre), `y` up from the ground, `w` × `h`.
   */
  choose(id: string, name: string, items: PopupItem[], at: { x: number; y: number; w: number; h: number }) {
    this.chosen = { id, ...at };
    this.refollow();
    this.popupAt = this.player.x;
    const wrapped = items.map((it) => ({ ...it, run: () => { this.popup.close(); it.run(); } }));
    this.popup.open(id, name, name, wrapped, this.seen.get(id), this.project ? this.room(id) : undefined);
  }

  /** Is the list menu `id` (`list`) what the popup shows now? */
  listOpen(id: string) { return this.popup.isOpen && this.popup.dev === id; }
  /** Close the list menu `id`, if it is the one open. */
  closeList(id: string) { if (this.listOpen(id)) this.popup.close(); }

  /**
   * A list menu beside a moving thing (the lift car's floors), over the box at world `x` (centre), `y` up from the
   * ground, `w` × `h`: open it, or, already open, bring its rows, selection and the thing's place up to date. The
   * host that owns the state calls it every frame it applies. Its rows run what they run (the popup stays open for
   * them); `step` is what ↑ and ↓ do (1 up, -1 down), `sel` the row selected.
   */
  list(id: string, name: string, items: PopupItem[], at: { x: number; y: number; w: number; h: number }, sel: number, step: (dir: 1 | -1) => void) {
    this.chosen = { id, ...at };
    if (this.listOpen(id)) { this.popup.refresh(items, sel); return; }
    this.refollow();
    this.popupAt = this.player.x;
    const opts: PopupOpts = { placement: 'list', step, sel };
    this.popup.open(id, name, name, items, this.seen.get(id), this.project ? this.room(id) : undefined, opts);
  }

  private popupItems(id: string): PopupItem[] {
    const m = this.model, d = m.devices.get(id)!;
    // the story's everyday actions for this device, in this state (the popup closes first, as for the data's)
    const story = this.story(id)?.map((it) => ({ ...it, run: () => { this.popup.close(); it.run(); } }));
    // a noun sealed away (or gone) is not everyday any more
    const open = (noun: string) => { const n = d.nouns.find((x) => x.id === noun); return n && !(n.sector && m.sealed(id, n.sector)) ? n : null; };
    const items: PopupItem[] = story ?? (d.data.everyday ?? []).flatMap((e) => {
      const n = open(e.noun);
      if (!n) return [];
      return [{ label: m.labelOf(id, e.label ?? e.verb), cur: n.current?.() === e.verb, run: () => this.everyday(id, e.noun, e.verb) }];
    });
    // what you carry that it takes (data: `items`): only while you hold it, first; still three at most,
    // so the last everyday ones make room (GAME-DATA.md, "Using what you carry")
    if (!story) {
      const own: PopupItem[] = (d.data.items ?? []).flatMap((u, i) => (open(u.noun) && m.carry(u.item) > 0
        ? [{ label: m.labelOf(id, u.label), own: true, run: () => { this.popup.close(); m.offer(id, i); } }] : []));
      items.unshift(...own);
      items.splice(MAX_EVERYDAY);
    }
    if (this.hackLock()) return items;
    if (d.data.deck) items.push({ label: m.label('menu.jack'), hack: true, run: () => { this.popup.close(); this.openDevice(id); } });
    items.push({ label: m.label('menu.hack'), hack: true, run: () => this.hackIt(id) });
    return items;
  }

  /**
   * An everyday action: the noun's verb, exactly as a tap on it would run it. The popup
   * closes first, so the scene is free when the reaction plays (its caption, its ping).
   */
  private everyday(dev: string, noun: string, verb: string) {
    this.popup.close();
    this.model.act(dev, noun, verb);
  }

  /** `⌁ hack it`: hack view, this device's circuit unfolded and in view. */
  hackIt(id: string) {
    this.popup.close(); this.panels.close(); this.schem.close();
    if (this.hackLock()) return;
    if (!this.vision.isOpen) this.vision.openVision();
    this.vision.focus(id);
    this.sync();
  }

  /** Open a device's schematic, unless a full trace has you locked out of it. */
  openDevice(id: string) {
    const d = this.model.devices.get(id);
    if (!d || this.hackLock()) return;
    const left = this.model.lockLeft(id);
    if (left) { this.say(this.model.line('trace.locked', { device: d.name, sec: Math.ceil(left / 1000) }),id); return; }
    this.say(['login ' + id, d.look, 'dim']);
    this.schem.openDevice(id);
  }
  toggleBoard() {
    if (this.hackLock()) return;
    if (!this.schem.known.size) { const text=this.model.label('board.empty');this.print(text, 'dim');this.store?.notice?.(text,'info');return; }
    this.schem.toggleBoard();
  }

  /** Things you can stand next to and press E on: the scene's own (an exit), then every device in the world. */
  targets(): SceneTarget[] {
    const m = this.model, own = this.def.targets?.(m) ?? [];
    const devs = m.spots().map((s: Spot) => ({ id: s.id, x: s.x, y: s.y, label: m.label('prompt.open'), promptH: s.y + Math.min(s.h + 12, 100) }));
    return [...own, ...devs];
  }

  /** E next to a target. Returns the id of one of the scene's exits when the player leaves through it. */
  use(id: string): string | void {
    if (this.model.devices.has(id) && this.model.spots().some((s) => s.id === id)) { this.pick(id); return; }
    // what the scene's own targets say (the pickup tray) stands over them
    return this.def.use?.(id, this.model, (l) => this.say(l, id));
  }

  /** The device in the world under a point (world x, height), smaller things first. */
  spotAt(wx: number, h: number) {
    const hit = this.model.spots().filter((s) => Math.abs(wx - s.x) <= s.w / 2 + 3 && h >= s.y - 4 && h <= s.y + s.h + 4);
    // a big frame (the crane) must not hide the smaller things standing in front of it
    hit.sort((a, b) => a.w - b.w);
    return hit[0]?.id ?? null;
  }

  objective() {
    const next = this.model.data.goals.find((g) => !this.model.goals.has(g.id));
    return next ? next.text : this.model.label('goals.done');
  }

  /** Draw the scene; in hack vision the game draws 'world', mutes it, then 'devices' (see `DrawLayer`). */
  preparePresentation(v: View, layer: DrawLayer = 'all') { this.def.preparePresentation?.(v, { m: this.model, hover: this.hover, layer }); }
  draw(x: CanvasRenderingContext2D, v: View, layer: DrawLayer = 'all') { this.def.drawBackdrop(x, v, { m: this.model, hover: this.hover, layer }); }
}
