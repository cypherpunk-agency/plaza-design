/**
 * ACCESS DENIED: hooks the game into the landing page.
 *
 * - The CRT boot runs first, on every visit. The game itself opens on its title screen (title/):
 *   a sunrise over the sea with the main menu; NEW GAME glides from it into the train home.
 * - The Konami code (up up down down left right left right B A) is the only way in:
 *   the button says ACCESS GRANTED for once, then the window becomes the game.
 * - `?play` in the URL skips the boot and the Konami code; `?play=<scene id>` starts in that scene
 *   (scenes/index.ts `SCENES`: capsule, your flat, where a new game starts; yard, moth, beach, harbor, market, shop, mall,
 *   the metro platforms metro, galleriaStation and harborStation, train), `?play=<cutscene id>` plays a cutscene
 *   first (cutscenes/: intro), then its next scene.
 * - Phones (basic support, landscape only): the Konami code as swipes
 *   (up up down down left right left right, tap tap), on-screen buttons, and a
 *   "rotate your phone" screen in portrait.
 * - Esc opens the pause menu (menu.ts): save slots, load, new game, sound, quit to the homepage.
 *   Progress stays in the browser. LOAD GAME reloads the page and lands back in the game (slots.ts).
 * - In the game: ENTER opens the terminal, TAB or M the city map; sound is in the key bar and the menu.
 *
 * While the game runs, `html.game-mode` is set; the landing page's own key
 * shortcuts check it and stay quiet.
 */

import { sound } from './audio';
import { runBoot } from './boot';
import { Game } from './game';
import { isSceneId } from './scenes';
import { isCutsceneId } from './cutscenes';
import { takeResume } from './slots';

export { runBoot };

/** `?play` (or `?sudo`, sudo.ts) in the URL skips the boot and the Konami code: straight into the game. */
export const playParam = () => { try { const q = new URLSearchParams(location.search); return q.has('play') || q.has('sudo'); } catch { return false; } };
/** `?play=yard` starts in the fixer's back yard, `?play=harbor` on the harbor pier: any scene. */
const playScene = () => {
  try { return sceneParam(new URLSearchParams(location.search).get('play') ?? ''); } catch { return undefined; }
};
/** A scene (or cutscene) id the game can start in; Downtown (and anything unknown) is undefined: the game decides. */
const sceneParam = (z: string) => ((isSceneId(z) && z !== 'downtown') || isCutsceneId(z) ? z : undefined);

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
const SWIPES = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'tap', 'tap'];

const isTouch = () => { try { return matchMedia('(pointer: coarse)').matches; } catch { return false; } };

/** Sends a key to the game, the same way a keyboard would. */
const sendKey = (key: string, type: 'keydown' | 'keyup') => window.dispatchEvent(new KeyboardEvent(type, { key }));

/**
 * On-screen controls for touch screens: they press the same keys a keyboard does. One bar along the
 * bottom, by mode (the game sets `html.hack-on`, `html.hack-ok`; render.tsx shows what fits):
 * walking, the arrows left and HACK, JMP, ACT, MENU right (the map is in the menu); hack vision,
 * no arrows and EXIT, BOARD, LOGIC, UNFOLD. HACK only once hacking is yours here.
 */
function touchControls(host: HTMLElement) {
  const bar = document.createElement('div');
  bar.id = 'touch';
  bar.innerHTML =
    '<div class="pad"><button data-key="ArrowLeft" aria-label="Walk left">&#9664;</button><button data-key="ArrowRight" aria-label="Walk right">&#9654;</button></div>' +
    '<div class="pad"><button data-key="h" aria-label="Hack vision" class="walk-only hack">HACK</button>' +
    '<button data-key=" " aria-label="Jump" class="walk-only">JMP</button><button data-key="e" aria-label="Talk or jack in" class="walk-only">ACT</button>' +
    '<button data-key="Enter" aria-label="Terminal" class="small">&gt;_</button><button data-key="Escape" aria-label="Menu" class="small walk-only">MENU</button>' +
    '<button data-key="h" aria-label="Leave hack vision" class="vis-only">EXIT</button><button data-key="b" aria-label="The board" class="vis-only">BOARD</button>' +
    '<button data-key="l" aria-label="Logic parts" class="vis-only logic" data-logic>LOGIC</button><button data-key="u" aria-label="Unfold every circuit" class="vis-only unfold">UNFOLD</button></div>';
  bar.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
    const key = b.dataset.key!;
    const down = (e: Event) => { e.preventDefault(); b.classList.add('down'); sendKey(key, 'keydown'); };
    const up = (e: Event) => { e.preventDefault(); if (!b.classList.contains('down')) return; b.classList.remove('down'); sendKey(key, 'keyup'); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  host.appendChild(bar);

  const rotate = document.createElement('div');
  rotate.id = 'rotate';
  rotate.innerHTML = '<div><div class="rotate-title">ROTATE YOUR DEVICE</div><div class="rotate-note">Downtown runs in landscape.</div></div>';
  document.body.appendChild(rotate);
}

export interface AccessDeniedOpts {
  /** The landing page's background scene, paused while the game runs. */
  scene: { start: () => void; stop: () => void };
}

export function initAccessDenied(opts: AccessDeniedOpts) {
  const html = document.documentElement;
  const cta = document.getElementById('cta');
  const windowEl = document.querySelector('.demo-window') as HTMLElement | null;
  const header = document.querySelector('.plaza-window-header') as HTMLElement | null;
  const footer = document.querySelector('.plaza-window-footer') as HTMLElement | null;
  const inputHost = document.querySelector('.footer-input-area') as HTMLElement | null;
  const sceneLabel = document.querySelector('.header-initiating') as HTMLElement | null;
  const nodes = document.getElementById('node-count');
  if (!cta || !windowEl || !header || !footer || !inputHost) return;
  const sceneText = sceneLabel?.textContent ?? '';

  let game: Game | null = null;
  let progress = 0;
  let entering = false;
  let controls = false;
  if (isTouch()) html.classList.add('touch');

  const exit = () => {
    if (!html.classList.contains('game-mode')) return;
    game?.stop();
    html.classList.remove('game-mode');
    if (sceneLabel) sceneLabel.textContent = sceneText;
    cta.classList.remove('is-granted');
    opts.scene.start();
  };

  const enter = (resumeScene?: string) => {
    entering = false;
    cta.classList.remove('is-granted');
    html.classList.add('game-mode');
    opts.scene.stop();
    game ??= new Game({
      windowEl, header, footer, inputHost,
      onExit: exit,
      setNodes: (n) => { if (nodes) nodes.textContent = String(n); },
      setScene: (text) => { if (sceneLabel) sceneLabel.textContent = text; },
    });
    if (isTouch() && !controls) { controls = true; touchControls(windowEl); }
    // launching (the Konami code, `?play` or `?sudo` with no scene named): the title screen first (title/)
    const named = (() => { try { return !!new URLSearchParams(location.search).get('play'); } catch { return false; } })();
    game.start(resumeScene !== undefined ? sceneParam(resumeScene) : playScene(), resumeScene === undefined && !named);
  };

  // Back from a LOAD GAME reload: the slot's save is in place, straight into its scene.
  const resume = takeResume();
  if (resume !== null) enter(resume);
  else if (playParam()) enter();

  const grant = () => {
    progress = 0;
    entering = true;
    cta.classList.remove('is-denied');
    cta.classList.add('is-granted');
    sound.granted();
    setTimeout(enter, 1300);
  };

  // The Konami code as swipes on touch screens; the last two "B A" are taps.
  let swipe = 0, sx = 0, sy = 0;
  window.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (html.classList.contains('game-mode') || entering) return;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    const move = Math.abs(dx) < 24 && Math.abs(dy) < 24 ? 'tap' : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    swipe = move === SWIPES[swipe] ? swipe + 1 : move === SWIPES[0] ? 1 : 0;
    if (swipe === SWIPES.length) { swipe = 0; grant(); }
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (html.classList.contains('game-mode')) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    const key = e.key.toLowerCase();
    if (key === 'm') { sound.toggle(); return; }
    progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;
    if (progress === KONAMI.length && !entering) grant();
  });
}
