import type {PlayerState} from './state';
import type {LineSystem} from '../world/transport/line';
import type {runtimeSequenceDocuments} from '../story/sequence-documents';
import type {openingStoryModel} from '../story/opening';

import {CLOCK_SAVE,hmOf} from './tuning';

import { vehicleDoorsAt } from '../world/vehicles';

import {movingInteractions} from '../engine/gameplay/moving-interactions';

import {type SceneModel} from '../engine/model';

import type {MetroStart} from '../world/transport/metro-start';

import { GameplaySession } from '../engine/gameplay/session';
import {taxiDurationFor} from '../story/cutscenes/taxi';

import {SceneHost} from "../engine/index";

import {type SceneDef,type SceneId,type SceneRest} from "../scenes/index";

import {applyCounter,attentionAim,cardFrame,clockPin,gateFrame,triggerFires,triggerStarts,type CardSpec,type Cue,type Say} from "../story/story-rules";

import {type PingTarget} from '../story/opening';

import {type MapState} from "../ui/citymap";

import {Terminal} from "../ui/terminal";

import type {CityModel,MapPlace,Stand} from '../world/city';
import { city,parseHM,TRAVEL,WAIT_CARD,WAITS,type WaitTo } from "../world/clock";

import {startRide} from '../engine/gameplay/mechanisms/line-ride';

import { sound } from './audio';

import {Companion} from './companion';
import {EDITOR_PLAY} from "./mode";
import {playProfile} from "./play-profile";
import {type Save} from "./save";

import type {InputState,ScenesState,TimingState,PresentationState} from './state';

/** StoryTransitions functions use runtime-owned data; they never start a loop or own a save. */
export interface StoryTransitionsPort{
  runOpeningWorkflow: (role: import('../story/opening-source').OpeningWorkflow) => boolean;
  term: Terminal;
  presentation: PresentationState;
  timing: TimingState;
  persistSave: () => void;
  syncHud: () => void;
  scenes: ScenesState;
  enter: (id: SceneId, quiet?: boolean, at?: string) => void;
  hostOf: (id: SceneId) => SceneHost;
  p: PlayerState;
  sceneDefinition: (id: SceneId) => SceneDef;
  def: SceneDef;
  zh: SceneHost;
  companionBody: Companion;
  say: (name: string, pages: string[], x: number, h: number) => void;
  touch: boolean;
  finishExit: (go: { to: string; at?: string; } | { barrier: string; } | null) => void;
  story: string;
  openingStory: typeof openingStoryModel;
  input: InputState;
  editorClock: "running" | "fixed" | "story";
  save: Save;
  gameplayFor: (id: SceneId, providedModel?: SceneModel) => GameplaySession | undefined;
  stampEl: HTMLElement;
  placeName: string;
  metro: LineSystem;
  world: CityModel;
  sequenceDocuments: typeof runtimeSequenceDocuments;
  travel: (id: SceneId, at?: string) => void;
  flash: (text: string) => void;
  canvas: HTMLCanvasElement;
  driverReply: (pages: string[]) => void;
  hackLocked: () => boolean;
  mapState: () => MapState;
  enginesPaused: boolean;
}
export function runCues(port:StoryTransitionsPort,cues: readonly Cue[]):boolean {
    const says: Say[] = []; let ok = true, changed = false;
    for (const cue of cues) {
      if ('milestone' in cue) { if (!port.runOpeningWorkflow(cue.milestone)) { ok = false; break; } changed = true; }
      else if ('say' in cue) says.push(cue.say);
      else if ('print' in cue) cue.print.lines.forEach((l) => port.term.print((cue.print.prefix ?? '') + l, cue.print.tone ?? 'out'));
      else if ('sound' in cue) sound[cue.sound]();
      else if ('stage' in cue) { restage(port,cue.stage); changed = true; }
      else if ('counter' in cue) applyCounter(port.presentation.counters, cue.counter, port.timing.clock);
      else if ('advance' in cue) { city.advance(cue.advance); syncClock(port,true); changed = true; }
    }
    if (changed) { port.persistSave(); port.syncHud(); }
    if (ok) sayChain(port,says);
    return ok;
  }

function restage(port:StoryTransitionsPort,s: { scene: string; reset?: true; face?: -1 | 1 }) {
    const id = s.scene as SceneId;
    if (port.scenes.here !== id) port.enter(id, false);
    if (s.reset) port.hostOf(id).reset();
    Object.assign(port.p, { x: port.sceneDefinition(id).spawn, y: 0, vy: 0, onGround: true, ...(s.face ? { face: s.face } : {}) });
    const home = port.def.perch?.(port.zh.model);
    if (home) port.companionBody.place(home.x, home.h, home.rest);
  }

export function sayChain(port:StoryTransitionsPort,says: readonly Say[]) {
    const [first, ...rest] = says;
    if (!first) return;
    port.say(first.speaker, port.touch ? first.touchPages ?? first.pages : first.pages, port.p.x, first.height);
    if (rest.length && port.presentation.bubble) port.presentation.bubble.then = () => sayChain(port,rest);
  }

export function updateStory(port:StoryTransitionsPort) {
    const gate = port.presentation.beat;
    if (gate && gateFrame(gate.gate, port.timing.clock - gate.start).done) {
      port.presentation.beat = null;
      if (runCues(port,gate.gate.then)) port.finishExit(gate.go);
    }
    if (port.presentation.sleep) {
      const card = port.presentation.sleep.card, f = cardFrame(card, port.timing.clock - port.presentation.sleep.start);
      if (!port.presentation.sleep.woke && f.mid) { port.presentation.sleep.woke = true; runCues(port,card.mid ?? []); }
      if (f.done) { port.presentation.sleep = null; runCues(port,card.end ?? []); }
      return;
    }
    const st = port.story, triggers = port.openingStory.TRIGGERS;
    for (const key of triggerStarts(triggers, st, port.scenes.here, port.presentation.counters)) port.presentation.counters[key] = port.timing.clock;
    for (const t of triggers) {
      if (triggerFires(t, { phase: st, scene: port.scenes.here, clock: port.timing.clock, counters: port.presentation.counters, bubble: !!port.presentation.bubble, popup: port.zh.popupOpen, viewing: port.zh.viewing ?? null })) runCues(port,t.do);
    }
  }

export function startCard(port:StoryTransitionsPort,card: CardSpec,closeAll: boolean) {
    port.input.keys.clear();
    port.presentation.bubble = null;
    if (closeAll) port.zh.closeAll();
    port.presentation.sleep = { start: port.timing.clock, woke: false, card };
    sound.close();
  }

export function clockRuns(port:StoryTransitionsPort) {
    return !port.presentation.mapView && !port.presentation.netView && !port.presentation.flight && !port.presentation.hop && !port.zh.panelOpen && !port.presentation.sleep && !port.presentation.showEnd && !port.presentation.beat;
  }

export function pinStory(port:StoryTransitionsPort) {
    if(EDITOR_PLAY&&port.editorClock!=='story'){if(port.editorClock==='fixed')city.pin(port.save.clock.min);return;}
    if (port.def.storyMinute||port.def.storyRun||port.def.storyDay||playProfile().clock.rule === 'scene') {
      const day=port.def.storyDay?.(port.save.flags,port.gameplayFor(port.scenes.here)?.state());
      if(day!==undefined)port.save.clock.day=day;
      const at = port.def.storyMinute?.(port.save.flags,port.gameplayFor(port.scenes.here)?.state());
      if(at===undefined){const run=port.def.storyRun?.(port.save.flags,port.gameplayFor(port.scenes.here)?.state());city.run(run?.rate??1,run?.until);return;}
      city.run();
      if (city.pinned !== at) city.pin(at);
      return;
    }
    city.resetRun();
    const st = port.story, release = port.openingStory.CLOCK.release;
    const pin = clockPin({ pinned: port.openingStory.isPinned(port.save.flags), minute: parseHM(port.def.phases?.[st]?.time ?? ''), wasPinned: port.presentation.storyPinned, releaseMinute: parseHM(port.sceneDefinition(release.scene as SceneId).phases?.[release.phase]?.time ?? '') });
    if (pin.kind === 'hold') {
      if (pin.minute !== null) { if (city.pinned !== pin.minute) city.pin(pin.minute); }
      else if (city.pinned === null) city.pin(Math.floor(city.min));
      port.presentation.storyPinned = true;
    } else if (pin.kind === 'release') {
      port.presentation.storyPinned = false;
      city.release(pin.minute ?? undefined);
      port.persistSave();
    }
  }

export function syncClock(port:StoryTransitionsPort,force = false) {
    const t = city.stamp;
    if (force || t !== port.presentation.shownClock) {
      port.presentation.shownClock = t;
      port.stampEl.textContent = playProfile().chrome.minimalHud ? '' : t;
      if (!port.presentation.cut && !port.presentation.opening) port.syncHud();
    }
    if (port.timing.clock - port.presentation.clockSaved > CLOCK_SAVE) { port.presentation.clockSaved = port.timing.clock; port.persistSave(); }
  }

export function offerWait(port:StoryTransitionsPort,r: SceneRest,owner = port.scenes.here) {
    const bed = r.kind === 'bed';
    const items = WAITS.map((w) => ({ label: (bed && w.id === 'morning' ? 'sleep till ' : 'wait: ') + w.label, run: () => waitUntil(port,w, r) }));
    const host = owner === port.scenes.here ? port.zh : port.hostOf(owner);
    const box = (row: SceneRest) => ({ x: row.x, y: row.floorH ?? row.h ?? 0, w: 40, h: Math.max(16, (row.promptH ?? 60) - (row.floorH!==undefined?row.floorH:0) - 24) });
    host.choose('rest:' + r.id, bed ? 'YOUR BED' : r.kind === 'stool' ? 'A STOOL' : 'A BENCH', items, box(r), () => {
      const row = movingInteractions(owner === port.scenes.here ? port.def : port.sceneDefinition(owner),host.model).rests?.find(row => row.id === r.id);
      return row ? box(row) : null;
    });
    sound.open();
  }

function waitUntil(port:StoryTransitionsPort,w: WaitTo,r: SceneRest) {
    if (city.pinned !== null) return;
    const minutes = city.waitFor(w), from = city.text, to = city.min + minutes;
    const label = (r.kind === 'bed' ? 'SLEEPING · ' : 'WAITING · ') + port.placeName.toUpperCase();
    startCard(port,{ ...WAIT_CARD, from, to: hmOf(to), label, mid: [{ advance: minutes }] }, false);
  }

export function pingGoal(port:StoryTransitionsPort,t: PingTarget) {
    const aim = attentionAim(t, port.def, port.p.x, (id) => { const target = port.def.phases?.[port.story]?.targets?.[id]; return target ? port.openingStory.resolveTarget(target, port.def)?.x : undefined; }, (port.scenes.level?.source.vehicleFrames ?? []).flatMap(f => vehicleDoorsAt(f).map(d => d.x)));
    if (!aim) return;
    if ('device' in aim) { port.zh.ping(aim.device, 'look'); return; }
    port.presentation.goalAt = aim.x;
    port.zh.ping('goal', 'look');
  }

export function updateTravel(port:StoryTransitionsPort) {
    // Maps hold the ride as well as the engine that reads its position (P14).
    if (port.presentation.mapView || port.presentation.netView) return;
    // locked stations (metro source `locked`): LINE 0 stops there only once the city lock opens (the harbor: P14)
    port.metro.syncLocks(port.world, port.save.flags);
    if (port.presentation.flight && port.timing.clock - port.presentation.flight.start >= taxiDurationFor(port.sequenceDocuments.cinematics) * 60) {
      const to = port.presentation.flight.to;
      port.presentation.flight = null;
      // the flight costs its fixed time on the city clock (clock.ts TRAVEL)
      city.advance(TRAVEL.taxi);
      port.travel(port.world.STANDS[to].scene,port.world.STANDS[to].at);
      port.flash('-' + port.world.FARE + ' token · ' + port.world.STANDS[to].name);
    }
    // a quick trip moves you while the screen is dark, half way through its fade
    if (port.presentation.hop) {
      const e = port.timing.clock - port.presentation.hop.start;
      if (!port.presentation.hop.done && e >= port.world.HOP / 2) { port.presentation.hop.done = true; city.advance(TRAVEL.quick); port.travel(port.presentation.hop.place.entrance, port.presentation.hop.place.at); }
      if (e >= port.world.HOP) port.presentation.hop = null;
    }
  }

export function fly(port:StoryTransitionsPort,to: Stand) {
    port.presentation.mapView = null;
    port.canvas.style.cursor = '';
    if (to === port.world.standOf(port.scenes.here)) { port.flash('you are already here'); return; }
    // a destination lock (city.json `LOCKS`; the harbor: P14): no flights to a shut destination
    if (!port.world.transportAccess(to, port.save.flags).ok) { port.driverReply(port.world.DRIVER_HARBOR); return; }
    port.save.tokens -= port.world.FARE;
    port.persistSave();
    port.syncHud();
    port.presentation.flight = { to, start: port.timing.clock };
    sound.open();
  }

export function quickTravel(port:StoryTransitionsPort,place: MapPlace) {
    if (port.hackLocked()) { port.flash('not now: ' + (port.def.phases?.[port.story]?.goal ?? 'later')); sound.denied(); return; }
    const why = port.world.placeBlocked(place, port.mapState());
    if (why) { port.flash(why.toLowerCase()); sound.denied(); return; }
    port.presentation.mapView = null;
    port.canvas.style.cursor = '';
    port.presentation.hop = { place, start: port.timing.clock, done: false };
    sound.close();
  }

export function runRide(port:StoryTransitionsPort,scene: SceneId,ride: { mover: string; path: string }) {
    const [device, noun] = ride.mover.split('.');
    if (port.hostOf(scene).model.runPath(device, noun, ride.path) !== 'started') throw new Error('The mover ' + ride.mover + ' has no path ' + ride.path);
  }

export function startMetro(port:StoryTransitionsPort,start: MetroStart) {
    Object.assign(port.metro.lineOpen, start.lineOpen);
    const host = port.hostOf(port.world.TRANSPORT.boarding.scene as SceneId);
    startRide(host.model, port.metro, start);
    host.setPaused(port.enginesPaused);
  }
