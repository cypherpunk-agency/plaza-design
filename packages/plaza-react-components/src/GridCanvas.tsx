import { useEffect, useRef, useCallback } from 'react';

export interface CanvasColors {
  grid: string;
  sunCore: string;
  sunGlow: string;
  horizonGlow: string;
  ambient: string;
}

export interface GridCanvasProps {
  /** Additional CSS class */
  className?: string;
  /** Custom colors (defaults to CSS variables) */
  colors?: Partial<CanvasColors>;
}

/**
 * Get canvas colors from CSS custom properties.
 */
function getCanvasColors(): CanvasColors {
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
 * Adjust alpha value in an rgba string.
 */
function adjustAlpha(rgba: string, newAlpha: number): string {
  const match = rgba.match(/rgba?\(([^)]+)\)/);
  if (match) {
    const parts = match[1].split(',').map(s => s.trim());
    if (parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${newAlpha})`;
    }
  }
  return rgba;
}

/**
 * Extract RGB components from rgba string.
 */
function getBaseRgb(rgba: string): string {
  const match = rgba.match(/rgba?\(([^,]+),([^,]+),([^,)]+)/);
  if (match) {
    return `${match[1].trim()}, ${match[2].trim()}, ${match[3].trim()}`;
  }
  return '255, 100, 0';
}

/**
 * Animated perspective grid canvas with sun/horizon effect.
 * Responds to theme changes via 'plaza-theme-change' event.
 */
export function GridCanvas({ className = '', colors: customColors }: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const colorsRef = useRef<CanvasColors>(getCanvasColors());

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = { ...colorsRef.current, ...customColors };
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
    ambientGlow.addColorStop(0, colors.ambient);
    ambientGlow.addColorStop(0.3, adjustAlpha(colors.ambient, 0.08));
    ambientGlow.addColorStop(0.6, adjustAlpha(colors.ambient, 0.03));
    ambientGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = ambientGlow;
    ctx.fillRect(0, 0, w, h);

    // Sun with breathing animation
    const sunRadius = 60 + Math.sin(timeRef.current * 0.015) * 8;
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

    timeRef.current++;
    animationRef.current = requestAnimationFrame(draw);
  }, [customColors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleThemeChange = () => {
      colorsRef.current = getCanvasColors();
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('plaza-theme-change', handleThemeChange);

    // Start animation
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('plaza-theme-change', handleThemeChange);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`plaza-grid-canvas ${className}`.trim()}
    />
  );
}
