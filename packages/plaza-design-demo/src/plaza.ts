// plaza.ts - Plaza Design System Utilities for React
// TypeScript module with utilities for theme, clock, effects, and data generation

const STORAGE_KEY = 'plaza-theme';
const CUSTOM_THEMES_KEY = 'plaza-custom-themes';

// ============================================
// THEME TYPES
// ============================================

export interface CanvasColors {
  grid: string;
  sunCore: string;
  sunGlow: string;
  horizonGlow: string;
  ambient: string;
}

export interface PlazaTheme {
  name: string;
  colors: {
    primary: Record<number, string>;
    accent: Record<number, string>;
    gray: Record<number, string>;
  };
  rgb: {
    primary500: string;
    accent400: string;
  };
  background: {
    base: string;
    primary: string;
  };
  enableGlow: 0 | 1;
  canvas: CanvasColors;
}

// ============================================
// THEME REGISTRY
// ============================================

// Built-in themes use null (CSS-only), custom themes store full config
const themeRegistry: Record<string, PlazaTheme | null> = {
  neon: null,
  grayscale: null,
  ice: null,
  forest: null,
};

// ============================================
// THEME MANAGEMENT
// ============================================

/**
 * Get list of available theme names
 */
export function getAvailableThemes(): string[] {
  return Object.keys(themeRegistry);
}

/**
 * Initialize theme from localStorage
 */
export function initPlazaTheme(): void {
  // Load custom themes first
  loadCustomThemes();

  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (savedTheme && savedTheme !== 'neon' && themeRegistry.hasOwnProperty(savedTheme)) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
}

/**
 * Set theme by name
 */
export function setTheme(themeName: string): void {
  if (!themeRegistry.hasOwnProperty(themeName)) {
    console.warn(`Unknown theme: ${themeName}`);
    return;
  }

  if (themeName === 'neon') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeName);
  }
  localStorage.setItem(STORAGE_KEY, themeName);

  // Dispatch theme change event for canvas and other listeners
  window.dispatchEvent(new CustomEvent('plaza-theme-change', {
    detail: { theme: themeName }
  }));
}

/**
 * Cycle through available themes
 */
export function cycleTheme(): void {
  const themes = getAvailableThemes();
  const current = getTheme();
  const nextIndex = (themes.indexOf(current) + 1) % themes.length;
  setTheme(themes[nextIndex]);
}

/**
 * Toggle between neon and grayscale themes (legacy support)
 */
export function toggleTheme(): void {
  const current = getTheme();
  setTheme(current === 'grayscale' ? 'neon' : 'grayscale');
}

/**
 * Get current theme name
 */
export function getTheme(): string {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr || 'neon';
}

/**
 * Get canvas colors from CSS variables
 */
export function getCanvasColors(): CanvasColors {
  const style = getComputedStyle(document.documentElement);
  return {
    grid: style.getPropertyValue('--canvas-grid').trim() || 'rgba(255, 100, 0, 0.35)',
    sunCore: style.getPropertyValue('--canvas-sun-core').trim() || 'rgba(255, 200, 100, 0.8)',
    sunGlow: style.getPropertyValue('--canvas-sun-glow').trim() || 'rgba(255, 136, 0, 0.6)',
    horizonGlow: style.getPropertyValue('--canvas-horizon-glow').trim() || 'rgba(255, 136, 0, 0.4)',
    ambient: style.getPropertyValue('--canvas-ambient').trim() || 'rgba(255, 136, 0, 0.25)',
  };
}

/**
 * Register a custom theme
 */
export function registerTheme(name: string, theme: PlazaTheme): void {
  themeRegistry[name] = theme;
  injectThemeCSS(name, theme);
  saveCustomThemes();
}

/**
 * Inject CSS for a custom theme
 */
function injectThemeCSS(name: string, theme: PlazaTheme): void {
  // Remove existing style if present
  const existingStyle = document.getElementById(`plaza-theme-${name}`);
  if (existingStyle) {
    existingStyle.remove();
  }

  const style = document.createElement('style');
  style.id = `plaza-theme-${name}`;
  style.textContent = `
    [data-theme="${name}"] {
      --color-primary-300: ${theme.colors.primary[300] || theme.colors.primary[500]};
      --color-primary-400: ${theme.colors.primary[400] || theme.colors.primary[500]};
      --color-primary-500: ${theme.colors.primary[500]};
      --color-primary-600: ${theme.colors.primary[600] || theme.colors.primary[500]};
      --color-primary-700: ${theme.colors.primary[700] || theme.colors.primary[500]};
      --color-primary-500-rgb: ${theme.rgb.primary500};
      --color-accent-400: ${theme.colors.accent[400]};
      --color-accent-500: ${theme.colors.accent[500] || theme.colors.accent[400]};
      --color-accent-400-rgb: ${theme.rgb.accent400};
      --color-gray-400: ${theme.colors.gray[400] || '#9ca3af'};
      --color-gray-500: ${theme.colors.gray[500] || '#6b7280'};
      --color-gray-600: ${theme.colors.gray[600] || '#4b5563'};
      --color-gray-700: ${theme.colors.gray[700] || '#374151'};
      --color-gray-800: ${theme.colors.gray[800] || '#1f2937'};
      --color-gray-900: ${theme.colors.gray[900] || '#111827'};
      --color-bg-base: ${theme.background.base};
      --color-bg-primary: ${theme.background.primary};
      --enable-glow: ${theme.enableGlow};
      --canvas-grid: ${theme.canvas.grid};
      --canvas-sun-core: ${theme.canvas.sunCore};
      --canvas-sun-glow: ${theme.canvas.sunGlow};
      --canvas-horizon-glow: ${theme.canvas.horizonGlow};
      --canvas-ambient: ${theme.canvas.ambient};
    }
  `;
  document.head.appendChild(style);
}

/**
 * Save custom themes to localStorage
 */
function saveCustomThemes(): void {
  const customThemes: Record<string, PlazaTheme> = {};
  for (const [name, theme] of Object.entries(themeRegistry)) {
    if (theme !== null) {
      customThemes[name] = theme;
    }
  }
  if (Object.keys(customThemes).length > 0) {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes));
  }
}

/**
 * Load custom themes from localStorage
 */
function loadCustomThemes(): void {
  const saved = localStorage.getItem(CUSTOM_THEMES_KEY);
  if (saved) {
    try {
      const customThemes = JSON.parse(saved) as Record<string, PlazaTheme>;
      for (const [name, theme] of Object.entries(customThemes)) {
        themeRegistry[name] = theme;
        injectThemeCSS(name, theme);
      }
    } catch (e) {
      console.warn('Failed to load custom themes:', e);
    }
  }
}

// ============================================
// DATA GENERATION
// ============================================

// Adjust value relative to previous (living system drift)
function adjustValue(current: number, min: number, max: number, maxDelta: number): number {
  const delta = Math.floor(Math.random() * (maxDelta * 2 + 1)) - maxDelta;
  return Math.max(min, Math.min(max, current + delta));
}

// ============================================
// STATEFUL DATA (persists across renders)
// ============================================

// Telemetry state that drifts instead of jumping randomly
const telemetryState = {
  peerCount: 38,
  latency: 45,
  packetLoss: 0.12,
  memResident: 512,
  cpuLoad: 8
};

// Net log state with drifting ms values
const netLogState = {
  entries: [
    { verb: 'SYNC', chan: 'L1', code: 200, ms: 116 },
    { verb: 'VERIFY', chan: 'P2P', code: 200, ms: 52 },
    { verb: 'ROUTE', chan: 'RPC', code: 204, ms: 44 },
    { verb: 'HANDSHAKE', chan: 'MESH', code: 200, ms: 137 },
    { verb: 'ATTEST', chan: 'L2', code: 206, ms: 44 },
    { verb: 'SYNC', chan: 'P2P', code: 200, ms: 21 }
  ]
};

// Node count state
let nodeCountState = 42;

export interface TelemetryData {
  peerCount: number;
  latency: number;
  packetLoss: number;
  memResident: number;
  cpuLoad: number;
}

export function generateTelemetry(): TelemetryData {
  // Adjust values relative to previous (living system feel)
  telemetryState.peerCount = adjustValue(telemetryState.peerCount, 12, 64, 3);
  telemetryState.latency = adjustValue(telemetryState.latency, 18, 120, 8);
  telemetryState.packetLoss = Math.max(0, Math.min(2, telemetryState.packetLoss + (Math.random() - 0.5) * 0.1));
  telemetryState.memResident = adjustValue(telemetryState.memResident, 256, 1024, 32);
  telemetryState.cpuLoad = adjustValue(telemetryState.cpuLoad, 2, 45, 4);

  return { ...telemetryState };
}

export interface RouteItem {
  path: string;
  disabled: boolean;
  href?: string;
}

export function generateRoutes(): RouteItem[] {
  return [
    { path: '/enter', disabled: true },
    { path: '/polkadot-treasury-monitor', disabled: false, href: 'https://polkadot-treasury-monitor.vercel.app' }
  ];
}

export interface KeyBinding {
  key: string;
  action: string;
}

export function generateKeys(): KeyBinding[] {
  return [
    { key: '[Enter]', action: 'proceed' },
    { key: '[T]', action: 'toggle theme' },
  ];
}

export interface NetLogEntry {
  verb: string;
  chan: string;
  code: number;
  ms: number;
}

export function generateNetLog(): NetLogEntry[] {
  // Drift the ms values
  netLogState.entries = netLogState.entries.map(entry => ({
    ...entry,
    ms: adjustValue(entry.ms, 8, 200, 15)
  }));

  return [...netLogState.entries];
}

export interface StatusData {
  updates: string;
  error: string;
}

export function generateStatus(): StatusData {
  return {
    updates: 'paused',
    error: '500: connection reset'
  };
}

export function generateHexData(length = 500): string {
  let hex = '';
  for (let i = 0; i < length; i++) {
    hex += Math.floor(Math.random() * 16).toString(16).toUpperCase();
    if (i > 0 && i % 32 === 0) hex += '\n';
    else if (i > 0 && i % 8 === 0 && Math.random() > 0.7) hex += ' ';
  }
  // Double it for seamless scroll animation
  return hex + '\n' + hex;
}

export function getNodeCount(): number {
  // Drift the node count
  nodeCountState = adjustValue(nodeCountState, 20, 70, 3);
  return nodeCountState;
}

// ============================================
// CLOCK FORMATTING
// ============================================

export function formatClock(format: 'full' | 'time' | 'date' = 'full'): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');

  switch (format) {
    case 'time':
      return `${hh}:${min}:${ss}`;
    case 'date':
      return `${yyyy}-${mm}-${dd}`;
    case 'full':
    default:
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} UTC`;
  }
}

// ============================================
// GRID CANVAS DRAWING
// ============================================

export interface GridController {
  start: () => void;
  stop: () => void;
  resize: () => void;
}

export function initGridCanvas(canvas: HTMLCanvasElement | null): GridController {
  if (!canvas) {
    return { start: () => {}, stop: () => {}, resize: () => {} };
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { start: () => {}, stop: () => {}, resize: () => {} };
  }

  let animationId: number | null = null;
  let time = 0;

  // Get theme colors - will be updated on theme change
  let colors = getCanvasColors();

  // Listen for theme changes
  const handleThemeChange = () => {
    colors = getCanvasColors();
  };
  window.addEventListener('plaza-theme-change', handleThemeChange);

  // Helper to parse rgba and adjust alpha
  const adjustAlpha = (rgba: string, newAlpha: number): string => {
    const match = rgba.match(/rgba?\(([^)]+)\)/);
    if (match) {
      const parts = match[1].split(',').map(s => s.trim());
      if (parts.length >= 3) {
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${newAlpha})`;
      }
    }
    return rgba;
  };

  // Extract base RGB from rgba string for grid lines
  const getBaseRgb = (rgba: string): string => {
    const match = rgba.match(/rgba?\(([^,]+),([^,]+),([^,)]+)/);
    if (match) {
      return `${match[1].trim()}, ${match[2].trim()}, ${match[3].trim()}`;
    }
    return '255, 100, 0';
  };

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const draw = () => {
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const horizonY = h * 0.65;
    const centerX = w / 2;

    // Ambient glow at horizon - uses theme colors
    const ambientGlow = ctx.createRadialGradient(
      centerX, horizonY, 0,
      centerX, horizonY, w * 0.5
    );
    ambientGlow.addColorStop(0, colors.ambient);
    ambientGlow.addColorStop(0.3, adjustAlpha(colors.ambient, 0.08));
    ambientGlow.addColorStop(0.6, adjustAlpha(colors.ambient, 0.03));
    ambientGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = ambientGlow;
    ctx.fillRect(0, 0, w, h);

    // Sun with breathing animation
    const sunRadius = 60 + Math.sin(time * 0.015) * 8;
    const sunGradient = ctx.createRadialGradient(
      centerX, horizonY, 0,
      centerX, horizonY, sunRadius * 2
    );
    sunGradient.addColorStop(0, adjustAlpha(colors.sunCore, 0.9));
    sunGradient.addColorStop(0.3, colors.sunGlow);
    sunGradient.addColorStop(0.6, adjustAlpha(colors.sunGlow, 0.2));
    sunGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(centerX, horizonY, sunRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Sun core
    ctx.fillStyle = colors.sunCore;
    ctx.beginPath();
    ctx.arc(centerX, horizonY, sunRadius * 0.6, Math.PI, 0);
    ctx.fill();

    // Horizon line glow
    const horizonGlow = ctx.createLinearGradient(0, horizonY - 30, 0, horizonY + 30);
    horizonGlow.addColorStop(0, 'transparent');
    horizonGlow.addColorStop(0.5, colors.horizonGlow);
    horizonGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, horizonY - 30, w, 60);

    // Grid settings
    ctx.lineWidth = 1;
    const gridRgb = getBaseRgb(colors.grid);

    // Vertical perspective lines
    const numVertLines = 30;
    const spreadBottom = w * 1.8;

    for (let i = 0; i <= numVertLines; i++) {
      const ratio = i / numVertLines;
      const bottomX = (w - spreadBottom) / 2 + spreadBottom * ratio;

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
  };
}
