import {placeFrom} from '../world/zone-graph';
import type {PlayerState,ScenePlacement} from './state';
import {projection} from './camera';
import type {CameraProjection} from '../art/core/geometry';
import type {CompanionSource} from '../engine/gameplay/companion-source';
import type {openingStoryModel} from '../story/opening';

import {type InteractionTarget as Target} from './interaction-targets';

import {type SceneModel} from '../engine/model';

import type {GameRuntimeSources} from './game-sources';

import { drawCapsuleWash } from '../art/atmosphere/capsule-wash';
import {vehicleSeatHeight} from '../engine/level-vehicles';
import { AVATAR_PAINTERS } from './avatars';
import {renderWorldFrame} from './render-scene';
import {type ZoneFrame} from './frame';
import { GameplaySession } from '../engine/gameplay/session';

import {SceneHost} from "../engine/index";

import {sceneTitle,type SceneDef,type SceneId,type SceneView} from "../scenes/index";

import {endCardText,type EndCardSource} from "../story/end-card";
import {cardFrame,gateFrame,washTone} from "../story/story-rules";

import { KeyBar } from "../ui/keybar";
import { Hints } from "../ui/hints";

import { ShiftGuidance } from "../ui/shift-guidance";

import {type Light} from "../world/light";

import {type Weather} from "../world/weather";

import { Companion, COMPANION_LOOKS } from './companion';

import {playProfile} from "./play-profile";
import {who,type Save} from "./save";

import type {CameraState,ScenesState,TimingState,PresentationState} from './state';

/** PresentationFrame functions use runtime-owned data; they never start a loop or own a save. */
export interface PresentationFramePort{
  view: (camera?:CameraProjection) => SceneView;
  x: CanvasRenderingContext2D;
  camera: CameraState;
  def: SceneDef;
  scenes: ScenesState;
  zh: SceneHost;
  reduced: boolean;
  timing: TimingState;
  sources: GameRuntimeSources;
  weatherHere: () => Weather;
  lightHere: (W: Weather | null) => Light;
  zoneFrame: (z: ScenePlacement,camera?:CameraProjection) => ZoneFrame;
  p: PlayerState;
  companionPresent: boolean;
  companionBody: Companion;
  companionDoc: CompanionSource;
  interactionHost: SceneHost;
  hostPlacement: (host: SceneHost) => ScenePlacement | undefined;
  openingStory: typeof openingStoryModel;
  save: Save;
  groundUnder: (wx: number, h: number) => number;
  presentation: PresentationState;
  nearest: () => Target | null;
  keyBar: KeyBar;
  canvas: HTMLCanvasElement;
  clockText: string;
  hints: Hints;
  communicationCovered: boolean;
  gameplayFor: (id: SceneId, providedModel?: SceneModel) => GameplaySession | undefined;
  story: string;
  libraryGoal: () => string | null;
  shiftGuidance: ShiftGuidance | undefined;
  endCard: EndCardSource;
  zoneGraph:import('../world/zone-graph').ZoneGraphSource;
}
export function drawWorld(port:PresentationFramePort) {
    const camera=projection(port.camera),v = port.view(camera);
    renderWorldFrame({ context: port.x, scale: camera.k, view: v, scene: port.def, sceneId: port.scenes.here,
      host: port.zh, reduced: port.reduced, clock: port.timing.clock,backdrops:port.sources.backdrops,
      weather: () => port.weatherHere(), lighting: W => port.lightHere(W),
      preparePresentation: prepared => port.zh.preparePresentation(prepared, port.zh.visionOn && port.def.layers ? 'devices' : 'all'),
      mobiles:[...port.scenes.mobileOwners].filter(id=>id!==port.scenes.here&&!port.scenes.joinedZones.some(z=>z.id===id&&port.scenes.zoneTiers.get(id)==='visible')).flatMap(id=>{const at=placeFrom(port.zoneGraph,port.scenes.here,Infinity).get(id);return at?[port.zoneFrame({id,...at},camera)]:[];}),
      roomWash: () => drawLight(port,v), actors: () => drawCharacters(port,v),
      prompts: () => drawPrompt(port,v), bubbles: () => drawBubble(port,v),
      ...(port.scenes.joinedZones?.length ? { joined: port.scenes.joinedZones.filter(z => port.scenes.zoneTiers?.get(z.id) === 'visible').map(z => port.zoneFrame(z,camera)) } : {}),
    });
  }

export function drawCharacters(port:PresentationFramePort,view=port.view()) {
    const x = port.x, p = port.p;
    if (port.companionPresent) port.companionBody.draw(x, (wx) => view.sx(wx), (h) => view.y(h), port.timing.t, COMPANION_LOOKS[port.companionDoc.look]);
    // jacked in: a machine's schematic is open and you stand at it, so the deck's cable runs to it (any scene)
    const host=port.interactionHost,open = host.viewing,at=port.hostPlacement(host);
    const jack = open&&at ? host.model.spots().map(sp=>({...sp,x:sp.x+at.dx,y:sp.y+at.dh,...(sp.floorH===undefined?{}:{floorH:sp.floorH+at.dh})})).find(sp=>sp.id===open&&Math.abs(sp.x-p.x)<40&&Math.abs(p.y-(sp.floorH??(sp.y>40?sp.y:0)))<8) : undefined;
    if (jack) p.face = jack.x >= p.x ? 1 : -1;
    const character=port.openingStory.persona(port.save.flags)?.character,player=character?{...playProfile().player,avatar:'person' as const,character}:playProfile().player;
    AVATAR_PAINTERS[player.avatar]({ x, view, p, t: port.timing.t, jack, player, shadowGround: () => host.visionOn ? null : port.groundUnder(p.x, p.y), carry: port.def.dockworkerCarry?.(port.save.flags, port.save.gameplay) ?? null,seat:port.scenes.level?vehicleSeatHeight(port.scenes.level):undefined });
  }

function drawPrompt(port:PresentationFramePort,view=port.view()) {
    if (port.presentation.bubble || port.presentation.showEnd || port.interactionHost.overlayOpen || port.interactionHost.popupOpen || port.presentation.mapView || port.presentation.beat || port.presentation.sleep || port.presentation.hop || port.presentation.flight) return;
    const t = port.nearest();
    if (!t) return;
    const x = port.x;
    x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'center';
    x.fillStyle = 'rgba(0,255,255,.95)'; x.shadowColor = 'rgba(0,255,255,.8)'; x.shadowBlur = 6;
    const h = t.promptH ?? 62;
    // kept inside the view, so a way out at a scene's very end still reads in full
    const half = x.measureText(t.label).width / 2 + 4;
    x.fillText(t.label, Math.max(half, Math.min(view.viewW - half, view.sx(t.x))), view.y(h));
    x.restore();
  }

function wrap(port:PresentationFramePort,text: string,max: number) {
    const words = text.split(' '), lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (port.x.measureText(next).width > max && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  }

function drawBubble(port:PresentationFramePort,view=port.view()) {
    const b = port.presentation.bubble;
    port.presentation.bubbleBox = null;
    if (!b) return;
    const x = port.x;
    x.save();
    x.font = '600 10px "IBM Plex Mono", monospace'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    const full = b.pages[b.page], shown = full.slice(0, Math.floor(b.chars));
    const lines = wrap(port,full, 230), shownLines = wrap(port,shown, 230);
    const w = Math.max(...lines.map((l) => x.measureText(l).width), x.measureText(b.name).width) + 28;
    const h = lines.length * 13 + 32;
    const bx = Math.max(6, Math.min(view.viewW - w - 6, view.sx(b.x) - w / 2));
    const by = Math.max(6, view.y(b.h) - h - 50);
    port.presentation.bubbleBox = { x: bx, y: by, w, h };
    x.fillStyle = '#000'; x.fillRect(bx, by, w, h);
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(bx + 1, by + 1, w - 2, h - 2); x.lineWidth = 1;
    x.fillStyle = b.name === 'YOU' ? '#7ff' : '#ffd9a5'; x.fillText(b.name !== 'YOU' ? b.name : (playProfile().player.name !== undefined || port.openingStory.persona(port.save.flags)) ? 'YOU' : who(port.save).toUpperCase(), bx + 10, by + 15);
    x.fillStyle = '#fff'; shownLines.forEach((l, i) => x.fillText(l, bx + 10, by + 30 + i * 13));
    if (b.chars >= full.length && Math.floor(port.timing.t / 20) % 2) {
      x.beginPath(); x.moveTo(bx + w - 16, by + h - 10); x.lineTo(bx + w - 8, by + h - 10); x.lineTo(bx + w - 12, by + h - 5); x.closePath(); x.fill();
    }
    x.restore();
  }

export function drawHud(port:PresentationFramePort) {
    const x = port.x, vision = port.interactionHost.visionOn;
    x.save();
    x.font = '600 8px "IBM Plex Mono", monospace'; x.textAlign = 'left';
    // below the key bar along the top (its height in world units)
    const top = (port.keyBar.root.offsetHeight + 8) * (port.canvas.width / (port.canvas.clientWidth || 1)) / port.camera.k;
    let y = top - 1;
    // hack vision keeps only the goal: what you own is in the LOGIC drawer there
    if (!vision) {
      if(!playProfile().chrome.minimalHud){x.fillStyle = 'rgba(255,136,0,.85)'; x.fillText(sceneTitle(port.def) + port.clockText, 8, top + 10);}
      y = top + 10;
      // what you own is not here (Tommi, 2026-10-15): hack vision's LOGIC drawer has it, and a short
      // line shows when something comes

    }
    // the hint lane (ui/hints.ts): one line at a time, on a dark strip so it reads over any scene
    const hint = port.hints.step(port.hints.notices.time,port.communicationCovered||!!port.presentation.bubble||!!port.interactionHost.popupOpen||port.interactionHost.acknowledgmentPending);
    port.presentation.hudHint = hint?.text ?? '';
    if (hint) {
      y += 11;
      x.fillStyle = 'rgba(0,0,0,' + 0.6 * hint.alpha + ')'; x.fillRect(6, y - 8, x.measureText(hint.text).width + 4, 11);
      x.fillStyle = (hint.tone==='error'?'rgba(255,90,110,':hint.tone==='success'?'rgba(34,197,94,':'rgba(255,217,165,') + 0.95 * hint.alpha + ')'; x.fillText(hint.text, 8, y);
    }
    // the scene's goal, where it has goals (a scene without a data file has none)
    // (the opening has its own: opening.ts)
    const zh = port.zh.model.data.goals.length ? port.zh : null, story = port.def.objective?.(port.save.flags,port.gameplayFor(port.scenes.here)?.state()) ?? port.def.phases?.[port.story]?.goal ?? port.libraryGoal();
    if (story || zh) {
      y += 11;
      if (port.shiftGuidance) port.shiftGuidance.draw(x, port.camera.viewW, port.camera.viewH, y);
      else { x.fillStyle = 'rgba(255,61,242,.9)'; x.fillText('GOAL ' + (story ?? zh!.objective()), 8, y); }
    }
    // the keys and what they do: the key bar along the top (keybar.ts)
    // how far down the HUD's lines reach (world units under the key bar): captions and popups keep below
    port.presentation.hudH = vision ? y + 4 - top : Math.max(46, y + 11 + 4 - top);
    x.restore();
  }

export function drawEnd(port:PresentationFramePort) {
    const x = port.x, cx = port.camera.viewW / 2, cy = port.camera.viewH / 2 - 30;
    x.save();
    x.fillStyle = 'rgba(0,0,0,.78)'; x.fillRect(0, 0, port.camera.viewW, port.camera.viewH);
    x.textAlign = 'center';
    x.font = '600 16px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,136,0,.95)'; x.shadowColor = 'rgba(255,136,0,.8)'; x.shadowBlur = 10;
    const card = endCardText(port.endCard, { controlled: port.save.controlled.length, handle: who(port.save) });
    x.fillText(card.title, cx, cy);
    x.shadowBlur = 0; x.font = '10px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,217,165,.9)';
    card.lines.forEach((l, i) => x.fillText(l, cx, cy + 26 + 16 * i));
    x.fillStyle = 'rgba(0,255,255,.9)'; x.fillText(card.prompt, cx, cy + 34 + 16 * card.lines.length);
    x.restore();
  }

export function drawBeat(port:PresentationFramePort) {
    if (!port.presentation.beat) return;
    const view=port.view();
    const x = port.x, g = gateFrame(port.presentation.beat.gate, port.timing.clock - port.presentation.beat.start), ok = g.ok, line = g.text;
    x.save(); x.font = '600 9px "IBM Plex Mono", monospace'; x.textAlign = 'left'; x.textBaseline = 'middle';
    const w = x.measureText(port.presentation.beat.gate.ok).width + 16, cx = Math.max(w / 2 + 4, Math.min(port.camera.viewW - w / 2 - 4, view.sx(port.presentation.beat.checkpoint.x)));
    const top = view.y(96 + port.presentation.beat.checkpoint.h), gate = view.y(36 + port.presentation.beat.checkpoint.h);
    x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(cx - w / 2, top, w, 20);
    x.strokeStyle = ok ? 'rgba(34,197,94,.8)' : 'rgba(255,217,165,.45)'; x.strokeRect(cx - w / 2 + 0.5, top + 0.5, w - 1, 19);
    x.fillStyle = ok ? 'rgba(34,197,94,.95)' : 'rgba(255,217,165,.92)'; x.fillText(line, cx - w / 2 + 8, top + 10.5);
    x.fillStyle = 'rgba(255,217,165,.45)'; x.fillRect(view.sx(port.presentation.beat.checkpoint.x), top + 20, 1, gate - top - 20);
    x.restore();
  }

export function drawSleep(port:PresentationFramePort) {
    if (!port.presentation.sleep) return;
    const x = port.x, card = port.presentation.sleep.card, f = cardFrame(card, port.timing.clock - port.presentation.sleep.start);
    x.fillStyle = 'rgba(0,0,0,' + f.dark + ')'; x.fillRect(0, 0, port.camera.viewW, port.camera.viewH);
    if (!f.showing) return;
    x.save(); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '600 18px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,136,0,' + 0.95 * f.fade + ')';
    x.fillText(f.reading === 'from' ? card.from : card.to, port.camera.viewW / 2, port.camera.viewH / 2 - 6);
    x.font = '8px "IBM Plex Mono", monospace'; x.fillStyle = 'rgba(255,217,165,' + 0.7 * f.fade + ')';
    x.fillText(card.label, port.camera.viewW / 2, port.camera.viewH / 2 + 14);
    x.restore();
  }

function drawLight(port:PresentationFramePort,view=port.view()) {
    if (port.interactionHost.visionOn) return;
    const tone = washTone(port.def.wash, { phase: port.story, flags: port.save.flags, state: (key) => port.interactionHost.model.get(key) });
    if (tone) drawCapsuleWash(port.x, view.viewW, view.viewH, tone);
  }

export function probeGate(port:PresentationFramePort) { return port.presentation.beat ? gateFrame(port.presentation.beat.gate, port.timing.clock - port.presentation.beat.start).bare : null; }

export function probeCard(port:PresentationFramePort) { if (!port.presentation.sleep) return null; const f = cardFrame(port.presentation.sleep.card, port.timing.clock - port.presentation.sleep.start); return { stage: f.stage, text: f.reading === 'from' ? port.presentation.sleep.card.from : port.presentation.sleep.card.to, label: port.presentation.sleep.card.label }; }
