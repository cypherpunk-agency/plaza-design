/**
 * ACCESS DENIED, the engine: input, movement, camera and drawing for the
 * side-scrolling street. What things say and unlock lives in level.ts; the
 * fixer's back yard (the new hacking system: schematics of nouns and verbs)
 * lives in yard/, the player's flat (Capsule 7B, where a new game starts) in
 * capsule/, both on the zone engine in zone/. Pixel the robot cat, who
 * follows you around once you leave the flat, is companion.ts.
 *
 * The canvas fills the landing page's window between its header and footer and
 * is drawn at an integer pixel scale so the sprites stay crisp.
 */

import { sound } from './audio';
import { drawSprite, GLOW_THEM, GLOW_YOU, HULL, SPR, type Sprite } from './sprites';
import { Terminal } from './terminal';
import { YARD_SPAWN, YARD_W, YARD_ZONE } from './yard';
import { CAPSULE_SPAWN, CAPSULE_W, CAPSULE_ZONE, capsulePerch, DOOR_X as CAPSULE_DOOR_X } from './capsule';
import { Companion, WARM } from './companion';
import { type ZoneDef, ZoneHost } from './zone';
import { isSceneId, sceneById, SCENES, type Scene, type SceneId, type SceneView } from './scenes';
import { CutscenePlay, cutsceneById, isCutsceneId, type CutsceneId } from './cutscenes';
import { metroDoorsOpen, metroSync } from './scenes/metro';
import { ride } from './scenes/train';
import {
  DOORS, DOORS_CLOSE, drawCityMap, EDGES, drawFlight, drawMetroStairs, drawTaxiPad, DRIVER_BROKE, FARE, FLIGHT, isDoorId, LINE, RIDE,
  seenFlag, START_ZONE, STAND_IDS, standOf, STANDS, STATIONS, stationOf, type DoorId, type MapState, type Stand, type Station, type Zone,
} from './city';
import {
  banner, commands, FRONTS, fixerTalk, LEVEL_W, loadSave, MACHINES, NO_ARGS, NPCS, npcTalk, nodeCount, PLATFORMS,
  ownedModules, READABLES, run, SPAWN_X, STALL, storeSave, suggest, who, type Ctx, type Save,
} from './level';

type Target = { kind: 'talk' | 'jack' | 'read' | 'door' | 'zone' | 'scene'; id: string; x: number; h: number; label: string; promptH?: number };
/** Downtown's doors, stairs and pad as targets (the market gate's door only once the gate is open). */
const DOOR_TARGETS: { id: DoorId; label: string; promptH: number }[] = [
  { id: 'market', label: '[E] NEON MARKET', promptH: 120 },
  { id: 'shop', label: '[E] CORNER SHOP', promptH: 84 },
  { id: 'yard', label: '[E] BACK YARD', promptH: 86 },
  { id: 'capsule', label: '[E] HOME · CAPSULE 7B', promptH: 84 },
  { id: 'metro', label: '[E] METRO', promptH: 106 },
  { id: 'taxi', label: '[E] HAIL TAXI', promptH: 122 },
];
interface Bubble { name: string; pages: string[]; page: number; chars: number; x: number; h: number }
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
  private save: Save = loadSave();
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
  private machine: string | null = null;
  private showEnd = false;
  private toast: { text: string; until: number } | null = null;
  private seenControls = false;
  private escUntil = 0;
  private touch = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch { return false; } })();
  private ships: Ship[] = [];
  private windows = new Map<number, [number, number, number][]>();
  private drops: [number, number, number, number][] = [];
  private reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  private zone: Zone = 'downtown';
  private yard: ZoneHost;
  /** Capsule 7B, the player's flat. */
  private capsule: ZoneHost;
  /** Pixel the robot cat: at home in the flat, at your heels outside once you have left it (`flags.pixel`). */
  private pixel = new Companion();
  private started = false;
  /** Frames since the game started; runs even with reduced motion (rides and flights are timed on it). */
  private clock = 0;
  /** The city map overlay, when open: just looking, picking a taxi stand, or picking a metro stop. */
  private mapView: { mode: 'view' | 'taxi' | 'metro'; options: string[]; index: number } | null = null;
  /** A sky-taxi flight in progress. */
  private flight: { to: Stand; start: number } | null = null;
  /** The train's stop (or the one it last left), and the ride in progress. */
  private station: Station = 'downtown';
  private trip: { to: Station; start: number } | null = null;

  constructor(private host: GameHost) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.canvas.setAttribute('aria-label', 'ACCESS DENIED: Downtown');
    this.canvas.hidden = true;
    host.windowEl.appendChild(this.canvas);
    this.x = this.canvas.getContext('2d')!;

    this.term = new Terminal(host.windowEl, host.inputHost, this.touch);
    this.term.onSubmit((line) => run(this.ctx(), line));
    this.term.onSuggest((line) => suggest(this.ctx(), line), NO_ARGS);
    this.term.onComplete((prefix) => {
      const [first, ...rest] = prefix.split(/\s+/);
      if (!rest.length) return commands(this.ctx()).filter((c) => c.startsWith(first.toLowerCase()));
      return [];
    });
    this.term.onClose = () => { if (this.machine) this.leaveMachine(); this.canvas.focus(); };

    this.yard = this.hostZone(YARD_ZONE);
    this.yard.onClose = () => this.canvas.focus();
    this.capsule = this.hostZone(CAPSULE_ZONE);
    this.capsule.onClose = () => this.canvas.focus();
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
  private hostZone(def: ZoneDef) {
    const id = def.data.id;
    return new ZoneHost(this.host.windowEl, (text, kind) => this.term.print(text, kind), {
      modules: () => this.save.modules,
      keyring: () => this.save.keyring,
      give: (k) => { if (!this.save.keyring.includes(k)) this.save.keyring.push(k); storeSave(this.save); },
      load: () => this.save.zones[id],
      store: (z) => { this.save.zones[id] = z; storeSave(this.save); },
    }, def);
  }

  /** The zone on the hacking system the player is in (the yard, the flat), if any. */
  private get zoneHost(): ZoneHost | null { return this.zone === 'yard' ? this.yard : this.zone === 'capsule' ? this.capsule : null; }
  private get zoneHosts() { return [this.yard, this.capsule]; }

  // ---------- lifecycle ----------

  start(zone?: 'yard' | 'capsule' | SceneId | CutsceneId) {
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
    if ((zone === 'yard' || zone === 'capsule') && this.zone !== zone) this.goTo(zone, true);
    else if (zone && isSceneId(zone) && this.zone !== zone) this.enterScene(zone, true);
    this.markSeen(this.zone);
    this.greet();
  }

  /** First time in Downtown: the player says where they are. */
  private greet() {
    if (this.zone === 'downtown' && !this.save.flags.arrived) {
      this.save.flags.arrived = true;
      const pages = ['Downtown. Rain, neon, and nobody who sees me.', 'The noodle stall is still lit. Worth a try.'];
      if (this.save.flags.pixel) pages.splice(1, 0, 'Pixel came along. Nobody asked Pixel. Nobody ever does.');
      this.say('YOU', pages, this.p.x, 46);
    }
  }

  stop() {
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
    const top = this.host.header.getBoundingClientRect().bottom - win.top;
    const bottom = win.bottom - this.host.footer.getBoundingClientRect().top;
    this.host.windowEl.style.setProperty('--game-top', top + 'px');
    this.host.windowEl.style.setProperty('--game-bottom', bottom + 'px');
    const cssW = win.width, cssH = Math.max(120, win.height - top - bottom);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    // Small screens (phones in landscape) show a shorter slice of the street at a larger scale.
    this.k = Math.max(1, Math.floor((cssH * dpr) / (cssH < 420 ? 230 : 320)));
    this.viewW = this.canvas.width / this.k;
    this.viewH = this.canvas.height / this.k;
    this.gy = Math.round(this.viewH - 54);
  }

  private loop(now: number) {
    if (!this.running) return;
    const dt = this.last ? Math.min(3, (now - this.last) / 16.67) : 1;
    this.last = now;
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
    if (this.term.focused) return;
    if (this.flight) { if (e.key !== 'm' && e.key !== 'M') e.preventDefault(); return; }
    if (this.mapView) { this.mapKey(e); return; }
    const zh = this.zoneHost;
    if (zh && zh.overlayOpen) {
      if (e.key === 'Escape') { e.preventDefault(); zh.closeOverlay(); }
      else if (e.key === 'b' || e.key === 'B') zh.toggleBoard();
      else if ((e.key === 'h' || e.key === 'H') && !e.repeat) zh.toggleVision();
      return;
    }
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
    if (e.repeat && !['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(k)) return;
    if (this.showEnd) {
      if (k === 'Escape') { this.host.onExit(); }
      else if (k === 'Enter' || k === 'e' || k === 'E') this.showEnd = false;
      return;
    }
    if (k === 'Escape') {
      if (this.bubble) { this.bubble = null; return; }
      if (zh && zh.visionOn) { zh.toggleVision(); return; }
      // Leaving takes a second Esc, so closing one bubble too many never ends a session.
      if (this.t < this.escUntil) { this.escUntil = 0; this.host.onExit(); return; }
      this.escUntil = this.t + 120;
      this.flash('ESC again to leave');
      return;
    }
    if (k === '/') { e.preventDefault(); this.openDeck(); return; }
    if (zh && (k === 'b' || k === 'B')) { this.seenControls = true; zh.toggleBoard(); return; }
    if (zh && (k === 'h' || k === 'H')) { this.seenControls = true; zh.toggleVision(); return; }
    if (k === 'm' || k === 'M') { const on = sound.toggle(); this.flash('sound ' + (on ? 'on' : 'off')); return; }
    if (k === 'e' || k === 'E' || k === 'Enter') { this.interact(); return; }
    if ((k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') && !this.bubble) this.jump();
    this.keys.add(k.length === 1 ? k.toLowerCase() : k);
  }

  private onKeyUp(e: KeyboardEvent) {
    const k = e.key;
    this.keys.delete(k.length === 1 ? k.toLowerCase() : k);
    if (k === 'Shift') this.keys.delete('Shift');
  }

  private openDeck() {
    if (!this.machine) {
      if (!this.term.out.childElementCount) this.term.print('[DECK] ' + who(this.save) + ' · type help', 'head');
    }
    this.seenControls = true;
    this.term.focus();
  }

  private jump() {
    if (!this.save.jump) { this.flash('[ERR] legs.so not found'); sound.denied(); return; }
    if (!this.p.onGround) return;
    this.p.vy = 4.6;
    this.p.onGround = false;
    sound.jump();
  }

  private flash(text: string) { this.toast = { text, until: this.t + 110 }; }

  private get levelW() { return this.scene?.width ?? (this.zone === 'yard' ? YARD_W : this.zone === 'capsule' ? CAPSULE_W : LEVEL_W); }
  /** The place's name, for the HUD and the canvas label. */
  private get placeName() { return this.scene?.name ?? (this.zone === 'yard' ? 'the back yard' : this.zone === 'capsule' ? 'Capsule 7B' : 'Downtown'); }
  private get platforms() { return this.zone === 'downtown' ? PLATFORMS : []; }

  /**
   * Go to Downtown, the fixer's back yard or your flat. In Downtown you land in
   * front of door `at` (default: the yard's); in the flat at its door when you
   * come from Downtown (`at` 'downtown'), else by the bed.
   */
  private goTo(zone: 'downtown' | 'yard' | 'capsule', quiet = false, at?: string) {
    this.zoneHost?.persist();
    this.zoneHosts.forEach((h) => { h.closeAll(); h.show(false); });
    this.bubble = null;
    this.zone = zone;
    this.zoneHost?.show(true);
    this.markSeen(zone);
    const x = zone === 'yard' ? YARD_SPAWN : zone === 'capsule' ? (at === 'downtown' ? CAPSULE_DOOR_X + 20 : CAPSULE_SPAWN) : at && isDoorId(at) ? DOORS[at] : YARD_DOOR_X;
    Object.assign(this.p, { x, y: 0, vy: 0, onGround: true, face: zone === 'capsule' ? (at === 'downtown' ? 1 : -1) : this.p.face });
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

  /** In a zone (the yard, the flat), tap or click a thing to open its schematic (in hack vision: its verbs); hovering lights it up. */
  private onCanvasPointer(e: PointerEvent, press: boolean) {
    if (this.cut) { if (press) { e.preventDefault(); this.cut.skip(); } return; }
    const zh = this.zoneHost;
    if (!zh || zh.overlayOpen) return;
    const r = this.canvas.getBoundingClientRect();
    const wx = ((e.clientX - r.left) * (this.canvas.width / r.width)) / this.k + this.cam;
    const h = this.gy - ((e.clientY - r.top) * (this.canvas.height / r.height)) / this.k;
    const id = zh.spotAt(wx, h);
    zh.hover = id;
    this.canvas.style.cursor = id ? 'pointer' : '';
    if (press && zh.visionOn) { zh.poke(id); return; }
    if (press && id) { e.preventDefault(); this.seenControls = true; zh.openDevice(id); }
  }

  /** Hack vision hangs in the world: give the zone this frame's world → CSS px mapping (as `sx` and `y` draw it). */
  private followZone() {
    const s = (this.k * this.canvas.clientWidth) / this.canvas.width;
    this.zoneHost!.follow((wx, h) => ({ x: Math.round(wx - this.cam) * s, y: (this.gy - h) * s }), this.canvas.clientWidth);
  }

  // ---------- world logic ----------

  private ctx(): Ctx {
    return {
      save: this.save,
      machine: this.machine,
      print: (text, kind) => this.term.print(text, kind),
      denied: () => sound.denied(),
      granted: () => sound.granted(),
      toggleSound: () => sound.toggle(),
      clear: () => this.term.clear(),
      leaveMachine: () => this.leaveMachine(),
      persist: () => { storeSave(this.save); this.syncHud(); },
      complete: () => { this.showEnd = true; },
      resetYard: () => this.yard.reset(),
    };
  }

  private leaveMachine() {
    if (this.machine) { this.term.print('[unplugged]', 'dim'); sound.close(); }
    this.machine = null;
    this.term.close();
  }

  private syncHud() {
    this.host.setNodes(nodeCount(this.save));
    this.host.setZone(this.placeName.replace(/^the /, '').toUpperCase() + ' · ' + who(this.save).toUpperCase());
  }

  private targets(): Target[] {
    if (this.scene) return this.sceneTargets(this.scene);
    const zh = this.zoneHost;
    if (zh) return zh.targets().map((t) => ({ kind: 'zone' as const, id: t.id, x: t.x, h: 0, label: t.label, promptH: t.promptH }));
    const list: Target[] = [], gateOpen = !!this.save.flags.end;
    for (const d of DOOR_TARGETS) if (d.id !== 'market' || gateOpen) list.push({ kind: 'door', id: d.id, x: DOORS[d.id], h: 0, label: d.label, promptH: d.promptH });
    NPCS.forEach((n) => list.push({ kind: 'talk', id: n.id, x: n.x, h: 0, label: '[E] TALK' }));
    list.push({ kind: 'talk', id: 'fixer', x: STALL.fixerX, h: 0, label: '[E] TALK' });
    // Once Downtown is cleared the gate stands open: the market's door takes the gate's place.
    MACHINES.forEach((m) => { if (m.id !== 'gate' || !gateOpen) list.push({ kind: 'jack', id: m.id, x: m.x, h: m.onRoof ? m.h : 0, label: '[E] JACK IN' }); });
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
    this.seenControls = true;
    const b = this.bubble;
    if (b) {
      const full = b.pages[b.page].length;
      if (b.chars < full) { b.chars = full; return; }
      if (b.page < b.pages.length - 1) { b.page++; b.chars = 0; return; }
      this.bubble = null;
      return;
    }
    const target = this.nearest();
    if (!target) return;
    if (target.kind === 'scene') { this.useScene(target.id); return; }
    if (target.kind === 'zone') { if (this.zoneHost?.use(target.id) === 'exit') this.leaveZone(); return; }
    if (target.kind === 'door') { this.useDoor(target.id as DoorId); return; }
    if (target.kind === 'talk') {
      if (target.id === 'fixer') {
        const talk = fixerTalk(this.save);
        storeSave(this.save);
        this.say('FIXER', talk.pages, STALL.fixerX, 30);
      } else {
        const npc = NPCS.find((n) => n.id === target.id)!;
        this.say(npc.id === 'hood' ? 'HOODED STRANGER' : npc.id === 'umbrella' ? 'UMBRELLA' : 'MAN IN A HAT', npcTalk(npc.id, this.save), npc.x, 48);
      }
    } else if (target.kind === 'read') {
      const r = READABLES.find((z) => z.id === target.id)!;
      this.say('SIGN', r.pages, r.x, 70);
    } else {
      this.machine = target.id;
      this.p.face = 1;
      sound.open();
      this.term.print(banner(target.id, this.save), 'head');
      this.term.print('type help · exit to unplug', 'dim');
      this.term.focus();
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
    const locked = !!this.machine || this.showEnd || this.term.focused || !!this.zoneHost?.overlayOpen || !!this.mapView || !!this.flight;
    const left = !locked && (this.keys.has('ArrowLeft') || this.keys.has('a'));
    const right = !locked && (this.keys.has('ArrowRight') || this.keys.has('d'));
    const speed = this.keys.has('Shift') ? 2.3 : 1.3;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir) { p.face = dir; this.seenControls = true; if (this.bubble && Math.abs(p.x - this.bubble.x) > 140) this.bubble = null; }
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
  private get pixelHere() { return this.zone === 'capsule' || (!!this.save.flags.pixel && (this.zone === 'downtown' || this.zone === 'yard')); }

  /** E on a zone's way out: the yard's back to its alley; the flat's door down to your building's lobby, with Pixel. */
  private leaveZone() {
    if (this.zone === 'capsule') {
      this.save.flags.pixel = true;
      storeSave(this.save);
      this.goTo('downtown', false, 'capsule');
      this.greet();
      return;
    }
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

    if (this.zone === 'yard') {
      // Boxed in by the backs of houses: no city behind the yard, it draws its own walls.
      this.drawStreet(rain);
      this.yard.draw(x, { sx: (wx) => this.sx(wx), y: (h) => this.y(h), t: this.t, viewW: this.viewW, viewH: this.viewH });
    } else if (this.zone === 'capsule') {
      // Indoors: the flat draws everything, the tower around it included.
      this.capsule.draw(x, { sx: (wx) => this.sx(wx), y: (h) => this.y(h), t: this.t, viewW: this.viewW, viewH: this.viewH });
    } else {
      this.drawSky();
      this.drawShips();
      this.drawSkyline(0.18, 7, 70, 150, 0.18, 0.12);
      this.drawAntenna();
      this.drawSkyline(0.45, 19, 50, 120, 0.3, 0.18);
      this.drawFronts();
      this.drawStreet(rain);
      this.drawMachines();
      this.drawStands();
    }
    this.drawPeople();
    if (this.zone !== 'capsule') this.drawRain(rain);
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
    // Signs, each on a plate bolted to the wall.
    this.plate(this.sx(372), this.y(114), 20, 90, C);
    this.neon('VERIFY', this.sx(372), this.y(150), C, { vertical: true, dead: 1, size: 12 });
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
   * The alley to the fixer's back yard (950–994, past the stall): a gap in the
   * street wall with an open gate under a bar carrying the YARD plate, and a
   * slice of the yard behind it: the backs of the houses across it, the crane's
   * top over them, crates under the yard's lamp. Walk in front of it for E.
   */
  private drawAlley() {
    const x = this.x, a0 = this.sx(950), a1 = this.sx(994), b1 = this.sx(1040), c = this.sx(YARD_DOOR_X), P = '255,61,242';
    if (b1 + 10 < 0 || a0 - 10 > this.viewW) return;
    // the backs of the houses across the yard (middle band: dim), over the stub wall and through the gap
    x.fillStyle = '#0a0503'; x.fillRect(a0, this.y(150), b1 - a0, 74); x.fillRect(a0, this.y(76), a1 - a0, 12);
    x.strokeStyle = 'rgba(194,65,12,.25)'; x.lineWidth = 1; x.strokeRect(a0 + 0.5, this.y(150) + 0.5, b1 - a0 - 1, 74);
    x.fillStyle = 'rgba(255,136,0,.2)'; x.fillRect(this.sx(1012), this.y(132), 8, 12);
    x.fillStyle = '#030100'; x.fillRect(this.sx(964), this.y(132), 8, 12);
    // the yard itself, below the gate's bar: dark, lit by its lamp
    const top = this.y(64);
    x.fillStyle = '#080402'; x.fillRect(a0, top, a1 - a0, 64);
    const g = x.createRadialGradient(c + 8, this.y(46), 2, c + 8, this.y(30), 46);
    g.addColorStop(0, 'rgba(255,170,90,.28)'); g.addColorStop(1, 'rgba(255,170,90,0)');
    x.fillStyle = g; x.fillRect(a0, top, a1 - a0, 64);
    x.fillStyle = 'rgba(255,217,165,.85)'; x.fillRect(c + 6, this.y(50), 4, 2);
    // the crane: its beam over the houses' backs, a leg coming down into the yard, the hook on its cable
    const k0 = this.sx(958), k1 = this.sx(1034);
    x.fillStyle = '#2a1407'; x.fillRect(k0, this.y(118), k1 - k0, 4); x.fillRect(k0 + 3, this.y(114), 3, 106); x.fillRect(k1 - 6, this.y(114), 3, 38);
    x.fillStyle = 'rgba(255,136,0,.55)'; x.fillRect(k0, this.y(118), k1 - k0, 1); x.fillRect(k0 + 3, this.y(114), 1, 106);
    x.fillStyle = '#ff8800'; x.fillRect(this.sx(1002), this.y(114), 8, 3);
    x.fillStyle = 'rgba(201,168,127,.7)'; x.fillRect(this.sx(1005), this.y(111), 1, 30);
    // the yard's ground and two crates in it, smaller for being further away
    x.fillStyle = '#120804'; x.fillRect(a0, this.y(8), a1 - a0, 8); x.fillStyle = 'rgba(255,170,90,.25)'; x.fillRect(a0, this.y(8), a1 - a0, 1);
    for (const [ox, w, h] of [[10, 12, 11], [23, 10, 8]]) {
      x.fillStyle = '#3a210b'; x.fillRect(a0 + ox, this.y(8 + h), w, h);
      x.strokeStyle = 'rgba(201,138,63,.75)'; x.strokeRect(a0 + ox + 0.5, this.y(8 + h) + 0.5, w - 1, h - 1);
    }
    // the gate: two posts and a bar across, rimmed so they read against the dark; one leaf swung open against the left post
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(a0 + 4, top, 3, 64); x.fillRect(a1 - 7, top, 3, 64);
    x.fillStyle = '#1a0d05'; x.fillRect(a0 - 2, this.y(2), a1 - a0 + 4, 2);
    x.fillStyle = '#2a160a'; x.fillRect(a0, this.y(74), 4, 74); x.fillRect(a1 - 4, this.y(74), 4, 74); x.fillRect(a0 - 2, this.y(74), a1 - a0 + 4, 8);
    x.fillStyle = 'rgba(255,136,0,.75)'; x.fillRect(a0, this.y(74), 1, 74); x.fillRect(a1 - 4, this.y(74), 1, 74); x.fillRect(a0 - 2, this.y(74), a1 - a0 + 4, 1);
    x.fillStyle = 'rgba(255,136,0,.5)';
    for (let i = 0; i < 4; i++) x.fillRect(a0 + 5 + i * 2, this.y(58 - i * 2), 1, 54 - i * 3);
    x.fillRect(a0 + 5, this.y(58), 7, 1); x.fillRect(a0 + 5, this.y(6), 7, 1);
    this.plate(c, this.y(70), 28, 11, P);
    this.neon('YARD', c, this.y(70), P, { size: 8, phase: 90 });
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

  private drawMachines() {
    const x = this.x, t = this.t, s = this.save;
    const leds = (sx: number, sy: number, n: number, ok: boolean) => {
      for (let i = 0; i < n; i++) { x.fillStyle = (t + i * 13) % 50 < 25 ? (ok ? 'rgba(34,197,94,.95)' : 'rgba(255,42,68,.95)') : 'rgba(34,197,94,.18)'; x.fillRect(sx + i * 6, sy, 3, 2); }
    };
    for (const m of MACHINES) {
      const sx = this.sx(m.x);
      if (sx < -40 || sx > this.viewW + 40) continue;
      if (m.id === 'box') {
        x.fillStyle = '#1a1410'; x.fillRect(sx - 14, this.y(70), 28, 34); x.strokeStyle = 'rgba(255,136,0,.7)'; x.strokeRect(sx - 13.5, this.y(70) + 0.5, 27, 33);
        leds(sx - 9, this.y(58), 4, s.freed.includes('0x2F'));
        x.save(); x.font = '6px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,217,165,.6)'; x.fillText('0x2F', sx, this.y(62)); x.restore();
      } else if (m.id === 'till') {
        x.fillStyle = '#0d1a1a'; x.fillRect(sx - 9, this.y(44), 18, 12); x.strokeStyle = 'rgba(0,255,255,.6)'; x.strokeRect(sx - 8.5, this.y(44) + 0.5, 17, 11);
        x.fillStyle = s.flags.till ? 'rgba(34,197,94,.9)' : 'rgba(0,255,255,.7)'; x.fillRect(sx - 6, this.y(41), 12, 2);
      } else if (m.id === 'relay') {
        x.fillStyle = '#1a1410'; x.fillRect(sx - 12, this.y(m.h + 22), 24, 22); x.strokeStyle = 'rgba(255,136,0,.7)'; x.strokeRect(sx - 11.5, this.y(m.h + 22) + 0.5, 23, 21);
        x.beginPath(); x.moveTo(sx + 6, this.y(m.h + 22)); x.lineTo(sx + 6, this.y(m.h + 40)); x.stroke();
        leds(sx - 8, this.y(m.h + 14), 3, s.freed.includes('0x31'));
      } else if (m.id === 'gate') {
        x.fillStyle = '#0c0907'; x.fillRect(sx - 40, this.y(80), 80, 80);
        if (s.flags.end) {
          // Open: the shutter rolled up under the lintel, the market's bulbs and stalls lit behind it.
          x.fillStyle = 'rgba(255,170,80,.14)'; x.fillRect(sx - 38, this.y(66), 76, 66);
          for (let k = 0; k < 9; k++) { x.fillStyle = k % 2 ? 'rgba(255,190,110,.75)' : 'rgba(255,136,0,.6)'; x.fillRect(sx - 34 + k * 8, this.y(58) + Math.round(Math.abs(k - 4) * 0.8), 2, 3); }
          for (const [ax, aw] of [[-34, 30], [4, 30]]) {
            for (let k = 0; k < aw; k += 6) { x.fillStyle = (k / 6) % 2 ? '#1a0a03' : 'rgba(255,136,0,.55)'; x.fillRect(sx + ax + k, this.y(34), Math.min(6, aw - k), 6); }
            x.fillStyle = '#22120a'; x.fillRect(sx + ax, this.y(16), aw, 16); x.fillStyle = 'rgba(255,136,0,.6)'; x.fillRect(sx + ax, this.y(16), aw, 1);
          }
          x.fillStyle = '#1a1008'; x.fillRect(sx - 38, this.y(80), 76, 12);
          for (let yy = 2; yy < 12; yy += 3) { x.fillStyle = 'rgba(255,136,0,.2)'; x.fillRect(sx - 38, this.y(80) + yy, 76, 1); }
          x.strokeStyle = 'rgba(255,136,0,.6)'; x.strokeRect(sx - 39.5, this.y(80) + 0.5, 79, 79);
          x.fillStyle = 'rgba(34,197,94,.95)'; x.fillRect(sx + 32, this.y(44), 5, 5);
          continue;
        }
        x.strokeStyle = 'rgba(255,136,0,.6)'; x.strokeRect(sx - 39.5, this.y(80) + 0.5, 79, 79);
        for (let yy = 4; yy < 80; yy += 6) { x.fillStyle = 'rgba(255,136,0,.12)'; x.fillRect(sx - 38, this.y(80) + yy, 76, 2); }
        x.fillStyle = 'rgba(255,42,68,.9)'; x.fillRect(sx + 26, this.y(44), 6, 6);
      } else if (m.id === 'scan') {
        x.strokeStyle = 'rgba(255,42,68,.7)'; x.lineWidth = 2; x.strokeRect(sx - 22, this.y(84), 44, 84); x.lineWidth = 1;
        const sy = this.y(84) + ((t * 0.8) % 80);
        x.fillStyle = 'rgba(255,42,68,.5)'; x.fillRect(sx - 20, sy, 40, 2);
      } else if (m.id === 'fence') {
        x.fillStyle = 'rgba(255,210,58,.9)'; x.fillRect(sx - 18, this.y(36), 36, 14);
        x.save(); x.font = '600 6px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillStyle = '#000'; x.fillText('NO ENTRY', sx, this.y(27)); x.restore();
      }
    }
  }

  private drawPeople() {
    const x = this.x, p = this.p;
    if (this.zone === 'downtown') this.drawStallPeople();
    if (this.pixelHere) this.pixel.draw(x, (wx) => this.sx(wx), (h) => this.y(h), this.t);
    const sprite = this.machine ? SPR.jack : !p.onGround ? SPR.jump : p.moving && Math.floor(this.t / 9) % 2 ? SPR.walk : SPR.stand;
    const box = drawSprite(x, sprite, this.sx(p.x), this.y(p.y), { glow: GLOW_YOU, flip: p.face < 0 && !this.machine });
    if (this.machine) {
      const m = MACHINES.find((z) => z.id === this.machine)!;
      const tx = this.sx(m.x), ty = this.y(m.id === 'box' ? 54 : m.id === 'relay' ? m.h + 12 : m.id === 'till' ? 38 : 30);
      x.strokeStyle = 'rgba(0,255,255,.85)'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(box.x0 + box.w, box.y0 + 16); x.quadraticCurveTo((box.x0 + box.w + tx) / 2, box.y0 + 30, tx - 8, ty); x.stroke(); x.lineWidth = 1;
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
    if (this.bubble || this.machine || this.showEnd || this.zoneHost?.overlayOpen || this.mapView) return;
    const t = this.nearest();
    if (!t) return;
    const x = this.x;
    x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center';
    x.fillStyle = 'rgba(0,255,255,.95)'; x.shadowColor = 'rgba(0,255,255,.8)'; x.shadowBlur = 6;
    const h = t.promptH ?? (t.kind === 'jack' ? (t.id === 'box' ? 78 : t.id === 'relay' ? t.h + 48 : 96) : t.kind === 'read' ? 160 : t.id === 'fixer' ? 66 : 62);
    x.fillText(t.label, this.sx(t.x), this.y(h));
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
    x.fillStyle = 'rgba(255,136,0,.85)'; x.fillText(this.placeName.replace(/^the /, '').toUpperCase(), 8, 12);
    x.fillStyle = 'rgba(255,217,165,.7)';
    x.fillText('TOKENS ' + s.tokens + ' · MODULES ' + (ownedModules(s).join(' ') || '-') + (sound.enabled ? ' · SOUND' : ''), 8, 23);
    const zh = this.zoneHost;
    if (zh) { x.fillStyle = 'rgba(255,61,242,.9)'; x.fillText('GOAL ' + zh.objective(), 8, 34); }
    if (!this.seenControls || this.t < 600) {
      x.fillStyle = 'rgba(255,217,165,.55)';
      if (zh) x.fillText(this.touch ? 'tap things to open them · HACK see everything · BOARD wire, add timers' : 'tap or click things to open them · E near things · H hack vision · B board · / terminal · ESC leave', 8, this.touch ? 45 : this.viewH - 8);
      else if (this.touch) x.fillText('JMP jump · ACT talk / jack in · >_ terminal · ESC twice to leave', 8, 34);
      else x.fillText('<- -> walk · SHIFT run · E talk / jack in · / terminal · M sound · ESC leave', 8, this.viewH - 8);
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
    x.fillStyle = 'rgba(0,255,255,.9)'; x.fillText('ENTER keep exploring · ESC back to the landing page', cx, cy + 66);
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

  /** Arrive in a zone by id ('downtown', 'yard', 'capsule' or a scene id; anything else is Downtown), at its spawn. */
  handTo(zone: string) {
    if (zone === 'yard' || zone === 'capsule') this.goTo(zone, true);
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
      // The platform's BOARD only shows while a train is in with its doors open.
      if (e.action === 'board' && !metroDoorsOpen(this.t)) continue;
      const label = e.action === 'out' ? (this.trip ? '[E] DOORS LOCKED' : '[E] STEP OUT · ' + STATIONS[this.station].name) : e.label;
      list.push({ kind: 'scene', id: 'exit:' + e.id, x: e.x, h: 0, label, promptH: e.promptH ?? 70 });
    }
    for (const r of s.readables ?? []) list.push({ kind: 'scene', id: 'read:' + r.id, x: r.x, h: 0, label: r.label ?? '[E] READ', promptH: r.promptH ?? 70 });
    return list;
  }

  /** E next to a scene's exit or readable. An exit lands you at its matching door in the destination. */
  private useScene(target: string) {
    const s = this.scene!, [kind, id] = target.split(':');
    if (kind === 'read') {
      const r = s.readables!.find((z) => z.id === id)!;
      this.say(r.name, r.pages, r.x, r.h ?? 70);
      return;
    }
    const e = s.exits.find((z) => z.id === id)!;
    if (e.action === 'board') { if (metroDoorsOpen(this.t)) this.enterTrain('downtown'); return; }
    if (e.action === 'out') { this.stepOut(); return; }
    if (e.action === 'line') { this.openLineMap(); return; }
    if (e.action === 'taxi') { this.hailTaxi(); return; }
    if (e.to === 'train') { this.enterTrain(stationOf(this.zone)); return; }
    if (e.to === 'downtown' || e.to === 'yard' || e.to === 'capsule' || isSceneId(e.to)) this.travel(e.to, e.at);
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
    if (zone === 'downtown' || zone === 'yard' || zone === 'capsule') this.goTo(zone, false, at);
    else this.enterScene(zone, false, at);
  }

  /** The player walked into a border: leave through that edge's exit, if the zone has one, still walking the same way. */
  private walkOff(edge: 'left' | 'right') {
    const s = this.scene;
    const e = s ? s.exits.find((z) => z.edge === edge && (!z.requires || this.save.flags[z.requires])) : EDGES[this.zone]?.[edge];
    if (!e || !(e.to === 'downtown' || e.to === 'yard' || e.to === 'capsule' || isSceneId(e.to))) return;
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
    if (id === 'metro' && this.reduced) metroSync(this.t);
    this.travel(id, 'downtown');
  }

  /** Board the train at a station: in the carriage by the door, stopped, doors open. */
  private enterTrain(at: Station) {
    this.station = at;
    this.trip = null;
    Object.assign(ride, { stop: STATIONS[at].name, next: '', moving: false, open: 1 });
    this.travel('train', 'out');
  }

  /** E at the train's door: out at the current stop, onto that station's platform or door. */
  private stepOut() {
    if (this.trip) { this.flash('doors locked · next stop ' + STATIONS[this.trip.to].name); sound.denied(); return; }
    const st = STATIONS[this.station];
    if (this.station === 'downtown') metroSync(this.t);
    this.travel(st.zone, st.at);
  }

  /** E at the line map in the train: the city map, to pick the next stop. */
  private openLineMap() {
    if (this.trip) { this.flash('next stop ' + STATIONS[this.trip.to].name); return; }
    const i = LINE.indexOf(this.station);
    this.mapView = { mode: 'metro', options: [...LINE], index: (i + 1) % LINE.length };
    sound.open();
  }

  /** E at a taxi stand: the city map to pick a stand, if you can pay. */
  private hailTaxi() {
    if (this.save.tokens < FARE) {
      sound.denied();
      this.say('DRIVER', DRIVER_BROKE, this.p.x + 20, 40);
      return;
    }
    const here = standOf(this.zone), i = here ? STAND_IDS.indexOf(here) : -1;
    this.mapView = { mode: 'taxi', options: [...STAND_IDS], index: (i + 1) % STAND_IDS.length };
    sound.open();
  }

  /** The city map on its own, just to look at (for a menu to call). Esc closes it. */
  showMap() {
    if (!this.running || this.flight) return;
    this.bubble = null;
    this.mapView = { mode: 'view', options: [], index: 0 };
  }

  /** True while the city map is open. */
  get mapOpen() { return !!this.mapView; }

  private mapKey(e: KeyboardEvent) {
    const m = this.mapView!, k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(k)) e.preventDefault();
    if (e.repeat) return;
    if (k === 'm' || k === 'M') { const on = sound.toggle(); this.flash('sound ' + (on ? 'on' : 'off')); return; }
    if (k === 'Escape' || m.mode === 'view') { if (k === 'Escape' || k === 'e' || k === 'E' || k === 'Enter') { this.mapView = null; sound.close(); } return; }
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
    } else if (m.mode === 'metro') {
      const to = pick as Station;
      if (to === this.station) { this.flash('this is ' + STATIONS[to].name); return; }
      this.trip = { to, start: this.clock };
      Object.assign(ride, { next: STATIONS[to].name });
      sound.close();
    }
  }

  /** Flights land; the train closes its doors, rides, and opens them at the stop. */
  private updateTravel(dt: number) {
    if (this.flight && this.clock - this.flight.start >= FLIGHT) {
      const to = this.flight.to;
      this.flight = null;
      this.travel(STANDS[to].zone, 'taxi');
      this.flash('-' + FARE + ' token · ' + STANDS[to].name);
    }
    if (this.zone !== 'train') return;
    const tr = this.trip;
    if (!tr) { ride.moving = false; ride.open = Math.min(1, ride.open + dt / DOORS_CLOSE); return; }
    const e = this.clock - tr.start;
    let speed = 0;
    if (e < DOORS_CLOSE) ride.open = Math.max(0, 1 - e / DOORS_CLOSE);
    else if (e < DOORS_CLOSE + RIDE) { ride.open = 0; ride.moving = true; speed = 5 * Math.sin((Math.PI * (e - DOORS_CLOSE)) / RIDE); }
    else {
      this.station = tr.to;
      this.trip = null;
      Object.assign(ride, { stop: STATIONS[tr.to].name, next: '', moving: false });
      this.flash(STATIONS[tr.to].name + ' · doors open');
      sound.open();
    }
    ride.dist += speed * dt;
  }

  private drawMap() {
    const m = this.mapView;
    if (!m) return;
    const st: MapState = {
      mode: m.mode, options: m.options, index: m.index, zone: this.zone, station: this.station,
      seen: (z) => !!this.save.flags[seenFlag(z)], gateOpen: !!this.save.flags.end, tokens: this.save.tokens, t: this.clock,
    };
    drawCityMap(this.x, this.viewW, this.viewH, st);
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
