/** Game: the city map overlay. */
import * as StoryTransitions from '../story-transitions';
import { sceneExitAccess } from '../../world/access';
import { type MapAct, type MapState } from '../../ui/citymap';
import { sound } from '../audio';
import { can } from '../play-profile';
import type { Game } from '../game';

/** The city map on its own, just to look at (for a menu to call). Esc closes it. */
export function showMap(game: Game) {
  if (!can('map')) return;
  if (!game.timing.running || game.presentation.flight || game.presentation.hop) return;
  game.input.keys.clear();
  game.presentation.bubble = null;
  // the map takes the screen: hack vision closes first
  if (game.zh.visionOn) game.zh.toggleVision();
  game.presentation.mapView = game.worldMap.openMap(
    'view',
    game.scenes.here,
    game.scenes.here === game.world.TRANSPORT.boarding.scene
      ? game.metro.rideStop(game.ride)
      : null,
  );
  game.syncEnginePause();
}

export function mapKey(game: Game, e: KeyboardEvent) {
  const k = e.key;
  if (
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Tab', 'Escape'].includes(k)
  )
    e.preventDefault();
  if (e.repeat) return;
  game.mapAct(game.worldMap.mapKey(game.mapState(), k));
}

/** Do what the map asks: close, a sound, quick travel to a place, a taxi to a stand. */
export function mapAct(game: Game, a: MapAct) {
  switch (a.kind) {
    case 'close':
      game.presentation.mapView = null;
      game.canvas.style.cursor = '';
      sound.close();
      return;
    case 'blip':
      sound.blip();
      return;
    case 'zoom':
      sound.open();
      return;
    case 'back':
      sound.close();
      return;
    case 'denied':
      sound.denied();
      return;
    case 'go':
      StoryTransitions.quickTravel(game.storyTransitionsPort, a.place);
      return;
    case 'fly':
      StoryTransitions.fly(game.storyTransitionsPort, a.stand);
      return;
  }
}

/** The map's state, for drawing it and for deciding where you may go. */
export function mapState(game: Game): MapState {
  const m = game.presentation.mapView ?? game.worldMap.openMap('view', game.scenes.here, null);
  return {
    view: m,
    touch: game.touch,
    scene: game.scenes.here,
    reduced: game.reduced,
    // the smallest touch target, 44 CSS px, in view units
    tapMin: (44 * game.canvas.width) / Math.max(1, game.canvas.clientWidth) / game.camera.k,
    avoid: game.mapAvoid(),
    ride:
      game.scenes.here === game.world.TRANSPORT.boarding.scene
        ? {
            from: game.metro.rideStop(game.ride),
            to: game.metro.rideNext(game.ride),
            f: game.metro.rideRun(game.ride),
          }
        : null,
    seen: (z) => !!game.save.flags[game.world.seenFlag(z)],
    flag: (f) => !!game.save.flags[f],
    exitAccess: (scene, id) =>
      sceneExitAccess(
        game.hasScene(scene)
          ? game.sceneDefinition(scene).exits.find((e) => e.id === id)
          : undefined,
        game.save.flags,
        game.save.keyring,
      ),
    harborOpen: game.world.harborOpen(game.save.flags),
    tokens: game.save.tokens,
    t: game.timing.clock,
  };
}

/** The phone's ESC button, which stays over the open map, in view units (null when it is not shown). */
export function mapAvoid(game: Game) {
  const b = document.querySelector<HTMLElement>('#touch button[data-key="Escape"]');
  const br = b?.getBoundingClientRect(),
    r = game.canvas.getBoundingClientRect();
  if (!br || !br.width || !r.width) return null;
  const f = game.canvas.width / r.width / game.camera.k;
  return {
    x: (br.left - r.left) * f,
    y: (br.top - r.top) * f,
    w: br.width * f,
    h: br.height * f,
  };
}

/** The pointer on the open map (citymap.ts reads it: districts, places, pads, back, outside). */
export function mapPointer(game: Game, e: PointerEvent, press: boolean) {
  const r = game.canvas.getBoundingClientRect();
  const px = ((e.clientX - r.left) * (game.canvas.width / r.width)) / game.camera.k,
    py = ((e.clientY - r.top) * (game.canvas.height / r.height)) / game.camera.k;
  const { act, pointer } = game.worldMap.mapPointer(
    game.mapState(),
    game.camera.viewW,
    game.camera.viewH,
    px,
    py,
    press,
    e.pointerType === 'mouse',
  );
  game.canvas.style.cursor = pointer ? 'pointer' : '';
  if (press) e.preventDefault();
  game.mapAct(act);
}

/** The city map when it is open, and the fade of a quick trip (dark in the middle, with where you are going). */
export function drawMap(game: Game) {
  if (game.presentation.hop) {
    const x = game.x,
      f = (game.timing.clock - game.presentation.hop.start) / game.world.HOP;
    x.fillStyle = 'rgba(0,0,0,' + Math.min(1, 1.2 - Math.abs(f * 2 - 1) * 1.2) + ')';
    x.fillRect(0, 0, game.camera.viewW, game.camera.viewH);
    if (f > 0.3 && f < 0.7) {
      x.save();
      x.font = '600 9px "IBM Plex Mono", monospace';
      x.textAlign = 'center';
      x.fillStyle = 'rgba(255,217,165,.85)';
      x.fillText(
        '> ' + game.presentation.hop.place.name,
        game.camera.viewW / 2,
        game.camera.viewH / 2,
      );
      x.restore();
    }
  }
  if (game.presentation.mapView)
    game.worldMap.drawCityMap(game.x, game.camera.viewW, game.camera.viewH, game.mapState());
}
