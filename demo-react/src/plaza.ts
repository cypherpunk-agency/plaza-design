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

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomHex(length: number): string {
  let result = '';
  const chars = '0123456789ABCDEF';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export interface TelemetryData {
  nodeId: string;
  latency: string;
  peers: number;
  blocks: number;
  hashRate: string;
  uptime: string;
  mempool: number;
  syncStatus: string;
}

export function generateTelemetry(): TelemetryData {
  return {
    nodeId: `NODE_${randomHex(8)}`,
    latency: `${randInt(12, 89)}ms`,
    peers: randInt(24, 156),
    blocks: randInt(10000000, 99999999),
    hashRate: `${randInt(100, 999)}.${randInt(10, 99)} TH/s`,
    uptime: `${randInt(1, 30)}d ${randInt(0, 23)}h ${randInt(0, 59)}m`,
    mempool: randInt(500, 5000),
    syncStatus: Math.random() > 0.1 ? 'SYNCED' : 'SYNCING...',
  };
}

export function generateRoutes(): string[] {
  return ['/enter', '/about', '/channels', '/dms', '/profile'];
}

export interface KeyBinding {
  key: string;
  action: string;
}

export function generateKeys(): KeyBinding[] {
  return [
    { key: '[Enter]', action: 'proceed' },
    { key: '[A]', action: 'about' },
    { key: '[T]', action: 'toggle theme' },
    { key: '[Esc]', action: 'close panel' },
  ];
}

export function generateNetLog(count = 5): string[] {
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

  const logs: string[] = [];
  for (let i = 0; i < count; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const ip = `${randInt(1, 255)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;
    const code = [200, 204, 206, 304][randInt(0, 3)];
    const ms = randInt(9, 180);
    logs.push(`[${action}] ${ip} (${code}/${ms}ms)`);
  }

  return logs;
}

export interface StatusData {
  connections: string;
  bandwidth: string;
  encryption: string;
  protocol: string;
  tls: string;
  mode: string;
}

export function generateStatus(): StatusData {
  return {
    connections: Math.random() > 0.05 ? 'OK' : 'DEGRADED',
    bandwidth: ['OPTIMAL', 'GOOD', 'MODERATE'][randInt(0, 2)],
    encryption: 'AES-256-GCM',
    protocol: `v${randInt(2, 3)}.${randInt(0, 9)}.${randInt(0, 9)}`,
    tls: 'TLS 1.3',
    mode: 'P2P MESH',
  };
}

export function generateHexData(length = 500): string {
  let hex = '';
  for (let i = 0; i < length; i++) {
    hex += Math.floor(Math.random() * 16).toString(16).toUpperCase();
    if (i > 0 && i % 32 === 0) hex += '\n';
    else if (i > 0 && i % 8 === 0 && Math.random() > 0.7) hex += ' ';
  }
  return hex;
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
