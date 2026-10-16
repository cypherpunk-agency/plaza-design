/**
 * CRT boot: the first thing every visitor sees. The monitor powers on, a few
 * lines of boot text scroll, then the landing page appears. It gets shorter the
 * more often someone comes back, any key or click skips it, and reduced motion
 * skips it entirely.
 *
 * The black screen (`#crt-boot`) is in the static HTML so the landing page never
 * flashes first; its CSS (render.tsx) also fades it out on its own after a few
 * seconds, so a visitor without JavaScript is never stuck behind it.
 */

import { resumePending } from "../runtime/slots";

const LINES = [
  'REGISTRY BIOS v4.2 · (c) THE REGISTRY',
  'MEMORY CHECK .......... 640K OK',
  'MOUNTING /dev/plaza ... OK',
  'IDENTITY .............. NOT FOUND',
  'BOOTING PUBLIC TERMINAL',
];

function visits(): number {
  try {
    const n = Number(localStorage.getItem('ad-visits') || '0') + 1;
    localStorage.setItem('ad-visits', String(n));
    return n;
  } catch { return 1; }
}

export function runBoot(): Promise<void> {
  const el = document.getElementById('crt-boot');
  const reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  const n = visits();
  if (!el) return Promise.resolve();
  // `?play`, or back from a LOAD GAME reload (slots.ts): straight into the game.
  const play = (() => { try { return new URLSearchParams(location.search).has('play'); } catch { return false; } })() || resumePending();
  if (reduced || play) { el.remove(); return Promise.resolve(); }

  // First visit: the whole boot. Next few: a shortened one. After that: a flicker.
  const lines = n === 1 ? LINES : n <= 4 ? LINES.slice(3) : [];
  const lineMs = n === 1 ? 420 : 260;
  const text = el.querySelector('.crt-text') as HTMLElement;

  return new Promise((resolve) => {
    let done = false;
    const timers: number[] = [];
    const finish = () => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      el.classList.add('crt-off');
      window.removeEventListener('keydown', finish, true);
      window.removeEventListener('pointerdown', finish, true);
      setTimeout(() => { el.remove(); resolve(); }, 380);
    };
    window.addEventListener('keydown', finish, true);
    window.addEventListener('pointerdown', finish, true);

    el.classList.add('crt-on');
    const start = 450;
    lines.forEach((line, i) => timers.push(window.setTimeout(() => { text.textContent += (i ? '\n' : '') + line; }, start + i * lineMs)));
    timers.push(window.setTimeout(finish, start + lines.length * lineMs + (lines.length ? 500 : 150)));
  });
}
