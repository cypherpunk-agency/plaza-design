/** Game: menu, notifications, HUD, mode chrome, level arrows, car list and control hints. */
import * as SceneLifecycle from '../scene-lifecycle';
import { NET_OPENED, NUDGE_HOLD, NUDGE_MARGIN, NUDGE_GAP } from '../tuning';
import { controlGroups } from '../hud-data';
import { ITEMS, sceneTitle, type ItemId } from '../../scenes/index';
import { type DeckData } from '../../ui/menu';
import { playProfile } from '../play-profile';
import { nodeCount, ownedModules } from '../save';
import {
  levelArrows,
  levelDown,
  levelInteract,
  levelUp,
  levelLiftList,
  levelPick,
} from '../../engine/level';
import type { Game } from '../game';

/** Esc with nothing else open: pause and show the menu. Progress is written first. */
export function openMenu(game: Game) {
  game.input.keys.clear();
  game.p.moving = false;
  game.hints.done('ctl.deck');
  game.zh.persist();
  game.persistSave();
  game.menu.show();
  game.shiftGuidance?.hide();
  game.syncEnginePause();
}

export function notify(
  game: Game,
  text: string,
  tone: import('../../ui/communication').MessageTone = 'info',
) {
  game.hints.notify(text, tone);
  game.term.print(text, tone === 'error' ? 'err' : tone === 'success' ? 'ok' : 'out', false);
}

export function flash(game: Game, text: string) {
  game.notify(text, text.startsWith('[ERR]') ? 'error' : text.startsWith('+') ? 'success' : 'info');
}

export function syncHud(game: Game) {
  game.refreshReview();
  game.host.setNodes(nodeCount(game.save));
  game.host.setScene(
    playProfile().chrome.minimalHud
      ? sceneTitle(game.def)
      : sceneTitle(game.def) + game.clockText + ' · ' + game.me.toUpperCase(),
  );
}

/**
 * The bars follow the mode (render.tsx): walking (arrows; HACK, JMP, ACT, DECK) or hack vision
 * (EXIT, BOARD, LOGIC, UNFOLD), as classes on the page; HACK only once hacking is yours here.
 */
export function syncModeUi(game: Game) {
  const zh = game.interactionHost,
    on = zh.visionOn;
  game.controlHints(on);
  const net = game.netOk,
    ping = net && !game.save.flags[NET_OPENED];
  const key = [on, zh.hackable, zh.logicOpen, zh.unfoldAll, net, ping].join();
  if (key === game.presentation.modeKey) return;
  game.presentation.modeKey = key;
  const html = document.documentElement.classList;
  html.toggle('net-ok', net);
  html.toggle('net-new', ping);
  html.toggle('hack-ok', zh.hackable);
  html.toggle('hack-on', on);
  html.toggle('logic-open', zh.logicOpen);
  html.toggle('unfold-on', zh.unfoldAll);
}

/** The list menu beside the lift car is showing (the car's own prompt steps aside), and the player closed it (Esc): it stays shut until they use the panel's keys again or leave the car. */

/**
 * In a lift car the floors are a list menu beside it (engine/popup.ts 'list', through the scene's host), not a floating
 * prompt: it reflects the panel (engine/level.ts `levelLiftList`: `ride.pick` is its one state), ↑ ↓ move the choice
 * as `levelUp`/`levelDown` do, a row or E sends the car through `levelInteract`; stepping out closes it.
 */
export function syncCarList(game: Game) {
  const zh = game.zh,
    lv = game.scenes.level,
    list =
      lv && !game.presentation.bubble && !game.levelLocked() && !game.zh.visionOn
        ? levelLiftList(lv, game.movers)
        : null;
  const id = list ? 'lift:' + list.id : '';
  const was = game.presentation.carListOn;
  if (!list || !lv) {
    game.presentation.carListOn = false;
    game.presentation.carListOff = false;
    for (const l of game.presentation.liftIds) zh.closeList(l);
    return;
  }
  game.presentation.liftIds.add(id);
  // the player closed it (Esc, a tap elsewhere): leave it shut
  if (was && !zh.listOpen(id)) game.presentation.carListOff = true;
  if (game.presentation.carListOff || (!zh.listOpen(id) && zh.popupOpen)) {
    game.presentation.carListOn = false;
    return;
  }
  const items = list.rows.map((r) => ({
    key: r.key,
    label: r.label,
    cur: r.here,
    tag: r.here ? (r.picked ? 'step out' : 'you are here') : r.called ? 'called' : '',
    point: () => levelPick(lv, r.index),
    run: () => {
      levelPick(lv, r.index);
      levelInteract(lv, id, game.p, game.movers);
    },
  }));
  const sel = Math.max(
    0,
    list.rows.findIndex((r) => r.picked),
  );
  zh.list(id, 'LIFT', items, { x: list.x, y: list.h, w: list.w, h: list.tall }, sel, (dir) => {
    if (dir > 0) levelUp(lv, game.p);
    else levelDown(lv, game.p);
  });
  game.presentation.carListOn = zh.listOpen(id);
}

/** The last `level-up`/`level-down` pair set on the page (syncLevelArrows). */

/**
 * Touch's ▲ ▼ (ui/touch-controls.ts) keep their places in a level scene (`html.level-scene`) and show only while
 * ↑ or ↓ does something there (`html.level-up`, `html.level-down`; render.tsx): the rule the keys follow
 * (engine/level.ts `levelArrows`). Elsewhere the bar is as it was.
 */
export function syncLevelArrows(game: Game) {
  const lv = game.scenes.level,
    on =
      game.touch && !!lv && !game.presentation.bubble && !game.levelLocked() && !game.zh.visionOn;
  const a = on ? levelArrows(lv!, game.p) : { up: false, down: false },
    scene = game.touch && !!lv,
    key = [scene, a.up, a.down].join();
  if (key === game.presentation.arrowsKey) return;
  game.presentation.arrowsKey = key;
  const html = document.documentElement.classList;
  html.toggle('level-scene', scene);
  html.toggle('level-up', a.up);
  html.toggle('level-down', a.down);
}

/**
 * Something said it reacted (`from`, with a line in green or red). If it is off the view but
 * near, the camera leans that way for a moment so you see it happen, keeping you in view; the
 * ping (an edge arrow) already points at anything further. Never during a conversation, the deck
 * or a panel, never while you walk, never with reduced motion; each thing and line once a visit,
 * and not more often than every few seconds.
 */
export function nudgeTo(game: Game, from: string, text: string, tone?: string) {
  if (tone !== 'ok' && tone !== 'err') return;
  if (
    game.reduced ||
    game.presentation.bubble ||
    game.term.focused ||
    game.zh.overlayOpen ||
    game.zh.visionOn ||
    game.presentation.mapView ||
    game.presentation.flight ||
    game.presentation.hop ||
    game.presentation.cut ||
    game.p.moving
  )
    return;
  const at = game.zh.worldOf(from);
  if (!at || game.levelW <= game.camera.viewW) return;
  const key = from + '|' + text,
    p = game.p,
    m = NUDGE_MARGIN;
  if (game.nudged.has(key) || game.timing.clock - game.camera.lastNudge < NUDGE_GAP) return;
  // already in view (with a margin), or too far to show together with you: the ping is enough
  if (at.x > game.camera.cam + m && at.x < game.camera.cam + game.camera.viewW - m) return;
  if (Math.abs(at.x - p.x) > game.camera.viewW - m * 2) return;
  let goal = at.x < game.camera.cam + m ? at.x - m : at.x + m - game.camera.viewW;
  goal = Math.max(p.x + m - game.camera.viewW, Math.min(p.x - m, goal));
  {
    const [lo, hi] = SceneLifecycle.worldSpan(game.sceneLifecyclePort);
    goal = Math.max(lo, Math.min(hi - game.camera.viewW, goal));
  }
  game.nudged.add(key);
  game.camera.lastNudge = game.timing.clock;
  game.camera.nudge = { goal, until: game.timing.clock + NUDGE_HOLD, px: p.x };
}

// ---------- the deck's tabs and the control hints ----------

/** The current goal as the HUD shows it (the scene's, the opening's, the library's, or the data's next). */
export function goalText(game: Game): string | null {
  const zh = game.zh.model.data.goals.length ? game.zh : null;
  return (
    game.def.phases?.[game.story]?.goal ??
    game.def.objective?.(game.save.flags, game.gameplayFor(game.scenes.here)?.state()) ??
    game.libraryGoal() ??
    (zh ? zh.objective() : null)
  );
}

/** What the deck's JOBS, CARRY, CONTROLS (and TERM on touch) tabs read (ui/menu.ts). */
export function deckData(game: Game): DeckData {
  return {
    jobs: () => {
      const m = game.zh.model;
      return {
        now: game.goalText(),
        hint: game.hints.latest,
        done: m.data.goals.filter((g) => m.goals.has(g.id)).map((g) => g.text),
      };
    },
    carry: () => {
      const s = game.save;
      return {
        tokens: s.tokens,
        items: Object.entries(s.items)
          .filter(([, n]) => n > 0)
          .map(([id, n]): [string, number] => [ITEMS[id as ItemId] ?? id, n]),
        keys: s.keyring
          .map((id) => game.networkContext.keyring.get(id))
          .filter((k) => k?.kind === 'key')
          .map((k) => k!.label),
        modules: ownedModules(s),
        programs: s.programs,
      };
    },
    controls: () => game.controls(),
    ...(game.touch ? { terminal: () => game.openDeck() } : {}),
  };
}

/** Every key that is yours now, grouped (the deck's CONTROLS tab). Touch names its buttons instead. */
export function controls(game: Game) {
  return controlGroups({
    touch: game.touch,
    jump: game.save.jump,
    levels: !!game.scenes.level,
    network: game.netOk,
    hackable: game.zh.hackable,
  });
}

/**
 * The controls, taught once in the hint lane (what the key bar's labels used to say): walking, then
 * using, then the deck; hack vision's keys the first time it is open. Each stays until you have done it.
 * Touch buttons are labelled, so touch only gets the deck and hack vision.
 */
export function controlHints(game: Game, vision: boolean) {
  if (!playProfile().guidance.controlHints) return; // Review cases own attention; campaign control lessons stay in the campaign.
  const h = game.hints;
  if (game.p.moving) h.done('ctl.walk');
  if (!game.touch) {
    if (!h.has('ctl.walk')) h.show('ctl.walk', '← → WALK · SHIFT RUN', { sticky: true });
    else if (!h.has('ctl.use')) h.show('ctl.use', 'E USES WHAT SHOWS [E]', { sticky: true });
  }
  if ((game.touch || h.has('ctl.use')) && !h.has('ctl.deck'))
    h.show(
      'ctl.deck',
      (game.touch ? 'DECK' : 'ESC') + ' OPENS THE DECK: GOALS, WHAT YOU CARRY, CONTROLS',
      { sticky: true },
    );
  if (vision)
    h.show(
      'ctl.vision',
      game.touch
        ? 'DRAG PANS · PINCH ZOOMS · EXIT LEAVES'
        : 'DRAG PANS · WHEEL ZOOMS · 0 RESETS · ESC LEAVES',
      { sticky: true, first: true },
    );
  else if (h.pending('ctl.vision')) h.done('ctl.vision');
}

export function ownLine(game: Game) {
  const [own, more] = game.owned();
  return more ? own + ' · ' + more : own;
}
