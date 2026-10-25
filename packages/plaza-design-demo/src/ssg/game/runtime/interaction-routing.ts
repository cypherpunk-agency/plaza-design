import type {PlayerState} from './state';
import type {CRITTER_REACTIONS} from '../engine/gameplay/critter-reactions';
import type {openingStoryModel} from '../story/opening';

import {resolveExit,resolveUse,useAccess,useBox,type InteractionTarget as Target} from './interaction-targets';

import {movingInteractions} from '../engine/gameplay/moving-interactions';

import {type SceneModel} from '../engine/model';

import {critterReaction,critterReply} from '../engine/gameplay/critter-reactions';
import {botConversationId} from '../engine/gameplay/bot-conversations';

import {barrierAccess} from '../world/access';

import {ConversationSession} from '../engine/gameplay/conversation';

import { GameplaySession } from '../engine/gameplay/session';

import { MAX_EVERYDAY } from "../engine/host";
import {SceneHost} from "../engine/index";
import type { PopupItem } from "../engine/popup";

import {type SceneDef,type SceneExit,type SceneId,type SceneRest,type SceneSaid,type SceneUse,type UseCtx} from "../scenes/index";

import {barrierPhaseRule,type CardSpec,type Cue} from "../story/story-rules";

import {type ExitRule} from '../story/opening';

import { Hints } from "../ui/hints";

import {city} from "../world/clock";

import {type Weather} from "../world/weather";
import { sound } from './audio';
import {characterHeight,characterX,talkTo} from './characters';
import {Companion} from './companion';

import {type Save} from "./save";
import {levelInteract,levelPass,levelOpened,savedByScene,type Movers} from "../engine/level";

import type {InputState,ScenesState,TimingState,PresentationState} from './state';

/** InteractionRouting functions use runtime-owned data; they never start a loop or own a save. */
export interface InteractionRoutingPort{
  hints: Hints;
  presentation: PresentationState;
  interactionHost: SceneHost;
  nearest: () => Target | null;
  scenes: ScenesState;
  p: PlayerState;
  movers: Movers;
  introduceScene: () => void;
  persistSave: () => void;
  hostOf: (id: SceneId) => SceneHost;
  def: SceneDef;
  story: string;
  zh: SceneHost;
  gameplayFor: (id: SceneId, providedModel?: SceneModel) => GameplaySession | undefined;
  companionBody: Companion;
  say: (name: string, pages: string[], x: number, h: number) => void;
  dialogueCompletion: (cue: import('../engine/gameplay/conversation').ConversationFrame["completion"]) => void;
  sceneDefinition: (id: SceneId) => SceneDef;
  startCard: (card: CardSpec, closeAll: boolean) => void;
  openingStory: typeof openingStoryModel;
  offerWait: (r: SceneRest, owner?: SceneId) => void;
  critters: typeof CRITTER_REACTIONS;
  timing: TimingState;
  save: Save;
  flash: (text: string) => void;
  weatherHere: () => Weather;
  syncHud: () => void;
  notify: (text: string, tone?: import('../ui/communication').MessageTone) => void;
  hailTaxi: () => void;
  showMap: () => void;
  hasScene: (id: string) => id is SceneId;
  travel: (id: SceneId, at?: string) => void;
  gameplayStatePort: (id?: SceneId) => import('../engine/gameplay/types').StatePort;
  runCues: (cues: readonly Cue[]) => boolean;
  input: InputState;
}
export function interact(port:InteractionRoutingPort) {
    port.hints.done('ctl.use');
    const b = port.presentation.bubble;
    if (b) {
      const full = b.pages[b.page].length;
      if (b.chars < full) { b.chars = full; return; }
      if (b.page < b.pages.length - 1) { b.page++; b.chars = 0; return; }
      port.presentation.bubble = null;
      b.then?.();
      return;
    }
    if(port.interactionHost.acknowledgmentPending){port.interactionHost.advanceAcknowledgment();return;}
    const target = port.nearest();
    if (!target) return;
    if (target.kind === 'level') { if (port.scenes.level && !passBarrier(port,target.id)&&levelInteract(port.scenes.level, target.id, port.p, port.movers)){port.introduceScene();port.persistSave();} return; }
    if (target.kind === 'exit' || target.kind === 'life') { useLife(port,target.id, target.owner); return; }
    // a device opens its popup; the scene's own target may be a way out (its code returns the exit)
    if (target.kind === 'device') {
      if(target.owner&&target.owner!==port.scenes.here){
        const host=port.hostOf(target.owner);
        if(host.model.attachmentOffsets()?.devices?.[target.id])host.use(target.id);
        return;
      }
      // the opening: a scene's own way out (the flat's door) may say something else in this state
      const rule = port.def.phases?.[port.story]?.exits?.[target.id];
      if (rule && storyExit(port,rule, target.x, null, undefined, target.id)) return;
    }
    if (target.kind === 'device') { const out = port.zh.use(target.id), e = out ? port.def.exits.find((z) => z.id === out) : undefined; if (e) useExit(port,e); return; }
    if (target.kind === 'companion') { const pet=port.def.companion?.pet;if(!pet)return;const conversation=new ConversationSession(port.gameplayFor(port.scenes.here)!,port.companionBody.pet(pet)),frame=conversation.frame();sound.blip();if(frame.choices?.length){port.zh.presentConversation(conversation);}else{conversation.close();port.say(frame.speaker,frame.pages,port.companionBody.x,port.companionBody.h+14);port.dialogueCompletion(frame.completion);}return; }
  }

export function useLife(port:InteractionRoutingPort,target: string,owner = port.scenes.here) {
    const placement = owner === port.scenes.here ? {dx:0,dh:0} : port.scenes.joinedZones.find(z => z.id === owner);
    if (!placement) return;
    const host = owner === port.scenes.here ? port.zh : port.hostOf(owner);
    const s = movingInteractions(owner === port.scenes.here ? port.def : port.sceneDefinition(owner),host.model), [kind, id] = target.split(':');
    if (owner !== port.scenes.here) {
      const group = kind === 'use' ? 'uses' : kind === 'read' ? 'readables' : kind === 'rest' ? 'rests' : undefined;
      if (!group || !host.model.attachmentOffsets()?.[group]?.[id]) return;
    }
    if (kind === 'story') { const card = s.phases?.[port.story]?.targets?.[id]?.card; if (card) port.startCard(port.openingStory.CARDS[card], true); return; }
    if (kind === 'rest') { const r = s.rests?.find((z) => z.id === id); if (r) port.offerWait(r,owner); return; }
    if (kind === 'read') {
      const r = s.readables!.find((z) => z.id === id)!, o = s.phases?.[port.story]?.lines?.[id];
      port.say(o?.name ?? r.name, o?.pages ?? r.pages, r.x+placement.dx, (r.h ?? 70)+placement.dh);
      return;
    }
    if (kind === 'pet') {
      const p = s.people![Number(id)], critter = critterReaction(p, port.critters), n = port.presentation.petCount++;
      if (!critter) return;
      sound.blip();
      port.say(critter.name, critterReply(critter, n), characterX(p, port.timing.t), characterHeight(p) + 4);
      return;
    }
    if (kind === 'bot') {
      const index=Number(id),p=s.people![index],conversation=new ConversationSession(port.gameplayFor(port.scenes.here)!,botConversationId(port.scenes.here,p,index));
      const frame=conversation.frame(),said={name:frame.speaker,pages:frame.pages};conversation.close();
      sound.blip();
      port.say(said.name, said.pages, characterX(p, port.timing.t), characterHeight(p) + 4);
      port.dialogueCompletion(frame.completion);
      return;
    }
    if (kind === 'talk') {
      const p = s.people!.find((z) => z.id === id)!, said = talkTo(p,port.gameplayFor(port.scenes.here));
      port.persistSave();
      port.say(said.name, said.pages, characterX(p, port.timing.t), characterHeight(p) - 10);
      port.dialogueCompletion(said.completion);
      return;
    }
    if (kind === 'use') {
      const u=s.uses?.find(z=>z.id===id);if(!u)return;
      const resolved=resolveUse(u,port.save.flags,port.save.tokens,port.gameplayFor(owner));if(!resolved.visible)return;
      // something you carry that it takes: a popup, those first ("give the tea"), then the use itself
      const own = (u.items ?? []).filter((x) => (port.save.items[x.item] ?? 0) > 0);
      if (!own.length) { runUse(port,u, u.use, owner); return; }
      const items: PopupItem[] = [
        ...own.map((x) => ({ label: x.label, own: true, run: () => runUse(port,u, x.use, owner) })),
        { label: resolved.actionLabel, run: () => runUse(port,u, u.use, owner) },
      ].slice(0, MAX_EVERYDAY);
      host.choose('use:' + u.id, u.name, items, resolved.box, () => {
        const row = movingInteractions(owner === port.scenes.here ? port.def : port.sceneDefinition(owner),host.model).uses?.find(row => row.id === u.id);
        return row ? useBox(row) : null;
      });
      sound.open();
      return;
    }
    const e = s.exits.find((z) => z.id === id);
    if (e) useExit(port,e);
  }

export function runUse(port:InteractionRoutingPort,u: SceneUse,fn: (c: UseCtx) => SceneSaid,owner = port.scenes.here) {
    const placement = owner === port.scenes.here ? {dx:0,dh:0} : port.scenes.joinedZones.find(z => z.id === owner);
    if (!placement) return;
    const host = owner === port.scenes.here ? port.zh : port.hostOf(owner), scene = owner === port.scenes.here ? port.def : port.sceneDefinition(owner);
    u=movingInteractions(scene,host.model).uses?.find(row=>row.id===u.id)??u;
    const x=u.x+placement.dx, h=(u.h??60)+placement.dh;
    const save = port.save;
    const opening=scene.phases?.[port.story]?.lines?.[u.id];
    if(opening){port.say(opening.name??'YOU',opening.pages,x,h);return;}
    const gameplay=port.gameplayFor(owner),tokensBefore=save.tokens;
    const resolved=useAccess(u,save.flags,gameplay);if(!resolved.available)return;
    const permission=resolved.permission;if(permission&&!permission.ok){host.react('use:'+u.id,['',permission.reason,'err']);return;}
    const out = fn({
      gameplay,
      tokens: save.tokens,
      pay: (n) => { if (save.tokens < n) return false; save.tokens -= n; port.flash('-' + n + ' token' + (n === 1 ? '' : 's')); return true; },
      give: (n) => { save.tokens += n; port.flash('+' + n + ' token' + (n === 1 ? '' : 's')); },
      flags: save.flags, set: (f) => { save.flags[f] = true; }, t: port.timing.t,
      weather: port.weatherHere().kind, min: city.min,
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
    const tokenDelta=save.tokens-tokensBefore;
    if(gameplay&&tokenDelta)port.flash((tokenDelta>0?'+':'')+tokenDelta+' token'+(Math.abs(tokenDelta)===1?'':'s'));
    port.persistSave();
    port.syncHud();
    const said = Array.isArray(out) ? { name: u.name, pages: out } : out;
    if(said.conversation){if(!gameplay)throw new Error('Conversation requires gameplay session');const conversation=new ConversationSession(gameplay,said.conversation,{objective:scene.objective?.(save.flags,gameplay.state())??''}),frame=conversation.frame();if(u.conversationPresentation==='bubble'&&!frame.choices?.length&&!frame.acceptsText){conversation.close();port.say(frame.speaker,frame.pages,x,h);port.dialogueCompletion(frame.completion);}else host.presentConversation(conversation);return;}
    if(said.pages.length){if(u.speakerKind==='device')host.react('use:'+u.id,['',said.pages.join('\n')]);else if(u.speakerKind==='system')port.notify(said.pages.join(' '));else port.say(said.name,said.pages,x,h);}
  }

export function useExit(port:InteractionRoutingPort,e: SceneExit) {
    e=movingInteractions(port.def,port.zh.model).exits.find(row=>row.id===e.id)??e;
    // the story: some ways out do something else in this phase (a checkpoint, an acknowledgment, "bed first")
    const rule = port.def.phases?.[port.story]?.exits?.[e.id];
    if (rule && storyExit(port,rule, e.x, { to: e.to, at: e.at }, e.checkpoint,'exit:'+e.id)) return;
    // a door that reads key chips (Moth's building): only the right one opens it
    const resolved=resolveExit(e,{flags:port.save.flags,tokens:port.save.tokens,keys:port.save.keyring});if(!resolved.visibility.ok)return;
    if (e.needs && resolved.permission&&!resolved.permission.ok) { port.zh.react('exit:'+e.id,['',e.needs.pages.join('\n'),'err']); return; }
    if (e.action === 'taxi') { port.hailTaxi(); return; }
    if (e.action === 'map') { port.showMap(); sound.open(); return; }
    if (!port.hasScene(e.to)) return;
    // the flat's door: the companion comes along from now on
    if (e.sets) { port.save.flags[e.sets] = true; port.persistSave(); }
    port.travel(e.to, e.at);
  }

export function passBarrier(port:InteractionRoutingPort,id: string,granted = false):boolean {
    const lv = port.scenes.level!, phase = granted ? undefined : barrierPhaseRule(id, lv.source.barriers, levelOpened(lv), z => port.sceneDefinition((z ?? port.scenes.here) as SceneId).phases?.[port.story]);
    if (phase) return storyExit(port,phase.rule, phase.x, { barrier: id }, phase, id);
    const result = levelPass(lv, id, b => granted ? { ok: true } : barrierAccess(b, port.save.flags, port.save.keyring, port.gameplayStatePort().read()));
    if (!result) return false;
    if (!result.ok) { port.zh.react(id, ['', result.reason, 'err']); return true; }
    port.save.barriers = { ...port.save.barriers, ...savedByScene(lv.source, port.scenes.here, levelOpened(lv)) }; port.persistSave();
    return true;
  }

export function storyExit(port:InteractionRoutingPort,rule: ExitRule,x: number,go: { to: string; at?: string } | { barrier: string } | null,checkpoint?: SceneExit['checkpoint'],origin?: string):boolean {
    if ('say' in rule) { port.say(rule.say.name, rule.say.pages, x, 60); return true; }
    if ('react' in rule) { port.zh.react(rule.react, rule.line); port.runCues(rule.cues ?? []); return true; }
    if ('gate' in rule) {
      // a checkpoint: one beat too long on "verifying", then ok. Nobody else waits.
      port.input.keys.clear();
      port.presentation.beat = { start: port.timing.clock, checkpoint: { x: checkpoint?.x ?? x, h: checkpoint?.h ?? 0 }, gate: rule.gate, go };
      port.runCues(rule.gate.begin ?? []);
      return true;
    }
    // an acknowledgment: the device speaks (it knows you), the player continues, then the milestone runs and the way opens
    if (!origin) throw Error('Device acknowledgment requires its real scene anchor');
    const scene = port.scenes.here, ack = rule.acknowledge, id = 'opening.acknowledge:' + origin;
    if (port.zh.acknowledgmentId === id) return true;
    port.runCues(ack.begin ?? []);
    port.zh.acknowledgeDevice({ id, from: origin, speaker: ack.speaker, pages: ack.pages, height: ack.height, tone: 'ok' }, () => { if (port.scenes.here !== scene) return; if (!port.runCues(ack.then)) return; finishExit(port,go); });
    return true;
  }

export function finishExit(port:InteractionRoutingPort,go: { to: string; at?: string } | { barrier: string } | null) { if (go && 'barrier' in go) { if (port.scenes.level) passBarrier(port,go.barrier, true); } else if (go && port.hasScene(go.to)) port.travel(go.to, go.at); }

export function storyChips(port:InteractionRoutingPort,scene: SceneId,dev: string):PopupItem[] | null {
    const chips = port.sceneDefinition(scene).phases?.[port.story]?.everyday?.[dev];
    if (!chips) return null;
    const zh = port.hostOf(scene);
    return chips.map((c) => ({
      label: c.label,
      run: () => {
        if (c.act) zh.model.act(dev, c.act[0], c.act[1]);
        if (c.set) { zh.model.set(c.set[0], c.set[1]); zh.model.changed(); }
        if (c.say) {const receipt=zh.react(dev,c.say);if(c.say[2]==='ok')sound.feedback(receipt);}
        if (c.cues) port.runCues(c.cues);
      },
    }));
  }
