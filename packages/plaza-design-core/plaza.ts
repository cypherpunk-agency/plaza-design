// plaza.js - Plaza Design System Utilities v2.0
// ES Module with utilities for theme, clock, effects, and data generation

const STORAGE_KEY = 'plaza-theme';
const CUSTOM_THEMES_KEY = 'plaza-custom-themes';

// ============================================
// THEME MANAGEMENT
// ============================================

/**
 * Theme registry - built-in themes use null (CSS-only)
 * Custom themes are stored as objects and injected as CSS
 */
const themeRegistry = {
  neon: null,
  grayscale: null,
  ice: null,
  forest: null,
};

/**
 * Initialize theme from localStorage and optionally wire up toggle button
 * @param {string} [toggleButtonId] - Optional button ID for auto-wiring toggle
 */
export function initPlazaTheme(toggleButtonId) {
  // Load any custom themes from localStorage
  loadCustomThemes();

  // Load saved theme
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (savedTheme && savedTheme !== 'neon') {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  // Wire up toggle button if provided
  if (toggleButtonId) {
    const btn = document.getElementById(toggleButtonId);
    if (btn) {
      btn.addEventListener('click', cycleTheme);
    }
  }
}

/**
 * Get list of available theme names
 * @returns {string[]} Array of theme names
 */
export function getAvailableThemes() {
  return Object.keys(themeRegistry);
}

/**
 * Set theme by name
 * @param {string} themeName - Name of theme to activate
 */
export function setTheme(themeName) {
  if (!themeRegistry.hasOwnProperty(themeName) && themeName !== 'neon') {
    console.warn(`Theme '${themeName}' not found. Available themes: ${getAvailableThemes().join(', ')}`);
    return;
  }

  if (themeName === 'neon') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeName);
  }
  localStorage.setItem(STORAGE_KEY, themeName);

  // Dispatch event for canvas and other listeners
  window.dispatchEvent(new CustomEvent('plaza-theme-change', {
    detail: { theme: themeName }
  }));
}

/**
 * Cycle to next theme in registry
 */
export function cycleTheme() {
  const themes = getAvailableThemes();
  const current = getTheme();
  const currentIndex = themes.indexOf(current);
  const nextIndex = (currentIndex + 1) % themes.length;
  setTheme(themes[nextIndex]);
}

/**
 * Toggle between neon and grayscale themes (backwards compatibility)
 */
export function toggleTheme() {
  const current = getTheme();
  setTheme(current === 'neon' ? 'grayscale' : 'neon');
}

/**
 * Get current theme name
 * @returns {string} Current theme name
 */
export function getTheme() {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr || 'neon';
}

/**
 * Get canvas colors from CSS custom properties
 * @returns {Object} Canvas color configuration
 */
export function getCanvasColors() {
  const style = getComputedStyle(document.documentElement);

  return {
    grid: style.getPropertyValue('--canvas-grid').trim() || 'rgba(255, 100, 0, 0.35)',
    sunCore: style.getPropertyValue('--canvas-sun-core').trim() || 'rgba(255, 200, 100, 0.8)',
    sunGlow: style.getPropertyValue('--canvas-sun-glow').trim() || 'rgba(255, 136, 0, 0.6)',
    horizonGlow: style.getPropertyValue('--canvas-horizon-glow').trim() || 'rgba(255, 136, 0, 0.4)',
    ambient: style.getPropertyValue('--canvas-ambient').trim() || 'rgba(255, 136, 0, 0.25)',
    ambientSecondary: style.getPropertyValue('--canvas-ambient-secondary').trim() || 'rgba(255, 136, 0, 0.08)',
    ambientTertiary: style.getPropertyValue('--canvas-ambient-tertiary').trim() || 'rgba(255, 100, 0, 0.03)',
  };
}

/**
 * Register a custom theme
 * @param {string} name - Theme name
 * @param {Object} theme - Theme definition object
 */
export function registerTheme(name, theme) {
  themeRegistry[name] = theme;
  injectThemeCSS(name, theme);
  saveCustomThemes();
}

/**
 * Inject theme as CSS stylesheet
 * @param {string} name - Theme name
 * @param {Object} theme - Theme definition object
 */
function injectThemeCSS(name, theme) {
  const styleId = `plaza-theme-${name}`;
  let styleEl = document.getElementById(styleId);

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = generateThemeCSS(name, theme);
}

/**
 * Generate CSS from theme object
 * @param {string} name - Theme name
 * @param {Object} theme - Theme definition object
 * @returns {string} CSS string
 */
function generateThemeCSS(name, theme) {
  return `
[data-theme="${name}"] {
  --color-primary-300: ${theme.primary?.[300] || '#fdba74'};
  --color-primary-400: ${theme.primary?.[400] || '#fb923c'};
  --color-primary-500: ${theme.primary?.[500] || '#ff8800'};
  --color-primary-600: ${theme.primary?.[600] || '#ea580c'};
  --color-primary-700: ${theme.primary?.[700] || '#c2410c'};
  --color-primary-800: ${theme.primary?.[800] || '#9a3412'};
  --color-primary-900: ${theme.primary?.[900] || '#7c2d12'};
  --color-primary-950: ${theme.primary?.[950] || '#431407'};

  --color-accent-400: ${theme.accent?.[400] || '#00ffff'};
  --color-accent-500: ${theme.accent?.[500] || '#06b6d4'};
  --color-accent-600: ${theme.accent?.[600] || '#0891b2'};
  --color-accent-700: ${theme.accent?.[700] || '#0e7490'};
  --color-accent-800: ${theme.accent?.[800] || '#155e75'};
  --color-accent-900: ${theme.accent?.[900] || '#164e63'};
  --color-accent-950: ${theme.accent?.[950] || '#083344'};

  --color-bg-base: ${theme.bgBase || '#000000'};
  --color-bg-primary: ${theme.bgPrimary || '#1a0f00'};
  --color-bg-accent: ${theme.bgAccent || '#001a1a'};

  --color-error: ${theme.error || '#ff0055'};
  --color-warning: ${theme.warning || '#eab308'};
  --color-success: ${theme.success || '#22c55e'};

  --enable-glow: ${theme.enableGlow ?? 1};

  --color-primary-500-rgb: ${hexToRgb(theme.primary?.[500]) || '255, 136, 0'};
  --color-primary-600-rgb: ${hexToRgb(theme.primary?.[600]) || '234, 88, 12'};
  --color-primary-700-rgb: ${hexToRgb(theme.primary?.[700]) || '194, 65, 12'};
  --color-accent-400-rgb: ${hexToRgb(theme.accent?.[400]) || '57, 230, 255'};
  --color-accent-500-rgb: ${hexToRgb(theme.accent?.[500]) || '6, 182, 212'};

  ${theme.canvas ? `
  --canvas-grid: ${theme.canvas.grid || 'rgba(255, 100, 0, 0.35)'};
  --canvas-sun-core: ${theme.canvas.sunCore || 'rgba(255, 200, 100, 0.8)'};
  --canvas-sun-glow: ${theme.canvas.sunGlow || 'rgba(255, 136, 0, 0.6)'};
  --canvas-horizon-glow: ${theme.canvas.horizonGlow || 'rgba(255, 136, 0, 0.4)'};
  --canvas-ambient: ${theme.canvas.ambient || 'rgba(255, 136, 0, 0.25)'};
  --canvas-ambient-secondary: ${theme.canvas.ambientSecondary || 'rgba(255, 136, 0, 0.08)'};
  --canvas-ambient-tertiary: ${theme.canvas.ambientTertiary || 'rgba(255, 100, 0, 0.03)'};
  ` : ''}
}`;
}

/**
 * Convert hex color to RGB string
 * @param {string} hex - Hex color (e.g., '#ff8800')
 * @returns {string} RGB string (e.g., '255, 136, 0')
 */
function hexToRgb(hex) {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : null;
}

/**
 * Save custom themes to localStorage
 */
function saveCustomThemes() {
  const customThemes = {};
  for (const [name, theme] of Object.entries(themeRegistry)) {
    if (theme !== null) {
      customThemes[name] = theme;
    }
  }
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes));
}

/**
 * Load custom themes from localStorage
 */
function loadCustomThemes() {
  try {
    const saved = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (saved) {
      const customThemes = JSON.parse(saved);
      for (const [name, theme] of Object.entries(customThemes)) {
        themeRegistry[name] = theme;
        injectThemeCSS(name, theme);
      }
    }
  } catch (e) {
    console.warn('Failed to load custom themes:', e);
  }
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
 * Smoothly adjust a value relative to its previous state.
 * Creates "living system" feel for fake telemetry — values drift
 * instead of jumping randomly, making displays feel like real sensors.
 *
 * @param {number} current - The current value
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} maxDelta - Maximum change per adjustment
 * @returns {number} New value within bounds
 *
 * @example
 * // Track a "peer count" that drifts smoothly
 * let peerCount = 42;
 * setInterval(() => {
 *   peerCount = adjustValue(peerCount, 20, 70, 5);
 *   display.textContent = peerCount;
 * }, 3000);
 */
export function adjustValue(current, min, max, maxDelta) {
  const delta = (Math.random() - 0.5) * 2 * maxDelta;
  return Math.max(min, Math.min(max, Math.round(current + delta)));
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
 * Helper to extract RGB components and adjust alpha
 * @param {string} rgbaColor - RGBA color string
 * @param {number} newAlpha - New alpha value (0-1)
 * @returns {string} New RGBA color string
 */
function adjustAlpha(rgbaColor, newAlpha) {
  const match = rgbaColor.match(/rgba?\(([^)]+)\)/);
  if (!match) return rgbaColor;
  const parts = match[1].split(',').map(s => s.trim());
  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${newAlpha})`;
}

/**
 * Helper to extract RGB components from rgba for grid lines
 * @param {string} rgbaColor - RGBA color string
 * @returns {string} RGB part (e.g., "255, 100, 0")
 */
function extractRgb(rgbaColor) {
  const match = rgbaColor.match(/rgba?\(([^)]+)\)/);
  if (!match) return '255, 100, 0';
  const parts = match[1].split(',').map(s => s.trim());
  return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
}

/**
 * Initialize perspective grid canvas with animated sun/glow
 * Uses theme colors from CSS custom properties
 * @param {string} canvasId - Canvas element ID
 * @returns {{ start: () => void, stop: () => void, resize: () => void, updateColors: () => void }} Controller
 */
export function initGridCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    console.warn(`Canvas element '${canvasId}' not found`);
    return { start: () => {}, stop: () => {}, resize: () => {}, updateColors: () => {} };
  }

  const ctx = canvas.getContext('2d');
  let animationId = null;
  let time = 0;
  let colors = getCanvasColors();

  // Listen for theme changes
  const handleThemeChange = () => {
    colors = getCanvasColors();
  };
  window.addEventListener('plaza-theme-change', handleThemeChange);

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

    // Horizon position (65% from top - canonical)
    const horizonY = h * 0.65;
    const centerX = w / 2;

    // Ambient glow at horizon - using theme colors
    const ambientGlow = ctx.createRadialGradient(
      centerX, horizonY, 0,
      centerX, horizonY, w * 0.5
    );
    ambientGlow.addColorStop(0, colors.ambient);
    ambientGlow.addColorStop(0.3, colors.ambientSecondary);
    ambientGlow.addColorStop(0.6, colors.ambientTertiary);
    ambientGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = ambientGlow;
    ctx.fillRect(0, 0, w, h);

    // Sun semicircle with breathing animation - using theme colors
    const sunRadius = 60 + Math.sin(time * 0.015) * 8;
    const sunGradient = ctx.createRadialGradient(
      centerX, horizonY, 0,
      centerX, horizonY, sunRadius * 2
    );
    sunGradient.addColorStop(0, colors.sunCore);
    sunGradient.addColorStop(0.3, colors.sunGlow);
    sunGradient.addColorStop(0.6, adjustAlpha(colors.sunGlow, 0.2));
    sunGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(centerX, horizonY, sunRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Sun core - using theme color
    ctx.fillStyle = colors.sunCore;
    ctx.beginPath();
    ctx.arc(centerX, horizonY, sunRadius * 0.6, Math.PI, 0);
    ctx.fill();

    // Horizon line glow - using theme colors
    const horizonGlow = ctx.createLinearGradient(0, horizonY - 30, 0, horizonY + 30);
    horizonGlow.addColorStop(0, 'transparent');
    horizonGlow.addColorStop(0.5, colors.horizonGlow);
    horizonGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, horizonY - 30, w, 60);

    // Grid settings - using theme colors
    const gridRgb = extractRgb(colors.grid);
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

      ctx.strokeStyle = `rgba(${gridRgb}, ${alpha})`;
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
      ctx.strokeStyle = `rgba(${gridRgb}, ${alpha})`;
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
      window.removeEventListener('plaza-theme-change', handleThemeChange);
    },
    resize,
    updateColors: () => {
      colors = getCanvasColors();
    },
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
export function createParticles(containerId, count = 50) {
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
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 10}s`;
    particle.style.animationDuration = `${8 + Math.random() * 6}s`;
    container.appendChild(particle);
  }
}

/**
 * Start auto-scrolling hex data in an element
 * @param {string} elementId - Element ID
 * @param {number} [refreshRate=2000] - Refresh interval in ms
 * @returns {number} Interval ID for cleanup
 */
export function startHexScroll(elementId, refreshRate = 2500) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`Hex scroll element '${elementId}' not found`);
    return -1;
  }

  const update = () => {
    // Double the hex data for seamless CSS scroll animation
    const hexData = generateHexData(600);
    el.textContent = hexData + hexData;
  };

  update();
  return setInterval(update, refreshRate);
}

// ============================================
// STATEFUL DATA (Living System Feel)
// ============================================

// Telemetry state - values drift instead of jumping randomly
const telemetryState = {
  peerCount: 38,
  latency: 45,
  packetLoss: 0.12,
  memResident: 512,
  cpuLoad: 8
};

// Network log state - ms values drift
const netLogState = {
  entries: [
    { verb: 'SYNC', chan: 'L1', code: '200', ms: 45 },
    { verb: 'VERIFY', chan: 'P2P', code: '200', ms: 78 },
    { verb: 'ROUTE', chan: 'RPC', code: '204', ms: 32 },
    { verb: 'HANDSHAKE', chan: 'MESH', code: '200', ms: 156 },
    { verb: 'ATTEST', chan: 'L2', code: '206', ms: 91 },
    { verb: 'SYNC', chan: 'P2P', code: '200', ms: 67 }
  ]
};

// Node count state
let nodeCountState = 42;

/**
 * Update node count with drift
 * @param {string} elementId - Element ID to update
 */
export function updateNodeCount(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  nodeCountState = adjustValue(nodeCountState, 20, 70, 5);
  el.textContent = nodeCountState;
}

// ============================================
// UPDATE FUNCTIONS FOR GIMMICKS
// ============================================

/**
 * Render telemetry data to an element (with drift)
 * @param {string} elementId - Target element ID
 */
export function renderTelemetry(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  // Adjust values relative to previous (living system feel)
  telemetryState.peerCount = adjustValue(telemetryState.peerCount, 12, 64, 3);
  telemetryState.latency = adjustValue(telemetryState.latency, 18, 140, 8);
  telemetryState.packetLoss = Math.max(0, Math.min(0.9, telemetryState.packetLoss + (Math.random() - 0.5) * 0.1));
  telemetryState.memResident = adjustValue(telemetryState.memResident, 256, 1024, 20);
  telemetryState.cpuLoad = adjustValue(telemetryState.cpuLoad, 3, 17, 2);

  el.innerHTML = `<div class="plaza-side-panel__block"><div class="plaza-side-panel__header">telemetry</div><div>peer_count........... ${telemetryState.peerCount}</div><div>latency_rtt.......... ${telemetryState.latency}ms</div><div>packet_loss.......... ${telemetryState.packetLoss.toFixed(2)}%</div><div>mem_resident......... ${telemetryState.memResident}MB</div><div>cpu_load............. ${telemetryState.cpuLoad}%</div><div>sig.................. 0x${randomHex(8)}…</div><div>attestation.......... VALID</div></div>`;
}

/**
 * Render routes to an element (canonical format)
 * @param {string} elementId - Target element ID
 */
export function renderRoutes(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.innerHTML = `<div class="plaza-side-panel__block"><div class="plaza-side-panel__header">routes</div><div class="text-ambient-cyan"><span class="route-disabled">/enter</span></div><div class="text-ambient-cyan"><a href="https://polkadot-treasury-monitor.cypherpunk.agency/" target="_blank" class="route-link">/polkadot-treasury-monitor</a></div></div>`;
}

/**
 * Render keyboard shortcuts to an element (canonical format)
 * @param {string} elementId - Target element ID
 */
export function renderKeys(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.innerHTML = `<div class="plaza-side-panel__block"><div class="plaza-side-panel__header">keys</div><div class="text-ambient-amber">[Enter] proceed<br>[T] toggle theme</div></div>`;
}

/**
 * Render network log to an element (with drift)
 * @param {string} elementId - Target element ID
 */
export function renderNetLog(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  // Adjust ms values relative to previous (living system feel)
  netLogState.entries.forEach(entry => {
    entry.ms = adjustValue(entry.ms, 9, 220, 15);
  });

  let html = `<div class="plaza-side-panel__block"><div class="plaza-side-panel__header">processes</div>`;
  netLogState.entries.forEach(entry => {
    html += `<div><span class="text-ambient-amber">${entry.verb}</span>.${entry.chan}... ${entry.code} (${entry.ms}ms)</div>`;
  });
  html += `</div>`;
  el.innerHTML = html;
}

/**
 * Render status to an element (canonical format)
 * @param {string} elementId - Target element ID
 */
export function renderStatus(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.innerHTML = `<div class="plaza-side-panel__block"><div class="plaza-side-panel__header">updates</div><div class="text-dim-red">500: connection reset</div></div>`;
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
    particleCount = 50,
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
  cycleTheme,
  getTheme,
  setTheme,
  getAvailableThemes,
  getCanvasColors,
  registerTheme,
  // Clock
  startClock,
  // Data generation
  adjustValue,
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
  updateNodeCount,
  // Convenience
  initPlazaDemo,
};
