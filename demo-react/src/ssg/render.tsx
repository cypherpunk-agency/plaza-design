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
    }
`;

/**
 * JavaScript initialization code for the demos
 */
export const initScript = `
    // Initialize theme
    initPlazaTheme();

    // Start clock
    startClock('clock', 'full');

    // Initialize grid canvas
    const grid = initGridCanvas('grid-canvas');
    grid.start();

    // Create particles (canonical count: 50)
    createParticles('particles', 50);

    // Render left side gimmicks
    renderTelemetry('telemetry');
    renderRoutes('routes');
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
