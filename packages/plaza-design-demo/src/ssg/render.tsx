import { renderToStaticMarkup } from 'react-dom/server';
import { StaticLandingPage } from './StaticLandingPage';

export interface MetaConfig {
  title: string;
  description: string;
  ogImage: string;
  ogUrl: string;
}

/**
 * Renders the static landing page to HTML string
 */
export function renderStaticHTML(): string {
  return renderToStaticMarkup(<StaticLandingPage />);
}

/**
 * Returns default meta configuration for the demos
 */
export function getDefaultMeta(): MetaConfig {
  return {
    title: '[cypherpunk.agency]',
    description: 'INITIATING CONNECTION... PROTOCOL ONLINE. Decentralized social evolution. Node 42 active. Access granted.',
    ogImage: 'https://cypherpunk.agency/og-image.png',
    ogUrl: 'https://cypherpunk.agency/',
  };
}

/**
 * Demo-specific CSS styles (inline in both modular and single)
 */
export const demoStyles = `
    /* Demo-specific styles */
    .demo-window {
      position: fixed;
      inset: 34px;
      display: flex;
      flex-direction: column;
    }

    .demo-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      padding: 0 300px;
    }

    .demo-center {
      text-align: center;
      z-index: 10;
      pointer-events: none;
    }

    .demo-center * {
      pointer-events: auto;
    }

    .demo-title {
      font-size: clamp(44px, 7vw, 96px);
      margin-bottom: 1rem;
      line-height: 1.05;
    }

    /* The city is decoration: keep it well behind the content */
    #city-canvas {
      opacity: 0.6;
    }

    /* Solid fill so the label stays readable where the sun rises behind it */
    .demo-center .plaza-btn {
      background: var(--color-bg-base);
    }

    .demo-center .plaza-btn:hover {
      background:
        linear-gradient(rgba(var(--color-primary-500-rgb), 0.1), rgba(var(--color-primary-500-rgb), 0.1)),
        var(--color-bg-base);
    }

    /* ENTER looks live; trying it shows [ACCESS DENIED] for at least 2s and
       while the pointer rests on it. Both labels share one grid cell so the
       button keeps its width. */
    #cta {
      display: inline-grid;
      place-items: center;
    }

    .cta-label {
      grid-area: 1 / 1;
    }

    .cta-denied,
    #cta.is-denied .cta-enter {
      visibility: hidden;
    }

    #cta.is-denied .cta-denied {
      visibility: visible;
    }

    .demo-center #cta.is-denied {
      background: var(--color-bg-primary);
      color: var(--color-text-faint);
      border-color: var(--color-text-faint);
      box-shadow: none;
      text-shadow: none;
      cursor: not-allowed;
    }

    #cta.is-denied::before {
      opacity: 0;
    }

    /* The Konami code: the one time the button lets you in */
    .cta-granted,
    #cta.is-granted .cta-enter,
    #cta.is-granted .cta-denied {
      visibility: hidden;
    }

    #cta.is-granted .cta-granted {
      visibility: visible;
    }

    .demo-center #cta.is-granted {
      color: var(--color-success);
      border-color: var(--color-success);
      box-shadow: 0 0 20px rgba(var(--color-success-rgb), 0.5);
      text-shadow: 0 0 10px rgba(var(--color-success-rgb), 0.8);
    }

    /* CRT boot (game/boot.ts). Fades out on its own after 6s as a failsafe. */
    #crt-boot {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: grid;
      place-items: center;
      background: #000;
      animation: crt-failsafe 0.4s linear 6s forwards;
    }

    #crt-boot .crt-screen {
      width: min(720px, 92vw);
      transform: scale(1, 0.004);
      opacity: 0.9;
      box-shadow: 0 0 24px 4px rgba(255, 220, 180, 0.9);
      transition: transform 0.35s ease-out, box-shadow 0.35s;
    }

    #crt-boot.crt-on .crt-screen {
      transform: scale(1, 1);
      box-shadow: 0 0 40px rgba(var(--color-primary-500-rgb), 0.15);
    }

    #crt-boot.crt-off {
      opacity: 0;
      transition: opacity 0.35s 0.15s;
    }

    #crt-boot.crt-off .crt-screen {
      transform: scale(1, 0.004);
      transition: transform 0.2s ease-in;
    }

    .crt-text {
      min-height: 9em;
      margin: 0;
      padding: var(--spacing-6);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      line-height: 1.6;
      white-space: pre-wrap;
      color: var(--color-text-body);
      text-shadow: 0 0 6px rgba(var(--color-primary-500-rgb), 0.7);
      background: repeating-linear-gradient(0deg, rgba(var(--color-primary-500-rgb), 0.05) 0 1px, transparent 1px 3px), #000;
      border: var(--border-thin) solid var(--color-border-muted);
    }

    @keyframes crt-failsafe {
      to { opacity: 0; visibility: hidden; }
    }

    @media (prefers-reduced-motion: reduce) {
      #crt-boot { display: none; }
    }

    /* ACCESS DENIED, the game (game/*.ts): it takes over the window */
    html.game-mode .demo-content,
    html.game-mode #particles,
    html.game-mode #city-canvas,
    html.game-mode .footer-not-auth {
      visibility: hidden;
    }

    html.game-mode .footer-not-auth {
      display: none;
    }

    html.game-mode #cta .cta-label {
      visibility: hidden;
    }

    #game-canvas {
      position: absolute;
      left: 0;
      right: 0;
      top: var(--game-top, 40px);
      width: 100%;
      height: calc(100% - var(--game-top, 40px) - var(--game-bottom, 40px));
      z-index: 5;
      background: #000;
      image-rendering: pixelated;
      outline: none;
    }

    #term {
      position: absolute;
      left: 0;
      right: 0;
      bottom: var(--game-bottom, 40px);
      max-height: 42%;
      overflow-y: auto;
      z-index: 6;
      padding: var(--spacing-3) var(--spacing-4);
      background: rgba(4, 2, 0, 0.94);
      border-top: var(--border-thin) solid var(--color-border-default);
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      line-height: 1.5;
    }

    .term-line { white-space: pre-wrap; color: var(--color-text-body); }
    .term-in { color: var(--color-accent-400); }
    .term-ok { color: var(--color-success); }
    .term-err { color: var(--color-error); }
    .term-dim { color: var(--color-text-faint); }
    .term-head { color: var(--color-primary-400); }

    #term-input {
      display: none;
      flex: 1;
      min-width: 0;
      padding: 0 var(--spacing-2);
      background: transparent;
      border: 0;
      outline: none;
      font: inherit;
      font-size: var(--text-xs);
      color: var(--color-accent-400);
      caret-color: var(--color-accent-400);
    }

    #term-input::placeholder { color: var(--color-text-faint); }

    html.game-mode #term-input { display: block; }

    /* Phones: basic support, landscape only (game/index.ts) */
    #touch {
      display: none;
      position: absolute;
      left: 0;
      right: 0;
      bottom: calc(var(--game-bottom, 40px) + var(--spacing-1));
      z-index: 7;
      justify-content: space-between;
      padding: 0 var(--spacing-3);
      pointer-events: none;
    }

    html.game-mode.touch #touch { display: flex; }

    /* On a phone the game gets the whole screen: no window inset, slim header and footer */
    html.game-mode.touch .demo-window { inset: 0; }
    html.game-mode.touch .plaza-corner-bracket { display: none; }
    html.game-mode.touch .plaza-window-header,
    html.game-mode.touch .plaza-window-footer { padding: var(--spacing-1) var(--spacing-3); min-height: 0; }
    html.game-mode.touch .plaza-window-header *,
    html.game-mode.touch .plaza-window-footer * { font-size: var(--text-xs); }
    html.game-mode.touch .footer-send-btn { padding: 2px var(--spacing-2); }
    html.game-mode.touch #term:not([hidden]) ~ #touch { display: none; }

    #touch .pad {
      display: flex;
      gap: var(--spacing-2);
      pointer-events: auto;
    }

    #touch button {
      width: 44px;
      height: 44px;
      padding: 0;
      border: var(--border-medium) solid var(--color-border-strong);
      background: rgba(var(--color-bg-overlay-rgb), 0.35);
      color: var(--color-primary-400);
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      font-weight: 600;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }

    #touch button.small {
      width: 38px;
      border-width: var(--border-thin);
      color: var(--color-text-muted);
    }

    #touch button.down { background: rgba(var(--color-primary-500-rgb), 0.3); }

    #rotate {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9000;
      place-items: center;
      padding: var(--spacing-6);
      background: #000;
      text-align: center;
      font-family: var(--font-mono);
    }

    .rotate-title {
      font-size: var(--text-lg);
      letter-spacing: var(--letter-spacing-widest);
      color: var(--color-primary-400);
    }

    .rotate-note {
      margin-top: var(--spacing-2);
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    @media (orientation: portrait) {
      html.game-mode.touch #rotate { display: grid; }
    }

    .term-chips {
      display: none;
      flex-wrap: wrap;
      gap: var(--spacing-2);
      padding-bottom: var(--spacing-2);
    }

    html.touch .term-chips { display: flex; }

    .term-chips button {
      padding: var(--spacing-1) var(--spacing-3);
      border: var(--border-thin) solid var(--color-border-default);
      background: transparent;
      color: var(--color-accent-400);
      font-family: var(--font-mono);
      font-size: var(--text-xs);
    }

    .demo-subtitle {
      font-size: clamp(12px, 1.6vw, 18px);
      color: var(--color-accent-400);
      text-shadow:
        0 0 10px rgba(0, 255, 255, 0.6),
        0 0 20px rgba(0, 255, 255, 0.4);
    }

    @media (max-width: 980px) {
      .plaza-side-panel {
        display: none;
      }

      .demo-content {
        padding: 0 28px;
      }

      .demo-window {
        inset: 18px;
      }

      /* 19 characters must fit the window on a phone */
      .demo-title {
        font-size: calc(8vw - 8px);
      }
    }

    .header-online {
      margin-left: 10px;
    }

    @media (max-width: 640px) {
      .header-initiating {
        display: none;
      }

      .header-online {
        margin-left: 0;
      }

      .demo-center .plaza-btn {
        padding: var(--spacing-3) var(--spacing-5);
        letter-spacing: var(--letter-spacing-wider);
        white-space: nowrap;
      }
    }
`;

/**
 * JavaScript initialization code for the demos
 */
export const initScript = `
    // The CRT boot is the first thing every visitor sees.
    runBoot();

    const PROJECTS = [
      { label: '/frontier', href: 'https://frontier.cypherpunk.agency/' },
      { label: '/sol-economy', href: 'https://sol-economy.cypherpunk.agency/' },
      { label: '/orbis', href: 'https://orbis.cypherpunk.agency/' },
    ];
    // Initialize theme
    initPlazaTheme();

    // Start clock
    startClock('clock', 'full');

    // City scene: skyline, antenna, beacons, reflective floor
    const scene = initCityScene('city-canvas', {
      beacons: PROJECTS,
      anchor: '#cta',
      ceiling: '.plaza-window-header',
      mask: '.plaza-window-header, .plaza-window-footer, .plaza-side-panel__block, .plaza-hex-scroll, #title, .demo-subtitle, #cta',
    });
    scene.start();

    // ACCESS DENIED: the Konami code turns the window into the game.
    initAccessDenied({ scene });

    // Create particles (canonical count: 50)
    createParticles('particles', 50);

    // Render left side gimmicks
    renderTelemetry('telemetry');
    renderRoutes('routes', PROJECTS);
    // Hovering a route lights its beacon on the skyline
    document.querySelectorAll('#routes .route-link').forEach((a) => {
      a.addEventListener('mouseenter', () => scene.highlight(a.textContent));
      a.addEventListener('mouseleave', () => scene.highlight(null));
    });
    renderKeys('keys');

    // Render right side gimmicks
    renderNetLog('netlog');
    renderStatus('status');

    // Start hex scrolls
    startHexScroll('hex-left', 2500);
    startHexScroll('hex-right', 2500);

    // Update dynamic data periodically
    setInterval(() => renderTelemetry('telemetry'), 5000);
    setInterval(() => renderNetLog('netlog'), 3000);

    // Update node count with drift
    updateNodeCount('node-count');
    setInterval(() => { if (!document.documentElement.classList.contains('game-mode')) updateNodeCount('node-count'); }, 8000);

    // ENTER is a tease: trying it shows [ACCESS DENIED] for at least 2 seconds
    // and for as long as the pointer rests on the button.
    const cta = document.getElementById('cta');
    let deniedAt = 0, ctaHover = false, ctaTimer = 0;
    function setDenied(on) {
      cta.classList.toggle('is-denied', on);
      cta.querySelector('.cta-enter').setAttribute('aria-hidden', String(on));
      cta.querySelector('.cta-denied').setAttribute('aria-hidden', String(!on));
    }
    function releaseLater() {
      clearTimeout(ctaTimer);
      ctaTimer = setTimeout(() => { if (!ctaHover) setDenied(false); }, Math.max(0, 2000 - (Date.now() - deniedAt)));
    }
    function deny() { deniedAt = Date.now(); setDenied(true); releaseLater(); }
    cta.addEventListener('click', deny);
    cta.addEventListener('pointerenter', () => { ctaHover = true; });
    cta.addEventListener('pointerleave', () => { ctaHover = false; if (cta.classList.contains('is-denied')) releaseLater(); });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (document.documentElement.classList.contains('game-mode')) return;
      if (e.key === 'Enter') {
        handleEnter();
      } else if (e.key.toLowerCase() === 't') {
        toggleTheme();
      }
    });

    // Flash effect on enter
    function handleEnter() {
      if (document.activeElement !== cta) deny();
      const title = document.getElementById('title');
      title.style.transform = 'scale(1.02)';
      title.style.filter = 'brightness(1.3)';
      setTimeout(() => {
        title.style.transform = '';
        title.style.filter = '';
      }, 200);
      // Refresh telemetry for visual feedback
      renderTelemetry('telemetry');
      renderNetLog('netlog');
    }

    // Evolution text hover effect - glitch once then revert
    const evolutionEl = document.getElementById('evolution-word');
    let evolutionTimeout = null;
    evolutionEl.addEventListener('mouseenter', () => {
      if (evolutionTimeout) return; // Already glitching
      evolutionEl.classList.add('glitching');
      evolutionTimeout = setTimeout(() => {
        evolutionEl.classList.remove('glitching');
        evolutionTimeout = null;
      }, 400);
    });
`;
