/** Game: the network overlay, deck scans and connections, and program grants. */
import { NET_OPENED } from '../tuning';
import { mintFeedback, type FeedbackReceipt } from '../../engine/feedback-receipt';
import { type MachineData, type NetworkData } from '../../data/index';
import { sceneTitle, type SceneId } from '../../scenes/index';
import { goalHint } from '../../story/story-rules';
import {
  netKey,
  netPointer,
  openNet,
  type MachineState,
  type NetAct,
  type NetState,
} from '../../ui/netmap';
import { sound } from '../audio';
import type { Game } from '../game';

/** A program came (scan.so from the library): saved, and NET shows in hack vision's bar, pinging until used. */
export function grantProgram(game: Game, id: string, receipt?: FeedbackReceipt) {
  const acquired = !game.save.programs.includes(id);
  if (acquired) game.save.programs.push(id);
  game.persistSave();
  game.syncHud();
  if (id === game.networkContext.net.scanProgram && acquired) {
    game.flash(game.touch ? 'NET: in hack vision, the net map' : 'NET: N, the net map');
    sound.feedback(receipt ?? mintFeedback(game.scenes.here, 'program', 'success'));
    // This program already announced its acquisition. Advance only that word in the
    // ownership observer so its next pass still reports any other simultaneous gains.
    if (game.presentation.gainWords && !game.presentation.gainWords.split('|').includes(id))
      game.presentation.gainWords += '|' + id;
  }
}

/**
 * N or NET: the net map, full screen. Opening it is a scan from where you are plugged in (scan.so):
 * the networks you reach go into the save as found, the nodes in reach onto the board as silhouettes.
 */
export function showNet(game: Game) {
  if (!game.timing.running || game.presentation.flight || game.presentation.hop || !game.netOk)
    return;
  game.input.keys.clear();
  game.presentation.bubble = null;
  game.presentation.mapView = null;
  game.presentation.netBack = game.zh.visionOn;
  if (game.zh.visionOn) game.zh.toggleVision();
  // the map takes the screen: popups, captions and panels go
  game.zh.closeAll();
  const zh = game.zh,
    reached = zh.model.netsHere();
  // what you reach is found; so is any network with a port standing here (you can see the plug, if not the way in)
  const here = game.networkContext.net.networks
    .filter((n) => n.from.some((r) => 'port' in r && r.port.startsWith(game.scenes.here + ':')))
    .map((n) => n.id);
  for (const n of [...reached, ...here]) if (!game.save.nets.includes(n)) game.save.nets.push(n);
  if (zh.model.ports().length || reached.size) zh.typed(() => zh.scanHere());
  game.save.flags[NET_OPENED] = true;
  game.persistSave();
  game.presentation.netView = openNet();
  game.syncEnginePause();
  sound.open();
}

export function closeNet(game: Game, back = game.presentation.netBack) {
  game.presentation.netView = null;
  game.canvas.style.cursor = '';
  sound.close();
  if (back && !game.zh.visionOn && game.zh.hackable) game.zh.toggleVision();
}

/** A machine's name, from the scene file (or net.json) that has it. */
export function machineName(game: Game, m: MachineData) {
  for (const s of m.in) {
    const d =
      s === 'net'
        ? game.networkContext.net.nodes.find((x) => x.id === m.id)
        : [
            ...(game.hasScene(s) ? (game.sceneDefinition(s).data?.devices ?? []) : []),
            ...(game.hasScene(s) ? (game.sceneDefinition(s).data?.nodes ?? []) : []),
          ].find((x) => x.id === m.id);
    if (d) return d.name;
  }
  return m.id.toUpperCase();
}

/** What the net map draws from: the networks you reach from here, those found, each machine's state from here. */
export function netState(game: Game): NetState {
  const zh = game.zh,
    model = zh.model,
    reached = model.netsHere();
  const portKeys = new Set(model.ports().map((p) => p.key));
  const plugged = new Set(
    game.networkContext.net.networks
      .filter((n) => n.from.some((r) => 'port' in r && portKeys.has(r.port)))
      .map((n) => n.id),
  );
  const state = (m: MachineData, n: NetworkData): MachineState => {
    if (!reached.has(n.id)) return 'out';
    if (!m.in.includes(game.scenes.here) && !m.in.includes('net')) return 'far';
    const d = model.devices.get(m.id);
    if (d && !d.node) return 'here';
    return model.net.get(m.id) === 'connected' ? 'board' : 'reach';
  };
  return {
    view: game.presentation.netView ?? openNet(),
    scanner: game.networkContext.net.scanProgram,
    nets: game.networkContext.net.networks,
    reached,
    plugged,
    found: new Set(game.save.nets),
    where: sceneTitle(game.def),
    ports: [...new Set(model.ports().map((p) => model.devices.get(p.dev)?.name ?? p.dev))],
    controlled: game.save.controlled,
    name: (m) => game.machineName(m),
    state,
    touch: game.touch,
    tapMin: (44 * game.canvas.width) / Math.max(1, game.canvas.clientWidth) / game.camera.k,
    avoid: game.mapAvoid(),
    t: game.timing.clock,
  };
}

export function netKeyDown(game: Game, e: KeyboardEvent) {
  const k = e.key;
  if (
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Tab', 'Escape'].includes(k)
  )
    e.preventDefault();
  if (e.repeat) return;
  game.netAct(netKey(game.netState(), k));
}

export function netPointerAt(game: Game, e: PointerEvent, press: boolean) {
  const r = game.canvas.getBoundingClientRect();
  const px = ((e.clientX - r.left) * (game.canvas.width / r.width)) / game.camera.k,
    py = ((e.clientY - r.top) * (game.canvas.height / r.height)) / game.camera.k;
  const { act, pointer } = netPointer(
    game.netState(),
    game.camera.viewW,
    game.camera.viewH,
    px,
    py,
    press,
    e.pointerType === 'mouse',
  );
  game.canvas.style.cursor = pointer ? 'pointer' : '';
  if (press) e.preventDefault();
  game.netAct(act);
}

/** Do what the net map asks: close, or a machine picked (onto the board, or why not). */
export function netAct(game: Game, a: NetAct) {
  if (a.kind === 'close') {
    game.closeNet();
    return;
  }
  if (a.kind === 'blip') {
    sound.blip();
    return;
  }
  if (a.kind !== 'pick') return;
  const name = game.machineName(a.machine);
  if (a.state === 'out') {
    sound.denied();
    game.flash(name + ': out of reach. plug in from ' + a.net.need);
    return;
  }
  if (a.state === 'far') {
    sound.denied();
    const place =
      a.machine.in
        .filter((s) => game.hasScene(s))
        .map((s) => sceneTitle(game.sceneDefinition(s as SceneId)))[0] ?? 'another place';
    game.flash(name + ' answers. its board is at ' + place);
    return;
  }
  game.closeNet(false);
  game.zh.plugIn(a.machine.id);
}

/** The deck's `scan`: what you reach from where you are plugged in (needs scan.so). */
export function deckScan(game: Game) {
  const zh = game.zh,
    reached = zh.model.netsHere();
  for (const n of reached)
    if (zh.model.canScan && !game.save.nets.includes(n)) game.save.nets.push(n);
  game.persistSave();
  const l = zh.model.scanHere();
  game.term.print(l[1], l[2] === 'ok' ? 'ok' : l[2] === 'err' ? 'err' : 'dim');
  if (l[2] !== 'err' && reached.size)
    game.term.print(
      'networks in reach: ' +
        game.networkContext.net.networks
          .filter((n) => reached.has(n.id))
          .map((n) => n.name)
          .join(', '),
      'dim',
    );
}

/** The deck's `connect <machine>` (by id or name): onto the board, and the deck talks to it from then on. */
export function deckConnect(game: Game, name: string) {
  const zh = game.zh,
    want = name.toLowerCase().replace(/\s+/g, '');
  const all = game.networkContext.net.networks.flatMap((n) => n.machines);
  const m = all.find(
    (x) =>
      x.id.toLowerCase() === want || game.machineName(x).toLowerCase().replace(/\s+/g, '') === want,
  );
  const id = m?.id ?? name;
  if (!zh.model.devices.has(id) && !zh.model.nodesHere().includes(id) && !m) {
    game.term.print('connect: no machine called ' + (name || '?') + ' in reach. try scan.', 'err');
    return;
  }
  zh.typed(() => zh.plugIn(id));
}

/** The GOAL after Capsule 7B, until scan.so is yours: the library (Act I: Capsule 7B → the library → Downtown). */
export function libraryGoal(game: Game): string | null {
  return goalHint(game.openingStory.GOAL_HINTS, {
    hackLocked: game.hackLocked(),
    scene: game.scenes.here,
    programs: game.save.programs,
    goalsDone: (scene) =>
      game.scenes.hosts.get(scene as SceneId)?.model.goals ??
      new Set(game.save.scenes[scene]?.goals ?? []),
    goalsLeft: () => game.zh.model.data.goals.some((g) => !game.zh.model.goals.has(g.id)),
  });
}
