/**
 * ACCESS DENIED, the engine: input, movement, camera and drawing for the
 * side-scrolling street. What people say, the fixer and the terminal live in
 * level.ts. Downtown's machines (downtown/) and the fixer's back yard (yard/)
 * and the player's flat (capsule/, where a new game starts)
 * are zones on the hacking system (schematics of nouns and verbs, the zone
 * engine in zone/): this file hosts them, draws the street around them and
 * hands them taps, E, H (hack vision) and B (the board).
 * Pixel the robot cat, who follows you once you leave the flat, is companion.ts.
 *
 * The canvas fills the landing page's window between its header and footer and
 * is drawn at an integer pixel scale so the sprites stay crisp.
 */

import { sound } from './audio';
import { drawSprite, GLOW_THEM, GLOW_YOU, HULL, SPR, type Sprite } from './sprites';
import { type LineKind, Terminal } from './terminal';
import { PARCEL, YARD_SPAWN, YARD_W, YARD_ZONE } from './yard';
import { CAPSULE_SPAWN, CAPSULE_W, CAPSULE_ZONE, capsulePerch, DOOR_X as CAPSULE_DOOR_X } from './capsule';
import { Companion, WARM } from './companion';
import { MOTH_KEY, MOTH_SPAWN, MOTH_W, MOTH_ZONE } from './moth';
import { BEACH_EDGE_X, BEACH_SPAWN, BEACH_W, BEACH_ZONE } from './beach';
import { downtownZone, MAP_KIOSK_X, reconcile, syncGoals, zoneShell } from './downtown';
import { type ZoneDef, ZoneHost } from './zone';
import { isSceneId, sceneById, SCENES, type Scene, type SceneId, type SceneReadable, type SceneUse, type SceneView } from './scenes';
import { CutscenePlay, cutsceneById, isCutsceneId, type CutsceneId } from './cutscenes';
import { botReact, isBot, personHeight, personX, talkTo, type Person } from './people';
import {
  boardRide, nextStation, platformDoors, platformLeft, platformOpen, platformSync, rideLeft, rideNext, rideOpen, rideRun, rideStop, stepRide, STOP, TIMETABLE,
} from './scenes/line';
import {
  DOORS, drawCityMap, HOP, PLACES, placeAt, placeBlocked, type Place, EDGES, drawFlight, drawMetroStairs, drawTaxiPad, DRIVER_BROKE, FARE, FLIGHT, isDoorId,
  seenFlag, START_ZONE, STAND_IDS, standOf, STANDS, STATIONS, stationAt, type DoorId, type MapState, type Stand, type Station, type Zone,
} from './city';
import { KeyBar } from './keybar';
import { levels, SUDO, unlockAll } from './sudo';
import { Menu } from './menu';
import {
  commands, FRONTS, fixerTalk, LEVEL_W, loadSave, NO_ARGS, NPCS, npcTalk, nodeCount, PLATFORMS,
  newSave, ownedModules, READABLES, run, SPAWN_X, STALL, storeSave, suggest, who, type Ctx, type Save,
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

/** A place's life (scenes and zones alike, scenes/kit.ts): its people, things to do and things to read. */
type Life = { people?: Person[]; uses?: SceneUse[]; readables?: SceneReadable[] };
/** The zones hosted on the hacking engine besides Downtown. */
type Hosted = 'yard' | 'capsule' | 'moth' | 'beach';
const isHosted = (z: string): z is Hosted => z === 'yard' || z === 'capsule' || z === 'moth' || z === 'beach';

type Target = { kind: 'talk' | 'zone' | 'read' | 'door' | 'map' | 'scene' | 'pet'; id: string; x: number; h: number; label: string; promptH?: number };
/** Downtown's doors, stairs and pad as targets (the market gate's door only once the gate is open). */
const DOOR_TARGETS: { id: DoorId; label: string; promptH: number }[] = [
  { id: 'market', label: '[E] NEON MARKET', promptH: 120 },
  { id: 'shop', label: '[E] CORNER SHOP', promptH: 84 },
  { id: 'yard', label: '[E] BACK YARD', promptH: 86 },
  { id: 'capsule', label: '[E] HOME · CAPSULE 7B', promptH: 84 },
  { id: 'metro', label: '[E] METRO', promptH: 106 },
  { id: 'moth', label: '[E] FLAT 4C · MOTH', promptH: 102 },
  { id: 'taxi', label: '[E] HAIL TAXI', promptH: 122 },
];
/** A speech bubble; `then` runs once its last page is read (the fixer's question opens the deck). */
interface Bubble { name: string; pages: string[]; page: number; chars: number; x: number; h: number; then?: () => void }
interface Ship { sprite: Sprite; ps: number; y: number; speed: number; offset: number; flip: boolean; depth: number }

const O = '255,136,0', C = '0,255,255';
/** The door to the fixer's back yard, in the alley past the noodle stall (clear of the till and the man in the hat). */
const YARD_DOOR_X = DOORS.yard;

/** Small seeded random, so the city looks the same on every visit. */
const rng = (seed: number) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

export interface GameHost {
  windowEl: HTMLElement;
  header: HTMLElement;
  footer: HTMLElement;
  inputHost: HTMLElement;
  onExit: () => void;
  setNodes: (n: number) => void;
  setZone: (text: string) => void;
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
  private zone: Zone = 'downtown';
  /** Every key and what it does, along the top. */
  private keyBar: KeyBar;
  private yard: ZoneHost;
  /** Capsule 7B, the player's flat. */
  private capsule: ZoneHost;
  /** Moth's place, flat 4C (story Level 3): FRIENDNET, MOTH-PC, the song seal. */
  private moth: ZoneHost;
  /** The beach and SALT, its bar: devices on the engine, people and things to do from the place kit. */
  private beach: ZoneHost;
  /** Pixel the robot cat: at home in the flat, at your heels outside once you have left it (`flags.pixel`). */
  private pixel = new Companion();
  private started = false;
  /** Downtown's machines, on the zone engine (downtown/). Its progress is mostly the save's own fields. */
  private downtown: ZoneHost;
  /** Frames since the game started; runs even with reduced motion (rides and flights are timed on it). */
  private clock = 0;
  /** The city map overlay, when open: just looking (TAB, the line map in the train), or picking a taxi stand. */
  private mapView: { mode: 'view' | 'taxi'; options: string[]; index: number; hover: number } | null = null;
  /** A quick trip from the map in progress: a short fade out, the move, a fade in (HOP frames). */
  private hop: { place: Place; start: number; done: boolean } | null = null;
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

    this.yard = this.hostZone(YARD_ZONE);
    this.yard.onClose = () => this.canvas.focus();
    this.capsule = this.hostZone(CAPSULE_ZONE);
    this.capsule.onClose = () => this.canvas.focus();
    this.moth = this.hostZone(MOTH_ZONE);
    this.moth.onClose = () => this.canvas.focus();
    this.beach = this.hostZone(BEACH_ZONE);
    this.beach.onClose = () => this.canvas.focus();
    // the fixer's parcel holds Moth's key chip and uplink.so: a save that took it before they were in it gets them now
    if (this.yard.model.get('parcelAt') === 'taken') PARCEL.forEach((k) => { if (!this.save.keyring.includes(k)) this.save.keyring.push(k); });
    this.downtown = this.hostZone(downtownZone({
      save: () => this.save,
      persist: () => this.persist(),
      nodes: () => nodeCount(this.save),
      granted: () => sound.granted(),
      end: () => { this.showEnd = true; },
    }), (text, kind) => this.zonePrint(text, kind));
    this.downtown.onClose = () => this.canvas.focus();
    // older saves kept Downtown in their own fields: the zone agrees with them (nothing is lost)
    reconcile(this.downtown.model, this.save);
    this.keyBar = new KeyBar(host.windowEl, () => this.canvas.focus());
    // each zone host has its own HACK/BOARD strip; only the current zone's shows
    host.windowEl.querySelectorAll<HTMLElement>('#zone-btns').forEach((el) => this.keyBar.adopt(el));
    this.menu = new Menu(host.windowEl, {
      save: () => this.save,
      zone: () => ({ id: this.zone, name: this.zoneName() }),
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

  /** A zone on the hacking system, with its part of the save (`save.zones.<id>`) and the player's modules and keyring. */
  private hostZone(def: ZoneDef, print: (text: string, kind?: LineKind) => void = (text, kind) => this.term.print(text, kind)) {
    const id = def.data.id;
    return new ZoneHost(this.host.windowEl, print, {
      modules: () => this.save.modules,
      keyring: () => this.save.keyring,
      give: (k) => { if (!this.save.keyring.includes(k)) this.save.keyring.push(k); storeSave(this.save); },
      // zone steps that hand out modules and tokens (GAME-DATA.md, "Giving things")
      grant: (mod) => { if (!this.save.modules.includes(mod)) this.save.modules.push(mod); storeSave(this.save); this.syncHud(); },
      tokens: (n) => { this.save.tokens += n; storeSave(this.save); this.syncHud(); return this.save.tokens; },
      drop: () => storeSave(this.save),
      sudo: SUDO,
      load: () => this.save.zones[id],
      store: (z) => { this.save.zones[id] = z; storeSave(this.save); },
    }, def);
  }

  /** Downtown's lines in the deck: ACCESS DENIED and friends buzz, as the old terminal did. */
  private zonePrint(text: string, kind?: LineKind) {
    this.term.print(text, kind);
    if (kind === 'err') sound.denied();
  }

  /** The zone on the hacking system the player is in (Downtown, the yard, the flat), if any. */
  private get zoneHost(): ZoneHost | null { return this.zone === 'yard' ? this.yard : this.zone === 'capsule' ? this.capsule : this.zone === 'moth' ? this.moth : this.zone === 'beach' ? this.beach : this.zone === 'downtown' && !this.scene ? this.downtown : null; }
  private get zoneHosts() { return [this.yard, this.capsule, this.moth, this.beach, this.downtown]; }

  /** Write the save, refresh the HUD and Downtown's goals (they follow the save's fields). */
  private persist() {
    storeSave(this.save);
    this.syncHud();
    syncGoals(this.downtown.model, this.save);
  }

  // ---------- lifecycle ----------

  start(zone?: Hosted | SceneId | CutsceneId) {
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
    if (zone && isCutsceneId(zone)) { this.playCutscene(zone); return; }
    // a save that has never been Downtown starts at home: a new one with the intro first
    const first = !this.started;
    this.started = true;
    if (!zone && first && !this.save.flags.arrived && !this.save.flags[seenFlag('downtown')]) {
      if (!this.save.flags[seenFlag(START_ZONE)]) { this.playCutscene('intro'); return; }
      zone = START_ZONE;
    }
    if (zone && isHosted(zone) && this.zone !== zone) this.goTo(zone, true);
    else if (zone && isSceneId(zone) && this.zone !== zone) this.enterScene(zone, true);
    this.showZones();
    this.markSeen(this.zone);
    this.greet();
  }

  /** First time in Downtown: the player says where they are (and, once, how its machines open now). */
  private greet() {
    if (this.zone !== 'downtown') return;
    const how = this.touch
      ? 'Every machine here has a schematic: tap it. HACK, top right, shows them all.'
      : 'Every machine here has a schematic: E or a tap opens it. H shows them all, B is the board.';
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

  /** The HACK and BOARD buttons belong to the zone you are in. */
  private showZones() {
    const here = this.zoneHost;
    this.zoneHosts.forEach((h) => h.show(h === here));
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
    this.zoneHosts.forEach((h) => { h.closeAll(); h.persist(); });
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
    // Small screens (phones in landscape) show a shorter slice of the street at a larger scale.
    let k = Math.max(1, Math.floor((cssH * dpr) / (cssH < 420 ? 230 : 320)));
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
    if (!this.reduced || this.t < 1) this.t += dt;
    this.clock += dt;
    this.update(dt);
    this.draw();
    if (this.zoneHost) this.followZone();
    this.raf = requestAnimationFrame((n) => this.loop(n));
  }

  // ---------- input ----------

  private onKeyDown(e: KeyboardEvent) {
    if (this.cut) { e.preventDefault(); if (!e.repeat) this.cut.skip(); return; }
    if (this.menu.open) { if (!this.term.focused) this.menu.key(e); return; }
    if (this.term.focused) return;
    if (this.flight || this.hop) { e.preventDefault(); return; }
    if (this.mapView) { this.mapKey(e); return; }
    const zh = this.zoneHost;
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
    if (zh && (k === 'b' || k === 'B')) { zh.toggleBoard(); return; }
    if (zh && (k === 'h' || k === 'H')) { zh.toggleVision(); return; }
    if (k === 'e' || k === 'E') { this.interact(); return; }
    // walking up into an open train door (or out of one) is the same as E there
    if ((k === 'ArrowUp' || k === 'w' || k === 'W') && !this.bubble && this.walkThroughDoor()) return;
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
    const at = this.termMachine();
    if (at) this.term.print('[' + (this.zoneHost?.model.devices.get(at)?.name ?? at) + '] the deck talks to it · ls, cat, login, use', 'dim');
    this.term.focus();
  }

  /** The machine the deck talks to: the zone device whose schematic is open, else the one you stand at. */
  private termMachine(): string | null {
    const zh = this.zoneHost;
    if (!zh || this.scene) return null;
    if (zh.viewing) return zh.viewing;
    const t = this.nearest();
    return t?.kind === 'zone' && zh.model.devices.has(t.id) ? t.id : null;
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
    if (this.zone === 'yard') this.yard.persist();
    storeSave(this.save);
    this.menu.show();
  }

  /** The zone's name as the HUD shows it: DOWNTOWN, BACK YARD, a scene's name. */
  private zoneName() {
    return this.scene ? this.scene.name.toUpperCase() : this.zone === 'yard' ? 'BACK YARD' : this.zone === 'moth' ? "MOTH'S PLACE" : this.zone === 'beach' ? 'THE BEACH' : 'DOWNTOWN';
  }

  /** NEW GAME (confirmed in the menu): a fresh save, slots untouched, the intro, then the start zone. */
  private newGame() {
    this.term.close();
    this.term.clear();
    this.bubble = null;
    this.showEnd = false;
    this.toast = null;
    this.save = SUDO ? unlockAll(newSave()) : newSave();
    // every zone's runtime back to a first visit, written into the new save (Downtown then agrees with its fields)
    this.zoneHosts.forEach((h) => h.reset());
    reconcile(this.downtown.model, this.save);
    storeSave(this.save);
    this.syncHud();
    this.playCutscene('intro', () => this.handTo(START_ZONE));
  }

  private flash(text: string) { this.toast = { text, until: this.t + 110 }; }
  /** Phones have no terminal: its latest line shows in the game for a few seconds. */
  private termLine: { text: string; kind: LineKind; until: number } | null = null;

  private get levelW() { return this.scene?.width ?? (this.zone === 'yard' ? YARD_W : this.zone === 'capsule' ? CAPSULE_W : this.zone === 'moth' ? MOTH_W : this.zone === 'beach' ? BEACH_W : LEVEL_W); }
  /** The place's name, for the HUD and the canvas label. */
  private get placeName() { return this.scene?.name ?? (this.zone === 'yard' ? 'the back yard' : this.zone === 'capsule' ? 'Capsule 7B' : this.zone === 'moth' ? "Moth's place" : this.zone === 'beach' ? 'the beach' : 'Downtown'); }
  private get platforms() { return this.zone === 'downtown' ? PLATFORMS : []; }

  /**
   * Go to Downtown, the fixer's back yard or your flat. In Downtown you land in
   * front of door `at` (default: the yard's); in the flat at its door when you
   * come from Downtown (`at` 'downtown'), else by the bed.
   */
  private goTo(zone: 'downtown' | Hosted, quiet = false, at?: string) {
    this.zoneHost?.persist();
    this.zoneHosts.forEach((h) => h.closeAll());
    this.bubble = null;
    this.zone = zone;
    this.showZones();
    this.markSeen(zone);
    const x = zone === 'yard' ? YARD_SPAWN : zone === 'capsule' ? (at === 'downtown' ? CAPSULE_DOOR_X + 20 : CAPSULE_SPAWN) : zone === 'moth' ? MOTH_SPAWN : zone === 'beach' ? (at === 'harbor' ? BEACH_EDGE_X : BEACH_SPAWN) : at && isDoorId(at) ? DOORS[at] : YARD_DOOR_X;
    Object.assign(this.p, { x, y: 0, vy: 0, onGround: true, face: zone === 'capsule' ? (at === 'downtown' ? 1 : -1) : zone === 'moth' ? 1 : this.p.face });
    this.cam = Math.max(0, Math.min(this.levelW - this.viewW, this.p.x - this.viewW * 0.45));
    if (this.levelW < this.viewW) this.cam = (this.levelW - this.viewW) / 2;
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + this.placeName);
    this.syncHud();
    if (!quiet) sound.open();
    // Pixel: at home in the flat (coming in behind you, or already asleep there), at your heels elsewhere
    if (zone === 'capsule') {
      const home = capsulePerch(this.capsule.model);
      if (at === 'downtown' && this.save.flags.pixel) this.pixel.place(x - 14, 0, 'walk', 1);
      else this.pixel.place(home.x, home.h, home.rest);
    } else if (this.save.flags.pixel) this.pixel.place(x - this.p.face * 20, 0, 'sit', this.p.face);
    if (zone === 'capsule' && !this.save.flags.capsule) {
      this.save.flags.capsule = true;
      storeSave(this.save);
      this.say('YOU', [
        'Capsule 7B. Home: four walls, one window, rent "pending".',
        "Door's locked, the router's dark, and Pixel is asleep on the bed, as is tradition.",
        this.touch
          ? 'Everything here has a schematic: tap a thing to open it. HACK, top right: hack vision. BOARD: wire things up.'
          : 'Everything here has a schematic: tap a thing to open it. H: hack vision. B: the board, to wire things up.',
      ], this.p.x, 46);
    }
    if (zone === 'moth' && !this.save.flags.moth) {
      this.save.flags.moth = true;
      storeSave(this.save);
      this.say('YOU', [
        "Moth's place. Lights on, record playing, nobody home.",
        'Takeaway boxes, a thirsty plant, a fish. Moth left in a hurry. Or Moth always lives like this. Both, probably.',
        "Moth's computer is the way in. It always is.",
      ], this.p.x, 46);
    }
    if (zone === 'beach' && !this.save.flags.beach) {
      this.save.flags.beach = true;
      storeSave(this.save);
      this.say('YOU', [
        'A beach. A real one: sand, sea, a sunset nobody is charging for. Yet.',
        "SALT, the bar on stilts, is open. And at the end of the pier there's a boat. Moth's status said \"gone fishing\".",
      ], this.p.x, 46);
    }
    if (zone === 'yard' && !this.save.flags.yard) {
      this.save.flags.yard = true;
      storeSave(this.save);
      this.say('YOU', [
        "The fixer's back yard. My parcel is in here somewhere.",
        'Everything here has a schematic. Tap a thing to open it.',
        this.touch
          ? 'HACK, top right: hack vision, every device and its guts at once. BOARD: wire them up, add timers and switches.'
          : 'H: hack vision, every device and its guts at once. B: the board, to wire them up and add timers and switches.',
      ], this.p.x, 46);
    }
  }

  /** In a zone (Downtown, the yard, the flat), tap or click a thing to open its schematic (in hack vision: its verbs); hovering lights it up. */
  private onCanvasPointer(e: PointerEvent, press: boolean) {
    if (this.cut) { if (press) { e.preventDefault(); this.cut.skip(); } return; }
    // a click or tap moves a speech bubble on, the same as E
    if (press && this.bubble) { e.preventDefault(); this.interact(); return; }
    if (this.mapView) { this.mapPointer(e, press); return; }
    // in a scene, a tap on someone or something within reach is E on it
    if (press && this.scene) { this.tapLife(e); return; }
    const zh = this.zoneHost;
    if (!zh || zh.overlayOpen || this.mapView || this.flight) return;
    const r = this.canvas.getBoundingClientRect();
    const wx = ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.k + this.cam;
    const h = this.gy - ((e.clientY - r.top) * (this.canvas.height / r.height)) / this.k;
    const id = zh.spotAt(wx, h);
    zh.hover = id;
    this.canvas.style.cursor = id ? 'pointer' : '';
    if (press && zh.visionOn) { zh.poke(id); return; }
    // a thing's popup: its everyday actions, then jack in (computers) and hack it
    if (press && id) { e.preventDefault(); zh.pick(id); return; }
    // a zone with a place's life (the beach): a tap on someone within reach is E on them
    if (press) this.tapLife(e);
  }

  /** A tap on someone or something of the place's life (a person, a use, a readable) within reach: E on it. */
  private tapLife(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect(), wx = ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.k + this.cam;
    const t = this.targets().find((z) => z.kind === 'scene' && Math.abs(z.x - wx) < 18 && Math.abs(z.x - this.p.x) < 60);
    if (t) { e.preventDefault(); this.useScene(t.id); }
  }

  /** The life of the place you are in: a scene's, or a zone's own (ZoneView `people`, `uses`, `readables`). */
  private get life(): Life | undefined { return this.scene ?? this.zoneHost?.def.view; }

  /** Hack vision hangs in the world: give the zone this frame's world → CSS px mapping (as `sx` and `y` draw it). */
  private followZone() {
    const s = (this.k * this.canvas.clientWidth) / this.canvas.width;
    this.zoneHost!.follow((wx, h) => ({ x: Math.round(wx - this.cam) * s, y: (this.gy - h) * s }), this.canvas.clientWidth, { x: this.p.x, h: this.p.y });
  }

  // ---------- world logic ----------

  private ctx(): Ctx {
    const zh = this.zoneHost;
    return {
      save: this.save,
      machine: this.termMachine(),
      shell: zh ? zoneShell(zh, zh === this.downtown ? (text, kind) => this.zonePrint(text, kind) : (text, kind) => this.term.print(text, kind)) : null,
      print: (text, kind) => this.term.print(text, kind),
      denied: () => sound.denied(),
      granted: () => sound.granted(),
      toggleSound: () => sound.toggle(),
      clear: () => this.term.clear(),
      leaveMachine: () => this.term.close(),
      persist: () => this.persist(),
      resetYard: () => this.yard.reset(),
    };
  }

  private syncHud() {
    this.host.setNodes(nodeCount(this.save));
    this.host.setZone(this.placeName.replace(/^the /, '').toUpperCase() + ' · ' + who(this.save).toUpperCase());
  }

  private targets(): Target[] {
    if (this.scene) return this.sceneTargets(this.scene);
    // a zone's things: you reach each from the street, or from the ledge under it (the relay, from the low roof)
    const stand = (x: number, y = 0) => Math.max(0, ...this.platforms.filter((p) => x > p.x && x < p.x + p.w && p.h <= y).map((p) => p.h));
    const zoneTargets = (zh: ZoneHost) => zh.targets().map((t) => ({ kind: 'zone' as const, id: t.id, x: t.x, h: stand(t.x, t.y), label: t.label, promptH: t.promptH }));
    // Pixel can always be petted, wherever it is with you
    const pet: Target[] = this.pixelHere ? [{ kind: 'pet', id: 'pixel', x: this.pixel.x, h: 0, label: '[E] PET PIXEL', promptH: this.pixel.h + 24 }] : [];
    if (this.zone === 'yard') return [...zoneTargets(this.yard), ...pet];
    if (this.zone === 'capsule') return [...zoneTargets(this.capsule), ...pet];
    if (this.zone === 'moth') return [...zoneTargets(this.moth), ...pet];
    // a zone with a place's life (people, things to do): the same targets a scene's would have
    if (this.zone === 'beach') return [...zoneTargets(this.beach), ...this.lifeTargets(this.beach.def.view), ...pet];
    const list: Target[] = [...pet], gateOpen = !!this.save.flags.end;
    for (const d of DOOR_TARGETS) if (d.id !== 'market' || gateOpen) list.push({ kind: 'door', id: d.id, x: DOORS[d.id], h: 0, label: d.label, promptH: d.promptH });
    NPCS.forEach((n) => list.push({ kind: 'talk', id: n.id, x: n.x, h: 0, label: '[E] TALK' }));
    list.push({ kind: 'talk', id: 'fixer', x: STALL.fixerX, h: 0, label: '[E] TALK' });
    list.push({ kind: 'map', id: 'map', x: MAP_KIOSK_X, h: 0, label: '[E] CITY MAP', promptH: 92 });
    // Once Downtown is cleared the gate stands open: the market's door takes the gate's place.
    list.push(...zoneTargets(this.downtown).filter((t) => t.id !== 'gate' || !gateOpen));
    READABLES.forEach((r) => list.push({ kind: 'read', id: r.id, x: r.x, h: r.h, label: '[E] READ' }));
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
    if (target.kind === 'scene') { this.useScene(target.id); return; }
    if (target.kind === 'zone') { if (this.zoneHost?.use(target.id) === 'exit') this.leaveZone(); return; }
    if (target.kind === 'door') { this.useDoor(target.id as DoorId); return; }
    if (target.kind === 'map') { sound.open(); this.showMap(); return; }
    if (target.kind === 'pet') { sound.blip(); this.say('PIXEL', this.pixel.pet(), this.pixel.x, this.pixel.h + 14); return; }
    if (target.kind === 'talk') {
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
    } else if (target.kind === 'read') {
      const r = READABLES.find((z) => z.id === target.id)!;
      this.say('SIGN', r.pages, r.x, 70);
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
    const locked = this.showEnd || this.term.focused || !!this.zoneHost?.overlayOpen || !!this.mapView || !!this.flight || !!this.hop;
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

    // Camera follows, eased, clamped to the level.
    const goal = Math.max(0, Math.min(this.levelW - this.viewW, p.x - this.viewW * 0.45));
    this.cam += (goal - this.cam) * Math.min(1, 0.12 * dt);
    if (this.levelW < this.viewW) this.cam = (this.levelW - this.viewW) / 2;
    if (this.pixelHere) this.pixel.update(dt, { px: p.x, face: p.face, moving: p.moving, perch: this.zone === 'capsule' ? capsulePerch(this.capsule.model) : null, warm: WARM[this.zone] });
    this.host.setNodes(nodeCount(this.save));
  }

  /** Pixel is drawn in the flat, and in Downtown and the yard once it follows you. */
  private get pixelHere() { return this.zone === 'capsule' || (!!this.save.flags.pixel && (this.zone === 'downtown' || this.zone === 'yard' || this.zone === 'moth' || this.zone === 'beach')); }

  /** E on a zone's way out: the yard's back to its alley; the flat's door down to your building's lobby, with Pixel. */
  private leaveZone() {
    if (this.zone === 'capsule') {
      this.save.flags.pixel = true;
      storeSave(this.save);
      this.goTo('downtown', false, 'capsule');
      this.greet();
      return;
    }
    // Moth's flat: back out onto the street, in front of the building's door
    if (this.zone === 'moth') { this.goTo('downtown', false, 'moth'); return; }
    // the beach: the stairs up to the promenade, and the harbor
    if (this.zone === 'beach') { this.travel('harbor'); return; }
    this.goTo('downtown');
  }

  // ---------- drawing ----------

  private sx(worldX: number, parallax = 1) { return Math.round(worldX - this.cam * parallax); }
  private y(h: number) { return this.gy - h; }

  private draw() {
    const x = this.x, k = this.k;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#000';
    x.fillRect(0, 0, this.viewW, this.viewH);
    const rain = this.rainLevel();
    if (this.flight) { drawFlight(x, this.viewW, this.viewH, Math.min(1, (this.clock - this.flight.start) / FLIGHT), this.clock, STANDS[this.flight.to].name); return; }
    if (this.scene) { this.drawScene(this.scene, rain); this.drawMap(); return; }

    // hack vision, on any zone: the world goes muted, what you can use (and you) stays bright
    const vision = !!this.zoneHost?.visionOn;
    if (this.zone === 'yard') {
      // Boxed in by the backs of houses: no city behind the yard, it draws its own walls.
      this.drawStreet(rain);
      const v = { sx: (wx: number) => this.sx(wx), y: (h: number) => this.y(h), t: this.t, viewW: this.viewW, viewH: this.viewH };
      // Hack vision: the world (rain too) goes muted into the background; the devices and you stay bright on top.
      if (vision) { this.yard.draw(x, v, 'world'); this.drawRain(rain); this.mute(); this.yard.draw(x, v, 'devices'); }
      else this.yard.draw(x, v);
    } else if (this.zone === 'capsule' || this.zone === 'moth' || this.zone === 'beach') {
      // Indoors: the flat draws everything, the building around it included.
      this.zoneHost!.draw(x, { sx: (wx) => this.sx(wx), y: (h) => this.y(h), t: this.t, viewW: this.viewW, viewH: this.viewH });
    } else {
      this.drawSky();
      this.drawShips();
      this.drawSkyline(0.18, 7, 70, 150, 0.18, 0.12);
      this.drawAntenna();
      this.drawSkyline(0.45, 19, 50, 120, 0.3, 0.18);
      this.drawFronts();
      this.drawStreet(rain);
      this.downtown.draw(x, { sx: (wx) => this.sx(wx), y: (h) => this.y(h), t: this.t, viewW: this.viewW, viewH: this.viewH });
      this.drawStands();
    }
    // zones that draw in one pass (the flat, Downtown): mute round their devices' frames
    if (vision && this.zone !== 'yard') { if (this.zone !== 'capsule' && this.zone !== 'moth' && this.zone !== 'beach') this.drawRain(rain); this.mute(this.zoneHost!.model.spots()); }
    this.drawPeople();
    if (this.zone !== 'capsule' && this.zone !== 'moth' && this.zone !== 'beach' && !vision) this.drawRain(rain);
    this.drawPrompt();
    this.drawBubble();
    this.drawHud();
    if (this.showEnd) this.drawEnd();
    this.drawMap();
  }

  private rainLevel() {
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
    this.neon('OPEN 24/7/365.25', this.sx(905), this.y(104), O, { size: 8, phase: 160 });
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

  /** On the street, in front of the fronts: the metro stairs and the sky-taxi pad. */
  private drawStands() {
    const v = this.view();
    drawMetroStairs(this.x, v, DOORS.metro);
    drawTaxiPad(this.x, v, DOORS.taxi);
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

  private drawStreet(rain: number) {
    const x = this.x, gy = this.gy;
    x.fillStyle = '#030201'; x.fillRect(0, gy, this.viewW, this.viewH - gy);
    x.fillStyle = 'rgba(255,136,0,.55)'; x.fillRect(0, gy, this.viewW, 1);
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,100,0,' + (0.16 - i * 0.024) + ')'; x.fillRect(0, gy + 6 + i * i * 2 + i * 4, this.viewW, 1); }
    // The noodle stall's lamps pool warm light on the wet street in front of it.
    const s0 = this.sx(STALL.x);
    if (this.zone !== 'yard' && s0 + STALL.w + 20 > 0 && s0 - 20 < this.viewW) {
      const pool = x.createLinearGradient(0, gy, 0, gy + 34);
      pool.addColorStop(0, 'rgba(255,160,70,' + (0.18 + rain * 0.06) + ')'); pool.addColorStop(1, 'rgba(255,160,70,0)');
      x.fillStyle = pool; x.fillRect(s0 - 10, gy + 1, STALL.w + 20, 34);
    }
    // Neon smeared into the wet street.
    const smears: [number, string][] = [[372, C], [STALL.x + STALL.w / 2, C], [640, '255,90,110'], [90, C], [1770, O], [905, O], [DOORS.metro + 31, C], [DOORS.taxi - 18, C], [DOORS.shop, C]];
    for (const [wx, col] of this.zone === 'yard' ? [] : smears) {
      const sx = this.sx(wx);
      if (sx < -20 || sx > this.viewW + 20) continue;
      for (let i = 0; i < 10; i++) {
        const wob = Math.sin(this.t * 0.05 + i) * (1 + rain * 2);
        x.fillStyle = 'rgba(' + col + ',' + (0.05 + rain * 0.05) * (1 - i / 10) + ')';
        x.fillRect(sx - 6 + wob, gy + 3 + i * 4, 12, 3);
      }
    }
  }

  private drawPeople() {
    const x = this.x, p = this.p;
    if (this.zone === 'downtown') this.drawStallPeople();
    if (this.pixelHere) this.pixel.draw(x, (wx) => this.sx(wx), (h) => this.y(h), this.t);
    // jacked in: a Downtown machine's schematic is open and you stand at it, so the deck's cable runs to it
    const open = this.zone === 'downtown' ? this.downtown.viewing : null;
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
    if (this.bubble || this.showEnd || this.zoneHost?.overlayOpen || this.zoneHost?.popupOpen || this.mapView) return;
    const t = this.nearest();
    if (!t) return;
    const x = this.x;
    x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center';
    x.fillStyle = 'rgba(0,255,255,.95)'; x.shadowColor = 'rgba(0,255,255,.8)'; x.shadowBlur = 6;
    const h = t.promptH ?? (t.kind === 'read' ? 160 : t.id === 'fixer' ? 66 : 62);
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

  private drawBubble() {
    const b = this.bubble;
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
    x.fillStyle = '#000'; x.fillRect(bx, by, w, h);
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(bx + 1, by + 1, w - 2, h - 2); x.lineWidth = 1;
    x.fillStyle = b.name === 'YOU' ? '#7ff' : '#ffd9a5'; x.fillText(b.name === 'YOU' ? who(this.save).toUpperCase() : b.name, bx + 10, by + 15);
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
    x.fillStyle = 'rgba(255,136,0,.85)'; x.fillText(this.placeName.replace(/^the /, '').toUpperCase(), 8, top + 10);
    x.fillStyle = 'rgba(255,217,165,.7)';
    x.fillText('TOKENS ' + s.tokens + ' · MODULES ' + (ownedModules(s).join(' ') || '-') + (SUDO ? ' · SUDO' : ''), 8, top + 21);
    const zh = this.scene ? null : this.zoneHost;
    if (zh) { x.fillStyle = 'rgba(255,61,242,.9)'; x.fillText('GOAL ' + zh.objective(), 8, top + 32); }
    // the keys and what they do: the key bar along the top (keybar.ts)
    const tl = this.termLine;
    if (tl && this.t < tl.until && !this.term.focused) {
      x.fillStyle = tl.kind === 'err' ? 'rgba(255,90,110,.95)' : tl.kind === 'ok' ? 'rgba(34,197,94,.95)' : 'rgba(255,217,165,.85)';
      x.fillText(tl.text.length > 90 ? tl.text.slice(0, 89) + '…' : tl.text, 8, top + (zh ? 43 : 32));
    }
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

  // ---------- cutscenes (cutscenes/) ----------
  // While one plays, the zone's update and draw are skipped entirely; any key or tap skips it.

  private cut: CutscenePlay | null = null;
  private cutThen: (() => void) | null = null;

  /**
   * Play a cutscene, then continue: `then` runs when it ends or is skipped. Without
   * `then`, the game hands over to the cutscene's `next` zone (from its data).
   * For a menu's NEW GAME or a story beat: `game.playCutscene('intro', () => …)`.
   */
  playCutscene(id: CutsceneId | string, then?: () => void) {
    const scene = cutsceneById(id);
    const after = then ?? (() => scene && this.handTo(scene.next));
    if (!scene) { after(); return; }
    this.endCutscene(false);
    this.bubble = null;
    this.keys.clear();
    this.zoneHosts.forEach((h) => h.closeAll());
    this.term.close();
    this.cut = new CutscenePlay(scene, { reduced: this.reduced, touch: this.touch });
    this.cutThen = after;
    document.documentElement.classList.add('cutscene');
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + scene.cards.map((c) => c.text).join(' '));
    this.host.setZone(scene.title);
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

  /** Sudo's LEVELS: play a cutscene (then its next zone), or arrive in a zone at its spawn. */
  private enterLevel(id: string) {
    this.bubble = null;
    if (isCutsceneId(id)) { this.playCutscene(id); return; }
    this.handTo(id);
    this.markSeen(this.zone);
    storeSave(this.save);
  }

  /** Arrive in a zone by id ('downtown', 'yard', 'capsule' or a scene id; anything else is Downtown), at its spawn. */
  handTo(zone: string) {
    if (isHosted(zone)) this.goTo(zone, true);
    else if (isSceneId(zone)) this.enterScene(zone, true);
    else {
      this.goTo('downtown', true);
      this.p.x = SPAWN_X;
      this.cam = Math.max(0, Math.min(this.levelW - this.viewW, this.p.x - this.viewW * 0.45));
    }
    this.greet();
  }

  // ---------- explorable scenes (scenes/) ----------

  /** The scene the player is in, when the zone is one of the explorable scenes. */
  private get scene(): Scene | undefined { return sceneById(this.zone); }
  private sceneView: SceneView | null = null;

  /** Walk into an explorable scene: at the exit `at` (the door you came through, seen from inside), else at its spawn. */
  private enterScene(id: SceneId, quiet = false, at?: string) {
    const s = SCENES[id];
    this.zoneHost?.persist();
    this.zoneHosts.forEach((h) => { h.closeAll(); h.show(false); });
    this.bubble = null;
    this.zone = id;
    this.showZones();
    this.markSeen(id);
    const x = (at && s.exits.find((e) => e.id === at)?.x) || s.spawn;
    Object.assign(this.p, { x, y: 0, vy: 0, onGround: true, face: x > s.width / 2 ? -1 : 1 });
    this.cam = Math.max(0, Math.min(this.levelW - this.viewW, this.p.x - this.viewW * 0.45));
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: ' + s.name);
    this.syncHud();
    if (!quiet) sound.open();
    const flag = 'scene:' + id;
    if (s.intro && !this.save.flags[flag]) {
      this.save.flags[flag] = true;
      storeSave(this.save);
      this.say('YOU', s.intro, this.p.x, 46);
    }
  }

  private sceneTargets(s: Scene): Target[] {
    const list: Target[] = [];
    for (const e of s.exits) {
      if (e.edge || (e.requires && !this.save.flags[e.requires])) continue;
      // A platform's BOARD: one at each of the train's doors, only while it stands there with them open.
      if (e.action === 'board') {
        const st = stationAt(this.zone);
        if (st) for (const dx of platformDoors(st, this.t, this.cam, STOP)) list.push({ kind: 'scene', id: 'exit:' + e.id, x: dx, h: 0, label: e.label + ' · LINE 0 > ' + STATIONS[nextStation(st)].name, promptH: e.promptH ?? 70 });
        continue;
      }
      // The train's door: only while it stands at a stop with the doors open.
      if (e.action === 'out' && !rideOpen()) continue;
      const label = e.action === 'out' ? '[E] STEP OUT · ' + STATIONS[rideStop()].name : e.label;
      list.push({ kind: 'scene', id: 'exit:' + e.id, x: e.x, h: 0, label, promptH: e.promptH ?? 70 });
    }
    return [...list, ...this.lifeTargets(s)];
  }

  /**
   * A place's life as E targets (scenes and zones alike): readables, uses, the people who talk,
   * and the animals (cats to pet, pigeons to shoo). E on one runs `useScene`.
   */
  private lifeTargets(s: Life): Target[] {
    const list: Target[] = [];
    for (const r of s.readables ?? []) list.push({ kind: 'scene', id: 'read:' + r.id, x: r.x, h: 0, label: r.label ?? '[E] READ', promptH: r.promptH ?? 70 });
    for (const u of s.uses ?? []) list.push({ kind: 'scene', id: 'use:' + u.id, x: u.x, h: 0, label: u.label, promptH: u.promptH ?? 70 });
    // the scene's people with something to say (people.ts): the target follows a walker
    for (const p of s.people ?? []) if (p.id && p.talk) list.push({ kind: 'scene', id: 'talk:' + p.id, x: personX(p, this.t), h: 0, label: '[E] TALK', promptH: personHeight(p) + 16 });
    // animals: people always want to pet the cat (and the pigeon gets shooed)
    (s.people ?? []).forEach((p, i) => {
      if (!p.talk && (p.look === 'cat' || p.look === 'pigeon')) list.push({ kind: 'scene', id: 'pet:' + i, x: personX(p, this.t), h: 0, label: p.look === 'cat' ? '[E] PET' : '[E] SHOO', promptH: personHeight(p) + 14 });
      // robots without talk still answer: a beep, a status, a polite refusal
      else if (!p.talk && isBot(p)) list.push({ kind: 'scene', id: 'bot:' + i, x: personX(p, this.t), h: 0, label: botReact(p).label, promptH: personHeight(p) + 14 });
    });
    return list;
  }

  /** E next to a scene's exit or readable. An exit lands you at its matching door in the destination. */
  private useScene(target: string) {
    const s = this.life!, [kind, id] = target.split(':');
    if (kind === 'read') {
      const r = s.readables!.find((z) => z.id === id)!;
      this.say(r.name, r.pages, r.x, r.h ?? 70);
      return;
    }
    if (kind === 'pet') {
      const p = s.people![Number(id)], n = this.petCount++;
      const lines = p.look === 'cat' ? PET_CAT : PET_PIGEON;
      sound.blip();
      this.say(p.look === 'cat' ? 'CAT' : 'PIGEON', lines[n % lines.length], personX(p, this.t), personHeight(p) + 4);
      return;
    }
    if (kind === 'bot') {
      const p = s.people![Number(id)], said = botReact(p, true);
      sound.blip();
      this.say(said.name, said.pages, personX(p, this.t), personHeight(p) + 4);
      return;
    }
    if (kind === 'talk') {
      const p = s.people!.find((z) => z.id === id)!, said = talkTo(p);
      this.say(said.name, said.pages, personX(p, this.t), personHeight(p) - 10);
      return;
    }
    if (kind === 'use') {
      const u = s.uses!.find((z) => z.id === id)!, save = this.save;
      const out = u.use({
        tokens: save.tokens,
        pay: (n) => { if (save.tokens < n) return false; save.tokens -= n; this.flash('-' + n + ' token' + (n === 1 ? '' : 's')); return true; },
        give: (n) => { save.tokens += n; this.flash('+' + n + ' token' + (n === 1 ? '' : 's')); },
        flags: save.flags, set: (f) => { save.flags[f] = true; }, t: this.t,
      });
      storeSave(save);
      this.syncHud();
      const said = Array.isArray(out) ? { name: u.name, pages: out } : out;
      this.say(said.name, said.pages, u.x, u.h ?? 60);
      return;
    }
    const e = this.scene?.exits.find((z) => z.id === id);
    if (!e) return;
    if (e.action === 'board') { const st = stationAt(this.zone); if (st && platformOpen(st, this.t)) this.enterTrain(st); return; }
    if (e.action === 'out') { this.stepOut(); return; }
    if (e.action === 'taxi') { this.hailTaxi(); return; }
    if (e.action === 'map') { this.showMap(); sound.open(); return; }
    if (e.to === 'downtown' || isHosted(e.to) || isSceneId(e.to)) this.travel(e.to, e.at);
  }

  /** The scene view, refreshed for this frame (Downtown's stands draw with it too). */
  private view(): SceneView {
    const v = (this.sceneView ??= { sx: (wx, p = 1) => this.sx(wx, p), y: (h) => this.y(h), t: 0, viewW: 0, viewH: 0, cam: 0, gy: 0, flags: this.save.flags });
    v.t = this.t; v.viewW = this.viewW; v.viewH = this.viewH; v.cam = this.cam; v.gy = this.gy; v.flags = this.save.flags;
    return v;
  }

  /** A scene draws its own backdrop and foreground; the engine adds sky, the player, rain and the HUD. */
  private drawScene(s: Scene, rain: number) {
    const v = this.view();
    if (s.ambient?.sky) { this.drawSky(); this.drawShips(); }
    s.drawBackdrop(this.x, v);
    this.drawPeople();
    s.drawFront?.(this.x, v);
    if (s.ambient?.rain) this.drawRain(rain);
    this.drawPrompt();
    this.drawBubble();
    this.drawHud();
    if (this.showEnd) this.drawEnd();
  }

  // ---------- travel: doors, the metro, sky taxis, the city map (city.ts) ----------

  /** Go to a zone, landing at door `at` there (a scene's exit id, or a Downtown door). */
  private travel(zone: Zone, at?: string) {
    this.mapView = null;
    if (zone === 'downtown' || isHosted(zone)) this.goTo(zone, false, at);
    else this.enterScene(zone, false, at);
    // With reduced motion the platforms' clocks stand still: stand a train there with its doors open.
    const st = stationAt(zone);
    if (st && this.reduced && !platformOpen(st, this.t)) platformSync(st, this.t, TIMETABLE.dwell / 2);
  }

  /** ↑ or W in an open train door, on the platform or in the car: step through it. */
  private walkThroughDoor() {
    if (!this.scene) return false;
    const t = this.nearest();
    if (!t || (t.id !== 'exit:train' && t.id !== 'exit:out' && t.id !== 'exit:out2')) return false;
    this.useScene(t.id);
    return true;
  }

  /** The player walked into a border: leave through that edge's exit, if the zone has one, still walking the same way. */
  private walkOff(edge: 'left' | 'right') {
    const s = this.scene;
    const e = s ? s.exits.find((z) => z.edge === edge && (!z.requires || this.save.flags[z.requires])) : EDGES[this.zone]?.[edge];
    if (!e || !(e.to === 'downtown' || isHosted(e.to) || isSceneId(e.to))) return;
    this.travel(e.to, e.at);
    this.p.face = edge === 'left' ? -1 : 1;
  }

  /** Remember a place for the city map: `flags['seen:<zone>']`. */
  private markSeen(zone: Zone) {
    const f = seenFlag(zone);
    if (this.save.flags[f]) return;
    this.save.flags[f] = true;
    storeSave(this.save);
  }

  /** E at one of Downtown's doors, stairs or pad. */
  private useDoor(id: DoorId) {
    if (id === 'yard') { this.goTo('yard'); return; }
    if (id === 'taxi') { this.hailTaxi(); return; }
    // your building's lobby: the lift up to your flat
    if (id === 'capsule') { this.travel('capsule', 'downtown'); return; }
    // Moth's building: the residents' door reads key chips, and only Moth's opens it
    if (id === 'moth') {
      if (!this.save.keyring.includes(MOTH_KEY)) { sound.denied(); this.say('DOOR', ['RESIDENTS ONLY. PRESENT KEY CHIP.', 'FLAT 4C · RESIDENT: MOTH · AUTHORISED VISITORS: 0.'], DOORS.moth, 52); return; }
      this.travel('moth', 'downtown');
      return;
    }
    this.travel(id, 'downtown');
  }

  /** Board the train standing at a station's platform: in the car by its door, which stays open as long as it would have on the platform. */
  private enterTrain(at: Station) {
    boardRide(at, platformLeft(at, this.t));
    this.travel('train', 'out');
  }

  /** E (or ↑) at the train's open door: out onto the platform of the stop it stands at, the train still there behind you until it leaves. */
  private stepOut() {
    if (!rideOpen()) return;
    const st = rideStop(), left = rideLeft();
    this.travel(STATIONS[st].zone, 'train');
    platformSync(st, this.t, this.reduced ? TIMETABLE.dwell / 2 : left);
  }

  /** E at a taxi stand: the city map to pick a stand, if you can pay. */
  private hailTaxi() {
    if (this.save.tokens < FARE) {
      sound.denied();
      this.say('DRIVER', DRIVER_BROKE, this.p.x + 20, 40);
      return;
    }
    const here = standOf(this.zone), i = here ? STAND_IDS.indexOf(here) : -1;
    this.mapView = { mode: 'taxi', options: [...STAND_IDS], index: (i + 1) % STAND_IDS.length, hover: -1 };
    sound.open();
  }

  /** The city map on its own, just to look at (for a menu to call). Esc closes it. */
  showMap() {
    if (!this.running || this.flight || this.hop) return;
    this.bubble = null;
    this.mapView = { mode: 'view', options: [], index: -1, hover: -1 };
  }

  /** True while the city map is open. */
  get mapOpen() { return !!this.mapView; }

  private mapKey(e: KeyboardEvent) {
    const m = this.mapView!, k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    if (k === 'Escape' || k === 'Tab' || k === 'm' || k === 'M') { e.preventDefault(); this.mapView = null; this.canvas.style.cursor = ''; sound.close(); return; }
    if (m.mode === 'view') {
      // quick travel: the arrows step through the places, starting from where you are; E, Enter or Space goes
      const n = PLACES.length, here = PLACES.findIndex((p) => p.zone === this.zone), from = m.index >= 0 ? m.index : Math.max(0, here);
      const step = m.index < 0 && here < 0 ? 0 : 1;
      if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'a' || k === 'A' || k === 'w' || k === 'W') { m.index = (from + n - step) % n; m.hover = -1; sound.blip(); return; }
      if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'd' || k === 'D' || k === 's' || k === 'S') { m.index = (from + step) % n; m.hover = -1; sound.blip(); return; }
      if (k === 'e' || k === 'E' || k === 'Enter' || k === ' ') { if (m.index >= 0) this.quickTravel(m.index); else { this.mapView = null; sound.close(); } }
      return;
    }
    const n = m.options.length;
    if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'a' || k === 'A' || k === 'w' || k === 'W') { m.index = (m.index + n - 1) % n; sound.blip(); return; }
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'd' || k === 'D' || k === 's' || k === 'S') { m.index = (m.index + 1) % n; sound.blip(); return; }
    if (k === 'e' || k === 'E' || k === 'Enter' || k === ' ') this.mapConfirm();
  }

  private mapConfirm() {
    const m = this.mapView!, pick = m.options[m.index];
    this.mapView = null;
    if (m.mode === 'taxi') {
      const to = pick as Stand;
      if (to === standOf(this.zone)) { this.flash('you are already here'); return; }
      this.save.tokens -= FARE;
      storeSave(this.save);
      this.syncHud();
      this.flight = { to, start: this.clock };
      sound.open();
    }
  }

  /** The map's state, for drawing it and for deciding where you may go. */
  private mapState(): MapState {
    const m = this.mapView ?? { mode: 'view' as const, options: [], index: -1, hover: -1 };
    return {
      mode: m.mode, options: m.options, index: m.index, hover: m.hover, touch: this.touch, zone: this.zone,
      ride: this.zone === 'train' ? { from: rideStop(), to: rideNext(), f: rideRun() } : null,
      seen: (z) => !!this.save.flags[seenFlag(z)], gateOpen: !!this.save.flags.end, tokens: this.save.tokens, t: this.clock,
    };
  }

  /** The pointer on the open map: hovering marks a place; a click goes there (on touch a first tap picks, a second goes); outside the panel closes it. */
  private mapPointer(e: PointerEvent, press: boolean) {
    const m = this.mapView!, r = this.canvas.getBoundingClientRect();
    const px = ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.k, py = ((e.clientY - r.top) * (this.canvas.height / r.height)) / this.k;
    const i = placeAt(this.viewW, this.viewH, px, py);
    if (m.mode === 'view' && e.pointerType === 'mouse') m.hover = Math.max(-1, i);
    this.canvas.style.cursor = m.mode === 'view' && i >= 0 ? 'pointer' : '';
    if (!press) return;
    e.preventDefault();
    if (i === -2) { this.mapView = null; this.canvas.style.cursor = ''; sound.close(); return; }
    if (m.mode !== 'view' || i < 0) return;
    if (e.pointerType === 'mouse' || m.index === i) this.quickTravel(i);
    else { m.index = i; sound.blip(); }
  }

  /** Quick travel to a place you know, from the map: no fare, a short fade; or say why not. */
  private quickTravel(i: number) {
    const place = PLACES[i], why = placeBlocked(place, this.mapState());
    if (why) { this.flash(why.toLowerCase()); sound.denied(); if (this.mapView) this.mapView.index = i; return; }
    this.mapView = null;
    this.canvas.style.cursor = '';
    this.hop = { place, start: this.clock, done: false };
    sound.close();
  }

  /** Flights land; on board, the train stands, closes its doors, runs to the next stop on the loop and opens them (line.ts). */
  private updateTravel(dt: number) {
    if (this.flight && this.clock - this.flight.start >= FLIGHT) {
      const to = this.flight.to;
      this.flight = null;
      this.travel(STANDS[to].zone, 'taxi');
      this.flash('-' + FARE + ' token · ' + STANDS[to].name);
    }
    // a quick trip moves you while the screen is dark, half way through its fade
    if (this.hop) {
      const e = this.clock - this.hop.start;
      if (!this.hop.done && e >= HOP / 2) { this.hop.done = true; this.travel(this.hop.place.zone, this.hop.place.at); this.greet(); }
      if (e >= HOP) this.hop = null;
    }
    if (this.zone !== 'train') return;
    const ev = stepRide(dt);
    if (ev === 'depart') { this.flash('NEXT: ' + STATIONS[rideNext()].name); sound.close(); }
    else if (ev === 'arrive') { this.flash(STATIONS[rideStop()].name + ' · doors open'); sound.open(); }
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
