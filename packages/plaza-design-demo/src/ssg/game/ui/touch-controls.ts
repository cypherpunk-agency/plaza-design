import { can } from '../runtime/play-profile';

/** Sends a key to the game, the same way a keyboard would. */
const sendKey = (key: string, type: 'keydown' | 'keyup') => window.dispatchEvent(new KeyboardEvent(type, { key }));

/**
 * On-screen controls for touch screens: they press the same keys a keyboard does. One bar along the
 * bottom, by mode (the game sets `html.hack-on`, `html.hack-ok`; render.tsx shows what fits):
 * walking, the arrows left and HACK, JMP, ACT, >_, DECK right (the map is in the deck's SYSTEM tab); hack vision,
 * no arrows and EXIT, BOARD, LOGIC, NET (once scan.so is yours: `html.net-ok`), UNFOLD. HACK only once hacking is yours here.
 */
export function touchControls(host: HTMLElement) {
  const bar = document.createElement('div');
  bar.id = 'touch';
  bar.innerHTML =
    '<div class="pad"><button data-key="ArrowLeft" aria-label="Walk left">&#9664;</button><button data-key="ArrowRight" aria-label="Walk right">&#9654;</button></div>' +
    '<div class="pad"><button data-key="h" aria-label="Hack vision" class="walk-only hack">HACK</button>' +
    '<button data-key=" " aria-label="Jump" class="walk-only">JMP</button><button data-key="e" aria-label="Talk or jack in" class="walk-only">ACT</button>' +
    '<button data-key="Enter" aria-label="Terminal" class="small">&gt;_</button><button data-key="Escape" aria-label="Deck" class="small walk-only">DECK</button>' +
    '<button data-key="h" aria-label="Leave hack vision" class="vis-only">EXIT</button><button data-key="b" aria-label="The board" class="vis-only">BOARD</button>' +
    '<button data-key="l" aria-label="Logic parts" class="vis-only logic" data-logic>LOGIC</button><button data-key="n" aria-label="The net map" class="vis-only net">NET</button><button data-key="u" aria-label="Unfold every circuit" class="vis-only unfold">UNFOLD</button></div>';
  // a button for an ability the play profile lacks is not drawn
  const without = (selector: string) => bar.querySelectorAll(selector).forEach((el) => el.remove());
  if (!can('hack')) without('[data-key="h"], .vis-only');
  if (!can('jump')) without('[data-key=" "]');
  if (!can('deck')) without('[data-key="Enter"]');
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
