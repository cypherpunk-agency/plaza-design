/**
 * ACCESS DENIED: hooks the game into the landing page.
 *
 * - The CRT boot runs first, on every visit.
 * - The Konami code (up up down down left right left right B A) is the only way in:
 *   the button says ACCESS GRANTED for once, then the window becomes the game.
 * - Esc leaves the game; progress stays in the browser.
 * - M toggles sound anywhere.
 *
 * While the game runs, `html.game-mode` is set; the landing page's own key
 * shortcuts check it and stay quiet.
 */

import { sound } from './audio';
import { runBoot } from './boot';
import { Game } from './game';

export { runBoot };

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

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
  const zone = document.querySelector('.header-initiating') as HTMLElement | null;
  const nodes = document.getElementById('node-count');
  if (!cta || !windowEl || !header || !footer || !inputHost) return;
  const zoneText = zone?.textContent ?? '';

  let game: Game | null = null;
  let progress = 0;
  let entering = false;

  const exit = () => {
    if (!html.classList.contains('game-mode')) return;
    game?.stop();
    html.classList.remove('game-mode');
    if (zone) zone.textContent = zoneText;
    cta.classList.remove('is-granted');
    opts.scene.start();
  };

  const enter = () => {
    entering = false;
    cta.classList.remove('is-granted');
    html.classList.add('game-mode');
    opts.scene.stop();
    game ??= new Game({
      windowEl, header, footer, inputHost,
      onExit: exit,
      setNodes: (n) => { if (nodes) nodes.textContent = String(n); },
      setZone: (text) => { if (zone) zone.textContent = text; },
    });
    game.start();
  };

  window.addEventListener('keydown', (e) => {
    if (html.classList.contains('game-mode')) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    const key = e.key.toLowerCase();
    if (key === 'm') { sound.toggle(); return; }
    progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;
    if (progress === KONAMI.length && !entering) {
      progress = 0;
      entering = true;
      cta.classList.remove('is-denied');
      cta.classList.add('is-granted');
      sound.granted();
      setTimeout(enter, 1300);
    }
  });
}
