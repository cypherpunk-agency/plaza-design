// plaza.ts - Plaza Design System Utilities for React
// TypeScript module with utilities for theme, clock, effects, and data generation

const STORAGE_KEY = 'plaza-theme';

// ============================================
// THEME MANAGEMENT
// ============================================

/**
 * Initialize theme from localStorage
 */
export function initPlazaTheme(): void {
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (savedTheme === 'grayscale') {
    document.documentElement.setAttribute('data-theme', 'grayscale');
  }
}

/**
 * Toggle between neon and grayscale themes
 */
export function toggleTheme(): void {
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
 */
export function getTheme(): 'neon' | 'grayscale' {
  return document.documentElement.getAttribute('data-theme') === 'grayscale'
    ? 'grayscale'
    : 'neon';
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

    // Sun with breathing animation
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
    ctx.lineWidth = 1;

    // Vertical perspective lines
    const numVertLines = 30;
    const spreadBottom = w * 1.8;

    for (let i = 0; i <= numVertLines; i++) {
      const ratio = i / numVertLines;
      const bottomX = (w - spreadBottom) / 2 + spreadBottom * ratio;

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
