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
    setInterval(() => updateNodeCount('node-count'), 8000);

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
