// plaza.js - Plaza Design System Utilities v1.0
// ES Module with utilities for theme, clock, effects, and data generation

const STORAGE_KEY = 'plaza-theme';

// ============================================
// THEME MANAGEMENT
// ============================================

/**
 * Initialize theme from localStorage and optionally wire up toggle button
 * @param {string} [toggleButtonId] - Optional button ID for auto-wiring toggle
 */
export function initPlazaTheme(toggleButtonId) {
  // Load saved theme
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (savedTheme === 'grayscale') {
    document.documentElement.setAttribute('data-theme', 'grayscale');
  }

  // Wire up toggle button if provided
  if (toggleButtonId) {
    const btn = document.getElementById(toggleButtonId);
    if (btn) {
      btn.addEventListener('click', toggleTheme);
    }
  }
}

/**
 * Toggle between neon and grayscale themes
 */
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  if (current === 'grayscale') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(STORAGE_KEY, 'neon');
  } else {
    document.documentElement.setAttribute('data-theme', 'grayscale');
    localStorage.setItem(STORAGE_KEY, 'grayscale');
  }
}

/**
 * Get current theme
 * @returns {'neon' | 'grayscale'}
 */
export function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'grayscale'
    ? 'grayscale'
    : 'neon';
}

// ============================================
// CLOCK DISPLAY
// ============================================

/**
 * Start a UTC clock display in the specified element
 * @param {string} elementId - ID of element to update
 * @param {'full' | 'time' | 'date'} [format='full'] - Display format
 * @returns {number} Interval ID for cleanup
 */
export function startClock(elementId, format = 'full') {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`Clock element '${elementId}' not found`);
    return -1;
  }

  const update = () => {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const min = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');

    switch (format) {
      case 'time':
        el.textContent = `${hh}:${min}:${ss}`;
        break;
      case 'date':
        el.textContent = `${yyyy}-${mm}-${dd}`;
        break;
      case 'full':
      default:
        el.textContent = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} UTC`;
    }
  };

  update();
  return setInterval(update, 1000);
}

// ============================================
// DATA GENERATION (Gimmicks)
// ============================================

/**
 * Generate random integer between min and max (inclusive)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random hex string of specified length
 * @param {number} length
 * @returns {string}
 */
function randomHex(length) {
  let result = '';
  const chars = '0123456789ABCDEF';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generate fake telemetry data for gimmick display
 * @returns {Object} Telemetry data object
 */
export function generateTelemetry() {
  return {
    nodeId: `NODE_${randomHex(8)}`,
    latency: `${randInt(12, 89)}ms`,
    peers: randInt(24, 156),
    blocks: randInt(10000000, 99999999),
    hashRate: `${randInt(100, 999)}.${randInt(10, 99)} TH/s`,
    uptime: `${randInt(1, 30)}d ${randInt(0, 23)}h ${randInt(0, 59)}m`,
    mempool: randInt(500, 5000),
    syncStatus: Math.random() > 0.1 ? 'SYNCED' : 'SYNCING...',
    signature: `0x${randomHex(8)}...`,
    attestation: 'VALID',
  };
}

/**
 * Generate routes display
 * @returns {string[]} Array of route strings
 */
export function generateRoutes() {
  return ['/enter', '/about', '/channels', '/dms', '/profile'];
}

/**
 * Generate keyboard shortcuts display
 * @returns {Object[]} Array of key bindings
 */
export function generateKeys() {
  return [
    { key: '[Enter]', action: 'proceed' },
    { key: '[A]', action: 'about' },
    { key: '[T]', action: 'toggle theme' },
    { key: '[Esc]', action: 'close panel' },
  ];
}

/**
 * Generate network log entries for gimmick display
 * @param {number} [count=5] - Number of entries
 * @returns {string[]} Log entries
 */
export function generateNetLog(count = 5) {
  const actions = [
    'PEER_CONNECTED',
    'BLOCK_RECEIVED',
    'TX_BROADCAST',
    'HANDSHAKE_OK',
    'SYNC_CHUNK',
    'GOSSIP_MSG',
    'VERIFY_SIG',
    'ROUTE_UPDATE',
  ];

  const logs = [];
  for (let i = 0; i < count; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const ip = `${randInt(1, 255)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;
    const code = [200, 204, 206, 304][randInt(0, 3)];
    const ms = randInt(9, 180);
    logs.push(`[${action}] ${ip} (${code}/${ms}ms)`);
  }

  return logs;
}

/**
 * Generate status information
 * @returns {Object} Status data
 */
export function generateStatus() {
  return {
    connections: Math.random() > 0.05 ? 'OK' : 'DEGRADED',
    bandwidth: ['OPTIMAL', 'GOOD', 'MODERATE'][randInt(0, 2)],
    encryption: 'AES-256-GCM',
    protocol: `v${randInt(2, 3)}.${randInt(0, 9)}.${randInt(0, 9)}`,
    tls: 'TLS 1.3',
    mode: 'P2P MESH',
  };
}

/**
 * Generate random hex data string for scrolling background effect
 * @param {number} [length=500] - Character length
 * @returns {string} Hex string
 */
export function generateHexData(length = 500) {
  let hex = '';
  for (let i = 0; i < length; i++) {
    hex += Math.floor(Math.random() * 16).toString(16).toUpperCase();
    // Occasionally add spaces or newlines for visual variety
    if (i > 0 && i % 32 === 0) hex += '\n';
    else if (i > 0 && i % 8 === 0 && Math.random() > 0.7) hex += ' ';
  }
  return hex;
}

// ============================================
// GRID CANVAS
// ============================================

/**
 * Initialize perspective grid canvas with animated sun/glow
 * @param {string} canvasId - Canvas element ID
 * @returns {{ start: () => void, stop: () => void, resize: () => void }} Controller
 */
export function initGridCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    console.warn(`Canvas element '${canvasId}' not found`);
    return { start: () => {}, stop: () => {}, resize: () => {} };
  }

  const ctx = canvas.getContext('2d');
  let animationId = null;
  let time = 0;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const draw = () => {
    const w = canvas.width;
    const h = canvas.height;

    // Clear with pure black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // Horizon position (40% from top)
    const horizonY = h * 0.4;
    const centerX = w / 2;

    // Ambient glow at horizon
    const ambientGlow = ctx.createRadialGradient(
      centerX, horizonY, 0,
      centerX, horizonY, w * 0.5
    );
    ambientGlow.addColorStop(0, 'rgba(255, 136, 0, 0.25)');
    ambientGlow.addColorStop(0.3, 'rgba(255, 136, 0, 0.08)');
    ambientGlow.addColorStop(0.6, 'rgba(255, 100, 0, 0.03)');
    ambientGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = ambientGlow;
    ctx.fillRect(0, 0, w, h);

    // Sun semicircle with breathing animation
    const sunRadius = 60 + Math.sin(time * 0.015) * 8;
    const sunGradient = ctx.createRadialGradient(
      centerX, horizonY, 0,
      centerX, horizonY, sunRadius * 2
    );
    sunGradient.addColorStop(0, 'rgba(255, 180, 80, 0.9)');
    sunGradient.addColorStop(0.3, 'rgba(255, 136, 0, 0.6)');
    sunGradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.2)');
    sunGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(centerX, horizonY, sunRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Sun core
    ctx.fillStyle = 'rgba(255, 200, 100, 0.8)';
    ctx.beginPath();
    ctx.arc(centerX, horizonY, sunRadius * 0.6, Math.PI, 0);
    ctx.fill();

    // Horizon line glow
    const horizonGlow = ctx.createLinearGradient(0, horizonY - 30, 0, horizonY + 30);
    horizonGlow.addColorStop(0, 'transparent');
    horizonGlow.addColorStop(0.5, 'rgba(255, 136, 0, 0.4)');
    horizonGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, horizonY - 30, w, 60);

    // Grid settings
    ctx.strokeStyle = 'rgba(255, 100, 0, 0.35)';
    ctx.lineWidth = 1;

    // Vertical perspective lines
    const numVertLines = 30;
    const spreadBottom = w * 1.8;

    for (let i = 0; i <= numVertLines; i++) {
      const ratio = i / numVertLines;
      const bottomX = (w - spreadBottom) / 2 + spreadBottom * ratio;

      // Fade based on distance from center
      const distFromCenter = Math.abs(ratio - 0.5) * 2;
      const alpha = 0.35 * (1 - distFromCenter * 0.7);

      ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(centerX, horizonY);
      ctx.lineTo(bottomX, h);
      ctx.stroke();
    }

    // Horizontal lines with perspective
    const numHorizLines = 20;
    for (let i = 1; i <= numHorizLines; i++) {
      const ratio = i / numHorizLines;
      const y = horizonY + (h - horizonY) * Math.pow(ratio, 1.6);
      const perspectiveWidth = w * (0.05 + ratio * 0.95);
      const startX = (w - perspectiveWidth) / 2;

      const alpha = 0.15 + ratio * 0.25;
      ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + perspectiveWidth, y);
      ctx.stroke();
    }

    time++;
    animationId = requestAnimationFrame(draw);
  };

  // Initial resize
  resize();
  window.addEventListener('resize', resize);

  return {
    start: () => {
      if (!animationId) draw();
    },
    stop: () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    resize,
  };
}

// ============================================
// VISUAL EFFECTS
// ============================================

/**
 * Add glitch effect class to an element
 * @param {string} elementId - Element ID
 */
export function initGlitchEffect(elementId) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`Glitch element '${elementId}' not found`);
    return;
  }
  el.classList.add('plaza-glitch');
}

/**
 * Create floating particle elements
 * @param {string} containerId - Container element ID
 * @param {number} [count=20] - Number of particles
 */
export function createParticles(containerId, count = 20) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Particle container '${containerId}' not found`);
    return;
  }

  // Clear existing particles
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    const isCyan = Math.random() > 0.5;
    particle.className = `plaza-particle plaza-particle--${isCyan ? 'cyan' : 'orange'}`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 12}s`;
    particle.style.animationDuration = `${10 + Math.random() * 8}s`;
    particle.style.opacity = `${0.4 + Math.random() * 0.4}`;
    container.appendChild(particle);
  }
}

/**
 * Start auto-scrolling hex data in an element
 * @param {string} elementId - Element ID
 * @param {number} [refreshRate=2000] - Refresh interval in ms
 * @returns {number} Interval ID for cleanup
 */
export function startHexScroll(elementId, refreshRate = 2000) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`Hex scroll element '${elementId}' not found`);
    return -1;
  }

  const update = () => {
    el.textContent = generateHexData(600);
  };

  update();
  return setInterval(update, refreshRate);
}

// ============================================
// UPDATE FUNCTIONS FOR GIMMICKS
// ============================================

/**
 * Render telemetry data to an element
 * @param {string} elementId - Target element ID
 * @param {Object} [data] - Optional pre-generated data
 */
export function renderTelemetry(elementId, data) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const t = data || generateTelemetry();
  el.innerHTML = `
<div class="plaza-side-panel__header">TELEMETRY:</div>
<div class="plaza-side-panel__divider">----------------</div>
<div>NODE_ID: ${t.nodeId}</div>
<div>LATENCY: ${t.latency}</div>
<div>PEERS: ${t.peers}</div>
<div>BLOCKS: ${t.blocks.toLocaleString()}</div>
<div>HASH_RATE: ${t.hashRate}</div>
<div>UPTIME: ${t.uptime}</div>
<div>MEMPOOL: ${t.mempool.toLocaleString()}</div>
<div>SYNC: ${t.syncStatus}</div>
  `.trim();
}

/**
 * Render routes to an element
 * @param {string} elementId - Target element ID
 */
export function renderRoutes(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const routes = generateRoutes();
  el.innerHTML = `
<div class="plaza-side-panel__header">ROUTES:</div>
<div class="plaza-side-panel__divider">----------------</div>
${routes.map(r => `<div>${r}</div>`).join('\n')}
  `.trim();
}

/**
 * Render keyboard shortcuts to an element
 * @param {string} elementId - Target element ID
 */
export function renderKeys(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const keys = generateKeys();
  el.innerHTML = `
<div class="plaza-side-panel__header">KEYS:</div>
<div class="plaza-side-panel__divider">----------------</div>
${keys.map(k => `<div>${k.key} ${k.action}</div>`).join('\n')}
  `.trim();
}

/**
 * Render network log to an element
 * @param {string} elementId - Target element ID
 * @param {number} [count=5] - Number of log entries
 */
export function renderNetLog(elementId, count = 5) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const logs = generateNetLog(count);
  el.innerHTML = `
<div class="plaza-side-panel__header">NET:</div>
<div class="plaza-side-panel__divider">----------------</div>
${logs.map(l => `<div>${l}</div>`).join('\n')}
  `.trim();
}

/**
 * Render status to an element
 * @param {string} elementId - Target element ID
 */
export function renderStatus(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const s = generateStatus();
  el.innerHTML = `
<div class="plaza-side-panel__header">STATUS:</div>
<div class="plaza-side-panel__divider">----------------</div>
<div>CONNECTIONS: ${s.connections}</div>
<div>BANDWIDTH: ${s.bandwidth}</div>
<div>ENCRYPTION: ${s.encryption}</div>
<div>PROTOCOL: ${s.protocol}</div>
<div>TLS: ${s.tls}</div>
<div>MODE: ${s.mode}</div>
  `.trim();
}

// ============================================
// CONVENIENCE INITIALIZATION
// ============================================

/**
 * Initialize all Plaza demo features at once
 * @param {Object} config - Configuration object
 * @returns {Object} Cleanup functions
 */
export function initPlazaDemo(config = {}) {
  const {
    themeToggleId,
    clockId,
    canvasId,
    particlesId,
    titleId,
    telemetryId,
    routesId,
    keysId,
    netLogId,
    statusId,
    hexLeftId,
    hexRightId,
    particleCount = 25,
    telemetryRefresh = 5000,
    netLogRefresh = 3000,
    hexRefresh = 2000,
  } = config;

  const intervals = [];
  let gridController = null;

  // Theme
  initPlazaTheme(themeToggleId);

  // Clock
  if (clockId) {
    intervals.push(startClock(clockId, 'full'));
  }

  // Grid canvas
  if (canvasId) {
    gridController = initGridCanvas(canvasId);
    gridController.start();
  }

  // Particles
  if (particlesId) {
    createParticles(particlesId, particleCount);
  }

  // Title glitch
  if (titleId) {
    initGlitchEffect(titleId);
  }

  // Left side gimmicks
  if (telemetryId) {
    renderTelemetry(telemetryId);
    intervals.push(setInterval(() => renderTelemetry(telemetryId), telemetryRefresh));
  }

  if (routesId) {
    renderRoutes(routesId);
  }

  if (keysId) {
    renderKeys(keysId);
  }

  // Right side gimmicks
  if (netLogId) {
    renderNetLog(netLogId);
    intervals.push(setInterval(() => renderNetLog(netLogId), netLogRefresh));
  }

  if (statusId) {
    renderStatus(statusId);
  }

  // Hex scrolls
  if (hexLeftId) {
    intervals.push(startHexScroll(hexLeftId, hexRefresh));
  }

  if (hexRightId) {
    intervals.push(startHexScroll(hexRightId, hexRefresh));
  }

  // Return cleanup function
  return {
    cleanup: () => {
      intervals.forEach(id => {
        if (id !== -1) clearInterval(id);
      });
      if (gridController) {
        gridController.stop();
      }
    },
    gridController,
  };
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  // Theme
  initPlazaTheme,
  toggleTheme,
  getTheme,
  // Clock
  startClock,
  // Data generation
  generateTelemetry,
  generateRoutes,
  generateKeys,
  generateNetLog,
  generateStatus,
  generateHexData,
  // Visual effects
  initGridCanvas,
  initGlitchEffect,
  createParticles,
  startHexScroll,
  // Render helpers
  renderTelemetry,
  renderRoutes,
  renderKeys,
  renderNetLog,
  renderStatus,
  // Convenience
  initPlazaDemo,
};
