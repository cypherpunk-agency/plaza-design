/** Game: review-station navigation, review runs and communication review (dev/demo tooling). */
import * as InteractionRouting from '../interaction-routing';
import * as Camera from '../camera';
import { runCommunicationReview, type CommunicationReview } from '../../demo/communication-review';
import { movingInteractions } from '../../engine/gameplay/moving-interactions';
import { mintFeedback } from '../../engine/feedback-receipt';
import { reviewStations, reviewActions, type ReviewActionSource } from '../../demo/review-stations';
import { ConversationSession } from '../../engine/gameplay/conversation';
import { type SceneId } from '../../scenes/index';
import { EDITOR_PLAY } from '../mode';
import { can } from '../play-profile';
import type { Game } from '../game';
import { NO_HACK_STAGES, type HackStage } from '../../engine/hack-stages';

export function reviewAllowed(_game: Game) {
  return can('review') || EDITOR_PLAY;
}

/** Hack is out of reach: the profile has no hacking, or the story has not given it yet (the opening's phases). */
export function hackLocked(game: Game) {
  return !can('hack') || game.openingStory.hackLocked(game.save.flags);
}

/** The hacking stages that are yours (engine/hack-stages.ts): none while hack is locked, else what the story has given. */
export function hackStages(game: Game): ReadonlySet<HackStage> {
  return hackLocked(game) ? NO_HACK_STAGES : game.openingStory.hackStages(game.save.flags);
}

export function refreshReview(game: Game) {
  game.reviewNav?.refresh(
    game.scenes.here,
    reviewActions(
      game.def,
      game.scenes.here,
      reviewStations(game.content, game.reviewDoc),
      game.reviewDoc,
    ).map((a) => a.id),
  );
}

/** A review button (demo/review-stations.json `actions`): a use, a conversation or a person in the scene. */
export function reviewRun(game: Game, a: ReviewActionSource) {
  const r = a.run;
  if (r.use !== undefined) game.reviewUse(r.use);
  else if (r.talk !== undefined) game.reviewTalk(r.talk);
  else if (r.actor !== undefined) game.reviewActor(r.actor);
}

export function reviewActor(game: Game, id: string) {
  if (game.reviewAllowed() && game.def.people?.some((p) => p.id === id)) {
    game.presentation.bubble = null;
    game.input.keys.clear();
    game.zh.closeAll();
    InteractionRouting.useLife(game.interactionRoutingPort, 'talk:' + id);
    game.canvas.focus();
  }
}

/** Explicit review bookmarks; never available in campaign play. */
export function reviewJump(game: Game, id: string) {
  if (!game.reviewAllowed()) return;
  const station = reviewStations(game.content, game.reviewDoc).find((s) => s.id === id);
  if (!station) return;
  game.input.keys.clear();
  game.presentation.bubble = null;
  game.zh.closeAll();
  game.menu.hide();
  game.presentation.mapView = null;
  game.presentation.netView = null;
  game.term.close();
  game.enter(station.scene as SceneId, true);
  game.presentation.bubble = null;
  Object.assign(game.p, { x: station.x, y: 0, vy: 0, onGround: true });
  game.camera.cam = Camera.camFollow(game.cameraPort, game.p.x);
  game.syncEnginePause();
  game.refreshReview();
  game.reviewNav?.station(id);
  game.canvas.focus();
}

export function reviewTalk(game: Game, id: string) {
  if (!game.reviewAllowed() || !game.content[game.scenes.here]) return;
  const session = game.gameplayFor(game.scenes.here);
  if (!session?.definition.conversations[id]) return;
  game.presentation.bubble = null;
  game.input.keys.clear();
  game.zh.closeAll();
  game.zh.presentConversation(new ConversationSession(session, id));
}

export function reviewUse(game: Game, id: string) {
  if (!game.reviewAllowed() || !game.content[game.scenes.here]) return;
  const use = movingInteractions(game.def, game.zh.model).uses?.find((u) => u.id === id);
  if (
    !use ||
    (use.available && !use.available(game.save.flags, game.gameplayFor(game.scenes.here)?.state()))
  )
    return;
  game.presentation.bubble = null;
  game.zh.closeAll();
  game.input.keys.clear();
  InteractionRouting.runUse(game.interactionRoutingPort, use, use.use);
  game.canvas.focus();
}

export function reviewCommunication(game: Game, id: CommunicationReview) {
  if (!can('review')) return;
  game.input.keys.clear();
  game.zh.closeAll();
  game.presentation.bubble = null;
  game.hints.sceneChanged();
  runCommunicationReview(id, {
    status: (text, tone) => game.notify(text, tone),
    remote: () => {
      const r = game.reviewDoc.communication.remote;
      game.reviewJump(r.station);
      game.zh.react(r.device, ['', 'Remote device reply example.']);
      game.zh.ping(r.device, 'look');
    },
    dialogue: () => {
      game.say('REVIEWER', ['A character is speaking. Press E to finish.'], game.p.x, 60);
      game.hints.show('review.waiting', 'Optional help waited until the character finished.', {
        repeat: true,
        first: true,
      });
    },
    repeat: () => {
      const receipt = mintFeedback('demo', 'review-repeat', 'info');
      for (let n = 0; n < 4; n++)
        game.hints.notify('One signal, delivered four times.', 'info', receipt);
      game.term.print('One signal, delivered four times.', 'out', false);
    },
    motion: () => (game.reduced = !game.reduced),
  });
  game.canvas.focus();
}
