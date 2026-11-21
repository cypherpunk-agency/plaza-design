/** Game: keyboard and pointer input, interaction targets, conversations and devices. */
import * as InputRouting from '../input-routing';
import * as InteractionTargets from '../interaction-targets';
import { type InteractionTarget as Target } from '../interaction-targets';
import { SceneHost } from '../../engine/index';
import { type SceneDef } from '../../scenes/index';
import { city } from '../../world/clock';
import { sound } from '../audio';
import { can } from '../play-profile';
import { who } from '../save';
import { levelHints, nearestPrompt } from '../../engine/level';
import type { Game } from '../game';

// ---------- input ----------

export function onKeyDown(game: Game, e: KeyboardEvent) {
  return InputRouting.onKeyDown(game.inputRoutingPort, e);
}

export function onKeyUp(game: Game, e: KeyboardEvent) {
  return InputRouting.onKeyUp(game.inputRoutingPort, e);
}

export function openDeck(game: Game) {
  if (!can('deck')) return;
  if (!game.term.out.childElementCount)
    game.term.print('[DECK] ' + who(game.save) + ' · type help', 'head');
  const at = game.hackLocked() ? null : game.termMachine();
  if (at)
    game.term.print(
      '[' +
        (game.interactionHost.model.devices.get(at)?.name ?? at) +
        '] the deck talks to it · ls, cat, login, use',
      'dim',
    );
  game.term.focus();
}

/** The machine the deck talks to: the scene's device whose schematic is open, else the one you stand at. */
export function termMachine(game: Game): string | null {
  const zh = game.interactionHost;
  if (zh.viewing) return zh.viewing;
  const t = game.nearest();
  return t?.kind === 'device' &&
    (t.owner ?? game.scenes.here) === game.hostPlacement(zh)?.id &&
    zh.model.devices.has(t.id)
    ? t.id
    : null;
}

/** Tap or click a thing to open its popup (in hack vision: its verbs); hovering lights it up. A tap on the scene's life within reach is E on it. */
export function onCanvasPointer(game: Game, e: PointerEvent, press: boolean) {
  return InputRouting.onCanvasPointer(game.inputRoutingPort, e, press);
}

export function deviceAt(game: Game, x: number, h: number) {
  const input = game.interactionHost;
  const hosts = [
    input,
    game.zh,
    ...game.scenes.joinedZones
      .filter((z) => game.scenes.zoneTiers.get(z.id) === 'visible')
      .map((z) => game.scenes.hosts.get(z.id))
      .filter((host): host is SceneHost => !!host),
  ];
  for (const host of new Set(hosts)) {
    const at = game.hostPlacement(host);
    if (!at) continue;
    const id = host.spotAt(x - at.dx, h - at.dh);
    if (id && (at.id === game.scenes.here || host.model.attachmentOffsets()?.devices?.[id]))
      return { host, id };
  }
  return null;
}

/**
 * Everything to press E on here, in one list for every scene: its ways out, Downtown's street
 * people, the devices and the scene's own targets on the engine, the scene's life, and the companion.
 */
export function targets(game: Game): Target[] {
  const s = game.def,
    list: Target[] = [...game.exitTargets(s)];
  const life = game.lifeTargets(s),
    before = new Set(
      (s.uses ?? []).filter((u) => u.targetOrder === 'before-devices').map((u) => 'use:' + u.id),
    );
  list.push(...life.filter((t) => before.has(t.id)));
  // a device is reached from the ground, or from the ledge under it (the relay, from the low roof)
  const floors = [...game.platforms, ...(game.scenes.level?.source.floors ?? [])];
  const stand = (x: number, y = 0) => {
    const under = floors.filter((p) => x > p.x && x < p.x + p.w && p.h <= y).map((p) => p.h);
    return under.length ? Math.max(...under) : 0;
  };
  for (const t of game.zh.targets()) {
    const query = s.data?.devices.find((d) => d.id === t.id)?.targetQuery;
    if (query !== undefined && game.zh.model.gameplayQuery?.(query) !== true) continue;
    list.push({
      kind: 'device',
      id: t.id,
      x: t.x,
      h: t.floorH ?? stand(t.x, t.y),
      label: t.label,
      promptH: t.promptH,
    });
  }
  list.push(...life.filter((t) => !before.has(t.id)));
  // A route's Circuit stays in its source zone. Only its attached interactions travel
  // into neighbouring zones; ordinary local people/shops are not duplicated there.
  for (const z of game.scenes.joinedZones ?? []) {
    const host = game.scenes.hosts.get(z.id);
    if (!host || game.scenes.zoneTiers.get(z.id) !== 'visible') continue;
    const offsets = host.model.attachmentOffsets();
    if (!offsets) continue;
    const scene = game.sceneDefinition(z.id);
    const attached: SceneDef = {
      ...scene,
      people: undefined,
      uses: scene.uses?.filter((u) => offsets.uses?.[u.id]),
      readables: scene.readables?.filter((r) => offsets.readables?.[r.id]),
      rests: scene.rests?.filter((r) => offsets.rests?.[r.id]),
    };
    for (const t of host.targets()) {
      if (!offsets.devices?.[t.id]) continue;
      const query = scene.data?.devices.find((d) => d.id === t.id)?.targetQuery;
      if (query !== undefined && host.model.gameplayQuery?.(query) !== true) continue;
      list.push({
        kind: 'device',
        id: t.id,
        owner: z.id,
        x: t.x + z.dx,
        h: (t.floorH ?? game.promptFloor(scene, t.x, t.y)) + z.dh,
        label: t.label,
        promptH: t.promptH + z.dh,
      });
    }
    for (const t of game.lifeTargets(attached, host, z.id))
      list.push({
        ...t,
        owner: z.id,
        x: t.x + z.dx,
        h: t.h + z.dh,
        ...(t.promptH === undefined ? {} : { promptH: t.promptH + z.dh }),
      });
  }
  // the story's own things to press E on in this phase (the bed)
  for (const [id, t] of Object.entries(game.def.phases?.[game.story]?.targets ?? {})) {
    const target = game.openingStory.resolveTarget(t, game.def);
    if (target) list.push({ kind: 'life', id: 'story:' + id, ...target });
  }
  // a level's doors, flights, escalators and lifts where the player stands
  // (the list menu beside the car is the lift's panel while it is open: no prompt over it)
  if (game.scenes.level)
    for (const t of levelHints(game.scenes.level, game.p, game.movers))
      if (!(game.presentation.carListOn && t.id.startsWith('lift:')))
        list.push({ kind: 'level', ...t });
  // the companion can always be petted, wherever it is with you
  if (game.companionPresent && game.def.companion?.pet)
    list.push({
      kind: 'companion',
      id: game.companionDoc.id,
      x: game.companionBody.x,
      h: 0,
      label: game.def.companion.pet.prompt,
      promptH: game.companionBody.h + 24,
    });
  return list;
}

export function nearest(game: Game): Target | null {
  return nearestPrompt(game.targets(), game.p);
}

export function say(game: Game, name: string, pages: string[], x: number, h: number) {
  if (!pages.length) return;
  game.presentation.bubble = { name, pages, page: 0, chars: 0, x, h };
  if (pages.length) game.term.print(name + ': ' + pages.join('\n'), 'out', false);
}

export function completeConversation(
  game: Game,
  cue: NonNullable<import('../../engine/gameplay/conversation').ConversationFrame['completion']>,
) {
  game.term.prefill(cue.terminalPrefill);
}

/** Completion belongs to advancing the final page; replacing or abandoning a bubble cancels it. */
export function dialogueCompletion(
  game: Game,
  cue: import('../../engine/gameplay/conversation').ConversationFrame['completion'],
) {
  if (cue && game.presentation.bubble) {
    const scene = game.scenes.here;
    game.presentation.bubble.then = () => {
      if (game.scenes.here === scene) game.completeConversation(cue);
    };
  }
}

// ---------- cutscenes (cutscenes/) ----------
// While one plays, the scene's update and draw are skipped entirely; any key or tap skips it.

/** A cutscene a story beat asked for, waiting for the screen to be free. */

/**
 * Contacts on your deck (contacts.ts): after a story beat, say what came in. The messages stay
 * unread until `msg <contact>` in the deck.
 */
export function inbox(game: Game) {
  const contacts = game.contacts,
    news = contacts.unread(game.save.flags);
  if (!news.length) return;
  const who = [...new Set(news.map((n) => n.contact))],
    source = contacts.INBOX.announce,
    t = contacts.INBOX.terminal;
  who.forEach((c) =>
    game.term.print(
      t.prefix +
        c.name +
        t.separator +
        c.status +
        t.separator +
        contacts.messagesOf(c, game.save.flags).length +
        t.countSuffix +
        t.commandPrefix +
        c.id,
      'ok',
    ),
  );
  if (who.some((c) => c.id === source.contact))
    game.say(
      source.speaker,
      game.touch ? source.touchPages : source.pages,
      game.p.x,
      source.height,
    );
}

// ---------- a scene's ways out and its life ----------

/**
 * A scene's ways out as E targets: its doors, stairs and pads (an open border is walked
 * into instead; one its code offers is an engine target). A platform's BOARD is one
 * target at each of the train's doors, only while it stands there with them open.
 */
export function exitTargets(game: Game, s: SceneDef): Target[] {
  return InteractionTargets.exitTargets(s, {
    model: game.zh.model,
    flags: game.save.flags,
    tokens: game.save.tokens,
    fare: game.world.FARE,
  });
}

/**
 * A scene's life as E targets: readables, uses, the people who talk, and the animals
 * (cats to pet, pigeons to shoo) and robots. E on one runs `useLife`.
 */
/** The floor a use or readable is offered on: in a scene with levels, the floor under where it answers (a mezzanine's machine); else the street. */
export function promptFloor(game: Game, s: SceneDef, x: number, h: number | undefined) {
  return InteractionTargets.promptFloor(
    s,
    x,
    h,
    s.id === game.scenes.here && game.scenes.level
      ? game.scenes.level.source.floors
      : s.level?.floors,
  );
}

export function lifeTargets(
  game: Game,
  s: SceneDef,
  host = game.zh,
  owner = game.scenes.here,
): Target[] {
  return InteractionTargets.lifeTargets(s, {
    model: host.model,
    flags: game.save.flags,
    tokens: game.save.tokens,
    session: game.gameplayFor(owner),
    floor: (x, h) => game.promptFloor(s, x, h),
    rests: city.pinned === null,
    time: game.timing.t,
    critters: game.critters,
    bots: game.botReactions,
  });
}

/** The taxi answers at its stand; an unavailable anchor falls back to system feedback. */
export function driverReply(game: Game, pages: string[]) {
  const text = 'DRIVER: ' + pages.join('\n'),
    taxi = game.def.exits.find((e) => e.action === 'taxi');
  if (taxi) game.zh.react('exit:' + taxi.id, ['', text, 'err']);
  else {
    game.notify(text, 'error');
    sound.denied();
  }
}

/** E at a taxi stand: the city map to pick a stand, if you can pay. */
export function hailTaxi(game: Game) {
  if (game.save.tokens < game.world.FARE) {
    game.driverReply(game.world.DRIVER_BROKE);
    return;
  }
  game.presentation.mapView = game.worldMap.openMap(
    'taxi',
    game.scenes.here,
    game.scenes.here === game.world.TRANSPORT.boarding.scene
      ? game.metro.rideStop(game.ride)
      : null,
  );
  game.input.keys.clear();
  game.syncEnginePause();
  sound.open();
}
