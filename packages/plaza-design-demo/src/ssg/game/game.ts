/**
 * ACCESS DENIED, the game: input, movement, camera and drawing. Every place is
 * a scene (scenes/: `SCENES`, one `SceneDef` each), and every scene is hosted
 * the same way on the hacking engine (engine/: `SceneHost`), devices or not:
 * this file walks you through it, draws the engine's sky, street and rain
 * around it, and hands it taps, E, H (hack vision) and B (the board).
 * Downtown's street walls, its people and the fixer are drawn here; what they
 * say, and the terminal, live in level.ts.
 * Pixel the robot cat, who follows you once you leave the flat, is companion.ts.
 *
 * The canvas fills the landing page's window between its header and footer and
 * is drawn at an integer pixel scale so the sprites stay crisp.
 */

import { sound } from './audio';
import { drawSprite, GLOW_THEM, GLOW_YOU, HULL, SPR, type Sprite } from './sprites';
import { type LineKind, Terminal } from './terminal';
import { PARCEL } from './yard';
import { Companion, WARM } from './companion';
import { reconcile, syncGoals, sceneShell } from './downtown';
import { NO_RULES, SceneHost } from './engine';
import { isSceneId, ITEMS, SCENES, sceneTitle, type ItemId, type SceneDef, type SceneExit, type SceneId, type SceneView } from './scenes';
import { KEYRING } from './data';
import { CutscenePlay, cutsceneById, isCutsceneId, type CutsceneId } from './cutscenes';
import { botReact, isBot, characterHeight, characterX, talkTo } from './characters';
import {
  boardRide, lineOpen, nextStation, ride, SEG, platformDoors, platformLeft, platformOpen, platformSync, rideAtSiding, rideLeft, rideNext, rideOpen, rideRun, rideStop, stepRide, STOP, TIMETABLE,
} from './scenes/line';
import {
  DOORS, DRIVER_HARBOR, harborOpen, HOP, LINE, SIDING_OUT, placeBlocked, type MapPlace, drawFlight, DRIVER_BROKE, FARE, FLIGHT,
  seenFlag, START_SCENE, standOf, STANDS, STATIONS, stationAt, type Stand, type Station,
} from './city';
import { drawCityMap, mapKey, mapPointer, openMap, type MapAct, type MapState, type MapView } from './citymap';
import { KeyBar } from './keybar';
import { messagesOf, unread } from './contacts';
import { levels, startLevel, SUDO, unlockAll } from './sudo';
import {
  DECK_BEFORE, HOME_RUN, IDLE_PING, isBefore, hackLocked, MORNING, MOTH_MESSAGE, OPENING, OPENING_EVERYDAY, OPENING_EXITS, OPENING_GOAL, OPENING_INTRO,
  OPENING_LINES, OPENING_PINGS, OPENING_TARGETS, OPENING_TIME, openingLevel, openingResume, openingState, pick, SLEEP, TURNSTILE, UPLINK_KEY, UPLINK_LINES, WAKE_LINES,
  type ExitRule, type OpeningState, type PingTarget,
} from './opening';
import type { PopupItem } from './engine/popup';
import { CAPSULE_SPAWN } from './capsule';
import { Menu } from './menu';
import {
  commands, FRONTS, fixerTalk, LEVEL_W, loadSave, NO_ARGS, NPCS, npcTalk, nodeCount,
  newSave, ownedModules, run, SPAWN_X, STALL, storeSave, suggest, who, type Ctx, type Save,
} from './level';

/** What petting a scene's cat, or shooing its pigeon, gets you. */
const PET_CAT = [
  ['The cat allows it. Then it decides it did not, and leaves.'],
  ['The cat purrs, which is a lot of commitment from a street cat.'],
  ['The cat sniffs your hand, finds no fish, and looks betrayed.'],
];
const PET_PIGEON = [
  ['The pigeon takes one step to the side. Exactly one.'],
  ['The pigeon flaps, lands a metre away, and looks at you like you started it.'],
];

/**
 * Something to press E on: a way out (`exit`), the scene's life (`life`: a readable, a use, someone
 * to talk to, an animal, a robot), a device or the scene's own target on the engine (`device`),
 * Pixel (`pixel`), and Downtown's street people and the fixer (`talk`, level.ts).
 */
type Target = { kind: 'exit' | 'life' | 'device' | 'pixel' | 'talk'; id: string; x: number; h: number; label: string; promptH?: number };
/** A speech bubble; `then` runs once its last page is read (the fixer's question opens the deck). */
interface Bubble { name: string; pages: string[]; page: number; chars: number; x: number; h: number; then?: () => void }
interface Ship { sprite: Sprite; ps: number; y: number; speed: number; offset: number; flip: boolean; depth: number }

const O = '255,136,0', C = '0,255,255';
/** The door to the fixer's back yard, in the alley past the noodle stall (clear of the till and the man in the hat). */
const YARD_DOOR_X = DOORS.yard;
/** A tap on the canvas is E on a target this close to it (world units), within this reach of the player. */
const TAPPED = 18, TAP_REACH = 60;

/** Small seeded random, so the city looks the same on every visit. */
const rng = (seed: number) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

export interface GameHost {
  windowEl: HTMLElement;
  header: HTMLElement;
  footer: HTMLElement;
  inputHost: HTMLElement;
  onExit: () => void;
  setNodes: (n: number) => void;
  setScene: (text: string) => void;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private x: CanvasRenderingContext2D;
  private term: Terminal;
  private save: Save = SUDO ? unlockAll(loadSave()) : loadSave();
  private k = 2;
  private viewW = 640;
  private viewH = 320;
  private gy = 270;
  private cam = 0;
  private t = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private keys = new Set<string>();
  private p = { x: SPAWN_X, y: 0, vy: 0, face: 1, onGround: true, moving: false };
  private bubble: Bubble | null = null;
  private showEnd = false;
  private toast: { text: string; until: number } | null = null;
  private touch = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch { return false; } })();
  private ships: Ship[] = [];
  private windows = new Map<number, [number, number, number][]>();
  private drops: [number, number, number, number][] = [];
  private reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  /** The scene the player is in. */
  private here: SceneId = 'downtown';
  /** Every key and what it does, along the top. */
  private keyBar: KeyBar;
  /** Every scene on the engine, hosted the first time it is needed (`hostOf`), with its part of the save. */
  private hosts = new Map<SceneId, SceneHost>();
  /** Pixel the robot cat: at home in the flat, at your heels outside once you have left it (`flags.pixel`). */
  private pixel = new Companion();
  private started = false;
  /** Frames since the game started; runs even with reduced motion (rides and flights are timed on it). */
  private clock = 0;
  /** The city map overlay (citymap.ts), when open: just looking (TAB, the kiosk), or picking a taxi stand. */
  private mapView: MapView | null = null;
  /** A quick trip from the map in progress: a short fade out, the move, a fade in (HOP frames). */
  private hop: { place: MapPlace; start: number; done: boolean } | null = null;
  /** A sky-taxi flight in progress. */
  private flight: { to: Stand; start: number } | null = null;

  constructor(private host: GameHost) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: Downtown');
    this.canvas.hidden = true;
    host.windowEl.appendChild(this.canvas);
    this.x = this.canvas.getContext('2d')!;

    this.term = new Terminal(host.windowEl, host.inputHost, this.touch);
    if (this.touch) this.term.onLine = (text, kind) => { if (kind !== 'head') this.termLine = { text: text.split('\n').pop() ?? text, kind, until: this.t + 300 }; };
    this.term.onSubmit((line) => run(this.ctx(), line));
    this.term.onSuggest((line) => suggest(this.ctx(), line), NO_ARGS);
    this.term.onComplete((prefix) => {
      const [first, ...rest] = prefix.split(/\s+/);
      if (!rest.length) return commands(this.ctx()).filter((c) => c.startsWith(first.toLowerCase()));
      return [];
    });
    this.term.onClose = () => this.canvas.focus();

    this.keyBar = new KeyBar(host.windowEl, () => this.canvas.focus());
    // the fixer's parcel holds Moth's key chip and uplink.so: a save that took it before they were in it gets them now
    if (this.hostOf('yard').model.get('parcelAt') === 'taken') PARCEL.forEach((k) => { if (!this.save.keyring.includes(k)) this.save.keyring.push(k); });
    // Downtown keeps most of its progress in the save's own fields: its devices agree with them
    reconcile(this.downtown.model, this.save);
    this.menu = new Menu(host.windowEl, {
      save: () => this.save,
      scene: () => ({ id: this.here, name: sceneTitle(this.def) }),
      newGame: () => this.newGame(),
      quit: () => host.onExit(),
      onClose: () => this.canvas.focus(),
      ...(SUDO ? { levels, enter: (id: string) => this.enterLevel(id) } : {}),
    }, this.touch);
    this.canvas.addEventListener('pointerdown', (e) => this.onCanvasPointer(e, true));
    this.canvas.addEventListener('pointermove', (e) => this.onCanvasPointer(e, false));

    const r = rng(3);
    const hulls = [SPR.spinner, SPR.spinner, SPR.freighter, SPR.drone];
    for (let i = 0; i < 9; i++) {
      const depth = 0.15 + (i / 9) * 0.5;
      this.ships.push({ sprite: hulls[i % hulls.length], ps: depth > 0.45 ? 2 : 1, y: 18 + r() * 120, speed: 0.04 + depth * 0.12, offset: r() * 3000, flip: r() < 0.5, depth });
    }
    const rd = rng(11);
    this.drops = Array.from({ length: 220 }, () => [rd() * 2000, rd() * 600, 0.4 + rd() * 0.6, rd()]);

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  /**
   * A scene on the engine, with its part of the save (`save.scenes.<id>`) and the player's modules
   * and keyring: hosted the first time it is needed, then kept. Its HACK/BOARD strip joins the key bar.
   */
  private hostOf(id: SceneId): SceneHost {
    const had = this.hosts.get(id);
    if (had) return had;
    const def: SceneDef = SCENES[id];
    const print = def.buzz ? (text: string, kind?: LineKind) => this.buzzPrint(text, kind) : (text: string, kind?: LineKind) => this.term.print(text, kind);
    const rules = typeof def.rules === 'function' ? def.rules({
      save: () => this.save,
      persist: () => this.persist(),
      nodes: () => nodeCount(this.save),
      granted: () => sound.granted(),
      end: () => { this.showEnd = true; },
      // a story beat's cutscene (the stacks' ACT II card) waits for the screen to be free (`loop`)
      cutscene: (cut) => { this.pendingCut = cut; },
      // another scene's state: its live model if it is hosted, else its save
      sceneState: (scene, key) => this.hosts.get(scene as SceneId)?.model.get(key) ?? this.save.scenes[scene]?.state?.[key],
    }) : def.rules ?? NO_RULES;
    const zh = new SceneHost(this.host.windowEl, print, {
      modules: () => this.save.modules,
      keyring: () => this.save.keyring,
      give: (k) => { if (!this.save.keyring.includes(k)) this.save.keyring.push(k); storeSave(this.save); },
      // scene steps that hand out modules and tokens (GAME-DATA.md, "Giving things")
      grant: (mod) => { if (!this.save.modules.includes(mod)) this.save.modules.push(mod); storeSave(this.save); this.syncHud(); },
      tokens: (n) => { this.save.tokens += n; storeSave(this.save); this.syncHud(); return this.save.tokens; },
      // what you carry (the HUD's HELD) and story flags, for scene effects (the laundromat's jacket)
      carry: (item, n) => {
        const now = Math.max(0, (this.save.items[item] ?? 0) + n);
        if (now) this.save.items[item] = now; else delete this.save.items[item];
        if (n) { storeSave(this.save); this.syncHud(); }
        return now;
      },
      flag: (f) => { this.save.flags[f] = true; storeSave(this.save); },
      drop: () => storeSave(this.save),
      sudo: SUDO,
      load: () => this.save.scenes[id],
      store: (z) => { this.save.scenes[id] = z; storeSave(this.save); },
    }, def, rules);
    // Pixel is the game's, not the scene's: lines about Pixel stand over Pixel, and popups keep clear of the cat
    zh.where = (from) => (from === 'pixel' && this.pixelHere ? { x: this.pixel.x, h: this.pixel.h } : from === 'goal' && this.goalAt !== null ? { x: this.goalAt, h: 20 } : null);
    // the opening (opening.ts): hacking is not yours until uplink.so, and some everyday actions say something else
    zh.hackLock = () => hackLocked(this.save.flags);
    zh.story = (dev) => this.storyChips(id, dev);
    zh.extras = () => (this.pixelHere ? [{ x: this.pixel.x, h: this.pixel.h }] : []);
    // captions never cover the player's speech bubble, and keep their lane over people's heads
    zh.shield = () => { const b = this.bubbleBox, s = this.cssScale; return b ? [{ l: b.x * s, t: b.y * s, r: (b.x + b.w) * s, b: (b.y + b.h) * s }] : []; };
    zh.crowd = () => this.heads();
    // something reacted where you cannot see it: the camera may lean that way for a moment
    zh.onReact = (from, text, tone) => { if (this.here === id) this.nudgeTo(from, text, tone); };
    zh.onClose = () => this.canvas.focus();
    this.hosts.set(id, zh);
    // each scene host has its own HACK/BOARD strip, in the key bar; only the current scene's shows
    this.host.windowEl.querySelectorAll<HTMLElement>('#scene-btns').forEach((el) => this.keyBar.adopt(el));
    return zh;
  }

  /** A scene's lines in the deck that buzz (Downtown's ACCESS DENIED and friends), as the old terminal did. */
  private buzzPrint(text: string, kind?: LineKind) {
    this.term.print(text, kind);
    if (kind === 'err') sound.denied();
  }

  /** The scene the player is in: its definition, and its host on the engine. */
  private get def(): SceneDef { return SCENES[this.here]; }
  private get zh(): SceneHost { return this.hostOf(this.here); }
  /** Downtown's host: its goals follow the save's own fields. */
  private get downtown(): SceneHost { return this.hostOf('downtown'); }

  /** Write the save, refresh the HUD and Downtown's goals (they follow the save's fields). */
  private persist() {
    storeSave(this.save);
    this.syncHud();
    syncGoals(this.downtown.model, this.save);
  }

  // ---------- lifecycle ----------

  start(scene?: SceneId | CutsceneId) {
    this.canvas.hidden = false;
    this.canvas.tabIndex = 0;
    this.onResize();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
    this.syncHud();
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame((n) => this.loop(n));
    this.canvas.focus();
    if (scene && isCutsceneId(scene)) { this.playCutscene(scene); return; }
    // a save that has never been Downtown starts at home: a new one with the intro first
    const first = !this.started;
    this.started = true;
    // a save in the middle of the opening goes back to where it was (opening.ts)
    const resume = !scene && first ? openingResume(this.save.flags) : null;
    if (resume) scene = resume;
    else if (!scene && first && !this.save.flags.arrived && !this.save.flags[seenFlag('downtown')]) {
      // a first launch: the opening, on the train home
      if (!this.save.flags[seenFlag(START_SCENE)]) { this.startOpening(); return; }
      scene = START_SCENE;
    }
    if (scene && isSceneId(scene) && this.here !== scene) this.enter(scene, true);
    this.showHost();
    this.markSeen(this.here);
    this.greet();
  }

  /** First time in Downtown: the player says where they are (and, once, how its machines open now). */
  private greet() {
    // (before you are deleted, the street is not yet the one you have to fight)
    if (this.here !== 'downtown' || hackLocked(this.save.flags)) return;
    const how = this.touch
      ? 'Every machine here does something: tap it. HACK, top right, shows how they all work.'
      : 'Every machine here does something: E or a tap. H shows how they all work, B is the board.';
    if (!this.save.flags.arrived) {
      this.save.flags.arrived = true; this.save.flags.schematics = true;
      const pages = ['Downtown. Rain, neon, and nobody who sees me.', 'The noodle stall is still lit. Worth a try.', how];
      if (this.save.flags.pixel) pages.splice(1, 0, 'Pixel came along. Nobody asked Pixel. Nobody ever does.');
      this.say('YOU', pages, this.p.x, 46);
    } else if (!this.save.flags.schematics) {
      this.save.flags.schematics = true;
      this.say('YOU', ['My deck sees this street differently now.', how], this.p.x, 46);
    }
  }

  /** The HACK and BOARD buttons belong to the scene you are in. */
  private showHost() {
    const here = this.zh;
    this.hosts.forEach((h) => h.show(h === here));
  }

  stop() {
    document.documentElement.classList.remove('game-map');
    this.menu.hide();
    this.endCutscene(false);
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    this.keys.clear();
    this.mapView = null;
    this.hosts.forEach((h) => { h.closeAll(); h.persist(); });
    this.term.close();
    this.canvas.hidden = true;
    storeSave(this.save);
  }

  private onResize() {
    const win = this.host.windowEl.getBoundingClientRect();
    // a hidden header or footer (phones) takes no room
    const shown = (el: HTMLElement) => el.getClientRects().length > 0;
    const top = shown(this.host.header) ? this.host.header.getBoundingClientRect().bottom - win.top : 0;
    const bottom = shown(this.host.footer) ? win.bottom - this.host.footer.getBoundingClientRect().top : 0;
    this.host.windowEl.style.setProperty('--game-top', top + 'px');
    this.host.windowEl.style.setProperty('--game-bottom', bottom + 'px');
    const cssW = win.width, cssH = Math.max(120, win.height - top - bottom);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    // Small screens (phones in landscape) show a shorter slice of the street at a larger scale (tuned: leave as is).
    // Larger screens take the integer scale nearest to a view about 300 units tall (so 1280×720 draws at 2,
    // not 1, and people read), but never under 240 units, so wide places still show enough.
    const px = cssH * dpr, phone = cssH < 420;
    let k = phone ? Math.max(1, Math.floor(px / 230)) : Math.max(1, Math.round(px / 300));
    if (!phone && k > 1 && px / k < 240) k--;
    // A place narrower than the view (a flat, the yard) is shown closer, so it fills the width,
    // as long as enough height stays in view for its rooms and signs.
    const fit = Math.floor(this.canvas.width / (this.levelW + 24));
    if (fit > k) k = Math.max(k, Math.min(fit, Math.floor(this.canvas.height / 170)));
    this.k = k;
    this.fitW = this.levelW;
    this.viewW = this.canvas.width / this.k;
    this.viewH = this.canvas.height / this.k;
    // On phones the ground sits above the touch buttons, so the floor and what stands on it stay in view.
    const pad = document.getElementById('touch');
    const padTop = this.touch && pad ? Math.max(0, this.canvas.getBoundingClientRect().bottom - pad.getBoundingClientRect().top) : 0;
    this.gy = Math.round(this.viewH - Math.max(54, (padTop * dpr) / this.k + 8));
  }

  /** The level width the view was fitted to; a new place refits (see onResize). */
  private fitW = 0;
  /** How often the player has petted a scene's animals (which line comes next). */
  private petCount = 0;

  private loop(now: number) {
    if (!this.running) return;
    const dt = this.last ? Math.min(3, (now - this.last) / 16.67) : 1;
    this.last = now;
    // The pause menu: the world holds still under it (the last frame stays on the canvas).
    if (this.menu.open) { this.raf = requestAnimationFrame((n) => this.loop(n)); return; }
    this.save.playMs = (this.save.playMs ?? 0) + dt * 16.67;
    if (this.levelW !== this.fitW) this.onResize(); // a new place: fit the view to it
    // the city map (and a taxi flight) owns the screen: the key bar and touch buttons step aside (render.tsx)
    document.documentElement.classList.toggle('game-map', !!this.mapView || !!this.flight);
    this.keyBar.sync(this.save.jump);
    if (this.cut) { this.stepCutscene(dt); this.raf = requestAnimationFrame((n) => this.loop(n)); return; }
    // a story beat asked for a cutscene: it plays once nothing is open (the talk that asked for it has closed)
    if (this.pendingCut && !this.zh.overlayOpen && !this.zh.popupOpen && !this.bubble && !this.mapView && !this.term.focused) {
      const id = this.pendingCut;
      this.pendingCut = null;
      this.playCutscene(id, () => this.inbox());
    }
    if (!this.reduced || this.t < 1) this.t += dt;
    this.clock += dt;
    this.update(dt);
    this.draw();
    this.followHost();
    this.raf = requestAnimationFrame((n) => this.loop(n));
  }

  // ---------- input ----------

  private onKeyDown(e: KeyboardEvent) {
    if (this.cut) { e.preventDefault(); if (!e.repeat) this.cut.skip(); return; }
    if (this.menu.open) { if (!this.term.focused) this.menu.key(e); return; }
    if (this.term.focused) return;
    if (this.flight || this.hop) { e.preventDefault(); return; }
    if (this.mapView) { this.mapKey(e); return; }
    const zh = this.zh;
    if (zh && zh.overlayOpen) {
      if (e.key === 'Escape') { e.preventDefault(); zh.closeOverlay(); }
      else if (e.key === 'b' || e.key === 'B') zh.toggleBoard();
      else if ((e.key === 'h' || e.key === 'H') && !e.repeat) zh.toggleVision();
      return;
    }
    // a thing's popup takes arrows, Enter / E and Esc; any other key closes it and goes on as usual
    if (zh && zh.popupOpen && zh.popupKey(e)) return;
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
    if (e.repeat && !['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(k)) return;
    if (this.showEnd) {
      if (k === 'Escape') { this.showEnd = false; this.openMenu(); }
      else if (k === 'Enter' || k === 'e' || k === 'E') this.showEnd = false;
      return;
    }
    if (k === 'Escape') {
      if (this.bubble) { this.bubble = null; return; }
      if (zh && zh.visionOn) { zh.toggleVision(); return; }
      // Nothing left to close: the pause menu (QUIT TO HOMEPAGE leaves the game).
      this.openMenu();
      return;
    }
    // Enter opens the deck (the terminal)
    if (k === 'Enter') { e.preventDefault(); this.openDeck(); return; }
    // the deck's map app: the city as far as you know it
    if (k === 'Tab' || k === 'm' || k === 'M') { e.preventDefault(); this.showMap(); return; }
    // B and H mean something only where there is something to hack (a scene with devices)
    if (zh.hackable && (k === 'b' || k === 'B')) { zh.toggleBoard(); return; }
    if (zh.hackable && (k === 'h' || k === 'H')) { zh.toggleVision(); return; }
    if (k === 'e' || k === 'E') { this.interact(); return; }
    if ((k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') && !this.bubble) this.jump();
    this.keys.add(k.length === 1 ? k.toLowerCase() : k);
  }

  private onKeyUp(e: KeyboardEvent) {
    const k = e.key;
    this.keys.delete(k.length === 1 ? k.toLowerCase() : k);
    if (k === 'Shift') this.keys.delete('Shift');
  }

  private openDeck() {
    if (!this.term.out.childElementCount) this.term.print('[DECK] ' + who(this.save) + ' · type help', 'head');
    const at = hackLocked(this.save.flags) ? null : this.termMachine();
    if (at) this.term.print('[' + (this.zh.model.devices.get(at)?.name ?? at) + '] the deck talks to it · ls, cat, login, use', 'dim');
    this.term.focus();
  }

  /** The machine the deck talks to: the scene's device whose schematic is open, else the one you stand at. */
  private termMachine(): string | null {
    const zh = this.zh;
    if (zh.viewing) return zh.viewing;
    const t = this.nearest();
    return t?.kind === 'device' && zh.model.devices.has(t.id) ? t.id : null;
  }

  private jump() {
    if (!this.save.jump) { this.flash('[ERR] legs.so not found'); sound.denied(); return; }
    if (!this.p.onGround) return;
    this.p.vy = 4.6;
    this.p.onGround = false;
    sound.jump();
  }

  // ---------- pause menu (menu.ts) ----------

  private menu: Menu;

  /** Esc with nothing else open: pause and show the menu. Progress is written first. */
  private openMenu() {
    this.keys.clear();
    this.p.moving = false;
    this.zh.persist();
    storeSave(this.save);
    this.menu.show();
  }

  /** NEW GAME (confirmed in the menu): a fresh save, slots untouched, the intro, then the start scene. */
  private newGame() {
    this.term.close();
    this.term.clear();
    this.bubble = null;
    this.showEnd = false;
    this.toast = null;
    this.save = SUDO ? unlockAll(newSave()) : newSave();
    // every scene's runtime back to a first visit, written into the new save (Downtown then agrees with its fields)
    this.hosts.forEach((h) => h.reset());
    reconcile(this.downtown.model, this.save);
    storeSave(this.save);
    this.syncHud();
    // the opening: on the train home (the glide will come first)
    this.startOpening();
  }

  private flash(text: string) { this.toast = { text, until: this.t + 110 }; }
  /** Phones have no terminal: its latest line shows in the game for a few seconds. */
  private termLine: { text: string; kind: LineKind; until: number } | null = null;

  private get levelW() { return this.def.width; }
  /** The scene's name, for the HUD and the canvas label. */
  private get placeName() { return this.def.name; }
  private get platforms() { return this.def.platforms ?? []; }

  /**
   * Walk into a scene: at its exit `at` (the door you came through, seen from inside), else at its spawn.
   * Pixel comes along where it follows you, or is at home; the first visit has the player say a few words.
   */
  private enter(id: SceneId, quiet = false, at?: string) {
    const s: SceneDef = SCENES[id];
    this.zh.persist();
    this.hosts.forEach((h) => h.closeAll());
    this.bubble = null;
    this.here = id;
    this.nudge = null; this.easeBack = false; this.nudged.clear();
    this.hostOf(id);
    this.showHost();
    this.markSeen(id);
    const x = (at && s.exits.find((e) => e.id === at)?.x) || s.spawn;
    Object.assign(this.p, { x, y: 0, vy: 0, onGround: true, face: s.keepFace ? this.p.face : x > s.width / 2 ? -1 : 1 });
    this.cam = Math.max(0, Math.min(this.levelW - this.viewW, this.p.x - this.viewW * 0.45));
    if (this.levelW < this.viewW) this.cam = (this.levelW - this.viewW) / 2;
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + s.name);
    this.syncHud();
    if (!quiet) sound.open();
    // Pixel: at home (coming in behind you through the door, or already asleep there), at your heels where it follows you
    if (s.perch) {
      const home = s.perch(this.zh.model);
      if (at && this.save.flags.pixel) this.pixel.place(x - 14, 0, 'walk', 1);
      else this.pixel.place(home.x, home.h, home.rest);
    } else if (this.pixelHere) this.pixel.place(x - this.p.face * 20, 0, 'sit', this.p.face);
    // the opening: the train home runs into Downtown; arriving, the player says the opening's words instead
    const st = this.story, said = pick(OPENING_INTRO, st, id);
    if (id === 'train' && st === 'home') this.rideHome();
    const flag = 'scene:' + id, intro = typeof s.intro === 'function' ? s.intro(this.touch) : s.intro;
    if (said) {
      const once = 'opening:said:' + st + ':' + id;
      if (said.consume) this.save.flags[flag] = true;
      if (!this.save.flags[once]) { this.save.flags[once] = true; storeSave(this.save); this.say('YOU', said.lines(this.touch), this.p.x, 46); }
    } else if (intro && !this.save.flags[flag]) {
      this.save.flags[flag] = true;
      storeSave(this.save);
      this.say('YOU', intro, this.p.x, 46);
    }
    this.greet();
  }

  /** Tap or click a thing to open its popup (in hack vision: its verbs); hovering lights it up. A tap on the scene's life within reach is E on it. */
  private onCanvasPointer(e: PointerEvent, press: boolean) {
    if (this.cut) { if (press) { e.preventDefault(); this.cut.skip(); } return; }
    // a click or tap moves a speech bubble on, the same as E
    if (press && this.bubble) { e.preventDefault(); this.interact(); return; }
    if (this.mapView) { this.mapPointer(e, press); return; }
    const zh = this.zh;
    if (zh.overlayOpen || this.flight) return;
    const r = this.canvas.getBoundingClientRect();
    const wx = ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.k + this.cam;
    const h = this.gy - ((e.clientY - r.top) * (this.canvas.height / r.height)) / this.k;
    const id = zh.spotAt(wx, h);
    // (pink is the hacking layer's colour: no pink bracket on hover until hacking is yours)
    zh.hover = hackLocked(this.save.flags) ? null : id;
    this.canvas.style.cursor = id ? 'pointer' : '';
    if (press && zh.visionOn) { zh.poke(id); return; }
    // a thing's popup: its everyday actions, then jack in (computers) and hack it
    if (press && id) { e.preventDefault(); zh.pick(id); return; }
    // a tap on someone or something within reach is E on them
    if (press) this.tapLife(e);
  }

  /**
   * A tap on someone or something of the scene's life (a person, a use, a readable) within reach: E on it.
   * In a scene without devices, where a tap has nothing else to do, its ways out answer a tap too.
   */
  private tapLife(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect(), wx = ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.k + this.cam;
    const doors = !this.zh.model.devices.size;
    const t = this.targets().find((z) => (z.kind === 'life' || (doors && z.kind === 'exit')) && Math.abs(z.x - wx) < TAPPED && Math.abs(z.x - this.p.x) < TAP_REACH);
    if (t) { e.preventDefault(); this.useLife(t.id); }
  }

  /** Canvas world units (the view, after the pixel scale) → CSS px of the game view. */
  private get cssScale() { return (this.k * this.canvas.clientWidth) / (this.canvas.width || 1); }

  /** The heads of the people on screen (the scene's, Downtown's street people and the fixer), CSS px. */
  private heads() {
    const s = this.cssScale, list: { x: number; h: number }[] = [];
    for (const p of this.def.people ?? []) list.push({ x: characterX(p, this.t), h: characterHeight(p) });
    if (this.here === 'downtown') { NPCS.forEach((n) => list.push({ x: n.x, h: 46 })); list.push({ x: STALL.fixerX, h: 74 }); }
    return list.map(({ x, h }) => ({ l: (this.sx(x) - 9) * s, t: this.y(h) * s, r: (this.sx(x) + 9) * s, b: this.y(h - 14) * s }))
      .filter((b) => b.r > 0 && b.l < this.canvas.clientWidth);
  }

  /** Hack vision hangs in the world: give the scene this frame's world → CSS px mapping (as `sx` and `y` draw it). */
  private followHost() {
    const s = this.cssScale;
    const zh = this.zh;
    // captions and the popup keep under the key bar and the HUD's lines (drawHud: ~46 world units under the bar)
    zh.uiTop = this.keyBar.root.offsetHeight + 8 + this.hudH * s;
    zh.follow((wx, h) => ({ x: Math.round(wx - this.cam) * s, y: (this.gy - h) * s }), this.canvas.clientWidth, { x: this.p.x, h: this.p.y });
  }

  // ---------- world logic ----------

  private ctx(): Ctx {
    const zh = this.zh;
    return {
      save: this.save,
      machine: this.termMachine(),
      // the deck's commands reach the scene's machines, when it has any
      shell: zh.model.devices.size && !hackLocked(this.save.flags) ? sceneShell(zh, this.def.buzz ? (text, kind) => this.buzzPrint(text, kind) : (text, kind) => this.term.print(text, kind)) : null,
      print: (text, kind) => this.term.print(text, kind),
      denied: () => sound.denied(),
      granted: () => sound.granted(),
      toggleSound: () => sound.toggle(),
      clear: () => this.term.clear(),
      leaveMachine: () => this.term.close(),
      persist: () => this.persist(),
      resetYard: () => this.hostOf('yard').reset(),
      // your own deck, while you still exist
      deck: isBefore(this.save.flags) ? DECK_BEFORE : undefined,
    };
  }

  private syncHud() {
    this.host.setNodes(nodeCount(this.save));
    this.host.setScene(sceneTitle(this.def) + this.clockText + ' · ' + this.me.toUpperCase());
  }

  /**
   * Everything to press E on here, in one list for every scene: its ways out, Downtown's street
   * people, the devices and the scene's own targets on the engine, the scene's life, and Pixel.
   */
  private targets(): Target[] {
    const s = this.def, list: Target[] = [...this.exitTargets(s)];
    if (this.here === 'downtown') list.push(...this.streetTargets());
    // a device is reached from the ground, or from the ledge under it (the relay, from the low roof)
    const stand = (x: number, y = 0) => Math.max(0, ...this.platforms.filter((p) => x > p.x && x < p.x + p.w && p.h <= y).map((p) => p.h));
    for (const t of this.zh.targets()) if (!s.hideDevice?.(t.id, this.save.flags)) list.push({ kind: 'device', id: t.id, x: t.x, h: stand(t.x, t.y), label: t.label, promptH: t.promptH });
    list.push(...this.lifeTargets(s));
    // the opening's own things to press E on (the bed)
    for (const [key, t] of Object.entries(OPENING_TARGETS[this.story] ?? {})) {
      const [scene, id] = key.split('/');
      if (scene === this.here) list.push({ kind: 'life', id: 'story:' + id, x: t.x, h: 0, label: t.label, promptH: t.promptH });
    }
    // Pixel can always be petted, wherever it is with you
    if (this.pixelHere) list.push({ kind: 'pixel', id: 'pixel', x: this.pixel.x, h: 0, label: '[E] PET PIXEL', promptH: this.pixel.h + 24 });
    return list;
  }

  /** Downtown's people on the street and the fixer at his stall (level.ts says what they say). */
  private streetTargets(): Target[] {
    const list: Target[] = NPCS.map((n) => ({ kind: 'talk' as const, id: n.id, x: n.x, h: 0, label: '[E] TALK' }));
    list.push({ kind: 'talk', id: 'fixer', x: STALL.fixerX, h: 0, label: '[E] TALK' });
    return list;
  }

  private nearest(): Target | null {
    let best: Target | null = null, bd = 26;
    for (const t of this.targets()) {
      if (Math.abs(this.p.y - t.h) > 8) continue;
      const d = Math.abs(this.p.x - t.x);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  private say(name: string, pages: string[], x: number, h: number) {
    this.bubble = { name, pages, page: 0, chars: 0, x, h };
  }

  private interact() {
    const b = this.bubble;
    if (b) {
      const full = b.pages[b.page].length;
      if (b.chars < full) { b.chars = full; return; }
      if (b.page < b.pages.length - 1) { b.page++; b.chars = 0; return; }
      this.bubble = null;
      b.then?.();
      return;
    }
    const target = this.nearest();
    if (!target) return;
    if (target.kind === 'exit' || target.kind === 'life') { this.useLife(target.id); return; }
    // a device opens its popup; the scene's own target may be a way out (its code returns the exit)
    if (target.kind === 'device') {
      // the opening: a scene's own way out (the flat's door) may say something else in this state
      const rule = pick(OPENING_EXITS, this.story, this.here, target.id);
      if (rule && this.storyExit(rule, target.x, () => {})) return;
    }
    if (target.kind === 'device') { const out = this.zh.use(target.id), e = out ? this.def.exits.find((z) => z.id === out) : undefined; if (e) this.useExit(e); return; }
    if (target.kind === 'pixel') { sound.blip(); this.say('PIXEL', this.pixel.pet(), this.pixel.x, this.pixel.h + 14); return; }
    if (target.kind === 'talk') {
      // before you are deleted, the street talks to you differently (opening.ts)
      const o = pick(OPENING_LINES, this.story, 'downtown', target.id);
      if (o) { const npc = NPCS.find((n) => n.id === target.id); this.say(o.name ?? 'YOU', o.pages, npc?.x ?? STALL.fixerX, npc ? 48 : 30); return; }
      if (target.id === 'fixer') {
        const talk = fixerTalk(this.save);
        this.persist();
        this.say('FIXER', talk.pages, STALL.fixerX, 30);
        // "Got a name, ghost?": the deck opens with the question half typed (the keyboard is right here)
        if (talk.ask && this.bubble) { const ask = talk.ask; this.bubble.then = () => this.term.prefill(ask); }
      } else {
        const npc = NPCS.find((n) => n.id === target.id)!;
        this.say(npc.id === 'hood' ? 'HOODED STRANGER' : npc.id === 'umbrella' ? 'UMBRELLA' : 'MAN IN A HAT', npcTalk(npc.id, this.save), npc.x, 48);
      }
    }
  }

  private update(dt: number) {
    const p = this.p, b = this.bubble;
    if (b && b.chars < b.pages[b.page].length) {
      const before = Math.floor(b.chars);
      b.chars = Math.min(b.pages[b.page].length, b.chars + 1.2 * dt);
      if (Math.floor(b.chars) !== before && Math.floor(b.chars) % 2 === 0) sound.blip();
    }
    this.updateTravel(dt);
    this.updateStory();
    const locked = this.showEnd || this.term.focused || !!this.zh.overlayOpen || !!this.mapView || !!this.flight || !!this.hop || !!this.beat || !!this.sleep;
    const left = !locked && (this.keys.has('ArrowLeft') || this.keys.has('a'));
    const right = !locked && (this.keys.has('ArrowRight') || this.keys.has('d'));
    const speed = this.keys.has('Shift') ? 2.3 : 1.3;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir) { p.face = dir; if (this.bubble && Math.abs(p.x - this.bubble.x) > 140) this.bubble = null; }
    p.moving = !!dir;
    p.x = Math.max(12, Math.min(this.levelW - 12, p.x + dir * speed * dt));
    // Walking into an open border (the yard's passage, a street's end) leaves without E.
    if (dir < 0 && p.x <= 12) this.walkOff('left');
    else if (dir > 0 && p.x >= this.levelW - 12) this.walkOff('right');

    // Vertical: gravity, platforms and the street.
    const prevY = p.y;
    if (!p.onGround) {
      p.y += p.vy * dt;
      p.vy -= 0.22 * dt;
      for (const pl of this.platforms) {
        if (p.vy <= 0 && prevY >= pl.h && p.y <= pl.h && p.x > pl.x + 2 && p.x < pl.x + pl.w - 2) { p.y = pl.h; p.vy = 0; p.onGround = true; }
      }
      if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; }
    } else if (p.y > 0 && !this.platforms.some((pl) => pl.h === p.y && p.x > pl.x + 2 && p.x < pl.x + pl.w - 2)) {
      p.onGround = false; p.vy = 0;
    }

    // Camera follows, eased, clamped to the level. A nudge leans it towards something that reacted
    // off the view for a moment (walking, talking or the deck cancel it), then it eases back.
    const n = this.nudge;
    if (n && (p.moving || !p.onGround || this.bubble || this.term.focused || this.zh.overlayOpen || Math.abs(p.x - n.px) > 2)) { this.nudge = null; this.easeBack = !p.moving; }
    const follow = Math.max(0, Math.min(this.levelW - this.viewW, p.x - this.viewW * 0.45));
    const nudging = !!this.nudge && this.clock < this.nudge!.until;
    if (this.nudge && !nudging) { this.nudge = null; this.easeBack = true; }
    const goal = nudging ? this.nudge!.goal : follow;
    // gentle while leaning out and coming back; the usual follow otherwise (a step turns it off)
    if (p.moving || Math.abs(goal - this.cam) < 0.5) this.easeBack = false;
    this.cam += (goal - this.cam) * Math.min(1, (nudging || this.easeBack ? NUDGE_EASE : 0.12) * dt);
    if (this.levelW < this.viewW) this.cam = (this.levelW - this.viewW) / 2;
    if (this.pixelHere) this.pixel.update(dt, { px: p.x, face: p.face, moving: p.moving, perch: this.def.perch?.(this.zh.model) ?? null, warm: WARM[this.here] });
    this.host.setNodes(nodeCount(this.save));
    // the opening's idle ping: standing still a while, the next goal's target pings (opening.ts)
    const aim = pick(OPENING_PINGS, this.story, this.here);
    if (!aim || locked || p.moving || !p.onGround || this.bubble || this.zh.popupOpen) this.still = this.clock;
    else if (this.clock - this.still > IDLE_PING) { this.still = this.clock; this.pingGoal(aim); }
  }

  /** Pixel is drawn at home (the flat), and where it follows you (`pixel: 'along'`) once it does (`flags.pixel`). */
  private get pixelHere() { const s = this.def; return s.pixel === 'home' || (!!this.save.flags.pixel && s.pixel === 'along'); }

  // ---------- drawing ----------

  private sx(worldX: number, parallax = 1) { return Math.round(worldX - this.cam * parallax); }
  private y(h: number) { return this.gy - h; }

  /**
   * One frame, the same way for every scene: the engine's sky and Downtown's street walls where
   * the scene has them (`ambient`), the scene's own drawing, the player and Pixel, the scene's
   * foreground, rain, then prompts, bubbles and the HUD. Hack vision mutes the world: a scene
   * that draws in two passes (`layers`) gets its devices drawn bright over the muted world; any
   * other keeps holes round its devices' frames (none: everything is muted). The player stays bright.
   */
  private draw() {
    const x = this.x, k = this.k, s = this.def, zh = this.zh, amb = s.ambient ?? {};
    x.setTransform(k, 0, 0, k, 0, 0);
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#000';
    x.fillRect(0, 0, this.viewW, this.viewH);
    const rain = this.rainLevel();
    if (this.flight) { drawFlight(x, this.viewW, this.viewH, Math.min(1, (this.clock - this.flight.start) / FLIGHT), this.clock, STANDS[this.flight.to].name); return; }
    const vision = zh.visionOn, v = this.view();
    if (amb.sky) { this.drawSky(); if (isBefore(this.save.flags)) this.drawDawn(); this.drawShips(); }
    if (amb.city) {
      this.drawSkyline(0.18, 7, 70, 150, 0.18, 0.12);
      this.drawAntenna();
      this.drawSkyline(0.45, 19, 50, 120, 0.3, 0.18);
      this.drawFronts();
    }
    if (amb.street) this.drawStreet(rain, !!amb.city);
    if (vision && s.layers) {
      // the world (rain too) goes muted into the background; the devices and you stay bright on top
      zh.draw(x, v, 'world');
      if (amb.rain) this.drawRain(rain);
      this.mute();
      zh.draw(x, v, 'devices');
    } else {
      zh.draw(x, v);
      if (vision) { if (amb.rain) this.drawRain(rain); this.mute(zh.model.spots()); }
    }
    this.drawLight();
    this.drawCharacters();
    s.drawFront?.(x, v);
    if (amb.rain && !vision) this.drawRain(rain);
    this.drawPrompt();
    this.drawBubble();
    this.drawHud();
    if (this.showEnd) this.drawEnd();
    this.drawBeat();
    this.drawSleep();
    this.drawMap();
  }

  private rainLevel() {
    // dawn, before you are deleted: the rain is late today
    if (isBefore(this.save.flags)) return 0;
    // Weather passes through: a drizzle builds to a shower and clears, about every 80 seconds.
    const phase = (this.t / 4800) % 1;
    return Math.max(0, Math.sin(phase * Math.PI * 2)) ** 1.5;
  }

  private drawSky() {
    const x = this.x, r = rng(5);
    for (let i = 0; i < 70; i++) {
      const sx = ((r() * 2400 - this.cam * 0.05) % 2400 + 2400) % 2400;
      if (sx > this.viewW) { r(); continue; }
      x.fillStyle = 'rgba(255,217,165,' + (0.15 + r() * 0.35) + ')';
      x.fillRect(sx, r() * (this.gy - 200), 1, 1);
    }
  }

  private drawShips() {
    const span = this.viewW + 260;
    for (const s of this.ships) {
      const px = ((s.offset + this.t * s.speed * (s.flip ? -1 : 1) - this.cam * s.depth) % span + span) % span - 130;
      const glow = s.sprite === SPR.drone ? 'rgba(255,42,68,.5)' : 'rgba(0,255,255,.3)';
      drawSprite(this.x, s.sprite, px, s.y + 10, { ps: s.ps, flip: s.flip, pal: HULL, glow });
      if (s.sprite === SPR.drone && s.ps > 1) {
        const beam = this.x.createLinearGradient(0, s.y + 10, 0, s.y + 90);
        beam.addColorStop(0, 'rgba(255,230,140,.16)');
        beam.addColorStop(1, 'rgba(255,230,140,0)');
        this.x.fillStyle = beam;
        this.x.beginPath(); this.x.moveTo(px - 2, s.y + 10); this.x.lineTo(px - 26, s.y + 90); this.x.lineTo(px + 26, s.y + 90); this.x.lineTo(px + 2, s.y + 10); this.x.closePath(); this.x.fill();
      }
    }
  }

  private drawSkyline(parallax: number, seed: number, hMin: number, hMax: number, alpha: number, win: number) {
    const x = this.x, r = rng(seed), base = this.gy - 4, width = LEVEL_W * parallax + this.viewW + 40;
    for (let wx = -20; wx < width;) {
      const w = 14 + r() * 26, h = hMin + r() * (hMax - hMin), sx = Math.round(wx - this.cam * parallax);
      const lit: number[] = []; for (let i = 0; i < 24; i++) lit.push(r());
      if (sx + w > 0 && sx < this.viewW) {
        x.fillStyle = '#040200'; x.fillRect(sx, base - h, w, h);
        x.strokeStyle = 'rgba(194,65,12,' + alpha + ')'; x.lineWidth = 1; x.strokeRect(sx + 0.5, base - h + 0.5, w - 1, h);
        let i = 0;
        for (let yy = base - h + 5; yy < base - 4; yy += 6) for (let xx = sx + 3; xx < sx + w - 3; xx += 5) {
          if (lit[i++ % 24] < win) { x.fillStyle = 'rgba(255,136,0,' + (0.18 + alpha) + ')'; x.fillRect(xx, yy, 2, 2); }
        }
      }
      wx += w + 2;
    }
  }

  private drawAntenna() {
    const x = this.x, bx = this.sx(1600, 0.8), top = 8, base = this.gy - 4;
    if (bx < -60 || bx > this.viewW + 60) return;
    x.strokeStyle = 'rgba(194,65,12,.85)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(bx - 22, base); x.lineTo(bx, top); x.lineTo(bx + 22, base); x.stroke();
    for (let i = 1; i < 18; i++) {
      const y1 = base - ((base - top) * (i - 1)) / 18, y2 = base - ((base - top) * i) / 18, w1 = 22 * (1 - (i - 1) / 18), w2 = 22 * (1 - i / 18);
      x.beginPath(); x.moveTo(bx - w1, y1); x.lineTo(bx + w2, y2); x.moveTo(bx + w1, y1); x.lineTo(bx - w2, y2); x.stroke();
    }
    [0, 0.33, 0.66].forEach((f, i) => {
      x.fillStyle = Math.sin(this.t * 0.06 + i) > 0 ? 'rgba(255,42,68,1)' : 'rgba(255,42,68,.25)';
      x.fillRect(bx - 2, top + (base - top) * f, 4, 4);
    });
  }

  /**
   * Windows of front i, one per bay and storey, seeded so the street looks the
   * same on every visit: [x offset of the centre, storey, light]. light < 0 is a
   * dark room, 0..1 a lit one, >= 1 a TV flickering (the value is its phase).
   */
  private winsFor(i: number, w: number, storeys: number) {
    let list = this.windows.get(i);
    if (!list) {
      const r = rng(100 + i); list = [];
      const n = Math.max(1, Math.floor((w - 8) / WIN_PITCH)), m = (w - n * WIN_PITCH) / 2;
      for (let s = 0; s < storeys; s++) for (let c = 0; c < n; c++) {
        const v = r();
        list.push([Math.round(m + WIN_PITCH * (c + 0.5)), s, v < 0.45 ? -1 : v < 0.93 ? r() : 1 + r() * 7]);
      }
      this.windows.set(i, list);
    }
    return list;
  }

  private neon(text: string, cx: number, cy: number, col: string, opt: { size?: number; vertical?: boolean; dead?: number; phase?: number } = {}) {
    const x = this.x, size = opt.size ?? 11, dead = opt.dead ?? -1;
    const flick = (this.t + (opt.phase ?? 0)) % 240 > 232 && Math.floor(this.t) % 4 < 2;
    x.save();
    x.font = '600 ' + size + 'px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    [...text].forEach((ch, i) => {
      const off = flick || i === dead;
      x.fillStyle = 'rgba(' + col + ',' + (off ? 0.13 : 0.95) + ')';
      x.shadowColor = 'rgba(' + col + ',.9)'; x.shadowBlur = off ? 0 : 8;
      if (opt.vertical) x.fillText(ch, cx, cy + i * (size + 2));
      else x.fillText(ch, cx + (i - (text.length - 1) / 2) * size * 0.64, cy);
    });
    x.restore();
  }

  private drawFronts() {
    const x = this.x;
    FRONTS.forEach((f, i) => {
      const sx = this.sx(f.x);
      if (sx + f.w + 4 < 0 || sx - 4 > this.viewW) return;
      this.drawFront(f, i, sx);
    });
    // Penthouse window, out of reach until the grapple: the one lit room on the tower's top floor.
    const tx = this.sx(1340);
    x.fillStyle = 'rgba(0,255,255,' + (0.5 + 0.3 * Math.sin(this.t * 0.02)) + ')'; x.fillRect(tx - 6, this.y(251), 12, 26);
    x.fillStyle = 'rgba(0,60,60,.7)'; x.fillRect(tx - 6, this.y(240), 12, 1);
    this.plate(tx, this.y(196), 56, 12, O);
    this.neon('PENTHOUSE', tx, this.y(196), O, { size: 8, phase: 40 });
    // Signs, each on a plate bolted to the wall. (The VERIFY sign over the junction box is a device: downtown/scene.ts.)
    this.plate(this.sx(90), this.y(100), 96, 15, C);
    this.neon('< NEON MARKET', this.sx(90), this.y(100), C, { size: 10, phase: 120 });
    this.plate(this.sx(1770), this.y(110), 82, 15, O);
    this.neon('SPACEPORT >', this.sx(1770), this.y(110), O, { size: 10, phase: 70 });
    this.plate(this.sx(905), this.y(104), 88, 13, O);
    this.neon('OPEN 24/7', this.sx(905), this.y(104), O, { size: 8, phase: 160 });
    // Billboard, bolted flat to the wall and lit by two lamps on arms above it.
    const bx = this.sx(640);
    this.plate(bx, this.y(128), 124, 36, '255,90,110');
    const wash = x.createLinearGradient(0, this.y(146), 0, this.y(124));
    wash.addColorStop(0, 'rgba(255,220,170,.12)'); wash.addColorStop(1, 'rgba(255,220,170,0)');
    x.fillStyle = wash; x.fillRect(bx - 61, this.y(146) + 1, 122, 22);
    x.strokeStyle = 'rgba(255,90,110,.75)'; x.strokeRect(bx - 61.5, this.y(146) + 0.5, 123, 35);
    for (const lx of [bx - 36, bx + 36]) {
      x.fillStyle = 'rgba(194,65,12,.8)'; x.fillRect(lx, this.y(156), 1, 10); x.fillRect(lx - 4, this.y(156), 9, 2);
      x.fillStyle = 'rgba(255,220,170,.85)'; x.fillRect(lx - 3, this.y(154), 7, 1);
    }
    this.neon('REGISTRY PREMIUM', bx, this.y(134), '255,90,110', { size: 9, phase: 10 });
    x.save(); x.font = '8px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,217,165,.6)'; x.fillText('be seen everywhere', bx, this.y(118)); x.restore();
    this.drawStall();
    // Fence at the antenna's foot.
    const fx = this.sx(1540);
    x.strokeStyle = 'rgba(255,136,0,.45)';
    for (let i = 0; i <= 12; i++) { x.beginPath(); x.moveTo(fx + i * 10 + 0.5, this.gy); x.lineTo(fx + i * 10 + 0.5, this.y(44)); x.stroke(); }
    x.beginPath(); x.moveTo(fx, this.y(44) + 0.5); x.lineTo(fx + 120, this.y(44) + 0.5); x.stroke();
    this.drawAlley();
    // Dumpster below the low roof, in the alley's mouth.
    const dx = this.sx(1000);
    x.fillStyle = '#10140f'; x.fillRect(dx, this.y(22), 40, 22); x.strokeStyle = 'rgba(120,160,120,.5)'; x.strokeRect(dx + 0.5, this.y(22) + 0.5, 39, 21);
    this.drawDoors();
  }

  /**
   * The alley to the fixer's back yard (950–1040): a passage between the stall's
   * building and the annex, running back to the yard's open gate. It is the
   * brightest thing in this stretch of street on purpose: the yard's lamp lights
   * it from behind, the light spills onto the pavement, bulbs hang across it and
   * a blade sign sticks out from the corner, so the eye finds the way in.
   */
  private drawAlley() {
    const x = this.x, a0 = this.sx(950), a1 = this.sx(1040), c = this.sx(YARD_DOOR_X), P = '255,61,242';
    if (a1 + 20 < 0 || a0 - 40 > this.viewW) return;
    const b0 = a0 + 18, b1 = a1 - 18, far = this.y(12), farTop = this.y(96);
    const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
      x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.fillStyle = fill; x.fill();
    };

    // over the annex and above the far end: the backs of the houses across the yard (middle band, dim)
    x.fillStyle = '#0a0503'; x.fillRect(a0, this.y(170), a1 - a0, this.y(62) - this.y(170));
    x.strokeStyle = 'rgba(194,65,12,.22)'; x.lineWidth = 1; x.strokeRect(a0 + 0.5, this.y(170) + 0.5, a1 - a0 - 1, this.y(62) - this.y(170));
    for (const [wx, wh, lit] of [[982, 150, 1], [1004, 150, 0], [1024, 150, 1], [982, 124, 0], [1004, 124, 1], [1024, 124, 0]] as const) {
      x.fillStyle = lit ? 'rgba(255,136,0,.2)' : '#030100'; x.fillRect(this.sx(wx), this.y(wh), 8, 12);
    }

    // the yard beyond the far opening, bright under its lamp
    x.fillStyle = '#140904'; x.fillRect(b0, farTop, b1 - b0, far - farTop);
    const glow = x.createRadialGradient((b0 + b1) / 2, this.y(54), 3, (b0 + b1) / 2, this.y(40), 60);
    glow.addColorStop(0, 'rgba(255,180,100,.6)'); glow.addColorStop(1, 'rgba(255,180,100,0)');
    x.fillStyle = glow; x.fillRect(b0, farTop, b1 - b0, far - farTop);
    x.fillStyle = 'rgba(255,230,170,1)'; x.fillRect((b0 + b1) / 2 - 2, this.y(80), 4, 2);
    for (const [ox, w, h] of [[3, 12, 10], [16, 9, 7], [36, 11, 9]] as const) {
      x.fillStyle = '#4a2a0c'; x.fillRect(b0 + ox, far - h, w, h);
      x.strokeStyle = 'rgba(232,160,80,.95)'; x.strokeRect(b0 + ox + 0.5, far - h + 0.5, w - 1, h - 1);
    }

    // the crane: its gantry over the far end and the annex, a leg into the yard, the hook on its cable
    const k0 = b0 + 3, k1 = this.sx(1034);
    x.fillStyle = '#3a1c08'; x.fillRect(k0, this.y(118), k1 - k0, 4); x.fillRect(k0, this.y(114), 3, 102); x.fillRect(k1 - 4, this.y(114), 3, 52);
    x.fillStyle = 'rgba(255,136,0,.75)'; x.fillRect(k0, this.y(118), k1 - k0, 1); x.fillRect(k0, this.y(114), 1, 102); x.fillRect(k1 - 4, this.y(114), 1, 52);
    x.fillStyle = '#ff8800'; x.fillRect(this.sx(1006), this.y(114), 9, 3);
    x.fillStyle = 'rgba(201,168,127,.85)'; x.fillRect(this.sx(1010), this.y(111), 1, 26);

    // the yard's fence across the far opening, the gate swung wide open towards you
    x.fillStyle = 'rgba(255,136,0,.85)'; x.fillRect(b0, farTop + 30, 1, far - farTop - 30); x.fillRect(b1 - 1, farTop + 30, 1, far - farTop - 30);
    poly([[b1 - 1, farTop + 34], [b1 + 9, farTop + 26], [b1 + 9, far + 5], [b1 - 1, far]], 'rgba(255,136,0,.16)');
    x.strokeStyle = 'rgba(255,136,0,.8)'; x.beginPath(); x.moveTo(b1 - 1, farTop + 34); x.lineTo(b1 + 9, farTop + 26); x.lineTo(b1 + 9, far + 5); x.stroke();

    // the passage's walls, receding: the stall building's side (tall) and the annex's side (low)
    poly([[a0, this.y(190)], [b0, this.y(190)], [b0, far], [a0, this.y(0)]], '#070302');
    poly([[a1, this.y(62)], [b1, this.y(58)], [b1, far], [a1, this.y(0)]], '#0a0402');
    x.fillStyle = 'rgba(194,65,12,.5)'; x.fillRect(a0 + 6, this.y(180), 2, 176);
    x.strokeStyle = 'rgba(255,136,0,.6)';
    x.beginPath(); x.moveTo(a0 + 0.5, this.y(0)); x.lineTo(b0 + 0.5, far); x.moveTo(a1 - 0.5, this.y(0)); x.lineTo(b1 - 0.5, far); x.moveTo(a1 - 0.5, this.y(62)); x.lineTo(b1 - 0.5, this.y(58)); x.stroke();

    // the floor: wet, the yard's light running down it and out across the pavement
    poly([[a0, this.y(0)], [a1, this.y(0)], [b1, far], [b0, far]], '#0c0603');
    const spill = x.createLinearGradient(0, far, 0, this.y(-16));
    spill.addColorStop(0, 'rgba(255,180,100,.45)'); spill.addColorStop(1, 'rgba(255,180,100,0)');
    poly([[b0 + 2, far], [b1 - 2, far], [a1 + 10, this.y(-16)], [a0 - 10, this.y(-16)]], spill);
    x.fillStyle = 'rgba(255,217,165,.4)'; x.fillRect(c - 8, this.y(3), 14, 1); x.fillRect(c + 10, this.y(6), 8, 1);

    // a string of bulbs across the passage, sagging between the two walls
    x.strokeStyle = 'rgba(120,70,30,.9)'; x.beginPath(); x.moveTo(a0, this.y(92));
    x.quadraticCurveTo((a0 + a1) / 2, this.y(78), a1, this.y(64)); x.stroke();
    for (let i = 1; i < 7; i++) {
      const t = i / 7, bx = a0 + (a1 - a0) * t, by = (1 - t) * (1 - t) * this.y(92) + 2 * (1 - t) * t * this.y(78) + t * t * this.y(64);
      x.fillStyle = (Math.floor(this.t / 40) + i) % 9 ? 'rgba(255,214,140,.95)' : 'rgba(255,214,140,.3)';
      x.fillRect(bx - 1, by + 1, 2, 2);
    }

    // the blade sign: sticks out from the corner on a bracket, readable from down the street
    const sx0 = a0 - 1;
    x.fillStyle = '#2a160a'; x.fillRect(sx0, this.y(148), 14, 2); x.fillRect(sx0, this.y(110), 14, 2);
    this.plate(sx0 + 14, this.y(129), 13, 42, P);
    this.neon('YARD', sx0 + 14, this.y(141), P, { size: 8, phase: 90, vertical: true });
  }



  /**
   * Downtown's other doors, on fronts already drawn: the corner shop's door gets
   * its plate (cyan: you can go in), your building's lobby its name and a green
   * LED (the lift up to your flat works).
   */
  private drawDoors() {
    const x = this.x, sh = this.sx(DOORS.shop), cp = this.sx(DOORS.capsule), t = this.t;
    if (sh > -40 && sh < this.viewW + 40) {
      this.plate(sh, this.y(70), 34, 11, C);
      this.neon('SHOP', sh, this.y(70), C, { size: 8, phase: 30 });
      // a paper sticker on the door's glass, and the cyan handle
      x.fillStyle = 'rgba(255,217,165,.5)'; x.fillRect(sh - 6, this.y(40), 12, 5);
      x.fillStyle = Math.sin(t * 0.05) > -0.3 ? 'rgba(0,255,255,.95)' : 'rgba(0,255,255,.3)'; x.fillRect(sh + 7, this.y(30), 2, 4);
    }
    if (cp > -40 && cp < this.viewW + 40) {
      this.plate(cp, this.y(70), 48, 11, O);
      x.save(); x.font = '600 7px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(255,217,165,.85)'; x.fillText('CAPSULES', cp, this.y(70) + 0.5); x.restore();
      x.fillStyle = Math.floor(t / 60) % 2 ? 'rgba(34,197,94,.95)' : 'rgba(34,197,94,.5)';
      x.fillRect(cp + 14, this.y(34), 3, 3);
    }
    // Moth's building: the residents' door, its plate, and the key-chip reader beside it (cyan: it can be used)
    const mo = this.sx(DOORS.moth);
    if (mo > -40 && mo < this.viewW + 40) {
      this.plate(mo + 4, this.y(64), 44, 11, O);
      x.save(); x.font = '600 7px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(255,217,165,.85)'; x.fillText('RESIDENTS', mo + 4, this.y(64) + 0.5); x.restore();
      x.fillStyle = '#0d1416'; x.fillRect(mo + 14, this.y(40), 6, 9);
      x.strokeStyle = 'rgba(0,255,255,.6)'; x.strokeRect(mo + 14.5, this.y(40) + 0.5, 5, 8);
      x.fillStyle = Math.sin(t * 0.05) > -0.3 ? 'rgba(0,255,255,.95)' : 'rgba(0,255,255,.3)'; x.fillRect(mo + 16, this.y(37), 2, 2);
    }
  }

  /**
   * One street wall (the middle band: calmer than the street in front of it).
   * A ground floor at the player's scale, storeys of windows above, and a
   * cornice only where the view reaches the roofline.
   */
  private drawFront(f: (typeof FRONTS)[number], i: number, sx: number) {
    const x = this.x, hv = Math.min(f.h, this.gy + 1), top = this.y(hv);
    x.fillStyle = '#0a0503'; x.fillRect(sx, top, f.w, hv);
    if (f.roof) {
      // The climbable annex: one storey, with a bright roof edge so it reads as somewhere to stand.
      x.strokeStyle = 'rgba(255,136,0,.75)'; x.lineWidth = 1; x.strokeRect(sx + 0.5, top + 0.5, f.w - 1, hv);
      x.fillStyle = 'rgba(255,136,0,.8)'; x.fillRect(sx, top, f.w, 2);
    } else {
      x.strokeStyle = 'rgba(194,65,12,.45)'; x.lineWidth = 1; x.strokeRect(sx + 0.5, top + 0.5, f.w - 1, hv);
      const storeys = Math.floor((f.h - GROUND) / STOREY);
      x.fillStyle = 'rgba(194,65,12,.22)';
      for (let s = 0; s < storeys; s++) { const h = GROUND + s * STOREY; if (h < hv) x.fillRect(sx + 1, this.y(h) - 1, f.w - 2, 2); }
      for (const [wx, s, light] of this.winsFor(i, f.w, storeys)) {
        const h0 = GROUND + s * STOREY + 16;
        if (h0 > this.gy || onSignWall(f.x + wx - 7, f.x + wx + 7, h0, h0 + 28)) continue;
        this.drawWindow(sx + wx - 7, this.y(h0 + 28), light, (wx + s * 7 + i * 3) % 6 === 0);
      }
      if (f.h <= this.gy) {
        x.fillStyle = '#140a05'; x.fillRect(sx - 2, top, f.w + 4, 4);
        x.fillStyle = 'rgba(194,65,12,.5)'; x.fillRect(sx - 2, top, f.w + 4, 1);
      }
      // Shop fascia over the ground floor.
      x.fillStyle = '#100804'; x.fillRect(sx + 1, this.y(GROUND) + 1, f.w - 2, 11);
      x.fillStyle = 'rgba(194,65,12,.35)'; x.fillRect(sx + 1, this.y(GROUND - 12), f.w - 2, 1);
    }
    for (const [dx, w, kind] of f.bays ?? []) this.drawBay(sx + dx, w, kind);
  }

  /** A storey window (14×28, a bit shorter than the player): a dark room, a warm lit one (some behind blinds) or a TV's cold flicker. */
  private drawWindow(wx: number, wy: number, light: number, ac: boolean) {
    const x = this.x;
    x.fillStyle = '#040201'; x.fillRect(wx, wy, 14, 28);
    if (light >= 1) {
      x.fillStyle = 'rgba(150,170,220,' + (0.1 + 0.06 * Math.sin(this.t * 0.05 + light * 3)) + ')'; x.fillRect(wx + 1, wy + 1, 12, 26);
    } else if (light >= 0) {
      x.fillStyle = 'rgba(255,136,0,' + (0.1 + 0.18 * light) + ')'; x.fillRect(wx + 1, wy + 1, 12, 26);
      if (light < 0.35) { x.fillStyle = 'rgba(0,0,0,.4)'; for (let b = 3; b < 27; b += 3) x.fillRect(wx + 1, wy + b, 12, 1); }
    }
    x.fillStyle = '#0a0503'; x.fillRect(wx, wy + 11, 14, 1); x.fillRect(wx + 7, wy, 1, 28);
    x.strokeStyle = 'rgba(194,65,12,.35)'; x.strokeRect(wx + 0.5, wy + 0.5, 13, 27);
    x.fillStyle = 'rgba(194,65,12,.5)'; x.fillRect(wx - 1, wy + 28, 16, 2);
    if (ac) { x.fillStyle = '#16110d'; x.fillRect(wx + 2, wy + 31, 10, 6); x.strokeStyle = 'rgba(194,65,12,.4)'; x.strokeRect(wx + 2.5, wy + 31.5, 9, 5); }
  }

  /** A ground-floor opening, sized against the 42-unit player: doors 52 tall on a step, shopfronts to 54 under an awning, shutters 48. */
  private drawBay(bx: number, w: number, kind: 'door' | 'glass' | 'shutter' | 'sealed') {
    const x = this.x;
    if (kind === 'glass') {
      // A lit shop interior behind glass: shelves, goods, a reflection; an awning above.
      x.fillStyle = '#120904'; x.fillRect(bx, this.y(6), w, 6);
      x.fillStyle = 'rgba(255,136,0,.1)'; x.fillRect(bx, this.y(54), w, 48);
      x.fillStyle = 'rgba(255,170,60,.18)'; x.fillRect(bx + 3, this.y(20), w - 6, 1); x.fillRect(bx + 3, this.y(36), w - 6, 1);
      for (let gx = bx + 4, j = 0; gx < bx + w - 6; gx += 7, j++) {
        x.fillStyle = j % 3 ? 'rgba(255,170,60,.22)' : 'rgba(255,217,165,.3)';
        x.fillRect(gx, this.y(26 + (j % 2) * 2), 4, 6 + (j % 2) * 2); x.fillRect(gx + 1, this.y(43), 3, 7);
      }
      x.strokeStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.moveTo(bx + 6, this.y(50)); x.lineTo(bx + 20, this.y(10)); x.stroke();
      x.fillStyle = 'rgba(255,136,0,.45)';
      for (let m = bx + 28; m < bx + w - 10; m += 28) x.fillRect(m, this.y(54), 1, 48);
      x.strokeStyle = 'rgba(255,136,0,.45)'; x.strokeRect(bx + 0.5, this.y(54) + 0.5, w - 1, 47);
      for (let ax = bx - 3, j = 0; ax < bx + w + 3; ax += 6, j++) {
        x.fillStyle = j % 2 ? 'rgba(255,136,0,.3)' : '#120800'; x.fillRect(ax, this.y(62), Math.min(6, bx + w + 3 - ax), 5);
      }
    } else if (kind === 'shutter') {
      // A rolled-down shutter under its housing.
      x.fillStyle = '#100a06'; x.fillRect(bx, this.y(48), w, 48);
      x.fillStyle = 'rgba(255,136,0,.1)'; for (let h = 3; h < 48; h += 3) x.fillRect(bx, this.y(h), w, 1);
      x.fillStyle = 'rgba(255,136,0,.35)'; x.fillRect(bx, this.y(2), w, 2);
      x.fillStyle = '#1a0f08'; x.fillRect(bx - 2, this.y(54), w + 4, 6);
      x.strokeStyle = 'rgba(194,65,12,.5)'; x.strokeRect(bx - 1.5, this.y(54) + 0.5, w + 3, 5);
    } else {
      // A door on a step. The sealed one (the penthouse) has no handle and no glass.
      x.fillStyle = '#1a0d05'; x.fillRect(bx - 3, this.y(3), w + 6, 3);
      x.fillStyle = 'rgba(255,136,0,.35)'; x.fillRect(bx - 3, this.y(3), w + 6, 1);
      x.fillStyle = '#050201'; x.fillRect(bx, this.y(52), w, 49);
      x.strokeStyle = 'rgba(255,136,0,.5)'; x.strokeRect(bx + 0.5, this.y(52) + 0.5, w - 1, 48);
      if (kind === 'door') {
        x.fillStyle = 'rgba(255,136,0,.22)'; x.fillRect(bx + 6, this.y(46), w - 12, 12);
        x.fillStyle = 'rgba(255,217,165,.7)'; x.fillRect(bx + w - 6, this.y(28), 2, 4);
        x.fillStyle = 'rgba(255,200,120,.85)'; x.fillRect(bx + Math.floor(w / 2) - 1, this.y(57), 3, 2);
      } else {
        x.fillStyle = 'rgba(194,65,12,.45)'; x.fillRect(bx + Math.floor(w / 2), this.y(50), 1, 46);
        x.fillStyle = 'rgba(255,217,165,.35)'; x.fillRect(bx + w + 3, this.y(36), 8, 6);
      }
    }
  }

  /** A backing plate bolted to the wall, so a sign hangs on something; its light washes the wall around it. */
  private plate(cx: number, cy: number, w: number, h: number, col: string) {
    const x = this.x, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2), r = Math.max(w, h) * 0.75;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(' + col + ',.1)'); g.addColorStop(1, 'rgba(' + col + ',0)');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    x.fillStyle = '#080403'; x.fillRect(x0, y0, w, h);
    x.strokeStyle = 'rgba(' + col + ',.4)'; x.lineWidth = 1; x.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    x.fillStyle = 'rgba(255,217,165,.45)';
    for (const [px, py] of [[x0 + 2, y0 + 2], [x0 + w - 3, y0 + 2], [x0 + 2, y0 + h - 3], [x0 + w - 3, y0 + h - 3]]) x.fillRect(px, py, 1, 1);
  }

  /**
   * The noodle stall, the brightest thing on the block: a shadow gap and a warm
   * rim lift it off the wall behind, its body is lit, and its own lamps light the
   * counter (and, in drawStreet, the street in front).
   */
  private drawStall() {
    const x = this.x, s0 = this.sx(STALL.x), sw = STALL.w, cx = s0 + sw / 2;
    if (s0 + sw + 20 < 0 || s0 - 20 > this.viewW) return;
    x.fillStyle = '#000'; x.fillRect(s0 - 3, this.y(121), sw + 6, 121);
    x.fillStyle = '#1c0e06'; x.fillRect(s0, this.y(104), sw, 104);
    const lamps = [s0 + 26, s0 + sw - 26];
    for (const lx of lamps) {
      const g = x.createRadialGradient(lx, this.y(95), 0, lx, this.y(95), 80);
      g.addColorStop(0, 'rgba(255,170,80,.22)'); g.addColorStop(1, 'rgba(255,170,80,0)');
      x.fillStyle = g; x.fillRect(s0 + 2, this.y(104), sw - 4, 104);
    }
    x.fillStyle = 'rgba(255,170,80,.8)'; x.fillRect(s0, this.y(104), 2, 104); x.fillRect(s0 + sw - 2, this.y(104), 2, 104);
    for (let i = 0; i < 9; i++) { x.fillStyle = i % 2 ? 'rgba(255,136,0,.8)' : '#2a1200'; x.fillRect(s0 - 6 + i * 16.9, this.y(118), 16.9, 14); }
    x.strokeStyle = 'rgba(255,190,110,.9)'; x.lineWidth = 1;
    x.strokeRect(s0 - 5.5, this.y(118) + 0.5, sw + 11, 13);
    x.strokeRect(s0 + 0.5, this.y(104) + 0.5, sw - 1, 104);
    for (const lx of lamps) {
      x.fillStyle = 'rgba(255,170,80,.7)'; x.fillRect(lx, this.y(104), 1, 5);
      x.fillStyle = 'rgba(255,136,0,.95)'; x.fillRect(lx - 4, this.y(99), 9, 3);
      x.save(); x.shadowColor = 'rgba(255,200,120,.9)'; x.shadowBlur = 6;
      x.fillStyle = '#ffe0b0'; x.fillRect(lx - 2, this.y(96), 5, 1); x.restore();
    }
    // A paper notice on the back wall.
    x.fillStyle = 'rgba(255,217,165,.14)'; x.fillRect(cx - 29, this.y(96), 58, 12);
    x.strokeStyle = 'rgba(255,217,165,.45)'; x.strokeRect(cx - 28.5, this.y(96) + 0.5, 57, 11);
    x.save(); x.font = '7px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,217,165,.8)'; x.fillText('NO LOGS KEPT', cx, this.y(87)); x.restore();
    // NOODLES on a plate standing on the awning, on two legs.
    x.fillStyle = 'rgba(255,170,80,.7)'; x.fillRect(cx - 26, this.y(122), 2, 4); x.fillRect(cx + 24, this.y(122), 2, 4);
    this.plate(cx, this.y(130), 72, 16, C);
    this.neon('NOODLES', cx, this.y(130), C, { size: 13, phase: 0 });
  }

  /** The wet street floor; on Downtown's street (`city`) the stall's light and the neon smeared into it. */
  private drawStreet(rain: number, city: boolean) {
    const x = this.x, gy = this.gy;
    x.fillStyle = '#030201'; x.fillRect(0, gy, this.viewW, this.viewH - gy);
    x.fillStyle = 'rgba(255,136,0,.55)'; x.fillRect(0, gy, this.viewW, 1);
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,100,0,' + (0.16 - i * 0.024) + ')'; x.fillRect(0, gy + 6 + i * i * 2 + i * 4, this.viewW, 1); }
    // The noodle stall's lamps pool warm light on the wet street in front of it.
    const s0 = this.sx(STALL.x);
    if (city && s0 + STALL.w + 20 > 0 && s0 - 20 < this.viewW) {
      const pool = x.createLinearGradient(0, gy, 0, gy + 34);
      pool.addColorStop(0, 'rgba(255,160,70,' + (0.18 + rain * 0.06) + ')'); pool.addColorStop(1, 'rgba(255,160,70,0)');
      x.fillStyle = pool; x.fillRect(s0 - 10, gy + 1, STALL.w + 20, 34);
    }
    // Neon smeared into the wet street.
    const smears: [number, string][] = [[372, C], [STALL.x + STALL.w / 2, C], [640, '255,90,110'], [90, C], [1770, O], [905, O], [DOORS.metro + 31, C], [DOORS.taxi - 18, C], [DOORS.shop, C]];
    for (const [wx, col] of city ? smears : []) {
      const sx = this.sx(wx);
      if (sx < -20 || sx > this.viewW + 20) continue;
      for (let i = 0; i < 10; i++) {
        const wob = Math.sin(this.t * 0.05 + i) * (1 + rain * 2);
        x.fillStyle = 'rgba(' + col + ',' + (0.05 + rain * 0.05) * (1 - i / 10) + ')';
        x.fillRect(sx - 6 + wob, gy + 3 + i * 4, 12, 3);
      }
    }
  }

  private drawCharacters() {
    const x = this.x, p = this.p;
    if (this.here === 'downtown') this.drawStallPeople();
    if (this.pixelHere) this.pixel.draw(x, (wx) => this.sx(wx), (h) => this.y(h), this.t);
    // jacked in: a Downtown machine's schematic is open and you stand at it, so the deck's cable runs to it
    const open = this.here === 'downtown' ? this.downtown.viewing : null;
    const jack = open ? this.downtown.model.spots().find((sp) => sp.id === open && Math.abs(sp.x - p.x) < 40 && Math.abs(this.p.y - (sp.y > 40 ? sp.y : 0)) < 8) : undefined;
    if (jack) p.face = jack.x >= p.x ? 1 : -1;
    const sprite = jack ? SPR.jack : !p.onGround ? SPR.jump : p.moving && Math.floor(this.t / 9) % 2 ? SPR.walk : SPR.stand;
    const box = drawSprite(x, sprite, this.sx(p.x), this.y(p.y), { glow: GLOW_YOU, flip: p.face < 0 });
    if (jack) {
      const tx = this.sx(jack.x), ty = this.y(jack.y + jack.h / 2), from = p.face > 0 ? box.x0 + box.w : box.x0;
      x.strokeStyle = 'rgba(0,255,255,.85)'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(from, box.y0 + 16); x.quadraticCurveTo((from + tx) / 2, box.y0 + 30, tx - 8 * p.face, ty); x.stroke(); x.lineWidth = 1;
    }
  }

  private drawStallPeople() {
    const x = this.x;
    // Fixer behind the counter, then the counter in front of him.
    drawSprite(x, SPR.fixer, this.sx(STALL.fixerX), this.y(30) + Math.round(Math.sin(this.t * 0.03)), { glow: 'rgba(255,170,60,.85)' });
    const s0 = this.sx(STALL.x);
    // Waist-high counter, lit by the stall's lamps, with a warm rim so it reads against the street.
    x.fillStyle = '#241208'; x.fillRect(s0, this.y(30), STALL.w, 30); x.fillStyle = 'rgba(255,170,60,.95)'; x.fillRect(s0, this.y(30), STALL.w, 2);
    x.strokeStyle = 'rgba(255,170,80,.7)'; x.lineWidth = 1; x.strokeRect(s0 + 0.5, this.y(30) + 0.5, STALL.w - 1, 30);
    for (let i = 0; i < 3; i++) {
      const stx = s0 + 50 + i * 12, ph = this.t * 0.04 + i;
      x.strokeStyle = 'rgba(255,255,255,' + (0.1 + 0.05 * Math.sin(ph)) + ')'; x.beginPath();
      for (let j = 0; j < 20; j++) { const yy = this.y(32) - j * 1.6, xx = stx + Math.sin(ph + j * 0.35) * 3; j ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
      x.stroke();
    }
    for (const n of NPCS) drawSprite(x, n.sprite, this.sx(n.x), this.gy, { glow: GLOW_THEM, flip: n.flip });
  }

  /**
   * Hack vision mutes the world: what is drawn so far loses its colour and sinks into a dark
   * violet wash, so the devices (drawn next, bright and framed) and the player stand out.
   * Two full-screen fills: cheap.
   */
  /** Hack vision's muting: grey and dark over the view, with holes left bright at `keep` (device spots, world units). */
  private mute(keep: { x: number; y: number; w: number; h: number }[] = []) {
    const x = this.x;
    x.save();
    if (keep.length) {
      x.beginPath(); x.rect(0, 0, this.viewW, this.viewH);
      for (const s of keep) x.rect(this.sx(s.x - s.w / 2) - 4, this.y(s.y + s.h) - 4, s.w + 8, s.h + 8);
      x.clip('evenodd');
    }
    x.globalCompositeOperation = 'saturation'; x.globalAlpha = 0.85;
    x.fillStyle = '#808080'; x.fillRect(0, 0, this.viewW, this.viewH);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.fillStyle = 'rgba(10,3,18,.62)'; x.fillRect(0, 0, this.viewW, this.viewH);
    x.restore();
  }

  private drawRain(level: number) {
    if (level < 0.03) return;
    const x = this.x, wind = 0.25 + 0.2 * Math.sin(this.t * 0.004);
    const n = Math.floor(this.drops.length * level);
    for (let i = 0; i < n; i++) {
      const [dx, dy, depth, seed] = this.drops[i];
      const fall = 2.5 + depth * 4.5, len = 4 + depth * 8;
      const yy = (dy + this.t * fall) % (this.viewH + 40) - 20;
      const xx = ((dx - this.t * fall * wind - this.cam * depth * 0.6) % this.viewW + this.viewW) % this.viewW;
      x.strokeStyle = 'rgba(170,210,255,' + (0.08 + depth * 0.22) + ')';
      x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx - len * wind, yy + len); x.stroke();
      // Splash where a near drop meets the street.
      if (depth > 0.75 && yy > this.gy - 6 && yy < this.gy + 2) {
        x.fillStyle = 'rgba(200,230,255,.35)'; x.fillRect(xx - 2, this.gy - 1, 1, 1); x.fillRect(xx + 2, this.gy - 2, 1, 1);
      }
      if (depth > 0.8 && seed < 0.15) {
        const ph = ((this.t * 0.02 + seed * 50) % 1);
        x.strokeStyle = 'rgba(255,136,0,' + 0.25 * (1 - ph) + ')';
        x.beginPath(); x.ellipse((dx * 1.7) % this.viewW, this.gy + 8 + seed * 200 % (this.viewH - this.gy - 12), ph * 10, ph * 2, 0, 0, 7); x.stroke();
      }
    }
    // A rare lightning flash in heavy rain.
    if (level > 0.8 && Math.floor(this.t) % 997 < 3) { x.fillStyle = 'rgba(200,220,255,.08)'; x.fillRect(0, 0, this.viewW, this.viewH); }
  }

  private drawPrompt() {
    if (this.bubble || this.showEnd || this.zh.overlayOpen || this.zh.popupOpen || this.mapView || this.beat || this.sleep) return;
    const t = this.nearest();
    if (!t) return;
    const x = this.x;
    x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center';
    x.fillStyle = 'rgba(0,255,255,.95)'; x.shadowColor = 'rgba(0,255,255,.8)'; x.shadowBlur = 6;
    const h = t.promptH ?? (t.id === 'fixer' ? 66 : 62);
    // kept inside the view, so a way out at a scene's very end still reads in full
    const half = x.measureText(t.label).width / 2 + 4;
    x.fillText(t.label, Math.max(half, Math.min(this.viewW - half, this.sx(t.x))), this.y(h));
    x.restore();
  }

  private wrap(text: string, max: number) {
    const words = text.split(' '), lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (this.x.measureText(next).width > max && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ---------- the camera nudge ----------

  /** The camera leaning towards something that reacted off the view: where it leans to, until when (clock frames), where you stood. */
  private nudge: { goal: number; until: number; px: number } | null = null;
  /** Coming back from a nudge: the camera eases gently until it is on you again. */
  private easeBack = false;
  /** When the last nudge started (clock frames), and what has drawn the eye already this visit (`from|line`). */
  private lastNudge = -1e9;
  private nudged = new Set<string>();

  /**
   * Something said it reacted (`from`, with a line in green or red). If it is off the view but
   * near, the camera leans that way for a moment so you see it happen, keeping you in view; the
   * ping (an edge arrow) already points at anything further. Never during a conversation, the deck
   * or a panel, never while you walk, never with reduced motion; each thing and line once a visit,
   * and not more often than every few seconds.
   */
  private nudgeTo(from: string, text: string, tone?: string) {
    if (tone !== 'ok' && tone !== 'err') return;
    if (this.reduced || this.bubble || this.term.focused || this.zh.overlayOpen || this.mapView || this.flight || this.hop || this.cut || this.p.moving) return;
    const at = this.zh.worldOf(from);
    if (!at || this.levelW <= this.viewW) return;
    const key = from + '|' + text, p = this.p, m = NUDGE_MARGIN;
    if (this.nudged.has(key) || this.clock - this.lastNudge < NUDGE_GAP) return;
    // already in view (with a margin), or too far to show together with you: the ping is enough
    if (at.x > this.cam + m && at.x < this.cam + this.viewW - m) return;
    if (Math.abs(at.x - p.x) > this.viewW - m * 2) return;
    let goal = at.x < this.cam + m ? at.x - m : at.x + m - this.viewW;
    goal = Math.max(p.x + m - this.viewW, Math.min(p.x - m, goal));
    goal = Math.max(0, Math.min(this.levelW - this.viewW, goal));
    this.nudged.add(key); this.lastNudge = this.clock;
    this.nudge = { goal, until: this.clock + NUDGE_HOLD, px: p.x };
  }

  /** How far down the HUD's lines reach under the key bar (world units), as drawn last. */
  private hudH = 46;

  /** Where the speech bubble was drawn last (view units), so captions keep off it; null without one. */
  private bubbleBox: { x: number; y: number; w: number; h: number } | null = null;

  private drawBubble() {
    const b = this.bubble;
    this.bubbleBox = null;
    if (!b) return;
    const x = this.x;
    x.save();
    x.font = '600 10px "IBM Plex Mono", monospace'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    const full = b.pages[b.page], shown = full.slice(0, Math.floor(b.chars));
    const lines = this.wrap(full, 230), shownLines = this.wrap(shown, 230);
    const w = Math.max(...lines.map((l) => x.measureText(l).width), x.measureText(b.name).width) + 28;
    const h = lines.length * 13 + 32;
    const bx = Math.max(6, Math.min(this.viewW - w - 6, this.sx(b.x) - w / 2));
    const by = Math.max(6, this.y(b.h) - h - 50);
    this.bubbleBox = { x: bx, y: by, w, h };
    x.fillStyle = '#000'; x.fillRect(bx, by, w, h);
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(bx + 1, by + 1, w - 2, h - 2); x.lineWidth = 1;
    x.fillStyle = b.name === 'YOU' ? '#7ff' : '#ffd9a5'; x.fillText(b.name !== 'YOU' ? b.name : isBefore(this.save.flags) ? 'YOU' : who(this.save).toUpperCase(), bx + 10, by + 15);
    x.fillStyle = '#fff'; shownLines.forEach((l, i) => x.fillText(l, bx + 10, by + 30 + i * 13));
    if (b.chars >= full.length && Math.floor(this.t / 20) % 2) {
      x.beginPath(); x.moveTo(bx + w - 16, by + h - 10); x.lineTo(bx + w - 8, by + h - 10); x.lineTo(bx + w - 12, by + h - 5); x.closePath(); x.fill();
    }
    x.restore();
  }

  private drawHud() {
    const x = this.x, s = this.save;
    x.save();
    x.font = '600 8px "IBM Plex Mono", monospace'; x.textAlign = 'left';
    // below the key bar along the top (its height in world units)
    const top = (this.keyBar.root.offsetHeight + 8) * (this.canvas.width / (this.canvas.clientWidth || 1)) / this.k;
    x.fillStyle = 'rgba(255,136,0,.85)'; x.fillText(sceneTitle(this.def) + this.clockText, 8, top + 10);
    x.fillStyle = 'rgba(255,217,165,.7)';
    // what you have: tokens, modules, the key chips that do something (uplink.so), what you carry; one line, or two when it is long
    const own = 'TOKENS ' + s.tokens + ' · MODULES ' + (ownedModules(s).join(' ') || '-') + (SUDO ? ' · SUDO' : '');
    const keys = s.keyring.map((id) => KEYRING.get(id)).filter((k) => k?.kind === 'key').map((k) => (/^\S+$/.test(k!.label) ? k!.label : k!.id));
    const held = Object.entries(s.items).filter(([, n]) => n > 0).map(([id, n]) => (ITEMS[id as ItemId] ?? id) + (n > 1 ? '×' + n : ''));
    const more = [keys.length ? 'KEYS ' + keys.join(' ') : '', held.length ? 'HELD ' + held.join(' ') : ''].filter(Boolean).join(' · ');
    let y = top + 21;
    if (more && x.measureText(own + ' · ' + more).width <= this.viewW - 16) x.fillText(own + ' · ' + more, 8, y);
    else { x.fillText(own, 8, y); if (more) x.fillText(more, 8, (y += 11)); }
    // the scene's goal, where it has goals (a scene without a data file has none)
    // (the opening has its own: opening.ts)
    const zh = this.zh.model.data.goals.length ? this.zh : null, story = pick(OPENING_GOAL, this.story, this.here);
    if (story || zh) { x.fillStyle = 'rgba(255,61,242,.9)'; x.fillText('GOAL ' + (story ?? zh!.objective()), 8, (y += 11)); }
    // the keys and what they do: the key bar along the top (keybar.ts)
    const tl = this.termLine;
    if (tl && this.t < tl.until && !this.term.focused) {
      x.fillStyle = tl.kind === 'err' ? 'rgba(255,90,110,.95)' : tl.kind === 'ok' ? 'rgba(34,197,94,.95)' : 'rgba(255,217,165,.85)';
      x.fillText(tl.text.length > 90 ? tl.text.slice(0, 89) + '…' : tl.text, 8, y + 11);
    }
    // how far down the HUD's lines reach (world units under the key bar): captions and popups keep below
    this.hudH = Math.max(46, y + 11 + 4 - top);
    if (this.toast && this.t < this.toast.until) {
      x.textAlign = 'center'; x.fillStyle = this.toast.text.startsWith('ESC') ? 'rgba(0,255,255,.95)' : 'rgba(255,90,110,.95)'; x.font = '600 9px "IBM Plex Mono", monospace';
      x.fillText(this.toast.text, this.sx(this.p.x), this.y(this.p.y + 56));
    }
    x.restore();
  }

  private drawEnd() {
    const x = this.x, cx = this.viewW / 2, cy = this.viewH / 2 - 30;
    x.save();
    x.fillStyle = 'rgba(0,0,0,.78)'; x.fillRect(0, 0, this.viewW, this.viewH);
    x.textAlign = 'center';
    x.font = '600 16px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,136,0,.95)'; x.shadowColor = 'rgba(255,136,0,.8)'; x.shadowBlur = 10;
    x.fillText('END OF TRANSMISSION', cx, cy);
    x.shadowBlur = 0; x.font = '10px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,217,165,.9)';
    x.fillText('Downtown cleared. Nodes freed: ' + this.save.freed.length + '. You are still a ghost, ' + who(this.save) + '.', cx, cy + 26);
    x.fillText('The Neon Market gate stands open at the west end. Your progress is saved in this browser.', cx, cy + 42);
    x.fillStyle = 'rgba(0,255,255,.9)'; x.fillText('ENTER keep exploring · ESC menu', cx, cy + 66);
    x.restore();
  }

  // ---------- the opening (opening.ts) ----------
  // The train home, the turnstile, Downtown before, the flat at dawn, the sleep, the morning you
  // are deleted, Moth's uplink.so. The scenes are the usual ones; the save's flags pick their state.

  private get story(): OpeningState { return openingState(this.save.flags); }
  /** Who you are in the HUD and your bubbles: a courier while you still exist, then your handle (or "ghost"). */
  private get me() { return isBefore(this.save.flags) ? 'courier' : who(this.save); }
  /** The opening's clock, after the scene's name in the HUD (" · 05:52"). */
  private get clockText() { const t = pick(OPENING_TIME, this.story, this.here); return t ? ' · ' + t : ''; }

  /** When the player last moved or did something (clock frames), for the idle ping. */
  private still = 0;
  /** Where the idle ping points when it is not a device (world x): the scene's 'goal' speaker. */
  private goalAt: number | null = null;
  /** The turnstile taking its time: when it started, and what happens once it says ok. */
  private beat: { start: number; then: () => void } | null = null;
  /** Sleeping: when the fade started; `woke` once the flat has turned into the morning. */
  private sleep: { start: number; woke: boolean } | null = null;
  /** The morning: when you woke, how many plain things failed, whether Moth has written (or is about to: the mail). */
  private morning = { at: -1, tries: 0, last: -1e9, sent: false, due: false };

  /** NEW GAME (until the glide lands) and a first launch: the opening, on the train home. */
  private startOpening() {
    this.morning = { at: -1, tries: 0, last: -1e9, sent: false, due: false };
    this.save.flags[OPENING.home] = true;
    storeSave(this.save);
    this.handTo('train');
  }

  /** Sudo's LEVELS: the opening from one of its points (opening.ts `OPENING_LEVELS`), the flat as on the first night. */
  private openingFrom(flags: string[]) {
    for (const f of Object.keys(this.save.flags)) if (f.startsWith('opening:')) delete this.save.flags[f];
    flags.forEach((f) => { this.save.flags[f] = true; });
    this.hostOf('capsule').reset();
    this.morning = { at: -1, tries: 0, last: -1e9, sent: false, due: false };
    storeSave(this.save);
    const to = openingResume(this.save.flags) ?? 'train';
    this.handTo(to);
    if (this.story === 'deleted') this.wakeUp();
  }

  /** The train home: on its run into Downtown (from the harbor's closed stop), slow enough to talk to people on the way. */
  private rideHome() {
    Object.assign(ride, {
      at: LINE.indexOf('harbor'), to: LINE.indexOf('downtown'), phase: 'running', timer: HOME_RUN.start, pos: 2 * SEG, d: 0, span: SEG,
      frames: HOME_RUN.frames, v: 0, open: 0, doors: false, halt: null, say: 'NEXT: DOWNTOWN',
    });
  }

  /** A device's everyday actions in this state (opening.ts `OPENING_EVERYDAY`), as popup chips; null: its data's. */
  private storyChips(scene: SceneId, dev: string): PopupItem[] | null {
    const chips = pick(OPENING_EVERYDAY, this.story, scene, dev);
    if (!chips) return null;
    const zh = this.hostOf(scene);
    return chips.map((c) => ({
      label: c.label,
      run: () => {
        if (c.act) zh.model.act(dev, c.act[0], c.act[1]);
        if (c.set) { zh.model.set(c.set[0], c.set[1]); zh.model.changed(); }
        if (c.say) zh.react(dev, c.say);
        if (c.say?.[2] === 'ok') sound.granted(); else if (c.say?.[2] === 'err') sound.denied();
        if (c.fail) { this.morning.tries++; this.morning.last = this.clock; }
        if (c.mail) { this.morning.due = true; this.morning.last = this.clock; }
      },
    }));
  }

  /** A way out that does something else in this state (opening.ts `ExitRule`); `go` leaves through it. False: use it as usual. */
  private storyExit(rule: ExitRule, x: number, go: () => void): boolean {
    if ('say' in rule) { this.say(rule.say.name, rule.say.pages, x, 60); return true; }
    if ('react' in rule) { this.zh.react(rule.react, rule.line); sound.denied(); if (rule.fail) { this.morning.tries++; this.morning.last = this.clock; } return true; }
    if ('turnstile' in rule) {
      // Downtown station's exit gate: one beat too long on "verifying", then ok. Nobody else waits.
      this.keys.clear();
      this.beat = { start: this.clock, then: () => { this.save.flags[OPENING.street] = true; storeSave(this.save); go(); } };
      sound.blip();
      return true;
    }
    // CONCIERGE at the tower's door: it knows you, and lets you up
    sound.granted();
    this.say('CONCIERGE', ['welcome home. you are expected. the lift is on its way down.'], x, 60);
    this.bubble!.then = () => { this.save.flags[OPENING.flat] = true; storeSave(this.save); go(); };
    return true;
  }

  /** The story's clock, every frame: the turnstile's beat, the sleep, the morning's message, jacking in. */
  private updateStory() {
    if (this.beat && this.clock - this.beat.start >= TURNSTILE.verify + TURNSTILE.ok) {
      const then = this.beat.then;
      this.beat = null;
      sound.granted();
      then();
    }
    if (this.sleep) {
      const e = this.clock - this.sleep.start;
      if (!this.sleep.woke && e >= SLEEP.out + SLEEP.card / 2) { this.sleep.woke = true; this.morningFlat(); }
      if (e >= SLEEP.out + SLEEP.card + SLEEP.in) { this.sleep = null; this.wakeUp(); }
      return;
    }
    const st = this.story;
    if (st === 'deleted' && this.here === 'capsule') {
      const m = this.morning;
      if (m.at < 0) m.at = this.clock;
      if (!m.sent && !this.bubble && !this.zh.popupOpen && this.clock - m.last > MORNING.after && (m.due || m.tries >= MORNING.tries || this.clock - m.at > MORNING.wait)) this.mothWrites();
    }
    // jacked in to HOME-PC: Capsule 7B's own goals take over
    if (st === 'uplinked' && this.here === 'capsule' && this.zh.viewing === 'pc') { this.save.flags[OPENING.jacked] = true; storeSave(this.save); }
  }

  /** [E] SLEEP: the fade, the card, the morning. */
  private sleepNow() {
    this.keys.clear();
    this.bubble = null;
    this.zh.closeAll();
    this.sleep = { start: this.clock, woke: false };
    sound.close();
  }

  /** In the dark between the two flats: the flat as it is the morning after (Capsule 7B's puzzles from the start), you by the bed. */
  private morningFlat() {
    this.save.flags[OPENING.slept] = true;
    this.hostOf('capsule').reset();
    this.morning = { at: this.clock, tries: 0, last: -1e9, sent: false, due: false };
    Object.assign(this.p, { x: CAPSULE_SPAWN, y: 0, vy: 0, onGround: true, face: -1 });
    const home = this.def.perch?.(this.zh.model);
    if (home) this.pixel.place(home.x, home.h, home.rest);
    storeSave(this.save);
    this.syncHud();
  }

  /** Awake: the player says what is wrong (the morning's clock starts). */
  private wakeUp() {
    this.morning.at = this.clock;
    this.say('YOU', WAKE_LINES, this.p.x, 46);
  }

  /** Moth's message: in the deck, as a bubble, and uplink.so with it (hacking is yours from now on). */
  private mothWrites() {
    this.morning.sent = true;
    MOTH_MESSAGE.forEach((l) => this.term.print('moth> ' + l, 'ok'));
    this.save.flags[OPENING.uplink] = true;
    if (!this.save.keyring.includes(UPLINK_KEY)) this.save.keyring.push(UPLINK_KEY);
    storeSave(this.save);
    this.syncHud();
    this.term.print('[deck] uplink.so received. hack vision: H · the board: B', 'ok');
    sound.granted();
    this.say('MOTH › YOU', MOTH_MESSAGE, this.p.x, 46);
    this.bubble!.then = () => this.say('YOU', UPLINK_LINES(this.touch), this.p.x, 46);
  }

  /** The idle ping: the next goal's target (opening.ts `OPENING_PINGS`): a device, or a point (a door, an exit, the bed). */
  private pingGoal(t: PingTarget) {
    if ('device' in t) { this.zh.ping(t.device, 'look'); return; }
    let x: number | undefined;
    if ('door' in t) x = this.def.exits.filter((e) => e.action === 'out').map((e) => e.x).sort((a, b) => Math.abs(a - this.p.x) - Math.abs(b - this.p.x))[0];
    else if ('exit' in t) x = this.def.exits.find((e) => e.id === t.exit)?.x;
    else x = pick(OPENING_TARGETS, this.story, this.here, t.story)?.x;
    if (x === undefined) return;
    this.goalAt = x;
    this.zh.ping('goal', 'look');
  }

  /** Dawn over Downtown before you are deleted: the sky warms low down, behind the towers. */
  private drawDawn() {
    const x = this.x, g = x.createLinearGradient(0, 0, 0, this.gy);
    g.addColorStop(0, 'rgba(40,20,60,0)'); g.addColorStop(0.55, 'rgba(110,50,70,.1)'); g.addColorStop(1, 'rgba(255,140,70,.24)');
    x.fillStyle = g; x.fillRect(0, 0, this.viewW, this.gy);
  }

  /** The flat's light: warm at dawn, cold the morning after (until the door is yours again). Under the player, over the room. */
  private drawLight() {
    if (this.here !== 'capsule' || this.zh.visionOn) return;
    const f = this.save.flags, x = this.x;
    if (this.story === 'flat') x.fillStyle = 'rgba(255,160,80,.08)';
    else if (f[OPENING.slept] && !this.zh.model.get('doorOpen')) x.fillStyle = 'rgba(100,135,190,.14)';
    else return;
    x.fillRect(0, 0, this.viewW, this.viewH);
  }

  /** The turnstile verifying, over the gate: dots, one beat too long, then ok. */
  private drawBeat() {
    if (!this.beat) return;
    const x = this.x, e = this.clock - this.beat.start, ok = e >= TURNSTILE.verify;
    const dots = '.'.repeat(1 + (Math.floor(e / 20) % 3)).padEnd(3, ' ');
    const line = ok ? 'TURNSTILE: verifying… … ok.' : 'TURNSTILE: verifying' + dots;
    x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'left'; x.textBaseline = 'middle';
    const w = x.measureText('TURNSTILE: verifying… … ok.').width + 16, cx = Math.max(w / 2 + 4, Math.min(this.viewW - w / 2 - 4, this.sx(TURNSTILE.x)));
    const top = this.y(96), gate = this.y(36);
    x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(cx - w / 2, top, w, 20);
    x.strokeStyle = ok ? 'rgba(34,197,94,.8)' : 'rgba(255,217,165,.45)'; x.strokeRect(cx - w / 2 + 0.5, top + 0.5, w - 1, 19);
    x.fillStyle = ok ? 'rgba(34,197,94,.95)' : 'rgba(255,217,165,.92)'; x.fillText(line, cx - w / 2 + 8, top + 10.5);
    x.fillStyle = 'rgba(255,217,165,.45)'; x.fillRect(this.sx(TURNSTILE.x), top + 20, 1, gate - top - 20);
    x.restore();
  }

  /** The sleep: dark, a card with the clock (06:04, then 09:40), light again. */
  private drawSleep() {
    if (!this.sleep) return;
    const x = this.x, e = this.clock - this.sleep.start, S = SLEEP;
    const a = e < S.out ? e / S.out : e < S.out + S.card ? 1 : Math.max(0, 1 - (e - S.out - S.card) / S.in);
    x.fillStyle = 'rgba(0,0,0,' + a + ')'; x.fillRect(0, 0, this.viewW, this.viewH);
    if (e < S.out || e > S.out + S.card) return;
    const f = (e - S.out) / S.card, fade = Math.min(1, Math.min(f, 1 - f) * 6);
    x.save(); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '600 18px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,136,0,' + 0.95 * fade + ')';
    x.fillText(f < 0.5 ? S.from : S.to, this.viewW / 2, this.viewH / 2 - 6);
    x.font = '8px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,217,165,' + 0.7 * fade + ')';
    x.fillText('CAPSULE 7B', this.viewW / 2, this.viewH / 2 + 14);
    x.restore();
  }

  // ---------- cutscenes (cutscenes/) ----------
  // While one plays, the scene's update and draw are skipped entirely; any key or tap skips it.

  private cut: CutscenePlay | null = null;
  private cutThen: (() => void) | null = null;
  /** A cutscene a story beat asked for, waiting for the screen to be free. */
  private pendingCut: string | null = null;

  /**
   * Contacts on your deck (contacts.ts): after a story beat, say what came in. The messages stay
   * unread until `msg <contact>` in the deck.
   */
  private inbox() {
    const news = unread(this.save.flags);
    if (!news.length) return;
    const who = [...new Set(news.map((n) => n.contact))];
    who.forEach((c) => this.term.print('[deck] ' + c.name + ' · ' + c.status + ' · ' + messagesOf(c, this.save.flags).length + ' message(s) · type: msg ' + c.id, 'ok'));
    if (who.some((c) => c.id === 'moth')) this.say('YOU', ['Moth is on my deck now. One bar of signal, out on the water.', this.touch ? 'TERMINAL, then: msg moth.' : 'ENTER for the terminal, then: msg moth.'], this.p.x, 46);
  }

  /**
   * Play a cutscene, then continue: `then` runs when it ends or is skipped. Without
   * `then`, the game hands over to the cutscene's `next` scene (from its data).
   * For a menu's NEW GAME or a story beat: `game.playCutscene('intro', () => …)`.
   */
  playCutscene(id: CutsceneId | string, then?: () => void) {
    const scene = cutsceneById(id);
    const after = then ?? (() => scene && this.handTo(scene.next));
    if (!scene) { after(); return; }
    this.endCutscene(false);
    this.bubble = null;
    this.keys.clear();
    this.hosts.forEach((h) => h.closeAll());
    this.term.close();
    this.cut = new CutscenePlay(scene, { reduced: this.reduced, touch: this.touch });
    this.cutThen = after;
    document.documentElement.classList.add('cutscene');
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + scene.cards.map((c) => c.text).join(' '));
    this.host.setScene(scene.title);
  }

  private stepCutscene(dt: number) {
    const c = this.cut!;
    c.step(dt / 60);
    const x = this.x;
    x.setTransform(this.k, 0, 0, this.k, 0, 0);
    x.imageSmoothingEnabled = false;
    c.draw(x, this.viewW, this.viewH);
    if (c.done) this.endCutscene(true);
  }

  /** Stop the cutscene; `andThen` runs what comes after it (false when the game stops mid-scene). */
  private endCutscene(andThen: boolean) {
    if (!this.cut) return;
    const then = this.cutThen;
    this.cut = null;
    this.cutThen = null;
    document.documentElement.classList.remove('cutscene');
    this.syncHud();
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + this.placeName);
    if (andThen) then?.();
  }

  /** Sudo's LEVELS: play a cutscene (then its next scene), or arrive in a scene at its spawn. */
  private enterLevel(id: string) {
    this.bubble = null;
    const opening = openingLevel(id);
    if (opening) { this.openingFrom(opening.flags); return; }
    if (isCutsceneId(id)) { this.playCutscene(id); return; }
    this.handTo(startLevel(id) ?? id);
    this.markSeen(this.here);
    storeSave(this.save);
  }

  /** Arrive in a scene by id (anything else is Downtown), at its spawn. */
  handTo(id: string) {
    this.enter(isSceneId(id) ? id : 'downtown', true);
  }

  // ---------- a scene's ways out and its life ----------

  private sceneView: SceneView | null = null;

  /**
   * A scene's ways out as E targets: its doors, stairs and pads (an open border is walked
   * into instead; one its code offers is an engine target). A platform's BOARD is one
   * target at each of the train's doors, only while it stands there with them open.
   */
  private exitTargets(s: SceneDef): Target[] {
    const list: Target[] = [];
    for (const e of s.exits) {
      if (e.edge || e.engine || (e.requires && !this.save.flags[e.requires])) continue;
      if (e.action === 'board') {
        const st = stationAt(this.here);
        if (st) for (const dx of platformDoors(st, this.t, this.cam, STOP)) list.push({ kind: 'exit', id: 'exit:' + e.id, x: dx, h: 0, label: e.label + ' · LINE 0 > ' + STATIONS[nextStation(st)].name, promptH: e.promptH ?? 70 });
        continue;
      }
      // The train's door: only while it stands at a stop with the doors open.
      if (e.action === 'out' && !rideOpen()) continue;
      const label = e.action === 'out' ? '[E] STEP OUT · ' + (rideAtSiding() ? 'SIDING' : STATIONS[rideStop()].name) : e.label;
      list.push({ kind: 'exit', id: 'exit:' + e.id, x: e.x, h: 0, label, promptH: e.promptH ?? 70 });
    }
    return list;
  }

  /**
   * A scene's life as E targets: readables, uses, the people who talk, and the animals
   * (cats to pet, pigeons to shoo) and robots. E on one runs `useLife`.
   */
  private lifeTargets(s: SceneDef): Target[] {
    const list: Target[] = [];
    for (const r of s.readables ?? []) list.push({ kind: 'life', id: 'read:' + r.id, x: r.x, h: 0, label: r.label ?? '[E] READ', promptH: r.promptH ?? 70 });
    for (const u of s.uses ?? []) list.push({ kind: 'life', id: 'use:' + u.id, x: u.x, h: 0, label: u.label, promptH: u.promptH ?? 70 });
    // the scene's people with something to say (characters.ts): the target follows a walker
    for (const p of s.people ?? []) if (p.id && p.talk) list.push({ kind: 'life', id: 'talk:' + p.id, x: characterX(p, this.t), h: 0, label: '[E] TALK', promptH: characterHeight(p) + 16 });
    // animals: people always want to pet the cat (and the pigeon gets shooed)
    (s.people ?? []).forEach((p, i) => {
      if (!p.talk && (p.look === 'cat' || p.look === 'pigeon')) list.push({ kind: 'life', id: 'pet:' + i, x: characterX(p, this.t), h: 0, label: p.look === 'cat' ? '[E] PET' : '[E] SHOO', promptH: characterHeight(p) + 14 });
      // robots without talk still answer: a beep, a status, a polite refusal
      else if (!p.talk && isBot(p)) list.push({ kind: 'life', id: 'bot:' + i, x: characterX(p, this.t), h: 0, label: botReact(p).label, promptH: characterHeight(p) + 14 });
    });
    return list;
  }

  /** E next to a scene's exit or something of its life (`kind:id`, as `exitTargets` and `lifeTargets` make them). */
  private useLife(target: string) {
    const s = this.def, [kind, id] = target.split(':');
    if (kind === 'story') { if (id === 'bed') this.sleepNow(); return; }
    if (kind === 'read') {
      const r = s.readables!.find((z) => z.id === id)!, o = pick(OPENING_LINES, this.story, this.here, id);
      this.say(o?.name ?? r.name, o?.pages ?? r.pages, r.x, r.h ?? 70);
      return;
    }
    if (kind === 'pet') {
      const p = s.people![Number(id)], n = this.petCount++;
      const lines = p.look === 'cat' ? PET_CAT : PET_PIGEON;
      sound.blip();
      this.say(p.look === 'cat' ? 'CAT' : 'PIGEON', lines[n % lines.length], characterX(p, this.t), characterHeight(p) + 4);
      return;
    }
    if (kind === 'bot') {
      const p = s.people![Number(id)], said = botReact(p, true);
      sound.blip();
      this.say(said.name, said.pages, characterX(p, this.t), characterHeight(p) + 4);
      return;
    }
    if (kind === 'talk') {
      const p = s.people!.find((z) => z.id === id)!, said = talkTo(p);
      this.say(said.name, said.pages, characterX(p, this.t), characterHeight(p) - 10);
      return;
    }
    if (kind === 'use') {
      const u = s.uses!.find((z) => z.id === id)!, save = this.save;
      const out = u.use({
        tokens: save.tokens,
        pay: (n) => { if (save.tokens < n) return false; save.tokens -= n; this.flash('-' + n + ' token' + (n === 1 ? '' : 's')); return true; },
        give: (n) => { save.tokens += n; this.flash('+' + n + ' token' + (n === 1 ? '' : 's')); },
        flags: save.flags, set: (f) => { save.flags[f] = true; }, t: this.t,
        // what you carry: the save's items, across scenes and reloads
        has: (item, n = 1) => (save.items[item] ?? 0) >= n,
        take: (item, n = 1) => {
          if ((save.items[item] ?? 0) < n) return false;
          save.items[item] -= n;
          if (save.items[item] <= 0) delete save.items[item];
          return true;
        },
        add: (item, n = 1) => { save.items[item] = (save.items[item] ?? 0) + n; },
      });
      storeSave(save);
      this.syncHud();
      const said = Array.isArray(out) ? { name: u.name, pages: out } : out;
      this.say(said.name, said.pages, u.x, u.h ?? 60);
      return;
    }
    const e = s.exits.find((z) => z.id === id);
    if (e) this.useExit(e);
  }

  /** Leave through an exit: board, step out, hail a taxi, look at the map, or walk to its scene, landing at its matching exit there. */
  private useExit(e: SceneExit) {
    // the opening: some ways out do something else in this state (the turnstile, CONCIERGE, "bed first")
    const rule = pick(OPENING_EXITS, this.story, this.here, e.id);
    if (rule && this.storyExit(rule, e.x, () => { if (isSceneId(e.to)) this.travel(e.to, e.at); })) return;
    // a door that reads key chips (Moth's building): only the right one opens it
    if (e.needs && !this.save.keyring.includes(e.needs.key)) { sound.denied(); this.say(e.needs.name, e.needs.pages, e.x, e.needs.h); return; }
    if (e.action === 'board') { const st = stationAt(this.here); if (st && platformOpen(st, this.t)) this.enterTrain(st); return; }
    if (e.action === 'out') { this.stepOut(); return; }
    if (e.action === 'taxi') { this.hailTaxi(); return; }
    if (e.action === 'map') { this.showMap(); sound.open(); return; }
    if (!isSceneId(e.to)) return;
    // the flat's door: Pixel comes along from now on
    if (e.sets) { this.save.flags[e.sets] = true; storeSave(this.save); }
    this.travel(e.to, e.at);
  }

  /** The scene view, refreshed for this frame. */
  private view(): SceneView {
    const v = (this.sceneView ??= { sx: (wx, p = 1) => this.sx(wx, p), y: (h) => this.y(h), t: 0, viewW: 0, viewH: 0, cam: 0, gy: 0, flags: this.save.flags });
    v.t = this.t; v.viewW = this.viewW; v.viewH = this.viewH; v.cam = this.cam; v.gy = this.gy; v.flags = this.save.flags;
    return v;
  }

  // ---------- travel: doors, the metro, sky taxis, the city map (city.ts) ----------

  /** Go to a scene, landing at its exit `at` there. */
  private travel(id: SceneId, at?: string) {
    this.mapView = null;
    this.enter(id, false, at);
    // With reduced motion the platforms' clocks stand still: stand a train there with its doors open.
    const st = stationAt(id);
    if (st && this.reduced && !platformOpen(st, this.t)) platformSync(st, this.t, TIMETABLE.dwell / 2);
  }

  /** The player walked into a border: leave through that edge's exit, if the scene has one, still walking the same way. */
  private walkOff(edge: 'left' | 'right') {
    const e = this.def.exits.find((z) => z.edge === edge && (!z.requires || this.save.flags[z.requires]));
    if (!e || !isSceneId(e.to)) return;
    this.travel(e.to, e.at);
    this.p.face = edge === 'left' ? -1 : 1;
  }

  /** Remember a scene for the city map: `flags['seen:<scene>']`. */
  private markSeen(id: SceneId) {
    const f = seenFlag(id);
    if (this.save.flags[f]) return;
    this.save.flags[f] = true;
    storeSave(this.save);
  }

  /** Board the train standing at a station's platform: in the car by its door, which stays open as long as it would have on the platform. */
  private enterTrain(at: Station) {
    boardRide(at, platformLeft(at, this.t));
    this.travel('train', 'out');
  }

  /** E at the train's open door: out onto the platform of the stop it stands at, the train still there behind you until it leaves. */
  private stepOut() {
    if (!rideOpen()) return;
    // P14: the old siding has no station, only a service stair up to the harbor's pier
    if (rideAtSiding()) { this.travel('harbor', 'metro'); this.say('YOU', SIDING_OUT, this.p.x, 50); return; }
    const st = rideStop(), left = rideLeft();
    this.travel(STATIONS[st].scene, 'train');
    platformSync(st, this.t, this.reduced ? TIMETABLE.dwell / 2 : left);
  }

  /** E at a taxi stand: the city map to pick a stand, if you can pay. */
  private hailTaxi() {
    if (this.save.tokens < FARE) {
      sound.denied();
      this.say('DRIVER', DRIVER_BROKE, this.p.x + 20, 40);
      return;
    }
    this.mapView = openMap('taxi', this.here, this.here === 'train' ? rideStop() : null);
    sound.open();
  }

  /** The city map on its own, just to look at (for a menu to call). Esc closes it. */
  showMap() {
    if (!this.running || this.flight || this.hop) return;
    this.bubble = null;
    this.mapView = openMap('view', this.here, this.here === 'train' ? rideStop() : null);
  }

  /** True while the city map is open. */
  get mapOpen() { return !!this.mapView; }

  private mapKey(e: KeyboardEvent) {
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Tab', 'Escape'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    this.mapAct(mapKey(this.mapState(), k));
  }

  /** Do what the map asks: close, a sound, quick travel to a place, a taxi to a stand. */
  private mapAct(a: MapAct) {
    switch (a.kind) {
      case 'close': this.mapView = null; this.canvas.style.cursor = ''; sound.close(); return;
      case 'blip': sound.blip(); return;
      case 'zoom': sound.open(); return;
      case 'back': sound.close(); return;
      case 'denied': sound.denied(); return;
      case 'go': this.quickTravel(a.place); return;
      case 'fly': this.fly(a.stand); return;
    }
  }

  /** Take a sky taxi to a stand, for the fare. */
  private fly(to: Stand) {
    this.mapView = null;
    this.canvas.style.cursor = '';
    if (to === standOf(this.here)) { this.flash('you are already here'); return; }
    // the harbor lock: no flights to the pier until P14
    if (to === 'harbor' && !harborOpen(this.save.flags)) { sound.denied(); this.say('DRIVER', DRIVER_HARBOR, this.p.x + 20, 40); return; }
    this.save.tokens -= FARE;
    storeSave(this.save);
    this.syncHud();
    this.flight = { to, start: this.clock };
    sound.open();
  }

  /** The map's state, for drawing it and for deciding where you may go. */
  private mapState(): MapState {
    const m = this.mapView ?? openMap('view', this.here, null);
    return {
      view: m, touch: this.touch, scene: this.here, reduced: this.reduced,
      // the smallest touch target, 44 CSS px, in view units
      tapMin: (44 * this.canvas.width) / Math.max(1, this.canvas.clientWidth) / this.k,
      avoid: this.mapAvoid(),
      ride: this.here === 'train' ? { from: rideStop(), to: rideNext(), f: rideRun() } : null,
      seen: (z) => !!this.save.flags[seenFlag(z)], flag: (f) => !!this.save.flags[f], gateOpen: !!this.save.flags.end, harborOpen: harborOpen(this.save.flags), tokens: this.save.tokens, t: this.clock,
    };
  }

  /** The phone's ESC button, which stays over the open map, in view units (null when it is not shown). */
  private mapAvoid() {
    const b = document.querySelector<HTMLElement>('#touch button[data-key="Escape"]');
    const br = b?.getBoundingClientRect(), r = this.canvas.getBoundingClientRect();
    if (!br || !br.width || !r.width) return null;
    const f = this.canvas.width / r.width / this.k;
    return { x: (br.left - r.left) * f, y: (br.top - r.top) * f, w: br.width * f, h: br.height * f };
  }

  /** The pointer on the open map (citymap.ts reads it: districts, places, pads, back, outside). */
  private mapPointer(e: PointerEvent, press: boolean) {
    const r = this.canvas.getBoundingClientRect();
    const px = ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.k, py = ((e.clientY - r.top) * (this.canvas.height / r.height)) / this.k;
    const { act, pointer } = mapPointer(this.mapState(), this.viewW, this.viewH, px, py, press, e.pointerType === 'mouse');
    this.canvas.style.cursor = pointer ? 'pointer' : '';
    if (press) e.preventDefault();
    this.mapAct(act);
  }

  /** Quick travel to a place you know, from the map: no fare, a short fade; or say why not. */
  private quickTravel(place: MapPlace) {
    if (hackLocked(this.save.flags)) { this.flash('not now: ' + (pick(OPENING_GOAL, this.story, this.here) ?? 'later')); sound.denied(); return; }
    const why = placeBlocked(place, this.mapState());
    if (why) { this.flash(why.toLowerCase()); sound.denied(); return; }
    this.mapView = null;
    this.canvas.style.cursor = '';
    this.hop = { place, start: this.clock, done: false };
    sound.close();
  }

  /** Flights land; on board, the train stands, closes its doors, runs to the next stop on the loop and opens them (line.ts). */
  private updateTravel(dt: number) {
    // the harbor lock: LINE 0 stops there only once P14 is solved
    lineOpen.harbor = harborOpen(this.save.flags);
    if (this.flight && this.clock - this.flight.start >= FLIGHT) {
      const to = this.flight.to;
      this.flight = null;
      this.travel(STANDS[to].scene, 'taxi');
      this.flash('-' + FARE + ' token · ' + STANDS[to].name);
    }
    // a quick trip moves you while the screen is dark, half way through its fade
    if (this.hop) {
      const e = this.clock - this.hop.start;
      if (!this.hop.done && e >= HOP / 2) { this.hop.done = true; this.travel(this.hop.place.entrance, this.hop.place.at); }
      if (e >= HOP) this.hop = null;
    }
    if (this.here !== 'train') return;
    const ev = stepRide(dt);
    // the train home stands at Downtown with its doors open until you get off
    if (this.story === 'home' && ride.phase === 'dwell' && rideStop() === 'downtown') ride.timer = 0;
    if (ev === 'depart') { this.flash('NEXT: ' + STATIONS[rideNext()].name); sound.close(); }
    else if (ev === 'arrive') { this.flash(STATIONS[rideStop()].name + ' · doors open'); sound.open(); }
    else if (ev === 'pass') this.flash('HARBOR · STATION CLOSED · NOT STOPPING');
  }

  /** The city map when it is open, and the fade of a quick trip (dark in the middle, with where you are going). */
  private drawMap() {
    if (this.hop) {
      const x = this.x, f = (this.clock - this.hop.start) / HOP;
      x.fillStyle = 'rgba(0,0,0,' + Math.min(1, 1.2 - Math.abs(f * 2 - 1) * 1.2) + ')'; x.fillRect(0, 0, this.viewW, this.viewH);
      if (f > 0.3 && f < 0.7) { x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,217,165,.85)'; x.fillText('> ' + this.hop.place.name, this.viewW / 2, this.viewH / 2); x.restore(); }
    }
    if (this.mapView) drawCityMap(this.x, this.viewW, this.viewH, this.mapState());
  }
}

/**
 * The camera nudge: how long it leans towards an event (clock frames, ~1.6 s), how gently it moves
 * (ease per frame, against the follow's 0.12), the margin kept round the event and the player (world
 * units), and the least time between two nudges (frames, ~5 s).
 */
const NUDGE_HOLD = 96, NUDGE_EASE = 0.045, NUDGE_MARGIN = 36, NUDGE_GAP = 300;

/** Street walls measured against the player (42 units tall): a 76-unit ground floor with 52-unit doors, then 66-unit storeys of 14x28 windows. */
const GROUND = 76, STOREY = 66, WIN_PITCH = 30;

/** Wall covered by the signs, the billboard and the noodle stall, kept free of windows so they sit on plain wall: [x0, x1, h0, h1]. */
const SIGN_WALLS: [number, number, number, number][] = [
  [358, 386, 64, 164], // VERIFY
  [40, 140, 90, 110], // < NEON MARKET
  [858, 952, 94, 114], // OPEN 24/7/365.25
  [1727, 1813, 100, 120], // SPACEPORT >
  [574, 706, 106, 160], // billboard and its lamps
  [720, 880, 60, 142], // noodle stall and its NOODLES plate
  [1448, 1496, 70, 100], // METRO plate on its post
  [1880, 1946, 88, 114], // SKY TAXI plate on its pole
];
const onSignWall = (x0: number, x1: number, h0: number, h1: number) =>
  SIGN_WALLS.some(([a, b, c, d]) => x0 < b && x1 > a && h0 < d && h1 > c);
